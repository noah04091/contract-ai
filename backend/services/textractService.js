/**
 * AWS Textract OCR Service
 *
 * Extrahiert Text aus gescannten PDFs und Bildern mittels AWS Textract.
 *
 * Strategie:
 * - Bilder / Single-Page PDFs: Sync API (DetectDocumentText) mit Raw Bytes — schnell, kein S3 nötig
 * - Multi-Page PDFs: Async API (StartDocumentTextDetection) mit temporärem S3-Bucket in eu-central-1
 *
 * WICHTIG: Textract ist in eu-north-1 (wo unser Haupt-S3 liegt) NICHT verfügbar.
 * Daher: Textract Region = eu-central-1, mit eigenem temp-Bucket in eu-central-1.
 *
 * Kosten: ~$1.50 pro 1000 Seiten
 */

const {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand
} = require('@aws-sdk/client-textract');

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand
} = require('@aws-sdk/client-s3');

// Textract + temp S3 beides in eu-central-1
const TEXTRACT_REGION = 'eu-central-1';
const TEMP_BUCKET = process.env.TEXTRACT_TEMP_BUCKET || 'contract-ai-ocr-temp-eu-central';

// Column-detection tuning (see assemblePageEntries)
const COL_LEFT_TOLERANCE = 0.03;   // cluster gap: ≤ 3% of page width = same column
const COL_MIN_CLUSTER_SIZE = 3;    // cluster must have ≥ 3 lines to count as a column
const COL_MIN_GAP = 0.08;          // column centers must be ≥ 8% of page width apart

const textractClient = new TextractClient({
  region: TEXTRACT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3Textract = new S3Client({
  region: TEXTRACT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// ── Bucket-Setup (einmalig) ──
let bucketReady = false;

async function ensureTempBucket() {
  if (bucketReady) return;

  try {
    await s3Textract.send(new HeadBucketCommand({ Bucket: TEMP_BUCKET }));
    bucketReady = true;
    console.log(`✅ [Textract] Temp-Bucket "${TEMP_BUCKET}" existiert`);
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.$metadata?.httpStatusCode === 403) {
      console.log(`📦 [Textract] Erstelle Temp-Bucket "${TEMP_BUCKET}" in ${TEXTRACT_REGION}...`);
      try {
        await s3Textract.send(new CreateBucketCommand({
          Bucket: TEMP_BUCKET,
          CreateBucketConfiguration: { LocationConstraint: TEXTRACT_REGION }
        }));

        // Lifecycle: Auto-Löschung nach 1 Tag (Sicherheitsnetz)
        await s3Textract.send(new PutBucketLifecycleConfigurationCommand({
          Bucket: TEMP_BUCKET,
          LifecycleConfiguration: {
            Rules: [{
              ID: 'AutoDeleteAfter1Day',
              Status: 'Enabled',
              Filter: { Prefix: '' },
              Expiration: { Days: 1 }
            }]
          }
        }));

        bucketReady = true;
        console.log(`✅ [Textract] Temp-Bucket erstellt mit 1-Tag Lifecycle`);
      } catch (createErr) {
        // Bucket might already exist (race condition or owned by us)
        if (createErr.name === 'BucketAlreadyOwnedByYou' || createErr.name === 'BucketAlreadyExists') {
          bucketReady = true;
        } else {
          throw new Error(`Temp-Bucket konnte nicht erstellt werden: ${createErr.message}`);
        }
      }
    } else {
      throw new Error(`Temp-Bucket Check fehlgeschlagen: ${err.message}`);
    }
  }
}

// ════════════════════════════════════════════════════════
// Haupt-Export: extractTextWithOCR
// ════════════════════════════════════════════════════════

async function extractTextWithOCR(documentBuffer) {
  const startTime = Date.now();
  const buf = Buffer.isBuffer(documentBuffer) ? documentBuffer : Buffer.from(documentBuffer);

  console.log(`🔍 [Textract] Starte OCR (Region: ${TEXTRACT_REGION}) für ${(buf.length / 1024).toFixed(1)} KB Dokument...`);

  try {
    const isPDF = buf[0] === 0x25 && buf[1] === 0x50; // %P

    if (isPDF) {
      // Seitenanzahl ermitteln
      const pageCount = await getPDFPageCount(buf);
      console.log(`📄 [Textract] PDF erkannt, ${pageCount} Seite(n)`);

      if (pageCount <= 1) {
        // Single-Page PDF → Sync API (schnell, kein S3)
        return await ocrSync(buf, 'PDF');
      } else {
        // Multi-Page PDF → Async API (alle Seiten)
        return await ocrAsyncMultiPage(buf, pageCount);
      }
    } else {
      // Bild → Sync API
      return await ocrSync(buf, 'Bild');
    }
  } catch (error) {
    console.error(`❌ [Textract] OCR Fehler:`, error.message);
    return handleTextractError(error);
  }
}

// ════════════════════════════════════════════════════════
// Sync API — für Bilder und Single-Page PDFs
// ════════════════════════════════════════════════════════

async function ocrSync(buf, docType) {
  const startTime = Date.now();

  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buf }
  });

  const response = await textractClient.send(command);
  const { text, confidence, lineCount, pageCount } = assembleTextFromBlocks(response.Blocks);
  const duration = Date.now() - startTime;
  const pages = pageCount || 1;

  console.log(`✅ [Textract] Sync-OCR (${docType}) in ${duration}ms: ${lineCount} Zeilen, ${text.trim().length} Zeichen, ${confidence.toFixed(1)}% Confidence`);

  if (text.trim().length < 200) {
    return { success: false, text, confidence, pages, lineCount, duration,
      error: `OCR hat nur ${text.trim().length} Zeichen erkannt — Dokument möglicherweise leer oder unleserlich` };
  }

  return {
    success: true,
    text,
    confidence,
    lowConfidence: confidence > 0 && confidence < 70,
    pages,
    lineCount,
    duration
  };
}

// ════════════════════════════════════════════════════════
// Async API — für Multi-Page PDFs (alle Seiten!)
// ════════════════════════════════════════════════════════

async function ocrAsyncMultiPage(pdfBuffer, pageCount) {
  const startTime = Date.now();

  // 1. Temp-Bucket sicherstellen
  await ensureTempBucket();

  // 2. PDF temporär nach eu-central-1 S3 hochladen
  const tempKey = `ocr/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.pdf`;
  console.log(`📤 [Textract] Upload nach ${TEMP_BUCKET}/${tempKey} (${(pdfBuffer.length / 1024).toFixed(0)} KB)...`);

  await s3Textract.send(new PutObjectCommand({
    Bucket: TEMP_BUCKET,
    Key: tempKey,
    Body: pdfBuffer,
    ContentType: 'application/pdf'
  }));

  try {
    // 3. Async Textract Job starten
    console.log(`🔍 [Textract] Starte Async-OCR für ${pageCount} Seiten...`);

    const startResponse = await textractClient.send(new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: { Bucket: TEMP_BUCKET, Name: tempKey }
      }
    }));

    const jobId = startResponse.JobId;
    console.log(`⏳ [Textract] Job gestartet: ${jobId}`);

    // 4. Polling — max 3 Minuten warten
    const maxWaitMs = 180000;
    const pollInterval = 3000;
    let elapsed = 0;
    let jobResult = null;

    while (elapsed < maxWaitMs) {
      await sleep(pollInterval);
      elapsed += pollInterval;

      const getResponse = await textractClient.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
      const status = getResponse.JobStatus;

      if (elapsed % 15000 < pollInterval) {
        console.log(`⏳ [Textract] Status: ${status} (${Math.round(elapsed / 1000)}s)`);
      }

      if (status === 'SUCCEEDED') {
        jobResult = getResponse;
        break;
      }

      if (status === 'FAILED') {
        const msg = getResponse.StatusMessage || 'Unbekannter Fehler';
        console.error(`❌ [Textract] Job fehlgeschlagen: ${msg}`);
        return { success: false, text: '', confidence: 0, pages: 0,
          error: `Textract-Verarbeitung fehlgeschlagen: ${msg}` };
      }
    }

    if (!jobResult) {
      return { success: false, text: '', confidence: 0, pages: 0,
        error: 'Textract Timeout: Verarbeitung dauerte zu lange (>3 Min).' };
    }

    // 5. Alle Ergebnis-Seiten sammeln (Pagination)
    const allBlocks = [...(jobResult.Blocks || [])];
    let nextToken = jobResult.NextToken;

    while (nextToken) {
      console.log(`📄 [Textract] Lade weitere Ergebnisse (NextToken)...`);
      const nextResponse = await textractClient.send(new GetDocumentTextDetectionCommand({
        JobId: jobId,
        NextToken: nextToken
      }));
      allBlocks.push(...(nextResponse.Blocks || []));
      nextToken = nextResponse.NextToken;
    }

    // 6. Column-aware Textzusammenbau (siehe assembleTextFromBlocks)
    const { text: fullText, confidence: avgConfidence, lineCount: blockCount, pageCount: ocrPageCount } = assembleTextFromBlocks(allBlocks);
    const duration = Date.now() - startTime;

    console.log(`✅ [Textract] Async-OCR abgeschlossen in ${duration}ms: ${ocrPageCount} Seiten, ${blockCount} Zeilen, ${avgConfidence.toFixed(1)}% Confidence`);

    if (fullText.trim().length < 200) {
      return { success: false, text: fullText, confidence: avgConfidence, pages: ocrPageCount,
        error: `OCR hat nur ${fullText.trim().length} Zeichen erkannt — Dokument möglicherweise leer oder unleserlich` };
    }

    return {
      success: true,
      text: fullText,
      confidence: avgConfidence,
      lowConfidence: avgConfidence > 0 && avgConfidence < 70,
      pages: ocrPageCount,
      lineCount: blockCount,
      duration
    };

  } finally {
    // 7. Temp-Datei immer löschen (auch bei Fehler)
    try {
      await s3Textract.send(new DeleteObjectCommand({ Bucket: TEMP_BUCKET, Key: tempKey }));
      console.log(`🗑️ [Textract] Temp-Datei gelöscht: ${tempKey}`);
    } catch (delErr) {
      console.warn(`⚠️ [Textract] Temp-Datei Löschung fehlgeschlagen: ${delErr.message}`);
    }
  }
}

// ════════════════════════════════════════════════════════
// Hilfsfunktionen
// ════════════════════════════════════════════════════════

/**
 * Column-aware text assembly from Textract LINE blocks.
 *
 * Problem: Textract's default response order reads multi-column pages
 * row-by-row across all columns, scrambling the text.
 *
 * Fix: Group LINE blocks by page, cluster them into columns using
 * BoundingBox.Left, then read each column top-to-bottom.
 *
 * Works for both sync (single-page) and async (multi-page) responses.
 * Single-column pages fall through to a simple top-to-bottom sort,
 * so this is safe for every document type.
 *
 * Single pass: walks the Blocks array once, filters to LINE, normalizes
 * into {text, left, top} entries, tracks whether any block had geometry,
 * and sums confidence — then hands clean entries to assemblePageEntries.
 */
function assembleTextFromBlocks(blocks) {
  const pageMap = new Map(); // pageNum -> { entries, hasPositions }
  let totalConfidence = 0;
  let lineCount = 0;

  for (const b of (blocks || [])) {
    if (b.BlockType !== 'LINE' || !b.Text) continue;
    lineCount++;
    totalConfidence += b.Confidence || 0;

    const p = b.Page || 1;
    let page = pageMap.get(p);
    if (!page) {
      page = { entries: [], hasPositions: false };
      pageMap.set(p, page);
    }

    const bbox = b.Geometry?.BoundingBox;
    if (bbox) page.hasPositions = true;
    page.entries.push({
      text: b.Text,
      left: bbox?.Left ?? 0,
      top: bbox?.Top ?? 0
    });
  }

  const sortedPages = [...pageMap.entries()].sort((a, b) => a[0] - b[0]);
  const pageTexts = sortedPages.map(([, page]) => assemblePageEntries(page.entries, page.hasPositions));

  return {
    text: pageTexts.join('\n\n'),
    confidence: lineCount > 0 ? totalConfidence / lineCount : 0,
    lineCount,
    pageCount: sortedPages.length
  };
}

function sortEntriesTopDown(entries) {
  return entries.slice().sort((a, b) => a.top - b.top).map(e => e.text).join('\n');
}

/**
 * Assemble text for a single page, detecting columns from entry positions.
 *
 * Algorithm:
 *   1. Sort all left-edge x-values
 *   2. Cluster them (gap-based, COL_LEFT_TOLERANCE) to find natural column groups
 *   3. Keep only clusters with ≥ COL_MIN_CLUSTER_SIZE members (real columns)
 *   4. Enforce ≥ COL_MIN_GAP horizontal distance between column centers
 *   5. Assign each line to the nearest column center
 *   6. Sort each column top-to-bottom, concatenate columns left-to-right
 *
 * Pages with < 2 detected columns fall through to a plain top-to-bottom sort,
 * so standard single-column documents are unaffected.
 */
function assemblePageEntries(entries, hasPositions) {
  if (entries.length === 0) return '';

  // No geometry data at all → preserve Textract's response order
  if (!hasPositions) return entries.map(e => e.text).join('\n');

  // Cluster left edges by gap detection
  const leftValues = entries.map(e => e.left).sort((a, b) => a - b);
  const clusters = [];
  let currentCluster = [leftValues[0]];
  for (let i = 1; i < leftValues.length; i++) {
    if (leftValues[i] - leftValues[i - 1] <= COL_LEFT_TOLERANCE) {
      currentCluster.push(leftValues[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [leftValues[i]];
    }
  }
  if (currentCluster.length) clusters.push(currentCluster);

  const columnCenters = clusters
    .filter(cl => cl.length >= COL_MIN_CLUSTER_SIZE)
    .map(cl => cl.reduce((a, b) => a + b, 0) / cl.length);

  if (columnCenters.length < 2) return sortEntriesTopDown(entries);

  // Merge column centers that are too close together
  const mergedCenters = [columnCenters[0]];
  for (let i = 1; i < columnCenters.length; i++) {
    if (columnCenters[i] - mergedCenters[mergedCenters.length - 1] >= COL_MIN_GAP) {
      mergedCenters.push(columnCenters[i]);
    }
  }
  if (mergedCenters.length < 2) return sortEntriesTopDown(entries);

  // Assign each line to the nearest column center
  const columns = Array.from({ length: mergedCenters.length }, () => []);
  for (const entry of entries) {
    let nearest = 0;
    let minDist = Math.abs(entry.left - mergedCenters[0]);
    for (let i = 1; i < mergedCenters.length; i++) {
      const d = Math.abs(entry.left - mergedCenters[i]);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    columns[nearest].push(entry);
  }

  // Column-by-column, each top-to-bottom
  return columns
    .map(col => sortEntriesTopDown(col))
    .filter(t => t.length > 0)
    .join('\n');
}

async function getPDFPageCount(buf) {
  try {
    const { PDFDocument } = require('pdf-lib');
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 1; // Fallback: treat as single page
  }
}

function handleTextractError(error) {
  if (error.name === 'UnsupportedDocumentException') {
    return { success: false, text: '', confidence: 0, pages: 0,
      error: 'Dokumentformat wird nicht unterstützt. Bitte laden Sie ein Bild (PNG, JPEG) oder ein PDF hoch.' };
  }
  if (error.name === 'InvalidParameterException') {
    return { success: false, text: '', confidence: 0, pages: 0,
      error: 'Dokument konnte nicht verarbeitet werden. Möglicherweise ist es beschädigt oder zu groß.' };
  }
  if (error.name === 'ProvisionedThroughputExceededException') {
    return { success: false, text: '', confidence: 0, pages: 0,
      error: 'OCR-Service ist gerade ausgelastet. Bitte versuchen Sie es in einer Minute erneut.' };
  }
  return { success: false, text: '', confidence: 0, pages: 0,
    error: `OCR-Fehler: ${error.message}` };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isTextractAvailable() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { available: false, reason: 'AWS Credentials nicht konfiguriert' };
  }
  return { available: true, pdfOcrAvailable: true };
}

module.exports = {
  extractTextWithOCR,
  isTextractAvailable
};

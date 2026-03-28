/**
 * AWS Textract OCR Service
 *
 * Extrahiert Text aus gescannten PDFs und Bildern mittels AWS Textract Sync API.
 * Wird als Fallback verwendet, wenn pdf-parse/pdfjs-dist keine gute Qualität liefern.
 *
 * WICHTIG: Textract Region ist HARDCODED auf eu-central-1, da Textract in eu-north-1
 * (wo unser S3-Bucket liegt) NICHT verfügbar ist.
 *
 * Ansatz: Sync API mit Raw Bytes — kein S3 nötig!
 * - Bilder: direkt an DetectDocumentTextCommand
 * - PDFs: Original-Buffer direkt (Seite 1), dann pdf-lib Splitting für restliche Seiten
 *
 * Kosten: ~$1.50 pro 1000 Seiten
 */

const {
  TextractClient,
  DetectDocumentTextCommand
} = require('@aws-sdk/client-textract');

// HARDCODED eu-central-1 — Textract existiert NICHT in eu-north-1!
const TEXTRACT_REGION = 'eu-central-1';

const textractClient = new TextractClient({
  region: TEXTRACT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Extrahiert Text aus einem PDF/Bild-Buffer mittels AWS Textract
 */
async function extractTextWithOCR(documentBuffer) {
  const startTime = Date.now();
  // Sicherstellen dass wir einen echten Buffer haben
  const buf = Buffer.isBuffer(documentBuffer) ? documentBuffer : Buffer.from(documentBuffer);

  console.log(`🔍 [Textract] Starte OCR (Region: ${TEXTRACT_REGION}) für ${(buf.length / 1024).toFixed(1)} KB Dokument...`);

  try {
    const isPDF = buf[0] === 0x25 && buf[1] === 0x50; // %P (PDF magic bytes)

    if (isPDF) {
      return await extractFromPDFWithTextract(buf);
    } else {
      return await extractFromImageWithTextract(buf);
    }
  } catch (error) {
    console.error(`❌ [Textract] OCR Fehler:`, error.message);

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
}

/**
 * Sendet einen Buffer an Textract und extrahiert LINE-Blöcke
 */
async function ocrSingleBuffer(buf) {
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buf }
  });
  const response = await textractClient.send(command);

  const lines = [];
  let totalConfidence = 0;
  let blockCount = 0;

  for (const block of response.Blocks || []) {
    if (block.BlockType === 'LINE' && block.Text) {
      lines.push(block.Text);
      totalConfidence += block.Confidence || 0;
      blockCount++;
    }
  }

  return {
    text: lines.join('\n'),
    confidence: blockCount > 0 ? totalConfidence / blockCount : 0,
    lineCount: lines.length
  };
}

/**
 * Extrahiert Text aus einem Bild mit Textract Sync API
 */
async function extractFromImageWithTextract(imageBuffer) {
  const startTime = Date.now();
  const result = await ocrSingleBuffer(imageBuffer);
  const duration = Date.now() - startTime;

  console.log(`✅ [Textract] Bild-OCR abgeschlossen in ${duration}ms: ${result.lineCount} Zeilen, ${result.confidence.toFixed(1)}% Confidence`);

  return {
    success: result.text.trim().length > 0,
    text: result.text,
    confidence: result.confidence,
    pages: 1,
    lineCount: result.lineCount,
    duration
  };
}

/**
 * Extrahiert Text aus einem PDF mit Textract Sync API.
 *
 * Strategie:
 * 1. Original-PDF direkt an Textract senden (verarbeitet Seite 1 bei Multi-Page)
 * 2. Wenn Multi-Page UND Seite 1 erfolgreich: pdf-lib Split für restliche Seiten
 * 3. Wenn Original-PDF auch 0 liefert: Dokument ist nicht OCR-bar
 */
async function extractFromPDFWithTextract(pdfBuffer) {
  const startTime = Date.now();

  // ── Schritt 1: Original-PDF direkt an Textract ──
  // Sync API verarbeitet Seite 1 bei Multi-Page PDFs (bis 10 MB)
  console.log(`📄 [Textract] Versuche Original-PDF direkt (${(pdfBuffer.length / 1024).toFixed(0)} KB)...`);

  let page1Result;
  try {
    page1Result = await ocrSingleBuffer(pdfBuffer);
    console.log(`📝 [Textract] Original-PDF Seite 1: ${page1Result.lineCount} Zeilen, ${page1Result.text.trim().length} Zeichen`);
  } catch (directErr) {
    console.warn(`⚠️ [Textract] Original-PDF direkt fehlgeschlagen: ${directErr.message}`);
    // Fallback: Versuch mit pdf-lib Splitting
    return await extractWithPageSplitting(pdfBuffer, startTime);
  }

  // Prüfe Seitenanzahl
  const { PDFDocument } = require('pdf-lib');
  let totalPages = 1;
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    totalPages = doc.getPageCount();
    console.log(`📄 [Textract] PDF hat ${totalPages} Seiten`);
  } catch (e) {
    console.warn(`⚠️ [Textract] Konnte Seitenanzahl nicht ermitteln: ${e.message}`);
  }

  // Wenn Seite 1 nichts lieferte
  if (page1Result.text.trim().length < 30) {
    // Vielleicht ist Seite 1 ein Deckblatt — probiere Splitting für andere Seiten
    if (totalPages > 1) {
      console.log(`📄 [Textract] Seite 1 leer, versuche einzelne Seiten via pdf-lib Split...`);
      return await extractWithPageSplitting(pdfBuffer, startTime);
    }

    // Einzige Seite und 0 Text → nicht OCR-bar
    return {
      success: false, text: page1Result.text, confidence: 0, pages: 1,
      error: `OCR hat nur ${page1Result.text.trim().length} Zeichen erkannt — Dokument möglicherweise leer oder unleserlich`
    };
  }

  // ── Seite 1 hat Text! ──
  if (totalPages <= 1) {
    const duration = Date.now() - startTime;
    console.log(`✅ [Textract] Einseitige PDF-OCR abgeschlossen in ${duration}ms`);
    return {
      success: true,
      text: page1Result.text,
      confidence: page1Result.confidence,
      pages: 1,
      duration
    };
  }

  // ── Multi-Page: restliche Seiten per pdf-lib Splitting ──
  console.log(`📄 [Textract] Verarbeite restliche ${totalPages - 1} Seiten per Splitting...`);
  const allPageTexts = [page1Result.text]; // Seite 1 haben wir schon
  let totalConfidence = page1Result.confidence * page1Result.lineCount;
  let totalBlocks = page1Result.lineCount;
  let failedPages = 0;

  const maxPages = 50;
  const pagesToProcess = Math.min(totalPages, maxPages);

  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    for (let i = 1; i < pagesToProcess; i++) { // Start at 1 (page 2), page 0 already done
      try {
        const singlePageDoc = await PDFDocument.create();
        const [copiedPage] = await singlePageDoc.copyPages(doc, [i]);
        singlePageDoc.addPage(copiedPage);
        const singlePageBytes = await singlePageDoc.save();
        // Explizit Buffer erstellen
        const singlePageBuffer = Buffer.from(singlePageBytes);

        const pageResult = await ocrSingleBuffer(singlePageBuffer);
        allPageTexts.push(pageResult.text);
        totalConfidence += pageResult.confidence * pageResult.lineCount;
        totalBlocks += pageResult.lineCount;

        if ((i + 1) % 5 === 0) {
          console.log(`  📝 [Textract] Seite ${i + 1}/${pagesToProcess} verarbeitet...`);
        }
      } catch (pageErr) {
        console.warn(`⚠️ [Textract] Seite ${i + 1} fehlgeschlagen: ${pageErr.message}`);
        allPageTexts.push('');
        failedPages++;
        if (failedPages > 5) break;
      }
    }
  } catch (splitErr) {
    console.warn(`⚠️ [Textract] PDF-lib Splitting fehlgeschlagen: ${splitErr.message}, nutze nur Seite 1`);
  }

  const fullText = allPageTexts.join('\n\n');
  const avgConfidence = totalBlocks > 0 ? totalConfidence / totalBlocks : 0;
  const duration = Date.now() - startTime;
  const successPages = pagesToProcess - failedPages;

  console.log(`✅ [Textract] Multi-Page PDF-OCR abgeschlossen in ${duration}ms: ${successPages}/${pagesToProcess} Seiten, ${totalBlocks} Zeilen`);

  return {
    success: true,
    text: fullText,
    confidence: avgConfidence,
    pages: successPages,
    duration
  };
}

/**
 * Fallback: Alle Seiten einzeln per pdf-lib aufteilen und OCR
 * Wird verwendet wenn der Original-Buffer nicht funktioniert
 */
async function extractWithPageSplitting(pdfBuffer, startTime) {
  const { PDFDocument } = require('pdf-lib');

  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch (loadErr) {
    return { success: false, text: '', confidence: 0, pages: 0,
      error: `PDF konnte nicht gelesen werden: ${loadErr.message}` };
  }

  const totalPages = srcDoc.getPageCount();
  console.log(`📄 [Textract] Splitting-Fallback: ${totalPages} Seiten`);

  const maxPages = 50;
  const pagesToProcess = Math.min(totalPages, maxPages);
  const pageTexts = [];
  let totalConfidence = 0;
  let totalBlocks = 0;
  let failedPages = 0;

  for (let i = 0; i < pagesToProcess; i++) {
    try {
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [i]);
      singlePageDoc.addPage(copiedPage);
      const singlePageBytes = await singlePageDoc.save();
      const singlePageBuffer = Buffer.from(singlePageBytes);

      const result = await ocrSingleBuffer(singlePageBuffer);
      pageTexts.push(result.text);
      totalConfidence += result.confidence * result.lineCount;
      totalBlocks += result.lineCount;

      if ((i + 1) % 5 === 0) {
        console.log(`  📝 [Textract] Seite ${i + 1}/${pagesToProcess} verarbeitet...`);
      }
    } catch (pageErr) {
      console.warn(`⚠️ [Textract] Seite ${i + 1} fehlgeschlagen: ${pageErr.message}`);
      pageTexts.push('');
      failedPages++;
      if (failedPages > 5) break;
    }
  }

  const fullText = pageTexts.join('\n\n');
  const avgConfidence = totalBlocks > 0 ? totalConfidence / totalBlocks : 0;
  const duration = Date.now() - startTime;
  const successPages = pagesToProcess - failedPages;

  console.log(`✅ [Textract] Splitting-OCR abgeschlossen in ${duration}ms: ${successPages}/${pagesToProcess} Seiten, ${totalBlocks} Zeilen`);

  if (fullText.trim().length < 50) {
    return { success: false, text: fullText, confidence: avgConfidence, pages: successPages,
      error: `OCR hat nur ${fullText.trim().length} Zeichen erkannt — Dokument möglicherweise leer oder unleserlich` };
  }

  return {
    success: successPages > 0,
    text: fullText,
    confidence: avgConfidence,
    pages: successPages,
    duration
  };
}

/**
 * Prüft ob Textract konfiguriert und verfügbar ist
 */
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

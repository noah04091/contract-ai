/**
 * AWS Textract OCR Service
 *
 * Extrahiert Text aus gescannten PDFs mittels AWS Textract.
 * Wird nur als Fallback verwendet, wenn pdf-parse keine gute Qualität liefert.
 *
 * Kosten: ~$1.50 pro 1000 Seiten
 */

const {
  TextractClient,
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand
} = require('@aws-sdk/client-textract');

// Textract Client initialisieren
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Extrahiert Text aus einem PDF/Bild-Buffer mittels AWS Textract
 *
 * @param {Buffer} documentBuffer - Der Dokument-Buffer (PDF oder Bild)
 * @param {Object} options - Optionen
 * @param {boolean} options.detectTables - Auch Tabellen erkennen (teurer)
 * @returns {Promise<{ success: boolean, text: string, confidence: number, pages: number, error?: string }>}
 */
async function extractTextWithOCR(documentBuffer, options = {}) {
  const startTime = Date.now();

  console.log(`🔍 [Textract] Starte OCR für ${(documentBuffer.length / 1024).toFixed(1)} KB Dokument...`);

  try {
    // Textract akzeptiert nur Bilder direkt, keine PDFs
    // Für PDFs müssen wir erst in Bilder konvertieren oder Async API nutzen
    // Hier nutzen wir die synchrone API die für einzelne Seiten/Bilder funktioniert

    // Prüfe ob es ein Bild oder PDF ist
    const isPDF = documentBuffer[0] === 0x25 && documentBuffer[1] === 0x50; // %P (PDF magic bytes)

    if (isPDF) {
      // Für PDFs: Nutze die asynchrone Verarbeitung oder konvertiere zu Bildern
      // Für jetzt: Versuche es trotzdem (funktioniert für einfache PDFs)
      return await extractFromPDFWithTextract(documentBuffer, options);
    } else {
      // Für Bilder: Direkte Verarbeitung
      return await extractFromImageWithTextract(documentBuffer, options);
    }

  } catch (error) {
    console.error(`❌ [Textract] OCR Fehler:`, error.message);

    // Spezifische Fehlerbehandlung
    if (error.name === 'UnsupportedDocumentException') {
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: 'Dokumentformat wird nicht unterstützt. Bitte laden Sie ein Bild (PNG, JPEG) oder ein einfaches PDF hoch.'
      };
    }

    if (error.name === 'InvalidParameterException') {
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: 'Dokument konnte nicht verarbeitet werden. Möglicherweise ist es beschädigt oder zu groß.'
      };
    }

    if (error.name === 'ProvisionedThroughputExceededException') {
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: 'OCR-Service ist gerade ausgelastet. Bitte versuchen Sie es in einer Minute erneut.'
      };
    }

    return {
      success: false,
      text: '',
      confidence: 0,
      pages: 0,
      error: `OCR-Fehler: ${error.message}`
    };
  }
}

/**
 * Extrahiert Text aus einem Bild mit Textract
 */
async function extractFromImageWithTextract(imageBuffer, options = {}) {
  const startTime = Date.now();

  const command = new DetectDocumentTextCommand({
    Document: {
      Bytes: imageBuffer
    }
  });

  const response = await textractClient.send(command);

  // Text aus Blöcken extrahieren
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

  const text = lines.join('\n');
  const avgConfidence = blockCount > 0 ? totalConfidence / blockCount : 0;
  const duration = Date.now() - startTime;

  console.log(`✅ [Textract] OCR abgeschlossen in ${duration}ms: ${lines.length} Zeilen, ${avgConfidence.toFixed(1)}% Confidence`);

  return {
    success: true,
    text,
    confidence: avgConfidence,
    pages: 1,
    lineCount: lines.length,
    duration
  };
}

/**
 * Extrahiert Text aus einem PDF mit Textract Async API
 * Nutzt S3 für die Verarbeitung mehrseitiger PDFs
 *
 * @param {Buffer} pdfBuffer - Der PDF-Buffer
 * @param {Object} options - Optionen
 * @param {string} options.s3Bucket - S3 Bucket Name (optional, nutzt env default)
 * @param {string} options.s3Key - Existierender S3 Key (optional, wenn PDF bereits in S3)
 * @returns {Promise<{ success: boolean, text: string, confidence: number, pages: number, error?: string }>}
 */
async function extractFromPDFWithTextract(pdfBuffer, options = {}) {
  const startTime = Date.now();
  const s3Bucket = options.s3Bucket || process.env.S3_BUCKET_NAME;

  // Prüfe ob S3 konfiguriert ist
  if (!s3Bucket) {
    console.warn(`⚠️ [Textract] S3_BUCKET_NAME nicht konfiguriert, Async PDF OCR nicht möglich`);
    return {
      success: false,
      text: '',
      confidence: 0,
      pages: 0,
      error: 'PDF-OCR erfordert S3 Konfiguration. Bitte kontaktieren Sie den Support.'
    };
  }

  try {
    // Schritt 1: PDF temporär in S3 hochladen (wenn nicht bereits vorhanden)
    let s3Key = options.s3Key;
    let uploadedTemp = false;

    if (!s3Key) {
      const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'eu-central-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });

      // Generiere temporären Key
      s3Key = `temp-ocr/${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
      uploadedTemp = true;

      console.log(`📤 [Textract] Lade PDF temporär nach S3: ${s3Key}`);

      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf'
      }));
    }

    console.log(`🔍 [Textract] Starte Async OCR für ${s3Bucket}/${s3Key}...`);

    // Schritt 2: Async Job starten
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      }
    });

    const startResponse = await textractClient.send(startCommand);
    const jobId = startResponse.JobId;

    console.log(`⏳ [Textract] Job gestartet: ${jobId}`);

    // Schritt 3: Auf Job-Abschluss warten (Polling)
    const maxWaitTime = 120000; // 2 Minuten max
    const pollInterval = 2000; // Alle 2 Sekunden prüfen
    let elapsed = 0;
    let jobStatus = 'IN_PROGRESS';

    while (jobStatus === 'IN_PROGRESS' && elapsed < maxWaitTime) {
      await sleep(pollInterval);
      elapsed += pollInterval;

      const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const getResponse = await textractClient.send(getCommand);
      jobStatus = getResponse.JobStatus;

      console.log(`⏳ [Textract] Job Status: ${jobStatus} (${Math.round(elapsed / 1000)}s)`);

      if (jobStatus === 'SUCCEEDED') {
        // Text extrahieren
        const result = await extractTextFromTextractResponse(getResponse, jobId);

        // Aufräumen: Temporäre Datei löschen
        if (uploadedTemp) {
          await cleanupTempS3File(s3Bucket, s3Key);
        }

        const duration = Date.now() - startTime;
        console.log(`✅ [Textract] Async OCR abgeschlossen in ${duration}ms: ${result.pages} Seiten`);

        return {
          success: true,
          text: result.text,
          confidence: result.confidence,
          pages: result.pages,
          duration
        };
      }

      if (jobStatus === 'FAILED') {
        // Aufräumen
        if (uploadedTemp) {
          await cleanupTempS3File(s3Bucket, s3Key);
        }
        return {
          success: false,
          text: '',
          confidence: 0,
          pages: 0,
          error: 'Textract Job fehlgeschlagen. Das Dokument konnte nicht verarbeitet werden.'
        };
      }
    }

    // Timeout
    if (uploadedTemp) {
      await cleanupTempS3File(s3Bucket, s3Key);
    }

    return {
      success: false,
      text: '',
      confidence: 0,
      pages: 0,
      error: 'Textract Timeout: Die Verarbeitung dauerte zu lange. Bitte versuchen Sie es mit einem kleineren Dokument.'
    };

  } catch (error) {
    console.error(`❌ [Textract] PDF OCR Fehler:`, error.message);
    return {
      success: false,
      text: '',
      confidence: 0,
      pages: 0,
      error: `PDF-OCR Fehler: ${error.message}`
    };
  }
}

/**
 * Extrahiert Text aus einer Textract Response (mit Pagination)
 */
async function extractTextFromTextractResponse(initialResponse, jobId) {
  const lines = [];
  let totalConfidence = 0;
  let blockCount = 0;
  let pageCount = 0;
  const pageTexts = new Map(); // Page -> Text

  // Verarbeite erste Response
  processTextractBlocks(initialResponse.Blocks, lines, pageTexts, { totalConfidence, blockCount, pageCount });

  // Hole weitere Seiten wenn vorhanden (Pagination)
  let nextToken = initialResponse.NextToken;

  while (nextToken) {
    console.log(`📄 [Textract] Lade weitere Ergebnisse...`);

    const getCommand = new GetDocumentTextDetectionCommand({
      JobId: jobId,
      NextToken: nextToken
    });

    const response = await textractClient.send(getCommand);
    processTextractBlocks(response.Blocks, lines, pageTexts, { totalConfidence, blockCount, pageCount });
    nextToken = response.NextToken;
  }

  // Berechne Statistiken
  for (const block of lines) {
    if (block.Confidence) {
      totalConfidence += block.Confidence;
      blockCount++;
    }
  }

  // Sortiere nach Seiten und baue Text
  const sortedPages = [...pageTexts.entries()].sort((a, b) => a[0] - b[0]);
  const fullText = sortedPages.map(([page, text]) => text).join('\n\n--- Seite ---\n\n');
  pageCount = sortedPages.length;

  const avgConfidence = blockCount > 0 ? totalConfidence / blockCount : 0;

  return {
    text: fullText,
    confidence: avgConfidence,
    pages: pageCount
  };
}

/**
 * Verarbeitet Textract Blocks und extrahiert Text
 */
function processTextractBlocks(blocks, allLines, pageTexts, stats) {
  if (!blocks) return;

  for (const block of blocks) {
    if (block.BlockType === 'LINE' && block.Text) {
      allLines.push(block);

      const pageNum = block.Page || 1;
      const existing = pageTexts.get(pageNum) || '';
      pageTexts.set(pageNum, existing + (existing ? '\n' : '') + block.Text);
    }
  }
}

/**
 * Löscht temporäre S3-Datei
 */
async function cleanupTempS3File(bucket, key) {
  try {
    const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    console.log(`🗑️ [Textract] Temporäre Datei gelöscht: ${key}`);
  } catch (error) {
    console.warn(`⚠️ [Textract] Konnte temporäre Datei nicht löschen: ${error.message}`);
  }
}

/**
 * Sleep Hilfsfunktion
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Prüft ob Textract konfiguriert und verfügbar ist
 * @param {Object} options - Optionen
 * @param {boolean} options.checkS3 - Auch S3-Konfiguration prüfen (für PDF-OCR)
 */
async function isTextractAvailable(options = {}) {
  try {
    // AWS Credentials prüfen
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return { available: false, reason: 'AWS Credentials nicht konfiguriert' };
    }

    // S3-Konfiguration prüfen (für PDF-OCR benötigt)
    if (options.checkS3 && !process.env.S3_BUCKET_NAME) {
      return {
        available: true,
        pdfOcrAvailable: false,
        reason: 'S3 nicht konfiguriert - PDF-OCR eingeschränkt'
      };
    }

    return {
      available: true,
      pdfOcrAvailable: !!process.env.S3_BUCKET_NAME
    };
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

module.exports = {
  extractTextWithOCR,
  isTextractAvailable
};

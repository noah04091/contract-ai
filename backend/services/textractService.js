/**
 * AWS Textract OCR Service
 *
 * Extrahiert Text aus gescannten PDFs und Bildern mittels AWS Textract Sync API.
 * Wird nur als Fallback verwendet, wenn pdf-parse/pdfjs-dist keine gute Qualität liefern.
 *
 * WICHTIG: Textract Region ist HARDCODED auf eu-central-1, da Textract in eu-north-1
 * (wo unser S3-Bucket liegt) NICHT verfügbar ist.
 *
 * Ansatz: Sync API mit Raw Bytes — kein S3 nötig!
 * Für mehrseitige PDFs: pdf-lib splittet in Einzelseiten → Sync OCR pro Seite.
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
 *
 * @param {Buffer} documentBuffer - Der Dokument-Buffer (PDF oder Bild)
 * @returns {Promise<{ success: boolean, text: string, confidence: number, pages: number, error?: string }>}
 */
async function extractTextWithOCR(documentBuffer) {
  const startTime = Date.now();

  console.log(`🔍 [Textract] Starte OCR (Region: ${TEXTRACT_REGION}) für ${(documentBuffer.length / 1024).toFixed(1)} KB Dokument...`);

  try {
    // Prüfe ob es ein PDF oder Bild ist
    const isPDF = documentBuffer[0] === 0x25 && documentBuffer[1] === 0x50; // %P (PDF magic bytes)

    if (isPDF) {
      return await extractFromPDFWithTextract(documentBuffer);
    } else {
      return await extractFromImageWithTextract(documentBuffer);
    }

  } catch (error) {
    console.error(`❌ [Textract] OCR Fehler:`, error.message);

    if (error.name === 'UnsupportedDocumentException') {
      return {
        success: false, text: '', confidence: 0, pages: 0,
        error: 'Dokumentformat wird nicht unterstützt. Bitte laden Sie ein Bild (PNG, JPEG) oder ein PDF hoch.'
      };
    }

    if (error.name === 'InvalidParameterException') {
      return {
        success: false, text: '', confidence: 0, pages: 0,
        error: 'Dokument konnte nicht verarbeitet werden. Möglicherweise ist es beschädigt oder zu groß.'
      };
    }

    if (error.name === 'ProvisionedThroughputExceededException') {
      return {
        success: false, text: '', confidence: 0, pages: 0,
        error: 'OCR-Service ist gerade ausgelastet. Bitte versuchen Sie es in einer Minute erneut.'
      };
    }

    return {
      success: false, text: '', confidence: 0, pages: 0,
      error: `OCR-Fehler: ${error.message}`
    };
  }
}

/**
 * Extrahiert Text aus einem Bild mit Textract Sync API
 */
async function extractFromImageWithTextract(imageBuffer) {
  const startTime = Date.now();

  const command = new DetectDocumentTextCommand({
    Document: { Bytes: imageBuffer }
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

  const text = lines.join('\n');
  const avgConfidence = blockCount > 0 ? totalConfidence / blockCount : 0;
  const duration = Date.now() - startTime;

  console.log(`✅ [Textract] Bild-OCR abgeschlossen in ${duration}ms: ${lines.length} Zeilen, ${avgConfidence.toFixed(1)}% Confidence`);

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
 * Extrahiert Text aus einem PDF mit Textract Sync API.
 * Splittet mehrseitige PDFs mit pdf-lib in Einzelseiten,
 * dann OCR pro Seite via DetectDocumentTextCommand (Bytes).
 *
 * Kein S3 nötig — alles im Speicher!
 */
async function extractFromPDFWithTextract(pdfBuffer) {
  const startTime = Date.now();
  const { PDFDocument } = require('pdf-lib');

  let srcDoc;
  try {
    srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  } catch (loadErr) {
    console.error(`❌ [Textract] PDF konnte nicht geladen werden:`, loadErr.message);
    return {
      success: false, text: '', confidence: 0, pages: 0,
      error: `PDF konnte nicht gelesen werden: ${loadErr.message}`
    };
  }

  const totalPages = srcDoc.getPageCount();
  console.log(`📄 [Textract] PDF hat ${totalPages} Seiten — splitte und OCR jede Seite einzeln...`);

  // Limit: max 50 Seiten (Kosten + Zeit)
  const maxPages = 50;
  const pagesToProcess = Math.min(totalPages, maxPages);
  if (totalPages > maxPages) {
    console.warn(`⚠️ [Textract] PDF hat ${totalPages} Seiten, verarbeite nur die ersten ${maxPages}`);
  }

  const pageTexts = [];
  let totalConfidence = 0;
  let totalBlocks = 0;
  let failedPages = 0;

  for (let i = 0; i < pagesToProcess; i++) {
    try {
      // Erstelle ein neues PDF mit nur dieser einen Seite
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [i]);
      singlePageDoc.addPage(copiedPage);
      const singlePageBytes = await singlePageDoc.save();

      // Textract Sync API — akzeptiert PDF mit max 1 Seite (max 5 MB)
      const command = new DetectDocumentTextCommand({
        Document: { Bytes: singlePageBytes }
      });

      const response = await textractClient.send(command);

      const lines = [];
      for (const block of response.Blocks || []) {
        if (block.BlockType === 'LINE' && block.Text) {
          lines.push(block.Text);
          totalConfidence += block.Confidence || 0;
          totalBlocks++;
        }
      }

      const pageText = lines.join('\n');
      pageTexts.push(pageText);

      if ((i + 1) % 5 === 0) {
        console.log(`  📝 [Textract] Seite ${i + 1}/${pagesToProcess} verarbeitet...`);
      }

    } catch (pageErr) {
      console.warn(`⚠️ [Textract] Seite ${i + 1} fehlgeschlagen: ${pageErr.message}`);
      failedPages++;
      pageTexts.push('');

      // Bei zu vielen Fehlern abbrechen
      if (failedPages > 5) {
        console.error(`❌ [Textract] Zu viele fehlgeschlagene Seiten, Abbruch`);
        break;
      }
    }
  }

  const fullText = pageTexts.join('\n\n');
  const avgConfidence = totalBlocks > 0 ? totalConfidence / totalBlocks : 0;
  const duration = Date.now() - startTime;
  const successPages = pagesToProcess - failedPages;

  console.log(`✅ [Textract] PDF-OCR abgeschlossen in ${duration}ms: ${successPages}/${pagesToProcess} Seiten, ${totalBlocks} Zeilen, ${avgConfidence.toFixed(1)}% Confidence`);

  if (fullText.trim().length < 50 && successPages > 0) {
    return {
      success: false, text: fullText, confidence: avgConfidence, pages: successPages,
      error: `OCR hat nur ${fullText.trim().length} Zeichen erkannt — Dokument möglicherweise leer oder unleserlich`
    };
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

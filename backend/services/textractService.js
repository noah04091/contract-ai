/**
 * AWS Textract OCR Service
 *
 * Extrahiert Text aus gescannten PDFs mittels AWS Textract.
 * Wird nur als Fallback verwendet, wenn pdf-parse keine gute Qualität liefert.
 *
 * Kosten: ~$1.50 pro 1000 Seiten
 */

const { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');

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
 * Extrahiert Text aus einem PDF mit Textract
 * Hinweis: Textract synchrone API unterstützt nur einzelne Seiten
 * Für mehrseitige PDFs wird hier pdf-to-img verwendet
 */
async function extractFromPDFWithTextract(pdfBuffer, options = {}) {
  const startTime = Date.now();

  try {
    // Versuche erst die Async-API für PDFs (erfordert S3)
    // Fallback: Konvertiere PDF zu Bildern und verarbeite einzeln

    // Für jetzt: Nutze pdf-poppler oder ähnliches um PDF zu Bildern zu konvertieren
    // Da das zusätzliche Dependencies braucht, nutzen wir einen einfacheren Ansatz:
    // Wir extrahieren die erste Seite als Test

    const pdf2img = await tryLoadPdfConverter();

    if (pdf2img) {
      // PDF zu Bildern konvertieren
      const images = await pdf2img.convert(pdfBuffer, { format: 'png' });

      const allText = [];
      let totalConfidence = 0;

      for (let i = 0; i < images.length; i++) {
        console.log(`🔍 [Textract] Verarbeite Seite ${i + 1}/${images.length}...`);

        const result = await extractFromImageWithTextract(images[i], options);
        if (result.success) {
          allText.push(result.text);
          totalConfidence += result.confidence;
        }
      }

      const duration = Date.now() - startTime;
      const avgConfidence = images.length > 0 ? totalConfidence / images.length : 0;

      console.log(`✅ [Textract] PDF OCR abgeschlossen in ${duration}ms: ${images.length} Seiten`);

      return {
        success: true,
        text: allText.join('\n\n--- Seite ---\n\n'),
        confidence: avgConfidence,
        pages: images.length,
        duration
      };
    } else {
      // Fallback: Versuche direkt (funktioniert manchmal für einfache PDFs)
      console.log(`⚠️ [Textract] PDF-Konverter nicht verfügbar, versuche direkten Upload...`);

      // Textract DetectDocumentText unterstützt keine PDFs direkt
      // Wir müssen die Async API mit S3 nutzen oder PDF konvertieren
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: 'PDF-OCR erfordert zusätzliche Konfiguration. Bitte laden Sie ein Bild (PNG/JPEG) oder ein digitales PDF hoch.'
      };
    }

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
 * Versucht einen PDF-zu-Bild Konverter zu laden
 */
async function tryLoadPdfConverter() {
  try {
    // Versuche pdf-poppler (beste Qualität)
    const { Poppler } = require('pdf-poppler');
    return {
      convert: async (buffer, options) => {
        const poppler = new Poppler();
        const tempPath = `/tmp/ocr-${Date.now()}.pdf`;
        const fs = require('fs');
        fs.writeFileSync(tempPath, buffer);
        const images = await poppler.pdfToCairo(tempPath, null, { pngFile: true });
        fs.unlinkSync(tempPath);
        return images;
      }
    };
  } catch {
    // pdf-poppler nicht installiert
  }

  try {
    // Versuche pdf2pic
    const { fromBuffer } = require('pdf2pic');
    return {
      convert: async (buffer, options) => {
        const converter = fromBuffer(buffer, {
          density: 200,
          format: 'png',
          width: 2000,
          height: 2800
        });
        // Konvertiere alle Seiten
        const pages = [];
        let pageNum = 1;
        while (true) {
          try {
            const result = await converter(pageNum, { responseType: 'buffer' });
            pages.push(result.buffer);
            pageNum++;
          } catch {
            break;
          }
        }
        return pages;
      }
    };
  } catch {
    // pdf2pic nicht installiert
  }

  return null;
}

/**
 * Prüft ob Textract konfiguriert und verfügbar ist
 */
async function isTextractAvailable() {
  try {
    // Einfacher Health-Check
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return { available: false, reason: 'AWS Credentials nicht konfiguriert' };
    }

    return { available: true };
  } catch (error) {
    return { available: false, reason: error.message };
  }
}

module.exports = {
  extractTextWithOCR,
  isTextractAvailable
};

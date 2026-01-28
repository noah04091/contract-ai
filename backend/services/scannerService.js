/**
 * Scanner Service
 *
 * Verarbeitet gescannte Dokument-Bilder:
 * - Perspektivkorrektur via sharp
 * - Kontrast-Optimierung (Dokument-Modus)
 * - A4-Format Normalisierung (300 DPI)
 * - PDF-Generierung mit OCR-Textlayer
 *
 * @version 1.0.0
 */

const sharp = require("sharp");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { extractTextWithOCR } = require("./textractService");
const { checkOcrUsage, incrementOcrUsage } = require("./ocrUsageService");

// A4 bei 300 DPI
const A4_WIDTH_PX = 2480;
const A4_HEIGHT_PX = 3508;

// ============================================
// IMAGE PROCESSING
// ============================================

/**
 * Verarbeitet ein einzelnes Scan-Bild:
 * Perspektivkorrektur → Kontrast → A4-Resize
 *
 * @param {Buffer} imageBuffer - Raw Image Buffer
 * @param {Array<{x: number, y: number}>|null} corners - 4 Eckpunkte (optional)
 * @param {Object} options - Verarbeitungsoptionen
 * @param {number} options.rotation - Rotation in Grad (0, 90, 180, 270)
 * @param {boolean} options.enhance - Kontrast-Optimierung aktivieren
 * @returns {Promise<Buffer>} Verarbeitetes Bild als JPEG
 */
async function processImage(imageBuffer, corners, options = {}) {
  const { rotation = 0, enhance = true } = options;

  let pipeline = sharp(imageBuffer);

  // 1. Perspektivkorrektur via Affine Transform
  // sharp unterstützt keine native 4-Punkt-Perspektivkorrektur,
  // daher verwenden wir extract + resize als Approximation
  if (corners && corners.length === 4) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgW = metadata.width;
    const imgH = metadata.height;

    // Bounding Box der 4 Ecken berechnen
    const xs = corners.map((c) => Math.round(c.x * imgW));
    const ys = corners.map((c) => Math.round(c.y * imgH));
    const left = Math.max(0, Math.min(...xs));
    const top = Math.max(0, Math.min(...ys));
    const right = Math.min(imgW, Math.max(...xs));
    const bottom = Math.min(imgH, Math.max(...ys));

    const cropWidth = right - left;
    const cropHeight = bottom - top;

    if (cropWidth > 50 && cropHeight > 50) {
      pipeline = pipeline.extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }

  // 2. Rotation
  if (rotation && rotation !== 0) {
    pipeline = pipeline.rotate(rotation);
  }

  // 3. Kontrast-Optimierung für Dokument-Scans
  if (enhance) {
    pipeline = pipeline
      .normalize() // Auto-Levels
      .sharpen({ sigma: 1.5 }) // Schärfe für Text
      .gamma(1.1); // Leicht heller für Papier
  }

  // 4. A4 resize (300 DPI), Seitenverhältnis beibehalten
  pipeline = pipeline.resize(A4_WIDTH_PX, A4_HEIGHT_PX, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  });

  // 5. JPEG Output (hohe Qualität)
  const result = await pipeline.jpeg({ quality: 92 }).toBuffer();

  return result;
}

/**
 * Generiert eine Vorschau eines verarbeiteten Bildes (kleinere Auflösung)
 *
 * @param {Buffer} imageBuffer - Raw Image Buffer
 * @param {Array<{x: number, y: number}>|null} corners - 4 Eckpunkte
 * @param {Object} options - Verarbeitungsoptionen
 * @returns {Promise<Buffer>} Preview-JPEG (max 1200px)
 */
async function processPreview(imageBuffer, corners, options = {}) {
  const { rotation = 0, enhance = true } = options;

  let pipeline = sharp(imageBuffer);

  if (corners && corners.length === 4) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgW = metadata.width;
    const imgH = metadata.height;

    const xs = corners.map((c) => Math.round(c.x * imgW));
    const ys = corners.map((c) => Math.round(c.y * imgH));
    const left = Math.max(0, Math.min(...xs));
    const top = Math.max(0, Math.min(...ys));
    const right = Math.min(imgW, Math.max(...xs));
    const bottom = Math.min(imgH, Math.max(...ys));

    const cropWidth = right - left;
    const cropHeight = bottom - top;

    if (cropWidth > 50 && cropHeight > 50) {
      pipeline = pipeline.extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }

  if (rotation && rotation !== 0) {
    pipeline = pipeline.rotate(rotation);
  }

  if (enhance) {
    pipeline = pipeline.normalize().sharpen({ sigma: 1.5 }).gamma(1.1);
  }

  // Kleinere Preview-Auflösung
  pipeline = pipeline.resize(1200, 1700, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  });

  const result = await pipeline.jpeg({ quality: 80 }).toBuffer();
  return result;
}

// ============================================
// PDF GENERATION WITH OCR TEXT LAYER
// ============================================

/**
 * Generiert ein PDF aus verarbeiteten Scan-Bildern mit optionalem OCR-Textlayer
 *
 * @param {Buffer[]} processedImages - Array von verarbeiteten JPEG-Buffers
 * @param {Object} options
 * @param {boolean} options.enableOCR - OCR-Textlayer hinzufügen
 * @param {string} options.userId - User-ID für OCR-Limit-Prüfung
 * @returns {Promise<{
 *   pdfBuffer: Buffer,
 *   pageCount: number,
 *   ocrApplied: boolean,
 *   ocrPagesRemaining: number|null,
 *   ocrError: string|null
 * }>}
 */
async function generateScanPDF(processedImages, options = {}) {
  const { enableOCR = true, userId = null } = options;

  const pdfDoc = await PDFDocument.create();
  let ocrApplied = false;
  let ocrPagesRemaining = null;
  let ocrError = null;

  // OCR-Check: Hat der User noch Kontingent?
  let canUseOCR = false;
  if (enableOCR && userId) {
    try {
      const usage = await checkOcrUsage(userId);
      if (usage.allowed) {
        canUseOCR = true;
        ocrPagesRemaining = usage.pagesRemaining;
      } else {
        ocrError = `OCR-Limit erreicht (${usage.pagesUsed}/${usage.pagesLimit} Seiten)`;
        ocrPagesRemaining = 0;
      }
    } catch (err) {
      console.error("[Scanner] OCR Usage Check Fehler:", err.message);
      ocrError = "OCR-Nutzungsprüfung fehlgeschlagen";
    }
  }

  // Seiten hinzufügen
  for (let i = 0; i < processedImages.length; i++) {
    const imgBuffer = processedImages[i];

    // Bild als JPEG in PDF einbetten
    const jpgImage = await pdfDoc.embedJpg(imgBuffer);

    // A4-Seitengröße in PDF Points (72 DPI)
    const A4_WIDTH_PT = 595.28;
    const A4_HEIGHT_PT = 841.89;

    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

    // Bild skalieren, damit es die Seite füllt
    const scale = Math.min(
      A4_WIDTH_PT / jpgImage.width,
      A4_HEIGHT_PT / jpgImage.height
    );
    const scaledWidth = jpgImage.width * scale;
    const scaledHeight = jpgImage.height * scale;

    page.drawImage(jpgImage, {
      x: (A4_WIDTH_PT - scaledWidth) / 2,
      y: (A4_HEIGHT_PT - scaledHeight) / 2,
      width: scaledWidth,
      height: scaledHeight,
    });

    // OCR-Textlayer hinzufügen
    if (canUseOCR) {
      try {
        const ocrResult = await extractTextWithOCR(imgBuffer);

        if (ocrResult.success && ocrResult.blocks) {
          await overlayOCRText(pdfDoc, page, ocrResult.blocks, {
            pageWidth: A4_WIDTH_PT,
            pageHeight: A4_HEIGHT_PT,
            imageX: (A4_WIDTH_PT - scaledWidth) / 2,
            imageY: (A4_HEIGHT_PT - scaledHeight) / 2,
            imageWidth: scaledWidth,
            imageHeight: scaledHeight,
          });
          ocrApplied = true;
        }

        // OCR-Nutzung inkrementieren
        if (userId) {
          await incrementOcrUsage(userId, 1);
          if (ocrPagesRemaining !== null) {
            ocrPagesRemaining = Math.max(0, ocrPagesRemaining - 1);
          }
        }

        // Prüfen ob noch Kontingent für weitere Seiten
        if (ocrPagesRemaining !== null && ocrPagesRemaining <= 0) {
          canUseOCR = false;
          if (i < processedImages.length - 1) {
            ocrError = `OCR-Limit nach Seite ${i + 1} erreicht. Restliche Seiten ohne Textlayer.`;
          }
        }
      } catch (err) {
        console.error(
          `[Scanner] OCR Fehler auf Seite ${i + 1}:`,
          err.message
        );
        if (!ocrError) {
          ocrError = `OCR-Fehler auf Seite ${i + 1}: ${err.message}`;
        }
      }
    }
  }

  const pdfBuffer = Buffer.from(await pdfDoc.save());

  return {
    pdfBuffer,
    pageCount: processedImages.length,
    ocrApplied,
    ocrPagesRemaining,
    ocrError,
  };
}

/**
 * Overlay unsichtbaren OCR-Text auf eine PDF-Seite
 * Textract liefert BoundingBox-Koordinaten (0-1 relativ),
 * die auf die PDF-Seiten-Koordinaten gemappt werden.
 *
 * @param {PDFDocument} pdfDoc - Das PDF-Dokument
 * @param {PDFPage} page - Die aktuelle Seite
 * @param {Array} blocks - Textract-Blöcke mit Text und Geometry
 * @param {Object} dimensions - Seiten- und Bild-Dimensionen
 */
async function overlayOCRText(pdfDoc, page, blocks, dimensions) {
  const { pageWidth, pageHeight, imageX, imageY, imageWidth, imageHeight } =
    dimensions;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const block of blocks) {
    // Nur LINE-Blöcke verwenden (nicht WORD, um Duplikate zu vermeiden)
    if (block.BlockType !== "LINE" || !block.Text || !block.Geometry) continue;

    const bbox = block.Geometry.BoundingBox;
    if (!bbox) continue;

    // Textract BoundingBox (0-1) → PDF-Koordinaten
    // Textract: Top-Left Origin, PDF: Bottom-Left Origin
    const textX = imageX + bbox.Left * imageWidth;
    const textY =
      imageY + imageHeight - (bbox.Top + bbox.Height) * imageHeight;
    const textWidth = bbox.Width * imageWidth;
    const textHeight = bbox.Height * imageHeight;

    // Schriftgröße basierend auf BoundingBox-Höhe
    const fontSize = Math.max(4, Math.min(textHeight * 0.85, 24));

    try {
      page.drawText(block.Text, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
        opacity: 0, // Unsichtbar — nur für Copy/Paste und Suche
      });
    } catch (err) {
      // Zeichen die nicht im Font sind überspringen
      continue;
    }
  }
}

module.exports = {
  processImage,
  processPreview,
  generateScanPDF,
};

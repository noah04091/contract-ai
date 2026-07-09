/**
 * Foto → PDF Konverter (Welle 4a, 09.07.2026)
 *
 * Zweck: Ein vom Handy hochgeladenes FOTO eines Vertrags in ein einseitiges
 * PDF wickeln, BEVOR die Analyse-Pipeline startet. Dadurch behandelt die
 * gesamte bestehende Pipeline (S3-Speicherung, Hash, pdf-parse→OCR-Fallback,
 * PDF-Viewer) das Foto exakt wie ein gescanntes PDF — kein einziger Eingriff
 * downstream nötig, und der Nutzer bekommt ein anzeigbares PDF.
 *
 * Universell: sharp dekodiert JPEG/PNG/HEIC/HEIF/WebP/TIFF (libvips 8.17),
 * richtet das Bild per EXIF-Orientierung auf (Handy-Fotos!), begrenzt die
 * Größe für Textract und legt es als JPEG in ein PDF (pdf-lib).
 *
 * Defensiv: wirft nur bei echtem Konvertierungs-Fehler; der Aufrufer fängt
 * das und liefert eine saubere 400-Meldung statt eines Crashs.
 */

const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// Bild-MIME-Types, die wir als „Foto" akzeptieren. Bewusst NICHT in die
// geteilte SUPPORTED_MIMETYPES-Liste (textExtractor) aufgenommen — sonst
// würden Compare/LegalLens/Optimizer/Builder ebenfalls Bilder annehmen und
// an pdf-parse zerschellen. Diese Liste ist NUR für den Analyse-Foto-Pfad.
const IMAGE_MIMETYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff'
]);

function isImageMimetype(mimetype) {
  return IMAGE_MIMETYPES.has((mimetype || '').toLowerCase());
}

// Längste Kante des normalisierten Bildes. Groß genug für gute OCR-Lesbarkeit,
// klein genug um sicher unter Textracts Sync-Byte-Limit (10 MB) zu bleiben.
const MAX_EDGE_PX = 3000;
// JPEG-Qualität: hoch genug für scharfe Buchstabenkanten, ohne Riesen-Dateien.
const JPEG_QUALITY = 90;

/**
 * Konvertiert einen Bild-Buffer in ein einseitiges PDF.
 *
 * @param {Buffer} imageBuffer - Roh-Bytes des hochgeladenen Fotos
 * @param {string} mimetype - MIME-Type (nur zur Info/Logging)
 * @returns {Promise<{ pdfBuffer: Buffer, width: number, height: number }>}
 * @throws {Error} bei Dekodier-/Konvertierungs-Fehler (z.B. kaputte Datei)
 */
async function convertImageToPdf(imageBuffer, mimetype = 'image/jpeg') {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Leerer Bild-Buffer erhalten');
  }

  // 1) sharp: EXIF-Rotation anwenden (Handy-Fotos liegen sonst quer → schlechte
  //    OCR), transparente Bereiche auf Weiß legen, auf MAX_EDGE begrenzen,
  //    als JPEG ausgeben. .rotate() ohne Argument = Auto-Orientierung aus EXIF.
  let jpg;
  let meta;
  try {
    const pipeline = sharp(imageBuffer, { failOn: 'none' })
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: 'inside',            // Seitenverhältnis bewahren, nur verkleinern
        withoutEnlargement: true  // kleine Bilder NICHT hochskalieren
      })
      .jpeg({ quality: JPEG_QUALITY });

    const out = await pipeline.toBuffer({ resolveWithObject: true });
    jpg = out.data;
    meta = out.info; // { width, height, ... } des JPEG-Ergebnisses
  } catch (err) {
    throw new Error(`Bild konnte nicht verarbeitet werden: ${err.message}`);
  }

  if (!jpg || jpg.length === 0 || !meta || !meta.width || !meta.height) {
    throw new Error('Bildkonvertierung ergab kein gültiges Ergebnis');
  }

  // 2) pdf-lib: einseitiges PDF exakt in Bildgröße (1px = 1pt). Textract
  //    rastert das eingebettete JPEG und liest den Text per Sync-OCR.
  let pdfBytes;
  try {
    const pdfDoc = await PDFDocument.create();
    const embedded = await pdfDoc.embedJpg(jpg);
    const page = pdfDoc.addPage([meta.width, meta.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: meta.width, height: meta.height });
    pdfBytes = await pdfDoc.save();
  } catch (err) {
    throw new Error(`PDF konnte nicht erstellt werden: ${err.message}`);
  }

  const pdfBuffer = Buffer.from(pdfBytes);
  console.log(`🖼️→📄 [ImageToPdf] ${mimetype} (${(imageBuffer.length / 1024).toFixed(0)} KB) → PDF ${meta.width}×${meta.height}px (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  return { pdfBuffer, width: meta.width, height: meta.height };
}

module.exports = {
  convertImageToPdf,
  isImageMimetype,
  IMAGE_MIMETYPES
};

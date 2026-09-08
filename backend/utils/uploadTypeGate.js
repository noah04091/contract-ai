// 📁 backend/utils/uploadTypeGate.js
// QA-Punkt 5 (BUG-005/024, 08.09.2026): Der Upload-Weg (routes/upload.js) nahm JEDEN
// Dateityp an und legte den Vertrag VOR der Analyse an. Eine .txt wurde so zum
// "Vertrag" (Status Neu, Badge PDF), obwohl die Analyse sie nie verarbeiten kann —
// der Datenmüll erschien anschließend in Liste, Zählern und Anbieterwechsel.
//
// Dieses Gate prüft den ECHTEN Inhalt (Magic Bytes), nie den Dateinamen
// ("Dokumenterkennung: nie raten"). Es lässt genau die Formate durch, die die
// Analyse-Pipeline verarbeiten kann: PDF, Word (DOC/DOCX) und die Foto-Formate
// aus services/imageToPdf (JPEG/PNG/HEIC/HEIF/WEBP/TIFF werden dort zu PDF gewandelt).
//
// ⚠️ Bewusst NICHT über Endung oder Browser-Mimetype — genau die waren das Loch
// (Drag & Drop umgeht das accept-Attribut, req.file.mimetype ist Client-Angabe).

const { detectMimeType } = require('./emailImportSecurity');

// Menschlich lesbare Liste für Fehlermeldungen — EINE Quelle.
const SUPPORTED_UPLOAD_LABEL = 'PDF, Word (DOC/DOCX) oder Foto (JPG/PNG/HEIC/WEBP/TIFF)';

const DIREKT_UNTERSTUETZT = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
]);

/**
 * Liefert den unterstützten MIME-Typ des Puffers oder null (= ablehnen).
 * Wirft nie.
 * @param {Buffer} buffer
 * @returns {string|null}
 */
function detectSupportedUploadType(buffer) {
  if (!buffer || buffer.length < 4) return null;

  try {
    const erkannt = detectMimeType(buffer);
    if (erkannt && DIREKT_UNTERSTUETZT.has(erkannt)) return erkannt;
    // 'application/zip' (echtes Archiv, kein Word) ist KEIN Vertragsformat → weiter
    // zu den Bild-Prüfungen (die greifen bei einem ZIP nicht) und dann null.
  } catch (_) {
    // Erkennungsfehler ⇒ wie "nichts erkannt" behandeln, unten weiterprüfen.
  }

  // HEIC/HEIF (iPhone-Fotos): ISO-BMFF-Container, 'ftyp'-Box an Offset 4.
  // detectMimeType kennt das Format nicht — ohne diese Prüfung würden echte
  // Fotos abgelehnt (accept-Attribut erlaubt .heic/.heif ausdrücklich).
  if (buffer.length >= 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.slice(8, 12).toString('ascii').toLowerCase();
    if (brand.startsWith('hei') || brand.startsWith('mif') || brand.startsWith('msf') || brand.startsWith('avif')) {
      return 'image/heic';
    }
    return null; // andere ftyp-Container (z. B. MP4-Video) sind kein Vertragsformat
  }

  // WEBP: 'RIFF' + Größe + 'WEBP'
  if (buffer.length >= 12 &&
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  // TIFF: 'II*\0' (little endian) oder 'MM\0*' (big endian)
  if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
      (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) {
    return 'image/tiff';
  }

  return null;
}

module.exports = { detectSupportedUploadType, SUPPORTED_UPLOAD_LABEL };

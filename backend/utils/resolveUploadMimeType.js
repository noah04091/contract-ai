// 📁 backend/utils/resolveUploadMimeType.js
// 📄 19.08.2026 (Stufe 1 der Dateityp-Kette): Bestimmt den Dateityp beim Hochladen
// aus dem INHALT statt aus dem Namen.
//
// Warum: Vier getrennte Kopien von `uploadToS3` (routes/analyze.js, routes/upload.js,
// routes/optimize.js, routes/apiV1.js) rieten den Typ bisher aus der Endung:
//     ContentType: originalFilename?.endsWith('.docx') ? DOCX : 'application/pdf'
// Alles, was nicht auf .docx endet, galt damit als PDF. Folgen, an 830 echten
// Vertraegen und deren S3-Objekten gemessen (18.08.2026):
//  - 32 Bild-Dateien tragen in S3 faelschlich `application/pdf` (29 davon NEU,
//    juengste vom 12.08. — also kein Altbestand, sondern laufender Fehler),
//  - eine Datei ohne Endung im Namen (E-Mail-Import, KI-Name, oder nach einer
//    nachtraeglichen Analyse) wird IMMER als PDF etikettiert. Genau so hat die
//    Analyse am 18.08. die korrekte DOCX-Etikettierung eines echten Vertrags
//    ueberschrieben.
//
// FAIL-SAFE: Erkennt der Inhalt nichts Bekanntes, greift exakt die bisherige Regel.
// Diese Funktion kann also nie ein schlechteres Ergebnis liefern als der Zustand
// vor ihr. Sie wirft nie.
//
// ⚠️ Wichtig zur Einordnung: Der in S3 gespeicherte ContentType wird im gesamten
// Backend NIRGENDS gelesen (projektweit geprueft, alle Vorkommen sind Schreib-
// zugriffe). Die Analyse holt ihren Dateityp aus `req.file.mimetype`, also aus dem
// echten Upload. Eine Korrektur hier kann die Analyse deshalb nicht beeinflussen.

const { detectMimeType } = require('./emailImportSecurity');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

/**
 * @param {Buffer} buffer - der tatsaechliche Datei-Inhalt
 * @param {string} originalFilename - nur noch als Rueckfall
 * @returns {string} MIME-Typ, nie leer
 */
function resolveUploadMimeType(buffer, originalFilename) {
  try {
    const erkannt = detectMimeType(buffer);
    if (erkannt) return erkannt;
  } catch (_) {
    // Erkennung darf einen Upload niemals scheitern lassen.
  }
  return String(originalFilename || '').toLowerCase().endsWith('.docx') ? DOCX_MIME : PDF_MIME;
}

module.exports = { resolveUploadMimeType, DOCX_MIME, PDF_MIME };

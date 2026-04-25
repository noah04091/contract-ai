// 📁 backend/utils/fixUtf8.js
// ✅ Fix UTF-8 Encoding für Dateinamen mit deutschen Umlauten
// Problem: Browser sendet UTF-8, aber multer interpretiert es als Latin-1
// Ergebnis: "Gemüse" wird zu "GemÃ¼se"

function fixUtf8Filename(filename) {
  if (!filename) return filename;

  try {
    // Versuche Latin-1 -> UTF-8 Konvertierung
    // Fängt ALLE Multi-Byte-Zeichen ab (Umlaute, Em-Dash, etc.)
    // Safeguards: \uFFFD-Check, Gleichheits-Check, Längen-Check
    const fixed = Buffer.from(filename, 'latin1').toString('utf8');

    // Prüfe ob das Ergebnis valide UTF-8 ist (keine Replacement-Zeichen)
    if (fixed.includes('\uFFFD')) return filename;

    // Prüfe ob die Konvertierung tatsächlich was geändert hat
    if (fixed === filename) return filename;

    // Zusätzliche Validierung: Das fixierte Ergebnis sollte kürzer sein
    // (weil 2-Byte Latin-1 Sequenzen zu 1 UTF-8 Zeichen werden)
    if (fixed.length < filename.length) {
      console.log(`🔧 [UTF8] Filename encoding fixed: "${filename}" -> "${fixed}"`);
      return fixed;
    }

    return filename;
  } catch (e) {
    return filename;
  }
}

module.exports = { fixUtf8Filename };

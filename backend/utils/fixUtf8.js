// 📁 backend/utils/fixUtf8.js
// ✅ Fix UTF-8 Encoding für Dateinamen mit deutschen Umlauten
// Problem: Browser sendet UTF-8, aber multer interpretiert es als Latin-1
// Ergebnis: "Gemüse" wird zu "GemÃ¼se"

function fixUtf8Filename(filename) {
  if (!filename) return filename;

  try {
    // Schnelle Prüfung: Enthält der String "Ã" (Latin-1 Fehlinterpretation von UTF-8)?
    // Alle UTF-8 Multibyte-Zeichen beginnen mit C3 (= Ã in Latin-1) wenn falsch dekodiert
    if (!filename.includes('Ã')) return filename;

    // Versuche Latin-1 -> UTF-8 Konvertierung
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

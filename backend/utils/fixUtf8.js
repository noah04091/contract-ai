// 📁 backend/utils/fixUtf8.js
// ✅ Fix UTF-8 Encoding für Dateinamen mit deutschen Umlauten
// Problem: Browser sendet UTF-8, aber multer interpretiert es als Latin-1
// Ergebnis: "Gemüse" wird zu "GemÃ¼se"

function fixUtf8Filename(filename) {
  if (!filename) return filename;

  try {
    // Prüfe ob verdächtige Muster vorhanden sind (UTF-8 als Latin-1 interpretiert)
    const hasGarbledChars = /Ã[¤¶ü„–œŸ©¨ ¢®´»§]/u.test(filename);
    if (!hasGarbledChars) return filename;

    // Versuche Latin-1 -> UTF-8 Konvertierung
    const fixed = Buffer.from(filename, 'latin1').toString('utf8');

    // Prüfe ob das Ergebnis valide UTF-8 ist (keine Replacement-Zeichen)
    if (!fixed.includes('\uFFFD')) {
      console.log(`🔧 [UTF8] Filename encoding fixed: "${filename}" -> "${fixed}"`);
      return fixed;
    }

    return filename;
  } catch (e) {
    return filename;
  }
}

module.exports = { fixUtf8Filename };

// 📁 frontend/src/utils/textUtils.ts
// ✅ Utility-Funktionen für Text-Verarbeitung

/**
 * Fix UTF-8 Encoding-Probleme bei Dateinamen mit deutschen Umlauten
 * Problem: Browser sendet UTF-8, Server interpretiert als Latin-1
 * Ergebnis: "Gemüse" wird zu "GemÃ¼se"
 *
 * Diese Funktion korrigiert solche Encoding-Fehler für die Anzeige.
 */
export function fixUtf8Display(str: string): string {
  if (!str) return str;

  // Prüfe ob der String verdächtige Muster enthält (UTF-8 als Latin-1 interpretiert)
  const hasGarbledChars = /Ã[¤¶ü„–œŸ©¨ ¢®´»§]/u.test(str);
  if (!hasGarbledChars) return str;

  // Häufige UTF-8 -> Latin-1 Fehlinterpretationen für Deutsche Zeichen
  const replacements: [RegExp, string][] = [
    [/Ã¼/g, 'ü'],
    [/Ã¤/g, 'ä'],
    [/Ã¶/g, 'ö'],
    [/Ãœ/g, 'Ü'],
    [/Ã„/g, 'Ä'],
    [/Ã–/g, 'Ö'],
    [/ÃŸ/g, 'ß'],
    [/Ã©/g, 'é'],
    [/Ã¨/g, 'è'],
    [/Ã /g, 'à'],
    [/Ã¢/g, 'â'],
    [/Ã®/g, 'î'],
    [/Ã´/g, 'ô'],
    [/Ã»/g, 'û'],
    [/Ã§/g, 'ç'],
    [/Ã±/g, 'ñ'],
  ];

  let result = str;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

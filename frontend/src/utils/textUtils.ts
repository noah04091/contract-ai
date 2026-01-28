// 📁 frontend/src/utils/textUtils.ts
// ✅ Utility-Funktionen für Text-Verarbeitung

/**
 * Fix UTF-8 Encoding-Probleme bei Dateinamen mit deutschen Umlauten
 * Problem: Browser sendet UTF-8, Server interpretiert als Latin-1
 * Ergebnis: "Gemüse" wird zu "GemÃ¼se"
 *
 * Diese Funktion korrigiert solche Encoding-Fehler für die Anzeige.
 * Nutzt TextEncoder/TextDecoder für zuverlässige Konvertierung.
 */
export function fixUtf8Display(str: string): string {
  if (!str) return str;

  // Schnelle Prüfung: Enthält "Ã" (Latin-1 Fehlinterpretation von UTF-8)?
  if (!str.includes('Ã')) return str;

  try {
    // Konvertiere jeden Charakter zu seinem Latin-1 Byte-Wert
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xFF;
    }

    // Dekodiere die Bytes als UTF-8
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const fixed = decoder.decode(bytes);

    // Nur verwenden wenn sich was geändert hat und kürzer ist
    if (fixed !== str && fixed.length < str.length) {
      return fixed;
    }
  } catch {
    // Falls Dekodierung fehlschlägt: Fallback auf Regex-Ersetzungen
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

  return str;
}

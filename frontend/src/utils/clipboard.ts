// 📋 Clipboard-Helper — sicheres navigator.clipboard.writeText mit Error-Handling
//
// Browser-Support 2026: navigator.clipboard ist 95%+ verfügbar (caniuse).
// Mit HTTPS-Production sind wir bei ~99%. Kein execCommand-Fallback nötig.
//
// Caller muss Toast/UI-Feedback selbst geben (Helper bleibt UI-agnostisch).

/**
 * Kopiert Text in die Zwischenablage. Returnt true bei Erfolg, false bei Fehler.
 * Wirft NICHT — Caller entscheidet wie er auf false reagiert (Toast etc.).
 */
export async function safeCopy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('[Clipboard] write failed:', err);
    return false;
  }
}

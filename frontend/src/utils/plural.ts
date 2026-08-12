// 📁 frontend/src/utils/plural.ts
// Deutsche Ein-/Mehrzahl für nutzersichtbare Zähltexte.
//
// WARUM ES DIESE DATEI GIBT (TÜV-Befund 12.08.2026):
// In den E-Mails wurde diese Fehlerklasse systematisch behoben (backend/utils/mailText.js) —
// im Frontend nie geprüft. Der TÜV fand u. a. „1 Tage bis Ablauf", „1 neue Treffer heute",
// „1 neue Gesetze & Urteile", „1 Alert(s) wurden abgearbeitet". Bei einem täglichen
// Rechts-Radar ist die Zahl 1 kein Randfall, sondern Alltag.
//
// Regel für neue Texte: Zahl + Substantiv NIE direkt zusammensetzen, sondern über plural().

/**
 * Liefert die passende Form: bei genau 1 die Einzahl, sonst die Mehrzahl.
 * 0 nimmt bewusst die Mehrzahl — das ist im Deutschen korrekt („0 Verträge").
 *
 * @example plural(1, 'Vertrag', 'Verträge')  // 'Vertrag'
 * @example plural(3, 'Treffer', 'Treffer')   // 'Treffer'
 */
export function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

/**
 * Kurzform für „Zahl + passendes Wort" in einem Rutsch.
 * @example zaehl(1, 'Tag', 'Tage')  // '1 Tag'
 */
export function zaehl(n: number, singular: string, pluralForm: string): string {
  return `${n} ${plural(n, singular, pluralForm)}`;
}

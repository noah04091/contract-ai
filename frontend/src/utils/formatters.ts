// 🛡️ Sichere Formatierer — verhindern, dass "NaN €" / "Invalid Date" beim User landen.
// WICHTIG: Bei GÜLTIGEN Werten ist die Ausgabe identisch zur bisherigen Logik
// (toFixed(decimals) + "€" bzw. toLocaleDateString('de-DE')). Nur der KAPUTTE Fall
// (undefined/null/NaN/ungültiges Datum) liefert einen sauberen Platzhalter statt Müll.

const PLACEHOLDER = "–"; // Gedankenstrich

/** Euro-Betrag im bestehenden Format "12.34€" (Punkt, kein Leerzeichen). Kaputt → "–". */
export function formatEuro(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return PLACEHOLDER;
  return amount.toFixed(decimals) + "€";
}

/** Nur die Zahl im Format "12.34" (für Fälle, wo das € separat im JSX steht). Kaputt → "–". */
export function formatAmount(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return PLACEHOLDER;
  return amount.toFixed(decimals);
}

/** Datum im Format toLocaleDateString('de-DE'). Leer/ungültig → "–". */
export function formatDate(date: Date | string | number | null | undefined, locale = "de-DE"): string {
  if (date === null || date === undefined || date === "") return PLACEHOLDER;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return PLACEHOLDER;
  return d.toLocaleDateString(locale);
}

/** Datum+Uhrzeit im Format toLocaleString('de-DE'). Leer/ungültig → "–". */
export function formatDateTime(date: Date | string | number | null | undefined, locale = "de-DE"): string {
  if (date === null || date === undefined || date === "") return PLACEHOLDER;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return PLACEHOLDER;
  return d.toLocaleString(locale);
}

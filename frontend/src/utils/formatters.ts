// 🛡️ Sichere Formatierer — verhindern, dass "NaN €" / "Invalid Date" beim User landen.
// WICHTIG: Bei GÜLTIGEN Werten ist die Ausgabe identisch zur bisherigen Logik
// (toFixed(decimals) + "€" bzw. toLocaleDateString('de-DE')). Nur der KAPUTTE Fall
// (undefined/null/NaN/ungültiges Datum) liefert einen sauberen Platzhalter statt Müll.

const PLACEHOLDER = "–"; // Gedankenstrich

/** Euro-Betrag im bestehenden Format "12.34€" (Punkt, kein Leerzeichen). Kaputt → "–". */
// QA-Punkt 4 (BUG-035, 08.09.2026): vorher englisches Format "489.00€" — im selben
// Detaildialog stand daneben deutsches "5.868,00 EUR". Jetzt durchgängig de-DE
// ("489,00 €" / "5.868,00"). EINE Funktion, 38 Verwendungen, ein Format.
export function formatEuro(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return PLACEHOLDER;
  return new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }).format(amount);
}

/** Nur die Zahl im Format "5.868,00" (für Fälle, wo das € separat im JSX steht). Kaputt → "–". */
export function formatAmount(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return PLACEHOLDER;
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }).format(amount);
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

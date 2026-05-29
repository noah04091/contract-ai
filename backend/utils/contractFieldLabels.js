// ============================================================
// contractFieldLabels.js
//
// Normalisierungs-Layer für Eckdaten-Felder, die historisch
// als englische Strings in der DB landen (z.B. "1 years",
// "2 weeks"). Wird in der GET-/LIST-Pipeline angewendet, damit
// alle Outputs (Frontend, PDF, Excel, Public-API) deutsche Werte
// sehen — ohne dass der KI-Pipeline-Source (contractAnalyzer +
// analyze.js) angefasst werden muss.
//
// Idempotent: deutsche Werte bleiben deutsch (Pass-Through).
// Pure: keine Side-Effects, kein State.
// ============================================================

const DURATION_UNIT_MAP = {
  year: 'Jahr',
  years: 'Jahre',
  month: 'Monat',
  months: 'Monate',
  week: 'Woche',
  weeks: 'Wochen',
  day: 'Tag',
  days: 'Tage',
};

const PERIOD_UNIT_MAP = {
  year: 'Jahr',
  years: 'Jahre',
  month: 'Monat',
  months: 'Monate',
  week: 'Woche',
  weeks: 'Wochen',
  day: 'Tag',
  days: 'Tage',
};

// Matcht "N units" am Anfang des Strings — Rest wird unverändert angehängt
// (defensiv für Fälle wie "12 months zum Quartalsende").
const PATTERN = /^\s*(\d+)\s+(years?|months?|weeks?|days?)\b(.*)$/i;

function normalizeWithMap(value, map) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  const match = trimmed.match(PATTERN);
  if (!match) return value; // schon deutsch oder ein Spezial-String ("Täglich kündbar")

  const [, num, unitRaw, rest] = match;
  const unitKey = unitRaw.toLowerCase();
  const unitDe = map[unitKey];
  if (!unitDe) return value;

  // Für value=1 immer Singular nutzen (DE), sonst Plural — der Map-Lookup
  // gibt direkt die Plural-Form zurück, daher überschreiben wenn n === 1.
  const singularMap = { Jahre: 'Jahr', Monate: 'Monat', Wochen: 'Woche', Tage: 'Tag' };
  const finalUnit = num === '1' ? (singularMap[unitDe] || unitDe) : unitDe;

  const suffix = rest && rest.trim() ? rest : '';
  return `${num} ${finalUnit}${suffix}`;
}

/**
 * Normalisiert einen `laufzeit`-String:
 *   "1 years"   → "1 Jahr"
 *   "24 months" → "24 Monate"
 *   "1 Jahr"    → "1 Jahr"   (Pass-Through)
 *   null/""     → unverändert
 */
function normalizeLaufzeit(value) {
  return normalizeWithMap(value, DURATION_UNIT_MAP);
}

/**
 * Normalisiert einen `kuendigung`-String:
 *   "2 weeks"           → "2 Wochen"
 *   "3 months"          → "3 Monate"
 *   "Täglich kündbar"   → "Täglich kündbar"  (Pass-Through, kein Match)
 *   "Zum Laufzeitende"  → "Zum Laufzeitende" (Pass-Through)
 *   null/""             → unverändert
 */
function normalizeKuendigung(value) {
  return normalizeWithMap(value, PERIOD_UNIT_MAP);
}

module.exports = {
  normalizeLaufzeit,
  normalizeKuendigung,
};

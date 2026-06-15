/**
 * Plausibilität für Termin-/Meilenstein-Daten (importantDates) — 15.06.2026.
 * ──────────────────────────────────────────────────────────────────────────
 * Befund (3-Verträge-Tiefenprüfung): Die KI hängt die Dauer einer NACHVERTRAGLICHEN
 * Klausel (z.B. Wettbewerbsverbot "18 Monate" / "3 Jahre nach Vertragsende") an einen
 * FALSCHEN Bezugspunkt und typt das Datum als Vertrags-Ende:
 *   - Brennecke: "18 Monate" ans alte Arbeitsvertrags-Datum 12.08.2009 → 12.02.2011,
 *     gespeichert als `lease_end` (🚗) → Phantom-"Ende"-Event in der Vergangenheit.
 *
 * Der bestehende Validator prüfte "Datum vor Vertragsbeginn" NUR für Typ `end_date`
 * (und `minimum_term_end`). Halluzinationen mit anderem End-/Frist-Typ (`lease_end`,
 * `license_expiry`, …) rutschten durch. Diese Funktion verallgemeinert die Prüfung:
 * Ein Ende-/Frist-Meilenstein DIESES Vertrags kann LOGISCH nicht vor seinem Beginn
 * liegen → verwerfen (kein Phantom-Event).
 *
 * BEWUSST NICHT enthalten (dürfen am/vor Vertragsbeginn liegen, kein Reject):
 *   - `contract_signed`   (Unterzeichnung liegt oft vor Inkrafttreten)
 *   - `start_date` / `service_start` (das IST der Beginn)
 *   - `payment_due`       (z.B. Anzahlung/Deposit vor Vertragsbeginn ist legitim)
 *
 * Pure Funktion, deterministisch, erfindet nichts — verwirft nur logisch Unmögliches.
 */

// ⚠️ QUELLE DER WAHRHEIT für die Typ-Namen: dateHuntService.js DATE_SCHEMA (~Zeile 257) —
// das ist das Vokabular, das GPT real emittiert. Diese Liste MUSS dazu passen (15.06.2026
// per TÜV-Audit gegen die echte Liste abgeglichen; vorher 3 tote Einträge + ~7 fehlende Typen
// → derselbe lease_end-Bypass war über andere Typen offen). Enthalten: alle Ende-/Frist-
// Meilensteine, die LOGISCH nicht vor dem Vertragsbeginn liegen können. BEWUSST NICHT enthalten
// (dürfen am/vor Beginn liegen): start_date, service_start, contract_signed, payment_due
// (Anzahlung), delivery_date, other.
const PRE_START_IMPOSSIBLE_TYPES = new Set([
  'end_date', 'lease_end', 'license_expiry', 'insurance_coverage_end', 'loan_end',
  'trial_end', 'renewal_date', 'minimum_term_end', 'cancellation_deadline',
  'notice_period_start', 'warranty_end', 'probation_end', 'price_guarantee_end',
  'option_deadline', 'inspection_due', 'interest_rate_change'
]);

function dayFloor(d) {
  const x = new Date(d);
  if (isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * @param {{ type: string, date: any, startDate: any }} input
 * @returns {boolean} true, wenn der Meilenstein logisch unmöglich vor dem Vertragsbeginn liegt.
 */
function isMilestoneBeforeStart({ type, date, startDate } = {}) {
  if (!PRE_START_IMPOSSIBLE_TYPES.has(type)) return false;
  if (!startDate || !date) return false;
  const d = dayFloor(date);
  const s = dayFloor(startDate);
  if (!d || !s) return false; // unparsebar → nicht anfassen
  return d.getTime() < s.getTime();
}

module.exports = { isMilestoneBeforeStart, PRE_START_IMPOSSIBLE_TYPES };

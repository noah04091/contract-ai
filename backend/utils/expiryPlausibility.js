/**
 * Plausibilitäts-Prüfung fürs Enddatum (14.06.2026, Robustheit "Extraktions-Wurzel").
 * ──────────────────────────────────────────────────────────────────────────────────
 * Wird im Aufrufer NUR genutzt, wenn die KI KEIN echtes end_date geliefert hat. Dann ist
 * ein per Regex extrahiertes Enddatum verdächtig, wenn es:
 *   (a) in der Vergangenheit liegt (z.B. fälschlich ein Rechnungs-/Briefdatum), ODER
 *   (b) == Startdatum ist (Datenfehler: Pass-1-Marker-Überlappung "ab dem … bis …" →
 *       dasselbe Datum landet als Start UND Ende; ein Vertrag kann nicht am selben Tag
 *       beginnen UND enden).
 * In beiden Fällen → Enddatum leeren (statt falsches zu speichern). Downstream null-safe
 * (Status-Logik prüft `expiryDate ? … : null`; Kalender-Wächter erzeugen bei leerem
 * Enddatum keine Ablauf-/Verlängerungs-Events).
 *
 * Pure Funktion, deterministisch (optional `now` injizierbar für Tests). Erfindet NICHTS.
 */

function dayFloor(d) {
  const x = new Date(d);
  if (isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * @param {{ expiryDate: any, startDate: any, now?: any }} input
 * @returns {{ clear: boolean, reason: 'past'|'equals_start'|null }}
 */
function shouldClearExpiry({ expiryDate, startDate, now } = {}) {
  if (!expiryDate) return { clear: false, reason: null };
  const exp = dayFloor(expiryDate);
  if (!exp) return { clear: false, reason: null }; // unparsebar → nicht anfassen

  const today = dayFloor(now || new Date());
  if (exp.getTime() < today.getTime()) return { clear: true, reason: 'past' };

  if (startDate) {
    const start = dayFloor(startDate);
    if (start && exp.getTime() === start.getTime()) {
      return { clear: true, reason: 'equals_start' };
    }
  }
  return { clear: false, reason: null };
}

module.exports = { shouldClearExpiry };

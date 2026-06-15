/**
 * Plausibilitäts-Prüfung fürs Enddatum (14.06.2026, Robustheit "Extraktions-Wurzel").
 * ──────────────────────────────────────────────────────────────────────────────────
 * Wird im Aufrufer NUR genutzt, wenn die KI KEIN echtes end_date geliefert hat. Dann ist
 * ein per Regex extrahiertes Enddatum verdächtig, wenn es:
 *   (a) in der Vergangenheit liegt (z.B. fälschlich ein Rechnungs-/Briefdatum), ODER
 *   (b) == einem BEGINN-Datum ist (Datenfehler: Pass-1-Marker-Überlappung "ab dem … bis …" →
 *       dasselbe Datum landet als Start UND Ende; ein Vertrag kann nicht am selben Tag
 *       beginnen UND enden). Als Beginn zählt das `startDate`-Feld UND — falls das Feld leer
 *       ist — von der KI als `start_date` erkannte Termine (`startCandidates`); behebt den
 *       TerraTech-Fall (Beginn nur in importantDates, startDate-Feld leer, 15.06.2026).
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
 * @param {{ expiryDate: any, startDate: any, startCandidates?: any[], now?: any }} input
 * @returns {{ clear: boolean, reason: 'past'|'equals_start'|null }}
 */
function shouldClearExpiry({ expiryDate, startDate, startCandidates, now } = {}) {
  if (!expiryDate) return { clear: false, reason: null };
  const exp = dayFloor(expiryDate);
  if (!exp) return { clear: false, reason: null }; // unparsebar → nicht anfassen

  const today = dayFloor(now || new Date());
  if (exp.getTime() < today.getTime()) return { clear: true, reason: 'past' };

  // Beginn-Kandidaten: das startDate-Feld + von der KI erkannte start_date-Termine.
  // Ein Vertrag kann nicht an seinem Beginn-Tag enden → Ende == irgendein Beginn = Datenfehler.
  const starts = [];
  if (startDate) starts.push(startDate);
  if (Array.isArray(startCandidates)) starts.push(...startCandidates);
  for (const s of starts) {
    const sf = dayFloor(s);
    if (sf && exp.getTime() === sf.getTime()) {
      return { clear: true, reason: 'equals_start' };
    }
  }
  return { clear: false, reason: null };
}

// 🛡️ TÜV-Fund #1 (15.06.2026): Ein KI-Enddatum (aus extractEndDateFromImportantDates, gelesen aus
// der ROHEN importantDates-Liste) wurde im Aufrufer DIREKT als expiryDate übernommen — der
// shouldClearExpiry-Wächter lief aber nur im else-Zweig (wenn KEIN KI-Enddatum da war). Dadurch
// umging ein KI-end_date ALLE Plausi-Checks. Diese Funktion wendet exakt dieselben getesteten
// Checks auf ein KI-Enddatum an, BEVOR es übernommen wird: Ende in Vergangenheit / == einem Beginn /
// VOR dem Beginn = immer Datenfehler (Null-/Negativlaufzeit). true → KI-Enddatum verwerfen.
const { isMilestoneBeforeStart } = require('./milestonePlausibility');
function isImplausibleAiEndDate(aiEndDate, startDate, importantDates) {
  if (!aiEndDate) return false;
  const startCandidates = (importantDates || [])
    .filter(d => d && d.type === 'start_date' && d.date)
    .map(d => d.date);
  if (shouldClearExpiry({ expiryDate: aiEndDate, startDate, startCandidates }).clear) return true;
  // vor-Start: gegen das startDate-Feld UND gegen KI-erkannte Beginn-Termine (schließt den Edge,
  // dass das Feld leer ist, der Beginn aber nur als start_date-Termin existiert — 15.06.2026 QC).
  if (isMilestoneBeforeStart({ type: 'end_date', date: aiEndDate, startDate })) return true;
  for (const c of startCandidates) {
    if (isMilestoneBeforeStart({ type: 'end_date', date: aiEndDate, startDate: c })) return true;
  }
  return false;
}

module.exports = { shouldClearExpiry, isImplausibleAiEndDate };

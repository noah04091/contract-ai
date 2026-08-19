// 📁 backend/utils/reminderCoverage.js
//
// 🛡️ Stufe 4 (19.08.2026): Abdeckungs-Auskunft pro Frist — „Wie wirst du erinnert?"
// als SERVER-Wahrheit statt Frontend-Raterei. Grundlage ist die feste Referenz
// metadata.deadlineEventId (Stufe 2) der Vorwarn-Events. Genutzt von
// GET /api/calendar/events (Listen-Pfad ohne ?contractId): Vorwarner bleiben dort
// per 3b-Filter ausgeblendet, aber jedes Haupt-Event bekommt ein kompaktes
// `coverage`-Feld — damit kann die „Überblick"-Ansicht ehrlich zeigen, welche
// Fristen wie abgesichert sind (der Grund, warum sie abgeschaltet war).
//
// PURE Funktion (keine DB, keine Seiteneffekte), exportiert für Unit-Tests.

/**
 * Anzeige-Label einer Vorwarn-Stufe aus metadata.daysUntil.
 * 1 → "1 Tag vorher", 30 → "30 Tage vorher"; ohne daysUntil → "Erinnerung".
 */
function stageLabel(daysUntil) {
  const n = Number(daysUntil);
  if (!Number.isFinite(n)) return 'Erinnerung';
  return n === 1 ? '1 Tag vorher' : `${n} Tage vorher`;
}

/**
 * Ehrliche Einordnung einer Stufe (identisch zur UI-Logik in Popup/Verwalten-Modal):
 * notified = Mail nachweislich raus → 'sent'; Zukunft → 'upcoming'; vergangen ohne
 * notified → 'skipped' (Schalter aus / Versand-Miss — der Wächter meldet echte Misses).
 */
function stageKind(reminder, now) {
  if (reminder.status === 'notified') return 'sent';
  return new Date(reminder.date) > now ? 'upcoming' : 'skipped';
}

/**
 * Baut die Abdeckungs-Karte: Map<mainId(String), coverage>.
 * @param {Array} reminders Vorwarn-Events MIT metadata.deadlineEventId
 *                          (Projektion: date, status, metadata.daysUntil, metadata.deadlineEventId)
 * @param {Date}  now       injizierbar für Tests
 */
function buildCoverageMap(reminders, now = new Date()) {
  const map = new Map();
  for (const r of reminders || []) {
    const ref = r.metadata?.deadlineEventId;
    if (!ref) continue;
    const key = String(ref);
    if (!map.has(key)) map.set(key, { total: 0, stages: [] });
    const cov = map.get(key);
    cov.total++;
    cov.stages.push({
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
      label: stageLabel(r.metadata?.daysUntil),
      kind: stageKind(r, now)
    });
  }
  for (const cov of map.values()) {
    cov.stages.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  return map;
}

module.exports = { buildCoverageMap, stageLabel, stageKind };

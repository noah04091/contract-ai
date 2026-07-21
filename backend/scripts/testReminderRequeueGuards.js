/**
 * TÜV für die "queued"-Fallen-Fixes (Erinnerungs-Zustellung, 19.06.2026).
 * node backend/scripts/testReminderRequeueGuards.js
 *
 * Fix A (calendarNotifier.requeueEventOnQueueFailure): Mail-Übergabe nach "queued"-Claim
 *   gepatzt → Event zurück auf "scheduled", ABER nur wenn KEIN email_queue-Eintrag existiert
 *   (sonst Doppel-Mail).
 * Fix B (emailRetryService.requeueEventAfterSoftFailure): endgültiger Soft-Fail →
 *   ⚠️ VERHALTEN GEÄNDERT durch Audit-Fix #1 (07.07.2026, Commit fde5495a):
 *   Event bleibt "queued", stattdessen wird die GESCHEITERTE MAIL reaktiviert
 *   (failed→pending, +4h) — das alte "zurück auf scheduled" verlor heute fällige
 *   Erinnerungen dauerhaft (Tagesfenster). Test am 21.07.2026 nachgezogen.
 *
 * Reiner Logik-/Mock-DB-Test (kein echtes DB/SMTP). Beweist die Wächter.
 */
const { ObjectId } = require('mongodb');
const { requeueEventOnQueueFailure } = require('../services/calendarNotifier');
const { requeueEventAfterSoftFailure } = require('../services/emailRetryService');

let pass = 0, fail = 0;
const ok = (n, c, info = '') => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };

// Minimaler In-Memory-Mock, der genau die genutzten Operationen abbildet.
function makeDb(state) {
  const sameId = (a, b) => String(a) === String(b);
  const matches = (doc, query) => Object.keys(query).every(k =>
    k === '_id' ? sameId(doc._id, query._id) : doc[k] === query[k]);
  return {
    collection(name) {
      const arr = state[name] || (state[name] = []);
      return {
        async findOne(query) { return arr.find(d => matches(d, query)) || null; },
        async updateOne(filter, update) {
          const doc = arr.find(d => matches(d, filter));
          if (!doc) return { modifiedCount: 0 };
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$unset) Object.keys(update.$unset).forEach(k => delete doc[k]);
          if (update.$inc) Object.keys(update.$inc).forEach(k => { doc[k] = (doc[k] || 0) + update.$inc[k]; });
          return { modifiedCount: 1 };
        }
      };
    }
  };
}

(async () => {
  console.log('\n════ Fix A — requeueEventOnQueueFailure (Doppel-Mail-sicher) ════');

  // A1: kein email_queue-Eintrag → zurück auf scheduled
  const id1 = new ObjectId(); const ce1 = { _id: id1, status: 'queued', queuedAt: new Date() };
  const r1 = await requeueEventOnQueueFailure(makeDb({ contract_events: [ce1], email_queue: [] }), id1);
  ok('A1 kein Mail-Eintrag → Event zurück auf "scheduled"', r1 === true && ce1.status === 'scheduled');
  ok('A1 queuedAt wird entfernt', !('queuedAt' in ce1));

  // A2: email_queue-Eintrag existiert → NICHT zurücksetzen (Doppel-Mail-Schutz)
  const id2 = new ObjectId(); const ce2 = { _id: id2, status: 'queued' };
  const r2 = await requeueEventOnQueueFailure(
    makeDb({ contract_events: [ce2], email_queue: [{ eventId: id2.toString(), status: 'sent' }] }), id2);
  ok('A2 Mail existiert → NICHT zurücksetzen (bleibt "queued")', r2 === false && ce2.status === 'queued');

  // A3: bereits "notified" → unverändert (Filter status:"queued" greift nicht)
  const id3 = new ObjectId(); const ce3 = { _id: id3, status: 'notified' };
  const r3 = await requeueEventOnQueueFailure(makeDb({ contract_events: [ce3], email_queue: [] }), id3);
  ok('A3 bereits "notified" → unverändert', r3 === false && ce3.status === 'notified');

  console.log('\n════ Fix B — requeueEventAfterSoftFailure (Mail-Reaktivierung statt Event-Bounce) ════');

  // B1: queued + gescheiterte Mail → Mail reaktiviert (pending, +4h), Event BLEIBT queued, Zähler 1
  const id4 = new ObjectId(); const ce4 = { _id: id4, status: 'queued', queuedAt: new Date() };
  const mail4 = { eventId: id4.toString(), status: 'failed', retryCount: 3 };
  const r4 = await requeueEventAfterSoftFailure(makeDb({ contract_events: [ce4], email_queue: [mail4] }), id4.toString());
  ok('B1 Soft-Fail → Mail reaktiviert (failed→pending)', r4 === true && mail4.status === 'pending');
  ok('B1 Retry-Zähler der Mail zurückgesetzt + Verzögerung gesetzt', mail4.retryCount === 0 && mail4.nextRetryAt instanceof Date && mail4.nextRetryAt > new Date());
  ok('B1 Event BLEIBT "queued" (kein Bounce mehr — Tagesfenster-Falle)', ce4.status === 'queued');
  ok('B1 deliveryRetryCount 0 → 1', ce4.deliveryRetryCount === 1);

  // B1b: queued, aber KEINE gescheiterte Mail vorhanden → nichts zu reaktivieren, kein Zähler-Anstieg
  const id4b = new ObjectId(); const ce4b = { _id: id4b, status: 'queued' };
  const r4b = await requeueEventAfterSoftFailure(makeDb({ contract_events: [ce4b], email_queue: [] }), id4b.toString());
  ok('B1b keine failed-Mail → false, Event unverändert', r4b === false && ce4b.status === 'queued' && !ce4b.deliveryRetryCount);

  // B2: Zähler erschöpft (3) → NICHT reaktivieren
  const id5 = new ObjectId(); const ce5 = { _id: id5, status: 'queued', deliveryRetryCount: 3 };
  const mail5 = { eventId: id5.toString(), status: 'failed' };
  const r5 = await requeueEventAfterSoftFailure(makeDb({ contract_events: [ce5], email_queue: [mail5] }), id5.toString());
  ok('B2 Zähler 3 (erschöpft) → bleibt liegen, Mail bleibt failed', r5 === false && ce5.status === 'queued' && mail5.status === 'failed');

  // B3: bereits "notified" → unverändert
  const id6 = new ObjectId(); const ce6 = { _id: id6, status: 'notified' };
  const r6 = await requeueEventAfterSoftFailure(makeDb({ contract_events: [ce6], email_queue: [] }), id6.toString());
  ok('B3 bereits "notified" → unverändert', r6 === false && ce6.status === 'notified');

  // B4: zweiter Soft-Fail erhöht 1 → 2 (Mail erneut reaktiviert, Event bleibt queued)
  const id7 = new ObjectId(); const ce7 = { _id: id7, status: 'queued', deliveryRetryCount: 1 };
  const mail7 = { eventId: id7.toString(), status: 'failed' };
  await requeueEventAfterSoftFailure(makeDb({ contract_events: [ce7], email_queue: [mail7] }), id7.toString());
  ok('B4 Zähler 1 → 2, Mail reaktiviert, Event bleibt queued', ce7.deliveryRetryCount === 2 && mail7.status === 'pending' && ce7.status === 'queued');

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });

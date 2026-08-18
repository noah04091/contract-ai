// Unit-Tests fuer assignDeadlineRefs (Stufe 2, 18.08.2026):
// Feste Referenz Vorwarnung -> Frist (metadata.deadlineEventId), vergeben im
// Speicher-Block von generateEventsForContract NACH dedupeSameDayMilestones.
const { ObjectId } = require('mongodb');
const { assignDeadlineRefs } = require('../../services/calendarEvents');

const CID = new ObjectId();
const noon = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0, 0);

const main = (type, date, extra = {}) => ({
  contractId: CID, type, title: `X ${type}`, date, status: 'scheduled', metadata: {}, ...extra
});
const rem = (parentType, days, date, extra = {}) => ({
  contractId: CID,
  type: `${parentType}_REMINDER_${days}D`,
  title: `${days} Tage vorher: X`,
  date,
  status: 'scheduled',
  metadata: { daysUntil: days, originalEvent: parentType, reminderType: `${days}_days` },
  ...extra
});

describe('assignDeadlineRefs', () => {
  test('Haupt-Event bekommt _id, Staffel-Vorwarner zeigen alle darauf', () => {
    const m = main('CANCEL_DEADLINE', noon(2026, 9, 20));
    const r30 = rem('CANCEL_DEADLINE', 30, noon(2026, 8, 21));
    const r7 = rem('CANCEL_DEADLINE', 7, noon(2026, 9, 13));
    const r1 = rem('CANCEL_DEADLINE', 1, noon(2026, 9, 19));
    assignDeadlineRefs([m, r30, r7, r1]);
    expect(m._id).toBeInstanceOf(ObjectId);
    for (const r of [r30, r7, r1]) {
      expect(String(r.metadata.deadlineEventId)).toBe(String(m._id));
    }
  });

  test('zwei Fristen gleicher Typ-Familie: jeder Vorwarner zum EXAKTEN Eltern-Stichtag', () => {
    const mA = main('PAYMENT_DUE', noon(2026, 9, 10));
    const mB = main('PAYMENT_DUE', noon(2026, 10, 10));
    const rA = rem('PAYMENT_DUE', 7, noon(2026, 9, 3));
    const rB = rem('PAYMENT_DUE', 7, noon(2026, 10, 3));
    assignDeadlineRefs([mA, rA, mB, rB]);
    expect(String(rA.metadata.deadlineEventId)).toBe(String(mA._id));
    expect(String(rB.metadata.deadlineEventId)).toBe(String(mB._id));
  });

  test('falsche Typ-Familie wird NIE verknuepft (kein Raten)', () => {
    const m = main('CONTRACT_EXPIRY', noon(2026, 9, 20));
    const r = rem('CANCEL_DEADLINE', 7, noon(2026, 9, 13));
    assignDeadlineRefs([m, r]);
    expect(r.metadata.deadlineEventId).toBeUndefined();
  });

  test('ohne daysUntil keine Referenz (kein Raten)', () => {
    const m = main('CANCEL_DEADLINE', noon(2026, 9, 20));
    const r = rem('CANCEL_DEADLINE', 7, noon(2026, 9, 13));
    delete r.metadata.daysUntil;
    assignDeadlineRefs([m, r]);
    expect(r.metadata.deadlineEventId).toBeUndefined();
  });

  test('fremder Vertrag ist kein Kandidat', () => {
    const m = main('CANCEL_DEADLINE', noon(2026, 9, 20), { contractId: new ObjectId() });
    const r = rem('CANCEL_DEADLINE', 7, noon(2026, 9, 13));
    assignDeadlineRefs([m, r]);
    expect(r.metadata.deadlineEventId).toBeUndefined();
  });

  test('bereits gesetzte _id bleibt unangetastet; Metadata-Felder bleiben erhalten', () => {
    const fixedId = new ObjectId();
    const m = main('CANCEL_DEADLINE', noon(2026, 9, 20), { _id: fixedId });
    const r = rem('CANCEL_DEADLINE', 7, noon(2026, 9, 13));
    assignDeadlineRefs([m, r]);
    expect(m._id).toBe(fixedId);
    expect(String(r.metadata.deadlineEventId)).toBe(String(fixedId));
    expect(r.metadata.daysUntil).toBe(7);
    expect(r.metadata.originalEvent).toBe('CANCEL_DEADLINE');
    expect(r.metadata.reminderType).toBe('7_days');
  });

  test('semantische Erinnerungs-Typen ohne _ND-Suffix gelten als Mains und stoeren nicht', () => {
    // CANCEL_WARNING ("Nur noch 7 Tage") hat weder _ND-Suffix noch "vorher" im Titel
    const w = { contractId: CID, type: 'CANCEL_WARNING', title: 'Nur noch 7 Tage: X', date: noon(2026, 9, 13), metadata: { daysLeft: 7 } };
    const m = main('CANCEL_DEADLINE', noon(2026, 9, 20));
    const r = rem('CANCEL_DEADLINE', 7, noon(2026, 9, 13));
    assignDeadlineRefs([w, m, r]);
    expect(w._id).toBeInstanceOf(ObjectId);           // bekommt _id wie jedes Main — harmlos
    expect(w.metadata.deadlineEventId).toBeUndefined(); // aber nie eine Referenz
    expect(String(r.metadata.deadlineEventId)).toBe(String(m._id));
  });

  test('Rueckgabewert ist dasselbe Array (fuer Chaining im Speicher-Block)', () => {
    const arr = [main('CANCEL_DEADLINE', noon(2026, 9, 20))];
    expect(assignDeadlineRefs(arr)).toBe(arr);
  });
});

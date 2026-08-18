// Unit-Tests für den Kalender-Wächter (Stufe 3, 18.08.2026).
// Fake-DB bedient exakt die fünf Abfrage-Formen des Wächters; der Alarmkanal
// wird per injiziertem capture-Spy geprüft (ein Alarm pro verletzter Invariante,
// EIGENER Fehlername pro Invariante = eigener Fingerprint).
const { runCalendarWatchdog, KNOWN_UNLINKED_IDS } = require('../../services/calendarWatchdog');

const NOW = new Date('2026-08-19T07:45:00Z'); // 09:45 Berlin (Sommerzeit)

// Baut eine Fake-DB. Konfigurierbar: lock, log, unlinked[], active[], existingIds[],
// notified[], mails[], stuck[]
function fakeDb(cfg = {}) {
  const cursor = (rows) => ({ project: () => ({ toArray: async () => rows }), toArray: async () => rows });
  return {
    collection: (name) => ({
      findOne: async () => {
        if (name === 'cron_locks') return cfg.lock || null;
        if (name === 'cron_logs') return cfg.log || null;
        throw new Error(`findOne unerwartet auf ${name}`);
      },
      find: (q) => {
        if (name === 'contract_events') {
          if (q['metadata.deadlineEventId'] && q['metadata.deadlineEventId'].$exists === false) return cursor(cfg.unlinked || []);
          if (q.status && Array.isArray(q.status.$in)) return cursor(cfg.active || []);
          if (q._id && q._id.$in) return cursor((cfg.existingIds || []).map(id => ({ _id: id })));
          if (q.notifiedAt) return cursor(cfg.notified || []);
          if (q.status === 'queued') return cursor(cfg.stuck || []);
          throw new Error('contract_events-Query unbekannt: ' + JSON.stringify(q));
        }
        if (name === 'email_queue') return cursor(cfg.mails || []);
        throw new Error(`find unerwartet auf ${name}`);
      }
    })
  };
}

function captureSpy() {
  const calls = [];
  const fn = async (err, ctx) => { calls.push({ name: err.name, message: err.message, ctx }); };
  fn.calls = calls;
  return fn;
}

const oid = (hex) => hex.padEnd(24, '0'); // lesbare 24-Zeichen-Pseudo-IDs

describe('runCalendarWatchdog', () => {
  test('alles sauber: 0 Befunde, 0 Alarme, Stats korrekt', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      active: [{ _id: oid('a1'), metadata: { deadlineEventId: oid('f1') } }],
      existingIds: [oid('f1')],
      notified: [{ _id: oid('n1') }],
      mails: [{ eventId: oid('n1') }]
    }), { now: NOW, capture: cap });
    expect(cap.calls).toHaveLength(0);
    expect(stats).toMatchObject({ findings: 0, sendCronTrace: true, unlinkedReminders: 0, deadReferences: 0, notifiedWithoutMail: 0, stuckQueued: 0 });
  });

  test('Cron-Spur fehlt komplett → CRITICAL SendCronMissing', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({}), { now: NOW, capture: cap });
    expect(stats.sendCronTrace).toBe(false);
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogSendCronMissing');
    expect(f).toBeDefined();
    expect(f.ctx.severity).toBe('critical');
    expect(f.message).toContain('2026-08-19');
  });

  test('Lock fehlt, aber cron_logs hat heutigen Eintrag → KEIN Cron-Alarm', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({ log: { jobName: 'reminder-calendar' } }), { now: NOW, capture: cap });
    expect(stats.sendCronTrace).toBe(true);
    expect(cap.calls.find(c => c.name === 'CalendarWatchdogSendCronMissing')).toBeUndefined();
  });

  test('unverknüpfte Vorwarner: bekannte Alt-Ausnahme zählt NICHT, neue schon', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: {},
      unlinked: [
        { _id: KNOWN_UNLINKED_IDS[0], type: 'CONTRACT_END_REMINDER_30D', title: 'Altfall' },
        { _id: oid('bb'), type: 'CANCEL_DEADLINE_REMINDER_7D', title: 'Neu und kaputt' }
      ]
    }), { now: NOW, capture: cap });
    expect(stats.unlinkedReminders).toBe(1);
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogUnlinkedReminders');
    expect(f).toBeDefined();
    expect(f.message).toContain('1 Vorwarn-Event');
    expect(f.message).toContain(oid('bb'));
  });

  test('NUR die Alt-Ausnahme unverknüpft → still', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: {},
      unlinked: [{ _id: KNOWN_UNLINKED_IDS[0], type: 'X_REMINDER_30D', title: 'Altfall' }]
    }), { now: NOW, capture: cap });
    expect(stats.unlinkedReminders).toBe(0);
    expect(cap.calls).toHaveLength(0);
  });

  test('tote Referenz wird gemeldet, lebendige nicht', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: {},
      active: [
        { _id: oid('a1'), metadata: { deadlineEventId: oid('f1') } },
        { _id: oid('a2'), metadata: { deadlineEventId: oid('f2') } }
      ],
      existingIds: [oid('f1')]
    }), { now: NOW, capture: cap });
    expect(stats.deadReferences).toBe(1);
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogDeadReferences');
    expect(f).toBeDefined();
    expect(f.message).toContain(oid('a2'));
  });

  test('gestern notified ohne Mail → Alarm; mit Mail → still', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: {},
      notified: [{ _id: oid('n1') }, { _id: oid('n2') }],
      mails: [{ eventId: oid('n1') }]
    }), { now: NOW, capture: cap });
    expect(stats.notifiedWithoutMail).toBe(1);
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogNotifiedWithoutMail');
    expect(f).toBeDefined();
    expect(f.message).toContain(oid('n2'));
  });

  test('hängende queued > 48h → Alarm', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: {},
      stuck: [{ _id: oid('q1'), queuedAt: new Date('2026-08-10T00:00:00Z') }]
    }), { now: NOW, capture: cap });
    expect(stats.stuckQueued).toBe(1);
    expect(cap.calls.find(c => c.name === 'CalendarWatchdogStuckQueued')).toBeDefined();
  });

  test('mehrere Verstöße → je EIGENER Alarmname (Fingerprint-Trennung)', async () => {
    const cap = captureSpy();
    await runCalendarWatchdog(fakeDb({
      unlinked: [{ _id: oid('bb'), type: 'T_REMINDER_7D', title: 'x' }],
      stuck: [{ _id: oid('q1'), queuedAt: new Date(0) }]
    }), { now: NOW, capture: cap });
    const names = cap.calls.map(c => c.name);
    expect(names).toContain('CalendarWatchdogSendCronMissing');
    expect(names).toContain('CalendarWatchdogUnlinkedReminders');
    expect(names).toContain('CalendarWatchdogStuckQueued');
    expect(new Set(names).size).toBe(names.length); // keine Doppel
  });

  test('werfender Alarmkanal stoppt den Wächter NICHT', async () => {
    const boom = async () => { throw new Error('Mailserver weg'); };
    const stats = await runCalendarWatchdog(fakeDb({
      unlinked: [{ _id: oid('bb'), type: 'T_REMINDER_7D', title: 'x' }],
      stuck: [{ _id: oid('q1'), queuedAt: new Date(0) }]
    }), { now: NOW, capture: boom });
    expect(stats.findings).toBe(3); // Cron-Spur + unlinked + stuck, trotz kaputtem Kanal
  });
});

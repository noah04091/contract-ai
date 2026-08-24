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
        if (name === 'users') {
          // Invariante 6: Abgemeldete (emailOptOut ODER emailPreferences.calendar:false)
          if (q.$or) return cursor(cfg.unsubscribed || []);
          throw new Error('users-Query unbekannt: ' + JSON.stringify(q));
        }
        throw new Error(`find unerwartet auf ${name}`);
      },
      countDocuments: async (q) => {
        if (name !== 'contract_events') throw new Error(`countDocuments unerwartet auf ${name}`);
        return (cfg.openPerUser || {})[String(q.userId)] || 0;
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

  // ── Invariante 6 (21.08.2026): Das Abmelde-Tor im Notifier unterdrückt Mails, ohne
  // eine Spur zu hinterlassen. Diese Invariante ist der Ersatz-Melder dafür. ──────────
  test('Abgemeldeter Kunde MIT offenen Fristen → HIGH UnsubscribedWithDeadlines', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [{ _id: oid('u1'), email: 'a@b.invalid', emailOptOut: true }],
      openPerUser: { [oid('u1')]: 3 }
    }), { now: NOW, capture: cap });
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines');
    expect(f).toBeDefined();
    expect(f.ctx.severity).toBe('high');
    expect(f.message).toContain('3 offene Frist');
    expect(f.message).toContain(oid('u1'));
    expect(stats.unsubscribedWithDeadlines).toBe(1);
  });

  test('Abgemeldeter Kunde OHNE offene Fristen → KEIN Alarm (legitime Entscheidung)', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [{ _id: oid('u2'), email: 'c@d.invalid', emailPreferences: { calendar: false } }],
      openPerUser: {}
    }), { now: NOW, capture: cap });
    expect(cap.calls.find(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines')).toBeUndefined();
    expect(stats.unsubscribedWithDeadlines).toBe(0);
    expect(stats.findings).toBe(0);
  });

  test('Mehrere Betroffene werden zu EINEM Alarm gebündelt (ein Fingerprint, keine Flut)', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [{ _id: oid('u3') }, { _id: oid('u4') }, { _id: oid('u5') }],
      openPerUser: { [oid('u3')]: 1, [oid('u4')]: 2, [oid('u5')]: 0 }
    }), { now: NOW, capture: cap });
    const treffer = cap.calls.filter(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines');
    expect(treffer).toHaveLength(1);
    expect(treffer[0].message).toContain('2 Kunde(n)');
    expect(treffer[0].message).toContain('3 offene Frist');
    expect(stats.unsubscribedWithDeadlines).toBe(2);
  });

  // 24.08.2026: Invariante 6 kennt jetzt ALLE VIER Aus-Schalter, nicht nur die zwei
  // des Abmelde-Links. Die Profil-Schalter wirken beim Versand genauso.
  // 24.08.2026, nach der Vereinheitlichung: Der alte Profil-Schalter
  // notificationSettings.email.contractDeadlines blockiert NICHTS mehr — der Schalter im
  // Profil schreibt jetzt emailPreferences.calendar. Ein Altwert darf deshalb KEINEN Alarm
  // mehr erzeugen, sonst meldete der Wächter einen Kunden, der ganz normal Mails bekommt.
  // Dieser Test ersetzt seinen eigenen Vorgänger von heute früh und haelt die Umkehr fest.
  test('Alter Profil-Schalter allein loest KEINEN Alarm mehr aus (blockiert nichts)', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [],   // die Abfrage findet ihn gar nicht mehr
      openPerUser: { [oid('u6')]: 2 }
    }), { now: NOW, capture: cap });
    expect(cap.calls.find(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines')).toBeUndefined();
    expect(stats.unsubscribedWithDeadlines).toBe(0);
  });

  test('Neue Wahrheit: emailPreferences.calendar aus + offene Fristen -> Alarm', async () => {
    const cap = captureSpy();
    const stats = await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [{ _id: oid('u6'), emailPreferences: { calendar: false } }],
      openPerUser: { [oid('u6')]: 2 }
    }), { now: NOW, capture: cap });
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines');
    expect(f).toBeDefined();
    expect(f.message).toContain('Abmelde-Link');
    expect(stats.unsubscribedWithDeadlines).toBe(1);
  });

  test('Profil-Schalter "E-Mails gesamt aus" wird als eigener Grund benannt', async () => {
    const cap = captureSpy();
    await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [{ _id: oid('u7'), notificationSettings: { email: { enabled: false } } }],
      openPerUser: { [oid('u7')]: 1 }
    }), { now: NOW, capture: cap });
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines');
    expect(f.message).toContain('Profil: E-Mails gesamt aus');
  });

  test('Der globale Schalter hat Vorrang vor den feineren Gruenden', async () => {
    const cap = captureSpy();
    await runCalendarWatchdog(fakeDb({
      lock: { _id: 'reminder-calendar:2026-08-19' },
      unsubscribed: [{ _id: oid('u8'), emailOptOut: true, notificationSettings: { email: { contractDeadlines: false } } }],
      openPerUser: { [oid('u8')]: 1 }
    }), { now: NOW, capture: cap });
    const f = cap.calls.find(c => c.name === 'CalendarWatchdogUnsubscribedWithDeadlines');
    expect(f.message).toContain('emailOptOut (global)');
  });
});

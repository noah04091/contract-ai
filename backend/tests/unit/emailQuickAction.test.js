// 📁 backend/tests/unit/emailQuickAction.test.js
// Mail-Knopf-Fix 03.09.2026: erste Testabdeckung für den Mail-Aktions-Pfad
// (die alte Route hatte NULL Tests — deshalb fiel der Login-Zwang-Bug nie auf).
// Beweist die Review-Auflagen: GET schreibt nie · POST prüft neu und führt aus ·
// Schon-erledigt pro Link · dismissed wird nie still reaktiviert · Fehler = HTML.

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

const { renderMailActionPage, executeMailAction } = require('../../routes/emailQuickAction');
const { isQuickActionPayload, isSessionTokenPayload } = require('../../utils/tokenShape');

const EVENT_ID = '65f000000000000000000001';
const USER_ID = '507f1f77bcf86cd799439011';

function tokenAlt() { // Bestands-Mails (vor 03.09.): ohne type-Feld
  return jwt.sign({ eventId: EVENT_ID, userId: USER_ID }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
function tokenNeu() {
  return jwt.sign({ eventId: EVENT_ID, userId: USER_ID, type: 'mail_action' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function mkRes() {
  return {
    statusCode: null, headers: {}, body: null,
    status(c) { this.statusCode = c; return this; },
    set(h) { Object.assign(this.headers, h); return this; },
    send(b) { this.body = String(b); return this; }
  };
}

function mkDb(event) {
  const calls = { updateOne: [], insertOne: [], findOne: 0 };
  const db = {
    collection: (name) => ({
      findOne: async () => { calls.findOne++; return event; },
      updateOne: async (filter, update) => { calls.updateOne.push({ name, filter, update }); return { matchedCount: 1 }; },
      insertOne: async (doc) => { calls.insertOne.push({ name, doc }); return { insertedId: 'neu' }; },
      countDocuments: async () => 0
    })
  };
  return { db, calls };
}

function mkEvent(extra = {}) {
  const { ObjectId } = require('mongodb');
  return {
    _id: new ObjectId(EVENT_ID),
    userId: new ObjectId(USER_ID),
    title: 'Kündigungsfrist Telekom',
    date: new Date('2026-10-15T12:00:00Z'),
    type: 'CUSTOM_REMINDER', // shiftable → applySnooze Zweig A
    status: 'notified',
    severity: 'warning',
    metadata: {},
    ...extra
  };
}

function mkReq(db, { query = {}, body = {}, contentLength } = {}) {
  return { query, body, db, headers: contentLength !== undefined ? { 'content-length': String(contentLength) } : {} };
}

describe('Token-Form isQuickActionPayload', () => {
  test('akzeptiert Alt-Form (ohne type) und neue mail_action-Form', () => {
    expect(isQuickActionPayload({ eventId: EVENT_ID, userId: USER_ID })).toBe(true);
    expect(isQuickActionPayload({ eventId: EVENT_ID, userId: USER_ID, type: 'mail_action' })).toBe(true);
  });
  test('lehnt Session-, Sync- und Fremdformen ab', () => {
    expect(isQuickActionPayload({ email: 'a@b.c', userId: USER_ID })).toBe(false);
    expect(isQuickActionPayload({ eventId: EVENT_ID, userId: USER_ID, email: 'a@b.c' })).toBe(false);
    expect(isQuickActionPayload({ userId: USER_ID, type: 'calendar_sync', nonce: 'x' })).toBe(false);
    expect(isQuickActionPayload({ eventId: EVENT_ID, userId: USER_ID, type: 'anderes' })).toBe(false);
  });
  test('mail_action-Token bleibt als LOGIN abgelehnt (Stufe-0-Invariante)', () => {
    expect(isSessionTokenPayload({ eventId: EVENT_ID, userId: USER_ID, type: 'mail_action' })).toBe(false);
  });
});

describe('GET Bestätigungsseite — schreibt NIE', () => {
  test('gültiger Alt-Token: 200, HTML-Formular auf /confirm, kein einziger Write', async () => {
    const { db, calls } = mkDb(mkEvent());
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: tokenAlt(), action: 'snooze', days: '7' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/html');
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toContain('/api/calendar/quick-action/confirm');
    expect(res.body).toContain('method="POST"');
    expect(calls.updateOne.length + calls.insertOne.length).toBe(0);
  });

  test('neuer mail_action-Token funktioniert ebenso', async () => {
    const { db, calls } = mkDb(mkEvent());
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: tokenNeu(), action: 'dismiss' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('ausschalten');
    expect(calls.updateOne.length + calls.insertOne.length).toBe(0);
  });

  test('kaputter Token: freundliches HTML (kein JSON), Status 400', async () => {
    const { db } = mkDb(mkEvent());
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: 'kaputt.und.falsch', action: 'snooze' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.headers['Content-Type']).toContain('text/html');
    expect(res.body).toContain('abgelaufen');
  });

  test('unbekannte Aktion wird abgewiesen', async () => {
    const { db } = mkDb(mkEvent());
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: tokenAlt(), action: 'delete' } }), res);
    expect(res.statusCode).toBe(400);
  });

  test('Event weg: 404-Seite', async () => {
    const { db } = mkDb(null);
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: tokenAlt(), action: 'snooze' } }), res);
    expect(res.statusCode).toBe(404);
  });

  test('ausgeschaltete Erinnerung + snooze: KEIN Formular, keine stille Reaktivierung', async () => {
    const { db, calls } = mkDb(mkEvent({ status: 'dismissed' }));
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: tokenAlt(), action: 'snooze' } }), res);
    expect(res.body).not.toContain('method="POST"');
    expect(res.body).toContain('ausgeschaltet');
    expect(calls.updateOne.length).toBe(0);
  });

  test('Schon-erledigt-Merker desselben Links: Hinweis statt Formular', async () => {
    const token = tokenAlt();
    const crypto = require('crypto');
    const key = crypto.createHash('sha1').update(`${token}|snooze`).digest('hex');
    const { db } = mkDb(mkEvent({ metadata: { lastMailActionKey: key } }));
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token, action: 'snooze' } }), res);
    expect(res.body).toContain('Schon erledigt');
    expect(res.body).not.toContain('method="POST"');
  });

  test('XSS: Event-Titel mit HTML wird escaped, days=999 fällt auf 7', async () => {
    const { db } = mkDb(mkEvent({ title: '<script>alert(1)</script>' }));
    const res = mkRes();
    await renderMailActionPage(mkReq(db, { query: { token: tokenAlt(), action: 'snooze', days: '999' } }), res);
    expect(res.body).not.toContain('<script>alert');
    expect(res.body).toContain('&lt;script&gt;');
    expect(res.body).toContain('value="7"');
  });
});

describe('POST /confirm — führt aus, genau einmal pro Link', () => {
  test('snooze (shiftable): Datum verschoben + Merker gesetzt + Erledigt-Seite', async () => {
    const { db, calls } = mkDb(mkEvent());
    const res = mkRes();
    await executeMailAction(mkReq(db, { body: { token: tokenAlt(), action: 'snooze', days: '7' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Erledigt');
    const dateWrite = calls.updateOne.find(u => u.update?.$set?.date);
    expect(dateWrite).toBeTruthy();
    expect(dateWrite.update.$set.status).toBe('scheduled');
    const merker = calls.updateOne.find(u => u.update?.$set?.['metadata.lastMailActionKey']);
    expect(merker).toBeTruthy();
  });

  test('zweiter POST desselben Links: KEINE erneute Ausführung', async () => {
    const token = tokenAlt();
    const crypto = require('crypto');
    const key = crypto.createHash('sha1').update(`${token}|snooze`).digest('hex');
    const { db, calls } = mkDb(mkEvent({ metadata: { lastMailActionKey: key } }));
    const res = mkRes();
    await executeMailAction(mkReq(db, { body: { token, action: 'snooze', days: '7' } }), res);
    expect(res.body).toContain('Schon erledigt');
    expect(calls.updateOne.length + calls.insertOne.length).toBe(0);
  });

  test('dismiss: Status dismissed + Merker', async () => {
    const { db, calls } = mkDb(mkEvent());
    const res = mkRes();
    await executeMailAction(mkReq(db, { body: { token: tokenNeu(), action: 'dismiss' } }), res);
    const dismissWrite = calls.updateOne.find(u => u.update?.$set?.status === 'dismissed');
    expect(dismissWrite).toBeTruthy();
    expect(res.body).toContain('ausgeschaltet');
  });

  test('dismissed + snooze: keine Ausführung', async () => {
    const { db, calls } = mkDb(mkEvent({ status: 'dismissed' }));
    const res = mkRes();
    await executeMailAction(mkReq(db, { body: { token: tokenAlt(), action: 'snooze' } }), res);
    expect(calls.updateOne.length).toBe(0);
    expect(res.body).toContain('ausgeschaltet');
  });

  test('übergroßer Body: 413, keine Ausführung', async () => {
    const { db, calls } = mkDb(mkEvent());
    const res = mkRes();
    await executeMailAction(mkReq(db, { body: { token: tokenAlt(), action: 'snooze' }, contentLength: 10000 }), res);
    expect(res.statusCode).toBe(413);
    expect(calls.updateOne.length).toBe(0);
  });
});

describe('applySnooze-Härtung (Review-Auflagen)', () => {
  const { applySnooze } = require('../../services/calendarSnooze');

  test('days-Deckel: 999 fällt auf 7 (auch für den App-Pfad)', async () => {
    const ev = mkEvent(); // date liegt in der Zukunft → Basis der Verschiebung
    const { db, calls } = mkDb(ev);
    await applySnooze(db, ev, 999);
    const w = calls.updateOne[0];
    const diffTage = Math.round((w.update.$set.date - ev.date.getTime()) / 86400000);
    expect(diffTage).toBe(7); // gedeckelt auf Default 7, nie 999
  });

  test('days-Deckel: 30 bleibt erlaubt', async () => {
    const ev = mkEvent();
    const { db, calls } = mkDb(ev);
    await applySnooze(db, ev, 30);
    const w = calls.updateOne[0];
    const diffTage = Math.round((w.update.$set.date - ev.date.getTime()) / 86400000);
    expect(diffTage).toBe(30);
  });
});

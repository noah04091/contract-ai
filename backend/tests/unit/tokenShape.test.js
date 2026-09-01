// 📁 backend/tests/unit/tokenShape.test.js
// 🔒 Stufe 0 des Kalender-Sync-Audits (01.09.2026): Token-Form-Härtung.
// Beweist: (1) Zweck-Tokens (Kalender-Feed 365d, Mail-Quick-Action 7d,
// Kampagnen-Tracking) sind KEINE Login-Sessions mehr; (2) der ICS-Feed
// akzeptiert nur den aktuell gespeicherten calendar_sync-Token (echter Widerruf);
// (3) kein legitimer Session-Erzeuger wird ausgesperrt.

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

const { isSessionTokenPayload, isCalendarSyncPayload, isStoredSyncToken } = require('../../utils/tokenShape');
const verifyToken = require('../../middleware/verifyToken');

// ===== Payload-Vorlagen: exakt die Formen der realen jwt.sign-Stellen =====
const SESSION = { email: 'user@example.com', userId: '507f1f77bcf86cd799439011' };            // auth.js / emailVerification.js / organizations.js / Refresh
const CALENDAR_SYNC = { userId: '507f1f77bcf86cd799439011', type: 'calendar_sync', nonce: 'abcd1234' }; // calendar.js generateSyncToken
const QUICK_ACTION = { eventId: '65f000000000000000000001', userId: '507f1f77bcf86cd799439011' };        // calendarNotifier.js generateActionToken
const TRACKING_OPEN = { c: 'camp1', r: 'rec1', t: 'o' };                                       // campaignTrackingService.js

describe('isSessionTokenPayload — nur echte Sessions', () => {
  test('akzeptiert die Session-Form aller 4 Erzeuger (email + userId, kein type)', () => {
    expect(isSessionTokenPayload(SESSION)).toBe(true);
  });

  test('lehnt den Kalender-Sync-Token ab (kein email, type gesetzt)', () => {
    expect(isSessionTokenPayload(CALENDAR_SYNC)).toBe(false);
  });

  test('lehnt den Mail-Quick-Action-Token ab (kein email)', () => {
    expect(isSessionTokenPayload(QUICK_ACTION)).toBe(false);
  });

  test('lehnt Kampagnen-Tracking-Tokens ab (weder email noch userId)', () => {
    expect(isSessionTokenPayload(TRACKING_OPEN)).toBe(false);
  });

  test('lehnt Session-Form MIT type-Feld ab (Zukunfts-Absicherung)', () => {
    expect(isSessionTokenPayload({ ...SESSION, type: 'irgendwas' })).toBe(false);
  });

  test('lehnt kaputte Eingaben ab (null, undefined, String, leeres Objekt)', () => {
    expect(isSessionTokenPayload(null)).toBe(false);
    expect(isSessionTokenPayload(undefined)).toBe(false);
    expect(isSessionTokenPayload('token')).toBe(false);
    expect(isSessionTokenPayload({})).toBe(false);
    expect(isSessionTokenPayload({ email: 'a@b.c' })).toBe(false);
    expect(isSessionTokenPayload({ userId: 'x' })).toBe(false);
  });
});

describe('isCalendarSyncPayload — nur echte Feed-Tokens', () => {
  test('akzeptiert die Feed-Form (type calendar_sync + userId, seit Commit 8840313b unverändert)', () => {
    expect(isCalendarSyncPayload(CALENDAR_SYNC)).toBe(true);
  });

  test('lehnt Session-, Quick-Action- und Tracking-Tokens ab', () => {
    expect(isCalendarSyncPayload(SESSION)).toBe(false);
    expect(isCalendarSyncPayload(QUICK_ACTION)).toBe(false);
    expect(isCalendarSyncPayload(TRACKING_OPEN)).toBe(false);
  });

  test('lehnt calendar_sync ohne userId und kaputte Eingaben ab', () => {
    expect(isCalendarSyncPayload({ type: 'calendar_sync' })).toBe(false);
    expect(isCalendarSyncPayload(null)).toBe(false);
    expect(isCalendarSyncPayload({})).toBe(false);
  });
});

describe('isStoredSyncToken — echter Widerruf', () => {
  const token = 'ey.gespeicherter.token';

  test('akzeptiert nur den exakt gespeicherten Token', () => {
    expect(isStoredSyncToken(token, { calendarSyncToken: token })).toBe(true);
  });

  test('lehnt einen anderen (z. B. vor dem Regenerate ausgegebenen) Token ab', () => {
    expect(isStoredSyncToken('ey.alter.token', { calendarSyncToken: token })).toBe(false);
  });

  test('null-sicher: fehlendes User-Doc oder fehlendes/nicht-string Feld → false, kein Throw', () => {
    expect(isStoredSyncToken(token, null)).toBe(false);
    expect(isStoredSyncToken(token, undefined)).toBe(false);
    expect(isStoredSyncToken(token, {})).toBe(false);
    expect(isStoredSyncToken(token, { calendarSyncToken: null })).toBe(false);
    expect(isStoredSyncToken(token, { calendarSyncToken: 12345 })).toBe(false);
  });

  test('lehnt leeren/fehlenden Token-String ab', () => {
    expect(isStoredSyncToken('', { calendarSyncToken: '' })).toBe(false);
    expect(isStoredSyncToken(null, { calendarSyncToken: null })).toBe(false);
  });
});

// ===== Integration: die Middleware selbst =====
describe('verifyToken — Zweck-Tokens sind keine Logins mehr', () => {
  function mkReq(bearerPayload) {
    return {
      originalUrl: '/api/contracts',
      cookies: {},
      headers: { authorization: `Bearer ${jwt.sign(bearerPayload, process.env.JWT_SECRET)}` }
    };
  }
  function mkRes() {
    return {
      statusCode: null,
      body: null,
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
      cookie() { return this; },
      setHeader() { return this; }
    };
  }

  test('Session-Token läuft durch', () => {
    const res = mkRes();
    let passed = false;
    verifyToken(mkReq(SESSION), res, () => { passed = true; });
    expect(passed).toBe(true);
  });

  test('Kalender-Sync-Token (365d, liegt bei Google/Apple) wird als Login abgelehnt', () => {
    const res = mkRes();
    let passed = false;
    verifyToken(mkReq(CALENDAR_SYNC), res, () => { passed = true; });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('Mail-Quick-Action-Token (7d, in jeder Erinnerungs-Mail) wird als Login abgelehnt', () => {
    const res = mkRes();
    let passed = false;
    verifyToken(mkReq(QUICK_ACTION), res, () => { passed = true; });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('Kampagnen-Tracking-Token wird als Login abgelehnt', () => {
    const res = mkRes();
    let passed = false;
    verifyToken(mkReq(TRACKING_OPEN), res, () => { passed = true; });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('Ablehnung ist von ungültiger Signatur nicht unterscheidbar (gleiche Fehlerform, kein Orakel)', () => {
    const resZweck = mkRes();
    verifyToken(mkReq(CALENDAR_SYNC), resZweck, () => {});

    const resKaputt = mkRes();
    verifyToken({
      originalUrl: '/api/contracts',
      cookies: {},
      headers: { authorization: 'Bearer kaputt.und.falsch' }
    }, resKaputt, () => {});

    expect(resZweck.statusCode).toBe(resKaputt.statusCode);
    expect(resZweck.body.error).toBe(resKaputt.body.error);
  });
});

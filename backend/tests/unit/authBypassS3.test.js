// 📁 backend/tests/unit/authBypassS3.test.js
// 23.08.2026 — schwerste TÜV-Lücke: unauthentifizierter Datei-Download.
//
// `verifyToken` und `checkSubscription` uebersprangen die Pruefung, wenn
// `req.originalUrl` IRGENDWO die Zeichenkette '/api/contracts/email-import' enthielt.
// Da originalUrl den Query-String einschliesst, oeffnete `?x=/api/contracts/email-import`
// jede geschuetzte Route OHNE Anmeldung. Am Produktivsystem belegt:
//   GET /api/s3/view?key=…&x=/api/contracts/email-import  → HTTP 200 ohne Token.
//
// Diese Tests nageln fest: NUR der exakte Pfad wird durchgelassen, das Anhaengsel nicht.

const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret-fuer-unit';

const verifyToken = require('../../middleware/verifyToken');

const mkReq = (originalUrl, headers = {}) => ({
  originalUrl,
  headers,
  cookies: {},
  connection: {},
});
const mkRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

describe('verifyToken: der email-import-Skip greift NUR beim exakten Pfad', () => {
  test('🔴 Angriff: s3/view mit ?x=/api/contracts/email-import wird NICHT durchgelassen', () => {
    let passed = false;
    const req = mkReq('/api/s3/view?key=contracts/fremd.pdf&x=/api/contracts/email-import');
    const res = mkRes();
    verifyToken(req, res, () => { passed = true; });
    // Ohne gueltiges Token MUSS die Anfrage abgewiesen werden (kein next()).
    expect(passed).toBe(false);
    expect(res.statusCode).toBeGreaterThanOrEqual(401);
  });

  test('🔴 Angriff 2: Pfad-Trick /api/contracts/email-import/../s3/view wird NICHT durchgelassen', () => {
    let passed = false;
    const req = mkReq('/api/contracts/email-import/../s3/view?key=x');
    const res = mkRes();
    verifyToken(req, res, () => { passed = true; });
    expect(passed).toBe(false);
  });

  test('✅ legitim: der exakte Pfad /api/contracts/email-import wird OHNE Token durchgelassen', () => {
    let passed = false;
    const req = mkReq('/api/contracts/email-import');
    const res = mkRes();
    verifyToken(req, res, () => { passed = true; });
    expect(passed).toBe(true);
  });

  test('✅ legitim auch mit harmlosem Query (?source=webhook)', () => {
    let passed = false;
    const req = mkReq('/api/contracts/email-import?source=webhook');
    const res = mkRes();
    verifyToken(req, res, () => { passed = true; });
    expect(passed).toBe(true);
  });

  test('✅ eine normale geschuetzte Route ohne Token wird weiterhin abgewiesen', () => {
    let passed = false;
    const req = mkReq('/api/contracts');
    const res = mkRes();
    verifyToken(req, res, () => { passed = true; });
    expect(passed).toBe(false);
    expect(res.statusCode).toBeGreaterThanOrEqual(401);
  });

  test('✅ mit GUELTIGEM Token laeuft eine normale Route durch', () => {
    let passed = false;
    // 01.09.2026: email ergänzt — verifyToken verlangt seit der Token-Form-Härtung
    // (utils/tokenShape.js) echte Session-Payloads (email + userId, kein type).
    const token = jwt.sign({ userId: 'abc123', email: 'test@example.com' }, process.env.JWT_SECRET);
    const req = mkReq('/api/contracts', { authorization: `Bearer ${token}` });
    const res = mkRes();
    verifyToken(req, res, () => { passed = true; });
    expect(passed).toBe(true);
  });
});

// 📁 backend/tests/unit/errorAlarmEinstufung.test.js
// 20.08.2026 — Auslöser war ein ECHTER Fehlalarm:
//
// Ein Terminal testete mit curl, ob ein Anfrage-Inhalt den Weg über Vercel + Cloudflare
// bis zum Backend übersteht, und schickte dafür absichtlich kaputtes JSON (`{kaputt`)
// an DELETE /api/auth/delete. Der Server lehnte völlig korrekt mit 400 ab — die
// Alarm-Mail stufte das trotzdem als "high" ein und nannte weder den Absender noch
// den Grund, warum "Nicht eingeloggt" dort stand.
//
// Diese Tests nageln die drei Korrekturen fest.

jest.mock('../../utils/sendEmail', () => jest.fn().mockResolvedValue(true));
const sendEmail = require('../../utils/sendEmail');
const { captureError, CONFIG } = require('../../services/errorMonitoring');

const bauFehler = (name, nachricht, status, typ) => {
  const e = new Error(nachricht);
  e.name = name;
  if (status !== undefined) e.status = status;
  if (typ !== undefined) e.type = typ;
  return e;
};

describe('Einstufung: Eingabefehler unter /auth/ sind kein "high" mehr', () => {
  test('DER REALFALL: kaputter Anfrage-Inhalt (400) auf /api/auth/delete ist "low"', async () => {
    const fehler = bauFehler('SyntaxError', "Expected property name or '}' in JSON at position 1", 400, 'entity.parse.failed');
    const r = await captureError(fehler, { route: '/api/auth/delete', method: 'DELETE' });
    expect(r.severity).toBe('low');
  });

  test('auch ein 403 unter /auth/ ist nur ein Eingabefehler', async () => {
    const r = await captureError(bauFehler('Error', 'verboten-403-probe', 403), { route: '/api/auth/reset' });
    expect(r.severity).toBe('low');
  });

  test('401 bleibt "low" wie bisher (kein Verhaltenswechsel)', async () => {
    const r = await captureError(bauFehler('Error', 'nicht-angemeldet-probe', 401), { route: '/api/auth/login' });
    expect(r.severity).toBe('low');
  });
});

describe('⚠️ Regressionswächter: echte Störungen bleiben laut', () => {
  test('ein 500 unter /auth/ bleibt "high"', async () => {
    const r = await captureError(bauFehler('Error', 'serverfehler-probe', 500), { route: '/api/auth/login' });
    expect(r.severity).toBe('high');
  });

  test('ein ABSTURZ ohne Status unter /auth/ bleibt "high" — genau dafür gibt es die Regel', async () => {
    const r = await captureError(bauFehler('TypeError', 'absturz-ohne-status-probe'), { route: '/api/auth/login' });
    expect(r.severity).toBe('high');
  });

  test('Datenbankfehler bleiben "critical"', async () => {
    const r = await captureError(bauFehler('MongoServerError', 'db-probe'), { route: '/api/auth/login' });
    expect(r.severity).toBe('critical');
  });

  test('ein 404 außerhalb von /auth/ bleibt "low"', async () => {
    const r = await captureError(bauFehler('Error', 'nicht-gefunden-probe', 404), { route: '/api/contracts/:id' });
    expect(r.severity).toBe('low');
  });
});

describe('Alarm-Mail nennt jetzt den Absender', () => {
  beforeEach(() => {
    sendEmail.mockClear();
    CONFIG.alertEmail = 'alarm-test@example.invalid';
    CONFIG.errorCountThisHour = 0;
  });

  const letzteMail = () => sendEmail.mock.calls[sendEmail.mock.calls.length - 1][0].html;

  test('Absender und IP stehen in der Mail', async () => {
    await captureError(bauFehler('TypeError', 'absender-probe-1'), {
      route: '/api/auth/login', method: 'POST', userAgent: 'curl/8.21.0', ip: '203.0.113.9'
    });
    expect(sendEmail).toHaveBeenCalled();
    const html = letzteMail();
    expect(html).toContain('curl/8.21.0');
    expect(html).toContain('203.0.113.9');
  });

  test('🔒 ein präparierter Absender wird maskiert, nicht als Markup eingebaut', async () => {
    await captureError(bauFehler('TypeError', 'absender-probe-2'), {
      route: '/api/auth/login', userAgent: '<script>alert(1)</script>', ip: '203.0.113.9'
    });
    const html = letzteMail();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('bei Abbruch vor der Anmeldeprüfung sagt die Mail das ehrlich', async () => {
    const fehler = bauFehler('TypeError', 'vor-anmeldung-probe', undefined, 'entity.parse.failed');
    await captureError(fehler, { route: '/api/auth/delete', method: 'DELETE', userAgent: 'curl/8.21.0' });
    const html = letzteMail();
    expect(html).toContain('Abbruch vor der Anmeldeprüfung');
    expect(html).not.toContain('Nicht eingeloggt');
  });

  test('ohne solchen Abbruch bleibt die bisherige Angabe stehen', async () => {
    await captureError(bauFehler('TypeError', 'normal-probe'), { route: '/api/auth/login', userAgent: 'Mozilla/5.0' });
    const html = letzteMail();
    expect(html).toContain('Nicht eingeloggt');
    expect(html).not.toContain('Abbruch vor der Anmeldeprüfung');
  });

  test('ein angemeldeter Nutzer wird weiterhin genannt', async () => {
    await captureError(bauFehler('TypeError', 'nutzer-probe'), { route: '/api/auth/login', userId: 'abc123', userAgent: 'Mozilla/5.0' });
    expect(letzteMail()).toContain('abc123');
  });
});

describe('🔒 Auch die Fehlermeldung selbst wird maskiert', () => {
  beforeEach(() => {
    sendEmail.mockClear();
    CONFIG.alertEmail = 'alarm-test@example.invalid';
    CONFIG.errorCountThisHour = 0;
  });

  test('Markup in der Fehlermeldung landet escaped in der Mail', async () => {
    // Realistisch: body-parser-Meldungen enthalten Teile des gesendeten Inhalts.
    const fehler = bauFehler('SyntaxError', 'Unexpected token <img src=x onerror=alert(1)> in JSON');
    await captureError(fehler, { route: '/api/auth/login', userAgent: 'curl/8.21.0' });
    const html = sendEmail.mock.calls[sendEmail.mock.calls.length - 1][0].html;
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('Markup im Stack Trace landet escaped in der Mail', async () => {
    const fehler = bauFehler('TypeError', 'stack-probe');
    fehler.stack = 'TypeError: <script>alert(1)</script>\n    at irgendwo';
    await captureError(fehler, { route: '/api/auth/login' });
    const html = sendEmail.mock.calls[sendEmail.mock.calls.length - 1][0].html;
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

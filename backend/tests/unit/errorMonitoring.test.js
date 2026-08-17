// 📁 backend/tests/unit/errorMonitoring.test.js
// Unit-Tests für Error Monitoring System

const {
  captureError,
  captureHttpErrorResponse,
  normalizeRoutePath,
  errorHandler,
  CONFIG
} = require('../../services/errorMonitoring');

describe('Error Monitoring', () => {
  describe('captureError()', () => {
    test('erfasst einfachen Fehler', async () => {
      const error = new Error('Test error');
      const context = { route: '/api/test', method: 'GET' };

      const result = await captureError(error, context);

      expect(result).toBeDefined();
      expect(result.fingerprint).toBeDefined();
      expect(result.severity).toBeDefined();
    });

    test('bestimmt Severity für Server-Fehler korrekt', async () => {
      const error = new Error('Server error');
      error.status = 500;

      const result = await captureError(error, {});

      expect(result.severity).toBe('high');
    });

    test('bestimmt Severity für Client-Fehler korrekt', async () => {
      const error = new Error('Not found');
      error.status = 404;

      const result = await captureError(error, {});

      expect(result.severity).toBe('low');
    });

    test('generiert konsistenten Fingerprint für gleiche Fehler', async () => {
      const error1 = new Error('Same error');
      const error2 = new Error('Same error');
      const context = { route: '/api/test', method: 'POST' };

      const result1 = await captureError(error1, context);
      const result2 = await captureError(error2, context);

      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    test('generiert unterschiedliche Fingerprints für verschiedene Fehler', async () => {
      const error1 = new Error('Error one');
      const error2 = new Error('Error two');
      const context = { route: '/api/test', method: 'POST' };

      const result1 = await captureError(error1, context);
      const result2 = await captureError(error2, context);

      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });

    // 🐛 17.08.2026: Regressionsschutz. Vorher kuerzte generateFingerprint auf
    // 32 Base64-Zeichen = 24 Byte Klartext, sodass NUR der Fehlername einging.
    // Route, Methode und Meldung fielen weg -> verschiedene Stoerungen galten als
    // dieselbe und wurden innerhalb der Ruhezeit stillschweigend verschluckt.
    test('Fingerprint unterscheidet Routen bei identischem Fehlernamen', async () => {
      const bauen = () => Object.assign(new Error('HTTP 500 aufgetreten'), { name: 'HttpErrorResponse' });
      const a = await captureError(bauen(), { route: '/api/analyze', method: 'POST' });
      const b = await captureError(bauen(), { route: '/api/optimize', method: 'POST' });
      expect(a.fingerprint).not.toBe(b.fingerprint);
    });

    test('Fingerprint unterscheidet Methoden bei identischer Route', async () => {
      const bauen = () => Object.assign(new Error('HTTP 500 aufgetreten'), { name: 'HttpErrorResponse' });
      const a = await captureError(bauen(), { route: '/api/analyze', method: 'POST' });
      const b = await captureError(bauen(), { route: '/api/analyze', method: 'GET' });
      expect(a.fingerprint).not.toBe(b.fingerprint);
    });

    test('crasht nicht bei fehlerhaftem Input', async () => {
      // Sollte nicht werfen
      const result1 = await captureError(null, {});
      const result2 = await captureError(undefined, {});
      const result3 = await captureError({}, {});

      // Sollte graceful handlen
      expect(result1).toBeDefined();
    });
  });

  describe('errorHandler Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFn;

    beforeEach(() => {
      mockReq = {
        originalUrl: '/api/test',
        method: 'GET',
        user: { userId: '123', email: 'test@test.com' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Jest Test' },
        body: {},
        query: {}
      };

      mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      nextFn = jest.fn();
    });

    test('sendet 500 für unbekannte Fehler', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('interner Fehler')
        })
      );
    });

    test('verwendet Fehler-Statuscode wenn vorhanden', () => {
      const error = new Error('Bad request');
      error.status = 400;

      errorHandler(error, mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('sendet keine Response wenn Headers bereits gesendet', () => {
      mockRes.headersSent = true;
      const error = new Error('Test');

      errorHandler(error, mockReq, mockRes, nextFn);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('CONFIG', () => {
    test('hat Standard-Konfiguration', () => {
      expect(CONFIG.emailThreshold).toBeDefined();
      expect(CONFIG.maxErrorsPerHour).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // 🚨 17.08.2026 — Routen-Fehler erreichen die Alarmierung
  // Vorher: 578 res.status(5xx)-Stellen in 61 Routendateien, 0x next(err),
  // also erreichte KEIN Routen-Fehler dieses System.
  // ===================================================================

  describe('normalizeRoutePath()', () => {
    test('ersetzt eine Vertrags-ID durch das Muster', () => {
      const req = { originalUrl: '/api/contracts/68abc4f1d2e9aa0011223344/analyze' };
      expect(normalizeRoutePath(req)).toBe('/api/contracts/:id/analyze');
    });

    test('schneidet den Query-Teil ab', () => {
      const req = { originalUrl: '/api/analyze?async=true&x=1' };
      expect(normalizeRoutePath(req)).toBe('/api/analyze');
    });

    test('bevorzugt das Express-Muster und benennt Parameter korrekt', () => {
      const req = {
        originalUrl: '/api/email-verification/abcDEF123456789xyzQRS',
        baseUrl: '/api/email-verification',
        route: { path: '/:token' }
      };
      expect(normalizeRoutePath(req)).toBe('/api/email-verification/:token');
    });

    test('faellt auf die Bereinigung zurueck, wenn das Express-Muster den Pfad nicht abdeckt', () => {
      // Genau dieser Fall tritt auf, wenn der globale errorHandler antwortet:
      // Express setzt req.baseUrl dann zurueck (im Mini-Test am 17.08. belegt).
      const req = {
        originalUrl: '/api/contracts/68abc4f1d2e9aa0011223344/analyze',
        baseUrl: '',
        route: { path: '/analyze' }
      };
      expect(normalizeRoutePath(req)).toBe('/api/contracts/:id/analyze');
    });

    test('generalisiert UUID, Job-ID, Hex-Token und reine Zahlen', () => {
      expect(normalizeRoutePath({ originalUrl: '/api/x/550e8400-e29b-41d4-a716-446655440000' }))
        .toBe('/api/x/:uuid');
      expect(normalizeRoutePath({ originalUrl: '/api/analyze/job/job_1755412345_ab12cd34' }))
        .toBe('/api/analyze/job/:jobId');
      expect(normalizeRoutePath({ originalUrl: '/api/unsubscribe/a1b2c3d4e5f6a7b8c9d0e1f2a3b4' }))
        .toBe('/api/unsubscribe/:hex');
      expect(normalizeRoutePath({ originalUrl: '/api/page/42' }))
        .toBe('/api/page/:n');
    });

    test('laesst normale Pfadteile unangetastet', () => {
      expect(normalizeRoutePath({ originalUrl: '/api/legal-pulse/dashboard' }))
        .toBe('/api/legal-pulse/dashboard');
      expect(normalizeRoutePath({ originalUrl: '/api/email-verification/resend' }))
        .toBe('/api/email-verification/resend');
    });

    test('stuerzt bei unbrauchbarem Input nicht ab', () => {
      expect(() => normalizeRoutePath(null)).not.toThrow();
      expect(() => normalizeRoutePath({})).not.toThrow();
    });
  });

  describe('captureHttpErrorResponse()', () => {
    const baseReq = () => ({
      originalUrl: '/api/contracts/68abc4f1d2e9aa0011223344/analyze',
      method: 'POST',
      user: { userId: 'u1', email: 'a@b.de' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Jest' }
    });

    beforeEach(() => {
      delete process.env.ROUTE_ERROR_ALERTS_ENABLED;
      CONFIG.routeAlertMailsThisHour = 0;
      CONFIG.routeAlertHourStart = Date.now();
    });

    test('meldet eine 5xx-Antwort mit Severity high', async () => {
      const ergebnis = await captureHttpErrorResponse(baseReq(), { statusCode: 500 });
      expect(ergebnis).not.toBeNull();
      expect(ergebnis.severity).toBe('high');
    });

    test('meldet 4xx und 2xx NICHT', async () => {
      expect(await captureHttpErrorResponse(baseReq(), { statusCode: 400 })).toBeNull();
      expect(await captureHttpErrorResponse(baseReq(), { statusCode: 404 })).toBeNull();
      expect(await captureHttpErrorResponse(baseReq(), { statusCode: 429 })).toBeNull();
      expect(await captureHttpErrorResponse(baseReq(), { statusCode: 202 })).toBeNull();
    });

    test('meldet nicht doppelt, wenn der errorHandler den Fehler schon erfasst hat', async () => {
      const res = { statusCode: 500, __caErrorCaptured: true };
      expect(await captureHttpErrorResponse(baseReq(), res)).toBeNull();
    });

    test('gleiche Route mit verschiedenen IDs ergibt denselben Fingerabdruck', async () => {
      // Das ist der eigentliche Schutz gegen eine Mailflut: Ohne Normalisierung
      // waere jede Anfrage ein eigener Fingerabdruck, der Cooldown griffe nie.
      const a = await captureHttpErrorResponse(
        { ...baseReq(), originalUrl: '/api/contracts/68abc4f1d2e9aa0011223344/analyze' },
        { statusCode: 500 }
      );
      const b = await captureHttpErrorResponse(
        { ...baseReq(), originalUrl: '/api/contracts/71ff02aa9b3c000011112222/analyze' },
        { statusCode: 500 }
      );
      expect(a.fingerprint).toBe(b.fingerprint);
    });

    test('verschiedene Routen ergeben verschiedene Fingerabdruecke', async () => {
      const a = await captureHttpErrorResponse(
        { ...baseReq(), originalUrl: '/api/analyze' }, { statusCode: 500 }
      );
      const b = await captureHttpErrorResponse(
        { ...baseReq(), originalUrl: '/api/optimize' }, { statusCode: 500 }
      );
      expect(a.fingerprint).not.toBe(b.fingerprint);
    });

    test('Notbremse per Umgebungsvariable schaltet die Meldung ab', async () => {
      process.env.ROUTE_ERROR_ALERTS_ENABLED = 'false';
      expect(await captureHttpErrorResponse(baseReq(), { statusCode: 500 })).toBeNull();
    });

    test('erfasst weiter, stuft aber auf medium herab, wenn das Mail-Budget erschoepft ist', async () => {
      CONFIG.routeAlertMailsThisHour = CONFIG.maxRouteAlertMailsPerHour;
      const ergebnis = await captureHttpErrorResponse(baseReq(), { statusCode: 503 });
      // Eintrag bleibt erhalten (Admin-Dashboard), nur die Mail entfaellt.
      expect(ergebnis).not.toBeNull();
      expect(ergebnis.severity).toBe('medium');
    });

    test('wirft niemals, auch nicht bei unbrauchbarem Input', () => {
      expect(() => captureHttpErrorResponse(null, null)).not.toThrow();
      expect(() => captureHttpErrorResponse(undefined, { statusCode: 500 })).not.toThrow();
      expect(() => captureHttpErrorResponse({}, {})).not.toThrow();
    });
  });

  describe('errorHandler setzt die Marke gegen Doppelmeldung', () => {
    test('markiert die Response, damit der 5xx-Beobachter sie ueberspringt', () => {
      const res = { headersSent: false, status: jest.fn().mockReturnThis(), json: jest.fn() };
      errorHandler(new Error('x'), { originalUrl: '/api/test', method: 'GET', headers: {} }, res, jest.fn());
      expect(res.__caErrorCaptured).toBe(true);
    });
  });
});

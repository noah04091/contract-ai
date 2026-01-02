// 📁 backend/tests/unit/errorMonitoring.test.js
// Unit-Tests für Error Monitoring System

const { captureError, errorHandler, CONFIG } = require('../../services/errorMonitoring');

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
});

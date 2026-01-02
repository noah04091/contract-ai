// 📁 backend/tests/unit/verifyToken.test.js
// Unit-Tests für JWT Token Verification Middleware

const jwt = require('jsonwebtoken');

// Mock JWT_SECRET für Tests
process.env.JWT_SECRET = 'test-secret-key';

const verifyToken = require('../../middleware/verifyToken');

describe('verifyToken Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      cookies: {},
      headers: {},
      originalUrl: '/api/test'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      setHeader: jest.fn()
    };

    nextFn = jest.fn();
  });

  describe('Token aus Cookie', () => {
    test('akzeptiert gültigen Token aus Cookie', () => {
      const token = jwt.sign(
        { userId: '123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockReq.cookies.token = token;

      verifyToken(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.email).toBe('test@example.com');
      expect(mockReq.userId).toBe('123');
      expect(mockReq.tokenSource).toBe('cookie');
    });
  });

  describe('Token aus Authorization Header', () => {
    test('akzeptiert gültigen Bearer Token', () => {
      const token = jwt.sign(
        { userId: '456', email: 'header@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      verifyToken(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockReq.user.email).toBe('header@example.com');
      expect(mockReq.tokenSource).toBe('header');
    });
  });

  describe('Fehlende/Ungültige Tokens', () => {
    test('lehnt Request ohne Token ab (401)', () => {
      verifyToken(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('autorisiert')
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    test('lehnt ungültigen Token ab (403)', () => {
      mockReq.cookies.token = 'invalid-token-12345';

      verifyToken(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFn).not.toHaveBeenCalled();
    });

    test('lehnt abgelaufenen Token ab (403)', () => {
      const expiredToken = jwt.sign(
        { userId: '789', email: 'expired@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Bereits abgelaufen
      );

      mockReq.cookies.token = expiredToken;

      verifyToken(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('E-Mail Import Route Skip', () => {
    test('überspringt JWT-Check für email-import Route', () => {
      mockReq.originalUrl = '/api/contracts/email-import';

      verifyToken(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Silent Token Refresh', () => {
    test('erneuert Token der bald abläuft', () => {
      // Token der in 20 Minuten abläuft (unter 30 Min Threshold)
      const soonExpiringToken = jwt.sign(
        { userId: '999', email: 'refresh@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '20m' }
      );

      mockReq.cookies.token = soonExpiringToken;

      verifyToken(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      // Sollte neuen Token setzen
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Refreshed-Token',
        expect.any(String)
      );
    });

    test('erneuert Token NICHT wenn noch lange gültig', () => {
      // Token der in 2 Stunden abläuft
      const longValidToken = jwt.sign(
        { userId: '888', email: 'valid@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      mockReq.cookies.token = longValidToken;

      verifyToken(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      // Sollte KEINEN neuen Token setzen
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });
  });
});

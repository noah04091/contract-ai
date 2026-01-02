// 📁 backend/tests/unit/rateLimiter.test.js
// Unit-Tests für Rate Limiter

// Mock setInterval um Jest nicht zu blockieren
jest.useFakeTimers();

const { createRateLimiter } = require('../../middleware/rateLimiter');

describe('Rate Limiter', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Mock Request
    mockReq = {
      ip: '127.0.0.1',
      user: null
    };

    // Mock Response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn()
    };

    // Next Function
    nextFn = jest.fn();
  });

  describe('createRateLimiter()', () => {
    test('lässt Requests unter dem Limit durch', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
        prefix: 'test1:'
      });

      // Erster Request sollte durchgehen
      limiter(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    test('setzt korrekte Rate-Limit Headers', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
        prefix: 'test2:'
      });

      limiter(mockReq, mockRes, nextFn);

      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
    });

    test('blockiert nach Überschreitung des Limits', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        prefix: 'test3:',
        message: 'Rate limit exceeded'
      });

      // Simuliere mehrere Requests von derselben IP
      limiter(mockReq, mockRes, nextFn);
      limiter(mockReq, mockRes, nextFn);

      // Reset mocks für den dritten Request
      mockRes.status.mockClear();
      mockRes.json.mockClear();
      nextFn.mockClear();

      // Dritter Request sollte blockiert werden
      limiter(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED'
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    test('verwendet custom keyGenerator', () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key');

      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
        prefix: 'test4:',
        keyGenerator: customKeyGenerator
      });

      limiter(mockReq, mockRes, nextFn);

      expect(customKeyGenerator).toHaveBeenCalledWith(mockReq);
    });

    test('unterscheidet verschiedene IPs', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        prefix: 'test5:'
      });

      // Request von IP 1
      mockReq.ip = '192.168.1.1';
      limiter(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalled();

      // Reset
      nextFn.mockClear();

      // Request von IP 2 sollte auch durchgehen
      mockReq.ip = '192.168.1.2';
      limiter(mockReq, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });
  });
});

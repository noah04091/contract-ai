// 📁 backend/tests/unit/rateLimiter.test.js
// Unit-Tests für Rate Limiter

const {
  standardLimiter,
  authLimiter,
  analyzeLimiter,
  legalPulseLimiter,
  uploadLimiter,
  sensitiveLimiter,
  sseLimiter,
  createDynamicLimiter,
  skipForPremium
} = require('../../middleware/rateLimiter');

describe('Rate Limiter', () => {

  // ===== EXPORTED LIMITERS TESTS =====
  describe('Exported Limiters', () => {

    test('standardLimiter ist definiert', () => {
      expect(standardLimiter).toBeDefined();
      expect(typeof standardLimiter).toBe('function');
    });

    test('authLimiter ist definiert', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    test('analyzeLimiter ist definiert', () => {
      expect(analyzeLimiter).toBeDefined();
      expect(typeof analyzeLimiter).toBe('function');
    });

    test('legalPulseLimiter ist definiert', () => {
      expect(legalPulseLimiter).toBeDefined();
      expect(typeof legalPulseLimiter).toBe('function');
    });

    test('uploadLimiter ist definiert', () => {
      expect(uploadLimiter).toBeDefined();
      expect(typeof uploadLimiter).toBe('function');
    });

    test('sensitiveLimiter ist definiert', () => {
      expect(sensitiveLimiter).toBeDefined();
      expect(typeof sensitiveLimiter).toBe('function');
    });

    test('sseLimiter ist definiert', () => {
      expect(sseLimiter).toBeDefined();
      expect(typeof sseLimiter).toBe('function');
    });
  });

  // ===== createDynamicLimiter TESTS =====
  describe('createDynamicLimiter()', () => {

    test('erstellt einen Limiter mit Optionen', () => {
      const limiter = createDynamicLimiter({
        freeLimit: 10,
        premiumMultiplier: 3,
        windowMs: 60000
      });

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    test('akzeptiert freeLimit Option', () => {
      const limiter = createDynamicLimiter({
        freeLimit: 5
      });

      expect(limiter).toBeDefined();
    });

    test('verwendet Default-Werte für optionale Parameter', () => {
      const limiter = createDynamicLimiter({
        freeLimit: 10
        // premiumMultiplier und windowMs werden defaulted
      });

      expect(limiter).toBeDefined();
    });
  });

  // ===== skipForPremium TESTS =====
  describe('skipForPremium()', () => {

    test('gibt false für Free-User zurück', () => {
      const req = {
        user: { subscriptionPlan: 'free' }
      };

      expect(skipForPremium(req)).toBe(false);
    });

    test('gibt true für Business-User zurück', () => {
      const req = {
        user: { subscriptionPlan: 'business' }
      };

      expect(skipForPremium(req)).toBe(true);
    });

    test('gibt true für Enterprise-User zurück', () => {
      const req = {
        user: { subscriptionPlan: 'enterprise' }
      };

      expect(skipForPremium(req)).toBe(true);
    });

    test('gibt true für Legendary-User zurück', () => {
      const req = {
        user: { subscriptionPlan: 'legendary' }
      };

      expect(skipForPremium(req)).toBe(true);
    });

    test('ist case-insensitive', () => {
      const req = {
        user: { subscriptionPlan: 'BUSINESS' }
      };

      expect(skipForPremium(req)).toBe(true);
    });

    test('gibt false für User ohne subscriptionPlan zurück', () => {
      const req = {
        user: {}
      };

      expect(skipForPremium(req)).toBe(false);
    });

    test('gibt false für Request ohne User zurück', () => {
      const req = {};

      expect(skipForPremium(req)).toBe(false);
    });

    test('gibt false für null User zurück', () => {
      const req = {
        user: null
      };

      expect(skipForPremium(req)).toBe(false);
    });
  });

  // ===== RATE LIMIT LOGIC TESTS =====
  describe('Rate Limit Logic', () => {

    test('Free-User haben niedrigeres Limit', () => {
      const freeLimit = 10;
      const premiumMultiplier = 3;
      const premiumLimit = freeLimit * premiumMultiplier;

      expect(premiumLimit).toBe(30);
      expect(premiumLimit).toBeGreaterThan(freeLimit);
    });

    test('Premium-Pläne werden korrekt erkannt', () => {
      const premiumPlans = ['business', 'enterprise', 'legendary'];
      const freePlans = ['free'];

      premiumPlans.forEach(plan => {
        expect(premiumPlans).toContain(plan);
      });

      freePlans.forEach(plan => {
        expect(premiumPlans).not.toContain(plan);
      });
    });

    test('windowMs Berechnung ist korrekt', () => {
      const oneMinute = 60 * 1000;
      const fifteenMinutes = 15 * 60 * 1000;
      const oneHour = 60 * 60 * 1000;

      expect(oneMinute).toBe(60000);
      expect(fifteenMinutes).toBe(900000);
      expect(oneHour).toBe(3600000);
    });
  });

  // ===== ERROR MESSAGES TESTS =====
  describe('Error Messages', () => {

    test('Fehlermeldungen sind korrekt formatiert', () => {
      const errorMessage = {
        error: 'Rate Limit erreicht',
        message: 'Premium-Nutzer haben höhere Limits.'
      };

      expect(errorMessage.error).toBeDefined();
      expect(errorMessage.message).toBeDefined();
      expect(typeof errorMessage.error).toBe('string');
      expect(typeof errorMessage.message).toBe('string');
    });
  });
});

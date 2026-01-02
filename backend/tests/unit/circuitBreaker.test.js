// 📁 backend/tests/unit/circuitBreaker.test.js
// Unit-Tests für OpenAI Circuit Breaker

const {
  getCircuitBreakerStatus,
  resetCircuitBreaker
} = require('../../utils/openaiWithTracking');

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Reset vor jedem Test
    resetCircuitBreaker();
  });

  describe('getCircuitBreakerStatus()', () => {
    test('gibt initialen Status zurück', () => {
      const status = getCircuitBreakerStatus();

      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
      expect(status.lastFailureTime).toBeNull();
      expect(status.successesInHalfOpen).toBe(0);
    });
  });

  describe('resetCircuitBreaker()', () => {
    test('setzt alle Werte zurück', () => {
      // Status vor Reset manipulieren (simulieren)
      resetCircuitBreaker();

      const status = getCircuitBreakerStatus();
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
    });
  });

  describe('Circuit Breaker States', () => {
    test('Status enthält erwartete Properties', () => {
      const status = getCircuitBreakerStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failures');
      expect(status).toHaveProperty('lastFailureTime');
      expect(status).toHaveProperty('successesInHalfOpen');
    });

    test('State ist einer der erlaubten Werte', () => {
      const status = getCircuitBreakerStatus();
      const allowedStates = ['CLOSED', 'OPEN', 'HALF_OPEN'];

      expect(allowedStates).toContain(status.state);
    });
  });
});

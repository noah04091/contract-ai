// 📁 backend/tests/unit/subscriptionPlans.test.js
// Umfassende Unit-Tests für Subscription Plans

const {
  PLANS,
  PLAN_HIERARCHY,
  FEATURE_ACCESS,
  PLAN_LIMITS,
  hasFeatureAccess,
  isBusinessOrHigher,
  isEnterpriseOrHigher,
  getFeatureLimit
} = require('../../constants/subscriptionPlans');

describe('Subscription Plans - Unit Tests', () => {

  // ===== PLAN CONSTANTS TESTS =====
  describe('Plan Konstanten', () => {

    test('definiert alle drei Pläne', () => {
      expect(PLANS.FREE).toBe('free');
      expect(PLANS.BUSINESS).toBe('business');
      expect(PLANS.ENTERPRISE).toBe('enterprise');
    });

    test('Plan-Hierarchie ist korrekt sortiert', () => {
      expect(PLAN_HIERARCHY[PLANS.FREE]).toBe(0);
      expect(PLAN_HIERARCHY[PLANS.BUSINESS]).toBe(1);
      expect(PLAN_HIERARCHY[PLANS.ENTERPRISE]).toBe(2);
    });

    test('Enterprise > Business > Free', () => {
      expect(PLAN_HIERARCHY[PLANS.ENTERPRISE]).toBeGreaterThan(PLAN_HIERARCHY[PLANS.BUSINESS]);
      expect(PLAN_HIERARCHY[PLANS.BUSINESS]).toBeGreaterThan(PLAN_HIERARCHY[PLANS.FREE]);
    });
  });

  // ===== FEATURE ACCESS TESTS =====
  describe('Feature Access', () => {

    test('alle Pläne haben Zugriff auf Dashboard', () => {
      expect(FEATURE_ACCESS.dashboard).toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.dashboard).toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.dashboard).toContain(PLANS.ENTERPRISE);
    });

    test('alle Pläne haben Zugriff auf Contracts', () => {
      expect(FEATURE_ACCESS.contracts).toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.contracts).toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.contracts).toContain(PLANS.ENTERPRISE);
    });

    test('nur Business+ hat Zugriff auf Optimize', () => {
      expect(FEATURE_ACCESS.optimize).not.toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.optimize).toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.optimize).toContain(PLANS.ENTERPRISE);
    });

    test('nur Business+ hat Zugriff auf Chat', () => {
      expect(FEATURE_ACCESS.chat).not.toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.chat).toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.chat).toContain(PLANS.ENTERPRISE);
    });

    test('nur Business+ hat Zugriff auf Generate', () => {
      expect(FEATURE_ACCESS.generate).not.toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.generate).toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.generate).toContain(PLANS.ENTERPRISE);
    });

    test('nur Enterprise hat Zugriff auf API Keys', () => {
      expect(FEATURE_ACCESS.apiKeys).not.toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.apiKeys).not.toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.apiKeys).toContain(PLANS.ENTERPRISE);
    });

    test('nur Enterprise hat Zugriff auf Admin Panel', () => {
      expect(FEATURE_ACCESS.adminPanel).not.toContain(PLANS.FREE);
      expect(FEATURE_ACCESS.adminPanel).not.toContain(PLANS.BUSINESS);
      expect(FEATURE_ACCESS.adminPanel).toContain(PLANS.ENTERPRISE);
    });
  });

  // ===== PLAN LIMITS TESTS =====
  describe('Plan Limits', () => {

    test('Free Plan hat 3 Analysen', () => {
      expect(PLAN_LIMITS[PLANS.FREE].analyze).toBe(3);
    });

    test('Free Plan hat keine Premium Features', () => {
      expect(PLAN_LIMITS[PLANS.FREE].optimize).toBe(0);
      expect(PLAN_LIMITS[PLANS.FREE].generate).toBe(0);
      expect(PLAN_LIMITS[PLANS.FREE].compare).toBe(0);
      expect(PLAN_LIMITS[PLANS.FREE].chat).toBe(0);
    });

    test('Business Plan hat 25 Analysen', () => {
      expect(PLAN_LIMITS[PLANS.BUSINESS].analyze).toBe(25);
    });

    test('Business Plan hat Premium Feature Limits', () => {
      expect(PLAN_LIMITS[PLANS.BUSINESS].optimize).toBe(15);
      expect(PLAN_LIMITS[PLANS.BUSINESS].generate).toBe(10);
      expect(PLAN_LIMITS[PLANS.BUSINESS].compare).toBe(20);
      expect(PLAN_LIMITS[PLANS.BUSINESS].chat).toBe(50);
    });

    test('Enterprise Plan hat Unlimited Analysen', () => {
      expect(PLAN_LIMITS[PLANS.ENTERPRISE].analyze).toBe(Infinity);
    });

    test('Enterprise Plan hat Unlimited für alle Features', () => {
      expect(PLAN_LIMITS[PLANS.ENTERPRISE].optimize).toBe(Infinity);
      expect(PLAN_LIMITS[PLANS.ENTERPRISE].generate).toBe(Infinity);
      expect(PLAN_LIMITS[PLANS.ENTERPRISE].compare).toBe(Infinity);
      expect(PLAN_LIMITS[PLANS.ENTERPRISE].chat).toBe(Infinity);
      expect(PLAN_LIMITS[PLANS.ENTERPRISE].envelopes).toBe(Infinity);
    });
  });

  // ===== hasFeatureAccess FUNCTION TESTS =====
  describe('hasFeatureAccess()', () => {

    test('Free User hat Zugriff auf Dashboard', () => {
      expect(hasFeatureAccess('free', 'dashboard')).toBe(true);
    });

    test('Free User hat Zugriff auf Analyze', () => {
      expect(hasFeatureAccess('free', 'analyze')).toBe(true);
    });

    test('Free User hat KEINEN Zugriff auf Optimize', () => {
      expect(hasFeatureAccess('free', 'optimize')).toBe(false);
    });

    test('Business User hat Zugriff auf Optimize', () => {
      expect(hasFeatureAccess('business', 'optimize')).toBe(true);
    });

    test('Business User hat Zugriff auf Chat', () => {
      expect(hasFeatureAccess('business', 'chat')).toBe(true);
    });

    test('Business User hat KEINEN Zugriff auf API Keys', () => {
      expect(hasFeatureAccess('business', 'apiKeys')).toBe(false);
    });

    test('Enterprise User hat Zugriff auf alles', () => {
      expect(hasFeatureAccess('enterprise', 'dashboard')).toBe(true);
      expect(hasFeatureAccess('enterprise', 'optimize')).toBe(true);
      expect(hasFeatureAccess('enterprise', 'apiKeys')).toBe(true);
      expect(hasFeatureAccess('enterprise', 'adminPanel')).toBe(true);
    });

    test('behandelt null/undefined Plan als Free', () => {
      expect(hasFeatureAccess(null, 'dashboard')).toBe(true);
      expect(hasFeatureAccess(undefined, 'dashboard')).toBe(true);
      expect(hasFeatureAccess(null, 'optimize')).toBe(false);
    });

    test('ist case-insensitive', () => {
      expect(hasFeatureAccess('FREE', 'dashboard')).toBe(true);
      expect(hasFeatureAccess('BUSINESS', 'optimize')).toBe(true);
      expect(hasFeatureAccess('Enterprise', 'apiKeys')).toBe(true);
    });

    test('gibt false für unbekannte Features', () => {
      expect(hasFeatureAccess('enterprise', 'unknownFeature')).toBe(false);
    });
  });

  // ===== isBusinessOrHigher FUNCTION TESTS =====
  describe('isBusinessOrHigher()', () => {

    test('Free ist NICHT Business oder höher', () => {
      expect(isBusinessOrHigher('free')).toBe(false);
    });

    test('Business IST Business oder höher', () => {
      expect(isBusinessOrHigher('business')).toBe(true);
    });

    test('Enterprise IST Business oder höher', () => {
      expect(isBusinessOrHigher('enterprise')).toBe(true);
    });

    test('behandelt null/undefined als Free', () => {
      expect(isBusinessOrHigher(null)).toBe(false);
      expect(isBusinessOrHigher(undefined)).toBe(false);
    });

    test('ist case-insensitive', () => {
      expect(isBusinessOrHigher('BUSINESS')).toBe(true);
      expect(isBusinessOrHigher('Business')).toBe(true);
    });
  });

  // ===== isEnterpriseOrHigher FUNCTION TESTS =====
  describe('isEnterpriseOrHigher()', () => {

    test('Free ist NICHT Enterprise oder höher', () => {
      expect(isEnterpriseOrHigher('free')).toBe(false);
    });

    test('Business ist NICHT Enterprise oder höher', () => {
      expect(isEnterpriseOrHigher('business')).toBe(false);
    });

    test('Enterprise IST Enterprise oder höher', () => {
      expect(isEnterpriseOrHigher('enterprise')).toBe(true);
    });

    test('behandelt null/undefined als Free', () => {
      expect(isEnterpriseOrHigher(null)).toBe(false);
      expect(isEnterpriseOrHigher(undefined)).toBe(false);
    });

    test('ist case-insensitive', () => {
      expect(isEnterpriseOrHigher('ENTERPRISE')).toBe(true);
      expect(isEnterpriseOrHigher('Enterprise')).toBe(true);
    });
  });

  // ===== getFeatureLimit FUNCTION TESTS =====
  describe('getFeatureLimit()', () => {

    test('gibt korrektes Limit für Free Analyze zurück', () => {
      expect(getFeatureLimit('free', 'analyze')).toBe(3);
    });

    test('gibt korrektes Limit für Business Analyze zurück', () => {
      expect(getFeatureLimit('business', 'analyze')).toBe(25);
    });

    test('gibt Infinity für Enterprise zurück', () => {
      expect(getFeatureLimit('enterprise', 'analyze')).toBe(Infinity);
    });

    test('gibt 0 für nicht-verfügbare Features zurück', () => {
      expect(getFeatureLimit('free', 'optimize')).toBe(0);
      expect(getFeatureLimit('free', 'chat')).toBe(0);
    });

    test('behandelt null/undefined Plan als Free', () => {
      expect(getFeatureLimit(null, 'analyze')).toBe(3);
      expect(getFeatureLimit(undefined, 'analyze')).toBe(3);
    });

    test('ist case-insensitive', () => {
      expect(getFeatureLimit('FREE', 'analyze')).toBe(3);
      expect(getFeatureLimit('BUSINESS', 'analyze')).toBe(25);
    });

    test('gibt 0 für unbekannte Features zurück', () => {
      expect(getFeatureLimit('business', 'unknownFeature')).toBe(0);
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases', () => {

    test('behandelt leeren String als Free', () => {
      expect(hasFeatureAccess('', 'dashboard')).toBe(true);
      expect(hasFeatureAccess('', 'optimize')).toBe(false);
    });

    test('behandelt Whitespace als Free', () => {
      expect(isBusinessOrHigher('  ')).toBe(false);
    });

    test('alle Features in FEATURE_ACCESS sind Arrays', () => {
      Object.values(FEATURE_ACCESS).forEach(value => {
        expect(Array.isArray(value)).toBe(true);
      });
    });

    test('alle Limits in PLAN_LIMITS sind Zahlen', () => {
      Object.values(PLAN_LIMITS).forEach(planLimits => {
        Object.values(planLimits).forEach(limit => {
          expect(typeof limit).toBe('number');
        });
      });
    });
  });

  // ===== BUSINESS LOGIC TESTS =====
  describe('Business Logic', () => {

    test('Upgrade-Pfad: Free -> Business ermöglicht Optimize', () => {
      const freePlan = 'free';
      const businessPlan = 'business';

      expect(hasFeatureAccess(freePlan, 'optimize')).toBe(false);
      expect(hasFeatureAccess(businessPlan, 'optimize')).toBe(true);
    });

    test('Upgrade-Pfad: Business -> Enterprise ermöglicht API Keys', () => {
      const businessPlan = 'business';
      const enterprisePlan = 'enterprise';

      expect(hasFeatureAccess(businessPlan, 'apiKeys')).toBe(false);
      expect(hasFeatureAccess(enterprisePlan, 'apiKeys')).toBe(true);
    });

    test('Downgrade: Enterprise -> Business verliert API Keys', () => {
      const enterprisePlan = 'enterprise';
      const businessPlan = 'business';

      expect(hasFeatureAccess(enterprisePlan, 'apiKeys')).toBe(true);
      expect(hasFeatureAccess(businessPlan, 'apiKeys')).toBe(false);
    });

    test('Analyze Limit steigt mit jedem Plan', () => {
      const freeLimit = getFeatureLimit('free', 'analyze');
      const businessLimit = getFeatureLimit('business', 'analyze');
      const enterpriseLimit = getFeatureLimit('enterprise', 'analyze');

      expect(businessLimit).toBeGreaterThan(freeLimit);
      expect(enterpriseLimit).toBeGreaterThan(businessLimit);
    });
  });
});

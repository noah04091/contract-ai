// 📁 backend/constants/subscriptionPlans.js
// 🔐 Zentrale Definition aller Subscription-Pläne und Feature-Zugriffe
// WICHTIG: Diese Datei ist die Single Source of Truth für alle Plan-Checks!

/**
 * Verfügbare Subscription-Pläne (hierarchisch sortiert)
 */
const PLANS = {
  FREE: 'free',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
  LEGENDARY: 'legendary'
};

/**
 * Plan-Hierarchie für Berechtigungsprüfungen
 * Höherer Index = mehr Rechte
 */
const PLAN_HIERARCHY = {
  [PLANS.FREE]: 0,
  [PLANS.BUSINESS]: 1,
  [PLANS.ENTERPRISE]: 2,
  [PLANS.LEGENDARY]: 3
};

/**
 * Feature-Zugriff nach Plan
 * Definiert welche Pläne Zugriff auf welche Features haben
 */
const FEATURE_ACCESS = {
  // Basis-Features (alle User)
  dashboard: [PLANS.FREE, PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  contracts: [PLANS.FREE, PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  analyze: [PLANS.FREE, PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY], // Mit Limits

  // Business+ Features
  optimize: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  chat: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  generate: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  compare: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  legalPulse: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  legalLens: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  envelopes: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],
  betterContracts: [PLANS.BUSINESS, PLANS.ENTERPRISE, PLANS.LEGENDARY],

  // Enterprise+ Features
  apiKeys: [PLANS.ENTERPRISE, PLANS.LEGENDARY],
  excelExport: [PLANS.ENTERPRISE, PLANS.LEGENDARY],
  integrations: [PLANS.ENTERPRISE, PLANS.LEGENDARY],
  calendarSync: [PLANS.ENTERPRISE, PLANS.LEGENDARY],

  // Legendary-only Features (Admin, etc.)
  adminPanel: [PLANS.LEGENDARY]
};

/**
 * Monatliche Limits nach Plan
 */
const PLAN_LIMITS = {
  [PLANS.FREE]: {
    analyze: 3,
    optimize: 0,
    generate: 0,
    compare: 0,
    chat: 0,
    envelopes: 0
  },
  [PLANS.BUSINESS]: {
    analyze: 25,
    optimize: 15,
    generate: 10,
    compare: 20,
    chat: 50,
    envelopes: Infinity
  },
  [PLANS.ENTERPRISE]: {
    analyze: Infinity,
    optimize: Infinity,
    generate: Infinity,
    compare: Infinity,
    chat: Infinity,
    envelopes: Infinity
  },
  [PLANS.LEGENDARY]: {
    analyze: Infinity,
    optimize: Infinity,
    generate: Infinity,
    compare: Infinity,
    chat: Infinity,
    envelopes: Infinity
  }
};

/**
 * Prüft ob ein Plan Zugriff auf ein Feature hat
 * @param {string} plan - Der Subscription-Plan des Users
 * @param {string} feature - Das zu prüfende Feature
 * @returns {boolean}
 */
function hasFeatureAccess(plan, feature) {
  const normalizedPlan = (plan || 'free').toLowerCase();
  const allowedPlans = FEATURE_ACCESS[feature];

  if (!allowedPlans) {
    console.warn(`⚠️ [hasFeatureAccess] Unbekanntes Feature: ${feature}`);
    return false;
  }

  return allowedPlans.includes(normalizedPlan);
}

/**
 * Prüft ob ein Plan mindestens Business-Level hat
 * @param {string} plan - Der Subscription-Plan
 * @returns {boolean}
 */
function isBusinessOrHigher(plan) {
  const normalizedPlan = (plan || 'free').toLowerCase();
  return PLAN_HIERARCHY[normalizedPlan] >= PLAN_HIERARCHY[PLANS.BUSINESS];
}

/**
 * Prüft ob ein Plan Enterprise-Level hat
 * @param {string} plan - Der Subscription-Plan
 * @returns {boolean}
 */
function isEnterpriseOrHigher(plan) {
  const normalizedPlan = (plan || 'free').toLowerCase();
  return PLAN_HIERARCHY[normalizedPlan] >= PLAN_HIERARCHY[PLANS.ENTERPRISE];
}

/**
 * Gibt das Limit für ein Feature basierend auf dem Plan zurück
 * @param {string} plan - Der Subscription-Plan
 * @param {string} feature - Das Feature
 * @returns {number}
 */
function getFeatureLimit(plan, feature) {
  const normalizedPlan = (plan || 'free').toLowerCase();
  const limits = PLAN_LIMITS[normalizedPlan];

  if (!limits) {
    console.warn(`⚠️ [getFeatureLimit] Unbekannter Plan: ${plan}`);
    return 0;
  }

  return limits[feature] ?? 0;
}

module.exports = {
  PLANS,
  PLAN_HIERARCHY,
  FEATURE_ACCESS,
  PLAN_LIMITS,
  hasFeatureAccess,
  isBusinessOrHigher,
  isEnterpriseOrHigher,
  getFeatureLimit
};

// 📁 backend/constants/subscriptionPlans.js
// 🔐 Zentrale Definition aller Subscription-Pläne und Feature-Zugriffe
// WICHTIG: Diese Datei ist die Single Source of Truth für alle Plan-Checks!

/**
 * Verfügbare Subscription-Pläne (hierarchisch sortiert)
 */
const PLANS = {
  FREE: 'free',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise'
};

/**
 * Plan-Hierarchie für Berechtigungsprüfungen
 * Höherer Index = mehr Rechte
 */
const PLAN_HIERARCHY = {
  [PLANS.FREE]: 0,
  [PLANS.BUSINESS]: 1,
  [PLANS.ENTERPRISE]: 2
};

/**
 * Feature-Zugriff nach Plan
 * Definiert welche Pläne Zugriff auf welche Features haben
 */
const FEATURE_ACCESS = {
  // Basis-Features (alle User)
  dashboard: [PLANS.FREE, PLANS.BUSINESS, PLANS.ENTERPRISE],
  contracts: [PLANS.FREE, PLANS.BUSINESS, PLANS.ENTERPRISE],
  analyze: [PLANS.FREE, PLANS.BUSINESS, PLANS.ENTERPRISE], // Mit Limits

  // Business+ Features
  optimize: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  chat: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  generate: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  compare: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  legalPulse: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  legalLens: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  envelopes: [PLANS.BUSINESS, PLANS.ENTERPRISE],
  betterContracts: [PLANS.BUSINESS, PLANS.ENTERPRISE],

  // Business+ Features (E-Mail Upload)
  emailUpload: [PLANS.BUSINESS, PLANS.ENTERPRISE],

  // Enterprise+ Features
  apiKeys: [PLANS.ENTERPRISE],
  excelExport: [PLANS.ENTERPRISE],
  integrations: [PLANS.ENTERPRISE],
  calendarSync: [PLANS.ENTERPRISE],
  customEmailAlias: [PLANS.ENTERPRISE],

  // Enterprise-only Features (Admin, etc.)
  adminPanel: [PLANS.ENTERPRISE]
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
    // 📨 Welle 2 (08.07.2026): Free-Chat-Kontingent 5 Nachrichten/Monat
    // (Product-Led-Growth: Feature am eigenen Dokument erleben, Limit = Conversion-
    // Moment; Kosten gpt-4o-mini ~3-5 Cent/aktivem User/Monat — Noahs Entscheidung).
    chat: 5,
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
};

/**
 * 🆕 Welle 2 (08.07.2026): Plan-Normalisierung — Alt-/Beta-Pläne auf die
 * 3 echten Pläne mappen. `legendary` (Beta-Comp-Accounts, auth.js legt sie bis
 * heute an) und `premium` (Alt-Wording) waren in HIERARCHY/LIMITS unbekannt →
 * getFeatureLimit lieferte 0 (weniger Rechte als Free!) und isBusinessOrHigher
 * false. Mapping: beide → enterprise (Comp-Accounts = volle Rechte).
 */
function normalizePlan(plan) {
  const p = (plan || 'free').toLowerCase();
  if (p === 'legendary' || p === 'premium') return PLANS.ENTERPRISE;
  return PLAN_HIERARCHY[p] !== undefined ? p : PLANS.FREE;
}

/**
 * Prüft ob ein Plan Zugriff auf ein Feature hat
 * @param {string} plan - Der Subscription-Plan des Users
 * @param {string} feature - Das zu prüfende Feature
 * @returns {boolean}
 */
function hasFeatureAccess(plan, feature) {
  const normalizedPlan = normalizePlan(plan);
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
  const normalizedPlan = normalizePlan(plan);
  return PLAN_HIERARCHY[normalizedPlan] >= PLAN_HIERARCHY[PLANS.BUSINESS];
}

/**
 * Prüft ob ein Plan Enterprise-Level hat
 * @param {string} plan - Der Subscription-Plan
 * @returns {boolean}
 */
function isEnterpriseOrHigher(plan) {
  const normalizedPlan = normalizePlan(plan);
  return PLAN_HIERARCHY[normalizedPlan] >= PLAN_HIERARCHY[PLANS.ENTERPRISE];
}

/**
 * Gibt das Limit für ein Feature basierend auf dem Plan zurück
 * @param {string} plan - Der Subscription-Plan
 * @param {string} feature - Das Feature
 * @returns {number}
 */
function getFeatureLimit(plan, feature) {
  const normalizedPlan = normalizePlan(plan);
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
  normalizePlan,
  hasFeatureAccess,
  isBusinessOrHigher,
  isEnterpriseOrHigher,
  getFeatureLimit
};

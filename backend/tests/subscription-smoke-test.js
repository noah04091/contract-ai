// 📁 backend/tests/subscription-smoke-test.js
// 🧪 SMOKE TEST: Subscription System Verification
// Testet alle Plan-Logik ohne externe Abhängigkeiten

const {
  PLANS,
  PLAN_HIERARCHY,
  PLAN_LIMITS,
  FEATURE_ACCESS,
  hasFeatureAccess,
  isBusinessOrHigher,
  isEnterpriseOrHigher,
  getFeatureLimit
} = require('../constants/subscriptionPlans');

console.log('🧪 ========================================');
console.log('🧪 SUBSCRIPTION SYSTEM SMOKE TEST');
console.log('🧪 ========================================\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n📋 ${name}`);
  console.log('─'.repeat(50));
}

// ========================================
// TEST 1: Plan Definitionen
// ========================================
section('1. PLAN DEFINITIONEN');

test('PLANS.FREE existiert', PLANS.FREE === 'free');
test('PLANS.BUSINESS existiert', PLANS.BUSINESS === 'business');
test('PLANS.ENTERPRISE existiert', PLANS.ENTERPRISE === 'enterprise');
test('Keine "premium" Plan-Konstante', !PLANS.PREMIUM);

// ========================================
// TEST 2: Plan Hierarchie
// ========================================
section('2. PLAN HIERARCHIE');

test('FREE hat niedrigste Hierarchie (0)', PLAN_HIERARCHY['free'] === 0);
test('BUSINESS > FREE', PLAN_HIERARCHY['business'] > PLAN_HIERARCHY['free']);
test('ENTERPRISE > BUSINESS', PLAN_HIERARCHY['enterprise'] > PLAN_HIERARCHY['business']);

// ========================================
// TEST 3: isBusinessOrHigher()
// ========================================
section('3. isBusinessOrHigher() Funktion');

test('free → false', isBusinessOrHigher('free') === false);
test('business → true', isBusinessOrHigher('business') === true);
test('enterprise → true', isBusinessOrHigher('enterprise') === true);
test('legendary → true', isBusinessOrHigher('legendary') === true);
test('null/undefined → false (fallback)', isBusinessOrHigher(null) === false);
test('GROSS-/kleinschreibung: BUSINESS → true', isBusinessOrHigher('BUSINESS') === true);

// ========================================
// TEST 4: isEnterpriseOrHigher()
// ========================================
section('4. isEnterpriseOrHigher() Funktion');

test('free → false', isEnterpriseOrHigher('free') === false);
test('business → false', isEnterpriseOrHigher('business') === false);
test('enterprise → true', isEnterpriseOrHigher('enterprise') === true);
test('legendary → true', isEnterpriseOrHigher('legendary') === true);
test('null/undefined → false (fallback)', isEnterpriseOrHigher(null) === false);

// ========================================
// TEST 5: getFeatureLimit() - FREE Plan
// ========================================
section('5. FREE Plan Limits');

test('FREE: analyze = 3', getFeatureLimit('free', 'analyze') === 3);
test('FREE: optimize = 0 (gesperrt)', getFeatureLimit('free', 'optimize') === 0);
test('FREE: generate = 0 (gesperrt)', getFeatureLimit('free', 'generate') === 0);
test('FREE: compare = 0 (gesperrt)', getFeatureLimit('free', 'compare') === 0);
// ⚠️ Stand bis 23.08.2026 auf 0 und war damit seit Welle 2 (08.07.2026) dauerhaft
// rot, ohne dass es auffiel: PLAN_LIMITS.free.chat ist seitdem 5.
test('FREE: chat = 5 (begrenzt, nicht gesperrt)', getFeatureLimit('free', 'chat') === 5);

// ========================================
// TEST 6: getFeatureLimit() - BUSINESS Plan
// ========================================
section('6. BUSINESS Plan Limits');

test('BUSINESS: analyze = 25', getFeatureLimit('business', 'analyze') === 25);
test('BUSINESS: optimize = 15', getFeatureLimit('business', 'optimize') === 15);
test('BUSINESS: generate = 10', getFeatureLimit('business', 'generate') === 10);
test('BUSINESS: compare = 20', getFeatureLimit('business', 'compare') === 20);
test('BUSINESS: chat = 50', getFeatureLimit('business', 'chat') === 50);

// ========================================
// TEST 7: getFeatureLimit() - ENTERPRISE Plan
// ========================================
section('7. ENTERPRISE Plan Limits (KRITISCH!)');

test('ENTERPRISE: analyze = Infinity', getFeatureLimit('enterprise', 'analyze') === Infinity);
test('ENTERPRISE: optimize = Infinity', getFeatureLimit('enterprise', 'optimize') === Infinity);
test('ENTERPRISE: generate = Infinity', getFeatureLimit('enterprise', 'generate') === Infinity);
test('ENTERPRISE: compare = Infinity', getFeatureLimit('enterprise', 'compare') === Infinity);
test('ENTERPRISE: chat = Infinity', getFeatureLimit('enterprise', 'chat') === Infinity);

// ========================================
// TEST 8: hasFeatureAccess() - Business Features
// ========================================
section('8. Business+ Features Access');

// 📨 'chat' ist hier bewusst NICHT mehr gelistet: Seit Welle 2 (08.07.2026) darf
// Free chatten, begrenzt auf 5 Nachrichten/Monat über PLAN_LIMITS. Die Zusicherung
// dafür steht direkt unter dieser Schleife.
const businessFeatures = ['optimize', 'generate', 'compare', 'legalPulse', 'legalLens'];

businessFeatures.forEach(feature => {
  test(`FREE kann NICHT ${feature}`, hasFeatureAccess('free', feature) === false);
  test(`BUSINESS kann ${feature}`, hasFeatureAccess('business', feature) === true);
  test(`ENTERPRISE kann ${feature}`, hasFeatureAccess('enterprise', feature) === true);
});

// Chat: für alle offen, aber für Free strikt begrenzt. Beide Hälften müssen gelten,
// sonst ist entweder der Zugang gesperrt oder das Kontingent unbegrenzt.
test('FREE darf chat (Zugang offen)', hasFeatureAccess('free', 'chat') === true);
test('BUSINESS darf chat', hasFeatureAccess('business', 'chat') === true);
test('ENTERPRISE darf chat', hasFeatureAccess('enterprise', 'chat') === true);

// ========================================
// TEST 9: hasFeatureAccess() - Enterprise-Only Features
// ========================================
section('9. Enterprise-Only Features Access (KRITISCH!)');

const enterpriseFeatures = ['apiKeys', 'excelExport', 'integrations', 'calendarSync'];

enterpriseFeatures.forEach(feature => {
  test(`FREE kann NICHT ${feature}`, hasFeatureAccess('free', feature) === false);
  test(`BUSINESS kann NICHT ${feature}`, hasFeatureAccess('business', feature) === false);
  test(`ENTERPRISE kann ${feature}`, hasFeatureAccess('enterprise', feature) === true);
});

// ========================================
// TEST 10: Edge Cases
// ========================================
section('10. Edge Cases & Sicherheit');

test('Unbekannter Plan → getFeatureLimit returns 0', getFeatureLimit('unknown_plan', 'analyze') === 0);
test('Unbekanntes Feature → getFeatureLimit returns 0', getFeatureLimit('business', 'unknown_feature') === 0);
test('null Plan → isBusinessOrHigher false', isBusinessOrHigher(null) === false);
test('undefined Plan → isEnterpriseOrHigher false', isEnterpriseOrHigher(undefined) === false);
test('"premium" (legacy) → isBusinessOrHigher false (nicht definiert)', isBusinessOrHigher('premium') === false);

// ========================================
// TEST 11: Stripe Price ID Mapping Simulation
// ========================================
section('11. Stripe Price ID → Plan Mapping (Simulation)');

// Simuliere das Mapping wie im Webhook
function simulatePriceMapping(priceId, envVars) {
  const priceMap = {
    [envVars.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
    [envVars.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
    [envVars.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID]: "enterprise",
    [envVars.STRIPE_ENTERPRISE_YEARLY_PRICE_ID]: "enterprise",
    // Legacy Premium → Enterprise (29€ Plan!)
    [envVars.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "enterprise",
    [envVars.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "enterprise",
  };
  return priceMap[priceId] || "free";
}

// Simulierte Env-Vars
const mockEnv = {
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: 'price_business_monthly_123',
  STRIPE_BUSINESS_YEARLY_PRICE_ID: 'price_business_yearly_456',
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: 'price_enterprise_monthly_789',
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: 'price_enterprise_yearly_abc',
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: 'price_premium_monthly_def',
  STRIPE_PREMIUM_YEARLY_PRICE_ID: 'price_premium_yearly_ghi',
};

test('Business Monthly Price → business',
  simulatePriceMapping('price_business_monthly_123', mockEnv) === 'business');
test('Enterprise Monthly Price → enterprise',
  simulatePriceMapping('price_enterprise_monthly_789', mockEnv) === 'enterprise');
test('Legacy Premium Monthly Price → enterprise (KRITISCH!)',
  simulatePriceMapping('price_premium_monthly_def', mockEnv) === 'enterprise');
test('Legacy Premium Yearly Price → enterprise (KRITISCH!)',
  simulatePriceMapping('price_premium_yearly_ghi', mockEnv) === 'enterprise');
test('Unbekannte Price ID → free (Fallback)',
  simulatePriceMapping('price_unknown_xyz', mockEnv) === 'free');

// ========================================
// ERGEBNIS
// ========================================
console.log('\n🧪 ========================================');
console.log('🧪 TEST ERGEBNIS');
console.log('🧪 ========================================');
console.log(`✅ Bestanden: ${passed}`);
console.log(`❌ Fehlgeschlagen: ${failed}`);
console.log(`📊 Erfolgsrate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 ALLE TESTS BESTANDEN! Subscription System ist bereit.');
  process.exit(0);
} else {
  console.log('\n⚠️  ACHTUNG: Einige Tests sind fehlgeschlagen!');
  process.exit(1);
}

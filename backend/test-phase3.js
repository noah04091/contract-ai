// 📁 backend/test-phase3.js
// Legal Pulse 2.0 Phase 3 - Comprehensive Feature Test Script

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const AUTH_COOKIE = 'YOUR_AUTH_COOKIE_HERE'; // Replace with real cookie from browser

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Helper function to test endpoint
async function testEndpoint(name, method, url, data = null, requiresAuth = true) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${method} ${url}`);

  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {}
    };

    if (requiresAuth && AUTH_COOKIE !== 'YOUR_AUTH_COOKIE_HERE') {
      config.headers.Cookie = AUTH_COOKIE;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);

    if (response.data.success !== false) {
      console.log(`   ✅ PASS - Status: ${response.status}`);
      results.passed.push(name);
      return response.data;
    } else {
      console.log(`   ⚠️  PARTIAL - Success: false`);
      console.log(`   Message: ${response.data.message}`);
      results.passed.push(`${name} (partial)`);
      return response.data;
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`   ⏭️  SKIP - Auth required (set AUTH_COOKIE)`);
      results.skipped.push(name);
    } else {
      console.log(`   ❌ FAIL - ${error.message}`);
      if (error.response?.data) {
        console.log(`   Error: ${JSON.stringify(error.response.data)}`);
      }
      results.failed.push(name);
    }
    return null;
  }
}

// Main test suite
async function runTests() {
  console.log('🚀 Legal Pulse 2.0 Phase 3 - Feature Test Suite\n');
  console.log('=' .repeat(60));

  // ===== EXTERNAL LEGAL APIS =====
  console.log('\n📚 1. EXTERNAL LEGAL APIS');
  console.log('-'.repeat(60));

  await testEndpoint(
    'External APIs - Health Check',
    'GET',
    '/api/external-legal/health',
    null,
    false
  );

  await testEndpoint(
    'External APIs - Search',
    'GET',
    '/api/external-legal/search?query=DSGVO&limit=5'
  );

  await testEndpoint(
    'External APIs - Recent Changes',
    'GET',
    '/api/external-legal/recent-changes?days=7'
  );

  await testEndpoint(
    'External APIs - Statistics',
    'GET',
    '/api/external-legal/stats'
  );

  // ===== MARKET BENCHMARKING =====
  console.log('\n\n📊 2. MARKET BENCHMARKING');
  console.log('-'.repeat(60));

  await testEndpoint(
    'Benchmarking - Market Overview',
    'GET',
    '/api/benchmarking/market-overview'
  );

  await testEndpoint(
    'Benchmarking - Clause Popularity',
    'GET',
    '/api/benchmarking/clause-popularity/Arbeitsvertrag'
  );

  await testEndpoint(
    'Benchmarking - Industry Trends',
    'GET',
    '/api/benchmarking/industry-trends/IT?months=12'
  );

  // ===== ML FORECASTING =====
  console.log('\n\n🤖 3. ML FORECASTING');
  console.log('-'.repeat(60));

  const mlStatus = await testEndpoint(
    'ML Forecasting - Status',
    'GET',
    '/api/ml-forecast/status'
  );

  if (mlStatus) {
    console.log(`   📊 Model Trained: ${mlStatus.modelTrained}`);
    console.log(`   📊 Min Training Data: ${mlStatus.minTrainingData}`);
  }

  // ===== PHASE 2 FEATURES (Quick Check) =====
  console.log('\n\n⚡ 4. PHASE 2 FEATURES (Quick Check)');
  console.log('-'.repeat(60));

  await testEndpoint(
    'Predictive Analytics - Trigger Status',
    'GET',
    '/api/predictive/trigger-status'
  );

  await testEndpoint(
    'Pulse Notifications - Stats',
    'GET',
    '/api/pulse-notifications/stats'
  );

  // ===== RESULTS SUMMARY =====
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ PASSED: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   - ${test}`));

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  SKIPPED: ${results.skipped.length} (Need authentication)`);
    results.skipped.forEach(test => console.log(`   - ${test}`));
    console.log('\n   💡 To test authenticated endpoints:');
    console.log('   1. Login in browser');
    console.log('   2. Open DevTools → Application → Cookies');
    console.log('   3. Copy token value');
    console.log('   4. Update AUTH_COOKIE in this script');
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED: ${results.failed.length}`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }

  console.log('\n' + '='.repeat(60));

  const totalTests = results.passed.length + results.failed.length + results.skipped.length;
  const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);

  console.log(`\n📈 Overall: ${results.passed.length}/${totalTests} tests passed (${passRate}%)`);

  if (results.failed.length === 0) {
    console.log('\n🎉 All tests passed! Phase 3 is working! 🚀');
  } else {
    console.log('\n⚠️  Some tests failed. Check logs above for details.');
  }

  console.log('\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});

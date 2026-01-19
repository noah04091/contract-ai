/**
 * 🧪 Contract AI Smoke Test
 * Tests: Analysis, Data Extraction, Calendar Events
 *
 * Usage: node smoke-test.js <AUTH_TOKEN>
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE = 'https://api.contract-ai.de';

// Test results collector
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper: Make API request
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers
    }
  });
  return response;
}

// Helper: Log result
function logResult(testName, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${testName}${details ? `: ${details}` : ''}`);
  if (passed) {
    results.passed.push(testName);
  } else {
    results.failed.push({ test: testName, details });
  }
}

function logWarning(testName, details) {
  console.log(`⚠️  ${testName}: ${details}`);
  results.warnings.push({ test: testName, details });
}

// Test 1: API Health Check (via contracts endpoint)
async function testApiHealth(token) {
  console.log('\n📋 Test 1: API Health Check');
  try {
    const response = await apiRequest('/api/contracts?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const healthy = response.ok;
    logResult('API Health', healthy, `Status: ${response.status}`);
    return healthy;
  } catch (err) {
    logResult('API Health', false, err.message);
    return false;
  }
}

// Test 2: Auth Token Validation (decode JWT)
async function testAuthToken(token) {
  console.log('\n📋 Test 2: Auth Token Validation');
  try {
    // Decode JWT to get user info
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (payload.email && payload.userId) {
      logResult('Auth Token Valid', true, `User: ${payload.email}`);
      return { email: payload.email, userId: payload.userId };
    } else {
      logResult('Auth Token Valid', false, 'Invalid token structure');
      return null;
    }
  } catch (err) {
    logResult('Auth Token Valid', false, err.message);
    return null;
  }
}

// Test 3: Get Existing Contracts
async function testGetContracts(token) {
  console.log('\n📋 Test 3: Fetch User Contracts');
  try {
    const response = await apiRequest('/api/contracts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    // API returns { contracts: [], pagination: {} }
    const contracts = data.contracts || data;
    if (response.ok && Array.isArray(contracts)) {
      logResult('Fetch Contracts', true, `Found ${contracts.length} contracts`);
      return contracts;
    } else {
      logResult('Fetch Contracts', false, data.message || 'Unknown error');
      return [];
    }
  } catch (err) {
    logResult('Fetch Contracts', false, err.message);
    return [];
  }
}

// Test 4: Check Calendar Events
async function testCalendarEvents(token) {
  console.log('\n📋 Test 4: Calendar Events Check');
  try {
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 60);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 1095); // 3 years

    const response = await apiRequest(
      `/api/calendar/events?from=${pastDate.toISOString()}&to=${futureDate.toISOString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    if (data.success && Array.isArray(data.events)) {
      logResult('Calendar Events', true, `Found ${data.events.length} events`);

      // Check event distribution
      const eventsByType = {};
      data.events.forEach(e => {
        eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
      });
      console.log('   Event types:', eventsByType);

      return data.events;
    } else {
      logResult('Calendar Events', false, data.message || 'Unknown error');
      return [];
    }
  } catch (err) {
    logResult('Calendar Events', false, err.message);
    return [];
  }
}

// Test 5: Verify Contract Data Extraction
async function testDataExtraction(contracts) {
  console.log('\n📋 Test 5: Data Extraction Quality');

  let withEndDate = 0;
  let withStatus = 0;
  let withAnalysis = 0;
  let withKuendigung = 0;

  contracts.forEach(contract => {
    if (contract.expiryDate || contract.endDate) withEndDate++;
    if (contract.status) withStatus++;
    if (contract.analyzed || contract.contractScore || contract.analysis || contract.score) withAnalysis++;
    if (contract.kuendigung || contract.noticePeriod || contract.cancellationPeriod) withKuendigung++;
  });

  const total = contracts.length;
  if (total === 0) {
    logWarning('Data Extraction', 'No contracts to analyze');
    return;
  }

  const endDateRate = Math.round((withEndDate / total) * 100);
  const statusRate = Math.round((withStatus / total) * 100);
  const analysisRate = Math.round((withAnalysis / total) * 100);
  const kuendigungRate = Math.round((withKuendigung / total) * 100);

  console.log(`   End Date Extraction: ${withEndDate}/${total} (${endDateRate}%)`);
  console.log(`   Status Detection: ${withStatus}/${total} (${statusRate}%)`);
  console.log(`   Analysis Complete: ${withAnalysis}/${total} (${analysisRate}%)`);
  console.log(`   Notice Period: ${withKuendigung}/${total} (${kuendigungRate}%)`);

  logResult('End Date Extraction', endDateRate >= 70, `${endDateRate}% success rate`);
  logResult('Status Detection', statusRate >= 80, `${statusRate}% success rate`);

  if (endDateRate < 70) {
    logWarning('End Date', 'Low extraction rate - may need prompt improvements');
  }
}

// Test 6: Calendar Event-Contract Correlation
async function testEventContractCorrelation(contracts, events) {
  console.log('\n📋 Test 6: Event-Contract Correlation');

  const contractIds = new Set(contracts.map(c => c._id));
  const eventContractIds = new Set(events.map(e => e.contractId?.toString()).filter(Boolean));

  // Check if events reference valid contracts
  let orphanedEvents = 0;
  events.forEach(e => {
    if (e.contractId && !contractIds.has(e.contractId.toString())) {
      orphanedEvents++;
    }
  });

  // Check if analyzed contracts have events
  const analyzedContracts = contracts.filter(c => c.analyzed || c.contractScore || c.analysis || c.score);
  let contractsWithEvents = 0;
  analyzedContracts.forEach(c => {
    if (eventContractIds.has(c._id)) {
      contractsWithEvents++;
    }
  });

  const eventRate = analyzedContracts.length > 0
    ? Math.round((contractsWithEvents / analyzedContracts.length) * 100)
    : 0;

  console.log(`   Analyzed contracts: ${analyzedContracts.length}`);
  console.log(`   Contracts with events: ${contractsWithEvents}`);
  console.log(`   Orphaned events: ${orphanedEvents}`);

  logResult('Event Generation Rate', eventRate >= 80, `${eventRate}% of analyzed contracts have events`);
  logResult('No Orphaned Events', orphanedEvents === 0, orphanedEvents > 0 ? `${orphanedEvents} orphaned` : '');
}

// Test 7: Future Event Coverage
async function testFutureEventCoverage(events) {
  console.log('\n📋 Test 7: Future Event Coverage');

  const now = new Date();
  const oneYear = new Date(now);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  const twoYears = new Date(now);
  twoYears.setFullYear(twoYears.getFullYear() + 2);
  const threeYears = new Date(now);
  threeYears.setFullYear(threeYears.getFullYear() + 3);

  let within1Year = 0;
  let within2Years = 0;
  let within3Years = 0;

  events.forEach(e => {
    const eventDate = new Date(e.date);
    if (eventDate > now) {
      if (eventDate <= oneYear) within1Year++;
      if (eventDate <= twoYears) within2Years++;
      if (eventDate <= threeYears) within3Years++;
    }
  });

  console.log(`   Events within 1 year: ${within1Year}`);
  console.log(`   Events within 2 years: ${within2Years}`);
  console.log(`   Events within 3 years: ${within3Years}`);

  if (within3Years > within1Year) {
    logResult('Long-term Event Coverage', true, 'Events extend beyond 1 year');
  } else if (events.length === 0) {
    logWarning('Future Events', 'No events to analyze');
  } else {
    logResult('Long-term Event Coverage', within1Year > 0, 'Some future events exist');
  }
}

// Main test runner
async function runSmokeTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 CONTRACT AI SMOKE TEST');
  console.log('═══════════════════════════════════════════════════════');

  const token = process.argv[2];

  if (!token) {
    console.log('\n❌ Usage: node smoke-test.js <AUTH_TOKEN>');
    console.log('   Get your token from localStorage after logging in.');
    process.exit(1);
  }

  // Run tests
  const apiHealthy = await testApiHealth(token);
  if (!apiHealthy) {
    console.log('\n❌ API is not healthy. Aborting tests.');
    process.exit(1);
  }

  const user = await testAuthToken(token);
  if (!user) {
    console.log('\n❌ Invalid auth token. Aborting tests.');
    process.exit(1);
  }

  const contracts = await testGetContracts(token);
  const events = await testCalendarEvents(token);

  if (contracts.length > 0) {
    await testDataExtraction(contracts);
    await testEventContractCorrelation(contracts, events);
  } else {
    logWarning('Data Tests', 'No contracts to test - skipping data extraction tests');
  }

  if (events.length > 0) {
    await testFutureEventCoverage(events);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 SMOKE TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(f => console.log(`   - ${f.test}: ${f.details}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(w => console.log(`   - ${w.test}: ${w.details}`));
  }

  const overallStatus = results.failed.length === 0;
  console.log(`\n${overallStatus ? '✅ SMOKE TEST PASSED' : '❌ SMOKE TEST FAILED'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(overallStatus ? 0 : 1);
}

runSmokeTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

/**
 * Optimizer V2 — Smoke Test Script
 *
 * Tests the full OptimizerV2 pipeline against real PDFs.
 * Validates: extraction, categories, scores, missing clauses, optimizations.
 *
 * Usage:
 *   node test-optimizer-v2.js <email> <password>
 *   node test-optimizer-v2.js --token <jwt-token>
 *
 * Options:
 *   --local         Use localhost:5000 instead of production API
 *   --contract <n>  Run only test N (0-based index)
 *   --verbose       Show full analysis details
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Config ──
const PROD_API = 'https://api.contract-ai.de/api';
const LOCAL_API = 'http://localhost:5000/api';
const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const verbose = args.includes('--verbose');
const API_BASE = useLocal ? LOCAL_API : PROD_API;

// ── Test Definitions ──
const SMOKE_TESTS = [
  {
    name: 'NDA (TechCorp)',
    file: 'test-contracts/NDA_Version_A_TechCorp.pdf',
    expectedType: /nda|geheimhalt|vertraulich/i,
    requiredCategories: ['confidentiality'],
    shouldDetectMissing: ['termination', 'liability'],
    scoreRange: { min: 40, max: 95 },
  },
  {
    name: 'Freelancer Vertrag (WebDev)',
    file: 'test-contracts/Freelancer_Version_A_WebDev.pdf',
    expectedType: /freelan|dienst|werk|berat/i,
    requiredCategories: ['payment', 'liability'],
    shouldDetectMissing: [],
    scoreRange: { min: 30, max: 90 },
  },
  {
    name: 'SaaS Vertrag (CloudPlatform)',
    file: 'test-contracts/SaaS_Version_A_CloudPlatform.pdf',
    expectedType: /saas|software|lizenz|dienst/i,
    requiredCategories: ['payment', 'liability'],
    shouldDetectMissing: [],
    scoreRange: { min: 30, max: 95 },
  },
  {
    name: 'Mietvertrag (Wohnung)',
    file: 'test-contracts/Mietvertrag_Version_A_Wohnung.pdf',
    expectedType: /miet|pacht|lease/i,
    requiredCategories: ['payment', 'termination'],
    shouldDetectMissing: [],
    scoreRange: { min: 40, max: 95 },
  },
];

// ── Auth ──
async function login(email, password) {
  console.log('  Login...');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

// ── Upload + SSE Analysis ──
function analyzeContract(token, pdfPath) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    // Build multipart body
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;

    const bodyStart = Buffer.from(body, 'utf-8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([bodyStart, fileBuffer, bodyEnd]);

    const url = new URL(`${API_BASE}/optimizer-v2/analyze`);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      }
    };

    const startTime = Date.now();
    let resultId = null;
    let lastProgress = '';
    let rawData = '';

    const req = transport.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', d => errBody += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errBody.substring(0, 300)}`)));
        return;
      }

      res.setEncoding('utf-8');
      res.on('data', (chunk) => {
        rawData += chunk;
        // Parse SSE events
        const lines = rawData.split('\n');
        rawData = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.progress !== undefined) {
                lastProgress = `${event.progress}% ${event.message || ''}`;
                if (verbose) process.stdout.write(`\r    Progress: ${lastProgress}    `);
              }
              if (event.complete && event.resultId) {
                resultId = event.resultId;
              }
              if (event.error) {
                reject(new Error(`Analysis error: ${event.message}`));
              }
            } catch (e) { /* ignore parse errors in SSE stream */ }
          }
        }
      });

      res.on('end', () => {
        if (verbose) process.stdout.write('\r' + ' '.repeat(60) + '\r');
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        if (resultId) {
          resolve({ resultId, duration });
        } else {
          reject(new Error(`No resultId received. Last progress: ${lastProgress}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

// ── Fetch Results ──
async function getResults(token, resultId) {
  const res = await fetch(`${API_BASE}/optimizer-v2/results/${resultId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch results: ${res.status}`);
  return res.json();
}

// ── Validation ──
function validateResult(result, test) {
  const checks = [];
  const data = result.result || result.data || result;

  // 1. Contract type
  const contractType = data.structure?.contractType || data.structure?.contractTypeLabel || '';
  const typeMatch = test.expectedType.test(contractType);
  checks.push({
    name: 'Contract Type',
    passed: typeMatch,
    detail: `"${contractType}" ${typeMatch ? 'matches' : 'does NOT match'} ${test.expectedType}`
  });

  // 2. Clauses extracted
  const clauseCount = data.clauses?.length || 0;
  checks.push({
    name: 'Clause Extraction',
    passed: clauseCount >= 3,
    detail: `${clauseCount} clauses extracted (min: 3)`
  });

  // 3. Category distribution — check "other" rate
  const otherCount = (data.clauses || []).filter(c => c.category === 'other').length;
  const otherRate = clauseCount > 0 ? (otherCount / clauseCount * 100).toFixed(0) : 0;
  checks.push({
    name: 'Category Quality',
    passed: otherRate <= 20,
    detail: `${otherRate}% "other" (max: 20%, ${otherCount}/${clauseCount})`
  });

  // 4. Required categories present
  const presentCats = new Set((data.clauses || []).map(c => c.category));
  for (const reqCat of test.requiredCategories) {
    checks.push({
      name: `Category: ${reqCat}`,
      passed: presentCats.has(reqCat),
      detail: presentCats.has(reqCat) ? 'found' : 'MISSING'
    });
  }

  // 5. Overall score range
  const overall = data.scores?.overall;
  const scoreInRange = overall >= test.scoreRange.min && overall <= test.scoreRange.max;
  checks.push({
    name: 'Overall Score',
    passed: scoreInRange,
    detail: `${overall}/100 (expected: ${test.scoreRange.min}-${test.scoreRange.max})`
  });

  // 6. Sub-scores exist
  const subScores = ['risk', 'fairness', 'clarity', 'completeness', 'marketStandard'];
  for (const key of subScores) {
    const val = data.scores?.[key];
    checks.push({
      name: `Score: ${key}`,
      passed: typeof val === 'number' && val >= 0 && val <= 100,
      detail: `${val}/100`
    });
  }

  // 7. Analyses exist for all clauses
  const analysisCount = data.clauseAnalyses?.length || 0;
  checks.push({
    name: 'Clause Analyses',
    passed: analysisCount >= clauseCount * 0.8,
    detail: `${analysisCount}/${clauseCount} clauses analyzed`
  });

  // 8. Optimizations generated (0 is OK if all clauses are strong)
  const optCount = (data.optimizations || []).filter(o => o.needsOptimization).length;
  const allStrong = (data.clauseAnalyses || []).every(a => a.strength === 'strong');
  checks.push({
    name: 'Optimizations',
    passed: optCount >= 1 || allStrong,
    detail: allStrong ? `${optCount} optimized (all clauses strong — correct)` : `${optCount} clauses optimized`
  });

  // 9. Missing clauses detection
  const missingClauses = data.scores?.missingClauses || [];
  checks.push({
    name: 'Missing Clause Detection',
    passed: true, // informational
    detail: `${missingClauses.length} missing clauses detected`
  });

  // 10. Diagnose-First reasoning quality (spot check)
  const sampleOpt = (data.optimizations || []).find(o => o.needsOptimization);
  if (sampleOpt) {
    const hasStructuredReasoning = sampleOpt?.versions?.neutral?.reasoning?.length > 50;
    checks.push({
      name: 'Reasoning Quality',
      passed: hasStructuredReasoning,
      detail: hasStructuredReasoning
        ? `${sampleOpt.versions.neutral.reasoning.substring(0, 80)}...`
        : 'Reasoning too short or missing'
    });
  } else if (allStrong) {
    checks.push({
      name: 'Reasoning Quality',
      passed: true,
      detail: 'No optimizations needed — skipped (all clauses strong)'
    });
  } else {
    checks.push({
      name: 'Reasoning Quality',
      passed: false,
      detail: 'No optimizations found but clauses have weaknesses'
    });
  }

  return checks;
}

// ── Pretty Print ──
function printResults(testName, checks, duration) {
  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  const allPassed = passed === total;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${allPassed ? 'PASS' : 'FAIL'}  ${testName}  (${duration}s)`);
  console.log('='.repeat(60));

  for (const check of checks) {
    const icon = check.passed ? '  [OK]' : '  [!!]';
    console.log(`${icon} ${check.name}: ${check.detail}`);
  }

  console.log(`\n  Result: ${passed}/${total} checks passed`);
  return allPassed;
}

function printCategoryBreakdown(data) {
  const cats = {};
  for (const clause of (data.clauses || [])) {
    cats[clause.category] = (cats[clause.category] || 0) + 1;
  }
  console.log('\n  Category Breakdown:');
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const bar = '#'.repeat(count);
    console.log(`    ${cat.padEnd(22)} ${bar} (${count})`);
  }
}

function printScoreSummary(data) {
  const s = data.scores || {};
  console.log('\n  Score Dashboard:');
  console.log(`    Overall:        ${scoreBar(s.overall)}`);
  console.log(`    Risk:           ${scoreBar(s.risk)}`);
  console.log(`    Fairness:       ${scoreBar(s.fairness)}`);
  console.log(`    Clarity:        ${scoreBar(s.clarity)}`);
  console.log(`    Completeness:   ${scoreBar(s.completeness)}`);
  console.log(`    Market Std:     ${scoreBar(s.marketStandard)}`);
}

function scoreBar(val) {
  if (typeof val !== 'number') return '?';
  const filled = Math.round(val / 5);
  const bar = '|'.repeat(filled) + '.'.repeat(20 - filled);
  return `[${bar}] ${val}/100`;
}

function printMissingClauses(data) {
  const missing = data.scores?.missingClauses || [];
  if (missing.length === 0) {
    console.log('\n  Missing Clauses: none detected');
    return;
  }
  console.log(`\n  Missing Clauses (${missing.length}):`);
  for (const mc of missing) {
    const icon = mc.foundInContent ? '~' : 'X';
    console.log(`    [${icon}] ${mc.categoryLabel} (${mc.severity}) — ${mc.foundInContent ? 'found in content' : 'NOT FOUND'}`);
  }
}

// ── Main ──
async function main() {
  console.log('\n  Contract-AI Optimizer V2 — Smoke Test');
  console.log(`  API: ${API_BASE}`);
  console.log('='.repeat(60));

  // Parse args
  let token;
  const tokenIdx = args.indexOf('--token');
  if (tokenIdx !== -1 && args[tokenIdx + 1]) {
    token = args[tokenIdx + 1];
    console.log('  Using provided token');
  } else {
    const creds = args.filter(a => !a.startsWith('--'));
    if (creds.length < 2) {
      console.error('\n  Usage: node test-optimizer-v2.js <email> <password>');
      console.error('         node test-optimizer-v2.js --token <jwt>');
      console.error('\n  Options: --local, --verbose, --contract <n>');
      process.exit(1);
    }
    token = await login(creds[0], creds[1]);
  }

  // Select tests
  const contractIdx = args.indexOf('--contract');
  let testsToRun = SMOKE_TESTS;
  if (contractIdx !== -1 && args[contractIdx + 1]) {
    const idx = parseInt(args[contractIdx + 1]);
    if (idx >= 0 && idx < SMOKE_TESTS.length) {
      testsToRun = [SMOKE_TESTS[idx]];
    }
  }

  // Check files exist
  for (const test of testsToRun) {
    if (!fs.existsSync(test.file)) {
      console.error(`\n  File not found: ${test.file}`);
      console.error('  Run from repository root directory.');
      process.exit(1);
    }
  }

  // Run tests
  const results = [];
  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i];
    console.log(`\n\n  [${i + 1}/${testsToRun.length}] Testing: ${test.name}`);
    console.log('  ' + '-'.repeat(40));

    try {
      // Upload + analyze
      console.log(`  Uploading ${test.file}...`);
      const { resultId, duration } = await analyzeContract(token, test.file);
      console.log(`  Analysis complete (${duration}s) — ID: ${resultId}`);

      // Fetch full results
      const fullResult = await getResults(token, resultId);
      const data = fullResult.result || fullResult.data || fullResult;

      // Validate
      const checks = validateResult(data, test);
      const passed = printResults(test.name, checks, duration);

      // Detailed output
      if (verbose || !passed) {
        printCategoryBreakdown(data);
        printScoreSummary(data);
        printMissingClauses(data);
      }

      results.push({ name: test.name, passed, duration, checks });
    } catch (err) {
      console.error(`\n  ERROR: ${err.message}`);
      results.push({ name: test.name, passed: false, error: err.message });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('  SMOKE TEST SUMMARY');
  console.log('='.repeat(60));

  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    const time = r.duration ? ` (${r.duration}s)` : '';
    const err = r.error ? ` — ${r.error}` : '';
    console.log(`  [${icon}] ${r.name}${time}${err}`);
    if (!r.passed) allPassed = false;
  }

  const passCount = results.filter(r => r.passed).length;
  console.log(`\n  Total: ${passCount}/${results.length} passed`);
  console.log('='.repeat(60));

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

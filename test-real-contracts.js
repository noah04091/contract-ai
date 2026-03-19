/**
 * Real Contract Test — tests OptimizerV2 with actual uploaded contracts.
 * More lenient validation since real contracts are unpredictable.
 *
 * Usage: node test-real-contracts.js <email> <password> [--local] [--contract <n>]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const API_BASE = useLocal ? 'http://localhost:5000/api' : 'https://api.contract-ai.de/api';

const REAL_TESTS = [
  {
    name: 'Factoring-Vertrag (Adam Reuter Obst)',
    file: 'test-contracts/real_factoring_adam_reuter.pdf',
    expectedType: /factor|rahmen|dienst|kaufm|sonstig/i,
  },
  {
    name: 'Factoring-Vertrag (EisQueen GmbH)',
    file: 'test-contracts/real_factoring_eisqueen.pdf',
    expectedType: /factor|rahmen|dienst|kaufm|sonstig/i,
  },
  {
    name: 'Versicherungspolice',
    file: 'test-contracts/real_versicherungspolice.pdf',
    expectedType: /versicher|police|agb|sonstig|rahmen/i,
  },
];

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return (await res.json()).token;
}

function analyzeContract(token, pdfPath) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileName = path.basename(pdfPath);
    const boundary = '----B' + Date.now();

    const header = Buffer.from([
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: application/pdf',
      ''
    ].join('\r\n') + '\r\n');
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fullBody = Buffer.concat([header, fileBuffer, footer]);

    const url = new URL(`${API_BASE}/optimizer-v2/analyze`);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const startTime = Date.now();
    let resultId = null;
    let lastProgress = '';
    let rawData = '';

    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', d => errBody += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errBody.substring(0, 300)}`)));
        return;
      }

      res.setEncoding('utf-8');
      res.on('data', (chunk) => {
        rawData += chunk;
        const lines = rawData.split('\n');
        rawData = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.progress !== undefined) {
                lastProgress = `${event.progress}% ${event.message || ''}`;
                process.stdout.write(`\r    ${lastProgress.substring(0, 70).padEnd(72)}`);
              }
              if (event.complete && event.resultId) resultId = event.resultId;
              if (event.error) reject(new Error(`Analysis error: ${event.message}`));
            } catch (e) {}
          }
        }
      });

      res.on('end', () => {
        process.stdout.write('\r' + ' '.repeat(75) + '\r');
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        if (resultId) resolve({ resultId, duration });
        else reject(new Error(`No resultId. Last: ${lastProgress}`));
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function getResults(token, resultId) {
  const res = await fetch(`${API_BASE}/optimizer-v2/results/${resultId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Results fetch failed: ${res.status}`);
  return res.json();
}

function scoreBar(val) {
  if (typeof val !== 'number') return '?';
  const filled = Math.round(val / 5);
  return `[${'|'.repeat(filled)}${'.'.repeat(20 - filled)}] ${val}/100`;
}

function analyzeAndPrint(data, test) {
  const r = data;

  console.log('\n  --- STRUCTURE ---');
  console.log(`  Type: ${r.structure?.contractType} (${r.structure?.contractTypeLabel})`);
  console.log(`  Recognized: ${r.structure?.recognizedAs}`);
  console.log(`  Industry: ${r.structure?.industry}`);
  console.log(`  Maturity: ${r.structure?.maturity}`);
  console.log(`  Language: ${r.structure?.language}`);
  console.log(`  Parties: ${(r.structure?.parties || []).map(p => `${p.role}: ${p.name}`).join(' | ')}`);

  console.log('\n  --- CLAUSES ---');
  const clauseCount = r.clauses?.length || 0;
  console.log(`  Total: ${clauseCount}`);

  const cats = {};
  for (const c of (r.clauses || [])) cats[c.category] = (cats[c.category] || 0) + 1;
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    console.log(`    ${cat.padEnd(22)} ${'#'.repeat(count)} (${count})`);
  }

  const otherCount = cats['other'] || 0;
  const otherRate = clauseCount > 0 ? (otherCount / clauseCount * 100).toFixed(0) : 0;
  console.log(`  Other rate: ${otherRate}%`);

  console.log('\n  --- SCORES ---');
  const s = r.scores || {};
  console.log(`  Overall:      ${scoreBar(s.overall)}`);
  console.log(`  Risk:         ${scoreBar(s.risk)}`);
  console.log(`  Fairness:     ${scoreBar(s.fairness)}`);
  console.log(`  Clarity:      ${scoreBar(s.clarity)}`);
  console.log(`  Completeness: ${scoreBar(s.completeness)}`);
  console.log(`  Market Std:   ${scoreBar(s.marketStandard)}`);

  console.log('\n  --- ANALYSIS QUALITY ---');
  const strengths = {};
  for (const a of (r.clauseAnalyses || [])) strengths[a.strength] = (strengths[a.strength] || 0) + 1;
  console.log(`  Strengths: ${JSON.stringify(strengths)}`);

  const optCount = (r.optimizations || []).filter(o => o.needsOptimization).length;
  console.log(`  Optimizations needed: ${optCount}/${clauseCount}`);

  // Sample optimization reasoning
  const sampleOpt = (r.optimizations || []).find(o => o.needsOptimization);
  if (sampleOpt) {
    console.log(`  Sample reasoning: ${sampleOpt.versions?.neutral?.reasoning?.substring(0, 150)}...`);
  }

  console.log('\n  --- MISSING CLAUSES ---');
  const missing = s.missingClauses || [];
  if (missing.length === 0) {
    console.log('  None detected');
  } else {
    for (const mc of missing) {
      const icon = mc.foundInContent ? '~' : 'X';
      console.log(`  [${icon}] ${mc.categoryLabel} (${mc.severity})`);
    }
  }

  // Top risks
  console.log('\n  --- TOP RISKS ---');
  const riskyAnalyses = (r.clauseAnalyses || [])
    .filter(a => a.riskLevel >= 5)
    .sort((a, b) => b.riskLevel - a.riskLevel)
    .slice(0, 5);
  if (riskyAnalyses.length === 0) {
    console.log('  No high-risk clauses (all risk < 5)');
  } else {
    for (const a of riskyAnalyses) {
      const clause = (r.clauses || []).find(c => c.id === a.clauseId);
      console.log(`  Risk ${a.riskLevel}/10: ${clause?.title || a.clauseId} (${a.strength}, ${a.powerBalance})`);
      if (a.concerns?.length > 0) console.log(`    Concerns: ${a.concerns[0].substring(0, 100)}`);
    }
  }

  // Validation checks
  console.log('\n  --- VALIDATION ---');
  const checks = [
    { name: 'Pipeline completed', ok: r.status === 'completed' },
    { name: 'Clauses >= 3', ok: clauseCount >= 3 },
    { name: 'Other rate <= 30%', ok: otherRate <= 30 },
    { name: 'Scores present', ok: typeof s.overall === 'number' },
    { name: 'All clauses analyzed', ok: (r.clauseAnalyses?.length || 0) >= clauseCount * 0.8 },
    { name: 'Type detected', ok: !!r.structure?.contractType },
  ];

  for (const c of checks) {
    console.log(`  ${c.ok ? '[OK]' : '[!!]'} ${c.name}`);
  }

  return checks.every(c => c.ok);
}

async function main() {
  console.log('\n  Contract-AI Optimizer V2 — Real Contract Tests');
  console.log(`  API: ${API_BASE}`);
  console.log('='.repeat(60));

  let token;
  const tokenIdx = args.indexOf('--token');
  if (tokenIdx !== -1 && args[tokenIdx + 1]) {
    token = args[tokenIdx + 1];
  } else {
    const creds = args.filter(a => !a.startsWith('--'));
    if (creds.length < 2) {
      console.error('  Usage: node test-real-contracts.js <email> <password>');
      process.exit(1);
    }
    token = await login(creds[0], creds[1]);
  }

  const contractIdx = args.indexOf('--contract');
  let testsToRun = REAL_TESTS;
  if (contractIdx !== -1 && args[contractIdx + 1]) {
    const idx = parseInt(args[contractIdx + 1]);
    if (idx >= 0 && idx < REAL_TESTS.length) testsToRun = [REAL_TESTS[idx]];
  }

  const results = [];
  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i];
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`  [${i + 1}/${testsToRun.length}] ${test.name}`);
    console.log(`  File: ${test.file} (${(fs.statSync(test.file).size / 1024).toFixed(0)}KB)`);
    console.log('='.repeat(60));

    try {
      const { resultId, duration } = await analyzeContract(token, test.file);
      console.log(`  Completed in ${duration}s — ID: ${resultId}`);

      const fullResult = await getResults(token, resultId);
      const data = fullResult.result || fullResult.data || fullResult;
      const passed = analyzeAndPrint(data, test);

      results.push({ name: test.name, passed, duration });
    } catch (err) {
      console.error(`\n  ERROR: ${err.message}`);
      results.push({ name: test.name, passed: false, error: err.message });
    }
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('  REAL CONTRACT TEST SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    const time = r.duration ? ` (${r.duration}s)` : '';
    const err = r.error ? ` — ${r.error}` : '';
    console.log(`  [${icon}] ${r.name}${time}${err}`);
  }
  console.log('='.repeat(60));

  process.exit(results.every(r => r.passed) ? 0 : 1);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

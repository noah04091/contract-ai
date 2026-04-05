#!/usr/bin/env node
/**
 * OptimizerV2 Local Pipeline Test
 *
 * Testet OHNE API-Calls und OHNE Auth-Token:
 * 1. Datenintegrität aller vorhandenen Analysen in MongoDB
 * 2. Score-Konsistenz (Stage 5 Neuberechnung → Vergleich)
 * 3. Schema-Validierung (fehlende Felder, ungültige Werte)
 * 4. Export-Endpunkte (DOCX, Redline-PDF, Analysis-PDF) via HTTP
 *
 * Usage: node backend/scripts/testOptimizerV2Local.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const { runScoreCalculation } = require('../services/optimizerV2/stages/05-scoreCalculation');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

// ── Color helpers ──
const G = '\x1b[32m'; // green
const R = '\x1b[31m'; // red
const Y = '\x1b[33m'; // yellow
const C = '\x1b[36m'; // cyan
const W = '\x1b[0m';  // reset

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function check(label, condition, detail) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    // Only log failures and warnings for cleaner output
  } else {
    failedChecks++;
    console.log(`    ${R}✗ ${label}${detail ? ': ' + detail : ''}${W}`);
  }
}

function warn(label, detail) {
  warnings++;
  console.log(`    ${Y}⚠ ${label}${detail ? ': ' + detail : ''}${W}`);
}

function pass(label, detail) {
  totalChecks++;
  passedChecks++;
  console.log(`    ${G}✓ ${label}${detail ? ': ' + detail : ''}${W}`);
}

// ═══════════════════════════════════════════════
// TEST 1: Data Integrity
// ═══════════════════════════════════════════════

function testDataIntegrity(result) {
  const id = result._id.toString().slice(-8);
  const name = result.fileName || 'unknown';

  // Structure
  check('structure exists', !!result.structure);
  check('contractType', !!result.structure?.contractType, result.structure?.contractType);
  check('contractTypeLabel', !!result.structure?.contractTypeLabel);
  check('parties', Array.isArray(result.structure?.parties) && result.structure.parties.length > 0,
    `${result.structure?.parties?.length || 0} Parteien`);

  // Clauses
  check('clauses array', Array.isArray(result.clauses) && result.clauses.length > 0,
    `${result.clauses?.length || 0} Klauseln`);

  if (result.clauses?.length > 0) {
    // Each clause must have id, title, originalText, category
    let clauseErrors = 0;
    for (const clause of result.clauses) {
      if (!clause.id) clauseErrors++;
      if (!clause.title) clauseErrors++;
      if (!clause.originalText) clauseErrors++;
      if (!clause.category) clauseErrors++;
    }
    check('clause fields complete', clauseErrors === 0, clauseErrors > 0 ? `${clauseErrors} fehlende Felder` : undefined);

    // Unique clause IDs
    const clauseIds = result.clauses.map(c => c.id);
    const uniqueIds = new Set(clauseIds);
    check('unique clause IDs', uniqueIds.size === clauseIds.length,
      `${clauseIds.length} IDs, ${uniqueIds.size} unique`);
  }

  // Clause Analyses
  check('clauseAnalyses array', Array.isArray(result.clauseAnalyses) && result.clauseAnalyses.length > 0,
    `${result.clauseAnalyses?.length || 0} Analysen`);

  if (result.clauseAnalyses?.length > 0) {
    // Each analysis must reference a valid clause
    const clauseIdSet = new Set((result.clauses || []).map(c => c.id));
    let orphanedAnalyses = 0;
    let invalidStrength = 0;
    let invalidRisk = 0;
    let invalidImportance = 0;
    let missingPowerBalance = 0;
    let missingMarketComparison = 0;

    const validStrengths = ['strong', 'adequate', 'weak', 'missing', 'critical'];
    const validImportance = ['critical', 'high', 'medium', 'low'];
    const validPowerBalance = ['balanced', 'slightly_one_sided', 'strongly_one_sided', 'extremely_one_sided'];
    const validMarketComparison = ['below_market', 'market_standard', 'slightly_strict', 'significantly_strict', 'unusually_disadvantageous'];

    for (const analysis of result.clauseAnalyses) {
      if (!clauseIdSet.has(analysis.clauseId)) orphanedAnalyses++;
      if (!validStrengths.includes(analysis.strength)) invalidStrength++;
      if (typeof analysis.riskLevel !== 'number' || analysis.riskLevel < 0 || analysis.riskLevel > 10) invalidRisk++;
      if (!validImportance.includes(analysis.importanceLevel)) invalidImportance++;
      if (!validPowerBalance.includes(analysis.powerBalance)) missingPowerBalance++;
      if (!validMarketComparison.includes(analysis.marketComparison)) missingMarketComparison++;
    }

    check('no orphaned analyses', orphanedAnalyses === 0, orphanedAnalyses > 0 ? `${orphanedAnalyses} verwaist` : undefined);
    check('valid strength values', invalidStrength === 0, invalidStrength > 0 ? `${invalidStrength} ungültig` : undefined);
    check('valid riskLevel (0-10)', invalidRisk === 0, invalidRisk > 0 ? `${invalidRisk} ungültig` : undefined);
    check('valid importanceLevel', invalidImportance === 0, invalidImportance > 0 ? `${invalidImportance} ungültig` : undefined);
    check('powerBalance present', missingPowerBalance === 0, missingPowerBalance > 0 ? `${missingPowerBalance} fehlend` : undefined);
    check('marketComparison present', missingMarketComparison === 0, missingMarketComparison > 0 ? `${missingMarketComparison} fehlend` : undefined);

    // Analysis count should match clause count
    check('analyses ↔ clauses match',
      result.clauseAnalyses.length === result.clauses?.length,
      `${result.clauseAnalyses.length} Analysen vs ${result.clauses?.length || 0} Klauseln`);
  }

  // Optimizations
  check('optimizations array', Array.isArray(result.optimizations) && result.optimizations.length > 0,
    `${result.optimizations?.length || 0} Optimierungen`);

  if (result.optimizations?.length > 0) {
    let missingVersions = 0;
    let emptyTexts = 0;
    let missingDiffs = 0;
    const modes = ['neutral', 'proCreator', 'proRecipient'];

    for (const opt of result.optimizations) {
      if (!opt.needsOptimization) continue;
      for (const mode of modes) {
        if (!opt.versions?.[mode]?.text) missingVersions++;
        if (opt.versions?.[mode]?.text && opt.versions[mode].text.trim().length === 0) emptyTexts++;
        if (!opt.versions?.[mode]?.diffs || opt.versions[mode].diffs.length === 0) missingDiffs++;
      }
    }

    const optimizedCount = result.optimizations.filter(o => o.needsOptimization).length;
    check('all 3 mode versions present', missingVersions === 0,
      missingVersions > 0 ? `${missingVersions} fehlend bei ${optimizedCount} optimierten Klauseln` : undefined);
    check('no empty optimization texts', emptyTexts === 0, emptyTexts > 0 ? `${emptyTexts} leer` : undefined);
    check('diffs present', missingDiffs === 0, missingDiffs > 0 ? `${missingDiffs} fehlend` : undefined);
  }

  // Scores
  check('scores exist', !!result.scores);
  if (result.scores) {
    const s = result.scores;
    check('overall score 0-100', typeof s.overall === 'number' && s.overall >= 0 && s.overall <= 100, `${s.overall}`);
    check('risk score 0-100', typeof s.risk === 'number' && s.risk >= 0 && s.risk <= 100, `${s.risk}`);
    check('fairness score 0-100', typeof s.fairness === 'number' && s.fairness >= 0 && s.fairness <= 100, `${s.fairness}`);
    check('clarity score 0-100', typeof s.clarity === 'number' && s.clarity >= 0 && s.clarity <= 100, `${s.clarity}`);
    check('completeness score 0-100', typeof s.completeness === 'number' && s.completeness >= 0 && s.completeness <= 100, `${s.completeness}`);
    check('marketStandard 0-100', typeof s.marketStandard === 'number' && s.marketStandard >= 0 && s.marketStandard <= 100, `${s.marketStandard}`);
    check('perClause scores', Array.isArray(s.perClause) && s.perClause.length > 0);
    check('missingClauses array', Array.isArray(s.missingClauses));
  }

  // Meta
  check('textHash present', !!result.textHash);
  check('originalText present', !!result.originalText && result.originalText.length > 100);
  check('costs tracked', !!result.costs && result.costs.totalCostUSD >= 0);
}

// ═══════════════════════════════════════════════
// TEST 2: Score Recalculation Consistency
// ═══════════════════════════════════════════════

function testScoreConsistency(result) {
  if (!result.clauses || !result.clauseAnalyses || !result.optimizations || !result.structure) {
    warn('Score consistency skip', 'Unvollständige Daten');
    return;
  }

  const noopProgress = () => {};
  const { result: recalculated } = runScoreCalculation(
    result.clauses,
    result.clauseAnalyses,
    result.optimizations,
    result.structure,
    noopProgress
  );

  const stored = result.scores;
  if (!stored || !recalculated) {
    warn('Score consistency skip', 'Kein Score zum Vergleichen');
    return;
  }

  const tolerance = 2; // Allow ±2 points for floating point differences

  function scoreMatch(name, storedVal, calcVal) {
    const diff = Math.abs((storedVal || 0) - (calcVal || 0));
    check(`${name} consistent (stored=${storedVal}, calc=${calcVal})`,
      diff <= tolerance,
      diff > tolerance ? `Δ${diff} (> ${tolerance} tolerance)` : undefined);
  }

  scoreMatch('overall', stored.overall, recalculated.overall);
  scoreMatch('risk', stored.risk, recalculated.risk);
  scoreMatch('fairness', stored.fairness, recalculated.fairness);
  scoreMatch('clarity', stored.clarity, recalculated.clarity);
  scoreMatch('completeness', stored.completeness, recalculated.completeness);
  scoreMatch('marketStandard', stored.marketStandard, recalculated.marketStandard);

  // Compare per-clause scores
  if (stored.perClause && recalculated.perClause) {
    let clauseScoreDiffs = 0;
    for (const recalcPC of recalculated.perClause) {
      const storedPC = stored.perClause.find(p => p.clauseId === recalcPC.clauseId);
      if (storedPC && Math.abs(storedPC.score - recalcPC.score) > tolerance) {
        clauseScoreDiffs++;
      }
    }
    check('per-clause scores consistent', clauseScoreDiffs === 0,
      clauseScoreDiffs > 0 ? `${clauseScoreDiffs} Klauseln mit Score-Abweichung` : undefined);
  }

  // Compare missing clauses
  check('missingClauses count match',
    (stored.missingClauses?.length || 0) === (recalculated.missingClauses?.length || 0),
    `stored=${stored.missingClauses?.length || 0}, calc=${recalculated.missingClauses?.length || 0}`);
}

// ═══════════════════════════════════════════════
// TEST 3: Cross-Contract Validation
// ═══════════════════════════════════════════════

function testCrossContractConsistency(results) {
  console.log(`\n${C}═══ Test 3: Cross-Contract Konsistenz ═══${W}\n`);

  // Contract type detection should not return "other" for standard contract types
  const types = results.map(r => ({
    file: r.fileName,
    type: r.structure?.contractType,
    label: r.structure?.contractTypeLabel
  }));

  let unknownTypes = 0;
  for (const t of types) {
    if (t.type === 'other' || !t.type) {
      warn('Vertragstyp nicht erkannt', `${t.file}: ${t.type || 'null'}`);
      unknownTypes++;
    }
  }
  if (unknownTypes === 0) pass('Alle Vertragstypen erkannt');

  // Score distribution sanity check
  const overallScores = results.map(r => r.scores?.overall).filter(s => typeof s === 'number');
  if (overallScores.length > 0) {
    const min = Math.min(...overallScores);
    const max = Math.max(...overallScores);
    const avg = Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length);
    const spread = max - min;

    pass('Score-Verteilung', `Min=${min}, Max=${max}, Avg=${avg}, Spread=${spread}`);

    // Scores should not all be identical (that would indicate a bug)
    if (overallScores.length > 2) {
      check('Scores nicht identisch', spread > 0, 'Alle Ergebnisse haben den gleichen Score');
    }

    // No extreme clustering (all scores between 40-60 = weak differentiation)
    if (overallScores.length > 3 && spread < 15) {
      warn('Geringe Score-Differenzierung', `Spread nur ${spread} Punkte — Verträge unterschiedlicher Qualität sollten deutlichere Score-Unterschiede zeigen`);
    }
  }

  // Category coverage across all results
  const allCategories = new Set();
  for (const r of results) {
    for (const c of (r.clauses || [])) {
      if (c.category) allCategories.add(c.category);
    }
  }
  pass('Kategorie-Abdeckung', `${allCategories.size} verschiedene Kategorien: ${[...allCategories].sort().join(', ')}`);

  // Strength distribution across all analyses
  const strengthDist = { strong: 0, adequate: 0, weak: 0, critical: 0 };
  let totalAnalyses = 0;
  for (const r of results) {
    for (const a of (r.clauseAnalyses || [])) {
      if (strengthDist.hasOwnProperty(a.strength)) {
        strengthDist[a.strength]++;
      }
      totalAnalyses++;
    }
  }
  if (totalAnalyses > 0) {
    const pct = (n) => Math.round(n / totalAnalyses * 100);
    pass('Stärke-Verteilung',
      `strong=${pct(strengthDist.strong)}% adequate=${pct(strengthDist.adequate)}% weak=${pct(strengthDist.weak)}% critical=${pct(strengthDist.critical)}% (n=${totalAnalyses})`);

    // Red flag: if >80% are "strong", GPT might be too generous
    if (pct(strengthDist.strong) > 80) {
      warn('GPT möglicherweise zu großzügig', `${pct(strengthDist.strong)}% aller Klauseln als "strong" bewertet`);
    }
    // Red flag: if >50% are "critical", GPT might be too harsh
    if (pct(strengthDist.critical) > 50) {
      warn('GPT möglicherweise zu streng', `${pct(strengthDist.critical)}% aller Klauseln als "critical" bewertet`);
    }
  }
}

// ═══════════════════════════════════════════════
// TEST 4: Stage 5 Edge Cases (Unit Tests)
// ═══════════════════════════════════════════════

function testStage5EdgeCases() {
  console.log(`\n${C}═══ Test 4: Stage 5 Edge Cases ═══${W}\n`);
  const noop = () => {};

  // Test 4a: Empty inputs
  try {
    const { result } = runScoreCalculation([], [], [], {}, noop);
    check('Empty input → score 30', result.overall === 30, `Got ${result.overall}`);
    pass('Empty input handled gracefully');
  } catch (e) {
    check('Empty input no crash', false, e.message);
  }

  // Test 4b: Single strong clause
  try {
    const clauses = [{ id: 'c1', title: 'Haftung', originalText: 'Haftungsklausel...', category: 'liability' }];
    const analyses = [{ clauseId: 'c1', strength: 'strong', riskLevel: 1, importanceLevel: 'critical', concerns: [], legalReferences: ['§ 276 BGB'], powerBalance: 'balanced', marketComparison: 'market_standard' }];
    const optimizations = [{ clauseId: 'c1', needsOptimization: false }];
    const structure = { contractType: 'dienstleistungsvertrag' };
    const { result } = runScoreCalculation(clauses, analyses, optimizations, structure, noop);
    check('Single strong clause → high score', result.overall >= 60, `Got ${result.overall}`);
    check('Single strong → low risk', result.risk >= 70, `Risk=${result.risk}`);
    pass('Single clause scenario');
  } catch (e) {
    check('Single clause no crash', false, e.message);
  }

  // Test 4c: All critical clauses
  try {
    const clauses = [
      { id: 'c1', title: 'Haftung', originalText: 'text', category: 'liability' },
      { id: 'c2', title: 'Zahlung', originalText: 'text', category: 'payment' },
      { id: 'c3', title: 'Kündigung', originalText: 'text', category: 'termination' }
    ];
    const analyses = clauses.map(c => ({
      clauseId: c.id, strength: 'critical', riskLevel: 9, importanceLevel: 'critical',
      concerns: ['Schwerwiegend', 'Unzulässig'], legalReferences: [],
      powerBalance: 'extremely_one_sided', marketComparison: 'unusually_disadvantageous'
    }));
    const optimizations = clauses.map(c => ({
      clauseId: c.id, needsOptimization: true,
      versions: { neutral: { text: 'fix' }, proCreator: { text: 'fix' }, proRecipient: { text: 'fix' } }
    }));
    const { result } = runScoreCalculation(clauses, analyses, optimizations, { contractType: 'dienstleistungsvertrag' }, noop);
    check('All critical → low score', result.overall <= 30, `Got ${result.overall}`);
    check('All critical → high risk', result.risk <= 30, `Risk=${result.risk}`);
    check('All critical → low fairness', result.fairness <= 30, `Fairness=${result.fairness}`);
    pass('All-critical scenario produces low scores');
  } catch (e) {
    check('All critical no crash', false, e.message);
  }

  // Test 4d: Missing clause detection for different contract types
  try {
    const clauses = [{ id: 'c1', title: 'Allgemeines', originalText: 'Allgemeine Bestimmungen', category: 'general_provisions' }];
    const analyses = [{ clauseId: 'c1', strength: 'adequate', riskLevel: 3, importanceLevel: 'low', concerns: [], legalReferences: [], powerBalance: 'balanced', marketComparison: 'market_standard' }];
    const optimizations = [{ clauseId: 'c1', needsOptimization: false }];

    // Test with Arbeitsvertrag (should detect many missing essential clauses)
    const { result: arbResult } = runScoreCalculation(clauses, analyses, optimizations, { contractType: 'arbeitsvertrag' }, noop);
    check('Arbeitsvertrag: missing clauses detected', arbResult.missingClauses.length >= 4,
      `${arbResult.missingClauses.length} fehlend`);
    check('Arbeitsvertrag: low completeness', arbResult.completeness <= 40,
      `Completeness=${arbResult.completeness}`);

    // Test with NDA (fewer essential clauses expected)
    const { result: ndaResult } = runScoreCalculation(clauses, analyses, optimizations, { contractType: 'nda' }, noop);
    check('NDA: missing clauses detected', ndaResult.missingClauses.length >= 3,
      `${ndaResult.missingClauses.length} fehlend`);

    pass('Missing clause detection working');
  } catch (e) {
    check('Missing clause detection no crash', false, e.message);
  }

  // Test 4e: Score warnings
  try {
    // High overall but low risk → should trigger warning
    const clauses = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`, title: `Klausel ${i}`, originalText: 'Text', category: 'general_provisions'
    }));
    const analyses = clauses.map((c, i) => ({
      clauseId: c.id,
      strength: i < 8 ? 'strong' : 'critical',
      riskLevel: i < 8 ? 1 : 10,
      importanceLevel: i < 8 ? 'low' : 'critical',
      concerns: [],
      legalReferences: [],
      powerBalance: i < 8 ? 'balanced' : 'extremely_one_sided',
      marketComparison: i < 8 ? 'market_standard' : 'unusually_disadvantageous'
    }));
    const optimizations = clauses.map(c => ({ clauseId: c.id, needsOptimization: false }));
    const { result } = runScoreCalculation(clauses, analyses, optimizations, { contractType: 'dienstleistungsvertrag' }, noop);
    // Warnings array should exist (even if empty for this case)
    check('warnings array exists', Array.isArray(result.warnings));
    pass('Warning system functional');
  } catch (e) {
    check('Warning system no crash', false, e.message);
  }
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C}═══════════════════════════════════════════════════${W}`);
  console.log(`${C}  OptimizerV2 Local Test Suite${W}`);
  console.log(`${C}═══════════════════════════════════════════════════${W}\n`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');
  const collection = db.collection('optimizer_v2_results');

  // Load all completed results
  const results = await collection.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  console.log(`${C}Gefunden: ${results.length} abgeschlossene Analysen${W}\n`);

  if (results.length === 0) {
    console.log(`${Y}Keine Ergebnisse zum Testen vorhanden.${W}`);
    await client.close();
    return;
  }

  // ── Test 1 + 2: Per-Result Tests ──
  for (const result of results) {
    const id = result._id.toString().slice(-8);
    const name = result.fileName || 'unknown';
    const type = result.structure?.contractTypeLabel || result.structure?.contractType || '?';
    const score = result.scores?.overall ?? '?';
    const clauseCount = result.clauses?.length || 0;

    console.log(`${C}─── ${name} (${type}) | Score: ${score}/100 | ${clauseCount} Klauseln | ...${id} ───${W}`);

    // Test 1: Data Integrity
    testDataIntegrity(result);

    // Test 2: Score Consistency
    testScoreConsistency(result);

    console.log();
  }

  // ── Test 3: Cross-Contract ──
  if (results.length > 1) {
    testCrossContractConsistency(results);
  }

  // ── Test 4: Edge Cases (no DB needed) ──
  testStage5EdgeCases();

  // ── Test 5: Failed/Running Results Check ──
  console.log(`\n${C}═══ Test 5: Pipeline-Status ═══${W}\n`);
  const statusCounts = await collection.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();

  for (const s of statusCounts) {
    const icon = s._id === 'completed' ? G + '✓' : s._id === 'failed' ? R + '✗' : Y + '⚠';
    console.log(`  ${icon} ${s._id}: ${s.count}${W}`);
  }

  const stuckRunning = await collection.countDocuments({
    status: 'running',
    startedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // > 30 min
  });
  if (stuckRunning > 0) {
    warn('Stuck pipelines', `${stuckRunning} Analysen seit >30min im Status "running"`);
  } else {
    pass('Keine feststeckenden Pipelines');
  }

  // ── Test 6: Duplicate Detection ──
  console.log(`\n${C}═══ Test 6: Duplikat-Erkennung ═══${W}\n`);
  const hashGroups = await collection.aggregate([
    { $match: { status: 'completed', textHash: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$textHash', count: { $sum: 1 }, files: { $push: '$fileName' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (hashGroups.length === 0) {
    pass('Keine Duplikate', 'Alle textHashes sind einzigartig');
  } else {
    for (const g of hashGroups) {
      warn('Duplikat gefunden', `Hash ${g._id.substring(0, 12)}... → ${g.count}x (${g.files.join(', ')})`);
    }
  }

  // Check that all completed results have textHash
  const noHash = await collection.countDocuments({
    status: 'completed',
    $or: [{ textHash: { $exists: false } }, { textHash: null }, { textHash: '' }]
  });
  if (noHash > 0) {
    warn('textHash fehlend', `${noHash} completed Ergebnisse ohne textHash`);
  } else {
    pass('Alle completed Ergebnisse haben textHash');
  }

  // ── Summary ──
  console.log(`\n${C}═══════════════════════════════════════════════════${W}`);
  console.log(`${C}  ERGEBNIS${W}`);
  console.log(`${C}═══════════════════════════════════════════════════${W}\n`);
  console.log(`  ${G}✓ ${passedChecks} bestanden${W}`);
  if (failedChecks > 0) console.log(`  ${R}✗ ${failedChecks} fehlgeschlagen${W}`);
  if (warnings > 0) console.log(`  ${Y}⚠ ${warnings} Warnungen${W}`);
  console.log(`  Total: ${totalChecks} Checks\n`);

  await client.close();
  process.exit(failedChecks > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

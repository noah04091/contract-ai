/**
 * Compare V2 — End-to-End Pipeline Test
 *
 * Testet die neue 5-Schichten-Architektur direkt ohne HTTP-Server.
 * Lädt PDFs, extrahiert Text, ruft runCompareV2Pipeline() auf und prüft Ergebnisse.
 *
 * Usage: node backend/scripts/testCompareV2Pipeline.js [factoring|nda|freelancer|saas|mietvertrag|all]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { runCompareV2Pipeline } = require('../services/compareAnalyzer');

// Test contract pairs
// Synonym map for expected key matching — checks if the CONCEPT is covered, not exact string
const EXPECTED_KEY_SYNONYMS = {
  'Flatrate-Gebühr': ['flatrate', 'servicegebühr', 'factoringgebühr', 'limitprüfung', 'pauschale', 'factoringentgelt', 'gebühr'],
  'Ankauflimit': ['ankauflimit', 'forderungslimit', 'ankaufgrenze', 'höchstbetrag', 'kreditlimit', 'factoringlimit', 'limit'],
  'Sicherungseinbehalt': ['sicherungseinbehalt', 'einbehalt', 'sicherheitseinbehalt', 'reservierung', 'sicherheit'],
  'Selbstbehalt': ['selbstbehalt', 'eigenrisiko', 'delkredere', 'ausfallrisiko'],
};

const TEST_PAIRS = {
  factoring: {
    label: 'Factoring (echte Verträge)',
    file1: 'real_factoring_adam_reuter.pdf',
    file2: 'real_factoring_eisqueen.pdf',
    // Expected key concepts that MUST appear in deterministic diffs (checked with synonyms)
    expectedKeys: ['Flatrate-Gebühr', 'Ankauflimit', 'Sicherungseinbehalt', 'Selbstbehalt'],
  },
  nda: {
    label: 'NDA',
    file1: 'NDA_Version_A_TechCorp.pdf',
    file2: 'NDA_Version_B_InnoSoft.pdf',
    expectedKeys: [],
  },
  freelancer: {
    label: 'Freelancer',
    file1: 'Freelancer_Version_A_WebDev.pdf',
    file2: 'Freelancer_Version_B_Design.pdf',
    expectedKeys: [],
  },
  saas: {
    label: 'SaaS',
    file1: 'SaaS_Version_A_CloudPlatform.pdf',
    file2: 'SaaS_Version_B_WorkFlow.pdf',
    expectedKeys: [],
  },
  mietvertrag: {
    label: 'Mietvertrag',
    file1: 'Mietvertrag_Version_A_Wohnung.pdf',
    file2: 'Mietvertrag_Version_B_Wohnung.pdf',
    expectedKeys: [],
  },
};

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function runTest(testId) {
  const pair = TEST_PAIRS[testId];
  if (!pair) {
    console.error(`❌ Unbekannter Test: ${testId}. Verfügbar: ${Object.keys(TEST_PAIRS).join(', ')}`);
    return null;
  }

  const contractDir = path.join(__dirname, '..', '..', 'test-contracts');
  const file1 = path.join(contractDir, pair.file1);
  const file2 = path.join(contractDir, pair.file2);

  if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
    console.error(`❌ Dateien nicht gefunden: ${file1} oder ${file2}`);
    return null;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST: ${pair.label}`);
  console.log(`   Datei 1: ${pair.file1}`);
  console.log(`   Datei 2: ${pair.file2}`);
  console.log(`${'='.repeat(80)}\n`);

  // Extract text
  console.log('📄 Extrahiere Text aus PDFs...');
  const text1 = await extractText(file1);
  const text2 = await extractText(file2);
  console.log(`   Dok1: ${text1.length} Zeichen, Dok2: ${text2.length} Zeichen\n`);

  // Run V2 Pipeline
  const startTime = Date.now();
  let result;
  try {
    result = await runCompareV2Pipeline(
      text1, text2,
      'neutral',     // perspective
      'standard',    // comparisonMode
      'individual',  // userProfile
      (stage, pct, msg) => {
        // Progress callback — just log milestones
        if (pct % 20 === 0 || stage === 'complete') {
          console.log(`   [${pct}%] ${msg}`);
        }
      }
    );
  } catch (error) {
    console.error(`\n❌ PIPELINE FEHLER: ${error.message}`);
    console.error(error.stack);
    return { testId, label: pair.label, error: error.message };
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Pipeline fertig in ${elapsed}s\n`);

  // === ERGEBNIS-ANALYSE ===
  const report = analyzeResult(result, pair, testId);
  report.elapsed = elapsed;
  printReport(report);
  return report;
}

function analyzeResult(result, pair, testId) {
  const report = {
    testId,
    label: pair.label,
    version: result.version,
    pipelineVersion: result._pipelineVersion || 'legacy',
    // Differences
    diffCount: result.differences?.length || 0,
    diffs: (result.differences || []).map(d => ({
      category: d.category,
      area: d.clauseArea,
      severity: d.severity,
      type: d.semanticType,
      c1: (d.contract1 || '').substring(0, 80),
      c2: (d.contract2 || '').substring(0, 80),
      autoDetected: d._autoDetected || false,
      fromDeterministic: d._fromDeterministic || false,
      fromClause: d._fromClauseComparison || false,
      diffType: d._diffType || null,
    })),
    // "Keine Regelung" check
    keineRegelungErrors: [],
    // Scores
    score1: result.scores?.contract1?.overall || result.contract1Analysis?.score || 0,
    score2: result.scores?.contract2?.overall || result.contract2Analysis?.score || 0,
    scoreDiff: 0,
    risk1: result.contract1Analysis?.riskLevel || '?',
    risk2: result.contract2Analysis?.riskLevel || '?',
    // Risks & Recommendations
    riskCount: result.risks?.length || 0,
    recCount: result.recommendations?.length || 0,
    // Summary
    tldr: result.summary?.tldr || '',
    verdict: result.summary?.verdict || '',
    recommended: result.overallRecommendation?.recommended || '?',
    confidence: result.overallRecommendation?.confidence || 0,
    // Category Scores
    catScores1: result.scores?.contract1 || {},
    catScores2: result.scores?.contract2 || {},
    // Expected keys coverage
    expectedKeysFound: [],
    expectedKeysMissing: [],
    // Quality issues
    issues: [],
  };

  report.scoreDiff = Math.abs(report.score1 - report.score2);

  // Check for "Keine Regelung" errors in deterministic diffs
  for (const diff of (result.differences || [])) {
    const c1 = (diff.contract1 || '').toLowerCase();
    const c2 = (diff.contract2 || '').toLowerCase();
    const keineRegelungPattern = /keine regelung|nicht geregelt|nicht vorhanden/;

    if (diff._fromDeterministic || diff._autoDetected) {
      // These are expected to have "Keine Regelung" for missing items
      continue;
    }

    if (keineRegelungPattern.test(c1) || keineRegelungPattern.test(c2)) {
      report.keineRegelungErrors.push({
        category: diff.category,
        side: keineRegelungPattern.test(c1) ? 'Dok1' : 'Dok2',
        text: keineRegelungPattern.test(c1) ? diff.contract1 : diff.contract2,
      });
    }
  }

  // Check expected keys (for factoring)
  if (pair.expectedKeys.length > 0) {
    const allDiffText = (result.differences || []).map(d =>
      `${d.category} ${d.contract1} ${d.contract2} ${d.explanation}`
    ).join(' ').toLowerCase();

    for (const key of pair.expectedKeys) {
      // Check exact match first
      let found = allDiffText.includes(key.toLowerCase());
      // If not found, check synonyms
      if (!found && EXPECTED_KEY_SYNONYMS[key]) {
        found = EXPECTED_KEY_SYNONYMS[key].some(syn => allDiffText.includes(syn.toLowerCase()));
      }
      if (found) {
        report.expectedKeysFound.push(key);
      } else {
        report.expectedKeysMissing.push(key);
      }
    }
  }

  // Quality issues
  if (report.diffCount < 3) report.issues.push('Weniger als 3 Unterschiede erkannt');
  if (report.diffCount > 25) report.issues.push(`Sehr viele Unterschiede (${report.diffCount}) — möglicherweise Noise`);
  if (report.score1 === report.score2) report.issues.push('Scores identisch — unwahrscheinlich');
  if (report.scoreDiff > 0 && report.scoreDiff < 10) report.issues.push(`Score-Differenz nur ${report.scoreDiff} — zu nah beieinander?`);
  if (report.riskCount === 0) report.issues.push('Keine Risiken erkannt');
  if (report.recCount === 0) report.issues.push('Keine Empfehlungen');
  if (report.keineRegelungErrors.length > 0) report.issues.push(`${report.keineRegelungErrors.length}x "Keine Regelung" in GPT-Diffs`);
  if (report.expectedKeysMissing.length > 0) report.issues.push(`Erwartete Keys fehlen: ${report.expectedKeysMissing.join(', ')}`);

  return report;
}

function printReport(report) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 ERGEBNIS: ${report.label} (${report.elapsed}s)`);
  console.log(`${'─'.repeat(60)}`);

  if (report.error) {
    console.log(`❌ FEHLER: ${report.error}`);
    return;
  }

  console.log(`   Pipeline: ${report.pipelineVersion}`);
  console.log(`\n📈 Scores:`);
  console.log(`   Dok1: ${report.score1}/100 (Risiko: ${report.risk1})`);
  console.log(`   Dok2: ${report.score2}/100 (Risiko: ${report.risk2})`);
  console.log(`   Differenz: ${report.scoreDiff} Punkte`);
  console.log(`   Empfehlung: Dokument ${report.recommended} (Konfidenz: ${report.confidence}%)`);

  if (report.catScores1.overall) {
    console.log(`\n   Kategorie-Scores Dok1: F=${report.catScores1.fairness} R=${report.catScores1.riskProtection} Fl=${report.catScores1.flexibility} C=${report.catScores1.completeness} Cl=${report.catScores1.clarity}`);
    console.log(`   Kategorie-Scores Dok2: F=${report.catScores2.fairness} R=${report.catScores2.riskProtection} Fl=${report.catScores2.flexibility} C=${report.catScores2.completeness} Cl=${report.catScores2.clarity}`);
  }

  console.log(`\n📝 Unterschiede: ${report.diffCount}`);
  for (const d of report.diffs) {
    const tag = d.fromDeterministic ? '[DET]' : d.fromClause ? '[CLAUSE]' : d.autoDetected ? '[GAP]' : '[GPT]';
    console.log(`   ${tag} [${d.severity}] ${d.category} (${d.area}/${d.type})${d.diffType ? ' [' + d.diffType + ']' : ''}`);
    console.log(`       Dok1: ${d.c1}`);
    console.log(`       Dok2: ${d.c2}`);
  }

  console.log(`\n⚠️  Risiken: ${report.riskCount} | 📋 Empfehlungen: ${report.recCount}`);

  console.log(`\n💬 TL;DR: ${report.tldr}`);
  console.log(`💬 Verdict: ${report.verdict}`);

  if (report.expectedKeysFound.length > 0 || report.expectedKeysMissing.length > 0) {
    console.log(`\n🔑 Erwartete Keys:`);
    for (const k of report.expectedKeysFound) console.log(`   ✅ ${k}`);
    for (const k of report.expectedKeysMissing) console.log(`   ❌ ${k}`);
  }

  if (report.keineRegelungErrors.length > 0) {
    console.log(`\n🚨 "Keine Regelung" Fehler:`);
    for (const e of report.keineRegelungErrors) {
      console.log(`   ❌ ${e.category} (${e.side}): "${e.text}"`);
    }
  }

  if (report.issues.length > 0) {
    console.log(`\n⚠️  Qualitäts-Issues:`);
    for (const i of report.issues) console.log(`   ⚠️  ${i}`);
  } else {
    console.log(`\n✅ Keine Qualitäts-Issues erkannt`);
  }

  // Overall grade
  const grade = report.issues.length === 0 ? '🟢 PASS'
    : report.issues.some(i => i.includes('Keine Regelung') || i.includes('Keys fehlen')) ? '🔴 FAIL'
    : '🟡 WARN';
  console.log(`\n${grade} — ${report.label}`);
}

async function main() {
  const arg = process.argv[2] || 'factoring';

  if (arg === 'all') {
    const reports = [];
    for (const testId of Object.keys(TEST_PAIRS)) {
      const report = await runTest(testId);
      if (report) reports.push(report);
    }

    // Summary
    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📊 ZUSAMMENFASSUNG — ${reports.length} Tests`);
    console.log(`${'═'.repeat(80)}`);
    for (const r of reports) {
      const grade = r.error ? '🔴 ERROR'
        : r.issues.length === 0 ? '🟢 PASS'
        : r.issues.some(i => i.includes('Keine Regelung') || i.includes('Keys fehlen')) ? '🔴 FAIL'
        : '🟡 WARN';
      console.log(`${grade} ${r.label}: ${r.diffCount} Diffs, Score ${r.score1}/${r.score2}, ${r.issues.length} Issues (${r.elapsed}s)`);
    }
  } else {
    await runTest(arg);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

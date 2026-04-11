/**
 * Batch-Realitaetstest fuer den Universal Contract Parser.
 *
 * Unterstuetzt A/B-Vergleich zwischen Parser-Versionen.
 *
 * Ausschlusskriterien:
 *   - Keine `extractedText`
 *   - extractedText < 500 Zeichen (vermutlich leer/unleserlich)
 *
 * Usage:
 *   node scripts/batchParserTest.js              # Default: 10 Vertraege, alter Parser
 *   node scripts/batchParserTest.js 20           # Andere Anzahl
 *   node scripts/batchParserTest.js 10 --types   # Nach Dokumenttyp gruppiert
 *   node scripts/batchParserTest.js 10 --v3      # Neuer 5-Pass Universal-Parser
 *   node scripts/batchParserTest.js 10 --v4      # Direct Extraction Parser (v4)
 *   node scripts/batchParserTest.js 10 --ab      # A/B-Vergleich: v2 vs. v3
 *   node scripts/batchParserTest.js 10 --ab4     # A/B-Vergleich: v2 vs. v4
 *
 * Ausgabe:
 *   - Stdout: Live-Report waehrend des Laufs
 *   - Datei: test-contracts/batch_parser_report_<timestamp>.md
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { structuralDiscovery } = require('../services/legalLens/structuralDiscovery');
const { guidedSegmenter } = require('../services/legalLens/guidedSegmenter');
const { parseContractUniversal } = require('../services/legalLens/universalParserAdapter');
const { parseContractDirect } = require('../services/legalLens/extractionAdapter');
const { validate } = require('../services/legalLens/segmentationValidator');

// ── Farb-Helper ───────────────────────────────
const c = (code, t) => `\x1b[${code}m${t}\x1b[0m`;
const bold = (t) => c('1', t);
const dim = (t) => c('2', t);
const green = (t) => c('32', t);
const red = (t) => c('31', t);
const yellow = (t) => c('33', t);
const cyan = (t) => c('36', t);
const magenta = (t) => c('35', t);

function section(title) {
  const line = '─'.repeat(Math.max(0, 78 - title.length));
  console.log(`\n${cyan(`── ${title} ${line}`)}`);
}

// ── V2 Parser (alter 3-Pass) ───────────────────
async function runV2(text) {
  const start = Date.now();
  const discoveryResult = await structuralDiscovery.discover(text);
  const discovery = discoveryResult.discovery;
  const segmentationResult = await guidedSegmenter.segment(text, discoveryResult);
  const { clauses, metadata } = segmentationResult;

  // Quality-Score via Validator berechnen
  const validation = validate(clauses, text, { inputTextLength: metadata.inputCharsSent });

  return {
    parser: 'v2',
    documentType: discovery.documentType,
    scheme: discovery.segmentation?.scheme,
    expectedCount: discovery.segmentation?.estimatedSegmentCount,
    clauseCount: metadata.actualSegmentCount,
    markersVerified: metadata.markersVerified,
    verifyRatio: metadata.actualSegmentCount > 0 ? metadata.markersVerified / metadata.actualSegmentCount : 0,
    qualityScore: validation.qualityScore,
    coverage: validation.checks.coverage.value,
    issues: validation.issues,
    elapsedMs: Date.now() - start
  };
}

// ── V3 Parser (neuer 5-Pass) ───────────────────
async function runV3(text) {
  const start = Date.now();
  const result = await parseContractUniversal(text, { detectRisk: false });
  const meta = result.metadata;
  const pipeline = meta.pipeline || {};

  return {
    parser: 'v3',
    documentType: pipeline.structure?.documentType || meta.discovery?.documentType,
    scheme: pipeline.structure?.scheme || meta.discovery?.scheme,
    expectedCount: null, // Absichtlich entfernt
    clauseCount: result.totalClauses,
    markersVerified: pipeline.segmentation?.markersVerified || meta.segmentation?.markersVerified || 0,
    verifyRatio: result.totalClauses > 0
      ? (pipeline.segmentation?.markersVerified || meta.segmentation?.markersVerified || 0) / result.totalClauses
      : 0,
    qualityScore: pipeline.validation?.qualityScore ?? null,
    coverage: pipeline.segmentation?.coverage ?? pipeline.validation?.checks?.coverage?.value ?? null,
    issues: pipeline.validation?.issues || [],
    needsCorrection: pipeline.validation?.needsCorrection || false,
    corrections: pipeline.correction?.corrections || [],
    boundaryFallback: pipeline.boundary?.fallback || false,
    batchCount: pipeline.segmentation?.batchCount || 1,
    elapsedMs: Date.now() - start
  };
}

// ── V4 Parser (Direct Extraction) ───────────────
async function runV4(text) {
  const start = Date.now();
  const result = await parseContractDirect(text, { detectRisk: false });
  const meta = result.metadata?.extraction || {};

  return {
    parser: 'v4',
    documentType: result.metadata?.documentType,
    scheme: null,
    expectedCount: null,
    clauseCount: result.totalClauses,
    markersVerified: result.totalClauses - (meta.lowTrustCount || 0),
    verifyRatio: result.totalClauses > 0
      ? (result.totalClauses - (meta.lowTrustCount || 0)) / result.totalClauses
      : 0,
    qualityScore: meta.coverageRatio || null,
    coverage: meta.coverageRatio || null,
    issues: meta.coverageWarning ? ['Coverage unter 40%'] : [],
    lowTrustCount: meta.lowTrustCount || 0,
    batchCount: meta.batchCount || 1,
    removedByClean: meta.removedByClean || 0,
    removedByDedup: meta.removedByDedup || 0,
    elapsedMs: Date.now() - start
  };
}

function getVerdict(verifyRatio, qualityScore, parser) {
  if (parser === 'v4') {
    // V4: Coverage ist primaer, Trust sekundaer
    const cov = qualityScore || 0;
    const trust = verifyRatio || 0;
    if (cov >= 0.60 && trust >= 0.80) return 'PASS';
    if (cov >= 0.40 && trust >= 0.50) return 'PARTIAL';
    return 'FAIL';
  }
  // V2/V3: Marker-Verifizierung ist primaer
  if (verifyRatio >= 0.95 && (qualityScore === null || qualityScore >= 0.85)) return 'PASS';
  if (verifyRatio >= 0.70) return 'PARTIAL';
  return 'FAIL';
}

// ── Main ───────────────────────────────
async function main() {
  const count = parseInt(process.argv[2], 10) || 10;
  const byTypes = process.argv.includes('--types');
  const useV3 = process.argv.includes('--v3');
  const useV4 = process.argv.includes('--v4');
  const useAB = process.argv.includes('--ab') && !process.argv.includes('--ab4');
  const useAB4 = process.argv.includes('--ab4');

  const mode = useAB4 ? 'A/B (v2 vs v4)' : useAB ? 'A/B (v2 vs v3)' : useV4 ? 'v4 (Direct Extraction)' : useV3 ? 'v3 (5-Pass)' : 'v2 (3-Pass)';
  section(`Batch-Parser-Test: ${count} Vertraege [${mode}]`);

  const mongo = new MongoClient(process.env.MONGO_URI);
  await mongo.connect();
  const db = mongo.db('contract_ai');

  // Kandidaten: Vertraege mit nicht-trivialem extractedText
  let contracts;
  if (byTypes) {
    const pipeline = [
      { $match: { extractedText: { $exists: true, $ne: '' } } },
      { $addFields: { textLen: { $strLenCP: '$extractedText' } } },
      { $match: { textLen: { $gte: 500 } } },
      { $group: { _id: '$legalLens.discovery.documentType', docs: { $push: '$$ROOT' } } },
      { $project: { samples: { $slice: ['$docs', Math.ceil(count / 5)] } } }
    ];
    const groups = await db.collection('contracts').aggregate(pipeline).toArray();
    contracts = [];
    for (const g of groups) contracts.push(...g.samples);
    contracts = contracts.slice(0, count);
  } else {
    contracts = await db.collection('contracts').aggregate([
      { $match: { extractedText: { $exists: true, $ne: '' } } },
      { $addFields: { textLen: { $strLenCP: '$extractedText' } } },
      { $match: { textLen: { $gte: 500 } } },
      { $sample: { size: count } },
      { $project: { _id: 1, name: 1, extractedText: 1, s3Key: 1 } }
    ]).toArray();
  }

  console.log(`  ${green('OK')} ${contracts.length} Vertraege geladen`);

  if (contracts.length === 0) {
    console.error(red('  Keine passenden Vertraege gefunden.'));
    await mongo.close();
    process.exit(2);
  }

  const results = [];

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    section(`[${i + 1}/${contracts.length}] ${contract.name}`);
    console.log(`  ${dim('id:')}      ${contract._id}`);
    console.log(`  ${dim('length:')}  ${contract.extractedText.length} chars`);

    const entry = {
      id: String(contract._id),
      name: contract.name,
      textLength: contract.extractedText.length,
      v2: null,
      v3: null,
      v4: null
    };

    // ── V2 (alter Parser) ───────────
    if ((!useV3 && !useV4) || useAB || useAB4) {
      console.log(`  ${cyan('[v2]')} Starte 3-Pass-Parser...`);
      try {
        entry.v2 = await runV2(contract.extractedText);
        const v = entry.v2;
        v.verdict = getVerdict(v.verifyRatio, v.qualityScore, v.parser);
        const icon = v.verdict === 'PASS' ? green('PASS') : v.verdict === 'PARTIAL' ? yellow('PARTIAL') : red('FAIL');
        console.log(
          `  ${cyan('[v2]')} ${icon} — ${v.clauseCount} Klauseln, ` +
          `${(v.verifyRatio * 100).toFixed(0)}% Marker, ` +
          `QS=${v.qualityScore?.toFixed(3) || '?'}, ` +
          `Coverage=${v.coverage !== null ? (v.coverage * 100).toFixed(1) + '%' : '?'}, ` +
          `${v.elapsedMs}ms`
        );
      } catch (err) {
        entry.v2 = { parser: 'v2', verdict: 'ERROR', error: err.message, elapsedMs: 0 };
        console.log(`  ${cyan('[v2]')} ${red('ERROR')}: ${err.message}`);
      }
    }

    // ── V3 (neuer Parser) ───────────
    if (useV3 || (useAB && !useAB4)) {
      console.log(`  ${magenta('[v3]')} Starte 5-Pass-Pipeline...`);
      try {
        entry.v3 = await runV3(contract.extractedText);
        const v = entry.v3;
        v.verdict = getVerdict(v.verifyRatio, v.qualityScore, v.parser);
        const icon = v.verdict === 'PASS' ? green('PASS') : v.verdict === 'PARTIAL' ? yellow('PARTIAL') : red('FAIL');
        console.log(
          `  ${magenta('[v3]')} ${icon} — ${v.clauseCount} Klauseln, ` +
          `${(v.verifyRatio * 100).toFixed(0)}% Marker, ` +
          `QS=${v.qualityScore?.toFixed(3) || '?'}, ` +
          `Coverage=${v.coverage !== null ? (v.coverage * 100).toFixed(1) + '%' : '?'}, ` +
          `${v.elapsedMs}ms` +
          `${v.corrections?.length > 0 ? ` [${v.corrections.length} Korrekturen]` : ''}` +
          `${v.boundaryFallback ? ' [Boundary-Fallback]' : ''}` +
          `${v.batchCount > 1 ? ` [${v.batchCount} Batches]` : ''}`
        );
      } catch (err) {
        entry.v3 = { parser: 'v3', verdict: 'ERROR', error: err.message, elapsedMs: 0 };
        console.log(`  ${magenta('[v3]')} ${red('ERROR')}: ${err.message}`);
      }
    }

    // ── V4 (Direct Extraction) ───────────
    if (useV4 || useAB4) {
      console.log(`  ${bold('[v4]')} Starte Direct Extraction...`);
      try {
        entry.v4 = await runV4(contract.extractedText);
        const v = entry.v4;
        v.verdict = getVerdict(v.verifyRatio, v.qualityScore, v.parser);
        const icon = v.verdict === 'PASS' ? green('PASS') : v.verdict === 'PARTIAL' ? yellow('PARTIAL') : red('FAIL');
        console.log(
          `  ${bold('[v4]')} ${icon} — ${v.clauseCount} Klauseln, ` +
          `Trust ${v.markersVerified}/${v.clauseCount}, ` +
          `Coverage=${v.coverage !== null ? (v.coverage * 100).toFixed(1) + '%' : '?'}, ` +
          `${v.elapsedMs}ms` +
          `${v.removedByClean > 0 ? ` [${v.removedByClean} gecleant]` : ''}` +
          `${v.removedByDedup > 0 ? ` [${v.removedByDedup} dedup]` : ''}` +
          `${v.batchCount > 1 ? ` [${v.batchCount} Batches]` : ''}`
        );
      } catch (err) {
        entry.v4 = { parser: 'v4', verdict: 'ERROR', error: err.message, elapsedMs: 0 };
        console.log(`  ${bold('[v4]')} ${red('ERROR')}: ${err.message}`);
      }
    }

    // ── A/B-Vergleich ───────────
    if (useAB4 && entry.v2 && entry.v4 && entry.v2.verdict !== 'ERROR' && entry.v4.verdict !== 'ERROR') {
      const qsDiff = (entry.v4.qualityScore || 0) - (entry.v2.qualityScore || 0);
      const clauseDiff = entry.v4.clauseCount - entry.v2.clauseCount;
      const icon = qsDiff > 0 ? green('+') : qsDiff < 0 ? red('-') : dim('=');
      console.log(
        `  ${bold('[A/B]')} Coverage: ${icon}${(qsDiff * 100).toFixed(1)}pp | ` +
        `Klauseln: ${clauseDiff > 0 ? '+' : ''}${clauseDiff} | ` +
        `v2=${entry.v2.verdict} vs v4=${entry.v4.verdict}`
      );
    }

    if (useAB && entry.v2 && entry.v3 && entry.v2.verdict !== 'ERROR' && entry.v3.verdict !== 'ERROR') {
      const qsDiff = (entry.v3.qualityScore || 0) - (entry.v2.qualityScore || 0);
      const clauseDiff = entry.v3.clauseCount - entry.v2.clauseCount;
      const icon = qsDiff > 0 ? green('+') : qsDiff < 0 ? red('-') : dim('=');
      console.log(
        `  ${bold('[A/B]')} QS: ${icon}${(qsDiff * 100).toFixed(1)}pp | ` +
        `Klauseln: ${clauseDiff > 0 ? '+' : ''}${clauseDiff} | ` +
        `v2=${entry.v2.verdict} vs v3=${entry.v3.verdict}`
      );
    }

    results.push(entry);
  }

  await mongo.close();

  // ── Gesamtreport ───────────────────────────────
  section('Gesamtreport');
  printSummary(results, useAB, useV3, useV4, useAB4);

  // ── Markdown-Report speichern ───────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const reportDir = path.join(__dirname, '..', '..', 'test-contracts');
  const reportPath = path.join(reportDir, `batch_parser_report_${timestamp}.md`);
  const report = buildMarkdownReport(results, { useAB, useV3, useV4, useAB4 });
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n  ${green('OK')} Report gespeichert: ${path.relative(process.cwd(), reportPath)}`);
  console.log('');
}

function printSummary(results, useAB, useV3, useV4, useAB4) {
  const versions = [];
  if ((!useV3 && !useV4) || useAB || useAB4) versions.push('v2');
  if (useV3 || (useAB && !useAB4)) versions.push('v3');
  if (useV4 || useAB4) versions.push('v4');

  for (const ver of versions) {
    const data = results.map(r => r[ver]).filter(Boolean);
    const pass = data.filter(r => r.verdict === 'PASS').length;
    const partial = data.filter(r => r.verdict === 'PARTIAL').length;
    const fail = data.filter(r => r.verdict === 'FAIL').length;
    const errors = data.filter(r => r.verdict === 'ERROR').length;
    const total = data.length;
    const avgQS = data.filter(r => r.qualityScore != null).reduce((s, r) => s + r.qualityScore, 0)
      / Math.max(1, data.filter(r => r.qualityScore != null).length);

    console.log(`\n  ${bold(`[${ver.toUpperCase()}]`)}`);
    console.log(`    ${green(`PASS:    ${pass}/${total}`)}`);
    console.log(`    ${yellow(`PARTIAL: ${partial}/${total}`)}`);
    console.log(`    ${red(`FAIL:    ${fail}/${total}`)}`);
    console.log(`    ${red(`ERROR:   ${errors}/${total}`)}`);
    console.log(`    ${dim(`Avg QS:  ${avgQS.toFixed(3)}`)}`);
  }

  if (useAB) {
    console.log(`\n  ${bold('[A/B VERGLEICH]')}`);
    let v3Better = 0, v2Better = 0, equal = 0, bothError = 0;
    for (const r of results) {
      if (!r.v2 || !r.v3) continue;
      if (r.v2.verdict === 'ERROR' && r.v3.verdict === 'ERROR') { bothError++; continue; }
      if (r.v2.verdict === 'ERROR') { v3Better++; continue; }
      if (r.v3.verdict === 'ERROR') { v2Better++; continue; }
      const qs2 = r.v2.qualityScore || 0;
      const qs3 = r.v3.qualityScore || 0;
      if (qs3 > qs2 + 0.01) v3Better++;
      else if (qs2 > qs3 + 0.01) v2Better++;
      else equal++;
    }
    console.log(`    v3 besser:  ${v3Better}`);
    console.log(`    v2 besser:  ${v2Better}`);
    console.log(`    Gleichauf:  ${equal}`);
    if (bothError) console.log(`    Beide Error: ${bothError}`);
  }
}

function buildMarkdownReport(results, { useAB, useV3, useV4, useAB4 }) {
  const versions = [];
  if ((!useV3 && !useV4) || useAB || useAB4) versions.push('v2');
  if (useV3 || (useAB && !useAB4)) versions.push('v3');
  if (useV4 || useAB4) versions.push('v4');

  let md = `# Batch Parser Test Report\n\n`;
  md += `**Generiert:** ${new Date().toISOString()}\n`;
  md += `**Modus:** ${useAB4 ? 'A/B-Vergleich (v2 vs v4)' : useAB ? 'A/B-Vergleich (v2 vs v3)' : useV4 ? 'v4 (Direct Extraction)' : useV3 ? 'v3 (5-Pass Universal Parser)' : 'v2 (3-Pass Guided Segmenter)'}\n\n`;

  // Zusammenfassung pro Version
  for (const ver of versions) {
    const data = results.map(r => r[ver]).filter(Boolean);
    const pass = data.filter(r => r.verdict === 'PASS').length;
    const partial = data.filter(r => r.verdict === 'PARTIAL').length;
    const fail = data.filter(r => r.verdict === 'FAIL').length;
    const errors = data.filter(r => r.verdict === 'ERROR').length;
    const total = data.length;
    const avgQS = data.filter(r => r.qualityScore != null).reduce((s, r) => s + r.qualityScore, 0)
      / Math.max(1, data.filter(r => r.qualityScore != null).length);
    const passRate = total > 0 ? ((pass / total) * 100).toFixed(0) : 0;

    md += `## ${ver.toUpperCase()} Zusammenfassung\n\n`;
    md += `| Status | Anzahl | Prozent |\n`;
    md += `|--------|--------|---------|\n`;
    md += `| PASS    | ${pass} / ${total} | ${passRate}% |\n`;
    md += `| PARTIAL | ${partial} / ${total} | — |\n`;
    md += `| FAIL    | ${fail} / ${total} | — |\n`;
    md += `| ERROR   | ${errors} / ${total} | — |\n`;
    md += `| **Avg Quality Score** | ${avgQS.toFixed(3)} | — |\n\n`;
  }

  // Detail-Tabelle
  if (useAB) {
    md += `## A/B-Vergleich Detail\n\n`;
    md += `| Vertrag | Text | v2 Verdict | v2 QS | v2 Klauseln | v3 Verdict | v3 QS | v3 Klauseln | Diff |\n`;
    md += `|---------|------|-----------|-------|-------------|-----------|-------|-------------|------|\n`;
    for (const r of results) {
      const v2 = r.v2 || {};
      const v3 = r.v3 || {};
      const qs2 = v2.qualityScore != null ? v2.qualityScore.toFixed(3) : '—';
      const qs3 = v3.qualityScore != null ? v3.qualityScore.toFixed(3) : '—';
      const diff = (v2.qualityScore != null && v3.qualityScore != null)
        ? ((v3.qualityScore - v2.qualityScore) * 100).toFixed(1) + 'pp'
        : '—';
      md += `| ${r.name} | ${r.textLength} | ${v2.verdict || '—'} | ${qs2} | ${v2.clauseCount || '—'} | ${v3.verdict || '—'} | ${qs3} | ${v3.clauseCount || '—'} | ${diff} |\n`;
    }
    md += '\n';
  }

  // Einzelergebnisse
  md += `## Ergebnisse im Detail\n\n`;
  for (const r of results) {
    md += `### ${r.name}\n\n`;
    md += `- **ID:** \`${r.id}\`\n`;
    md += `- **Textlaenge:** ${r.textLength.toLocaleString()} chars\n`;

    for (const ver of versions) {
      const v = r[ver];
      if (!v) continue;
      const icon = v.verdict === 'PASS' ? 'PASS' : v.verdict === 'PARTIAL' ? 'PARTIAL' : v.verdict === 'FAIL' ? 'FAIL' : 'ERROR';
      md += `- **${ver.toUpperCase()}:** ${icon}`;
      if (v.verdict !== 'ERROR') {
        md += ` — ${v.clauseCount} Klauseln, ${(v.verifyRatio * 100).toFixed(0)}% Marker`;
        if (v.qualityScore != null) md += `, QS=${v.qualityScore.toFixed(3)}`;
        if (v.coverage != null) md += `, Coverage=${(v.coverage * 100).toFixed(1)}%`;
        md += `, ${v.elapsedMs}ms`;
        if (v.documentType) md += ` (${v.documentType})`;
        if (v.corrections?.length > 0) md += ` [${v.corrections.length} Korrekturen]`;
      } else {
        md += ` — ${v.error}`;
      }
      md += '\n';
      if (v.issues?.length > 0) {
        md += `  - Issues: ${v.issues.join('; ')}\n`;
      }
    }
    md += '\n';
  }

  md += `## Interpretation\n\n`;
  md += `- **PASS** (>= 95% Marker, QS >= 0.85): Klausel-Grenzen sauber erkannt.\n`;
  md += `- **PARTIAL** (70-95% Marker): Grossteil erkannt, einige Marker nicht gefunden.\n`;
  md += `- **FAIL** (< 70%): Unzureichende Erkennung.\n`;
  md += `- **ERROR**: Technischer Fehler.\n`;
  md += `- **Quality Score (QS)**: Gewichteter Score aus Coverage, Marker-Rate, leere Klauseln, Reihenfolge, Inhaltsqualitaet.\n\n`;

  return md;
}

main().catch(err => {
  console.error(red(`\nFehler: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});

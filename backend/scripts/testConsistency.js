/**
 * Consistency Test: Run the same contract 3x and compare results.
 * Tests deterministic analysis — scores, findings, enforceability should be stable.
 * Usage: node scripts/testConsistency.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { runPipeline } = require('../services/legalPulseV2');
const LegalPulseV2Result = require('../models/LegalPulseV2Result');

const RUNS = 3;

// Test contracts — diverse types
const TEST_CONTRACTS = [
  { id: '69806359ec3a7072b8e87c73', name: 'AV Kana-Gasag (Arbeitsvertrag)' },
  { id: '6984e3d18051f109a613ff33', name: 'Mietvertrag Augustinergasse' },
  { id: '696fb5615ef857d65ff702d8', name: 'ARAG Rechtsschutz (Versicherung)' },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = await database.connect();

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`KONSISTENZTEST — ${RUNS} Durchläufe pro Vertrag`);
    console.log(`${'═'.repeat(70)}\n`);

    for (const contract of TEST_CONTRACTS) {
      // Look up userId
      const doc = await db.collection('contracts').findOne(
        { _id: new ObjectId(contract.id) },
        { projection: { userId: 1 } }
      );
      if (!doc) { console.log(`Skip: ${contract.name} not found`); continue; }
      const userId = doc.userId?.toString() || doc.userId;

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`${contract.name}`);
      console.log(`${'─'.repeat(70)}`);

      const runs = [];

      for (let i = 0; i < RUNS; i++) {
        const startTime = Date.now();
        process.stdout.write(`  Run ${i + 1}/${RUNS}...`);

        const result = await runPipeline(
          { userId, contractId: contract.id, requestId: uuidv4(), triggeredBy: 'manual' },
          () => {} // silent progress
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const full = await LegalPulseV2Result.findById(result.resultId).lean();

        // Collect enforceability stats
        const enf = { valid: 0, questionable: 0, likely_invalid: 0, unknown: 0 };
        const severities = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        const categories = new Set();
        const findingTitles = [];

        for (const f of full.clauseFindings) {
          enf[f.enforceability || 'unknown']++;
          severities[f.severity || 'info']++;
          categories.add(f.category);
          findingTitles.push(f.title);
        }

        runs.push({
          score: result.scores.overall,
          riskScore: result.scores.risk,
          complianceScore: result.scores.compliance,
          findingsCount: result.findingsCount,
          clauseCount: result.clauseCount,
          enforceability: enf,
          severities,
          categories: [...categories].sort(),
          findingTitles: findingTitles.sort(),
          elapsed,
        });

        process.stdout.write(` Score: ${result.scores.overall}, Findings: ${result.findingsCount}, ${elapsed}s\n`);
      }

      // Compare runs
      console.log('\n  VERGLEICH:');
      console.log(`  ${''.padEnd(20)} | ${runs.map((_, i) => `Run ${i + 1}`.padStart(8)).join(' | ')}`);
      console.log(`  ${'─'.repeat(20 + (runs.length * 11))}`);

      const rows = [
        ['Score', runs.map(r => r.score)],
        ['Risk Score', runs.map(r => r.riskScore)],
        ['Compliance', runs.map(r => r.complianceScore)],
        ['Findings', runs.map(r => r.findingsCount)],
        ['Clauses', runs.map(r => r.clauseCount)],
        ['likely_invalid', runs.map(r => r.enforceability.likely_invalid)],
        ['questionable', runs.map(r => r.enforceability.questionable)],
        ['valid', runs.map(r => r.enforceability.valid)],
      ];

      for (const [label, values] of rows) {
        const vals = values.map(v => String(v).padStart(8)).join(' | ');
        const spread = Math.max(...values) - Math.min(...values);
        const icon = spread === 0 ? '✅' : spread <= 5 ? '⚠️' : '❌';
        console.log(`  ${label.padEnd(20)} | ${vals} | Δ${spread} ${icon}`);
      }

      // Check finding title overlap
      const allTitles = runs.map(r => r.findingTitles);
      const commonTitles = allTitles[0].filter(t =>
        allTitles.every(titles => titles.includes(t))
      );
      const totalUnique = new Set(allTitles.flat()).size;
      const overlapPct = totalUnique > 0 ? Math.round((commonTitles.length / totalUnique) * 100) : 100;

      console.log(`\n  Finding-Überlappung: ${commonTitles.length}/${totalUnique} (${overlapPct}%)`);
      if (overlapPct < 100) {
        console.log('  Nur in einzelnen Runs:');
        for (let i = 0; i < runs.length; i++) {
          const unique = runs[i].findingTitles.filter(t => !commonTitles.includes(t));
          if (unique.length > 0) {
            console.log(`    Run ${i + 1}: ${unique.join(', ')}`);
          }
        }
      }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log('FAZIT');
    console.log(`${'═'.repeat(70)}\n`);
    console.log('Legende: ✅ = identisch, ⚠️ = Δ ≤ 5, ❌ = Δ > 5');
    console.log('Ziel: Score-Varianz < 5 Punkte, Finding-Überlappung > 80%\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();

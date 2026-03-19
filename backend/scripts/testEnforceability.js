/**
 * Quick test: Run V2 analysis on 1 contract and show enforceability results.
 * Usage: node scripts/testEnforceability.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { runPipeline } = require('../services/legalPulseV2');
const LegalPulseV2Result = require('../models/LegalPulseV2Result');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await database.connect();

    // Use the Arbeitsvertrag (most findings, Score 41 — good test case)
    const contractId = '69806359ec3a7072b8e87c73'; // AV Kana-Gasag 1.pdf
    const db = await database.connect();
    const contract = await db.collection('contracts')
      .findOne({ _id: new (require('mongodb').ObjectId)(contractId) }, { projection: { userId: 1 } });
    const userId = contract?.userId;

    if (!userId) { console.error('Contract not found'); process.exit(1); }

    console.log('Analysiere: AV Kana-Gasag 1.pdf (Arbeitsvertrag)');
    console.log('Testing enforceability analysis...\n');

    const startTime = Date.now();
    const result = await runPipeline(
      { userId: userId.toString(), contractId, requestId: uuidv4(), triggeredBy: 'manual' },
      (progress, message) => {
        process.stdout.write(`\r  [${progress}%] ${message}                    `);
        if (progress >= 90) process.stdout.write('\n');
      }
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nFertig in ${elapsed}s — Score: ${result.scores.overall}/100\n`);

    // Load full result to show enforceability
    const fullResult = await LegalPulseV2Result.findById(result.resultId).lean();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('ENFORCEABILITY-ANALYSE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const stats = { valid: 0, questionable: 0, likely_invalid: 0, unknown: 0 };

    for (const f of fullResult.clauseFindings) {
      const icon = {
        valid: '✅',
        questionable: '⚠️',
        likely_invalid: '❌',
        unknown: '❓',
      }[f.enforceability] || '❓';

      stats[f.enforceability || 'unknown']++;

      console.log(`${icon} [${f.severity.toUpperCase()}] ${f.title}`);
      console.log(`   Durchsetzbarkeit: ${f.enforceability || 'nicht bewertet'}`);
      console.log(`   Rechtsgrundlage: ${f.legalBasis}`);
      console.log(`   Betroffener Text: "${f.affectedText?.substring(0, 80)}..."`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('ZUSAMMENFASSUNG');
    console.log(`   ✅ valid:          ${stats.valid}`);
    console.log(`   ⚠️  questionable:   ${stats.questionable}`);
    console.log(`   ❌ likely_invalid:  ${stats.likely_invalid}`);
    console.log(`   ❓ unknown:        ${stats.unknown}`);
    console.log(`   Gesamt:            ${fullResult.clauseFindings.length} Befunde`);
    console.log('═══════════════════════════════════════════════════════════');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

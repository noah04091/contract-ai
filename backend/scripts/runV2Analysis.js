/**
 * Run Legal Pulse V2 analysis on 5 real contracts from the database.
 * Usage: node scripts/runV2Analysis.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { runPipeline } = require('../services/legalPulseV2');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = await database.connect();

    // Find contracts with extractedText (best candidates for V2)
    const candidates = await db.collection('contracts').find(
      { extractedText: { $exists: true, $ne: '' } },
      { projection: { name: 1, fileName: 1, userId: 1, extractedText: 1, uploadType: 1, contractType: 1 } }
    ).toArray();

    console.log(`\n=== ${candidates.length} Verträge mit extractedText gefunden ===\n`);

    if (candidates.length === 0) {
      console.log('Keine Verträge mit extractedText gefunden. Abbruch.');
      process.exit(1);
    }

    // Select up to 5 diverse contracts
    // Prefer: different types, different users, different names
    const selected = [];
    const seenNames = new Set();

    for (const c of candidates) {
      const name = (c.name || c.fileName || 'unnamed').toLowerCase();
      // Skip duplicates (e.g. AV_alt.pdf and AV_neu.pdf are similar)
      const nameKey = name.replace(/[_\-\s]*(alt|neu|v\d|copy|kopie|\(\d+\))\s*/gi, '').trim();
      if (seenNames.has(nameKey) && selected.length >= 3) continue;
      seenNames.add(nameKey);

      const textLen = (c.extractedText || '').length;
      if (textLen < 200) continue; // Skip very short texts

      selected.push({
        id: c._id.toString(),
        userId: c.userId?.toString() || c.userId,
        name: c.name || c.fileName || 'unnamed',
        textLength: textLen,
      });

      if (selected.length >= 5) break;
    }

    console.log('Ausgewählte Verträge:');
    selected.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.textLength} Zeichen) — ID: ${c.id}`);
    });
    console.log('');

    // Run V2 pipeline on each contract
    const results = [];
    for (let i = 0; i < selected.length; i++) {
      const contract = selected[i];
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`[${i + 1}/${selected.length}] Analysiere: ${contract.name}`);
      console.log(`${'═'.repeat(60)}`);

      const startTime = Date.now();
      try {
        const result = await runPipeline(
          {
            userId: contract.userId,
            contractId: contract.id,
            requestId: uuidv4(),
            triggeredBy: 'manual',
          },
          (progress, message, data) => {
            // Simple console progress
            const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
            process.stdout.write(`\r  [${bar}] ${progress}% — ${message}`);
            if (data?.complete) process.stdout.write('\n');
          }
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n  ✓ Fertig in ${elapsed}s`);
        console.log(`    Score: ${result.scores.overall}/100`);
        console.log(`    Befunde: ${result.findingsCount}`);
        console.log(`    Klauseln: ${result.clauseCount}`);
        console.log(`    Result-ID: ${result.resultId}`);

        results.push({ ...contract, result, elapsed, success: true });
      } catch (err) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`\n  ✗ Fehler nach ${elapsed}s: ${err.message}`);
        results.push({ ...contract, error: err.message, elapsed, success: false });
      }
    }

    // Summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log('ZUSAMMENFASSUNG');
    console.log(`${'═'.repeat(60)}`);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\nErfolgreich: ${successful.length}/${results.length}`);
    if (failed.length > 0) {
      console.log(`Fehlgeschlagen: ${failed.length}`);
      failed.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    if (successful.length > 0) {
      console.log('\nErgebnisse:');
      console.log('┌─────────────────────────────────────────┬───────┬─────────┬──────────┐');
      console.log('│ Vertrag                                 │ Score │ Befunde │ Zeit (s) │');
      console.log('├─────────────────────────────────────────┼───────┼─────────┼──────────┤');
      for (const r of successful) {
        const name = r.name.substring(0, 39).padEnd(39);
        const score = String(r.result.scores.overall).padStart(5);
        const findings = String(r.result.findingsCount).padStart(7);
        const time = String(r.elapsed).padStart(8);
        console.log(`│ ${name} │${score} │${findings} │${time} │`);
      }
      console.log('└─────────────────────────────────────────┴───────┴─────────┴──────────┘');

      const avgScore = (successful.reduce((s, r) => s + r.result.scores.overall, 0) / successful.length).toFixed(1);
      const totalFindings = successful.reduce((s, r) => s + r.result.findingsCount, 0);
      console.log(`\nDurchschnittlicher Score: ${avgScore}/100`);
      console.log(`Gesamt-Befunde: ${totalFindings}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();

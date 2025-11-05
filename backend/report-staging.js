// 📊 Staging Report - V2 System Quality Analysis
// Analysiert alle Generierungen mit spezifischem runLabel

const { MongoClient } = require('mongodb');
require('dotenv').config();

const DEFAULT_RUN_LABEL = 'staging-2025-11-05';

async function generateStagingReport(runLabel = DEFAULT_RUN_LABEL) {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB verbunden\n');

    const db = client.db();
    const collection = db.collection('contract_generations');

    // Alle Generierungen mit runLabel holen
    const generations = await collection.find({
      'meta.runLabel': runLabel
    }).toArray();

    if (generations.length === 0) {
      console.log(`⚠️ Keine Generierungen mit runLabel="${runLabel}" gefunden!`);
      console.log('💡 Tipp: Generiere Testfälle mit dem runLabel Parameter');
      return;
    }

    console.log(`📋 Gefunden: ${generations.length} Generierungen mit runLabel="${runLabel}"\n`);
    console.log('='.repeat(80));
    console.log('V2 STAGING REPORT - QUALITY ANALYSIS');
    console.log('='.repeat(80) + '\n');

    // Gruppiere nach Contract Type
    const byType = {};
    const allScores = [];
    let totalReviewRequired = 0;
    let totalRetries = 0;

    generations.forEach(gen => {
      const type = gen.contractType;
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          scores: [],
          validatorScores: [],
          llmScores: [],
          reviewRequired: 0,
          retries: [],
          belowThreshold: []
        };
      }

      const finalScore = gen.phase2?.selfCheck?.finalScore || gen.meta?.hybridScore || 0;
      const validatorScore = gen.phase2?.selfCheck?.validatorScore || gen.validator?.score || 0;
      const llmScore = gen.phase2?.selfCheck?.llmScore || 0;
      const retriesUsed = gen.phase2?.selfCheck?.retriesUsed || 0;
      const reviewRequired = gen.phase2?.selfCheck?.reviewRequired || gen.meta?.reviewRequired || false;
      const qualityThreshold = 0.93; // Default

      byType[type].count++;
      byType[type].scores.push(finalScore);
      byType[type].validatorScores.push(validatorScore);
      byType[type].llmScores.push(llmScore);
      byType[type].retries.push(retriesUsed);

      if (reviewRequired) {
        byType[type].reviewRequired++;
        totalReviewRequired++;
      }

      totalRetries += retriesUsed;
      allScores.push(finalScore);

      // Fälle < Threshold sammeln
      if (finalScore < qualityThreshold) {
        byType[type].belowThreshold.push({
          id: gen._id,
          finalScore: finalScore,
          validatorScore: validatorScore,
          llmScore: llmScore,
          retriesUsed: retriesUsed,
          validatorErrors: gen.validator?.errors || [],
          validatorWarnings: gen.validator?.warnings || [],
          selfCheckNotes: gen.phase2?.selfCheck?.notesCount || 0
        });
      }
    });

    // Hilfsfunktionen für Statistik
    const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const min = arr => arr.length > 0 ? Math.min(...arr) : 0;
    const max = arr => arr.length > 0 ? Math.max(...arr) : 0;
    const stddev = arr => {
      if (arr.length === 0) return 0;
      const mean = avg(arr);
      const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
      return Math.sqrt(variance);
    };

    // Pro Vertragstyp Report
    console.log('📊 PER CONTRACT TYPE ANALYSIS\n');

    const contractTypes = Object.keys(byType).sort();
    const tableData = [];

    contractTypes.forEach(type => {
      const data = byType[type];
      const avgFinal = avg(data.scores);
      const avgValidator = avg(data.validatorScores);
      const avgLLM = avg(data.llmScores);
      const avgRetries = avg(data.retries);
      const reviewRate = (data.reviewRequired / data.count * 100);

      tableData.push({
        type,
        count: data.count,
        avgFinal: avgFinal.toFixed(3),
        min: min(data.scores).toFixed(3),
        max: max(data.scores).toFixed(3),
        stddev: stddev(data.scores).toFixed(3),
        avgValidator: avgValidator.toFixed(3),
        avgLLM: avgLLM.toFixed(3),
        avgRetries: avgRetries.toFixed(2),
        reviewRate: reviewRate.toFixed(1) + '%',
        belowThreshold: data.belowThreshold.length
      });

      console.log(`📄 ${type.toUpperCase()}`);
      console.log(`   Count: ${data.count}`);
      console.log(`   Avg Final Score: ${avgFinal.toFixed(3)} (Min: ${min(data.scores).toFixed(3)}, Max: ${max(data.scores).toFixed(3)}, StdDev: ${stddev(data.scores).toFixed(3)})`);
      console.log(`   Avg Validator: ${avgValidator.toFixed(3)} | Avg LLM: ${avgLLM.toFixed(3)}`);
      console.log(`   Avg Retries: ${avgRetries.toFixed(2)}`);
      console.log(`   Review Required: ${data.reviewRequired}/${data.count} (${reviewRate.toFixed(1)}%)`);
      console.log(`   Below Threshold (< 0.93): ${data.belowThreshold.length}`);
      console.log('');
    });

    // Gesamtwerte
    console.log('='.repeat(80));
    console.log('📈 OVERALL STATISTICS\n');

    const overallAvg = avg(allScores);
    const overallMin = min(allScores);
    const overallMax = max(allScores);
    const overallStdDev = stddev(allScores);
    const overallReviewRate = (totalReviewRequired / generations.length * 100);
    const overallAvgRetries = totalRetries / generations.length;

    console.log(`Total Generations: ${generations.length}`);
    console.log(`Avg Final Score: ${overallAvg.toFixed(3)} (Min: ${overallMin.toFixed(3)}, Max: ${overallMax.toFixed(3)}, StdDev: ${overallStdDev.toFixed(3)})`);
    console.log(`Avg Retries: ${overallAvgRetries.toFixed(2)}`);
    console.log(`Review Required: ${totalReviewRequired}/${generations.length} (${overallReviewRate.toFixed(1)}%)`);
    console.log('');

    // GO/NO-GO Kriterien prüfen
    console.log('='.repeat(80));
    console.log('🎯 GO/NO-GO CRITERIA\n');

    const goNoGo = {
      avgScoreAbove094: overallAvg >= 0.94,
      noScoreBelow090: overallMin >= 0.90,
      reviewRateBelow5: overallReviewRate <= 5.0
    };

    console.log(`✓ Avg Final Score ≥ 0.94: ${goNoGo.avgScoreAbove094 ? '✅ PASS' : '❌ FAIL'} (${overallAvg.toFixed(3)})`);
    console.log(`✓ No Score < 0.90: ${goNoGo.noScoreBelow090 ? '✅ PASS' : '❌ FAIL'} (Min: ${overallMin.toFixed(3)})`);
    console.log(`✓ Review Required ≤ 5%: ${goNoGo.reviewRateBelow5 ? '✅ PASS' : '❌ FAIL'} (${overallReviewRate.toFixed(1)}%)`);
    console.log('');

    const overallGo = goNoGo.avgScoreAbove094 && goNoGo.noScoreBelow090 && goNoGo.reviewRateBelow5;

    if (overallGo) {
      console.log('🚀 OVERALL RESULT: ✅ GO FOR PRODUCTION');
    } else {
      console.log('⚠️ OVERALL RESULT: ❌ NO-GO (Improvements needed)');
    }

    console.log('');

    // Fälle < Threshold auflisten (falls vorhanden)
    const allBelowThreshold = contractTypes.flatMap(type =>
      byType[type].belowThreshold.map(item => ({ ...item, type }))
    );

    if (allBelowThreshold.length > 0) {
      console.log('='.repeat(80));
      console.log(`⚠️ CASES BELOW THRESHOLD (< 0.93): ${allBelowThreshold.length} total\n`);

      allBelowThreshold.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.type} (ID: ${item.id})`);
        console.log(`   Final Score: ${item.finalScore.toFixed(3)} (Validator: ${item.validatorScore.toFixed(3)}, LLM: ${item.llmScore.toFixed(3)})`);
        console.log(`   Retries Used: ${item.retriesUsed}`);

        if (item.validatorErrors.length > 0) {
          console.log(`   Validator Errors: ${item.validatorErrors.length}`);
          item.validatorErrors.forEach(err => console.log(`     - ${err}`));
        }

        if (item.validatorWarnings.length > 0) {
          console.log(`   Validator Warnings: ${item.validatorWarnings.length}`);
        }

        if (item.selfCheckNotes > 0) {
          console.log(`   Self-Check Notes: ${item.selfCheckNotes}`);
        }

        console.log('');
      });
    }

    // Zusammenfassung als Tabelle (kompakt)
    console.log('='.repeat(80));
    console.log('📋 SUMMARY TABLE\n');

    console.log('Type'.padEnd(20) +
                'Count'.padEnd(8) +
                'Avg Final'.padEnd(12) +
                'Min/Max'.padEnd(16) +
                'Review%'.padEnd(10) +
                'AvgRetries');
    console.log('-'.repeat(80));

    tableData.forEach(row => {
      console.log(row.type.padEnd(20) +
                  row.count.toString().padEnd(8) +
                  row.avgFinal.padEnd(12) +
                  `${row.min}/${row.max}`.padEnd(16) +
                  row.reviewRate.padEnd(10) +
                  row.avgRetries);
    });

    console.log('-'.repeat(80));
    console.log('TOTAL'.padEnd(20) +
                generations.length.toString().padEnd(8) +
                overallAvg.toFixed(3).padEnd(12) +
                `${overallMin.toFixed(3)}/${overallMax.toFixed(3)}`.padEnd(16) +
                (overallReviewRate.toFixed(1) + '%').padEnd(10) +
                overallAvgRetries.toFixed(2));

    console.log('\n' + '='.repeat(80));
    console.log('🤖 Generated with [Claude Code](https://claude.com/claude-code)');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    throw error;

  } finally {
    await client.close();
    console.log('✅ MongoDB Verbindung geschlossen');
  }
}

// CLI Usage
if (require.main === module) {
  const runLabel = process.argv[2] || DEFAULT_RUN_LABEL;
  console.log(`\n🎯 Analysiere Staging-Runs mit Label: "${runLabel}"\n`);

  generateStagingReport(runLabel)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { generateStagingReport };

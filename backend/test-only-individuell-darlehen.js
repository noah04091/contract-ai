// Direct function test for individuell & darlehen with Repair-Pass
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { generateContractV2 } = require('./routes/generateV2');

const TEST_USER_ID = '507f1f77bcf86cd799439011'; // Dummy test user

const TEST_CASES = [
  {
    contractType: 'individuell',
    variant: 'standard',
    input: {
      parteiA: { name: '[NAME]', address: 'Hauptstraße 1\n10115 Berlin' },
      parteiB: { name: '[NAME]', address: 'Nebenstraße 5\n20095 Hamburg' },
      customRequirements: ''
    }
  },
  {
    contractType: 'individuell',
    variant: 'sonderklausel',
    input: {
      parteiA: { name: '[NAME]', address: 'Projektweg 10\n50667 Köln' },
      parteiB: { name: '[NAME]', address: 'Kreativallee 20\n80331 München' },
      customRequirements: `Die Rechte an allen Arbeitsergebnissen gehen vollständig an Partei A über (Work-for-Hire).
Vertraulichkeitspflicht besteht auch nach Vertragsende für 3 Jahre.
Remote-Arbeit ist erlaubt, Meeting-Teilnahme vor Ort nach Absprache.`
    }
  },
  {
    contractType: 'individuell',
    variant: 'edge_case',
    input: {
      parteiA: { name: '[NAME]', address: 'Teststraße 1\n12345 Stadt' },
      parteiB: { name: '[NAME]', address: 'Minimal 1\n54321 Ort' },
      customRequirements: 'Vertrag ohne Vergütungsregelung (Pro-Bono-Projekt).'
    }
  },
  {
    contractType: 'darlehen',
    variant: 'standard',
    input: {
      parteiA: { name: '[NAME]', address: 'Bankstraße 10\n60311 Frankfurt' },
      parteiB: { name: '[NAME]', address: 'Kreditweg 5\n70173 Stuttgart' },
      customRequirements: `Darlehenssumme: 50.000 EUR
Zinssatz: 3,5 % p.a.
Laufzeit: 5 Jahre, monatliche Raten
Keine Vorfälligkeitsentschädigung bei Sondertilgung`
    }
  },
  {
    contractType: 'darlehen',
    variant: 'sonderklausel',
    input: {
      parteiA: { name: 'Finanzhaus GmbH', address: 'Kapitalstraße 1\n40213 Düsseldorf' },
      parteiB: { name: '[NAME]', address: 'Unternehmerweg 20\n90403 Nürnberg' },
      customRequirements: `Darlehenssumme: 100.000 EUR für Unternehmenserweiterung
Zinssatz: 4,2 % p.a., quartalsweise Zahlungen
Laufzeit: 7 Jahre
Sicherheit: Grundschuld auf Gewerbeimmobilie (separat zu regeln)`
    }
  },
  {
    contractType: 'darlehen',
    variant: 'edge_case',
    input: {
      parteiA: { name: 'Familie Müller', address: 'Familienstraße 5\n30159 Hannover' },
      parteiB: { name: 'Tochter Anna Müller', address: 'Studentenweg 10\n69115 Heidelberg' },
      customRequirements: `Darlehenssumme: 15.000 EUR für Studium
Zinsfrei (0 % Zinsen, familieninterne Unterstützung)
Rückzahlung erst nach Studienabschluss, spätestens ab Juli 2025
Flexible Raten nach Einkommen, keine Verzugszinsen`
    }
  }
];

const RUN_LABEL = 'staging-repair-pass-direct-2025-11-07';

async function runTest(testCase, db) {
  const { contractType, variant, input } = testCase;
  console.log(`\n🚀 Starte Test: ${contractType} (${variant})`);
  const startTime = Date.now();

  try {
    const result = await generateContractV2(
      { ...input, variant }, // input object with variant for metadata
      contractType,
      TEST_USER_ID,
      db,
      RUN_LABEL
    );

    const duration = Date.now() - startTime;
    const { finalScore, validatorScore, llmScore, retriesUsed, reviewRequired, validatorPassed } = result;

    console.log(`   ✅ ${contractType} (${variant}): Score ${finalScore.toFixed(3)} (${duration}ms)`);

    return {
      contractType,
      variant,
      status: 'success',
      finalScore,
      validatorScore,
      llmScore,
      retriesUsed,
      reviewRequired,
      validatorPassed,
      durationMs: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ ${contractType} (${variant}): ${error.message}`);

    return {
      contractType,
      variant,
      status: 'error',
      durationMs: duration,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 REPAIR-PASS TEST RUN - individuell & darlehen (DIRECT FUNCTION CALL)`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📅 Run Label: ${RUN_LABEL}`);
  console.log(`🧪 Total Tests: ${TEST_CASES.length}\n`);

  // Connect to MongoDB
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log(`✅ MongoDB verbunden\n`);

  const results = [];

  // Run tests sequentially to avoid race conditions
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase, db);
    results.push(result);

    // Small pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close MongoDB connection
  await client.close();

  // Zusammenfassung
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ZUSAMMENFASSUNG`);
  console.log(`${'='.repeat(80)}\n`);

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');

  console.log(`Total: ${results.length}`);
  console.log(`✅ Erfolgreich: ${successful.length}`);
  console.log(`❌ Fehlgeschlagen: ${failed.length}\n`);

  if (successful.length > 0) {
    const avgScore = successful.reduce((sum, r) => sum + r.finalScore, 0) / successful.length;
    const minScore = Math.min(...successful.map(r => r.finalScore));
    const maxScore = Math.max(...successful.map(r => r.finalScore));
    const reviewCount = successful.filter(r => r.reviewRequired).length;
    const avgRetries = successful.reduce((sum, r) => sum + r.retriesUsed, 0) / successful.length;

    console.log(`Durchschnittlicher Final Score: ${avgScore.toFixed(3)}`);
    console.log(`Min/Max Score: ${minScore.toFixed(3)} / ${maxScore.toFixed(3)}`);
    console.log(`Review Required: ${reviewCount}/${successful.length} (${(reviewCount / successful.length * 100).toFixed(1)}%)`);
    console.log(`Durchschnittliche Retries: ${avgRetries.toFixed(2)}\n`);

    // GO/NO-GO Check
    console.log(`🎯 GO/NO-GO KRITERIEN (individuell & darlehen):`);
    console.log(`✓ Avg Final Score ≥ 0.94: ${avgScore >= 0.94 ? '✅' : '❌'} (${avgScore.toFixed(3)})`);
    console.log(`✓ Min Score ≥ 0.90: ${minScore >= 0.90 ? '✅' : '❌'} (${minScore.toFixed(3)})`);
    console.log(`✓ Review Required ≤ 5%: ${(reviewCount / successful.length) <= 0.05 ? '✅' : '❌'} (${(reviewCount / successful.length * 100).toFixed(1)}%)`);
    console.log(`✓ Avg Retries ≤ 1.0: ${avgRetries <= 1.0 ? '✅' : '❌'} (${avgRetries.toFixed(2)})\n`);

    // Detaillierte Ergebnisse
    console.log(`📋 DETAILLIERTE ERGEBNISSE:\n`);
    for (const r of successful) {
      const status = r.reviewRequired ? '⚠️' : '✅';
      console.log(`${status} ${r.contractType} (${r.variant}): ${r.finalScore.toFixed(3)} (V:${r.validatorScore.toFixed(2)}, LLM:${r.llmScore.toFixed(2)}, Retries:${r.retriesUsed})`);
    }
  }

  if (failed.length > 0) {
    console.log(`\n❌ FEHLGESCHLAGENE TESTS:\n`);
    for (const r of failed) {
      console.log(`   ${r.contractType} (${r.variant}): ${r.error}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Test-Run abgeschlossen!`);
  console.log(`${'='.repeat(80)}\n`);

  // Print final GO/NO-GO
  if (successful.length === TEST_CASES.length) {
    const avgScore = successful.reduce((sum, r) => sum + r.finalScore, 0) / successful.length;
    const minScore = Math.min(...successful.map(r => r.finalScore));
    const reviewCount = successful.filter(r => r.reviewRequired).length;
    const avgRetries = successful.reduce((sum, r) => sum + r.retriesUsed, 0) / successful.length;

    const allPass = avgScore >= 0.94 && minScore >= 0.90 && (reviewCount / successful.length) <= 0.05 && avgRetries <= 1.0;

    console.log(`\n🚀 **FINAL VERDICT: ${allPass ? '✅ GO FOR PRODUCTION' : '❌ NO-GO - NEEDS FIXES'}**\n`);
  }
}

runAllTests().catch(console.error);

// Smoke-Test nach Server-Neustart (darlehen 0% Zins + individuell Sonderklausel)
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { generateContractV2 } = require('./routes/generateV2');

const TEST_USER_ID = '507f1f77bcf86cd799439011';

const SMOKE_TESTS = [
  {
    name: 'Darlehen Edge Case (0% Zins)',
    contractType: 'darlehen',
    variant: 'edge_case_0pct',
    input: {
      parteiA: { name: 'Familie Müller', address: 'Familienstraße 5\n30159 Hannover' },
      parteiB: { name: 'Tochter Anna Müller', address: 'Studentenweg 10\n69115 Heidelberg' },
      customRequirements: `Darlehenssumme: 15.000 EUR für Studium
Zinsfrei (0 % Zinsen, familieninterne Unterstützung)
Rückzahlung erst nach Studienabschluss, spätestens ab Juli 2025
Flexible Raten nach Einkommen, keine Verzugszinsen`
    }
  },
  {
    name: 'Individuell Sonderklausel',
    contractType: 'individuell',
    variant: 'sonderklausel',
    input: {
      parteiA: { name: '[NAME]', address: 'Projektweg 10\n50667 Köln' },
      parteiB: { name: '[NAME]', address: 'Kreativallee 20\n80331 München' },
      customRequirements: `Die Rechte an allen Arbeitsergebnissen gehen vollständig an Partei A über (Work-for-Hire).
Vertraulichkeitspflicht besteht auch nach Vertragsende für 3 Jahre.
Remote-Arbeit ist erlaubt, Meeting-Teilnahme vor Ort nach Absprache.`
    }
  }
];

const RUN_LABEL = 'smoke-test-after-restart-2025-11-07';

async function runSmokeTest(test, db) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 ${test.name}`);
  console.log(`${'='.repeat(80)}`);

  const startTime = Date.now();

  try {
    const result = await generateContractV2(
      { ...test.input, variant: test.variant },
      test.contractType,
      TEST_USER_ID,
      db,
      RUN_LABEL
    );

    const duration = Date.now() - startTime;
    const { finalScore, validatorScore, llmScore, retriesUsed, reviewRequired, validatorPassed } = result;

    console.log(`\n📊 ERGEBNIS:`);
    console.log(`   Final Score: ${finalScore.toFixed(3)}`);
    console.log(`   Validator Score: ${validatorScore.toFixed(2)}`);
    console.log(`   LLM Score: ${llmScore.toFixed(2)}`);
    console.log(`   Retries: ${retriesUsed}`);
    console.log(`   Review Required: ${reviewRequired ? '⚠️ JA' : '✅ NEIN'}`);
    console.log(`   Validator Passed: ${validatorPassed ? '✅' : '❌'}`);
    console.log(`   Duration: ${duration}ms`);

    // Success criteria
    const qualityOk = finalScore >= 0.93;
    const noReview = !reviewRequired;
    const status = qualityOk && noReview ? '✅ PASS' : '⚠️ CHECK';

    console.log(`\n${status} ${test.name}: ${finalScore.toFixed(3)}`);

    return {
      name: test.name,
      status: status.includes('PASS') ? 'pass' : 'check',
      finalScore,
      validatorScore,
      llmScore,
      retriesUsed,
      reviewRequired,
      durationMs: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ FEHLER: ${error.message}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      name: test.name,
      status: 'error',
      error: error.message,
      durationMs: duration
    };
  }
}

async function runAllSmokeTests() {
  console.log(`\n${'█'.repeat(80)}`);
  console.log(`🚀 SMOKE-TEST NACH SERVER-NEUSTART`);
  console.log(`${'█'.repeat(80)}`);
  console.log(`📅 Run Label: ${RUN_LABEL}`);
  console.log(`🧪 Tests: ${SMOKE_TESTS.length}`);
  console.log(`🎯 Threshold: darlehen=0.93, individuell=0.90\n`);

  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  console.log(`✅ MongoDB verbunden\n`);

  const results = [];

  for (const test of SMOKE_TESTS) {
    const result = await runSmokeTest(test, db);
    results.push(result);

    // Pause zwischen Tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  await client.close();

  // Summary
  console.log(`\n${'█'.repeat(80)}`);
  console.log(`📊 ZUSAMMENFASSUNG`);
  console.log(`${'█'.repeat(80)}\n`);

  const passed = results.filter(r => r.status === 'pass');
  const checks = results.filter(r => r.status === 'check');
  const errors = results.filter(r => r.status === 'error');

  console.log(`Total: ${results.length}`);
  console.log(`✅ Pass: ${passed.length}`);
  console.log(`⚠️ Check: ${checks.length}`);
  console.log(`❌ Error: ${errors.length}\n`);

  if (passed.length > 0) {
    console.log(`✅ PASSED TESTS:`);
    passed.forEach(r => {
      console.log(`   ${r.name}: ${r.finalScore.toFixed(3)} (V:${r.validatorScore.toFixed(2)}, LLM:${r.llmScore.toFixed(2)}, Retries:${r.retriesUsed})`);
    });
    console.log();
  }

  if (checks.length > 0) {
    console.log(`⚠️ NEEDS CHECK:`);
    checks.forEach(r => {
      console.log(`   ${r.name}: ${r.finalScore.toFixed(3)} (Review Required: ${r.reviewRequired})`);
    });
    console.log();
  }

  if (errors.length > 0) {
    console.log(`❌ ERRORS:`);
    errors.forEach(r => {
      console.log(`   ${r.name}: ${r.error}`);
    });
    console.log();
  }

  const allPass = passed.length === results.length;
  console.log(`${'█'.repeat(80)}`);
  console.log(allPass ? `🎉 ALLE SMOKE-TESTS BESTANDEN!` : `⚠️ EINIGE TESTS BENÖTIGEN ÜBERPRÜFUNG`);
  console.log(`${'█'.repeat(80)}\n`);
}

runAllSmokeTests().catch(console.error);

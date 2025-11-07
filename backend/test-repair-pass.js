// Test nur individuell & darlehen mit aktiviertem Repair-Pass
require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');

const TEST_CASES = {
  individuell: {
    standard: {
      parteiA: { name: '[NAME]', address: 'Hauptstraße 1\n10115 Berlin' },
      parteiB: { name: '[NAME]', address: 'Nebenstraße 5\n20095 Hamburg' },
      customRequirements: []
    },
    sonderklausel: {
      parteiA: { name: '[NAME]', address: 'Projektweg 10\n50667 Köln' },
      parteiB: { name: '[NAME]', address: 'Kreativallee 20\n80331 München' },
      customRequirements: [
        'Die Rechte an allen Arbeitsergebnissen gehen vollständig an Partei A über (Work-for-Hire).',
        'Vertraulichkeitspflicht besteht auch nach Vertragsende für 3 Jahre.',
        'Remote-Arbeit ist erlaubt, Meeting-Teilnahme vor Ort nach Absprache.'
      ]
    },
    edge_case: {
      parteiA: { name: '[NAME]', address: 'Teststraße 1\n12345 Stadt' },
      parteiB: { name: '[NAME]', address: 'Minimal 1\n54321 Ort' },
      customRequirements: ['Vertrag ohne Vergütungsregelung (Pro-Bono-Projekt).']
    }
  },
  darlehen: {
    standard: {
      parteiA: { name: '[NAME]', address: 'Bankstraße 10\n60311 Frankfurt' },
      parteiB: { name: '[NAME]', address: 'Kreditweg 5\n70173 Stuttgart' },
      customRequirements: [
        'Darlehenssumme: 50.000 EUR',
        'Zinssatz: 3,5 % p.a.',
        'Laufzeit: 5 Jahre, monatliche Raten',
        'Keine Vorfälligkeitsentschädigung bei Sondertilgung'
      ]
    },
    sonderklausel: {
      parteiA: { name: 'Finanzhaus GmbH', address: 'Kapitalstraße 1\n40213 Düsseldorf' },
      parteiB: { name: '[NAME]', address: 'Unternehmerweg 20\n90403 Nürnberg' },
      customRequirements: [
        'Darlehenssumme: 100.000 EUR für Unternehmenserweiterung',
        'Zinssatz: 4,2 % p.a., quartalsweise Zahlungen',
        'Laufzeit: 7 Jahre',
        'Sicherheit: Grundschuld auf Gewerbeimmobilie (separat zu regeln)'
      ]
    },
    edge_case: {
      parteiA: { name: 'Familie Müller', address: 'Familienstraße 5\n30159 Hannover' },
      parteiB: { name: 'Tochter Anna Müller', address: 'Studentenweg 10\n69115 Heidelberg' },
      customRequirements: [
        'Darlehenssumme: 15.000 EUR für Studium',
        'Zinsfrei (0 % Zinsen, familieninterne Unterstützung)',
        'Rückzahlung erst nach Studienabschluss, spätestens ab Juli 2025',
        'Flexible Raten nach Einkommen, keine Verzugszinsen'
      ]
    }
  }
};

const API_URL = 'http://localhost:5000/api/v2/generate';
const RUN_LABEL = 'staging-repair-pass-2025-11-07';
const CONCURRENCY = 2;
const TIMEOUT_MS = 120000; // 2 Minuten (wegen Repair-Pass-Latenz)

async function runTest(contractType, variant, input) {
  console.log(`\n🚀 Starte Test: ${contractType} (${variant})`);
  const startTime = Date.now();

  try {
    const response = await axios.post(
      API_URL,
      { ...input, contractType, runLabel: RUN_LABEL },
      { timeout: TIMEOUT_MS }
    );

    const duration = Date.now() - startTime;
    const { finalScore, validatorScore, llmScore, retriesUsed, reviewRequired, validatorPassed } = response.data;

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
      status: error.code === 'ECONNABORTED' ? 'timeout' : 'error',
      durationMs: duration,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 REPAIR-PASS TEST RUN - individuell & darlehen`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📅 Run Label: ${RUN_LABEL}`);
  console.log(`⚡ Concurrency: ${CONCURRENCY}`);
  console.log(`⏱️  Timeout: ${TIMEOUT_MS}ms\n`);

  const results = [];

  // Alle Tests vorbereiten
  const testQueue = [];
  for (const [contractType, variants] of Object.entries(TEST_CASES)) {
    for (const [variant, input] of Object.entries(variants)) {
      testQueue.push({ contractType, variant, input });
    }
  }

  // Tests in Batches ausführen
  for (let i = 0; i < testQueue.length; i += CONCURRENCY) {
    const batch = testQueue.slice(i, i + CONCURRENCY);
    console.log(`\n📦 Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(testQueue.length / CONCURRENCY)} (${batch.length} tests):`);

    const batchResults = await Promise.all(
      batch.map(({ contractType, variant, input }) => runTest(contractType, variant, input))
    );

    results.push(...batchResults);

    // Pause zwischen Batches
    if (i + CONCURRENCY < testQueue.length) {
      console.log('   ⏸️  Pause 2000ms...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

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
}

runAllTests().catch(console.error);

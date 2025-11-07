const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMissingTypes() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const collection = db.collection('contract_generations');

  // Prüfe individuell
  const individuell = await collection.find({
    'meta.runLabel': 'staging-repair-pass-v2-2025-11-07',
    contractType: 'individuell'
  }).toArray();

  // Prüfe darlehen
  const darlehen = await collection.find({
    'meta.runLabel': 'staging-repair-pass-v2-2025-11-07',
    contractType: 'darlehen'
  }).toArray();

  console.log('=== INDIVIDUELL (3 Tests erwartet) ===');
  console.log(`Gefunden: ${individuell.length} Tests\n`);

  if (individuell.length > 0) {
    individuell.forEach(doc => {
      const variant = doc.meta?.variant || 'unknown';
      const finalScore = doc.phase2?.selfCheck?.finalScore || 0;
      const validatorScore = doc.phase2?.selfCheck?.validatorScore || 0;
      const llmScore = doc.phase2?.selfCheck?.llmScore || 0;
      const retriesUsed = doc.phase2?.selfCheck?.retriesUsed || 0;
      const reviewRequired = doc.phase2?.selfCheck?.reviewRequired || false;

      const status = reviewRequired ? '⚠️' : '✅';
      console.log(`  ${status} ${variant}: ${finalScore.toFixed(3)} (V:${validatorScore.toFixed(2)}, LLM:${llmScore.toFixed(2)}, Retries:${retriesUsed})`);
    });
  } else {
    console.log('  ❌ KEINE TESTS GEFUNDEN!');
  }

  console.log('\n=== DARLEHEN (3 Tests erwartet) ===');
  console.log(`Gefunden: ${darlehen.length} Tests\n`);

  if (darlehen.length > 0) {
    darlehen.forEach(doc => {
      const variant = doc.meta?.variant || 'unknown';
      const finalScore = doc.phase2?.selfCheck?.finalScore || 0;
      const validatorScore = doc.phase2?.selfCheck?.validatorScore || 0;
      const llmScore = doc.phase2?.selfCheck?.llmScore || 0;
      const retriesUsed = doc.phase2?.selfCheck?.retriesUsed || 0;
      const reviewRequired = doc.phase2?.selfCheck?.reviewRequired || false;

      const status = reviewRequired ? '⚠️' : '✅';
      console.log(`  ${status} ${variant}: ${finalScore.toFixed(3)} (V:${validatorScore.toFixed(2)}, LLM:${llmScore.toFixed(2)}, Retries:${retriesUsed})`);
    });
  } else {
    console.log('  ❌ KEINE TESTS GEFUNDEN!');
  }

  // Berechne Durchschnitte
  if (individuell.length > 0) {
    const avgScore = individuell.reduce((sum, d) => sum + (d.phase2?.selfCheck?.finalScore || 0), 0) / individuell.length;
    const minScore = Math.min(...individuell.map(d => d.phase2?.selfCheck?.finalScore || 0));
    console.log(`\n📊 individuell: Avg ${avgScore.toFixed(3)}, Min ${minScore.toFixed(3)}`);
  }

  if (darlehen.length > 0) {
    const avgScore = darlehen.reduce((sum, d) => sum + (d.phase2?.selfCheck?.finalScore || 0), 0) / darlehen.length;
    const minScore = Math.min(...darlehen.map(d => d.phase2?.selfCheck?.finalScore || 0));
    console.log(`📊 darlehen: Avg ${avgScore.toFixed(3)}, Min ${minScore.toFixed(3)}`);
  }

  await client.close();
}

checkMissingTypes().catch(console.error);

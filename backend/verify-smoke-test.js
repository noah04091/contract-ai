const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function verify() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const collection = db.collection('contract_generations');

  const ids = [
    '690e12b0c8db175897c87807', // Darlehen 0% Zins
    '690e12d1c8db175897c87809'  // Individuell Sonderklausel
  ];

  const docs = await collection.find({
    _id: { $in: ids.map(id => new ObjectId(id)) }
  }).toArray();

  console.log('🎉 SMOKE-TEST VERIFICATION - MONGODB RESULTS\n');
  console.log('═'.repeat(80) + '\n');

  docs.forEach(doc => {
    const score = doc.phase2?.selfCheck?.finalScore;
    const vScore = doc.phase2?.selfCheck?.validatorScore;
    const llmScore = doc.phase2?.selfCheck?.llmScore;
    const retries = doc.phase2?.selfCheck?.retriesUsed || 0;
    const review = doc.phase2?.selfCheck?.reviewRequired || false;
    const passed = doc.phase2?.selfCheck?.validatorPassed || false;

    console.log('Test:', doc.contractType, '(', doc.meta?.variant || 'unknown', ')');
    console.log('  Final Score:', score.toFixed(3), passed ? '✅' : '❌');
    console.log('  Validator:', vScore.toFixed(2));
    console.log('  LLM:', llmScore.toFixed(2));
    console.log('  Retries:', retries);
    console.log('  Review Required:', review ? '⚠️ JA' : '✅ NEIN');
    console.log('  Threshold:', doc.contractType === 'darlehen' ? '0.93' : '0.90');

    const thresholdPass = doc.contractType === 'darlehen' ? score >= 0.93 : score >= 0.90;
    console.log('  Status:', thresholdPass && !review ? '✅ PASS' : '⚠️ FAIL');
    console.log();
  });

  const allPerfect = docs.every(d =>
    d.phase2?.selfCheck?.finalScore >= 0.93 &&
    !d.phase2?.selfCheck?.reviewRequired
  );

  console.log('═'.repeat(80));
  console.log(allPerfect ? '🎉 ALLE SMOKE-TESTS BESTANDEN!' : '⚠️ EINIGE TESTS FEHLGESCHLAGEN');
  console.log('═'.repeat(80) + '\n');

  await client.close();
}

verify().catch(console.error);

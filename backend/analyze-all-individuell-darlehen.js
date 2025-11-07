const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyze() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const collection = db.collection('contract_generations');

  // Get ALL individuell and darlehen from this run
  const all = await collection.find({
    'meta.runLabel': 'staging-final-fixes-2025-11-07',
    contractType: { $in: ['individuell', 'darlehen'] }
  }).toArray();

  console.log(`Found ${all.length} individuell/darlehen cases:\n`);

  for (const doc of all) {
    console.log('=====================================');
    console.log('Contract Type:', doc.contractType);
    console.log('Variant:', doc.meta?.variant);
    console.log('Final Score:', doc.phase2?.selfCheck?.finalScore);
    console.log('Validator Score:', doc.phase2?.selfCheck?.validatorScore);
    console.log('LLM Score:', doc.phase2?.selfCheck?.llmScore);
    console.log('Validator Passed:', doc.phase2?.selfCheck?.validatorPassed);
    console.log('Retries:', doc.phase2?.selfCheck?.retriesUsed);
    console.log('Review Required:', doc.phase2?.selfCheck?.reviewRequired);

    // Check if validator details exist
    if (doc.phase2?.selfCheck?.validatorScore < 1) {
      console.log('\n🔍 Validator Details:');
      console.log('Missing Clauses:', doc.phase2?.validator?.missingClauses || 'not recorded');
      console.log('Errors:', doc.phase2?.validator?.errors || 'not recorded');
    }
  }

  await client.close();
}

analyze().catch(console.error);

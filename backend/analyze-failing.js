const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyze() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const collection = db.collection('contract_generations');

  // Get failing cases
  const failing = await collection.find({
    'meta.runLabel': 'staging-final-fixes-2025-11-07',
    contractType: { $in: ['individuell', 'darlehen'] },
    $or: [
      { 'phase2.selfCheck.validatorScore': { $lt: 0.90 } },
      { 'phase2.selfCheck.finalScore': { $lt: 0.90 } }
    ]
  }).toArray();

  console.log(`Found ${failing.length} failing cases:\n`);

  for (const doc of failing) {
    console.log('=====================================');
    console.log('Contract Type:', doc.contractType);
    console.log('Variant:', doc.meta?.variant);
    console.log('Final Score:', doc.phase2?.selfCheck?.finalScore);
    console.log('Validator Score:', doc.phase2?.selfCheck?.validatorScore);
    console.log('LLM Score:', doc.phase2?.selfCheck?.llmScore);
    console.log('Retries:', doc.phase2?.selfCheck?.retriesUsed);
    console.log('\nValidator Errors:');
    console.log(JSON.stringify(doc.validator?.errors || 'none', null, 2));
    console.log('\nValidator Warnings:');
    console.log(JSON.stringify(doc.validator?.warnings || 'none', null, 2));
    console.log('\nSelf-Check Notes:', doc.phase2?.selfCheck?.notesCount || 0);
    console.log('\nCustom Requirements:', (doc.phase1?.input?.customRequirements || '').substring(0, 300));
    console.log('\n');
  }

  await client.close();
}

analyze().catch(console.error);

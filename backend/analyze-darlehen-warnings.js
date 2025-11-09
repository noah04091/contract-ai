const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyze() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const collection = db.collection('contract_generations');

  const darlehen = await collection.find({
    'meta.runLabel': 'staging-repair-pass-direct-2025-11-07',
    contractType: 'darlehen',
    'phase2.selfCheck.validatorScore': { $lt: 1.0 }
  }).toArray();

  console.log(`\n=== DARLEHEN MIT VALIDATOR-WARNUNGEN ===\n`);

  for (const doc of darlehen) {
    console.log('─'.repeat(80));
    console.log('Variant:', doc.meta?.variant || 'unknown');
    console.log('Final Score:', doc.phase2?.selfCheck?.finalScore);
    console.log('Validator Score:', doc.phase2?.selfCheck?.validatorScore);
    console.log('Retries:', doc.phase2?.selfCheck?.retriesUsed);
    console.log('\nValidator Warnings:');
    console.log(JSON.stringify(doc.validator?.warnings || [], null, 2));
    console.log('\nValidator Checks:');
    if (doc.validator?.checks) {
      Object.entries(doc.validator.checks).forEach(([check, result]) => {
        if (!result.passed) {
          console.log(`  ❌ ${check}: ${result.message || result.severity}`);
        }
      });
    }
    console.log();
  }

  await client.close();
}

analyze().catch(console.error);

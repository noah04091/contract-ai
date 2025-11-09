const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkRecent() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const collection = db.collection('contract_generations');

  // Get all unique runLabels from recent tests
  const runLabels = await collection.distinct('meta.runLabel');

  console.log('All recent runLabels:');
  console.log(runLabels.filter(l => l && l.includes('2025-11-07')));
  console.log();

  // Check all contract types for the specific runLabel
  const allFromRun = await collection.find({
    'meta.runLabel': 'staging-repair-pass-v2-2025-11-07'
  }).toArray();

  console.log(`\nTotal tests with "staging-repair-pass-v2-2025-11-07": ${allFromRun.length}`);

  if (allFromRun.length > 0) {
    const types = {};
    allFromRun.forEach(doc => {
      const type = doc.contractType || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });

    console.log('\nBreakdown by contract type:');
    Object.entries(types).sort().forEach(([type, count]) => {
      console.log(`  ${type}: ${count} tests`);
    });
  }

  // Check if individuell and darlehen exist with ANY runLabel from today
  const individuellAny = await collection.find({
    contractType: 'individuell',
    'meta.runLabel': { $regex: '2025-11-07' }
  }).toArray();

  const darlehenAny = await collection.find({
    contractType: 'darlehen',
    'meta.runLabel': { $regex: '2025-11-07' }
  }).toArray();

  console.log(`\nindividuell tests from today (any label): ${individuellAny.length}`);
  if (individuellAny.length > 0) {
    individuellAny.forEach(doc => {
      console.log(`  - ${doc.meta?.variant} (label: ${doc.meta?.runLabel}), score: ${doc.phase2?.selfCheck?.finalScore}`);
    });
  }

  console.log(`\ndarlehen tests from today (any label): ${darlehenAny.length}`);
  if (darlehenAny.length > 0) {
    darlehenAny.forEach(doc => {
      console.log(`  - ${doc.meta?.variant} (label: ${doc.meta?.runLabel}), score: ${doc.phase2?.selfCheck?.finalScore}`);
    });
  }

  await client.close();
}

checkRecent().catch(console.error);

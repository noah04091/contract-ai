#!/usr/bin/env node
// Fix aiGenerated status for contracts that were analyzed but marked as heuristic
//
// The issue: Contracts with analyzed=true or valid riskScore should have aiGenerated=true
// but some have aiGenerated=false due to:
// 1. Background analysis failing after initial sync
// 2. Fallback analysis being used when PDF extraction failed
//
// This script fixes the inconsistency by setting aiGenerated=true for contracts
// that have evidence of real analysis (analyzed=true, valid riskScore, etc.)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function fixAiGeneratedStatus() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');
    const contractsCollection = db.collection('contracts');

    console.log('=== FIX AI-GENERATED STATUS ===\n');

    // Find contracts with inconsistent status:
    // - Has riskScore (means some analysis happened)
    // - But aiGenerated is false
    // - And either analyzed=true OR has topRisks with real data
    const inconsistentContracts = await contractsCollection.find({
      $and: [
        { 'legalPulse.riskScore': { $exists: true, $ne: null } },
        { 'legalPulse.aiGenerated': false },
        {
          $or: [
            { analyzed: true },
            { 'legalPulse.topRisks.0': { $exists: true } }, // Has at least one risk
            { 'legalPulse.recommendations.0': { $exists: true } } // Has at least one recommendation
          ]
        }
      ]
    }).toArray();

    console.log(`Found ${inconsistentContracts.length} contracts to fix\n`);

    if (inconsistentContracts.length === 0) {
      console.log('✅ No inconsistencies found!');
      return { fixed: 0 };
    }

    let fixedCount = 0;

    for (const contract of inconsistentContracts) {
      const name = (contract.name || contract.fileName || 'Unknown').substring(0, 50);

      // Determine if this was a real AI analysis or fallback
      const hasRealAnalysisData =
        (contract.legalPulse?.topRisks?.length > 0 &&
         contract.legalPulse.topRisks.some(r => r.description && r.description.length > 50)) ||
        (contract.legalPulse?.recommendations?.length > 0 &&
         contract.legalPulse.recommendations.some(r => r.description && r.description.length > 50)) ||
        contract.analyzed === true;

      if (hasRealAnalysisData) {
        // This was a real analysis, fix the status
        await contractsCollection.updateOne(
          { _id: contract._id },
          {
            $set: {
              'legalPulse.aiGenerated': true,
              'legalPulse.status': 'completed'
            }
          }
        );
        console.log(`✅ Fixed: ${name}`);
        console.log(`   analyzed=${contract.analyzed}, riskScore=${contract.legalPulse?.riskScore}`);
        console.log(`   topRisks=${contract.legalPulse?.topRisks?.length || 0}, recommendations=${contract.legalPulse?.recommendations?.length || 0}`);
        console.log('');
        fixedCount++;
      } else {
        // This was truly a fallback analysis, leave as is but update status
        await contractsCollection.updateOne(
          { _id: contract._id },
          {
            $set: {
              'legalPulse.status': 'fallback'
            }
          }
        );
        console.log(`⚠️ Marked as fallback: ${name}`);
        console.log(`   (No detailed analysis data found)`);
        console.log('');
      }
    }

    console.log('=== SUMMARY ===');
    console.log(`Fixed: ${fixedCount} contracts`);
    console.log(`Total processed: ${inconsistentContracts.length}`);

    return { fixed: fixedCount, total: inconsistentContracts.length };

  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  fixAiGeneratedStatus()
    .then(result => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = fixAiGeneratedStatus;

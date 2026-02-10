#!/usr/bin/env node
// Analyze contract data inconsistencies for Legal Pulse status

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

async function analyzeData() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');

    // Get test user
    const user = await db.collection('users').findOne({ email: '2501test@flirt.ms' });

    // Get all contracts for test user
    const contracts = await db.collection('contracts').find({ userId: user._id }).toArray();

    console.log('=== ANALYSE DER VERTRÄGE ===');
    console.log('Total contracts:', contracts.length);
    console.log('');

    let aiTrue = 0, aiFalse = 0, aiUndefined = 0;
    let analyzed = 0, notAnalyzed = 0;
    const inconsistencies = [];

    for (const c of contracts) {
      const lp = c.legalPulse || {};
      const aiGen = lp.aiGenerated;
      const hasScore = lp.riskScore != null;
      const hasAnalysis = c.analyzed === true;

      if (aiGen === true) aiTrue++;
      else if (aiGen === false) aiFalse++;
      else aiUndefined++;

      if (hasAnalysis) analyzed++;
      else notAnalyzed++;

      // Identify inconsistencies:
      // 1. Contract is analyzed (c.analyzed=true) but aiGenerated is not true
      // 2. Contract has riskScore but aiGenerated is not true
      if ((hasAnalysis || hasScore) && aiGen !== true) {
        inconsistencies.push({
          id: c._id.toString(),
          name: (c.name || c.fileName || 'Unbekannt').substring(0, 60),
          analyzed: c.analyzed,
          aiGenerated: aiGen,
          riskScore: lp.riskScore,
          status: lp.status,
          lastChecked: lp.lastChecked,
          analysisDate: lp.analysisDate
        });
      }
    }

    console.log('=== INKONSISTENZEN ===');
    if (inconsistencies.length === 0) {
      console.log('✅ Keine Inkonsistenzen gefunden!');
    } else {
      console.log(`⚠️ ${inconsistencies.length} Verträge mit Inkonsistenzen:\n`);
      for (const inc of inconsistencies) {
        console.log(`📄 ${inc.name}`);
        console.log(`   ID: ${inc.id}`);
        console.log(`   analyzed: ${inc.analyzed}`);
        console.log(`   aiGenerated: ${inc.aiGenerated}`);
        console.log(`   riskScore: ${inc.riskScore}`);
        console.log(`   status: ${inc.status}`);
        console.log(`   lastChecked: ${inc.lastChecked}`);
        console.log('');
      }
    }

    console.log('=== ZUSAMMENFASSUNG ===');
    console.log('aiGenerated=true:', aiTrue);
    console.log('aiGenerated=false:', aiFalse);
    console.log('aiGenerated=undefined:', aiUndefined);
    console.log('');
    console.log('analyzed=true:', analyzed);
    console.log('analyzed=false/undefined:', notAnalyzed);

    return inconsistencies;

  } finally {
    await client.close();
  }
}

analyzeData();

require('dotenv').config();
const database = require('../config/database');

(async () => {
  const db = await database.connect();

  // 1. Existing alerts
  const alerts = await db.collection('pulse_v2_legal_alerts').find({}).sort({ createdAt: -1 }).limit(20).toArray();
  console.log('=== BESTEHENDE ALERTS:', alerts.length, '===');

  for (const a of alerts) {
    console.log('\n' + '─'.repeat(70));
    console.log('Vertrag:', a.contractName);
    console.log('Gesetz:', (a.lawTitle || '').substring(0, 100));
    console.log('Severity:', a.severity, '| Direction:', a.impactDirection || '(nicht gesetzt)');
    console.log('Status:', a.status, '| Created:', a.createdAt?.toISOString?.() || 'unknown');
    console.log('plainSummary:', (a.plainSummary || '(leer)').substring(0, 250));
    console.log('businessImpact:', (a.businessImpact || '(leer)').substring(0, 250));
    console.log('recommendation:', (a.recommendation || '(leer)').substring(0, 250));
    if (a.clauseImpacts && a.clauseImpacts.length > 0) {
      console.log('clauseImpacts:');
      for (const ci of a.clauseImpacts.slice(0, 3)) {
        console.log('  -', ci.clauseTitle, '→', (ci.impact || '').substring(0, 120));
      }
    }
  }

  // 2. Laws status
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const unprocessed = await db.collection('laws').countDocuments({
    pulseV2Processed: { $ne: true },
    updatedAt: { $gte: weekAgo },
  });
  const totalRecent = await db.collection('laws').countDocuments({
    updatedAt: { $gte: weekAgo },
  });
  const totalAll = await db.collection('laws').countDocuments({});

  console.log('\n=== LAWS ===');
  console.log('Gesamt:', totalAll);
  console.log('Letzte 7 Tage:', totalRecent);
  console.log('Unprocessed (7d):', unprocessed);

  // 3. V2 analyzed contracts
  const v2Contracts = await db.collection('legal_pulse_v2_results').distinct('contractId', { status: 'completed' });
  console.log('\n=== V2 ANALYSIERTE VERTRÄGE:', v2Contracts.length, '===');

  // 4. Radar run history
  const runs = await db.collection('radar_run_history').find({}).sort({ runAt: -1 }).limit(5).toArray();
  console.log('\n=== RADAR RUNS (letzte 5) ===');
  for (const r of runs) {
    console.log(`  ${r.runAt?.toISOString?.() || '?'} | Laws: ${r.lawChanges} | Matches: ${r.contractsMatched} | Alerts: ${r.alertsSent} (${r.positiveAlerts || 0} pos, ${r.negativeAlerts || 0} neg) | ${r.durationMs}ms`);
  }

  // 5. Sample unprocessed laws (what would the Radar scan next?)
  const sampleLaws = await db.collection('laws').find({
    pulseV2Processed: { $ne: true },
  }).sort({ updatedAt: -1 }).limit(5).toArray();

  console.log('\n=== NÄCHSTE UNPROCESSED LAWS (5 Beispiele) ===');
  for (const l of sampleLaws) {
    const areas = l.areas && l.areas.length > 1 ? l.areas.join(', ') : l.area;
    console.log(`  [${l.lawStatus || '?'}] ${areas} | ${(l.title || '').substring(0, 100)}`);
  }

  process.exit(0);
})();

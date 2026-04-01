/**
 * Run the Radar in SAFE test mode.
 * - Intercepts ALL side effects (emails, alert writes, law marking, run history)
 * - Shows what WOULD happen without writing to DB
 * Usage: node scripts/runRadarTest.js [userId]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const database = require('../config/database');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = await database.connect();

  // Find user with V2 results
  const LegalPulseV2Result = require('../models/LegalPulseV2Result');
  const userId = process.argv[2] || (await LegalPulseV2Result.findOne({ status: 'completed' }).lean()).userId;

  // Check if this is a real user
  const { ObjectId } = require('mongodb');
  let user;
  try {
    user = await db.collection('users').findOne(
      { $or: [{ _id: userId }, { _id: ObjectId.createFromHexString(userId.toString()) }] },
      { projection: { email: 1, name: 1, role: 1 } }
    );
  } catch (e) { /* skip */ }

  console.log(`User: ${user?.email || '?'} (${user?.name || '?'}) [${user?.role || 'user'}]`);

  // Show user's contracts
  const userResults = await LegalPulseV2Result.find({ userId, status: 'completed' }).lean();
  const seen = new Set();
  for (const r of userResults) {
    if (!seen.has(r.contractId)) {
      seen.add(r.contractId);
      console.log(`  Contract: ${r.document?.contractType || 'unknown'} — ${r.context?.contractName || r.contractId}`);
    }
  }

  // ══════════════════════════════════════════════════
  // INTERCEPT ALL SIDE EFFECTS
  // ══════════════════════════════════════════════════

  // 1. Intercept emails
  const emailRetryService = require('../services/emailRetryService');
  const originalQueueEmail = emailRetryService.queueEmail;
  const interceptedEmails = [];
  emailRetryService.queueEmail = async (_db, emailData) => {
    interceptedEmails.push({ to: emailData.to, subject: emailData.subject });
    console.log(`[DryRun] Email intercepted: ${emailData.to} | ${emailData.subject}`);
    return { intercepted: true };
  };

  // 2. Remember which laws are unprocessed BEFORE the run (to restore after)
  const lawsBefore = await db.collection('laws').find(
    { pulseV2Processed: { $ne: true } },
    { projection: { _id: 1 } }
  ).limit(300).toArray();
  const unprocessedIds = new Set(lawsBefore.map(l => l._id.toString()));

  // Run radar
  const { runPulseV2Radar } = require('../jobs/pulseV2Radar');
  console.log('\n--- RADAR START ---\n');

  let result;
  try {
    result = await runPulseV2Radar(db, { userId });
    console.log('\n--- RADAR RESULT ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Radar error:', err.message);
    console.error(err.stack);
  }

  // ══════════════════════════════════════════════════
  // SHOW RESULTS, THEN CLEAN UP
  // ══════════════════════════════════════════════════

  // Show alerts that were created
  const alerts = await db.collection('pulse_v2_legal_alerts')
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  // Separate new alerts (created in this run) from pre-existing
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const newAlerts = alerts.filter(a => a.createdAt >= fiveMinAgo);
  const oldAlerts = alerts.filter(a => a.createdAt < fiveMinAgo);

  if (newAlerts.length > 0) {
    console.log(`\n--- NEW ALERTS FROM THIS RUN (${newAlerts.length}) ---`);
    for (const a of newAlerts) {
      const dir = a.impactDirection === 'positive' ? '🟢' : a.impactDirection === 'neutral' ? '🔵' : '🔴';
      console.log(`\n${dir} ${a.severity?.toUpperCase() || '?'} | ${a.contractName}`);
      console.log(`  Law: ${(a.lawTitle || '').substring(0, 100)}`);
      console.log(`  Direction: ${a.impactDirection || 'negative'}`);
      console.log(`  Summary: ${(a.plainSummary || a.impactSummary || '').substring(0, 250)}`);
      if (a.businessImpact) console.log(`  Business Impact: ${a.businessImpact.substring(0, 250)}`);
      if (a.recommendation) console.log(`  Recommendation: ${a.recommendation.substring(0, 250)}`);
      if (a.clauseImpacts?.length > 0) {
        console.log(`  Clause impacts (${a.clauseImpacts.length}):`);
        for (const ci of a.clauseImpacts.slice(0, 3)) {
          console.log(`    → ${ci.clauseTitle}: ${(ci.impact || '').substring(0, 120)}`);
        }
      }
    }
  } else {
    console.log('\n--- NO NEW ALERTS FROM THIS RUN ---');
  }

  if (oldAlerts.length > 0) {
    console.log(`\n--- PRE-EXISTING ALERTS (${oldAlerts.length}) ---`);
    for (const a of oldAlerts) {
      const dir = a.impactDirection === 'positive' ? '🟢' : '🔴';
      console.log(`  ${dir} ${a.severity} | ${a.contractName} | ${(a.lawTitle || '').substring(0, 80)}`);
    }
  }

  console.log(`\nIntercepted emails: ${interceptedEmails.length}`);
  for (const e of interceptedEmails) {
    console.log(`  → ${e.to}: ${e.subject}`);
  }

  // ══════════════════════════════════════════════════
  // CLEANUP — restore DB state
  // ══════════════════════════════════════════════════
  console.log('\n--- CLEANUP ---');

  // 1. Delete alerts created in this run
  if (newAlerts.length > 0) {
    const newAlertIds = newAlerts.map(a => a._id);
    const delResult = await db.collection('pulse_v2_legal_alerts').deleteMany({ _id: { $in: newAlertIds } });
    console.log(`  Deleted ${delResult.deletedCount} test alerts`);
  }

  // 2. Reset laws that were marked as processed during this run
  const nowProcessed = await db.collection('laws').find(
    { pulseV2Processed: true, _id: { $in: lawsBefore.map(l => l._id) } },
    { projection: { _id: 1 } }
  ).toArray();
  const toReset = nowProcessed.filter(l => unprocessedIds.has(l._id.toString()));
  if (toReset.length > 0) {
    const resetResult = await db.collection('laws').updateMany(
      { _id: { $in: toReset.map(l => l._id) } },
      { $unset: { pulseV2Processed: '', pulseV2ProcessedAt: '' } }
    );
    console.log(`  Reset ${resetResult.modifiedCount} laws back to unprocessed`);
  }

  // 3. Delete test run history
  const runDelResult = await db.collection('radar_run_history').deleteMany({
    runAt: { $gte: fiveMinAgo },
    scoped: true
  });
  if (runDelResult.deletedCount > 0) {
    console.log(`  Deleted ${runDelResult.deletedCount} test run history entries`);
  }

  // Restore email
  emailRetryService.queueEmail = originalQueueEmail;

  console.log('  ✅ DB state restored — no side effects remain');
  process.exit(0);
})();

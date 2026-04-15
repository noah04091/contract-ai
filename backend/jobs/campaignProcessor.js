// 📁 backend/jobs/campaignProcessor.js
// Cron-Job: Verarbeitet 'queued'/'sending' Email-Campaigns.
// Wird vom server.js cron.schedule() aufgerufen (jede Minute).
//
// SAFETY:
// - Ignoriert Campaigns mit status != 'queued'/'sending' (z.B. draft, completed, cancelled)
// - Kill-Switch: env CAMPAIGN_CRON_ENABLED=false deaktiviert den Cron komplett
// - Pro Zyklus max. BATCH_SIZE Sends pro Campaign

const database = require('../config/database');
const { processNextBatch } = require('../services/campaignService');

async function runCampaignProcessor() {
  // Kill-Switch
  if (process.env.CAMPAIGN_CRON_ENABLED === 'false') {
    console.log('[CampaignCron] disabled via CAMPAIGN_CRON_ENABLED=false');
    return { skipped: true, reason: 'disabled' };
  }

  try {
    const db = await database.connect();
    const collection = db.collection('email_campaigns');

    const active = await collection
      .find({ status: { $in: ['queued', 'sending'] } })
      .project({ _id: 1, status: 1, name: 1, stats: 1 })
      .limit(10)
      .toArray();

    if (active.length === 0) {
      return { processed: 0 };
    }

    console.log(`[CampaignCron] ${active.length} aktive Campaign(s) gefunden`);

    const results = [];
    for (const campaign of active) {
      try {
        const result = await processNextBatch(String(campaign._id));
        results.push({ campaignId: String(campaign._id), name: campaign.name, ...result });
      } catch (err) {
        console.error(`[CampaignCron] Fehler bei Campaign ${campaign._id}:`, err && err.message);
        results.push({
          campaignId: String(campaign._id),
          name: campaign.name,
          error: err && err.message
        });
      }
    }

    return { processed: active.length, results };
  } catch (err) {
    console.error('[CampaignCron] Hauptfehler:', err && err.message);
    return { error: err && err.message };
  }
}

module.exports = { runCampaignProcessor };

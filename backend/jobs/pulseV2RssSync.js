/**
 * Legal Pulse V2 RSS Sync — Daily Law Source Synchronization
 *
 * Syncs RSS feeds (22 German legal sources) into the `laws` collection.
 * This is the DATA SOURCE for pulseV2Radar — without this, the Radar has nothing to scan.
 *
 * Flow:
 *   1. Fetch all enabled RSS feeds via rssService
 *   2. Normalize items for Legal Pulse format
 *   3. Deduplicate and insert/update into `laws` collection
 *
 * Schedule: Daily 03:15 UTC (before Radar at 07:00/19:00)
 * Uses: Native MongoDB driver (shared connection), rssService
 */

const rssService = require("../services/rssService");

/**
 * Main RSS sync entry point.
 * @param {import('mongodb').Db} db - Shared database connection
 */
async function runPulseV2RssSync(db) {
  console.log("[PulseV2RssSync] Starting daily RSS sync...");
  const startTime = Date.now();

  const lawsCol = db.collection("laws");

  // Ensure index for efficient upserts
  await lawsCol.createIndex({ lawId: 1 }, { unique: true, background: true });

  // 1. Fetch RSS feeds (last 7 days for daily sync; 30 days for first run)
  let rssItems;
  try {
    rssItems = await rssService.fetchAllFeeds({ maxAge: 7 });
    console.log(`[PulseV2RssSync] Fetched ${rssItems.length} RSS items from ${Object.keys(rssService.LEGAL_RSS_FEEDS).length} feeds`);
  } catch (err) {
    console.error("[PulseV2RssSync] Failed to fetch RSS feeds:", err.message);
    return { error: err.message, inserted: 0, updated: 0, skipped: 0 };
  }

  if (rssItems.length === 0) {
    console.log("[PulseV2RssSync] No new RSS items. Done.");
    return { inserted: 0, updated: 0, skipped: 0, duration: Date.now() - startTime };
  }

  // 2. Normalize for Legal Pulse format
  const normalized = rssService.normalizeForLegalPulse(rssItems);
  console.log(`[PulseV2RssSync] Normalized ${normalized.length} items`);

  // 3. Upsert into laws collection
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of normalized) {
    try {
      // Map RSS fields to laws collection schema
      const lawDoc = {
        lawId: item.lawId,
        sectionId: item.sectionId || item.lawId,
        title: item.title,
        text: item.description || item.summary || item.title,
        summary: item.summary,
        sourceUrl: item.url || "",
        source: "rss",
        area: item.area || "Sonstiges",
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        metadata: item.metadata || {},
        // Do NOT set pulseV2Processed — Radar needs to process new entries
      };

      const result = await lawsCol.updateOne(
        { lawId: lawDoc.lawId },
        {
          $set: {
            ...lawDoc,
            updatedAt: lawDoc.updatedAt,
          },
          $setOnInsert: {
            createdAt: new Date(),
            pulseV2Processed: false,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        inserted++;
      } else if (result.modifiedCount > 0) {
        // Reset pulseV2Processed when content is updated so Radar re-processes
        await lawsCol.updateOne(
          { lawId: lawDoc.lawId },
          { $set: { pulseV2Processed: false } }
        );
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      // Duplicate key errors are expected (idempotent upserts)
      if (err.code !== 11000) {
        console.error(`[PulseV2RssSync] Error processing "${item.title?.substring(0, 50)}":`, err.message);
        errors++;
      } else {
        skipped++;
      }
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[PulseV2RssSync] Done in ${duration}ms: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors`);

  return { inserted, updated, skipped, errors, total: normalized.length, duration };
}

module.exports = { runPulseV2RssSync };

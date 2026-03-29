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

// B1: Lazy-load embedding service for law embeddings during sync
let _lawEmbeddings = null;
function getLawEmbeddings() {
  if (_lawEmbeddings === null) {
    try {
      const { getInstance } = require("../services/lawEmbeddings");
      _lawEmbeddings = getInstance();
    } catch (err) {
      console.warn("[PulseV2RssSync] LawEmbeddings not available:", err.message);
      _lawEmbeddings = false;
    }
  }
  return _lawEmbeddings || null;
}

/**
 * Main RSS sync entry point.
 * @param {import('mongodb').Db} db - Shared database connection
 */
async function runPulseV2RssSync(db) {
  console.log("[PulseV2RssSync] Starting daily RSS sync...");
  const startTime = Date.now();

  const lawsCol = db.collection("laws");

  // Ensure index for efficient upserts
  // Use try/catch: if a non-unique index with same name already exists, skip
  // (the V1 system may have created a non-unique lawId_1 index)
  try {
    await lawsCol.createIndex({ lawId: 1 }, { unique: true, background: true });
  } catch (indexErr) {
    if (indexErr.code === 85 || indexErr.code === 86) {
      // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict
      // Index exists with different options — the existing index still works for queries
      console.log("[PulseV2RssSync] Index lawId_1 already exists (non-unique). Using existing index.");
    } else {
      throw indexErr;
    }
  }

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
      // Clean title: strip HTML artifacts, excess whitespace, tabs, newlines
      const cleanTitle = (item.title || "")
        .replace(/[\n\r\t]+/g, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Map RSS fields to laws collection schema
      const lawDoc = {
        lawId: item.lawId,
        sectionId: item.sectionId || item.lawId,
        title: cleanTitle || item.title,
        text: item.description || item.summary || item.title,
        summary: item.summary,
        sourceUrl: item.url || "",
        source: "rss",
        area: item.area || "Sonstiges",
        areas: item.areas || [item.area || "Sonstiges"], // A4: Multi-area support
        lawStatus: item.lawStatus || "unknown",
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

  // B1: Generate embeddings for newly inserted laws (max 50 per run)
  let embeddingsGenerated = 0;
  try {
    const lawEmb = getLawEmbeddings();
    if (lawEmb && inserted > 0) {
      const newLaws = await lawsCol.find({
        embedding: { $in: [null, []] },
        source: "rss",
      }).sort({ createdAt: -1 }).limit(50).toArray();

      for (const law of newLaws) {
        try {
          const embText = `${law.title || ""} ${law.summary || law.text || ""}`.trim();
          if (embText.length < 20) continue;
          const embedding = await lawEmb.generateEmbedding(embText);
          await lawsCol.updateOne({ _id: law._id }, { $set: { embedding } });
          embeddingsGenerated++;
          // Rate limit: 100ms between calls
          await new Promise((r) => setTimeout(r, 100));
        } catch (embErr) {
          console.warn(`[PulseV2RssSync] Embedding failed for "${law.title?.substring(0, 40)}":`, embErr.message);
          // Continue with remaining laws
        }
      }
      if (embeddingsGenerated > 0) {
        console.log(`[PulseV2RssSync] Generated ${embeddingsGenerated} embeddings for new laws`);
      }
    }
  } catch (embGlobalErr) {
    console.warn("[PulseV2RssSync] Embedding generation skipped:", embGlobalErr.message);
  }

  // C3: Enrich court decisions with Leitsätze from court_decisions collection
  let enriched = 0;
  try {
    const courtDecisions = await lawsCol.find({
      lawStatus: "court_decision",
      "metadata.enrichedFromCourtDecisions": { $ne: true },
      source: "rss",
    }).sort({ createdAt: -1 }).limit(20).toArray();

    if (courtDecisions.length > 0) {
      const courtCol = db.collection("court_decisions");
      for (const law of courtDecisions) {
        // Extract Aktenzeichen (e.g., "XII ZR 123/45" or "I ZB 12/23")
        const aktenMatch = law.title?.match(/\b([IVXL]+\s+Z[A-Z]\s+\d+\/\d+)\b/);
        if (!aktenMatch) continue;
        const aktenzeichen = aktenMatch[1];

        const courtDoc = await courtCol.findOne({
          $or: [
            { aktenzeichen },
            { title: { $regex: aktenzeichen.replace(/\//g, "\\/"), $options: "i" } },
          ],
        });

        if (courtDoc) {
          await lawsCol.updateOne({ _id: law._id }, {
            $set: {
              summary: courtDoc.leitsatz || courtDoc.summary || law.summary,
              keywords: courtDoc.keywords || law.keywords || [],
              "metadata.enrichedFromCourtDecisions": true,
              "metadata.courtDecisionId": courtDoc._id.toString(),
            },
          });
          enriched++;
        }
      }
      if (enriched > 0) {
        console.log(`[PulseV2RssSync] Enriched ${enriched} court decisions with Leitsätze`);
      }
    }
  } catch (enrichErr) {
    console.warn("[PulseV2RssSync] Court enrichment skipped:", enrichErr.message);
  }

  const duration = Date.now() - startTime;
  console.log(`[PulseV2RssSync] Done in ${duration}ms: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors, ${embeddingsGenerated} embeddings, ${enriched} enriched`);

  return { inserted, updated, skipped, errors, embeddingsGenerated, enriched, total: normalized.length, duration };
}

module.exports = { runPulseV2RssSync };

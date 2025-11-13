// 📁 backend/scripts/syncRssToMongo.js
// Sync RSS Legal Updates to MongoDB for Legal Pulse

require('dotenv').config();
const mongoose = require('mongoose');
const rssService = require('../services/rssService');

// Law Model (from legalPulseService)
const Law = mongoose.model('Law', new mongoose.Schema({
  lawId: { type: String, required: true, unique: true },
  sectionId: String,
  title: { type: String, required: true },
  summary: String,
  description: String,
  url: String,
  source: { type: String, default: 'rss' },
  area: String,
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  metadata: {
    feedId: String,
    feedName: String,
    author: String,
    categories: [String],
    fullContent: String
  }
}));

async function syncRssToMongo() {
  try {
    console.log('📡 Syncing RSS Legal Updates to MongoDB\n');
    console.log('=' .repeat(70));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Fetch RSS feeds (last 30 days)
    console.log('📋 Fetching RSS feeds (last 30 days)...');
    const rssItems = await rssService.fetchAllFeeds({ maxAge: 30 });
    console.log(`📊 Fetched ${rssItems.length} RSS items\n`);

    if (rssItems.length === 0) {
      console.log('⚠️  No RSS items found. Exiting.');
      process.exit(0);
    }

    // Normalize for Legal Pulse
    const normalized = rssService.normalizeForLegalPulse(rssItems);
    console.log(`🔄 Normalized ${normalized.length} items for Legal Pulse\n`);

    // Insert into MongoDB (with deduplication)
    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const item of normalized) {
      try {
        // Check if law already exists
        const existing = await Law.findOne({ lawId: item.lawId });

        if (existing) {
          // Update if content changed
          if (existing.updatedAt < item.updatedAt) {
            await Law.updateOne(
              { lawId: item.lawId },
              { $set: item }
            );
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Insert new law
          await Law.create(item);
          inserted++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${item.title}:`, error.message);
      }
    }

    console.log('=' .repeat(70));
    console.log('✅ RSS Sync Complete!\n');
    console.log(`📊 Results:`);
    console.log(`  • Inserted: ${inserted} new laws`);
    console.log(`  • Updated: ${updated} existing laws`);
    console.log(`  • Skipped: ${skipped} duplicates`);
    console.log('=' .repeat(70));

    // Show sample laws
    console.log('\n📰 Sample Laws in Database:');
    const samples = await Law.find({ source: 'rss' })
      .sort({ updatedAt: -1 })
      .limit(5);

    samples.forEach((law, i) => {
      console.log(`\n${i + 1}. ${law.title.substring(0, 80)}`);
      console.log(`   Source: ${law.metadata?.feedName || 'Unknown'}`);
      console.log(`   Date: ${law.updatedAt.toISOString().slice(0, 10)}`);
      console.log(`   URL: ${law.url}`);
    });

    console.log('\n💡 These laws are now ready for Legal Pulse monitoring!\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run sync
syncRssToMongo();

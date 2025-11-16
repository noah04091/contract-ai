// 📁 backend/scripts/initLegalPulseSync.js
// Initial sync script for Legal Pulse law database

require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

async function runInitialSync() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Legal Pulse - Initial Law Database Sync');
  console.log('='.repeat(70) + '\n');

  let mongoClient = null;

  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Mongoose connected');

    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    console.log('✅ MongoDB client connected\n');

    // Step 1: Sync RSS Feeds
    console.log('📡 STEP 1: Syncing RSS feeds...');
    const rssService = require('../services/rssService');
    const { getInstance: getLawFingerprinting } = require('../services/lawFingerprinting');
    const fingerprinting = getLawFingerprinting();

    // Fetch RSS feeds (last 30 days for initial sync)
    const rssItems = await rssService.fetchAllFeeds({ maxAge: 30 });
    console.log(`   📊 Fetched ${rssItems.length} RSS items (last 30 days)`);

    if (rssItems.length === 0) {
      console.log('⚠️  No RSS items fetched. Check feed URLs.');
    } else {
      // Normalize for Legal Pulse
      const normalized = rssService.normalizeForLegalPulse(rssItems);

      // Insert/Update in MongoDB with Fingerprinting
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let deduplicated = 0;

      const lawsCollection = db.collection("laws");

      for (const item of normalized) {
        // Generate content fingerprint
        const contentHash = fingerprinting.generateFingerprint(item);
        item.contentHash = contentHash;

        // Check for duplicates by EITHER lawId OR contentHash
        const existing = await lawsCollection.findOne({
          $or: [
            { lawId: item.lawId },
            { contentHash: contentHash }
          ]
        });

        if (existing) {
          // Check if this is a duplicate from different source
          const isDuplicate = existing.lawId !== item.lawId && existing.contentHash === contentHash;

          if (isDuplicate) {
            // MERGE duplicate entries
            const mergedLaw = fingerprinting.mergeDuplicates(existing, item);

            await lawsCollection.updateOne(
              { _id: existing._id },
              { $set: mergedLaw }
            );

            deduplicated++;
          } else {
            // Regular update (same law, possibly updated content)
            if (!existing.updatedAt || existing.updatedAt < item.updatedAt) {
              await lawsCollection.updateOne(
                { _id: existing._id },
                { $set: { ...item, updatedAt: new Date() } }
              );
              updated++;
            } else {
              skipped++;
            }
          }
        } else {
          // Insert new law
          await lawsCollection.insertOne(item);
          inserted++;
        }
      }

      console.log(`   ✅ RSS Sync Complete:`);
      console.log(`      - Inserted: ${inserted}`);
      console.log(`      - Updated: ${updated}`);
      console.log(`      - Deduplicated: ${deduplicated}`);
      console.log(`      - Skipped: ${skipped}\n`);
    }

    // Step 2: Sync External APIs
    console.log('🌐 STEP 2: Syncing External APIs (EU-Lex, Bundesanzeiger, GovData)...');
    const { getInstance: getExternalAPIs } = require('../services/externalLegalAPIs');
    const externalAPIs = getExternalAPIs();

    const syncResult = await externalAPIs.syncToLocalDatabase(30); // Last 30 days
    console.log(`   ✅ External API Sync Complete:`);
    console.log(`      - Synced: ${syncResult.synced || 0}`);
    console.log(`      - Skipped: ${syncResult.skipped || 0}`);
    console.log(`      - Errors: ${syncResult.errors || 0}\n`);

    // Step 3: Check total laws in database
    const lawsCollection = db.collection("laws");
    const totalLaws = await lawsCollection.countDocuments();
    console.log(`📊 Total laws in database: ${totalLaws}\n`);

    // Step 4: Generate embeddings for new laws
    console.log('🧠 STEP 3: Generating embeddings for laws...');
    const { getInstance: getLawEmbeddings } = require('../services/lawEmbeddings');
    const lawEmbeddings = getLawEmbeddings();

    // Find laws without embeddings
    const lawsWithoutEmbeddings = await lawsCollection
      .find({ embedding: { $exists: false } })
      .toArray();

    console.log(`   Found ${lawsWithoutEmbeddings.length} laws without embeddings`);

    if (lawsWithoutEmbeddings.length > 0) {
      let embeddingsGenerated = 0;

      for (const law of lawsWithoutEmbeddings) {
        try {
          // Extract text from law object
          const embeddingText = `${law.title || ''}\n${law.text || law.summary || law.description || ''}`;

          if (!embeddingText.trim()) {
            console.log(`   ⚠️  Skipping law ${law._id}: No text content`);
            continue;
          }

          const embedding = await lawEmbeddings.generateEmbedding(embeddingText);
          await lawsCollection.updateOne(
            { _id: law._id },
            { $set: { embedding } }
          );
          embeddingsGenerated++;

          if (embeddingsGenerated % 10 === 0) {
            console.log(`   Progress: ${embeddingsGenerated}/${lawsWithoutEmbeddings.length}`);
          }

          // Rate limiting to avoid OpenAI rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`   ❌ Error generating embedding for law ${law._id}:`, error.message);
        }
      }

      console.log(`   ✅ Generated ${embeddingsGenerated} embeddings\n`);
    }

    // Step 5: Populate vector_laws collection for vector store
    console.log('📦 STEP 4: Populating vector_laws collection...');
    const vectorLawsCollection = db.collection("vector_laws");

    // Get all laws with embeddings
    const lawsWithEmbeddings = await lawsCollection
      .find({ embedding: { $exists: true } })
      .toArray();

    console.log(`   Found ${lawsWithEmbeddings.length} laws with embeddings`);

    if (lawsWithEmbeddings.length > 0) {
      const bulkOps = [];

      for (const law of lawsWithEmbeddings) {
        bulkOps.push({
          updateOne: {
            filter: { id: law._id.toString() },
            update: {
              $set: {
                id: law._id.toString(),
                lawId: law.lawId,
                embedding: law.embedding,
                text: law.text || law.summary || law.description || '',
                metadata: {
                  title: law.title,
                  area: law.area,
                  source: law.source || law.feedId,
                  sourceUrl: law.sourceUrl || law.url || '',
                  effective: law.effective,
                  updatedAt: law.updatedAt
                },
                updatedAt: new Date()
              }
            },
            upsert: true
          }
        });
      }

      await vectorLawsCollection.bulkWrite(bulkOps);
      console.log(`   ✅ Populated ${bulkOps.length} law vectors\n`);
    }

    // Step 6: Reload vector store
    console.log('🔄 STEP 5: Reloading vector store...');
    const VectorStore = require('../services/vectorStore');
    const vectorStore = new VectorStore();
    await vectorStore.init();
    console.log('   ✅ Vector store reloaded\n');

    console.log('='.repeat(70));
    console.log('✅ Initial sync complete!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (mongoClient) {
      await mongoClient.close();
    }
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the sync
runInitialSync();

// 📁 backend/scripts/createProductionIndexes.js
// Create all production indexes for Legal Pulse

require('dotenv').config();
const { MongoClient } = require('mongodb');

console.log('🔧 Creating Production Indexes for Legal Pulse\n');
console.log('='.repeat(70));

async function createProductionIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('contract_ai');

    // 1. Laws Collection Indexes
    console.log('📋 Creating Laws Collection Indexes...\n');
    const lawsCollection = db.collection('laws');

    await lawsCollection.createIndex(
      { contentHash: 1 },
      { name: 'contentHash_1', background: true }
    );
    console.log('  ✅ contentHash index');

    await lawsCollection.createIndex(
      { lawId: 1 },
      { name: 'lawId_1', background: true }
    );
    console.log('  ✅ lawId index');

    await lawsCollection.createIndex(
      { updatedAt: -1 },
      { name: 'updatedAt_-1', background: true }
    );
    console.log('  ✅ updatedAt index');

    await lawsCollection.createIndex(
      { contentHash: 1, updatedAt: -1 },
      { name: 'contentHash_1_updatedAt_-1', background: true }
    );
    console.log('  ✅ contentHash + updatedAt compound index');

    await lawsCollection.createIndex(
      { area: 1, updatedAt: -1 },
      { name: 'area_1_updatedAt_-1', background: true }
    );
    console.log('  ✅ area + updatedAt compound index\n');

    // 2. Contracts Collection Indexes
    console.log('📋 Creating Contracts Collection Indexes...\n');
    const contractsCollection = db.collection('contracts');

    await contractsCollection.createIndex(
      { userId: 1, updatedAt: -1 },
      { name: 'userId_1_updatedAt_-1', background: true }
    );
    console.log('  ✅ userId + updatedAt compound index');

    await contractsCollection.createIndex(
      { lastIndexedAt: 1 },
      { name: 'lastIndexedAt_1', background: true }
    );
    console.log('  ✅ lastIndexedAt index (for incremental indexing)');

    await contractsCollection.createIndex(
      { userId: 1, lastIndexedAt: 1 },
      { name: 'userId_1_lastIndexedAt_1', background: true }
    );
    console.log('  ✅ userId + lastIndexedAt compound index\n');

    // 3. Pulse Notifications Collection Indexes
    console.log('📋 Creating Pulse Notifications Collection Indexes...\n');
    const notificationsCollection = db.collection('pulse_notifications');

    await notificationsCollection.createIndex(
      { userId: 1, createdAt: -1 },
      { name: 'userId_1_createdAt_-1', background: true }
    );
    console.log('  ✅ userId + createdAt compound index');

    await notificationsCollection.createIndex(
      { contractId: 1, lawId: 1 },
      { name: 'contractId_1_lawId_1', background: true }
    );
    console.log('  ✅ contractId + lawId compound index (duplicate check)');

    await notificationsCollection.createIndex(
      { contractId: 1, lawId: 1, createdAt: -1 },
      { name: 'contractId_1_lawId_1_createdAt_-1', background: true }
    );
    console.log('  ✅ contractId + lawId + createdAt compound index (24h protection)\n');

    // 4. Alert Feedback Collection Indexes
    console.log('📋 Creating Alert Feedback Collection Indexes...\n');
    const feedbackCollection = db.collection('alert_feedback');

    await feedbackCollection.createIndex(
      { alertId: 1, userId: 1 },
      { name: 'alertId_1_userId_1', unique: true, background: true }
    );
    console.log('  ✅ alertId + userId unique index (prevent duplicate feedback)');

    await feedbackCollection.createIndex(
      { userId: 1, createdAt: -1 },
      { name: 'userId_1_createdAt_-1', background: true }
    );
    console.log('  ✅ userId + createdAt compound index');

    await feedbackCollection.createIndex(
      { rating: 1, lawArea: 1 },
      { name: 'rating_1_lawArea_1', background: true }
    );
    console.log('  ✅ rating + lawArea compound index (analytics)\n');

    // 5. Digest Queue Collection Indexes
    console.log('📋 Creating Digest Queue Collection Indexes...\n');
    const digestQueueCollection = db.collection('digest_queue');

    await digestQueueCollection.createIndex(
      { digestMode: 1, queued: 1, sent: 1, queuedAt: -1 },
      { name: 'digestMode_1_queued_1_sent_1_queuedAt_-1', background: true }
    );
    console.log('  ✅ digestMode + queued + sent + queuedAt compound index');

    await digestQueueCollection.createIndex(
      { userId: 1, sent: 1, queuedAt: -1 },
      { name: 'userId_1_sent_1_queuedAt_-1', background: true }
    );
    console.log('  ✅ userId + sent + queuedAt compound index');

    await digestQueueCollection.createIndex(
      { sent: 1, sentAt: 1 },
      { name: 'sent_1_sentAt_1', background: true }
    );
    console.log('  ✅ sent + sentAt compound index (cleanup)\n');

    // 6. Users Collection Indexes (Legal Pulse settings)
    console.log('📋 Creating Users Collection Indexes...\n');
    const usersCollection = db.collection('users');

    await usersCollection.createIndex(
      { 'legalPulseSettings.enabled': 1, 'legalPulseSettings.digestMode': 1 },
      { name: 'legalPulseSettings_enabled_1_digestMode_1', background: true, sparse: true }
    );
    console.log('  ✅ legalPulseSettings.enabled + digestMode compound index\n');

    console.log('='.repeat(70));
    console.log('✅ All Production Indexes Created Successfully!');
    console.log('='.repeat(70));

    console.log('\n📊 Index Summary:\n');
    console.log('  Laws Collection: 5 indexes');
    console.log('  Contracts Collection: 3 indexes');
    console.log('  Pulse Notifications: 3 indexes');
    console.log('  Alert Feedback: 3 indexes');
    console.log('  Digest Queue: 3 indexes');
    console.log('  Users Collection: 1 index');
    console.log('  ──────────────────────────');
    console.log('  Total: 18 indexes\n');

    console.log('💡 Performance Benefits:\n');
    console.log('  ✅ Fast duplicate detection for laws');
    console.log('  ✅ Efficient incremental indexing');
    console.log('  ✅ Quick alert duplicate checking (24h protection)');
    console.log('  ✅ Fast feedback lookup and analytics');
    console.log('  ✅ Optimized digest queue processing');
    console.log('  ✅ Improved user settings queries\n');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createProductionIndexes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

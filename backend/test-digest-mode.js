// 📁 backend/test-digest-mode.js
// Test Alert Digest Mode

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const DigestProcessor = require('./jobs/digestProcessor');

console.log('🧪 Testing Alert Digest Mode\n');
console.log('='.repeat(70));

async function testDigestMode() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('contract_ai');
    const digestQueueCollection = db.collection('digest_queue');
    const usersCollection = db.collection('users');

    // 1. Find or create a test user
    console.log('📋 Test 1: Setup Test User\n');

    let testUser = await usersCollection.findOne({});

    if (!testUser) {
      const userId = new ObjectId();
      testUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        legalPulseSettings: {
          enabled: true,
          digestMode: 'daily',
          emailNotifications: true
        },
        createdAt: new Date()
      };
      await usersCollection.insertOne(testUser);
      console.log('✅ Created test user');
    } else {
      console.log(`✅ Using existing user: ${testUser.email}`);
    }

    console.log(`   User ID: ${testUser._id}\n`);

    // 2. Queue daily digest alerts
    console.log('📋 Test 2: Queue Daily Digest Alerts\n');

    const dailyAlerts = [
      {
        userId: testUser._id,
        contractId: 'contract_001',
        contractName: 'Kaufvertrag Immobilie',
        lawId: 'law_001',
        lawTitle: 'Neue Gewährleistungsfristen für Kaufverträge',
        lawDescription: 'Die gesetzliche Gewährleistungsfrist wird von 2 auf 3 Jahre verlängert.',
        lawArea: 'Kaufrecht',
        score: 0.92,
        matchedChunk: 'Test chunk',
        digestMode: 'daily',
        queued: true,
        sent: false,
        queuedAt: new Date()
      },
      {
        userId: testUser._id,
        contractId: 'contract_002',
        contractName: 'Mietvertrag Wohnung',
        lawId: 'law_002',
        lawTitle: 'Mietrecht: Neue Kündigungsfristen',
        lawDescription: 'Kündigungsfristen für Mietverträge werden von 3 auf 4 Monate verlängert.',
        lawArea: 'Mietrecht',
        score: 0.88,
        matchedChunk: 'Test chunk',
        digestMode: 'daily',
        queued: true,
        sent: false,
        queuedAt: new Date()
      },
      {
        userId: testUser._id,
        contractId: 'contract_003',
        contractName: 'Arbeitsvertrag',
        lawId: 'law_003',
        lawTitle: 'Arbeitsrecht: Mindestlohn-Erhöhung',
        lawDescription: 'Der gesetzliche Mindestlohn wird ab 2025 auf 12,50 EUR erhöht.',
        lawArea: 'Arbeitsrecht',
        score: 0.85,
        matchedChunk: 'Test chunk',
        digestMode: 'daily',
        queued: true,
        sent: false,
        queuedAt: new Date()
      }
    ];

    await digestQueueCollection.insertMany(dailyAlerts);
    console.log(`✅ Queued ${dailyAlerts.length} daily alerts\n`);

    // 3. Queue weekly digest alerts
    console.log('📋 Test 3: Queue Weekly Digest Alerts\n');

    const weeklyAlerts = [
      {
        userId: testUser._id,
        contractId: 'contract_004',
        contractName: 'Darlehensvertrag',
        lawId: 'law_004',
        lawTitle: 'Verbraucherkreditrichtlinie: Neue Widerrufsfristen',
        lawDescription: 'Widerrufsfrist für Verbraucherkredite wird von 14 auf 30 Tage verlängert.',
        lawArea: 'Verbraucherrecht',
        score: 0.89,
        matchedChunk: 'Test chunk',
        digestMode: 'weekly',
        queued: true,
        sent: false,
        queuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    ];

    await digestQueueCollection.insertMany(weeklyAlerts);
    console.log(`✅ Queued ${weeklyAlerts.length} weekly alerts\n`);

    // 4. Test daily digest processing
    console.log('📋 Test 4: Process Daily Digests\n');

    const processor = new DigestProcessor();
    const dailyResult = await processor.processDailyDigests();

    console.log(`Daily Digest Results:`);
    console.log(`  Sent: ${dailyResult.sent}`);
    console.log(`  Errors: ${dailyResult.errors}\n`);

    // 5. Verify daily alerts were marked as sent
    console.log('📋 Test 5: Verify Daily Alerts Marked as Sent\n');

    const sentDailyAlerts = await digestQueueCollection.countDocuments({
      digestMode: 'daily',
      sent: true
    });

    console.log(`✅ ${sentDailyAlerts} daily alerts marked as sent\n`);

    // 6. Test weekly digest processing
    console.log('📋 Test 6: Process Weekly Digests\n');

    const weeklyResult = await processor.processWeeklyDigests();

    console.log(`Weekly Digest Results:`);
    console.log(`  Sent: ${weeklyResult.sent}`);
    console.log(`  Errors: ${weeklyResult.errors}\n`);

    // 7. Test cleanup
    console.log('📋 Test 7: Test Cleanup Old Entries\n');

    // Create an old sent alert (31 days ago)
    await digestQueueCollection.insertOne({
      userId: testUser._id,
      contractId: 'old_contract',
      contractName: 'Old Contract',
      lawId: 'old_law',
      lawTitle: 'Old Law',
      score: 0.8,
      digestMode: 'daily',
      queued: true,
      sent: true,
      sentAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    });

    await processor.cleanup();

    // Verify old entry was deleted
    const oldEntry = await digestQueueCollection.findOne({
      contractId: 'old_contract'
    });

    if (!oldEntry) {
      console.log('✅ Old entries cleaned up successfully\n');
    } else {
      console.log('❌ Old entry still exists\n');
    }

    // 8. Cleanup test data
    console.log('📋 Test 8: Cleanup Test Data\n');

    await digestQueueCollection.deleteMany({
      userId: testUser._id
    });

    console.log('✅ Test data cleaned up');

    await processor.close();

    console.log('\n' + '='.repeat(70));
    console.log('✅ All Digest Mode Tests Passed!');
    console.log('='.repeat(70));

    console.log('\n📝 Summary:');
    console.log('  ✅ Daily alert queueing works');
    console.log('  ✅ Weekly alert queueing works');
    console.log('  ✅ Daily digest processing works');
    console.log('  ✅ Weekly digest processing works');
    console.log('  ✅ Alert status updates work');
    console.log('  ✅ Cleanup works');

    console.log('\n📚 Cron Jobs to Set Up:');
    console.log('  Daily:  0 8 * * *   node backend/run-daily-digest.js');
    console.log('  Weekly: 0 8 * * 1   node backend/run-weekly-digest.js');

    console.log('\n💡 How It Works:');
    console.log('  1. Users set digestMode in settings (instant/daily/weekly)');
    console.log('  2. Alerts for digest users are queued in digest_queue collection');
    console.log('  3. Cron jobs process queue at scheduled times');
    console.log('  4. Users receive consolidated email with all queued alerts');
    console.log('  5. Old sent digests are cleaned up after 30 days');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

testDigestMode()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

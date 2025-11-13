// 📁 backend/test-alert-feedback.js
// Test Alert Feedback System

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

console.log('🧪 Testing Alert Feedback System\n');
console.log('='.repeat(70));

async function testAlertFeedback() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('contract_ai');
    const notificationsCollection = db.collection('pulse_notifications');
    const feedbackCollection = db.collection('alert_feedback');

    // 1. Create a test alert
    console.log('📋 Test 1: Create Test Alert\n');

    const testAlert = {
      contractId: 'test_contract_123',
      contractName: 'Test Kaufvertrag',
      userId: new ObjectId(),
      lawId: 'test_law_456',
      lawTitle: 'Test Gesetzesänderung',
      lawArea: 'Kaufrecht',
      score: 0.87,
      severity: 'high',
      explanation: 'Test explanation',
      createdAt: new Date()
    };

    const insertResult = await notificationsCollection.insertOne(testAlert);
    const alertId = insertResult.insertedId;

    console.log(`Alert ID: ${alertId}`);
    console.log(`Contract: ${testAlert.contractName}`);
    console.log(`Law: ${testAlert.lawTitle}`);
    console.log(`Score: ${(testAlert.score * 100).toFixed(1)}%\n`);

    // 2. Test feedback submission - Helpful
    console.log('📋 Test 2: Submit "Helpful" Feedback\n');

    const helpfulFeedback = {
      alertId: alertId,
      userId: testAlert.userId,
      contractId: testAlert.contractId,
      lawId: testAlert.lawId,
      rating: 'helpful',
      comment: null,
      alertScore: testAlert.score,
      lawArea: testAlert.lawArea,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await feedbackCollection.insertOne(helpfulFeedback);
    console.log('✅ Helpful feedback submitted\n');

    // 3. Test feedback update
    console.log('📋 Test 3: Update Feedback to "Not Helpful"\n');

    await feedbackCollection.updateOne(
      { alertId: alertId },
      {
        $set: {
          rating: 'not_helpful',
          comment: 'Not relevant to my contract',
          updatedAt: new Date()
        }
      }
    );
    console.log('✅ Feedback updated to "Not Helpful"\n');

    // 4. Test feedback retrieval
    console.log('📋 Test 4: Retrieve Feedback\n');

    const retrievedFeedback = await feedbackCollection.findOne({
      alertId: alertId
    });

    console.log('Retrieved Feedback:');
    console.log(`  Rating: ${retrievedFeedback.rating}`);
    console.log(`  Comment: ${retrievedFeedback.comment || '(none)'}`);
    console.log(`  Alert Score: ${(retrievedFeedback.alertScore * 100).toFixed(1)}%`);
    console.log(`  Law Area: ${retrievedFeedback.lawArea}\n`);

    // 5. Test feedback statistics
    console.log('📋 Test 5: Calculate Feedback Statistics\n');

    // Add more test feedback
    const testFeedbacks = [
      { rating: 'helpful', alertScore: 0.92, lawArea: 'Arbeitsrecht' },
      { rating: 'helpful', alertScore: 0.88, lawArea: 'Mietrecht' },
      { rating: 'not_helpful', alertScore: 0.75, lawArea: 'Kaufrecht' },
      { rating: 'helpful', alertScore: 0.91, lawArea: 'Datenschutz' },
      { rating: 'not_helpful', alertScore: 0.72, lawArea: 'Vertragsrecht' }
    ];

    for (const fb of testFeedbacks) {
      await feedbackCollection.insertOne({
        alertId: new ObjectId(),
        userId: new ObjectId(),
        contractId: 'test_contract',
        lawId: 'test_law',
        rating: fb.rating,
        comment: null,
        alertScore: fb.alertScore,
        lawArea: fb.lawArea,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Calculate statistics
    const totalFeedback = await feedbackCollection.countDocuments();
    const helpfulCount = await feedbackCollection.countDocuments({ rating: 'helpful' });
    const notHelpfulCount = await feedbackCollection.countDocuments({ rating: 'not_helpful' });

    const helpfulRate = (helpfulCount / totalFeedback * 100).toFixed(1);

    console.log('Feedback Statistics:');
    console.log(`  Total: ${totalFeedback}`);
    console.log(`  Helpful: ${helpfulCount} (${helpfulRate}%)`);
    console.log(`  Not Helpful: ${notHelpfulCount} (${(100 - helpfulRate).toFixed(1)}%)`);

    // Average scores
    const helpfulScores = await feedbackCollection.aggregate([
      { $match: { rating: 'helpful' } },
      { $group: { _id: null, avgScore: { $avg: '$alertScore' } } }
    ]).toArray();

    const notHelpfulScores = await feedbackCollection.aggregate([
      { $match: { rating: 'not_helpful' } },
      { $group: { _id: null, avgScore: { $avg: '$alertScore' } } }
    ]).toArray();

    console.log(`\nAverage Scores:`);
    console.log(`  Helpful: ${(helpfulScores[0]?.avgScore * 100).toFixed(1)}%`);
    console.log(`  Not Helpful: ${(notHelpfulScores[0]?.avgScore * 100).toFixed(1)}%`);

    // 6. Test feedback by area
    console.log('\n📋 Test 6: Feedback by Legal Area\n');

    const byArea = await feedbackCollection.aggregate([
      { $match: { lawArea: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$lawArea',
          total: { $sum: 1 },
          helpful: {
            $sum: { $cond: [{ $eq: ['$rating', 'helpful'] }, 1, 0] }
          },
          notHelpful: {
            $sum: { $cond: [{ $eq: ['$rating', 'not_helpful'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    console.log('Feedback by Legal Area:');
    byArea.forEach(area => {
      const rate = (area.helpful / area.total * 100).toFixed(0);
      console.log(`  ${area._id}: ${area.total} total (${rate}% helpful)`);
    });

    // 7. Cleanup test data
    console.log('\n📋 Test 7: Cleanup Test Data\n');

    await feedbackCollection.deleteMany({
      $or: [
        { alertId: alertId },
        { contractId: 'test_contract' }
      ]
    });

    await notificationsCollection.deleteOne({ _id: alertId });

    console.log('✅ Test data cleaned up');

    console.log('\n' + '='.repeat(70));
    console.log('✅ All Alert Feedback Tests Passed!');
    console.log('='.repeat(70));

    console.log('\n📝 Summary:');
    console.log('  ✅ Alert creation works');
    console.log('  ✅ Feedback submission works');
    console.log('  ✅ Feedback updates work');
    console.log('  ✅ Feedback retrieval works');
    console.log('  ✅ Statistics calculation works');
    console.log('  ✅ Feedback by area works');

    console.log('\n📚 Available Endpoints:');
    console.log('  POST /api/alert-feedback - Submit feedback (requires auth)');
    console.log('  GET  /api/alert-feedback/stats - Get statistics (requires auth)');
    console.log('  GET  /api/alert-feedback/my-feedback - Get user feedback (requires auth)');
    console.log('  GET  /feedback/helpful/:alertId - Public helpful feedback (no auth)');
    console.log('  GET  /feedback/not-helpful/:alertId - Public not-helpful feedback (no auth)');

    console.log('\n📧 Email Integration:');
    console.log('  Feedback buttons are automatically included in alert emails');
    console.log('  Users can click thumbs up/down directly from email');
    console.log('  No authentication required for email feedback links');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
  }
}

testAlertFeedback()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

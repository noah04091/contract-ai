// 🔧 Einmaliges Script: Setzt analysisCount für ALLE Free-User auf 0
// NUR für Testing! In Production sollte Free-User Count NICHT resettet werden.
// Usage: node scripts/resetAllFreeUsersForTesting.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

async function resetAllFreeUsers() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');

    const usersCollection = client.db('contract_ai').collection('users');

    // Find all free users with count > 0
    const freeUsersWithCount = await usersCollection.find({
      $or: [
        { subscriptionPlan: 'free' },
        { subscriptionPlan: { $exists: false } }
      ],
      analysisCount: { $gt: 0 }
    }).toArray();

    console.log(`📋 Found ${freeUsersWithCount.length} free users with analysisCount > 0:`);
    freeUsersWithCount.forEach(user => {
      console.log(`   - ${user.email}: ${user.analysisCount} analyses`);
    });

    if (freeUsersWithCount.length === 0) {
      console.log('✅ No users to reset');
      return;
    }

    // Reset ALL free users (for testing)
    const result = await usersCollection.updateMany(
      {
        $or: [
          { subscriptionPlan: 'free' },
          { subscriptionPlan: { $exists: false } }
        ]
      },
      { $set: { analysisCount: 0 } }
    );

    console.log(`✅ Reset ${result.modifiedCount} free users to analysisCount: 0`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

resetAllFreeUsers();

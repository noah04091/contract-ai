// 🔧 Einmaliges Script: Setzt analysisCount für einen User zurück
// Usage: node scripts/resetUserAnalysisCount.js <email>

const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/resetUserAnalysisCount.js <email>');
  console.log('Example: node scripts/resetUserAnalysisCount.js user@example.com');
  process.exit(1);
}

async function resetAnalysisCount() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');

    const usersCollection = client.db('contract_ai').collection('users');

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`📋 User found:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Plan: ${user.subscriptionPlan || 'free'}`);
    console.log(`   Current analysisCount: ${user.analysisCount ?? 0}`);

    // Reset
    const result = await usersCollection.updateOne(
      { _id: user._id },
      { $set: { analysisCount: 0 } }
    );

    if (result.modifiedCount === 1) {
      console.log(`✅ analysisCount reset to 0`);
    } else {
      console.log(`⚠️ No changes made (was already 0?)`);
    }

    // Verify
    const updatedUser = await usersCollection.findOne({ _id: user._id });
    console.log(`📋 New analysisCount: ${updatedUser.analysisCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

resetAnalysisCount();

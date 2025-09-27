// 🔧 Script to manually fix user subscription status
// Run this script to update a user's profile when Stripe webhook fails

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

async function fixUserSubscription() {
  let client;

  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");

    // First, let's see all users to identify the one that needs fixing
    console.log('\n📋 Current users in database:');
    const allUsers = await usersCollection.find(
      {},
      {
        projection: {
          email: 1,
          subscriptionPlan: 1,
          subscriptionActive: 1,
          isPremium: 1,
          isBusiness: 1,
          subscriptionStatus: 1,
          createdAt: 1
        }
      }
    ).sort({ createdAt: -1 }).toArray();

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Plan: ${user.subscriptionPlan || 'free'}`);
      console.log(`   Active: ${user.subscriptionActive || false}`);
      console.log(`   Business: ${user.isBusiness || false}`);
      console.log(`   Premium: ${user.isPremium || false}`);
      console.log(`   Status: ${user.subscriptionStatus || 'inactive'}`);
      console.log(`   Created: ${user.createdAt || 'unknown'}`);
      console.log('');
    });

    if (allUsers.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    // Find the most recent user (likely the one who just purchased)
    const targetUser = allUsers[0]; // Most recent user

    console.log(`🎯 Targeting most recent user: ${targetUser.email}`);
    console.log('📝 Current status:');
    console.log(`   Plan: ${targetUser.subscriptionPlan || 'free'}`);
    console.log(`   Active: ${targetUser.subscriptionActive || false}`);
    console.log(`   Business: ${targetUser.isBusiness || false}`);
    console.log(`   Premium: ${targetUser.isPremium || false}`);
    console.log(`   Status: ${targetUser.subscriptionStatus || 'inactive'}`);

    // Check if user already has business subscription
    if (targetUser.subscriptionPlan === 'business' && targetUser.subscriptionActive === true) {
      console.log('✅ User already has active business subscription. No changes needed.');
      return;
    }

    console.log('\n🔄 Updating user to Business plan...');

    // Update the user with Business plan settings
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(targetUser._id) },
      {
        $set: {
          subscriptionActive: true,
          isPremium: false,  // Business plan is not premium
          isBusiness: true,  // Set business flag
          subscriptionPlan: "business",
          subscriptionStatus: "active",
          premiumSince: new Date(), // Set activation date
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('✅ User subscription successfully updated!');

      // Verify the update
      const updatedUser = await usersCollection.findOne(
        { _id: new ObjectId(targetUser._id) },
        {
          projection: {
            email: 1,
            subscriptionPlan: 1,
            subscriptionActive: 1,
            isPremium: 1,
            isBusiness: 1,
            subscriptionStatus: 1,
            premiumSince: 1,
            updatedAt: 1
          }
        }
      );

      console.log('\n📊 Updated user status:');
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Plan: ${updatedUser.subscriptionPlan}`);
      console.log(`   Active: ${updatedUser.subscriptionActive}`);
      console.log(`   Business: ${updatedUser.isBusiness}`);
      console.log(`   Premium: ${updatedUser.isPremium}`);
      console.log(`   Status: ${updatedUser.subscriptionStatus}`);
      console.log(`   Premium Since: ${updatedUser.premiumSince}`);
      console.log(`   Updated At: ${updatedUser.updatedAt}`);

    } else {
      console.log('❌ No changes were made. User might not exist or update failed.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('💡 Check your MongoDB URI and credentials in .env file');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Handle command line arguments for specific user email
const args = process.argv.slice(2);

// Enhanced version that can target specific user by email
async function fixSpecificUserSubscription(targetEmail) {
  let client;

  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");

    // Find specific user by email
    const targetUser = await usersCollection.findOne(
      { email: targetEmail },
      {
        projection: {
          email: 1,
          subscriptionPlan: 1,
          subscriptionActive: 1,
          isPremium: 1,
          isBusiness: 1,
          subscriptionStatus: 1,
          createdAt: 1
        }
      }
    );

    if (!targetUser) {
      console.log(`❌ User with email ${targetEmail} not found`);
      return;
    }

    console.log(`🎯 Found user: ${targetUser.email}`);
    console.log('📝 Current status:');
    console.log(`   Plan: ${targetUser.subscriptionPlan || 'free'}`);
    console.log(`   Active: ${targetUser.subscriptionActive || false}`);
    console.log(`   Business: ${targetUser.isBusiness || false}`);
    console.log(`   Premium: ${targetUser.isPremium || false}`);
    console.log(`   Status: ${targetUser.subscriptionStatus || 'inactive'}`);

    // Check if user already has business subscription
    if (targetUser.subscriptionPlan === 'business' && targetUser.subscriptionActive === true) {
      console.log('✅ User already has active business subscription. No changes needed.');
      return;
    }

    console.log('\n🔄 Updating user to Business plan...');

    // Update the user with Business plan settings
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(targetUser._id) },
      {
        $set: {
          subscriptionActive: true,
          isPremium: false,  // Business plan is not premium
          isBusiness: true,  // Set business flag
          subscriptionPlan: "business",
          subscriptionStatus: "active",
          premiumSince: new Date(), // Set activation date
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('✅ User subscription successfully updated!');

      // Verify the update
      const updatedUser = await usersCollection.findOne(
        { _id: new ObjectId(targetUser._id) },
        {
          projection: {
            email: 1,
            subscriptionPlan: 1,
            subscriptionActive: 1,
            isPremium: 1,
            isBusiness: 1,
            subscriptionStatus: 1,
            premiumSince: 1,
            updatedAt: 1
          }
        }
      );

      console.log('\n📊 Updated user status:');
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Plan: ${updatedUser.subscriptionPlan}`);
      console.log(`   Active: ${updatedUser.subscriptionActive}`);
      console.log(`   Business: ${updatedUser.isBusiness}`);
      console.log(`   Premium: ${updatedUser.isPremium}`);
      console.log(`   Status: ${updatedUser.subscriptionStatus}`);
      console.log(`   Premium Since: ${updatedUser.premiumSince}`);
      console.log(`   Updated At: ${updatedUser.updatedAt}`);

    } else {
      console.log('❌ No changes were made. User might not exist or update failed.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('💡 Check your MongoDB URI and credentials in .env file');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Show usage information
function showUsage() {
  console.log('🔧 Contract AI Subscription Fix Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node fix-subscription.js                          # Fix most recent user');
  console.log('  node fix-subscription.js user@example.com        # Fix specific user by email');
  console.log('  node fix-subscription.js --list                  # List all users');
  console.log('  node fix-subscription.js --help                  # Show this help');
  console.log('');
  console.log('This script fixes users who paid via Stripe but whose subscription');
  console.log('was not properly activated due to webhook server issues.');
}

// List all users function
async function listAllUsers() {
  let client;

  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");

    const allUsers = await usersCollection.find(
      {},
      {
        projection: {
          email: 1,
          subscriptionPlan: 1,
          subscriptionActive: 1,
          isPremium: 1,
          isBusiness: 1,
          subscriptionStatus: 1,
          createdAt: 1
        }
      }
    ).sort({ createdAt: -1 }).toArray();

    console.log(`\n📋 Found ${allUsers.length} users in database:\n`);

    allUsers.forEach((user, index) => {
      const plan = user.subscriptionPlan || 'free';
      const active = user.subscriptionActive || false;
      const status = user.subscriptionStatus || 'inactive';

      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Plan: ${plan} | Active: ${active} | Status: ${status}`);

      if (plan === 'unknown' || (active && status === 'active' && plan === 'unknown')) {
        console.log('   ⚠️  NEEDS FIXING - Unknown plan detected');
      }

      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Main execution
if (args.length > 0) {
  const command = args[0].toLowerCase();

  if (command === '--help') {
    showUsage();
  } else if (command === '--list') {
    listAllUsers();
  } else {
    // Run with specific email
    fixSpecificUserSubscription(args[0]);
  }
} else {
  // Run with most recent user
  fixUserSubscription();
}
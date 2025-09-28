// 🔧 DB Migration: Normalize all email addresses to lowercase
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

async function migrateEmails() {
  let client;

  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();

    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");

    // Find all users where email is not lowercase
    console.log('🔍 Finding users with non-lowercase emails...');
    const usersToUpdate = await usersCollection.find({
      email: { $regex: /[A-Z]/ }
    }).toArray();

    console.log(`📧 Found ${usersToUpdate.length} users with uppercase emails`);

    if (usersToUpdate.length === 0) {
      console.log('✅ All emails are already lowercase!');
      return;
    }

    // Update each user's email to lowercase
    let updated = 0;
    for (const user of usersToUpdate) {
      const originalEmail = user.email;
      const normalizedEmail = originalEmail.trim().toLowerCase();

      console.log(`📝 ${originalEmail} → ${normalizedEmail}`);

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { email: normalizedEmail } }
      );
      updated++;
    }

    console.log(`✅ Updated ${updated} user emails to lowercase`);

    // Create unique index on email field
    console.log('📝 Creating unique index on email...');
    try {
      await usersCollection.createIndex(
        { email: 1 },
        { unique: true, name: "uniq_email" }
      );
      console.log('✅ Unique index created on email field');
    } catch (err) {
      if (err.code === 85) {
        console.log('ℹ️ Unique index already exists');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  migrateEmails();
}

module.exports = { migrateEmails };
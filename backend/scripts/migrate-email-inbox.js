// 📁 backend/scripts/migrate-email-inbox.js
// 🔄 One-Time-Script: Fügt allen existierenden Usern eine emailInboxAddress hinzu

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

async function migrateEmailInbox() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ MongoDB verbunden');

    const db = client.db('contract-ai');
    const usersCollection = db.collection('users');

    // Finde alle User OHNE emailInboxAddress
    const usersWithoutInbox = await usersCollection.find({
      $or: [
        { emailInboxAddress: { $exists: false } },
        { emailInboxAddress: null },
        { emailInboxAddress: '' }
      ]
    }).toArray();

    console.log(`\n📊 Gefundene User ohne Email-Inbox: ${usersWithoutInbox.length}`);

    if (usersWithoutInbox.length === 0) {
      console.log('✅ Alle User haben bereits eine Email-Inbox-Adresse!');
      return;
    }

    // Migriere jeden User
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutInbox) {
      try {
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const emailInboxAddress = `u_${user._id.toString()}.${randomSuffix}@upload.contract-ai.de`;

        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              emailInboxAddress: emailInboxAddress,
              emailInboxEnabled: true,
              emailInboxAddressCreatedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        console.log(`✅ ${user.email} → ${emailInboxAddress}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Fehler bei ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration abgeschlossen:`);
    console.log(`   ✅ Erfolgreich: ${successCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);

  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
  } finally {
    await client.close();
    console.log('🔒 MongoDB-Verbindung geschlossen');
  }
}

// Script ausführen
migrateEmailInbox();

// 📁 backend/scripts/check-user.js
// 🔍 Check welcher User die Email-Inbox-Adresse hat

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const targetEmail = 'u_68fdf8ee60f6de50691cf64c.e4417a46966aaba5@upload.contract-ai.de';

async function checkUser() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ MongoDB verbunden\n');

    const db = client.db('contract-ai');
    const usersCollection = db.collection('users');

    // Suche User mit dieser Email-Inbox-Adresse
    const user = await usersCollection.findOne({
      emailInboxAddress: targetEmail
    });

    if (user) {
      console.log('✅ User gefunden:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Inbox-Adresse: ${user.emailInboxAddress}`);
      console.log(`   Inbox aktiviert: ${user.emailInboxEnabled}`);
      console.log(`   User-ID: ${user._id}`);
    } else {
      console.log('❌ KEIN User mit dieser Email-Inbox-Adresse gefunden!');
      console.log(`   Gesuchte Adresse: ${targetEmail}`);

      // Zeige alle User mit Email-Inbox-Adressen
      console.log('\n📋 Alle User mit Email-Inbox-Adressen:');
      const allUsers = await usersCollection.find({
        emailInboxAddress: { $exists: true, $ne: null, $ne: '' }
      }).toArray();

      allUsers.forEach(u => {
        console.log(`   • ${u.email}: ${u.emailInboxAddress} (enabled: ${u.emailInboxEnabled})`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB-Verbindung geschlossen');
  }
}

checkUser();

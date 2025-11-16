// 📁 backend/scripts/createAdminUser.js
// Script to create the first admin user in the database

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const PASSWORD_SALT_ROUNDS = 10;

async function createAdminUser() {
  console.log('\n🔐 ===== ADMIN USER CREATION SCRIPT =====\n');

  let client;

  try {
    // Connect to MongoDB
    console.log('📡 Verbinde zur MongoDB...');
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log('✅ MongoDB verbunden\n');

    const usersCollection = client.db('contract_ai').collection('users');

    // Check if any admin already exists
    const existingAdmin = await usersCollection.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('⚠️  Ein Admin-User existiert bereits:');
      console.log(`   E-Mail: ${existingAdmin.email}`);
      console.log(`   Erstellt: ${existingAdmin.createdAt}\n`);

      const overwrite = await question('❓ Möchten Sie einen weiteren Admin erstellen? (ja/nein): ');

      if (overwrite.toLowerCase() !== 'ja' && overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        console.log('\n✋ Abgebrochen. Kein neuer Admin erstellt.\n');
        rl.close();
        await client.close();
        return;
      }
    }

    // Get admin email
    let email;
    while (true) {
      email = await question('\n📧 Admin E-Mail-Adresse: ');

      if (!email || !email.includes('@')) {
        console.log('❌ Ungültige E-Mail-Adresse. Bitte erneut versuchen.');
        continue;
      }

      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        console.log(`❌ User mit E-Mail ${email} existiert bereits.`);

        if (existingUser.role === 'admin') {
          console.log('   Dieser User ist bereits Admin.');
          const cont = await question('   Weiteren Admin erstellen? (ja/nein): ');
          if (cont.toLowerCase() !== 'ja' && cont.toLowerCase() !== 'yes' && cont.toLowerCase() !== 'y') {
            console.log('\n✋ Abgebrochen.\n');
            rl.close();
            await client.close();
            return;
          }
          continue;
        } else {
          console.log('   Dieser User hat die Rolle: ' + existingUser.role);
          const upgrade = await question('   Zu Admin upgraden? (ja/nein): ');

          if (upgrade.toLowerCase() === 'ja' || upgrade.toLowerCase() === 'yes' || upgrade.toLowerCase() === 'y') {
            await usersCollection.updateOne(
              { _id: existingUser._id },
              { $set: { role: 'admin', updatedAt: new Date() } }
            );

            console.log('\n✅ User erfolgreich zu Admin upgradet!');
            console.log(`   E-Mail: ${email}`);
            console.log(`   Rolle: admin\n`);

            rl.close();
            await client.close();
            return;
          }
          continue;
        }
      }

      break;
    }

    // Get admin password
    let password;
    while (true) {
      password = await question('🔑 Admin Passwort (min. 8 Zeichen): ');

      if (!password || password.length < 8) {
        console.log('❌ Passwort muss mindestens 8 Zeichen lang sein.');
        continue;
      }

      const confirmPassword = await question('🔑 Passwort bestätigen: ');

      if (password !== confirmPassword) {
        console.log('❌ Passwörter stimmen nicht überein. Bitte erneut versuchen.');
        continue;
      }

      break;
    }

    // Hash password
    console.log('\n🔒 Hash Passwort...');
    const hashed = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    // Create admin user
    const userId = new ObjectId();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const emailInboxAddress = `u_${userId.toString()}.${randomSuffix}@upload.contract-ai.de`;

    const adminUser = {
      _id: userId,
      email,
      password: hashed,
      verified: true, // Admin is auto-verified
      isPremium: true, // Admin gets premium features
      role: 'admin', // 🔐 ADMIN ROLE
      // Unlimited limits for admin
      analysisCount: 0,
      optimizationCount: 0,
      // Subscription
      subscriptionPlan: 'legendary',
      subscriptionStatus: 'active',
      subscriptionActive: true,
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      // Notifications
      emailNotifications: true,
      contractReminders: true,
      // Email inbox
      emailInboxAddress: emailInboxAddress,
      emailInboxEnabled: true,
      emailInboxAddressCreatedAt: new Date()
    };

    console.log('💾 Erstelle Admin-User in Datenbank...');
    await usersCollection.insertOne(adminUser);

    console.log('\n✅ ===== ADMIN USER ERFOLGREICH ERSTELLT! =====\n');
    console.log('📋 Admin-Daten:');
    console.log(`   E-Mail: ${email}`);
    console.log(`   Rolle: admin`);
    console.log(`   Verifiziert: Ja`);
    console.log(`   Premium: Ja`);
    console.log(`   Plan: legendary`);
    console.log(`   Erstellt: ${adminUser.createdAt.toISOString()}\n`);
    console.log('🔐 WICHTIG: Bewahren Sie die Login-Daten sicher auf!\n');
    console.log('🌐 Sie können sich jetzt einloggen unter:');
    console.log('   https://contract-ai.de/login\n');

  } catch (error) {
    console.error('\n❌ Fehler beim Erstellen des Admin-Users:', error);
    throw error;
  } finally {
    rl.close();
    if (client) {
      await client.close();
      console.log('👋 MongoDB Verbindung geschlossen.\n');
    }
  }
}

// Run script
createAdminUser().catch(err => {
  console.error('❌ Script-Fehler:', err);
  process.exit(1);
});

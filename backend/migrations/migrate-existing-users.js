// 📁 backend/migrations/migrate-existing-users.js
// ✅ EINMALIG AUSFÜHREN: Alle bestehenden User als verifiziert markieren

const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/contract_ai";

async function migrateExistingUsers() {
  let client;
  
  try {
    console.log("🚀 Starte User-Migration...");
    
    // MongoDB-Verbindung
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ MongoDB verbunden");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Alle User ohne verified-Feld finden
    const usersWithoutVerified = await usersCollection.find(
      { verified: { $exists: false } }
    ).toArray();

    console.log(`📊 Gefunden: ${usersWithoutVerified.length} User ohne verified-Feld`);

    if (usersWithoutVerified.length === 0) {
      console.log("✅ Alle User sind bereits migriert!");
      return;
    }

    // Alle User als verifiziert markieren
    const result = await usersCollection.updateMany(
      { verified: { $exists: false } },
      { 
        $set: { 
          verified: true,
          verifiedAt: new Date(),
          migrated: true // Markierung für Migration
        }
      }
    );

    console.log(`✅ ${result.modifiedCount} User erfolgreich als verifiziert markiert!`);

    // Statistiken anzeigen
    const totalUsers = await usersCollection.countDocuments();
    const verifiedUsers = await usersCollection.countDocuments({ verified: true });
    
    console.log("📈 Migration abgeschlossen:");
    console.log(`   Total User: ${totalUsers}`);
    console.log(`   Verifizierte User: ${verifiedUsers}`);
    console.log(`   Migration Rate: ${((verifiedUsers / totalUsers) * 100).toFixed(1)}%`);

    // Beispiel-User anzeigen
    const sampleUsers = await usersCollection.find(
      {}, 
      { projection: { email: 1, verified: 1, migrated: 1 }, limit: 3 }
    ).toArray();

    console.log("📋 Beispiel-User nach Migration:");
    sampleUsers.forEach(user => {
      console.log(`   ${user.email}: verified=${user.verified}, migrated=${user.migrated}`);
    });

  } catch (error) {
    console.error("❌ Fehler bei der Migration:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("📦 DB-Verbindung geschlossen");
    }
  }
}

// Migration ausführen wenn Script direkt aufgerufen wird
if (require.main === module) {
  migrateExistingUsers()
    .then(() => {
      console.log("🎉 Migration erfolgreich abgeschlossen!");
      process.exit(0);
    })
    .catch(error => {
      console.error("💥 Migration fehlgeschlagen:", error);
      process.exit(1);
    });
}

module.exports = migrateExistingUsers;
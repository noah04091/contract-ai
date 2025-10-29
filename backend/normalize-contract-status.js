// 🔧 normalize-contract-status.js - Normalisiert alle Contract-Status zu lowercase
const { MongoClient } = require("mongodb");
require("dotenv").config();

async function normalizeStatuses() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    console.log("\n🔧 =================================================");
    console.log("   STATUS NORMALISIERUNG");
    console.log("   =================================================\n");

    await client.connect();
    console.log("✅ Verbunden mit MongoDB\n");

    const db = client.db("contract_ai");
    const contractsCollection = db.collection("contracts");

    // Status-Mapping
    const statusMapping = {
      // Aktiv-Varianten
      "Aktiv": "aktiv",
      "Active": "aktiv",
      "active": "aktiv",
      "AKTIV": "aktiv",

      // Gekündigt-Varianten
      "Gekündigt": "gekündigt",
      "gekuendigt": "gekündigt",
      "Cancelled": "gekündigt",
      "cancelled": "gekündigt",
      "canceled": "gekündigt",

      // Abgelaufen-Varianten
      "Abgelaufen": "abgelaufen",
      "Expired": "abgelaufen",
      "expired": "abgelaufen",

      // Bald ablaufend-Varianten
      "Bald ablaufend": "bald_ablaufend",
      "Bald Ablaufend": "bald_ablaufend",
      "Expiring Soon": "bald_ablaufend",

      // Sonstige (werden zu "aktiv" gesetzt, wenn unklar)
      "Unbekannt": "aktiv",
      "unknown": "aktiv",
      "processed": "aktiv",
      "optimiert": "aktiv",
      "Analysiert": "aktiv",
      "analyzed": "aktiv"
    };

    // Prüfe aktuelle Status-Verteilung
    console.log("📊 VORHER: Status-Verteilung");
    console.log("─────────────────────────────────────────────────");

    const beforeDistribution = await contractsCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    let totalToChange = 0;
    beforeDistribution.forEach(s => {
      const needsChange = statusMapping[s._id] && statusMapping[s._id] !== s._id;
      console.log(`   ${needsChange ? "⚠️" : "✅"} ${s._id || "null"}: ${s.count} ${needsChange ? `→ ${statusMapping[s._id]}` : ""}`);
      if (needsChange) totalToChange += s.count;
    });

    console.log(`\n   📊 ${totalToChange} Verträge benötigen Status-Normalisierung\n`);

    if (totalToChange === 0) {
      console.log("✅ Alle Status sind bereits korrekt!\n");
      return;
    }

    // Normalisierung durchführen
    console.log("🔄 Starte Normalisierung...\n");

    let updated = 0;
    let errors = 0;

    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      if (oldStatus === newStatus) continue; // Skip wenn schon korrekt

      try {
        const result = await contractsCollection.updateMany(
          { status: oldStatus },
          {
            $set: {
              status: newStatus,
              statusUpdatedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ ${oldStatus} → ${newStatus}: ${result.modifiedCount} Verträge`);
          updated += result.modifiedCount;
        }
      } catch (error) {
        console.log(`   ❌ Fehler bei ${oldStatus} → ${newStatus}: ${error.message}`);
        errors++;
      }
    }

    // Null/Undefined Status zu "aktiv" setzen
    const nullStatusResult = await contractsCollection.updateMany(
      { $or: [{ status: null }, { status: { $exists: false } }] },
      {
        $set: {
          status: "aktiv",
          statusUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (nullStatusResult.modifiedCount > 0) {
      console.log(`   ✅ null → aktiv: ${nullStatusResult.modifiedCount} Verträge`);
      updated += nullStatusResult.modifiedCount;
    }

    // Zeige neue Verteilung
    console.log("\n\n📊 NACHHER: Status-Verteilung");
    console.log("─────────────────────────────────────────────────");

    const afterDistribution = await contractsCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    afterDistribution.forEach(s => {
      const emoji = s._id === "aktiv" ? "✅" :
                    s._id === "bald_ablaufend" ? "⚠️" :
                    s._id === "abgelaufen" ? "❌" :
                    s._id === "gekündigt" ? "🚫" : "❓";
      console.log(`   ${emoji} ${s._id}: ${s.count}`);
    });

    console.log("\n\n✅ =================================================");
    console.log(`   NORMALISIERUNG ABGESCHLOSSEN`);
    console.log(`   ${updated} Verträge aktualisiert`);
    console.log(`   ${errors} Fehler`);
    console.log("   =================================================\n");

    console.log("💡 NÄCHSTE SCHRITTE:");
    console.log("   1. Teste Smart Status Update: node test-smart-status-auto.js");
    console.log("   2. Starte Server neu: node server.js\n");

  } catch (error) {
    console.error("\n❌ Fehler bei Normalisierung:", error);
    throw error;
  } finally {
    await client.close();
    console.log("✅ MongoDB-Verbindung geschlossen\n");
  }
}

normalizeStatuses().catch(console.error);

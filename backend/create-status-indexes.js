// 📊 create-status-indexes.js - MongoDB Indexes für Smart Status System
const { MongoClient } = require("mongodb");
require("dotenv").config();

async function createStatusIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Verbunden mit MongoDB");

    const db = client.db("contract_ai");

    // 🧠 Indexes für contract_status_history Collection
    const statusHistoryCollection = db.collection("contract_status_history");

    // Index 1: Schneller Zugriff auf Historie eines Vertrags
    await statusHistoryCollection.createIndex(
      { contractId: 1, timestamp: -1 },
      { name: "idx_contract_history" }
    );
    console.log("✅ Index erstellt: contract_status_history.idx_contract_history");

    // Index 2: User-basierte Suche
    await statusHistoryCollection.createIndex(
      { userId: 1, timestamp: -1 },
      { name: "idx_user_history" }
    );
    console.log("✅ Index erstellt: contract_status_history.idx_user_history");

    // Index 3: Status-Transitions Analytics
    await statusHistoryCollection.createIndex(
      { oldStatus: 1, newStatus: 1, timestamp: -1 },
      { name: "idx_status_transitions" }
    );
    console.log("✅ Index erstellt: contract_status_history.idx_status_transitions");

    // 📄 Erweiterte Indexes für contracts Collection
    const contractsCollection = db.collection("contracts");

    // Index 4: Status + Expiry für Smart Status Updater
    await contractsCollection.createIndex(
      { status: 1, expiryDate: 1 },
      { name: "idx_status_expiry" }
    );
    console.log("✅ Index erstellt: contracts.idx_status_expiry");

    // Index 5: Auto-Renewal Filter
    await contractsCollection.createIndex(
      { isAutoRenewal: 1, expiryDate: 1 },
      { name: "idx_autorenewal" }
    );
    console.log("✅ Index erstellt: contracts.idx_autorenewal");

    // Index 6: User + Status für schnelle Filterung
    await contractsCollection.createIndex(
      { userId: 1, status: 1, updatedAt: -1 },
      { name: "idx_user_status" }
    );
    console.log("✅ Index erstellt: contracts.idx_user_status");

    console.log("\n🎉 Alle Indexes erfolgreich erstellt!");
    console.log("\n📊 Performance-Optimierung abgeschlossen:");
    console.log("   ✓ Smart Status Updates laufen schneller");
    console.log("   ✓ Status-History Queries optimiert");
    console.log("   ✓ Auto-Renewal Checks beschleunigt");
    console.log("   ✓ Contract-Filterung verbessert");

  } catch (error) {
    console.error("❌ Fehler beim Erstellen der Indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n✅ Verbindung geschlossen");
  }
}

createStatusIndexes();

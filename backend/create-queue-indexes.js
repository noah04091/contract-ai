// 📊 create-queue-indexes.js - MongoDB Indexes für Notification Queue
const { MongoClient } = require("mongodb");
require("dotenv").config();

async function createQueueIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log("\n✅ Verbunden mit MongoDB\n");

    const db = client.db("contract_ai");
    const queueCollection = db.collection("notification_queue");

    console.log("📊 Erstelle Indexes für notification_queue...\n");

    // Index 1: Status + Scheduled Time (für Queue-Verarbeitung)
    await queueCollection.createIndex(
      { status: 1, scheduledFor: 1 },
      { name: "idx_status_scheduled" }
    );
    console.log("✅ Index 1: idx_status_scheduled (status + scheduledFor)");

    // Index 2: User-basierte Suche
    await queueCollection.createIndex(
      { userId: 1, createdAt: -1 },
      { name: "idx_user_created" }
    );
    console.log("✅ Index 2: idx_user_created (userId + createdAt)");

    // Index 3: Contract-basierte Suche
    await queueCollection.createIndex(
      { contractId: 1, createdAt: -1 },
      { name: "idx_contract_created" }
    );
    console.log("✅ Index 3: idx_contract_created (contractId + createdAt)");

    // Index 4: Cleanup alter Notifications (TTL für alte sent)
    await queueCollection.createIndex(
      { sentAt: 1 },
      {
        name: "idx_sent_cleanup",
        expireAfterSeconds: 30 * 24 * 60 * 60 // 30 Tage
      }
    );
    console.log("✅ Index 4: idx_sent_cleanup (TTL: 30 Tage nach sentAt)");

    // Index 5: Failed Notifications für Retry
    await queueCollection.createIndex(
      { status: 1, attempts: 1 },
      { name: "idx_status_attempts" }
    );
    console.log("✅ Index 5: idx_status_attempts (status + attempts)");

    console.log("\n🎉 Alle Indexes erfolgreich erstellt!");
    console.log("\n📊 Performance-Optimierung:");
    console.log("   ✓ Queue-Verarbeitung optimiert");
    console.log("   ✓ User/Contract-Suche beschleunigt");
    console.log("   ✓ Automatisches Cleanup (TTL 30 Tage)");
    console.log("   ✓ Retry-Logic optimiert\n");

  } catch (error) {
    console.error("\n❌ Fehler beim Erstellen der Indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("✅ Verbindung geschlossen\n");
  }
}

createQueueIndexes();

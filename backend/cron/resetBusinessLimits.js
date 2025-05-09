// 📁 backend/cron/resetBusinessLimits.js
const cron = require("node-cron");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "contract_ai"; // ggf. anpassen

// 🕛 1. jeden Monat um 00:00 Uhr
cron.schedule("0 0 1 * *", async () => {
  console.log("🔄 Monatsreset gestartet (Business-Nutzer)");

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    const result = await users.updateMany(
      { subscriptionPlan: "business" },
      { $set: { analysisCount: 0 } }
    );

    console.log(`✅ Zurückgesetzt bei ${result.modifiedCount} Business-Nutzern`);
  } catch (err) {
    console.error("❌ Fehler beim Monatsreset:", err.message);
  } finally {
    await client.close();
  }
});

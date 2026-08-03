// 📁 backend/scripts/pulseFeedbackReport.js
// Betreiber-Report: ALLE 👍/👎-Stimmen zu Legal-Pulse-Alerts, mit Kontext.
// REIN LESEND — verändert nichts. Auf Zuruf ausführen:
//   cd backend && node scripts/pulseFeedbackReport.js
// Ergänzt die wöchentliche Betreiber-Mail (jobs/pulseV2AdminFeedbackDigest.js).

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient, ObjectId } = require("mongodb");
const { cleanContractName } = require("../utils/cleanContractName");

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db("contract_ai");

  const all = await db.collection("pulse_v2_legal_alerts")
    .find({ "userFeedback.feedbackAt": { $exists: true } })
    .project({ lawTitle: 1, contractName: 1, severity: 1, status: 1, userFeedback: 1, userId: 1, deepVerified: 1, createdAt: 1 })
    .sort({ "userFeedback.feedbackAt": -1 })
    .toArray();

  const total = await db.collection("pulse_v2_legal_alerts").countDocuments({});
  const up = all.filter((a) => a.userFeedback.useful === true).length;
  const down = all.length - up;
  const rate = all.length ? Math.round((up / all.length) * 100) : 0;

  console.log(`\n📊 Legal Pulse Feedback-Report (${new Date().toLocaleDateString("de-DE")})`);
  console.log(`   Alerts gesamt: ${total} · Stimmen: ${all.length} (👍${up}/👎${down}) · Hilfreich-Rate: ${rate}%\n`);

  const userCache = new Map();
  for (const a of all) {
    const key = String(a.userId);
    if (!userCache.has(key)) {
      const candidates = [a.userId, key];
      if (ObjectId.isValid(key)) candidates.push(new ObjectId(key));
      const u = await db.collection("users").findOne(
        { _id: { $in: candidates } },
        { projection: { email: 1, subscriptionPlan: 1 } }
      );
      userCache.set(key, u ? `${u.email} (${u.subscriptionPlan || "free"})` : "unbekannt");
    }
    const d = new Date(a.userFeedback.feedbackAt).toLocaleDateString("de-DE");
    console.log(`${a.userFeedback.useful ? "👍" : "👎"} ${d} · ${cleanContractName(a.contractName)} · ${userCache.get(key)}`);
    console.log(`   ${String(a.lawTitle || "").slice(0, 110)}`);
    console.log(`   Severity ${a.severity || "?"} · Status ${a.status || "?"} · deepVerified=${a.deepVerified === true}${a.userFeedback.comment ? ` · Kommentar: "${a.userFeedback.comment}"` : ""}\n`);
  }

  await client.close();
}

main().catch((err) => { console.error("Fehler:", err.message); process.exit(1); });

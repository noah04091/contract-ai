/**
 * Read-only Smoke-Test für die 32MB-Sort-Fixes in dashboardNotifications.js
 * (zwei Abfragen: calendarEvents + recentContracts).
 *
 * SENDET NICHTS, SCHREIBT NICHTS. Reine Lese-Aggregation.
 * Lauf:  node backend/scripts/smokeTestDashboardSort.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient, ObjectId } = require("mongodb");

const HEAVY_EMAIL = "2302test@flirt.ms";
const LIMIT = 20; // perSourceLimit bei parsedDays > 7

// ── calendarEvents: alt (ganzes contract-$lookup) vs Fix (kein $lookup) ──
function calendarPipeline({ fixed, userId, now, future }) {
  const stages = [
    { $match: { userId, date: { $gte: now, $lte: future }, status: { $in: ["scheduled", "notified"] } } },
  ];
  if (!fixed) stages.push(
    { $lookup: { from: "contracts", localField: "contractId", foreignField: "_id", as: "contract" } },
    { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } }
  );
  stages.push({ $sort: { date: 1 } }, { $limit: LIMIT });
  return stages;
}

// ── recentContracts: alt (volle Docs) vs Fix ($project kleine Felder) ──
function recentPipeline({ fixed, userId, since }) {
  const stages = [
    { $match: { userId, $or: [{ uploadedAt: { $gte: since } }, { analyzedAt: { $gte: since } }] } },
    { $addFields: { _lastActivity: { $max: ["$analyzedAt", "$uploadedAt"] } } },
  ];
  if (fixed) stages.push({ $project: { name: 1, analyzedAt: 1, uploadedAt: 1, _lastActivity: 1 } });
  stages.push({ $sort: { _lastActivity: -1 } }, { $limit: LIMIT });
  return stages;
}

async function runPair(coll, label, mk, checkField) {
  process.stdout.write(`   OHNE Fix : `);
  try {
    const t0 = Date.now();
    const r = await coll.aggregate(mk(false)).toArray();
    console.log(`✅ ${r.length} Docs, ${Date.now() - t0}ms`);
  } catch (e) { console.log(`💥 Bug reproduziert: ${e.codeName || e.code || ""} ${e.message}`); }

  process.stdout.write(`   MIT Fix  : `);
  try {
    const t0 = Date.now();
    const r = await coll.aggregate(mk(true)).toArray();
    const ok = checkField(r);
    console.log(`✅ ${r.length} Docs, ${Date.now() - t0}ms — KEIN 32MB-Fehler${ok ? ` — ${ok}` : ""}`);
  } catch (e) { console.log(`❌ UNERWARTET trotz Fix: ${e.codeName || e.code || ""} ${e.message}`); }
}

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("❌ MONGO_URI fehlt"); process.exit(1); }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const u = await db.collection("users").findOne({ email: HEAVY_EMAIL }, { projection: { _id: 1 } });
    if (!u) { console.error(`❌ ${HEAVY_EMAIL} nicht gefunden`); process.exit(1); }
    const userId = u._id;
    const events = db.collection("contract_events");
    const contracts = db.collection("contracts");

    const now = new Date();
    const future = new Date(); future.setFullYear(future.getFullYear() + 5);
    const since = new Date(); since.setFullYear(since.getFullYear() - 5);

    console.log(`Smoke-Test dashboardNotifications 32MB-Sort  (READ-ONLY)\n========================================================\nAccount ${HEAVY_EMAIL}\n`);

    console.log("## Abfrage 1: calendarEvents");
    await runPair(events, "calendarEvents",
      (fixed) => calendarPipeline({ fixed, userId, now, future }),
      (r) => `metadata.contractName vorhanden: ${r.filter(e => e.metadata?.contractName).length}/${r.length}`);

    console.log("\n## Abfrage 2: recentContracts");
    await runPair(contracts, "recentContracts",
      (fixed) => recentPipeline({ fixed, userId, since }),
      (r) => `name+_lastActivity vorhanden: ${r.filter(c => c.name && c._lastActivity).length}/${r.length}`);

    console.log("\n(Read-only — nichts geschrieben.)\n");
  } finally {
    await client.close();
  }
})();

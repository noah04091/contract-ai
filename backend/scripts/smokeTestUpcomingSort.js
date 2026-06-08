/**
 * Read-only Smoke-Test für den 32MB-Sort-Fix in GET /api/calendar/upcoming.
 *
 * Beweist: (a) alte Pipeline (ganzes contract-$lookup) crasht beim schweren Account,
 * (b) der Fix (Sub-Pipeline-$lookup, nur `name`) läuft sauber UND liefert contractName.
 *
 * SENDET NICHTS, SCHREIBT NICHTS. Reine Lese-Aggregation.
 * Lauf:  node backend/scripts/smokeTestUpcomingSort.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

const HEAVY_EMAIL = "2302test@flirt.ms"; // dokumentierter Last-Test-Account

function buildPipeline({ fixed, userId, now, future }) {
  const lookup = fixed
    ? { // FIX: nur name holen
        $lookup: {
          from: "contracts",
          let: { cid: "$contractId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },
            { $project: { name: 1 } },
          ],
          as: "contract",
        },
      }
    : { // ALT (buggy): ganzes Vertrags-Doc anhängen
        $lookup: { from: "contracts", localField: "contractId", foreignField: "_id", as: "contract" },
      };
  return [
    { $match: { userId, date: { $gte: now, $lte: future }, status: { $in: ["scheduled", "notified"] } } },
    lookup,
    { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } },
    { $sort: { date: 1, severity: -1 } },
    { $limit: 10 },
  ];
}

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("❌ MONGO_URI fehlt (backend/.env)"); process.exit(1); }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const user = await db.collection("users").findOne({ email: HEAVY_EMAIL }, { projection: { _id: 1 } });
    if (!user) { console.error(`❌ Account ${HEAVY_EMAIL} nicht gefunden`); process.exit(1); }
    const userId = user._id;
    const coll = db.collection("contract_events");

    const now = new Date();
    const future = new Date(); future.setFullYear(future.getFullYear() + 5);

    const matchCount = await coll.countDocuments({ userId, date: { $gte: now, $lte: future }, status: { $in: ["scheduled", "notified"] } });
    console.log(`Smoke-Test /upcoming  (READ-ONLY)\n=================================`);
    console.log(`Account ${HEAVY_EMAIL} → ${matchCount} Match-Events im 5-Jahres-Fenster\n`);

    console.log("── OHNE Fix (ganzes contract-$lookup) ──");
    try {
      const t0 = Date.now();
      const r = await coll.aggregate(buildPipeline({ fixed: false, userId, now, future })).toArray();
      console.log(`   ✅ lief durch (${r.length} Events, ${Date.now() - t0}ms) — Daten heute (noch) nicht groß genug`);
    } catch (e) {
      console.log(`   💥 FEHLER = Bug reproduziert: ${e.codeName || e.code || ""} ${e.message}`);
    }

    console.log("\n── MIT Fix (Sub-Pipeline, nur name) ──");
    try {
      const t0 = Date.now();
      const r = await coll.aggregate(buildPipeline({ fixed: true, userId, now, future })).toArray();
      const withName = r.filter(e => e.contract && e.contract.name).length;
      console.log(`   ✅ lief durch (${r.length} Events, ${Date.now() - t0}ms) — KEIN 32MB-Fehler`);
      console.log(`   ✅ contractName erhalten: ${withName}/${r.length} Events haben contract.name`);
      if (r[0]) console.log(`      Beispiel: "${r[0].title}" → contractName="${r[0].contract?.name ?? "(kein Vertrag verknüpft)"}"`);
    } catch (e) {
      console.log(`   ❌ UNERWARTET trotz Fix: ${e.codeName || e.code || ""} ${e.message}`);
    }

    console.log("\n(Read-only — nichts geschrieben.)\n");
  } finally {
    await client.close();
  }
})();

/**
 * Read-only Smoke-Test für den 32MB-Sort-Fix im Calendar-Notifier.
 *
 * Beweist (a) ob der Bug mit den echten Daten reproduzierbar ist und
 * (b) dass die reparierte Pipeline (mit $project) sauber durchläuft.
 *
 * SENDET KEINE Mails. SCHREIBT NICHTS. Reine Lese-Aggregation.
 *
 * Lauf:  node backend/scripts/smokeTestNotifierSort.js
 * (braucht MONGO_URI in backend/.env)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

// fixed=false → alte (buggy) Pipeline mit contract-$lookup (Vertrag an jedes Event).
// fixed=true  → der echte Fix: KEIN contract-$lookup (Embed wird nie gelesen).
function buildPipeline({ fixed, match }) {
  const stages = [{ $match: match }];
  if (!fixed) {
    stages.push(
      { $lookup: { from: "contracts", localField: "contractId", foreignField: "_id", as: "contract" } },
      { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } }
    );
  }
  stages.push(
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $sort: { date: 1, severity: -1 } }
  );
  return stages;
}

async function runCase(coll, label, match) {
  const count = await coll.countDocuments(match);
  console.log(`\n## ${label}  (${count} Match-Events)`);

  // OHNE Fix (alte Pipeline) — kann den 32MB-Fehler werfen
  process.stdout.write("   OHNE Fix : ");
  try {
    const t0 = Date.now();
    const r = await coll.aggregate(buildPipeline({ fixed: false, match })).toArray();
    console.log(`✅ lief durch (${r.length} Events, ${Date.now() - t0}ms) — Daten heute (noch) nicht groß genug zum Triggern`);
  } catch (e) {
    console.log(`💥 FEHLER = Bug reproduziert: ${e.codeName || e.code || ""} ${e.message}`);
  }

  // MIT Fix (kein contract-$lookup) — muss IMMER sauber durchlaufen
  process.stdout.write("   MIT Fix  : ");
  try {
    const t0 = Date.now();
    const r = await coll.aggregate(buildPipeline({ fixed: true, match })).toArray();
    console.log(`✅ lief durch (${r.length} Events, ${Date.now() - t0}ms) — KEIN 32MB-Fehler`);
  } catch (e) {
    console.log(`❌ UNERWARTET trotz Fix: ${e.codeName || e.code || ""} ${e.message}`);
  }
}

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error("❌ MONGO_URI fehlt (backend/.env)"); process.exit(1); }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const coll = client.db("contract_ai").collection("contract_events");
    const now = new Date();
    const wide = new Date(); wide.setFullYear(wide.getFullYear() + 5);

    console.log("Smoke-Test Calendar-Notifier 32MB-Sort  (READ-ONLY, keine Mails)\n================================================================");

    // 1) Faithful: exakt wie der Cron (status scheduled), aber weites 5-Jahres-Fenster
    await runCase(coll, "Faithful (status=scheduled, 5-Jahres-Fenster)", {
      date: { $gte: now, $lte: wide },
      status: "scheduled",
      severity: { $in: ["info", "warning", "critical"] },
    });

    // 2) Stress: ALLE Status im weiten Fenster → maximale Event-Menge, härtester Sort
    await runCase(coll, "Stress (ALLE Status, 5-Jahres-Fenster)", {
      date: { $gte: now, $lte: wide },
    });

    console.log("\n================================================================");
    console.log("Fertig. Erwartung: MIT Fix läuft IMMER durch. Wenn OHNE Fix 💥 wirft,");
    console.log("ist der Bug live reproduziert und der Fix nachweislich nötig+wirksam.\n");
  } finally {
    await client.close();
  }
})();

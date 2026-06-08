/**
 * Read-only Smoke-Test für den ICS-Feed-Speicher-Fix.
 *
 * Beweist: (a) die ICS-Ausgabe ist mit schlanken Verträgen (nur name/provider)
 * BYTE-IDENTISCH zur Ausgabe mit vollen Verträgen → Verhalten unverändert,
 * (b) wie viel Speicher der Strip spart.
 *
 * SENDET NICHTS, SCHREIBT NICHTS.
 * Lauf:  node backend/scripts/smokeTestIcsMemory.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient, ObjectId } = require("mongodb");
const { generateICSFeed } = require("../utils/icsGenerator");

const HEAVY_EMAIL = "2302test@flirt.ms";

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

    // Events laden (wie die ICS-Route)
    const allEvents = await db.collection("contract_events")
      .find({ userId, status: { $ne: "dismissed" } }).sort({ date: 1 }).toArray();
    const contractIds = [...new Set(allEvents.filter(e => e.contractId).map(e => e.contractId.toString()))];
    const ids = contractIds.map(id => new ObjectId(id));

    // ALT: volle Verträge   |   NEU: nur name+provider
    const full = ids.length ? await db.collection("contracts").find({ _id: { $in: ids } }).toArray() : [];
    const slim = ids.length ? await db.collection("contracts").find({ _id: { $in: ids } }, { projection: { name: 1, provider: 1 } }).toArray() : [];

    const mapFull = new Map(full.map(c => [c._id.toString(), c]));
    const mapSlim = new Map(slim.map(c => [c._id.toString(), c]));
    const evFull = allEvents.map(e => ({ ...e, contract: e.contractId ? mapFull.get(e.contractId.toString()) || null : null }));
    const evSlim = allEvents.map(e => ({ ...e, contract: e.contractId ? mapSlim.get(e.contractId.toString()) || null : null }));

    const icsFull = generateICSFeed(evFull);
    const icsSlim = generateICSFeed(evSlim);

    const bytesFull = Buffer.byteLength(JSON.stringify(full));
    const bytesSlim = Buffer.byteLength(JSON.stringify(slim));

    console.log(`Smoke-Test ICS-Feed Speicher  (READ-ONLY)\n=========================================`);
    console.log(`Account ${HEAVY_EMAIL}: ${allEvents.length} Events, ${contractIds.length} Verträge\n`);
    console.log(`Geladene Vertragsdaten:`);
    console.log(`  ALT (volle Docs) : ${(bytesFull / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  NEU (name+prov.) : ${(bytesSlim / 1024).toFixed(1)} KB`);
    console.log(`  Ersparnis        : ${(100 * (1 - bytesSlim / bytesFull)).toFixed(1)} %\n`);
    console.log(`ICS-Ausgabe (${icsFull.length} Zeichen):`);
    console.log(`  byte-identisch alt vs. neu: ${icsFull === icsSlim ? "✅ JA — Verhalten unverändert" : "❌ NEIN — Unterschied gefunden!"}`);

    console.log("\n(Read-only — nichts geschrieben.)\n");
  } finally {
    await client.close();
  }
})();

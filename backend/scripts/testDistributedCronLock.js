// 📁 backend/scripts/testDistributedCronLock.js
// Unit-/Integrations-Test für utils/distributedCronLock.js + den atomaren
// email_queue-Claim (emailRetryService.js).
//
// Beweist gegen die ECHTE DB + die ECHTE Lock-Funktion:
//   1) Zwei gleichzeitige Acquires desselben Jobs (gleicher Tag) → genau EINER läuft.
//   2) Fünf gleichzeitige Acquires → genau EINER läuft (Skalierung).
//   3) Verschiedene Job-Namen → BEIDE laufen (Lock isoliert pro Job).
//   4) Fail-open: DB-Fehler beim Lock → fn läuft trotzdem (kein Stummschalten).
//   5) Zweiter Lauf am selben Tag (sequenziell) → übersprungen.
//   6) Return-Wert + Exception propagieren korrekt durch den Wrapper.
//   7) Nach gleichzeitigen Acquires existiert GENAU 1 Lock-Doc in der DB.
//   8) email_queue ATOMARER CLAIM: zwei gleichzeitige {_id,status:'pending'}-Claims
//      → genau EINER bekommt modifiedCount=1 (= der sendet), der andere 0 (überspringt).
//   9) ECHTER MULTI-PROZESS-Test: N Kind-Prozesse acquiren denselben Lock → genau EINER läuft.
//
// Worker-Modus (für Test 9):  node testDistributedCronLock.js --worker <jobName>
// Normaler Aufruf:           node testDistributedCronLock.js

require("dotenv").config();
const database = require("../config/database");
const { withDistributedLock } = require("../utils/distributedCronLock");

const TEST_PREFIX = "__test_dcl__";

// ───────────────────────── Worker-Modus (Test 9) ─────────────────────────
if (process.argv.includes("--worker")) {
  const job = process.argv[process.argv.indexOf("--worker") + 1];
  (async () => {
    const db = await database.connect();
    let ran = false;
    await withDistributedLock(db, job, async () => { ran = true; })();
    process.stdout.write(ran ? "RESULT:RAN\n" : "RESULT:SKIPPED\n");
    process.exit(0);
  })().catch(e => { process.stdout.write(`RESULT:ERROR:${e.message}\n`); process.exit(2); });
  return;
}

// ───────────────────────── Test-Suite ─────────────────────────
const path = require("path");
const { spawn } = require("child_process");
let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`  ✅ ${msg}`);
  else { console.error(`  ❌ ${msg}`); failures++; }
}

async function cleanup(db) {
  await db.collection("cron_locks").deleteMany({ jobName: { $regex: `^${TEST_PREFIX}` } });
  await db.collection("cron_locks_test").deleteMany({});
}

function spawnWorker(job) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [__filename, "--worker", job], { cwd: path.join(__dirname, "..") });
    let out = "";
    child.stdout.on("data", d => { out += d.toString(); });
    child.on("close", () => {
      const m = out.match(/RESULT:(\w+)/);
      resolve(m ? m[1] : "NONE");
    });
  });
}

async function run() {
  const db = await database.connect();
  console.log("🔌 DB verbunden — starte Tests\n");
  try {
    await cleanup(db);

    console.log("Test 1: 2 gleichzeitige Acquires, gleicher Job/Tag");
    { const job = `${TEST_PREFIX}same`; let r = 0; const fn = async () => { r++; };
      await Promise.all([withDistributedLock(db, job, fn)(), withDistributedLock(db, job, fn)()]);
      assert(r === 1, `genau 1 Ausführung (war: ${r})`); }

    console.log("Test 2: 5 gleichzeitige Acquires, gleicher Job/Tag");
    { const job = `${TEST_PREFIX}five`; let r = 0; const fn = async () => { r++; };
      await Promise.all(Array.from({ length: 5 }, () => withDistributedLock(db, job, fn)()));
      assert(r === 1, `genau 1 von 5 (war: ${r})`); }

    console.log("Test 3: 2 verschiedene Jobs → beide laufen");
    { let a = 0, b = 0;
      await Promise.all([
        withDistributedLock(db, `${TEST_PREFIX}jobA`, async () => { a++; })(),
        withDistributedLock(db, `${TEST_PREFIX}jobB`, async () => { b++; })()]);
      assert(a === 1 && b === 1, `beide liefen (A=${a}, B=${b})`); }

    console.log("Test 4: Fail-open bei DB-Fehler");
    { let r = 0;
      const brokenDb = { collection: () => ({ insertOne: async () => { const e = new Error("simulierter DB-Ausfall"); e.code = 99; throw e; } }) };
      await withDistributedLock(brokenDb, `${TEST_PREFIX}failopen`, async () => { r++; })();
      assert(r === 1, `fn lief trotz Lock-Fehler (fail-open) (war: ${r})`); }

    console.log("Test 5: zweiter Lauf am selben Tag → übersprungen");
    { const job = `${TEST_PREFIX}seq`; let r = 0; const fn = async () => { r++; };
      await withDistributedLock(db, job, fn)();
      await withDistributedLock(db, job, fn)();
      assert(r === 1, `nur der erste Lauf zählte (war: ${r})`); }

    console.log("Test 6: Return-Wert + Exception propagieren");
    { const ret = await withDistributedLock(db, `${TEST_PREFIX}ret`, async () => "hallo")();
      assert(ret === "hallo", `Return-Wert durchgereicht (war: ${ret})`);
      let threw = false;
      try { await withDistributedLock(db, `${TEST_PREFIX}throw`, async () => { throw new Error("boom"); })(); }
      catch (e) { threw = e.message === "boom"; }
      assert(threw, `Exception propagiert`); }

    console.log("Test 7: nach gleichzeitigen Acquires existiert genau 1 Lock-Doc");
    { const job = `${TEST_PREFIX}count`;
      await Promise.all(Array.from({ length: 4 }, () => withDistributedLock(db, job, async () => {})()));
      const n = await db.collection("cron_locks").countDocuments({ jobName: job });
      assert(n === 1, `genau 1 Lock-Doc (war: ${n})`); }

    console.log("Test 8: email_queue ATOMARER CLAIM (Phase 2)");
    { // Simuliert die neue Claim-Logik aus emailRetryService.js gegen eine Scratch-Collection
      const col = db.collection("cron_locks_test");
      const ins = await col.insertOne({ status: "pending" });
      const id = ins.insertedId;
      const claimOnce = () => col.updateOne({ _id: id, status: "pending" }, { $set: { status: "processing" } });
      const [c1, c2] = await Promise.all([claimOnce(), claimOnce()]);
      const wins = [c1, c2].filter(c => c.modifiedCount === 1).length;
      assert(wins === 1, `genau 1 Claim gewann (war: ${wins}) → nur eine Instanz sendet`); }

    console.log("Test 9: ECHTER Multi-Prozess (3 Kind-Prozesse, gleicher Job)");
    { const job = `${TEST_PREFIX}mp`;
      await db.collection("cron_locks").deleteMany({ jobName: job });
      const results = await Promise.all([spawnWorker(job), spawnWorker(job), spawnWorker(job)]);
      const ran = results.filter(r => r === "RAN").length;
      console.log(`     Kind-Ergebnisse: ${results.join(", ")}`);
      assert(ran === 1, `genau 1 Kind-Prozess lief (war: ${ran})`); }

  } finally {
    await cleanup(db);
    console.log("\n🧹 Test-Daten aufgeräumt");
  }
  console.log(failures === 0 ? "\n✅ ALLE TESTS BESTANDEN" : `\n❌ ${failures} TEST(S) FEHLGESCHLAGEN`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => { console.error("💥 Test-Runner-Fehler:", err); process.exit(1); });

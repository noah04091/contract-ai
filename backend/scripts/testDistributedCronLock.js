// 📁 backend/scripts/testDistributedCronLock.js
// Unit-/Integration-Test für utils/distributedCronLock.js
//
// Beweist gegen die ECHTE DB + die ECHTE Lock-Funktion:
//   1) Zwei gleichzeitige Acquires desselben Jobs (gleicher Tag) → genau EINER läuft.
//   2) Fünf gleichzeitige Acquires → genau EINER läuft (Skalierung).
//   3) Verschiedene Job-Namen → BEIDE laufen (Lock isoliert pro Job).
//   4) Fail-open: DB-Fehler beim Lock → fn läuft trotzdem (kein Stummschalten).
//
// Räumt alle Test-Lock-Docs wieder weg (Job-Namen mit Prefix __test_dcl__).
// Aufruf:  node backend/scripts/testDistributedCronLock.js

require("dotenv").config();
const database = require("../config/database");
const { withDistributedLock } = require("../utils/distributedCronLock");

const TEST_PREFIX = "__test_dcl__";
let failures = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ ${msg}`);
  } else {
    console.error(`  ❌ ${msg}`);
    failures++;
  }
}

async function cleanup(db) {
  await db.collection("cron_locks").deleteMany({ jobName: { $regex: `^${TEST_PREFIX}` } });
}

async function run() {
  const db = await database.connect();
  console.log("🔌 DB verbunden — starte Tests\n");

  try {
    await cleanup(db);

    // ── Test 1: zwei gleichzeitige Acquires, gleicher Job → genau einer läuft ──
    console.log("Test 1: 2 gleichzeitige Acquires, gleicher Job/Tag");
    {
      const job = `${TEST_PREFIX}same`;
      let runs = 0;
      const fn = async () => { runs++; };
      await Promise.all([
        withDistributedLock(db, job, fn)(),
        withDistributedLock(db, job, fn)()
      ]);
      assert(runs === 1, `genau 1 Ausführung (war: ${runs})`);
    }

    // ── Test 2: fünf gleichzeitige Acquires → genau einer läuft ──
    console.log("Test 2: 5 gleichzeitige Acquires, gleicher Job/Tag");
    {
      const job = `${TEST_PREFIX}five`;
      let runs = 0;
      const fn = async () => { runs++; };
      await Promise.all(
        Array.from({ length: 5 }, () => withDistributedLock(db, job, fn)())
      );
      assert(runs === 1, `genau 1 Ausführung von 5 (war: ${runs})`);
    }

    // ── Test 3: verschiedene Jobs → beide laufen ──
    console.log("Test 3: 2 verschiedene Jobs → beide laufen");
    {
      let runsA = 0, runsB = 0;
      await Promise.all([
        withDistributedLock(db, `${TEST_PREFIX}jobA`, async () => { runsA++; })(),
        withDistributedLock(db, `${TEST_PREFIX}jobB`, async () => { runsB++; })()
      ]);
      assert(runsA === 1 && runsB === 1, `beide liefen (A=${runsA}, B=${runsB})`);
    }

    // ── Test 4: Fail-open bei DB-Fehler → fn läuft trotzdem ──
    console.log("Test 4: Fail-open bei DB-Fehler");
    {
      let runs = 0;
      // Fake-DB, deren insertOne einen NICHT-Duplicate-Fehler wirft
      const brokenDb = {
        collection: () => ({
          insertOne: async () => { const e = new Error("simulierter DB-Ausfall"); e.code = 99; throw e; }
        })
      };
      await withDistributedLock(brokenDb, `${TEST_PREFIX}failopen`, async () => { runs++; })();
      assert(runs === 1, `fn lief trotz Lock-Fehler (fail-open) (war: ${runs})`);
    }

    // ── Test 5: zweiter Lauf am selben Tag (sequenziell) → wird übersprungen ──
    console.log("Test 5: zweiter Lauf am selben Tag → übersprungen");
    {
      const job = `${TEST_PREFIX}seq`;
      let runs = 0;
      const fn = async () => { runs++; };
      await withDistributedLock(db, job, fn)(); // 1. Lauf: läuft
      await withDistributedLock(db, job, fn)(); // 2. Lauf: Lock existiert → skip
      assert(runs === 1, `nur der erste Lauf zählte (war: ${runs})`);
    }

  } finally {
    await cleanup(db);
    console.log("\n🧹 Test-Locks aufgeräumt");
  }

  console.log(failures === 0 ? "\n✅ ALLE TESTS BESTANDEN" : `\n❌ ${failures} TEST(S) FEHLGESCHLAGEN`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(err => {
  console.error("💥 Test-Runner-Fehler:", err);
  process.exit(1);
});

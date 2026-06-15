// 📁 backend/utils/distributedCronLock.js
// 🔐 Cross-Process Cron Lock — verhindert, dass ZWEI Server-Instanzen denselben
// Tages-Job gleichzeitig fahren (z.B. während eines Render Zero-Downtime-Deploys,
// wenn alte + neue Instanz kurz parallel laufen) und dadurch Mails doppeln.
//
// Mechanik:
// - Lock-Key = `${jobName}:YYYY-MM-DD` (Tages-Bucket, UTC).
// - Atomar über den von MongoDB IMMER vorhandenen Unique-Index auf `_id`:
//   zwei gleichzeitige insertOne mit gleichem _id → genau einer gewinnt,
//   der andere wirft E11000 (duplicate key) → überspringt.
// - Tages-Granularität ist straddle-sicher, weil alle Mail-Crons fern von Mitternacht
//   UTC feuern → ein 1-2s-Uhrenversatz zwischen Instanzen wechselt nie das Datum.
// - FAIL-OPEN bei unerwartetem DB-Fehler: lieber das seltene Duplikat (= heutiges
//   Verhalten) als versehentlich ALLE Mails stummschalten.
//
// Aufräumung: TTL-Index auf `expiresAt` (in server.js beim Cron-Setup erstellt).
// Die Korrektheit hängt NICHT vom TTL ab — nur das Wegräumen alter Lock-Docs.

function withDistributedLock(db, jobName, fn) {
  return async () => {
    const bucket = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC)
    const key = `${jobName}:${bucket}`;
    try {
      await db.collection("cron_locks").insertOne({
        _id: key,
        jobName,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6h, nur zur Aufräumung
      });
    } catch (e) {
      if (e.code === 11000) {
        console.warn(`⏭️ Cron ${jobName} übersprungen — andere Instanz hält heute den Lock (${bucket})`);
        return;
      }
      // Unerwarteter DB-Fehler → FAIL-OPEN: trotzdem laufen.
      console.error(`⚠️ Distributed-Lock ${jobName} Fehler (fail-open, laufe trotzdem): ${e.message}`);
    }
    return fn();
  };
}

module.exports = { withDistributedLock };

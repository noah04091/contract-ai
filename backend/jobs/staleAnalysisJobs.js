// 🆕 Stufe 5 (27.05.2026): Stale-Job-Recovery für analysis_jobs Collection.
//
// Hintergrund: Async-Pipeline läuft via setImmediate. Wenn Backend hart crasht
// (OOM, SIGKILL ohne Graceful-Shutdown) bleibt Job in status='processing' hängen
// — User sieht endloses "Analyse läuft" im Frontend.
//
// Recovery: alle 5 Min schaut dieser Cron nach Jobs mit
//   status in ['queued', 'processing'] AND updatedAt < now - 15 Min
// → markiert sie als 'failed' mit error.code='STALE_JOB_TIMEOUT'.
//
// Counter-Rollback: V1 Verzicht. Counter wird in der Pipeline-eigenen Catch-Logik
// zurückgerollt (analyze.js Z. ~5125). Bei Hard-Crash (Pipeline-Code wird nie zu
// Ende geführt) bleibt Counter +1 zu hoch — seltener Edge-Case, akzeptabler
// Driftpotential für V1. V2-Verbesserung post-launch: idempotentes counterState-
// Feld (Audit-Befund Agent 2).
//
// Lock-Cleanup: analysis_locks hat eigenes TTL 600s (10 Min) — räumt sich selbst.

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 Min

async function runStaleAnalysisJobsCleanup(db) {
  const col = db.collection('analysis_jobs');
  const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  const stale = await col.find({
    status: { $in: ['queued', 'processing'] },
    updatedAt: { $lt: threshold }
  }).limit(50).toArray();

  if (stale.length === 0) {
    return { marked: 0 };
  }

  console.log(`🧹 [stale-analysis-jobs] ${stale.length} hängende Jobs gefunden — markiere als failed`);

  let marked = 0;
  for (const job of stale) {
    try {
      const result = await col.updateOne(
        // Race-Schutz: nur markieren wenn Job-Status sich seit dem Find nicht geändert hat
        { _id: job._id, status: job.status },
        {
          $set: {
            status: 'failed',
            error: {
              code: 'STALE_JOB_TIMEOUT',
              message: `Job hängt seit >${Math.round(STALE_THRESHOLD_MS / 60000)} Min in Status '${job.status}' — vermutlich Backend-Crash. Bitte erneut versuchen.`,
              previousStatus: job.status
            },
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );
      if (result.modifiedCount === 1) {
        marked++;
        console.log(`   ↳ jobId=${job.jobId} userId=${job.userId} markiert (war: ${job.status}, last-update: ${job.updatedAt?.toISOString()})`);
      }
    } catch (markErr) {
      console.error(`   ↳ jobId=${job.jobId} mark-fail: ${markErr.message}`);
    }
  }

  return { marked, scanned: stale.length };
}

module.exports = { runStaleAnalysisJobsCleanup };

// backend/services/cronLogger.js
// Cron-Job Execution Logging - Protokolliert alle Cron-Job Ausführungen

let cronLogsCollection = null;

/**
 * Initialisiert die Cron-Logs Collection
 */
function initCronLogger(db) {
  if (db) {
    cronLogsCollection = db.collection('cron_logs');
    // Indexes für schnelle Abfragen
    cronLogsCollection.createIndex({ jobName: 1, startedAt: -1 }).catch(() => {});
    cronLogsCollection.createIndex({ status: 1 }).catch(() => {});
    cronLogsCollection.createIndex({ startedAt: -1 }).catch(() => {});
    // TTL Index: Logs nach 30 Tagen automatisch löschen
    cronLogsCollection.createIndex({ startedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }).catch(() => {});
    console.log('✅ Cron Logger initialisiert');
  }
}

/**
 * Startet das Logging für einen Cron-Job
 * @returns {string} logId für später
 */
async function startCronJob(jobName, metadata = {}) {
  if (!cronLogsCollection) return null;

  try {
    const logEntry = {
      jobName,
      status: 'running',
      startedAt: new Date(),
      metadata,
      environment: process.env.NODE_ENV || 'development'
    };

    const result = await cronLogsCollection.insertOne(logEntry);
    return result.insertedId.toString();
  } catch (error) {
    console.error('Cron Logger Error (start):', error.message);
    return null;
  }
}

/**
 * Beendet das Logging für einen Cron-Job (Erfolg)
 */
async function completeCronJob(logId, result = {}) {
  if (!cronLogsCollection || !logId) return;

  try {
    const { ObjectId } = require('mongodb');
    await cronLogsCollection.updateOne(
      { _id: new ObjectId(logId) },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          duration: Date.now() - (await cronLogsCollection.findOne({ _id: new ObjectId(logId) }))?.startedAt?.getTime(),
          result
        }
      }
    );
  } catch (error) {
    console.error('Cron Logger Error (complete):', error.message);
  }
}

/**
 * Markiert einen Cron-Job als fehlgeschlagen
 */
async function failCronJob(logId, error) {
  if (!cronLogsCollection || !logId) return;

  try {
    const { ObjectId } = require('mongodb');
    const logEntry = await cronLogsCollection.findOne({ _id: new ObjectId(logId) });

    await cronLogsCollection.updateOne(
      { _id: new ObjectId(logId) },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          duration: logEntry ? Date.now() - logEntry.startedAt?.getTime() : 0,
          error: {
            name: error?.name || 'Error',
            message: error?.message || 'Unknown error',
            stack: error?.stack || null
          }
        }
      }
    );
  } catch (err) {
    console.error('Cron Logger Error (fail):', err.message);
  }
}

/**
 * Holt die letzten Cron-Job Ausführungen
 */
async function getCronLogs(options = {}) {
  if (!cronLogsCollection) return { logs: [], stats: null };

  const { limit = 50, jobName = null, status = null, hoursBack = 24 } = options;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const query = { startedAt: { $gte: since } };
  if (jobName) query.jobName = jobName;
  if (status) query.status = status;

  try {
    const [logs, stats] = await Promise.all([
      // Letzte Logs
      cronLogsCollection
        .find(query)
        .sort({ startedAt: -1 })
        .limit(limit)
        .toArray(),

      // Statistiken
      cronLogsCollection.aggregate([
        { $match: { startedAt: { $gte: since } } },
        {
          $group: {
            _id: { jobName: '$jobName', status: '$status' },
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            lastRun: { $max: '$startedAt' }
          }
        },
        {
          $group: {
            _id: '$_id.jobName',
            runs: {
              $push: {
                status: '$_id.status',
                count: '$count',
                avgDuration: '$avgDuration'
              }
            },
            totalRuns: { $sum: '$count' },
            lastRun: { $max: '$lastRun' }
          }
        },
        { $sort: { lastRun: -1 } }
      ]).toArray()
    ]);

    return { logs, stats };
  } catch (error) {
    console.error('Cron Logger Error (get):', error.message);
    return { logs: [], stats: [] };
  }
}

/**
 * Holt den Status aller Cron-Jobs (für Dashboard)
 */
async function getCronJobStatus() {
  if (!cronLogsCollection) return [];

  try {
    // Für jeden Job den letzten Run holen
    const lastRuns = await cronLogsCollection.aggregate([
      {
        $sort: { startedAt: -1 }
      },
      {
        $group: {
          _id: '$jobName',
          lastRun: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$lastRun' }
      },
      {
        $project: {
          jobName: 1,
          status: 1,
          startedAt: 1,
          completedAt: 1,
          duration: 1,
          error: '$error.message'
        }
      },
      { $sort: { jobName: 1 } }
    ]).toArray();

    return lastRuns;
  } catch (error) {
    console.error('Cron Logger Error (status):', error.message);
    return [];
  }
}

/**
 * Wrapper-Funktion für einfaches Cron-Job Logging
 * Usage: await withCronLogging('job-name', async () => { ... })
 */
async function withCronLogging(jobName, fn, metadata = {}) {
  const logId = await startCronJob(jobName, metadata);

  try {
    const result = await fn();
    await completeCronJob(logId, typeof result === 'object' ? result : { result });
    return result;
  } catch (error) {
    await failCronJob(logId, error);
    throw error; // Re-throw damit der normale Error-Handler greift
  }
}

module.exports = {
  initCronLogger,
  startCronJob,
  completeCronJob,
  failCronJob,
  getCronLogs,
  getCronJobStatus,
  withCronLogging
};

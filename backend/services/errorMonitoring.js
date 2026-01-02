// 📁 backend/services/errorMonitoring.js
// 🚨 Eigenes Error Monitoring System - ohne externe Abhängigkeiten

const sendEmail = require('../utils/sendEmail');
const { generateEmailTemplate } = require('../utils/emailTemplate');

// In-Memory Cache für Fehler-Gruppierung (verhindert Spam)
const errorCache = new Map();
const ERROR_COOLDOWN_MS = 15 * 60 * 1000; // 15 Minuten zwischen gleichen Fehlern

// Konfiguration
const CONFIG = {
  // E-Mail-Empfänger für kritische Fehler
  alertEmail: process.env.ERROR_ALERT_EMAIL || process.env.ADMIN_EMAIL || null,

  // Minimale Severity für E-Mail-Benachrichtigung
  emailThreshold: 'high', // 'low', 'medium', 'high', 'critical'

  // Maximale Fehler pro Stunde bevor Throttling
  maxErrorsPerHour: 50,

  // Fehler-Zähler
  errorCountThisHour: 0,
  hourStartTime: Date.now()
};

// Severity-Level
const SEVERITY = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

// MongoDB Collection (wird beim ersten Aufruf initialisiert)
let errorsCollection = null;

/**
 * Initialisiert die Error-Collection
 */
function initErrorCollection(db) {
  if (db) {
    errorsCollection = db.collection('error_logs');
    // Index für schnelle Abfragen
    errorsCollection.createIndex({ timestamp: -1 }).catch(() => {});
    errorsCollection.createIndex({ fingerprint: 1 }).catch(() => {});
    errorsCollection.createIndex({ resolved: 1 }).catch(() => {});
    console.log('✅ Error Monitoring initialisiert');
  }
}

/**
 * Generiert einen Fingerprint für Fehler-Gruppierung
 */
function generateFingerprint(error, context = {}) {
  const parts = [
    error.name || 'Error',
    error.message?.substring(0, 100) || 'Unknown',
    context.route || 'unknown',
    context.method || 'unknown'
  ];
  return Buffer.from(parts.join('|')).toString('base64').substring(0, 32);
}

/**
 * Bestimmt die Severity eines Fehlers
 */
function determineSeverity(error, context = {}) {
  // Kritisch: Datenbank-Fehler, Auth-Fehler
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return 'critical';
  }
  if (context.route?.includes('/auth/') && error.status !== 401) {
    return 'high';
  }

  // Hoch: Server-Fehler (5xx)
  if (error.status >= 500 || error.statusCode >= 500) {
    return 'high';
  }

  // Medium: Unerwartete Fehler
  if (!error.status && !error.statusCode) {
    return 'medium';
  }

  // Niedrig: Client-Fehler (4xx)
  return 'low';
}

/**
 * Prüft ob für diesen Fehler kürzlich schon eine Benachrichtigung gesendet wurde
 */
function shouldNotify(fingerprint, severity) {
  const now = Date.now();
  const lastNotification = errorCache.get(fingerprint);

  // Prüfe Cooldown
  if (lastNotification && (now - lastNotification) < ERROR_COOLDOWN_MS) {
    return false;
  }

  // Prüfe Severity-Threshold
  if (SEVERITY[severity] < SEVERITY[CONFIG.emailThreshold]) {
    return false;
  }

  // Prüfe Rate-Limit
  if (now - CONFIG.hourStartTime > 60 * 60 * 1000) {
    CONFIG.errorCountThisHour = 0;
    CONFIG.hourStartTime = now;
  }

  if (CONFIG.errorCountThisHour >= CONFIG.maxErrorsPerHour) {
    console.warn('🚨 Error notification rate limit reached');
    return false;
  }

  return true;
}

/**
 * Sendet E-Mail-Benachrichtigung
 */
async function sendErrorNotification(errorData) {
  if (!CONFIG.alertEmail) {
    console.warn('⚠️ ERROR_ALERT_EMAIL nicht konfiguriert - keine Benachrichtigung gesendet');
    return;
  }

  try {
    const { error, context, severity, fingerprint, count } = errorData;

    const subject = `🚨 [${severity.toUpperCase()}] Fehler in Contract AI`;

    const html = generateEmailTemplate({
      title: 'Fehler erkannt',
      content: `
        <p>Ein Fehler wurde in Contract AI erkannt:</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Fehler:</strong> ${error.name || 'Error'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Nachricht:</strong> ${error.message || 'Keine Nachricht'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Severity:</strong> ${severity}</p>
          <p style="margin: 0 0 8px 0;"><strong>Route:</strong> ${context.route || 'Unbekannt'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Methode:</strong> ${context.method || 'Unbekannt'}</p>
          <p style="margin: 0 0 8px 0;"><strong>User:</strong> ${context.userId || 'Nicht eingeloggt'}</p>
          <p style="margin: 0;"><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
        </div>

        ${count > 1 ? `<p style="color: #b91c1c;">Dieser Fehler ist ${count}x aufgetreten.</p>` : ''}

        ${error.stack ? `
          <details style="margin-top: 16px;">
            <summary style="cursor: pointer; color: #6b7280;">Stack Trace anzeigen</summary>
            <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-top: 8px;">${error.stack}</pre>
          </details>
        ` : ''}
      `
    });

    await sendEmail({
      to: CONFIG.alertEmail,
      subject,
      html
    });

    console.log(`📧 Error-Benachrichtigung gesendet an ${CONFIG.alertEmail}`);
    CONFIG.errorCountThisHour++;

  } catch (emailError) {
    console.error('❌ Fehler beim Senden der Error-Benachrichtigung:', emailError.message);
  }
}

/**
 * Hauptfunktion: Fehler erfassen und verarbeiten
 */
async function captureError(error, context = {}) {
  try {
    const fingerprint = generateFingerprint(error, context);
    const severity = context.severity || determineSeverity(error, context);
    const timestamp = new Date();

    // Fehler-Dokument
    const errorDoc = {
      fingerprint,
      severity,
      timestamp,
      error: {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        code: error.code || null
      },
      context: {
        route: context.route || null,
        method: context.method || null,
        userId: context.userId || null,
        userEmail: context.userEmail || null,
        ip: context.ip || null,
        userAgent: context.userAgent || null,
        body: context.body ? JSON.stringify(context.body).substring(0, 500) : null,
        query: context.query ? JSON.stringify(context.query) : null
      },
      resolved: false,
      count: 1
    };

    // In MongoDB speichern (mit Gruppierung)
    if (errorsCollection) {
      const existing = await errorsCollection.findOne({
        fingerprint,
        resolved: false,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Letzten 24h
      });

      if (existing) {
        // Existierenden Fehler updaten
        await errorsCollection.updateOne(
          { _id: existing._id },
          {
            $inc: { count: 1 },
            $set: { lastOccurrence: timestamp }
          }
        );
        errorDoc.count = existing.count + 1;
      } else {
        // Neuen Fehler einfügen
        await errorsCollection.insertOne(errorDoc);
      }
    }

    // Console-Log
    console.error(`🚨 [${severity.toUpperCase()}] ${error.name}: ${error.message} (Route: ${context.route || 'unknown'})`);

    // E-Mail-Benachrichtigung
    if (shouldNotify(fingerprint, severity)) {
      errorCache.set(fingerprint, Date.now());
      await sendErrorNotification({ error, context, severity, fingerprint, count: errorDoc.count });
    }

    return { fingerprint, severity };

  } catch (captureError) {
    // Fehler beim Erfassen sollte nie die App crashen
    console.error('❌ Error Monitoring Fehler:', captureError.message);
    return null;
  }
}

/**
 * Express Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // Kontext aus Request extrahieren
  const context = {
    route: req.originalUrl || req.url,
    method: req.method,
    userId: req.user?.userId || null,
    userEmail: req.user?.email || null,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
    body: req.body,
    query: req.query
  };

  // Fehler erfassen (async, blockiert nicht)
  captureError(err, context).catch(() => {});

  // Response senden (wenn noch nicht gesendet)
  if (!res.headersSent) {
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode >= 500
        ? 'Ein interner Fehler ist aufgetreten. Unser Team wurde benachrichtigt.'
        : err.message || 'Ein Fehler ist aufgetreten.',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  }
}

/**
 * API-Endpoint für Fehler-Statistiken (Admin)
 */
async function getErrorStats(timeframeHours = 24) {
  if (!errorsCollection) {
    return { error: 'Error collection not initialized' };
  }

  const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

  const [total, bySeverity, topErrors, recentErrors] = await Promise.all([
    // Gesamtzahl
    errorsCollection.countDocuments({ timestamp: { $gte: since } }),

    // Nach Severity
    errorsCollection.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]).toArray(),

    // Top 5 häufigste Fehler
    errorsCollection.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: {
        _id: '$fingerprint',
        count: { $sum: '$count' },
        error: { $first: '$error' },
        route: { $first: '$context.route' },
        severity: { $first: '$severity' }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray(),

    // Letzte 10 Fehler
    errorsCollection.find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray()
  ]);

  return {
    timeframeHours,
    total,
    bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
    topErrors,
    recentErrors: recentErrors.map(e => ({
      timestamp: e.timestamp,
      severity: e.severity,
      error: e.error.name + ': ' + e.error.message.substring(0, 100),
      route: e.context?.route,
      count: e.count
    }))
  };
}

/**
 * Fehler als gelöst markieren
 */
async function resolveError(fingerprint) {
  if (!errorsCollection) return false;

  const result = await errorsCollection.updateMany(
    { fingerprint },
    { $set: { resolved: true, resolvedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

module.exports = {
  initErrorCollection,
  captureError,
  errorHandler,
  getErrorStats,
  resolveError,
  CONFIG
};

// 📁 backend/utils/emailLogger.js
// Zentraler Email-Logger — schreibt in die bestehende email_logs Collection.
// SICHERHEITS-GARANTIE: Fehler hier dürfen NIEMALS den Mail-Versand beeinflussen.
// Schema kompatibel mit sendEmailHtml.js (bestehende Einträge bleiben gültig).

const database = require('../config/database');

let indexesEnsured = false;

async function ensureIndexes(db) {
  if (indexesEnsured) return;
  try {
    const collection = db.collection('email_logs');
    await Promise.all([
      collection.createIndex({ sentAt: -1 }),
      collection.createIndex({ to: 1 }),
      collection.createIndex({ category: 1 }),
      collection.createIndex({ userId: 1 }),
      collection.createIndex({ status: 1 })
    ]);
    indexesEnsured = true;
  } catch (err) {
    // Index-Fehler sind nicht kritisch — Logging funktioniert auch ohne
    console.warn('[emailLogger] Index creation skipped:', err.message);
  }
}

/**
 * Loggt eine erfolgreich versendete E-Mail in die email_logs Collection.
 * Fire-and-forget: Fehler werden abgefangen und gelogged, aber nie weitergeworfen.
 *
 * @param {Object} entry
 * @param {string} entry.to - Empfänger
 * @param {string} entry.subject - Betreff
 * @param {string} [entry.category] - Kategorie (z.B. 'digest', 'verification', 'signature')
 * @param {string} [entry.userId] - User-ID falls bekannt
 * @param {string} [entry.messageId] - nodemailer messageId
 * @param {string} [entry.source] - Quell-Datei/Kontext (z.B. 'mailer.js', 'auth.js')
 */
async function logSentEmail(entry) {
  try {
    const db = await database.connect();
    await ensureIndexes(db);

    await db.collection('email_logs').insertOne({
      to: entry.to || null,
      subject: entry.subject || null,
      category: entry.category || 'general',
      userId: entry.userId || null,
      messageId: entry.messageId || null,
      source: entry.source || null,
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date()
    });
  } catch (err) {
    console.error('[emailLogger] logSentEmail failed (non-critical):', err.message);
  }
}

/**
 * Loggt einen fehlgeschlagenen E-Mail-Versuch.
 * Wird aktuell nicht automatisch befüllt — optional für manuelle Nutzung.
 */
async function logFailedEmail(entry) {
  try {
    const db = await database.connect();
    await ensureIndexes(db);

    await db.collection('email_logs').insertOne({
      to: entry.to || null,
      subject: entry.subject || null,
      category: entry.category || 'general',
      userId: entry.userId || null,
      source: entry.source || null,
      status: 'failed',
      error: entry.error || null,
      failedAt: new Date(),
      createdAt: new Date()
    });
  } catch (err) {
    console.error('[emailLogger] logFailedEmail failed (non-critical):', err.message);
  }
}

module.exports = { logSentEmail, logFailedEmail };

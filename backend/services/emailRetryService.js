// 📁 backend/services/emailRetryService.js
// Robuster E-Mail-Versand mit Retry-Mechanismus und exponential Backoff

const nodemailer = require("nodemailer");
const { analyzeBounce, recordBounce, isEmailActive } = require("./emailBounceService");
const { isUnsubscribed, getUnsubscribeHeaders, EMAIL_CATEGORIES } = require("./emailUnsubscribeService");

/**
 * Konfiguration für Retry-Mechanismus
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  // Backoff-Zeiten in Minuten: [sofort, 15 Min, 60 Min]
  backoffMinutes: [0, 15, 60],
  // Nach finalem Fehlschlag: Admin benachrichtigen
  notifyAdminOnFinalFailure: true
};

/**
 * E-Mail zur Queue hinzufügen
 * @param {Object} db - MongoDB-Instanz
 * @param {Object} emailData - E-Mail-Daten
 */
async function queueEmail(db, emailData) {
  const queueEntry = {
    // E-Mail-Daten
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    from: emailData.from || `"Contract AI" <${process.env.EMAIL_USER}>`,

    // Referenz-Daten
    eventId: emailData.eventId || null,
    userId: emailData.userId || null,
    emailType: emailData.emailType || "calendar_notification",

    // Retry-Tracking
    retryCount: 0,
    maxRetries: RETRY_CONFIG.maxRetries,
    status: "pending", // pending, processing, sent, failed

    // Zeitstempel
    createdAt: new Date(),
    nextRetryAt: new Date(), // Sofort beim ersten Versuch
    lastAttemptAt: null,
    sentAt: null,
    failedAt: null,

    // Fehler-Tracking
    errors: [],
    lastError: null
  };

  const result = await db.collection("email_queue").insertOne(queueEntry);
  console.log(`📧 E-Mail zur Queue hinzugefügt: ${emailData.subject} (ID: ${result.insertedId})`);

  return result.insertedId;
}

/**
 * Auto-Retry: Prueft nach 7 Tagen ob deaktivierte Emails wieder erreichbar sind.
 * Sendet eine Probe-Email; bei Erfolg wird die Adresse reaktiviert.
 */
async function attemptAutoRetry(db) {
  const autoRetryDays = 7;
  const cutoffDate = new Date(Date.now() - autoRetryDays * 24 * 60 * 60 * 1000);

  const candidates = await db.collection("email_health")
    .find({
      status: "inactive",
      deactivatedAt: { $lte: cutoffDate },
      autoRetryAttempted: { $ne: true }
    })
    .limit(5)
    .toArray();

  if (candidates.length === 0) return;

  console.log(`🔄 Auto-Retry: ${candidates.length} Kandidaten gefunden`);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  for (const candidate of candidates) {
    try {
      await transporter.sendMail({
        from: `"Contract AI" <${process.env.EMAIL_USER}>`,
        to: candidate.email,
        subject: "Contract AI — E-Mail-Verbindung wiederhergestellt",
        html: `<p>Gute Nachrichten! Ihre E-Mail-Adresse ist wieder erreichbar. Sie erhalten ab sofort wieder alle Benachrichtigungen von Contract AI.</p><p>Falls Sie keine Benachrichtigungen erhalten möchten, können Sie diese in Ihren <a href="https://contract-ai.de/profile">Profileinstellungen</a> deaktivieren.</p>`
      });

      const { reactivateEmail } = require("./emailBounceService");
      await reactivateEmail(db, candidate.email);

      await db.collection("email_queue").updateMany(
        { to: candidate.email, status: "skipped", skipReason: "email_inactive_bounce" },
        { $set: { status: "pending", nextRetryAt: new Date(), skipReason: null } }
      );

      console.log(`✅ Auto-Retry erfolgreich: ${candidate.email} reaktiviert`);
    } catch (error) {
      await db.collection("email_health").updateOne(
        { email: candidate.email },
        { $set: { autoRetryAttempted: true, autoRetryFailedAt: new Date(), updatedAt: new Date() } }
      );
      console.log(`❌ Auto-Retry fehlgeschlagen: ${candidate.email} - ${error.message}`);
    }
  }

  transporter.close();
}

/**
 * Verarbeitet die E-Mail-Queue
 * @param {Object} db - MongoDB-Instanz
 */
async function processEmailQueue(db) {
  const now = new Date();

  console.log("📬 Starte E-Mail Queue Verarbeitung...");

  // Auto-Retry-Probe fuer lange inaktive Emails
  try {
    await attemptAutoRetry(db);
  } catch (err) {
    console.error("⚠️ Auto-Retry Fehler (nicht kritisch):", err.message);
  }

  // Hole alle E-Mails die versendet werden sollten
  const pendingEmails = await db.collection("email_queue")
    .find({
      status: "pending",
      nextRetryAt: { $lte: now }
    })
    .sort({ createdAt: 1 }) // Älteste zuerst
    .limit(50) // Max 50 pro Durchlauf (Rate Limiting)
    .toArray();

  console.log(`📧 ${pendingEmails.length} E-Mails in der Queue gefunden`);

  if (pendingEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0, retrying: 0 };
  }

  // Nodemailer Transporter erstellen
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Verbindungs-Pool für bessere Performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });

  let stats = { processed: 0, sent: 0, failed: 0, retrying: 0 };

  for (const email of pendingEmails) {
    stats.processed++;

    // PRE-SEND CHECKS: Bounce-Status und Unsubscribe pruefen
    const emailActive = await isEmailActive(db, email.to);
    if (!emailActive) {
      console.log(`⏩ Ueberspringe inaktive E-Mail (Bounce): ${email.to}`);
      await db.collection("email_queue").updateOne(
        { _id: email._id },
        { $set: { status: "skipped", skipReason: "email_inactive_bounce", skippedAt: new Date() } }
      );
      continue;
    }

    const emailCategory = email.emailType?.startsWith("calendar_") ? EMAIL_CATEGORIES.CALENDAR : EMAIL_CATEGORIES.ALL;
    const unsubscribed = await isUnsubscribed(db, email.to, emailCategory);
    if (unsubscribed) {
      console.log(`⏩ Ueberspringe abgemeldete E-Mail: ${email.to}`);
      await db.collection("email_queue").updateOne(
        { _id: email._id },
        { $set: { status: "skipped", skipReason: "unsubscribed", skippedAt: new Date() } }
      );
      continue;
    }

    // Markiere als "processing" um Duplikate zu vermeiden
    await db.collection("email_queue").updateOne(
      { _id: email._id },
      { $set: { status: "processing", lastAttemptAt: new Date() } }
    );

    try {
      // Hole Unsubscribe-Headers fuer RFC 8058 Compliance
      const unsubHeaders = getUnsubscribeHeaders(email.to, emailCategory);

      // Versende E-Mail mit Unsubscribe-Headers
      await transporter.sendMail({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        headers: unsubHeaders
      });

      // Erfolg! Markiere als gesendet
      await db.collection("email_queue").updateOne(
        { _id: email._id },
        {
          $set: {
            status: "sent",
            sentAt: new Date(),
            lastError: null
          }
        }
      );

      console.log(`✅ E-Mail erfolgreich gesendet: ${email.subject} an ${email.to}`);
      stats.sent++;

      // Wenn Event-ID vorhanden, markiere Event als notified
      if (email.eventId) {
        await markEventAsNotified(db, email.eventId);
      }

    } catch (error) {
      console.error(`❌ E-Mail-Versand fehlgeschlagen: ${email.subject}`, error.message);

      // BOUNCE-ANALYSE: Bestimme Bounce-Typ und speichere
      const bounceInfo = analyzeBounce(error);
      await recordBounce(db, email.to, bounceInfo, {
        subject: email.subject,
        emailType: email.emailType,
        userId: email.userId
      });

      const newRetryCount = email.retryCount + 1;
      const errorInfo = {
        attempt: newRetryCount,
        timestamp: new Date(),
        message: error.message,
        code: error.code || "UNKNOWN",
        bounceType: bounceInfo.type
      };

      // Bei Hard Bounce: Sofort als failed markieren (kein Retry)
      if (bounceInfo.isHard || bounceInfo.isSpam) {
        console.log(`🚫 Hard Bounce erkannt - kein Retry: ${email.to}`);
        await db.collection("email_queue").updateOne(
          { _id: email._id },
          {
            $set: {
              status: "failed",
              failedAt: new Date(),
              lastError: error.message,
              bounceType: bounceInfo.type
            },
            $push: { errors: errorInfo }
          }
        );
        stats.failed++;
        continue;
      }

      if (newRetryCount >= RETRY_CONFIG.maxRetries) {
        // Maximale Versuche erreicht - als "failed" markieren
        await db.collection("email_queue").updateOne(
          { _id: email._id },
          {
            $set: {
              status: "failed",
              failedAt: new Date(),
              lastError: error.message
            },
            $push: { errors: errorInfo }
          }
        );

        console.error(`🚨 E-Mail endgültig fehlgeschlagen nach ${newRetryCount} Versuchen: ${email.subject}`);
        stats.failed++;

        // Admin benachrichtigen
        if (RETRY_CONFIG.notifyAdminOnFinalFailure) {
          await notifyAdminAboutFailure(db, email, error);
        }

      } else {
        // Berechne nächsten Retry-Zeitpunkt (exponential backoff)
        const backoffMinutes = RETRY_CONFIG.backoffMinutes[newRetryCount] || 60;
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await db.collection("email_queue").updateOne(
          { _id: email._id },
          {
            $set: {
              status: "pending",
              retryCount: newRetryCount,
              nextRetryAt: nextRetryAt,
              lastError: error.message
            },
            $push: { errors: errorInfo }
          }
        );

        console.log(`🔄 Retry ${newRetryCount}/${RETRY_CONFIG.maxRetries} geplant für ${nextRetryAt.toISOString()}: ${email.subject}`);
        stats.retrying++;
      }
    }
  }

  // Transporter schließen
  transporter.close();

  console.log(`📊 Queue-Verarbeitung abgeschlossen: ${stats.sent} gesendet, ${stats.retrying} warten auf Retry, ${stats.failed} fehlgeschlagen`);

  return stats;
}

/**
 * Markiert ein Event als "notified"
 */
async function markEventAsNotified(db, eventId) {
  try {
    const { ObjectId } = require("mongodb");
    await db.collection("contract_events").updateOne(
      { _id: new ObjectId(eventId) },
      {
        $set: {
          status: "notified",
          notifiedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error(`⚠️ Fehler beim Markieren von Event ${eventId} als notified:`, error.message);
  }
}

/**
 * Benachrichtigt Admin über endgültig fehlgeschlagene E-Mails
 */
async function notifyAdminAboutFailure(db, failedEmail, error) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@contract-ai.de";

    // Direkt senden (nicht über Queue, um Endlosschleife zu vermeiden)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    });

    await transporter.sendMail({
      from: `"Contract AI System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `🚨 E-Mail-Versand fehlgeschlagen: ${failedEmail.emailType}`,
      html: `
        <h2>E-Mail-Versand endgültig fehlgeschlagen</h2>

        <h3>Details:</h3>
        <ul>
          <li><strong>Empfänger:</strong> ${failedEmail.to}</li>
          <li><strong>Betreff:</strong> ${failedEmail.subject}</li>
          <li><strong>Typ:</strong> ${failedEmail.emailType}</li>
          <li><strong>Event-ID:</strong> ${failedEmail.eventId || 'N/A'}</li>
          <li><strong>User-ID:</strong> ${failedEmail.userId || 'N/A'}</li>
          <li><strong>Versuche:</strong> ${failedEmail.retryCount + 1}/${RETRY_CONFIG.maxRetries}</li>
        </ul>

        <h3>Letzter Fehler:</h3>
        <pre style="background: #fee2e2; padding: 10px; border-radius: 4px;">${error.message}</pre>

        <h3>Fehler-Historie:</h3>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px;">${JSON.stringify(failedEmail.errors, null, 2)}</pre>

        <p style="color: #6b7280; margin-top: 20px;">
          Bitte prüfen Sie die E-Mail-Konfiguration und den Empfänger.
        </p>
      `
    });

    transporter.close();
    console.log(`📧 Admin benachrichtigt über fehlgeschlagene E-Mail an ${failedEmail.to}`);

  } catch (adminError) {
    console.error("❌ Konnte Admin nicht benachrichtigen:", adminError.message);
  }
}

/**
 * Gibt Statistiken über die E-Mail-Queue zurück
 */
async function getQueueStats(db) {
  const stats = await db.collection("email_queue").aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  const result = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    total: 0
  };

  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }

  // Älteste pending E-Mail
  const oldestPending = await db.collection("email_queue")
    .findOne({ status: "pending" }, { sort: { createdAt: 1 } });

  if (oldestPending) {
    result.oldestPendingAge = Math.round((Date.now() - oldestPending.createdAt) / 1000 / 60); // in Minuten
  }

  return result;
}

/**
 * Bereinigt alte, erfolgreich gesendete E-Mails (älter als 7 Tage)
 */
async function cleanupOldEmails(db, daysToKeep = 7) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await db.collection("email_queue").deleteMany({
    status: "sent",
    sentAt: { $lt: cutoffDate }
  });

  console.log(`🧹 ${result.deletedCount} alte E-Mails aus Queue entfernt`);
  return result.deletedCount;
}

/**
 * Retry einer spezifischen fehlgeschlagenen E-Mail (manuell)
 */
async function retryFailedEmail(db, emailId) {
  const { ObjectId } = require("mongodb");

  const result = await db.collection("email_queue").updateOne(
    { _id: new ObjectId(emailId), status: "failed" },
    {
      $set: {
        status: "pending",
        retryCount: 0,
        nextRetryAt: new Date(),
        lastError: null
      },
      $push: {
        errors: {
          attempt: "manual_retry",
          timestamp: new Date(),
          message: "Manueller Retry durch Admin"
        }
      }
    }
  );

  return result.modifiedCount > 0;
}

module.exports = {
  queueEmail,
  processEmailQueue,
  getQueueStats,
  cleanupOldEmails,
  retryFailedEmail,
  RETRY_CONFIG
};

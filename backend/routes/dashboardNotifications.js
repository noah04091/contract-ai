// 📁 backend/routes/dashboardNotifications.js
// Dashboard Notifications API - Aggregiert alle Benachrichtigungen für das Dashboard

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const verifyToken = require("../middleware/verifyToken");
const { isEnterpriseOrHigher, getFeatureLimit } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const { getEmailHealth, reactivateEmail } = require("../services/emailBounceService");

// S3 für Profilbild-Upload
let S3Client, PutObjectCommand, s3Instance;
let S3_AVAILABLE = false;

try {
  const { S3Client: _S3Client, PutObjectCommand: _PutObjectCommand } = require("@aws-sdk/client-s3");
  S3Client = _S3Client;
  PutObjectCommand = _PutObjectCommand;

  s3Instance = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  S3_AVAILABLE = true;
  console.log("✅ [DASHBOARD] S3 configured for profile pictures");
} catch (error) {
  console.warn("⚠️ [DASHBOARD] S3 not available for profile pictures:", error.message);
}

let db;

// Simple in-memory rate limiter for search
const searchRateLimiter = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = searchRateLimiter.get(userId);

  if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    searchRateLimiter.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of searchRateLimiter.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      searchRateLimiter.delete(userId);
    }
  }
}, 300000);

// Connect to MongoDB via shared singleton pool
async function ensureDb() {
  if (db) return;
  db = await database.connect();
}
ensureDb().catch(err => console.error("❌ MongoDB-Fehler (dashboardNotifications):", err));

/**
 * GET /api/dashboard/notifications/summary
 * OPTIMIERT: Schnelles Dashboard-Summary für schnelleres Laden
 * Lädt nur Stats + letzte 5 Verträge + dringende Verträge
 */
router.get("/summary", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();
    const contractsCollection = db.collection("contracts");

    // ✅ FIX: Unterstütze BEIDE Formate (ObjectId UND String)
    const userIdFilter = {
      $or: [
        { userId: new ObjectId(userId) },
        { userId: userId }
      ]
    };

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    // 🚀 OPTIMIERT: Alle 6 Queries parallel statt sequentiell (Promise.all)
    const [statsResult, recentContracts, urgentContracts, generatedContracts, reminderContracts, user] = await Promise.all([
      // 1. Schnelle Stats mit aggregation
      contractsCollection.aggregate([
        { $match: userIdFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $or: [
                    { $gt: ["$expiryDate", in30Days] },
                    { $eq: ["$expiryDate", null] }
                  ]},
                  1, 0
                ]
              }
            },
            expiringSoon: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ["$expiryDate", null] },
                    { $gt: ["$expiryDate", now] },
                    { $lte: ["$expiryDate", in30Days] }
                  ]},
                  1, 0
                ]
              }
            },
            expired: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ["$expiryDate", null] },
                    { $lte: ["$expiryDate", now] }
                  ]},
                  1, 0
                ]
              }
            },
            generated: { $sum: { $cond: ["$isGenerated", 1, 0] } },
            analyzed: { $sum: { $cond: [{ $ne: ["$legalPulse.riskScore", null] }, 1, 0] } }
          }
        }
      ]).toArray(),

      // 2. Letzte 5 Verträge (nur essentielle Felder)
      contractsCollection
        .find(userIdFilter)
        .project({
          _id: 1, name: 1, status: 1, expiryDate: 1, createdAt: 1,
          uploadedAt: 1, isGenerated: 1, 'legalPulse.riskScore': 1
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),

      // 3. Dringende Verträge (nächste 30 Tage, max 4)
      contractsCollection
        .find({
          $and: [
            userIdFilter,
            { expiryDate: { $gt: now, $lte: in30Days } }
          ]
        })
        .project({
          _id: 1, name: 1, expiryDate: 1, 'legalPulse.riskScore': 1
        })
        .sort({ expiryDate: 1 })
        .limit(4)
        .toArray(),

      // 4. KI-Generierte Verträge (max 3)
      contractsCollection
        .find({
          $and: [
            userIdFilter,
            { isGenerated: true }
          ]
        })
        .project({
          _id: 1, name: 1, createdAt: 1, updatedAt: 1, isGenerated: 1
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),

      // 5. Gemerkte Verträge mit Erinnerung (max 3)
      contractsCollection
        .find({
          $and: [
            userIdFilter,
            { reminder: true }
          ]
        })
        .project({
          _id: 1, name: 1, expiryDate: 1, reminder: 1
        })
        .sort({ expiryDate: 1 })
        .limit(3)
        .toArray(),

      // 6. User-Daten (Abo, Quota)
      db.collection("users").findOne(
        { _id: new ObjectId(userId) },
        { projection: { email: 1, name: 1, subscriptionPlan: 1, analysisCount: 1, analysisLimit: 1, profilePicture: 1 } }
      )
    ]);

    const stats = statsResult[0] || {
      total: 0, active: 0, expiringSoon: 0, expired: 0, generated: 0, analyzed: 0
    };

    // 📊 ANALYSE LIMITS - Aus zentraler Konfiguration (subscriptionPlans.js)
    // WICHTIG: Infinity wird in JSON zu null, daher -1 als "unbegrenzt" verwenden
    const plan = user?.subscriptionPlan || 'free';
    const rawLimit = getFeatureLimit(plan, 'analyze');
    const analysisLimit = rawLimit === Infinity ? -1 : rawLimit;

    res.json({
      success: true,
      stats,
      recentContracts,
      urgentContracts,
      generatedContracts,
      reminderContracts,
      user: {
        email: user?.email,
        name: user?.name,
        subscriptionPlan: plan,
        analysisCount: user?.analysisCount || 0,
        analysisLimit: analysisLimit,
        profilePicture: user?.profilePicture
      }
    });

  } catch (error) {
    console.error('[DASHBOARD-SUMMARY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Dashboards',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/notifications/settings
 * Notification-Einstellungen abrufen
 * HINWEIS: Diese Route muss VOR den parametrisierten Routen stehen!
 */
router.get("/settings", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { notificationSettings: 1, emailPreferences: 1, emailOptOut: 1 } }
    );

    // Default-Einstellungen wenn keine vorhanden
    const defaultSettings = {
      email: {
        enabled: true,
        contractDeadlines: true,
        legalPulse: true,
        analysisComplete: true,
        signatureUpdates: true,
        weeklyReport: false
      },
      push: {
        enabled: false,
        contractDeadlines: true,
        legalPulse: true,
        analysisComplete: false,
        signatureUpdates: true
      },
      inApp: {
        enabled: true,
        contractDeadlines: true,
        legalPulse: true,
        analysisComplete: true,
        signatureUpdates: true
      },
      quietHours: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00"
      },
      deadlineReminders: {
        days7: true,
        days3: true,
        days1: true,
        daysSame: true
      }
    };

    const settings = user?.notificationSettings || defaultSettings;

    res.json({
      success: true,
      settings,
      marketing: {
        enabled: user?.emailPreferences?.marketing !== false && user?.emailOptOut !== true
      }
    });

  } catch (error) {
    console.error('[NOTIFICATION-SETTINGS] Error fetching:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Einstellungen',
      error: error.message
    });
  }
});

/**
 * PUT /api/dashboard/notifications/settings
 * Notification-Einstellungen speichern
 */
router.put("/settings", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Keine Einstellungen übermittelt'
      });
    }

    await ensureDb();

    // Validierung der Einstellungen
    const validatedSettings = {
      email: {
        enabled: Boolean(settings.email?.enabled),
        contractDeadlines: Boolean(settings.email?.contractDeadlines),
        legalPulse: Boolean(settings.email?.legalPulse),
        analysisComplete: Boolean(settings.email?.analysisComplete),
        signatureUpdates: Boolean(settings.email?.signatureUpdates),
        weeklyReport: Boolean(settings.email?.weeklyReport)
      },
      push: {
        enabled: Boolean(settings.push?.enabled),
        contractDeadlines: Boolean(settings.push?.contractDeadlines),
        legalPulse: Boolean(settings.push?.legalPulse),
        analysisComplete: Boolean(settings.push?.analysisComplete),
        signatureUpdates: Boolean(settings.push?.signatureUpdates)
      },
      inApp: {
        enabled: settings.inApp?.enabled !== false, // Default true
        contractDeadlines: settings.inApp?.contractDeadlines !== false,
        legalPulse: settings.inApp?.legalPulse !== false,
        analysisComplete: settings.inApp?.analysisComplete !== false,
        signatureUpdates: settings.inApp?.signatureUpdates !== false
      },
      quietHours: {
        enabled: Boolean(settings.quietHours?.enabled),
        startTime: settings.quietHours?.startTime || "22:00",
        endTime: settings.quietHours?.endTime || "08:00"
      },
      deadlineReminders: {
        days7: settings.deadlineReminders?.days7 !== false,
        days3: settings.deadlineReminders?.days3 !== false,
        days1: settings.deadlineReminders?.days1 !== false,
        daysSame: settings.deadlineReminders?.daysSame !== false
      }
    };

    const updateFields = {
      notificationSettings: validatedSettings,
      updatedAt: new Date()
    };

    // Marketing-Präferenz separat aktualisieren (sync mit Abmelde-Link)
    if (req.body.marketing !== undefined) {
      updateFields['emailPreferences.marketing'] = Boolean(req.body.marketing.enabled);
      updateFields['emailPreferencesUpdatedAt'] = new Date();
      // emailOptOut zurücksetzen wenn User Marketing wieder aktiviert
      if (req.body.marketing.enabled) {
        updateFields['emailOptOut'] = false;
      }
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );

    console.log(`✅ [NOTIFICATION-SETTINGS] Updated for user ${userId}`);

    res.json({
      success: true,
      message: 'Einstellungen gespeichert',
      settings: validatedSettings
    });

  } catch (error) {
    console.error('[NOTIFICATION-SETTINGS] Error saving:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der Einstellungen',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/notifications/email-status
 * Liefert den Email-Zustellungs-Status fuer den aktuellen User
 */
router.get("/email-status", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1 } }
    );

    if (!user?.email) {
      return res.status(404).json({ success: false, message: "User nicht gefunden" });
    }

    const health = await getEmailHealth(db, user.email);

    res.json({
      success: true,
      email: user.email,
      ...health
    });
  } catch (error) {
    console.error('[EMAIL-STATUS] Error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden des E-Mail-Status', error: error.message });
  }
});

/**
 * POST /api/dashboard/notifications/repair-email-queue
 * Repariert feststeckende Emails: setzt nextRetryAt auf jetzt fuer alle pending-Emails
 */
/**
 * POST /api/dashboard/notifications/test-smtp
 * Sendet EINE einzelne Test-Email und gibt das SMTP-Ergebnis zurueck.
 * Zeigt auch aktuelle Bounce-History fuer diese Email.
 */
router.post("/test-smtp", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, name: 1 } }
    );

    if (!user?.email) {
      return res.status(404).json({ success: false, message: "User nicht gefunden" });
    }

    const email = user.email.toLowerCase();

    // 1. Zeige letzte Bounce-Records fuer diese Email
    const recentBounces = await db.collection("email_bounces")
      .find({ email })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    // 2. Zeige aktuellen email_health Status
    const health = await db.collection("email_health").findOne({ email });

    // 3. Sende EINE Test-Email direkt (NICHT ueber Queue)
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    });

    let smtpResult = null;
    let smtpError = null;

    try {
      smtpResult = await transporter.sendMail({
        from: `"Contract AI" <${process.env.EMAIL_FROM || 'info@contract-ai.de'}>`,
        to: email,
        subject: "Contract AI — SMTP Test",
        html: `<p>Dies ist eine Test-Email von Contract AI.</p><p>Wenn du diese Email siehst, funktioniert der SMTP-Versand an ${email} korrekt.</p><p>Zeitstempel: ${new Date().toISOString()}</p>`
      });
    } catch (error) {
      smtpError = {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        response: error.response,
        command: error.command
      };
    }

    transporter.close();

    console.log(`🧪 [SMTP-TEST] User ${userId} (${email}): ${smtpResult ? 'SUCCESS' : 'FAILED'} ${smtpError ? smtpError.message : ''}`);

    res.json({
      success: true,
      email,
      smtpConfig: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER
      },
      smtpResult: smtpResult ? {
        accepted: smtpResult.accepted,
        rejected: smtpResult.rejected,
        response: smtpResult.response,
        messageId: smtpResult.messageId
      } : null,
      smtpError,
      emailHealth: health ? {
        status: health.status,
        hardBounces: health.hardBounces,
        softBounces: health.softBounces,
        deactivatedAt: health.deactivatedAt,
        deactivationReason: health.deactivationReason,
        lastBounceAt: health.lastBounceAt,
        reactivatedAt: health.reactivatedAt
      } : null,
      recentBounces: recentBounces.map(b => ({
        bounceType: b.bounceType,
        smtpCode: b.smtpCode,
        errorMessage: b.errorMessage?.substring(0, 200),
        emailSubject: b.emailSubject?.substring(0, 60),
        timestamp: b.timestamp
      }))
    });
  } catch (error) {
    console.error('[SMTP-TEST] Error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim SMTP-Test', error: error.message });
  }
});

router.post("/repair-email-queue", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1 } }
    );

    if (!user?.email) {
      return res.status(404).json({ success: false, message: "User nicht gefunden" });
    }

    const email = user.email.toLowerCase();

    // 0. ZUERST: Email-Health-Record anzeigen und FORCE-Reaktivieren
    const healthBefore = await db.collection("email_health").findOne({ email });
    // Auch mit Original-Case suchen falls unterschiedlich gespeichert
    const healthByOriginal = email !== user.email ? await db.collection("email_health").findOne({ email: user.email }) : null;
    // Auch alle email_health Records fuer diese Email finden
    const allHealthRecords = await db.collection("email_health").find({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).toArray();

    // FORCE: Alle email_health Records fuer diese Email auf active setzen
    const forceReactivate = await db.collection("email_health").updateMany(
      { email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      {
        $set: {
          status: "active",
          hardBounces: 0,
          softBounces: 0,
          deactivatedAt: null,
          deactivationReason: null,
          quarantinedAt: null,
          autoRetryAttempted: false,
          reactivatedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    const healthAfter = await db.collection("email_health").findOne({ email });

    // 1. Diagnose: Zeige alle Emails mit ihrem Status und nextRetryAt
    const allEmails = await db.collection("email_queue")
      .find({ to: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
      .project({ _id: 1, status: 1, nextRetryAt: 1, subject: 1, emailType: 1, createdAt: 1, skipReason: 1, to: 1 })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    // 2. Repariere: Setze alle pending-Emails mit fehlendem/null nextRetryAt
    const repairResult = await db.collection("email_queue").updateMany(
      {
        to: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        status: "pending",
        $or: [
          { nextRetryAt: null },
          { nextRetryAt: { $exists: false } }
        ]
      },
      { $set: { nextRetryAt: new Date() } }
    );

    // 3. Auch skipped-Emails von Bounce zurueck zu pending setzen
    const resetResult = await db.collection("email_queue").updateMany(
      { to: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, status: "skipped" },
      { $set: { status: "pending", nextRetryAt: new Date(), skipReason: null } }
    );

    // 4. Auch failed-Emails nochmal versuchen
    const retryResult = await db.collection("email_queue").updateMany(
      { to: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, status: "failed" },
      { $set: { status: "pending", nextRetryAt: new Date(), retryCount: 0, lastError: null } }
    );

    console.log(`🔧 [REPAIR-QUEUE] User ${userId}: forceReactivated=${forceReactivate.modifiedCount}, repaired=${repairResult.modifiedCount}, resetSkipped=${resetResult.modifiedCount}, retryFailed=${retryResult.modifiedCount}`);

    res.json({
      success: true,
      message: `Queue repariert.`,
      emailHealthBefore: healthBefore,
      emailHealthByOriginalCase: healthByOriginal,
      allHealthRecords: allHealthRecords.length,
      emailHealthAfter: healthAfter,
      forceReactivated: forceReactivate.modifiedCount,
      repaired: repairResult.modifiedCount,
      resetSkipped: resetResult.modifiedCount,
      retryFailed: retryResult.modifiedCount,
      emailsInQueue: allEmails.map(e => ({
        id: e._id.toString(),
        status: e.status,
        to: e.to,
        nextRetryAt: e.nextRetryAt,
        emailType: e.emailType,
        subject: e.subject?.substring(0, 50),
        skipReason: e.skipReason
      }))
    });
  } catch (error) {
    console.error('[REPAIR-QUEUE] Error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Reparieren', error: error.message });
  }
});

/**
 * POST /api/dashboard/notifications/reactivate-email
 * Reaktiviert eine gebounce-te Email-Adresse und setzt uebersprungene Emails zurueck
 */
router.post("/reactivate-email", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1 } }
    );

    if (!user?.email) {
      return res.status(404).json({ success: false, message: "User nicht gefunden" });
    }

    // 1. Email-Health zuruecksetzen
    const reactivated = await reactivateEmail(db, user.email);

    // 2. Uebersprungene Emails zurueck in die Queue
    const resetResult = await db.collection("email_queue").updateMany(
      { to: user.email, status: "skipped", skipReason: "email_inactive_bounce" },
      { $set: { status: "pending", nextRetryAt: new Date(), skipReason: null } }
    );

    // 3. Aktuellen Status zurueckgeben
    const health = await getEmailHealth(db, user.email);

    console.log(`✅ [REACTIVATE-EMAIL] User ${userId}: reactivated=${reactivated}, emailsReset=${resetResult.modifiedCount}`);

    res.json({
      success: true,
      message: `E-Mail-Zustellung reaktiviert. ${resetResult.modifiedCount} E-Mail(s) werden erneut versendet.`,
      emailsReset: resetResult.modifiedCount,
      ...health
    });
  } catch (error) {
    console.error('[REACTIVATE-EMAIL] Error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Reaktivieren', error: error.message });
  }
});

/**
 * GET /api/dashboard/notifications
 * Aggregiert alle Benachrichtigungen für das Dashboard:
 * - Ablaufende Verträge (Kalender-Events)
 * - Legal Pulse Alerts
 * - Kürzlich analysierte Verträge
 * - Signatur-Status-Updates
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, offset = 0, days = 7 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);
    const parsedOffset = parseInt(offset) || 0;
    const parsedDays = Math.min(parseInt(days) || 7, 90);
    await ensureDb();

    // User-Settings für In-App-Filterung laden
    const settingsUser = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { notificationSettings: 1 } }
    );
    const inApp = settingsUser?.notificationSettings?.inApp;

    // Master-Switch: wenn In-App komplett aus → leere Liste
    if (inApp?.enabled === false) {
      return res.json({
        success: true,
        notifications: [],
        stats: { total: 0, unread: 0, warnings: 0 },
        pagination: { offset: parsedOffset, limit: parsedLimit, hasMore: false }
      });
    }

    const now = new Date();
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parsedDays);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parsedDays);

    // Höhere Limits pro Quelle wenn mehr Tage angefragt
    const perSourceLimit = parsedDays > 7 ? 20 : 5;

    // 1. Ablaufende Verträge / Kalender-Events (nächste X Tage)
    const calendarEvents = await db.collection("contract_events")
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            date: { $gte: now, $lte: daysFromNow },
            status: { $in: ["scheduled", "notified"] }
          }
        },
        {
          $lookup: {
            from: "contracts",
            localField: "contractId",
            foreignField: "_id",
            as: "contract"
          }
        },
        { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } },
        { $sort: { date: 1 } },
        { $limit: perSourceLimit }
      ])
      .toArray();

    // 2. Legal Pulse Notifications (ungelesen oder aus dem Zeitraum)
    const pulseQuery = parsedDays > 7
      ? { userId: new ObjectId(userId), dismissed: false, createdAt: { $gte: daysAgo } }
      : { userId: new ObjectId(userId), read: false, dismissed: false };
    const pulseNotifications = await db.collection("pulsenotifications")
      .find(pulseQuery)
      .sort({ createdAt: -1 })
      .limit(perSourceLimit)
      .toArray();

    // 3. Kürzlich hochgeladene/analysierte Verträge (letzte X Tage)
    const recentContracts = await db.collection("contracts")
      .find({
        userId: new ObjectId(userId),
        $or: [
          { uploadedAt: { $gte: daysAgo } },
          { analyzedAt: { $gte: daysAgo } }
        ]
      })
      .sort({ uploadedAt: -1 })
      .limit(perSourceLimit)
      .toArray();

    // 4. Signatur-Status-Updates (letzte X Tage)
    const signatureUpdates = await db.collection("envelopes")
      .find({
        userId: new ObjectId(userId),
        updatedAt: { $gte: daysAgo },
        status: { $in: ["signed", "completed", "declined"] }
      })
      .sort({ updatedAt: -1 })
      .limit(perSourceLimit)
      .toArray();

    // Alle Benachrichtigungen zusammenführen und normalisieren
    const notifications = [];

    // Kalender-Events transformieren
    for (const event of calendarEvents) {
      const daysUntil = Math.ceil((new Date(event.date) - now) / (1000 * 60 * 60 * 24));

      let type = 'info';
      let title = event.title || 'Vertragserinnerung';

      if (event.type === 'LAST_CANCEL_DAY' || daysUntil <= 1) {
        type = 'warning';
        title = `DRINGEND: ${event.metadata?.contractName || 'Vertrag'} heute kündigen!`;
      } else if (event.type === 'CANCEL_WARNING' || daysUntil <= 3) {
        type = 'warning';
        title = `Kündigungsfrist in ${daysUntil} Tagen`;
      } else if (event.type === 'CANCEL_WINDOW_OPEN') {
        type = 'info';
        title = `Kündigungsfenster offen: ${event.metadata?.contractName || 'Vertrag'}`;
      }

      notifications.push({
        id: event._id.toString(),
        type,
        title,
        message: event.description || `${event.metadata?.contractName || 'Vertrag'} - ${daysUntil} Tage verbleibend`,
        time: formatRelativeTime(event.date),
        category: 'calendar',
        contractId: event.contractId?.toString(),
        actionUrl: `/contracts/${event.contractId}`,
        createdAt: event.date
      });
    }

    // Pulse Notifications transformieren
    for (const pulse of pulseNotifications) {
      let type = 'info';
      if (pulse.severity === 'critical' || pulse.severity === 'high') {
        type = 'warning';
      }

      notifications.push({
        id: pulse._id.toString(),
        type,
        title: pulse.title,
        message: pulse.description,
        time: formatRelativeTime(pulse.createdAt),
        category: 'pulse',
        contractId: pulse.contractId?.toString(),
        actionUrl: pulse.actionUrl || `/contracts/${pulse.contractId}`,
        createdAt: pulse.createdAt
      });
    }

    // Kürzlich analysierte Verträge
    for (const contract of recentContracts) {
      notifications.push({
        id: `analysis-${contract._id.toString()}`,
        type: 'success',
        title: 'Analyse abgeschlossen',
        message: `${contract.name} wurde analysiert`,
        time: formatRelativeTime(contract.analyzedAt || contract.uploadedAt),
        category: 'analysis',
        contractId: contract._id.toString(),
        actionUrl: `/contracts/${contract._id}`,
        createdAt: contract.analyzedAt || contract.uploadedAt
      });
    }

    // Signatur-Updates
    for (const envelope of signatureUpdates) {
      let title = 'Signatur-Update';
      let type = 'info';

      if (envelope.status === 'completed' || envelope.status === 'signed') {
        title = 'Vertrag unterschrieben';
        type = 'success';
      } else if (envelope.status === 'declined') {
        title = 'Signatur abgelehnt';
        type = 'warning';
      }

      notifications.push({
        id: envelope._id.toString(),
        type,
        title,
        message: envelope.name || 'Signaturanfrage',
        time: formatRelativeTime(envelope.updatedAt),
        category: 'signature',
        actionUrl: `/envelopes`,
        createdAt: envelope.updatedAt
      });
    }

    // Nach Typ-Präferenzen filtern
    const filtered = notifications.filter(n => {
      if (!inApp) return true;
      switch (n.category) {
        case 'calendar': return inApp.contractDeadlines !== false;
        case 'pulse': return inApp.legalPulse !== false;
        case 'signature': return inApp.signatureUpdates !== false;
        default: return true;
      }
    });

    // Nach Datum sortieren (neueste zuerst)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Statistiken berechnen (vor Pagination)
    const unreadCount = filtered.length;
    const warningCount = filtered.filter(n => n.type === 'warning').length;

    // Pagination anwenden
    const paginatedNotifications = filtered.slice(parsedOffset, parsedOffset + parsedLimit);

    res.json({
      success: true,
      notifications: paginatedNotifications,
      stats: {
        total: filtered.length,
        unread: unreadCount,
        warnings: warningCount
      },
      pagination: {
        offset: parsedOffset,
        limit: parsedLimit,
        hasMore: parsedOffset + parsedLimit < filtered.length
      }
    });

  } catch (error) {
    console.error('[DASHBOARD-NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benachrichtigungen',
      error: error.message
    });
  }
});

/**
 * PATCH /api/dashboard/notifications/:id/read
 * Markiert eine Benachrichtigung als gelesen
 */
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureDb();

    // Versuche in verschiedenen Collections zu finden
    let result = await db.collection("pulsenotifications").updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true, readAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      result = await db.collection("contract_events").updateOne(
        { _id: new ObjectId(id) },
        { $set: { read: true, readAt: new Date() } }
      );
    }

    res.json({
      success: true,
      message: 'Als gelesen markiert'
    });

  } catch (error) {
    console.error('[DASHBOARD-NOTIFICATIONS] Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren',
      error: error.message
    });
  }
});

/**
 * PATCH /api/dashboard/notifications/mark-all-read
 * Markiert alle Benachrichtigungen als gelesen
 */
router.patch("/mark-all-read", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    await Promise.all([
      db.collection("pulsenotifications").updateMany(
        { userId: new ObjectId(userId), read: false },
        { $set: { read: true, readAt: new Date() } }
      ),
      db.collection("contract_events").updateMany(
        { userId: new ObjectId(userId), read: { $ne: true } },
        { $set: { read: true, readAt: new Date() } }
      )
    ]);

    res.json({
      success: true,
      message: 'Alle Benachrichtigungen als gelesen markiert'
    });

  } catch (error) {
    console.error('[DASHBOARD-NOTIFICATIONS] Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren',
      error: error.message
    });
  }
});

/**
 * GET /api/dashboard/notifications/search
 * Schnelle Vertragssuche für die TopBar (Server-side mit Debounce)
 * Rate Limited: 30 requests per minute per user
 */
router.get("/search", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Rate Limit Check
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
        retryAfter: 60
      });
    }

    const { q = '', limit = 6 } = req.query;
    await ensureDb();

    if (!q.trim()) {
      return res.json({
        success: true,
        results: [],
        count: 0
      });
    }

    // Escape special regex characters
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const results = await db.collection("contracts")
      .find({
        userId: new ObjectId(userId),
        name: { $regex: escapedQuery, $options: 'i' }
      })
      .project({
        _id: 1,
        name: 1,
        status: 1,
        uploadedAt: 1,
        createdAt: 1
      })
      .sort({ uploadedAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      results: results.map(c => ({
        _id: c._id.toString(),
        name: c.name,
        status: c.status,
        date: c.uploadedAt || c.createdAt
      })),
      count: results.length
    });

  } catch (error) {
    console.error('[DASHBOARD-SEARCH] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche',
      error: error.message
    });
  }
});

/**
 * POST /api/dashboard/notifications/profile-picture
 * Upload eines Profilbildes (Base64)
 */
router.post("/profile-picture", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imageData } = req.body; // Base64 encoded image

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'Kein Bild-Daten vorhanden'
      });
    }

    // Validate base64 image
    const matches = imageData.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Bildformat. Erlaubt: JPEG, PNG, GIF, WebP'
      });
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Max 2MB
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Bild zu groß. Maximum: 2MB'
      });
    }

    await ensureDb();
    let profilePictureUrl = null;

    if (S3_AVAILABLE) {
      // Upload to S3
      const s3Key = `profile-pictures/${userId}.${imageType}`;
      const contentType = `image/${imageType === 'jpg' ? 'jpeg' : imageType}`;

      await s3Instance.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000' // 1 year cache
      }));

      // Generate public URL
      profilePictureUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      console.log(`✅ [PROFILE-PICTURE] Uploaded to S3: ${s3Key}`);
    } else {
      // Fallback: Store as data URL (not ideal but works)
      profilePictureUrl = imageData;
      console.log(`⚠️ [PROFILE-PICTURE] Stored as data URL (S3 not available)`);
    }

    // Update user in database
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          profilePicture: profilePictureUrl,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Profilbild erfolgreich hochgeladen',
      profilePicture: profilePictureUrl
    });

  } catch (error) {
    console.error('[PROFILE-PICTURE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Profilbildes',
      error: error.message
    });
  }
});

/**
 * DELETE /api/dashboard/notifications/profile-picture
 * Profilbild entfernen
 */
router.delete("/profile-picture", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await ensureDb();

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $unset: { profilePicture: "" },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({
      success: true,
      message: 'Profilbild entfernt'
    });

  } catch (error) {
    console.error('[PROFILE-PICTURE] Error removing:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen des Profilbildes',
      error: error.message
    });
  }
});

/**
 * Formatiert ein Datum relativ zur aktuellen Zeit
 */
function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Zukunft
  if (diffMs < 0) {
    const futureDays = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    if (futureDays === 0) return 'Heute';
    if (futureDays === 1) return 'Morgen';
    return `in ${futureDays} Tagen`;
  }

  // Vergangenheit
  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return then.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

module.exports = router;

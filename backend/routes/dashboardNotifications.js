// 📁 backend/routes/dashboardNotifications.js
// Dashboard Notifications API - Aggregiert alle Benachrichtigungen für das Dashboard

const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

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

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
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

// Connect to MongoDB
async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("contract-ai");
  }
  return db;
}

/**
 * GET /api/dashboard/notifications/summary
 * OPTIMIERT: Schnelles Dashboard-Summary für schnelleres Laden
 * Lädt nur Stats + letzte 5 Verträge + dringende Verträge
 */
router.get("/summary", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('[DASHBOARD-SUMMARY] 🔍 userId from token:', userId);

    const db = await connectDB();
    const contractsCollection = db.collection("contracts");

    // ✅ FIX: Unterstütze BEIDE Formate (ObjectId UND String)
    // Einige alte Verträge könnten userId als String gespeichert haben
    const userIdFilter = {
      $or: [
        { userId: new ObjectId(userId) },
        { userId: userId }
      ]
    };

    // DEBUG: Check contract counts
    const contractCountObjectId = await contractsCollection.countDocuments({ userId: new ObjectId(userId) });
    const contractCountString = await contractsCollection.countDocuments({ userId: userId });
    console.log('[DASHBOARD-SUMMARY] 📄 Contracts ObjectId:', contractCountObjectId, '| String:', contractCountString);

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    // 1. Schnelle Stats mit aggregation - nutze $or für beide Formate
    const statsResult = await contractsCollection.aggregate([
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
    ]).toArray();

    const stats = statsResult[0] || {
      total: 0, active: 0, expiringSoon: 0, expired: 0, generated: 0, analyzed: 0
    };

    // 2. Letzte 5 Verträge (nur essentielle Felder)
    const recentContracts = await contractsCollection
      .find(userIdFilter)
      .project({
        _id: 1, name: 1, status: 1, expiryDate: 1, createdAt: 1,
        uploadedAt: 1, isGenerated: 1, 'legalPulse.riskScore': 1
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // 3. Dringende Verträge (nächste 30 Tage, max 4)
    const urgentContracts = await contractsCollection
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
      .toArray();

    // 4. User-Daten (Abo, Quota)
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { email: 1, name: 1, subscriptionPlan: 1, analysisCount: 1, analysisLimit: 1, profilePicture: 1 } }
    );

    console.log('[DASHBOARD-SUMMARY] 👤 User found:', user ? `${user.email} (${user.subscriptionPlan})` : 'NOT FOUND!');
    console.log('[DASHBOARD-SUMMARY] 📊 Stats:', stats);
    console.log('[DASHBOARD-SUMMARY] 📄 Recent contracts:', recentContracts.length);

    res.json({
      success: true,
      stats,
      recentContracts,
      urgentContracts,
      user: {
        email: user?.email,
        name: user?.name,
        subscriptionPlan: user?.subscriptionPlan || 'free',
        analysisCount: user?.analysisCount || 0,
        analysisLimit: user?.analysisLimit || 3,
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
    const db = await connectDB();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { notificationSettings: 1 } }
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
      settings
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

    const db = await connectDB();

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

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          notificationSettings: validatedSettings,
          updatedAt: new Date()
        }
      }
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
    const { limit = 10 } = req.query;
    const db = await connectDB();

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // 1. Ablaufende Verträge / Kalender-Events (nächste 7 Tage)
    const calendarEvents = await db.collection("contract_events")
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            date: { $gte: now, $lte: sevenDaysFromNow },
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
        { $limit: 5 }
      ])
      .toArray();

    // 2. Legal Pulse Notifications (ungelesen)
    const pulseNotifications = await db.collection("pulsenotifications")
      .find({
        userId: new ObjectId(userId),
        read: false,
        dismissed: false
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // 3. Kürzlich hochgeladene/analysierte Verträge (letzte 24h)
    const recentContracts = await db.collection("contracts")
      .find({
        userId: new ObjectId(userId),
        $or: [
          { uploadedAt: { $gte: oneDayAgo } },
          { analyzedAt: { $gte: oneDayAgo } }
        ]
      })
      .sort({ uploadedAt: -1 })
      .limit(3)
      .toArray();

    // 4. Signatur-Status-Updates (letzte 24h)
    const signatureUpdates = await db.collection("envelopes")
      .find({
        userId: new ObjectId(userId),
        updatedAt: { $gte: oneDayAgo },
        status: { $in: ["signed", "completed", "declined"] }
      })
      .sort({ updatedAt: -1 })
      .limit(3)
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

    // Nach Datum sortieren (neueste zuerst)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit anwenden
    const limitedNotifications = notifications.slice(0, parseInt(limit));

    // Statistiken berechnen
    const unreadCount = notifications.length;
    const warningCount = notifications.filter(n => n.type === 'warning').length;

    res.json({
      success: true,
      notifications: limitedNotifications,
      stats: {
        total: notifications.length,
        unread: unreadCount,
        warnings: warningCount
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
    const db = await connectDB();

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
    const db = await connectDB();

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
    const db = await connectDB();

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

    const db = await connectDB();
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
    const db = await connectDB();

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

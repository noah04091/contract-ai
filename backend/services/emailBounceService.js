// backend/services/emailBounceService.js
// Bounce-Handling und E-Mail-Zustellungs-Tracking

const { ObjectId } = require("mongodb");

/**
 * Bounce-Typen und deren Behandlung
 */
const BOUNCE_TYPES = {
  HARD: "hard",   // Permanenter Fehler (ungueltige Adresse)
  SOFT: "soft",   // Temporaerer Fehler (Postfach voll, Server down)
  SPAM: "spam",   // Als Spam markiert
  UNKNOWN: "unknown"
};

/**
 * SMTP-Fehlercode zu Bounce-Typ Mapping
 */
const SMTP_ERROR_MAPPING = {
  // Hard Bounces (5xx permanent errors)
  "550": BOUNCE_TYPES.HARD,  // Mailbox not found
  "551": BOUNCE_TYPES.HARD,  // User not local
  "552": BOUNCE_TYPES.HARD,  // Mailbox full (treat as hard after multiple)
  "553": BOUNCE_TYPES.HARD,  // Mailbox name invalid
  "554": BOUNCE_TYPES.HARD,  // Transaction failed

  // Soft Bounces (4xx temporary errors)
  "421": BOUNCE_TYPES.SOFT,  // Service not available
  "450": BOUNCE_TYPES.SOFT,  // Mailbox busy
  "451": BOUNCE_TYPES.SOFT,  // Local error
  "452": BOUNCE_TYPES.SOFT,  // Insufficient storage

  // Spam-related
  "571": BOUNCE_TYPES.SPAM,  // Blocked as spam
  "550_spam": BOUNCE_TYPES.SPAM
};

/**
 * Schwellwerte fuer Bounce-Behandlung
 */
const BOUNCE_THRESHOLDS = {
  maxHardBounces: 1,      // Nach 1 Hard Bounce -> E-Mail deaktivieren
  maxSoftBounces: 5,      // Nach 5 Soft Bounces -> E-Mail deaktivieren
  softBounceResetDays: 30 // Soft Bounce Counter nach 30 Tagen zuruecksetzen
};

/**
 * Analysiert SMTP-Fehler und bestimmt Bounce-Typ
 * @param {Error} error - SMTP-Fehler
 * @returns {Object} - Bounce-Info
 */
function analyzeBounce(error) {
  const errorMessage = error.message || "";
  const errorCode = error.responseCode || error.code || "";

  // Extrahiere SMTP-Code aus Fehlermeldung
  const smtpCodeMatch = errorMessage.match(/\b([45]\d{2})\b/);
  const smtpCode = smtpCodeMatch ? smtpCodeMatch[1] : String(errorCode);

  // Bestimme Bounce-Typ
  let bounceType = BOUNCE_TYPES.UNKNOWN;

  if (SMTP_ERROR_MAPPING[smtpCode]) {
    bounceType = SMTP_ERROR_MAPPING[smtpCode];
  } else if (smtpCode.startsWith("5")) {
    bounceType = BOUNCE_TYPES.HARD;
  } else if (smtpCode.startsWith("4")) {
    bounceType = BOUNCE_TYPES.SOFT;
  }

  // Pruefe auf Spam-Indikatoren in der Nachricht
  const spamIndicators = ["spam", "blocked", "blacklist", "rejected", "abuse"];
  if (spamIndicators.some(ind => errorMessage.toLowerCase().includes(ind))) {
    bounceType = BOUNCE_TYPES.SPAM;
  }

  // Pruefe auf ungueltige E-Mail-Indikatoren
  const invalidIndicators = ["not found", "does not exist", "invalid", "unknown user", "no such user"];
  if (invalidIndicators.some(ind => errorMessage.toLowerCase().includes(ind))) {
    bounceType = BOUNCE_TYPES.HARD;
  }

  return {
    type: bounceType,
    code: smtpCode,
    message: errorMessage,
    isHard: bounceType === BOUNCE_TYPES.HARD,
    isSoft: bounceType === BOUNCE_TYPES.SOFT,
    isSpam: bounceType === BOUNCE_TYPES.SPAM
  };
}

/**
 * Speichert Bounce-Event in der Datenbank
 * @param {Object} db - MongoDB-Instanz
 * @param {string} email - E-Mail-Adresse
 * @param {Object} bounceInfo - Bounce-Informationen
 * @param {Object} emailData - Original E-Mail-Daten
 */
async function recordBounce(db, email, bounceInfo, emailData = {}) {
  const bounceRecord = {
    email: email.toLowerCase(),
    bounceType: bounceInfo.type,
    smtpCode: bounceInfo.code,
    errorMessage: bounceInfo.message,
    emailSubject: emailData.subject || null,
    emailType: emailData.emailType || null,
    userId: emailData.userId || null,
    timestamp: new Date()
  };

  // Speichere Bounce-Event
  await db.collection("email_bounces").insertOne(bounceRecord);

  // Aktualisiere Email-Health-Record
  await updateEmailHealth(db, email, bounceInfo);

  console.log(`📫 Bounce recorded: ${email} (${bounceInfo.type}) - ${bounceInfo.code}`);

  return bounceRecord;
}

/**
 * Aktualisiert den "Gesundheitszustand" einer E-Mail-Adresse
 */
async function updateEmailHealth(db, email, bounceInfo) {
  const emailLower = email.toLowerCase();
  const now = new Date();

  // Hole oder erstelle Email-Health-Record
  let health = await db.collection("email_health").findOne({ email: emailLower });

  if (!health) {
    health = {
      email: emailLower,
      status: "active",
      hardBounces: 0,
      softBounces: 0,
      lastBounceAt: null,
      lastSoftBounceAt: null,
      deactivatedAt: null,
      deactivationReason: null,
      createdAt: now
    };
  }

  // Soft Bounce Counter zuruecksetzen nach X Tagen
  if (health.lastSoftBounceAt) {
    const daysSinceLastSoft = (now - health.lastSoftBounceAt) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSoft > BOUNCE_THRESHOLDS.softBounceResetDays) {
      health.softBounces = 0;
    }
  }

  // Update basierend auf Bounce-Typ
  if (bounceInfo.isHard) {
    health.hardBounces++;
    health.lastBounceAt = now;
  } else if (bounceInfo.isSoft) {
    health.softBounces++;
    health.lastBounceAt = now;
    health.lastSoftBounceAt = now;
  } else if (bounceInfo.isSpam) {
    health.hardBounces++; // Spam als Hard Bounce behandeln
    health.lastBounceAt = now;
  }

  // Pruefe ob E-Mail deaktiviert werden soll
  let shouldDeactivate = false;
  let deactivationReason = null;

  if (health.hardBounces >= BOUNCE_THRESHOLDS.maxHardBounces) {
    shouldDeactivate = true;
    deactivationReason = `Hard Bounce Limit erreicht (${health.hardBounces}/${BOUNCE_THRESHOLDS.maxHardBounces})`;
  } else if (health.softBounces >= BOUNCE_THRESHOLDS.maxSoftBounces) {
    shouldDeactivate = true;
    deactivationReason = `Soft Bounce Limit erreicht (${health.softBounces}/${BOUNCE_THRESHOLDS.maxSoftBounces})`;
  } else if (bounceInfo.isSpam) {
    shouldDeactivate = true;
    deactivationReason = "Als Spam markiert";
  }

  if (shouldDeactivate && health.status !== "inactive") {
    health.status = "inactive";
    health.deactivatedAt = now;
    health.deactivationReason = deactivationReason;

    console.log(`🚫 E-Mail deaktiviert: ${emailLower} - ${deactivationReason}`);

    // Benachrichtige User wenn moeglich
    await notifyUserAboutDeactivation(db, emailLower, deactivationReason);
  }

  health.updatedAt = now;

  // Upsert Email-Health-Record
  await db.collection("email_health").updateOne(
    { email: emailLower },
    { $set: health },
    { upsert: true }
  );

  return health;
}

/**
 * Prueft ob eine E-Mail-Adresse aktiv ist (nicht gebounced)
 */
async function isEmailActive(db, email) {
  const health = await db.collection("email_health").findOne({
    email: email.toLowerCase()
  });

  // Keine Historie = aktiv
  if (!health) return true;

  return health.status === "active";
}

/**
 * Benachrichtigt User ueber deaktivierte E-Mail (falls moeglich)
 */
async function notifyUserAboutDeactivation(db, email, reason) {
  try {
    const user = await db.collection("users").findOne({ email: email.toLowerCase() });

    if (user) {
      // Erstelle In-App Notification
      await db.collection("notifications").insertOne({
        userId: user._id,
        type: "email_deactivated",
        title: "E-Mail-Zustellung fehlgeschlagen",
        message: `Wir konnten keine E-Mails an ${email} zustellen. Bitte pruefe deine E-Mail-Adresse in den Profileinstellungen.`,
        reason: reason,
        read: false,
        createdAt: new Date()
      });

      console.log(`📩 In-App Notification erstellt fuer User ${user._id}`);
    }
  } catch (error) {
    console.error("Fehler beim Erstellen der Deaktivierungs-Notification:", error.message);
  }
}

/**
 * Reaktiviert eine E-Mail-Adresse (z.B. nach User-Korrektur)
 */
async function reactivateEmail(db, email) {
  const result = await db.collection("email_health").updateOne(
    { email: email.toLowerCase() },
    {
      $set: {
        status: "active",
        hardBounces: 0,
        softBounces: 0,
        deactivatedAt: null,
        deactivationReason: null,
        reactivatedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  console.log(`✅ E-Mail reaktiviert: ${email}`);
  return result.modifiedCount > 0;
}

/**
 * Holt Bounce-Statistiken
 */
async function getBounceStats(db, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await db.collection("email_bounces").aggregate([
    { $match: { timestamp: { $gte: cutoffDate } } },
    {
      $group: {
        _id: "$bounceType",
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  const deactivatedCount = await db.collection("email_health").countDocuments({
    status: "inactive"
  });

  return {
    period: `${days} Tage`,
    bounces: Object.fromEntries(stats.map(s => [s._id, s.count])),
    totalBounces: stats.reduce((sum, s) => sum + s.count, 0),
    deactivatedEmails: deactivatedCount
  };
}

/**
 * Bereinigt alte Bounce-Records
 */
async function cleanupOldBounces(db, daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await db.collection("email_bounces").deleteMany({
    timestamp: { $lt: cutoffDate }
  });

  console.log(`🧹 ${result.deletedCount} alte Bounce-Records entfernt`);
  return result.deletedCount;
}

module.exports = {
  BOUNCE_TYPES,
  BOUNCE_THRESHOLDS,
  analyzeBounce,
  recordBounce,
  isEmailActive,
  reactivateEmail,
  getBounceStats,
  cleanupOldBounces
};

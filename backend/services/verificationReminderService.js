// 📁 backend/services/verificationReminderService.js
// Automatische Erinnerungs-E-Mails für nicht verifizierte Accounts
// V2: Wiederkehrend alle 30 Tage, Opt-Out möglich, Auto-Stop nach 6 Monaten

const database = require("../config/database");
const sendEmail = require("../utils/sendEmail");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { generateUnsubscribeUrl } = require("./emailUnsubscribeService");
const { logSentEmail } = require("../utils/emailLogger");
require("dotenv").config();

// Konfiguration
const REMINDER_INTERVAL_DAYS = 30; // Alle 30 Tage wiederholen
const MIN_AGE_DAYS = 2; // Frühestens 2 Tage nach Registrierung
const MAX_AGE_DAYS = 180; // Auto-Stop nach 6 Monaten
const SEND_DELAY_MS = 2000; // 2s zwischen Mails (SMTP-Safety)

/**
 * Sendet wiederkehrende Verifizierungs-Erinnerungen an nicht verifizierte User.
 * - Alle 30 Tage (konfigurierbar)
 * - Frühestens 2 Tage nach Registrierung
 * - Auto-Stop nach 6 Monaten
 * - Opt-Out via Unsubscribe-Link (Kategorie: verification_reminder)
 */
async function sendVerificationReminders() {
  try {
    const db = await database.connect();
    const usersCollection = db.collection("users");

    console.log(`📧 [VERIFICATION REMINDER V2] Suche nicht verifizierte Accounts...`);

    const now = new Date();
    const minAge = new Date(now.getTime() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
    const maxAge = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    const reminderThreshold = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    // Finde User die:
    // 1. Nicht verifiziert
    // 2. Zwischen 2 Tagen und 6 Monaten alt
    // 3. Letzte Erinnerung entweder nie oder > 30 Tage her
    const unverifiedUsers = await usersCollection.find({
      verified: false,
      email: { $exists: true, $nin: [null, ''] },
      createdAt: { $lte: minAge, $gte: maxAge },
      $or: [
        { lastVerificationReminderAt: { $exists: false } },
        { lastVerificationReminderAt: null },
        { lastVerificationReminderAt: { $lte: reminderThreshold } }
      ]
    }).limit(200).toArray();

    console.log(`📧 [VERIFICATION REMINDER V2] ${unverifiedUsers.length} User gefunden`);

    if (unverifiedUsers.length === 0) {
      return { success: true, sent: 0, skipped: 0, optedOut: 0, message: "Keine Erinnerungen zu senden" };
    }

    // Opt-Out prüfen: Wer hat sich aus verification_reminder oder all abgemeldet?
    const emails = unverifiedUsers.map((u) => u.email);
    const optOuts = await db.collection('email_unsubscribes').find({
      email: { $in: emails },
      $or: [
        { category: 'verification_reminder' },
        { category: 'all' }
      ]
    }).project({ email: 1 }).toArray();
    const optOutEmails = new Set(optOuts.map((o) => o.email));

    let sentCount = 0;
    let errorCount = 0;
    let optedOutCount = 0;
    let skippedCount = 0;

    for (const user of unverifiedUsers) {
      // Opt-Out Check
      if (optOutEmails.has(user.email)) {
        optedOutCount++;
        continue;
      }

      // Email-Health Check (kein Send an kaputte Adressen)
      const health = await db.collection('email_health').findOne({ email: user.email, status: { $in: ['inactive', 'quarantine'] } });
      if (health) {
        skippedCount++;
        continue;
      }

      try {
        // Verifizierungs-Link
        const verificationUrl = user.verificationToken
          ? `https://www.contract-ai.de/verify-email?token=${user.verificationToken}`
          : `https://www.contract-ai.de/login`;

        // Opt-Out Link (nutzt bestehendes Unsubscribe-System)
        const optOutUrl = generateUnsubscribeUrl(user.email, 'verification_reminder');

        // Berechne wie lange der User schon registriert ist
        const daysSinceRegistration = Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        const emailHtml = generateEmailTemplate({
          title: "Deine Registrierung wartet noch",
          preheader: "Nur noch ein Klick zur Aktivierung deines Contract AI Accounts",
          body: `
            <p style="margin-bottom: 20px;">
              Hallo${user.firstName ? ` ${user.firstName}` : ''},
            </p>

            <p style="margin-bottom: 20px;">
              du hast dich vor <strong>${daysSinceRegistration} Tagen</strong> bei Contract AI registriert,
              aber deine E-Mail-Adresse noch nicht bestätigt.
            </p>

            <p style="margin-bottom: 25px;">
              Ohne Bestätigung kannst du Contract AI leider nicht vollständig nutzen.
              Es dauert nur einen Klick!
            </p>

            <div style="background-color: #f0f7ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
              <p style="margin: 0; text-align: center; color: #1d4ed8;">
                <strong>Was du mit Contract AI machen kannst:</strong>
              </p>
              <ul style="margin: 15px 0 0 0; padding-left: 20px; color: #555;">
                <li style="margin-bottom: 8px;">Verträge in Sekunden analysieren</li>
                <li style="margin-bottom: 8px;">Risiken automatisch erkennen</li>
                <li style="margin-bottom: 8px;">Rechtssichere Optimierungsvorschläge</li>
                <li>3 kostenlose Analysen zum Testen</li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 30px;">
              Du möchtest keine Erinnerungen mehr?
              <a href="${optOutUrl}" style="color: #64748b; text-decoration: underline;">Erinnerungen abbestellen</a>
            </p>
          `,
          cta: {
            url: verificationUrl,
            text: "E-Mail jetzt bestätigen"
          }
        });

        await sendEmail({
          to: user.email,
          subject: "Erinnerung: Deine Contract AI Registrierung wartet",
          html: emailHtml
        });

        // Update: Zeitstempel statt Boolean (ermöglicht wiederkehrende Sends)
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              lastVerificationReminderAt: new Date(),
              verificationReminderCount: (user.verificationReminderCount || 0) + 1
            }
          }
        );

        logSentEmail({
          to: user.email,
          subject: "Erinnerung: Deine Contract AI Registrierung wartet",
          category: 'verification_reminder',
          userId: user._id ? String(user._id) : null,
          source: 'services/verificationReminderService.js'
        }).catch(() => {});

        sentCount++;
        console.log(`✅ [VERIFICATION REMINDER] Erinnerung #${(user.verificationReminderCount || 0) + 1} gesendet an: ${user.email}`);

        // Delay zwischen Sends
        if (sentCount < unverifiedUsers.length) {
          await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
        }

      } catch (emailError) {
        errorCount++;
        console.error(`❌ [VERIFICATION REMINDER] Fehler bei ${user.email}:`, emailError.message);
      }
    }

    console.log(`📧 [VERIFICATION REMINDER V2] Fertig: ${sentCount} gesendet, ${optedOutCount} opted-out, ${skippedCount} übersprungen, ${errorCount} Fehler`);

    return {
      success: true,
      sent: sentCount,
      optedOut: optedOutCount,
      skipped: skippedCount,
      errors: errorCount,
      total: unverifiedUsers.length
    };

  } catch (error) {
    console.error("❌ [VERIFICATION REMINDER V2] Allgemeiner Fehler:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Statistiken über nicht verifizierte Accounts
 */
async function getUnverifiedStats() {
  const db = await database.connect();
  const usersCollection = db.collection("users");

  const now = new Date();
  const maxAge = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const reminderThreshold = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const [total, eligible, optedOut, reminded] = await Promise.all([
    usersCollection.countDocuments({ verified: false }),
    usersCollection.countDocuments({
      verified: false,
      createdAt: { $gte: maxAge },
      $or: [
        { lastVerificationReminderAt: { $exists: false } },
        { lastVerificationReminderAt: null },
        { lastVerificationReminderAt: { $lte: reminderThreshold } }
      ]
    }),
    db.collection('email_unsubscribes').countDocuments({
      $or: [
        { category: 'verification_reminder' },
        { category: 'all' }
      ]
    }),
    usersCollection.countDocuments({
      lastVerificationReminderAt: { $exists: true, $ne: null }
    })
  ]);

  return {
    totalUnverified: total,
    eligibleForReminder: eligible,
    optedOutCount: optedOut,
    remindersSentTotal: reminded,
    intervalDays: REMINDER_INTERVAL_DAYS,
    maxAgeDays: MAX_AGE_DAYS
  };
}

module.exports = {
  sendVerificationReminders,
  getUnverifiedStats,
  REMINDER_INTERVAL_DAYS,
  MAX_AGE_DAYS
};

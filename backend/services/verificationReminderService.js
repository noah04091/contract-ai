// 📁 backend/services/verificationReminderService.js
// Automatische Erinnerungs-E-Mails für nicht verifizierte Accounts

const { MongoClient } = require("mongodb");
const sendEmail = require("../utils/sendEmail");
const generateEmailTemplate = require("../utils/emailTemplate");
require("dotenv").config();

/**
 * Sendet Erinnerungs-E-Mails an User, die sich vor X Tagen registriert haben
 * aber ihre E-Mail noch nicht verifiziert haben.
 *
 * @param {number} daysAfterRegistration - Nach wie vielen Tagen erinnern (default: 2)
 */
async function sendVerificationReminders(daysAfterRegistration = 2) {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");

    console.log(`📧 [VERIFICATION REMINDER] Suche nicht verifizierte Accounts (${daysAfterRegistration} Tage alt)...`);

    // Berechne das Zeitfenster: Genau X Tage alt (nicht älter, nicht neuer)
    const now = new Date();

    // Untere Grenze: Registrierung vor mindestens X Tagen
    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() - daysAfterRegistration);
    minDate.setHours(0, 0, 0, 0);

    // Obere Grenze: Registrierung vor höchstens X+1 Tagen (um nur 1x zu erinnern)
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() - daysAfterRegistration + 1);
    maxDate.setHours(0, 0, 0, 0);

    // Finde User die:
    // 1. Nicht verifiziert sind
    // 2. Sich vor genau X Tagen registriert haben
    // 3. Noch keine Erinnerung bekommen haben
    const unverifiedUsers = await usersCollection.find({
      verified: false,
      createdAt: {
        $gte: minDate,
        $lt: maxDate
      },
      verificationReminderSent: { $ne: true }
    }).toArray();

    console.log(`📧 [VERIFICATION REMINDER] ${unverifiedUsers.length} User gefunden`);

    if (unverifiedUsers.length === 0) {
      return { success: true, sent: 0, message: "Keine Erinnerungen zu senden" };
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const user of unverifiedUsers) {
      try {
        // Generiere Verifizierungs-Link
        const verificationUrl = `https://www.contract-ai.de/verify-email?token=${user.verificationToken}`;

        // E-Mail-Template generieren
        const emailHtml = generateEmailTemplate({
          title: "Deine Registrierung wartet noch",
          preheader: "Nur noch ein Klick zur Aktivierung deines Contract AI Accounts",
          body: `
            <p style="text-align: center; margin-bottom: 25px;">
              Hallo${user.firstName ? ` ${user.firstName}` : ''},
            </p>

            <p style="margin-bottom: 20px;">
              wir haben bemerkt, dass du dich vor ein paar Tagen bei <strong>Contract AI</strong> registriert hast,
              aber deine E-Mail-Adresse noch nicht bestätigt wurde.
            </p>

            <p style="margin-bottom: 25px;">
              Kein Problem - es dauert nur einen Klick! Bestätige jetzt deine E-Mail-Adresse
              und starte mit der KI-gestützten Vertragsanalyse.
            </p>

            <div style="background-color: #f0f7ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
              <p style="margin: 0; text-align: center; color: #0066ff;">
                <strong>Deine Vorteile mit Contract AI:</strong>
              </p>
              <ul style="margin: 15px 0 0 0; padding-left: 20px; color: #555;">
                <li style="margin-bottom: 8px;">Verträge in Sekunden analysieren</li>
                <li style="margin-bottom: 8px;">Risiken automatisch erkennen</li>
                <li style="margin-bottom: 8px;">Rechtssichere Optimierungsvorschläge</li>
                <li>3 kostenlose Analysen zum Testen</li>
              </ul>
            </div>
          `,
          cta: {
            url: verificationUrl,
            text: "E-Mail jetzt bestätigen"
          }
        });

        // E-Mail senden
        await sendEmail({
          to: user.email,
          subject: "Erinnerung: Deine Contract AI Registrierung wartet",
          html: emailHtml
        });

        // Markiere User als erinnert (damit er nicht nochmal erinnert wird)
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              verificationReminderSent: true,
              verificationReminderSentAt: new Date()
            }
          }
        );

        sentCount++;
        console.log(`✅ [VERIFICATION REMINDER] Erinnerung gesendet an: ${user.email}`);

      } catch (emailError) {
        errorCount++;
        console.error(`❌ [VERIFICATION REMINDER] Fehler bei ${user.email}:`, emailError.message);
      }
    }

    console.log(`📧 [VERIFICATION REMINDER] Fertig: ${sentCount} gesendet, ${errorCount} Fehler`);

    return {
      success: true,
      sent: sentCount,
      errors: errorCount,
      total: unverifiedUsers.length
    };

  } catch (error) {
    console.error("❌ [VERIFICATION REMINDER] Allgemeiner Fehler:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.close();
  }
}

/**
 * Statistiken über nicht verifizierte Accounts
 */
async function getUnverifiedStats() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");

    const now = new Date();
    const oneDayAgo = new Date(now); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats = {
      total: await usersCollection.countDocuments({ verified: false }),
      lastDay: await usersCollection.countDocuments({
        verified: false,
        createdAt: { $gte: oneDayAgo }
      }),
      lastTwoDays: await usersCollection.countDocuments({
        verified: false,
        createdAt: { $gte: twoDaysAgo }
      }),
      lastWeek: await usersCollection.countDocuments({
        verified: false,
        createdAt: { $gte: sevenDaysAgo }
      }),
      remindersSent: await usersCollection.countDocuments({
        verificationReminderSent: true
      })
    };

    return stats;

  } finally {
    await client.close();
  }
}

module.exports = {
  sendVerificationReminders,
  getUnverifiedStats
};

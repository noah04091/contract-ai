// 📤 services/notificationSender.js - Versendet Notifications aus Queue
const { getPendingNotifications, markAsSent, markAsFailed } = require("./notificationQueue");
const { notifyExpiringSoon, notifyExpired, notifyAutoRenewed } = require("./statusNotifier");

/**
 * 📤 NOTIFICATION SENDER
 *
 * Wird täglich um 9:00 Uhr vom Cron-Job aufgerufen
 * Verarbeitet alle pending Notifications aus der Queue
 *
 * Logik:
 * - 1-5 Notifications pro User: Separate E-Mails mit 2-3 Min Pause
 * - 6+ Notifications pro User: EINE gruppierte E-Mail
 */

/**
 * Hauptfunktion: Verarbeitet Queue und versendet E-Mails
 */
async function processNotificationQueue(db) {
  try {
    console.log("📤 Starte Notification Queue Verarbeitung...");

    // Hole alle pending Notifications (gruppiert nach User)
    const notificationsByUser = await getPendingNotifications(db);

    const userCount = Object.keys(notificationsByUser).length;

    if (userCount === 0) {
      console.log("ℹ️  Keine pending Notifications in Queue");
      return { sent: 0, failed: 0, grouped: 0 };
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalGrouped = 0;

    // Verarbeite jeden User
    for (const [userId, notifications] of Object.entries(notificationsByUser)) {
      const count = notifications.length;

      console.log(`\n👤 User ${userId}: ${count} Notification(s)`);

      try {
        if (count <= 5) {
          // Separate E-Mails mit Verzögerung
          const result = await sendSeparateNotifications(db, userId, notifications);
          totalSent += result.sent;
          totalFailed += result.failed;
        } else {
          // Gruppierte E-Mail
          const result = await sendGroupedNotification(db, userId, notifications);
          totalSent += result.sent;
          totalFailed += result.failed;
          totalGrouped++;
        }
      } catch (error) {
        console.error(`❌ Fehler bei User ${userId}:`, error);
        totalFailed += count;
      }
    }

    console.log(`\n📊 Notification Queue abgeschlossen:`);
    console.log(`   ✅ Versendet: ${totalSent}`);
    console.log(`   ❌ Fehlgeschlagen: ${totalFailed}`);
    console.log(`   📦 Gruppiert: ${totalGrouped} User`);

    return { sent: totalSent, failed: totalFailed, grouped: totalGrouped };

  } catch (error) {
    console.error("❌ Fehler beim Verarbeiten der Queue:", error);
    throw error;
  }
}

/**
 * Versendet separate E-Mails mit zeitlicher Verzögerung
 */
async function sendSeparateNotifications(db, userId, notifications) {
  let sent = 0;
  let failed = 0;

  const delayMs = 2 * 60 * 1000; // 2 Minuten

  for (let i = 0; i < notifications.length; i++) {
    const notification = notifications[i];

    try {
      // User-Daten abrufen
      const user = await db.collection("users").findOne({ _id: notification.userId });
      if (!user || !user.email) {
        console.warn(`⚠️ Keine E-Mail für User ${userId}`);
        await markAsFailed(db, notification._id, new Error("User email not found"));
        failed++;
        continue;
      }

      // Contract-Daten abrufen
      const contract = await db.collection("contracts").findOne({ _id: notification.contractId });
      if (!contract) {
        console.warn(`⚠️ Contract ${notification.contractId} nicht gefunden`);
        await markAsFailed(db, notification._id, new Error("Contract not found"));
        failed++;
        continue;
      }

      // Passende E-Mail senden
      await sendNotificationEmail(user.email, contract, notification);

      // Als versendet markieren
      await markAsSent(db, notification._id);
      sent++;

      console.log(`   ✅ ${i + 1}/${notifications.length}: ${notification.type} für "${contract.name}"`);

      // Verzögerung für nächste E-Mail (außer bei letzter)
      if (i < notifications.length - 1) {
        console.log(`   ⏳ Warte ${delayMs / 1000 / 60} Minuten...`);
        await sleep(delayMs);
      }

    } catch (error) {
      console.error(`   ❌ Fehler bei Notification ${notification._id}:`, error);
      await markAsFailed(db, notification._id, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Versendet EINE gruppierte E-Mail für alle Notifications
 */
async function sendGroupedNotification(db, userId, notifications) {
  try {
    // User-Daten abrufen
    const user = await db.collection("users").findOne({ _id: notifications[0].userId });
    if (!user || !user.email) {
      console.warn(`⚠️ Keine E-Mail für User ${userId}`);
      // Alle als failed markieren
      for (const n of notifications) {
        await markAsFailed(db, n._id, new Error("User email not found"));
      }
      return { sent: 0, failed: notifications.length };
    }

    // Contract-Daten für alle Notifications sammeln
    const contractDetails = [];

    for (const notification of notifications) {
      const contract = await db.collection("contracts").findOne({ _id: notification.contractId });
      if (contract) {
        contractDetails.push({
          contract,
          notification
        });
      }
    }

    if (contractDetails.length === 0) {
      console.warn(`⚠️ Keine Contracts gefunden`);
      return { sent: 0, failed: notifications.length };
    }

    // Gruppierte E-Mail senden
    await sendGroupedEmail(user.email, contractDetails);

    // Alle als versendet markieren
    for (const notification of notifications) {
      await markAsSent(db, notification._id);
    }

    console.log(`   ✅ Gruppierte E-Mail mit ${contractDetails.length} Updates versendet`);

    return { sent: contractDetails.length, failed: 0 };

  } catch (error) {
    console.error(`❌ Fehler bei gruppierter E-Mail:`, error);

    // Alle als failed markieren
    for (const notification of notifications) {
      await markAsFailed(db, notification._id, error);
    }

    return { sent: 0, failed: notifications.length };
  }
}

/**
 * Versendet einzelne Notification-E-Mail
 */
async function sendNotificationEmail(userEmail, contract, notification) {
  const contractName = contract.name || "Unbekannter Vertrag";
  const expiryDate = contract.expiryDate || contract.endDate;

  switch (notification.type) {
    case 'bald_ablaufend':
      const daysLeft = notification.metadata.daysLeft || 30;
      await notifyExpiringSoon(userEmail, contractName, expiryDate, daysLeft);
      break;

    case 'abgelaufen':
      await notifyExpired(userEmail, contractName, expiryDate);
      break;

    case 'auto_renewed':
      const oldExpiry = notification.metadata.oldExpiryDate || expiryDate;
      await notifyAutoRenewed(userEmail, contractName, oldExpiry, expiryDate);
      break;

    default:
      console.warn(`⚠️ Unbekannter Notification-Typ: ${notification.type}`);
  }
}

/**
 * Versendet gruppierte E-Mail mit mehreren Updates
 */
async function sendGroupedEmail(userEmail, contractDetails) {
  const generateEmailTemplate = require("../utils/emailTemplate");
  const nodemailer = require("nodemailer");

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Baue E-Mail-Body
  let bodyHtml = `<p>Guten Morgen! Hier sind Ihre Vertrags-Updates von heute:</p><br>`;

  contractDetails.forEach((detail, index) => {
    const { contract, notification } = detail;
    const contractName = contract.name || "Unbekannter Vertrag";

    let statusIcon = "📄";
    let statusText = "";
    let backgroundColor = "#f0f9ff";
    let borderColor = "#3b82f6";

    switch (notification.type) {
      case 'bald_ablaufend':
        statusIcon = "⚠️";
        statusText = `Läuft in ${notification.metadata.daysLeft || 30} Tagen ab`;
        backgroundColor = "#fef3c7";
        borderColor = "#f59e0b";
        break;
      case 'abgelaufen':
        statusIcon = "❌";
        statusText = "Ist abgelaufen";
        backgroundColor = "#fee2e2";
        borderColor = "#dc2626";
        break;
      case 'auto_renewed':
        statusIcon = "🔄";
        statusText = "Wurde automatisch verlängert";
        backgroundColor = "#d1fae5";
        borderColor = "#10b981";
        break;
    }

    bodyHtml += `
      <div style="background: ${backgroundColor}; border-left: 4px solid ${borderColor};
                  padding: 20px; margin: 15px 0; border-radius: 8px;">
        <h3 style="color: #1e293b; margin: 0 0 10px 0;">${statusIcon} ${contractName}</h3>
        <p style="margin: 5px 0; color: #334155;">
          <strong>Status:</strong> ${notification.oldStatus} → ${notification.newStatus}
        </p>
        <p style="margin: 5px 0; color: #334155;">
          <strong>Info:</strong> ${statusText}
        </p>
      </div>
    `;
  });

  bodyHtml += `<br><p>Sie können alle Verträge im Dashboard verwalten.</p>`;

  const htmlContent = generateEmailTemplate({
    title: `📊 ${contractDetails.length} Vertrags-Updates`,
    preheader: `${contractDetails.length} Verträge wurden aktualisiert`,
    body: bodyHtml,
    cta: {
      text: "Verträge verwalten",
      url: `${process.env.FRONTEND_URL || 'https://contract-ai.de'}/contracts`
    }
  });

  await transporter.sendMail({
    from: `"Contract AI" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `📊 ${contractDetails.length} wichtige Vertrags-Updates`,
    html: htmlContent
  });
}

/**
 * Helper: Sleep-Funktion
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  processNotificationQueue,
  sendSeparateNotifications,
  sendGroupedNotification
};

// 📧 services/statusNotifier.js - Smart Status Change Notifications
const nodemailer = require("nodemailer");
const { generateEmailTemplate } = require("../utils/emailTemplate");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * 🔔 Sendet Benachrichtigung bei Status-Änderung "bald_ablaufend"
 */
async function notifyExpiringSoon(userEmail, contractName, expiryDate, daysLeft) {
  try {
    const htmlContent = generateEmailTemplate({
      title: "⚠️ Vertrag läuft bald ab",
      preheader: `${contractName} läuft in ${daysLeft} Tagen ab`,
      body: `
        <p>Ihr Vertrag <strong>"${contractName}"</strong> läuft bald ab.</p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #d97706; margin: 0 0 10px 0;">📅 Ablauf-Details:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 5px 0;"><strong>Vertrag:</strong> ${contractName}</li>
            <li style="padding: 5px 0;"><strong>Ablaufdatum:</strong> ${new Date(expiryDate).toLocaleDateString('de-DE')}</li>
            <li style="padding: 5px 0;"><strong>Verbleibende Tage:</strong> ${daysLeft} Tage</li>
          </ul>
        </div>

        <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #0369a1; margin: 0 0 15px 0;">💡 Empfohlene Aktionen:</h3>
          <ol style="color: #334155; line-height: 1.8; margin: 0;">
            <li>📄 Vertrag prüfen und entscheiden: Verlängern oder kündigen?</li>
            <li>🔍 Konditionen vergleichen und bessere Angebote finden</li>
            <li>📧 Bei Kündigung: Fristgerecht über Contract AI kündigen</li>
            <li>🔄 Oder: Auto-Renewal aktivieren für automatische Verlängerung</li>
          </ol>
        </div>

        <p style="margin-top: 30px;">
          <strong>Wichtig:</strong> Verpasste Kündigungsfristen können zu automatischen Vertragsverlängerungen führen.
          Handeln Sie jetzt, um volle Kontrolle über Ihre Verträge zu behalten!
        </p>
      `,
      cta: {
        text: "Vertrag jetzt verwalten",
        url: `${process.env.FRONTEND_URL || 'https://contract-ai.de'}/contracts`
      }
    });

    const expiringSubject = `${contractName} - Frist in ${daysLeft} Tagen`;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Contract AI" <info@contract-ai.de>',
      to: userEmail,
      subject: expiringSubject,
      html: htmlContent
    });

    require("../utils/emailLogger").logSentEmail({
      to: userEmail,
      subject: expiringSubject,
      category: 'status_expiring',
      source: 'services/statusNotifier.js'
    }).catch(() => {});

    console.log(`✅ Notification sent: Expiring soon (${contractName}) to ${userEmail}`);
    return true;

  } catch (error) {
    console.error("❌ Error sending expiring-soon notification:", error);
    throw error;
  }
}

/**
 * ❌ Sendet Benachrichtigung bei Status-Änderung "abgelaufen"
 */
async function notifyExpired(userEmail, contractName, expiryDate) {
  try {
    const htmlContent = generateEmailTemplate({
      title: "❌ Vertrag ist abgelaufen",
      preheader: `${contractName} ist abgelaufen`,
      body: `
        <p>Ihr Vertrag <strong>"${contractName}"</strong> ist am <strong>${new Date(expiryDate).toLocaleDateString('de-DE')}</strong> abgelaufen.</p>

        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0;">⚠️ Vertrag Status:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 5px 0;"><strong>Vertrag:</strong> ${contractName}</li>
            <li style="padding: 5px 0;"><strong>Abgelaufen am:</strong> ${new Date(expiryDate).toLocaleDateString('de-DE')}</li>
            <li style="padding: 5px 0;"><strong>Neuer Status:</strong> Abgelaufen</li>
          </ul>
        </div>

        <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #0369a1; margin: 0 0 15px 0;">📋 Was Sie jetzt tun sollten:</h3>
          <ol style="color: #334155; line-height: 1.8; margin: 0;">
            <li>🔍 Prüfen Sie, ob eine automatische Verlängerung stattgefunden hat</li>
            <li>📧 Kontaktieren Sie den Anbieter für Klärung des Status</li>
            <li>📄 Archivieren Sie den Vertrag in Contract AI</li>
            <li>✨ Suchen Sie nach besseren Alternativen für neue Verträge</li>
          </ol>
        </div>

        <p style="margin-top: 30px;">
          <strong>Tipp:</strong> Aktivieren Sie bei zukünftigen Verträgen die rechtzeitige Erinnerungsfunktion,
          um nie wieder ein Ablaufdatum zu verpassen.
        </p>
      `,
      cta: {
        text: "Verträge verwalten",
        url: `${process.env.FRONTEND_URL || 'https://contract-ai.de'}/contracts`
      }
    });

    const expiredSubject = `${contractName} - Vertragsstatus`;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Contract AI" <info@contract-ai.de>',
      to: userEmail,
      subject: expiredSubject,
      html: htmlContent
    });

    require("../utils/emailLogger").logSentEmail({
      to: userEmail,
      subject: expiredSubject,
      category: 'status_expired',
      source: 'services/statusNotifier.js'
    }).catch(() => {});

    console.log(`✅ Notification sent: Expired (${contractName}) to ${userEmail}`);
    return true;

  } catch (error) {
    console.error("❌ Error sending expired notification:", error);
    throw error;
  }
}

/**
 * 🔄 Sendet Benachrichtigung bei Auto-Renewal
 */
async function notifyAutoRenewed(userEmail, contractName, oldExpiryDate, newExpiryDate) {
  try {
    const htmlContent = generateEmailTemplate({
      title: "🔄 Vertrag automatisch verlängert",
      preheader: `${contractName} wurde automatisch verlängert`,
      body: `
        <p>Gute Nachrichten! Ihr Vertrag <strong>"${contractName}"</strong> wurde automatisch verlängert.</p>

        <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 8px;">
          <h3 style="color: #047857; margin: 0 0 10px 0;">✅ Verlängerungs-Details:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 5px 0;"><strong>Vertrag:</strong> ${contractName}</li>
            <li style="padding: 5px 0;"><strong>Altes Ablaufdatum:</strong> ${new Date(oldExpiryDate).toLocaleDateString('de-DE')}</li>
            <li style="padding: 5px 0;"><strong>Neues Ablaufdatum:</strong> ${new Date(newExpiryDate).toLocaleDateString('de-DE')}</li>
            <li style="padding: 5px 0;"><strong>Status:</strong> Aktiv</li>
          </ul>
        </div>

        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #d97706; margin: 0 0 15px 0;">💡 Wichtige Hinweise:</h3>
          <ul style="color: #334155; line-height: 1.8; margin: 0;">
            <li>📧 Diese Verlängerung erfolgte automatisch basierend auf Ihren Vertragseinstellungen</li>
            <li>🔍 Prüfen Sie die neuen Konditionen beim Anbieter</li>
            <li>💰 Achten Sie auf mögliche Preisänderungen</li>
            <li>❌ Sie können den Vertrag jederzeit über Contract AI kündigen</li>
          </ul>
        </div>

        <p style="margin-top: 30px;">
          <strong>Möchten Sie kündigen?</strong> Nutzen Sie unsere 1-Klick-Kündigungsfunktion,
          um den Vertrag rechtssicher und bequem zu beenden.
        </p>
      `,
      cta: {
        text: "Vertrag ansehen",
        url: `${process.env.FRONTEND_URL || 'https://contract-ai.de'}/contracts`
      }
    });

    const autoRenewedSubject = `${contractName} - Vertragsverlaengerung`;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Contract AI" <info@contract-ai.de>',
      to: userEmail,
      subject: autoRenewedSubject,
      html: htmlContent
    });

    require("../utils/emailLogger").logSentEmail({
      to: userEmail,
      subject: autoRenewedSubject,
      category: 'status_auto_renewed',
      source: 'services/statusNotifier.js'
    }).catch(() => {});

    console.log(`✅ Notification sent: Auto-renewed (${contractName}) to ${userEmail}`);
    return true;

  } catch (error) {
    console.error("❌ Error sending auto-renewal notification:", error);
    throw error;
  }
}

/**
 * 🎯 Hauptfunktion: Sendet passende Notification basierend auf Status-Änderung
 */
async function sendStatusChangeNotification(db, contractId, userId, oldStatus, newStatus, metadata = {}) {
  try {
    // User-E-Mail abrufen
    const { ObjectId } = require("mongodb");
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user || !user.email) {
      console.warn(`⚠️ Keine E-Mail für User ${userId} gefunden`);
      return false;
    }

    // Contract-Daten abrufen
    const contract = await db.collection("contracts").findOne({ _id: new ObjectId(contractId) });

    if (!contract) {
      console.warn(`⚠️ Vertrag ${contractId} nicht gefunden`);
      return false;
    }

    const contractName = contract.name || "Unbekannter Vertrag";
    const expiryDate = contract.expiryDate || contract.endDate;

    // Passende Notification senden basierend auf neuem Status
    switch (newStatus) {
      case 'bald_ablaufend':
        const daysLeft = metadata.daysLeft || Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        await notifyExpiringSoon(user.email, contractName, expiryDate, daysLeft);
        break;

      case 'abgelaufen':
        await notifyExpired(user.email, contractName, expiryDate);
        break;

      case 'aktiv':
        // Nur bei Auto-Renewal benachrichtigen
        if (oldStatus === 'bald_ablaufend' || metadata.autoRenewed) {
          const oldExpiry = metadata.oldExpiryDate || expiryDate;
          await notifyAutoRenewed(user.email, contractName, oldExpiry, expiryDate);
        }
        break;

      default:
        console.log(`ℹ️ Keine Notification für Status-Änderung: ${oldStatus} → ${newStatus}`);
        return false;
    }

    return true;

  } catch (error) {
    console.error("❌ Error sending status change notification:", error);
    return false;
  }
}

module.exports = {
  notifyExpiringSoon,
  notifyExpired,
  notifyAutoRenewed,
  sendStatusChangeNotification
};

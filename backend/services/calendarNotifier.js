// backend/services/calendarNotifier.js
// E-Mail-Benachrichtigungen fuer Kalender-Events mit Retry-Mechanismus

const nodemailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const generateEmailTemplate = require("../utils/emailTemplate");
const { queueEmail, processEmailQueue } = require("./emailRetryService");

/**
 * Hauptfunktion fuer den taeglichen Notification-Check
 * Fuegt E-Mails zur Queue hinzu (statt direktem Versand)
 */
async function checkAndSendNotifications(db) {
  try {
    console.log("Starte Calendar Notification Check...");

    const now = new Date();
    const lookaheadDays = parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || "7");
    const lookaheadDate = new Date();
    lookaheadDate.setDate(lookaheadDate.getDate() + lookaheadDays);

    // Hole alle anstehenden Events (nur "scheduled" Status)
    const upcomingEvents = await db.collection("contract_events")
      .aggregate([
        {
          $match: {
            date: { $gte: now, $lte: lookaheadDate },
            status: "scheduled",
            severity: { $in: ["warning", "critical"] }
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
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $sort: { date: 1, severity: -1 } }
      ])
      .toArray();

    console.log(`${upcomingEvents.length} Events zur Benachrichtigung gefunden`);

    let queuedCount = 0;

    for (const event of upcomingEvents) {
      if (!event.user?.email) {
        console.warn(`Keine E-Mail fuer User ${event.userId}`);
        continue;
      }

      // Skip free users - Email reminders are Business+ only
      const userPlan = event.user?.subscriptionPlan || "free";
      if (userPlan === "free") {
        console.log(`Skipping free user ${event.user.email} - Email reminders require Business+`);
        continue;
      }

      try {
        // Fuege E-Mail zur Queue hinzu (mit Retry-Mechanismus)
        await queueEventNotification(event, db);

        // Markiere Event als "queued" (wird nach erfolgreichem Versand zu "notified")
        await db.collection("contract_events").updateOne(
          { _id: event._id },
          {
            $set: {
              status: "queued",
              queuedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        queuedCount++;

      } catch (error) {
        console.error(`Fehler beim Queuing der Benachrichtigung fuer Event ${event._id}:`, error);
      }
    }

    console.log(`${queuedCount} E-Mails zur Queue hinzugefuegt`);

    // Verarbeite Queue sofort (erster Versuch)
    if (queuedCount > 0) {
      console.log("Starte sofortige Queue-Verarbeitung...");
      const stats = await processEmailQueue(db);
      console.log(`Queue-Verarbeitung: ${stats.sent} gesendet, ${stats.retrying} warten auf Retry, ${stats.failed} fehlgeschlagen`);
    }

    return queuedCount;

  } catch (error) {
    console.error("Fehler im Notification Check:", error);
    throw error;
  }
}

/**
 * Fuegt eine Event-Benachrichtigung zur E-Mail-Queue hinzu
 */
async function queueEventNotification(event, db) {
  const actionToken = await generateActionToken(event._id, event.userId);
  const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";

  let emailContent = "";
  let subject = "";
  let ctaButtons = [];

  switch (event.type) {
    case "CANCEL_WINDOW_OPEN":
      subject = `Kuendigungsfenster offen: ${event.metadata.contractName}`;
      emailContent = generateCancelWindowEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Jetzt kuendigen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Alternativen pruefen", url: `${baseUrl}/compare?contractId=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "LAST_CANCEL_DAY":
      subject = `LETZTE CHANCE: ${event.metadata.contractName} heute kuendigen!`;
      emailContent = generateLastCancelDayEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "SOFORT KUENDIGEN", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel&urgent=true`, style: "urgent" }
      ];
      break;

    case "CANCEL_WARNING":
      subject = `Nur noch ${event.metadata.daysLeft} Tage: ${event.metadata.contractName}`;
      emailContent = generateCancelWarningEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Zur Kuendigung", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "warning" },
        { text: "Optimieren", url: `${baseUrl}/optimize/${event.contractId}`, style: "secondary" }
      ];
      break;

    case "PRICE_INCREASE":
      subject = `Preiserhoehung: ${event.metadata.contractName}`;
      emailContent = generatePriceIncreaseEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Guenstigere Angebote finden", url: `${baseUrl}/compare?contractId=${event.contractId}&reason=price_increase`, style: "primary" },
        { text: "Kuendigung vorbereiten", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}`, style: "secondary" }
      ];
      break;

    case "AUTO_RENEWAL":
      subject = `Automatische Verlaengerung: ${event.metadata.contractName}`;
      emailContent = generateAutoRenewalEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Verlaengerung stoppen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "warning" },
        { text: "Vertrag pruefen", url: `${baseUrl}/contracts/${event.contractId}`, style: "secondary" }
      ];
      break;

    case "REVIEW":
      subject = `Zeit fuer einen Check: ${event.metadata.contractName}`;
      emailContent = generateReviewEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Jetzt optimieren", url: `${baseUrl}/optimize/${event.contractId}`, style: "primary" },
        { text: "Markt vergleichen", url: `${baseUrl}/compare?contractId=${event.contractId}`, style: "secondary" }
      ];
      break;

    default:
      subject = `Vertragserinnerung: ${event.title}`;
      emailContent = generateGenericEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Details anzeigen", url: `${baseUrl}/contracts/${event.contractId}`, style: "primary" }
      ];
  }

  const htmlContent = generateCalendarEmailTemplate({
    title: subject,
    preheader: event.description,
    eventType: event.type,
    severity: event.severity,
    contractName: event.metadata.contractName,
    eventDate: event.date,
    content: emailContent,
    ctaButtons: ctaButtons,
    quickActions: generateQuickActionLinks(event, actionToken, baseUrl),
    unsubscribeUrl: `${baseUrl}/settings/notifications?token=${event.user._id}`
  });

  // Zur Queue hinzufuegen (mit Retry-Mechanismus)
  await queueEmail(db, {
    to: event.user.email,
    subject: subject,
    html: htmlContent,
    from: `"Contract AI Calendar" <${process.env.EMAIL_USER}>`,
    eventId: event._id.toString(),
    userId: event.userId.toString(),
    emailType: `calendar_${event.type.toLowerCase()}`
  });

  console.log(`E-Mail zur Queue hinzugefuegt: ${subject} fuer ${event.user.email}`);
}

/**
 * Generiert einen sicheren Action-Token fuer Quick Actions
 */
async function generateActionToken(eventId, userId) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    {
      eventId: eventId.toString(),
      userId: userId.toString(),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    },
    process.env.JWT_SECRET
  );
}

/**
 * Email-Content-Generatoren
 */
function generateCancelWindowEmail(event, token, baseUrl) {
  const daysUntilExpiry = Math.ceil((new Date(event.metadata.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return `
    <h2 style="color: #34c759;">Gute Nachrichten!</h2>
    <p>Das Kuendigungsfenster fuer <strong>${event.metadata.contractName}</strong> ist jetzt geoeffnet.</p>
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <h3>Wichtige Informationen:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Vertragsende:</strong> ${new Date(event.metadata.expiryDate).toLocaleDateString('de-DE')}</li>
        <li><strong>Kuendigungsfrist:</strong> ${event.metadata.noticePeriodDays} Tage</li>
        <li><strong>Anbieter:</strong> ${event.metadata.provider || 'Unbekannt'}</li>
        <li><strong>Verbleibende Zeit:</strong> ${daysUntilExpiry} Tage</li>
      </ul>
    </div>
  `;
}

function generateLastCancelDayEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff3b30;">DRINGEND: Letzte Chance!</h2>
    <p style="font-size: 18px; color: #ff3b30;"><strong>HEUTE ist der letzte Tag</strong>, um "${event.metadata.contractName}" zu kuendigen!</p>
    <div style="background: #fef2f2; border: 2px solid #ff3b30; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="color: #ff3b30; margin-top: 0;">Was passiert, wenn Sie nicht handeln:</h3>
      <ul style="color: #991b1b;">
        <li>Der Vertrag verlaengert sich automatisch um <strong>${event.metadata.autoRenewMonths || 12} Monate</strong></li>
        <li>Sie sind weitere ${event.metadata.autoRenewMonths || 12} Monate gebunden</li>
      </ul>
    </div>
  `;
}

function generateCancelWarningEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff9500;">Wichtige Erinnerung</h2>
    <p>In <strong>${event.metadata.daysLeft} Tagen</strong> endet die Kuendigungsfrist fuer "${event.metadata.contractName}".</p>
  `;
}

function generatePriceIncreaseEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff6b35;">Preiserhoehung angekuendigt</h2>
    <p>Der Preis fuer "${event.metadata.contractName}" wird erhoeht.</p>
  `;
}

function generateAutoRenewalEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #5c7cfa;">Automatische Verlaengerung steht bevor</h2>
    <p>"${event.metadata.contractName}" verlaengert sich automatisch.</p>
  `;
}

function generateReviewEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #10b981;">Zeit fuer einen Vertrags-Check!</h2>
    <p>Ihr Vertrag "${event.metadata.contractName}" laeuft seit laengerer Zeit.</p>
  `;
}

function generateGenericEmail(event, token, baseUrl) {
  return `
    <h2>${event.title}</h2>
    <p>${event.description}</p>
  `;
}

function generateQuickActionLinks(event, token, baseUrl) {
  return [
    { icon: "", text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?highlight=${event._id}` },
    { icon: "", text: "Erinnern in 7 Tagen", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=snooze&days=7` },
    { icon: "", text: "Erinnerung ausschalten", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=dismiss` }
  ];
}

function generateCalendarEmailTemplate(params) {
  const { title, preheader, eventType, severity, content, ctaButtons, quickActions, unsubscribeUrl } = params;
  const severityColors = { info: "#3b82f6", warning: "#ff9500", critical: "#ff3b30" };
  const primaryColor = severityColors[severity] || "#3b82f6";

  const ctaHtml = ctaButtons.map(button => {
    const buttonColors = {
      primary: { bg: primaryColor, text: "#ffffff" },
      secondary: { bg: "#f3f4f6", text: "#1f2937" },
      warning: { bg: "#ff9500", text: "#ffffff" },
      urgent: { bg: "#ff3b30", text: "#ffffff" }
    };
    const colors = buttonColors[button.style] || buttonColors.primary;
    return `
      <table border="0" cellpadding="0" cellspacing="0" style="margin: 10px auto;">
        <tr>
          <td align="center" style="background: ${colors.bg}; border-radius: 8px;">
            <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: ${colors.text}; text-decoration: none;">${button.text}</a>
          </td>
        </tr>
      </table>
    `;
  }).join('');

  const quickActionsHtml = quickActions.map(action =>
    `<a href="${action.url}" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 14px;">${action.text}</a>`
  ).join(' | ');

  return generateEmailTemplate({
    title: title,
    preheader: preheader,
    body: `
      <div style="margin-bottom: 30px;">${content}</div>
      <div style="text-align: center; margin: 30px 0;">${ctaHtml}</div>
      <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; text-align: center; font-size: 14px; color: #6b7280;">
        <p><strong>Quick Actions:</strong></p>
        <div style="margin: 15px 0;">${quickActionsHtml}</div>
      </div>
    `,
    unsubscribeUrl: unsubscribeUrl
  });
}

module.exports = {
  checkAndSendNotifications,
  queueEventNotification,
  processEmailQueue
};

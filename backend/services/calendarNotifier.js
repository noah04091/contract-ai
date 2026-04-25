// backend/services/calendarNotifier.js
// E-Mail-Benachrichtigungen fuer Kalender-Events mit Retry-Mechanismus

const nodemailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const { generateEmailTemplate } = require("../utils/emailTemplate");
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
            severity: { $in: ["info", "warning", "critical"] }
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
      // Envelope-Reminder nur am geplanten Tag versenden (nicht durch Lookahead vorziehen)
      if (event.sourceType === "ENVELOPE") {
        const eventDateOnly = new Date(event.date);
        eventDateOnly.setHours(0, 0, 0, 0);
        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        if (eventDateOnly > todayOnly) {
          console.log(`⏳ Envelope-Event "${event.title}" noch nicht fällig (geplant: ${eventDateOnly.toISOString().split('T')[0]})`);
          continue;
        }
      }

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

      // Skip users with digest mode - they get a combined email instead
      const digestMode = event.user?.emailDigestMode;
      if (digestMode === "daily" || digestMode === "weekly") {
        // These users are handled by calendarDigestService
        continue;
      }

      // notificationSettings prüfen (default: alles aktiv)
      const ns = event.user?.notificationSettings;
      if (ns?.email?.enabled === false) {
        console.log(`Skipping ${event.user.email} - E-Mail-Benachrichtigungen deaktiviert`);
        continue;
      }
      if (ns?.email?.contractDeadlines === false) {
        console.log(`Skipping ${event.user.email} - Vertragsfristen-Mails deaktiviert`);
        continue;
      }

      // deadlineReminders-Timing prüfen
      const daysUntilEvent = Math.ceil((new Date(event.date) - now) / (1000 * 60 * 60 * 24));
      const dr = ns?.deadlineReminders;
      if (dr) {
        const skipTiming =
          (daysUntilEvent >= 6 && dr.days7 === false) ||
          (daysUntilEvent >= 2 && daysUntilEvent <= 3 && dr.days3 === false) ||
          (daysUntilEvent === 1 && dr.days1 === false) ||
          (daysUntilEvent <= 0 && dr.daysSame === false);
        if (skipTiming) {
          console.log(`Skipping ${event.user.email} - Erinnerung ${daysUntilEvent}d deaktiviert`);
          continue;
        }
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
    case "CANCEL_REMINDER":
      subject = `${event.metadata.contractName} - Erinnerung: Kündigungsfrist naht`;
      emailContent = generateCancelReminderEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Vertrag ansehen", url: `${baseUrl}/contracts?view=${event.contractId}`, style: "primary" },
        { text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}`, style: "secondary" }
      ];
      break;

    case "CANCEL_WINDOW_OPEN":
      subject = `${event.metadata.contractName} - Vertragsinformation`;
      emailContent = generateCancelWindowEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Vertrag ansehen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Alternativen ansehen", url: `${baseUrl}/compare?contractId=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "LAST_CANCEL_DAY":
      subject = `${event.metadata.contractName} - Frist heute`;
      emailContent = generateLastCancelDayEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Vertrag ansehen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" }
      ];
      break;

    case "CANCEL_WARNING":
      subject = `${event.metadata.contractName} - Frist in ${event.metadata.daysLeft} Tagen`;
      emailContent = generateCancelWarningEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Vertrag ansehen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Optimieren", url: `${baseUrl}/optimize/${event.contractId}`, style: "secondary" }
      ];
      break;

    case "PRICE_INCREASE":
      subject = `${event.metadata.contractName} - Preisanpassung`;
      emailContent = generatePriceIncreaseEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Angebote vergleichen", url: `${baseUrl}/compare?contractId=${event.contractId}&reason=price_increase`, style: "primary" },
        { text: "Vertrag ansehen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}`, style: "secondary" }
      ];
      break;

    case "AUTO_RENEWAL":
      subject = `${event.metadata.contractName} - Vertragsverlaengerung`;
      emailContent = generateAutoRenewalEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Details ansehen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Vertrag ansehen", url: `${baseUrl}/contracts?view=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "REVIEW":
      subject = `${event.metadata.contractName} - Vertragsinfo`;
      emailContent = generateReviewEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Optimieren", url: `${baseUrl}/optimize/${event.contractId}`, style: "primary" },
        { text: "Vergleichen", url: `${baseUrl}/compare?contractId=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "CANCELLATION_CONFIRMATION_CHECK":
      subject = `${event.metadata?.contractName || event.contractName} — Kündigungsbestätigung erhalten?`;
      emailContent = generateCancellationConfirmationCheckEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Im Kalender prüfen", url: `${baseUrl}/calendar`, style: "primary" },
        { text: "Kündigungsarchiv", url: `${baseUrl}/cancellations`, style: "secondary" }
      ];
      break;

    case "SIGNATURE_REMINDER_3DAY":
    case "SIGNATURE_REMINDER_1DAY":
    case "SIGNATURE_EXPIRING": {
      const envelopeTitle = event.metadata?.envelopeTitle || event.title;
      const sigExpiresAt = event.metadata?.expiresAt ? new Date(event.metadata.expiresAt) : null;
      const daysUntilExpiry = sigExpiresAt
        ? Math.max(0, Math.ceil((sigExpiresAt - new Date()) / (1000 * 60 * 60 * 24)))
        : (event.metadata?.daysUntilExpiry || 0);

      if (daysUntilExpiry === 0) {
        subject = `${envelopeTitle} — Signatur läuft heute ab`;
      } else if (daysUntilExpiry === 1) {
        subject = `${envelopeTitle} — Signatur läuft morgen ab`;
      } else {
        subject = `${envelopeTitle} — Signatur läuft in ${daysUntilExpiry} Tagen ab`;
      }

      emailContent = generateSignatureReminderEmail(event, daysUntilExpiry);
      ctaButtons = [
        { text: "Signaturanfrage ansehen", url: `${baseUrl}/envelopes`, style: "primary" },
        { text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}`, style: "secondary" }
      ];
      break;
    }

    default:
      subject = `${event.metadata?.contractName || event.title} - Vertragsinformation`;
      emailContent = generateGenericEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Details ansehen", url: `${baseUrl}/contracts?view=${event.contractId}`, style: "primary" }
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
    recipientEmail: event.user.email  // Fuer personalisierte Unsubscribe-Links
  });

  // Zur Queue hinzufuegen (mit Retry-Mechanismus)
  await queueEmail(db, {
    to: event.user.email,
    subject: subject,
    html: htmlContent,
    from: process.env.EMAIL_FROM || '"Contract AI" <info@contract-ai.de>',
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
function generateCancelReminderEmail(event, token, baseUrl) {
  const daysUntilWindow = event.metadata?.daysUntilWindow || 30;
  return `
    <h2 style="color: #3b82f6; text-align: center;">Erinnerung: Kündigungsfrist naht</h2>
    <p style="text-align: center;">In ca. <strong>${daysUntilWindow} Tagen</strong> öffnet sich das Kündigungsfenster für <strong>${event.metadata.contractName}</strong>.</p>
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <h3>Details:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Vertrag:</strong> ${event.metadata.contractName}</li>
        ${event.metadata?.provider ? `<li><strong>Anbieter:</strong> ${event.metadata.provider}</li>` : ''}
        ${event.metadata?.isAutoRenewal ? '<li><strong>Hinweis:</strong> Dieser Vertrag verlängert sich automatisch!</li>' : ''}
      </ul>
    </div>
    <p style="text-align: center;">Jetzt ist ein guter Zeitpunkt, Ihre Optionen zu prüfen.</p>
  `;
}

function generateCancelWindowEmail(event, token, baseUrl) {
  const daysUntilExpiry = Math.ceil((new Date(event.metadata.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return `
    <h2 style="color: #34c759; text-align: center;">Gute Nachrichten!</h2>
    <p style="text-align: center;">Das Kündigungsfenster für <strong>${event.metadata.contractName}</strong> ist jetzt geöffnet.</p>
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <h3>Wichtige Informationen:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Vertragsende:</strong> ${new Date(event.metadata.expiryDate).toLocaleDateString('de-DE')}</li>
        <li><strong>Kündigungsfrist:</strong> ${event.metadata.noticePeriodDays} Tage</li>
        <li><strong>Anbieter:</strong> ${event.metadata.provider || 'Unbekannt'}</li>
        <li><strong>Verbleibende Zeit:</strong> ${daysUntilExpiry} Tage</li>
      </ul>
    </div>
  `;
}

function generateLastCancelDayEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #991b1b; text-align: center;">Wichtige Erinnerung</h2>
    <p style="font-size: 15px; line-height: 1.7; color: #334155; text-align: center;">
      Heute ist der letzte Tag, um <strong>"${event.metadata.contractName}"</strong> zu kündigen.
    </p>
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #991b1b; margin: 0; font-weight: 600;">Was passiert ohne Kündigung:</p>
      <ul style="color: #991b1b; margin: 12px 0 0 0; padding-left: 20px;">
        <li>Automatische Verlängerung um ${event.metadata.autoRenewMonths || 12} Monate</li>
        <li>Bindung für weitere ${event.metadata.autoRenewMonths || 12} Monate</li>
      </ul>
    </div>
  `;
}

function generateCancelWarningEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff9500; text-align: center;">Wichtige Erinnerung</h2>
    <p style="text-align: center;">In <strong>${event.metadata.daysLeft} Tagen</strong> endet die Kündigungsfrist für "${event.metadata.contractName}".</p>
  `;
}

function generatePriceIncreaseEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff6b35; text-align: center;">Preiserhöhung angekündigt</h2>
    <p style="text-align: center;">Der Preis für "${event.metadata.contractName}" wird erhöht.</p>
  `;
}

function generateAutoRenewalEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #5c7cfa; text-align: center;">Automatische Verlängerung steht bevor</h2>
    <p style="text-align: center;">"${event.metadata.contractName}" verlängert sich automatisch.</p>
  `;
}

function generateReviewEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #10b981; text-align: center;">Zeit für einen Vertrags-Check!</h2>
    <p style="text-align: center;">Ihr Vertrag "${event.metadata.contractName}" läuft seit längerer Zeit.</p>
  `;
}

function generateCancellationConfirmationCheckEmail(event, token, baseUrl) {
  const contractName = event.metadata?.contractName || event.contractName || "Vertrag";
  const provider = event.metadata?.provider || "Anbieter";
  const isFollowUp = event.metadata?.isFollowUp;
  return `
    <h2 style="color: #f59e0b; text-align: center;">Kündigungsbestätigung prüfen</h2>
    <p style="text-align: center;">Haben Sie bereits eine <strong>Bestätigung</strong> für die Kündigung von <strong>${contractName}</strong> ${provider ? `bei ${provider}` : ''} erhalten?</p>
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Was Sie jetzt tun sollten:</h3>
      <ul style="padding-left: 18px; margin: 0;">
        <li><strong>Bestätigung erhalten?</strong> — Im Kalender auf "Ja, erhalten" klicken</li>
        <li><strong>Keine Bestätigung?</strong> — Erinnern Sie den Anbieter mit einem Klick</li>
        <li><strong>Kündigung doch nicht gewünscht?</strong> — Vertrag reaktivieren</li>
      </ul>
    </div>
    ${isFollowUp ? '<p style="color: #92400e; font-size: 13px;">Dies ist eine Folge-Erinnerung. Sie haben zuvor angegeben, keine Bestätigung erhalten zu haben.</p>' : ''}
    <p style="text-align: center;">Öffnen Sie Ihren Kalender in Contract AI, um direkt zu reagieren.</p>
  `;
}

function generateSignatureReminderEmail(event, daysUntilExpiry) {
  const envelopeTitle = event.metadata?.envelopeTitle || event.title;
  const pendingSigners = event.metadata?.pendingSigners || 0;
  const totalSigners = event.metadata?.totalSigners || 0;
  const expiresAtFormatted = event.metadata?.expiresAt
    ? new Date(event.metadata.expiresAt).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Unbekannt';

  let urgencyColor, urgencyText, urgencyBg;
  if (daysUntilExpiry === 0) {
    urgencyColor = '#dc2626';
    urgencyText = 'Läuft heute ab!';
    urgencyBg = '#fef2f2';
  } else if (daysUntilExpiry === 1) {
    urgencyColor = '#f59e0b';
    urgencyText = 'Läuft morgen ab';
    urgencyBg = '#fffbeb';
  } else {
    urgencyColor = '#3b82f6';
    urgencyText = `Läuft in ${daysUntilExpiry} Tagen ab`;
    urgencyBg = '#eff6ff';
  }

  return `
    <h2 style="color: ${urgencyColor}; text-align: center;">Signaturanfrage: ${urgencyText}</h2>
    <div style="background: ${urgencyBg}; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 8px;"><strong>Dokument:</strong> ${envelopeTitle}</li>
        <li style="margin-bottom: 8px;"><strong>Ablaufdatum:</strong> ${expiresAtFormatted}</li>
        <li><strong>Ausstehende Signaturen:</strong> ${pendingSigners} von ${totalSigners}</li>
      </ul>
    </div>
    <p style="text-align: center; color: #4b5563;">
      ${daysUntilExpiry === 0
        ? 'Bitte prüfen Sie den Status der Signaturanfrage umgehend.'
        : `Noch ${daysUntilExpiry} Tag${daysUntilExpiry > 1 ? 'e' : ''} bis zum Ablauf. Erinnern Sie ausstehende Unterzeichner rechtzeitig.`
      }
    </p>
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
    { icon: "", text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}` },
    { icon: "", text: "Erinnern in 7 Tagen", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=snooze&days=7` },
    { icon: "", text: "Erinnerung ausschalten", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=dismiss` }
  ];
}

function generateCalendarEmailTemplate(params) {
  const { title, preheader, eventType, severity, content, ctaButtons, quickActions, recipientEmail } = params;
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
          <td align="center">
            <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: ${colors.text}; text-decoration: none; background: ${colors.bg}; border-radius: 25px;">${button.text}</a>
          </td>
        </tr>
      </table>
    `;
  }).join('');

  const quickActionsHtml = quickActions.map(action =>
    `<a href="${action.url}" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 14px;">${action.text}</a>`
  ).join(' | ');

  const baseUrlForUnsub = process.env.FRONTEND_URL || "https://contract-ai.de";
  const unsubscribeUrl = `${baseUrlForUnsub}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&category=CALENDAR`;

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
    recipientEmail: recipientEmail,
    emailCategory: 'calendar',
    unsubscribeUrl: unsubscribeUrl
  });
}

module.exports = {
  checkAndSendNotifications,
  queueEventNotification,
  processEmailQueue
};

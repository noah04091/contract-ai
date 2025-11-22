// 📁 backend/services/calendarNotifier.js
const nodemailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const generateEmailTemplate = require("../utils/emailTemplate");

/**
 * Hauptfunktion für den täglichen Notification-Check
 */
async function checkAndSendNotifications(db) {
  try {
    console.log("📅 Starte Calendar Notification Check...");
    
    const now = new Date();
    const lookaheadDays = parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || "7");
    const lookaheadDate = new Date();
    lookaheadDate.setDate(lookaheadDate.getDate() + lookaheadDays);
    
    // Hole alle anstehenden Events
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
    
    console.log(`📧 ${upcomingEvents.length} Events zur Benachrichtigung gefunden`);
    
    let sentCount = 0;
    
    for (const event of upcomingEvents) {
      if (!event.user?.email) {
        console.warn(`⚠️ Keine E-Mail für User ${event.userId}`);
        continue;
      }

      // 🔐 Skip free users - Email reminders are Business+ only
      const userPlan = event.user?.subscriptionPlan || 'free';
      if (userPlan === 'free') {
        console.log(`⏩ Skipping free user ${event.user.email} - Email reminders require Business+`);
        continue;
      }

      try {
        // Sende spezifische Benachrichtigung je nach Event-Typ
        await sendEventNotification(event, db);
        
        // Markiere Event als benachrichtigt
        await db.collection("contract_events").updateOne(
          { _id: event._id },
          { 
            $set: { 
              status: "notified",
              notifiedAt: new Date(),
              updatedAt: new Date()
            } 
          }
        );
        
        sentCount++;
        
      } catch (error) {
        console.error(`❌ Fehler beim Senden der Benachrichtigung für Event ${event._id}:`, error);
      }
    }
    
    console.log(`✅ ${sentCount} Benachrichtigungen versendet`);
    return sentCount;
    
  } catch (error) {
    console.error("❌ Fehler im Notification Check:", error);
    throw error;
  }
}

/**
 * Sendet eine spezifische Benachrichtigung basierend auf Event-Typ
 */
async function sendEventNotification(event, db) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  
  // Generiere Token für Quick Actions
  const actionToken = await generateActionToken(event._id, event.userId);
  const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
  
  let emailContent = "";
  let subject = "";
  let ctaButtons = [];
  
  switch (event.type) {
    case "CANCEL_WINDOW_OPEN":
      subject = `✅ Kündigungsfenster offen: ${event.metadata.contractName}`;
      emailContent = generateCancelWindowEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "🚀 Jetzt kündigen",
          url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`,
          style: "primary"
        },
        {
          text: "📊 Alternativen prüfen",
          url: `${baseUrl}/compare?contractId=${event.contractId}`,
          style: "secondary"
        }
      ];
      break;
      
    case "LAST_CANCEL_DAY":
      subject = `🚨 LETZTE CHANCE: ${event.metadata.contractName} heute kündigen!`;
      emailContent = generateLastCancelDayEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "⚡ SOFORT KÜNDIGEN",
          url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel&urgent=true`,
          style: "urgent"
        }
      ];
      break;
      
    case "CANCEL_WARNING":
      subject = `⚠️ Nur noch ${event.metadata.daysLeft} Tage: ${event.metadata.contractName}`;
      emailContent = generateCancelWarningEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "📅 Zur Kündigung",
          url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`,
          style: "warning"
        },
        {
          text: "🔄 Optimieren",
          url: `${baseUrl}/optimize/${event.contractId}`,
          style: "secondary"
        }
      ];
      break;
      
    case "PRICE_INCREASE":
      subject = `💰 Preiserhöhung: ${event.metadata.contractName}`;
      emailContent = generatePriceIncreaseEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "🔍 Günstigere Angebote finden",
          url: `${baseUrl}/compare?contractId=${event.contractId}&reason=price_increase`,
          style: "primary"
        },
        {
          text: "📝 Kündigung vorbereiten",
          url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}`,
          style: "secondary"
        }
      ];
      break;
      
    case "AUTO_RENEWAL":
      subject = `🔄 Automatische Verlängerung: ${event.metadata.contractName}`;
      emailContent = generateAutoRenewalEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "🛑 Verlängerung stoppen",
          url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`,
          style: "warning"
        },
        {
          text: "📋 Vertrag prüfen",
          url: `${baseUrl}/contracts/${event.contractId}`,
          style: "secondary"
        }
      ];
      break;
      
    case "REVIEW":
      subject = `🔍 Zeit für einen Check: ${event.metadata.contractName}`;
      emailContent = generateReviewEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "🎯 Jetzt optimieren",
          url: `${baseUrl}/optimize/${event.contractId}`,
          style: "primary"
        },
        {
          text: "📊 Markt vergleichen",
          url: `${baseUrl}/compare?contractId=${event.contractId}`,
          style: "secondary"
        }
      ];
      break;
      
    default:
      subject = `📅 Vertragserinnerung: ${event.title}`;
      emailContent = generateGenericEmail(event, actionToken, baseUrl);
      ctaButtons = [
        {
          text: "📋 Details anzeigen",
          url: `${baseUrl}/contracts/${event.contractId}`,
          style: "primary"
        }
      ];
  }
  
  // Erstelle HTML-Email mit Template
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
  
  // Sende E-Mail
  await transporter.sendMail({
    from: `"Contract AI Calendar" <${process.env.EMAIL_USER}>`,
    to: event.user.email,
    subject: subject,
    html: htmlContent
  });
  
  console.log(`📧 Benachrichtigung gesendet: ${subject} an ${event.user.email}`);
}

/**
 * Generiert einen sicheren Action-Token für Quick Actions
 */
async function generateActionToken(eventId, userId) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    { 
      eventId: eventId.toString(),
      userId: userId.toString(),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 Tage gültig
    },
    process.env.JWT_SECRET
  );
}

/**
 * Email-Content-Generatoren für verschiedene Event-Typen
 */
function generateCancelWindowEmail(event, token, baseUrl) {
  const daysUntilExpiry = Math.ceil((new Date(event.metadata.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  return `
    <h2 style="color: #34c759;">✅ Gute Nachrichten!</h2>
    <p>Das Kündigungsfenster für <strong>${event.metadata.contractName}</strong> ist jetzt geöffnet.</p>
    
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <h3>📊 Wichtige Informationen:</h3>
      <ul style="list-style: none; padding: 0;">
        <li>📅 <strong>Vertragsende:</strong> ${new Date(event.metadata.expiryDate).toLocaleDateString('de-DE')}</li>
        <li>⏰ <strong>Kündigungsfrist:</strong> ${event.metadata.noticePeriodDays} Tage</li>
        <li>📍 <strong>Anbieter:</strong> ${event.metadata.provider || 'Unbekannt'}</li>
        <li>⏳ <strong>Verbleibende Zeit:</strong> ${daysUntilExpiry} Tage</li>
      </ul>
    </div>
    
    <p><strong>Was können Sie jetzt tun?</strong></p>
    <ul>
      <li>🚀 <strong>Kündigen:</strong> Beenden Sie den Vertrag mit nur einem Klick</li>
      <li>📊 <strong>Vergleichen:</strong> Finden Sie bessere Alternativen am Markt</li>
      <li>🎯 <strong>Optimieren:</strong> Lassen Sie unsere KI den besten Deal finden</li>
    </ul>
  `;
}

function generateLastCancelDayEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff3b30;">🚨 DRINGEND: Letzte Chance!</h2>
    <p style="font-size: 18px; color: #ff3b30;"><strong>HEUTE ist der letzte Tag</strong>, um "${event.metadata.contractName}" zu kündigen!</p>
    
    <div style="background: #fef2f2; border: 2px solid #ff3b30; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="color: #ff3b30; margin-top: 0;">⚠️ Was passiert, wenn Sie nicht handeln:</h3>
      <ul style="color: #991b1b;">
        <li>Der Vertrag verlängert sich automatisch um <strong>${event.metadata.autoRenewMonths} Monate</strong></li>
        <li>Sie sind weitere ${event.metadata.autoRenewMonths} Monate gebunden</li>
        <li>Mögliche Preiserhöhungen werden wirksam</li>
        <li>Die nächste Kündigungsmöglichkeit ist erst in ${event.metadata.autoRenewMonths} Monaten</li>
      </ul>
    </div>
    
    <p style="font-size: 16px;"><strong>Handeln Sie JETZT!</strong> Nutzen Sie unseren 1-Klick-Kündigungsservice:</p>
  `;
}

function generateCancelWarningEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff9500;">⚠️ Wichtige Erinnerung</h2>
    <p>In <strong>${event.metadata.daysLeft} Tagen</strong> endet die Kündigungsfrist für "${event.metadata.contractName}".</p>
    
    <div style="background: #fffbeb; border-left: 4px solid #ff9500; padding: 15px; margin: 20px 0;">
      <h3>⏰ Zeitplan:</h3>
      <ul style="list-style: none; padding: 0;">
        <li>📅 <strong>Heute:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
        <li>🔔 <strong>Kündigungsfrist endet:</strong> in ${event.metadata.daysLeft} Tagen</li>
        <li>📍 <strong>Anbieter:</strong> ${event.metadata.provider || 'Unbekannt'}</li>
      </ul>
    </div>
    
    <p>Verpassen Sie nicht die Chance, zu kündigen oder bessere Konditionen zu finden!</p>
  `;
}

function generatePriceIncreaseEmail(event, token, baseUrl) {
  const increase = event.metadata.newPrice && event.metadata.oldPrice 
    ? ((event.metadata.newPrice - event.metadata.oldPrice) / event.metadata.oldPrice * 100).toFixed(1)
    : null;
  
  return `
    <h2 style="color: #ff6b35;">💰 Preiserhöhung angekündigt</h2>
    <p>Der Preis für "${event.metadata.contractName}" wird erhöht.</p>
    
    <div style="background: #fef3e2; border-left: 4px solid #ff6b35; padding: 15px; margin: 20px 0;">
      <h3>📈 Details der Preiserhöhung:</h3>
      <ul style="list-style: none; padding: 0;">
        ${event.metadata.oldPrice ? `<li>💶 <strong>Alter Preis:</strong> ${event.metadata.oldPrice}€</li>` : ''}
        ${event.metadata.newPrice ? `<li>💸 <strong>Neuer Preis:</strong> ${event.metadata.newPrice}€</li>` : ''}
        ${increase ? `<li>📊 <strong>Erhöhung:</strong> +${increase}%</li>` : ''}
        <li>📅 <strong>Ab:</strong> ${new Date(event.date).toLocaleDateString('de-DE')}</li>
      </ul>
    </div>
    
    <p><strong>Unsere Empfehlung:</strong> Prüfen Sie jetzt günstigere Alternativen!</p>
  `;
}

function generateAutoRenewalEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #5c7cfa;">🔄 Automatische Verlängerung steht bevor</h2>
    <p>"${event.metadata.contractName}" verlängert sich automatisch um <strong>${event.metadata.autoRenewMonths} Monate</strong>.</p>
    
    <div style="background: #eef2ff; border-left: 4px solid #5c7cfa; padding: 15px; margin: 20px 0;">
      <h3>📋 Vertragsdetails:</h3>
      <ul style="list-style: none; padding: 0;">
        <li>📅 <strong>Verlängerung am:</strong> ${new Date(event.date).toLocaleDateString('de-DE')}</li>
        <li>⏱️ <strong>Neue Laufzeit:</strong> ${event.metadata.autoRenewMonths} Monate</li>
        <li>📆 <strong>Neues Ende:</strong> ${new Date(event.metadata.newExpiryDate).toLocaleDateString('de-DE')}</li>
      </ul>
    </div>
    
    <p>Möchten Sie die Verlängerung verhindern? Handeln Sie jetzt!</p>
  `;
}

function generateReviewEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #10b981;">🔍 Zeit für einen Vertrags-Check!</h2>
    <p>Ihr Vertrag "${event.metadata.contractName}" läuft seit <strong>${event.metadata.contractAge}</strong>.</p>
    
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
      <h3>💡 Warum ein Review wichtig ist:</h3>
      <ul>
        <li>📊 Marktpreise haben sich möglicherweise geändert</li>
        <li>🆕 Neue Anbieter mit besseren Konditionen</li>
        <li>🎯 Ihre Bedürfnisse könnten sich geändert haben</li>
        <li>💰 Sparpotenzial von durchschnittlich 20-30%</li>
      </ul>
    </div>
    
    <p><strong>Nutzen Sie unsere KI-Analyse</strong> für personalisierte Optimierungsvorschläge!</p>
  `;
}

function generateGenericEmail(event, token, baseUrl) {
  return `
    <h2>📅 ${event.title}</h2>
    <p>${event.description}</p>
    
    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
      <p><strong>Details:</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>📅 <strong>Datum:</strong> ${new Date(event.date).toLocaleDateString('de-DE')}</li>
        <li>📍 <strong>Vertrag:</strong> ${event.metadata.contractName}</li>
        ${event.metadata.provider ? `<li>🏢 <strong>Anbieter:</strong> ${event.metadata.provider}</li>` : ''}
      </ul>
    </div>
  `;
}

/**
 * Generiert Quick Action Links für die E-Mail
 */
function generateQuickActionLinks(event, token, baseUrl) {
  return [
    {
      icon: "📅",
      text: "Im Kalender anzeigen",
      url: `${baseUrl}/calendar?highlight=${event._id}`
    },
    {
      icon: "⏰",
      text: "Erinnern in 7 Tagen",
      url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=snooze&days=7`
    },
    {
      icon: "🔕",
      text: "Erinnerung ausschalten",
      url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=dismiss`
    }
  ];
}

/**
 * Generiert das HTML-Template für Calendar-E-Mails
 */
function generateCalendarEmailTemplate(params) {
  const {
    title,
    preheader,
    eventType,
    severity,
    contractName,
    eventDate,
    content,
    ctaButtons,
    quickActions,
    unsubscribeUrl
  } = params;
  
  // Farben basierend auf Severity
  const severityColors = {
    info: "#3b82f6",
    warning: "#ff9500",
    critical: "#ff3b30"
  };
  
  const primaryColor = severityColors[severity] || "#3b82f6";
  
  // CTA Button HTML generieren
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
            <a href="${button.url}" target="_blank" 
               style="display: inline-block; padding: 14px 28px; font-size: 16px; 
                      font-weight: 600; color: ${colors.text}; text-decoration: none;">
              ${button.text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }).join('');
  
  // Quick Actions HTML
  const quickActionsHtml = quickActions.map(action => `
    <a href="${action.url}" style="display: inline-block; margin: 0 10px; 
                                   color: #6b7280; text-decoration: none; font-size: 14px;">
      ${action.icon} ${action.text}
    </a>
  `).join(' | ');
  
  return generateEmailTemplate({
    title: title,
    preheader: preheader,
    body: `
      <div style="margin-bottom: 30px;">
        ${content}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        ${ctaHtml}
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; 
                  text-align: center; font-size: 14px; color: #6b7280;">
        <p><strong>Quick Actions:</strong></p>
        <div style="margin: 15px 0;">
          ${quickActionsHtml}
        </div>
      </div>
    `,
    unsubscribeUrl: unsubscribeUrl
  });
}

module.exports = {
  checkAndSendNotifications,
  sendEventNotification
};
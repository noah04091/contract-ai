// backend/services/calendarDigestService.js
// Digest-Service fuer Kalender-E-Mails (Zusammenfassung statt Einzel-E-Mails)

const { ObjectId } = require("mongodb");
const { queueEmail } = require("./emailRetryService");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { generateUnsubscribeUrl } = require("./emailUnsubscribeService");

/**
 * Sammelt Events fuer einen User und erstellt eine Digest-E-Mail
 * @param {Object} db - MongoDB-Instanz
 * @param {string} userId - User-ID
 * @param {Array} events - Array von Events fuer diesen User
 * @param {Object} user - User-Objekt mit email, name, etc.
 */
async function createDigestEmail(db, userId, events, user) {
  if (!events || events.length === 0) {
    return null;
  }

  // Sortiere Events nach Severity und Datum
  const sortedEvents = [...events].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    if (severityDiff !== 0) return severityDiff;
    return new Date(a.date) - new Date(b.date);
  });

  // Gruppiere nach Severity
  const critical = sortedEvents.filter(e => e.severity === "critical");
  const warning = sortedEvents.filter(e => e.severity === "warning");
  const info = sortedEvents.filter(e => e.severity === "info");

  // Generiere HTML-Content
  const htmlContent = generateDigestHtml(sortedEvents, critical, warning, info, user);

  // Betreffzeile basierend auf Inhalt
  let subject = "";
  if (critical.length > 0) {
    subject = `🚨 DRINGEND: ${critical.length} kritische Frist${critical.length > 1 ? "en" : ""} + ${warning.length + info.length} weitere`;
  } else if (warning.length > 0) {
    subject = `⚠️ ${warning.length} wichtige Erinnerung${warning.length > 1 ? "en" : ""} + ${info.length} weitere`;
  } else {
    subject = `📅 ${info.length} Vertragserinnerung${info.length > 1 ? "en" : ""} fuer heute`;
  }

  // Zur Queue hinzufuegen
  const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";

  await queueEmail(db, {
    to: user.email,
    subject: subject,
    html: htmlContent,
    from: `"Contract AI" <${process.env.EMAIL_USER}>`,
    userId: userId,
    emailType: "calendar_digest"
  });

  console.log(`📬 Digest-E-Mail erstellt: ${events.length} Events fuer ${user.email}`);

  return {
    userId,
    eventCount: events.length,
    critical: critical.length,
    warning: warning.length,
    info: info.length
  };
}

/**
 * Generiert das HTML fuer die Digest-E-Mail
 */
function generateDigestHtml(allEvents, critical, warning, info, user) {
  const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
  const userName = user.name || user.email.split("@")[0];

  // Kritische Events Section
  const criticalHtml = critical.length > 0 ? `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #dc2626; margin: 0 0 16px; font-size: 18px; display: flex; align-items: center;">
        🚨 KRITISCH - Heute handeln! (${critical.length})
      </h2>
      ${critical.map(event => generateEventCard(event, "critical", baseUrl)).join("")}
    </div>
  ` : "";

  // Warning Events Section
  const warningHtml = warning.length > 0 ? `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #f59e0b; margin: 0 0 16px; font-size: 18px;">
        ⚠️ Wichtig - Bald faellig (${warning.length})
      </h2>
      ${warning.map(event => generateEventCard(event, "warning", baseUrl)).join("")}
    </div>
  ` : "";

  // Info Events Section
  const infoHtml = info.length > 0 ? `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #3b82f6; margin: 0 0 16px; font-size: 18px;">
        ℹ️ Zur Info (${info.length})
      </h2>
      ${info.map(event => generateEventCard(event, "info", baseUrl)).join("")}
    </div>
  ` : "";

  // Statistik-Box
  const statsHtml = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 32px; text-align: center;">
      <h2 style="margin: 0 0 16px; font-size: 22px;">📊 Deine Vertrags-Uebersicht</h2>
      <div style="display: flex; justify-content: center; gap: 32px; flex-wrap: wrap;">
        <div style="text-align: center;">
          <div style="font-size: 32px; font-weight: bold;">${allEvents.length}</div>
          <div style="opacity: 0.9; font-size: 14px;">Gesamt</div>
        </div>
        ${critical.length > 0 ? `
        <div style="text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #fecaca;">${critical.length}</div>
          <div style="opacity: 0.9; font-size: 14px;">Kritisch</div>
        </div>
        ` : ""}
        ${warning.length > 0 ? `
        <div style="text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #fef08a;">${warning.length}</div>
          <div style="opacity: 0.9; font-size: 14px;">Wichtig</div>
        </div>
        ` : ""}
      </div>
    </div>
  `;

  return generateEmailTemplate({
    title: `Guten Morgen, ${userName}!`,
    preheader: `${allEvents.length} Vertragserinnerungen fuer heute`,
    body: `
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Hier ist deine taegliche Zusammenfassung aller anstehenden Vertragsfristen und Erinnerungen.
      </p>

      ${statsHtml}
      ${criticalHtml}
      ${warningHtml}
      ${infoHtml}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${baseUrl}/calendar" style="display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          📅 Zum Kalender
        </a>
      </div>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          Du erhaeltst diese E-Mail als taegliche Zusammenfassung.<br>
          <a href="${baseUrl}/profile" style="color: #3b82f6;">Einstellungen aendern</a>
        </p>
      </div>
    `,
    recipientEmail: user.email,
    emailCategory: 'calendar'
  });
}

/**
 * Generiert eine Event-Karte fuer die Digest-E-Mail
 */
function generateEventCard(event, severity, baseUrl) {
  const colors = {
    critical: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b", badge: "#dc2626" },
    warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", badge: "#f59e0b" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", badge: "#3b82f6" }
  };
  const c = colors[severity] || colors.info;

  const eventDate = new Date(event.date);
  const today = new Date();
  const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

  let daysText = "";
  if (daysUntil === 0) {
    daysText = "HEUTE";
  } else if (daysUntil === 1) {
    daysText = "Morgen";
  } else if (daysUntil < 0) {
    daysText = `vor ${Math.abs(daysUntil)} Tagen`;
  } else {
    daysText = `in ${daysUntil} Tagen`;
  }

  const contractName = event.metadata?.contractName || event.title || "Unbekannter Vertrag";
  const provider = event.metadata?.provider || "";

  return `
    <div style="background: ${c.bg}; border-left: 4px solid ${c.border}; padding: 16px 20px; margin-bottom: 12px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 4px; color: ${c.text}; font-size: 15px; font-weight: 600;">
            ${contractName}
          </h3>
          ${provider ? `<p style="margin: 0; color: #6b7280; font-size: 13px;">${provider}</p>` : ""}
        </div>
        <span style="background: ${c.badge}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap;">
          ${daysText}
        </span>
      </div>
      <p style="margin: 8px 0 12px; color: #4b5563; font-size: 14px;">
        ${event.title || event.type}
      </p>
      <div style="display: flex; gap: 12px;">
        <a href="${baseUrl}/contracts/${event.contractId}" style="color: ${c.border}; font-size: 13px; text-decoration: none; font-weight: 500;">
          Details →
        </a>
        <a href="${baseUrl}/calendar?eventId=${event._id}" style="color: #6b7280; font-size: 13px; text-decoration: none;">
          Im Kalender
        </a>
      </div>
    </div>
  `;
}

/**
 * Verarbeitet alle anstehenden Events und erstellt Digests pro User
 * @param {Object} db - MongoDB-Instanz
 * @returns {Object} Statistiken
 */
async function processDigests(db) {
  console.log("📬 Starte Digest-Verarbeitung...");

  const now = new Date();
  const lookaheadDays = parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || "7");
  const lookaheadDate = new Date();
  lookaheadDate.setDate(lookaheadDate.getDate() + lookaheadDays);

  // Hole alle anstehenden Events gruppiert nach User
  const eventsByUser = await db.collection("contract_events")
    .aggregate([
      {
        $match: {
          date: { $gte: now, $lte: lookaheadDate },
          status: "scheduled",
          severity: { $in: ["warning", "critical", "info"] }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "user.emailDigestMode": "daily", // Nur User mit Digest-Modus
          "user.subscriptionPlan": { $ne: "free" } // Keine Free-User
        }
      },
      {
        $group: {
          _id: "$userId",
          user: { $first: "$user" },
          events: { $push: "$$ROOT" }
        }
      }
    ])
    .toArray();

  console.log(`📊 ${eventsByUser.length} User mit Digest-Modus gefunden`);

  let stats = { users: 0, events: 0, errors: 0 };

  for (const group of eventsByUser) {
    try {
      const result = await createDigestEmail(
        db,
        group._id.toString(),
        group.events,
        group.user
      );

      if (result) {
        stats.users++;
        stats.events += result.eventCount;

        // Markiere Events als "queued"
        const eventIds = group.events.map(e => e._id);
        await db.collection("contract_events").updateMany(
          { _id: { $in: eventIds } },
          {
            $set: {
              status: "queued",
              queuedAt: new Date(),
              digestMode: true,
              updatedAt: new Date()
            }
          }
        );
      }
    } catch (error) {
      console.error(`❌ Fehler beim Digest fuer User ${group._id}:`, error);
      stats.errors++;
    }
  }

  console.log(`✅ Digest-Verarbeitung: ${stats.users} User, ${stats.events} Events, ${stats.errors} Fehler`);
  return stats;
}

/**
 * Prueft ob ein User Digest-Modus aktiviert hat
 * @param {Object} user - User-Objekt
 * @returns {boolean}
 */
function userPrefersDigest(user) {
  return user?.emailDigestMode === "daily" || user?.emailDigestMode === "weekly";
}

module.exports = {
  createDigestEmail,
  processDigests,
  userPrefersDigest,
  generateDigestHtml
};

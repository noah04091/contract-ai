/**
 * Pulse V2 Staleness Reminder
 *
 * Sends consolidated email reminders to users whose contracts
 * haven't been scanned in 14+ days. Runs Monday 08:00 UTC.
 *
 * Cooldown: Max 1 reminder per 14 days per user (no spam).
 * Only targets users who have at least 1 completed V2 result.
 */

const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const { queueEmail } = require("../services/emailRetryService");
const {
  generateEmailTemplate,
  generateParagraph,
  generateStatsRow,
  generateDivider,
  generateEventCard,
  generateAlertBox,
} = require("../utils/emailTemplate");
// Neues, eigenständiges Pulse-Mail-Design (responsiv) — berührt keine andere Mail.
const {
  generatePulseEmailTemplate, pulseHeadline, pulseLead, pulseSection, pulseReassurance, pulseNote,
} = require("../utils/pulseEmailTemplate");
const { cleanContractName } = require("../utils/cleanContractName");
// Gemeinsame Text-Helfer: Ein-/Mehrzahl + Anrede (siehe utils/mailText.js).
const { plural, greetingName } = require("../utils/mailText");
// Legal Pulse ist ein Business+-Feature — Zugang inkl. Org-Vererbung (siehe utils/pulseAccess.js).
const { hasPulseAccess, PULSE_ACCESS_PROJECTION, pulseEmailsDisabled } = require("../utils/pulseAccess");
// Sichtbarer Abmelde-Link: dieselbe Token-Maschinerie wie der List-Unsubscribe-Header.
// Der frühere statische Link (/unsubscribe?type=legal_pulse) war token-los — die
// Abmelde-Seite verlangt aber zwingend einen Token und zeigte "Abmeldung fehlgeschlagen".
const { generateUnsubscribeUrl, EMAIL_CATEGORIES } = require("../services/emailUnsubscribeService");

const STALENESS_THRESHOLD_DAYS = 14;
const COOLDOWN_DAYS = 14;
const MAX_USERS_PER_RUN = 50;
const MAX_CONTRACTS_IN_EMAIL = 5;

/**
 * Main entry point — called by cron in server.js
 */
async function runStalenessReminder(db) {
  console.log("[PulseV2Staleness] Starting staleness reminder check...");
  const startTime = Date.now();

  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALENESS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const cooldownThreshold = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  // Ensure index on reminder log
  const reminderLog = db.collection("pulse_v2_staleness_log");
  await reminderLog.createIndex(
    { userId: 1, sentAt: -1 },
    { background: true }
  ).catch(() => {});

  // 1. Find users with completed V2 analyses
  const usersWithResults = await LegalPulseV2Result.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$userId" } },
  ]);

  const userIds = usersWithResults.map(u => u._id);
  if (userIds.length === 0) {
    console.log("[PulseV2Staleness] No users with V2 results. Skipping.");
    return { usersChecked: 0, remindersSent: 0, durationMs: Date.now() - startTime };
  }

  // 2. Filter out users who received a reminder recently (cooldown)
  const recentReminders = await reminderLog.find({
    userId: { $in: userIds },
    sentAt: { $gte: cooldownThreshold },
  }).project({ userId: 1 }).toArray();

  const cooledDownUserIds = new Set(recentReminders.map(r => r.userId));
  const eligibleUserIds = userIds.filter(id => !cooledDownUserIds.has(id));

  if (eligibleUserIds.length === 0) {
    console.log("[PulseV2Staleness] All users within cooldown. Skipping.");
    return { usersChecked: userIds.length, remindersSent: 0, durationMs: Date.now() - startTime };
  }

  // 3. For each eligible user, find stale contracts
  let remindersSent = 0;

  for (const userId of eligibleUserIds.slice(0, MAX_USERS_PER_RUN)) {
    try {
      const staleContracts = await findStaleContracts(userId, staleThreshold, db);

      if (staleContracts.length === 0) continue;

      // Get user info — TÜV-Fix 21.07.: results.userId ist STRING, users._id ObjectId.
      // Die alte $or-Suche fand nie jemanden → Staleness-Mails wurden still nie versendet
      // (gleicher Bug wie im Wach-Bericht).
      const { ObjectId } = require("mongodb");
      const idCandidates = [userId, String(userId)];
      try { if (ObjectId.isValid(String(userId))) idCandidates.push(new ObjectId(String(userId))); } catch { /* ignore */ }
      const user = await db.collection("users").findOne(
        { _id: { $in: idCandidates } },
        { projection: { email: 1, name: 1, firstName: 1, legalPulseSettings: 1, ...PULSE_ACCESS_PROJECTION } }
      );

      if (!user?.email) continue;

      // Plan-Guard (10.08.2026): Diese Mail sagt woertlich, Contract AI ueberwache
      // die Vertraege automatisch — im Free-Plan stimmt das nicht. Sie ging real an
      // ein gekuendigtes Konto (27.07. und nochmal 10.08.).
      if (!(await hasPulseAccess(db, user))) continue;

      // Feiner Opt-out (19.08.2026): Pulse-Mails auf /pulse abgeschaltet → keine
      // Erinnerungs-Mail (dieser Job IST nur eine Mail). Fail-open.
      if (pulseEmailsDisabled(user)) continue;

      // Send reminder — null = kein Name hinterlegt, die Mail grüßt dann neutral mit "Hallo,"
      const userName = greetingName(user);
      await sendStalenessEmail(db, user.email, userName, userId, staleContracts);

      // Log reminder
      await reminderLog.insertOne({
        userId,
        sentAt: now,
        contractCount: staleContracts.length,
        contracts: staleContracts.slice(0, 5).map(c => ({
          contractId: c.contractId,
          name: c.name,
          daysStale: c.daysStale,
          lastScore: c.lastScore,
        })),
      });

      remindersSent++;
    } catch (err) {
      console.error(`[PulseV2Staleness] Error for user ${userId}:`, err.message);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[PulseV2Staleness] Done. ${eligibleUserIds.length} eligible, ${remindersSent} reminders sent. ${Math.round(durationMs / 1000)}s`
  );

  return {
    usersChecked: userIds.length,
    eligibleUsers: eligibleUserIds.length,
    remindersSent,
    durationMs,
  };
}

/**
 * Find contracts with stale V2 analyses for a user
 * Returns sorted by priority: low score first, then oldest scan
 */
async function findStaleContracts(userId, staleThreshold, db) {
  // Get latest V2 result per contract
  const latestResults = await LegalPulseV2Result.aggregate([
    { $match: { userId, status: "completed" } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$contractId",
        lastAnalysis: { $first: "$createdAt" },
        score: { $first: "$scores.overall" },
        contractName: { $first: "$context.contractName" },
        criticalCount: {
          $first: {
            $size: {
              $filter: {
                input: { $ifNull: ["$clauseFindings", []] },
                cond: { $eq: ["$$this.severity", "critical"] },
              },
            },
          },
        },
        highCount: {
          $first: {
            $size: {
              $filter: {
                input: { $ifNull: ["$clauseFindings", []] },
                cond: { $eq: ["$$this.severity", "high"] },
              },
            },
          },
        },
      },
    },
    { $match: { lastAnalysis: { $lt: staleThreshold } } },
  ]);

  if (latestResults.length === 0) return [];

  // Enrich with contract names from contracts collection
  const contractIds = latestResults.map(r => r._id);
  const contracts = await db.collection("contracts")
    .find(
      { $or: contractIds.map(id => ({ _id: id })).concat(contractIds.map(id => ({ _id: require("mongodb").ObjectId.isValid(id) ? new (require("mongodb").ObjectId)(id) : id }))) },
      { projection: { _id: 1, name: 1, contractType: 1 } }
    )
    .toArray();

  const contractMap = new Map(contracts.map(c => [c._id.toString(), c]));

  // Build stale contract list with priority sorting
  const staleContracts = latestResults.map(r => {
    const contract = contractMap.get(r._id) || {};
    const daysStale = Math.floor((Date.now() - new Date(r.lastAnalysis).getTime()) / (1000 * 60 * 60 * 24));
    const riskLevel = r.criticalCount > 0 ? "critical" : r.highCount > 0 ? "high" : r.score < 50 ? "medium" : "low";

    return {
      contractId: r._id,
      name: r.contractName || contract.name || "Unbenannt",
      contractType: contract.contractType || null,
      lastScore: r.score || 0,
      lastAnalysis: r.lastAnalysis,
      daysStale,
      criticalCount: r.criticalCount || 0,
      highCount: r.highCount || 0,
      riskLevel,
    };
  });

  // 04.09.2026 (Masterplan Phase 4): Letzten Versuch je Vertrag UNABHÄNGIG vom Status
  // holen. Ein Vertrag, dessen jüngster Lauf fehlschlug, sah hier bisher nur „alt" aus,
  // nie „kaputt" — die Mail forderte dann zu einer Prüfung auf, die gar nicht
  // funktionieren konnte (belegt: Mail vom 31.08. listete zwei Verträge, deren
  // Re-Analyse seit Monaten am selben Fehler scheiterte).
  const letzteVersuche = await LegalPulseV2Result.aggregate([
    { $match: { userId, contractId: { $in: contractIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$contractId", lastStatus: { $first: "$status" } } },
  ]);
  const versuchMap = new Map(letzteVersuche.map(v => [String(v._id), v.lastStatus]));
  for (const c of staleContracts) {
    c.lastAttemptFailed = versuchMap.get(String(c.contractId)) === "failed";
  }

  sortStaleContracts(staleContracts);
  return staleContracts;
}

/**
 * Sort: critical risk first, then low score, then OLDEST first.
 * 04.09.2026: Der dritte Schlüssel stand andersherum (a.daysStale - b.daysStale =
 * jüngste zuerst) — bei mehr als MAX_CONTRACTS_IN_EMAIL Verträgen fiel ausgerechnet
 * der am längsten ungeprüfte aus der Liste. Exportiert für den Regressionstest.
 */
function sortStaleContracts(staleContracts) {
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  staleContracts.sort((a, b) => {
    const riskDiff = (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
    if (riskDiff !== 0) return riskDiff;
    if (a.lastScore !== b.lastScore) return a.lastScore - b.lastScore;
    return b.daysStale - a.daysStale;
  });
  return staleContracts;
}

/**
 * Build the staleness reminder email (pure — exportiert für Tests).
 * 04.09.2026: aus sendStalenessEmail herausgelöst, damit Betreff/Body ohne DB
 * und Queue testbar sind (Muster: buildWeeklyReportEmail).
 */
function buildStalenessEmail(email, userName, staleContracts) {
  const criticalContracts = staleContracts.filter(c => c.riskLevel === "critical" || c.riskLevel === "high");
  const failedContracts = staleContracts.filter(c => c.lastAttemptFailed);
  const topContracts = staleContracts.slice(0, MAX_CONTRACTS_IN_EMAIL);

  // Intro
  let body = pulseHeadline(
    staleContracts.length === 1
      ? "Ein Vertrag sollte neu geprüft werden"
      : "Ein paar Verträge sollten neu geprüft werden"
  );
  body += pulseLead(userName ? `Hallo ${userName},` : "Hallo,");
  body += pulseLead(
    `<strong style="color:#1a1f36;">${staleContracts.length} deiner Verträge</strong> ${staleContracts.length === 1 ? "wurde" : "wurden"} seit über 14 Tagen nicht mehr geprüft. Neue Gesetze oder Risiken könnten unbemerkt bleiben &mdash; eine kurze erneute Prüfung schafft Sicherheit.`
  );

  topContracts.forEach((c, idx) => {
    const dot = c.riskLevel === "critical" ? "#dc2626" : c.riskLevel === "high" ? "#ea580c" : "#d97706";
    // Wortwahl bewusst identisch zu pulseV2Monitor.js (dort: "Kritisch"/"Hoch").
    // Vorher standen die Stufen andersherum ("critical" hieß "Erhöhtes Risiko",
    // "high" hieß "Hohes Risiko") — das war gegenüber riskOrder (in findStaleContracts) und
    // der Risiko-Skala im Frontend genau verkehrt: der schlimmste Vertrag stand
    // oben in der Liste, trug aber das harmlosere Etikett.
    const statusText = c.riskLevel === "critical" ? "Kritisch"
      : c.riskLevel === "high" ? "Hoch"
      : `Score ${c.lastScore}`;
    // 04.09.2026: „zuletzt geprüft" heißt genauer „zuletzt ERFOLGREICH geprüft" —
    // und ein zwischenzeitlich gescheiterter Versuch wird jetzt ehrlich benannt.
    const metaParts = [
      c.contractType,
      `zuletzt erfolgreich geprüft vor ${c.daysStale} Tagen`,
      c.lastAttemptFailed ? "letzter automatischer Versuch fehlgeschlagen" : null,
    ].filter(Boolean);
    body += pulseSection({
      name: cleanContractName(c.name),
      dotColor: dot,
      statusText,
      statusColor: dot,
      metaText: metaParts.join(" &middot; "),
      isFirst: idx === 0,
    });
  });

  if (staleContracts.length > MAX_CONTRACTS_IN_EMAIL) {
    const rest = staleContracts.length - MAX_CONTRACTS_IN_EMAIL;
    body += pulseLead(`<span style="color:#8792a2; font-size:13px;">+ ${rest} ${plural(rest, "weiterer Vertrag", "weitere Verträge")}</span>`);
  }

  // 04.09.2026: „Ein Klick genügt" war nicht einlösbar — der Knopf führt zur
  // Übersicht, die Prüfung startet man dort je Vertrag. Jetzt ehrlich formuliert;
  // bei fehlgeschlagenen Versuchen wird das zusätzlich klar benannt.
  if (failedContracts.length > 0) {
    body += pulseLead(
      `<strong style="color:#1a1f36;">Hinweis:</strong> ${failedContracts.length === staleContracts.length ? (failedContracts.length === 1 ? "Bei diesem Vertrag" : "Bei diesen Verträgen") : `Bei ${failedContracts.length} von ${staleContracts.length} Verträgen`} ist die letzte automatische Prüfung fehlgeschlagen. Starte die Prüfung in Legal Pulse neu &mdash; schlägt sie erneut fehl, sind wir bereits informiert und kümmern uns.`
    );
  }
  body += pulseReassurance({
    text: `Öffne Legal Pulse und starte dort die erneute Prüfung &mdash; wir gleichen deine Verträge gegen die aktuelle Rechtslage ab und sagen dir, ob etwas zu tun ist.`,
    buttonText: "Zu Legal Pulse",
    buttonUrl: "https://contract-ai.de/pulse",
  });
  // 02.09.2026: Beide Abmelde-Wege existieren und stoppen dasselbe (nur Legal Pulse,
  // Kategorie legal_pulse): der Footer-Link und der Schalter auf /pulse
  // (PulseEmailSettings, seit 19.08. live). Fristen-Mails bleiben unberührt.
  body += pulseNote(
    "Du bekommst diese E-Mail, weil Contract&nbsp;AI diese Verträge automatisch für dich überwacht. Die Legal-Pulse-Mails kannst du jederzeit abschalten &mdash; über &bdquo;Benachrichtigungen abmelden&ldquo; unten in dieser E-Mail oder auf deiner Pulse-Seite unter &bdquo;E-Mail-Benachrichtigungen&ldquo;. Deine Fristen-Erinnerungen bleiben davon unberührt."
  );

  // 04.09.2026: Betreff und Fließtext nannten verschiedene Zahlen (Betreff zählte
  // nur die Risiko-Verträge, der Text alle — Mail vom 31.08.: Betreff „2", Text „3").
  // Jetzt führt der Betreff mit derselben Gesamtzahl wie der Text; das Risiko bleibt
  // als Zusatz erhalten.
  const n = staleContracts.length;
  const k = criticalContracts.length;
  const subject = k > 0
    ? (k === n
        ? `${n} ${plural(n, "Vertrag", "Verträge")} mit Risiko seit über 14 Tagen nicht geprüft`
        : `${n} ${plural(n, "Vertrag", "Verträge")} seit über 14 Tagen nicht geprüft — ${k} mit Risiko`)
    : `${n} ${plural(n, "Vertrag", "Verträge")} seit über 14 Tagen nicht geprüft`;

  const preheader = criticalContracts.length > 0
    ? `${criticalContracts.length} ${plural(criticalContracts.length, "Vertrag", "Verträge")} mit erhöhtem Risiko ${plural(criticalContracts.length, "wartet", "warten")} auf Prüfung`
    : `${staleContracts.length} ${plural(staleContracts.length, "Vertrag", "Verträge")} ${plural(staleContracts.length, "sollte", "sollten")} erneut geprüft werden`;

  const html = generatePulseEmailTemplate({
    body,
    badge: "Legal Pulse",
    preheader,
    unsubscribeUrl: generateUnsubscribeUrl(email, EMAIL_CATEGORIES.LEGAL_PULSE),
  });

  return { subject, preheader, html };
}

/**
 * Queue the staleness reminder email (Versand-Hülle um den reinen Builder).
 */
async function sendStalenessEmail(db, email, userName, userId, staleContracts) {
  const { subject, html } = buildStalenessEmail(email, userName, staleContracts);
  await queueEmail(db, {
    to: email,
    subject,
    html,
    userId,
    emailType: "legal_pulse_v2_staleness",
  });
}

module.exports = { runStalenessReminder, buildStalenessEmail, sortStaleContracts };

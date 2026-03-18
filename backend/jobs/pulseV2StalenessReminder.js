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

      // Get user info
      const user = await db.collection("users").findOne(
        { $or: [{ _id: userId }, { userId }] },
        { projection: { email: 1, name: 1, firstName: 1 } }
      );

      if (!user?.email) continue;

      // Send reminder
      const userName = user.firstName || user.name || "Nutzer";
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

  // Sort: critical risk first, then low score, then oldest
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  staleContracts.sort((a, b) => {
    const riskDiff = (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
    if (riskDiff !== 0) return riskDiff;
    if (a.lastScore !== b.lastScore) return a.lastScore - b.lastScore;
    return a.daysStale - b.daysStale;
  });

  return staleContracts;
}

/**
 * Build and queue the staleness reminder email
 */
async function sendStalenessEmail(db, email, userName, userId, staleContracts) {
  const criticalContracts = staleContracts.filter(c => c.riskLevel === "critical" || c.riskLevel === "high");
  const topContracts = staleContracts.slice(0, MAX_CONTRACTS_IN_EMAIL);

  // Intro
  let body = generateParagraph(`Hallo ${userName},`);

  if (criticalContracts.length > 0) {
    body += generateAlertBox(
      `${criticalContracts.length} Vertrag${criticalContracts.length === 1 ? "" : "e"} mit erhöhtem Risiko wurde${criticalContracts.length === 1 ? "" : "n"} länger nicht geprüft.`,
      "warning"
    );
  }

  body += generateParagraph(
    `${staleContracts.length} Ihrer Verträge wurde${staleContracts.length === 1 ? "" : "n"} seit über 14 Tagen nicht geprüft. ` +
    `Neue Risiken könnten unentdeckt bleiben.`
  );

  // Stats
  const stats = [
    { value: String(staleContracts.length), label: "Verträge veraltet", color: "#d97706" },
  ];
  if (criticalContracts.length > 0) {
    stats.push({ value: String(criticalContracts.length), label: "Erhöhtes Risiko", color: "#dc2626" });
  }
  body += generateStatsRow(stats);
  body += generateDivider();

  // Contract cards
  for (const c of topContracts) {
    const badgeColor = c.riskLevel === "critical" ? "#dc2626"
      : c.riskLevel === "high" ? "#ea580c"
      : c.lastScore < 50 ? "#d97706"
      : "#6b7280";

    const subtitle = [
      c.contractType,
      `Score: ${c.lastScore}`,
      `Letzte Prüfung: vor ${c.daysStale} Tagen`,
    ].filter(Boolean).join(" · ");

    body += generateEventCard({
      title: c.name,
      subtitle,
      badge: c.riskLevel === "critical" ? "Kritisch"
        : c.riskLevel === "high" ? "Hohes Risiko"
        : `Score ${c.lastScore}`,
      badgeColor,
      icon: c.riskLevel === "critical" || c.riskLevel === "high" ? "⚠️" : "📋",
    });
  }

  if (staleContracts.length > MAX_CONTRACTS_IN_EMAIL) {
    body += generateParagraph(
      `+ ${staleContracts.length - MAX_CONTRACTS_IN_EMAIL} weitere Verträge`,
      { muted: true }
    );
  }

  // Build final email
  const subject = criticalContracts.length > 0
    ? `⚠️ ${criticalContracts.length} Vertrag${criticalContracts.length === 1 ? "" : "e"} mit Risiko nicht geprüft`
    : `📋 ${staleContracts.length} Verträge seit über 14 Tagen nicht geprüft`;

  const preheader = criticalContracts.length > 0
    ? `${criticalContracts.length} Verträge mit erhöhtem Risiko warten auf Prüfung`
    : `${staleContracts.length} Verträge sollten erneut geprüft werden`;

  const html = generateEmailTemplate({
    title: "Legal Pulse — Erinnerung",
    body,
    preheader,
    cta: {
      text: "Jetzt prüfen →",
      url: "https://contract-ai.de/pulse",
    },
    unsubscribeUrl: "https://contract-ai.de/unsubscribe?type=legal_pulse",
  });

  await queueEmail(db, {
    to: email,
    subject,
    html,
    userId,
    emailType: "legal_pulse_v2_staleness",
  });
}

module.exports = { runStalenessReminder };

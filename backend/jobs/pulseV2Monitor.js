/**
 * Legal Pulse V2 — Automated Monitoring
 *
 * Periodically re-analyzes contracts and alerts users about NEW findings.
 * Uses existing V2 pipeline (stages 0-5) + change detection.
 *
 * Schedule: Sundays 05:00 UTC
 * Limits: max 5 contracts/user, max 20 contracts/run
 */

const { runPipeline } = require("../services/legalPulseV2");
const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const { queueEmail } = require("../services/emailRetryService");
const {
  generateEmailTemplate,
  generateEventCard,
  generateStatsRow,
  generateParagraph,
  generateDivider,
} = require("../utils/emailTemplate");

const MAX_PER_USER = 5;
const MAX_PER_RUN = 20;
const MIN_DAYS_SINCE_ANALYSIS = 7;

/**
 * Main monitoring entry point.
 * Called by cron via withCronLock in server.js.
 */
async function runPulseV2Monitor(db) {
  console.log("[PulseV2Monitor] Starting automated scan...");
  const startTime = Date.now();

  // 1. Find users with analyzed contracts
  const users = await findUsersForMonitoring(db);
  console.log(`[PulseV2Monitor] ${users.length} users eligible for monitoring`);

  let totalAnalyzed = 0;
  let totalAlerts = 0;
  let errors = 0;

  for (const user of users) {
    if (totalAnalyzed >= MAX_PER_RUN) {
      console.log("[PulseV2Monitor] Run limit reached, stopping");
      break;
    }

    try {
      const result = await monitorUserContracts(db, user);
      totalAnalyzed += result.analyzed;
      totalAlerts += result.alerts;
    } catch (err) {
      console.error(`[PulseV2Monitor] Error for user ${user.userId}:`, err.message);
      errors++;
    }
  }

  const duration = Date.now() - startTime;
  console.log(
    `[PulseV2Monitor] Done. ${totalAnalyzed} contracts analyzed, ${totalAlerts} alerts, ${errors} errors. Duration: ${Math.round(duration / 1000)}s`
  );

  return { totalAnalyzed, totalAlerts, errors, durationMs: duration };
}

/**
 * Find users who have at least one completed V2 analysis.
 */
async function findUsersForMonitoring(db) {
  const cutoff = new Date(Date.now() - MIN_DAYS_SINCE_ANALYSIS * 24 * 60 * 60 * 1000);

  // Find distinct userIds with completed analyses older than cutoff
  const userIds = await LegalPulseV2Result.distinct("userId", {
    status: "completed",
    createdAt: { $lt: cutoff },
  });

  // Load user emails for notification
  const users = [];
  for (const userId of userIds) {
    const user = await db.collection("users").findOne(
      { $or: [{ _id: userId }, { _id: require("mongodb").ObjectId.createFromHexString(userId) }] },
      { projection: { email: 1, name: 1, firstName: 1, subscriptionPlan: 1 } }
    );
    if (user && user.email) {
      users.push({ userId, email: user.email, name: user.firstName || user.name || "Nutzer" });
    }
  }

  return users;
}

/**
 * Monitor all contracts for a single user.
 * Returns { analyzed, alerts }
 */
async function monitorUserContracts(db, user) {
  const cutoff = new Date(Date.now() - MIN_DAYS_SINCE_ANALYSIS * 24 * 60 * 60 * 1000);

  // Find contracts with stale V2 analyses (oldest first = most overdue)
  const staleResults = await LegalPulseV2Result.aggregate([
    {
      $match: {
        userId: user.userId,
        status: "completed",
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$contractId",
        latestResult: { $first: "$$ROOT" },
      },
    },
    {
      $match: {
        "latestResult.createdAt": { $lt: cutoff },
      },
    },
    { $sort: { "latestResult.createdAt": 1 } },
    { $limit: MAX_PER_USER },
  ]);

  if (staleResults.length === 0) return { analyzed: 0, alerts: 0 };

  console.log(`[PulseV2Monitor] User ${user.userId}: ${staleResults.length} contracts due for re-scan`);

  let analyzed = 0;
  let alerts = 0;
  const newFindingsSummary = [];

  for (const entry of staleResults) {
    const contractId = entry._id;
    const previousResult = entry.latestResult;

    try {
      // Run V2 pipeline (silent — no SSE callback needed)
      const result = await runPipeline(
        {
          userId: user.userId,
          contractId,
          requestId: `monitor-${Date.now()}-${contractId.slice(-6)}`,
          triggeredBy: "scheduled",
        },
        () => {} // No progress callback for automated runs
      );

      analyzed++;

      // Change detection: find NEW critical/high findings
      const newFindings = detectNewFindings(previousResult, result.resultId, contractId);

      if (newFindings.length > 0) {
        // Load fresh result to get actual findings
        const freshResult = await LegalPulseV2Result.findById(result.resultId).lean();
        if (freshResult) {
          const confirmed = confirmNewFindings(previousResult, freshResult);
          if (confirmed.length > 0) {
            const contractName = freshResult.context?.contractName || contractId;
            newFindingsSummary.push({
              contractId,
              contractName,
              findings: confirmed,
              newScore: freshResult.scores?.overall,
              oldScore: previousResult.scores?.overall,
            });
            alerts += confirmed.length;
          }
        }
      }
    } catch (err) {
      console.error(`[PulseV2Monitor] Pipeline failed for ${contractId}:`, err.message);
    }
  }

  // Send consolidated email if there are new findings
  if (newFindingsSummary.length > 0) {
    await sendAlertEmail(db, user, newFindingsSummary);
  }

  return { analyzed, alerts };
}

/**
 * Detect NEW findings by comparing previous and current result titles.
 * Only returns critical/high severity findings.
 */
function detectNewFindings(previousResult, newResultId, contractId) {
  // Placeholder — actual comparison happens in confirmNewFindings
  // This just checks if it's worth loading the full new result
  return [{ resultId: newResultId, contractId }];
}

function confirmNewFindings(previousResult, newResult) {
  const prevTitles = new Set((previousResult.clauseFindings || []).map((f) => f.title));
  const newFindings = [];

  for (const finding of newResult.clauseFindings || []) {
    if (!prevTitles.has(finding.title) && (finding.severity === "critical" || finding.severity === "high")) {
      newFindings.push(finding);
    }
  }

  return newFindings;
}

/**
 * Send consolidated alert email for a user.
 */
async function sendAlertEmail(db, user, contractSummaries) {
  const totalFindings = contractSummaries.reduce((sum, c) => sum + c.findings.length, 0);
  const criticalCount = contractSummaries.reduce(
    (sum, c) => sum + c.findings.filter((f) => f.severity === "critical").length,
    0
  );
  const highCount = totalFindings - criticalCount;

  // Build email body
  let body = generateParagraph(`Hallo ${user.name},`);
  body += generateParagraph(
    `Legal Pulse hat bei der automatischen Analyse <strong>${totalFindings} neue Befunde</strong> in ${contractSummaries.length} Vertrag/Verträgen erkannt.`
  );

  // Stats row
  const statsItems = [
    { value: String(contractSummaries.length), label: "Verträge betroffen", color: "#ea580c" },
    { value: String(totalFindings), label: "Neue Befunde", color: "#dc2626" },
  ];
  if (criticalCount > 0) {
    statsItems.push({ value: String(criticalCount), label: "Kritisch", color: "#dc2626" });
  }
  if (highCount > 0) {
    statsItems.push({ value: String(highCount), label: "Hoch", color: "#ea580c" });
  }
  body += generateStatsRow(statsItems);
  body += generateDivider();

  // Contract cards
  for (const contract of contractSummaries) {
    const scoreDelta =
      contract.newScore != null && contract.oldScore != null ? contract.newScore - contract.oldScore : null;
    const scoreBadge =
      scoreDelta !== null
        ? scoreDelta < 0
          ? `Score: ${contract.newScore} (${scoreDelta})`
          : `Score: ${contract.newScore} (+${scoreDelta})`
        : contract.newScore != null
          ? `Score: ${contract.newScore}`
          : "";

    body += generateEventCard({
      title: contract.contractName,
      subtitle: `${contract.findings.length} neue Befunde`,
      badge: scoreBadge,
      badgeColor: scoreDelta !== null && scoreDelta < 0 ? "critical" : "info",
      icon: contract.findings.some((f) => f.severity === "critical") ? "\u26a0\ufe0f" : "\ud83d\udcca",
    });

    // List findings
    for (const finding of contract.findings.slice(0, 3)) {
      const severityLabel = finding.severity === "critical" ? "KRITISCH" : "HOCH";
      const severityColor = finding.severity === "critical" ? "#dc2626" : "#ea580c";
      body += `<div style="padding: 8px 16px; margin: 4px 0; border-left: 3px solid ${severityColor}; background: #f9fafb; border-radius: 0 6px 6px 0;">
        <span style="font-size: 11px; font-weight: 600; color: ${severityColor};">${severityLabel}</span>
        <span style="font-size: 13px; color: #111827; margin-left: 8px;">${finding.title}</span>
      </div>`;
    }

    if (contract.findings.length > 3) {
      body += generateParagraph(
        `+ ${contract.findings.length - 3} weitere Befunde`,
        { muted: true }
      );
    }

    body += "<br/>";
  }

  const html = generateEmailTemplate({
    title: `\u26a0\ufe0f Legal Pulse: ${totalFindings} neue Befunde erkannt`,
    body,
    preheader: `${totalFindings} neue Risiken in ${contractSummaries.length} Verträgen erkannt`,
    cta: {
      text: "Im Dashboard ansehen \u2192",
      url: "https://contract-ai.de/pulse",
    },
    unsubscribeUrl: `https://contract-ai.de/unsubscribe?type=legal_pulse`,
  });

  await queueEmail(db, {
    to: user.email,
    subject: `\u26a0\ufe0f Legal Pulse: ${totalFindings} neue Befunde in ${contractSummaries.length} Verträgen`,
    html,
    userId: user.userId,
    emailType: "legal_pulse_v2_alert",
  });

  console.log(`[PulseV2Monitor] Alert email queued for ${user.email}: ${totalFindings} findings`);
}

module.exports = { runPulseV2Monitor };

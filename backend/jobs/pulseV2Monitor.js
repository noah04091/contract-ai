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
// Neues, eigenständiges Pulse-Mail-Design (responsiv) — berührt keine andere Mail.
const {
  generatePulseEmailTemplate, pulseHeadline, pulseLead, pulseRow, pulseSection, pulseReassurance, pulseNote,
} = require("../utils/pulseEmailTemplate");

const MAX_PER_USER = 5;
const MAX_PER_RUN = 20;
const MIN_DAYS_SINCE_ANALYSIS = 7;
const ALERT_COOLDOWN_DAYS = 30;

/**
 * Main monitoring entry point.
 * Called by cron via withCronLock in server.js.
 */
async function runPulseV2Monitor(db) {
  console.log("[PulseV2Monitor] Starting automated scan...");
  const startTime = Date.now();

  // Ensure index on alert cooldown log (idempotent)
  await db.collection("pulse_v2_alert_log").createIndex(
    { userId: 1, contractId: 1, fingerprint: 1, createdAt: -1 },
    { background: true }
  );

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
      const freshResult = await LegalPulseV2Result.findById(result.resultId).lean();
      if (freshResult) {
        const confirmed = confirmNewFindings(previousResult, freshResult);
        // Apply cooldown: filter out findings already alerted within 30 days
        const afterCooldown = await applyCooldown(db, user.userId, contractId, confirmed);
        if (afterCooldown.length > 0) {
          const contractName = freshResult.context?.contractName || contractId;
          newFindingsSummary.push({
            contractId,
            contractName,
            findings: afterCooldown,
            newScore: freshResult.scores?.overall,
            oldScore: previousResult.scores?.overall,
          });
          alerts += afterCooldown.length;
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
 * Build a composite fingerprint for a finding.
 * Uses clauseId + category + type as primary key (stable across title rewording).
 * Falls back to title if clauseId is missing.
 */
function findingFingerprint(finding) {
  if (finding.clauseId && finding.category) {
    return `${finding.clauseId}::${finding.category}::${finding.type}`;
  }
  return `title::${finding.title}`;
}

/**
 * Detect NEW findings by comparing composite fingerprints.
 * Only returns critical/high severity findings not present in previous result.
 */
function confirmNewFindings(previousResult, newResult) {
  const prevFingerprints = new Set(
    (previousResult.clauseFindings || []).map(findingFingerprint)
  );
  const newFindings = [];

  for (const finding of newResult.clauseFindings || []) {
    if (finding.severity !== "critical" && finding.severity !== "high") continue;
    const fp = findingFingerprint(finding);
    if (!prevFingerprints.has(fp)) {
      newFindings.push(finding);
    }
  }

  return newFindings;
}

/**
 * Alert cooldown: skip findings already alerted in the last 30 days.
 * Tracks sent alerts in `pulse_v2_alert_log` collection.
 */
async function applyCooldown(db, userId, contractId, findings) {
  if (findings.length === 0) return findings;

  const cooldownCutoff = new Date(Date.now() - ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recentAlerts = await db.collection("pulse_v2_alert_log").find({
    userId,
    contractId,
    createdAt: { $gt: cooldownCutoff },
  }).toArray();

  const recentFingerprints = new Set(recentAlerts.map((a) => a.fingerprint));

  const filtered = findings.filter((f) => {
    const fp = findingFingerprint(f);
    return !recentFingerprints.has(fp);
  });

  // Log the alerts we're about to send
  if (filtered.length > 0) {
    const logEntries = filtered.map((f) => ({
      userId,
      contractId,
      fingerprint: findingFingerprint(f),
      title: f.title,
      severity: f.severity,
      createdAt: new Date(),
    }));
    await db.collection("pulse_v2_alert_log").insertMany(logEntries);
  }

  return filtered;
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
  let body = pulseHeadline(
    contractSummaries.length === 1
      ? "Neue Punkte in einem deiner Verträge"
      : "Neue Punkte in deinen überwachten Verträgen"
  );
  body += pulseLead(`Hallo ${user.name},`);
  body += pulseLead(
    `bei der automatischen Überprüfung deiner Verträge haben wir <strong style="color:#1a1f36;">${totalFindings} neue ${totalFindings === 1 ? "Befund" : "Befunde"}</strong> in ${contractSummaries.length} ${contractSummaries.length === 1 ? "Vertrag" : "Verträgen"} gefunden, die du dir ansehen solltest.`
  );

  contractSummaries.forEach((contract, idx) => {
    const scoreDelta =
      contract.newScore != null && contract.oldScore != null ? contract.newScore - contract.oldScore : null;
    const hasCrit = contract.findings.some((f) => f.severity === "critical");
    const statusText = scoreDelta !== null
      ? `Score ${contract.newScore} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`
      : contract.newScore != null ? `Score ${contract.newScore}` : "";
    const rows = contract.findings.slice(0, 3).map((f) =>
      pulseRow(f.severity === "critical" ? "Kritisch" : "Hoch", f.title)
    );
    if (contract.findings.length > 3) {
      rows.push(pulseRow("", `+ ${contract.findings.length - 3} weitere ${contract.findings.length - 3 === 1 ? "Befund" : "Befunde"}`));
    }
    body += pulseSection({
      name: contract.contractName,
      dotColor: hasCrit ? "#dc2626" : "#d97706",
      statusText,
      statusColor: scoreDelta !== null && scoreDelta < 0 ? "#dc2626" : "#697386",
      rows,
      isFirst: idx === 0,
    });
  });

  body += pulseReassurance({
    text: `<strong style="color:#1a1f36;">Keine Sorge &mdash; du musst kein Jurist sein.</strong> Im Tool erklären wir dir jeden Punkt in einfachen Worten und zeigen dir, was zu tun ist.`,
    buttonText: "Im Tool ansehen",
    buttonUrl: "https://contract-ai.de/pulse",
  });
  body += pulseNote(
    "Du bekommst diese E-Mail, weil Contract&nbsp;AI diese Verträge automatisch für dich überwacht. Du kannst das jederzeit in den Einstellungen ändern."
  );

  const html = generatePulseEmailTemplate({
    body,
    badge: "Legal Pulse",
    preheader: `${totalFindings} neue Risiken in ${contractSummaries.length} Verträgen erkannt`,
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

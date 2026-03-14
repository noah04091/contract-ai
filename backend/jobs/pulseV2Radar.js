/**
 * Legal Pulse V2 Radar — Legal Source Monitoring
 *
 * Bridges V1 legal monitoring (RSS feeds, vector matching) with V2 pipeline.
 * Detects new laws/rulings/guidelines and matches them against user contracts
 * that have V2 analysis results.
 *
 * Flow:
 *   1. Fetch recent law changes from `laws` collection (synced by V1 RSS cron)
 *   2. For each law change, find V2-analyzed contracts that may be affected
 *   3. Use GPT-4o-mini to assess actual impact on specific contract findings
 *   4. Store alerts in `pulse_v2_legal_alerts` collection
 *   5. Queue consolidated email notifications
 *
 * Schedule: Mondays 05:30 UTC (after V1 RSS sync at 03:15, before digest at 08:10)
 * Limits: max 10 law changes per run, max 50 contract matches
 */

const OpenAI = require("openai");
const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const { queueEmail } = require("../services/emailRetryService");
const {
  generateEmailTemplate,
  generateEventCard,
  generateStatsRow,
  generateParagraph,
  generateDivider,
} = require("../utils/emailTemplate");

const MAX_LAW_CHANGES = 10;
const MAX_CONTRACT_MATCHES = 50;
const IMPACT_CONFIDENCE_THRESHOLD = 60;

// Legal area → contract type mapping for fast pre-filtering
const AREA_TO_CONTRACT_TYPES = {
  datenschutz: ["saas", "hosting", "dienstleistung", "arbeitsvertrag", "freelancer"],
  arbeitsrecht: ["arbeitsvertrag", "freelancer"],
  mietrecht: ["mietvertrag"],
  handelsrecht: ["dienstleistung", "saas", "hosting", "liefervertrag"],
  verbraucherschutz: ["saas", "hosting", "versicherung", "mietvertrag"],
  steuerrecht: ["dienstleistung", "freelancer", "arbeitsvertrag"],
  it_recht: ["saas", "hosting", "nda"],
  wettbewerbsrecht: ["nda", "arbeitsvertrag", "freelancer"],
  versicherungsrecht: ["versicherung"],
  gesellschaftsrecht: ["dienstleistung"],
};

/**
 * Main radar entry point.
 */
async function runPulseV2Radar(db) {
  console.log("[PulseV2Radar] Starting legal source scan...");
  const startTime = Date.now();

  // Ensure unique index to prevent duplicate alerts (idempotent)
  // Uses lawId (stable ObjectId) instead of lawTitle (can change with rewording)
  await db.collection("pulse_v2_legal_alerts").createIndex(
    { userId: 1, lawId: 1, contractId: 1 },
    { unique: true, background: true }
  );

  // 1. Find recent law changes (from V1 RSS sync)
  const lawChanges = await fetchRecentLawChanges(db);
  if (lawChanges.length === 0) {
    console.log("[PulseV2Radar] No new law changes found. Done.");
    return { lawChanges: 0, contractsMatched: 0, alertsSent: 0 };
  }
  console.log(`[PulseV2Radar] ${lawChanges.length} law changes to process`);

  // 2. Process each law change
  let totalMatches = 0;
  let totalAlerts = 0;
  const userAlerts = new Map(); // userId → [{ lawChange, contracts }]

  for (const law of lawChanges) {
    if (totalMatches >= MAX_CONTRACT_MATCHES) break;

    const matches = await matchLawToContracts(db, law);
    if (matches.length === 0) continue;

    // 3. Assess impact with AI
    const confirmedImpacts = await assessImpact(law, matches);
    totalMatches += matches.length;

    // Group by user
    for (const impact of confirmedImpacts) {
      if (!userAlerts.has(impact.userId)) {
        userAlerts.set(impact.userId, []);
      }
      userAlerts.get(impact.userId).push({
        lawChange: law,
        contractId: impact.contractId,
        contractName: impact.contractName,
        impactSummary: impact.summary,
        severity: impact.severity,
        recommendation: impact.recommendation,
        affectedClauseIds: impact.affectedClauseIds,
        clauseImpacts: impact.clauseImpacts,
      });
      totalAlerts++;
    }
  }

  // 4. Store alerts + send emails
  for (const [userId, alerts] of userAlerts.entries()) {
    await storeAndNotify(db, userId, alerts);
  }

  // 5. Mark processed law changes
  const lawIds = lawChanges.map((l) => l._id);
  await db.collection("laws").updateMany(
    { _id: { $in: lawIds } },
    { $set: { pulseV2Processed: true, pulseV2ProcessedAt: new Date() } }
  );

  const duration = Date.now() - startTime;
  console.log(
    `[PulseV2Radar] Done. ${lawChanges.length} laws, ${totalMatches} matches, ${totalAlerts} alerts. ${Math.round(duration / 1000)}s`
  );

  return { lawChanges: lawChanges.length, contractsMatched: totalMatches, alertsSent: totalAlerts, durationMs: duration };
}

/**
 * Fetch law changes from the last 7 days that haven't been processed by V2 yet.
 */
async function fetchRecentLawChanges(db) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return db
    .collection("laws")
    .find({
      updatedAt: { $gte: since },
      pulseV2Processed: { $ne: true },
    })
    .sort({ updatedAt: -1 })
    .limit(MAX_LAW_CHANGES)
    .toArray();
}

/**
 * Find V2-analyzed contracts potentially affected by a law change.
 * Uses deterministic pre-filtering by legal area → contract type mapping.
 */
async function matchLawToContracts(db, lawChange) {
  const area = (lawChange.area || "").toLowerCase();
  const relevantTypes = AREA_TO_CONTRACT_TYPES[area] || [];

  // Build query: contracts with V2 results matching relevant types
  const query = {
    status: "completed",
  };

  // If we know relevant types, filter by them
  if (relevantTypes.length > 0) {
    query["document.contractType"] = {
      $in: relevantTypes.map((t) => new RegExp(t, "i")),
    };
  }

  const results = await LegalPulseV2Result.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { contractId: "$contractId", userId: "$userId" },
        latestResult: { $first: "$$ROOT" },
      },
    },
    { $limit: 30 },
  ]);

  return results.map((r) => ({
    userId: r._id.userId,
    contractId: r._id.contractId,
    contractName: r.latestResult.context?.contractName || r._id.contractId,
    contractType: r.latestResult.document?.contractType || "unknown",
    findings: (r.latestResult.clauseFindings || [])
      .filter((f) => f.severity === "critical" || f.severity === "high" || f.severity === "medium")
      .map((f) => ({ title: f.title, category: f.category, severity: f.severity, clauseId: f.clauseId })),
    clauses: (r.latestResult.clauses || [])
      .map((c) => ({ id: c.id, title: c.title, category: c.category })),
    scores: r.latestResult.scores,
  }));
}

/**
 * Use GPT-4o-mini to assess actual impact of a law change on matched contracts.
 * Returns only confirmed impacts above confidence threshold.
 */
async function assessImpact(lawChange, contracts) {
  if (contracts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[PulseV2Radar] No OpenAI API key — skipping AI impact assessment");
    return [];
  }

  const openai = new OpenAI({ apiKey, timeout: 45000, maxRetries: 1 });

  // Batch contracts into a single prompt for efficiency
  const contractSummaries = contracts
    .slice(0, 10)
    .map(
      (c, i) => {
        const clauseList = c.clauses.slice(0, 15).map((cl) => `  - [${cl.id}] ${cl.title} (${cl.category})`).join("\n");
        const findingList = c.findings.slice(0, 10).map((f) => `  - ${f.title} (${f.severity}, Klausel: ${f.clauseId})`).join("\n");
        return `[${i + 1}] "${c.contractName}" (${c.contractType}, Score: ${c.scores?.overall || "?"})\n` +
          `  Klauseln:\n${clauseList || "  - keine"}\n` +
          `  Befunde:\n${findingList || "  - keine"}`;
      }
    )
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "impact_assessment",
          strict: true,
          schema: {
            type: "object",
            properties: {
              impacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    contractIndex: { type: "number" },
                    affected: { type: "boolean" },
                    confidence: { type: "number" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    summary: { type: "string" },
                    recommendation: { type: "string" },
                    affectedClauseIds: {
                      type: "array",
                      items: { type: "string" },
                    },
                    clauseImpacts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          clauseId: { type: "string" },
                          clauseTitle: { type: "string" },
                          impact: { type: "string" },
                          suggestedChange: { type: "string" },
                        },
                        required: ["clauseId", "clauseTitle", "impact", "suggestedChange"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["contractIndex", "affected", "confidence", "severity", "summary", "recommendation", "affectedClauseIds", "clauseImpacts"],
                  additionalProperties: false,
                },
              },
            },
            required: ["impacts"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Du bist ein deutscher Rechtsexperte. Prüfe ob eine Gesetzesänderung konkrete Auswirkungen auf bestimmte Verträge hat.

REGELN:
- Nur ECHTE, KONKRETE Auswirkungen melden (nicht hypothetische)
- confidence 0-100: Wie sicher bist du, dass der Vertrag betroffen ist?
- severity: critical (Vertrag potentiell unwirksam/illegal), high (Klausel muss angepasst werden), medium (Prüfung empfohlen), low (informativ)
- recommendation: Konkreter nächster Schritt (z.B. "Klausel X in § Y anpassen", "AV-Vertrag aktualisieren")
- affectedClauseIds: Liste der Klausel-IDs die von der Änderung betroffen sind (aus der Klausel-Liste des Vertrags)
- clauseImpacts: Für JEDE betroffene Klausel: clauseId, clauseTitle, impact (was genau das Problem ist), suggestedChange (konkreter Textvorschlag für die Änderung)
- Wenn ein Vertrag NICHT betroffen ist: affected=false, affectedClauseIds=[], clauseImpacts=[]`,
        },
        {
          role: "user",
          content: `GESETZESÄNDERUNG:
Titel: ${lawChange.title}
Bereich: ${lawChange.area || "unbekannt"}
Beschreibung: ${lawChange.description || lawChange.summary || ""}
Quelle: ${lawChange.source || ""}

VERTRÄGE:
${contractSummaries}

Prüfe für JEDEN Vertrag ob er von dieser Änderung betroffen ist.`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const confirmedImpacts = [];

    for (const impact of parsed.impacts || []) {
      if (!impact.affected) continue;
      if (impact.confidence < IMPACT_CONFIDENCE_THRESHOLD) continue;

      const contract = contracts[impact.contractIndex - 1];
      if (!contract) continue;

      // Validate clauseIds — filter out hallucinated IDs not in actual contract
      const validClauseIds = new Set(contract.clauses.map((c) => c.id));
      const validatedClauseImpacts = (impact.clauseImpacts || []).filter(
        (ci) => validClauseIds.has(ci.clauseId)
      );
      const validatedClauseIds = (impact.affectedClauseIds || []).filter(
        (id) => validClauseIds.has(id)
      );

      confirmedImpacts.push({
        userId: contract.userId,
        contractId: contract.contractId,
        contractName: contract.contractName,
        summary: impact.summary,
        severity: impact.severity,
        recommendation: impact.recommendation,
        confidence: impact.confidence,
        affectedClauseIds: validatedClauseIds.slice(0, 5),
        clauseImpacts: validatedClauseImpacts.slice(0, 5),
      });
    }

    return confirmedImpacts;
  } catch (err) {
    console.error("[PulseV2Radar] AI assessment failed:", err.message);
    return [];
  }
}

/**
 * Store alerts in DB and send consolidated email to user.
 */
async function storeAndNotify(db, userId, alerts) {
  // Store in pulse_v2_legal_alerts
  const alertDocs = alerts.map((a) => ({
    userId,
    contractId: a.contractId,
    contractName: a.contractName,
    lawId: a.lawChange._id.toString(),
    lawTitle: a.lawChange.title,
    lawArea: a.lawChange.area,
    lawSource: a.lawChange.source,
    impactSummary: a.impactSummary,
    severity: a.severity,
    recommendation: a.recommendation,
    affectedClauseIds: a.affectedClauseIds || [],
    clauseImpacts: a.clauseImpacts || [],
    status: "unread",
    createdAt: new Date(),
  }));

  // Insert with ordered:false to skip duplicates (unique index prevents re-alerts)
  try {
    await db.collection("pulse_v2_legal_alerts").insertMany(alertDocs, { ordered: false });
  } catch (err) {
    // Ignore duplicate key errors (code 11000) — means alert already exists
    if (err.code !== 11000) throw err;
    console.log(`[PulseV2Radar] ${err.writeErrors?.length || 0} duplicate alerts skipped for user ${userId}`);
  }

  // Load user for email
  const { ObjectId } = require("mongodb");
  let user;
  try {
    user = await db.collection("users").findOne(
      { $or: [{ _id: userId }, { _id: ObjectId.createFromHexString(userId) }] },
      { projection: { email: 1, name: 1, firstName: 1 } }
    );
  } catch {
    user = await db.collection("users").findOne(
      { _id: userId },
      { projection: { email: 1, name: 1, firstName: 1 } }
    );
  }

  if (!user || !user.email) return;

  const userName = user.firstName || user.name || "Nutzer";

  // Build email
  let body = generateParagraph(`Hallo ${userName},`);
  body += generateParagraph(
    `Legal Pulse Radar hat <strong>${alerts.length} Gesetzesänderung(en)</strong> erkannt, die Ihre Verträge betreffen könnten.`
  );

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");

  body += generateStatsRow([
    { value: String(alerts.length), label: "Betroffene Verträge", color: "#ea580c" },
    ...(criticalAlerts.length > 0 ? [{ value: String(criticalAlerts.length), label: "Kritisch", color: "#dc2626" }] : []),
    ...(highAlerts.length > 0 ? [{ value: String(highAlerts.length), label: "Hoch", color: "#ea580c" }] : []),
  ]);

  body += generateDivider();

  // Group alerts by law change
  const byLaw = new Map();
  for (const alert of alerts) {
    const key = alert.lawChange.title;
    if (!byLaw.has(key)) {
      byLaw.set(key, { law: alert.lawChange, contracts: [] });
    }
    byLaw.get(key).contracts.push(alert);
  }

  for (const [lawTitle, group] of byLaw.entries()) {
    body += generateEventCard({
      title: lawTitle,
      subtitle: `${group.law.area || "Recht"} · ${group.contracts.length} Vertrag/Verträge betroffen`,
      badge: group.contracts.some((c) => c.severity === "critical") ? "Kritisch" : "Prüfen",
      badgeColor: group.contracts.some((c) => c.severity === "critical") ? "critical" : "warning",
      icon: "\u2696\ufe0f",
    });

    for (const contract of group.contracts.slice(0, 3)) {
      const sevColor = contract.severity === "critical" ? "#dc2626" : contract.severity === "high" ? "#ea580c" : "#d97706";
      body += `<div style="padding: 8px 16px; margin: 4px 0; border-left: 3px solid ${sevColor}; background: #f9fafb; border-radius: 0 6px 6px 0;">
        <div style="font-size: 13px; font-weight: 600; color: #111827;">${contract.contractName}</div>
        <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${contract.impactSummary}</div>
        <div style="font-size: 12px; color: #1e40af; margin-top: 4px; font-style: italic;">${contract.recommendation}</div>
      </div>`;
    }

    if (group.contracts.length > 3) {
      body += generateParagraph(`+ ${group.contracts.length - 3} weitere Verträge`, { muted: true });
    }

    body += "<br/>";
  }

  const html = generateEmailTemplate({
    title: "\u2696\ufe0f Legal Pulse Radar: Gesetzesänderung erkannt",
    body,
    preheader: `${alerts.length} Verträge von Gesetzesänderungen betroffen`,
    cta: {
      text: "Im Dashboard ansehen \u2192",
      url: "https://contract-ai.de/pulse",
    },
    unsubscribeUrl: `https://contract-ai.de/unsubscribe?type=legal_pulse`,
  });

  await queueEmail(db, {
    to: user.email,
    subject: `\u2696\ufe0f Legal Radar: ${alerts.length} Verträge von Gesetzesänderung betroffen`,
    html,
    userId,
    emailType: "legal_pulse_v2_radar",
  });

  console.log(`[PulseV2Radar] Alert email queued for ${user.email}: ${alerts.length} impacts`);
}

module.exports = { runPulseV2Radar };

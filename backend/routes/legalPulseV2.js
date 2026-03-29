/**
 * Legal Pulse V2 — Express Routes with SSE Streaming
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");
const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const { runPipeline } = require("../services/legalPulseV2");
const requirePremium = require("../middleware/requirePremium");

// Normalize fields that may be stored as object {name, displayName, ...} or string
function normalizeToString(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.displayName || val.name || null;
  return null;
}

// Rate limiting: 10 analyses per hour per user
const analyzeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit erreicht. Maximal 10 Analysen pro Stunde.",
      retryAfter: "1 Stunde",
    });
  },
});

// Rate limiting: 10 auto-fix calls per hour per user (GPT-4o cost protection)
const autoFixRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit erreicht. Maximal 10 Auto-Fixes pro Stunde.",
      retryAfter: "1 Stunde",
    });
  },
});

// ══════════════════════════════════════════════════════════════
// POST /analyze/:contractId — Start analysis (SSE streaming)
// ══════════════════════════════════════════════════════════════
router.post("/analyze/:contractId", requirePremium, analyzeRateLimiter, async (req, res) => {
  const { contractId } = req.params;
  const userId = req.user.userId;
  const requestId = uuidv4();

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let clientDisconnected = false;
  req.on("close", () => { clientDisconnected = true; });

  const sendSSE = (data) => {
    if (clientDisconnected) return;
    try {
      res.write(`data: ${JSON.stringify({ ...data, requestId, timestamp: new Date().toISOString() })}\n\n`);
    } catch (e) {
      clientDisconnected = true;
    }
  };

  // Keepalive every 15 seconds
  const keepalive = setInterval(() => {
    if (clientDisconnected) { clearInterval(keepalive); return; }
    try { res.write(": keepalive\n\n"); } catch (e) { clientDisconnected = true; }
  }, 15000);

  try {
    sendSSE({ progress: 0, message: "Pipeline wird gestartet...", stage: 0 });

    const result = await runPipeline(
      { userId, contractId, requestId, triggeredBy: "manual" },
      (progress, message, stageData) => {
        if (clientDisconnected) return;
        sendSSE({ progress, message, ...stageData });
      }
    );

    sendSSE({
      progress: 100,
      message: "Analyse abgeschlossen",
      complete: true,
      resultId: result.resultId,
      scores: result.scores,
      findingsCount: result.findingsCount,
    });

  } catch (error) {
    console.error("[PulseV2] Pipeline error:", error);
    sendSSE({
      progress: -1,
      message: error.message || "Analyse fehlgeschlagen",
      error: true,
    });
  } finally {
    clearInterval(keepalive);
    if (!clientDisconnected) {
      try { res.end(); } catch (e) { /* ignore */ }
    }
  }
});

// ══════════════════════════════════════════════════════════════
// GET /results/:id — Full result
// ══════════════════════════════════════════════════════════════
router.get("/results/:id", async (req, res) => {
  try {
    const result = await LegalPulseV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).lean();

    if (!result) {
      return res.status(404).json({ error: "Ergebnis nicht gefunden" });
    }

    res.json({ result });
  } catch (error) {
    console.error("[PulseV2] Get result error:", error);
    res.status(500).json({ error: "Fehler beim Laden des Ergebnisses" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /contract/:contractId/latest — Latest result for contract
// ══════════════════════════════════════════════════════════════
router.get("/contract/:contractId/latest", async (req, res) => {
  try {
    const result = await LegalPulseV2Result.findOne({
      contractId: req.params.contractId,
      userId: req.user.userId,
      status: "completed",
    }).sort({ createdAt: -1 }).lean();

    if (!result) {
      return res.json({ result: null });
    }

    res.json({ result });
  } catch (error) {
    console.error("[PulseV2] Get latest error:", error);
    res.status(500).json({ error: "Fehler beim Laden des Ergebnisses" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /contract/:contractId/history — Analysis history
// ══════════════════════════════════════════════════════════════
router.get("/contract/:contractId/history", async (req, res) => {
  try {
    const results = await LegalPulseV2Result.find({
      contractId: req.params.contractId,
      userId: req.user.userId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("requestId scores status triggeredBy createdAt completedAt costs.totalCostUSD document.contractType clauseFindings")
      .lean();

    // Return summary view (no full clause text)
    const history = results.map(r => ({
      _id: r._id,
      requestId: r.requestId,
      scores: r.scores,
      triggeredBy: r.triggeredBy,
      contractType: normalizeToString(r.document?.contractType),
      findingsCount: r.clauseFindings?.length || 0,
      criticalCount: r.clauseFindings?.filter(f => f.severity === "critical").length || 0,
      highCount: r.clauseFindings?.filter(f => f.severity === "high").length || 0,
      costUSD: r.costs?.totalCostUSD,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));

    res.json({ history });
  } catch (error) {
    console.error("[PulseV2] Get history error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Historie" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /contract/:contractId/timeline — Score timeline for trend chart
// ══════════════════════════════════════════════════════════════
router.get("/contract/:contractId/timeline", async (req, res) => {
  try {
    const results = await LegalPulseV2Result.find({
      contractId: req.params.contractId,
      userId: req.user.userId,
      status: "completed",
    })
      .sort({ createdAt: 1 })
      .select("scores.overall scores.risk scores.compliance createdAt clauseFindings")
      .lean();

    const timeline = results.map((r, idx) => {
      const prev = idx > 0 ? results[idx - 1] : null;
      const delta = prev ? r.scores.overall - prev.scores.overall : 0;

      // Find new findings compared to previous analysis
      const newFindings = [];
      if (prev && r.clauseFindings) {
        const prevTitles = new Set((prev.clauseFindings || []).map(f => f.title));
        for (const f of r.clauseFindings) {
          if (!prevTitles.has(f.title) && (f.severity === "critical" || f.severity === "high")) {
            newFindings.push({ title: f.title, severity: f.severity });
          }
        }
      }

      return {
        date: r.createdAt,
        score: r.scores.overall,
        risk: r.scores.risk,
        compliance: r.scores.compliance,
        delta,
        newFindings: newFindings.slice(0, 3),
      };
    });

    res.json({ timeline });
  } catch (error) {
    console.error("[PulseV2] Timeline error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Timeline" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /dashboard — Portfolio overview (all contracts with latest scores)
// ══════════════════════════════════════════════════════════════
router.get("/dashboard", async (req, res) => {
  try {
    const database = require("../config/database");
    const { ObjectId } = require("mongodb");
    const db = await database.connect();
    const userId = req.user.userId;

    // Load all user contracts (lightweight)
    const contracts = await db.collection("contracts").find(
      { $or: [{ userId }, { userId: new ObjectId(userId) }] },
      {
        projection: {
          name: 1, title: 1, filename: 1,
          contractType: 1, type: 1,
          endDate: 1, expiryDate: 1,
          provider: 1, partner: 1, company: 1,
          "legalPulse.healthScore": 1,
          "legalPulse.riskScore": 1,
          "legalPulse.lastChecked": 1,
        },
      }
    ).toArray();

    // Load latest V2 results for each contract
    const contractIds = contracts.map(c => c._id.toString());
    const latestResults = await LegalPulseV2Result.aggregate([
      {
        $match: {
          userId,
          contractId: { $in: contractIds },
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
    ]);

    const resultMap = {};
    for (const r of latestResults) {
      resultMap[r._id] = r.latestResult;
    }

    // Build dashboard items
    const items = contracts.map(c => {
      const v2 = resultMap[c._id.toString()];
      return {
        contractId: c._id.toString(),
        name: c.name || c.title || c.filename || "Unbenannt",
        contractType: normalizeToString(c.contractType || c.type),
        provider: normalizeToString(c.provider) || normalizeToString(c.partner) || normalizeToString(c.company) || null,
        endDate: c.endDate || c.expiryDate || null,
        // V2 result
        hasV2Result: !!v2,
        v2Score: v2?.scores?.overall || null,
        v2FindingsCount: v2?.clauseFindings?.length || 0,
        v2CriticalCount: v2?.clauseFindings?.filter(f => f.severity === "critical").length || 0,
        v2LastAnalysis: v2?.createdAt || null,
        // Legacy fallback
        legacyHealthScore: c.legalPulse?.healthScore || null,
      };
    });

    // Sort: contracts without V2 analysis first, then by score (worst first)
    items.sort((a, b) => {
      if (!a.hasV2Result && b.hasV2Result) return -1;
      if (a.hasV2Result && !b.hasV2Result) return 1;
      return (a.v2Score || 0) - (b.v2Score || 0);
    });

    res.json({
      totalContracts: contracts.length,
      analyzedContracts: latestResults.length,
      items,
    });
  } catch (error) {
    console.error("[PulseV2] Dashboard error:", error);
    res.status(500).json({ error: "Fehler beim Laden des Dashboards" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /portfolio-insights — Cross-contract insights (latest per user)
// ══════════════════════════════════════════════════════════════
router.get("/portfolio-insights", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get latest result that has portfolio insights
    const result = await LegalPulseV2Result.findOne({
      userId,
      status: "completed",
      "portfolioInsights.0": { $exists: true },
    })
      .sort({ createdAt: -1 })
      .select("portfolioInsights actions createdAt")
      .lean();

    res.json({
      insights: result?.portfolioInsights || [],
      actions: result?.actions || [],
      lastAnalysis: result?.createdAt || null,
    });
  } catch (error) {
    console.error("[PulseV2] Portfolio insights error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Portfolio-Insights" });
  }
});

// ══════════════════════════════════════════════════════════════
// PATCH /results/:id/actions/:actionId — Update action status
// ══════════════════════════════════════════════════════════════
router.patch("/results/:id/actions/:actionId", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "done", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Ungültiger Status" });
    }

    const result = await LegalPulseV2Result.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.userId,
        "actions.id": req.params.actionId,
      },
      { $set: { "actions.$.status": status } },
      { new: true }
    ).lean();

    if (!result) {
      return res.status(404).json({ error: "Aktion nicht gefunden" });
    }

    res.json({ success: true, actions: result.actions });
  } catch (error) {
    console.error("[PulseV2] Action update error:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der Aktion" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /legal-alerts — Recent legal change alerts for user
// ══════════════════════════════════════════════════════════════
router.get("/legal-alerts", async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;

    const alerts = await db
      .collection("pulse_v2_legal_alerts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json({ alerts });
  } catch (error) {
    console.error("[PulseV2] Legal alerts error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Legal Alerts" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /alert-metrics — Action Rate funnel for Legal Pulse alerts
// Measures: created → opened (read) → fix generated → fix applied → resolved
// ══════════════════════════════════════════════════════════════
router.get("/alert-metrics", async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;

    const pipeline = [
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          read: { $sum: { $cond: [{ $ne: ["$status", "unread"] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $eq: ["$status", "dismissed"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          withFixes: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $ifNull: ["$resolvedClauseIds", []] } }, 0] }, 1, 0],
            },
          },
          totalAffectedClauses: { $sum: { $size: { $ifNull: ["$affectedClauseIds", []] } } },
          totalResolvedClauses: { $sum: { $size: { $ifNull: ["$resolvedClauseIds", []] } } },
          bySeverity: {
            $push: "$severity",
          },
          // D2: Impact direction counts
          positiveCount: { $sum: { $cond: [{ $eq: ["$impactDirection", "positive"] }, 1, 0] } },
          negativeCount: { $sum: { $cond: [{ $or: [{ $eq: ["$impactDirection", "negative"] }, { $eq: [{ $ifNull: ["$impactDirection", "negative"] }, "negative"] }] }, 1, 0] } },
          // D2: Average time to action (first fix)
          avgTimeToAction: {
            $avg: {
              $cond: [
                { $ne: ["$lastFixAppliedAt", null] },
                { $subtract: [{ $ifNull: ["$lastFixAppliedAt", "$createdAt"] }, "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
    ];

    const [result] = await db.collection("pulse_v2_legal_alerts").aggregate(pipeline).toArray();

    if (!result || result.total === 0) {
      return res.json({
        funnel: { total: 0, opened: 0, fixApplied: 0, resolved: 0, dismissed: 0 },
        rates: { openRate: 0, actionRate: 0, resolveRate: 0, falsePositiveRate: 0 },
        clauses: { affected: 0, resolved: 0, resolveRate: 0 },
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
        direction: { positive: 0, negative: 0 },
      });
    }

    // Count severities
    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const s of result.bySeverity || []) {
      if (severity[s] !== undefined) severity[s]++;
    }

    const funnel = {
      total: result.total,
      opened: result.read,
      fixApplied: result.withFixes,
      resolved: result.resolved,
      dismissed: result.dismissed,
    };

    // D2: False positive rate = dismissed / (dismissed + resolved + fixApplied)
    const actionable = result.dismissed + result.resolved + result.withFixes;
    const falsePositiveRate = actionable > 0 ? Math.round((result.dismissed / actionable) * 100) : 0;

    const rates = {
      openRate: Math.round((result.read / result.total) * 100),
      actionRate: Math.round((result.withFixes / result.total) * 100),
      resolveRate: Math.round((result.resolved / result.total) * 100),
      falsePositiveRate,
    };

    const clauses = {
      affected: result.totalAffectedClauses,
      resolved: result.totalResolvedClauses,
      resolveRate:
        result.totalAffectedClauses > 0
          ? Math.round((result.totalResolvedClauses / result.totalAffectedClauses) * 100)
          : 0,
    };

    const direction = {
      positive: result.positiveCount || 0,
      negative: result.negativeCount || 0,
    };

    res.json({ funnel, rates, clauses, severity, direction, avgTimeToActionMs: result.avgTimeToAction || 0 });
  } catch (error) {
    console.error("[PulseV2] Alert metrics error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Alert-Metriken" });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /auto-fix-clause — Generate law-compliant clause text via GPT-4o
// ══════════════════════════════════════════════════════════════
router.post("/auto-fix-clause", requirePremium, autoFixRateLimiter, async (req, res) => {
  try {
    const { alertId, clauseId } = req.body;
    if (!alertId || !clauseId) {
      return res.status(400).json({ error: "alertId und clauseId erforderlich" });
    }

    const database = require("../config/database");
    const { ObjectId } = require("mongodb");
    const db = await database.connect();
    const userId = req.user.userId;

    // 1. Load the alert
    const alert = await db.collection("pulse_v2_legal_alerts").findOne({
      _id: new ObjectId(alertId),
      userId,
    });
    if (!alert) {
      return res.status(404).json({ error: "Alert nicht gefunden" });
    }

    // 2. Find the latest V2 result for this contract
    const v2Result = await LegalPulseV2Result.findOne({
      contractId: alert.contractId,
      userId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .select("clauses clauseFindings createdAt")
      .lean();

    if (!v2Result) {
      return res.status(404).json({ error: "Keine V2-Analyse für diesen Vertrag gefunden" });
    }

    // 3. Find the specific clause — use currentText if available (previous fix applied)
    const clause = v2Result.clauses.find((c) => c.id === clauseId);
    if (!clause) {
      return res.status(404).json({ error: `Klausel ${clauseId} nicht gefunden` });
    }

    // Stale-result check: warn if V2 analysis is much older than the alert
    const resultAge = new Date(alert.createdAt) - new Date(v2Result.createdAt);
    const isStale = resultAge > 90 * 24 * 60 * 60 * 1000; // >90 days older

    // 4. Find clause impact info from the alert
    const clauseImpact = (alert.clauseImpacts || []).find((ci) => ci.clauseId === clauseId);

    // 5. Find existing findings for this clause
    const findings = (v2Result.clauseFindings || [])
      .filter((f) => f.clauseId === clauseId)
      .slice(0, 5);

    // 6. Call GPT-4o to generate fixed clause
    const OpenAI = require("openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API Key nicht konfiguriert" });
    }

    const openai = new OpenAI({ apiKey, timeout: 60000, maxRetries: 1 });

    const findingsContext = findings.length > 0
      ? `\nBestehende Befunde zu dieser Klausel:\n${findings.map((f) => `- ${f.title} (${f.severity}): ${f.description}`).join("\n")}`
      : "";

    const impactContext = clauseImpact
      ? `\nKonkrete Auswirkung auf diese Klausel: ${clauseImpact.impact}\nBisheriger Änderungsvorschlag: ${clauseImpact.suggestedChange}`
      : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 4000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clause_fix",
          strict: true,
          schema: {
            type: "object",
            properties: {
              fixedText: {
                type: "string",
                description: "Vollständiger, überarbeiteter Klauseltext — direkt einsetzbar",
              },
              reasoning: {
                type: "string",
                description: "Erläuterung der Änderungen (2-3 Sätze)",
              },
              legalBasis: {
                type: "string",
                description: "Rechtsgrundlage für die Änderung (z.B. § 28 BDSG neu)",
              },
              changeType: {
                type: "string",
                enum: ["major_rewrite", "targeted_fix", "addition", "removal"],
                description: "Art der Änderung",
              },
            },
            required: ["fixedText", "reasoning", "legalBasis", "changeType"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Du bist ein erfahrener deutscher Vertragsanwalt. Deine Aufgabe: Eine Vertragsklausel so überarbeiten, dass sie einer neuen Gesetzesänderung entspricht.

REGELN:
- Der überarbeitete Text muss VOLLSTÄNDIG und DIREKT EINSETZBAR sein (kein Platzhalter, kein "[...]")
- Behalte den Stil und Ton des Originalvertrags bei
- Ändere NUR was nötig ist — minimale Eingriffe, maximale Compliance
- Wenn die Klausel bereits konform ist, verbessere trotzdem die Formulierung für mehr Klarheit
- Begründe jede Änderung mit der konkreten Rechtsgrundlage
- Deutsche Rechtssprache, professioneller Stil`,
        },
        {
          role: "user",
          content: `GESETZESÄNDERUNG:
Titel: ${alert.lawTitle}
Bereich: ${alert.lawArea || "unbekannt"}
Auswirkung: ${alert.impactSummary}
Empfehlung: ${alert.recommendation}
${impactContext}

AKTUELLE KLAUSEL:
Titel: ${clause.title}
Kategorie: ${clause.category}
Text:
${clause.currentText || clause.originalText}
${findingsContext}

Überarbeite diese Klausel so, dass sie der neuen Gesetzeslage entspricht.`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    // 7. Generate word-level diffs (against current version, not necessarily original)
    const baseText = clause.currentText || clause.originalText;
    const diffs = generateWordDiffs(baseText, parsed.fixedText);

    // 8. Track cost
    const usage = response.usage || {};
    const costUSD = ((usage.prompt_tokens || 0) * 2.5 + (usage.completion_tokens || 0) * 10) / 1_000_000;
    console.log(`[PulseV2] Auto-fix clause: ${usage.prompt_tokens || 0}+${usage.completion_tokens || 0} tokens, $${costUSD.toFixed(4)}${isStale ? " [STALE]" : ""}`);

    res.json({
      clauseId,
      clauseTitle: clause.title,
      originalText: baseText,
      fixedText: parsed.fixedText,
      reasoning: parsed.reasoning,
      legalBasis: parsed.legalBasis,
      changeType: parsed.changeType,
      diffs,
      costUSD,
      ...(isStale && { staleWarning: "Die Vertragsanalyse ist älter als 90 Tage. Eine erneute Analyse wird empfohlen." }),
    });
  } catch (error) {
    console.error("[PulseV2] Auto-fix clause error:", error);
    res.status(500).json({ error: "Fehler beim Generieren der Klausel-Anpassung" });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /quick-fix — Generate improved clause text from a Finding (no alert needed)
// ══════════════════════════════════════════════════════════════
const quickFixRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: "Rate limit erreicht. Maximal 15 Quick-Fixes pro Stunde." });
  },
});

router.post("/quick-fix", requirePremium, quickFixRateLimiter, async (req, res) => {
  try {
    const { affectedText, findingTitle, findingDescription, legalBasis, severity, contractType } = req.body;

    if (!affectedText || !findingTitle) {
      return res.status(400).json({ error: "affectedText und findingTitle erforderlich" });
    }

    if (affectedText.length > 5000) {
      return res.status(400).json({ error: "affectedText zu lang (max. 5.000 Zeichen)" });
    }

    const OpenAI = require("openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API Key nicht konfiguriert" });
    }

    const openai = new OpenAI({ apiKey, timeout: 30000, maxRetries: 1 });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 3000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quick_fix",
          strict: true,
          schema: {
            type: "object",
            properties: {
              fixedText: {
                type: "string",
                description: "Vollständiger, verbesserter Klauseltext — direkt einsetzbar",
              },
              reasoning: {
                type: "string",
                description: "Warum die neue Version besser ist (1-2 Sätze)",
              },
              legalBasis: {
                type: "string",
                description: "Rechtsgrundlage für die Verbesserung",
              },
            },
            required: ["fixedText", "reasoning", "legalBasis"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Du bist ein erfahrener deutscher Vertragsanwalt. Deine Aufgabe: Eine problematische Vertragsklausel so überarbeiten, dass sie rechtssicher, klar und ausgewogen ist.

REGELN:
- Der überarbeitete Text muss VOLLSTÄNDIG und DIREKT EINSETZBAR sein
- Behalte den Stil und Ton des Originals bei
- Ändere NUR was nötig ist — minimale Eingriffe, maximale Verbesserung
- KEINE Platzhalter wie "[...]" oder "[Name]" — verwende die Begriffe aus dem Original
- Begründe die Änderung mit der konkreten Rechtsgrundlage
- Deutsche Rechtssprache, professioneller Stil`,
        },
        {
          role: "user",
          content: `PROBLEM ERKANNT:
${findingTitle}
${findingDescription}
${legalBasis ? `Rechtsgrundlage: ${legalBasis}` : ""}
${severity ? `Schweregrad: ${severity}` : ""}
${contractType ? `Vertragstyp: ${contractType}` : ""}

AKTUELLE KLAUSEL:
${affectedText}

Überarbeite diese Klausel so, dass das identifizierte Problem behoben wird.`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    // Generate word-level diffs
    const diffs = generateWordDiffs(affectedText, parsed.fixedText);

    // Track cost
    const usage = response.usage || {};
    const costUSD = ((usage.prompt_tokens || 0) * 2.5 + (usage.completion_tokens || 0) * 10) / 1_000_000;
    console.log(`[PulseV2] Quick-fix: ${usage.prompt_tokens || 0}+${usage.completion_tokens || 0} tokens, $${costUSD.toFixed(4)}`);

    res.json({
      originalText: affectedText,
      fixedText: parsed.fixedText,
      reasoning: parsed.reasoning,
      legalBasis: parsed.legalBasis,
      diffs,
      costUSD,
    });
  } catch (error) {
    console.error("[PulseV2] Quick-fix error:", error);
    res.status(500).json({ error: "Fehler beim Generieren der Verbesserung" });
  }
});

/**
 * Generate word-level diffs between original and fixed text.
 * Simple but effective: splits on whitespace, marks additions/removals.
 */
function generateWordDiffs(original, fixed) {
  const origWords = original.split(/(\s+)/);
  const fixedWords = fixed.split(/(\s+)/);
  const diffs = [];

  // Simple LCS-based diff
  const m = origWords.length;
  const n = fixedWords.length;

  // For very long texts, fall back to sentence-level diff
  if (m > 500 || n > 500) {
    return [
      { type: "remove", text: original },
      { type: "add", text: fixed },
    ];
  }

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === fixedWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === fixedWords[j - 1]) {
      result.unshift({ type: "equal", text: origWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", text: fixedWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: "remove", text: origWords[i - 1] });
      i--;
    }
  }

  // Merge consecutive same-type entries
  for (const entry of result) {
    if (diffs.length > 0 && diffs[diffs.length - 1].type === entry.type) {
      diffs[diffs.length - 1].text += entry.text;
    } else {
      diffs.push({ ...entry });
    }
  }

  return diffs;
}

// ══════════════════════════════════════════════════════════════
// POST /apply-fix — Save auto-fixed clause to V2 result (one-click apply)
// ══════════════════════════════════════════════════════════════
router.post("/apply-fix", requirePremium, async (req, res) => {
  try {
    const { alertId, clauseId, fixedText, reasoning, legalBasis, changeType } = req.body;
    if (!alertId || !clauseId || !fixedText) {
      return res.status(400).json({ error: "alertId, clauseId und fixedText erforderlich" });
    }

    // Security: validate fixedText
    const trimmed = (fixedText || "").trim();
    if (!trimmed) {
      return res.status(400).json({ error: "fixedText darf nicht leer sein" });
    }
    if (trimmed.length > 20000) {
      return res.status(400).json({ error: "fixedText zu lang (max. 20.000 Zeichen)" });
    }

    const database = require("../config/database");
    const { ObjectId } = require("mongodb");
    const db = await database.connect();
    const userId = req.user.userId;

    // 1. Load the alert for context
    const alert = await db.collection("pulse_v2_legal_alerts").findOne({
      _id: new ObjectId(alertId),
      userId,
    });
    if (!alert) {
      return res.status(404).json({ error: "Alert nicht gefunden" });
    }

    // 2. Find latest V2 result
    const v2Result = await LegalPulseV2Result.findOne({
      contractId: alert.contractId,
      userId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!v2Result) {
      return res.status(404).json({ error: "Keine V2-Analyse gefunden" });
    }

    // 3. Find the clause and determine next version number
    const clause = v2Result.clauses.find((c) => c.id === clauseId);
    if (!clause) {
      return res.status(404).json({ error: `Klausel ${clauseId} nicht gefunden` });
    }

    // 4. Clause lock: prevent duplicate applies with identical text
    // Normalize whitespace for comparison (GPT may produce different spacing)
    const normalize = (t) => t.replace(/\s+/g, " ").trim();
    const currentText = clause.currentText || clause.originalText;
    if (normalize(currentText) === normalize(trimmed)) {
      return res.json({
        success: true,
        clauseId,
        version: (clause.history || []).length > 0 ? clause.history.length + 1 : 1,
        historyLength: (clause.history || []).length || 1,
        skipped: true,
        message: "Klausel ist bereits auf dem neuesten Stand",
      });
    }

    const existingHistory = clause.history || [];
    const nextVersion = existingHistory.length + 2; // v1 = original, v2+ = fixes

    // 5. Build history entry
    const historyEntry = {
      version: nextVersion,
      text: trimmed,
      source: "legal_pulse_fix",
      reasoning: reasoning || "",
      legalBasis: legalBasis || "",
      changeType: changeType || "targeted_fix",
      alertId,
      lawTitle: alert.lawTitle,
      appliedAt: new Date(),
    };

    // 6. If no history exists yet, store v1 (original) first
    const updates = {};
    if (existingHistory.length === 0) {
      // Push original as v1, then the fix as v2
      updates.$push = {
        "clauses.$.history": {
          $each: [
            {
              version: 1,
              text: clause.originalText,
              source: "original",
              reasoning: "Originalversion aus der Vertragsanalyse",
              legalBasis: "",
              changeType: "targeted_fix",
              alertId: "",
              lawTitle: "",
              appliedAt: clause.createdAt || v2Result.createdAt || new Date(),
            },
            historyEntry,
          ],
        },
      };
    } else {
      updates.$push = { "clauses.$.history": historyEntry };
    }

    // 7. Update currentText to the new version
    updates.$set = { "clauses.$.currentText": trimmed };

    await LegalPulseV2Result.updateOne(
      { _id: v2Result._id, "clauses.id": clauseId },
      updates
    );

    // 8. Mark alert: add resolvedClauseId + check if ALL clauses are now resolved
    const affectedClauseIds = alert.affectedClauseIds || [];
    const resolvedSoFar = new Set([...(alert.resolvedClauseIds || []), clauseId]);
    const allResolved = affectedClauseIds.length > 0 &&
      affectedClauseIds.every((id) => resolvedSoFar.has(id));

    await db.collection("pulse_v2_legal_alerts").updateOne(
      { _id: new ObjectId(alertId) },
      {
        $addToSet: { resolvedClauseIds: clauseId },
        $set: {
          status: allResolved ? "resolved" : "read",
          lastFixAppliedAt: new Date(),
        },
      }
    );

    // 9. Track contract-level last update timestamp
    await LegalPulseV2Result.updateOne(
      { _id: v2Result._id },
      { $set: { lastClauseFixAt: new Date() } }
    );

    console.log(`[PulseV2] Clause fix applied: ${clauseId} v${nextVersion} (alert ${alertId}${allResolved ? ", all clauses resolved" : ""})`);

    res.json({
      success: true,
      clauseId,
      version: nextVersion,
      historyLength: existingHistory.length === 0 ? 2 : existingHistory.length + 1,
      allResolved,
    });
  } catch (error) {
    console.error("[PulseV2] Apply fix error:", error);
    res.status(500).json({ error: "Fehler beim Anwenden der Klausel-Anpassung" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /clause-history/:contractId/:clauseId — Version history for a clause
// ══════════════════════════════════════════════════════════════
router.get("/clause-history/:contractId/:clauseId", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contractId, clauseId } = req.params;

    const result = await LegalPulseV2Result.findOne({
      contractId,
      userId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .select("clauses")
      .lean();

    if (!result) {
      return res.status(404).json({ error: "Keine Analyse gefunden" });
    }

    const clause = result.clauses.find((c) => c.id === clauseId);
    if (!clause) {
      return res.status(404).json({ error: "Klausel nicht gefunden" });
    }

    // If no history, return original as v1
    const history = clause.history && clause.history.length > 0
      ? clause.history
      : [{ version: 1, text: clause.originalText, source: "original", appliedAt: result.createdAt }];

    res.json({
      clauseId,
      clauseTitle: clause.title,
      currentText: clause.currentText || clause.originalText,
      originalText: clause.originalText,
      history,
      totalVersions: history.length,
    });
  } catch (error) {
    console.error("[PulseV2] Clause history error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Klausel-Historie" });
  }
});

// ══════════════════════════════════════════════════════════════
// PATCH /legal-alerts/:alertId — Mark alert as read/dismissed
// ══════════════════════════════════════════════════════════════
router.patch("/legal-alerts/:alertId", async (req, res) => {
  try {
    const database = require("../config/database");
    const { ObjectId } = require("mongodb");
    const db = await database.connect();
    const { status } = req.body;

    if (!["read", "dismissed", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Ungültiger Status" });
    }

    await db.collection("pulse_v2_legal_alerts").updateOne(
      { _id: new ObjectId(req.params.alertId), userId: req.user.userId },
      { $set: { status } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("[PulseV2] Alert update error:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Alerts" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /portfolio-summary — Aggregated portfolio health with improvement tracking
// ══════════════════════════════════════════════════════════════
router.get("/portfolio-summary", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get the 2 most recent completed results per contract
    const results = await LegalPulseV2Result.aggregate([
      { $match: { userId, status: "completed" } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$contractId",
          latest: { $first: "$$ROOT" },
          previous: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          latest: 1,
          previous: { $arrayElemAt: ["$previous", 1] }, // second element = previous
        },
      },
    ]);

    if (results.length === 0) {
      return res.json({
        hasData: false,
        avgScoreNow: null,
        avgScorePrevious: null,
        delta: 0,
        contractsAnalyzed: 0,
        contractsImproved: 0,
        contractsWorsened: 0,
        actionsTotal: 0,
        actionsCompleted: 0,
        criticalNow: 0,
        criticalResolved: 0,
        topImprovement: null,
        topDecline: null,
      });
    }

    let totalScoreNow = 0;
    let totalScorePrevious = 0;
    let contractsWithPrevious = 0;
    let contractsImproved = 0;
    let contractsWorsened = 0;
    let actionsTotal = 0;
    let actionsCompleted = 0;
    let criticalNow = 0;
    let criticalPrevious = 0;
    let topImprovement = null;
    let topDecline = null;

    for (const r of results) {
      const nowScore = r.latest?.scores?.overall ?? 0;
      totalScoreNow += nowScore;

      // Count current critical findings
      const currentCritical = (r.latest?.clauseFindings || []).filter(f => f.severity === "critical").length;
      criticalNow += currentCritical;

      // Count actions
      const latestActions = r.latest?.actions || [];
      actionsTotal += latestActions.length;
      actionsCompleted += latestActions.filter(a => a.status === "done").length;

      // Compare with previous
      if (r.previous && r.previous.scores) {
        contractsWithPrevious++;
        const prevScore = r.previous.scores.overall ?? 0;
        totalScorePrevious += prevScore;

        const prevCritical = (r.previous.clauseFindings || []).filter(f => f.severity === "critical").length;
        criticalPrevious += prevCritical;

        const delta = nowScore - prevScore;
        if (delta > 0) {
          contractsImproved++;
          if (!topImprovement || delta > topImprovement.delta) {
            topImprovement = {
              contractId: r._id,
              name: r.latest.context?.contractName || "Unbenannt",
              delta,
              scoreNow: nowScore,
            };
          }
        } else if (delta < 0) {
          contractsWorsened++;
          if (!topDecline || delta < topDecline.delta) {
            topDecline = {
              contractId: r._id,
              name: r.latest.context?.contractName || "Unbenannt",
              delta,
              scoreNow: nowScore,
            };
          }
        }
      }
    }

    const avgScoreNow = Math.round(totalScoreNow / results.length);
    const avgScorePrevious = contractsWithPrevious > 0
      ? Math.round(totalScorePrevious / contractsWithPrevious)
      : null;
    const criticalResolved = contractsWithPrevious > 0
      ? Math.max(0, criticalPrevious - criticalNow)
      : 0;

    res.json({
      hasData: true,
      avgScoreNow,
      avgScorePrevious,
      delta: avgScorePrevious !== null ? avgScoreNow - avgScorePrevious : 0,
      contractsAnalyzed: results.length,
      contractsImproved,
      contractsWorsened,
      actionsTotal,
      actionsCompleted,
      criticalNow,
      criticalResolved,
      topImprovement,
      topDecline,
    });
  } catch (error) {
    console.error("[PulseV2] Portfolio summary error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Portfolio-Zusammenfassung" });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /monitoring-status — System monitoring state for dashboard
// ══════════════════════════════════════════════════════════════
router.get("/monitoring-status", async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries
    const [
      contractsMonitored,
      lastScheduledResult,
      lastManualResult,
      recentAlerts,
      unreadAlertCounts,
    ] = await Promise.all([
      // Count distinct contracts with completed V2 results
      LegalPulseV2Result.distinct("contractId", { userId, status: "completed" }),

      // Last scheduled scan result
      LegalPulseV2Result.findOne(
        { userId, status: "completed", triggeredBy: "scheduled" },
        { createdAt: 1 },
        { sort: { createdAt: -1 } }
      ).lean(),

      // Last manual scan result
      LegalPulseV2Result.findOne(
        { userId, status: "completed" },
        { createdAt: 1 },
        { sort: { createdAt: -1 } }
      ).lean(),

      // Recent legal alerts (last 30 days)
      db.collection("pulse_v2_legal_alerts")
        .find({ userId, createdAt: { $gte: thirtyDaysAgo } })
        .sort({ createdAt: -1 })
        .limit(50)
        .project({ severity: 1, status: 1, createdAt: 1 })
        .toArray(),

      // Unread/active alert counts by severity
      db.collection("pulse_v2_legal_alerts").aggregate([
        { $match: { userId, status: { $in: ["unread", "read"] } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    // Calculate next scan times
    const nextMonitorScan = getNextCronOccurrence("monitor", now);
    const nextRadarScan = getNextCronOccurrence("radar", now);

    // Last scan time (most recent of scheduled or radar alert)
    const lastRadarAlert = recentAlerts.length > 0 ? recentAlerts[0].createdAt : null;
    const lastScheduledScan = lastScheduledResult?.createdAt || null;
    const lastAnyScan = lastManualResult?.createdAt || null;

    // Build severity counts from unread alerts
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const entry of unreadAlertCounts) {
      if (severityCounts.hasOwnProperty(entry._id)) {
        severityCounts[entry._id] = entry.count;
      }
    }

    // Determine overall status: green / yellow / red
    let status = "green";
    let statusLabel = "Alles sicher";
    if (severityCounts.critical > 0) {
      status = "red";
      statusLabel = "Handlungsbedarf";
    } else if (severityCounts.high > 0 || severityCounts.medium > 0) {
      status = "yellow";
      statusLabel = "Beobachtung nötig";
    } else if (contractsMonitored.length === 0) {
      status = "neutral";
      statusLabel = "Noch nicht aktiv";
    }

    // Check staleness: any contract not scanned in 14+ days?
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    if (status === "green" && lastAnyScan && new Date(lastAnyScan) < fourteenDaysAgo) {
      status = "yellow";
      statusLabel = "Scan überfällig";
    }

    res.json({
      status,
      statusLabel,
      contractsMonitored: contractsMonitored.length,
      lastScan: lastAnyScan,
      lastScheduledScan,
      lastRadarScan: lastRadarAlert,
      nextMonitorScan: nextMonitorScan.toISOString(),
      nextRadarScan: nextRadarScan.toISOString(),
      alertsTotal: recentAlerts.length,
      severityCounts,
      recentAlertsCount: recentAlerts.filter(a => a.status === "unread").length,
    });
  } catch (error) {
    console.error("[PulseV2] Monitoring status error:", error);
    res.status(500).json({ error: "Fehler beim Laden des Monitoring-Status" });
  }
});

/**
 * Calculate next cron occurrence
 * Monitor: Sunday 05:00 UTC ("0 5 * * 0")
 * Radar: Daily 07:00 and 19:00 UTC ("0 7,19 * * *")
 */
function getNextCronOccurrence(type, now) {
  const next = new Date(now);

  if (type === "monitor") {
    // Next Sunday 05:00 UTC
    const dayOfWeek = now.getUTCDay();
    let daysUntilSunday = (7 - dayOfWeek) % 7;
    if (daysUntilSunday === 0 && now.getUTCHours() >= 5) {
      daysUntilSunday = 7;
    }
    next.setUTCDate(next.getUTCDate() + daysUntilSunday);
    next.setUTCHours(5, 0, 0, 0);
  } else {
    // Next 07:00 or 19:00 UTC
    const hour = now.getUTCHours();
    if (hour < 7) {
      next.setUTCHours(7, 0, 0, 0);
    } else if (hour < 19) {
      next.setUTCHours(19, 0, 0, 0);
    } else {
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(7, 0, 0, 0);
    }
    next.setUTCMinutes(0, 0, 0);
  }

  return next;
}

// ══════════════════════════════════════════════════════════════
// POST /scan-now — Manual quick scan trigger
// ══════════════════════════════════════════════════════════════
const scanNowRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 3,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: "Maximal 3 Scans pro 10 Minuten." });
  },
});

router.post("/scan-now", requirePremium, scanNowRateLimiter, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;
    const now = new Date();

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Get all user contracts
    const contracts = await db.collection("contracts")
      .find(
        { $or: [{ userId }, { userId: userId.toString() }] },
        { projection: { _id: 1, name: 1, contractType: 1 } }
      )
      .toArray();

    const contractIds = contracts.map(c => c._id.toString());

    // 2. Get latest V2 result per contract
    const latestResults = await LegalPulseV2Result.aggregate([
      { $match: { userId, status: "completed", contractId: { $in: contractIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$contractId", lastAnalysis: { $first: "$createdAt" }, score: { $first: "$scores.overall" } } },
    ]);

    const analyzedMap = new Map(latestResults.map(r => [r._id, r]));

    // 3. Classify contracts
    const staleContracts = [];
    const unanalyzedContracts = [];
    const freshContracts = [];

    for (const c of contracts) {
      const cid = c._id.toString();
      const result = analyzedMap.get(cid);
      if (!result) {
        unanalyzedContracts.push({ contractId: cid, name: c.name || "Unbenannt" });
      } else if (new Date(result.lastAnalysis) < sevenDaysAgo) {
        staleContracts.push({
          contractId: cid,
          name: c.name || "Unbenannt",
          lastAnalysis: result.lastAnalysis,
          score: result.score,
          daysAgo: Math.floor((now.getTime() - new Date(result.lastAnalysis).getTime()) / (1000 * 60 * 60 * 24)),
        });
      } else {
        freshContracts.push({ contractId: cid, name: c.name || "Unbenannt", score: result.score });
      }
    }

    // 4. Check for new law changes since last radar scan
    const lastRadarAlert = await db.collection("pulse_v2_legal_alerts")
      .findOne({ userId }, { sort: { createdAt: -1 }, projection: { createdAt: 1 } });

    const checkSince = lastRadarAlert?.createdAt || sevenDaysAgo;
    const newLawChanges = await db.collection("laws")
      .countDocuments({ createdAt: { $gte: checkSince } });

    // 5. Count unresolved alerts
    const unresolvedAlerts = await db.collection("pulse_v2_legal_alerts")
      .countDocuments({ userId, status: { $in: ["unread", "read"] } });

    // 6. Record this scan in alert log for lastScan tracking
    await db.collection("pulse_v2_alert_log").insertOne({
      userId,
      contractId: "manual_scan",
      fingerprint: "manual_scan",
      title: "Manueller Scan",
      severity: "info",
      createdAt: now,
    });

    // 7. Determine scan verdict
    let verdict = "green";
    let verdictMessage = "Keine neuen Risiken seit der letzten Prüfung erkannt.";

    if (unresolvedAlerts > 0 || staleContracts.length > 0) {
      const parts = [];
      if (unresolvedAlerts > 0) {
        parts.push(`${unresolvedAlerts} offene${unresolvedAlerts === 1 ? "r" : ""} Alert${unresolvedAlerts === 1 ? "" : "s"}`);
      }
      if (staleContracts.length > 0) {
        parts.push(`${staleContracts.length} Vertrag${staleContracts.length === 1 ? " sollte" : "e sollten"} neu gescannt werden`);
      }
      verdict = "yellow";
      verdictMessage = parts.join(" — ");
    }

    if (newLawChanges > 0 && verdict === "green") {
      verdictMessage = `Keine neuen Risiken erkannt. ${newLawChanges} neue Rechtsänderung${newLawChanges === 1 ? "" : "en"} wird beim nächsten Radar-Scan geprüft.`;
    }

    if (unanalyzedContracts.length > 0 && unanalyzedContracts.length === contracts.length) {
      verdict = "neutral";
      verdictMessage = "Noch kein Vertrag analysiert. Starten Sie Ihre erste Analyse.";
    }

    res.json({
      scannedAt: now.toISOString(),
      verdict,
      verdictMessage,
      totalContracts: contracts.length,
      freshCount: freshContracts.length,
      staleContracts: staleContracts.slice(0, 5),
      staleCount: staleContracts.length,
      unanalyzedContracts: unanalyzedContracts.slice(0, 5),
      unanalyzedCount: unanalyzedContracts.length,
      unresolvedAlerts,
      newLawChanges,
    });
  } catch (error) {
    console.error("[PulseV2] Scan now error:", error);
    res.status(500).json({ error: "Scan fehlgeschlagen" });
  }
});

// ══════════════════════════════════════════════════════════════
// ADMIN TEST ENDPOINTS — Frühwarnsystem End-to-End Testing
// Protected by requirePremium — only premium users can access
// TODO: Remove after successful testing
// ══════════════════════════════════════════════════════════════

/**
 * Helper: Check a title string for HTML artifacts / dirty content.
 * Returns null if clean, or a description of what was found.
 */
function checkTitleCleanliness(title) {
  if (!title || typeof title !== "string") return "missing or non-string title";
  const issues = [];
  if (/\n/.test(title)) issues.push("contains \\n");
  if (/\t/.test(title)) issues.push("contains \\t");
  if (/<[^>]+>/.test(title)) issues.push("contains HTML tags");
  if (/\s{3,}/.test(title)) issues.push("excess whitespace (3+)");
  if (/&[a-z]+;/i.test(title)) issues.push("contains HTML entities");
  if (/&#\d+;/.test(title)) issues.push("contains numeric HTML entities");
  return issues.length > 0 ? issues.join(", ") : null;
}

/**
 * POST /admin/test-rss-sync
 * Triggers RSS sync manually and returns detailed results with automated checks.
 * Safe: only writes to shared `laws` collection (no user-specific impact).
 *
 * Checks:
 *  - feedsResponding: Did RSS feeds return data? How many of total?
 *  - itemsInserted: Were new laws inserted?
 *  - titlesClean: Are the 20 most recent law titles free of HTML artifacts?
 *  - areasAssigned: Do all recent laws have an area assigned?
 *  - processedFlagSet: Are new entries marked pulseV2Processed: false?
 */
router.post("/admin/test-rss-sync", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const rssService = require("../services/rssService");
    const totalFeedCount = Object.keys(rssService.LEGAL_RSS_FEEDS).length;
    const enabledFeedCount = Object.values(rssService.LEGAL_RSS_FEEDS).filter(f => f.enabled).length;

    // Count laws before sync
    const lawsBefore = await db.collection("laws").countDocuments();
    const unprocessedBefore = await db.collection("laws").countDocuments({ pulseV2Processed: { $ne: true } });

    // Run RSS sync
    const { runPulseV2RssSync } = require("../jobs/pulseV2RssSync");
    const syncResult = await runPulseV2RssSync(db);

    // Count laws after sync
    const lawsAfter = await db.collection("laws").countDocuments();
    const unprocessedAfter = await db.collection("laws").countDocuments({ pulseV2Processed: { $ne: true } });

    // Get sample of recent laws for inspection
    const recentLaws = await db.collection("laws")
      .find({})
      .sort({ updatedAt: -1 })
      .limit(20)
      .project({ lawId: 1, title: 1, area: 1, source: 1, sourceUrl: 1, updatedAt: 1, pulseV2Processed: 1 })
      .toArray();

    // Get distinct areas and sources
    const areas = await db.collection("laws").distinct("area");
    const sources = await db.collection("laws").distinct("source");

    // ── Automated checks ──

    // Check 1: feedsResponding — Did the sync fetch items at all?
    const itemsFetched = syncResult.total || 0;
    const feedsRespondedEstimate = itemsFetched > 0 ? enabledFeedCount : 0; // rough: if items came, feeds responded
    const feedsRespondingPassed = itemsFetched > 0;

    // Check 2: itemsInserted
    const netNew = lawsAfter - lawsBefore;
    const itemsInsertedPassed = (syncResult.inserted || 0) > 0 || netNew > 0 || (syncResult.skipped || 0) > 0;
    // If all skipped, feeds responded but all items already exist — still a pass

    // Check 3: titlesClean — check 20 most recent laws for HTML artifacts
    const dirtyTitles = [];
    for (const law of recentLaws) {
      const issue = checkTitleCleanliness(law.title);
      if (issue) {
        dirtyTitles.push({ lawId: law.lawId, title: (law.title || "").substring(0, 100), issue });
      }
    }
    const titlesCleanPassed = dirtyTitles.length === 0;

    // Check 4: areasAssigned — do all recent laws have a non-empty area?
    const lawsWithoutArea = recentLaws.filter(l => !l.area || l.area === "");
    const areasAssignedPassed = lawsWithoutArea.length === 0;

    // Check 5: processedFlagSet — are new entries marked pulseV2Processed: false?
    const newUnprocessed = unprocessedAfter - unprocessedBefore;
    const insertedCount = syncResult.inserted || 0;
    // If items were inserted, unprocessed count should have grown
    const processedFlagPassed = insertedCount === 0 || newUnprocessed > 0;

    res.json({
      success: true,
      syncResult,
      database: {
        lawsBefore,
        lawsAfter,
        netNew,
        unprocessedBefore,
        unprocessedAfter,
        totalLaws: lawsAfter,
      },
      coverage: {
        distinctAreas: areas,
        distinctSources: sources,
        areaCount: areas.length,
        sourceCount: sources.length,
      },
      recentLaws: recentLaws.slice(0, 10),
      checks: {
        feedsResponding: {
          passed: feedsRespondingPassed,
          detail: feedsRespondingPassed
            ? `RSS feeds returned ${itemsFetched} items. ${enabledFeedCount} of ${totalFeedCount} feeds enabled.`
            : `No items fetched from RSS feeds. ${enabledFeedCount} of ${totalFeedCount} feeds enabled. Check network/feed URLs.`,
        },
        itemsInserted: {
          passed: itemsInsertedPassed,
          detail: `${insertedCount} new laws inserted, ${syncResult.updated || 0} updated, ${syncResult.skipped || 0} skipped (already existed). Net DB change: ${netNew}.`,
        },
        titlesClean: {
          passed: titlesCleanPassed,
          detail: titlesCleanPassed
            ? `All ${recentLaws.length} sampled titles are clean (no HTML artifacts, no excess whitespace).`
            : `${dirtyTitles.length} of ${recentLaws.length} sampled titles have issues.`,
          ...(dirtyTitles.length > 0 && { dirtyTitles }),
        },
        areasAssigned: {
          passed: areasAssignedPassed,
          detail: areasAssignedPassed
            ? `All ${recentLaws.length} sampled laws have an area assigned. Areas: ${areas.join(", ")}.`
            : `${lawsWithoutArea.length} of ${recentLaws.length} sampled laws missing area. Areas in DB: ${areas.join(", ")}.`,
        },
        processedFlagSet: {
          passed: processedFlagPassed,
          detail: processedFlagPassed
            ? `New entries correctly marked pulseV2Processed: false. Unprocessed: ${unprocessedBefore} -> ${unprocessedAfter} (${insertedCount} inserted).`
            : `Expected unprocessed count to grow after ${insertedCount} inserts, but went from ${unprocessedBefore} to ${unprocessedAfter}.`,
        },
      },
      message: `RSS Sync abgeschlossen. ${insertedCount} neu, ${syncResult.updated || 0} aktualisiert. ${unprocessedAfter} Laws warten auf Radar-Scan.`,
    });
  } catch (error) {
    console.error("[AdminTest] RSS Sync error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * POST /admin/test-rss-dedup
 * Runs RSS sync TWICE and verifies deduplication works correctly.
 * The second run should insert 0 (or very few) new items.
 *
 * Checks:
 *  - noDuplicates: Second run inserted 0 new items (or very few)
 *  - idempotent: Total law count didn't significantly increase on second run
 */
router.post("/admin/test-rss-dedup", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const { runPulseV2RssSync } = require("../jobs/pulseV2RssSync");

    // Run 1
    const countBefore1 = await db.collection("laws").countDocuments();
    const run1Result = await runPulseV2RssSync(db);
    const countAfter1 = await db.collection("laws").countDocuments();

    // Run 2 (immediate second run — should be near-idempotent)
    const countBefore2 = countAfter1;
    const run2Result = await runPulseV2RssSync(db);
    const countAfter2 = await db.collection("laws").countDocuments();

    const run2Inserted = run2Result.inserted || 0;
    const run2NetChange = countAfter2 - countBefore2;

    // Allow a small tolerance (e.g., 2) because RSS feeds could publish new items between runs
    const DEDUP_TOLERANCE = 2;
    const noDuplicatesPassed = run2Inserted <= DEDUP_TOLERANCE;
    const idempotentPassed = run2NetChange <= DEDUP_TOLERANCE;

    res.json({
      success: true,
      run1: {
        lawsBefore: countBefore1,
        lawsAfter: countAfter1,
        netNew: countAfter1 - countBefore1,
        syncResult: run1Result,
      },
      run2: {
        lawsBefore: countBefore2,
        lawsAfter: countAfter2,
        netNew: run2NetChange,
        syncResult: run2Result,
      },
      checks: {
        noDuplicates: {
          passed: noDuplicatesPassed,
          detail: noDuplicatesPassed
            ? `Second run inserted ${run2Inserted} items (tolerance: ${DEDUP_TOLERANCE}). Deduplication working correctly.`
            : `Second run inserted ${run2Inserted} items — exceeds tolerance of ${DEDUP_TOLERANCE}. Possible dedup failure.`,
        },
        idempotent: {
          passed: idempotentPassed,
          detail: idempotentPassed
            ? `Total law count stable: ${countBefore2} -> ${countAfter2} (delta: ${run2NetChange}, tolerance: ${DEDUP_TOLERANCE}).`
            : `Total law count grew unexpectedly: ${countBefore2} -> ${countAfter2} (delta: ${run2NetChange}). Expected near-zero change.`,
        },
      },
      message: `Dedup-Test abgeschlossen. Run 1: ${run1Result.inserted || 0} neu. Run 2: ${run2Inserted} neu (soll ~0 sein).`,
    });
  } catch (error) {
    console.error("[AdminTest] RSS Dedup error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * POST /admin/test-radar?dryRun=true
 * Triggers Radar for the authenticated admin user's contracts ONLY.
 * dryRun=true (default): stores alerts but does NOT send emails.
 * dryRun=false: full run including email notifications.
 *
 * Checks:
 *  - lawsFound: Were recent unprocessed laws found?
 *  - contractsMatched: Were user's contracts matched to laws?
 *  - aiDecisionsLogged: Are there AI decision logs?
 *  - alertsCreated: Were any alerts created?
 *  - noOtherUsersAffected: No alerts created for other userIds
 *  - clauseIdsValid: If alerts exist, clauseIds reference real clauses
 */
router.post("/admin/test-radar", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;
    const dryRun = req.query.dryRun !== "false"; // default: true

    // 1. Check prerequisites: does this user have V2 results?
    const userResults = await LegalPulseV2Result.countDocuments({ userId, status: "completed" });
    if (userResults === 0) {
      return res.json({
        success: false,
        message: "Keine V2-Analyse-Ergebnisse gefunden. Bitte erst einen Vertrag analysieren, damit der Radar etwas matchen kann.",
        prerequisite: "Mindestens 1 abgeschlossene V2-Analyse erforderlich.",
        checks: {
          lawsFound: { passed: false, detail: "Skipped — no V2 results for this user." },
          contractsMatched: { passed: false, detail: "Skipped — no V2 results for this user." },
          aiDecisionsLogged: { passed: false, detail: "Skipped — no V2 results for this user." },
          alertsCreated: { passed: false, detail: "Skipped — no V2 results for this user." },
          noOtherUsersAffected: { passed: true, detail: "No radar run performed." },
          clauseIdsValid: { passed: true, detail: "No alerts to check." },
        },
      });
    }

    // 2. Count other users' alerts BEFORE radar run (for isolation check)
    const otherAlertsBeforeRun = await db.collection("pulse_v2_legal_alerts")
      .countDocuments({ userId: { $ne: userId } });

    // 3. Check: are there unprocessed laws?
    const unprocessedLaws = await db.collection("laws")
      .find({ pulseV2Processed: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .project({ lawId: 1, title: 1, area: 1, updatedAt: 1 })
      .toArray();

    // Also get recently processed laws (last 7 days) for visibility
    const recentProcessed = await db.collection("laws")
      .find({
        pulseV2Processed: true,
        pulseV2ProcessedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
      .sort({ pulseV2ProcessedAt: -1 })
      .limit(5)
      .project({ lawId: 1, title: 1, area: 1, pulseV2ProcessedAt: 1 })
      .toArray();

    if (unprocessedLaws.length === 0) {
      return res.json({
        success: true,
        message: "Keine neuen/unverarbeiteten Laws gefunden. Der Radar hat nichts zu tun. Tipp: Erst /admin/test-rss-sync ausführen.",
        unprocessedLaws: 0,
        recentlyProcessed: recentProcessed,
        userV2Results: userResults,
        checks: {
          lawsFound: { passed: false, detail: "No unprocessed laws found. Run /admin/test-rss-sync first." },
          contractsMatched: { passed: false, detail: "Skipped — no unprocessed laws." },
          aiDecisionsLogged: { passed: false, detail: "Skipped — no radar run." },
          alertsCreated: { passed: false, detail: "Skipped — no radar run." },
          noOtherUsersAffected: { passed: true, detail: "No radar run performed." },
          clauseIdsValid: { passed: true, detail: "No alerts to check." },
        },
      });
    }

    // 4. Run Radar — but scoped to this user only
    const { runPulseV2Radar } = require("../jobs/pulseV2Radar");

    // Store original queueEmail to intercept in dryRun mode
    const emailRetryService = require("../services/emailRetryService");
    const originalQueueEmail = emailRetryService.queueEmail;
    const interceptedEmails = [];

    if (dryRun) {
      emailRetryService.queueEmail = async (emailData) => {
        interceptedEmails.push({
          to: emailData.to,
          subject: emailData.subject,
          bodyPreview: (emailData.body || emailData.html || "").substring(0, 200) + "...",
          intercepted: true,
        });
        console.log(`[AdminTest] DryRun: Email intercepted -> ${emailData.to} | ${emailData.subject}`);
        return { intercepted: true };
      };
    }

    // Capture console.log output from Radar for diagnostic visibility
    const radarLogs = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const logInterceptor = (...args) => {
      const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      if (msg.includes("[PulseV2Radar]")) {
        radarLogs.push(msg);
      }
      originalLog.apply(console, args);
    };
    console.log = logInterceptor;
    console.warn = (...args) => {
      const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      if (msg.includes("[PulseV2Radar]")) radarLogs.push("[WARN] " + msg);
      originalWarn.apply(console, args);
    };

    let radarResult;
    try {
      radarResult = await runPulseV2Radar(db, { userId });
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      if (dryRun) {
        emailRetryService.queueEmail = originalQueueEmail;
      }
    }

    // 5. Get alerts created for this user
    const userAlerts = await db.collection("pulse_v2_legal_alerts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // 6. Count other users' alerts AFTER radar run (isolation check)
    const otherAlertsAfterRun = await db.collection("pulse_v2_legal_alerts")
      .countDocuments({ userId: { $ne: userId } });

    // 7. Get the laws that were just processed (for context)
    const justProcessed = await db.collection("laws")
      .find({ pulseV2Processed: true, pulseV2ProcessedAt: { $gte: new Date(Date.now() - 60000) } })
      .sort({ pulseV2ProcessedAt: -1 })
      .limit(10)
      .project({ title: 1, area: 1, source: 1, pulseV2ProcessedAt: 1 })
      .toArray();

    // 8. Validate clauseIds in alerts against actual V2 results
    const clauseIdIssues = [];
    for (const alert of userAlerts) {
      if (alert.affectedClauseIds && alert.affectedClauseIds.length > 0) {
        // Look up the V2 result for this contract to get actual clause IDs
        const v2Result = await LegalPulseV2Result.findOne(
          { userId, contractId: alert.contractId, status: "completed" },
          { sort: { createdAt: -1 } }
        );
        if (v2Result && v2Result.clauses) {
          const validIds = new Set(v2Result.clauses.map(c => c.id));
          const invalidIds = alert.affectedClauseIds.filter(id => !validIds.has(id));
          if (invalidIds.length > 0) {
            clauseIdIssues.push({
              alertId: alert._id,
              contractName: alert.contractName,
              invalidClauseIds: invalidIds,
            });
          }
        }
      }
    }

    // ── Automated checks ──
    const aiDecisions = radarLogs.filter(l => l.includes("AI decision"));
    const lawsFoundPassed = (radarResult.lawChanges || 0) > 0;
    const contractsMatchedPassed = (radarResult.contractsMatched || 0) > 0;
    const aiDecisionsLoggedPassed = aiDecisions.length > 0;
    const alertsCreatedCount = radarResult.alertsSent || 0;
    const noOtherUsersPassed = otherAlertsAfterRun === otherAlertsBeforeRun;
    const clauseIdsValidPassed = clauseIdIssues.length === 0;

    res.json({
      success: true,
      dryRun,
      radarResult,
      userScope: {
        userId,
        v2ResultsCount: userResults,
        alertsForUser: userAlerts.length,
      },
      aiDecisions,
      radarLogs,
      processedLaws: justProcessed,
      alerts: userAlerts.map(a => ({
        _id: a._id,
        lawTitle: a.lawTitle,
        contractName: a.contractName,
        severity: a.severity,
        impactSummary: a.impactSummary,
        recommendation: a.recommendation,
        status: a.status,
        createdAt: a.createdAt,
      })),
      interceptedEmails: dryRun ? interceptedEmails : "Emails were sent (dryRun=false)",
      unprocessedLawsBefore: unprocessedLaws.length,
      checks: {
        lawsFound: {
          passed: lawsFoundPassed,
          detail: lawsFoundPassed
            ? `${radarResult.lawChanges} unprocessed law changes found and scanned.`
            : `No law changes picked up by radar. ${unprocessedLaws.length} were unprocessed before run.`,
        },
        contractsMatched: {
          passed: contractsMatchedPassed,
          detail: contractsMatchedPassed
            ? `${radarResult.contractsMatched} contract(s) matched against law changes for userId ${userId}.`
            : `No contracts matched. User has ${userResults} V2 results. Check area-to-contractType mapping.`,
        },
        aiDecisionsLogged: {
          passed: aiDecisionsLoggedPassed,
          detail: aiDecisionsLoggedPassed
            ? `${aiDecisions.length} AI decision(s) logged. Radar AI assessment ran successfully.`
            : `No AI decisions logged. Either no contracts matched, or OpenAI call failed. Check radarLogs.`,
        },
        alertsCreated: {
          passed: alertsCreatedCount > 0,
          detail: alertsCreatedCount > 0
            ? `${alertsCreatedCount} alert(s) created for this user.`
            : `0 alerts created. AI may have determined no contracts are affected (confidence < threshold), or all alerts already existed (dedup).`,
        },
        noOtherUsersAffected: {
          passed: noOtherUsersPassed,
          detail: noOtherUsersPassed
            ? `Other users' alert count unchanged (${otherAlertsBeforeRun} before, ${otherAlertsAfterRun} after). userId scoping correct.`
            : `WARNING: Other users' alert count changed from ${otherAlertsBeforeRun} to ${otherAlertsAfterRun}. Possible userId scoping issue!`,
        },
        clauseIdsValid: {
          passed: clauseIdsValidPassed,
          detail: clauseIdsValidPassed
            ? userAlerts.length > 0
              ? `All clauseIds in ${userAlerts.length} alert(s) reference valid clauses from V2 results.`
              : `No alerts to validate clauseIds against.`
            : `${clauseIdIssues.length} alert(s) have invalid clauseIds.`,
          ...(clauseIdIssues.length > 0 && { clauseIdIssues }),
        },
      },
      message: dryRun
        ? `Radar-Test abgeschlossen (DRY RUN). ${alertsCreatedCount} Alerts erstellt, ${interceptedEmails.length} Emails abgefangen (NICHT gesendet).`
        : `Radar-Test abgeschlossen (LIVE). ${alertsCreatedCount} Alerts erstellt, Emails wurden versendet.`,
    });
  } catch (error) {
    console.error("[AdminTest] Radar error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * GET /admin/test-status
 * Shows complete system status: Laws DB, RSS coverage, Radar state, Alerts, Cron health.
 *
 * Checks:
 *  - rssSyncHealthy: Did the last RSS sync cron succeed?
 *  - radarHealthy: Did the last Radar cron succeed?
 *  - lawsExist: Are there laws in the DB?
 *  - recentLawsExist: Are there laws from the last 7 days?
 *  - dataQuality: Sample 20 recent laws, check for HTML artifacts in titles
 *  - userHasV2Results: Does this user have completed V2 analyses?
 */
router.get("/admin/test-status", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;

    // Laws collection stats
    const totalLaws = await db.collection("laws").countDocuments();
    const unprocessedLaws = await db.collection("laws").countDocuments({ pulseV2Processed: { $ne: true } });
    const processedLaws = await db.collection("laws").countDocuments({ pulseV2Processed: true });
    const lawAreas = await db.collection("laws").distinct("area");
    const lawSources = await db.collection("laws").distinct("source");

    // Most recent law entry
    const newestLaw = await db.collection("laws")
      .findOne({}, { sort: { updatedAt: -1 }, projection: { title: 1, area: 1, source: 1, updatedAt: 1, pulseV2Processed: 1 } });

    // Oldest unprocessed law
    const oldestUnprocessed = await db.collection("laws")
      .findOne({ pulseV2Processed: { $ne: true } }, { sort: { updatedAt: 1 }, projection: { title: 1, area: 1, updatedAt: 1 } });

    // Recent laws (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLawCount = await db.collection("laws").countDocuments({ updatedAt: { $gte: sevenDaysAgo } });

    // Sample 20 recent laws for data quality check
    const sampleLaws = await db.collection("laws")
      .find({})
      .sort({ updatedAt: -1 })
      .limit(20)
      .project({ lawId: 1, title: 1, area: 1 })
      .toArray();

    const dirtyTitles = [];
    for (const law of sampleLaws) {
      const issue = checkTitleCleanliness(law.title);
      if (issue) {
        dirtyTitles.push({ lawId: law.lawId, title: (law.title || "").substring(0, 100), issue });
      }
    }

    // User's V2 analysis results
    const userResults = await LegalPulseV2Result.countDocuments({ userId, status: "completed" });
    const userContracts = await LegalPulseV2Result.distinct("contractId", { userId, status: "completed" });

    // Contract types in user's portfolio (for radar matching)
    const userContractTypes = await LegalPulseV2Result.aggregate([
      { $match: { userId, status: "completed" } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$contractId", type: { $first: "$document.contractType" }, name: { $first: "$context.contractName" } } },
    ]);

    // Alerts for this user
    const totalAlerts = await db.collection("pulse_v2_legal_alerts").countDocuments({ userId });
    const unresolvedAlerts = await db.collection("pulse_v2_legal_alerts").countDocuments({ userId, status: { $in: ["unread", "read"] } });
    const recentAlerts = await db.collection("pulse_v2_legal_alerts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ lawTitle: 1, contractName: 1, severity: 1, status: 1, createdAt: 1 })
      .toArray();

    // Cron job health (check cron_logs for last runs)
    const cronLogs = await db.collection("cron_logs")
      .find({ jobName: { $in: ["pulse-v2-rss-sync", "pulse-v2-radar", "pulse-v2-monitor", "pulse-v2-staleness-reminder"] } })
      .sort({ startedAt: -1 })
      .limit(10)
      .project({ jobName: 1, status: 1, startedAt: 1, completedAt: 1, result: 1, error: 1 })
      .toArray();

    // Find last RSS sync and Radar cron entries specifically
    const lastRssSync = cronLogs.find(l => l.jobName === "pulse-v2-rss-sync");
    const lastRadar = cronLogs.find(l => l.jobName === "pulse-v2-radar");

    // RSS feed health check (which feeds have contributed data?)
    const feedContributions = await db.collection("laws").aggregate([
      { $group: { _id: "$source", count: { $sum: 1 }, lastEntry: { $max: "$updatedAt" } } },
      { $sort: { count: -1 } },
    ]).toArray();

    // ── Automated checks ──
    const rssSyncHealthyPassed = lastRssSync ? lastRssSync.status === "completed" : false;
    const radarHealthyPassed = lastRadar ? lastRadar.status === "completed" : false;
    const lawsExistPassed = totalLaws > 0;
    const recentLawsExistPassed = recentLawCount > 0;
    const dataQualityPassed = dirtyTitles.length === 0;
    const userHasV2ResultsPassed = userResults > 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      laws: {
        total: totalLaws,
        processed: processedLaws,
        unprocessed: unprocessedLaws,
        areas: lawAreas,
        areaCount: lawAreas.length,
        sources: lawSources,
        sourceCount: lawSources.length,
        newestLaw,
        oldestUnprocessed,
        recentLawCount,
      },
      rssFeedHealth: feedContributions,
      userPortfolio: {
        userId,
        v2ResultsCount: userResults,
        analyzedContracts: userContracts.length,
        contractTypes: userContractTypes.map(c => ({ contractId: c._id, type: c.type, name: c.name })),
      },
      alerts: {
        total: totalAlerts,
        unresolved: unresolvedAlerts,
        recent: recentAlerts,
      },
      cronHealth: cronLogs,
      checks: {
        rssSyncHealthy: {
          passed: rssSyncHealthyPassed,
          detail: lastRssSync
            ? `Last RSS sync cron: status="${lastRssSync.status}" at ${lastRssSync.startedAt}. ${lastRssSync.error ? "Error: " + lastRssSync.error : "No errors."}`
            : "No RSS sync cron log found. Cron may not have run yet.",
        },
        radarHealthy: {
          passed: radarHealthyPassed,
          detail: lastRadar
            ? `Last Radar cron: status="${lastRadar.status}" at ${lastRadar.startedAt}. ${lastRadar.error ? "Error: " + lastRadar.error : "No errors."}`
            : "No Radar cron log found. Cron may not have run yet.",
        },
        lawsExist: {
          passed: lawsExistPassed,
          detail: lawsExistPassed
            ? `${totalLaws} laws in DB (${processedLaws} processed, ${unprocessedLaws} unprocessed).`
            : "No laws in DB. Run /admin/test-rss-sync first.",
        },
        recentLawsExist: {
          passed: recentLawsExistPassed,
          detail: recentLawsExistPassed
            ? `${recentLawCount} laws from the last 7 days.`
            : "No laws from the last 7 days. RSS feeds may not be delivering current content.",
        },
        dataQuality: {
          passed: dataQualityPassed,
          detail: dataQualityPassed
            ? `All ${sampleLaws.length} sampled law titles are clean (no HTML artifacts).`
            : `${dirtyTitles.length} of ${sampleLaws.length} sampled titles have HTML artifacts or formatting issues.`,
          ...(dirtyTitles.length > 0 && { dirtyTitles }),
        },
        userHasV2Results: {
          passed: userHasV2ResultsPassed,
          detail: userHasV2ResultsPassed
            ? `User has ${userResults} completed V2 analyses across ${userContracts.length} contract(s). Radar can match.`
            : "No completed V2 analyses for this user. Analyze a contract first so Radar can match.",
        },
      },
      recommendations: [
        ...(totalLaws === 0 ? ["Keine Laws in DB. Fuehre zuerst /admin/test-rss-sync aus."] : []),
        ...(unprocessedLaws === 0 && totalLaws > 0 ? ["Alle Laws verarbeitet. RSS Sync noetig fuer neue Daten."] : []),
        ...(userResults === 0 ? ["Keine V2-Analysen. Analysiere erst einen Vertrag, damit der Radar matchen kann."] : []),
        ...(feedContributions.length === 0 ? ["Kein RSS-Feed hat Daten geliefert. Pruefe rssService."] : []),
        ...(totalLaws > 0 && unprocessedLaws > 0 && userResults > 0 ? ["System bereit fuer Radar-Test (/admin/test-radar)."] : []),
      ],
    });
  } catch (error) {
    console.error("[AdminTest] Status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/test-email-preview
 * Generates the Radar email HTML for a MOCK alert (doesn't actually send).
 * Returns the rendered HTML so the admin can preview the email template.
 *
 * Checks:
 *  - templateRendered: Was the email HTML generated successfully?
 *  - hasContractName: Does the email contain the contract name?
 *  - hasRecommendation: Does the email contain a recommendation?
 *  - hasDashboardLink: Does the email contain a link to the dashboard?
 */
router.post("/admin/test-email-preview", requirePremium, async (req, res) => {
  try {
    const {
      generateEmailTemplate,
      generateEventCard,
      generateStatsRow,
      generateParagraph,
      generateDivider,
    } = require("../utils/emailTemplate");

    const mockContractName = "SaaS-Vertrag CloudProvider GmbH";
    const mockLawTitle = "DSGVO-Novelle 2026: Neue Anforderungen an Auftragsverarbeitung";
    const mockImpactSummary = "Die neue DSGVO-Novelle verschaerft die Anforderungen an Auftragsverarbeitungsvertraege. Ihr SaaS-Vertrag enthaelt eine AV-Klausel, die nicht den neuen Mindestanforderungen entspricht.";
    const mockRecommendation = "AV-Klausel in Abschnitt 7 aktualisieren: Neue Loeschfristen und Unterauftragnehmer-Regelung gemaess Art. 28 Abs. 3 DSGVO-neu aufnehmen.";
    const mockSeverity = "high";

    const userName = req.user.name || req.user.firstName || "Admin";

    let body = generateParagraph(`Hallo ${userName},`);
    body += generateParagraph(
      `Legal Pulse Radar hat <strong>1 Gesetzesaenderung</strong> erkannt, die Ihre Vertraege betreffen koennte.`
    );

    body += generateStatsRow([
      { value: "1", label: "Betroffene Vertraege", color: "#ea580c" },
      { value: "1", label: "Hoch", color: "#ea580c" },
    ]);

    body += generateDivider();

    body += generateEventCard({
      title: mockLawTitle,
      subtitle: `Datenschutz / DSGVO - 1 Vertrag betroffen`,
      badge: "Pruefen",
      badgeColor: "warning",
      icon: "\u2696\ufe0f",
    });

    const sevColor = "#ea580c";
    body += `<div style="padding: 8px 16px; margin: 4px 0; border-left: 3px solid ${sevColor}; background: #f9fafb; border-radius: 0 6px 6px 0;">
      <div style="font-size: 13px; font-weight: 600; color: #111827;">${mockContractName}</div>
      <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${mockImpactSummary}</div>
      <div style="font-size: 12px; color: #1e40af; margin-top: 4px; font-style: italic;">${mockRecommendation}</div>
    </div>`;

    const html = generateEmailTemplate({
      title: "\u2696\ufe0f Legal Pulse Radar: Gesetzesaenderung erkannt",
      body,
      preheader: `1 Vertrag von Gesetzesaenderungen betroffen`,
      cta: {
        text: "Im Dashboard ansehen \u2192",
        url: "https://contract-ai.de/pulse",
      },
      unsubscribeUrl: `https://contract-ai.de/unsubscribe?type=legal_pulse`,
    });

    // ── Automated checks ──
    const templateRendered = typeof html === "string" && html.length > 100;
    const hasContractName = html.includes(mockContractName);
    const hasRecommendation = html.includes(mockRecommendation);
    const hasDashboardLink = html.includes("https://contract-ai.de/pulse");

    res.json({
      success: true,
      html,
      mockData: {
        contractName: mockContractName,
        lawTitle: mockLawTitle,
        impactSummary: mockImpactSummary,
        recommendation: mockRecommendation,
        severity: mockSeverity,
      },
      checks: {
        templateRendered: {
          passed: templateRendered,
          detail: templateRendered
            ? `Email HTML rendered successfully (${html.length} chars).`
            : "Email HTML generation failed or returned empty content.",
        },
        hasContractName: {
          passed: hasContractName,
          detail: hasContractName
            ? `Contract name "${mockContractName}" found in email body.`
            : `Contract name "${mockContractName}" NOT found in rendered email.`,
        },
        hasRecommendation: {
          passed: hasRecommendation,
          detail: hasRecommendation
            ? "Recommendation text found in email body."
            : "Recommendation text NOT found in rendered email.",
        },
        hasDashboardLink: {
          passed: hasDashboardLink,
          detail: hasDashboardLink
            ? "Dashboard link (https://contract-ai.de/pulse) found in email."
            : "Dashboard link NOT found in rendered email.",
        },
      },
      message: "Email-Preview generiert. HTML kann im Browser gerendert werden.",
    });
  } catch (error) {
    console.error("[AdminTest] Email preview error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * GET /admin/test-alerts-check
 * Validates existing alerts for this user: required fields, dedup, clauseImpacts, status tracking.
 *
 * Checks:
 *  - alertsHaveRequiredFields: Every alert has lawTitle, contractName, severity, impactSummary, recommendation
 *  - dedupWorking: No duplicate alerts (same lawId + contractId)
 *  - clauseImpactsValid: clauseImpacts have clauseId, clauseTitle, impact, suggestedChange
 *  - statusTracking: Alerts have status field (unread/read/dismissed/resolved)
 */
router.get("/admin/test-alerts-check", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;

    const allAlerts = await db.collection("pulse_v2_legal_alerts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    if (allAlerts.length === 0) {
      return res.json({
        success: true,
        alertCount: 0,
        message: "Keine Alerts fuer diesen User vorhanden. Fuehre erst /admin/test-radar aus.",
        checks: {
          alertsHaveRequiredFields: { passed: true, detail: "No alerts to check." },
          dedupWorking: { passed: true, detail: "No alerts to check." },
          clauseImpactsValid: { passed: true, detail: "No alerts to check." },
          statusTracking: { passed: true, detail: "No alerts to check." },
        },
      });
    }

    // Check 1: Required fields
    const requiredFields = ["lawTitle", "contractName", "severity", "impactSummary", "recommendation"];
    const alertsMissingFields = [];
    for (const alert of allAlerts) {
      const missing = requiredFields.filter(f => !alert[f] || (typeof alert[f] === "string" && alert[f].trim() === ""));
      if (missing.length > 0) {
        alertsMissingFields.push({
          alertId: alert._id,
          lawTitle: (alert.lawTitle || "?").substring(0, 60),
          contractName: alert.contractName || "?",
          missingFields: missing,
        });
      }
    }
    const requiredFieldsPassed = alertsMissingFields.length === 0;

    // Check 2: Dedup — no duplicate lawId+contractId combinations
    const seen = new Set();
    const duplicates = [];
    for (const alert of allAlerts) {
      const key = `${alert.lawId}__${alert.contractId}`;
      if (seen.has(key)) {
        duplicates.push({
          alertId: alert._id,
          lawId: alert.lawId,
          contractId: alert.contractId,
          lawTitle: (alert.lawTitle || "?").substring(0, 60),
          contractName: alert.contractName || "?",
        });
      }
      seen.add(key);
    }
    const dedupPassed = duplicates.length === 0;

    // Check 3: clauseImpacts validity
    const clauseImpactIssues = [];
    const clauseImpactRequiredFields = ["clauseId", "clauseTitle", "impact", "suggestedChange"];
    for (const alert of allAlerts) {
      if (alert.clauseImpacts && Array.isArray(alert.clauseImpacts)) {
        for (const ci of alert.clauseImpacts) {
          const missing = clauseImpactRequiredFields.filter(f => !ci[f] || (typeof ci[f] === "string" && ci[f].trim() === ""));
          if (missing.length > 0) {
            clauseImpactIssues.push({
              alertId: alert._id,
              contractName: alert.contractName || "?",
              clauseId: ci.clauseId || "?",
              missingFields: missing,
            });
          }
        }
      }
    }
    // Count alerts that have clauseImpacts at all
    const alertsWithClauseImpacts = allAlerts.filter(a => a.clauseImpacts && a.clauseImpacts.length > 0).length;
    const clauseImpactsPassed = clauseImpactIssues.length === 0;

    // Check 4: Status tracking
    const validStatuses = ["unread", "read", "dismissed", "resolved"];
    const alertsWithBadStatus = [];
    for (const alert of allAlerts) {
      if (!alert.status || !validStatuses.includes(alert.status)) {
        alertsWithBadStatus.push({
          alertId: alert._id,
          contractName: alert.contractName || "?",
          status: alert.status || "(missing)",
        });
      }
    }
    const statusTrackingPassed = alertsWithBadStatus.length === 0;

    // Summary stats
    const statusDistribution = {};
    for (const alert of allAlerts) {
      const s = alert.status || "(missing)";
      statusDistribution[s] = (statusDistribution[s] || 0) + 1;
    }

    const severityDistribution = {};
    for (const alert of allAlerts) {
      const s = alert.severity || "(missing)";
      severityDistribution[s] = (severityDistribution[s] || 0) + 1;
    }

    res.json({
      success: true,
      alertCount: allAlerts.length,
      statusDistribution,
      severityDistribution,
      alertsWithClauseImpacts,
      checks: {
        alertsHaveRequiredFields: {
          passed: requiredFieldsPassed,
          detail: requiredFieldsPassed
            ? `All ${allAlerts.length} alerts have required fields (lawTitle, contractName, severity, impactSummary, recommendation).`
            : `${alertsMissingFields.length} of ${allAlerts.length} alerts missing required fields.`,
          ...(alertsMissingFields.length > 0 && { alertsMissingFields: alertsMissingFields.slice(0, 10) }),
        },
        dedupWorking: {
          passed: dedupPassed,
          detail: dedupPassed
            ? `No duplicate alerts found (${allAlerts.length} alerts, ${seen.size} unique lawId+contractId combos).`
            : `${duplicates.length} duplicate alert(s) found (same lawId+contractId).`,
          ...(duplicates.length > 0 && { duplicates: duplicates.slice(0, 10) }),
        },
        clauseImpactsValid: {
          passed: clauseImpactsPassed,
          detail: clauseImpactsPassed
            ? `${alertsWithClauseImpacts} of ${allAlerts.length} alerts have clauseImpacts, all with valid structure (clauseId, clauseTitle, impact, suggestedChange).`
            : `${clauseImpactIssues.length} clauseImpact entries missing required fields.`,
          ...(clauseImpactIssues.length > 0 && { clauseImpactIssues: clauseImpactIssues.slice(0, 10) }),
        },
        statusTracking: {
          passed: statusTrackingPassed,
          detail: statusTrackingPassed
            ? `All ${allAlerts.length} alerts have valid status. Distribution: ${JSON.stringify(statusDistribution)}.`
            : `${alertsWithBadStatus.length} alert(s) have invalid/missing status. Valid: ${validStatuses.join(", ")}.`,
          ...(alertsWithBadStatus.length > 0 && { alertsWithBadStatus: alertsWithBadStatus.slice(0, 10) }),
        },
      },
      message: `Alerts-Check abgeschlossen. ${allAlerts.length} Alerts geprueft.`,
    });
  } catch (error) {
    console.error("[AdminTest] Alerts check error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * GET /admin/test-email-diagnostic
 * Checks WHY emails aren't being delivered:
 * 1. Is the user's email in the bounce list?
 * 2. Is the user unsubscribed?
 * 3. Are there entries in the email_queue for this user?
 * 4. What status do they have?
 */
router.get("/admin/test-email-diagnostic", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;
    const { ObjectId } = require("mongodb");

    // 1. Get user email
    let user;
    try {
      user = await db.collection("users").findOne(
        { $or: [{ _id: userId }, { _id: new ObjectId(userId) }] },
        { projection: { email: 1, name: 1, firstName: 1 } }
      );
    } catch {
      user = await db.collection("users").findOne(
        { _id: userId },
        { projection: { email: 1, name: 1, firstName: 1 } }
      );
    }

    const userEmail = user?.email || "NOT FOUND";

    // 2. Check bounce status
    const { isEmailActive } = require("../services/emailBounceService");
    const emailActive = user?.email ? await isEmailActive(db, user.email) : false;

    // 3. Check unsubscribe status
    const { isUnsubscribed, EMAIL_CATEGORIES } = require("../services/emailUnsubscribeService");
    const unsubAll = user?.email ? await isUnsubscribed(db, user.email, EMAIL_CATEGORIES.ALL) : false;
    const unsubCalendar = user?.email ? await isUnsubscribed(db, user.email, EMAIL_CATEGORIES.CALENDAR) : false;

    // 4. Check email queue for this user
    const queueEntries = await db.collection("email_queue")
      .find({ $or: [{ userId }, { to: user?.email }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .project({ to: 1, subject: 1, emailType: 1, status: 1, skipReason: 1, createdAt: 1, sentAt: 1, lastError: 1, nextRetryAt: 1, retryCount: 1 })
      .toArray();

    // 5. Check for radar-specific emails
    const radarEmails = queueEntries.filter(e => e.emailType === "legal_pulse_v2_radar");
    const otherEmails = queueEntries.filter(e => e.emailType !== "legal_pulse_v2_radar");

    // 6. Status breakdown
    const statusCounts = {};
    for (const e of queueEntries) {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    }

    res.json({
      success: true,
      userLookup: {
        userId,
        found: !!user,
        email: userEmail,
        name: user?.firstName || user?.name || "unknown",
      },
      emailHealth: {
        emailActive,
        unsubscribedAll: unsubAll,
        unsubscribedCalendar: unsubCalendar,
      },
      emailQueue: {
        totalForUser: queueEntries.length,
        radarEmails: radarEmails.length,
        otherEmails: otherEmails.length,
        statusBreakdown: statusCounts,
        recent: queueEntries.slice(0, 10),
      },
      checks: {
        userFound: {
          passed: !!user,
          detail: user ? `User found: ${userEmail}` : `User NOT FOUND for userId ${userId}. Emails cannot be sent.`,
        },
        emailNotBounced: {
          passed: emailActive,
          detail: emailActive ? `Email ${userEmail} is active (not bounced).` : `Email ${userEmail} is INACTIVE (bounced/blocked). Emails are being skipped!`,
        },
        notUnsubscribed: {
          passed: !unsubAll,
          detail: unsubAll ? `User has UNSUBSCRIBED from all emails. Emails are being skipped!` : `User is not unsubscribed.`,
        },
        radarEmailsQueued: {
          passed: radarEmails.length > 0,
          detail: radarEmails.length > 0
            ? `${radarEmails.length} radar email(s) found in queue. Status: ${radarEmails.map(e => e.status).join(", ")}`
            : `No radar emails in queue. storeAndNotify may not be calling queueEmail (user lookup might fail).`,
        },
        emailsDelivered: {
          passed: queueEntries.some(e => e.status === "sent"),
          detail: queueEntries.some(e => e.status === "sent")
            ? `${queueEntries.filter(e => e.status === "sent").length} email(s) successfully sent.`
            : `No emails marked as 'sent' in the queue. ${queueEntries.length > 0 ? "Emails exist but weren't delivered." : "No emails queued at all."}`,
        },
      },
      message: "Email-Diagnose abgeschlossen.",
    });
  } catch (error) {
    console.error("[AdminTest] Email diagnostic error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/test-email-reactivate
 * Reactivates a bounced email and retries skipped radar emails.
 */
router.post("/admin/test-email-reactivate", requirePremium, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = req.user.userId;
    const { ObjectId } = require("mongodb");

    // 1. Get user email
    let user;
    try {
      user = await db.collection("users").findOne(
        { $or: [{ _id: userId }, { _id: new ObjectId(userId) }] },
        { projection: { email: 1 } }
      );
    } catch {
      user = await db.collection("users").findOne({ _id: userId }, { projection: { email: 1 } });
    }

    if (!user?.email) {
      return res.json({ success: false, error: "User nicht gefunden" });
    }

    // 2. Reactivate email
    const { reactivateEmail } = require("../services/emailBounceService");
    await reactivateEmail(db, user.email);

    // 3. Reset skipped radar emails to pending
    const resetResult = await db.collection("email_queue").updateMany(
      { to: user.email, status: "skipped", emailType: "legal_pulse_v2_radar" },
      { $set: { status: "pending", nextRetryAt: new Date(), skipReason: null } }
    );

    // 4. Verify
    const { isEmailActive } = require("../services/emailBounceService");
    const nowActive = await isEmailActive(db, user.email);

    res.json({
      success: true,
      email: user.email,
      reactivated: nowActive,
      emailsReset: resetResult.modifiedCount,
      message: `Email ${user.email} reaktiviert. ${resetResult.modifiedCount} Radar-Emails zurück in die Queue gesetzt. Versand erfolgt beim nächsten Queue-Durchlauf (alle 15 Min).`,
    });
  } catch (error) {
    console.error("[AdminTest] Email reactivate error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// D1: GET /radar-email-stats — Radar email delivery statistics
// ══════════════════════════════════════════════════════════════
router.get("/radar-email-stats", async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    const pipeline = [
      { $match: { emailType: "legal_pulse_v2_radar" } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
          avgDeliveryMs: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ["$status", "sent"] }, { $ne: ["$sentAt", null] }] },
                { $subtract: ["$sentAt", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
    ];

    const [result] = await db.collection("email_queue").aggregate(pipeline).toArray();

    if (!result) {
      return res.json({ total: 0, sent: 0, failed: 0, pending: 0, skipped: 0, deliveryRate: 0 });
    }

    res.json({
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      pending: result.pending,
      skipped: result.skipped,
      deliveryRate: result.total > 0 ? Math.round((result.sent / (result.sent + result.failed)) * 100) : 0,
      avgDeliveryMs: Math.round(result.avgDeliveryMs || 0),
    });
  } catch (error) {
    console.error("[PulseV2] Radar email stats error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Email-Statistiken" });
  }
});

// ══════════════════════════════════════════════════════════════
// D3: POST /legal-alerts/:alertId/feedback — User feedback on alert quality
// ══════════════════════════════════════════════════════════════
router.post("/legal-alerts/:alertId/feedback", async (req, res) => {
  try {
    const { alertId } = req.params;
    const { useful, comment } = req.body;
    if (typeof useful !== "boolean") {
      return res.status(400).json({ error: "useful (boolean) erforderlich" });
    }

    const database = require("../config/database");
    const { ObjectId } = require("mongodb");
    const db = await database.connect();
    const userId = req.user.userId;

    const result = await db.collection("pulse_v2_legal_alerts").updateOne(
      { _id: new ObjectId(alertId), userId },
      {
        $set: {
          userFeedback: {
            useful,
            comment: (comment || "").substring(0, 500),
            feedbackAt: new Date(),
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Alert nicht gefunden" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[PulseV2] Alert feedback error:", error);
    res.status(500).json({ error: "Fehler beim Speichern des Feedbacks" });
  }
});

// ══════════════════════════════════════════════════════════════
// D4: GET /radar-health-detail — Comprehensive Radar health data
// ══════════════════════════════════════════════════════════════
router.get("/radar-health-detail", async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const rssService = require("../services/rssService");

    // Feed health
    const feedStats = rssService.getFeedStats();

    // Law coverage
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [lawStats] = await db.collection("laws").aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          newThisWeek: { $sum: { $cond: [{ $gte: ["$createdAt", oneWeekAgo] }, 1, 0] } },
          processed: { $sum: { $cond: [{ $eq: ["$pulseV2Processed", true] }, 1, 0] } },
          unprocessed: { $sum: { $cond: [{ $ne: ["$pulseV2Processed", true] }, 1, 0] } },
          withEmbedding: {
            $sum: {
              $cond: [{ $and: [{ $ne: ["$embedding", null] }, { $gt: [{ $size: { $ifNull: ["$embedding", []] } }, 0] }] }, 1, 0],
            },
          },
        },
      },
    ]).toArray();

    // Alert pipeline stats (this week)
    const [alertStats] = await db.collection("pulse_v2_legal_alerts").aggregate([
      { $match: { createdAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          bySeverity: { $push: "$severity" },
          byDirection: { $push: { $ifNull: ["$impactDirection", "negative"] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $eq: ["$status", "dismissed"] }, 1, 0] } },
          withFeedback: { $sum: { $cond: [{ $ne: ["$userFeedback", null] }, 1, 0] } },
          usefulFeedback: {
            $sum: { $cond: [{ $eq: ["$userFeedback.useful", true] }, 1, 0] },
          },
        },
      },
    ]).toArray();

    // Email delivery
    const [emailStats] = await db.collection("email_queue").aggregate([
      { $match: { emailType: "legal_pulse_v2_radar", createdAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: null,
          sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
    ]).toArray();

    // Recent radar runs
    const recentRuns = await db.collection("radar_run_history")
      .find({}).sort({ runAt: -1 }).limit(5).toArray();

    // Count severities and directions
    const severity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const s of alertStats?.bySeverity || []) {
      if (severity[s] !== undefined) severity[s]++;
    }
    const directions = { negative: 0, positive: 0, neutral: 0 };
    for (const d of alertStats?.byDirection || []) {
      if (directions[d] !== undefined) directions[d]++;
    }

    res.json({
      feeds: {
        total: feedStats.total,
        enabled: feedStats.enabled,
        disabled: feedStats.disabled,
      },
      laws: {
        total: lawStats?.total || 0,
        newThisWeek: lawStats?.newThisWeek || 0,
        processed: lawStats?.processed || 0,
        unprocessed: lawStats?.unprocessed || 0,
        withEmbedding: lawStats?.withEmbedding || 0,
      },
      alertsThisWeek: {
        total: alertStats?.total || 0,
        severity,
        directions,
        resolved: alertStats?.resolved || 0,
        dismissed: alertStats?.dismissed || 0,
        resolutionRate: alertStats?.total > 0
          ? Math.round(((alertStats?.resolved || 0) / alertStats.total) * 100) : 0,
        feedbackCount: alertStats?.withFeedback || 0,
        usefulRate: alertStats?.withFeedback > 0
          ? Math.round(((alertStats?.usefulFeedback || 0) / alertStats.withFeedback) * 100) : 0,
      },
      email: {
        sent: emailStats?.sent || 0,
        failed: emailStats?.failed || 0,
        deliveryRate: (emailStats?.sent || 0) + (emailStats?.failed || 0) > 0
          ? Math.round((emailStats.sent / (emailStats.sent + emailStats.failed)) * 100) : 100,
      },
      recentRuns: recentRuns.map((r) => ({
        runAt: r.runAt,
        lawChanges: r.lawChanges,
        contractsMatched: r.contractsMatched,
        alertsSent: r.alertsSent,
        positiveAlerts: r.positiveAlerts || 0,
        negativeAlerts: r.negativeAlerts || 0,
        durationMs: r.durationMs,
      })),
    });
  } catch (error) {
    console.error("[PulseV2] Radar health detail error:", error);
    res.status(500).json({ error: "Fehler beim Laden der Radar-Health-Daten" });
  }
});

module.exports = router;

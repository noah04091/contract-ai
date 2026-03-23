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
        },
      },
    ];

    const [result] = await db.collection("pulse_v2_legal_alerts").aggregate(pipeline).toArray();

    if (!result || result.total === 0) {
      return res.json({
        funnel: { total: 0, opened: 0, fixApplied: 0, resolved: 0, dismissed: 0 },
        rates: { openRate: 0, actionRate: 0, resolveRate: 0 },
        clauses: { affected: 0, resolved: 0, resolveRate: 0 },
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
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

    const rates = {
      openRate: Math.round((result.read / result.total) * 100),
      actionRate: Math.round((result.withFixes / result.total) * 100),
      resolveRate: Math.round((result.resolved / result.total) * 100),
    };

    const clauses = {
      affected: result.totalAffectedClauses,
      resolved: result.totalResolvedClauses,
      resolveRate:
        result.totalAffectedClauses > 0
          ? Math.round((result.totalResolvedClauses / result.totalAffectedClauses) * 100)
          : 0,
    };

    res.json({ funnel, rates, clauses, severity });
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
// Protected by verifyAdmin — only admin users can access
// TODO: Remove after successful testing
// ══════════════════════════════════════════════════════════════

const verifyAdmin = require("../middleware/verifyAdmin");

/**
 * POST /admin/test-rss-sync
 * Triggers RSS sync manually and returns detailed results.
 * Safe: only writes to shared `laws` collection (no user-specific impact).
 */
router.post("/admin/test-rss-sync", verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

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
      .limit(10)
      .project({ lawId: 1, title: 1, area: 1, source: 1, sourceUrl: 1, updatedAt: 1, pulseV2Processed: 1 })
      .toArray();

    // Get distinct areas and sources
    const areas = await db.collection("laws").distinct("area");
    const sources = await db.collection("laws").distinct("source");

    res.json({
      success: true,
      syncResult,
      database: {
        lawsBefore,
        lawsAfter,
        netNew: lawsAfter - lawsBefore,
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
      recentLaws,
      message: `RSS Sync abgeschlossen. ${syncResult.inserted || 0} neu, ${syncResult.updated || 0} aktualisiert. ${unprocessedAfter} Laws warten auf Radar-Scan.`,
    });
  } catch (error) {
    console.error("[AdminTest] RSS Sync error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * POST /admin/test-radar?dryRun=true
 * Triggers Radar for the authenticated admin user's contracts ONLY.
 * dryRun=true (default): stores alerts but does NOT send emails.
 * dryRun=false: full run including email notifications.
 */
router.post("/admin/test-radar", verifyAdmin, async (req, res) => {
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
      });
    }

    // 2. Check: are there unprocessed laws?
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
      });
    }

    // 3. Run Radar — but scoped to this user only
    // We override the radar to only match this user's contracts
    const { runPulseV2Radar } = require("../jobs/pulseV2Radar");

    // Store original queueEmail to intercept in dryRun mode
    const emailRetryService = require("../services/emailRetryService");
    const originalQueueEmail = emailRetryService.queueEmail;
    const interceptedEmails = [];

    if (dryRun) {
      // Replace queueEmail with a no-op that captures the call
      emailRetryService.queueEmail = async (emailData) => {
        interceptedEmails.push({
          to: emailData.to,
          subject: emailData.subject,
          bodyPreview: (emailData.body || emailData.html || "").substring(0, 200) + "...",
          intercepted: true,
        });
        console.log(`[AdminTest] DryRun: Email intercepted → ${emailData.to} | ${emailData.subject}`);
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
      // Pass userId to scope radar to this admin's contracts ONLY
      radarResult = await runPulseV2Radar(db, { userId });
    } finally {
      // Always restore console and queueEmail
      console.log = originalLog;
      console.warn = originalWarn;
      if (dryRun) {
        emailRetryService.queueEmail = originalQueueEmail;
      }
    }

    // 4. Get alerts created for this user
    const userAlerts = await db.collection("pulse_v2_legal_alerts")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // 5. Get the laws that were just processed (for context)
    const justProcessed = await db.collection("laws")
      .find({ pulseV2Processed: true, pulseV2ProcessedAt: { $gte: new Date(Date.now() - 60000) } })
      .sort({ pulseV2ProcessedAt: -1 })
      .limit(10)
      .project({ title: 1, area: 1, source: 1, pulseV2ProcessedAt: 1 })
      .toArray();

    res.json({
      success: true,
      dryRun,
      radarResult,
      userScope: {
        userId,
        v2ResultsCount: userResults,
        alertsForUser: userAlerts.length,
      },
      aiDecisions: radarLogs.filter(l => l.includes("AI decision")),
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
      message: dryRun
        ? `Radar-Test abgeschlossen (DRY RUN). ${radarResult.alertsSent || 0} Alerts erstellt, ${interceptedEmails.length} Emails abgefangen (NICHT gesendet).`
        : `Radar-Test abgeschlossen (LIVE). ${radarResult.alertsSent || 0} Alerts erstellt, Emails wurden versendet.`,
    });
  } catch (error) {
    console.error("[AdminTest] Radar error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack?.split("\n").slice(0, 5) });
  }
});

/**
 * GET /admin/test-status
 * Shows complete system status: Laws DB, RSS coverage, Radar state, Alerts, Cron health.
 */
router.get("/admin/test-status", verifyAdmin, async (req, res) => {
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

    // RSS feed health check (which feeds have contributed data?)
    const feedContributions = await db.collection("laws").aggregate([
      { $group: { _id: "$source", count: { $sum: 1 }, lastEntry: { $max: "$updatedAt" } } },
      { $sort: { count: -1 } },
    ]).toArray();

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
        lawsExist: totalLaws > 0,
        unprocessedExist: unprocessedLaws > 0,
        userHasResults: userResults > 0,
        rssFeedsContribute: feedContributions.length > 0,
        cronJobsRan: cronLogs.length > 0,
      },
      recommendations: [
        ...(totalLaws === 0 ? ["⚠️ Keine Laws in DB. Führe zuerst /admin/test-rss-sync aus."] : []),
        ...(unprocessedLaws === 0 && totalLaws > 0 ? ["ℹ️ Alle Laws verarbeitet. RSS Sync nötig für neue Daten."] : []),
        ...(userResults === 0 ? ["⚠️ Keine V2-Analysen. Analysiere erst einen Vertrag, damit der Radar matchen kann."] : []),
        ...(feedContributions.length === 0 ? ["⚠️ Kein RSS-Feed hat Daten geliefert. Prüfe rssService."] : []),
        ...(totalLaws > 0 && unprocessedLaws > 0 && userResults > 0 ? ["✅ System bereit für Radar-Test (/admin/test-radar)."] : []),
      ],
    });
  } catch (error) {
    console.error("[AdminTest] Status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

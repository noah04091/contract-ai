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

// Rate limiting: 5 analyses per hour per user
const analyzeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: "Rate limit erreicht. Maximal 5 Analysen pro Stunde.",
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
      contractType: r.document?.contractType,
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
        contractType: c.contractType || c.type || null,
        provider: c.provider || c.partner || c.company || null,
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

module.exports = router;

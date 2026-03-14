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

module.exports = router;

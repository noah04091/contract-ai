// 📁 backend/routes/legalPulse.js (New Route for Manual Analysis)
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const rateLimit = require("express-rate-limit"); // 🚦 Rate Limiting
const verifyToken = require("../middleware/verifyToken");
const requirePremium = require("../middleware/requirePremium"); // 🔐 Premium-Check
const runLegalPulseScan = require("../services/legalPulseScan");
const { validateLegalPulseBody, sanitizeString } = require("../middleware/validateLegalPulseInput"); // 🛡️ Input Validation

// 🚦 RATE LIMITING für Legal Pulse - AI-Scans sind teuer!
const legalPulseRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde Zeitfenster
  max: 5, // Maximal 5 Legal Pulse Scans pro Stunde
  message: {
    success: false,
    message: "Zu viele Legal Pulse Analysen. Bitte warten Sie eine Stunde.",
    error: "RATE_LIMIT_EXCEEDED",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Zu viele Legal Pulse Analysen. Bitte warten Sie eine Stunde.",
      error: "RATE_LIMIT_EXCEEDED",
      retryAfter: "1 hour",
      currentLimit: "5 AI-Scans / Stunde",
      tip: "Legal Pulse nutzt fortschrittliche KI und ist daher limitiert"
    });
  }
});

// Manuelle Analyse für einzelnen Vertrag
// 🔐 Nur Premium-User dürfen Legal Pulse nutzen
// 🚦 Rate Limiting: Max 5 Scans pro Stunde
router.post("/analyze/:contractId", verifyToken, requirePremium, legalPulseRateLimiter, async (req, res) => {
  try {
    const { contractId } = req.params;
    
    // Validierung der ObjectId
    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Ungültige Contract-ID" 
      });
    }
    
    // Einzelanalyse durchführen
    const result = await runLegalPulseScan.scanSingle(contractId);
    
    res.json({
      success: true,
      message: "AI-Analyse erfolgreich durchgeführt",
      legalPulse: result
    });
    
  } catch (error) {
    console.error("❌ Fehler bei manueller AI-Analyse:", error);
    res.status(500).json({
      success: false,
      message: "Fehler bei der AI-Analyse",
      error: error.message
    });
  }
});

// Batch-Scan für alle Verträge eines Users
// 🔐 Nur Premium-User dürfen Legal Pulse nutzen
// 🚦 Rate Limiting: Max 5 Scans pro Stunde
router.post("/scan-all", verifyToken, requirePremium, legalPulseRateLimiter, async (req, res) => {
  try {
    // Full scan durchführen
    await runLegalPulseScan();
    
    res.json({
      success: true,
      message: "Vollständiger AI-Scan erfolgreich durchgeführt"
    });
    
  } catch (error) {
    console.error("❌ Fehler bei vollständigem AI-Scan:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim AI-Scan",
      error: error.message
    });
  }
});

// Get Scan Statistics
router.get("/stats", verifyToken, async (req, res) => {
  try {
    // MongoDB connection (reuse from main app)
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    
    const scanStatsCollection = client.db("contract_ai").collection("scan_stats");
    
    // Letzte 10 Scans
    const recentScans = await scanStatsCollection
      .find({ scanType: 'legal_pulse_ai' })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    // Gesamtstatistiken
    const totalScans = await scanStatsCollection.countDocuments({ scanType: 'legal_pulse_ai' });
    const totalContracts = await scanStatsCollection.aggregate([
      { $match: { scanType: 'legal_pulse_ai' } },
      { $group: { _id: null, total: { $sum: '$contractsProcessed' } } }
    ]).toArray();
    
    await client.close();
    
    res.json({
      success: true,
      stats: {
        totalScans,
        totalContractsProcessed: totalContracts[0]?.total || 0,
        recentScans: recentScans.map(scan => ({
          timestamp: scan.timestamp,
          contractsProcessed: scan.contractsProcessed,
          successCount: scan.successCount,
          errorCount: scan.errorCount,
          aiPowered: scan.aiPowered
        }))
      }
    });
    
  } catch (error) {
    console.error("❌ Fehler beim Laden der Scan-Statistiken:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Statistiken",
      error: error.message
    });
  }
});

// ===== 🎛️ USER SETTINGS API =====

// Get user's Legal Pulse settings
router.get("/settings", verifyToken, async (req, res) => {
  try {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const usersCollection = client.db("contract_ai").collection("users");
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { legalPulseSettings: 1 } }
    );

    await client.close();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Default settings if not set
    const defaultSettings = {
      enabled: true,
      similarityThreshold: 0.70, // 70% default
      digestMode: 'weekly', // Always weekly to reduce costs
      categories: [
        'Arbeitsrecht',
        'Mietrecht',
        'Kaufrecht',
        'Vertragsrecht',
        'Datenschutz',
        'Verbraucherrecht'
      ],
      emailNotifications: true
    };

    const settings = user.legalPulseSettings || defaultSettings;

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error("❌ Fehler beim Laden der Legal Pulse Settings:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Einstellungen",
      error: error.message
    });
  }
});

// Update user's Legal Pulse settings
// 🛡️ Input Validation Middleware für sicheren Body
router.put("/settings", verifyToken, validateLegalPulseBody, async (req, res) => {
  try {
    const { enabled, similarityThreshold, categories, digestMode, emailNotifications } = req.body;

    // Validation
    const updates = {};

    if (typeof enabled === 'boolean') {
      updates['legalPulseSettings.enabled'] = enabled;
    }

    if (similarityThreshold !== undefined) {
      const threshold = parseFloat(similarityThreshold);
      if (isNaN(threshold) || threshold < 0.5 || threshold > 0.95) {
        return res.status(400).json({
          success: false,
          message: "Similarity threshold muss zwischen 0.5 und 0.95 liegen"
        });
      }
      updates['legalPulseSettings.similarityThreshold'] = threshold;
    }

    if (Array.isArray(categories)) {
      // Validate categories
      const validCategories = [
        'Arbeitsrecht',
        'Mietrecht',
        'Kaufrecht',
        'Vertragsrecht',
        'Datenschutz',
        'Verbraucherrecht',
        'Steuerrecht',
        'Gesellschaftsrecht',
        'Insolvenzrecht',
        'Handelsrecht'
      ];

      const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Ungültige Kategorien: ${invalidCategories.join(', ')}`,
          validCategories
        });
      }

      updates['legalPulseSettings.categories'] = categories;
    }

    // Force weekly digest mode to reduce costs (ignore instant/daily)
    if (digestMode) {
      updates['legalPulseSettings.digestMode'] = 'weekly';
    }

    if (typeof emailNotifications === 'boolean') {
      updates['legalPulseSettings.emailNotifications'] = emailNotifications;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine gültigen Updates bereitgestellt"
      });
    }

    // Update user settings
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const usersCollection = client.db("contract_ai").collection("users");
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    res.json({
      success: true,
      message: "Einstellungen erfolgreich aktualisiert",
      updates
    });

  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren der Legal Pulse Settings:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren der Einstellungen",
      error: error.message
    });
  }
});

// Get available legal categories
router.get("/categories", verifyToken, async (req, res) => {
  try {
    const categories = [
      {
        id: 'Arbeitsrecht',
        name: 'Arbeitsrecht',
        description: 'Kündigungsfristen, Arbeitsverträge, Urlaubsansprüche'
      },
      {
        id: 'Mietrecht',
        name: 'Mietrecht',
        description: 'Mietverträge, Kündigungsfristen, Nebenkostenabrechnung'
      },
      {
        id: 'Kaufrecht',
        name: 'Kaufrecht',
        description: 'Kaufverträge, Gewährleistung, Rücktrittsrechte'
      },
      {
        id: 'Vertragsrecht',
        name: 'Vertragsrecht',
        description: 'Allgemeines Vertragsrecht, AGB, Vertragsschluss'
      },
      {
        id: 'Datenschutz',
        name: 'Datenschutz',
        description: 'DSGVO, Datenschutzerklärungen, Einwilligungen'
      },
      {
        id: 'Verbraucherrecht',
        name: 'Verbraucherrecht',
        description: 'Widerrufsrechte, Fernabsatzverträge, Verbraucherschutz'
      },
      {
        id: 'Steuerrecht',
        name: 'Steuerrecht',
        description: 'Steuerpflichten, Abgabenordnung, Steuererklärungen'
      },
      {
        id: 'Gesellschaftsrecht',
        name: 'Gesellschaftsrecht',
        description: 'GmbH, AG, Gesellschaftsverträge'
      },
      {
        id: 'Insolvenzrecht',
        name: 'Insolvenzrecht',
        description: 'Insolvenzverfahren, Gläubigerrechte'
      },
      {
        id: 'Handelsrecht',
        name: 'Handelsrecht',
        description: 'Handelsgeschäfte, Handelsregister, Handelsbräuche'
      }
    ];

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error("❌ Fehler beim Laden der Kategorien:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Kategorien",
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📊 AUDIT REPORT - PDF Export
// ═══════════════════════════════════════════════════════════════

router.get("/report/:contractId", verifyToken, requirePremium, async (req, res) => {
  try {
    const contractId = req.params.contractId;

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ success: false, message: "Ungültige Vertrags-ID" });
    }

    // Load contract
    const database = require("../config/database");
    const db = await database.connect();
    const contract = await db.collection("contracts").findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: "Vertrag nicht gefunden" });
    }

    if (!contract.legalPulse) {
      return res.status(400).json({ success: false, message: "Keine Legal Pulse Analyse vorhanden" });
    }

    // Generate PDF
    const { generateLegalPulseReport } = require("../services/legalPulseReportGenerator");
    const pdfBuffer = await generateLegalPulseReport(contract);

    // Send PDF
    const safeName = (contract.name || 'Vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_\s]/g, '').substring(0, 50);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Legal-Pulse-Report-${safeName}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("[LEGAL-PULSE:REPORT] Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Erstellen des Reports",
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🏥 HEALTH CHECK ENDPOINT (V5)
// ═══════════════════════════════════════════════════════════════

router.get("/health", verifyToken, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    // Last successful monitoring run
    const lastHealth = await db.collection("monitoring_health").findOne(
      { service: 'legal_pulse', lastRunStatus: 'success' },
      { sort: { lastRunAt: -1 } }
    );

    // Last run (any status)
    const lastRun = await db.collection("monitoring_health").findOne(
      { service: 'legal_pulse' },
      { sort: { lastRunAt: -1 } }
    );

    // Feed health stats
    let feedStats = { active: 0, errored: 0, totalItems: 0 };
    try {
      const rssService = require("../services/rssService");
      const healthReport = rssService.getFeedHealthReport();
      feedStats = {
        active: healthReport.filter(f => f.enabled && f.consecutiveFailures < 10).length,
        errored: healthReport.filter(f => f.consecutiveFailures >= 3).length,
        totalFeeds: healthReport.length,
        feeds: healthReport.map(f => ({
          name: f.name,
          enabled: f.enabled,
          failures: f.consecutiveFailures,
          lastSuccess: f.lastSuccessfulFetch,
          lastError: f.lastError
        }))
      };
    } catch (e) {
      feedStats.error = e.message;
    }

    // Vector store stats
    const contractChunks = await db.collection("vector_contracts").countDocuments();
    const lawSections = await db.collection("vector_laws").countDocuments();
    const indexedContracts = await db.collection("contracts").countDocuments({
      lastIndexedAt: { $exists: true, $ne: null }
    });
    const totalContracts = await db.collection("contracts").countDocuments({});

    // Digest queue stats
    const pendingDigests = await db.collection("digest_queue").countDocuments({ sent: false });

    // Stale detection
    const hoursAgo = lastHealth
      ? (Date.now() - new Date(lastHealth.lastRunAt).getTime()) / (1000 * 60 * 60)
      : null;

    const status = !lastHealth ? 'unknown'
      : hoursAgo <= 24 ? 'healthy'
      : hoursAgo <= 48 ? 'warning'
      : 'critical';

    res.json({
      success: true,
      health: {
        status,
        lastSuccessfulRun: lastHealth?.lastRunAt || null,
        lastRunStatus: lastRun?.lastRunStatus || null,
        lastRunError: lastRun?.lastRunStatus === 'error' ? lastRun.error : null,
        hoursAgo: hoursAgo ? parseFloat(hoursAgo.toFixed(1)) : null,
        nextExpectedRun: lastHealth?.nextExpectedRun || null,
        feeds: feedStats,
        vectorStore: {
          contractChunks,
          lawSections,
          indexedContracts,
          totalContracts,
          indexCoverage: totalContracts > 0
            ? parseFloat(((indexedContracts / totalContracts) * 100).toFixed(1))
            : 0
        },
        pendingDigests,
        lastStats: lastHealth ? {
          lawChangesProcessed: lastHealth.lawChangesProcessed,
          contractsChecked: lastHealth.contractsChecked,
          alertsSent: lastHealth.alertsSent,
          duration: lastHealth.duration
        } : null
      }
    });

  } catch (error) {
    console.error("❌ [HEALTH] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden des Health-Status",
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📜 ALERT HISTORY ENDPOINT (V7)
// ═══════════════════════════════════════════════════════════════

router.get("/alerts", verifyToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const severity = req.query.severity; // optional filter
    const unreadOnly = req.query.unread === 'true';

    const database = require("../config/database");
    const db = await database.connect();
    const notificationsCollection = db.collection("pulse_notifications");

    // Build query
    const query = { userId: req.user.userId };
    if (severity) {
      query.severity = severity;
    }
    if (unreadOnly) {
      query.readAt = { $exists: false };
    }

    // Get total count
    const total = await notificationsCollection.countDocuments(query);

    // Get paginated alerts
    const alerts = await notificationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Also get unread count
    const unreadCount = await notificationsCollection.countDocuments({
      userId: req.user.userId,
      readAt: { $exists: false }
    });

    res.json({
      success: true,
      alerts: alerts.map(a => ({
        _id: a._id,
        contractId: a.contractId,
        contractName: a.contractName,
        lawTitle: a.lawTitle,
        lawArea: a.lawArea,
        score: a.score,
        severity: a.severity,
        explanation: a.explanation,
        read: !!a.readAt,
        createdAt: a.createdAt
      })),
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total
      },
      unreadCount
    });

  } catch (error) {
    console.error("❌ [ALERTS] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Alert-Historie",
      error: error.message
    });
  }
});

// Mark alerts as read
router.put("/alerts/read", verifyToken, async (req, res) => {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "alertIds Array erforderlich"
      });
    }

    const database = require("../config/database");
    const db = await database.connect();

    const result = await db.collection("pulse_notifications").updateMany(
      {
        _id: { $in: alertIds.map(id => new ObjectId(id)) },
        userId: req.user.userId
      },
      { $set: { readAt: new Date() } }
    );

    res.json({
      success: true,
      markedAsRead: result.modifiedCount
    });

  } catch (error) {
    console.error("❌ [ALERTS] Mark read error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Markieren als gelesen",
      error: error.message
    });
  }
});

// ============================================================
// WEEKLY LEGAL CHECK ENDPOINTS
// ============================================================

/**
 * GET /weekly-checks - All weekly checks for the user (last 4 weeks)
 */
router.get("/weekly-checks", verifyToken, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const userId = new ObjectId(req.user.userId);
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    const checks = await db.collection("weekly_legal_checks")
      .find({
        userId,
        checkDate: { $gte: fourWeeksAgo }
      })
      .sort({ checkDate: -1 })
      .toArray();

    // Group by contract for easier frontend consumption
    const byContract = {};
    for (const check of checks) {
      const contractId = check.contractId.toString();
      if (!byContract[contractId]) {
        byContract[contractId] = {
          contractId,
          contractName: check.contractName,
          latestCheck: check,
          history: []
        };
      }
      byContract[contractId].history.push({
        checkDate: check.checkDate,
        overallStatus: check.stage2Results?.overallStatus || 'aktuell',
        findingsCount: check.stage2Results?.findings?.length || 0,
        summary: check.stage2Results?.summary || ''
      });
    }

    res.json({
      success: true,
      contracts: Object.values(byContract),
      totalChecks: checks.length,
      period: { from: fourWeeksAgo, to: new Date() }
    });
  } catch (error) {
    console.error("❌ Weekly checks fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Wöchentlichen Rechtschecks",
      error: error.message
    });
  }
});

/**
 * GET /weekly-check/:contractId - Latest weekly check for a specific contract
 */
router.get("/weekly-check/:contractId", verifyToken, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();
    const { contractId } = req.params;

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ success: false, message: "Ungültige Contract-ID" });
    }

    // Verify contract belongs to this user (defense-in-depth)
    const contract = await db.collection("contracts").findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: "Vertrag nicht gefunden" });
    }

    const check = await db.collection("weekly_legal_checks")
      .findOne(
        {
          userId: new ObjectId(req.user.userId),
          contractId: new ObjectId(contractId)
        },
        { sort: { checkDate: -1 } }
      );

    if (!check) {
      return res.json({
        success: true,
        check: null,
        message: "Noch kein Rechtscheck für diesen Vertrag durchgeführt"
      });
    }

    res.json({ success: true, check });
  } catch (error) {
    console.error("❌ Weekly check fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden des Rechtschecks",
      error: error.message
    });
  }
});

/**
 * POST /weekly-check/trigger - Manually trigger weekly check (admin/test)
 */
router.post("/weekly-check/trigger", verifyToken, requirePremium, legalPulseRateLimiter, async (req, res) => {
  try {
    const WeeklyLegalCheck = require('../jobs/weeklyLegalCheck');
    const weeklyCheck = new WeeklyLegalCheck();
    await weeklyCheck.init();

    // Only check this user's contracts
    const database = require("../config/database");
    const db = await database.connect();
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "User nicht gefunden" });
    }

    const result = await weeklyCheck.checkUserContracts(user);
    await weeklyCheck.close();

    res.json({
      success: true,
      message: "Wöchentlicher Rechtscheck abgeschlossen",
      result
    });
  } catch (error) {
    console.error("❌ Manual weekly check error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim manuellen Rechtscheck",
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🎯 RISK MANAGEMENT - Resolve, Comment, Edit Individual Risks
// ═══════════════════════════════════════════════════════════════

/**
 * Recalculate adjusted scores based on resolved/accepted risks.
 * - Each risk has a severity weight: critical=4, high=3, medium=2, low=1
 * - Resolved risks reduce the score proportionally
 * - Max 70% reduction (structural contract risk remains)
 */
function recalculateAdjustedScores(legalPulse) {
  const risks = legalPulse.topRisks || [];
  const recommendations = legalPulse.recommendations || [];
  const originalRiskScore = legalPulse.riskScore;
  const originalHealthScore = legalPulse.healthScore;

  if (originalRiskScore == null) {
    return { adjustedRiskScore: originalRiskScore, adjustedHealthScore: originalHealthScore };
  }

  // === Risk reduction calculation ===
  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };

  let totalRiskWeight = 0;
  let resolvedRiskWeight = 0;

  for (const risk of risks) {
    const effectiveSeverity = risk.userEdits?.severity || risk.severity || 'medium';
    const weight = severityWeight[effectiveSeverity] || 2;
    totalRiskWeight += weight;
    if (risk.status === 'resolved' || risk.status === 'accepted') {
      resolvedRiskWeight += weight;
    }
  }

  // Risk reduction ratio capped at 70%
  let riskReductionRatio = 0;
  if (totalRiskWeight > 0) {
    riskReductionRatio = Math.min(resolvedRiskWeight / totalRiskWeight, 0.7);
  }

  // === Recommendation bonus calculation ===
  // Completed recommendations give a small bonus to health score
  // Each completed recommendation adds 2-3 points (depending on priority)
  const priorityBonus = { critical: 3, high: 2.5, medium: 2, low: 1.5 };
  let recommendationBonus = 0;

  for (const rec of recommendations) {
    if (rec.status === 'completed') {
      const effectivePriority = rec.userEdits?.priority || rec.priority || 'medium';
      recommendationBonus += priorityBonus[effectivePriority] || 2;
    }
  }
  // Cap recommendation bonus at 15 points max
  recommendationBonus = Math.min(recommendationBonus, 15);

  // === Calculate final adjusted scores ===
  const adjustedRiskScore = Math.round(originalRiskScore * (1 - riskReductionRatio));

  // If healthScore is missing, derive it from riskScore
  const effectiveHealthScore = originalHealthScore != null
    ? originalHealthScore
    : Math.max(0, Math.round(100 - (originalRiskScore * 0.5)));

  // Health score: improve from risk resolution + recommendation bonus
  const healthFromRisks = effectiveHealthScore + (100 - effectiveHealthScore) * riskReductionRatio;
  const adjustedHealthScore = Math.min(100, Math.round(healthFromRisks + recommendationBonus));

  return { adjustedRiskScore, adjustedHealthScore };
}

/**
 * PATCH /api/legal-pulse/:contractId/risks/:riskIndex
 * Update a specific risk's status, comment, or user edits.
 */
router.patch("/:contractId/risks/:riskIndex", verifyToken, requirePremium, async (req, res) => {
  try {
    const { contractId, riskIndex } = req.params;
    const idx = parseInt(riskIndex, 10);

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ success: false, message: "Ungültige Contract-ID" });
    }
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: "Ungültiger Risiko-Index" });
    }

    const { status, userComment, userEdits } = req.body;

    // Validate status
    const validStatuses = ['open', 'resolved', 'accepted'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Ungültiger Status. Erlaubt: open, resolved, accepted" });
    }

    // Validate userEdits.severity
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    if (userEdits?.severity && !validSeverities.includes(userEdits.severity)) {
      return res.status(400).json({ success: false, message: "Ungültiger Schweregrad" });
    }

    // Sanitize userComment
    const sanitizedComment = userComment != null
      ? String(userComment).substring(0, 1000).trim()
      : undefined;

    // Sanitize userEdits
    const sanitizedEdits = userEdits ? {} : undefined;
    if (userEdits) {
      if (userEdits.title) sanitizedEdits.title = String(userEdits.title).substring(0, 200).trim();
      if (userEdits.description) sanitizedEdits.description = String(userEdits.description).substring(0, 2000).trim();
      if (userEdits.severity) sanitizedEdits.severity = userEdits.severity;
    }

    const database = require("../config/database");
    const db = await database.connect();

    // Load contract and verify ownership
    const contract = await db.collection("contracts").findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: "Vertrag nicht gefunden" });
    }

    if (!contract.legalPulse?.topRisks || idx >= contract.legalPulse.topRisks.length) {
      return res.status(400).json({ success: false, message: "Risiko-Index außerhalb des Bereichs" });
    }

    // Build update fields
    const updateFields = {};

    if (status !== undefined) {
      updateFields[`legalPulse.topRisks.${idx}.status`] = status;
      if (status === 'resolved' || status === 'accepted') {
        updateFields[`legalPulse.topRisks.${idx}.resolvedAt`] = new Date().toISOString();
      } else {
        updateFields[`legalPulse.topRisks.${idx}.resolvedAt`] = null;
      }
    }

    if (sanitizedComment !== undefined) {
      updateFields[`legalPulse.topRisks.${idx}.userComment`] = sanitizedComment;
    }

    if (sanitizedEdits) {
      if (sanitizedEdits.title) updateFields[`legalPulse.topRisks.${idx}.userEdits.title`] = sanitizedEdits.title;
      if (sanitizedEdits.description) updateFields[`legalPulse.topRisks.${idx}.userEdits.description`] = sanitizedEdits.description;
      if (sanitizedEdits.severity) updateFields[`legalPulse.topRisks.${idx}.userEdits.severity`] = sanitizedEdits.severity;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: "Keine Änderungen angegeben" });
    }

    // Apply risk-level updates first
    await db.collection("contracts").updateOne(
      { _id: new ObjectId(contractId) },
      { $set: updateFields }
    );

    // Reload to recalculate scores
    const updatedContract = await db.collection("contracts").findOne({ _id: new ObjectId(contractId) });
    const { adjustedRiskScore, adjustedHealthScore } = recalculateAdjustedScores(updatedContract.legalPulse);

    // Save adjusted scores and append to scoreHistory
    await db.collection("contracts").updateOne(
      { _id: new ObjectId(contractId) },
      {
        $set: {
          'legalPulse.adjustedRiskScore': adjustedRiskScore,
          'legalPulse.adjustedHealthScore': adjustedHealthScore
        },
        $push: {
          'legalPulse.scoreHistory': { date: new Date(), score: adjustedRiskScore }
        }
      }
    );

    // Return updated risk + scores
    const finalContract = await db.collection("contracts").findOne({ _id: new ObjectId(contractId) });
    const updatedRisk = finalContract.legalPulse.topRisks[idx];

    res.json({
      success: true,
      message: "Risiko erfolgreich aktualisiert",
      risk: updatedRisk,
      riskIndex: idx,
      adjustedRiskScore,
      adjustedHealthScore,
      originalRiskScore: finalContract.legalPulse.riskScore,
      originalHealthScore: finalContract.legalPulse.healthScore
    });

  } catch (error) {
    console.error("❌ [RISK-MGMT] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren des Risikos",
      error: error.message
    });
  }
});

/**
 * PATCH /api/legal-pulse/:contractId/recommendations/:recIndex
 * Update a specific recommendation's status, comment, or user edits.
 */
router.patch("/:contractId/recommendations/:recIndex", verifyToken, requirePremium, async (req, res) => {
  try {
    const { contractId, recIndex } = req.params;
    const idx = parseInt(recIndex, 10);

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ success: false, message: "Ungültige Contract-ID" });
    }
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: "Ungültiger Empfehlungs-Index" });
    }

    const { status, userComment, userEdits } = req.body;

    // Validate status
    const validStatuses = ['pending', 'completed', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Ungültiger Status. Erlaubt: pending, completed, dismissed" });
    }

    // Validate userEdits.priority
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (userEdits?.priority && !validPriorities.includes(userEdits.priority)) {
      return res.status(400).json({ success: false, message: "Ungültige Priorität" });
    }

    // Sanitize userComment
    const sanitizedComment = userComment != null
      ? String(userComment).substring(0, 1000).trim()
      : undefined;

    // Sanitize userEdits
    const sanitizedEdits = userEdits ? {} : undefined;
    if (userEdits) {
      if (userEdits.title) sanitizedEdits.title = String(userEdits.title).substring(0, 200).trim();
      if (userEdits.description) sanitizedEdits.description = String(userEdits.description).substring(0, 2000).trim();
      if (userEdits.priority) sanitizedEdits.priority = userEdits.priority;
    }

    const database = require("../config/database");
    const db = await database.connect();

    // Load contract and verify ownership
    const contract = await db.collection("contracts").findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: "Vertrag nicht gefunden" });
    }

    if (!contract.legalPulse?.recommendations || idx >= contract.legalPulse.recommendations.length) {
      return res.status(400).json({ success: false, message: "Empfehlungs-Index außerhalb des Bereichs" });
    }

    // Build update fields
    const updateFields = {};

    if (status !== undefined) {
      updateFields[`legalPulse.recommendations.${idx}.status`] = status;
      if (status === 'completed') {
        updateFields[`legalPulse.recommendations.${idx}.completedAt`] = new Date().toISOString();
      } else {
        updateFields[`legalPulse.recommendations.${idx}.completedAt`] = null;
      }
    }

    if (sanitizedComment !== undefined) {
      updateFields[`legalPulse.recommendations.${idx}.userComment`] = sanitizedComment;
    }

    if (sanitizedEdits) {
      if (sanitizedEdits.title) updateFields[`legalPulse.recommendations.${idx}.userEdits.title`] = sanitizedEdits.title;
      if (sanitizedEdits.description) updateFields[`legalPulse.recommendations.${idx}.userEdits.description`] = sanitizedEdits.description;
      if (sanitizedEdits.priority) updateFields[`legalPulse.recommendations.${idx}.userEdits.priority`] = sanitizedEdits.priority;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: "Keine Änderungen angegeben" });
    }

    // Apply recommendation-level updates first
    await db.collection("contracts").updateOne(
      { _id: new ObjectId(contractId) },
      { $set: updateFields }
    );

    // Reload to recalculate scores
    const updatedContract = await db.collection("contracts").findOne({ _id: new ObjectId(contractId) });
    const { adjustedRiskScore, adjustedHealthScore } = recalculateAdjustedScores(updatedContract.legalPulse);

    // Save adjusted scores and append to scoreHistory
    await db.collection("contracts").updateOne(
      { _id: new ObjectId(contractId) },
      {
        $set: {
          'legalPulse.adjustedRiskScore': adjustedRiskScore,
          'legalPulse.adjustedHealthScore': adjustedHealthScore
        },
        $push: {
          'legalPulse.scoreHistory': { date: new Date(), score: adjustedRiskScore }
        }
      }
    );

    // Return updated recommendation + scores
    const finalContract = await db.collection("contracts").findOne({ _id: new ObjectId(contractId) });
    const updatedRecommendation = finalContract.legalPulse.recommendations[idx];

    res.json({
      success: true,
      message: "Empfehlung erfolgreich aktualisiert",
      recommendation: updatedRecommendation,
      recIndex: idx,
      adjustedRiskScore,
      adjustedHealthScore,
      originalRiskScore: finalContract.legalPulse.riskScore,
      originalHealthScore: finalContract.legalPulse.healthScore
    });

  } catch (error) {
    console.error("❌ [RECOMMENDATION-MGMT] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren der Empfehlung",
      error: error.message
    });
  }
});

// ============================================================
// ADMIN: WEEKLY LEGAL CHECK MONITORING
// ============================================================

const verifyAdmin = require("../middleware/verifyAdmin");

/**
 * GET /admin/weekly-check-stats - Admin-only: Weekly Legal Check health & stats
 */
router.get("/admin/weekly-check-stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    // Get last 10 health records for Weekly Legal Check
    const healthRecords = await db.collection("monitoring_health")
      .find({ service: 'weekly_legal_check' })
      .sort({ lastRunAt: -1 })
      .limit(10)
      .toArray();

    // Get last successful run
    const lastSuccess = await db.collection("monitoring_health").findOne(
      { service: 'weekly_legal_check', lastRunStatus: 'success' },
      { sort: { lastRunAt: -1 } }
    );

    // Get last failed run (if any)
    const lastError = await db.collection("monitoring_health").findOne(
      { service: 'weekly_legal_check', lastRunStatus: 'error' },
      { sort: { lastRunAt: -1 } }
    );

    // Get weekly checks from last 4 weeks with aggregated stats
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    const weeklyCheckStats = await db.collection("weekly_legal_checks").aggregate([
      { $match: { checkDate: { $gte: fourWeeksAgo } } },
      {
        $group: {
          _id: null,
          totalChecks: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" },
          uniqueContracts: { $addToSet: "$contractId" },
          totalFindings: { $sum: { $size: { $ifNull: ["$stage2Results.findings", []] } } },
          criticalFindings: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$stage2Results.findings", []] },
                  as: "f",
                  cond: { $eq: ["$$f.severity", "critical"] }
                }
              }
            }
          },
          warningFindings: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$stage2Results.findings", []] },
                  as: "f",
                  cond: { $eq: ["$$f.severity", "warning"] }
                }
              }
            }
          },
          totalCost: { $sum: { $ifNull: ["$costEstimate.estimatedCost", 0] } }
        }
      }
    ]).toArray();

    const stats = weeklyCheckStats[0] || {
      totalChecks: 0,
      uniqueUsers: [],
      uniqueContracts: [],
      totalFindings: 0,
      criticalFindings: 0,
      warningFindings: 0,
      totalCost: 0
    };

    // Get digest queue alerts (notifications sent)
    const alertsSent = await db.collection("digest_queue").countDocuments({
      type: 'weekly_legal_check',
      queuedAt: { $gte: fourWeeksAgo }
    });

    // Calculate next scheduled run (Sunday 02:00 UTC)
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(2, 0, 0, 0);
    if (nextSunday <= now) {
      nextSunday.setDate(nextSunday.getDate() + 7);
    }

    res.json({
      success: true,
      weeklyCheck: {
        // Health status
        isHealthy: lastSuccess && (!lastError || lastSuccess.lastRunAt > lastError?.lastRunAt),
        lastRun: lastSuccess?.lastRunAt || null,
        lastRunStatus: healthRecords[0]?.lastRunStatus || 'unknown',
        lastError: lastError ? {
          at: lastError.lastRunAt,
          message: lastError.error
        } : null,
        nextScheduledRun: nextSunday,
        cronExpression: process.env.WEEKLY_CHECK_CRON_EXPR || '0 2 * * 0',
        cronEnabled: process.env.LEGAL_PULSE_CRON_ENABLED === 'true',

        // Last 4 weeks stats
        stats: {
          period: { from: fourWeeksAgo, to: new Date() },
          totalChecks: stats.totalChecks,
          uniqueUsers: stats.uniqueUsers?.length || 0,
          uniqueContracts: stats.uniqueContracts?.length || 0,
          totalFindings: stats.totalFindings,
          criticalFindings: stats.criticalFindings,
          warningFindings: stats.warningFindings,
          alertsSent,
          estimatedCost: stats.totalCost?.toFixed(4) || '0.0000'
        },

        // Recent health history
        healthHistory: healthRecords.map(r => ({
          runAt: r.lastRunAt,
          status: r.lastRunStatus,
          usersChecked: r.usersChecked || 0,
          contractsChecked: r.contractsChecked || 0,
          findingsCount: r.findingsCount || 0,
          duration: r.duration || 0,
          cost: r.estimatedCost?.toFixed(4) || '0.0000',
          error: r.error || null
        }))
      }
    });

  } catch (error) {
    console.error("❌ [ADMIN] Weekly Check Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Weekly Check Stats",
      error: error.message
    });
  }
});

/**
 * POST /admin/weekly-check-trigger - Admin-only: Manually trigger weekly check
 */
router.post("/admin/weekly-check-trigger", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const WeeklyLegalCheck = require('../jobs/weeklyLegalCheck');
    const weeklyCheck = new WeeklyLegalCheck();

    // Start async - don't wait for completion
    res.json({
      success: true,
      message: "Weekly Legal Check wurde gestartet. Überprüfen Sie die Logs für den Fortschritt."
    });

    // Run in background
    (async () => {
      try {
        await weeklyCheck.init();
        await weeklyCheck.runWeeklyCheck();
        await weeklyCheck.close();
        console.log("✅ [ADMIN] Manual weekly check completed");
      } catch (error) {
        console.error("❌ [ADMIN] Manual weekly check failed:", error);
      }
    })();

  } catch (error) {
    console.error("❌ [ADMIN] Weekly Check Trigger Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Starten des Weekly Checks",
      error: error.message
    });
  }
});

/**
 * GET /admin/digest-queue - View pending digest alerts
 */
router.get("/admin/digest-queue", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    const pendingAlerts = await db.collection("digest_queue")
      .find({ sent: false })
      .sort({ queuedAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      count: pendingAlerts.length,
      alerts: pendingAlerts.map(a => ({
        _id: a._id,
        type: a.type,
        userId: a.userId,
        contractName: a.contractName,
        lawTitle: a.lawTitle,
        queuedAt: a.queuedAt,
        digestMode: a.digestMode,
        findingsCount: a.findings?.length || 0
      }))
    });
  } catch (error) {
    console.error("❌ [ADMIN] Digest Queue Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /admin/digest-queue/cleanup - Remove duplicate/old alerts
 */
router.delete("/admin/digest-queue/cleanup", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    // Get all pending weekly_legal_check alerts
    const pendingAlerts = await db.collection("digest_queue")
      .find({ type: 'weekly_legal_check', sent: false })
      .sort({ queuedAt: -1 })
      .toArray();

    // Group by contractId - keep only the newest one per contract
    const seen = new Map();
    const toDelete = [];

    for (const alert of pendingAlerts) {
      const key = `${alert.userId}-${alert.contractId}`;
      if (seen.has(key)) {
        toDelete.push(alert._id);
      } else {
        seen.set(key, alert._id);
      }
    }

    let deletedCount = 0;
    if (toDelete.length > 0) {
      const result = await db.collection("digest_queue").deleteMany({
        _id: { $in: toDelete }
      });
      deletedCount = result.deletedCount;
    }

    res.json({
      success: true,
      message: `${deletedCount} Duplikate entfernt, ${seen.size} Alerts behalten`,
      deleted: deletedCount,
      remaining: seen.size
    });
  } catch (error) {
    console.error("❌ [ADMIN] Digest Cleanup Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /admin/digest-queue/full - Get ALL pending alerts with FULL details
 * IMPORTANT: This route must come BEFORE /:id to avoid "full" being treated as an id
 */
router.get("/admin/digest-queue/full", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    const pendingAlerts = await db.collection("digest_queue")
      .find({ sent: false })
      .sort({ queuedAt: -1 })
      .toArray();

    // Get all user emails
    const userIds = [...new Set(pendingAlerts.map(a => a.userId))];
    const users = await db.collection("users").find({
      _id: { $in: userIds.map(id => typeof id === 'string' ? new ObjectId(id) : id) }
    }).toArray();
    const userMap = new Map(users.map(u => [u._id.toString(), u.email]));

    res.json({
      success: true,
      count: pendingAlerts.length,
      alerts: pendingAlerts.map(a => ({
        ...a,
        userEmail: userMap.get(a.userId?.toString()) || 'Unknown'
      }))
    });
  } catch (error) {
    console.error("❌ [ADMIN] Digest Queue Full Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /admin/digest-queue/:id - Get full details of a specific alert
 */
router.get("/admin/digest-queue/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    const alert = await db.collection("digest_queue").findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert nicht gefunden" });
    }

    // Also get user email for verification
    const user = await db.collection("users").findOne({ _id: alert.userId });

    res.json({
      success: true,
      alert: {
        ...alert,
        userEmail: user?.email || 'Unknown'
      }
    });
  } catch (error) {
    console.error("❌ [ADMIN] Digest Get Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /admin/digest-queue/:id - Delete specific alert
 */
router.delete("/admin/digest-queue/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const database = require("../config/database");
    const db = await database.connect();

    const result = await db.collection("digest_queue").deleteOne({
      _id: new ObjectId(req.params.id)
    });

    res.json({
      success: result.deletedCount > 0,
      message: result.deletedCount > 0 ? "Alert gelöscht" : "Alert nicht gefunden"
    });
  } catch (error) {
    console.error("❌ [ADMIN] Digest Delete Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
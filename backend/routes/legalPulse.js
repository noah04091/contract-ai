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
    console.warn(`⚠️ [RATE-LIMIT] User ${req.user?.userId || req.ip} hat Legal Pulse Limit erreicht`);
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
    
    console.log(`🧠 Starte manuelle AI-Analyse für Vertrag: ${contractId}`);
    
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
    console.log(`🧠 Starte vollständigen AI-Scan für User: ${req.user.userId}`);
    
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

    console.log(`✅ Legal Pulse Settings aktualisiert für User ${req.user.userId}:`, updates);

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

    console.log(`✅ [LEGAL-PULSE:REPORT] PDF generiert für Vertrag ${contractId}`);

  } catch (error) {
    console.error("❌ [LEGAL-PULSE:REPORT] Fehler:", error);
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
    const db = req.app.locals.db;
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
    const db = req.app.locals.db;
    const { contractId } = req.params;

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ success: false, message: "Ungültige Contract-ID" });
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
    const db = req.app.locals.db;
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

module.exports = router;
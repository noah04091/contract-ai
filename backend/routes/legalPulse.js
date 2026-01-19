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

module.exports = router;
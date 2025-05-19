// 📁 backend/routes/legalPulse.js (New Route for Manual Analysis)
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const runLegalPulseScan = require("../services/legalPulseScan");

// Manuelle Analyse für einzelnen Vertrag
router.post("/analyze/:contractId", verifyToken, async (req, res) => {
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
router.post("/scan-all", verifyToken, async (req, res) => {
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

module.exports = router;
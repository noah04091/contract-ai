// 📁 backend/routes/predictiveAnalytics.js
// Legal Pulse 2.0 Phase 2 - Predictive Analytics & Forecast API

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { getInstance: getPredictiveService } = require("../services/predictiveAnalyticsService");
const { getInstance: getAutoTrigger } = require("../services/autoTriggerService");

/**
 * GET /api/predictive/forecast/:contractId
 * Get forecast for contract
 */
router.get("/forecast/:contractId", verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { months = 6 } = req.query;

    const service = getPredictiveService();
    const forecast = await service.generateForecast(contractId, parseInt(months));

    res.json({
      success: true,
      forecast
    });

  } catch (error) {
    console.error('[PREDICTIVE-API] Forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Vorhersage',
      error: error.message
    });
  }
});

/**
 * POST /api/predictive/trigger-now
 * Manually trigger auto-check
 */
router.post("/trigger-now", verifyToken, async (req, res) => {
  try {
    const autoTrigger = getAutoTrigger();
    const result = await autoTrigger.runAutoTrigger();

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[PREDICTIVE-API] Trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Trigger',
      error: error.message
    });
  }
});

/**
 * GET /api/predictive/trigger-status
 * Get auto-trigger status
 */
router.get("/trigger-status", verifyToken, async (req, res) => {
  try {
    const autoTrigger = getAutoTrigger();
    const status = autoTrigger.getStatus();

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('[PREDICTIVE-API] Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Status abrufen',
      error: error.message
    });
  }
});

module.exports = router;

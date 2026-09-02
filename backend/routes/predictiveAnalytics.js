// 📁 backend/routes/predictiveAnalytics.js
// Legal Pulse 2.0 Phase 2 - Predictive Analytics & Forecast API

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const database = require("../config/database");
const { getInstance: getPredictiveService } = require("../services/predictiveAnalyticsService");
const { getInstance: getAutoTrigger } = require("../services/autoTriggerService");

/**
 * GET /api/predictive/forecast/:contractId
 * Get forecast for contract
 *
 * 02.09.2026 (Pulse-Masterplan Phase 1): Eigentumsprüfung ergänzt — vorher lieferte
 * die Route per ID die Prognose zu JEDEM Vertrag (generateForecast lädt ohne userId;
 * Muster „findOne per ID ohne userId" aus dem Sicherheits-Durchgang 23./24.08.).
 * Einziger Konsument ist die V1-Seite /legalpulse mit den EIGENEN Verträgen des
 * Nutzers — die Prüfung sperrt also niemanden aus.
 */
router.get("/forecast/:contractId", verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { months = 6 } = req.query;

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ success: false, message: "Ungültige Vertrags-ID" });
    }
    const db = await database.connect();
    const owned = await db.collection("contracts").findOne(
      { _id: new ObjectId(contractId) },
      { projection: { userId: 1 } }
    );
    if (!owned || String(owned.userId) !== String(req.user.userId)) {
      // Bewusst 404 statt 403: keine Existenz fremder IDs bestätigen
      return res.status(404).json({ success: false, message: "Vertrag nicht gefunden" });
    }

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
 *
 * 02.09.2026 (Pulse-Masterplan Phase 1): war für JEDEN eingeloggten Nutzer offen und
 * verarbeitet die Verträge ALLER Nutzer (autoTriggerService lädt global, schreibt
 * contracts und löst V1-Direktmails ohne Abmelde-Link aus). Zusätzlich umging die
 * Route den Stilllege-Schalter des Alt-Systems vom 06.07.2026. Jetzt: Admin-only
 * UND hinter LEGAL_PULSE_CRON_ENABLED — gleiche Absicherung wie
 * POST /api/legalpulse/cron-run (TÜV-Fix 19.08.2026).
 */
router.post("/trigger-now", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (process.env.LEGAL_PULSE_CRON_ENABLED !== "true") {
      return res.status(503).json({
        success: false,
        message: "Legal-Pulse-Altsystem ist stillgelegt (LEGAL_PULSE_CRON_ENABLED)"
      });
    }
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
 * 02.09.2026: Admin-only (interne Scheduler-Details, kein Frontend-Konsument).
 */
router.get("/trigger-status", verifyToken, verifyAdmin, async (req, res) => {
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

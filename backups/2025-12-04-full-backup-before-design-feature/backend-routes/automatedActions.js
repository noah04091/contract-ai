// 📁 backend/routes/automatedActions.js
// Legal Pulse 2.0 Phase 2 - Automated Actions API

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { getInstance: getAutomatedActionsService } = require("../services/automatedActionsService");

/**
 * POST /api/automated-actions/execute
 * Execute single automated action
 */
router.post("/execute", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId, actionType } = req.body;

    if (!notificationId || !actionType) {
      return res.status(400).json({
        success: false,
        message: 'notificationId and actionType are required'
      });
    }

    const service = getAutomatedActionsService();
    const result = await service.executeAction(notificationId, userId, actionType);

    res.json({
      success: true,
      message: `Action ${actionType} executed successfully`,
      result
    });

  } catch (error) {
    console.error('[AUTOMATED-ACTIONS-API] Error executing action:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausführen der Aktion',
      error: error.message
    });
  }
});

/**
 * POST /api/automated-actions/workflow
 * Execute multi-step workflow
 */
router.post("/workflow", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId, workflow } = req.body;

    if (!notificationId || !Array.isArray(workflow)) {
      return res.status(400).json({
        success: false,
        message: 'notificationId and workflow array are required'
      });
    }

    const service = getAutomatedActionsService();
    const result = await service.executeWorkflow(notificationId, userId, workflow);

    res.json({
      success: result.success,
      message: `Workflow completed: ${result.completedSteps}/${result.totalSteps} steps`,
      result
    });

  } catch (error) {
    console.error('[AUTOMATED-ACTIONS-API] Error executing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausführen des Workflows',
      error: error.message
    });
  }
});

/**
 * POST /api/automated-actions/optimize-and-generate
 * Quick action: Optimize + Generate new version
 */
router.post("/optimize-and-generate", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'notificationId is required'
      });
    }

    const service = getAutomatedActionsService();
    const result = await service.executeWorkflow(
      notificationId,
      userId,
      ['optimize', 'generate']
    );

    res.json({
      success: result.success,
      message: 'Optimierung und Generierung abgeschlossen',
      result
    });

  } catch (error) {
    console.error('[AUTOMATED-ACTIONS-API] Error in optimize-and-generate:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Optimieren und Generieren',
      error: error.message
    });
  }
});

/**
 * POST /api/automated-actions/full-flow
 * Complete flow: Optimize → Generate → Sign
 */
router.post("/full-flow", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.body;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'notificationId is required'
      });
    }

    const service = getAutomatedActionsService();
    const result = await service.executeWorkflow(
      notificationId,
      userId,
      ['optimize', 'generate', 'sign']
    );

    res.json({
      success: result.success,
      message: 'Vollständiger Workflow abgeschlossen',
      result
    });

  } catch (error) {
    console.error('[AUTOMATED-ACTIONS-API] Error in full-flow:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim vollständigen Workflow',
      error: error.message
    });
  }
});

module.exports = router;

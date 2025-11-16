// 📁 backend/routes/costTracking.js
// Cost Tracking API Endpoints

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin'); // 🔐 Admin-only access
const { getInstance: getCostTrackingService } = require('../services/costTracking');

// ===== GET DAILY BUDGET STATUS =====
// GET /api/cost-tracking/budget
// 🔐 Admin-only: Only admins can view cost tracking data
router.get('/budget', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const costTracker = getCostTrackingService();
    const budgetStatus = await costTracker.checkDailyBudget();

    res.json({
      success: true,
      budget: budgetStatus
    });
  } catch (error) {
    console.error('❌ [COST-TRACKING] Error checking budget:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Budgets',
      error: error.message
    });
  }
});

// ===== GET COST STATISTICS =====
// GET /api/cost-tracking/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// 🔐 Admin-only: Only admins can view cost tracking data
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const costTracker = getCostTrackingService();
    const stats = await costTracker.getStats(start, end);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ [COST-TRACKING] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Statistiken',
      error: error.message
    });
  }
});

// ===== GET DAILY COST TREND =====
// GET /api/cost-tracking/trend?days=30
// 🔐 Admin-only: Only admins can view cost tracking data
router.get('/trend', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Validate days parameter
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: 'Days parameter must be between 1 and 365'
      });
    }

    const costTracker = getCostTrackingService();
    const trend = await costTracker.getDailyTrend(days);

    res.json({
      success: true,
      trend
    });
  } catch (error) {
    console.error('❌ [COST-TRACKING] Error getting trend:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Trends',
      error: error.message
    });
  }
});

// ===== GET USER-SPECIFIC STATS =====
// GET /api/cost-tracking/user-stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// 🔐 Admin-only: Only admins can view cost tracking data
router.get('/user-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId;

    // Default to last 30 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    const costTracker = getCostTrackingService();

    // Initialize to ensure connection
    await costTracker.init();

    // Query user-specific costs
    const userCosts = await costTracker.db.collection('cost_tracking').aggregate([
      {
        $match: {
          userId,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          totalCalls: { $sum: 1 },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          byFeature: {
            $push: { feature: '$feature', cost: '$totalCost' }
          }
        }
      }
    ]).toArray();

    if (userCosts.length === 0) {
      return res.json({
        success: true,
        stats: {
          startDate: start,
          endDate: end,
          totalCost: 0,
          totalCalls: 0,
          totalTokens: 0,
          byFeature: {}
        }
      });
    }

    const result = userCosts[0];

    // Aggregate by feature
    const featureStats = {};
    result.byFeature.forEach(item => {
      if (!featureStats[item.feature]) {
        featureStats[item.feature] = { calls: 0, cost: 0 };
      }
      featureStats[item.feature].calls++;
      featureStats[item.feature].cost += item.cost;
    });

    res.json({
      success: true,
      stats: {
        startDate: start,
        endDate: end,
        totalCost: result.totalCost,
        totalCalls: result.totalCalls,
        totalTokens: result.totalInputTokens + result.totalOutputTokens,
        byFeature: featureStats
      }
    });
  } catch (error) {
    console.error('❌ [COST-TRACKING] Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzerstatistiken',
      error: error.message
    });
  }
});

module.exports = router;

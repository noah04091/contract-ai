// 📁 backend/routes/legalPulseHealth.js
// Legal Pulse Health Check & Monitoring

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

let db;

module.exports = (database) => {
  db = database;
  return router;
};

/**
 * 🏥 Legal Pulse Health Check
 * GET /api/legal-pulse/health
 * Admin endpoint to monitor system health
 */
router.get("/health", verifyToken, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      checks: {}
    };

    // 1. Database connectivity
    try {
      await db.command({ ping: 1 });
      health.checks.database = { status: 'ok', message: 'Connected' };
    } catch (error) {
      health.checks.database = { status: 'error', message: error.message };
      health.status = 'unhealthy';
    }

    // 2. Laws collection stats
    try {
      const lawsCollection = db.collection('laws');
      const lawsCount = await lawsCollection.countDocuments();
      const recentLaws = await lawsCollection.countDocuments({
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      health.checks.laws = {
        status: 'ok',
        total: lawsCount,
        recentlyUpdated: recentLaws,
        message: `${lawsCount} laws, ${recentLaws} updated in last 7 days`
      };
    } catch (error) {
      health.checks.laws = { status: 'error', message: error.message };
      health.status = 'degraded';
    }

    // 3. Contracts indexing status
    try {
      const contractsCollection = db.collection('contracts');
      const totalContracts = await contractsCollection.countDocuments();
      const indexedContracts = await contractsCollection.countDocuments({
        lastIndexedAt: { $exists: true, $ne: null }
      });
      const needsIndexing = totalContracts - indexedContracts;

      health.checks.contracts = {
        status: needsIndexing > 100 ? 'warning' : 'ok',
        total: totalContracts,
        indexed: indexedContracts,
        needsIndexing,
        message: `${indexedContracts}/${totalContracts} indexed (${needsIndexing} pending)`
      };

      if (needsIndexing > 100) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.contracts = { status: 'error', message: error.message };
      health.status = 'degraded';
    }

    // 4. Notifications stats
    try {
      const notificationsCollection = db.collection('pulse_notifications');
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentNotifications = await notificationsCollection.countDocuments({
        createdAt: { $gte: last24h }
      });

      health.checks.notifications = {
        status: 'ok',
        last24h: recentNotifications,
        message: `${recentNotifications} alerts sent in last 24h`
      };
    } catch (error) {
      health.checks.notifications = { status: 'error', message: error.message };
    }

    // 5. Digest queue stats
    try {
      const digestQueueCollection = db.collection('digest_queue');
      const pendingDaily = await digestQueueCollection.countDocuments({
        digestMode: 'daily',
        sent: false
      });
      const pendingWeekly = await digestQueueCollection.countDocuments({
        digestMode: 'weekly',
        sent: false
      });

      health.checks.digestQueue = {
        status: 'ok',
        pendingDaily,
        pendingWeekly,
        message: `${pendingDaily} daily, ${pendingWeekly} weekly pending`
      };
    } catch (error) {
      health.checks.digestQueue = { status: 'error', message: error.message };
    }

    // 6. Feedback stats
    try {
      const feedbackCollection = db.collection('alert_feedback');
      const totalFeedback = await feedbackCollection.countDocuments();
      const helpfulCount = await feedbackCollection.countDocuments({ rating: 'helpful' });
      const helpfulRate = totalFeedback > 0 ? (helpfulCount / totalFeedback * 100).toFixed(1) : 0;

      health.checks.feedback = {
        status: 'ok',
        total: totalFeedback,
        helpfulRate: `${helpfulRate}%`,
        message: `${totalFeedback} total, ${helpfulRate}% helpful`
      };
    } catch (error) {
      health.checks.feedback = { status: 'error', message: error.message };
    }

    // 7. Cost optimization stats (if available)
    try {
      const { getInstance: getCostOptimization } = require('../services/costOptimization');
      const costOptimization = getCostOptimization();
      const costStats = costOptimization.getStats();

      health.checks.costs = {
        status: 'ok',
        totalCost: `$${costStats.totalEstimatedCost.toFixed(4)}`,
        projectedMonthly: `$${costStats.projectedMonthlyCost.toFixed(2)}`,
        cacheHitRate: `${(costStats.cacheStats.hitRate * 100).toFixed(1)}%`,
        message: `$${costStats.totalEstimatedCost.toFixed(4)} spent, ${(costStats.cacheStats.hitRate * 100).toFixed(1)}% cache hit rate`
      };
    } catch (error) {
      health.checks.costs = { status: 'unavailable', message: 'Cost tracking not initialized' };
    }

    res.json({
      success: true,
      health
    });

  } catch (error) {
    console.error("❌ Health check error:", error);
    res.status(500).json({
      success: false,
      health: {
        status: 'error',
        timestamp: new Date(),
        error: error.message
      }
    });
  }
});

/**
 * 📊 Legal Pulse Statistics Dashboard
 * GET /api/legal-pulse/stats
 * Detailed statistics for monitoring
 */
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const stats = {};

    // 1. Laws by area
    const lawsCollection = db.collection('laws');
    const lawsByArea = await lawsCollection.aggregate([
      { $match: { area: { $exists: true, $ne: null } } },
      { $group: { _id: '$area', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    stats.lawsByArea = lawsByArea.map(item => ({
      area: item._id,
      count: item.count
    }));

    // 2. Recent law updates timeline
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLawsByDay = await lawsCollection.aggregate([
      { $match: { updatedAt: { $gte: last30Days } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    stats.recentLawsTimeline = recentLawsByDay.map(item => ({
      date: item._id,
      count: item.count
    }));

    // 3. Alert frequency by severity
    const notificationsCollection = db.collection('pulse_notifications');
    const alertsBySeverity = await notificationsCollection.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    stats.alertsBySeverity = alertsBySeverity.map(item => ({
      severity: item._id,
      count: item.count
    }));

    // 4. User settings distribution
    const usersCollection = db.collection('users');
    const settingsDistribution = await usersCollection.aggregate([
      { $match: { 'legalPulseSettings.enabled': true } },
      {
        $group: {
          _id: '$legalPulseSettings.digestMode',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    stats.digestModeDistribution = settingsDistribution.map(item => ({
      mode: item._id || 'instant',
      count: item.count
    }));

    // 5. Feedback quality metrics
    const feedbackCollection = db.collection('alert_feedback');
    const feedbackByArea = await feedbackCollection.aggregate([
      { $match: { lawArea: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$lawArea',
          total: { $sum: 1 },
          helpful: {
            $sum: { $cond: [{ $eq: ['$rating', 'helpful'] }, 1, 0] }
          },
          avgScore: { $avg: '$alertScore' }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    stats.feedbackByArea = feedbackByArea.map(item => ({
      area: item._id,
      total: item.total,
      helpfulRate: ((item.helpful / item.total) * 100).toFixed(1) + '%',
      avgScore: (item.avgScore * 100).toFixed(1) + '%'
    }));

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading statistics",
      error: error.message
    });
  }
});

module.exports = router;

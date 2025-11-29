// 📁 backend/routes/admin.js
// 🔐 Admin-only Routes für Statistiken und Monitoring

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { getInstance: getCostTrackingService } = require("../services/costTracking");

// ===== 📊 GET COMPREHENSIVE ADMIN STATISTICS =====
// GET /api/admin/stats
// Returns: Cost tracking, user metrics, revenue projections, system health
router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('📊 [ADMIN] Fetching comprehensive statistics...');

    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    const costTrackingCollection = db.collection("cost_tracking");

    // ===== 💰 COST TRACKING DATA =====
    const costTracking = getCostTrackingService();

    // Daily budget status
    const dailyBudget = await costTracking.checkDailyBudget();

    // Last 30 days trend
    const dailyTrend = await costTracking.getDailyTrend(30);

    // Current month stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const monthStats = await costTracking.getStats(startOfMonth, today);

    // Top 10 most expensive users (current month)
    const topUsersBySpend = await costTrackingCollection.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalCost: { $sum: '$totalCost' },
          totalCalls: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' }
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get user emails for top spenders
    const topUsersWithEmails = await Promise.all(
      topUsersBySpend.map(async (user) => {
        try {
          const userDoc = await usersCollection.findOne(
            { _id: new ObjectId(user._id) },
            { projection: { email: 1, subscriptionPlan: 1 } }
          );
          return {
            ...user,
            email: userDoc?.email || 'Unknown',
            plan: userDoc?.subscriptionPlan || 'unknown'
          };
        } catch (err) {
          return {
            ...user,
            email: 'Invalid User',
            plan: 'unknown'
          };
        }
      })
    );

    // ===== 👥 USER METRICS =====
    const totalUsers = await usersCollection.countDocuments();
    const freeUsers = await usersCollection.countDocuments({ subscriptionPlan: 'free' });
    const businessUsers = await usersCollection.countDocuments({ subscriptionPlan: 'business' });
    const premiumUsers = await usersCollection.countDocuments({ subscriptionPlan: 'premium' });
    const activeSubscriptions = await usersCollection.countDocuments({ subscriptionActive: true });
    const verifiedUsers = await usersCollection.countDocuments({ verified: true });

    // User growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast30Days = await usersCollection.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Daily registrations (last 30 days)
    const dailyRegistrations = await usersCollection.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // ===== 📈 CONVERSION METRICS =====
    // Calculate conversion rates
    const totalPaidUsers = businessUsers + premiumUsers;
    const conversionRate = totalUsers > 0 ? (totalPaidUsers / totalUsers) * 100 : 0;

    // Premium upgrade rate (from all paid users)
    const premiumUpgradeRate = totalPaidUsers > 0 ? (premiumUsers / totalPaidUsers) * 100 : 0;

    // ===== 💼 REVENUE PROJECTIONS =====
    // Monthly recurring revenue (MRR)
    const businessMRR = businessUsers * 19; // €19/month
    const premiumMRR = premiumUsers * 29;   // €29/month
    const totalMRR = businessMRR + premiumMRR;

    // Annual recurring revenue (ARR)
    const totalARR = totalMRR * 12;

    // Average revenue per user (ARPU)
    const arpu = totalUsers > 0 ? totalMRR / totalUsers : 0;

    // ===== 📊 USAGE STATISTICS =====
    const totalAnalyses = await usersCollection.aggregate([
      { $group: { _id: null, total: { $sum: '$analysisCount' } } }
    ]).toArray();

    const totalOptimizations = await usersCollection.aggregate([
      { $group: { _id: null, total: { $sum: '$optimizationCount' } } }
    ]).toArray();

    const totalContracts = await contractsCollection.countDocuments();

    // Analyses per plan
    const analysesByPlan = await usersCollection.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          totalAnalyses: { $sum: '$analysisCount' },
          userCount: { $sum: 1 }
        }
      }
    ]).toArray();

    // ===== 🔥 SYSTEM HEALTH =====
    // Check MongoDB connection
    const mongoStatus = client.topology?.isConnected() ? 'Connected' : 'Disconnected';

    // Average analyses per user
    const avgAnalysesPerUser = totalUsers > 0
      ? (totalAnalyses[0]?.total || 0) / totalUsers
      : 0;

    // Most active users (by analysis count)
    const mostActiveUsers = await usersCollection.find(
      {},
      {
        projection: {
          email: 1,
          analysisCount: 1,
          subscriptionPlan: 1
        },
        sort: { analysisCount: -1 },
        limit: 10
      }
    ).toArray();

    await client.close();

    // ===== 📦 RESPONSE =====
    const response = {
      success: true,
      timestamp: new Date().toISOString(),

      // Cost Tracking
      costs: {
        today: {
          spent: dailyBudget.spent || 0,
          limit: dailyBudget.limit || 100,
          remaining: dailyBudget.remaining || 100,
          percentUsed: dailyBudget.percentUsed || 0,
          isLimitReached: dailyBudget.isLimitReached || false
        },
        month: {
          total: monthStats.totalCost || 0,
          calls: monthStats.totalCalls || 0,
          tokens: monthStats.totalTokens || 0,
          byModel: monthStats.byModel || {},
          byFeature: monthStats.byFeature || {}
        },
        trend: dailyTrend || [],
        topUsers: topUsersWithEmails || []
      },

      // User Metrics
      users: {
        total: totalUsers,
        free: freeUsers,
        business: businessUsers,
        premium: premiumUsers,
        activeSubscriptions,
        verified: verifiedUsers,
        newLast30Days: newUsersLast30Days,
        dailyRegistrations: dailyRegistrations.map(d => ({
          date: d._id,
          count: d.count
        }))
      },

      // Conversion Metrics
      conversion: {
        rate: parseFloat(conversionRate.toFixed(2)),
        premiumUpgradeRate: parseFloat(premiumUpgradeRate.toFixed(2)),
        totalPaidUsers
      },

      // Revenue
      revenue: {
        mrr: totalMRR,
        arr: totalARR,
        arpu: parseFloat(arpu.toFixed(2)),
        breakdown: {
          business: businessMRR,
          premium: premiumMRR
        }
      },

      // Usage Statistics
      usage: {
        totalAnalyses: totalAnalyses[0]?.total || 0,
        totalOptimizations: totalOptimizations[0]?.total || 0,
        totalContracts,
        avgAnalysesPerUser: parseFloat(avgAnalysesPerUser.toFixed(2)),
        byPlan: analysesByPlan.map(p => ({
          plan: p._id,
          analyses: p.totalAnalyses,
          users: p.userCount,
          avgPerUser: p.userCount > 0 ? parseFloat((p.totalAnalyses / p.userCount).toFixed(2)) : 0
        })),
        mostActive: mostActiveUsers.map(u => ({
          email: u.email,
          plan: u.subscriptionPlan,
          analyses: u.analysisCount || 0
        }))
      },

      // System Health
      system: {
        mongoStatus,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    console.log('✅ [ADMIN] Statistics compiled successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Admin-Statistiken',
      error: error.message
    });
  }
});

// ===== 🎁 GET BETA PROGRAM STATISTICS =====
// GET /api/admin/beta-stats
// Returns: Beta tester metrics, feedback summary, engagement data
router.get("/beta-stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('🎁 [ADMIN] Fetching beta program statistics...');

    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    const betaFeedbackCollection = db.collection("betaFeedback");

    // ===== 👥 BETA TESTER COUNTS =====
    const totalBetaTesters = await usersCollection.countDocuments({ betaTester: true });
    const verifiedBetaTesters = await usersCollection.countDocuments({ betaTester: true, verified: true });
    const pendingVerification = await usersCollection.countDocuments({ betaTester: true, verified: false });

    // Beta testers with reminder sent
    const remindersSent = await usersCollection.countDocuments({ betaTester: true, betaReminderSent: true });

    // ===== 📊 FEEDBACK STATISTICS =====
    const totalFeedbacks = await betaFeedbackCollection.countDocuments();

    // Average rating
    const ratingAgg = await betaFeedbackCollection.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]).toArray();
    const avgRating = ratingAgg[0]?.avgRating || 0;

    // Rating distribution
    const ratingDistribution = await betaFeedbackCollection.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Payment willingness
    const paymentWillingness = await betaFeedbackCollection.aggregate([
      { $group: { _id: "$wouldPay", count: { $sum: 1 } } }
    ]).toArray();

    // Feedbacks with testimonials
    const feedbacksWithTestimonial = await betaFeedbackCollection.countDocuments({
      testimonial: { $exists: true, $ne: "" }
    });

    // ===== 📋 RECENT BETA TESTERS =====
    const recentBetaTesters = await usersCollection.find(
      { betaTester: true },
      {
        projection: {
          email: 1,
          verified: 1,
          betaRegisteredAt: 1,
          betaExpiresAt: 1,
          betaReminderSent: 1,
          betaReminderSentAt: 1,
          analysisCount: 1,
          optimizationCount: 1
        }
      }
    )
    .sort({ betaRegisteredAt: -1 })
    .limit(50)
    .toArray();

    // Add feedback status to each beta tester
    const betaTestersWithFeedback = await Promise.all(
      recentBetaTesters.map(async (tester) => {
        const feedback = await betaFeedbackCollection.findOne({ email: tester.email });
        return {
          ...tester,
          hasFeedback: !!feedback,
          feedbackRating: feedback?.rating || null,
          feedbackDate: feedback?.createdAt || null
        };
      })
    );

    // ===== 📝 RECENT FEEDBACKS =====
    const recentFeedbacks = await betaFeedbackCollection.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // ===== 📊 BETA ENGAGEMENT METRICS =====
    // Beta testers who have used the platform (at least 1 analysis)
    const engagedBetaTesters = await usersCollection.countDocuments({
      betaTester: true,
      verified: true,
      analysisCount: { $gte: 1 }
    });

    // Beta testers approaching expiration (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringBetaTesters = await usersCollection.countDocuments({
      betaTester: true,
      betaExpiresAt: { $lte: sevenDaysFromNow, $gte: new Date() }
    });

    // Expired beta testers
    const expiredBetaTesters = await usersCollection.countDocuments({
      betaTester: true,
      betaExpiresAt: { $lt: new Date() }
    });

    await client.close();

    // ===== 📊 COMPILE RESPONSE =====
    const response = {
      // Overview
      overview: {
        totalBetaTesters,
        verifiedBetaTesters,
        pendingVerification,
        remindersSent,
        totalFeedbacks,
        feedbackRate: totalBetaTesters > 0
          ? parseFloat(((totalFeedbacks / totalBetaTesters) * 100).toFixed(1))
          : 0
      },

      // Feedback metrics
      feedback: {
        total: totalFeedbacks,
        avgRating: parseFloat(avgRating.toFixed(2)),
        ratingDistribution: ratingDistribution.map(r => ({
          stars: r._id,
          count: r.count
        })),
        paymentWillingness: paymentWillingness.map(p => ({
          answer: p._id,
          count: p.count
        })),
        withTestimonial: feedbacksWithTestimonial
      },

      // Engagement
      engagement: {
        engaged: engagedBetaTesters,
        engagementRate: verifiedBetaTesters > 0
          ? parseFloat(((engagedBetaTesters / verifiedBetaTesters) * 100).toFixed(1))
          : 0,
        expiringSoon: expiringBetaTesters,
        expired: expiredBetaTesters
      },

      // Lists
      betaTesters: betaTestersWithFeedback,
      recentFeedbacks: recentFeedbacks.map(f => ({
        ...f,
        _id: f._id.toString()
      }))
    };

    console.log('✅ [ADMIN] Beta statistics compiled successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching beta statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Beta-Statistiken',
      error: error.message
    });
  }
});

// ===== 🔧 RESET USER ANALYSIS COUNT =====
// POST /api/admin/reset-analysis-count
// Body: { email: "user@example.com" }
// Used to reset a user's analysis count (e.g., after failed analyses counted)
router.post("/reset-analysis-count", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    console.log(`🔧 [ADMIN] Resetting analysis count for: ${email}`);

    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const usersCollection = client.db("contract_ai").collection("users");

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: `User not found: ${email}`
      });
    }

    const previousCount = user.analysisCount ?? 0;

    // Reset
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { analysisCount: 0 } }
    );

    await client.close();

    console.log(`✅ [ADMIN] Reset ${email}: ${previousCount} -> 0`);

    res.json({
      success: true,
      message: `Analysis count reset for ${email}`,
      previousCount,
      newCount: 0,
      plan: user.subscriptionPlan || 'free'
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error resetting analysis count:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen des Zählers',
      error: error.message
    });
  }
});

module.exports = router;

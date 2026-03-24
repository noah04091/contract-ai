// 📁 backend/routes/admin.js
// 🔐 Admin-only Routes für Statistiken und Monitoring

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { getInstance: getCostTrackingService } = require("../services/costTracking");

// ===== 📊 GET COMPREHENSIVE ADMIN STATISTICS =====
// GET /api/admin/stats
// Returns: Cost tracking, user metrics, revenue projections, system health
router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('📊 [ADMIN] Fetching comprehensive statistics...');

    const db = await database.connect();
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
    // ✅ KORRIGIERT: Enterprise + Legacy "premium" User zählen
    const enterpriseUsers = await usersCollection.countDocuments({
      subscriptionPlan: { $in: ['enterprise', 'premium'] }
    });
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
    const totalPaidUsers = businessUsers + enterpriseUsers;
    const conversionRate = totalUsers > 0 ? (totalPaidUsers / totalUsers) * 100 : 0;

    // Premium upgrade rate (from all paid users)
    const enterpriseUpgradeRate = totalPaidUsers > 0 ? (enterpriseUsers / totalPaidUsers) * 100 : 0;

    // ===== 💼 REVENUE PROJECTIONS =====
    // Monthly recurring revenue (MRR)
    const businessMRR = businessUsers * 19; // €19/month
    const enterpriseMRR = enterpriseUsers * 29;   // €29/month
    const totalMRR = businessMRR + enterpriseMRR;

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
    const mongoStatus = database.getStatus().connected ? 'Connected' : 'Disconnected';

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
        enterprise: enterpriseUsers,
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
        enterpriseUpgradeRate: parseFloat(enterpriseUpgradeRate.toFixed(2)),
        totalPaidUsers
      },

      // Revenue
      revenue: {
        mrr: totalMRR,
        arr: totalARR,
        arpu: parseFloat(arpu.toFixed(2)),
        breakdown: {
          business: businessMRR,
          enterprise: enterpriseMRR
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

    const db = await database.connect();
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

// ===== 🗑️ DELETE USER =====
// DELETE /api/admin/users/:userId
// Admin-only: Completely delete a user and their data (with archive)
router.delete("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    console.log(`🗑️ [ADMIN] Deleting user: ${userId}`);

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    const costTrackingCollection = db.collection("cost_tracking");
    const deletedAccountsCollection = db.collection("deleted_accounts");

    // Find user first
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Don't allow deleting yourself or other admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin-Accounts können nicht gelöscht werden"
      });
    }

    // Count contracts before deletion
    const contractCount = await contractsCollection.countDocuments({ userId: userId });

    // 📦 Archive deleted account
    const deletedAccountRecord = {
      originalUserId: user._id.toString(),
      email: user.email,
      subscriptionPlan: user.subscriptionPlan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'inactive',
      betaTester: user.betaTester || false,
      analysisCount: user.analysisCount || 0,
      optimizationCount: user.optimizationCount || 0,
      contractsDeleted: contractCount,
      accountCreatedAt: user.createdAt,
      accountDeletedAt: new Date(),
      accountAgeInDays: user.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      registrationDevice: user.registrationDevice || null,
      lastLoginDevice: user.lastLoginDevice || null,
      lastLoginAt: user.lastLoginAt || null,
      deletionDevice: null, // Admin-Löschung hat kein spezifisches Gerät
      deletedBy: 'admin',
      deletedByAdmin: req.user.email,
      verified: user.verified || false
    };

    await deletedAccountsCollection.insertOne(deletedAccountRecord);
    console.log(`   📦 Archived deleted account: ${user.email}`);

    // Delete user's contracts
    const contractsResult = await contractsCollection.deleteMany({ userId: userId });
    console.log(`   📄 Deleted ${contractsResult.deletedCount} contracts`);

    // Delete user's cost tracking entries
    const costResult = await costTrackingCollection.deleteMany({ userId: userId });
    console.log(`   💰 Deleted ${costResult.deletedCount} cost tracking entries`);

    // Delete the user
    const deleteResult = await usersCollection.deleteOne({ _id: new ObjectId(userId) });

    // 📋 Activity Log: User gelöscht
    if (deleteResult.deletedCount === 1) {
      try {
        const { logActivity, ActivityTypes } = require('../services/activityLogger');
        await logActivity(db, {
          type: ActivityTypes.USER_DELETED,
          userId: userId,
          userEmail: user.email,
          description: `User gelöscht von Admin: ${user.email}`,
          details: {
            deletedBy: req.user.email,
            contractsDeleted: contractsResult.deletedCount,
            costEntriesDeleted: costResult.deletedCount
          },
          severity: 'warning',
          source: 'admin'
        });
      } catch (logErr) {
        console.error("Activity Log Error:", logErr);
      }
    }

    if (deleteResult.deletedCount === 1) {
      console.log(`✅ [ADMIN] Successfully deleted user: ${user.email}`);
      res.json({
        success: true,
        message: `Benutzer ${user.email} erfolgreich gelöscht`,
        deletedData: {
          user: user.email,
          contracts: contractsResult.deletedCount,
          costEntries: costResult.deletedCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Fehler beim Löschen des Benutzers"
      });
    }

  } catch (error) {
    console.error('❌ [ADMIN] Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Benutzers',
      error: error.message
    });
  }
});

// ===== 🗑️ BULK DELETE USERS =====
// POST /api/admin/users/bulk-delete
// Body: { userIds: ["id1", "id2", ...] }
// Admin-only: Delete multiple users at once
router.post("/users/bulk-delete", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine User-IDs angegeben"
      });
    }

    // Validate all IDs
    const validIds = userIds.filter(id => ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine gültigen User-IDs"
      });
    }

    console.log(`🗑️ [ADMIN] Bulk deleting ${validIds.length} users...`);

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    const costTrackingCollection = db.collection("cost_tracking");

    const objectIds = validIds.map(id => new ObjectId(id));

    // Get users to check for admins
    const usersToDelete = await usersCollection.find({
      _id: { $in: objectIds },
      role: { $ne: 'admin' } // Exclude admins
    }).toArray();

    const userIdsToDelete = usersToDelete.map(u => u._id.toString());

    if (userIdsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine löschbaren Benutzer gefunden (Admin-Accounts ausgenommen)"
      });
    }

    // Delete contracts
    const contractsResult = await contractsCollection.deleteMany({
      userId: { $in: userIdsToDelete }
    });

    // Delete cost tracking
    const costResult = await costTrackingCollection.deleteMany({
      userId: { $in: userIdsToDelete }
    });

    // Delete users
    const deleteResult = await usersCollection.deleteMany({
      _id: { $in: usersToDelete.map(u => u._id) }
    });

    console.log(`✅ [ADMIN] Bulk delete complete: ${deleteResult.deletedCount} users`);

    res.json({
      success: true,
      message: `${deleteResult.deletedCount} Benutzer erfolgreich gelöscht`,
      deletedData: {
        users: deleteResult.deletedCount,
        contracts: contractsResult.deletedCount,
        costEntries: costResult.deletedCount,
        skippedAdmins: validIds.length - usersToDelete.length
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error bulk deleting users:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Benutzer',
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

    const db = await database.connect();
    const usersCollection = db.collection("users");

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
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

// ===== 🗑️ GET DELETED ACCOUNTS STATS =====
// GET /api/admin/deleted-accounts
// Returns: List of deleted accounts with device info
router.get("/deleted-accounts", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('🗑️ [ADMIN] Fetching deleted accounts...');

    const db = await database.connect();
    const deletedAccountsCollection = db.collection("deleted_accounts");

    // Get all deleted accounts, sorted by deletion date (newest first)
    const deletedAccounts = await deletedAccountsCollection.find()
      .sort({ accountDeletedAt: -1 })
      .limit(100) // Limit to last 100
      .toArray();

    // Statistics
    const totalDeleted = await deletedAccountsCollection.countDocuments();
    const deletedByUser = await deletedAccountsCollection.countDocuments({ deletedBy: 'user' });
    const deletedByAdmin = await deletedAccountsCollection.countDocuments({ deletedBy: 'admin' });

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const deletedLast30Days = await deletedAccountsCollection.countDocuments({
      accountDeletedAt: { $gte: thirtyDaysAgo }
    });

    // Device breakdown
    const deviceBreakdown = await deletedAccountsCollection.aggregate([
      {
        $group: {
          _id: '$registrationDevice.device',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Average account age at deletion
    const avgAgeResult = await deletedAccountsCollection.aggregate([
      {
        $match: { accountAgeInDays: { $ne: null } }
      },
      {
        $group: {
          _id: null,
          avgAge: { $avg: '$accountAgeInDays' }
        }
      }
    ]).toArray();
    const avgAccountAge = avgAgeResult[0]?.avgAge || 0;

    // Plan breakdown at deletion
    const planBreakdown = await deletedAccountsCollection.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({
      success: true,
      stats: {
        total: totalDeleted,
        deletedByUser,
        deletedByAdmin,
        last30Days: deletedLast30Days,
        avgAccountAgeDays: Math.round(avgAccountAge),
        deviceBreakdown: deviceBreakdown.map(d => ({
          device: d._id || 'Unbekannt',
          count: d.count
        })),
        planBreakdown: planBreakdown.map(p => ({
          plan: p._id || 'free',
          count: p.count
        }))
      },
      accounts: deletedAccounts.map(acc => ({
        _id: acc._id.toString(),
        email: acc.email,
        subscriptionPlan: acc.subscriptionPlan,
        betaTester: acc.betaTester,
        analysisCount: acc.analysisCount,
        contractsDeleted: acc.contractsDeleted,
        accountCreatedAt: acc.accountCreatedAt,
        accountDeletedAt: acc.accountDeletedAt,
        accountAgeInDays: acc.accountAgeInDays,
        registrationDevice: acc.registrationDevice,
        lastLoginDevice: acc.lastLoginDevice,
        deletionDevice: acc.deletionDevice,
        deletedBy: acc.deletedBy,
        deletedByAdmin: acc.deletedByAdmin,
        verified: acc.verified
      }))
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching deleted accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der gelöschten Accounts',
      error: error.message
    });
  }
});

// =====================================================
// ===== 🔧 USER MANAGEMENT ACTIONS =====
// =====================================================

// ===== 📝 UPDATE USER PLAN =====
// PUT /api/admin/users/:userId/plan
// Body: { plan: "free" | "business" | "enterprise" | "legendary" }
router.put("/users/:userId/plan", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { plan } = req.body;

    // Validate plan - ✅ KORRIGIERT: "enterprise" statt "premium"
    const validPlans = ['free', 'business', 'enterprise', 'legendary'];
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiger Plan. Erlaubt: ${validPlans.join(', ')}`
      });
    }

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    console.log(`📝 [ADMIN] Updating plan for user ${userId} to ${plan}`);

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    const oldPlan = user.subscriptionPlan || 'free';

    // Update plan and related fields
    // ✅ KORRIGIERT: isPremium = alle bezahlten Pläne (business, enterprise, legendary)
    const updateFields = {
      subscriptionPlan: plan,
      subscriptionStatus: plan === 'free' ? 'inactive' : 'active',
      subscriptionActive: plan !== 'free',
      isPremium: ['business', 'enterprise', 'legendary'].includes(plan),
      isBusiness: plan === 'business',
      isEnterprise: plan === 'enterprise' || plan === 'legendary',
      updatedAt: new Date(),
      updatedBy: req.user.email,
      lastPlanChange: {
        from: oldPlan,
        to: plan,
        changedAt: new Date(),
        changedBy: req.user.email
      }
    };

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );

    console.log(`✅ [ADMIN] Plan updated: ${user.email} (${oldPlan} → ${plan})`);

    res.json({
      success: true,
      message: `Plan für ${user.email} geändert: ${oldPlan} → ${plan}`,
      user: {
        email: user.email,
        oldPlan,
        newPlan: plan
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error updating user plan:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Plans',
      error: error.message
    });
  }
});

// ===== 🔄 RESET USER ANALYSIS COUNT =====
// PUT /api/admin/users/:userId/reset-analysis
router.put("/users/:userId/reset-analysis", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    console.log(`🔄 [ADMIN] Resetting analysis count for user ${userId}`);

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    const previousCount = user.analysisCount || 0;

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          analysisCount: 0,
          optimizationCount: 0,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ [ADMIN] Reset counts for ${user.email}: ${previousCount} → 0`);

    res.json({
      success: true,
      message: `Zähler für ${user.email} zurückgesetzt`,
      user: {
        email: user.email,
        previousAnalysisCount: previousCount,
        newAnalysisCount: 0
      }
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

// ===== ✅ VERIFY USER =====
// PUT /api/admin/users/:userId/verify
router.put("/users/:userId/verify", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    console.log(`✅ [ADMIN] Verifying user ${userId}`);

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    if (user.verified === true) {
      return res.json({
        success: true,
        message: `${user.email} ist bereits verifiziert`,
        alreadyVerified: true
      });
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: req.user.email,
          updatedAt: new Date()
        },
        $unset: {
          verificationToken: "",
          verificationTokenExpires: ""
        }
      }
    );

    console.log(`✅ [ADMIN] User verified: ${user.email}`);

    res.json({
      success: true,
      message: `${user.email} wurde verifiziert`,
      user: {
        email: user.email,
        verified: true
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error verifying user:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verifizieren',
      error: error.message
    });
  }
});

// ===== 🔒 SUSPEND/UNSUSPEND USER =====
// PUT /api/admin/users/:userId/suspend
// Body: { suspended: true/false, reason?: string }
router.put("/users/:userId/suspend", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspended, reason } = req.body;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "suspended muss true oder false sein"
      });
    }

    console.log(`🔒 [ADMIN] ${suspended ? 'Suspending' : 'Unsuspending'} user ${userId}`);

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Don't allow suspending admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin-Accounts können nicht gesperrt werden"
      });
    }

    const updateData = {
      suspended: suspended,
      updatedAt: new Date()
    };

    if (suspended) {
      updateData.suspendedAt = new Date();
      updateData.suspendedBy = req.user.email;
      updateData.suspendReason = reason || 'Kein Grund angegeben';
    } else {
      updateData.unsuspendedAt = new Date();
      updateData.unsuspendedBy = req.user.email;
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    // 📋 Activity Log: User gesperrt/entsperrt
    try {
      const { logActivity, ActivityTypes } = require('../services/activityLogger');
      await logActivity(db, {
        type: suspended ? ActivityTypes.USER_SUSPENDED : ActivityTypes.USER_UNSUSPENDED,
        userId: userId,
        userEmail: user.email,
        description: `User ${suspended ? 'gesperrt' : 'entsperrt'} von Admin: ${user.email}`,
        details: {
          suspendedBy: req.user.email,
          reason: suspended ? (reason || 'Kein Grund angegeben') : null
        },
        severity: 'warning',
        source: 'admin'
      });
    } catch (logErr) {
      console.error("Activity Log Error:", logErr);
    }

    console.log(`✅ [ADMIN] User ${suspended ? 'suspended' : 'unsuspended'}: ${user.email}`);

    res.json({
      success: true,
      message: `${user.email} wurde ${suspended ? 'gesperrt' : 'entsperrt'}`,
      user: {
        email: user.email,
        suspended: suspended,
        reason: suspended ? (reason || 'Kein Grund angegeben') : null
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error suspending user:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Sperren/Entsperren',
      error: error.message
    });
  }
});

// ===== 📧 SEND PASSWORD RESET EMAIL =====
// POST /api/admin/users/:userId/send-reset
router.post("/users/:userId/send-reset", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    console.log(`📧 [ADMIN] Sending password reset for user ${userId}`);

    const crypto = require("crypto");
    const db = await database.connect();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          resetToken,
          resetTokenExpires,
          updatedAt: new Date()
        }
      }
    );

    // Send email
    const sendEmail = require("../utils/sendEmail");
    const { generateEmailTemplate } = require("../utils/emailTemplate");

    const resetLink = `https://www.contract-ai.de/reset-password?token=${resetToken}`;

    const emailHtml = generateEmailTemplate({
      title: "Passwort zurücksetzen",
      preheader: "Link zum Zurücksetzen Ihres Passworts",
      body: `
        <p style="text-align: center; margin-bottom: 25px;">
          Ein Administrator hat einen Passwort-Reset für Ihr Konto angefordert.
        </p>
        <p style="text-align: center; margin-bottom: 25px;">
          Klicken Sie auf den Button unten, um ein neues Passwort zu setzen:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Passwort zurücksetzen
          </a>
        </div>
        <p style="text-align: center; font-size: 14px; color: #64748b;">
          Dieser Link ist 1 Stunde gültig.
        </p>
      `
    });

    await sendEmail({
      to: user.email,
      subject: "Passwort zurücksetzen - Contract AI",
      html: emailHtml
    });

    console.log(`✅ [ADMIN] Password reset email sent to: ${user.email}`);

    res.json({
      success: true,
      message: `Passwort-Reset-E-Mail an ${user.email} gesendet`,
      user: {
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error sending password reset:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Reset-E-Mail',
      error: error.message
    });
  }
});

// ===== 👤 GET SINGLE USER DETAILS =====
// GET /api/admin/users/:userId
router.get("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige User-ID"
      });
    }

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    const costTrackingCollection = db.collection("cost_tracking");

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Get contract count
    const contractCount = await contractsCollection.countDocuments({ userId: userId });

    // Get cost data for this user (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const costData = await costTrackingCollection.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          totalCalls: { $sum: 1 },
          totalTokens: { $sum: { $add: ["$promptTokens", "$completionTokens"] } }
        }
      }
    ]).toArray();

    // Build response (exclude password!)
    const userDetails = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
      verified: user.verified || false,
      suspended: user.suspended || false,
      suspendReason: user.suspendReason || null,
      subscriptionPlan: user.subscriptionPlan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'inactive',
      subscriptionActive: user.subscriptionActive || false,
      isPremium: user.isPremium || false,
      betaTester: user.betaTester || false,
      betaExpiresAt: user.betaExpiresAt || null,
      analysisCount: user.analysisCount || 0,
      optimizationCount: user.optimizationCount || 0,
      contractCount: contractCount,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null,
      registrationDevice: user.registrationDevice || null,
      lastLoginDevice: user.lastLoginDevice || null,
      lastPlanChange: user.lastPlanChange || null,
      costThisMonth: costData[0] || { totalCost: 0, totalCalls: 0, totalTokens: 0 }
    };

    res.json({
      success: true,
      user: userDetails
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der User-Details',
      error: error.message
    });
  }
});

// ==================================
// 📋 ACTIVITY LOG ENDPOINTS
// ==================================

// GET /api/admin/activity-log - Get recent activities
router.get('/activity-log', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { limit = 50, type, severity, userId, startDate, endDate } = req.query;

    const db = await database.connect();

    const { getRecentActivities, getActivityStats } = require('../services/activityLogger');

    const activities = await getRecentActivities(db, {
      limit: parseInt(limit),
      type: type || null,
      severity: severity || null,
      userId: userId || null,
      startDate: startDate || null,
      endDate: endDate || null
    });

    const stats = await getActivityStats(db, 24);

    res.json({
      success: true,
      activities,
      stats
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching activity log:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Activity Logs',
      error: error.message
    });
  }
});

// ==================================
// 📊 ADMIN NOTIFICATION ENDPOINTS
// ==================================

// POST /api/admin/send-daily-summary - Manuell Daily Summary senden
router.post('/send-daily-summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('📊 [ADMIN] Manueller Daily Summary Request...');

    const { sendDailyAdminSummary } = require('../services/adminNotificationService');
    const result = await sendDailyAdminSummary();

    res.json({
      success: true,
      message: 'Daily Summary E-Mail wurde gesendet',
      ...result
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error sending daily summary:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden des Daily Summary',
      error: error.message
    });
  }
});

// POST /api/admin/send-weekly-summary - Manuell Weekly Summary senden
router.post('/send-weekly-summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('📊 [ADMIN] Manueller Weekly Summary Request...');

    const { sendWeeklyAdminSummary } = require('../services/adminNotificationService');
    const result = await sendWeeklyAdminSummary();

    res.json({
      success: true,
      message: 'Weekly Summary E-Mail wurde gesendet',
      ...result
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error sending weekly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden des Weekly Summary',
      error: error.message
    });
  }
});

// ===== 💰 GET FINANCE STATISTICS =====
// GET /api/admin/finance-stats
// Returns: Monthly revenue, costs, refunds, churn rate, MRR
router.get("/finance-stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('💰 [ADMIN] Fetching finance statistics...');

    const db = await database.connect();
    const usersCollection = db.collection("users");
    const costTrackingCollection = db.collection("cost_tracking");

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // ===== STRIPE DATA (source of truth for all revenue) =====
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // Fetch all paid Stripe invoices (auto-paginate, up to 300)
    const stripeInvoices = [];
    let hasMore = true;
    let startingAfter = undefined;
    while (hasMore && stripeInvoices.length < 300) {
      const params = { status: 'paid', limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripe.invoices.list(params);
      stripeInvoices.push(...batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
    }

    // ===== A) MONTHLY REVENUE from Stripe (last 12 months) =====
    const revenueByMonth = {};
    for (const inv of stripeInvoices) {
      const amount = (inv.amount_paid || 0) / 100;
      if (amount <= 0) continue; // Skip $0 test/trial invoices
      const paidAt = inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : new Date(inv.created * 1000);
      if (paidAt < twelveMonthsAgo) continue;
      const month = paidAt.toISOString().slice(0, 7);

      // Detect plan from line items
      const lineDesc = (inv.lines?.data?.[0]?.description || '').toLowerCase();
      const isBusiness = lineDesc.includes('business');
      const isEnterprise = lineDesc.includes('enterprise') || lineDesc.includes('premium');

      if (!revenueByMonth[month]) {
        revenueByMonth[month] = { revenue: 0, count: 0, business: 0, enterprise: 0 };
      }
      revenueByMonth[month].revenue += amount;
      revenueByMonth[month].count += 1;
      if (isBusiness) revenueByMonth[month].business += 1;
      if (isEnterprise) revenueByMonth[month].enterprise += 1;
    }

    const monthlyRevenue = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: parseFloat(data.revenue.toFixed(2)),
        count: data.count,
        byPlan: { business: data.business, enterprise: data.enterprise }
      }));

    // ===== B) MONTHLY COSTS from cost_tracking (last 12 months) =====
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().slice(0, 7); // "YYYY-MM"
    const costsAgg = await costTrackingCollection.aggregate([
      {
        $match: {
          date: { $gte: twelveMonthsAgoStr + "-01" }
        }
      },
      {
        $group: {
          _id: { $substr: ["$date", 0, 7] },
          cost: { $sum: "$totalCost" },
          calls: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const monthlyCosts = costsAgg.map(c => ({
      month: c._id,
      cost: parseFloat((c.cost || 0).toFixed(2)),
      calls: c.calls
    }));

    // ===== C) REFUND DATA from refundfeedbacks (Mongoose) =====
    const RefundFeedback = require("../models/RefundFeedback");

    // Monthly refunds
    const refundedItems = await RefundFeedback.find({ status: "refunded" })
      .sort({ refundedAt: -1 })
      .lean();

    // Group refunds by month
    const refundsByMonth = {};
    let refundTotal = 0;
    let refundCount = 0;

    refundedItems.forEach(item => {
      const refundDate = item.refundedAt || item.submittedAt || item.createdAt;
      if (refundDate) {
        const month = new Date(refundDate).toISOString().slice(0, 7);
        if (!refundsByMonth[month]) {
          refundsByMonth[month] = { total: 0, count: 0 };
        }
        refundsByMonth[month].total += item.refundAmount || 0;
        refundsByMonth[month].count += 1;
      }
      refundTotal += item.refundAmount || 0;
      refundCount += 1;
    });

    const monthlyRefunds = Object.entries(refundsByMonth)
      .map(([month, data]) => ({
        month,
        total: parseFloat(data.total.toFixed(2)),
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const refundAvg = refundCount > 0 ? parseFloat((refundTotal / refundCount).toFixed(2)) : 0;

    // Last 50 refunds for the table
    const refundList = refundedItems.slice(0, 50).map(item => ({
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      refundAmount: item.refundAmount || 0,
      refundedAt: item.refundedAt,
      refundNote: item.refundNote || "",
      subscriptionPlan: item.subscriptionPlan || ""
    }));

    // ===== D) CHURN RATE from users =====
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Currently paying users
    const paidUsers = await usersCollection.countDocuments({
      subscriptionPlan: { $in: ["business", "enterprise", "premium", "legendary"] }
    });

    // Canceled this month (users with canceledAt in current month)
    const canceledThisMonth = await usersCollection.countDocuments({
      canceledAt: { $gte: currentMonthStart, $lte: now }
    });

    // Canceled last month
    const canceledLastMonth = await usersCollection.countDocuments({
      canceledAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    const currentChurnRate = paidUsers > 0 ? parseFloat(((canceledThisMonth / paidUsers) * 100).toFixed(1)) : 0;
    const lastChurnRate = paidUsers > 0 ? parseFloat(((canceledLastMonth / paidUsers) * 100).toFixed(1)) : 0;

    let churnTrend = "stable";
    if (currentChurnRate > lastChurnRate) churnTrend = "up";
    else if (currentChurnRate < lastChurnRate) churnTrend = "down";

    // ===== E) REVENUE PER USER (from Stripe — only real payments > 0) =====
    const customerMap = {};
    for (const inv of stripeInvoices) {
      const amount = (inv.amount_paid || 0) / 100;
      // Skip $0 invoices — test/trial, no real money
      if (amount <= 0) continue;

      const email = inv.customer_email || 'unknown';
      if (!customerMap[email]) {
        customerMap[email] = {
          email,
          customerName: inv.customer_name || email,
          totalRevenue: 0,
          invoiceCount: 0,
          firstPayment: null,
          lastPayment: null
        };
      }
      const c = customerMap[email];
      const paidAt = inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : new Date(inv.created * 1000);
      c.totalRevenue += amount;
      c.invoiceCount += 1;
      if (!c.firstPayment || paidAt < c.firstPayment) c.firstPayment = paidAt;
      if (!c.lastPayment || paidAt > c.lastPayment) c.lastPayment = paidAt;
    }

    // Get ACTIVE subscriptions from Stripe (the only source of truth)
    const activeSubscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100
    });
    // Build set of emails with active Stripe subscriptions
    const activeStripeEmails = new Set();
    for (const sub of activeSubscriptions.data) {
      try {
        const customer = await stripe.customers.retrieve(sub.customer);
        if (customer.email) activeStripeEmails.add(customer.email.toLowerCase());
      } catch (e) { /* skip deleted customers */ }
    }

    // Lookup canceledAt from MongoDB for display
    const customerEmails = Object.keys(customerMap);
    const customerUsers = await usersCollection.find(
      { email: { $in: customerEmails } },
      { projection: { email: 1, subscriptionPlan: 1, canceledAt: 1 } }
    ).toArray();
    const userStatusMap = {};
    customerUsers.forEach(u => { userStatusMap[u.email] = u; });

    const revenuePerUser = Object.values(customerMap).map(c => {
      const userInfo = userStatusMap[c.email] || {};
      const isActive = activeStripeEmails.has(c.email.toLowerCase());
      return {
        email: c.email,
        customerName: c.customerName,
        currentPlan: userInfo.subscriptionPlan || "unknown",
        status: isActive ? "active" : "canceled",
        canceledAt: userInfo.canceledAt || null,
        totalRevenue: parseFloat(c.totalRevenue.toFixed(2)),
        invoiceCount: c.invoiceCount,
        firstPayment: c.firstPayment,
        lastPayment: c.lastPayment
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // ===== F) CURRENT MRR =====
    const businessUsers = await usersCollection.countDocuments({ subscriptionPlan: "business" });
    const enterpriseUsers = await usersCollection.countDocuments({
      subscriptionPlan: { $in: ["enterprise", "premium"] }
    });
    const currentMRR = (businessUsers * 19) + (enterpriseUsers * 29);

    // ===== RESPONSE =====
    res.json({
      success: true,
      monthlyRevenue,
      monthlyCosts,
      monthlyRefunds,
      refunds: {
        total: parseFloat(refundTotal.toFixed(2)),
        count: refundCount,
        avg: refundAvg,
        list: refundList
      },
      churn: {
        currentMonth: {
          canceled: canceledThisMonth,
          paidUsers,
          rate: currentChurnRate
        },
        lastMonth: {
          canceled: canceledLastMonth,
          rate: lastChurnRate
        },
        trend: churnTrend
      },
      currentMRR,
      revenuePerUser
    });

    console.log('✅ [ADMIN] Finance statistics compiled successfully');

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching finance statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Finanz-Statistiken',
      error: error.message
    });
  }
});

module.exports = router;

// services/activityLogger.js
// Admin Activity Logger - Logs important system events for admin monitoring

const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

/**
 * Activity Types for categorization
 */
const ActivityTypes = {
  USER_REGISTERED: 'user_registered',
  USER_VERIFIED: 'user_verified',
  USER_LOGIN: 'user_login',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_UNSUSPENDED: 'user_unsuspended',
  PLAN_CHANGED: 'plan_changed',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  CONTRACT_ANALYZED: 'contract_analyzed',
  CONTRACT_OPTIMIZED: 'contract_optimized',
  CONTRACT_GENERATED: 'contract_generated',
  CONTRACT_DELETED: 'contract_deleted',
  API_LIMIT_REACHED: 'api_limit_reached',
  ERROR_CRITICAL: 'error_critical',
  ADMIN_ACTION: 'admin_action',
  SYSTEM_EVENT: 'system_event',
  // Team Management
  TEAM_MEMBER_INVITED: 'team_member_invited',
  TEAM_MEMBER_JOINED: 'team_member_joined',
  TEAM_ROLE_CHANGED: 'team_role_changed',
  TEAM_MEMBER_REMOVED: 'team_member_removed',
  TEAM_INVITE_CANCELLED: 'team_invite_cancelled'
};

/**
 * Log an activity to the database
 * @param {Object} db - MongoDB database instance
 * @param {Object} activity - Activity details
 */
async function logActivity(db, activity) {
  try {
    const activityLog = {
      type: activity.type,
      userId: activity.userId || null,
      userEmail: activity.userEmail || null,
      description: activity.description,
      details: activity.details || {},
      metadata: {
        ip: activity.ip || null,
        userAgent: activity.userAgent || null,
        source: activity.source || 'system'
      },
      severity: activity.severity || 'info', // info, warning, error, critical
      createdAt: new Date()
    };

    await db.collection("admin_activity_log").insertOne(activityLog);

    // For critical events, log to console as well
    if (activity.severity === 'critical' || activity.severity === 'error') {
      console.log(`⚠️ [ACTIVITY] ${activity.type}: ${activity.description}`);
    }

    return true;
  } catch (error) {
    console.error("❌ Activity Logger Error:", error);
    return false;
  }
}

/**
 * Standalone function to log activity (creates own DB connection)
 * Use this when you don't have a db instance available
 */
async function logActivityStandalone(activity) {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    return await logActivity(db, activity);
  } catch (error) {
    console.error("❌ Activity Logger Standalone Error:", error);
    return false;
  } finally {
    await client.close();
  }
}

/**
 * Get recent activities for admin dashboard
 * @param {Object} db - MongoDB database instance
 * @param {Object} options - Query options (limit, type, severity, dateRange)
 */
async function getRecentActivities(db, options = {}) {
  try {
    const {
      limit = 50,
      type = null,
      severity = null,
      userId = null,
      startDate = null,
      endDate = null
    } = options;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (severity) {
      query.severity = severity;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const activities = await db.collection("admin_activity_log")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return activities;
  } catch (error) {
    console.error("❌ Get Activities Error:", error);
    return [];
  }
}

/**
 * Get activity statistics for dashboard
 */
async function getActivityStats(db, hoursBack = 24) {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hoursBack);

    const stats = await db.collection("admin_activity_log").aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

    // Get severity breakdown
    const severityStats = await db.collection("admin_activity_log").aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    return {
      totalActivities: totalCount,
      byType: stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      bySeverity: severityStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      timeRange: `${hoursBack} Stunden`
    };
  } catch (error) {
    console.error("❌ Get Activity Stats Error:", error);
    return { totalActivities: 0, byType: {}, bySeverity: {}, timeRange: `${hoursBack} Stunden` };
  }
}

/**
 * Clean up old activity logs (keep last 30 days)
 */
async function cleanupOldLogs(db, daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.collection("admin_activity_log").deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Activity Log Cleanup: ${result.deletedCount} alte Einträge gelöscht`);
    return result.deletedCount;
  } catch (error) {
    console.error("❌ Activity Log Cleanup Error:", error);
    return 0;
  }
}

module.exports = {
  ActivityTypes,
  logActivity,
  logActivityStandalone,
  getRecentActivities,
  getActivityStats,
  cleanupOldLogs
};

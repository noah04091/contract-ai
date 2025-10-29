// 📬 services/notificationQueue.js - Smart Notification Queue System
const { ObjectId } = require("mongodb");

/**
 * 📬 NOTIFICATION QUEUE
 *
 * Workflow:
 * 1. Cron-Job (1:00 Uhr) → Status-Update → Notifications in Queue
 * 2. Cron-Job (9:00 Uhr) → Queue abarbeiten → E-Mails versenden
 *
 * Logik:
 * - 1-5 Notifications: Separate E-Mails mit 2-3 Min Pause
 * - 6+ Notifications: EINE gruppierte E-Mail
 */

/**
 * Fügt Notification zur Queue hinzu
 */
async function queueNotification(db, {
  userId,
  contractId,
  type, // 'bald_ablaufend', 'abgelaufen', 'auto_renewed'
  oldStatus,
  newStatus,
  metadata = {}
}) {
  try {
    const notificationDoc = {
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId),
      type,
      oldStatus,
      newStatus,
      metadata,
      status: 'pending', // 'pending', 'sent', 'failed'
      createdAt: new Date(),
      scheduledFor: getScheduledTime(), // Nächster 9:00 Uhr Slot
      attempts: 0,
      lastError: null
    };

    const result = await db.collection("notification_queue").insertOne(notificationDoc);

    console.log(`📬 Notification in Queue: ${type} für Contract ${contractId}`);
    return result.insertedId;

  } catch (error) {
    console.error("❌ Fehler beim Queuen der Notification:", error);
    throw error;
  }
}

/**
 * Berechnet nächsten 9:00 Uhr Zeitpunkt
 */
function getScheduledTime() {
  const now = new Date();
  const scheduled = new Date(now);

  scheduled.setHours(9, 0, 0, 0); // 9:00 Uhr

  // Wenn es schon nach 9 Uhr ist, dann morgen 9 Uhr
  if (now.getHours() >= 9) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

/**
 * Holt alle pending Notifications für User (gruppiert nach User)
 */
async function getPendingNotifications(db) {
  try {
    const now = new Date();

    // Hole alle pending Notifications die fällig sind
    const notifications = await db.collection("notification_queue")
      .find({
        status: 'pending',
        scheduledFor: { $lte: now }
      })
      .sort({ userId: 1, createdAt: 1 }) // Gruppiert nach User
      .toArray();

    // Gruppiere nach User
    const groupedByUser = {};

    for (const notification of notifications) {
      const userId = notification.userId.toString();
      if (!groupedByUser[userId]) {
        groupedByUser[userId] = [];
      }
      groupedByUser[userId].push(notification);
    }

    console.log(`📊 Pending Notifications: ${notifications.length} für ${Object.keys(groupedByUser).length} User`);

    return groupedByUser;

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Notifications:", error);
    throw error;
  }
}

/**
 * Markiert Notification als versendet
 */
async function markAsSent(db, notificationId) {
  try {
    await db.collection("notification_queue").updateOne(
      { _id: new ObjectId(notificationId) },
      {
        $set: {
          status: 'sent',
          sentAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error("❌ Fehler beim Markieren als sent:", error);
  }
}

/**
 * Markiert Notification als fehlgeschlagen
 */
async function markAsFailed(db, notificationId, error) {
  try {
    await db.collection("notification_queue").updateOne(
      { _id: new ObjectId(notificationId) },
      {
        $set: {
          status: 'failed',
          lastError: error.message,
          failedAt: new Date()
        },
        $inc: { attempts: 1 }
      }
    );
  } catch (err) {
    console.error("❌ Fehler beim Markieren als failed:", err);
  }
}

/**
 * Retry fehlgeschlagener Notifications (max 3 Versuche)
 */
async function retryFailedNotifications(db) {
  try {
    const failed = await db.collection("notification_queue")
      .find({
        status: 'failed',
        attempts: { $lt: 3 }
      })
      .toArray();

    if (failed.length > 0) {
      console.log(`🔄 Retry für ${failed.length} fehlgeschlagene Notifications`);

      for (const notification of failed) {
        await db.collection("notification_queue").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: 'pending',
              scheduledFor: new Date() // Sofort erneut versuchen
            }
          }
        );
      }
    }

    return failed.length;

  } catch (error) {
    console.error("❌ Fehler beim Retry:", error);
    return 0;
  }
}

/**
 * Cleanup: Alte versendete Notifications löschen (älter als 30 Tage)
 */
async function cleanupOldNotifications(db) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.collection("notification_queue").deleteMany({
      status: 'sent',
      sentAt: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ ${result.deletedCount} alte Notifications gelöscht`);
    }

    return result.deletedCount;

  } catch (error) {
    console.error("❌ Fehler beim Cleanup:", error);
    return 0;
  }
}

/**
 * Statistiken über Queue
 */
async function getQueueStats(db) {
  try {
    const stats = await db.collection("notification_queue").aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const statsObj = {
      pending: 0,
      sent: 0,
      failed: 0
    };

    stats.forEach(s => {
      statsObj[s._id] = s.count;
    });

    return statsObj;

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Stats:", error);
    return { pending: 0, sent: 0, failed: 0 };
  }
}

module.exports = {
  queueNotification,
  getPendingNotifications,
  markAsSent,
  markAsFailed,
  retryFailedNotifications,
  cleanupOldNotifications,
  getQueueStats,
  getScheduledTime
};

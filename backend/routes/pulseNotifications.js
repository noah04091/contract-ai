// 📁 backend/routes/pulseNotifications.js
// Legal Pulse 2.0 Phase 2 - Notification API Routes

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const PulseNotification = require("../models/PulseNotification");
const { getInstance: getNotificationService } = require("../services/pulseNotificationService");

/**
 * GET /api/pulse-notifications
 * Get all notifications for current user
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
      query.dismissed = false;
    }

    const notifications = await PulseNotification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benachrichtigungen',
      error: error.message
    });
  }
});

/**
 * GET /api/pulse-notifications/stats
 * Get notification statistics for current user
 */
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await PulseNotification.getStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
});

/**
 * GET /api/pulse-notifications/unread
 * Get unread notifications for current user
 */
router.get("/unread", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20 } = req.query;

    const notifications = await PulseNotification.getUnreadForUser(userId, parseInt(limit));

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error fetching unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der ungelesenen Benachrichtigungen',
      error: error.message
    });
  }
});

/**
 * GET /api/pulse-notifications/:id
 * Get single notification
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await PulseNotification.findOne({
      _id: id,
      userId
    }).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Benachrichtigung nicht gefunden'
      });
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benachrichtigung',
      error: error.message
    });
  }
});

/**
 * PATCH /api/pulse-notifications/:id/read
 * Mark notification as read
 */
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await PulseNotification.findOne({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Benachrichtigung nicht gefunden'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Benachrichtigung als gelesen markiert',
      notification
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren',
      error: error.message
    });
  }
});

/**
 * PATCH /api/pulse-notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch("/mark-all-read", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await PulseNotification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'Alle Benachrichtigungen als gelesen markiert',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren',
      error: error.message
    });
  }
});

/**
 * PATCH /api/pulse-notifications/:id/dismiss
 * Dismiss notification
 */
router.patch("/:id/dismiss", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await PulseNotification.findOne({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Benachrichtigung nicht gefunden'
      });
    }

    await notification.dismiss();

    res.json({
      success: true,
      message: 'Benachrichtigung verworfen',
      notification
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verwerfen',
      error: error.message
    });
  }
});

/**
 * PATCH /api/pulse-notifications/:id/action-taken
 * Mark action as taken
 */
router.patch("/:id/action-taken", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { result = null } = req.body;

    const notification = await PulseNotification.findOne({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Benachrichtigung nicht gefunden'
      });
    }

    await notification.markActionTaken(result);

    res.json({
      success: true,
      message: 'Aktion als ausgeführt markiert',
      notification
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error marking action taken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren',
      error: error.message
    });
  }
});

/**
 * DELETE /api/pulse-notifications/:id
 * Delete notification
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await PulseNotification.deleteOne({
      _id: id,
      userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benachrichtigung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Benachrichtigung gelöscht'
    });

  } catch (error) {
    console.error('[PULSE-NOTIFICATIONS] Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen',
      error: error.message
    });
  }
});

module.exports = router;

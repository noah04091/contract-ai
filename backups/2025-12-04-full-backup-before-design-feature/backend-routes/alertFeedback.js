// 📁 backend/routes/alertFeedback.js
// Alert Feedback System - Thumbs Up/Down for Alert Relevance

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

// 🔗 Collections werden dynamisch übergeben
let feedbackCollection;
let notificationsCollection;
let usersCollection;

module.exports = (db) => {
  feedbackCollection = db.collection("alert_feedback");
  notificationsCollection = db.collection("pulse_notifications");
  usersCollection = db.collection("users");
  return router;
};

/**
 * 📝 Submit feedback for an alert
 * POST /api/alert-feedback
 * Body: { alertId, rating: 'helpful' | 'not_helpful', comment? }
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { alertId, rating, comment } = req.body;

    // Validation
    if (!alertId) {
      return res.status(400).json({
        success: false,
        message: "Alert ID ist erforderlich"
      });
    }

    if (!['helpful', 'not_helpful'].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: "Rating muss 'helpful' oder 'not_helpful' sein"
      });
    }

    // Check if alert exists and belongs to user
    const alert = await notificationsCollection.findOne({
      _id: new ObjectId(alertId)
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert nicht gefunden"
      });
    }

    // Verify alert belongs to this user
    if (alert.userId !== req.user.userId && alert.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Keine Berechtigung für diesen Alert"
      });
    }

    // Check if feedback already exists
    const existingFeedback = await feedbackCollection.findOne({
      alertId: new ObjectId(alertId),
      userId: new ObjectId(req.user.userId)
    });

    if (existingFeedback) {
      // Update existing feedback
      await feedbackCollection.updateOne(
        { _id: existingFeedback._id },
        {
          $set: {
            rating,
            comment: comment || null,
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Feedback updated for alert ${alertId}: ${rating}`);

      return res.json({
        success: true,
        message: "Feedback aktualisiert",
        feedbackId: existingFeedback._id
      });
    }

    // Create new feedback
    const feedback = {
      alertId: new ObjectId(alertId),
      userId: new ObjectId(req.user.userId),
      contractId: alert.contractId,
      lawId: alert.lawId,
      rating, // 'helpful' or 'not_helpful'
      comment: comment || null,
      alertScore: alert.score, // Store original similarity score
      lawArea: alert.lawArea || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await feedbackCollection.insertOne(feedback);

    console.log(`✅ Feedback submitted for alert ${alertId}: ${rating}`);

    res.json({
      success: true,
      message: "Feedback erfolgreich gespeichert",
      feedbackId: result.insertedId
    });

  } catch (error) {
    console.error("❌ Fehler beim Speichern des Feedbacks:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler beim Speichern des Feedbacks",
      error: error.message
    });
  }
});

/**
 * 📊 Get feedback statistics (Admin/Analytics)
 * GET /api/alert-feedback/stats
 */
router.get("/stats", verifyToken, async (req, res) => {
  try {
    // Basic stats
    const totalFeedback = await feedbackCollection.countDocuments();
    const helpfulCount = await feedbackCollection.countDocuments({ rating: 'helpful' });
    const notHelpfulCount = await feedbackCollection.countDocuments({ rating: 'not_helpful' });

    // Feedback with comments
    const withComments = await feedbackCollection.countDocuments({
      comment: { $exists: true, $ne: null, $ne: '' }
    });

    // Average score for helpful vs not helpful
    const helpfulScores = await feedbackCollection.aggregate([
      { $match: { rating: 'helpful' } },
      { $group: { _id: null, avgScore: { $avg: '$alertScore' } } }
    ]).toArray();

    const notHelpfulScores = await feedbackCollection.aggregate([
      { $match: { rating: 'not_helpful' } },
      { $group: { _id: null, avgScore: { $avg: '$alertScore' } } }
    ]).toArray();

    // Feedback by law area
    const byArea = await feedbackCollection.aggregate([
      { $match: { lawArea: { $exists: true, $ne: null } } },
      { $group: {
        _id: '$lawArea',
        total: { $sum: 1 },
        helpful: {
          $sum: { $cond: [{ $eq: ['$rating', 'helpful'] }, 1, 0] }
        },
        notHelpful: {
          $sum: { $cond: [{ $eq: ['$rating', 'not_helpful'] }, 1, 0] }
        }
      }},
      { $sort: { total: -1 } }
    ]).toArray();

    // Recent feedback with comments
    const recentComments = await feedbackCollection.find({
      comment: { $exists: true, $ne: null, $ne: '' }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    res.json({
      success: true,
      stats: {
        total: totalFeedback,
        helpful: helpfulCount,
        notHelpful: notHelpfulCount,
        helpfulRate: totalFeedback > 0 ? (helpfulCount / totalFeedback * 100).toFixed(1) : 0,
        withComments,
        avgScoreHelpful: helpfulScores[0]?.avgScore?.toFixed(3) || null,
        avgScoreNotHelpful: notHelpfulScores[0]?.avgScore?.toFixed(3) || null,
        byArea: byArea.map(area => ({
          area: area._id,
          total: area.total,
          helpful: area.helpful,
          notHelpful: area.notHelpful,
          helpfulRate: area.total > 0 ? (area.helpful / area.total * 100).toFixed(1) : 0
        })),
        recentComments: recentComments.map(fb => ({
          rating: fb.rating,
          comment: fb.comment,
          score: fb.alertScore,
          createdAt: fb.createdAt
        }))
      }
    });

  } catch (error) {
    console.error("❌ Fehler beim Laden der Feedback-Statistiken:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler beim Laden der Statistiken",
      error: error.message
    });
  }
});

/**
 * 📋 Get user's own feedback history
 * GET /api/alert-feedback/my-feedback
 */
router.get("/my-feedback", verifyToken, async (req, res) => {
  try {
    const feedback = await feedbackCollection.find({
      userId: new ObjectId(req.user.userId)
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Enrich with alert details
    const enriched = await Promise.all(feedback.map(async (fb) => {
      const alert = await notificationsCollection.findOne({
        _id: fb.alertId
      });

      return {
        feedbackId: fb._id,
        rating: fb.rating,
        comment: fb.comment,
        score: fb.alertScore,
        createdAt: fb.createdAt,
        alert: alert ? {
          title: alert.lawTitle,
          contractId: alert.contractId,
          contractName: alert.contractName
        } : null
      };
    }));

    res.json({
      success: true,
      feedback: enriched
    });

  } catch (error) {
    console.error("❌ Fehler beim Laden des Feedbacks:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler beim Laden des Feedbacks",
      error: error.message
    });
  }
});

/**
 * 🗑️ Delete feedback
 * DELETE /api/alert-feedback/:feedbackId
 */
router.delete("/:feedbackId", verifyToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;

    if (!ObjectId.isValid(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Feedback-ID"
      });
    }

    // Check ownership
    const feedback = await feedbackCollection.findOne({
      _id: new ObjectId(feedbackId)
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback nicht gefunden"
      });
    }

    if (feedback.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Keine Berechtigung"
      });
    }

    await feedbackCollection.deleteOne({ _id: new ObjectId(feedbackId) });

    console.log(`✅ Feedback ${feedbackId} gelöscht`);

    res.json({
      success: true,
      message: "Feedback gelöscht"
    });

  } catch (error) {
    console.error("❌ Fehler beim Löschen des Feedbacks:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler beim Löschen",
      error: error.message
    });
  }
});

module.exports = router;

// 📁 backend/routes/publicFeedback.js
// Public Feedback Handler (No Auth Required - for Email Links)

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

let feedbackCollection;
let notificationsCollection;

module.exports = (db) => {
  feedbackCollection = db.collection("alert_feedback");
  notificationsCollection = db.collection("pulse_notifications");
  return router;
};

/**
 * 👍 Public feedback handler - Helpful
 * GET /feedback/helpful/:alertId
 */
router.get("/helpful/:alertId", async (req, res) => {
  try {
    const { alertId } = req.params;

    if (!ObjectId.isValid(alertId)) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ungültige ID</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f3f4f6; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; margin: 0 0 16px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Ungültige Alert-ID</h1>
            <p>Die Feedback-ID ist ungültig. Bitte verwenden Sie den Link aus Ihrer E-Mail.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if alert exists
    const alert = await notificationsCollection.findOne({
      _id: new ObjectId(alertId)
    });

    if (!alert) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Alert nicht gefunden</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f3f4f6; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; margin: 0 0 16px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Alert nicht gefunden</h1>
            <p>Diese Benachrichtigung existiert nicht mehr oder wurde bereits gelöscht.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if feedback already exists
    const existingFeedback = await feedbackCollection.findOne({
      alertId: new ObjectId(alertId)
    });

    if (existingFeedback) {
      // Update existing feedback
      await feedbackCollection.updateOne(
        { _id: existingFeedback._id },
        {
          $set: {
            rating: 'helpful',
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Create new feedback
      await feedbackCollection.insertOne({
        alertId: new ObjectId(alertId),
        userId: alert.userId,
        contractId: alert.contractId,
        lawId: alert.lawId,
        rating: 'helpful',
        comment: null,
        alertScore: alert.score,
        lawArea: alert.lawArea || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`✅ Public feedback: helpful for alert ${alertId}`);

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vielen Dank für Ihr Feedback!</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; }
          .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
          h1 { color: #10b981; margin: 0 0 16px; font-size: 32px; }
          p { color: #6b7280; line-height: 1.8; font-size: 16px; }
          .emoji { font-size: 64px; margin-bottom: 20px; }
          .button { display: inline-block; margin-top: 24px; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .button:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="emoji">👍</div>
          <h1>Vielen Dank für Ihr Feedback!</h1>
          <p>Ihre positive Bewertung hilft uns, die Qualität unserer Legal Pulse Benachrichtigungen zu verbessern.</p>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 24px;">Wir arbeiten kontinuierlich daran, nur die relevantesten Gesetzesänderungen für Ihre Verträge zu erkennen.</p>
          <a href="https://www.contract-ai.de/legal-pulse" class="button">Zurück zu Contract AI</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("❌ Fehler bei public feedback (helpful):", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fehler</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f3f4f6; }
          .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { color: #dc2626; margin: 0 0 16px; }
          p { color: #6b7280; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>❌ Serverfehler</h1>
          <p>Beim Speichern Ihres Feedbacks ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * 👎 Public feedback handler - Not Helpful
 * GET /feedback/not-helpful/:alertId
 */
router.get("/not-helpful/:alertId", async (req, res) => {
  try {
    const { alertId } = req.params;

    if (!ObjectId.isValid(alertId)) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ungültige ID</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f3f4f6; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; margin: 0 0 16px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Ungültige Alert-ID</h1>
            <p>Die Feedback-ID ist ungültig. Bitte verwenden Sie den Link aus Ihrer E-Mail.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if alert exists
    const alert = await notificationsCollection.findOne({
      _id: new ObjectId(alertId)
    });

    if (!alert) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Alert nicht gefunden</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f3f4f6; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; margin: 0 0 16px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Alert nicht gefunden</h1>
            <p>Diese Benachrichtigung existiert nicht mehr oder wurde bereits gelöscht.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if feedback already exists
    const existingFeedback = await feedbackCollection.findOne({
      alertId: new ObjectId(alertId)
    });

    if (existingFeedback) {
      // Update existing feedback
      await feedbackCollection.updateOne(
        { _id: existingFeedback._id },
        {
          $set: {
            rating: 'not_helpful',
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Create new feedback
      await feedbackCollection.insertOne({
        alertId: new ObjectId(alertId),
        userId: alert.userId,
        contractId: alert.contractId,
        lawId: alert.lawId,
        rating: 'not_helpful',
        comment: null,
        alertScore: alert.score,
        lawArea: alert.lawArea || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log(`✅ Public feedback: not_helpful for alert ${alertId}`);

    // Return feedback page with optional comment
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vielen Dank für Ihr Feedback!</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; }
          .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
          h1 { color: #ef4444; margin: 0 0 16px; font-size: 32px; }
          p { color: #6b7280; line-height: 1.8; font-size: 16px; }
          .emoji { font-size: 64px; margin-bottom: 20px; }
          .button { display: inline-block; margin-top: 24px; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .button:hover { background: #2563eb; }
          .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: left; }
          .info-box h3 { margin: 0 0 8px; color: #1e40af; font-size: 16px; }
          .info-box p { margin: 0; font-size: 14px; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="emoji">👎</div>
          <h1>Vielen Dank für Ihr Feedback!</h1>
          <p>Wir nehmen Ihre Rückmeldung ernst und werden daran arbeiten, die Relevanz unserer Benachrichtigungen zu verbessern.</p>

          <div class="info-box">
            <h3>💡 Tipp: Passen Sie Ihre Einstellungen an</h3>
            <p>Sie können die Benachrichtigungsschwelle und interessierende Rechtsbereiche in Ihren Profileinstellungen anpassen.</p>
          </div>

          <a href="https://www.contract-ai.de/profile" class="button">Zu den Einstellungen</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("❌ Fehler bei public feedback (not helpful):", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fehler</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f3f4f6; }
          .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { color: #dc2626; margin: 0 0 16px; }
          p { color: #6b7280; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>❌ Serverfehler</h1>
          <p>Beim Speichern Ihres Feedbacks ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</p>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;

// 📁 backend/routes/legalPulseFeed.js
// Legal Pulse 2.0 - Real-time Feed via Server-Sent Events (SSE)

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const sendEmailHtml = require("../utils/sendEmailHtml");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

// MongoDB Connection
let mongoClient = null;
let usersCollection = null;

async function connectMongo() {
  if (!mongoClient) {
    const mongoUri = process.env.MONGO_URI;
    mongoClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ Legal Pulse Feed: MongoDB verbunden");
  }
}

connectMongo().catch(console.error);

// Store active SSE connections per user
const connections = new Map();

/**
 * SSE Stream endpoint
 * GET /api/legalpulse/stream
 */
router.get("/stream", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  console.log(`[LEGAL-PULSE:FEED] New SSE connection from user: ${userId}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

  // CORS headers for SSE with credentials
  const origin = req.headers.origin || 'https://www.contract-ai.de';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Send initial connection message
  const connectionId = Date.now().toString();
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Legal Pulse Feed connected',
    connectionId,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Store connection
  if (!connections.has(userId)) {
    connections.set(userId, []);
  }
  connections.get(userId).push({ res, connectionId });

  console.log(`[LEGAL-PULSE:FEED] Active connections: ${getTotalConnections()}`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat ${new Date().toISOString()}\n\n`);
    } catch (error) {
      console.error('[LEGAL-PULSE:FEED] Heartbeat error:', error);
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[LEGAL-PULSE:FEED] Client disconnected: ${userId}`);
    clearInterval(heartbeatInterval);

    // Remove connection from store
    if (connections.has(userId)) {
      const userConnections = connections.get(userId).filter(
        conn => conn.connectionId !== connectionId
      );

      if (userConnections.length === 0) {
        connections.delete(userId);
      } else {
        connections.set(userId, userConnections);
      }
    }

    console.log(`[LEGAL-PULSE:FEED] Active connections: ${getTotalConnections()}`);
  });

  // Handle errors
  req.on('error', (error) => {
    console.error('[LEGAL-PULSE:FEED] Connection error:', error);
    clearInterval(heartbeatInterval);
  });
});

/**
 * Broadcast alert to specific user
 * @param {string} userId - User ID
 * @param {Object} alert - Alert object
 */
function broadcastToUser(userId, alert) {
  const userConnections = connections.get(userId);

  if (!userConnections || userConnections.length === 0) {
    console.log(`[LEGAL-PULSE:FEED] No active connections for user ${userId}`);
    return;
  }

  const message = JSON.stringify({
    type: 'alert',
    data: alert,
    timestamp: new Date().toISOString()
  });

  userConnections.forEach(({ res, connectionId }) => {
    try {
      res.write(`data: ${message}\n\n`);
      console.log(`[LEGAL-PULSE:FEED] ✓ Alert sent to ${userId} (conn: ${connectionId})`);
    } catch (error) {
      console.error(`[LEGAL-PULSE:FEED] ✗ Error sending to ${userId}:`, error);
    }
  });
}

/**
 * Broadcast alert to all users
 * @param {Object} alert - Alert object
 */
function broadcastToAll(alert) {
  console.log(`[LEGAL-PULSE:FEED] Broadcasting to all users (${connections.size} users)`);

  connections.forEach((userConnections, userId) => {
    broadcastToUser(userId, alert);
  });
}

/**
 * Send update event to specific user
 * @param {string} userId - User ID
 * @param {Object} update - Update object
 */
function sendUpdate(userId, update) {
  const userConnections = connections.get(userId);

  if (!userConnections || userConnections.length === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'update',
    data: update,
    timestamp: new Date().toISOString()
  });

  userConnections.forEach(({ res }) => {
    try {
      res.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error(`[LEGAL-PULSE:FEED] Error sending update:`, error);
    }
  });
}

/**
 * Get total number of active connections
 * @returns {number}
 */
function getTotalConnections() {
  let total = 0;
  connections.forEach(userConns => {
    total += userConns.length;
  });
  return total;
}

/**
 * Get feed status endpoint
 * GET /api/legalpulse/feed-status
 */
router.get("/feed-status", verifyToken, (req, res) => {
  const userId = req.user.userId;
  const userConnections = connections.get(userId) || [];

  res.json({
    success: true,
    status: {
      connected: userConnections.length > 0,
      connectionCount: userConnections.length,
      totalConnections: getTotalConnections(),
      activeUsers: connections.size
    }
  });
});

/**
 * Test endpoint to send a test alert (SSE + E-Mail)
 * POST /api/legalpulse/test-alert
 */
router.post("/test-alert", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Ensure MongoDB is connected
    await connectMongo();

    // Fetch user info for email
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const testAlert = {
      contractId: null,
      type: 'test',
      severity: 'low',
      title: 'Test Alert',
      description: 'Dies ist eine Test-Benachrichtigung für Legal Pulse',
      actionUrl: '/legalpulse',
      createdAt: new Date()
    };

    // 1. Send SSE notification (Live Feed)
    broadcastToUser(userId, testAlert);

    // 2. Send E-Mail notification
    // 🆕 Nutze firstName aus Registrierung, Fallback auf name oder email
    const userFirstName = user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 28px; font-weight: 600; }
    .header p { margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; }
    .content { padding: 40px 30px; }
    .alert-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .alert-title { font-size: 18px; font-weight: 600; color: #1e40af; margin: 0 0 8px; }
    .alert-description { color: #1f2937; line-height: 1.6; margin: 0; }
    .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 12px; }
    .severity-low { background: #d1fae5; color: #065f46; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; transition: all 0.2s; }
    .cta-button:hover { background: #2563eb; }
    .footer { background: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 4px 0; color: #6b7280; font-size: 13px; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Legal Pulse Alert</h1>
      <p>Echtzeit-Benachrichtigung für Ihre Verträge</p>
    </div>

    <div class="content">
      <p>Hallo ${userFirstName},</p>

      <p>Sie haben eine neue Legal Pulse Benachrichtigung erhalten:</p>

      <div class="alert-box">
        <h2 class="alert-title">${testAlert.title}</h2>
        <p class="alert-description">${testAlert.description}</p>
        <span class="severity-badge severity-${testAlert.severity}">Priorität: ${testAlert.severity === 'low' ? 'Niedrig' : testAlert.severity === 'medium' ? 'Mittel' : 'Hoch'}</span>
      </div>

      <a href="https://www.contract-ai.de${testAlert.actionUrl}" class="cta-button">
        Jetzt in Legal Pulse ansehen →
      </a>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        Dies ist eine Test-Benachrichtigung. Sie erhalten E-Mails bei wichtigen Legal Pulse Events basierend auf Ihren Einstellungen.
      </p>
    </div>

    <div class="footer">
      <p><strong>Contract AI</strong> – Ihr KI-gestützter Vertragsassistent</p>
      <p>
        <a href="https://www.contract-ai.de/profile">Einstellungen</a> •
        <a href="https://www.contract-ai.de/legalpulse">Legal Pulse</a>
      </p>
      <p style="margin-top: 16px;">© ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.</p>
    </div>
  </div>
</body>
</html>
    `;

    await sendEmailHtml(
      user.email,
      '⚡ Legal Pulse Test-Alert – Contract AI',
      emailHtml
    );

    res.json({
      success: true,
      message: 'Test alert sent via SSE and E-Mail',
      alert: testAlert,
      emailSent: true
    });

  } catch (error) {
    console.error('[LEGAL-PULSE:ALERT] Error sending test alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test alert',
      error: error.message
    });
  }
});

// Export router and broadcast functions
module.exports = router;
module.exports.broadcastToUser = broadcastToUser;
module.exports.broadcastToAll = broadcastToAll;
module.exports.sendUpdate = sendUpdate;
module.exports.getTotalConnections = getTotalConnections;

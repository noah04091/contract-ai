// 📁 backend/routes/legalPulseFeed.js
// Legal Pulse 2.0 - Real-time Feed via Server-Sent Events (SSE)

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

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

  // CORS headers if needed
  res.setHeader('Access-Control-Allow-Origin', '*');

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
 * Test endpoint to send a test alert
 * POST /api/legalpulse/test-alert
 */
router.post("/test-alert", verifyToken, (req, res) => {
  const userId = req.user.userId;

  const testAlert = {
    contractId: null,
    type: 'test',
    severity: 'low',
    title: 'Test Alert',
    description: 'Dies ist eine Test-Benachrichtigung für Legal Pulse Feed',
    actionUrl: '/legalpulse',
    createdAt: new Date()
  };

  broadcastToUser(userId, testAlert);

  res.json({
    success: true,
    message: 'Test alert sent',
    alert: testAlert
  });
});

// Export router and broadcast functions
module.exports = router;
module.exports.broadcastToUser = broadcastToUser;
module.exports.broadcastToAll = broadcastToAll;
module.exports.sendUpdate = sendUpdate;
module.exports.getTotalConnections = getTotalConnections;

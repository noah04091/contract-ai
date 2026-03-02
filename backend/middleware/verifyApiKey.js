// 📁 backend/middleware/verifyApiKey.js
// REST API-Zugang: API-Key Authentication Middleware

const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const database = require("../config/database");
const { isEnterpriseOrHigher } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen

// MongoDB Connection (shared pool)
let apiKeysCollection;
let usersCollection;

async function ensureCollections() {
  if (apiKeysCollection) return;
  const db = await database.connect();
  apiKeysCollection = db.collection("api_keys");
  usersCollection = db.collection("users");
}

ensureCollections().catch(err => console.error("❌ API-Key Middleware: MongoDB Fehler:", err));

/**
 * Hasht API-Key für Vergleich
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Middleware: Verifiziert API-Key aus Authorization Header
 * Setzt req.user.userId wie JWT-Token Middleware
 *
 * Usage:
 * - Header: Authorization: Bearer sk_live_abc123...
 * - Alternativ: x-api-key: sk_live_abc123...
 */
async function verifyApiKey(req, res, next) {
  try {
    // Sicherstellen, dass Collections initialisiert sind
    await ensureCollections();

    // API-Key aus Header holen
    let apiKey = null;

    // Option 1: Authorization: Bearer sk_live_...
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token.startsWith("sk_live_")) {
        apiKey = token;
      }
    }

    // Option 2: x-api-key Header
    if (!apiKey && req.headers["x-api-key"]) {
      apiKey = req.headers["x-api-key"];
    }

    // Kein API-Key gefunden
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API-Key fehlt. Bitte verwende: Authorization: Bearer sk_live_...",
        docs: "/api/docs"
      });
    }

    // Validiere Format
    if (!apiKey.startsWith("sk_live_")) {
      return res.status(401).json({
        success: false,
        message: "Ungültiges API-Key Format. Erwartet: sk_live_...",
        docs: "/api/docs"
      });
    }

    // Hash API-Key
    const keyHash = hashApiKey(apiKey);

    // Suche Key in DB
    const keyDoc = await apiKeysCollection.findOne({
      keyHash,
      isActive: true
    });

    if (!keyDoc) {
      console.warn(`⚠️ [API-Key Auth] Ungültiger/deaktivierter Key: ${apiKey.substring(0, 20)}...`);
      return res.status(401).json({
        success: false,
        message: "API-Key ungültig oder deaktiviert",
        docs: "/api/docs"
      });
    }

    // Check Expiration
    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "API-Key abgelaufen",
        docs: "/api/docs"
      });
    }

    // Hole User-Info
    const user = await usersCollection.findOne({ _id: keyDoc.userId });

    if (!user) {
      console.error(`❌ [API-Key Auth] User nicht gefunden für Key: ${keyDoc._id}`);
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Enterprise-Check
    const plan = user.subscriptionPlan || "free";
    if (!isEnterpriseOrHigher(plan)) {
      return res.status(403).json({
        success: false,
        message: "⛔ REST API-Zugang ist nur im Enterprise-Plan verfügbar.",
        requiresUpgrade: true,
        feature: "rest_api",
        upgradeUrl: "/pricing",
        userPlan: plan
      });
    }

    // ✅ Auth erfolgreich - setze User-Info wie JWT Middleware
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      subscriptionPlan: user.subscriptionPlan || "free"
    };

    // Setze API-Key Metadata für Rate Limiting / Logging
    req.apiKey = {
      keyId: keyDoc._id.toString(),
      name: keyDoc.name,
      permissions: keyDoc.permissions
    };

    // Update lastUsedAt (async, non-blocking)
    apiKeysCollection.updateOne(
      { _id: keyDoc._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch(err => console.warn("⚠️ lastUsedAt Update failed:", err));

    console.log(`✅ [API-Key Auth] User ${user._id} authentifiziert (Key: ${keyDoc.name})`);
    next();

  } catch (error) {
    console.error("❌ [API-Key Auth] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler bei API-Key Authentifizierung",
      details: error.message
    });
  }
}

module.exports = verifyApiKey;

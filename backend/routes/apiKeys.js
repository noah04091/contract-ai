// 📁 backend/routes/apiKeys.js
// REST API-Zugang: API-Key Management (Enterprise-Feature)

const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("crypto");
const verifyToken = require("../middleware/verifyToken");
const { apiKeysRateLimiter } = require("../middleware/apiRateLimit");
const { isEnterpriseOrHigher } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen

// Rate Limiting für API-Key Management
router.use(apiKeysRateLimiter);

// MongoDB Connection
const client = new MongoClient(process.env.MONGO_URI);
let apiKeysCollection;
let usersCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    apiKeysCollection = db.collection("api_keys");
    usersCollection = db.collection("users");

    // Index für schnelle API-Key Lookup
    await apiKeysCollection.createIndex({ keyHash: 1 });
    await apiKeysCollection.createIndex({ userId: 1 });

    console.log("📦 API-Keys Collection verbunden");
  } catch (error) {
    console.error("❌ MongoDB Connection Error (API-Keys):", error);
  }
})();

/**
 * Generiert sicheren API-Key
 * Format: sk_live_[32 random chars]
 */
function generateApiKey() {
  const randomBytes = crypto.randomBytes(24);
  const key = `sk_live_${randomBytes.toString('hex')}`;
  return key;
}

/**
 * Hasht API-Key für sichere Speicherung
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * POST /api/api-keys/generate
 * Generiert neuen API-Key (Enterprise-Only)
 * Body: { name: "Production API", permissions: ["read", "write"] }
 */
router.post("/generate", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, permissions = ["read", "write"] } = req.body;

    // Validierung
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name für API-Key erforderlich"
      });
    }

    // 🔒 ENTERPRISE-CHECK: Nur Premium/Enterprise-User
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

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

    // API-Key Limit check (max 5 Keys pro User)
    const existingKeys = await apiKeysCollection.countDocuments({
      userId: new ObjectId(userId),
      isActive: true
    });

    if (existingKeys >= 5) {
      return res.status(400).json({
        success: false,
        message: "Maximal 5 aktive API-Keys erlaubt. Bitte lösche alte Keys."
      });
    }

    // Generiere API-Key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 20) + "..."; // sk_live_abcdef123...

    // Speichere in DB
    const result = await apiKeysCollection.insertOne({
      userId: new ObjectId(userId),
      name: name.trim(),
      keyHash,
      keyPrefix,
      permissions,
      createdAt: new Date(),
      lastUsedAt: null,
      isActive: true,
      expiresAt: null // Optional: Keys können Ablaufdatum haben
    });

    console.log(`✅ [API-Keys] Neuer Key generiert für User ${userId}: ${name}`);

    // ⚠️ WICHTIG: Key wird nur EINMAL angezeigt!
    res.json({
      success: true,
      message: "API-Key erfolgreich erstellt",
      apiKey, // ⚠️ Nur bei Erstellung sichtbar!
      keyId: result.insertedId.toString(),
      keyPrefix,
      name,
      permissions,
      createdAt: new Date(),
      warning: "⚠️ Speichere diesen Key sicher! Er wird nur einmal angezeigt."
    });

  } catch (error) {
    console.error("❌ [API-Keys] Generate Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Erstellen des API-Keys",
      details: error.message
    });
  }
});

/**
 * GET /api/api-keys/list
 * Listet alle API-Keys des Users (Enterprise-Only)
 */
router.get("/list", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🔒 ENTERPRISE-CHECK
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

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

    // Hole alle Keys des Users (ohne keyHash!)
    const keys = await apiKeysCollection
      .find(
        { userId: new ObjectId(userId) },
        {
          projection: {
            keyHash: 0 // Nie den Hash zurückgeben!
          }
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      keys: keys.map(key => ({
        id: key._id.toString(),
        name: key.name,
        keyPrefix: key.keyPrefix,
        permissions: key.permissions,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        isActive: key.isActive,
        expiresAt: key.expiresAt
      })),
      total: keys.length
    });

  } catch (error) {
    console.error("❌ [API-Keys] List Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der API-Keys",
      details: error.message
    });
  }
});

/**
 * DELETE /api/api-keys/:keyId
 * Löscht/deaktiviert API-Key (Enterprise-Only)
 */
router.delete("/:keyId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { keyId } = req.params;

    if (!ObjectId.isValid(keyId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Key-ID"
      });
    }

    // 🔒 ENTERPRISE-CHECK
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

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

    // Deaktiviere Key (statt löschen für Audit-Trail)
    const result = await apiKeysCollection.updateOne(
      {
        _id: new ObjectId(keyId),
        userId: new ObjectId(userId) // 🔒 Nur eigene Keys!
      },
      {
        $set: {
          isActive: false,
          deletedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "API-Key nicht gefunden"
      });
    }

    console.log(`🗑️ [API-Keys] Key deaktiviert: ${keyId} (User: ${userId})`);

    res.json({
      success: true,
      message: "API-Key erfolgreich deaktiviert"
    });

  } catch (error) {
    console.error("❌ [API-Keys] Delete Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen des API-Keys",
      details: error.message
    });
  }
});

/**
 * POST /api/api-keys/verify (Internal)
 * Verifiziert API-Key und gibt User-Info zurück
 * Wird von verifyApiKey Middleware genutzt
 */
router.post("/verify", async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.startsWith("sk_live_")) {
      return res.status(401).json({
        success: false,
        message: "Ungültiger API-Key"
      });
    }

    const keyHash = hashApiKey(apiKey);

    // Finde Key in DB
    const keyDoc = await apiKeysCollection.findOne({
      keyHash,
      isActive: true
    });

    if (!keyDoc) {
      return res.status(401).json({
        success: false,
        message: "API-Key ungültig oder deaktiviert"
      });
    }

    // Check Expiration
    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "API-Key abgelaufen"
      });
    }

    // Update lastUsedAt (async, non-blocking)
    apiKeysCollection.updateOne(
      { _id: keyDoc._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch(err => console.warn("⚠️ lastUsedAt Update failed:", err));

    // Hole User-Info
    const user = await usersCollection.findOne({ _id: keyDoc.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User nicht gefunden"
      });
    }

    res.json({
      success: true,
      userId: user._id.toString(),
      userPlan: user.subscriptionPlan || "free",
      permissions: keyDoc.permissions,
      keyName: keyDoc.name
    });

  } catch (error) {
    console.error("❌ [API-Keys] Verify Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler bei API-Key Verifikation",
      details: error.message
    });
  }
});

module.exports = router;

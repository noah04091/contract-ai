// 📁 backend/middleware/requirePremium.js
// 🔐 Middleware: Prüft ob User Premium-Abo hat
// Legal Pulse ist ein Premium-Feature

const { MongoClient, ObjectId } = require("mongodb");
require('dotenv').config();

/**
 * Middleware: Prüft ob User Premium-Subscription hat
 * Legal Pulse ist ein Premium-Feature
 */
const requirePremium = async (req, res, next) => {
  let client;

  try {
    // MongoDB Verbindung
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const usersCollection = client.db("contract_ai").collection("users");

    // User laden
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.user.userId)
    });

    if (!user) {
      await client.close();
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden",
        error: "USER_NOT_FOUND"
      });
    }

    // ✅ Premium-Check: Nur Premium darf Legal Pulse nutzen
    if (user.subscriptionPlan !== 'premium') {
      console.log(`⚠️ [PREMIUM-CHECK] User ${user.email} hat kein Premium (Plan: ${user.subscriptionPlan})`);

      await client.close();

      return res.status(403).json({
        success: false,
        message: "Legal Pulse ist ein Premium-Feature",
        error: "PREMIUM_REQUIRED",
        details: {
          currentPlan: user.subscriptionPlan,
          requiredPlan: "premium",
          feature: "Legal Pulse - AI-gestützte Rechtsanalyse",
          description: "Legal Pulse bietet intelligente Rechtsupdates basierend auf Ihren Verträgen"
        },
        upgradeUrl: "/pricing",
        upgradeInfo: {
          premiumPrice: "29€/Monat",
          benefits: [
            "Unbegrenzte Legal Pulse Analysen",
            "Unbegrenzte Vertragsanalysen",
            "Alle Premium-Features"
          ]
        }
      });
    }

    console.log(`✅ [PREMIUM-CHECK] User ${user.email} hat Premium-Zugriff`);

    // User ist Premium - Daten für nächste Middleware speichern
    req.user.plan = user.subscriptionPlan;
    req.user.email = user.email;
    req.user.subscriptionActive = user.subscriptionActive;

    await client.close();

    // Fortfahren
    next();

  } catch (error) {
    console.error("❌ [PREMIUM-CHECK] Fehler bei Premium-Prüfung:", error);

    if (client) {
      await client.close();
    }

    return res.status(500).json({
      success: false,
      message: "Fehler bei der Berechtigungsprüfung",
      error: "INTERNAL_ERROR"
    });
  }
};

module.exports = requirePremium;

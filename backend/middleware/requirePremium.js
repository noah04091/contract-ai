// 📁 backend/middleware/requirePremium.js
// 🔐 Middleware: Prüft ob User ein bezahltes Abo hat (Business, Enterprise, Legendary)
// ✅ FIXED: Erlaubt jetzt alle Premium-Pläne, nicht nur 'premium'

const { MongoClient, ObjectId } = require("mongodb");
const { isBusinessOrHigher, PLANS } = require("../constants/subscriptionPlans");
require('dotenv').config();

/**
 * Middleware: Prüft ob User ein bezahltes Abo hat
 * Erlaubt: business, enterprise, legendary
 * Blockiert: free
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

    const userPlan = user.subscriptionPlan || 'free';

    // ✅ FIXED: Prüft ob User Business oder höher hat
    if (!isBusinessOrHigher(userPlan)) {
      console.log(`⚠️ [PREMIUM-CHECK] User ${user.email} hat kein Premium-Abo (Plan: ${userPlan})`);

      await client.close();

      return res.status(403).json({
        success: false,
        message: "Diese Funktion erfordert ein Business-Abo oder höher",
        error: "PREMIUM_REQUIRED",
        details: {
          currentPlan: userPlan,
          requiredPlans: ["business", "enterprise", "legendary"],
          feature: "Premium-Feature",
          description: "Upgrade auf Business für Zugriff auf alle Premium-Features"
        },
        upgradeUrl: "/pricing",
        upgradeInfo: {
          businessPrice: "19€/Monat",
          enterprisePrice: "29€/Monat",
          benefits: [
            "25 Vertragsanalysen/Monat (Business)",
            "Unbegrenzte Analysen (Enterprise)",
            "KI-Optimierung & Chat",
            "Legal Pulse & LegalLens",
            "Digitale Signaturen"
          ]
        }
      });
    }

    console.log(`✅ [PREMIUM-CHECK] User ${user.email} hat Premium-Zugriff (Plan: ${userPlan})`);

    // User hat Premium - Daten für nächste Middleware speichern
    req.user.plan = userPlan;
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

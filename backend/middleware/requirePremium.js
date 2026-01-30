// 📁 backend/middleware/requirePremium.js
// 🔐 Middleware: Prüft ob User ein bezahltes Abo hat (Business oder Enterprise)
// ✅ FIXED: Erlaubt jetzt alle Premium-Pläne, nicht nur 'premium'

const { ObjectId } = require("mongodb");
const { isBusinessOrHigher } = require("../constants/subscriptionPlans");
const database = require("../config/database");
require('dotenv').config();

/**
 * Middleware: Prüft ob User ein bezahltes Abo hat
 * Erlaubt: business, enterprise
 * Blockiert: free
 */
const requirePremium = async (req, res, next) => {
  try {
    // MongoDB Verbindung via Connection Pool
    const db = await database.connect();
    const usersCollection = db.collection("users");

    // User laden
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.user.userId)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden",
        error: "USER_NOT_FOUND"
      });
    }

    const userPlan = user.subscriptionPlan || 'free';

    // Prüft ob User Business oder höher hat
    if (!isBusinessOrHigher(userPlan)) {
      console.log(`⚠️ [PREMIUM-CHECK] User ${user.email} hat kein Premium-Abo (Plan: ${userPlan})`);

      return res.status(403).json({
        success: false,
        message: "Diese Funktion erfordert ein Business-Abo oder höher",
        error: "PREMIUM_REQUIRED",
        details: {
          currentPlan: userPlan,
          requiredPlans: ["business", "enterprise"],
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

    // Fortfahren
    next();

  } catch (error) {
    console.error("❌ [PREMIUM-CHECK] Fehler bei Premium-Prüfung:", error);

    return res.status(500).json({
      success: false,
      message: "Fehler bei der Berechtigungsprüfung",
      error: "INTERNAL_ERROR"
    });
  }
};

module.exports = requirePremium;

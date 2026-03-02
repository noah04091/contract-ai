// 📁 backend/middleware/requireFeature.js
// 🔐 Feature-spezifische Middleware für granulare Berechtigungsprüfung
// Nutzt zentrale FEATURE_ACCESS Definitionen

const { ObjectId } = require("mongodb");
const { hasFeatureAccess, FEATURE_ACCESS } = require("../constants/subscriptionPlans");
const database = require("../config/database");
require('dotenv').config();

/**
 * Factory-Funktion für Feature-spezifische Middleware
 * @param {string} featureName - Name des Features (z.B. 'apiKeys', 'excelExport')
 * @returns {Function} Express Middleware
 *
 * Beispiel-Verwendung:
 *   router.get('/api-keys', verifyToken, requireFeature('apiKeys'), ...)
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      // Prüfe ob Feature definiert ist
      if (!FEATURE_ACCESS[featureName]) {
        console.error(`❌ [FEATURE-CHECK] Unbekanntes Feature: ${featureName}`);
        return res.status(500).json({
          success: false,
          message: "Interner Fehler: Feature nicht konfiguriert",
          error: "FEATURE_NOT_CONFIGURED"
        });
      }

      // MongoDB Verbindung (shared pool)
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

      const userPlan = (user.subscriptionPlan || 'free').toLowerCase();
      const allowedPlans = FEATURE_ACCESS[featureName];

      // Feature-Zugriff prüfen
      if (!hasFeatureAccess(userPlan, featureName)) {
        console.log(`⚠️ [FEATURE-CHECK] User ${user.email} (${userPlan}) hat keinen Zugriff auf: ${featureName}`);

        // Bestimme minimalen erforderlichen Plan
        const requiredPlan = allowedPlans[0]; // Niedrigster Plan der Zugriff hat

        return res.status(403).json({
          success: false,
          message: `Diese Funktion erfordert ein ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}-Abo oder höher`,
          error: "FEATURE_REQUIRES_UPGRADE",
          details: {
            feature: featureName,
            currentPlan: userPlan,
            requiredPlans: allowedPlans,
            minimumPlan: requiredPlan
          },
          upgradeUrl: "/pricing"
        });
      }

      console.log(`✅ [FEATURE-CHECK] User ${user.email} (${userPlan}) hat Zugriff auf: ${featureName}`);

      // Speichere User-Daten für nächste Middleware
      req.user.plan = userPlan;
      req.user.email = user.email;
      req.user.subscriptionActive = user.subscriptionActive;

      next();

    } catch (error) {
      console.error(`❌ [FEATURE-CHECK] Fehler bei Feature-Prüfung (${featureName}):`, error);

      return res.status(500).json({
        success: false,
        message: "Fehler bei der Berechtigungsprüfung",
        error: "INTERNAL_ERROR"
      });
    }
  };
}

/**
 * Schnell-Check ob User Enterprise oder höher hat
 * Für API-Keys, Excel-Export, Integrations, etc.
 */
const requireEnterprise = requireFeature('apiKeys'); // Nutzt apiKeys da gleiche Berechtigung

module.exports = {
  requireFeature,
  requireEnterprise
};

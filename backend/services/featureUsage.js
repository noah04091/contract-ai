// 📁 backend/services/featureUsage.js
// Feature Usage Tracking Service — stilles, internes Produkt-Analytics.
//
// Zweck: pro ECHTER Feature-Nutzung genau EIN schlankes Event speichern
//        ({ userId, feature, timestamp }), damit Admin auswerten kann,
//        welche Features wie oft / von wie vielen Usern genutzt werden.
//
// Bewusst GETRENNT von cost_tracking — fasst KEINE Kosten-, Limit-, Auth-
// oder Bezahl-Logik an. Fire-and-forget: wirft nie, blockiert nie einen
// Request (gleiches Muster wie costTracking.js).

const database = require('../config/database');

class FeatureUsageService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Lazy-Init: holt die DB aus dem Singleton (contract_ai) und legt Indizes an.
   * Schluckt Fehler bewusst — Tracking darf die App niemals brechen.
   */
  async init() {
    if (this.isInitialized) return;
    try {
      this.db = await database.connect();
      await this.db.collection('feature_usage').createIndex({ feature: 1, timestamp: 1 });
      await this.db.collection('feature_usage').createIndex({ timestamp: 1 });
      await this.db.collection('feature_usage').createIndex({ userId: 1, timestamp: 1 });
      this.isInitialized = true;
      console.log('✅ [FEATURE-USAGE] Service initialized');
    } catch (error) {
      console.error('❌ [FEATURE-USAGE] Initialization error:', error.message);
      // NICHT werfen — Tracking ist optional.
    }
  }

  /**
   * Speichert EIN Feature-Nutzungs-Event. Fire-and-forget, wirft nie.
   * @param {Object} p
   * @param {string} p.userId   - req.user.userId (String)
   * @param {string} p.feature  - kanonischer Feature-Tag, z.B. 'analyze'
   * @param {Object} [p.metadata] - optionale Zusatzinfos (aktuell ungenutzt)
   * @returns {Promise<Object|null>}
   */
  async trackFeatureUsage({ userId, feature, metadata = {} }) {
    try {
      if (!userId || !feature) return null;
      if (!this.isInitialized) await this.init();
      if (!this.db) return null;

      const entry = {
        userId: String(userId),
        feature,
        metadata,
        timestamp: new Date()
      };

      await this.db.collection('feature_usage').insertOne(entry);
      return entry;
    } catch (error) {
      console.error('❌ [FEATURE-USAGE] Error tracking usage:', error.message);
      return null; // niemals werfen
    }
  }
}

// Singleton (gleiches Muster wie costTracking.js)
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new FeatureUsageService();
  }
  return instance;
}

module.exports = { getInstance, FeatureUsageService };

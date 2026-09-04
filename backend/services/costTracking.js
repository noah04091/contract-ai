// 📁 backend/services/costTracking.js
// Cost Tracking Service für OpenAI API Calls

const database = require('../config/database');

// 🕐 Cutover des pricingStatus-Feldes (Deploy 137ecdac, Render live ~11:35Z;
// konservativ mit Puffer). VOR diesem Zeitpunkt ist fehlender pricingStatus
// erwarteter Legacy-Zustand; DANACH ist er eine Tracker-Invarianzverletzung
// (Watchdog Invariante B: COST_PRICING_STATUS_MISSING).
const PRICING_STATUS_CUTOVER = new Date('2026-09-04T12:00:00Z');

class CostTrackingService {
  constructor() {
    this.db = null;
    this.isInitialized = false;

    // OpenAI Pricing (Stand Juli 2026)
    this.pricing = {
      // 🧪 Modell-A/B (21.07.2026): Herzstück läuft via ANALYZE_MODEL auf gpt-5.4 —
      // ohne diese Einträge fiel der Tracker auf den gpt-4-Urtarif ($30/$60) zurück
      // und überschätzte die Kosten ~7× ($1.14 statt real ~$0.16 pro Analyse).
      'gpt-5.4': {
        input: 0.0025 / 1000,  // $2.50 per 1M input tokens
        output: 0.015 / 1000   // $15.00 per 1M output tokens
      },
      'gpt-5.4-mini': {
        input: 0.00075 / 1000, // $0.75 per 1M input tokens
        output: 0.0045 / 1000  // $4.50 per 1M output tokens
      },
      'gpt-4o': {
        input: 0.0025 / 1000,  // $2.50 per 1M input tokens
        output: 0.01 / 1000    // $10.00 per 1M output tokens
      },
      'gpt-4o-mini': {
        input: 0.00015 / 1000, // $0.15 per 1M input tokens
        output: 0.0006 / 1000  // $0.60 per 1M output tokens
      },
      // 💰 04.09.2026 (Kosten-Akte 8b): date-hunt läuft seit 01.09. auf gpt-4.1-mini.
      // Ohne diese Einträge fand die Präfix-Suche 'gpt-4' ($30/$60) und verbuchte
      // jeden Aufruf 65-fach zu teuer — das Dashboard zeigte ~$580/Monat statt ~$9,
      // der Erfolg der Umstellung wäre unsichtbar geblieben. Die Längen-Sortierung
      // der Präfix-Logik lässt 'gpt-4.1-mini' korrekt vor 'gpt-4.1' und 'gpt-4' gewinnen.
      'gpt-4.1': {
        input: 0.002 / 1000,   // $2.00 per 1M input tokens
        output: 0.008 / 1000   // $8.00 per 1M output tokens
      },
      'gpt-4.1-mini': {
        input: 0.0004 / 1000,  // $0.40 per 1M input tokens
        output: 0.0016 / 1000  // $1.60 per 1M output tokens
      },
      'gpt-4.1-nano': {
        input: 0.0001 / 1000,  // $0.10 per 1M input tokens
        output: 0.0004 / 1000  // $0.40 per 1M output tokens
      },
      'gpt-4': {
        input: 0.03 / 1000,   // $0.03 per 1K input tokens
        output: 0.06 / 1000   // $0.06 per 1K output tokens
      },
      'gpt-4-turbo': {
        input: 0.01 / 1000,
        output: 0.03 / 1000
      },
      'gpt-3.5-turbo': {
        input: 0.0005 / 1000,
        output: 0.0015 / 1000
      },
      'text-embedding-3-small': {
        input: 0.00002 / 1000,  // $0.02 per 1M tokens
        output: 0
      },
      'text-embedding-3-large': {
        input: 0.00013 / 1000,
        output: 0
      }
    };

    // Daily budget limits (configurable via ENV)
    this.dailyBudgetLimit = parseFloat(process.env.DAILY_COST_LIMIT) || 100; // $100/day default
  }

  /**
   * COST_REPORT_VALIDITY_V1 (04.09.2026, gehärtet): DREI Zustände statt
   * binär — fehlender pricingStatus ist NICHT "known":
   *   pricingStatus === 'ok'      → KNOWN (verifiziert bepreist)
   *   pricingStatus === 'unknown' → UNKNOWN (totalCost=0, kein Preis erfunden)
   *   fehlt/null/unerwartet       → LEGACY_UNVERIFIED (vor dem Cutover normal;
   *                                 NACH dem Cutover eine Tracker-
   *                                 Invarianzverletzung → Watchdog Invariante B)
   * Diese Felder gehören in JEDE $group-Stufe über cost_tracking.
   */
  static pricingValidityGroupFields() {
    const isKnown = { $eq: ['$pricingStatus', 'ok'] };
    const isUnknown = { $eq: ['$pricingStatus', 'unknown'] };
    const isLegacy = { $not: [{ $or: [isKnown, isUnknown] }] };
    return {
      knownPricingRecords: { $sum: { $cond: [isKnown, 1, 0] } },
      unknownPricingRecords: { $sum: { $cond: [isUnknown, 1, 0] } },
      legacyUnverifiedPricingRecords: { $sum: { $cond: [isLegacy, 1, 0] } },
      unknownPricingInputTokens: { $sum: { $cond: [isUnknown, { $ifNull: ['$inputTokens', 0] }, 0] } },
      unknownPricingOutputTokens: { $sum: { $cond: [isUnknown, { $ifNull: ['$outputTokens', 0] }, 0] } },
      legacyUnverifiedInputTokens: { $sum: { $cond: [isLegacy, { $ifNull: ['$inputTokens', 0] }, 0] } },
      legacyUnverifiedOutputTokens: { $sum: { $cond: [isLegacy, { $ifNull: ['$outputTokens', 0] }, 0] } }
    };
  }

  /** Ergänzt ein Aggregat um pricingCoverage + Hinweis. Kein Ersatzpreis. */
  static withPricingCoverage(obj) {
    const unknown = (obj && obj.unknownPricingRecords) || 0;
    const legacy = (obj && obj.legacyUnverifiedPricingRecords) || 0;
    const coverage = unknown > 0 && legacy > 0 ? 'incomplete_mixed'
      : unknown > 0 ? 'incomplete_unknown'
      : legacy > 0 ? 'legacy_unverified'
      : 'complete';
    const hints = [];
    if (unknown > 0) hints.push(`${unknown} API-Datensätze besitzen keinen hinterlegten Modellpreis.`);
    if (legacy > 0) hints.push(`${legacy} Alt-Datensätze ohne verifizierten Preis-Status.`);
    return {
      ...obj,
      pricingCoverage: coverage,
      ...(coverage !== 'complete' ? {
        pricingCoverageHint: `${hints.join(' ')} Die ausgewiesene Kostensumme ist daher unvollständig bzw. nicht voll verifiziert.`
      } : {})
    };
  }

  /**
   * 04.09.2026: Preis-Resolver als eigene, testbare Stufe (Reihenfolge der
   * Preis-Map darf das Ergebnis NIE beeinflussen):
   *   1. exakter Modell-Match
   *   2. sonst LÄNGSTER gültiger Präfix (Snapshot-Namen wie "gpt-4.1-mini-2026-04-14")
   *   3. sonst null (UNKNOWN) — bewusst KEIN Fallback auf einen anderen Tarif.
   * @returns {{key: string, pricing: {input:number, output:number}}|null}
   */
  resolveModelPricing(model) {
    if (typeof model !== 'string' || !model) return null;
    if (this.pricing[model]) return { key: model, pricing: this.pricing[model] };
    const prefixKey = Object.keys(this.pricing)
      .filter(k => model.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    return prefixKey ? { key: prefixKey, pricing: this.pricing[prefixKey] } : null;
  }

  /**
   * Initialize MongoDB connection
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.db = await database.connect();

      // Create indexes for efficient queries
      await this.db.collection('cost_tracking').createIndex({ createdAt: 1 });
      await this.db.collection('cost_tracking').createIndex({ userId: 1, createdAt: 1 });
      await this.db.collection('cost_tracking').createIndex({ date: 1 });

      this.isInitialized = true;
      console.log('✅ [COST-TRACKING] Service initialized');
    } catch (error) {
      console.error('❌ [COST-TRACKING] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Track an OpenAI API call
   * @param {Object} callData - API call metadata
   * @returns {Promise<Object>} - Tracked entry with cost calculation
   */
  async trackAPICall({
    userId,
    model,
    inputTokens,
    outputTokens,
    feature, // 'analyze', 'legal-pulse', 'optimizer', etc.
    contractId = null,
    requestId = null,
    metadata = {}
  }) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      // Calculate cost — 04.09.2026: robuster Preis-Resolver OHNE stillen
      // gpt-4-Fallback (die eigentliche Fehlerklasse hinter der 65x-Falle:
      // ein unbekanntes Modell wurde kommentarlos zum teuersten Urtarif
      // verbucht). Unbekannt ⇒ Kosten 0 + pricingStatus 'unknown' — der
      // Datensatz ist ausdrücklich KEINE belastbare Kostenschätzung, die
      // Token-Rohdaten bleiben für eine spätere Nachbewertung erhalten.
      // Hinweis cached_tokens: die Aufrufer übergeben keine
      // prompt_tokens_details.cached_tokens; die Schätzung bewertet Input
      // daher konservativ vollständig zum normalen Inputpreis (gpt-4.1-mini
      // cached wäre $0.10/1M statt $0.40/1M — Überschätzung, nie Unter-).
      const resolved = this.resolveModelPricing(model);
      const modelPricing = resolved ? resolved.pricing : null;
      if (!resolved) {
        console.warn(`⚠️ costTracking: kein Preis für Modell "${model}" — Datensatz als pricingStatus=unknown markiert (kein gpt-4-Fallback mehr)`);
      }
      const inputCost = modelPricing ? (inputTokens || 0) * modelPricing.input : 0;
      const outputCost = modelPricing ? (outputTokens || 0) * modelPricing.output : 0;
      const totalCost = inputCost + outputCost;

      // Create tracking entry
      const entry = {
        userId,
        model,
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0,
        totalTokens: (inputTokens || 0) + (outputTokens || 0),
        inputCost,
        outputCost,
        totalCost,
        pricingStatus: resolved ? 'ok' : 'unknown', // 04.09.2026: unknown = Kosten NICHT belastbar
        pricingModelKey: resolved ? resolved.key : null,
        feature,
        contractId,
        requestId,
        metadata,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD for daily aggregation
        createdAt: new Date()
      };

      // Save to MongoDB
      const result = await this.db.collection('cost_tracking').insertOne(entry);

      console.log(`💰 [COST-TRACKING] Tracked ${model} call: $${totalCost.toFixed(4)} (${feature})`);

      return {
        ...entry,
        _id: result.insertedId
      };
    } catch (error) {
      console.error('❌ [COST-TRACKING] Error tracking call:', error);
      // Don't throw - cost tracking should not break the main flow
      return null;
    }
  }

  /**
   * Check if daily budget limit is reached
   * @returns {Promise<Object>} - Budget status
   */
  async checkDailyBudget() {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const today = new Date().toISOString().split('T')[0];

      const todayStats = await this.db.collection('cost_tracking').aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalCalls: { $sum: 1 },
            ...CostTrackingService.pricingValidityGroupFields()
          }
        }
      ]).toArray();

      const spent = todayStats[0]?.totalCost || 0;
      const validity = CostTrackingService.withPricingCoverage(todayStats[0] || {});
      const remaining = this.dailyBudgetLimit - spent;
      const isLimitReached = spent >= this.dailyBudgetLimit;

      return {
        date: today,
        spent,
        limit: this.dailyBudgetLimit,
        remaining: Math.max(0, remaining),
        isLimitReached,
        percentUsed: (spent / this.dailyBudgetLimit) * 100,
        // COST_REPORT_VALIDITY_V1: unknown-Pricing darf nie als "kostenlos" untergehen
        knownPricingRecords: validity.knownPricingRecords || 0,
        unknownPricingRecords: validity.unknownPricingRecords || 0,
        unknownPricingInputTokens: validity.unknownPricingInputTokens || 0,
        unknownPricingOutputTokens: validity.unknownPricingOutputTokens || 0,
        pricingCoverage: validity.pricingCoverage,
        ...(validity.pricingCoverageHint ? { pricingCoverageHint: validity.pricingCoverageHint } : {})
      };
    } catch (error) {
      console.error('❌ [COST-TRACKING] Error checking budget:', error);
      return {
        spent: 0,
        limit: this.dailyBudgetLimit,
        remaining: this.dailyBudgetLimit,
        isLimitReached: false,
        percentUsed: 0
      };
    }
  }

  /**
   * Get cost statistics for a time period
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Aggregated statistics
   */
  async getStats(startDate, endDate) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const stats = await this.db.collection('cost_tracking').aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalCalls: { $sum: 1 },
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            ...CostTrackingService.pricingValidityGroupFields(),
            byModel: {
              $push: { model: '$model', cost: '$totalCost' }
            },
            byFeature: {
              $push: { feature: '$feature', cost: '$totalCost' }
            }
          }
        }
      ]).toArray();

      if (stats.length === 0) {
        return {
          startDate,
          endDate,
          totalCost: 0,
          totalCalls: 0,
          totalTokens: 0,
          byModel: {},
          byFeature: {}
        };
      }

      const result = stats[0];

      // Aggregate by model
      const modelStats = {};
      result.byModel.forEach(item => {
        if (!modelStats[item.model]) {
          modelStats[item.model] = { calls: 0, cost: 0 };
        }
        modelStats[item.model].calls++;
        modelStats[item.model].cost += item.cost;
      });

      // Aggregate by feature
      const featureStats = {};
      result.byFeature.forEach(item => {
        if (!featureStats[item.feature]) {
          featureStats[item.feature] = { calls: 0, cost: 0 };
        }
        featureStats[item.feature].calls++;
        featureStats[item.feature].cost += item.cost;
      });

      return {
        startDate,
        endDate,
        totalCost: result.totalCost,
        totalCalls: result.totalCalls,
        totalTokens: result.totalInputTokens + result.totalOutputTokens,
        byModel: modelStats,
        byFeature: featureStats,
        knownPricingRecords: result.knownPricingRecords || 0,
        unknownPricingRecords: result.unknownPricingRecords || 0,
        unknownPricingInputTokens: result.unknownPricingInputTokens || 0,
        unknownPricingOutputTokens: result.unknownPricingOutputTokens || 0,
        ...(() => { const v = CostTrackingService.withPricingCoverage(result); return { pricingCoverage: v.pricingCoverage, ...(v.pricingCoverageHint ? { pricingCoverageHint: v.pricingCoverageHint } : {}) }; })()
      };
    } catch (error) {
      console.error('❌ [COST-TRACKING] Error getting stats:', error);
      return {
        startDate,
        endDate,
        totalCost: 0,
        totalCalls: 0,
        totalTokens: 0,
        byModel: {},
        byFeature: {}
      };
    }
  }

  /**
   * Get daily cost trend
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} - Daily cost data
   */
  async getDailyTrend(days = 30) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const trend = await this.db.collection('cost_tracking').aggregate([
        {
          $match: {
            date: { $gte: startDateStr }
          }
        },
        {
          $group: {
            _id: '$date',
            cost: { $sum: '$totalCost' },
            unknownPricingRecords: { $sum: { $cond: [{ $eq: ['$pricingStatus', 'unknown'] }, 1, 0] } },
            calls: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]).toArray();

      return trend.map(day => ({
        date: day._id,
        cost: day.cost,
        calls: day.calls
      }));
    } catch (error) {
      console.error('❌ [COST-TRACKING] Error getting trend:', error);
      return [];
    }
  }

  /**
   * Close — no-op (shared pool managed by database singleton)
   */
  async close() {
    this.db = null;
    this.isInitialized = false;
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new CostTrackingService();
  }
  return instance;
}

module.exports = { getInstance, CostTrackingService, PRICING_STATUS_CUTOVER };

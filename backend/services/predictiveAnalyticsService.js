// 📁 backend/services/predictiveAnalyticsService.js
// Legal Pulse 2.0 Phase 2 + Phase 3 - Predictive Analytics & Forecast (Enhanced with ML)

const { MongoClient, ObjectId } = require("mongodb");
const { getInstance: getMLForecast } = require('./mlForecastingService');

class PredictiveAnalyticsService {
  constructor() {
    this.forecastMonths = 6; // Default forecast period
    this.mlForecasting = getMLForecast();
    this.useML = true; // Try ML first, fallback to heuristic
    console.log('[PREDICTIVE-ANALYTICS] Service initialized with ML support');
  }

  /**
   * Calculate enhanced impact score
   * @param {Object} contract - Contract object
   * @param {Array} lawChanges - Recent law changes
   * @returns {Object} - Enhanced impact score
   */
  calculateEnhancedImpactScore(contract, lawChanges = []) {
    const baseRisk = contract.legalPulse?.riskScore || 50;
    const health = contract.legalPulse?.healthScore || 70;

    // Factors
    const ageFactor = this.calculateAgeFactor(contract);
    const changeDensityFactor = this.calculateChangeDensityFactor(contract);
    const lawChangeFactor = this.calculateLawChangeFactor(contract, lawChanges);
    const trendFactor = this.calculateTrendFactor(contract);

    // Weighted impact score
    const impactScore = Math.round(
      baseRisk * 0.4 +
      ageFactor * 0.2 +
      changeDensityFactor * 0.2 +
      lawChangeFactor * 0.15 +
      trendFactor * 0.05
    );

    return {
      impactScore: Math.min(100, Math.max(0, impactScore)),
      factors: {
        baseRisk,
        health,
        ageFactor,
        changeDensityFactor,
        lawChangeFactor,
        trendFactor
      },
      recommendation: this.getRecommendation(impactScore)
    };
  }

  /**
   * Generate forecast for contract (Enhanced with ML in Phase 3)
   * @param {string} contractId - Contract ID
   * @param {number} months - Forecast period in months
   * @returns {Promise<Object>} - Forecast data
   */
  async generateForecast(contractId, months = 6) {
    console.log(`[PREDICTIVE-ANALYTICS] Generating ${months}-month forecast for ${contractId}`);

    try {
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      // Get contract
      const contract = await client.db('contract_ai')
        .collection('contracts')
        .findOne({ _id: new ObjectId(contractId) });

      if (!contract) {
        throw new Error('Contract not found');
      }

      await client.close();

      // Get recent law changes
      const Law = require('../models/Law');
      const recentChanges = await Law.findRecentChanges(90);

      // Calculate current state
      const currentState = this.calculateEnhancedImpactScore(contract, recentChanges);

      // Try ML forecasting first (Phase 3), fallback to heuristic (Phase 2)
      let forecast = [];
      let forecastMethod = 'heuristic';

      if (this.useML) {
        try {
          console.log('[PREDICTIVE-ANALYTICS] Attempting ML forecast...');
          const mlPredictions = await this.mlForecasting.predictRisk(contract, months);

          // Add events to ML predictions
          forecast = mlPredictions.map(pred => ({
            ...pred,
            events: this.predictEvents(contract, pred.month, recentChanges)
          }));

          forecastMethod = mlPredictions[0]?.method || 'ml';
          console.log(`[PREDICTIVE-ANALYTICS] Using ${forecastMethod} forecast method`);

        } catch (mlError) {
          console.warn('[PREDICTIVE-ANALYTICS] ML forecast failed, using heuristic:', mlError.message);
          forecast = this.generateHeuristicForecast(contract, months, recentChanges);
          forecastMethod = 'heuristic';
        }
      } else {
        forecast = this.generateHeuristicForecast(contract, months, recentChanges);
      }

      return {
        contractId,
        currentState,
        forecast,
        forecastMethod,
        generatedAt: new Date(),
        summary: this.generateForecastSummary(forecast)
      };

    } catch (error) {
      console.error('[PREDICTIVE-ANALYTICS] Forecast error:', error);
      throw error;
    }
  }

  /**
   * Generate heuristic-based forecast (Phase 2 method)
   * @param {Object} contract - Contract object
   * @param {number} months - Months ahead
   * @param {Array} recentChanges - Recent law changes
   * @returns {Array} - Forecast
   */
  generateHeuristicForecast(contract, months, recentChanges) {
    const forecast = [];
    const currentRisk = contract.legalPulse?.riskScore || 50;

    for (let month = 1; month <= months; month++) {
      const predictedRisk = this.predictRiskForMonth(contract, month, currentRisk, recentChanges);
      const predictedHealth = 100 - (predictedRisk * 0.6);

      forecast.push({
        month,
        date: this.getMonthFromNow(month),
        predictedRisk: Math.round(predictedRisk),
        predictedHealth: Math.round(predictedHealth),
        confidence: this.calculateConfidence(month),
        events: this.predictEvents(contract, month, recentChanges),
        method: 'heuristic'
      });
    }

    return forecast;
  }

  /**
   * Predict risk for specific month
   * @param {Object} contract - Contract object
   * @param {number} month - Month offset
   * @param {number} baseRisk - Current risk score
   * @param {Array} lawChanges - Recent law changes
   * @returns {number} - Predicted risk
   */
  predictRiskForMonth(contract, month, baseRisk, lawChanges) {
    // Simple prediction model (can be enhanced with ML)
    let predicted = baseRisk;

    // Age degradation (contracts get riskier over time)
    predicted += month * 1.5;

    // Law change impact
    if (lawChanges.length > 0) {
      const changeRate = lawChanges.length / 90; // Changes per day
      predicted += changeRate * month * 30 * 2; // Amplify by month
    }

    // Contract expiry proximity
    if (contract.expiryDate) {
      const expiryDate = new Date(contract.expiryDate);
      const monthsUntilExpiry = this.getMonthsBetween(new Date(), expiryDate);

      if (monthsUntilExpiry > 0 && monthsUntilExpiry <= 12) {
        // Increase risk as expiry approaches
        predicted += (12 - monthsUntilExpiry) * 2;
      }
    }

    // Add some variance
    predicted += (Math.random() - 0.5) * 5;

    return Math.min(100, Math.max(0, predicted));
  }

  /**
   * Predict potential events for month
   * @param {Object} contract - Contract object
   * @param {number} month - Month offset
   * @param {Array} lawChanges - Recent law changes
   * @returns {Array} - Predicted events
   */
  predictEvents(contract, month, lawChanges) {
    const events = [];

    // Expiry event
    if (contract.expiryDate) {
      const expiryDate = new Date(contract.expiryDate);
      const monthsUntilExpiry = this.getMonthsBetween(new Date(), expiryDate);

      if (monthsUntilExpiry === month) {
        events.push({
          type: 'expiry',
          severity: 'high',
          description: 'Vertrag läuft aus',
          probability: 1.0
        });
      } else if (monthsUntilExpiry === month + 1) {
        events.push({
          type: 'deadline',
          severity: 'medium',
          description: 'Kündigungsfrist endet bald',
          probability: 0.8
        });
      }
    }

    // Law change probability
    if (lawChanges.length > 2) {
      const changeRate = lawChanges.length / 90;
      const probability = Math.min(0.9, changeRate * month * 10);

      if (probability > 0.3) {
        events.push({
          type: 'law_change',
          severity: 'medium',
          description: 'Mögliche Gesetzesänderung',
          probability: Math.round(probability * 100) / 100
        });
      }
    }

    // Risk increase prediction
    if (month > 3) {
      events.push({
        type: 'risk_increase',
        severity: 'low',
        description: 'Risiko-Score könnte steigen',
        probability: 0.5 + (month * 0.05)
      });
    }

    return events;
  }

  /**
   * Calculate confidence level
   * @param {number} month - Month offset
   * @returns {number} - Confidence (0-1)
   */
  calculateConfidence(month) {
    // Confidence decreases over time
    return Math.max(0.4, 1 - (month * 0.08));
  }

  /**
   * Generate forecast summary
   * @param {Array} forecast - Forecast array
   * @returns {Object} - Summary
   */
  generateForecastSummary(forecast) {
    const avgRisk = forecast.reduce((sum, f) => sum + f.predictedRisk, 0) / forecast.length;
    const maxRisk = Math.max(...forecast.map(f => f.predictedRisk));
    const criticalMonths = forecast.filter(f => f.predictedRisk > 70).length;

    const highProbabilityEvents = forecast
      .flatMap(f => f.events)
      .filter(e => e.probability > 0.7);

    return {
      avgRisk: Math.round(avgRisk),
      maxRisk,
      criticalMonths,
      trend: forecast[forecast.length - 1].predictedRisk > forecast[0].predictedRisk ? 'increasing' : 'stable',
      highProbabilityEvents: highProbabilityEvents.length,
      recommendation: this.getForecastRecommendation(avgRisk, criticalMonths)
    };
  }

  /**
   * Get forecast recommendation
   * @param {number} avgRisk - Average risk
   * @param {number} criticalMonths - Number of critical months
   * @returns {string} - Recommendation
   */
  getForecastRecommendation(avgRisk, criticalMonths) {
    if (criticalMonths >= 3) {
      return 'Dringend: Vertrag überprüfen und neu verhandeln';
    } else if (avgRisk > 60) {
      return 'Empfohlen: Vertrag in nächsten 3 Monaten optimieren';
    } else if (avgRisk > 40) {
      return 'Beobachten: Regelmäßig prüfen';
    } else {
      return 'Stabil: Keine unmittelbaren Maßnahmen erforderlich';
    }
  }

  // Helper methods
  calculateAgeFactor(contract) {
    const uploadDate = new Date(contract.uploadedAt || contract.createdAt || Date.now());
    const ageInDays = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.min(30, ageInDays / 30); // Max 30 points for age
  }

  calculateChangeDensityFactor(contract) {
    const history = contract.legalPulse?.analysisHistory || [];
    const recentChanges = history.filter(h => {
      const daysSince = (Date.now() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 90 && h.triggeredBy === 'law_change';
    });

    return Math.min(25, recentChanges.length * 5);
  }

  calculateLawChangeFactor(contract, lawChanges) {
    const relevantChanges = lawChanges.filter(change => {
      // Check if change is relevant to contract area
      const insights = contract.legalPulse?.lawInsights || [];
      return insights.some(insight => insight.area === change.area);
    });

    return Math.min(20, relevantChanges.length * 4);
  }

  calculateTrendFactor(contract) {
    const history = contract.legalPulse?.analysisHistory || [];
    if (history.length < 2) return 0;

    const recent = history.slice(-3);
    const avgRecentRisk = recent.reduce((sum, h) => sum + h.riskScore, 0) / recent.length;
    const firstRisk = history[0].riskScore;

    return (avgRecentRisk - firstRisk) / 5; // Normalized trend
  }

  getRecommendation(impactScore) {
    if (impactScore > 75) return 'Sofortige Maßnahmen erforderlich';
    if (impactScore > 60) return 'Baldige Überprüfung empfohlen';
    if (impactScore > 40) return 'Regelmäßige Überwachung';
    return 'Keine unmittelbaren Maßnahmen nötig';
  }

  getMonthFromNow(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  getMonthsBetween(date1, date2) {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12;
    return months + date2.getMonth() - date1.getMonth();
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new PredictiveAnalyticsService();
    }
    return instance;
  },
  PredictiveAnalyticsService
};

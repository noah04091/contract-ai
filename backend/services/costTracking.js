// 📁 backend/services/costTracking.js
// Cost Tracking Service für OpenAI API Calls

const { MongoClient } = require('mongodb');

class CostTrackingService {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.isInitialized = false;

    // OpenAI Pricing (Stand Nov 2024)
    this.pricing = {
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
   * Initialize MongoDB connection
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.mongoClient = new MongoClient(process.env.MONGO_URI);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('contract_ai');

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

      // Calculate cost
      const modelPricing = this.pricing[model] || this.pricing['gpt-4']; // Fallback to gpt-4
      const inputCost = (inputTokens || 0) * modelPricing.input;
      const outputCost = (outputTokens || 0) * modelPricing.output;
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
            totalCalls: { $sum: 1 }
          }
        }
      ]).toArray();

      const spent = todayStats[0]?.totalCost || 0;
      const remaining = this.dailyBudgetLimit - spent;
      const isLimitReached = spent >= this.dailyBudgetLimit;

      return {
        date: today,
        spent,
        limit: this.dailyBudgetLimit,
        remaining: Math.max(0, remaining),
        isLimitReached,
        percentUsed: (spent / this.dailyBudgetLimit) * 100
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
        byFeature: featureStats
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
   * Close MongoDB connection
   */
  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.isInitialized = false;
    }
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

module.exports = { getInstance, CostTrackingService };

// 📁 backend/services/marketBenchmarking.js
// Legal Pulse 2.0 Phase 3 - Market Benchmarking Service

const Benchmark = require('../models/Benchmark');
const { MongoClient, ObjectId } = require('mongodb');

class MarketBenchmarkingService {
  constructor() {
    this.minSampleSize = 10; // Minimum benchmarks needed for meaningful comparison
    console.log('[MARKET-BENCHMARKING] Service initialized');
  }

  /**
   * Compare contract with market benchmarks
   * @param {string} contractId - Contract ID
   * @returns {Promise<Object>} - Benchmark comparison
   */
  async compareWithMarket(contractId) {
    console.log(`[MARKET-BENCHMARKING] Comparing contract ${contractId} with market`);

    try {
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const contract = await client.db('contract_ai')
        .collection('contracts')
        .findOne({ _id: new ObjectId(contractId) });

      if (!contract) {
        throw new Error('Contract not found');
      }

      await client.close();

      const contractType = contract.contractType || 'Sonstiges';
      const industry = contract.industry || null;

      // Get market statistics
      const marketStats = await Benchmark.getBenchmarkStats(contractType, industry);

      if (!marketStats || marketStats.count < this.minSampleSize) {
        return {
          available: false,
          message: 'Nicht genügend Vergleichsdaten verfügbar',
          minRequired: this.minSampleSize,
          currentCount: marketStats?.count || 0
        };
      }

      // Get percentile ranking
      const metrics = {
        riskScore: contract.legalPulse?.riskScore || 50,
        healthScore: contract.legalPulse?.healthScore || 70
      };

      const percentiles = await Benchmark.getPercentileRank(
        metrics,
        contractType,
        industry
      );

      // Generate comparison insights
      const insights = this.generateInsights(metrics, marketStats, percentiles);

      // Get similar contracts
      const similarContracts = await this.findSimilarContracts(contract, 5);

      return {
        available: true,
        contractType,
        industry,
        sampleSize: marketStats.count,
        yourContract: {
          riskScore: metrics.riskScore,
          healthScore: metrics.healthScore,
          riskPercentile: percentiles.riskPercentile,
          healthPercentile: percentiles.healthPercentile
        },
        market: {
          avgRiskScore: Math.round(marketStats.avgRiskScore),
          minRiskScore: Math.round(marketStats.minRiskScore),
          maxRiskScore: Math.round(marketStats.maxRiskScore),
          avgHealthScore: Math.round(marketStats.avgHealthScore),
          minHealthScore: Math.round(marketStats.minHealthScore),
          maxHealthScore: Math.round(marketStats.maxHealthScore),
          avgClarity: Math.round(marketStats.avgClarity || 70),
          avgCompleteness: Math.round(marketStats.avgCompleteness || 70),
          avgFairness: Math.round(marketStats.avgFairness || 70),
          avgCompliance: Math.round(marketStats.avgCompliance || 70)
        },
        insights,
        similarContracts,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[MARKET-BENCHMARKING] Comparison error:', error);
      throw error;
    }
  }

  /**
   * Generate insights from comparison
   * @param {Object} metrics - Contract metrics
   * @param {Object} marketStats - Market statistics
   * @param {Object} percentiles - Percentile rankings
   * @returns {Array} - Insights
   */
  generateInsights(metrics, marketStats, percentiles) {
    const insights = [];

    // Risk score insights
    if (metrics.riskScore < marketStats.avgRiskScore - 10) {
      insights.push({
        type: 'positive',
        category: 'risk',
        message: `Ihr Vertrag hat ein ${Math.round(marketStats.avgRiskScore - metrics.riskScore)} Punkte niedrigeres Risiko als der Marktdurchschnitt`,
        score: 90
      });
    } else if (metrics.riskScore > marketStats.avgRiskScore + 10) {
      insights.push({
        type: 'warning',
        category: 'risk',
        message: `Ihr Vertrag liegt ${Math.round(metrics.riskScore - marketStats.avgRiskScore)} Punkte über dem Marktdurchschnitt`,
        score: 40,
        recommendation: 'Vertrag optimieren empfohlen'
      });
    }

    // Health score insights
    if (metrics.healthScore > marketStats.avgHealthScore + 10) {
      insights.push({
        type: 'positive',
        category: 'health',
        message: `Ihr Health Score liegt ${Math.round(metrics.healthScore - marketStats.avgHealthScore)} Punkte über dem Durchschnitt`,
        score: 95
      });
    } else if (metrics.healthScore < marketStats.avgHealthScore - 10) {
      insights.push({
        type: 'warning',
        category: 'health',
        message: `Health Score ${Math.round(marketStats.avgHealthScore - metrics.healthScore)} Punkte unter Durchschnitt`,
        score: 45,
        recommendation: 'Vertragsprüfung empfohlen'
      });
    }

    // Percentile insights
    if (percentiles.riskPercentile >= 75) {
      insights.push({
        type: 'positive',
        category: 'percentile',
        message: `Ihr Vertrag gehört zu den besten ${100 - percentiles.riskPercentile}% hinsichtlich Risiko`,
        score: 95
      });
    } else if (percentiles.riskPercentile <= 25) {
      insights.push({
        type: 'critical',
        category: 'percentile',
        message: `${percentiles.riskPercentile}% der Verträge haben ein höheres Risiko - Dringend prüfen!`,
        score: 30,
        recommendation: 'Sofortige Überarbeitung empfohlen'
      });
    }

    if (percentiles.healthPercentile >= 75) {
      insights.push({
        type: 'positive',
        category: 'percentile',
        message: `Top ${percentiles.healthPercentile}% bei Legal Health - Ausgezeichnet!`,
        score: 95
      });
    }

    return insights;
  }

  /**
   * Find similar contracts in benchmark data
   * @param {Object} contract - Contract object
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Similar contracts
   */
  async findSimilarContracts(contract, limit = 5) {
    const contractType = contract.contractType || 'Sonstiges';
    const industry = contract.industry || null;
    const riskScore = contract.legalPulse?.riskScore || 50;

    const query = {
      contractType,
      userOptedIn: true,
      'metrics.riskScore': {
        $gte: riskScore - 10,
        $lte: riskScore + 10
      }
    };

    if (industry) {
      query.industry = industry;
    }

    const similar = await Benchmark.find(query)
      .select('contractType industry metrics.riskScore metrics.healthScore uploadedYear')
      .limit(limit)
      .lean();

    return similar.map(b => ({
      contractType: b.contractType,
      industry: b.industry,
      riskScore: b.metrics.riskScore,
      healthScore: b.metrics.healthScore,
      year: b.uploadedYear
    }));
  }

  /**
   * Get industry trends
   * @param {string} industry - Industry
   * @param {number} months - Months to analyze
   * @returns {Promise<Object>} - Trends
   */
  async getIndustryTrends(industry, months = 12) {
    console.log(`[MARKET-BENCHMARKING] Getting trends for ${industry}`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      const trends = await Benchmark.aggregate([
        {
          $match: {
            industry,
            userOptedIn: true,
            createdAt: { $gte: cutoffDate }
          }
        },
        {
          $group: {
            _id: {
              year: '$uploadedYear',
              quarter: '$uploadedQuarter'
            },
            count: { $sum: 1 },
            avgRisk: { $avg: '$metrics.riskScore' },
            avgHealth: { $avg: '$metrics.healthScore' }
          }
        },
        { $sort: { '_id.year': 1, '_id.quarter': 1 } }
      ]);

      // Calculate trend direction
      const trendDirection = this.calculateTrendDirection(trends);

      return {
        industry,
        monthsAnalyzed: months,
        dataPoints: trends.length,
        timeline: trends.map(t => ({
          period: `${t._id.year} Q${t._id.quarter}`,
          count: t.count,
          avgRisk: Math.round(t.avgRisk),
          avgHealth: Math.round(t.avgHealth)
        })),
        trend: trendDirection,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[MARKET-BENCHMARKING] Trends error:', error);
      throw error;
    }
  }

  /**
   * Calculate trend direction
   * @param {Array} dataPoints - Time series data
   * @returns {Object} - Trend analysis
   */
  calculateTrendDirection(dataPoints) {
    if (dataPoints.length < 2) {
      return { direction: 'insufficient_data' };
    }

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const avgRiskFirst = firstHalf.reduce((sum, d) => sum + d.avgRisk, 0) / firstHalf.length;
    const avgRiskSecond = secondHalf.reduce((sum, d) => sum + d.avgRisk, 0) / secondHalf.length;

    const avgHealthFirst = firstHalf.reduce((sum, d) => sum + d.avgHealth, 0) / firstHalf.length;
    const avgHealthSecond = secondHalf.reduce((sum, d) => sum + d.avgHealth, 0) / secondHalf.length;

    return {
      riskTrend: avgRiskSecond < avgRiskFirst ? 'improving' : 'worsening',
      riskChange: Math.round(avgRiskSecond - avgRiskFirst),
      healthTrend: avgHealthSecond > avgHealthFirst ? 'improving' : 'worsening',
      healthChange: Math.round(avgHealthSecond - avgHealthFirst)
    };
  }

  /**
   * Get clause popularity rankings
   * @param {string} contractType - Contract type
   * @returns {Promise<Array>} - Clause rankings
   */
  async getClausePopularity(contractType) {
    console.log(`[MARKET-BENCHMARKING] Getting clause popularity for ${contractType}`);

    try {
      const trending = await Benchmark.getTrendingClauses(contractType, 6);

      return trending.map(clause => ({
        clauseType: clause.clauseType,
        presenceRate: Math.round(clause.presenceRate * 100),
        avgScore: Math.round(clause.avgScore || 0),
        totalContracts: clause.count,
        recommendation: this.getClauseRecommendation(clause.presenceRate, clause.avgScore)
      }));

    } catch (error) {
      console.error('[MARKET-BENCHMARKING] Clause popularity error:', error);
      throw error;
    }
  }

  /**
   * Get clause recommendation
   * @param {number} presenceRate - How often clause appears (0-1)
   * @param {number} avgScore - Average quality score
   * @returns {string} - Recommendation
   */
  getClauseRecommendation(presenceRate, avgScore) {
    if (presenceRate > 0.8 && avgScore > 70) {
      return 'Sehr empfohlen - Branchenstandard mit hoher Qualität';
    } else if (presenceRate > 0.8) {
      return 'Empfohlen - Häufig verwendet, aber Qualitätsverbesserung möglich';
    } else if (presenceRate > 0.5) {
      return 'Optional - In der Hälfte der Verträge enthalten';
    } else {
      return 'Selten verwendet - Prüfen Sie Notwendigkeit';
    }
  }

  /**
   * Get overall market overview
   * @returns {Promise<Object>} - Market overview
   */
  async getMarketOverview() {
    console.log('[MARKET-BENCHMARKING] Getting market overview');

    try {
      const overview = await Benchmark.aggregate([
        { $match: { userOptedIn: true } },
        {
          $group: {
            _id: null,
            totalContracts: { $sum: 1 },
            avgRiskScore: { $avg: '$metrics.riskScore' },
            avgHealthScore: { $avg: '$metrics.healthScore' }
          }
        }
      ]);

      const byType = await Benchmark.aggregate([
        { $match: { userOptedIn: true } },
        {
          $group: {
            _id: '$contractType',
            count: { $sum: 1 },
            avgRisk: { $avg: '$metrics.riskScore' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const byIndustry = await Benchmark.aggregate([
        { $match: { userOptedIn: true, industry: { $ne: null } } },
        {
          $group: {
            _id: '$industry',
            count: { $sum: 1 },
            avgRisk: { $avg: '$metrics.riskScore' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        total: overview[0] || { totalContracts: 0, avgRiskScore: 0, avgHealthScore: 0 },
        byContractType: byType.map(t => ({
          type: t._id,
          count: t.count,
          avgRisk: Math.round(t.avgRisk)
        })),
        byIndustry: byIndustry.map(i => ({
          industry: i._id,
          count: i.count,
          avgRisk: Math.round(i.avgRisk)
        })),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[MARKET-BENCHMARKING] Overview error:', error);
      throw error;
    }
  }

  /**
   * Opt user contract into benchmarking
   * @param {string} contractId - Contract ID
   * @param {Object} analysis - AI analysis result
   * @returns {Promise<Object>} - Created benchmark
   */
  async optInContract(contractId, analysis) {
    console.log(`[MARKET-BENCHMARKING] Opting in contract ${contractId}`);

    try {
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const contract = await client.db('contract_ai')
        .collection('contracts')
        .findOne({ _id: new ObjectId(contractId) });

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Update contract settings
      await client.db('contract_ai')
        .collection('contracts')
        .updateOne(
          { _id: new ObjectId(contractId) },
          {
            $set: {
              'settings.allowBenchmarking': true
            }
          }
        );

      await client.close();

      // Create benchmark
      const benchmark = await Benchmark.createFromContract(contract, analysis);

      console.log(`[MARKET-BENCHMARKING] Contract ${contractId} opted in successfully`);

      return {
        success: true,
        benchmarkId: benchmark?._id,
        message: 'Contract opted into benchmarking'
      };

    } catch (error) {
      console.error('[MARKET-BENCHMARKING] Opt-in error:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MarketBenchmarkingService();
    }
    return instance;
  },
  MarketBenchmarkingService
};

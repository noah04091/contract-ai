// 📁 backend/models/Benchmark.js
// Legal Pulse 2.0 Phase 3 - Market Benchmarking Model

const mongoose = require('mongoose');

const benchmarkSchema = new mongoose.Schema({
  // Contract metadata (anonymized)
  contractType: {
    type: String,
    required: true,
    index: true,
    enum: [
      'Arbeitsvertrag',
      'Mietvertrag',
      'Kaufvertrag',
      'Dienstleistungsvertrag',
      'Lizenzvertrag',
      'NDA',
      'AGB',
      'Darlehensvertrag',
      'Gesellschaftsvertrag',
      'Franchisevertrag',
      'Sonstiges'
    ]
  },

  industry: {
    type: String,
    index: true,
    enum: [
      'IT',
      'Finanzen',
      'Gesundheit',
      'Einzelhandel',
      'Produktion',
      'Dienstleistung',
      'Immobilien',
      'Bildung',
      'E-Commerce',
      'Sonstiges'
    ]
  },

  contractSize: {
    type: String,
    enum: ['small', 'medium', 'large'], // Based on page count
    index: true
  },

  // Anonymized metrics
  metrics: {
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    healthScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    pageCount: {
      type: Number,
      min: 1
    },

    clauseCount: {
      type: Number,
      min: 0
    },

    // Legal areas covered
    legalAreas: [{
      type: String
    }],

    // Common clauses found
    commonClauses: [{
      type: {
        type: String,
        enum: [
          'termination',
          'liability',
          'confidentiality',
          'payment',
          'warranty',
          'data_protection',
          'dispute_resolution',
          'force_majeure',
          'intellectual_property',
          'non_compete'
        ]
      },
      present: Boolean,
      score: Number // Quality score of this clause
    }],

    // AI analysis scores
    aiScores: {
      clarity: { type: Number, min: 0, max: 100 },
      completeness: { type: Number, min: 0, max: 100 },
      fairness: { type: Number, min: 0, max: 100 },
      compliance: { type: Number, min: 0, max: 100 }
    }
  },

  // Anonymized geographic data (only country)
  country: {
    type: String,
    default: 'DE'
  },

  // Temporal data
  uploadedYear: {
    type: Number,
    index: true
  },

  uploadedQuarter: {
    type: Number,
    min: 1,
    max: 4
  },

  // Opt-in status
  userOptedIn: {
    type: Boolean,
    default: false,
    required: true
  },

  // Reference to original contract (hashed for privacy)
  contractHash: {
    type: String,
    unique: true,
    sparse: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
benchmarkSchema.index({ contractType: 1, industry: 1 });
benchmarkSchema.index({ 'metrics.riskScore': 1 });
benchmarkSchema.index({ 'metrics.healthScore': -1 });
benchmarkSchema.index({ uploadedYear: 1, uploadedQuarter: 1 });

// Static methods

/**
 * Get benchmark stats for contract type and industry
 * @param {string} contractType - Contract type
 * @param {string} industry - Industry
 * @returns {Promise<Object>} - Benchmark statistics
 */
benchmarkSchema.statics.getBenchmarkStats = async function(contractType, industry = null) {
  const query = { contractType, userOptedIn: true };
  if (industry) query.industry = industry;

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$metrics.riskScore' },
        minRiskScore: { $min: '$metrics.riskScore' },
        maxRiskScore: { $max: '$metrics.riskScore' },
        avgHealthScore: { $avg: '$metrics.healthScore' },
        minHealthScore: { $min: '$metrics.healthScore' },
        maxHealthScore: { $max: '$metrics.healthScore' },
        avgClarity: { $avg: '$metrics.aiScores.clarity' },
        avgCompleteness: { $avg: '$metrics.aiScores.completeness' },
        avgFairness: { $avg: '$metrics.aiScores.fairness' },
        avgCompliance: { $avg: '$metrics.aiScores.compliance' }
      }
    }
  ]);

  return stats[0] || null;
};

/**
 * Get percentile rank for contract
 * @param {Object} metrics - Contract metrics
 * @param {string} contractType - Contract type
 * @param {string} industry - Industry
 * @returns {Promise<Object>} - Percentile ranks
 */
benchmarkSchema.statics.getPercentileRank = async function(metrics, contractType, industry = null) {
  const query = { contractType, userOptedIn: true };
  if (industry) query.industry = industry;

  const total = await this.countDocuments(query);

  if (total === 0) {
    return {
      riskPercentile: 50,
      healthPercentile: 50,
      total: 0
    };
  }

  // Count how many have worse (higher) risk score
  const worseRisk = await this.countDocuments({
    ...query,
    'metrics.riskScore': { $gt: metrics.riskScore }
  });

  // Count how many have worse (lower) health score
  const worseHealth = await this.countDocuments({
    ...query,
    'metrics.healthScore': { $lt: metrics.healthScore }
  });

  return {
    riskPercentile: Math.round((worseRisk / total) * 100),
    healthPercentile: Math.round((worseHealth / total) * 100),
    total
  };
};

/**
 * Get trending clauses
 * @param {string} contractType - Contract type
 * @param {number} months - Months to look back
 * @returns {Promise<Array>} - Trending clauses
 */
benchmarkSchema.statics.getTrendingClauses = async function(contractType, months = 6) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const trending = await this.aggregate([
    {
      $match: {
        contractType,
        userOptedIn: true,
        createdAt: { $gte: cutoffDate }
      }
    },
    { $unwind: '$metrics.commonClauses' },
    {
      $group: {
        _id: '$metrics.commonClauses.type',
        count: { $sum: 1 },
        avgScore: { $avg: '$metrics.commonClauses.score' },
        presence: { $sum: { $cond: ['$metrics.commonClauses.present', 1, 0] } }
      }
    },
    {
      $project: {
        clauseType: '$_id',
        count: 1,
        avgScore: 1,
        presenceRate: { $divide: ['$presence', '$count'] }
      }
    },
    { $sort: { presenceRate: -1 } },
    { $limit: 10 }
  ]);

  return trending;
};

/**
 * Create benchmark from contract
 * @param {Object} contract - Contract object
 * @param {Object} analysis - AI analysis result
 * @returns {Promise<Object>} - Created benchmark
 */
benchmarkSchema.statics.createFromContract = async function(contract, analysis) {
  // Check if user opted in for benchmarking
  if (!contract.settings?.allowBenchmarking) {
    return null;
  }

  const crypto = require('crypto');
  const contractHash = crypto.createHash('sha256')
    .update(contract._id.toString())
    .digest('hex');

  // Check if benchmark already exists
  const existing = await this.findOne({ contractHash });
  if (existing) {
    return existing;
  }

  const uploadDate = new Date(contract.uploadedAt || contract.createdAt);

  const benchmarkData = {
    contractType: contract.contractType || 'Sonstiges',
    industry: contract.industry || 'Sonstiges',
    contractSize: this.determineContractSize(contract.pageCount),
    metrics: {
      riskScore: contract.legalPulse?.riskScore || analysis.riskScore || 50,
      healthScore: contract.legalPulse?.healthScore || 70,
      pageCount: contract.pageCount || 1,
      clauseCount: analysis.clauseCount || 0,
      legalAreas: contract.legalPulse?.lawInsights?.map(i => i.area) || [],
      commonClauses: this.extractCommonClauses(analysis),
      aiScores: {
        clarity: analysis.clarity || 70,
        completeness: analysis.completeness || 70,
        fairness: analysis.fairness || 70,
        compliance: analysis.compliance || 70
      }
    },
    country: 'DE',
    uploadedYear: uploadDate.getFullYear(),
    uploadedQuarter: Math.floor(uploadDate.getMonth() / 3) + 1,
    userOptedIn: true,
    contractHash
  };

  return await this.create(benchmarkData);
};

/**
 * Determine contract size category
 * @param {number} pageCount - Number of pages
 * @returns {string} - Size category
 */
benchmarkSchema.statics.determineContractSize = function(pageCount) {
  if (pageCount <= 5) return 'small';
  if (pageCount <= 20) return 'medium';
  return 'large';
};

/**
 * Extract common clauses from analysis
 * @param {Object} analysis - AI analysis
 * @returns {Array} - Common clauses
 */
benchmarkSchema.statics.extractCommonClauses = function(analysis) {
  const clauses = [];
  const clauseTypes = [
    'termination',
    'liability',
    'confidentiality',
    'payment',
    'warranty',
    'data_protection',
    'dispute_resolution',
    'force_majeure',
    'intellectual_property',
    'non_compete'
  ];

  for (const type of clauseTypes) {
    const clauseData = analysis.clauses?.[type];
    if (clauseData) {
      clauses.push({
        type,
        present: clauseData.present || false,
        score: clauseData.score || 0
      });
    }
  }

  return clauses;
};

const Benchmark = mongoose.model('Benchmark', benchmarkSchema);

module.exports = Benchmark;

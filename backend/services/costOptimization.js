// 📁 backend/services/costOptimization.js
// OpenAI Cost Optimization & Monitoring

class CostOptimization {
  constructor() {
    // Cost tracking (in-memory, could be moved to Redis/MongoDB for persistence)
    this.costStats = {
      embedding: {
        requests: 0,
        tokens: 0,
        estimatedCost: 0 // $0.00002 per 1K tokens for text-embedding-3-small
      },
      completion: {
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCost: 0 // $0.15 per 1M input, $0.60 per 1M output for gpt-4o-mini
      },
      totalEstimatedCost: 0,
      lastReset: new Date()
    };

    // Rate limiting state
    this.rateLimits = {
      embedding: {
        requestsPerMinute: 500, // Conservative limit (OpenAI allows 3000-5000)
        tokensPerMinute: 1000000, // 1M tokens/min limit
        currentRequests: 0,
        currentTokens: 0,
        windowStart: Date.now()
      },
      completion: {
        requestsPerMinute: 100, // Conservative for GPT-4o-mini
        tokensPerMinute: 200000, // 200K tokens/min
        currentRequests: 0,
        currentTokens: 0,
        windowStart: Date.now()
      }
    };

    // Simple in-memory cache for embeddings (maps text hash → embedding)
    this.embeddingCache = new Map();
    this.maxCacheSize = 10000; // Cache up to 10K embeddings
  }

  /**
   * Check if we can make a request without exceeding rate limits
   * @param {string} type - 'embedding' or 'completion'
   * @param {number} estimatedTokens - Estimated tokens for this request
   * @returns {Object} - { allowed: boolean, retryAfter: number }
   */
  checkRateLimit(type, estimatedTokens = 0) {
    const limit = this.rateLimits[type];
    if (!limit) return { allowed: true, retryAfter: 0 };

    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute

    // Reset window if needed
    if (now - limit.windowStart >= windowDuration) {
      limit.currentRequests = 0;
      limit.currentTokens = 0;
      limit.windowStart = now;
    }

    // Check if request would exceed limits
    const wouldExceedRequests = limit.currentRequests >= limit.requestsPerMinute;
    const wouldExceedTokens = limit.currentTokens + estimatedTokens > limit.tokensPerMinute;

    if (wouldExceedRequests || wouldExceedTokens) {
      const timeUntilReset = windowDuration - (now - limit.windowStart);
      return {
        allowed: false,
        retryAfter: Math.ceil(timeUntilReset / 1000), // seconds
        reason: wouldExceedRequests ? 'requests_limit' : 'tokens_limit'
      };
    }

    return { allowed: true, retryAfter: 0 };
  }

  /**
   * Record an API request for rate limiting tracking
   * @param {string} type - 'embedding' or 'completion'
   * @param {number} tokens - Actual tokens used
   */
  recordRequest(type, tokens = 0) {
    const limit = this.rateLimits[type];
    if (limit) {
      limit.currentRequests++;
      limit.currentTokens += tokens;
    }
  }

  /**
   * Track embedding costs
   * @param {number} tokens - Number of tokens embedded
   */
  trackEmbeddingCost(tokens) {
    this.costStats.embedding.requests++;
    this.costStats.embedding.tokens += tokens;

    // text-embedding-3-small: $0.00002 per 1K tokens
    const cost = (tokens / 1000) * 0.00002;
    this.costStats.embedding.estimatedCost += cost;
    this.costStats.totalEstimatedCost += cost;

    this.recordRequest('embedding', tokens);
  }

  /**
   * Track completion costs (GPT-4o-mini)
   * @param {number} promptTokens - Input tokens
   * @param {number} completionTokens - Output tokens
   */
  trackCompletionCost(promptTokens, completionTokens) {
    this.costStats.completion.requests++;
    this.costStats.completion.promptTokens += promptTokens;
    this.costStats.completion.completionTokens += completionTokens;

    // gpt-4o-mini: $0.15/1M input, $0.60/1M output
    const inputCost = (promptTokens / 1000000) * 0.15;
    const outputCost = (completionTokens / 1000000) * 0.60;
    const totalCost = inputCost + outputCost;

    this.costStats.completion.estimatedCost += totalCost;
    this.costStats.totalEstimatedCost += totalCost;

    this.recordRequest('completion', promptTokens + completionTokens);
  }

  /**
   * Get cost statistics
   * @returns {Object} - Cost stats
   */
  getStats() {
    const now = new Date();
    const hoursSinceReset = (now - this.costStats.lastReset) / (1000 * 60 * 60);

    return {
      ...this.costStats,
      costPerHour: hoursSinceReset > 0
        ? this.costStats.totalEstimatedCost / hoursSinceReset
        : 0,
      projectedMonthlyCost: hoursSinceReset > 0
        ? (this.costStats.totalEstimatedCost / hoursSinceReset) * 24 * 30
        : 0,
      cacheStats: {
        size: this.embeddingCache.size,
        maxSize: this.maxCacheSize,
        hitRate: this.cacheHits / Math.max(1, this.cacheHits + this.cacheMisses)
      }
    };
  }

  /**
   * Reset cost stats (useful for monthly tracking)
   */
  resetStats() {
    const oldStats = { ...this.costStats };

    this.costStats = {
      embedding: { requests: 0, tokens: 0, estimatedCost: 0 },
      completion: { requests: 0, promptTokens: 0, completionTokens: 0, estimatedCost: 0 },
      totalEstimatedCost: 0,
      lastReset: new Date()
    };

    return oldStats;
  }

  /**
   * Get cached embedding if available
   * @param {string} textHash - Hash of the text
   * @returns {number[]|null} - Cached embedding or null
   */
  getCachedEmbedding(textHash) {
    if (this.embeddingCache.has(textHash)) {
      this.cacheHits = (this.cacheHits || 0) + 1;
      return this.embeddingCache.get(textHash);
    }

    this.cacheMisses = (this.cacheMisses || 0) + 1;
    return null;
  }

  /**
   * Cache an embedding
   * @param {string} textHash - Hash of the text
   * @param {number[]} embedding - The embedding vector
   */
  cacheEmbedding(textHash, embedding) {
    // Simple LRU: Remove oldest if cache full
    if (this.embeddingCache.size >= this.maxCacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }

    this.embeddingCache.set(textHash, embedding);
  }

  /**
   * Generate hash for text (for caching)
   * @param {string} text
   * @returns {string} - Hash
   */
  hashText(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Check if monthly budget would be exceeded
   * @param {number} monthlyBudget - Budget in USD
   * @returns {Object} - { exceeded: boolean, projected: number, remaining: number }
   */
  checkBudget(monthlyBudget) {
    const stats = this.getStats();
    const projected = stats.projectedMonthlyCost;
    const remaining = monthlyBudget - projected;

    return {
      exceeded: projected > monthlyBudget,
      projected,
      remaining,
      percentUsed: (projected / monthlyBudget) * 100
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new CostOptimization();
    }
    return instance;
  },
  CostOptimization
};

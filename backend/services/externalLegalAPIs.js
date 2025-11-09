// 📁 backend/services/externalLegalAPIs.js
// Legal Pulse 2.0 Phase 3 - Unified External Legal APIs Orchestrator

const { getInstance: getEULex } = require('./euLexConnector');
const { getInstance: getBundesanzeiger } = require('./bundesanzeigerConnector');
const { getInstance: getGovData } = require('./govDataConnector');
const { getInstance: getLawEmbeddings } = require('./lawEmbeddings');
const Law = require('../models/Law');

class ExternalLegalAPIs {
  constructor() {
    this.euLex = getEULex();
    this.bundesanzeiger = getBundesanzeiger();
    this.govData = getGovData();
    this.lawEmbeddings = getLawEmbeddings();

    this.enabledSources = ['eu-lex', 'bundesanzeiger', 'govdata'];
    this.cacheExpiry = 3600000; // 1 hour

    console.log('[EXTERNAL-LEGAL-APIS] Orchestrator initialized');
  }

  /**
   * Search across all external sources
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} - Aggregated results
   */
  async searchAllSources({ query, area = null, limit = 30 }) {
    console.log(`[EXTERNAL-LEGAL-APIS] Searching all sources: "${query}"`);

    const results = await Promise.allSettled([
      this.searchEULex(query, area, Math.ceil(limit / 3)),
      this.searchBundesanzeiger(query, area, Math.ceil(limit / 3)),
      this.searchGovData(query, area, Math.ceil(limit / 3))
    ]);

    const aggregated = {
      query,
      totalResults: 0,
      sources: {},
      results: [],
      timestamp: new Date()
    };

    // EU-Lex results
    if (results[0].status === 'fulfilled') {
      aggregated.sources['eu-lex'] = {
        count: results[0].value.length,
        status: 'success'
      };
      aggregated.results.push(...results[0].value);
    } else {
      aggregated.sources['eu-lex'] = {
        count: 0,
        status: 'error',
        error: results[0].reason?.message
      };
    }

    // Bundesanzeiger results
    if (results[1].status === 'fulfilled') {
      aggregated.sources['bundesanzeiger'] = {
        count: results[1].value.length,
        status: 'success'
      };
      aggregated.results.push(...results[1].value);
    } else {
      aggregated.sources['bundesanzeiger'] = {
        count: 0,
        status: 'error',
        error: results[1].reason?.message
      };
    }

    // GovData results
    if (results[2].status === 'fulfilled') {
      aggregated.sources['govdata'] = {
        count: results[2].value.length,
        status: 'success'
      };
      aggregated.results.push(...results[2].value);
    } else {
      aggregated.sources['govdata'] = {
        count: 0,
        status: 'error',
        error: results[2].reason?.message
      };
    }

    // Sort by relevance and limit
    aggregated.results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    aggregated.results = aggregated.results.slice(0, limit);
    aggregated.totalResults = aggregated.results.length;

    console.log(`[EXTERNAL-LEGAL-APIS] Found ${aggregated.totalResults} results from ${Object.keys(aggregated.sources).length} sources`);

    return aggregated;
  }

  /**
   * Search EU-Lex
   * @param {string} query - Search query
   * @param {string} area - Legal area
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Results
   */
  async searchEULex(query, area, limit) {
    try {
      const results = await this.euLex.searchDocuments({
        query,
        limit
      });

      return results.map(result => ({
        ...result,
        area: this.euLex.mapSubjectToArea(result.subject || ''),
        source: 'eu-lex'
      }));
    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] EU-Lex search error:', error.message);
      return [];
    }
  }

  /**
   * Search Bundesanzeiger
   * @param {string} query - Search query
   * @param {string} area - Legal area
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Results
   */
  async searchBundesanzeiger(query, area, limit) {
    try {
      const results = await this.bundesanzeiger.searchPublications({
        query,
        limit
      });

      return results.map(result => ({
        ...result,
        area: this.bundesanzeiger.mapAreaToContractArea(result.area || ''),
        source: 'bundesanzeiger'
      }));
    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] Bundesanzeiger search error:', error.message);
      return [];
    }
  }

  /**
   * Search GovData
   * @param {string} query - Search query
   * @param {string} area - Legal area
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Results
   */
  async searchGovData(query, area, limit) {
    try {
      const results = await this.govData.searchDatasets({
        query,
        category: area ? 'gesetze_justiz' : null,
        limit
      });

      return results;
    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] GovData search error:', error.message);
      return [];
    }
  }

  /**
   * Get recent legal changes from all sources
   * @param {number} days - Days to look back
   * @returns {Promise<Object>} - Aggregated changes
   */
  async getRecentChanges(days = 7) {
    console.log(`[EXTERNAL-LEGAL-APIS] Fetching recent changes (${days} days)`);

    const results = await Promise.allSettled([
      this.euLex.getRecentChanges(days),
      this.bundesanzeiger.getRecentAnnouncements(days),
      this.govData.getRecentDatasets(days)
    ]);

    const changes = {
      days,
      totalChanges: 0,
      bySource: {},
      changes: [],
      timestamp: new Date()
    };

    // Process EU-Lex
    if (results[0].status === 'fulfilled') {
      const euLexChanges = results[0].value;
      changes.bySource['eu-lex'] = euLexChanges.length;
      changes.changes.push(...euLexChanges.map(c => ({
        ...c,
        source: 'eu-lex',
        area: this.euLex.mapSubjectToArea(c.subject || '')
      })));
    }

    // Process Bundesanzeiger
    if (results[1].status === 'fulfilled') {
      const baChanges = results[1].value;
      changes.bySource['bundesanzeiger'] = baChanges.length;
      changes.changes.push(...baChanges.map(c => ({
        ...c,
        source: 'bundesanzeiger'
      })));
    }

    // Process GovData
    if (results[2].status === 'fulfilled') {
      const gdChanges = results[2].value;
      changes.bySource['govdata'] = gdChanges.length;
      changes.changes.push(...gdChanges.map(c => ({
        ...c,
        source: 'govdata'
      })));
    }

    // Sort by date (newest first)
    changes.changes.sort((a, b) => {
      const dateA = new Date(a.date || a.modified || 0);
      const dateB = new Date(b.date || b.modified || 0);
      return dateB - dateA;
    });

    changes.totalChanges = changes.changes.length;

    console.log(`[EXTERNAL-LEGAL-APIS] Found ${changes.totalChanges} recent changes`);

    return changes;
  }

  /**
   * Sync external law changes to local database
   * @param {number} days - Days to look back
   * @returns {Promise<Object>} - Sync results
   */
  async syncToLocalDatabase(days = 7) {
    console.log(`[EXTERNAL-LEGAL-APIS] Syncing external changes to local DB`);

    try {
      const recentChanges = await this.getRecentChanges(days);
      let synced = 0;
      let skipped = 0;
      let errors = 0;

      for (const change of recentChanges.changes) {
        try {
          // Check if already exists
          const exists = await Law.findOne({
            lawId: change.celex || change.title,
            sourceUrl: change.url
          });

          if (exists) {
            skipped++;
            continue;
          }

          // Create new law entry
          const lawData = {
            lawId: change.celex || change.title || `external-${Date.now()}`,
            sectionId: change.celex || change.id || 'main',
            title: change.title,
            text: change.description || change.summary || change.title,
            sourceUrl: change.url || '',
            area: change.area || 'Sonstiges',
            effective: change.effectiveDate || change.date || new Date(),
            source: change.source
          };

          // Generate embedding
          if (this.lawEmbeddings && lawData.text) {
            try {
              lawData.embedding = await this.lawEmbeddings.generateEmbedding(lawData.text);
            } catch (embError) {
              console.warn('[EXTERNAL-LEGAL-APIS] Embedding generation failed:', embError.message);
            }
          }

          await Law.create(lawData);
          synced++;

        } catch (error) {
          console.error('[EXTERNAL-LEGAL-APIS] Sync error for item:', error.message);
          errors++;
        }
      }

      const syncResult = {
        success: true,
        totalChanges: recentChanges.totalChanges,
        synced,
        skipped,
        errors,
        timestamp: new Date()
      };

      console.log(`[EXTERNAL-LEGAL-APIS] Sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`);

      return syncResult;

    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get relevant external laws for contract
   * @param {string} contractText - Contract text
   * @param {string} area - Contract area
   * @returns {Promise<Array>} - Relevant laws
   */
  async getRelevantLawsForContract(contractText, area) {
    console.log(`[EXTERNAL-LEGAL-APIS] Finding relevant laws for contract (area: ${area})`);

    try {
      // Search all sources
      const searchResults = await this.searchAllSources({
        query: contractText.substring(0, 500), // Use first 500 chars
        area,
        limit: 10
      });

      // Filter and enrich with relevance scoring
      const relevantLaws = searchResults.results
        .filter(law => law.relevance && law.relevance > 0.6)
        .map(law => ({
          ...law,
          applicability: this.assessApplicability(law, area),
          recommendedAction: this.getRecommendedAction(law)
        }));

      console.log(`[EXTERNAL-LEGAL-APIS] Found ${relevantLaws.length} relevant laws`);

      return relevantLaws;

    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] Relevant laws error:', error.message);
      return [];
    }
  }

  /**
   * Assess law applicability to contract
   * @param {Object} law - Law object
   * @param {string} contractArea - Contract area
   * @returns {string} - Applicability level
   */
  assessApplicability(law, contractArea) {
    if (law.area === contractArea) return 'direct';
    if (law.relevance > 0.8) return 'high';
    if (law.relevance > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action for law
   * @param {Object} law - Law object
   * @returns {string} - Recommended action
   */
  getRecommendedAction(law) {
    if (law.relevance > 0.9) return 'immediate_review';
    if (law.relevance > 0.75) return 'review_recommended';
    if (law.relevance > 0.6) return 'monitor';
    return 'informational';
  }

  /**
   * Check health of all external APIs
   * @returns {Promise<Object>} - Health status
   */
  async checkAllAPIsHealth() {
    console.log('[EXTERNAL-LEGAL-APIS] Checking API health');

    const healthChecks = await Promise.allSettled([
      this.euLex.checkHealth(),
      this.bundesanzeiger.checkHealth(),
      this.govData.checkHealth()
    ]);

    const health = {
      overall: 'healthy',
      apis: {},
      timestamp: new Date()
    };

    // EU-Lex
    if (healthChecks[0].status === 'fulfilled') {
      health.apis['eu-lex'] = healthChecks[0].value;
    } else {
      health.apis['eu-lex'] = { healthy: false, error: healthChecks[0].reason?.message };
      health.overall = 'degraded';
    }

    // Bundesanzeiger
    if (healthChecks[1].status === 'fulfilled') {
      health.apis['bundesanzeiger'] = healthChecks[1].value;
    } else {
      health.apis['bundesanzeiger'] = { healthy: false, error: healthChecks[1].reason?.message };
      health.overall = 'degraded';
    }

    // GovData
    if (healthChecks[2].status === 'fulfilled') {
      health.apis['govdata'] = healthChecks[2].value;
    } else {
      health.apis['govdata'] = { healthy: false, error: healthChecks[2].reason?.message };
      health.overall = 'degraded';
    }

    const healthyCount = Object.values(health.apis).filter(api => api.healthy).length;
    if (healthyCount === 0) {
      health.overall = 'unhealthy';
    } else if (healthyCount < 3) {
      health.overall = 'degraded';
    }

    console.log(`[EXTERNAL-LEGAL-APIS] Health check complete: ${health.overall}`);

    return health;
  }

  /**
   * Get statistics about external sources
   * @returns {Promise<Object>} - Statistics
   */
  async getStatistics() {
    const localLaws = await Law.countDocuments({ source: { $in: ['eu-lex', 'bundesanzeiger', 'govdata'] } });
    const bySource = await Law.aggregate([
      { $match: { source: { $in: ['eu-lex', 'bundesanzeiger', 'govdata'] } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    return {
      totalExternalLaws: localLaws,
      bySource: bySource.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      enabledSources: this.enabledSources,
      timestamp: new Date()
    };
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ExternalLegalAPIs();
    }
    return instance;
  },
  ExternalLegalAPIs
};

// 📁 backend/services/externalLegalAPIs.js
// Legal Pulse 2.0 Phase 3 - Unified External Legal APIs Orchestrator

const { getInstance: getEULex } = require('./euLexConnector');
const { getInstance: getBundesanzeiger } = require('./bundesanzeigerConnector');
const { getInstance: getGovData } = require('./govDataConnector');
const { getInstance: getOpenLegalData } = require('./openLegalDataConnector');
const { getInstance: getGesetzImInternet } = require('./gesetzImInternetConnector');
const { getInstance: getRechtsinformationen } = require('./rechtsinformationenConnector');
const { getInstance: getLawEmbeddings } = require('./lawEmbeddings');
const Law = require('../models/Law');

class ExternalLegalAPIs {
  constructor() {
    this.euLex = getEULex();
    this.bundesanzeiger = getBundesanzeiger();
    this.govData = getGovData();
    this.openLegalData = getOpenLegalData();
    this.gesetzImInternet = getGesetzImInternet();
    this.rechtsinformationen = getRechtsinformationen();
    this.lawEmbeddings = getLawEmbeddings();

    // Rechtsinformationsportal is highest priority (full-text search), then existing sources
    this.enabledSources = ['rechtsinformationen', 'openlegaldata', 'gesetze-im-internet', 'eu-lex', 'bundesanzeiger', 'govdata'];
    this.cacheExpiry = 3600000; // 1 hour

    console.log('[EXTERNAL-LEGAL-APIS] Orchestrator initialized with Rechtsinformationsportal + enhanced sources');
  }

  /**
   * Search across all external sources
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} - Aggregated results
   */
  async searchAllSources({ query, area = null, sources = null, limit = 30 }) {
    // sources: optional array of source names to filter by (null = all sources)
    const isSourceEnabled = (name) => !sources || sources.includes(name);

    const activeSources = this.enabledSources.filter(isSourceEnabled);
    console.log(`[EXTERNAL-LEGAL-APIS] Searching sources: "${query}" → [${activeSources.join(', ')}]`);

    // Distribute limit across active sources - Rechtsinformationsportal gets highest priority
    const activeCount = activeSources.length;
    const primaryLimit = Math.ceil(limit / Math.max(activeCount, 1));
    const secondaryLimit = Math.ceil(limit / Math.max(activeCount, 2));
    const tertiaryLimit = Math.ceil(limit / Math.max(activeCount, 3));

    // Build search promises only for enabled sources
    const searchTasks = [];
    const sourceNames = [];

    if (isSourceEnabled('rechtsinformationen')) {
      searchTasks.push(this.searchRechtsinformationen(query, area, primaryLimit));
      sourceNames.push('rechtsinformationen');
    }
    if (isSourceEnabled('openlegaldata')) {
      searchTasks.push(this.searchOpenLegalData(query, area, secondaryLimit));
      sourceNames.push('openlegaldata');
    }
    if (isSourceEnabled('gesetze-im-internet')) {
      searchTasks.push(this.searchGesetzImInternet(query, area, secondaryLimit));
      sourceNames.push('gesetze-im-internet');
    }
    if (isSourceEnabled('eulex') || isSourceEnabled('eu-lex')) {
      searchTasks.push(this.searchEULex(query, area, tertiaryLimit));
      sourceNames.push('eu-lex');
    }
    if (isSourceEnabled('bundesanzeiger')) {
      searchTasks.push(this.searchBundesanzeiger(query, area, tertiaryLimit));
      sourceNames.push('bundesanzeiger');
    }
    if (isSourceEnabled('govdata')) {
      searchTasks.push(this.searchGovData(query, area, tertiaryLimit));
      sourceNames.push('govdata');
    }

    const results = await Promise.allSettled(searchTasks);

    const aggregated = {
      query,
      totalResults: 0,
      sources: {},
      results: [],
      timestamp: new Date()
    };

    results.forEach((result, index) => {
      const sourceName = sourceNames[index];
      if (result.status === 'fulfilled') {
        aggregated.sources[sourceName] = {
          count: result.value.length,
          status: 'success'
        };
        aggregated.results.push(...result.value);
      } else {
        aggregated.sources[sourceName] = {
          count: 0,
          status: 'error',
          error: result.reason?.message
        };
      }
    });

    // Deduplicate results by title similarity
    const seenTitles = new Set();
    const dedupedResults = aggregated.results.filter(result => {
      const normalizedTitle = (result.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    });

    // Sort by relevance and limit
    dedupedResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    aggregated.results = dedupedResults.slice(0, limit);
    aggregated.totalResults = aggregated.results.length;

    console.log(`[EXTERNAL-LEGAL-APIS] Found ${aggregated.totalResults} unique results from ${Object.keys(aggregated.sources).length} sources`);

    return aggregated;
  }

  /**
   * Search Open Legal Data (primary German source)
   * @param {string} query - Search query
   * @param {string} area - Legal area
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Results
   */
  async searchOpenLegalData(query, area, limit) {
    try {
      const results = await this.openLegalData.searchLaws({
        query,
        limit
      });

      return results.map(result => ({
        ...result,
        area: result.area || this.openLegalData.mapAreaToContractArea(result.area),
        source: 'openlegaldata'
      }));
    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] Open Legal Data search error:', error.message);
      return [];
    }
  }

  /**
   * Search gesetze-im-internet.de (official German laws)
   * @param {string} query - Search query
   * @param {string} area - Legal area
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Results
   */
  async searchGesetzImInternet(query, area, limit) {
    try {
      const results = await this.gesetzImInternet.searchLaws({
        query,
        limit
      });

      return results.map(result => ({
        ...result,
        area: result.area || this.gesetzImInternet.mapAreaToContractArea(result.area),
        source: 'gesetze-im-internet'
      }));
    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] gesetze-im-internet.de search error:', error.message);
      return [];
    }
  }

  /**
   * Search Rechtsinformationsportal des Bundes (primary full-text source)
   * @param {string} query - Search query
   * @param {string} area - Legal area
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Results
   */
  async searchRechtsinformationen(query, area, limit) {
    try {
      const results = await this.rechtsinformationen.searchLaws({
        query,
        limit
      });

      return results.map(result => ({
        ...result,
        area: result.area || this.rechtsinformationen.mapAreaToContractArea(result.area),
        source: 'rechtsinformationen'
      }));
    } catch (error) {
      console.error('[EXTERNAL-LEGAL-APIS] Rechtsinformationsportal search error:', error.message);
      return [];
    }
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
      this.rechtsinformationen.getRecentChanges(days),
      this.openLegalData.getRecentChanges(days),
      this.gesetzImInternet.getRecentChanges(days),
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

    // Process Rechtsinformationsportal
    if (results[0].status === 'fulfilled') {
      const riChanges = results[0].value;
      changes.bySource['rechtsinformationen'] = riChanges.length;
      changes.changes.push(...riChanges.map(c => ({
        ...c,
        source: 'rechtsinformationen'
      })));
    }

    // Process Open Legal Data
    if (results[1].status === 'fulfilled') {
      const oldChanges = results[1].value;
      changes.bySource['openlegaldata'] = oldChanges.length;
      changes.changes.push(...oldChanges.map(c => ({
        ...c,
        source: 'openlegaldata'
      })));
    }

    // Process gesetze-im-internet.de
    if (results[2].status === 'fulfilled') {
      const giiChanges = results[2].value;
      changes.bySource['gesetze-im-internet'] = giiChanges.length;
      changes.changes.push(...giiChanges.map(c => ({
        ...c,
        source: 'gesetze-im-internet'
      })));
    }

    // Process EU-Lex
    if (results[3].status === 'fulfilled') {
      const euLexChanges = results[3].value;
      changes.bySource['eu-lex'] = euLexChanges.length;
      changes.changes.push(...euLexChanges.map(c => ({
        ...c,
        source: 'eu-lex',
        area: this.euLex.mapSubjectToArea(c.subject || '')
      })));
    }

    // Process Bundesanzeiger
    if (results[4].status === 'fulfilled') {
      const baChanges = results[4].value;
      changes.bySource['bundesanzeiger'] = baChanges.length;
      changes.changes.push(...baChanges.map(c => ({
        ...c,
        source: 'bundesanzeiger'
      })));
    }

    // Process GovData
    if (results[5].status === 'fulfilled') {
      const gdChanges = results[5].value;
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
      this.rechtsinformationen.checkHealth(),
      this.openLegalData.checkHealth(),
      this.gesetzImInternet.checkHealth(),
      this.euLex.checkHealth(),
      this.bundesanzeiger.checkHealth(),
      this.govData.checkHealth()
    ]);

    const health = {
      overall: 'healthy',
      apis: {},
      timestamp: new Date()
    };

    const sourceNames = ['rechtsinformationen', 'openlegaldata', 'gesetze-im-internet', 'eu-lex', 'bundesanzeiger', 'govdata'];

    healthChecks.forEach((check, index) => {
      const sourceName = sourceNames[index];
      if (check.status === 'fulfilled') {
        health.apis[sourceName] = check.value;
        if (!check.value.healthy) {
          health.overall = 'degraded';
        }
      } else {
        health.apis[sourceName] = { healthy: false, error: check.reason?.message };
        health.overall = 'degraded';
      }
    });

    const healthyCount = Object.values(health.apis).filter(api => api.healthy).length;
    const totalApis = Object.keys(health.apis).length;

    if (healthyCount === 0) {
      health.overall = 'unhealthy';
    } else if (healthyCount < totalApis / 2) {
      health.overall = 'degraded';
    } else if (healthyCount < totalApis) {
      health.overall = 'partial';
    }

    console.log(`[EXTERNAL-LEGAL-APIS] Health check complete: ${health.overall} (${healthyCount}/${totalApis} healthy)`);

    return health;
  }

  /**
   * Get statistics about external sources
   * @returns {Promise<Object>} - Statistics
   */
  async getStatistics() {
    const allSources = ['rechtsinformationen', 'eu-lex', 'bundesanzeiger', 'govdata', 'openlegaldata', 'gesetze-im-internet'];
    const localLaws = await Law.countDocuments({ source: { $in: allSources } });
    const bySource = await Law.aggregate([
      { $match: { source: { $in: allSources } } },
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

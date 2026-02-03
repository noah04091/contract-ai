// 📁 backend/services/openLegalDataConnector.js
// Legal Pulse 2.0 - Open Legal Data API Integration
// Primary source for German laws (57.000+ Gesetze)
// API: https://de.openlegaldata.io/api/

const axios = require('axios');

class OpenLegalDataConnector {
  constructor() {
    this.baseUrl = 'https://de.openlegaldata.io/api';
    this.timeout = 15000;
    this.cache = new Map();
    this.cacheExpiry = 1800000; // 30 minutes

    console.log('[OPEN-LEGAL-DATA] Connector initialized');
  }

  /**
   * Search for German laws
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Search results
   */
  async searchLaws({ query, limit = 30, court = null, dateFrom = null, dateTo = null }) {
    console.log(`[OPEN-LEGAL-DATA] Searching laws: "${query}"`);

    const cacheKey = `search:${query}:${limit}:${court || ''}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('[OPEN-LEGAL-DATA] Returning cached results');
      return cached;
    }

    try {
      // Search in laws endpoint
      const lawResults = await this.searchLawsEndpoint(query, limit);

      // Also search in cases for relevant legal interpretations
      const caseResults = await this.searchCasesEndpoint(query, Math.ceil(limit / 3));

      // Combine and normalize results
      const combinedResults = [
        ...lawResults.map(r => ({ ...r, resultType: 'law' })),
        ...caseResults.map(r => ({ ...r, resultType: 'case' }))
      ];

      // Sort by relevance
      combinedResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      const finalResults = combinedResults.slice(0, limit);
      this.setCache(cacheKey, finalResults);

      console.log(`[OPEN-LEGAL-DATA] Found ${finalResults.length} results`);
      return finalResults;

    } catch (error) {
      console.error('[OPEN-LEGAL-DATA] Search error:', error.message);
      // Return empty array instead of mock data - let other sources fill in
      return [];
    }
  }

  /**
   * Search the laws endpoint
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Law results
   */
  async searchLawsEndpoint(query, limit) {
    try {
      const response = await axios.get(`${this.baseUrl}/laws/`, {
        params: {
          search: query,
          page_size: limit
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data.results) {
        return [];
      }

      return response.data.results.map(law => this.normalizeLawResult(law, query));

    } catch (error) {
      console.error('[OPEN-LEGAL-DATA] Laws endpoint error:', error.message);
      return [];
    }
  }

  /**
   * Search the cases endpoint for legal interpretations
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Case results
   */
  async searchCasesEndpoint(query, limit) {
    try {
      const response = await axios.get(`${this.baseUrl}/cases/`, {
        params: {
          search: query,
          page_size: limit
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data.results) {
        return [];
      }

      return response.data.results.map(caseItem => this.normalizeCaseResult(caseItem, query));

    } catch (error) {
      console.error('[OPEN-LEGAL-DATA] Cases endpoint error:', error.message);
      return [];
    }
  }

  /**
   * Normalize law result to common format
   * @param {Object} law - Raw law object
   * @param {string} query - Search query for relevance calculation
   * @returns {Object} - Normalized result
   */
  normalizeLawResult(law, query) {
    const title = law.title || law.name || 'Unbekanntes Gesetz';
    const relevance = this.calculateRelevance(title, law.content || '', query);

    return {
      id: law.id?.toString() || `old-law-${Date.now()}`,
      title: title,
      description: law.content ? this.truncateText(law.content, 300) : null,
      date: law.date || law.enactment_date || null,
      type: 'law',
      source: 'openlegaldata',
      url: law.source_url || `https://de.openlegaldata.io/law/${law.id}/`,
      relevance: relevance,
      area: this.detectLegalArea(title, law.content || ''),
      documentId: law.slug || law.id?.toString()
    };
  }

  /**
   * Normalize case result to common format
   * @param {Object} caseItem - Raw case object
   * @param {string} query - Search query for relevance calculation
   * @returns {Object} - Normalized result
   */
  normalizeCaseResult(caseItem, query) {
    const title = caseItem.name || caseItem.file_number || 'Unbekanntes Urteil';
    const relevance = this.calculateRelevance(title, caseItem.content || '', query);

    return {
      id: caseItem.id?.toString() || `old-case-${Date.now()}`,
      title: `${caseItem.court?.name || 'Gericht'}: ${title}`,
      description: caseItem.content ? this.truncateText(caseItem.content, 300) : null,
      date: caseItem.date || null,
      type: 'case',
      source: 'openlegaldata',
      url: caseItem.source_url || `https://de.openlegaldata.io/case/${caseItem.id}/`,
      relevance: relevance * 0.9, // Cases slightly lower relevance than laws
      area: this.detectLegalArea(title, caseItem.content || ''),
      documentId: caseItem.file_number || caseItem.id?.toString(),
      court: caseItem.court?.name
    };
  }

  /**
   * Calculate relevance score
   * @param {string} title - Document title
   * @param {string} content - Document content
   * @param {string} query - Search query
   * @returns {number} - Relevance score (0-1)
   */
  calculateRelevance(title, content, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    let score = 0;
    let matchedTerms = 0;

    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        score += 0.4;
        matchedTerms++;
      }
      if (contentLower.includes(term)) {
        score += 0.2;
        matchedTerms++;
      }
    }

    // Bonus for exact phrase match
    if (titleLower.includes(query.toLowerCase())) {
      score += 0.3;
    }

    // Normalize score
    const normalizedScore = Math.min(score, 1);
    return Math.round(normalizedScore * 100) / 100;
  }

  /**
   * Detect legal area from content
   * @param {string} title - Document title
   * @param {string} content - Document content
   * @returns {string} - Legal area
   */
  detectLegalArea(title, content) {
    const text = `${title} ${content}`.toLowerCase();

    const areaKeywords = {
      'Datenschutz': ['datenschutz', 'dsgvo', 'bdsg', 'personenbezogen', 'privacy'],
      'Arbeitsrecht': ['arbeit', 'kündigung', 'arbeitsvertrag', 'gehalt', 'urlaub', 'betriebsrat'],
      'Vertragsrecht': ['vertrag', 'schuld', 'bgb', 'leistung', 'haftung', 'gewährleistung'],
      'Handelsrecht': ['handel', 'hgb', 'kaufmann', 'handelsregister', 'firma'],
      'Gesellschaftsrecht': ['gmbh', 'aktiengesellschaft', 'gesellschaft', 'satzung', 'geschäftsführer'],
      'Mietrecht': ['miete', 'mietvertrag', 'vermieter', 'mieter', 'wohnung'],
      'Steuerrecht': ['steuer', 'finanz', 'einkommen', 'umsatzsteuer', 'abgabe'],
      'IT-Recht': ['software', 'digital', 'internet', 'online', 'elektronisch'],
      'Verbraucherrecht': ['verbraucher', 'widerruf', 'fernabsatz', 'agb']
    };

    for (const [area, keywords] of Object.entries(areaKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return area;
        }
      }
    }

    return 'Sonstiges';
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Max length
   * @returns {string} - Truncated text
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Get recent law changes
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} - Recent changes
   */
  async getRecentChanges(days = 30) {
    console.log(`[OPEN-LEGAL-DATA] Fetching changes from last ${days} days`);

    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const dateStr = dateFrom.toISOString().split('T')[0];

      const response = await axios.get(`${this.baseUrl}/laws/`, {
        params: {
          ordering: '-date',
          date__gte: dateStr,
          page_size: 50
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data.results) {
        return [];
      }

      return response.data.results.map(law => this.normalizeLawResult(law, ''));

    } catch (error) {
      console.error('[OPEN-LEGAL-DATA] Recent changes error:', error.message);
      return [];
    }
  }

  /**
   * Get specific law by ID
   * @param {string} lawId - Law ID
   * @returns {Promise<Object>} - Law details
   */
  async getLaw(lawId) {
    console.log(`[OPEN-LEGAL-DATA] Fetching law: ${lawId}`);

    try {
      const response = await axios.get(`${this.baseUrl}/laws/${lawId}/`, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'application/json'
        }
      });

      return this.normalizeLawResult(response.data, '');

    } catch (error) {
      console.error('[OPEN-LEGAL-DATA] Get law error:', error.message);
      return null;
    }
  }

  /**
   * Check API health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/laws/`, {
        params: { page_size: 1 },
        timeout: 5000
      });

      return {
        healthy: response.status === 200,
        endpoint: this.baseUrl,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        endpoint: this.baseUrl,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Set cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  setCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Map area to contract area
   * @param {string} area - Source area
   * @returns {string} - Contract area
   */
  mapAreaToContractArea(area) {
    return area || 'Sonstiges';
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new OpenLegalDataConnector();
    }
    return instance;
  },
  OpenLegalDataConnector
};

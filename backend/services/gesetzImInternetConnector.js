// 📁 backend/services/gesetzImInternetConnector.js
// Legal Pulse 2.0 - gesetze-im-internet.de XML Index Integration
// Official source for German federal laws
// XML Index: https://www.gesetze-im-internet.de/gii-toc.xml

const axios = require('axios');
const xml2js = require('xml2js');

class GesetzImInternetConnector {
  constructor() {
    this.baseUrl = 'https://www.gesetze-im-internet.de';
    this.indexUrl = 'https://www.gesetze-im-internet.de/gii-toc.xml';
    this.timeout = 20000;
    this.cachedIndex = null;
    this.indexCacheTimestamp = null;
    this.indexCacheExpiry = 86400000; // 24 hours
    this.xmlParser = new xml2js.Parser({ explicitArray: false });

    console.log('[GESETZE-IM-INTERNET] Connector initialized');
  }

  /**
   * Load and cache the XML index
   * @returns {Promise<Array>} - Parsed law index
   */
  async loadIndex() {
    // Check cache
    if (this.cachedIndex && this.indexCacheTimestamp) {
      if (Date.now() - this.indexCacheTimestamp < this.indexCacheExpiry) {
        return this.cachedIndex;
      }
    }

    console.log('[GESETZE-IM-INTERNET] Loading XML index...');

    try {
      const response = await axios.get(this.indexUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'application/xml'
        },
        responseType: 'text'
      });

      const parsed = await this.xmlParser.parseStringPromise(response.data);

      // Extract laws from XML structure
      const laws = this.extractLawsFromXML(parsed);

      this.cachedIndex = laws;
      this.indexCacheTimestamp = Date.now();

      console.log(`[GESETZE-IM-INTERNET] Index loaded: ${laws.length} laws`);
      return laws;

    } catch (error) {
      console.error('[GESETZE-IM-INTERNET] Index load error:', error.message);
      // Return cached index if available, even if expired
      if (this.cachedIndex) {
        console.log('[GESETZE-IM-INTERNET] Using expired cache as fallback');
        return this.cachedIndex;
      }
      return [];
    }
  }

  /**
   * Extract laws from parsed XML
   * @param {Object} parsed - Parsed XML object
   * @returns {Array} - Array of law objects
   */
  extractLawsFromXML(parsed) {
    const laws = [];

    try {
      // The XML structure is: toc -> item (array of laws)
      // Each item has: juleslink, ausgession, titel, kurzue (abbreviation)
      const items = parsed?.toc?.item || [];
      const itemsArray = Array.isArray(items) ? items : [items];

      for (const item of itemsArray) {
        if (!item) continue;

        const law = {
          id: item.juleslink || item.jurabkuerzung || `gii-${laws.length}`,
          title: item.titel || item.langstitel || 'Unbekanntes Gesetz',
          abbreviation: item.jurabkuerzung || item.kurzue || null,
          date: item.ausfertigung || item.standangabe || null,
          url: item.juleslink ? `${this.baseUrl}/${item.juleslink}/index.html` : null,
          xmlUrl: item.juleslink ? `${this.baseUrl}/${item.juleslink}/xml.zip` : null
        };

        laws.push(law);
      }
    } catch (error) {
      console.error('[GESETZE-IM-INTERNET] XML extraction error:', error.message);
    }

    return laws;
  }

  /**
   * Search for laws in the index
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Search results
   */
  async searchLaws({ query, limit = 30 }) {
    console.log(`[GESETZE-IM-INTERNET] Searching laws: "${query}"`);

    try {
      const index = await this.loadIndex();

      if (!index || index.length === 0) {
        console.log('[GESETZE-IM-INTERNET] Index empty, using fallback search');
        return this.searchViaWebsite(query, limit);
      }

      // Search in cached index
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(/\s+/);

      const matches = index
        .map(law => {
          const titleLower = (law.title || '').toLowerCase();
          const abbrevLower = (law.abbreviation || '').toLowerCase();

          let score = 0;

          // Exact abbreviation match (highest priority)
          if (abbrevLower === queryLower) {
            score += 1.0;
          } else if (abbrevLower.includes(queryLower)) {
            score += 0.8;
          }

          // Title matching
          for (const term of queryTerms) {
            if (titleLower.includes(term)) {
              score += 0.3;
            }
          }

          // Exact phrase in title
          if (titleLower.includes(queryLower)) {
            score += 0.5;
          }

          return { law, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      const results = matches.map(item => this.normalizeResult(item.law, item.score));

      console.log(`[GESETZE-IM-INTERNET] Found ${results.length} results`);
      return results;

    } catch (error) {
      console.error('[GESETZE-IM-INTERNET] Search error:', error.message);
      return this.searchViaWebsite(query, limit);
    }
  }

  /**
   * Fallback: Search via website scraping
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Search results
   */
  async searchViaWebsite(query, limit) {
    console.log(`[GESETZE-IM-INTERNET] Fallback website search: "${query}"`);

    try {
      // Use the search page
      const searchUrl = `${this.baseUrl}/Teilliste_A.html`;

      const response = await axios.get(searchUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'text/html'
        }
      });

      // Basic HTML parsing for law links
      const results = this.parseSearchResults(response.data, query, limit);
      return results;

    } catch (error) {
      console.error('[GESETZE-IM-INTERNET] Website search error:', error.message);
      return this.getCommonLaws(query, limit);
    }
  }

  /**
   * Parse search results from HTML
   * @param {string} html - HTML content
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} - Parsed results
   */
  parseSearchResults(html, query, limit) {
    // Simple regex-based extraction
    const results = [];
    const linkRegex = /<a[^>]*href="\/([^/"]+)\/"[^>]*>([^<]+)<\/a>/gi;
    const queryLower = query.toLowerCase();

    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < limit * 2) {
      const slug = match[1];
      const title = match[2].trim();

      if (title.toLowerCase().includes(queryLower) || slug.toLowerCase().includes(queryLower)) {
        results.push({
          id: slug,
          title: title,
          abbreviation: slug.toUpperCase(),
          url: `${this.baseUrl}/${slug}/index.html`,
          score: 0.7
        });
      }
    }

    return results
      .slice(0, limit)
      .map(r => this.normalizeResult(r, r.score));
  }

  /**
   * Get common German laws as fallback
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} - Common laws matching query
   */
  getCommonLaws(query, limit) {
    const commonLaws = [
      { id: 'bgb', title: 'Bürgerliches Gesetzbuch', abbreviation: 'BGB', area: 'Vertragsrecht' },
      { id: 'hgb', title: 'Handelsgesetzbuch', abbreviation: 'HGB', area: 'Handelsrecht' },
      { id: 'stgb', title: 'Strafgesetzbuch', abbreviation: 'StGB', area: 'Strafrecht' },
      { id: 'gg', title: 'Grundgesetz', abbreviation: 'GG', area: 'Verfassungsrecht' },
      { id: 'arbgg', title: 'Arbeitsgerichtsgesetz', abbreviation: 'ArbGG', area: 'Arbeitsrecht' },
      { id: 'kuschg', title: 'Kündigungsschutzgesetz', abbreviation: 'KSchG', area: 'Arbeitsrecht' },
      { id: 'bdsg', title: 'Bundesdatenschutzgesetz', abbreviation: 'BDSG', area: 'Datenschutz' },
      { id: 'uwg', title: 'Gesetz gegen den unlauteren Wettbewerb', abbreviation: 'UWG', area: 'Wettbewerbsrecht' },
      { id: 'gmbhg', title: 'GmbH-Gesetz', abbreviation: 'GmbHG', area: 'Gesellschaftsrecht' },
      { id: 'aktg', title: 'Aktiengesetz', abbreviation: 'AktG', area: 'Gesellschaftsrecht' },
      { id: 'mietrecht', title: 'Mietrecht (BGB)', abbreviation: 'BGB §§535ff', area: 'Mietrecht' },
      { id: 'vvg', title: 'Versicherungsvertragsgesetz', abbreviation: 'VVG', area: 'Versicherungsrecht' },
      { id: 'sgb', title: 'Sozialgesetzbuch', abbreviation: 'SGB', area: 'Sozialrecht' },
      { id: 'betrvg', title: 'Betriebsverfassungsgesetz', abbreviation: 'BetrVG', area: 'Arbeitsrecht' },
      { id: 'estg', title: 'Einkommensteuergesetz', abbreviation: 'EStG', area: 'Steuerrecht' },
      { id: 'ustg', title: 'Umsatzsteuergesetz', abbreviation: 'UStG', area: 'Steuerrecht' },
      { id: 'ao', title: 'Abgabenordnung', abbreviation: 'AO', area: 'Steuerrecht' },
      { id: 'zvg', title: 'Zwangsversteigerungsgesetz', abbreviation: 'ZVG', area: 'Vollstreckungsrecht' },
      { id: 'inso', title: 'Insolvenzordnung', abbreviation: 'InsO', area: 'Insolvenzrecht' },
      { id: 'zpo', title: 'Zivilprozessordnung', abbreviation: 'ZPO', area: 'Prozessrecht' }
    ];

    const queryLower = query.toLowerCase();

    return commonLaws
      .filter(law =>
        law.title.toLowerCase().includes(queryLower) ||
        law.abbreviation.toLowerCase().includes(queryLower) ||
        (law.area && law.area.toLowerCase().includes(queryLower))
      )
      .slice(0, limit)
      .map(law => ({
        id: law.id,
        title: `${law.title} (${law.abbreviation})`,
        description: `Deutsches Bundesgesetz - ${law.area}`,
        date: null,
        type: 'law',
        source: 'gesetze-im-internet',
        url: `${this.baseUrl}/${law.id}/index.html`,
        relevance: 0.85,
        area: law.area,
        documentId: law.abbreviation
      }));
  }

  /**
   * Normalize search result to common format
   * @param {Object} law - Raw law object
   * @param {number} score - Relevance score
   * @returns {Object} - Normalized result
   */
  normalizeResult(law, score) {
    const abbrev = law.abbreviation ? ` (${law.abbreviation})` : '';

    return {
      id: law.id || `gii-${Date.now()}`,
      title: law.title + abbrev,
      description: `Deutsches Bundesgesetz${law.date ? ` vom ${law.date}` : ''}`,
      date: law.date || null,
      type: 'law',
      source: 'gesetze-im-internet',
      url: law.url || `${this.baseUrl}/${law.id}/index.html`,
      relevance: Math.min(score, 1),
      area: this.detectArea(law.title, law.abbreviation),
      documentId: law.abbreviation || law.id
    };
  }

  /**
   * Detect legal area from title/abbreviation
   * @param {string} title - Law title
   * @param {string} abbrev - Law abbreviation
   * @returns {string} - Legal area
   */
  detectArea(title, abbrev) {
    const text = `${title || ''} ${abbrev || ''}`.toLowerCase();

    if (text.includes('arbeit') || text.includes('kündigung') || text.includes('betrieb')) {
      return 'Arbeitsrecht';
    }
    if (text.includes('datenschutz') || text.includes('bdsg')) {
      return 'Datenschutz';
    }
    if (text.includes('steuer') || text.includes('abgabe') || text.includes('estg') || text.includes('ustg')) {
      return 'Steuerrecht';
    }
    if (text.includes('handel') || text.includes('hgb')) {
      return 'Handelsrecht';
    }
    if (text.includes('gmbh') || text.includes('aktien') || text.includes('gesellschaft')) {
      return 'Gesellschaftsrecht';
    }
    if (text.includes('miete') || text.includes('wohn')) {
      return 'Mietrecht';
    }
    if (text.includes('straf')) {
      return 'Strafrecht';
    }
    if (text.includes('sozial') || text.includes('sgb')) {
      return 'Sozialrecht';
    }
    if (text.includes('versicher') || text.includes('vvg')) {
      return 'Versicherungsrecht';
    }
    if (text.includes('insolvenz') || text.includes('inso')) {
      return 'Insolvenzrecht';
    }
    if (text.includes('bgb') || text.includes('bürgerlich')) {
      return 'Vertragsrecht';
    }

    return 'Sonstiges';
  }

  /**
   * Get recent changes (not available via XML index)
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} - Recent changes
   */
  async getRecentChanges(days = 30) {
    // gesetze-im-internet.de doesn't provide a changes feed
    // Return empty array, let other sources provide this
    console.log('[GESETZE-IM-INTERNET] Recent changes not available via this source');
    return [];
  }

  /**
   * Check API health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await axios.head(this.baseUrl, {
        timeout: 5000
      });

      return {
        healthy: response.status === 200,
        endpoint: this.baseUrl,
        indexCached: !!this.cachedIndex,
        indexSize: this.cachedIndex?.length || 0,
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
      instance = new GesetzImInternetConnector();
    }
    return instance;
  },
  GesetzImInternetConnector
};

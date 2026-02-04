// 📁 backend/services/rechtsinformationenConnector.js
// Legal Pulse 2.0 - Rechtsinformationsportal des Bundes (BMJ/DigitalService)
// Volltextsuche über alle deutschen Bundesgesetze und Rechtsprechung
// API: https://testphase.rechtsinformationen.bund.de/v1
// Response format: Hydra Collection (JSON-LD)

const axios = require('axios');

class RechtsinformationenConnector {
  constructor() {
    this.baseUrl = 'https://testphase.rechtsinformationen.bund.de/v1';
    this.portalUrl = 'https://testphase.rechtsinformationen.bund.de';
    this.timeout = 20000;
    this.cache = new Map();
    this.cacheExpiry = 1800000; // 30 minutes

    console.log('[RECHTSINFORMATIONEN] Connector initialized');
  }

  /**
   * Get cached result or null
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Store result in cache
   */
  setCache(key, data) {
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Search for legislation (Gesetze/Verordnungen)
   * API: GET /v1/legislation?searchTerm=...&size=...
   * Returns Hydra Collection with member[].item (Legislation) + textMatches
   */
  async searchLegislation({ query, limit = 20 }) {
    console.log(`[RECHTSINFORMATIONEN] Searching legislation: "${query}"`);

    const cacheKey = `legislation:${query}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('[RECHTSINFORMATIONEN] Returning cached legislation results');
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/legislation`, {
        params: {
          searchTerm: query,
          size: limit
        },
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        }
      });

      const data = response.data;
      const searchResults = this.extractHydraMembers(data);

      const results = searchResults.map((searchResult, index) =>
        this.normalizeLegislationResult(searchResult, query, index, searchResults.length)
      );

      console.log(`[RECHTSINFORMATIONEN] Found ${results.length} legislation results (total available: ${data.totalItems || '?'})`);
      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('[RECHTSINFORMATIONEN] Legislation search error:', error.message);
      return [];
    }
  }

  /**
   * Search for case law (Rechtsprechung)
   * API: GET /v1/case-law?searchTerm=...&size=...
   * Returns Hydra Collection with member[].item (Decision) + textMatches
   */
  async searchCaseLaw({ query, limit = 10 }) {
    console.log(`[RECHTSINFORMATIONEN] Searching case law: "${query}"`);

    const cacheKey = `caselaw:${query}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('[RECHTSINFORMATIONEN] Returning cached case law results');
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/case-law`, {
        params: {
          searchTerm: query,
          size: limit
        },
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        }
      });

      const data = response.data;
      const searchResults = this.extractHydraMembers(data);

      const results = searchResults.map((searchResult, index) =>
        this.normalizeCaseLawResult(searchResult, query, index, searchResults.length)
      );

      console.log(`[RECHTSINFORMATIONEN] Found ${results.length} case law results (total available: ${data.totalItems || '?'})`);
      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('[RECHTSINFORMATIONEN] Case law search error:', error.message);
      return [];
    }
  }

  /**
   * Combined search: legislation + case law
   */
  async searchLaws({ query, limit = 30 }) {
    const legislationLimit = Math.ceil(limit * 0.7);
    const caseLawLimit = Math.ceil(limit * 0.3);

    const [legislation, caseLaw] = await Promise.allSettled([
      this.searchLegislation({ query, limit: legislationLimit }),
      this.searchCaseLaw({ query, limit: caseLawLimit })
    ]);

    const results = [];

    if (legislation.status === 'fulfilled') {
      results.push(...legislation.value);
    }
    if (caseLaw.status === 'fulfilled') {
      results.push(...caseLaw.value);
    }

    results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    return results.slice(0, limit);
  }

  /**
   * Extract member array from Hydra Collection response
   * Real format: { "@type": "hydra:Collection", "member": [ { "@type": "SearchResult", "item": {...}, "textMatches": [...] } ] }
   */
  extractHydraMembers(data) {
    if (!data) return [];

    // Primary: Hydra Collection format (confirmed from live API)
    if (data.member && Array.isArray(data.member)) {
      return data.member;
    }

    // Fallback for other response formats
    if (Array.isArray(data)) return data.map(item => ({ item }));
    if (data.content && Array.isArray(data.content)) return data.content.map(item => ({ item }));
    if (data.results && Array.isArray(data.results)) return data.results.map(item => ({ item }));

    return [];
  }

  /**
   * Normalize legislation SearchResult to common format
   * Input: { item: { name, abbreviation, legislationDate, legislationIdentifier, @id, ... }, textMatches: [...] }
   */
  normalizeLegislationResult(searchResult, query, index, total) {
    const item = searchResult.item || searchResult;
    const textMatches = searchResult.textMatches || [];

    const title = item.name || item.alternateName || 'Unbekanntes Gesetz';
    const abbreviation = item.abbreviation || null;
    const date = item.legislationDate || item.datePublished || null;
    const identifier = item.legislationIdentifier || null;
    const legalForce = item.workExample?.legislationLegalForce || null;

    // Build URL from @id field
    let url = null;
    if (item['@id']) {
      url = `${this.portalUrl}${item['@id']}`;
    } else if (abbreviation) {
      const slug = abbreviation.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
      url = `https://www.gesetze-im-internet.de/${slug}/index.html`;
    }

    // Calculate relevance: position-based + query match bonus
    const titleLower = title.toLowerCase();
    const queryLower = (query || '').toLowerCase();
    const abbrevLower = (abbreviation || '').toLowerCase();
    let relevance = Math.max(0.5, 1 - (index / Math.max(total, 1)) * 0.5);

    if (abbrevLower === queryLower) {
      relevance = Math.min(1, relevance + 0.3);
    } else if (titleLower.includes(queryLower)) {
      relevance = Math.min(1, relevance + 0.2);
    }
    // Bonus for text matches (full-text hits)
    if (textMatches.length > 0) {
      relevance = Math.min(1, relevance + 0.1);
    }

    const abbrevDisplay = abbreviation ? ` (${abbreviation})` : '';

    return {
      id: identifier || item['@id'] || `ri-leg-${Date.now()}-${index}`,
      title: title + abbrevDisplay,
      description: this.buildLegislationDescription(item, textMatches, legalForce),
      date: date,
      type: 'law',
      source: 'rechtsinformationen',
      url: url,
      relevance: Math.min(relevance, 1),
      area: this.detectArea(title, abbreviation),
      documentId: abbreviation || identifier || null
    };
  }

  /**
   * Normalize case law SearchResult to common format
   * Input: { item: { headline, courtName, fileNumbers, decisionDate, documentNumber, @id, ... }, textMatches: [...] }
   */
  normalizeCaseLawResult(searchResult, query, index, total) {
    const item = searchResult.item || searchResult;
    const textMatches = searchResult.textMatches || [];

    const court = item.courtName || item.court || '';
    const fileNumbers = item.fileNumbers || [];
    const fileNumber = fileNumbers[0] || item.fileNumber || '';
    const date = item.decisionDate || item.date || null;
    const headline = item.headline || '';
    const documentNumber = item.documentNumber || '';
    const documentType = item.documentType || '';
    const judicialBody = item.judicialBody || '';

    // Build title: prefer headline, fallback to court + file number
    let title;
    if (headline) {
      title = headline.length > 120 ? headline.substring(0, 117) + '...' : headline;
    } else {
      title = `${court} - ${fileNumber}`.trim() || 'Entscheidung';
    }

    // Build URL from @id
    let url = null;
    if (item['@id']) {
      url = `${this.portalUrl}${item['@id']}`;
    }

    let relevance = Math.max(0.4, 0.9 - (index / Math.max(total, 1)) * 0.5);
    if (textMatches.length > 0) {
      relevance = Math.min(1, relevance + 0.1);
    }

    return {
      id: documentNumber || item['@id'] || `ri-case-${Date.now()}-${index}`,
      title: title,
      description: this.buildCaseLawDescription(item, textMatches),
      date: date,
      type: 'case-law',
      source: 'rechtsinformationen',
      url: url,
      relevance: Math.min(relevance, 1),
      area: this.detectArea(title, court),
      documentId: fileNumber || documentNumber || null
    };
  }

  /**
   * Build description for legislation including text matches
   * Shows which specific paragraphs matched the search query
   */
  buildLegislationDescription(item, textMatches, legalForce) {
    const parts = [];

    // Publication info
    if (item.isPartOf?.name) {
      parts.push(item.isPartOf.name);
    }
    if (item.legislationDate) {
      parts.push(`Ausfertigungsdatum: ${item.legislationDate}`);
    }
    if (legalForce === 'InForce') {
      parts.push('In Kraft');
    } else if (legalForce) {
      parts.push(`Status: ${legalForce}`);
    }

    // Show matched paragraphs (most valuable part of full-text search)
    const paragraphMatches = textMatches.filter(m => m.name && m.name !== 'name' && m.name !== 'abbreviation');
    if (paragraphMatches.length > 0) {
      const matchNames = paragraphMatches.slice(0, 3).map(m => m.name);
      parts.push(`Treffer in: ${matchNames.join(', ')}`);
    }

    if (parts.length === 0) {
      return 'Deutsches Bundesgesetz / Verordnung (Rechtsinformationsportal)';
    }

    return parts.join(' | ');
  }

  /**
   * Build description for case law including text matches
   */
  buildCaseLawDescription(item, textMatches) {
    const parts = [];

    if (item.courtName) parts.push(item.courtName);
    if (item.judicialBody) parts.push(item.judicialBody);
    if (item.fileNumbers?.length > 0) parts.push(`Az: ${item.fileNumbers.join(', ')}`);
    if (item.decisionDate) parts.push(item.decisionDate);
    if (item.documentType) parts.push(item.documentType);

    // Show matched text snippets
    const contentMatches = textMatches.filter(m => m.name && m.name !== 'name');
    if (contentMatches.length > 0) {
      const snippet = this.stripHtmlTags(contentMatches[0].text || '');
      if (snippet.length > 0) {
        const truncated = snippet.length > 150 ? snippet.substring(0, 147) + '...' : snippet;
        parts.push(truncated);
      }
    }

    if (parts.length === 0) {
      return 'Deutsche Rechtsprechung (Rechtsinformationsportal)';
    }

    return parts.join(' | ');
  }

  /**
   * Strip HTML tags (textMatches may contain <mark> tags for highlights)
   */
  stripHtmlTags(text) {
    return (text || '').replace(/<[^>]*>/g, '');
  }

  /**
   * Detect legal area from title/abbreviation
   */
  detectArea(title, extra) {
    const text = `${title || ''} ${extra || ''}`.toLowerCase();

    if (text.includes('arbeit') || text.includes('kündigung') || text.includes('betrieb') || text.includes('kschg')) {
      return 'Arbeitsrecht';
    }
    if (text.includes('datenschutz') || text.includes('bdsg') || text.includes('dsgvo')) {
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
    if (text.includes('miete') || text.includes('wohn') || text.includes('mietrecht')) {
      return 'Mietrecht';
    }
    if (text.includes('straf') || text.includes('stgb') || text.includes('stpo')) {
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
    if (text.includes('bau') || text.includes('baurecht')) {
      return 'Baurecht';
    }
    if (text.includes('umwelt') || text.includes('immission')) {
      return 'Umweltrecht';
    }
    if (text.includes('wettbewerb') || text.includes('uwg') || text.includes('gwb')) {
      return 'Wettbewerbsrecht';
    }
    if (text.includes('patent') || text.includes('marke') || text.includes('urheber')) {
      return 'Gewerblicher Rechtsschutz';
    }
    if (text.includes('bgb') || text.includes('bürgerlich') || text.includes('vertrag')) {
      return 'Vertragsrecht';
    }
    if (text.includes('bag') || text.includes('bundesarbeitsgericht')) {
      return 'Arbeitsrecht';
    }
    if (text.includes('bgh') || text.includes('bundesgerichtshof')) {
      return 'Zivilrecht';
    }
    if (text.includes('bverfg') || text.includes('verfassungsgericht')) {
      return 'Verfassungsrecht';
    }

    return 'Sonstiges';
  }

  /**
   * Get recent changes (legislation published recently)
   */
  async getRecentChanges(days = 30) {
    console.log(`[RECHTSINFORMATIONEN] Fetching recent changes (${days} days)`);

    try {
      const response = await axios.get(`${this.baseUrl}/legislation`, {
        params: {
          size: 20
        },
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        }
      });

      const searchResults = this.extractHydraMembers(response.data);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return searchResults
        .filter(sr => {
          const item = sr.item || sr;
          const itemDate = new Date(item.legislationDate || item.datePublished || 0);
          return itemDate >= cutoffDate;
        })
        .map((sr, index) => this.normalizeLegislationResult(sr, '', index, searchResults.length));

    } catch (error) {
      console.error('[RECHTSINFORMATIONEN] Recent changes error:', error.message);
      return [];
    }
  }

  /**
   * Check API health
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/legislation`, {
        params: { searchTerm: 'BGB', size: 1 },
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        }
      });

      const hasResults = response.data?.member?.length > 0;

      return {
        healthy: response.status === 200 && hasResults,
        endpoint: this.baseUrl,
        cacheSize: this.cache.size,
        totalAvailable: response.data?.totalItems || 0,
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
      instance = new RechtsinformationenConnector();
    }
    return instance;
  },
  RechtsinformationenConnector
};

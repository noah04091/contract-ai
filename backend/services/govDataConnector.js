// 📁 backend/services/govDataConnector.js
// Legal Pulse 2.0 Phase 3 - GovData API Integration

const axios = require('axios');

class GovDataConnector {
  constructor() {
    // GovData CKAN API endpoints
    this.baseUrl = 'https://www.govdata.de';
    this.apiUrl = 'https://www.govdata.de/ckan/api/3';
    this.searchUrl = `${this.apiUrl}/action/package_search`;
    this.packageUrl = `${this.apiUrl}/action/package_show`;

    console.log('[GOVDATA] Connector initialized');
  }

  /**
   * Search for datasets
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Search results
   */
  async searchDatasets({ query, category = null, organization = null, limit = 10, offset = 0 }) {
    console.log(`[GOVDATA] Searching datasets: "${query}"`);

    try {
      const params = {
        q: query || '',
        rows: limit,
        start: offset
      };

      // Add filters
      const filters = [];
      if (category) filters.push(`groups:${category}`);
      if (organization) filters.push(`organization:${organization}`);

      if (filters.length > 0) {
        params.fq = filters.join(' AND ');
      }

      const response = await axios.get(this.searchUrl, {
        params,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        },
        timeout: 10000
      });

      if (response.data.success && response.data.result) {
        return this.parseSearchResults(response.data.result.results);
      }

      return [];

    } catch (error) {
      console.error('[GOVDATA] Search error:', error.message);
      return this.getMockSearchResults(query, limit);
    }
  }

  /**
   * Get legal datasets (Rechtsdaten)
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Legal datasets
   */
  async getLegalDatasets(limit = 20) {
    console.log(`[GOVDATA] Fetching legal datasets`);

    try {
      return await this.searchDatasets({
        query: 'Recht Gesetz',
        category: 'gesetze_justiz',
        limit
      });
    } catch (error) {
      console.error('[GOVDATA] Legal datasets error:', error.message);
      return this.getMockLegalDatasets();
    }
  }

  /**
   * Get dataset by ID
   * @param {string} datasetId - Dataset ID
   * @returns {Promise<Object>} - Dataset details
   */
  async getDataset(datasetId) {
    console.log(`[GOVDATA] Fetching dataset: ${datasetId}`);

    try {
      const response = await axios.get(this.packageUrl, {
        params: { id: datasetId },
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        },
        timeout: 10000
      });

      if (response.data.success && response.data.result) {
        return this.parseDataset(response.data.result);
      }

      return null;

    } catch (error) {
      console.error('[GOVDATA] Dataset fetch error:', error.message);
      return this.getMockDataset(datasetId);
    }
  }

  /**
   * Get datasets by organization (e.g., Bundesministerium)
   * @param {string} organization - Organization name
   * @returns {Promise<Array>} - Datasets
   */
  async getDatasetsByOrganization(organization) {
    console.log(`[GOVDATA] Fetching datasets from: ${organization}`);

    try {
      return await this.searchDatasets({
        query: '',
        organization,
        limit: 50
      });
    } catch (error) {
      console.error('[GOVDATA] Organization datasets error:', error.message);
      return [];
    }
  }

  /**
   * Get recent datasets
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} - Recent datasets
   */
  async getRecentDatasets(days = 30) {
    console.log(`[GOVDATA] Fetching datasets from last ${days} days`);

    try {
      // GovData doesn't have direct date filtering, so we get recent and filter
      const datasets = await this.searchDatasets({
        query: '',
        limit: 100
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return datasets.filter(dataset => {
        const modifiedDate = new Date(dataset.metadata_modified || dataset.metadata_created);
        return modifiedDate >= cutoffDate;
      });

    } catch (error) {
      console.error('[GOVDATA] Recent datasets error:', error.message);
      return this.getMockRecentDatasets(days);
    }
  }

  /**
   * Search for court decisions (Gerichtsentscheidungen)
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Court decisions
   */
  async searchCourtDecisions(query) {
    console.log(`[GOVDATA] Searching court decisions: "${query}"`);

    try {
      return await this.searchDatasets({
        query: `${query} Gerichtsentscheidung Urteil`,
        category: 'gesetze_justiz',
        limit: 30
      });
    } catch (error) {
      console.error('[GOVDATA] Court decisions error:', error.message);
      return this.getMockCourtDecisions(query);
    }
  }

  /**
   * Parse search results
   * @param {Array} results - Raw results from API
   * @returns {Array} - Parsed results
   */
  parseSearchResults(results) {
    return results.map(dataset => this.parseDataset(dataset));
  }

  /**
   * Parse dataset
   * @param {Object} dataset - Raw dataset
   * @returns {Object} - Parsed dataset
   */
  parseDataset(dataset) {
    return {
      id: dataset.id,
      name: dataset.name,
      title: dataset.title,
      description: dataset.notes || '',
      author: dataset.author,
      organization: dataset.organization?.title,
      category: dataset.groups?.[0]?.title,
      tags: dataset.tags?.map(tag => tag.name) || [],
      created: dataset.metadata_created,
      modified: dataset.metadata_modified,
      url: `${this.baseUrl}/web/guest/suchen/-/details/${dataset.name}`,
      resources: dataset.resources?.map(res => ({
        name: res.name,
        format: res.format,
        url: res.url,
        size: res.size
      })) || [],
      source: 'govdata',
      relevance: this.calculateRelevance(dataset)
    };
  }

  /**
   * Calculate relevance score
   * @param {Object} dataset - Dataset
   * @returns {number} - Relevance (0-1)
   */
  calculateRelevance(dataset) {
    let score = 0.5;

    // Boost for legal category
    if (dataset.groups?.some(g => g.name === 'gesetze_justiz')) {
      score += 0.2;
    }

    // Boost for recent data
    const daysOld = (Date.now() - new Date(dataset.metadata_modified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 30) score += 0.15;
    else if (daysOld < 90) score += 0.1;

    // Boost for structured data formats
    const hasStructuredData = dataset.resources?.some(r =>
      ['JSON', 'XML', 'CSV'].includes(r.format?.toUpperCase())
    );
    if (hasStructuredData) score += 0.15;

    return Math.min(1.0, score);
  }

  /**
   * Mock search results for development
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} - Mock results
   */
  getMockSearchResults(query, limit) {
    const mockResults = [
      {
        id: 'bgb-gesetze-2024',
        name: 'bgb-gesetze-2024',
        title: 'Bürgerliches Gesetzbuch (BGB) - Aktuelle Fassung',
        description: 'Vollständige aktuelle Fassung des BGB mit allen Änderungen',
        author: 'Bundesministerium der Justiz',
        organization: 'BMJ',
        category: 'Gesetze und Justiz',
        tags: ['BGB', 'Zivilrecht', 'Gesetz'],
        created: '2024-01-15',
        modified: '2024-11-01',
        url: 'https://www.govdata.de/web/guest/suchen/-/details/bgb-gesetze-2024',
        resources: [
          {
            name: 'BGB Volltext',
            format: 'XML',
            url: 'https://example.govdata.de/bgb.xml',
            size: '2.5 MB'
          }
        ],
        source: 'govdata',
        relevance: 0.95
      },
      {
        id: 'dsgvo-umsetzung-2024',
        name: 'dsgvo-umsetzung-2024',
        title: 'DSGVO Umsetzung in Deutschland - Datenschutzrechtliche Vorschriften',
        description: 'Sammlung aller datenschutzrechtlichen Vorschriften zur DSGVO-Umsetzung',
        author: 'Bundesbeauftragter für Datenschutz',
        organization: 'BfDI',
        category: 'Gesetze und Justiz',
        tags: ['DSGVO', 'Datenschutz', 'BDSG'],
        created: '2024-02-01',
        modified: '2024-10-28',
        url: 'https://www.govdata.de/web/guest/suchen/-/details/dsgvo-umsetzung-2024',
        resources: [
          {
            name: 'DSGVO Gesetzestexte',
            format: 'PDF',
            url: 'https://example.govdata.de/dsgvo.pdf',
            size: '1.2 MB'
          }
        ],
        source: 'govdata',
        relevance: 0.92
      },
      {
        id: 'verbraucherrecht-2024',
        name: 'verbraucherrecht-2024',
        title: 'Verbraucherrechtliche Vorschriften - Sammlung',
        description: 'Aktuelle verbraucherrechtliche Gesetze und Verordnungen',
        author: 'Bundesministerium für Wirtschaft',
        organization: 'BMWi',
        category: 'Gesetze und Justiz',
        tags: ['Verbraucherrecht', 'Verbraucherschutz', 'BGB'],
        created: '2024-03-10',
        modified: '2024-10-15',
        url: 'https://www.govdata.de/web/guest/suchen/-/details/verbraucherrecht-2024',
        resources: [
          {
            name: 'Verbrauchergesetze',
            format: 'JSON',
            url: 'https://example.govdata.de/verbraucher.json',
            size: '850 KB'
          }
        ],
        source: 'govdata',
        relevance: 0.88
      },
      {
        id: 'arbeitsrecht-gesetze-2024',
        name: 'arbeitsrecht-gesetze-2024',
        title: 'Arbeitsrechtliche Gesetze und Verordnungen',
        description: 'Sammlung arbeitsrechtlicher Vorschriften',
        author: 'Bundesministerium für Arbeit',
        organization: 'BMAS',
        category: 'Gesetze und Justiz',
        tags: ['Arbeitsrecht', 'Arbeitnehmer', 'Tarifrecht'],
        created: '2024-01-20',
        modified: '2024-09-30',
        url: 'https://www.govdata.de/web/guest/suchen/-/details/arbeitsrecht-gesetze-2024',
        resources: [
          {
            name: 'Arbeitsgesetze',
            format: 'XML',
            url: 'https://example.govdata.de/arbeitsrecht.xml',
            size: '1.8 MB'
          }
        ],
        source: 'govdata',
        relevance: 0.85
      },
      {
        id: 'handelsrecht-hgb-2024',
        name: 'handelsrecht-hgb-2024',
        title: 'Handelsgesetzbuch (HGB) - Aktuelle Fassung',
        description: 'Volltext des HGB mit allen Nebengesetzen',
        author: 'Bundesministerium der Justiz',
        organization: 'BMJ',
        category: 'Gesetze und Justiz',
        tags: ['HGB', 'Handelsrecht', 'Kaufleute'],
        created: '2024-02-15',
        modified: '2024-09-15',
        url: 'https://www.govdata.de/web/guest/suchen/-/details/handelsrecht-hgb-2024',
        resources: [
          {
            name: 'HGB Volltext',
            format: 'PDF',
            url: 'https://example.govdata.de/hgb.pdf',
            size: '3.1 MB'
          }
        ],
        source: 'govdata',
        relevance: 0.82
      }
    ];

    return mockResults
      .filter(doc =>
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.description.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, limit);
  }

  /**
   * Mock legal datasets
   * @returns {Array} - Mock datasets
   */
  getMockLegalDatasets() {
    return this.getMockSearchResults('', 20);
  }

  /**
   * Mock dataset by ID
   * @param {string} datasetId - Dataset ID
   * @returns {Object} - Mock dataset
   */
  getMockDataset(datasetId) {
    const mockDatasets = this.getMockSearchResults('', 10);
    return mockDatasets.find(d => d.id === datasetId) || mockDatasets[0];
  }

  /**
   * Mock recent datasets
   * @param {number} days - Days to look back
   * @returns {Array} - Mock datasets
   */
  getMockRecentDatasets(days) {
    const datasets = this.getMockSearchResults('', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return datasets.filter(d => new Date(d.modified) >= cutoffDate);
  }

  /**
   * Mock court decisions
   * @param {string} query - Search query
   * @returns {Array} - Mock decisions
   */
  getMockCourtDecisions(query) {
    return [
      {
        id: 'bgh-urteil-dsgvo-2024',
        name: 'bgh-urteil-dsgvo-2024',
        title: 'BGH-Urteil zu DSGVO-Schadenersatzansprüchen',
        description: 'Bundesgerichtshof entscheidet über Voraussetzungen für Schadenersatz bei Datenschutzverstößen',
        author: 'Bundesgerichtshof',
        organization: 'BGH',
        category: 'Gerichtsentscheidungen',
        tags: ['DSGVO', 'Schadenersatz', 'BGH', 'Datenschutz'],
        created: '2024-10-20',
        modified: '2024-10-20',
        court: 'Bundesgerichtshof',
        fileNumber: 'VI ZR 10/24',
        date: '2024-10-15',
        source: 'govdata',
        relevance: 0.94
      },
      {
        id: 'bag-urteil-arbeitsvertrag-2024',
        name: 'bag-urteil-arbeitsvertrag-2024',
        title: 'BAG-Urteil zu AGB-Klauseln in Arbeitsverträgen',
        description: 'Bundesarbeitsgericht zur Wirksamkeit von Ausschlussfristen',
        author: 'Bundesarbeitsgericht',
        organization: 'BAG',
        category: 'Gerichtsentscheidungen',
        tags: ['Arbeitsrecht', 'AGB', 'BAG', 'Arbeitsvertrag'],
        created: '2024-09-25',
        modified: '2024-09-25',
        court: 'Bundesarbeitsgericht',
        fileNumber: '5 AZR 123/24',
        date: '2024-09-18',
        source: 'govdata',
        relevance: 0.91
      }
    ];
  }

  /**
   * Check API health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(this.apiUrl, {
        timeout: 5000
      });

      return {
        healthy: response.status === 200,
        endpoint: this.apiUrl,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        endpoint: this.apiUrl,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new GovDataConnector();
    }
    return instance;
  },
  GovDataConnector
};

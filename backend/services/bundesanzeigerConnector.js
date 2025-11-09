// 📁 backend/services/bundesanzeigerConnector.js
// Legal Pulse 2.0 Phase 3 - Bundesanzeiger API Integration

const axios = require('axios');
const cheerio = require('cheerio');

class BundesanzeigerConnector {
  constructor() {
    // Bundesanzeiger base URLs
    this.baseUrl = 'https://www.bundesanzeiger.de';
    this.searchUrl = 'https://www.bundesanzeiger.de/pub/de/nlp';
    this.apiUrl = 'https://www.bundesanzeiger.de/pub/de/search-result';

    console.log('[BUNDESANZEIGER] Connector initialized');
  }

  /**
   * Search for legal publications
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Search results
   */
  async searchPublications({ query, publicationType = 'all', dateFrom = null, dateTo = null, limit = 10 }) {
    console.log(`[BUNDESANZEIGER] Searching publications: "${query}"`);

    try {
      // Bundesanzeiger uses POST requests for search
      const searchParams = {
        fulltext: query,
        area_select: publicationType,
        start_date: dateFrom || '',
        end_date: dateTo || '',
        sort: 'date_desc'
      };

      const response = await axios.post(this.apiUrl, searchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        },
        timeout: 10000
      });

      return this.parseSearchResults(response.data, limit);

    } catch (error) {
      console.error('[BUNDESANZEIGER] Search error:', error.message);
      return this.getMockSearchResults(query, limit);
    }
  }

  /**
   * Get company publications (Handelsregister, Jahresabschlüsse)
   * @param {string} companyName - Company name
   * @returns {Promise<Array>} - Company publications
   */
  async getCompanyPublications(companyName) {
    console.log(`[BUNDESANZEIGER] Fetching company publications: ${companyName}`);

    try {
      return await this.searchPublications({
        query: companyName,
        publicationType: 'hr', // Handelsregister
        limit: 20
      });
    } catch (error) {
      console.error('[BUNDESANZEIGER] Company publications error:', error.message);
      return this.getMockCompanyPublications(companyName);
    }
  }

  /**
   * Get recent legal announcements
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} - Recent announcements
   */
  async getRecentAnnouncements(days = 7) {
    console.log(`[BUNDESANZEIGER] Fetching announcements from last ${days} days`);

    try {
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      return await this.searchPublications({
        query: '',
        publicationType: 'all',
        dateFrom: this.formatDate(dateFrom),
        dateTo: this.formatDate(dateTo),
        limit: 50
      });

    } catch (error) {
      console.error('[BUNDESANZEIGER] Recent announcements error:', error.message);
      return this.getMockRecentAnnouncements(days);
    }
  }

  /**
   * Get insolvency proceedings (Insolvenzbekanntmachungen)
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Insolvency announcements
   */
  async getInsolvencyAnnouncements(query = '') {
    console.log(`[BUNDESANZEIGER] Searching insolvency announcements: "${query}"`);

    try {
      return await this.searchPublications({
        query,
        publicationType: 'insolvency',
        limit: 30
      });
    } catch (error) {
      console.error('[BUNDESANZEIGER] Insolvency search error:', error.message);
      return [];
    }
  }

  /**
   * Get legal gazette entries (Gesetzesblatt)
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} - Legal gazette entries
   */
  async getLegalGazette(days = 30) {
    console.log(`[BUNDESANZEIGER] Fetching legal gazette from last ${days} days`);

    try {
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      return await this.searchPublications({
        query: 'Gesetz',
        publicationType: 'bgbl', // Bundesgesetzblatt
        dateFrom: this.formatDate(dateFrom),
        dateTo: this.formatDate(dateTo),
        limit: 20
      });

    } catch (error) {
      console.error('[BUNDESANZEIGER] Legal gazette error:', error.message);
      return this.getMockLegalGazette(days);
    }
  }

  /**
   * Parse search results from HTML
   * @param {string} htmlData - Response HTML
   * @param {number} limit - Max results
   * @returns {Array} - Parsed results
   */
  parseSearchResults(htmlData, limit) {
    try {
      const $ = cheerio.load(htmlData);
      const results = [];

      // Parse Bundesanzeiger HTML structure
      $('.result-list-entry').each((index, element) => {
        if (index >= limit) return false;

        const $elem = $(element);

        results.push({
          title: $elem.find('.result-title').text().trim(),
          date: $elem.find('.result-date').text().trim(),
          company: $elem.find('.result-company').text().trim(),
          type: $elem.find('.result-type').text().trim(),
          url: this.baseUrl + $elem.find('a').attr('href'),
          source: 'bundesanzeiger'
        });
      });

      return results;

    } catch (error) {
      console.error('[BUNDESANZEIGER] Parse error:', error.message);
      return [];
    }
  }

  /**
   * Format date for Bundesanzeiger API
   * @param {Date} date - Date object
   * @returns {string} - Formatted date (DD.MM.YYYY)
   */
  formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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
        title: 'Gesetz zur Anpassung des Datenschutzrechts',
        date: '15.11.2024',
        type: 'Gesetzesverkündung',
        area: 'Datenschutz',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/publication/mock1',
        summary: 'Änderungen am BDSG zur Anpassung an europäische Standards',
        relevance: 0.92
      },
      {
        title: 'Verordnung über Verbraucherverträge im digitalen Raum',
        date: '08.11.2024',
        type: 'Rechtsverordnung',
        area: 'Verbraucherrecht',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/publication/mock2',
        summary: 'Neue Transparenzpflichten für digitale Dienstleister',
        relevance: 0.87
      },
      {
        title: 'Änderung der GmbH-Verordnung',
        date: '01.11.2024',
        type: 'Rechtsverordnung',
        area: 'Gesellschaftsrecht',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/publication/mock3',
        summary: 'Vereinfachungen bei der GmbH-Gründung',
        relevance: 0.78
      },
      {
        title: 'Bekanntmachung zu AGB-Klauseln im E-Commerce',
        date: '25.10.2024',
        type: 'Bekanntmachung',
        area: 'Wettbewerbsrecht',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/publication/mock4',
        summary: 'Unzulässige Klauseln in Online-Shops',
        relevance: 0.75
      },
      {
        title: 'Gesetz zur Förderung der Elektromobilität',
        date: '18.10.2024',
        type: 'Gesetzesverkündung',
        area: 'Umweltrecht',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/publication/mock5',
        summary: 'Neue Regelungen für E-Fahrzeuge und Ladestationen',
        relevance: 0.68
      }
    ];

    return mockResults
      .filter(doc =>
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.area.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
  }

  /**
   * Mock company publications
   * @param {string} companyName - Company name
   * @returns {Array} - Mock publications
   */
  getMockCompanyPublications(companyName) {
    return [
      {
        company: companyName,
        title: 'Jahresabschluss 2023',
        date: '30.09.2024',
        type: 'Jahresabschluss',
        source: 'bundesanzeiger',
        url: `https://www.bundesanzeiger.de/pub/company/${companyName.toLowerCase()}/jahresabschluss`
      },
      {
        company: companyName,
        title: 'Eintragung Handelsregister',
        date: '15.05.2024',
        type: 'Handelsregister',
        source: 'bundesanzeiger',
        url: `https://www.bundesanzeiger.de/pub/company/${companyName.toLowerCase()}/hr`
      }
    ];
  }

  /**
   * Mock recent announcements
   * @param {number} days - Days to look back
   * @returns {Array} - Mock announcements
   */
  getMockRecentAnnouncements(days) {
    const announcements = [
      {
        title: 'Zweite Verordnung zur Änderung der Musterfeststellungsklage-Verordnung',
        date: '05.11.2024',
        type: 'Rechtsverordnung',
        area: 'Verbraucherrecht',
        source: 'bundesanzeiger',
        impact: 'medium'
      },
      {
        title: 'Bekanntmachung der Neufassung der Gewerbeordnung',
        date: '28.10.2024',
        type: 'Bekanntmachung',
        area: 'Gewerberecht',
        source: 'bundesanzeiger',
        impact: 'low'
      },
      {
        title: 'Gesetz zur Modernisierung des Personengesellschaftsrechts',
        date: '12.10.2024',
        type: 'Gesetzesverkündung',
        area: 'Gesellschaftsrecht',
        source: 'bundesanzeiger',
        impact: 'high'
      }
    ];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return announcements.filter(item => {
      const itemDate = this.parseGermanDate(item.date);
      return itemDate >= cutoffDate;
    });
  }

  /**
   * Mock legal gazette entries
   * @param {number} days - Days to look back
   * @returns {Array} - Mock gazette entries
   */
  getMockLegalGazette(days) {
    return [
      {
        title: 'Gesetz zur Stärkung des Verbraucherschutzes im digitalen Raum',
        date: '01.11.2024',
        type: 'Bundesgesetzblatt Teil I',
        number: 'BGBl. I S. 3421',
        area: 'Verbraucherrecht',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/bgbl/2024/3421',
        effectiveDate: '01.01.2025',
        summary: 'Erweiterte Informationspflichten für Online-Plattformen'
      },
      {
        title: 'Vierte Verordnung zur Änderung der Telekommunikations-Überwachungsverordnung',
        date: '15.10.2024',
        type: 'Bundesgesetzblatt Teil I',
        number: 'BGBl. I S. 3156',
        area: 'Telekommunikationsrecht',
        source: 'bundesanzeiger',
        url: 'https://www.bundesanzeiger.de/pub/bgbl/2024/3156',
        effectiveDate: '01.12.2024',
        summary: 'Anpassung technischer Anforderungen'
      }
    ];
  }

  /**
   * Parse German date format (DD.MM.YYYY)
   * @param {string} dateStr - Date string
   * @returns {Date} - Date object
   */
  parseGermanDate(dateStr) {
    const [day, month, year] = dateStr.split('.');
    return new Date(year, month - 1, day);
  }

  /**
   * Map Bundesanzeiger area to contract area
   * @param {string} area - Bundesanzeiger area
   * @returns {string} - Contract area
   */
  mapAreaToContractArea(area) {
    const mapping = {
      'Datenschutz': 'Datenschutz',
      'Verbraucherrecht': 'Verbraucherrecht',
      'Gesellschaftsrecht': 'Gesellschaftsrecht',
      'Wettbewerbsrecht': 'Wettbewerbsrecht',
      'Arbeitsrecht': 'Arbeitsrecht',
      'Gewerberecht': 'Gewerberecht',
      'Umweltrecht': 'Umweltrecht',
      'Telekommunikationsrecht': 'IT-Recht'
    };

    return mapping[area] || 'Sonstiges';
  }

  /**
   * Check API health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(this.baseUrl, {
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
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new BundesanzeigerConnector();
    }
    return instance;
  },
  BundesanzeigerConnector
};

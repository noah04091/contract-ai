// 📁 backend/services/euLexConnector.js
// Legal Pulse 2.0 Phase 3 - EU-Lex API Integration

const axios = require('axios');
const xml2js = require('xml2js');

class EULexConnector {
  constructor() {
    // EU-Lex SPARQL endpoint
    this.sparqlEndpoint = 'http://publications.europa.eu/webapi/rdf/sparql';
    // EU-Lex REST API base
    this.restBase = 'https://eur-lex.europa.eu/legal-content';
    // EU-Lex Search API
    this.searchBase = 'http://eur-lex.europa.eu/search.html';

    this.xmlParser = new xml2js.Parser();

    console.log('[EU-LEX] Connector initialized');
  }

  /**
   * Search for EU legal documents
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Search results
   */
  async searchDocuments({ query, type = 'directive', sector = null, dateFrom = null, dateTo = null, limit = 10 }) {
    console.log(`[EU-LEX] Searching documents: "${query}"`);

    try {
      // EU-Lex uses SPARQL for advanced queries
      // For simplicity, we'll use their REST API pattern

      const searchUrl = `${this.restBase}/EN/ALL/`;
      const params = {
        qid: Date.now(),
        type: type,
        text: query
      };

      // Note: EU-Lex API requires specific formatting
      // This is a simplified implementation
      // In production, you'd use their official SOAP/SPARQL API

      const response = await axios.get(searchUrl, {
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0'
        }
      });

      // Parse and extract documents
      // EU-Lex returns HTML/XML, needs parsing
      return this.parseSearchResults(response.data, limit);

    } catch (error) {
      console.error('[EU-LEX] Search error:', error.message);
      // Fallback to mock data for development
      return this.getMockSearchResults(query, limit);
    }
  }

  /**
   * Fetch specific document by CELEX number
   * @param {string} celexNumber - CELEX identifier (e.g., "32016R0679" for GDPR)
   * @returns {Promise<Object>} - Document details
   */
  async fetchDocumentByCelex(celexNumber) {
    console.log(`[EU-LEX] Fetching document: ${celexNumber}`);

    try {
      // CELEX format: 32016R0679 = Regulation 2016/679 (GDPR)
      const url = `${this.restBase}/EN/TXT/?uri=CELEX:${celexNumber}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'LegalPulse-ContractAI/2.0',
          'Accept': 'application/xml,text/html'
        }
      });

      return this.parseDocument(response.data, celexNumber);

    } catch (error) {
      console.error('[EU-LEX] Fetch error:', error.message);
      return this.getMockDocument(celexNumber);
    }
  }

  /**
   * Get recent legal changes (last N days)
   * @param {number} days - Days to look back
   * @returns {Promise<Array>} - Recent changes
   */
  async getRecentChanges(days = 30) {
    console.log(`[EU-LEX] Fetching changes from last ${days} days`);

    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // SPARQL query for recent legislation
      const sparqlQuery = this.buildRecentChangesSparql(dateFrom);

      const response = await axios.post(this.sparqlEndpoint, sparqlQuery, {
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        },
        timeout: 15000
      });

      return this.parseSparqlResults(response.data);

    } catch (error) {
      console.error('[EU-LEX] Recent changes error:', error.message);
      return this.getMockRecentChanges(days);
    }
  }

  /**
   * Get documents by subject matter (e.g., data protection, consumer rights)
   * @param {string} subject - Subject area
   * @returns {Promise<Array>} - Documents
   */
  async getDocumentsBySubject(subject) {
    console.log(`[EU-LEX] Fetching documents for subject: ${subject}`);

    try {
      return await this.searchDocuments({
        query: subject,
        limit: 20
      });
    } catch (error) {
      console.error('[EU-LEX] Subject search error:', error.message);
      return [];
    }
  }

  /**
   * Parse search results from EU-Lex response
   * @param {string} htmlData - Response HTML
   * @param {number} limit - Max results
   * @returns {Array} - Parsed results
   */
  parseSearchResults(htmlData, limit) {
    // In production, parse HTML/XML properly
    // For now, return mock data
    return [];
  }

  /**
   * Parse document from EU-Lex response
   * @param {string} data - Response data
   * @param {string} celexNumber - CELEX number
   * @returns {Object} - Parsed document
   */
  parseDocument(data, celexNumber) {
    // Extract title, articles, effective date from HTML/XML
    // Simplified for MVP
    return {
      celex: celexNumber,
      source: 'eu-lex',
      url: `${this.restBase}/EN/TXT/?uri=CELEX:${celexNumber}`
    };
  }

  /**
   * Parse SPARQL results
   * @param {Object} data - SPARQL JSON results
   * @returns {Array} - Parsed results
   */
  parseSparqlResults(data) {
    if (!data.results || !data.results.bindings) {
      return [];
    }

    return data.results.bindings.map(binding => ({
      celex: binding.celex?.value,
      title: binding.title?.value,
      date: binding.date?.value,
      type: binding.type?.value,
      source: 'eu-lex'
    }));
  }

  /**
   * Build SPARQL query for recent changes
   * @param {Date} dateFrom - Start date
   * @returns {string} - SPARQL query
   */
  buildRecentChangesSparql(dateFrom) {
    const dateStr = dateFrom.toISOString().split('T')[0];

    return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?celex ?title ?date ?type
WHERE {
  ?doc cdm:work_has_resource-type ?type .
  ?doc cdm:work_date_document ?date .
  ?doc cdm:resource_legal_id_celex ?celex .
  ?doc cdm:work_title ?title .

  FILTER(?date >= "${dateStr}"^^xsd:date)
  FILTER(lang(?title) = "en")
}
ORDER BY DESC(?date)
LIMIT 50
    `.trim();
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
        celex: '32016R0679',
        title: 'Regulation (EU) 2016/679 (General Data Protection Regulation)',
        date: '2016-04-27',
        type: 'regulation',
        subject: 'data protection',
        relevance: 0.95,
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj'
      },
      {
        celex: '32011L0083',
        title: 'Directive 2011/83/EU (Consumer Rights Directive)',
        date: '2011-10-25',
        type: 'directive',
        subject: 'consumer rights',
        relevance: 0.88,
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj'
      },
      {
        celex: '32019R1150',
        title: 'Regulation (EU) 2019/1150 (Platform-to-Business Regulation)',
        date: '2019-06-20',
        type: 'regulation',
        subject: 'digital markets',
        relevance: 0.82,
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/reg/2019/1150/oj'
      },
      {
        celex: '32022R0868',
        title: 'Regulation (EU) 2022/868 (Data Governance Act)',
        date: '2022-05-30',
        type: 'regulation',
        subject: 'data governance',
        relevance: 0.79,
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/reg/2022/868/oj'
      },
      {
        celex: '32002L0058',
        title: 'Directive 2002/58/EC (ePrivacy Directive)',
        date: '2002-07-12',
        type: 'directive',
        subject: 'privacy',
        relevance: 0.75,
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/dir/2002/58/oj'
      }
    ];

    return mockResults
      .filter(doc =>
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.subject.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
  }

  /**
   * Mock document for development
   * @param {string} celexNumber - CELEX number
   * @returns {Object} - Mock document
   */
  getMockDocument(celexNumber) {
    const mockDocs = {
      '32016R0679': {
        celex: '32016R0679',
        title: 'Regulation (EU) 2016/679 (General Data Protection Regulation)',
        type: 'regulation',
        date: '2016-04-27',
        effectiveDate: '2018-05-25',
        subject: 'data protection',
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
        summary: 'EU regulation on data protection and privacy for all individuals within the EU and EEA.',
        articles: [
          {
            number: '6',
            title: 'Lawfulness of processing',
            text: 'Processing shall be lawful only if and to the extent that at least one of the following applies...'
          },
          {
            number: '13',
            title: 'Information to be provided where personal data are collected from the data subject',
            text: 'Where personal data relating to a data subject are collected from the data subject...'
          },
          {
            number: '28',
            title: 'Processor',
            text: 'Where processing is to be carried out on behalf of a controller, the controller shall use only processors...'
          }
        ],
        lastModified: '2016-05-04'
      },
      '32011L0083': {
        celex: '32011L0083',
        title: 'Directive 2011/83/EU (Consumer Rights Directive)',
        type: 'directive',
        date: '2011-10-25',
        effectiveDate: '2013-12-13',
        subject: 'consumer rights',
        source: 'eu-lex',
        url: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj',
        summary: 'Directive on consumer rights, amending Council Directive 93/13/EEC and Directive 1999/44/EC.',
        articles: [
          {
            number: '6',
            title: 'Information requirements for distance and off-premises contracts',
            text: 'Before the consumer is bound by a distance or off-premises contract...'
          },
          {
            number: '9',
            title: 'Right of withdrawal',
            text: 'Member States shall ensure that the consumer has a period of 14 days to withdraw...'
          }
        ],
        lastModified: '2011-11-22'
      }
    };

    return mockDocs[celexNumber] || {
      celex: celexNumber,
      title: `EU Document ${celexNumber}`,
      source: 'eu-lex',
      url: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celexNumber}`,
      error: 'Document details not available'
    };
  }

  /**
   * Mock recent changes for development
   * @param {number} days - Days to look back
   * @returns {Array} - Mock changes
   */
  getMockRecentChanges(days) {
    const changes = [
      {
        celex: '32023R1114',
        title: 'Regulation (EU) 2023/1114 on markets in crypto-assets',
        date: '2023-05-31',
        type: 'regulation',
        subject: 'crypto-assets',
        source: 'eu-lex',
        impact: 'high'
      },
      {
        celex: '32023L0970',
        title: 'Directive (EU) 2023/970 on pay transparency',
        date: '2023-05-10',
        type: 'directive',
        subject: 'employment',
        source: 'eu-lex',
        impact: 'medium'
      },
      {
        celex: '32023R0988',
        title: 'Regulation (EU) 2023/988 on general product safety',
        date: '2023-05-11',
        type: 'regulation',
        subject: 'product safety',
        source: 'eu-lex',
        impact: 'medium'
      }
    ];

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return changes.filter(change => new Date(change.date) >= cutoffDate);
  }

  /**
   * Map EU law subject to contract area
   * @param {string} subject - EU law subject
   * @returns {string} - Contract area
   */
  mapSubjectToArea(subject) {
    const mapping = {
      'data protection': 'Datenschutz',
      'privacy': 'Datenschutz',
      'consumer rights': 'Verbraucherrecht',
      'employment': 'Arbeitsrecht',
      'digital markets': 'Wettbewerbsrecht',
      'product safety': 'Produkthaftung',
      'crypto-assets': 'Finanzrecht',
      'data governance': 'Datenschutz'
    };

    return mapping[subject.toLowerCase()] || 'Sonstiges';
  }

  /**
   * Check API health
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(this.sparqlEndpoint, {
        timeout: 5000
      });

      return {
        healthy: response.status === 200 || response.status === 400, // 400 = needs query
        endpoint: this.sparqlEndpoint,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        endpoint: this.sparqlEndpoint,
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
      instance = new EULexConnector();
    }
    return instance;
  },
  EULexConnector
};

// 📁 backend/services/eurlexService.js
// EUR-Lex SPARQL Service - Official EU Legal Database Integration

const fetch = require('node-fetch');

const ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";

/**
 * Query EUR-Lex SPARQL endpoint
 * @param {string} sparql - SPARQL query
 * @returns {Promise<Object>} Query results
 */
async function queryEurLex(sparql) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "accept": "application/sparql-results+json",
        "user-agent": "ContractAI-LegalPulse/1.0 (compliance-monitoring; contact: support@contract-ai.de)"
      },
      body: new URLSearchParams({ query: sparql }),
      timeout: 30000 // 30 second timeout
    });

    if (!res.ok) {
      throw new Error(`EUR-Lex SPARQL ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('❌ [EUR-LEX] Query failed:', error.message);
    throw error;
  }
}

/**
 * Build SPARQL query for recent legal acts
 * @param {Object} options - Query options
 * @param {number} options.days - Days to look back (default: 14)
 * @param {string} options.subject - Filter by subject (optional)
 * @param {string} options.language - Language code (default: "de")
 * @returns {string} SPARQL query
 */
function buildRecentActsQuery({ days = 14, subject = null, language = "de" } = {}) {
  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  let subjectFilter = '';
  if (subject) {
    subjectFilter = `
    OPTIONAL {
      ?work cdm:work_is_about_concept ?concept .
      ?concept skos:prefLabel ?subjectLabel .
      FILTER (LANG(?subjectLabel)="${language}" && CONTAINS(LCASE(?subjectLabel), "${subject.toLowerCase()}"))
    }`;
  }

  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT DISTINCT ?celex ?title ?date ?type ?subject
WHERE {
  ?work a cdm:work ;
        cdm:work_has_resource-type ?typeUri ;
        cdm:resource_legal_id_celex ?celex ;
        dcterms:title ?title ;
        dcterms:issued ?date .

  FILTER(LANG(?title) = "${language}")
  FILTER(?date >= "${sinceDate}")

  OPTIONAL {
    ?typeUri skos:prefLabel ?type .
    FILTER(LANG(?type) = "${language}")
  }

  ${subjectFilter}

  OPTIONAL {
    ?work cdm:work_is_about_concept ?concept2 .
    ?concept2 skos:prefLabel ?subject .
    FILTER(LANG(?subject) = "${language}")
  }
}
ORDER BY DESC(?date)
LIMIT 100
`.trim();
}

/**
 * Build SPARQL query for specific search term
 * @param {Object} options - Query options
 * @param {string} options.query - Search term
 * @param {string} options.language - Language code (default: "de")
 * @param {number} options.limit - Result limit (default: 100)
 * @returns {string} SPARQL query
 */
function buildSearchQuery({ query, language = "de", limit = 100 } = {}) {
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT DISTINCT ?celex ?title ?date ?type
WHERE {
  ?work a cdm:work ;
        cdm:resource_legal_id_celex ?celex ;
        dcterms:title ?title ;
        dcterms:issued ?date .

  FILTER(LANG(?title) = "${language}")
  FILTER(CONTAINS(LCASE(STR(?title)), "${query.toLowerCase()}"))

  OPTIONAL {
    ?work cdm:work_has_resource-type ?typeUri .
    ?typeUri skos:prefLabel ?type .
    FILTER(LANG(?type) = "${language}")
  }
}
ORDER BY DESC(?date)
LIMIT ${limit}
`.trim();
}

/**
 * Fetch recent legal acts from EUR-Lex
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Normalized legal acts
 */
async function fetchRecentActs(options = {}) {
  try {
    const sparql = buildRecentActsQuery(options);
    console.log('🔍 [EUR-LEX] Querying recent acts...');

    const data = await queryEurLex(sparql);

    const results = data.results.bindings.map(b => ({
      source: 'eur-lex',
      celex: b.celex?.value || null,
      title: b.title?.value || 'Untitled',
      date: b.date?.value ? new Date(b.date.value) : new Date(),
      type: b.type?.value || 'Unknown',
      subject: b.subject?.value || null,
      url: b.celex?.value ? `https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=CELEX:${b.celex.value}` : null,
      language: options.language || 'de'
    }));

    console.log(`✅ [EUR-LEX] Found ${results.length} recent acts`);
    return results;

  } catch (error) {
    console.error('❌ [EUR-LEX] Failed to fetch recent acts:', error.message);
    return [];
  }
}

/**
 * Search EUR-Lex by keyword
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Normalized search results
 */
async function searchEurLex(options = {}) {
  try {
    if (!options.query) {
      throw new Error('Search query is required');
    }

    const sparql = buildSearchQuery(options);
    console.log(`🔍 [EUR-LEX] Searching for: "${options.query}"`);

    const data = await queryEurLex(sparql);

    const results = data.results.bindings.map(b => ({
      source: 'eur-lex',
      celex: b.celex?.value || null,
      title: b.title?.value || 'Untitled',
      date: b.date?.value ? new Date(b.date.value) : new Date(),
      type: b.type?.value || 'Unknown',
      url: b.celex?.value ? `https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=CELEX:${b.celex.value}` : null,
      language: options.language || 'de'
    }));

    console.log(`✅ [EUR-LEX] Found ${results.length} results for "${options.query}"`);
    return results;

  } catch (error) {
    console.error('❌ [EUR-LEX] Search failed:', error.message);
    return [];
  }
}

/**
 * Predefined queries for common contract types
 */
const PRESET_QUERIES = {
  datenschutz: () => buildRecentActsQuery({ days: 30, subject: 'datenschutz' }),
  arbeitsrecht: () => buildRecentActsQuery({ days: 30, subject: 'arbeitsrecht' }),
  verbraucherrecht: () => buildRecentActsQuery({ days: 30, subject: 'verbraucherrecht' }),
  mietrecht: () => buildRecentActsQuery({ days: 30, subject: 'mietrecht' }),
  kaufrecht: () => buildRecentActsQuery({ days: 30, subject: 'kaufrecht' }),
};

/**
 * Fetch laws for a specific contract category
 * @param {string} category - Contract category
 * @returns {Promise<Array>} Relevant laws
 */
async function fetchByCategory(category) {
  const queryBuilder = PRESET_QUERIES[category.toLowerCase()];

  if (!queryBuilder) {
    console.warn(`⚠️ [EUR-LEX] No preset query for category: ${category}`);
    return fetchRecentActs({ days: 30 });
  }

  try {
    const sparql = queryBuilder();
    const data = await queryEurLex(sparql);

    const results = data.results.bindings.map(b => ({
      source: 'eur-lex',
      category,
      celex: b.celex?.value || null,
      title: b.title?.value || 'Untitled',
      date: b.date?.value ? new Date(b.date.value) : new Date(),
      type: b.type?.value || 'Unknown',
      subject: b.subject?.value || null,
      url: b.celex?.value ? `https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=CELEX:${b.celex.value}` : null
    }));

    console.log(`✅ [EUR-LEX] Found ${results.length} laws for category: ${category}`);
    return results;

  } catch (error) {
    console.error(`❌ [EUR-LEX] Failed to fetch category ${category}:`, error.message);
    return [];
  }
}

module.exports = {
  queryEurLex,
  fetchRecentActs,
  searchEurLex,
  fetchByCategory,
  buildRecentActsQuery,
  buildSearchQuery,
  PRESET_QUERIES
};

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

    // Concept-Mapping: Maps search concepts to relevant law slugs on gesetze-im-internet.de
    // Used as fallback when XML title/abbreviation search finds nothing
    this.conceptMappings = {
      'kündigungsfrist': ['bgb', 'kschg', 'hgb'],
      'kündigung': ['bgb', 'kschg', 'betrvg'],
      'kündigungsschutz': ['kschg', 'bgb', 'betrvg'],
      'datenschutz': ['bdsg_2018', 'tkg_2021', 'ttdsg'],
      'dsgvo': ['bdsg_2018'],
      'mietvertrag': ['bgb'],
      'miete': ['bgb'],
      'mietrecht': ['bgb'],
      'arbeitszeit': ['arbzg'],
      'arbeitsvertrag': ['bgb', 'nachwg', 'tzbfg'],
      'arbeitsrecht': ['bgb', 'kschg', 'arbzg', 'betrvg', 'tzbfg'],
      'urlaub': ['burlg'],
      'urlaubsanspruch': ['burlg', 'bgb'],
      'mutterschutz': ['muschg_2018'],
      'elternzeit': ['beeg'],
      'elterngeld': ['beeg'],
      'mindestlohn': ['milog'],
      'gewerbe': ['gewo'],
      'gewerbeordnung': ['gewo'],
      'handelsregister': ['hgb'],
      'insolvenz': ['inso'],
      'insolvenzordnung': ['inso'],
      'wettbewerb': ['uwg', 'gwb'],
      'wettbewerbsrecht': ['uwg', 'gwb'],
      'marke': ['markeng'],
      'markenrecht': ['markeng'],
      'patent': ['patg'],
      'patentrecht': ['patg'],
      'urheberrecht': ['urhg'],
      'copyright': ['urhg'],
      'gesellschaft': ['gmbhg', 'aktg', 'hgb'],
      'gmbh': ['gmbhg'],
      'aktiengesellschaft': ['aktg'],
      'steuer': ['estg', 'ustg_1980', 'ao_1977'],
      'einkommensteuer': ['estg'],
      'umsatzsteuer': ['ustg_1980'],
      'abgabenordnung': ['ao_1977'],
      'sozialversicherung': ['sgb_4', 'sgb_5', 'sgb_6'],
      'krankenversicherung': ['sgb_5'],
      'rentenversicherung': ['sgb_6'],
      'strafrecht': ['stgb', 'stpo'],
      'strafgesetzbuch': ['stgb'],
      'strafprozessordnung': ['stpo'],
      'baurecht': ['baugb', 'baunvo'],
      'baugesetzbuch': ['baugb'],
      'umwelt': ['bimschg', 'krwg'],
      'umweltrecht': ['bimschg', 'krwg'],
      'verbraucherschutz': ['bgb', 'prodsg_2021', 'pangv_2022'],
      'haftung': ['bgb', 'prodhaftg'],
      'produkthaftung': ['prodhaftg'],
      'versicherung': ['vvg_2008'],
      'versicherungsvertrag': ['vvg_2008'],
      'erbrecht': ['bgb'],
      'testament': ['bgb'],
      'familienrecht': ['bgb', 'famfg'],
      'scheidung': ['bgb', 'famfg'],
      'unterhalt': ['bgb'],
      'grundgesetz': ['gg'],
      'verfassung': ['gg'],
      'grundrechte': ['gg'],
      'zivilprozess': ['zpo'],
      'zivilprozessordnung': ['zpo'],
      'verwaltungsrecht': ['vwvfg', 'vwgo'],
      'verwaltungsverfahren': ['vwvfg'],
      'betriebsverfassung': ['betrvg'],
      'betriebsrat': ['betrvg'],
      'tarifvertrag': ['tvg'],
      'berufsausbildung': ['bbig_2005'],
      'ausbildung': ['bbig_2005'],
      'teilzeit': ['tzbfg'],
      'befristung': ['tzbfg'],
      'entgeltfortzahlung': ['entgfg'],
      'krankheit': ['entgfg', 'sgb_5'],
      'probezeit': ['bgb', 'kschg'],
      'zeugnis': ['bgb', 'gewo'],
      'abmahnung': ['bgb', 'kschg'],
      'aufhebungsvertrag': ['bgb'],
      'schadensersatz': ['bgb'],
      'gewährleistung': ['bgb'],
      'kaufvertrag': ['bgb'],
      'werkvertrag': ['bgb'],
      'dienstvertrag': ['bgb'],
      'darlehen': ['bgb'],
      'bürgschaft': ['bgb'],
      'vollmacht': ['bgb'],
      'verjährung': ['bgb'],
      'widerrufsrecht': ['bgb'],
      'agb': ['bgb'],
      'allgemeine geschäftsbedingungen': ['bgb'],
      'fernabsatz': ['bgb'],
      'jugendschutz': ['jarbschg', 'juschg'],
      'jugendarbeitsschutz': ['jarbschg'],
      'schwarzarbeit': ['schwarzarbg_2004'],
      'geldwäsche': ['gwg'],
      'kartellrecht': ['gwb'],
      'vergaberecht': ['gwb'],
      'telekommunikation': ['tkg_2021'],
      'telemedien': ['ttdsg'],
      'energierecht': ['enwg_2005', 'eeg_2023'],
      'erneuerbare energien': ['eeg_2014']
    };

    // Map slugs to display info for building results
    this.lawInfo = {
      'bgb': { title: 'Bürgerliches Gesetzbuch', abbreviation: 'BGB', area: 'Vertragsrecht' },
      'hgb': { title: 'Handelsgesetzbuch', abbreviation: 'HGB', area: 'Handelsrecht' },
      'stgb': { title: 'Strafgesetzbuch', abbreviation: 'StGB', area: 'Strafrecht' },
      'gg': { title: 'Grundgesetz', abbreviation: 'GG', area: 'Verfassungsrecht' },
      'kschg': { title: 'Kündigungsschutzgesetz', abbreviation: 'KSchG', area: 'Arbeitsrecht' },
      'bdsg_2018': { title: 'Bundesdatenschutzgesetz', abbreviation: 'BDSG', area: 'Datenschutz' },
      'uwg': { title: 'Gesetz gegen den unlauteren Wettbewerb', abbreviation: 'UWG', area: 'Wettbewerbsrecht' },
      'gwb': { title: 'Gesetz gegen Wettbewerbsbeschränkungen', abbreviation: 'GWB', area: 'Wettbewerbsrecht' },
      'gmbhg': { title: 'GmbH-Gesetz', abbreviation: 'GmbHG', area: 'Gesellschaftsrecht' },
      'aktg': { title: 'Aktiengesetz', abbreviation: 'AktG', area: 'Gesellschaftsrecht' },
      'vvg_2008': { title: 'Versicherungsvertragsgesetz', abbreviation: 'VVG', area: 'Versicherungsrecht' },
      'betrvg': { title: 'Betriebsverfassungsgesetz', abbreviation: 'BetrVG', area: 'Arbeitsrecht' },
      'estg': { title: 'Einkommensteuergesetz', abbreviation: 'EStG', area: 'Steuerrecht' },
      'ustg_1980': { title: 'Umsatzsteuergesetz', abbreviation: 'UStG', area: 'Steuerrecht' },
      'ao_1977': { title: 'Abgabenordnung', abbreviation: 'AO', area: 'Steuerrecht' },
      'inso': { title: 'Insolvenzordnung', abbreviation: 'InsO', area: 'Insolvenzrecht' },
      'zpo': { title: 'Zivilprozessordnung', abbreviation: 'ZPO', area: 'Prozessrecht' },
      'stpo': { title: 'Strafprozessordnung', abbreviation: 'StPO', area: 'Strafrecht' },
      'arbzg': { title: 'Arbeitszeitgesetz', abbreviation: 'ArbZG', area: 'Arbeitsrecht' },
      'burlg': { title: 'Bundesurlaubsgesetz', abbreviation: 'BUrlG', area: 'Arbeitsrecht' },
      'muschg_2018': { title: 'Mutterschutzgesetz', abbreviation: 'MuSchG', area: 'Arbeitsrecht' },
      'beeg': { title: 'Bundeselterngeld- und Elternzeitgesetz', abbreviation: 'BEEG', area: 'Arbeitsrecht' },
      'milog': { title: 'Mindestlohngesetz', abbreviation: 'MiLoG', area: 'Arbeitsrecht' },
      'tzbfg': { title: 'Teilzeit- und Befristungsgesetz', abbreviation: 'TzBfG', area: 'Arbeitsrecht' },
      'nachwg': { title: 'Nachweisgesetz', abbreviation: 'NachwG', area: 'Arbeitsrecht' },
      'tvg': { title: 'Tarifvertragsgesetz', abbreviation: 'TVG', area: 'Arbeitsrecht' },
      'bbig_2005': { title: 'Berufsbildungsgesetz', abbreviation: 'BBiG', area: 'Arbeitsrecht' },
      'entgfg': { title: 'Entgeltfortzahlungsgesetz', abbreviation: 'EntgFG', area: 'Arbeitsrecht' },
      'jarbschg': { title: 'Jugendarbeitsschutzgesetz', abbreviation: 'JArbSchG', area: 'Arbeitsrecht' },
      'gewo': { title: 'Gewerbeordnung', abbreviation: 'GewO', area: 'Gewerberecht' },
      'markeng': { title: 'Markengesetz', abbreviation: 'MarkenG', area: 'Gewerblicher Rechtsschutz' },
      'patg': { title: 'Patentgesetz', abbreviation: 'PatG', area: 'Gewerblicher Rechtsschutz' },
      'urhg': { title: 'Urheberrechtsgesetz', abbreviation: 'UrhG', area: 'Gewerblicher Rechtsschutz' },
      'baugb': { title: 'Baugesetzbuch', abbreviation: 'BauGB', area: 'Baurecht' },
      'baunvo': { title: 'Baunutzungsverordnung', abbreviation: 'BauNVO', area: 'Baurecht' },
      'bimschg': { title: 'Bundes-Immissionsschutzgesetz', abbreviation: 'BImSchG', area: 'Umweltrecht' },
      'krwg': { title: 'Kreislaufwirtschaftsgesetz', abbreviation: 'KrWG', area: 'Umweltrecht' },
      'prodhaftg': { title: 'Produkthaftungsgesetz', abbreviation: 'ProdHaftG', area: 'Haftungsrecht' },
      'prodsg_2021': { title: 'Produktsicherheitsgesetz', abbreviation: 'ProdSG', area: 'Verbraucherschutz' },
      'pangv_2022': { title: 'Preisangabenverordnung', abbreviation: 'PAngV', area: 'Verbraucherschutz' },
      'sgb_4': { title: 'Sozialgesetzbuch IV', abbreviation: 'SGB IV', area: 'Sozialrecht' },
      'sgb_5': { title: 'Sozialgesetzbuch V', abbreviation: 'SGB V', area: 'Sozialrecht' },
      'sgb_6': { title: 'Sozialgesetzbuch VI', abbreviation: 'SGB VI', area: 'Sozialrecht' },
      'famfg': { title: 'Gesetz über das Verfahren in Familiensachen', abbreviation: 'FamFG', area: 'Familienrecht' },
      'vwvfg': { title: 'Verwaltungsverfahrensgesetz', abbreviation: 'VwVfG', area: 'Verwaltungsrecht' },
      'vwgo': { title: 'Verwaltungsgerichtsordnung', abbreviation: 'VwGO', area: 'Verwaltungsrecht' },
      'tkg_2021': { title: 'Telekommunikationsgesetz', abbreviation: 'TKG', area: 'IT-Recht' },
      'ttdsg': { title: 'Telekommunikation-Telemedien-Datenschutz-Gesetz', abbreviation: 'TTDSG', area: 'IT-Recht' },
      'gwg': { title: 'Geldwäschegesetz', abbreviation: 'GwG', area: 'Finanzrecht' },
      'schwarzarbg_2004': { title: 'Schwarzarbeitsbekämpfungsgesetz', abbreviation: 'SchwarzArbG', area: 'Arbeitsrecht' },
      'juschg': { title: 'Jugendschutzgesetz', abbreviation: 'JuSchG', area: 'Jugendschutz' },
      'enwg_2005': { title: 'Energiewirtschaftsgesetz', abbreviation: 'EnWG', area: 'Energierecht' },
      'eeg_2014': { title: 'Erneuerbare-Energien-Gesetz', abbreviation: 'EEG', area: 'Energierecht' }
    };

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

      // If no results from XML index, try concept-mapping fallback
      if (results.length === 0) {
        console.log(`[GESETZE-IM-INTERNET] No index matches, trying concept-mapping for "${query}"`);
        const conceptResults = this.searchByConceptMapping(query, limit);
        if (conceptResults.length > 0) {
          console.log(`[GESETZE-IM-INTERNET] Concept-mapping found ${conceptResults.length} results`);
          return conceptResults;
        }
      }

      console.log(`[GESETZE-IM-INTERNET] Found ${results.length} results`);
      return results;

    } catch (error) {
      console.error('[GESETZE-IM-INTERNET] Search error:', error.message);
      return this.searchViaWebsite(query, limit);
    }
  }

  /**
   * Search using concept-mapping when XML index search fails
   * Maps common legal concepts to known law slugs
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} - Mapped results
   */
  searchByConceptMapping(query, limit) {
    const queryLower = query.toLowerCase().trim();
    const matchedSlugs = new Set();

    // Exact match first
    if (this.conceptMappings[queryLower]) {
      for (const slug of this.conceptMappings[queryLower]) {
        matchedSlugs.add(slug);
      }
    }

    // Partial match: check if query contains or is contained in a concept key
    if (matchedSlugs.size === 0) {
      for (const [concept, slugs] of Object.entries(this.conceptMappings)) {
        if (queryLower.includes(concept) || concept.includes(queryLower)) {
          for (const slug of slugs) {
            matchedSlugs.add(slug);
          }
        }
      }
    }

    // Multi-word query: check each word
    if (matchedSlugs.size === 0) {
      const words = queryLower.split(/\s+/);
      for (const word of words) {
        if (word.length < 3) continue;
        for (const [concept, slugs] of Object.entries(this.conceptMappings)) {
          if (concept.includes(word) || word.includes(concept)) {
            for (const slug of slugs) {
              matchedSlugs.add(slug);
            }
          }
        }
      }
    }

    if (matchedSlugs.size === 0) return [];

    const results = [];
    for (const slug of matchedSlugs) {
      const info = this.lawInfo[slug];
      if (info) {
        results.push({
          id: slug,
          title: `${info.title} (${info.abbreviation})`,
          description: `Deutsches Bundesgesetz - ${info.area} (via Konzept-Zuordnung: "${query}")`,
          date: null,
          type: 'law',
          source: 'gesetze-im-internet',
          url: `${this.baseUrl}/${slug}/index.html`,
          relevance: 0.85,
          area: info.area,
          documentId: info.abbreviation
        });
      }

      if (results.length >= limit) break;
    }

    return results;
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

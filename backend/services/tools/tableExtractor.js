// backend/services/tools/tableExtractor.js

class TableExtractor {
  constructor() {
    this.description = 'Extracts and analyzes tables, pricing, and structured data from contracts';
    this.capabilities = ['table_detection', 'price_extraction', 'data_analysis'];
    
    // Patterns for detecting tabular data and structured information
    this.tableIndicators = [
      // German table headers
      /\b(position|pos\.|artikel|article|bezeichnung|description|menge|quantity|preis|price|betrag|amount|summe|total)\b/gi,
      /\b(nr\.|nummer|number|typ|type|kategorie|category)\b/gi,
      
      // Price and currency patterns
      /\b\d+(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:€|EUR|USD|\$|CHF|GBP|£)\b/g,
      
      // Table structure indicators
      /^\s*\|\s*.*\s*\|\s*$/gm, // Pipe-separated
      /^\s*\d+\s*[.|)]\s+/gm, // Numbered lists
      /\t.*\t/g, // Tab-separated
      
      // Structured data patterns
      /^[A-Z][a-zA-Z\s]+:\s*.+$/gm // Key: Value pairs
    ];
    
    // Patterns for financial data
    this.financialPatterns = {
      amounts: /\b(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:€|EUR|USD|\$|CHF|GBP|£|Dollar|Euro)\b/gi,
      percentages: /\b(\d+(?:[.,]\d{1,2})?)\s*%\b/g,
      rates: /\b(\d+(?:[.,]\d{2})?)\s*(?:pro|per|je|each)\s+(?:stunde|hour|tag|day|monat|month|jahr|year|stück|piece|einheit|unit)\b/gi
    };
  }

  /**
   * Main execution method
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      const { question, retrievalResults } = context;
      
      // Extract tables and structured data
      const extractedTables = this.extractTables(retrievalResults);
      
      // Extract financial information
      const financialData = this.extractFinancialData(retrievalResults);
      
      // Analyze extracted data
      const analysis = this.analyzeExtractedData(extractedTables, financialData);
      
      // Generate summaries
      const summaries = this.generateSummaries(analysis, context.userMode);
      
      // Create insights
      const insights = this.createTableInsights(analysis, financialData);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          tablesFound: extractedTables.length,
          financialDataPoints: financialData.amounts.length + financialData.rates.length,
          summaries,
          structuredData: this.formatStructuredData(analysis),
          calculations: this.performCalculations(financialData)
        },
        insights,
        citations: this.generateCitations(extractedTables, financialData),
        metadata: {
          processingTime: duration,
          toolName: 'tableExtractor'
        }
      };
      
    } catch (error) {
      console.error('TableExtractor execution failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Extract tables and structured data from retrieval results
   */
  extractTables(retrievalResults) {
    const tables = [];
    
    if (!retrievalResults?.results) {
      return tables;
    }
    
    for (const chunk of retrievalResults.results) {
      const chunkTables = this.extractTablesFromText(chunk.text, chunk);
      tables.push(...chunkTables);
    }
    
    return tables;
  }

  /**
   * Extract tables from a single text chunk
   */
  extractTablesFromText(text, sourceChunk) {
    const tables = [];
    
    // Check for table indicators
    const hasTableIndicators = this.tableIndicators.some(pattern => 
      pattern.test(text)
    );
    
    if (!hasTableIndicators) {
      return tables;
    }
    
    // Extract pipe-separated tables
    const pipeTables = this.extractPipeTables(text, sourceChunk);
    tables.push(...pipeTables);
    
    // Extract tab-separated data
    const tabTables = this.extractTabSeparatedData(text, sourceChunk);
    tables.push(...tabTables);
    
    // Extract structured lists
    const listTables = this.extractStructuredLists(text, sourceChunk);
    tables.push(...listTables);
    
    // Extract key-value pairs
    const kvTables = this.extractKeyValuePairs(text, sourceChunk);
    tables.push(...kvTables);
    
    return tables;
  }

  /**
   * Extract pipe-separated tables
   */
  extractPipeTables(text, sourceChunk) {
    const tables = [];
    const pipeRows = text.match(/^\s*\|.*\|\s*$/gm);
    
    if (!pipeRows || pipeRows.length < 2) return tables;
    
    const rows = pipeRows.map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    );
    
    if (rows.length > 0) {
      tables.push({
        type: 'pipe_table',
        headers: rows[0],
        data: rows.slice(1),
        sourceChunk: sourceChunk.chunkId,
        page: sourceChunk.spans?.pageStart || 1,
        confidence: 0.9
      });
    }
    
    return tables;
  }

  /**
   * Extract tab-separated data
   */
  extractTabSeparatedData(text, sourceChunk) {
    const tables = [];
    const lines = text.split('\n');
    const tabLines = lines.filter(line => line.includes('\t') && line.split('\t').length > 2);
    
    if (tabLines.length < 2) return tables;
    
    const rows = tabLines.map(line => line.split('\t').map(cell => cell.trim()));
    
    tables.push({
      type: 'tab_table',
      headers: rows[0],
      data: rows.slice(1),
      sourceChunk: sourceChunk.chunkId,
      page: sourceChunk.spans?.pageStart || 1,
      confidence: 0.8
    });
    
    return tables;
  }

  /**
   * Extract structured lists (numbered or bulleted)
   */
  extractStructuredLists(text, sourceChunk) {
    const tables = [];
    
    // Look for numbered lists with consistent structure
    const numberedItems = text.match(/^\s*\d+\s*[.)]\s+.+$/gm);
    
    if (numberedItems && numberedItems.length >= 3) {
      const items = numberedItems.map((item, index) => {
        const cleaned = item.replace(/^\s*\d+\s*[.)]\s+/, '').trim();
        return this.parseListItem(cleaned, index);
      });
      
      tables.push({
        type: 'numbered_list',
        headers: ['Position', 'Inhalt'],
        data: items,
        sourceChunk: sourceChunk.chunkId,
        page: sourceChunk.spans?.pageStart || 1,
        confidence: 0.7
      });
    }
    
    return tables;
  }

  /**
   * Parse individual list item for structured data
   */
  parseListItem(item, index) {
    const row = [`${index + 1}`, item];
    
    // Try to extract structured information
    const priceMatch = item.match(this.financialPatterns.amounts);
    if (priceMatch) {
      row.push(priceMatch[0]);
    }
    
    const percentMatch = item.match(this.financialPatterns.percentages);
    if (percentMatch) {
      row.push(percentMatch[0]);
    }
    
    return row;
  }

  /**
   * Extract key-value pairs
   */
  extractKeyValuePairs(text, sourceChunk) {
    const tables = [];
    const kvPairs = text.match(/^[A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s]+:\s*.+$/gm);
    
    if (!kvPairs || kvPairs.length < 3) return tables;
    
    const data = kvPairs.map(pair => {
      const [key, ...valueParts] = pair.split(':');
      return [key.trim(), valueParts.join(':').trim()];
    });
    
    tables.push({
      type: 'key_value',
      headers: ['Eigenschaft', 'Wert'],
      data,
      sourceChunk: sourceChunk.chunkId,
      page: sourceChunk.spans?.pageStart || 1,
      confidence: 0.6
    });
    
    return tables;
  }

  /**
   * Extract financial data from retrieval results
   */
  extractFinancialData(retrievalResults) {
    const financialData = {
      amounts: [],
      percentages: [],
      rates: []
    };
    
    if (!retrievalResults?.results) return financialData;
    
    for (const chunk of retrievalResults.results) {
      // Extract amounts
      const amountMatches = [...chunk.text.matchAll(this.financialPatterns.amounts)];
      for (const match of amountMatches) {
        financialData.amounts.push({
          value: this.parseAmount(match[1]),
          currency: this.detectCurrency(match[0]),
          rawText: match[0],
          context: this.extractContext(chunk.text, match.index),
          sourceChunk: chunk.chunkId,
          page: chunk.spans?.pageStart || 1
        });
      }
      
      // Extract percentages
      const percentMatches = [...chunk.text.matchAll(this.financialPatterns.percentages)];
      for (const match of percentMatches) {
        financialData.percentages.push({
          value: parseFloat(match[1].replace(',', '.')),
          rawText: match[0],
          context: this.extractContext(chunk.text, match.index),
          sourceChunk: chunk.chunkId,
          page: chunk.spans?.pageStart || 1
        });
      }
      
      // Extract rates
      const rateMatches = [...chunk.text.matchAll(this.financialPatterns.rates)];
      for (const match of rateMatches) {
        financialData.rates.push({
          value: parseFloat(match[1].replace(',', '.')),
          unit: match[0].split(/pro|per|je|each/i)[1]?.trim() || 'unit',
          rawText: match[0],
          context: this.extractContext(chunk.text, match.index),
          sourceChunk: chunk.chunkId,
          page: chunk.spans?.pageStart || 1
        });
      }
    }
    
    return financialData;
  }

  /**
   * Parse amount string to number
   */
  parseAmount(amountStr) {
    // Handle German and English number formats
    return parseFloat(
      amountStr
        .replace(/[^\d,.]/g, '') // Remove non-numeric except , and .
        .replace(/,(?=\d{3})/g, '') // Remove thousands separators (commas before 3 digits)
        .replace(',', '.') // Convert German decimal separator
    );
  }

  /**
   * Detect currency from amount string
   */
  detectCurrency(amountStr) {
    const currencyMap = {
      '€': 'EUR',
      'EUR': 'EUR',
      '$': 'USD',
      'USD': 'USD',
      'CHF': 'CHF',
      '£': 'GBP',
      'GBP': 'GBP'
    };
    
    for (const [symbol, code] of Object.entries(currencyMap)) {
      if (amountStr.includes(symbol)) {
        return code;
      }
    }
    
    return 'EUR'; // Default
  }

  /**
   * Extract context around a match
   */
  extractContext(text, matchIndex, contextLength = 50) {
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + contextLength);
    return text.substring(start, end);
  }

  /**
   * Analyze extracted data
   */
  analyzeExtractedData(tables, financialData) {
    const analysis = {
      tableTypes: this.analyzeTableTypes(tables),
      financialSummary: this.analyzeFinancialData(financialData),
      dataQuality: this.assessDataQuality(tables, financialData),
      patterns: this.identifyPatterns(tables, financialData)
    };
    
    return analysis;
  }

  /**
   * Analyze table types and distribution
   */
  analyzeTableTypes(tables) {
    const typeCount = {};
    const qualityScores = [];
    
    for (const table of tables) {
      typeCount[table.type] = (typeCount[table.type] || 0) + 1;
      qualityScores.push(table.confidence);
    }
    
    return {
      types: typeCount,
      totalTables: tables.length,
      averageQuality: qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length || 0
    };
  }

  /**
   * Analyze financial data
   */
  analyzeFinancialData(financialData) {
    const amounts = financialData.amounts.map(a => a.value).filter(v => !isNaN(v));
    const percentages = financialData.percentages.map(p => p.value).filter(v => !isNaN(v));
    
    return {
      totalAmounts: amounts.length,
      amountRange: amounts.length > 0 ? {
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        sum: amounts.reduce((a, b) => a + b, 0),
        average: amounts.reduce((a, b) => a + b, 0) / amounts.length
      } : null,
      percentageRange: percentages.length > 0 ? {
        min: Math.min(...percentages),
        max: Math.max(...percentages),
        average: percentages.reduce((a, b) => a + b, 0) / percentages.length
      } : null,
      currencies: [...new Set(financialData.amounts.map(a => a.currency))]
    };
  }

  /**
   * Assess data quality
   */
  assessDataQuality(tables, financialData) {
    let qualityScore = 0.5;
    let issues = [];
    
    // Table quality assessment
    if (tables.length > 0) {
      const avgConfidence = tables.reduce((sum, t) => sum + t.confidence, 0) / tables.length;
      qualityScore += avgConfidence * 0.3;
      
      if (avgConfidence < 0.5) {
        issues.push('Low table detection confidence');
      }
    }
    
    // Financial data quality
    const invalidAmounts = financialData.amounts.filter(a => isNaN(a.value)).length;
    if (invalidAmounts > 0) {
      issues.push(`${invalidAmounts} unparseable amounts`);
      qualityScore -= 0.2;
    }
    
    return {
      score: Math.max(0, Math.min(1, qualityScore)),
      issues
    };
  }

  /**
   * Identify patterns in the data
   */
  identifyPatterns(tables, financialData) {
    const patterns = [];
    
    // Check for pricing tables
    const pricingTables = tables.filter(t => 
      t.headers.some(h => /preis|price|betrag|amount|kosten|cost/i.test(h))
    );
    if (pricingTables.length > 0) {
      patterns.push('pricing_structure');
    }
    
    // Check for recurring amounts
    const amounts = financialData.amounts.map(a => a.value);
    const uniqueAmounts = [...new Set(amounts)];
    if (amounts.length > uniqueAmounts.length * 2) {
      patterns.push('recurring_amounts');
    }
    
    // Check for percentage-based fees
    if (financialData.percentages.length > 2) {
      patterns.push('percentage_based_fees');
    }
    
    return patterns;
  }

  /**
   * Generate summaries based on user mode
   */
  generateSummaries(analysis, userMode = 'business') {
    const summaries = [];
    
    if (analysis.tableTypes.totalTables > 0) {
      const summary = {
        title: 'Strukturierte Daten gefunden',
        content: this.generateTableSummary(analysis.tableTypes, userMode)
      };
      summaries.push(summary);
    }
    
    if (analysis.financialSummary.totalAmounts > 0) {
      const summary = {
        title: 'Finanzielle Informationen',
        content: this.generateFinancialSummary(analysis.financialSummary, userMode)
      };
      summaries.push(summary);
    }
    
    return summaries;
  }

  /**
   * Generate table summary text
   */
  generateTableSummary(tableTypes, userMode) {
    const total = tableTypes.totalTables;
    let content = `${total} strukturierte Datenbereich${total > 1 ? 'e' : ''} gefunden. `;
    
    if (userMode === 'legal') {
      content += 'Tabellarische Daten wurden zur rechtlichen Prüfung extrahiert.';
    } else {
      content += 'Die Daten wurden für weitere Analyse aufbereitet.';
    }
    
    return content;
  }

  /**
   * Generate financial summary text
   */
  generateFinancialSummary(financialSummary, userMode) {
    let content = `${financialSummary.totalAmounts} Geldbeträge identifiziert. `;
    
    if (financialSummary.amountRange) {
      const { min, max, sum } = financialSummary.amountRange;
      content += `Spanne: ${min.toLocaleString('de-DE')} - ${max.toLocaleString('de-DE')}. `;
      if (userMode === 'business') {
        content += `Gesamtsumme: ${sum.toLocaleString('de-DE')}.`;
      }
    }
    
    return content;
  }

  /**
   * Format structured data for output
   */
  formatStructuredData(analysis) {
    return {
      tablesSummary: analysis.tableTypes,
      financialOverview: analysis.financialSummary,
      qualityAssessment: analysis.dataQuality,
      identifiedPatterns: analysis.patterns
    };
  }

  /**
   * Perform calculations on financial data
   */
  performCalculations(financialData) {
    const calculations = {};
    
    // Sum amounts by currency
    const amountsByCurrency = {};
    for (const amount of financialData.amounts) {
      if (!amountsByCurrency[amount.currency]) {
        amountsByCurrency[amount.currency] = [];
      }
      amountsByCurrency[amount.currency].push(amount.value);
    }
    
    for (const [currency, amounts] of Object.entries(amountsByCurrency)) {
      calculations[`total_${currency}`] = amounts.reduce((a, b) => a + b, 0);
      calculations[`average_${currency}`] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    }
    
    return calculations;
  }

  /**
   * Create insights for the insights panel
   */
  createTableInsights(analysis, financialData) {
    return {
      amounts: financialData.amounts.map(a => ({
        amount: a.value,
        currency: a.currency,
        context: a.context,
        page: a.page
      })),
      keyTerms: [
        ...Object.keys(analysis.tableTypes.types),
        ...analysis.patterns
      ],
      risks: this.identifyFinancialRisks(analysis, financialData)
    };
  }

  /**
   * Identify potential financial risks
   */
  identifyFinancialRisks(analysis, financialData) {
    const risks = [];
    
    // Large amounts
    const largeAmounts = financialData.amounts.filter(a => a.value > 10000);
    if (largeAmounts.length > 0) {
      risks.push({
        type: 'high_value',
        description: `${largeAmounts.length} Beträge über 10.000`,
        severity: 'medium'
      });
    }
    
    // High percentages (potential penalty fees)
    const highPercentages = financialData.percentages.filter(p => p.value > 10);
    if (highPercentages.length > 0) {
      risks.push({
        type: 'high_percentage',
        description: `${highPercentages.length} Prozentsätze über 10%`,
        severity: 'medium'
      });
    }
    
    return risks;
  }

  /**
   * Generate citations for table references
   */
  generateCitations(tables, financialData) {
    const citations = [];
    
    // Table citations
    for (const table of tables) {
      citations.push({
        chunkId: table.sourceChunk,
        text: `${table.type} mit ${table.data.length} Einträgen`,
        page: table.page,
        type: 'table_reference',
        confidence: table.confidence
      });
    }
    
    // Financial data citations
    const highValueAmounts = financialData.amounts
      .filter(a => a.value > 1000)
      .slice(0, 5); // Limit to top 5
    
    for (const amount of highValueAmounts) {
      citations.push({
        chunkId: amount.sourceChunk,
        text: `Betrag: ${amount.rawText}`,
        page: amount.page,
        type: 'financial_reference'
      });
    }
    
    return citations;
  }

  /**
   * Health check for the tool
   */
  async healthCheck() {
    try {
      const testText = 'Position | Beschreibung | Preis\n1 | Beratung | 500,00 €\n2 | Umsetzung | 1.200,00 €';
      const testChunk = { chunkId: 'test', spans: { pageStart: 1 } };
      const result = this.extractTablesFromText(testText, testChunk);
      
      return {
        status: 'healthy',
        patternsLoaded: this.tableIndicators.length,
        testResult: result.length > 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = TableExtractor;
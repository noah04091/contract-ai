// backend/services/tools/clauseFinder.js

class ClauseFinder {
  constructor() {
    this.description = 'Finds and explains specific clauses in contracts';
    this.capabilities = ['clause_identification', 'legal_explanation', 'term_analysis'];
    
    // Common legal patterns in German and English
    this.clausePatterns = {
      termination: {
        de: [/k[üu]ndigun(g|gs)/i, /beendigun(g|gs)/i, /aufl[öo]sun(g|gs)/i],
        en: [/termination/i, /cancellation/i, /dissolution/i]
      },
      liability: {
        de: [/haftung/i, /schadenersatz/i, /verantwortlichkeit/i],
        en: [/liability/i, /damages/i, /responsibility/i]
      },
      payment: {
        de: [/zahlung/i, /verg[üu]tung/i, /honorar/i, /entgelt/i],
        en: [/payment/i, /compensation/i, /fee/i, /remuneration/i]
      },
      confidentiality: {
        de: [/vertraulichkeit/i, /geheimhaltung/i, /schweigepflicht/i],
        en: [/confidentiality/i, /non.disclosure/i, /secrecy/i]
      },
      warranty: {
        de: [/gew[äa]hrleistung/i, /garantie/i, /zusicherung/i],
        en: [/warranty/i, /guarantee/i, /assurance/i]
      },
      force_majeure: {
        de: [/h[öo]here gewalt/i, /force majeure/i, /unvorhergesehen/i],
        en: [/force majeure/i, /act of god/i, /unforeseeable/i]
      }
    };
  }

  /**
   * Main execution method for the tool
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      const { question, retrievalResults } = context;
      
      // Identify relevant clauses
      const identifiedClauses = this.identifyRelevantClauses(question, retrievalResults);
      
      // Extract and analyze clause content
      const clauseAnalysis = this.analyzeClauseContent(identifiedClauses);
      
      // Generate explanations
      const explanations = this.generateExplanations(clauseAnalysis, context.userMode);
      
      // Create insights
      const insights = this.extractInsights(clauseAnalysis);
      
      // Generate citations
      const citations = this.generateCitations(identifiedClauses, retrievalResults);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          identifiedClauses: identifiedClauses.length,
          explanations,
          keyTerms: clauseAnalysis.keyTerms,
          relevantSections: clauseAnalysis.relevantSections
        },
        insights,
        citations,
        metadata: {
          processingTime: duration,
          clausesAnalyzed: identifiedClauses.length,
          toolName: 'clauseFinder'
        }
      };
      
    } catch (error) {
      console.error('ClauseFinder execution failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Identify clauses relevant to the user's question
   */
  identifyRelevantClauses(question, retrievalResults) {
    const relevantClauses = [];
    
    if (!retrievalResults?.results) {
      return relevantClauses;
    }
    
    const questionLower = question.toLowerCase();
    
    // Check each retrieval result for clause patterns
    for (const chunk of retrievalResults.results) {
      const clauseType = this.detectClauseType(chunk.text, questionLower);
      
      if (clauseType) {
        relevantClauses.push({
          chunkId: chunk.chunkId,
          text: chunk.text,
          clauseType,
          score: chunk.score,
          spans: chunk.spans,
          metadata: chunk.metadata
        });
      }
    }
    
    // Sort by relevance score
    return relevantClauses.sort((a, b) => b.score - a.score);
  }

  /**
   * Detect the type of clause based on content patterns
   */
  detectClauseType(text, question) {
    const textLower = text.toLowerCase();
    const matchedTypes = [];
    
    // Check each clause type pattern
    for (const [type, patterns] of Object.entries(this.clausePatterns)) {
      const allPatterns = [...patterns.de, ...patterns.en];
      
      for (const pattern of allPatterns) {
        if (pattern.test(textLower) || pattern.test(question)) {
          matchedTypes.push({
            type,
            confidence: this.calculateClauseConfidence(textLower, question, pattern)
          });
          break; // One match per type is enough
        }
      }
    }
    
    // Return highest confidence type
    if (matchedTypes.length > 0) {
      return matchedTypes.sort((a, b) => b.confidence - a.confidence)[0];
    }
    
    return null;
  }

  /**
   * Calculate confidence score for clause type detection
   */
  calculateClauseConfidence(text, question, pattern) {
    let confidence = 0.5; // Base confidence
    
    // Boost if pattern appears in both text and question
    if (pattern.test(text) && pattern.test(question)) {
      confidence += 0.3;
    }
    
    // Check for contextual keywords
    const contextKeywords = {
      termination: ['frist', 'notice', 'period', 'grund', 'reason'],
      liability: ['schaden', 'damage', 'ausschluss', 'limitation'],
      payment: ['betrag', 'amount', 'f[äa]llig', 'due'],
      warranty: ['mangel', 'defect', 'zusage', 'promise']
    };
    
    // Additional context boost
    for (const [type, keywords] of Object.entries(contextKeywords)) {
      for (const keyword of keywords) {
        if (new RegExp(keyword, 'i').test(text)) {
          confidence += 0.1;
        }
      }
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Analyze clause content for key information
   */
  analyzeClauseContent(clauses) {
    const analysis = {
      keyTerms: [],
      relevantSections: [],
      patterns: {
        dates: [],
        amounts: [],
        timeframes: [],
        conditions: []
      }
    };
    
    for (const clause of clauses) {
      // Extract dates (multiple German and English formats)
      const dateMatches = clause.text.match(
        /\b(\d{1,2}\.?\s*\d{1,2}\.?\s*\d{2,4}|\d{1,2}\s*(Januar|Februar|M[äa]rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|August|September|October|November|December)\s*\d{2,4})\b/gi
      );
      if (dateMatches) {
        analysis.patterns.dates.push(...dateMatches);
      }
      
      // Extract amounts (EUR, USD, etc.)
      const amountMatches = clause.text.match(
        /\b(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:€|EUR|USD|\$|Dollar|Euro)|\d+(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:Euro|Dollar))\b/gi
      );
      if (amountMatches) {
        analysis.patterns.amounts.push(...amountMatches);
      }
      
      // Extract timeframes
      const timeframeMatches = clause.text.match(
        /\b(\d+\s*(?:Tag|Tage|Woche|Wochen|Monat|Monate|Jahr|Jahre|day|days|week|weeks|month|months|year|years))\b/gi
      );
      if (timeframeMatches) {
        analysis.patterns.timeframes.push(...timeframeMatches);
      }
      
      // Extract key terms
      const keyTerms = this.extractKeyTerms(clause.text, clause.clauseType?.type);
      analysis.keyTerms.push(...keyTerms);
      
      // Store relevant sections
      analysis.relevantSections.push({
        clauseType: clause.clauseType?.type || 'general',
        text: clause.text.substring(0, 300) + (clause.text.length > 300 ? '...' : ''),
        page: clause.spans?.pageStart || 1,
        chunkId: clause.chunkId
      });
    }
    
    // Deduplicate arrays
    Object.keys(analysis.patterns).forEach(key => {
      analysis.patterns[key] = [...new Set(analysis.patterns[key])];
    });
    analysis.keyTerms = [...new Set(analysis.keyTerms)];
    
    return analysis;
  }

  /**
   * Extract key terms based on clause type
   */
  extractKeyTerms(text, clauseType) {
    const keyTerms = [];
    
    // General important legal terms
    const generalTerms = [
      /\b(verpflichtet|obligated|berechtigt|entitled|ausgeschlossen|excluded)\b/gi,
      /\b(unverzüglich|immediately|spätestens|latest|binnen|within)\b/gi,
      /\b(schriftlich|written|mündlich|oral|electronic|elektronisch)\b/gi
    ];
    
    // Clause-type specific terms
    const specificTerms = {
      termination: [
        /\b(ordentlich|extraordinary|außerordentlich|ordinary|fristlos|immediate)\b/gi,
        /\b(wichtiger grund|good cause|breach|verletzung)\b/gi
      ],
      liability: [
        /\b(grob fahrlässig|gross negligence|vorsätzlich|intentional)\b/gi,
        /\b(höchstbetrag|maximum amount|begrenzt|limited)\b/gi
      ],
      payment: [
        /\b(netto|net|brutto|gross|mehrwertsteuer|vat|tax)\b/gi,
        /\b(verzug|default|zinsen|interest|mahnung|reminder)\b/gi
      ]
    };
    
    // Extract general terms
    for (const pattern of generalTerms) {
      const matches = text.match(pattern);
      if (matches) keyTerms.push(...matches);
    }
    
    // Extract specific terms
    if (clauseType && specificTerms[clauseType]) {
      for (const pattern of specificTerms[clauseType]) {
        const matches = text.match(pattern);
        if (matches) keyTerms.push(...matches);
      }
    }
    
    return keyTerms.map(term => term.toLowerCase().trim());
  }

  /**
   * Generate explanations based on user mode
   */
  generateExplanations(analysis, userMode = 'business') {
    const explanations = [];
    
    // Generate explanations for each relevant section
    for (const section of analysis.relevantSections) {
      const explanation = {
        clauseType: section.clauseType,
        page: section.page,
        explanation: this.generateClauseExplanation(section.clauseType, userMode),
        keyFindings: this.summarizeKeyFindings(section, analysis.patterns)
      };
      
      explanations.push(explanation);
    }
    
    return explanations;
  }

  /**
   * Generate clause-specific explanation
   */
  generateClauseExplanation(clauseType, userMode) {
    const explanations = {
      termination: {
        laie: 'Diese Klausel regelt, wie und wann der Vertrag beendet werden kann.',
        business: 'Kündigungsklauseln definieren Fristen, Verfahren und Bedingungen für die Vertragsbeendigung.',
        legal: 'Beendigungsbestimmungen umfassen ordentliche und außerordentliche Kündigungsrechte sowie deren Voraussetzungen.'
      },
      liability: {
        laie: 'Hier wird festgelegt, wer für Schäden verantwortlich ist und wie hoch die Entschädigung sein kann.',
        business: 'Haftungsregelungen begrenzen oder definieren die Verantwortlichkeit bei Vertragsverletzungen.',
        legal: 'Haftungsbestimmungen regeln Schadenersatzansprüche, Verschuldensformen und Haftungsbegrenzungen.'
      },
      payment: {
        laie: 'Diese Bestimmung regelt, wie viel bezahlt werden muss und wann das Geld fällig wird.',
        business: 'Zahlungskonditionen definieren Beträge, Fristen und Verfahren für die Vergütung.',
        legal: 'Zahlungsbestimmungen umfassen Fälligkeit, Verzug, Zinsen und Aufrechungsrechte.'
      }
    };
    
    return explanations[clauseType]?.[userMode] || 
           explanations[clauseType]?.business || 
           'Allgemeine Vertragsbestimmung ohne spezifische Klassifikation.';
  }

  /**
   * Summarize key findings for a section
   */
  summarizeKeyFindings(section, patterns) {
    const findings = [];
    
    if (patterns.dates.length > 0) {
      findings.push(`Relevante Daten: ${patterns.dates.slice(0, 3).join(', ')}`);
    }
    
    if (patterns.amounts.length > 0) {
      findings.push(`Beträge: ${patterns.amounts.slice(0, 3).join(', ')}`);
    }
    
    if (patterns.timeframes.length > 0) {
      findings.push(`Fristen: ${patterns.timeframes.slice(0, 3).join(', ')}`);
    }
    
    return findings;
  }

  /**
   * Extract insights for the insights panel
   */
  extractInsights(analysis) {
    return {
      keyTerms: analysis.keyTerms.slice(0, 10),
      deadlines: analysis.patterns.dates.map(date => ({
        date,
        type: 'extracted',
        source: 'clause_finder'
      })),
      amounts: analysis.patterns.amounts.map(amount => ({
        amount,
        type: 'extracted',
        source: 'clause_finder'
      })),
      risks: this.identifyPotentialRisks(analysis)
    };
  }

  /**
   * Identify potential risks from clause analysis
   */
  identifyPotentialRisks(analysis) {
    const risks = [];
    
    // Check for common risk indicators
    const riskKeywords = [
      'ausgeschlossen', 'excluded', 'haftung', 'liability',
      'verzug', 'default', 'penalty', 'strafe'
    ];
    
    for (const term of analysis.keyTerms) {
      if (riskKeywords.some(keyword => term.includes(keyword))) {
        risks.push({
          type: 'contractual_risk',
          description: `Potentielles Risiko durch: ${term}`,
          severity: 'medium',
          source: 'clause_finder'
        });
      }
    }
    
    return risks;
  }

  /**
   * Generate citations from identified clauses
   */
  generateCitations(clauses, retrievalResults) {
    return clauses.map(clause => ({
      chunkId: clause.chunkId,
      text: clause.text.substring(0, 200) + '...',
      page: clause.spans?.pageStart || 1,
      type: 'clause_reference',
      clauseType: clause.clauseType?.type,
      confidence: clause.clauseType?.confidence || clause.score
    }));
  }

  /**
   * Health check for the tool
   */
  async healthCheck() {
    try {
      // Test pattern matching
      const testText = 'Die Kündigung muss schriftlich erfolgen.';
      const testQuestion = 'Wie kann ich kündigen?';
      const clauseType = this.detectClauseType(testText, testQuestion);
      
      return {
        status: 'healthy',
        patternsLoaded: Object.keys(this.clausePatterns).length,
        testResult: clauseType !== null
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = ClauseFinder;
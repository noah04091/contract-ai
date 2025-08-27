// backend/services/tools/piiRedactor.js

class PIIRedactor {
  constructor() {
    this.description = 'Detects and optionally redacts personally identifiable information (PII) from contract text';
    this.capabilities = ['pii_detection', 'data_privacy', 'gdpr_compliance'];
    
    // PII patterns for German and international contexts
    this.piiPatterns = {
      // Personal names (basic pattern - could be enhanced with NLP)
      names: {
        pattern: /\b[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?\b/g,
        confidence: 0.6,
        type: 'name'
      },
      
      // Email addresses
      emails: {
        pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
        confidence: 0.95,
        type: 'email'
      },
      
      // Phone numbers (various formats)
      phones: {
        pattern: /(?:\+49\s?|0)(?:\d{2,4}[\s\-\/]?\d{3,8}|\d{10,11})|(?:\+\d{1,3}\s?)?\(?\d{2,4}\)?\s?[\d\s\-\.\/]{6,14}/g,
        confidence: 0.85,
        type: 'phone'
      },
      
      // German addresses
      addresses: {
        pattern: /\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|platz|weg|gasse|allee)\s+\d+[a-z]?\b/g,
        confidence: 0.8,
        type: 'address'
      },
      
      // Postal codes (German format)
      postalCodes: {
        pattern: /\b\d{5}\b/g,
        confidence: 0.7,
        type: 'postal_code'
      },
      
      // Tax ID / Steuer-ID (German format)
      taxIds: {
        pattern: /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g,
        confidence: 0.9,
        type: 'tax_id'
      },
      
      // Social Security Numbers (various formats)
      socialSecurity: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
        confidence: 0.9,
        type: 'social_security'
      },
      
      // IBAN
      iban: {
        pattern: /\b[A-Z]{2}\d{2}[\s\-]?(?:\d{4}[\s\-]?){4}\d{1,4}\b/g,
        confidence: 0.95,
        type: 'iban'
      },
      
      // Credit card numbers
      creditCards: {
        pattern: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
        confidence: 0.8,
        type: 'credit_card'
      },
      
      // Dates of birth (German format)
      birthDates: {
        pattern: /\b\d{1,2}\.\d{1,2}\.\d{4}\b/g,
        confidence: 0.6,
        type: 'birth_date'
      }
    };
    
    // Context clues that increase PII confidence
    this.contextClues = {
      name: ['herr', 'frau', 'dr.', 'prof.', 'mr.', 'ms.', 'mrs.', 'name', 'genannt', 'unterzeichnet'],
      email: ['e-mail', 'email', 'kontakt', 'contact', 'adresse'],
      phone: ['telefon', 'tel.', 'phone', 'mobil', 'fax'],
      address: ['adresse', 'address', 'wohnhaft', 'ansässig', 'residing'],
      tax_id: ['steuer', 'tax', 'umsatzsteuer', 'vat']
    };
  }

  /**
   * Main execution method
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      const { question, retrievalResults, piiRedactionEnabled = false } = context;
      
      // Detect PII in all retrieved chunks
      const piiAnalysis = this.detectPII(retrievalResults);
      
      // Generate recommendations based on findings
      const recommendations = this.generatePIIRecommendations(piiAnalysis);
      
      // If redaction is enabled, create redacted versions
      let redactedContent = null;
      if (piiRedactionEnabled && piiAnalysis.totalPIIFound > 0) {
        redactedContent = this.redactPII(retrievalResults, piiAnalysis);
      }
      
      // Create compliance report
      const complianceReport = this.generateComplianceReport(piiAnalysis);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          piiAnalysis,
          recommendations,
          redactedContent,
          complianceReport,
          redactionEnabled: piiRedactionEnabled
        },
        insights: this.createPIIInsights(piiAnalysis),
        citations: this.generatePIICitations(piiAnalysis),
        metadata: {
          processingTime: duration,
          toolName: 'piiRedactor'
        }
      };
      
    } catch (error) {
      console.error('PIIRedactor execution failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Detect PII in retrieval results
   */
  detectPII(retrievalResults) {
    const analysis = {
      byType: {},
      byChunk: {},
      totalPIIFound: 0,
      highConfidenceItems: [],
      patterns: {}
    };
    
    if (!retrievalResults?.results) {
      return analysis;
    }
    
    // Initialize counters for each PII type
    Object.keys(this.piiPatterns).forEach(type => {
      analysis.byType[type] = 0;
    });
    
    for (const chunk of retrievalResults.results) {
      const chunkAnalysis = this.analyzePIIInText(chunk.text, chunk);
      analysis.byChunk[chunk.chunkId] = chunkAnalysis;
      
      // Aggregate results
      for (const [type, items] of Object.entries(chunkAnalysis.items)) {
        analysis.byType[type] += items.length;
        analysis.totalPIIFound += items.length;
        
        // Track high confidence items
        const highConfItems = items.filter(item => item.confidence > 0.8);
        analysis.highConfidenceItems.push(...highConfItems);
      }
    }
    
    return analysis;
  }

  /**
   * Analyze PII in a single text chunk
   */
  analyzePIIInText(text, sourceChunk) {
    const analysis = {
      items: {},
      totalFound: 0,
      riskLevel: 'low'
    };
    
    // Initialize item arrays
    Object.keys(this.piiPatterns).forEach(type => {
      analysis.items[type] = [];
    });
    
    // Apply each PII pattern
    for (const [type, config] of Object.entries(this.piiPatterns)) {
      const matches = [...text.matchAll(config.pattern)];
      
      for (const match of matches) {
        const item = {
          value: match[0],
          position: match.index,
          confidence: this.calculatePIIConfidence(match[0], text, match.index, type),
          type,
          sourceChunk: sourceChunk.chunkId,
          page: sourceChunk.spans?.pageStart || 1,
          context: this.extractContext(text, match.index, 30)
        };
        
        analysis.items[type].push(item);
        analysis.totalFound++;
      }
    }
    
    // Calculate risk level for chunk
    analysis.riskLevel = this.calculateChunkRiskLevel(analysis);
    
    return analysis;
  }

  /**
   * Calculate confidence score for PII detection
   */
  calculatePIIConfidence(value, text, position, type) {
    let confidence = this.piiPatterns[type].confidence;
    
    // Check for context clues
    const contextWindow = this.extractContext(text, position, 100).toLowerCase();
    const clues = this.contextClues[type] || [];
    
    for (const clue of clues) {
      if (contextWindow.includes(clue)) {
        confidence = Math.min(1.0, confidence + 0.2);
        break;
      }
    }
    
    // Type-specific confidence adjustments
    if (type === 'names') {
      // Reduce confidence if it looks like a company name
      if (/gmbh|ag|ltd|inc|corp|company/i.test(value)) {
        confidence *= 0.3;
      }
      
      // Reduce confidence if it's likely a place name
      if (/berlin|münchen|hamburg|köln|deutschland|germany/i.test(value.toLowerCase())) {
        confidence *= 0.4;
      }
    }
    
    if (type === 'phones') {
      // Boost confidence if it has country code
      if (value.startsWith('+') || value.startsWith('00')) {
        confidence = Math.min(1.0, confidence + 0.1);
      }
    }
    
    if (type === 'birthDates') {
      // Check if it's a realistic birth date (not future, not too old)
      const year = parseInt(value.split('.')[2]);
      if (year > new Date().getFullYear() || year < 1900) {
        confidence *= 0.5;
      }
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Calculate risk level for a chunk
   */
  calculateChunkRiskLevel(analysis) {
    const totalItems = analysis.totalFound;
    const highConfidenceItems = Object.values(analysis.items)
      .flat()
      .filter(item => item.confidence > 0.8)
      .length;
    
    if (highConfidenceItems >= 3 || totalItems >= 5) {
      return 'high';
    } else if (highConfidenceItems >= 1 || totalItems >= 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Extract context around a match
   */
  extractContext(text, position, length = 50) {
    const start = Math.max(0, position - length);
    const end = Math.min(text.length, position + length);
    return text.substring(start, end);
  }

  /**
   * Generate PII recommendations
   */
  generatePIIRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.totalPIIFound === 0) {
      recommendations.push({
        type: 'info',
        priority: 'low',
        message: 'Keine personenbezogenen Daten in den analysierten Texten gefunden.'
      });
      return recommendations;
    }
    
    // High-risk items
    const highRiskTypes = ['social_security', 'tax_id', 'iban', 'credit_card'];
    const foundHighRisk = Object.keys(analysis.byType).filter(type => 
      highRiskTypes.includes(type) && analysis.byType[type] > 0
    );
    
    if (foundHighRisk.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `Sensible Daten gefunden: ${foundHighRisk.join(', ')}. Besondere Vorsicht bei der Verarbeitung erforderlich.`
      });
    }
    
    // Contact information
    if (analysis.byType.emails > 0 || analysis.byType.phones > 0) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        message: 'Kontaktdaten identifiziert. Prüfen Sie die Verarbeitung gemäß DSGVO Art. 6.'
      });
    }
    
    // Names detected
    if (analysis.byType.names > 2) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        message: `${analysis.byType.names} potentielle Namen gefunden. Rechtliche Grundlage für Verarbeitung prüfen.`
      });
    }
    
    // General GDPR advice
    if (analysis.totalPIIFound > 5) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        message: 'Umfangreiche personenbezogene Daten identifiziert. Datenschutz-Folgenabschätzung empfohlen.'
      });
    }
    
    return recommendations;
  }

  /**
   * Redact PII from content
   */
  redactPII(retrievalResults, analysis) {
    const redactedChunks = [];
    
    if (!retrievalResults?.results) {
      return redactedChunks;
    }
    
    for (const chunk of retrievalResults.results) {
      const chunkAnalysis = analysis.byChunk[chunk.chunkId];
      
      if (!chunkAnalysis || chunkAnalysis.totalFound === 0) {
        // No PII found, include original
        redactedChunks.push({
          ...chunk,
          redacted: false
        });
        continue;
      }
      
      let redactedText = chunk.text;
      const redactedItems = [];
      
      // Collect all PII items and sort by position (reverse order for string manipulation)
      const allItems = Object.values(chunkAnalysis.items)
        .flat()
        .filter(item => item.confidence > 0.7) // Only redact high-confidence items
        .sort((a, b) => b.position - a.position);
      
      // Replace PII with redaction markers
      for (const item of allItems) {
        const redactionMarker = this.getRedactionMarker(item.type);
        redactedText = redactedText.substring(0, item.position) + 
                     redactionMarker + 
                     redactedText.substring(item.position + item.value.length);
        
        redactedItems.push({
          original: item.value,
          replacement: redactionMarker,
          type: item.type,
          confidence: item.confidence
        });
      }
      
      redactedChunks.push({
        ...chunk,
        text: redactedText,
        redacted: true,
        redactedItems,
        originalText: chunk.text
      });
    }
    
    return redactedChunks;
  }

  /**
   * Get appropriate redaction marker for PII type
   */
  getRedactionMarker(type) {
    const markers = {
      names: '[NAME]',
      emails: '[EMAIL]',
      phones: '[PHONE]',
      addresses: '[ADDRESS]',
      postalCodes: '[PLZ]',
      taxIds: '[STEUER-ID]',
      socialSecurity: '[SSN]',
      iban: '[IBAN]',
      creditCards: '[KREDITKARTE]',
      birthDates: '[GEBURTSDATUM]'
    };
    
    return markers[type] || '[REDACTED]';
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPIIItems: analysis.totalPIIFound,
        highRiskItems: analysis.highConfidenceItems.length,
        typesFound: Object.keys(analysis.byType).filter(type => analysis.byType[type] > 0)
      },
      gdprAssessment: this.assessGDPRCompliance(analysis),
      recommendations: this.generateComplianceRecommendations(analysis)
    };
    
    return report;
  }

  /**
   * Assess GDPR compliance level
   */
  assessGDPRCompliance(analysis) {
    let riskLevel = 'low';
    const issues = [];
    
    // High-risk PII types
    const sensitiveTypes = ['social_security', 'tax_id', 'iban', 'credit_card'];
    const foundSensitive = sensitiveTypes.filter(type => analysis.byType[type] > 0);
    
    if (foundSensitive.length > 0) {
      riskLevel = 'high';
      issues.push(`Sensitive data types found: ${foundSensitive.join(', ')}`);
    }
    
    // Volume of PII
    if (analysis.totalPIIFound > 10) {
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      issues.push('High volume of personal data detected');
    }
    
    // Contact information without consent context
    if (analysis.byType.emails > 0 || analysis.byType.phones > 0) {
      issues.push('Contact information requires legal basis for processing');
    }
    
    return {
      riskLevel,
      issues,
      complianceScore: this.calculateComplianceScore(analysis)
    };
  }

  /**
   * Calculate compliance score (0-100)
   */
  calculateComplianceScore(analysis) {
    let score = 100;
    
    // Deduct points for sensitive data
    const sensitiveTypes = ['social_security', 'tax_id', 'iban', 'credit_card'];
    const sensitiveCount = sensitiveTypes.reduce((sum, type) => sum + (analysis.byType[type] || 0), 0);
    score -= sensitiveCount * 20;
    
    // Deduct points for high volume
    if (analysis.totalPIIFound > 10) score -= 20;
    if (analysis.totalPIIFound > 20) score -= 20;
    
    // Deduct points for names without context
    if (analysis.byType.names > 5) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Generate compliance-specific recommendations
   */
  generateComplianceRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.totalPIIFound > 0) {
      recommendations.push({
        category: 'legal_basis',
        text: 'Prüfen Sie die Rechtsgrundlage für die Verarbeitung personenbezogener Daten (DSGVO Art. 6).'
      });
      
      recommendations.push({
        category: 'data_minimization',
        text: 'Bewerten Sie, ob alle identifizierten Daten für den Vertragszweck erforderlich sind.'
      });
    }
    
    if (analysis.highConfidenceItems.length > 3) {
      recommendations.push({
        category: 'security',
        text: 'Implementieren Sie angemessene technische und organisatorische Maßnahmen zum Schutz der Daten.'
      });
    }
    
    return recommendations;
  }

  /**
   * Create insights for the insights panel
   */
  createPIIInsights(analysis) {
    return {
      risks: this.generatePIIRisks(analysis),
      parties: this.extractPersonalInfo(analysis),
      keyTerms: ['pii', 'datenschutz', 'gdpr', 'personenbezogen']
    };
  }

  /**
   * Generate PII-related risks
   */
  generatePIIRisks(analysis) {
    const risks = [];
    
    if (analysis.totalPIIFound > 5) {
      risks.push({
        type: 'privacy_risk',
        description: `${analysis.totalPIIFound} personenbezogene Daten identifiziert`,
        severity: analysis.totalPIIFound > 15 ? 'high' : 'medium'
      });
    }
    
    const sensitiveCount = ['social_security', 'tax_id', 'iban', 'credit_card']
      .reduce((sum, type) => sum + (analysis.byType[type] || 0), 0);
    
    if (sensitiveCount > 0) {
      risks.push({
        type: 'data_sensitivity',
        description: `${sensitiveCount} sensitive Datenelemente gefunden`,
        severity: 'high'
      });
    }
    
    return risks;
  }

  /**
   * Extract personal information for parties section
   */
  extractPersonalInfo(analysis) {
    const parties = [];
    
    // This is a simplified extraction - in practice, you'd use more sophisticated NLP
    if (analysis.byType.names > 0) {
      parties.push({
        type: 'person',
        count: analysis.byType.names,
        description: `${analysis.byType.names} potentielle Personennamen`
      });
    }
    
    if (analysis.byType.emails > 0 || analysis.byType.phones > 0) {
      parties.push({
        type: 'contact',
        count: analysis.byType.emails + analysis.byType.phones,
        description: 'Kontaktinformationen identifiziert'
      });
    }
    
    return parties;
  }

  /**
   * Generate citations for PII references
   */
  generatePIICitations(analysis) {
    const citations = [];
    
    // Only cite high-confidence, non-sensitive items
    for (const item of analysis.highConfidenceItems) {
      if (!['social_security', 'tax_id', 'iban', 'credit_card'].includes(item.type)) {
        citations.push({
          chunkId: item.sourceChunk,
          text: `${item.type}: [REDACTED for privacy]`,
          page: item.page,
          type: 'pii_reference',
          confidence: item.confidence
        });
      }
    }
    
    return citations.slice(0, 5); // Limit citations for privacy
  }

  /**
   * Health check for the tool
   */
  async healthCheck() {
    try {
      const testText = 'Max Mustermann, max@example.com, +49 30 12345678';
      const testChunk = { chunkId: 'test', spans: { pageStart: 1 } };
      const result = this.analyzePIIInText(testText, testChunk);
      
      return {
        status: 'healthy',
        patternsLoaded: Object.keys(this.piiPatterns).length,
        testResult: result.totalFound > 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = PIIRedactor;
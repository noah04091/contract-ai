// backend/services/tools/redliner.js
const { OpenAI } = require('openai');

class Redliner {
  constructor() {
    this.description = 'Provides redlining suggestions and contract improvement recommendations';
    this.capabilities = ['contract_review', 'redlining', 'legal_suggestions', 'risk_mitigation'];
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Categories of redlining suggestions
    this.suggestionCategories = {
      language: {
        title: 'Sprachliche Verbesserungen',
        priority: 'medium'
      },
      legal: {
        title: 'Rechtliche Anpassungen', 
        priority: 'high'
      },
      risk: {
        title: 'Risikominimierung',
        priority: 'high'
      },
      clarity: {
        title: 'Klarstellung',
        priority: 'medium'
      },
      protection: {
        title: 'Schutzklauseln',
        priority: 'high'
      },
      compliance: {
        title: 'Compliance',
        priority: 'high'
      }
    };
    
    // Common problematic phrases and better alternatives
    this.improvementPatterns = {
      vague: {
        patterns: [
          /angemessen|reasonable|appropriate/gi,
          /unverzüglich|sofort|immediately|promptly/gi,
          /in der regel|normalerweise|usually|typically/gi
        ],
        suggestion: 'Ersetzen Sie vage Begriffe durch konkrete Definitionen oder Fristen.'
      },
      
      onesided: {
        patterns: [
          /\b(nur|solely|only|exclusively)\s+(?:der|die|das|party|customer|client)/gi,
          /allein.*berechtigt|solely.*entitled/gi
        ],
        suggestion: 'Prüfen Sie einseitige Formulierungen auf Ausgewogenheit.'
      },
      
      unlimited: {
        patterns: [
          /unbegrenzt|unlimited|ohne.*begrenzung/gi,
          /jederzeit|at any time|beliebig/gi,
          /vollständig.*ausgeschlossen|completely.*excluded/gi
        ],
        suggestion: 'Begrenzen Sie unbeschränkte Haftungen oder Rechte zeitlich oder sachlich.'
      }
    };
  }

  /**
   * Main execution method
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      const { question, retrievalResults } = context;
      
      // Analyze contract content for redlining opportunities
      const analysisResults = this.analyzeContractContent(retrievalResults);
      
      // Generate AI-powered suggestions
      const aiSuggestions = await this.generateAISuggestions(analysisResults, question, context);
      
      // Apply pattern-based improvements
      const patternSuggestions = this.generatePatternSuggestions(analysisResults);
      
      // Combine and prioritize all suggestions
      const allSuggestions = this.combineSuggestions(aiSuggestions, patternSuggestions);
      
      // Generate redlined versions
      const redlinedSections = this.generateRedlinedVersions(allSuggestions, analysisResults);
      
      // Create implementation guide
      const implementationGuide = this.createImplementationGuide(allSuggestions);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          totalSuggestions: allSuggestions.length,
          suggestionsByCategory: this.groupSuggestionsByCategory(allSuggestions),
          redlinedSections,
          implementationGuide,
          riskReduction: this.calculateRiskReduction(allSuggestions),
          priorityActions: allSuggestions.filter(s => s.priority === 'high').slice(0, 5)
        },
        insights: this.createRedlineInsights(allSuggestions, analysisResults),
        citations: this.generateRedlineCitations(allSuggestions),
        metadata: {
          processingTime: duration,
          toolName: 'redliner',
          suggestionCount: allSuggestions.length
        }
      };
      
    } catch (error) {
      console.error('Redliner execution failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Analyze contract content for redlining opportunities
   */
  analyzeContractContent(retrievalResults) {
    const analysis = {
      problematicSections: [],
      riskAreas: [],
      clarificationNeeded: [],
      complianceIssues: [],
      totalChunks: 0
    };
    
    if (!retrievalResults?.results) {
      return analysis;
    }
    
    analysis.totalChunks = retrievalResults.results.length;
    
    for (const chunk of retrievalResults.results) {
      const chunkAnalysis = this.analyzeTextChunk(chunk);
      
      if (chunkAnalysis.hasIssues) {
        analysis.problematicSections.push({
          chunkId: chunk.chunkId,
          text: chunk.text,
          issues: chunkAnalysis.issues,
          page: chunk.spans?.pageStart || 1,
          score: chunk.score
        });
      }
      
      // Categorize by issue type
      if (chunkAnalysis.riskIndicators.length > 0) {
        analysis.riskAreas.push({
          chunkId: chunk.chunkId,
          risks: chunkAnalysis.riskIndicators,
          page: chunk.spans?.pageStart || 1
        });
      }
      
      if (chunkAnalysis.vagueness > 0.5) {
        analysis.clarificationNeeded.push({
          chunkId: chunk.chunkId,
          vaguenessScore: chunkAnalysis.vagueness,
          page: chunk.spans?.pageStart || 1
        });
      }
    }
    
    return analysis;
  }

  /**
   * Analyze individual text chunk for issues
   */
  analyzeTextChunk(chunk) {
    const analysis = {
      hasIssues: false,
      issues: [],
      riskIndicators: [],
      vagueness: 0,
      onesidedness: 0,
      clarity: 0.8 // Default good clarity
    };
    
    const text = chunk.text.toLowerCase();
    
    // Check for vague language
    const vagueMatches = this.countPatternMatches(chunk.text, this.improvementPatterns.vague.patterns);
    if (vagueMatches > 0) {
      analysis.vagueness = Math.min(1.0, vagueMatches * 0.2);
      analysis.issues.push({
        type: 'vague_language',
        count: vagueMatches,
        severity: 'medium'
      });
    }
    
    // Check for one-sided terms
    const onesidedMatches = this.countPatternMatches(chunk.text, this.improvementPatterns.onesided.patterns);
    if (onesidedMatches > 0) {
      analysis.onesidedness = Math.min(1.0, onesidedMatches * 0.3);
      analysis.issues.push({
        type: 'onesided_terms',
        count: onesidedMatches,
        severity: 'high'
      });
    }
    
    // Check for unlimited terms
    const unlimitedMatches = this.countPatternMatches(chunk.text, this.improvementPatterns.unlimited.patterns);
    if (unlimitedMatches > 0) {
      analysis.riskIndicators.push({
        type: 'unlimited_liability',
        count: unlimitedMatches,
        severity: 'high'
      });
    }
    
    // Check for specific risk terms
    const riskTerms = [
      /haftung.*ausgeschlossen|liability.*excluded/gi,
      /ohne.*gewähr|no.*warranty|disclaimer/gi,
      /kein.*schadenersatz|no.*damages/gi
    ];
    
    for (const pattern of riskTerms) {
      if (pattern.test(chunk.text)) {
        analysis.riskIndicators.push({
          type: 'liability_exclusion',
          pattern: pattern.source,
          severity: 'high'
        });
      }
    }
    
    // Overall assessment
    analysis.hasIssues = analysis.issues.length > 0 || analysis.riskIndicators.length > 0;
    
    // Calculate clarity score (inverse of vagueness and complexity)
    const sentenceLength = chunk.text.split('.').map(s => s.split(' ').length);
    const avgSentenceLength = sentenceLength.reduce((a, b) => a + b, 0) / sentenceLength.length;
    
    if (avgSentenceLength > 25) {
      analysis.clarity -= 0.3; // Penalize very long sentences
    }
    
    analysis.clarity = Math.max(0, analysis.clarity - analysis.vagueness);
    
    return analysis;
  }

  /**
   * Count pattern matches in text
   */
  countPatternMatches(text, patterns) {
    let totalMatches = 0;
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        totalMatches += matches.length;
      }
    }
    
    return totalMatches;
  }

  /**
   * Generate AI-powered suggestions
   */
  async generateAISuggestions(analysisResults, question, context) {
    const suggestions = [];
    
    // Only process most problematic sections to avoid token limits
    const topProblems = analysisResults.problematicSections
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 3);
    
    for (const section of topProblems) {
      try {
        const sectionSuggestions = await this.generateSuggestionsForSection(section, context);
        suggestions.push(...sectionSuggestions);
      } catch (error) {
        console.error(`Failed to generate AI suggestions for section ${section.chunkId}:`, error);
        // Continue with other sections
      }
    }
    
    return suggestions;
  }

  /**
   * Generate suggestions for a specific section
   */
  async generateSuggestionsForSection(section, context) {
    const systemPrompt = `Du bist ein erfahrener Vertragsanwalt, der Redlining-Vorschläge erstellt.
Analysiere den gegebenen Vertragstext und schlage spezifische Verbesserungen vor.
Fokussiere auf:
1. Rechtliche Risiken minimieren
2. Klarheit verbessern 
3. Einseitige Formulierungen ausgleichen
4. Compliance sicherstellen

Antworte im JSON-Format mit einem Array von Vorschlägen:
{
  "suggestions": [
    {
      "type": "legal|risk|clarity|language",
      "priority": "high|medium|low", 
      "original": "ursprünglicher Text",
      "improved": "verbesserter Text",
      "reasoning": "Begründung für die Änderung"
    }
  ]
}`;
    
    const userPrompt = `Analysiere folgenden Vertragsabschnitt und schlage Verbesserungen vor:

${section.text}

Erkannte Probleme: ${section.issues.map(i => i.type).join(', ')}`;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });
      
      const responseText = completion.choices[0].message.content;
      
      // Parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        return this.createFallbackSuggestions(section);
      }
      
      // Enrich suggestions with metadata
      return parsedResponse.suggestions.map(suggestion => ({
        ...suggestion,
        chunkId: section.chunkId,
        page: section.page,
        source: 'ai',
        confidence: 0.8
      }));
      
    } catch (error) {
      console.error('OpenAI request failed:', error);
      return this.createFallbackSuggestions(section);
    }
  }

  /**
   * Create fallback suggestions when AI fails
   */
  createFallbackSuggestions(section) {
    const fallbackSuggestions = [];
    
    for (const issue of section.issues) {
      if (issue.type === 'vague_language') {
        fallbackSuggestions.push({
          type: 'clarity',
          priority: 'medium',
          original: '[Vage Formulierung]',
          improved: '[Konkrete Formulierung mit spezifischen Fristen/Beträgen]',
          reasoning: 'Vage Begriffe sollten durch konkrete Definitionen ersetzt werden.',
          chunkId: section.chunkId,
          page: section.page,
          source: 'pattern',
          confidence: 0.6
        });
      }
      
      if (issue.type === 'onesided_terms') {
        fallbackSuggestions.push({
          type: 'risk',
          priority: 'high',
          original: '[Einseitige Formulierung]',
          improved: '[Ausgewogene Formulierung mit gegenseitigen Rechten/Pflichten]',
          reasoning: 'Einseitige Klauseln erhöhen rechtliche Risiken und sollten ausbalanciert werden.',
          chunkId: section.chunkId,
          page: section.page,
          source: 'pattern',
          confidence: 0.7
        });
      }
    }
    
    return fallbackSuggestions;
  }

  /**
   * Generate pattern-based suggestions
   */
  generatePatternSuggestions(analysisResults) {
    const suggestions = [];
    
    for (const section of analysisResults.problematicSections) {
      for (const [patternType, patternInfo] of Object.entries(this.improvementPatterns)) {
        const matches = this.countPatternMatches(section.text, patternInfo.patterns);
        
        if (matches > 0) {
          suggestions.push({
            type: this.getPatternSuggestionType(patternType),
            priority: this.getPatternPriority(patternType),
            original: `[${matches} Vorkommen von ${patternType}]`,
            improved: '[Spezifische Verbesserung erforderlich]',
            reasoning: patternInfo.suggestion,
            chunkId: section.chunkId,
            page: section.page,
            source: 'pattern',
            confidence: 0.7,
            patternType
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Map pattern type to suggestion category
   */
  getPatternSuggestionType(patternType) {
    const mapping = {
      vague: 'clarity',
      onesided: 'risk',
      unlimited: 'risk'
    };
    
    return mapping[patternType] || 'language';
  }

  /**
   * Get priority for pattern type
   */
  getPatternPriority(patternType) {
    const priorities = {
      vague: 'medium',
      onesided: 'high',
      unlimited: 'high'
    };
    
    return priorities[patternType] || 'low';
  }

  /**
   * Combine and deduplicate suggestions
   */
  combineSuggestions(aiSuggestions, patternSuggestions) {
    const combined = [...aiSuggestions, ...patternSuggestions];
    
    // Sort by priority and confidence
    return combined.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  /**
   * Generate redlined versions of problematic sections
   */
  generateRedlinedVersions(suggestions, analysisResults) {
    const redlinedSections = [];
    
    // Group suggestions by chunk
    const suggestionsByChunk = this.groupSuggestionsByChunk(suggestions);
    
    for (const [chunkId, chunkSuggestions] of Object.entries(suggestionsByChunk)) {
      const originalSection = analysisResults.problematicSections.find(s => s.chunkId === chunkId);
      
      if (originalSection && chunkSuggestions.length > 0) {
        redlinedSections.push({
          chunkId,
          page: originalSection.page,
          original: originalSection.text,
          suggestions: chunkSuggestions,
          redlinePreview: this.createRedlinePreview(originalSection.text, chunkSuggestions)
        });
      }
    }
    
    return redlinedSections;
  }

  /**
   * Group suggestions by chunk ID
   */
  groupSuggestionsByChunk(suggestions) {
    return suggestions.reduce((groups, suggestion) => {
      const chunkId = suggestion.chunkId;
      if (!groups[chunkId]) {
        groups[chunkId] = [];
      }
      groups[chunkId].push(suggestion);
      return groups;
    }, {});
  }

  /**
   * Create a redline preview
   */
  createRedlinePreview(originalText, suggestions) {
    // This is a simplified redline preview
    // In a real implementation, you'd want more sophisticated text diffing
    
    const preview = {
      hasChanges: suggestions.length > 0,
      changeCount: suggestions.length,
      summary: `${suggestions.length} Verbesserungsvorschläge für diesen Abschnitt`
    };
    
    // Highlight areas that need attention
    let highlightedText = originalText;
    
    for (const suggestion of suggestions) {
      if (suggestion.original && suggestion.original !== '[Vage Formulierung]') {
        // Simple text highlighting (in real app, use proper diff algorithms)
        highlightedText = highlightedText.replace(
          suggestion.original,
          `**[REDLINE: ${suggestion.original}]**`
        );
      }
    }
    
    preview.highlightedText = highlightedText;
    
    return preview;
  }

  /**
   * Create implementation guide
   */
  createImplementationGuide(suggestions) {
    const guide = {
      totalActions: suggestions.length,
      priorityBreakdown: this.getPriorityBreakdown(suggestions),
      implementationSteps: this.generateImplementationSteps(suggestions),
      estimatedTimeframe: this.estimateImplementationTime(suggestions),
      riskAssessment: this.assessImplementationRisks(suggestions)
    };
    
    return guide;
  }

  /**
   * Get priority breakdown of suggestions
   */
  getPriorityBreakdown(suggestions) {
    return suggestions.reduce((breakdown, suggestion) => {
      const priority = suggestion.priority || 'low';
      breakdown[priority] = (breakdown[priority] || 0) + 1;
      return breakdown;
    }, {});
  }

  /**
   * Generate implementation steps
   */
  generateImplementationSteps(suggestions) {
    const steps = [];
    
    // High priority first
    const highPriority = suggestions.filter(s => s.priority === 'high');
    if (highPriority.length > 0) {
      steps.push({
        phase: 1,
        title: 'Kritische Risiken adressieren',
        actions: highPriority.slice(0, 3),
        timeframe: '1-2 Wochen'
      });
    }
    
    // Medium priority
    const mediumPriority = suggestions.filter(s => s.priority === 'medium');
    if (mediumPriority.length > 0) {
      steps.push({
        phase: 2,
        title: 'Klarheit und Struktur verbessern',
        actions: mediumPriority.slice(0, 5),
        timeframe: '2-4 Wochen'
      });
    }
    
    // Low priority
    const lowPriority = suggestions.filter(s => s.priority === 'low');
    if (lowPriority.length > 0) {
      steps.push({
        phase: 3,
        title: 'Sprachliche Optimierungen',
        actions: lowPriority,
        timeframe: '1-2 Wochen'
      });
    }
    
    return steps;
  }

  /**
   * Estimate implementation time
   */
  estimateImplementationTime(suggestions) {
    const timePerSuggestion = {
      high: 4, // hours
      medium: 2,
      low: 1
    };
    
    const totalHours = suggestions.reduce((total, suggestion) => {
      return total + (timePerSuggestion[suggestion.priority] || 1);
    }, 0);
    
    return {
      totalHours,
      businessDays: Math.ceil(totalHours / 8),
      recommendation: totalHours > 40 ? 'Phasenweise Umsetzung empfohlen' : 'Kann in einem Zug umgesetzt werden'
    };
  }

  /**
   * Assess implementation risks
   */
  assessImplementationRisks(suggestions) {
    const risks = [];
    
    const highPriorityCount = suggestions.filter(s => s.priority === 'high').length;
    if (highPriorityCount > 5) {
      risks.push({
        type: 'complexity',
        description: 'Hohe Anzahl kritischer Änderungen kann Verhandlungen komplizieren',
        mitigation: 'Priorisierung und phasenweise Umsetzung'
      });
    }
    
    const legalSuggestions = suggestions.filter(s => s.type === 'legal').length;
    if (legalSuggestions > 3) {
      risks.push({
        type: 'legal_review',
        description: 'Umfangreiche rechtliche Änderungen erfordern Expertenprüfung',
        mitigation: 'Rechtsberatung vor Umsetzung einholen'
      });
    }
    
    return risks;
  }

  /**
   * Calculate risk reduction score
   */
  calculateRiskReduction(suggestions) {
    const riskReductionPoints = {
      high: 10,
      medium: 5,
      low: 2
    };
    
    const totalReduction = suggestions.reduce((total, suggestion) => {
      return total + (riskReductionPoints[suggestion.priority] || 0);
    }, 0);
    
    return {
      totalPoints: totalReduction,
      percentageImprovement: Math.min(100, totalReduction * 2), // Rough estimate
      riskLevel: totalReduction > 50 ? 'Signifikant' : totalReduction > 20 ? 'Moderat' : 'Gering'
    };
  }

  /**
   * Group suggestions by category
   */
  groupSuggestionsByCategory(suggestions) {
    return suggestions.reduce((groups, suggestion) => {
      const category = suggestion.type || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(suggestion);
      return groups;
    }, {});
  }

  /**
   * Create insights for the insights panel
   */
  createRedlineInsights(suggestions, analysisResults) {
    const highRiskSuggestions = suggestions.filter(s => s.priority === 'high');
    
    return {
      risks: highRiskSuggestions.map(s => ({
        type: 'contract_risk',
        description: s.reasoning,
        severity: s.priority,
        page: s.page
      })),
      keyTerms: [
        'redlining',
        'vertragsverbesserung',
        ...suggestions.map(s => s.type).filter((v, i, a) => a.indexOf(v) === i)
      ],
      recommendations: suggestions.slice(0, 5).map(s => ({
        type: s.type,
        description: s.reasoning,
        priority: s.priority
      }))
    };
  }

  /**
   * Generate citations for redline references
   */
  generateRedlineCitations(suggestions) {
    return suggestions
      .filter(s => s.confidence > 0.6)
      .slice(0, 10)
      .map(s => ({
        chunkId: s.chunkId,
        text: `${s.type}: ${s.reasoning}`,
        page: s.page,
        type: 'redline_suggestion',
        priority: s.priority,
        confidence: s.confidence
      }));
  }

  /**
   * Health check for the tool
   */
  async healthCheck() {
    try {
      // Test pattern matching
      const testText = 'Die Haftung ist unbegrenzt und angemessen.';
      const testChunk = { 
        chunkId: 'test', 
        text: testText,
        spans: { pageStart: 1 } 
      };
      const analysis = this.analyzeTextChunk(testChunk);
      
      // Test OpenAI connection
      let openaiHealthy = false;
      try {
        await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        });
        openaiHealthy = true;
      } catch (error) {
        console.error('OpenAI health check failed:', error);
      }
      
      return {
        status: 'healthy',
        patternsLoaded: Object.keys(this.improvementPatterns).length,
        categoriesLoaded: Object.keys(this.suggestionCategories).length,
        patternDetection: analysis.hasIssues,
        openaiAvailable: openaiHealthy
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = Redliner;
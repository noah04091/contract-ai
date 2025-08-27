// backend/services/chat/intentRouter.js
const ToolRegistry = require('./toolRegistry');

class IntentRouter {
  constructor() {
    this.toolRegistry = new ToolRegistry();
    this.intentPatterns = this.initializePatterns();
  }

  initializePatterns() {
    return {
      explain: {
        patterns: [
          /erkläre?/i, /was bedeutet/i, /was ist/i, /definition/i,
          /explain/i, /what does/i, /what is/i, /define/i,
          /verstehe nicht/i, /don't understand/i,
          /wie funktioniert/i, /how does/i
        ],
        tools: ['clauseFinder', 'explanation'],
        confidence: 0.8
      },
      
      extract: {
        patterns: [
          /liste/i, /finde/i, /zeige mir/i, /welche/i, /alle/i,
          /list/i, /find/i, /show me/i, /extract/i, /get all/i,
          /übersicht/i, /summary/i, /zusammenfassung/i
        ],
        tools: ['clauseFinder', 'tableExtractor', 'deadlineScanner'],
        confidence: 0.7
      },
      
      calculate: {
        patterns: [
          /berechne/i, /kosten/i, /preis/i, /summe/i, /betrag/i,
          /calculate/i, /cost/i, /price/i, /amount/i, /total/i,
          /wie viel/i, /how much/i, /wann fällig/i, /when due/i
        ],
        tools: ['tableExtractor', 'deadlineScanner'],
        confidence: 0.9
      },
      
      risk: {
        patterns: [
          /risiko/i, /gefahr/i, /problem/i, /achtung/i, /warnung/i,
          /risk/i, /danger/i, /warning/i, /issue/i, /concern/i,
          /nachteil/i, /disadvantage/i, /haftung/i, /liability/i
        ],
        tools: ['clauseFinder', 'riskAnalyzer'],
        confidence: 0.85
      },
      
      draft: {
        patterns: [
          /schreibe/i, /erstelle/i, /generiere/i, /entwerfe/i,
          /write/i, /create/i, /generate/i, /draft/i,
          /brief/i, /letter/i, /document/i, /text/i,
          /kündigung/i, /cancellation/i, /termination/i
        ],
        tools: ['letterGenerator'],
        confidence: 0.9
      },
      
      redline: {
        patterns: [
          /ändere/i, /anpassen/i, /verbessern/i, /überarbeiten/i,
          /change/i, /modify/i, /improve/i, /revise/i, /edit/i,
          /redline/i, /amendment/i, /correction/i
        ],
        tools: ['redliner', 'clauseFinder'],
        confidence: 0.8
      }
    };
  }

  /**
   * Analyze user question and determine intent with tools
   */
  async analyzeIntent(question, context = {}) {
    const startTime = Date.now();
    
    try {
      // Normalize question
      const normalizedQuestion = question.toLowerCase().trim();
      
      // Calculate intent scores
      const intentScores = this.calculateIntentScores(normalizedQuestion);
      
      // Get primary intent
      const primaryIntent = this.getPrimaryIntent(intentScores);
      
      // Select appropriate tools
      const selectedTools = this.selectTools(primaryIntent, context);
      
      // Generate routing strategy
      const strategy = this.generateStrategy(primaryIntent, selectedTools, context);
      
      const duration = Date.now() - startTime;
      
      console.log(`🧠 Intent analysis: ${primaryIntent.name} (${primaryIntent.confidence}) in ${duration}ms`);
      
      return {
        primary: primaryIntent,
        alternatives: intentScores.slice(1, 3), // Top 2 alternatives
        tools: selectedTools,
        strategy,
        confidence: primaryIntent.confidence,
        processingTime: duration
      };
      
    } catch (error) {
      console.error('❌ Intent analysis failed:', error);
      return this.getDefaultIntent(question, context);
    }
  }

  /**
   * Calculate confidence scores for each intent
   */
  calculateIntentScores(question) {
    const scores = [];
    
    for (const [intentName, intentConfig] of Object.entries(this.intentPatterns)) {
      let score = 0;
      let matches = 0;
      
      for (const pattern of intentConfig.patterns) {
        if (pattern.test(question)) {
          matches++;
          score += intentConfig.confidence;
        }
      }
      
      if (matches > 0) {
        // Boost score based on multiple matches
        score = Math.min(1.0, score * (1 + matches * 0.1));
        
        scores.push({
          name: intentName,
          confidence: score,
          matches,
          tools: intentConfig.tools
        });
      }
    }
    
    // Sort by confidence
    return scores.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get primary intent or fallback to explain
   */
  getPrimaryIntent(intentScores) {
    if (intentScores.length === 0) {
      return {
        name: 'explain',
        confidence: 0.5,
        matches: 0,
        tools: ['clauseFinder'],
        fallback: true
      };
    }
    
    return intentScores[0];
  }

  /**
   * Select appropriate tools based on intent and context
   */
  selectTools(intent, context) {
    let tools = [...intent.tools];
    
    // Context-based tool enhancement
    if (context.hasContract) {
      // Add PII redactor if enabled
      if (context.piiRedactionEnabled) {
        tools.unshift('piiRedactor');
      }
      
      // Ensure clause finder for contract-specific questions
      if (!tools.includes('clauseFinder')) {
        tools.push('clauseFinder');
      }
    }
    
    // Mode-based adjustments
    if (context.userMode === 'business') {
      tools = tools.filter(t => !['letterGenerator'].includes(t));
    } else if (context.userMode === 'legal') {
      tools.push('legalAnalyzer');
    }
    
    // Validate and filter available tools
    const availableTools = tools.filter(toolName => 
      this.toolRegistry.isAvailable(toolName)
    );
    
    if (availableTools.length === 0) {
      availableTools.push('clauseFinder'); // Fallback tool
    }
    
    return availableTools;
  }

  /**
   * Generate execution strategy
   */
  generateStrategy(intent, tools, context) {
    const strategy = {
      type: intent.name,
      execution: 'sequential', // or 'parallel'
      tools,
      priority: this.getIntentPriority(intent.name),
      context: {
        requiresContract: intent.name !== 'draft',
        streamingRecommended: ['explain', 'draft'].includes(intent.name),
        citationsRequired: ['explain', 'extract', 'risk'].includes(intent.name),
        structuredOutput: ['extract', 'calculate'].includes(intent.name)
      }
    };
    
    // Adjust execution based on tools
    if (tools.length > 2 && ['extract', 'calculate'].includes(intent.name)) {
      strategy.execution = 'parallel';
    }
    
    return strategy;
  }

  /**
   * Execute tools based on routing decision
   */
  async executePlan(plan, question, retrievalResults, context) {
    const startTime = Date.now();
    const results = {};
    
    try {
      if (plan.strategy.execution === 'parallel') {
        results.toolResults = await this.executeToolsParallel(
          plan.tools, question, retrievalResults, context
        );
      } else {
        results.toolResults = await this.executeToolsSequential(
          plan.tools, question, retrievalResults, context
        );
      }
      
      // Aggregate insights
      results.insights = this.aggregateInsights(results.toolResults);
      
      // Generate citations
      if (plan.strategy.context.citationsRequired) {
        results.citations = this.generateCitations(results.toolResults, retrievalResults);
      }
      
      const duration = Date.now() - startTime;
      console.log(`🔧 Tool execution completed in ${duration}ms`);
      
      return {
        ...results,
        executionTime: duration,
        plan
      };
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute tools in parallel
   */
  async executeToolsParallel(tools, question, retrievalResults, context) {
    const toolPromises = tools.map(toolName => 
      this.executeTool(toolName, question, retrievalResults, context)
        .catch(error => ({ toolName, error: error.message }))
    );
    
    const results = await Promise.all(toolPromises);
    
    return results.reduce((acc, result) => {
      if (result.error) {
        acc.errors = acc.errors || {};
        acc.errors[result.toolName] = result.error;
      } else {
        acc[result.toolName] = result.data;
      }
      return acc;
    }, {});
  }

  /**
   * Execute tools sequentially
   */
  async executeToolsSequential(tools, question, retrievalResults, context) {
    const results = {};
    
    for (const toolName of tools) {
      try {
        const result = await this.executeTool(toolName, question, retrievalResults, context);
        results[toolName] = result.data;
        
        // Pass results to next tool if needed
        context.previousResults = results;
        
      } catch (error) {
        console.error(`❌ Tool ${toolName} failed:`, error);
        results.errors = results.errors || {};
        results.errors[toolName] = error.message;
      }
    }
    
    return results;
  }

  /**
   * Execute individual tool
   */
  async executeTool(toolName, question, retrievalResults, context) {
    const tool = this.toolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    const toolContext = {
      question,
      retrievalResults,
      ...context
    };
    
    return await tool.execute(toolContext);
  }

  /**
   * Aggregate insights from tool results
   */
  aggregateInsights(toolResults) {
    const insights = {
      deadlines: [],
      amounts: [],
      parties: [],
      risks: [],
      keyTerms: []
    };
    
    // Extract insights from each tool
    for (const [toolName, result] of Object.entries(toolResults)) {
      if (result && result.insights) {
        Object.keys(insights).forEach(key => {
          if (result.insights[key]) {
            insights[key].push(...result.insights[key]);
          }
        });
      }
    }
    
    // Deduplicate and sort insights
    Object.keys(insights).forEach(key => {
      insights[key] = this.deduplicateInsights(insights[key]);
    });
    
    return insights;
  }

  /**
   * Generate citations from tool results
   */
  generateCitations(toolResults, retrievalResults) {
    const citations = [];
    
    for (const [toolName, result] of Object.entries(toolResults)) {
      if (result && result.citations) {
        citations.push(...result.citations);
      }
    }
    
    // Add source citations from retrieval
    if (retrievalResults && retrievalResults.results) {
      const sourceCitations = retrievalResults.results.map(chunk => ({
        chunkId: chunk.chunkId,
        text: chunk.text.substring(0, 200) + '...',
        page: chunk.spans?.pageStart || 1,
        score: chunk.score,
        type: 'source'
      }));
      
      citations.push(...sourceCitations);
    }
    
    return this.deduplicateCitations(citations);
  }

  /**
   * Get priority for intent type
   */
  getIntentPriority(intentName) {
    const priorities = {
      risk: 1,
      calculate: 2,
      extract: 3,
      explain: 4,
      draft: 5,
      redline: 6
    };
    
    return priorities[intentName] || 5;
  }

  /**
   * Get default intent for fallback
   */
  getDefaultIntent(question, context) {
    return {
      primary: {
        name: 'explain',
        confidence: 0.5,
        matches: 0,
        tools: ['clauseFinder'],
        fallback: true
      },
      alternatives: [],
      tools: ['clauseFinder'],
      strategy: {
        type: 'explain',
        execution: 'sequential',
        tools: ['clauseFinder'],
        priority: 4,
        context: {
          requiresContract: false,
          streamingRecommended: true,
          citationsRequired: true,
          structuredOutput: false
        }
      },
      confidence: 0.5,
      processingTime: 0
    };
  }

  /**
   * Deduplicate insights array
   */
  deduplicateInsights(insights) {
    const seen = new Set();
    return insights.filter(insight => {
      const key = JSON.stringify(insight);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicate citations array
   */
  deduplicateCitations(citations) {
    const seen = new Set();
    return citations.filter(citation => {
      const key = citation.chunkId || citation.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

module.exports = IntentRouter;
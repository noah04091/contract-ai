// backend/services/chat/generateAnswer.js
const { OpenAI } = require('openai');
const IntentRouter = require('./intentRouter');
const VectorStore = require('../rag/vectorStore');
const { TextStreamer } = require('../../utils/sse');

class AnswerGenerator {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.intentRouter = new IntentRouter();
    this.vectorStore = new VectorStore();
    
    // System prompts for different user modes
    this.systemPrompts = {
      laie: `Du bist ein freundlicher Rechtsexperte, der komplexe Vertragsthemen für Laien verständlich erklärt.
        Verwende einfache Sprache, vermeide Fachbegriffe und erkläre juristische Konzepte mit alltäglichen Beispielen.
        Strukturiere deine Antworten klar und gib konkrete Handlungsempfehlungen.`,
      
      business: `Du bist ein erfahrener Rechtsberater für Unternehmen. Erkläre Vertragsklauseln präzise und 
        fokussiere auf praktische Geschäftsauswirkungen. Weise auf Risiken und Chancen hin.
        Verwende professionelle Sprache, bleibe aber verständlich.`,
      
      jurist: `Du bist ein Fachanwalt und analysierst Verträge mit höchster juristischer Präzision.
        Verwende korrekte Rechtsterminologie, verweise auf relevante Gesetze und Rechtsprechung.
        Identifiziere rechtliche Feinheiten und potentielle Streitpunkte.`
    };
  }

  /**
   * Generate a comprehensive answer with streaming
   */
  async generateStreamingAnswer(question, contractId, context, sseConnection) {
    const startTime = Date.now();
    let telemetry = {
      retrievalMs: 0,
      intentMs: 0,
      toolsMs: 0,
      generationMs: 0,
      totalLatency: 0,
      tokensIn: 0,
      tokensOut: 0,
      citationsCount: 0
    };
    
    try {
      // Connect to vector store if needed
      if (!this.vectorStore.isConnected) {
        await this.vectorStore.connect();
      }
      
      // Stage 1: Retrieval
      sseConnection.sendProgress('retrieval', 0, 'Durchsuche relevante Vertragsabschnitte...');
      
      const retrievalStart = Date.now();
      const retrievalResults = await this.retrieveRelevantChunks(question, contractId, context);
      telemetry.retrievalMs = Date.now() - retrievalStart;
      telemetry.citationsCount = retrievalResults.results?.length || 0;
      
      sseConnection.sendProgress('retrieval', 100, `${telemetry.citationsCount} relevante Abschnitte gefunden`);
      
      // Stage 2: Intent Analysis
      sseConnection.sendProgress('analysis', 0, 'Analysiere Fragestellung...');
      
      const intentStart = Date.now();
      const intentAnalysis = await this.intentRouter.analyzeIntent(question, {
        ...context,
        hasContract: !!contractId
      });
      telemetry.intentMs = Date.now() - intentStart;
      
      sseConnection.sendProgress('analysis', 100, `Intent erkannt: ${intentAnalysis.primary.name}`);
      
      // Stage 3: Tool Execution (if needed)
      let toolResults = null;
      if (intentAnalysis.tools.length > 0) {
        sseConnection.sendProgress('tools', 0, 'Führe spezialisierte Analysen durch...');
        
        const toolsStart = Date.now();
        toolResults = await this.intentRouter.executePlan(
          intentAnalysis, 
          question, 
          retrievalResults, 
          context
        );
        telemetry.toolsMs = Date.now() - toolsStart;
        
        sseConnection.sendProgress('tools', 100, `${intentAnalysis.tools.length} Tools ausgeführt`);
        
        // Send insights if available
        if (toolResults.insights) {
          sseConnection.sendInsights(toolResults.insights);
        }
      }
      
      // Stage 4: Answer Generation
      sseConnection.sendProgress('generation', 0, 'Generiere Antwort...');
      
      const generationStart = Date.now();
      const answer = await this.generateStreamingResponse(
        question, 
        retrievalResults, 
        intentAnalysis, 
        toolResults, 
        context, 
        sseConnection
      );
      telemetry.generationMs = Date.now() - generationStart;
      
      // Stage 5: Finalization
      sseConnection.sendProgress('finalization', 50, 'Bereite Zitate vor...');
      
      const citations = this.prepareCitations(retrievalResults, toolResults);
      sseConnection.sendCitations(citations);
      
      sseConnection.sendProgress('finalization', 100, 'Fertig!');
      
      // Calculate totals
      telemetry.totalLatency = Date.now() - startTime;
      
      // Send completion
      const result = {
        answer: answer.text,
        telemetry,
        intentAnalysis: {
          primary: intentAnalysis.primary.name,
          confidence: intentAnalysis.confidence
        },
        toolsUsed: intentAnalysis.tools,
        citations: citations.length
      };
      
      sseConnection.sendComplete(result);
      
      return result;
      
    } catch (error) {
      console.error('Answer generation failed:', error);
      
      sseConnection.sendError(error, true);
      
      // Try to provide a fallback response
      const fallbackAnswer = await this.generateFallbackAnswer(question, context);
      
      sseConnection.sendComplete({
        answer: fallbackAnswer,
        fallback: true,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Retrieve relevant chunks from vector store
   */
  async retrieveRelevantChunks(question, contractId, context) {
    const searchOptions = {
      limit: context.maxResults || 10,
      minScore: 0.1,
      diversityThreshold: 0.85,
      includeMetadata: true
    };
    
    try {
      const results = await this.vectorStore.search(question, contractId, searchOptions);
      return results;
    } catch (error) {
      console.error('Vector search failed:', error);
      return {
        query: question,
        results: [],
        metadata: {
          searchMode: 'failed',
          totalResults: 0,
          searchTime: 0
        }
      };
    }
  }

  /**
   * Generate streaming response using OpenAI
   */
  async generateStreamingResponse(question, retrievalResults, intentAnalysis, toolResults, context, sseConnection) {
    // Build context for generation
    const generationContext = this.buildGenerationContext(
      question, 
      retrievalResults, 
      intentAnalysis, 
      toolResults, 
      context
    );
    
    const systemPrompt = this.getSystemPrompt(context.userMode);
    const userPrompt = this.buildUserPrompt(generationContext);
    
    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: true
      });
      
      let fullText = '';
      const textStreamer = new TextStreamer(sseConnection, {
        chunkSize: 30,
        chunkDelay: 50
      });
      
      // Collect chunks first, then stream
      const chunks = [];
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          chunks.push(content);
          fullText += content;
        }
      }
      
      // Stream the collected text
      await textStreamer.streamText(fullText);
      
      return {
        text: fullText,
        chunked: true,
        tokens: this.estimateTokenCount(fullText)
      };
      
    } catch (error) {
      console.error('OpenAI streaming failed:', error);
      
      // Fallback to non-streaming
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const answer = completion.choices[0].message.content;
      
      // Send as single chunk
      sseConnection.sendChunk(answer, { isComplete: true });
      
      return {
        text: answer,
        chunked: false,
        tokens: completion.usage?.total_tokens || this.estimateTokenCount(answer)
      };
    }
  }

  /**
   * Build context for answer generation
   */
  buildGenerationContext(question, retrievalResults, intentAnalysis, toolResults, context) {
    return {
      question,
      intent: intentAnalysis.primary.name,
      confidence: intentAnalysis.confidence,
      contractContext: this.summarizeContractContext(retrievalResults),
      toolInsights: this.summarizeToolResults(toolResults),
      userMode: context.userMode || 'business',
      hasContract: retrievalResults.results && retrievalResults.results.length > 0
    };
  }

  /**
   * Summarize contract context from retrieval results
   */
  summarizeContractContext(retrievalResults) {
    if (!retrievalResults.results || retrievalResults.results.length === 0) {
      return 'Keine spezifischen Vertragsinformationen verfügbar.';
    }
    
    const topResults = retrievalResults.results.slice(0, 5);
    const contextSummary = topResults.map((result, index) => 
      `[${index + 1}] Seite ${result.spans?.pageStart || '?'}: ${result.text.substring(0, 200)}...`
    ).join('\n\n');
    
    return contextSummary;
  }

  /**
   * Summarize tool execution results
   */
  summarizeToolResults(toolResults) {
    if (!toolResults || !toolResults.toolResults) {
      return 'Keine zusätzlichen Analysen durchgeführt.';
    }
    
    const summaries = [];
    
    for (const [toolName, result] of Object.entries(toolResults.toolResults)) {
      if (result && result.success) {
        summaries.push(`${toolName}: ${this.createToolSummary(toolName, result.data)}`);
      }
    }
    
    return summaries.length > 0 ? summaries.join('\n') : 'Keine verwertbaren Tool-Ergebnisse.';
  }

  /**
   * Create summary for specific tool results
   */
  createToolSummary(toolName, data) {
    switch (toolName) {
      case 'clauseFinder':
        return `${data.identifiedClauses} Klauseln identifiziert`;
      case 'deadlineScanner':
        return `${data.totalDeadlines} Fristen gefunden, ${data.upcomingDeadlines} bald fällig`;
      case 'tableExtractor':
        return `${data.tablesFound} Tabellen, ${data.financialDataPoints} Finanzdaten`;
      case 'piiRedactor':
        return `${data.piiAnalysis.totalPIIFound} personenbezogene Daten gefunden`;
      case 'letterGenerator':
        return `${data.letterType} generiert`;
      case 'redliner':
        return `${data.totalSuggestions} Verbesserungsvorschläge`;
      default:
        return 'Analyse durchgeführt';
    }
  }

  /**
   * Get system prompt based on user mode
   */
  getSystemPrompt(userMode = 'business') {
    const basePrompt = this.systemPrompts[userMode] || this.systemPrompts.business;
    
    const additionalInstructions = `
      
WICHTIGE ANWEISUNGEN:
- Beziehe dich immer auf die bereitgestellten Vertragsabschnitte
- Nutze Zitate mit Seitenangaben: "[Seite X: relevanter Text]"  
- Strukturiere deine Antwort mit Überschriften und Aufzählungen
- Gib konkrete, umsetzbare Empfehlungen
- Weise auf Risiken und wichtige Aspekte hin
- Falls keine spezifischen Informationen vorliegen, sage das deutlich

ANTWORTFORMAT:
1. Kurze Zusammenfassung
2. Detaillierte Analyse mit Quellenangaben
3. Praktische Empfehlungen
4. Mögliche Risiken/Hinweise`;
    
    return basePrompt + additionalInstructions;
  }

  /**
   * Build user prompt with all context
   */
  buildUserPrompt(context) {
    let prompt = `FRAGE: ${context.question}\n\n`;
    
    prompt += `ERKANNTER INTENT: ${context.intent} (Konfidenz: ${Math.round(context.confidence * 100)}%)\n\n`;
    
    if (context.hasContract) {
      prompt += `RELEVANTE VERTRAGSABSCHNITTE:\n${context.contractContext}\n\n`;
    }
    
    if (context.toolInsights !== 'Keine zusätzlichen Analysen durchgeführt.') {
      prompt += `ZUSÄTZLICHE ANALYSEN:\n${context.toolInsights}\n\n`;
    }
    
    prompt += `ANTWORTMODUS: ${context.userMode}\n\n`;
    
    prompt += `Bitte beantworte die Frage basierend auf den verfügbaren Informationen:`;
    
    return prompt;
  }

  /**
   * Generate fallback answer when main generation fails
   */
  async generateFallbackAnswer(question, context) {
    try {
      const simplePrompt = `Du bist ein hilfreicher Rechtsassistent. Beantworte folgende Frage kurz und verständlich: ${question}`;
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: simplePrompt }],
        temperature: 0.5,
        max_tokens: 500
      });
      
      return completion.choices[0].message.content + '\n\n*Hinweis: Dies ist eine allgemeine Antwort, da die Vertragsanalyse nicht verfügbar war.*';
    } catch (error) {
      return 'Entschuldigung, ich kann Ihre Frage momentan nicht bearbeiten. Bitte versuchen Sie es später erneut oder wenden Sie sich an den Support.';
    }
  }

  /**
   * Prepare citations for the response
   */
  prepareCitations(retrievalResults, toolResults) {
    const citations = [];
    
    // Add retrieval citations
    if (retrievalResults.results) {
      retrievalResults.results.forEach((result, index) => {
        citations.push({
          id: `source_${index + 1}`,
          type: 'contract_source',
          page: result.spans?.pageStart || 1,
          text: result.text.substring(0, 150) + '...',
          score: result.score,
          chunkId: result.chunkId
        });
      });
    }
    
    // Add tool citations if available
    if (toolResults && toolResults.citations) {
      toolResults.citations.forEach((citation, index) => {
        citations.push({
          id: `tool_${index + 1}`,
          type: 'analysis_result',
          page: citation.page,
          text: citation.text,
          confidence: citation.confidence,
          toolSource: citation.type
        });
      });
    }
    
    return citations.slice(0, 20); // Limit to top 20 citations
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokenCount(text) {
    // Rough estimate: 1 token ≈ 4 characters for English/German text
    return Math.ceil(text.length / 4);
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Test OpenAI connection
      const testCompletion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      
      // Test vector store connection
      const vectorStoreHealth = await this.vectorStore.healthCheck();
      
      // Test intent router
      const intentTest = await this.intentRouter.analyzeIntent('Test question');
      
      return {
        status: 'healthy',
        openai: !!testCompletion,
        vectorStore: vectorStoreHealth.status === 'healthy',
        intentRouter: !!intentTest,
        systemPrompts: Object.keys(this.systemPrompts).length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = AnswerGenerator;
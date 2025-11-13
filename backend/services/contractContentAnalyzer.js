// 📄 backend/services/contractContentAnalyzer.js
// Comprehensive Contract Content Analysis (separate from Legal Pulse risk analysis)
// PURPOSE: Understanding contract content, key points, and providing neutral overview

const { OpenAI } = require("openai");

class ContractContentAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.analysisPrompt = `Du bist ein erfahrener Vertragsberater, der Verträge für Kunden verständlich aufbereitet.

Analysiere den folgenden Vertrag UMFASSEND und NEUTRAL:

WICHTIG:
- Fokus auf VERSTÄNDNIS und KLARHEIT
- Keine Risiko-Bewertung (das macht Legal Pulse)
- Hervorheben was GUT ist UND was BEDENKLICH ist
- Konkrete, verständliche Sprache
- Strukturierte, übersichtliche Darstellung

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "summary": "Prägnante 2-3 Sätze Zusammenfassung des Vertrags",
  "contractType": "Art des Vertrags (z.B. Mietvertrag, Arbeitsvertrag, Kaufvertrag)",
  "parties": {
    "provider": "Vertragspartner 1 (Anbieter/Arbeitgeber)",
    "customer": "Vertragspartner 2 (Kunde/Arbeitnehmer)"
  },
  "keyTerms": {
    "duration": "Vertragslaufzeit",
    "cancellation": "Kündigungsfrist",
    "payment": "Zahlungsmodalitäten",
    "deliverables": "Leistungsumfang"
  },
  "positiveAspects": [
    {
      "title": "Positive Klausel/Aspekt",
      "description": "Warum ist das vorteilhaft?",
      "relevance": "Für wen ist das wichtig?"
    }
  ],
  "concerningAspects": [
    {
      "title": "Bedenkliche Klausel/Aspekt",
      "description": "Was könnte problematisch sein?",
      "impact": "Welche Auswirkungen hat das?"
    }
  ],
  "importantClauses": [
    {
      "title": "Wichtige Vertragsklausel",
      "content": "Inhalt der Klausel (vereinfacht)",
      "explanation": "Was bedeutet das in einfachen Worten?",
      "action": "Was sollte man beachten/tun?"
    }
  ],
  "recommendations": [
    "Konkrete Handlungsempfehlung 1",
    "Konkrete Handlungsempfehlung 2",
    "..."
  ],
  "missingInformation": [
    "Was fehlt im Vertrag? (falls relevant)"
  ]
}`;
  }

  /**
   * Helper function to sleep/wait
   * @param {number} ms - Milliseconds to wait
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Analyze contract content with retry logic
   * @param {string} contractText - Extracted PDF text
   * @param {object} basicInfo - Basic contract info (name, provider, etc.)
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @returns {object} Comprehensive analysis
   */
  async analyzeWithRetry(contractText, basicInfo = {}, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📄 [Attempt ${attempt}/${maxRetries}] Starting comprehensive contract content analysis...`);

        const result = await this.analyzeContractContent(contractText, basicInfo);

        // Check if analysis was successful (aiGenerated = true means GPT-4 worked)
        if (result.aiGenerated) {
          console.log(`✅ [Attempt ${attempt}/${maxRetries}] Analysis successful!`);
          return result;
        }

        // If not AI-generated but no error thrown, it might be minimal analysis
        if (attempt < maxRetries && (!contractText || contractText.length < 100)) {
          console.log('⚠️ No text available, returning minimal analysis');
          return result;
        }

        throw new Error('Analysis failed to generate AI content');

      } catch (error) {
        console.error(`❌ [Attempt ${attempt}/${maxRetries}] Error:`, error.message);

        // If this was the last attempt, return fallback
        if (attempt === maxRetries) {
          console.log('⚠️ Max retries reached, returning fallback analysis');
          return this.createFallbackAnalysis(basicInfo, error);
        }

        // Calculate exponential backoff: 2s, 4s, 8s
        const waitTime = 2000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await this.sleep(waitTime);
      }
    }

    // Fallback (should never reach here, but just in case)
    return this.createFallbackAnalysis(basicInfo, new Error('Unexpected error in retry logic'));
  }

  /**
   * Analyze contract content comprehensively (single attempt)
   * @param {string} contractText - Extracted PDF text
   * @param {object} basicInfo - Basic contract info (name, provider, etc.)
   * @returns {object} Comprehensive analysis
   */
  async analyzeContractContent(contractText, basicInfo = {}) {
    // If no text available, return minimal analysis
    if (!contractText || contractText.length < 100) {
      return this.createMinimalAnalysis(basicInfo);
    }

    // Truncate text to reasonable length for GPT-4 (max ~16000 chars)
    // GPT-4 can handle ~8k tokens = ~32k characters, so 16k chars is safe
    const maxLength = 16000;
    const truncatedText = contractText.length > maxLength
      ? contractText.substring(0, maxLength) + '\n\n[... Vertrag zu lang, restlicher Text wurde gekürzt ...]'
      : contractText;

    const prompt = `${this.analysisPrompt}

VERTRAGSINFORMATIONEN:
Name: ${basicInfo.name || 'Unbekannt'}
Provider: ${basicInfo.provider || 'Unbekannt'}
Typ: ${basicInfo.type || 'Unbekannt'}

VERTRAGSTEXT:
${truncatedText}

Bitte analysiere diesen Vertrag umfassend und strukturiert.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Du bist ein erfahrener Vertragsberater, der Verträge verständlich und neutral analysiert. Dein Fokus liegt auf Klarheit und Verständlichkeit, nicht auf Risiko-Scoring."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const analysisResult = this.parseAnalysisResponse(response.choices[0].message.content);
    return analysisResult;
  }

  /**
   * Parse GPT-4 response
   */
  parseAnalysisResponse(aiResponse) {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and set defaults
        return {
          summary: parsed.summary || 'Keine Zusammenfassung verfügbar',
          contractType: parsed.contractType || 'Unbekannt',
          parties: parsed.parties || { provider: 'Unbekannt', customer: 'Unbekannt' },
          keyTerms: parsed.keyTerms || {},
          positiveAspects: Array.isArray(parsed.positiveAspects) ? parsed.positiveAspects : [],
          concerningAspects: Array.isArray(parsed.concerningAspects) ? parsed.concerningAspects : [],
          importantClauses: Array.isArray(parsed.importantClauses) ? parsed.importantClauses : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
          analyzedAt: new Date(),
          aiGenerated: true
        };
      }
    } catch (error) {
      console.error('❌ Failed to parse analysis response:', error);
    }

    // Fallback to text-based extraction
    return this.extractFromText(aiResponse);
  }

  /**
   * Extract analysis from text if JSON parsing fails
   */
  extractFromText(text) {
    return {
      summary: text.substring(0, 200) + '...',
      contractType: 'Analyse durchgeführt',
      parties: { provider: 'Siehe Vertrag', customer: 'Siehe Vertrag' },
      keyTerms: {},
      positiveAspects: [],
      concerningAspects: [],
      importantClauses: [],
      recommendations: ['Manuelle Prüfung empfohlen'],
      missingInformation: [],
      analyzedAt: new Date(),
      aiGenerated: true
    };
  }

  /**
   * Create minimal analysis when no text available
   */
  createMinimalAnalysis(basicInfo) {
    return {
      summary: `Vertrag "${basicInfo.name || 'Unbekannt'}" wurde hochgeladen. Für eine detaillierte Analyse ist der Vertragstext erforderlich.`,
      contractType: basicInfo.type || 'Unbekannt',
      parties: {
        provider: basicInfo.provider || 'Unbekannt',
        customer: 'Kunde'
      },
      keyTerms: {
        duration: basicInfo.laufzeit || 'Nicht verfügbar',
        cancellation: basicInfo.kuendigung || 'Nicht verfügbar',
        payment: 'Nicht verfügbar',
        deliverables: 'Nicht verfügbar'
      },
      positiveAspects: [],
      concerningAspects: [],
      importantClauses: [],
      recommendations: ['Vertragstext prüfen für detaillierte Analyse'],
      missingInformation: ['Vollständiger Vertragstext nicht verfügbar'],
      analyzedAt: new Date(),
      aiGenerated: false
    };
  }

  /**
   * Create fallback analysis on error
   */
  createFallbackAnalysis(basicInfo, error) {
    console.log('⚠️ Creating fallback analysis due to error:', error.message);

    return {
      summary: `Basis-Analyse für "${basicInfo.name || 'Vertrag'}". Eine detaillierte KI-Analyse konnte nicht durchgeführt werden.`,
      contractType: basicInfo.type || 'Unbekannt',
      parties: {
        provider: basicInfo.provider || 'Unbekannt',
        customer: 'Kunde'
      },
      keyTerms: {
        duration: basicInfo.laufzeit || 'Unbekannt',
        cancellation: basicInfo.kuendigung || 'Unbekannt',
        payment: 'Siehe Vertrag',
        deliverables: 'Siehe Vertrag'
      },
      positiveAspects: [],
      concerningAspects: [
        {
          title: 'Automatische Analyse nicht verfügbar',
          description: 'Die KI-Analyse konnte nicht durchgeführt werden.',
          impact: 'Manuelle Prüfung erforderlich'
        }
      ],
      importantClauses: [],
      recommendations: ['Manuelle rechtliche Prüfung empfohlen'],
      missingInformation: ['Automatische KI-Analyse fehlgeschlagen'],
      analyzedAt: new Date(),
      aiGenerated: false,
      error: error.message
    };
  }

  /**
   * Batch analysis for multiple contracts with retry logic
   */
  async analyzeBatch(contracts, maxConcurrent = 2) {
    const results = [];

    for (let i = 0; i < contracts.length; i += maxConcurrent) {
      const batch = contracts.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(contract =>
        this.analyzeWithRetry(contract.text, contract.info).catch(error => {
          console.error(`❌ Batch error for ${contract.info?.name}:`, error);
          return this.createFallbackAnalysis(contract.info, error);
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting pause
      if (i + maxConcurrent < contracts.length) {
        await this.sleep(2000);
      }
    }

    return results;
  }
}

module.exports = ContractContentAnalyzer;

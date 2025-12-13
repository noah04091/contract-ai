/**
 * Legal Lens - Clause Analyzer Service
 *
 * Analysiert einzelne Vertragsklauseln mit GPT-4 aus verschiedenen Perspektiven.
 * Unterstützt Streaming für bessere UX.
 *
 * @version 1.0.0
 * @author Contract AI
 */

const OpenAI = require('openai');

class ClauseAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Perspektiven-Definitionen
    this.perspectives = {
      contractor: {
        name: 'Auftraggeber',
        description: 'Aus Sicht des Kunden/Auftraggebers',
        systemPrompt: `Du analysierst Vertragsklauseln AUS SICHT DES AUFTRAGGEBERS (der Kunde, der den Vertrag unterschreibt).

Deine Aufgabe:
- Erkläre die Klausel in einfacher Sprache
- Identifiziere RISIKEN und NACHTEILE für den Auftraggeber
- Zeige versteckte Kosten, eingeschränkte Rechte, unfaire Bedingungen auf
- Bewerte, ob die Klausel marktüblich ist
- Gib konkrete Handlungsempfehlungen

Sei KRITISCH und SCHÜTZEND gegenüber dem Auftraggeber.`
      },

      client: {
        name: 'Auftragnehmer',
        description: 'Aus Sicht des Dienstleisters/Anbieters',
        systemPrompt: `Du analysierst Vertragsklauseln AUS SICHT DES AUFTRAGNEHMERS (der Dienstleister/Anbieter).

Deine Aufgabe:
- Erkläre, warum diese Klausel für den Auftragnehmer vorteilhaft ist
- Zeige, welche Risiken der Auftragnehmer absichert
- Erkläre die geschäftliche Logik hinter der Klausel
- Bewerte, ob die Klausel angemessen ist

Sei VERSTÄNDNISVOLL für die Position des Auftragnehmers.`
      },

      neutral: {
        name: 'Marktüblich',
        description: 'Neutrale, branchenübliche Bewertung',
        systemPrompt: `Du analysierst Vertragsklauseln NEUTRAL und MARKTÜBLICH.

Deine Aufgabe:
- Vergleiche mit Branchenstandards und üblichen Praktiken
- Bewerte objektiv, ob die Klausel fair für BEIDE Seiten ist
- Zeige Abweichungen vom Marktstandard auf
- Gib eine ausgewogene Einschätzung

Sei OBJEKTIV und SACHLICH wie ein unabhängiger Gutachter.`
      },

      worstCase: {
        name: 'Worst-Case',
        description: 'Schlimmstmögliche Auslegung',
        systemPrompt: `Du analysierst Vertragsklauseln im WORST-CASE SZENARIO.

Deine Aufgabe:
- Zeige das SCHLIMMSTE, was passieren kann
- Wie könnte die Klausel GEGEN den Unterzeichner ausgelegt werden?
- Welche extremen Konsequenzen sind möglich?
- Welche Lücken könnten ausgenutzt werden?

Sei PESSIMISTISCH und zeige MAXIMALE RISIKEN auf - aber bleibe realistisch.`
      }
    };

    // Analyse-Struktur für GPT
    this.analysisSchema = {
      type: 'object',
      properties: {
        explanation: {
          type: 'object',
          properties: {
            simple: { type: 'string', description: 'Erklärung in 2-3 einfachen Sätzen' },
            detailed: { type: 'string', description: 'Ausführliche rechtliche Bedeutung' }
          },
          required: ['simple', 'detailed']
        },
        riskAssessment: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['low', 'medium', 'high'] },
            score: { type: 'number', minimum: 0, maximum: 100 },
            reasons: { type: 'array', items: { type: 'string' } }
          },
          required: ['level', 'score', 'reasons']
        },
        impact: {
          type: 'object',
          properties: {
            financial: { type: 'string', description: 'Finanzielle Auswirkungen' },
            legal: { type: 'string', description: 'Rechtliche Konsequenzen' },
            operational: { type: 'string', description: 'Praktische Auswirkungen im Alltag' }
          },
          required: ['financial', 'legal', 'operational']
        },
        consequences: {
          type: 'array',
          items: { type: 'string' },
          description: '3-5 konkrete Konsequenzen'
        },
        recommendation: {
          type: 'string',
          description: 'Klare Handlungsempfehlung'
        },
        marketComparison: {
          type: 'object',
          properties: {
            isStandard: { type: 'boolean' },
            marketRange: { type: 'string', description: 'Was ist marktüblich?' },
            deviation: { type: 'string', description: 'Wie weicht diese Klausel ab?' }
          }
        }
      },
      required: ['explanation', 'riskAssessment', 'impact', 'consequences', 'recommendation']
    };
  }

  /**
   * Analysiert eine einzelne Klausel aus einer bestimmten Perspektive
   *
   * @param {string} clauseText - Der Text der Klausel
   * @param {string} perspective - Die Perspektive (contractor, client, neutral, worstCase)
   * @param {string} contractContext - Optionaler Kontext zum Vertrag
   * @param {Object} options - Zusätzliche Optionen
   * @returns {Promise<Object>} Die Analyse
   */
  async analyzeClause(clauseText, perspective = 'contractor', contractContext = '', options = {}) {
    console.log(`🔍 Legal Lens: Analysiere Klausel aus Perspektive "${perspective}"...`);

    const perspectiveConfig = this.perspectives[perspective];
    if (!perspectiveConfig) {
      throw new Error(`Unbekannte Perspektive: ${perspective}`);
    }

    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.3,
      maxTokens = 1500,
      language = 'de'
    } = options;

    const systemPrompt = `${perspectiveConfig.systemPrompt}

WICHTIG: Antworte IMMER auf Deutsch in diesem exakten JSON-Format:
{
  "explanation": {
    "simple": "Erklärung in 2-3 einfachen Sätzen für Laien",
    "detailed": "Ausführliche rechtliche Bedeutung und Hintergründe"
  },
  "riskAssessment": {
    "level": "low|medium|high",
    "score": 0-100,
    "reasons": ["Grund 1", "Grund 2", "Grund 3"]
  },
  "impact": {
    "financial": "Konkrete finanzielle Auswirkungen (mit Beispielzahlen wenn möglich)",
    "legal": "Rechtliche Konsequenzen bei Verletzung",
    "operational": "Praktische Auswirkungen im Geschäftsalltag"
  },
  "consequences": [
    "Konkrete Konsequenz 1",
    "Konkrete Konsequenz 2",
    "Konkrete Konsequenz 3"
  ],
  "recommendation": "Klare Handlungsempfehlung in einem Satz",
  "marketComparison": {
    "isStandard": true/false,
    "marketRange": "Was ist marktüblich (z.B. '3-5% jährlich')",
    "deviation": "Wie weicht diese Klausel vom Markt ab"
  }
}`;

    try {
      const startTime = Date.now();

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: contractContext
              ? `Kontext zum Vertrag:\n${contractContext.substring(0, 1500)}\n\n---\n\nAnalysiere diese Klausel:\n"${clauseText}"`
              : `Analysiere diese Vertragsklausel:\n"${clauseText}"`
          }
        ],
        response_format: { type: 'json_object' },
        temperature,
        max_tokens: maxTokens
      });

      const processingTime = Date.now() - startTime;
      const result = JSON.parse(response.choices[0].message.content);

      console.log(`✅ Analyse abgeschlossen in ${processingTime}ms`);

      return {
        success: true,
        perspective,
        perspectiveName: perspectiveConfig.name,
        analysis: result,
        metadata: {
          model,
          tokensUsed: response.usage?.total_tokens || 0,
          processingTimeMs: processingTime,
          analyzedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Analyse-Fehler:', error.message);
      throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Analysiert eine Klausel aus allen 4 Perspektiven
   *
   * @param {string} clauseText - Der Text der Klausel
   * @param {string} contractContext - Optionaler Kontext zum Vertrag
   * @returns {Promise<Object>} Alle Perspektiven-Analysen
   */
  async analyzeAllPerspectives(clauseText, contractContext = '') {
    console.log('🔍 Legal Lens: Analysiere aus allen 4 Perspektiven...');

    const perspectives = ['contractor', 'client', 'neutral', 'worstCase'];
    const results = {};
    const errors = [];

    // Parallel analysieren für bessere Performance
    const promises = perspectives.map(async (perspective) => {
      try {
        const result = await this.analyzeClause(clauseText, perspective, contractContext);
        results[perspective] = result.analysis;
        results[perspective].analyzedAt = result.metadata.analyzedAt;
      } catch (error) {
        errors.push({ perspective, error: error.message });
      }
    });

    await Promise.all(promises);

    return {
      success: errors.length === 0,
      perspectives: results,
      errors: errors.length > 0 ? errors : undefined,
      analyzedCount: Object.keys(results).length,
      totalPerspectives: perspectives.length
    };
  }

  /**
   * Generiert alternative Formulierungen für eine Klausel
   *
   * @param {string} clauseText - Original-Klausel
   * @param {Object} options - Optionen
   * @returns {Promise<Array>} Array mit Alternativen
   */
  async generateAlternatives(clauseText, options = {}) {
    console.log('✨ Legal Lens: Generiere alternative Formulierungen...');

    const {
      count = 2,
      style = 'balanced', // 'favorable', 'balanced', 'strict'
      model = 'gpt-4-turbo-preview'
    } = options;

    const styleInstructions = {
      favorable: 'Formuliere die Alternativen DEUTLICH VORTEILHAFTER für den Auftraggeber.',
      balanced: 'Formuliere AUSGEWOGENE Alternativen, die für beide Seiten fair sind.',
      strict: 'Formuliere STRIKTE Alternativen mit klaren Grenzen und Schutzklauseln.'
    };

    const systemPrompt = `Du bist ein erfahrener Vertragsanwalt. Generiere ${count} alternative Formulierungen für eine Vertragsklausel.

${styleInstructions[style]}

Antworte in diesem JSON-Format:
{
  "alternatives": [
    {
      "text": "Die alternative Formulierung der Klausel...",
      "benefits": ["Vorteil 1", "Vorteil 2"],
      "difficulty": "easy|medium|hard",
      "explanation": "Warum diese Alternative besser ist"
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generiere ${count} bessere Alternativen für diese Klausel:\n\n"${clauseText}"`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        alternatives: result.alternatives || [],
        style,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Alternatives-Fehler:', error.message);
      throw new Error(`Alternativen-Generierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Generiert Verhandlungstipps für eine Klausel
   *
   * @param {string} clauseText - Die Klausel
   * @param {Object} analysisResult - Vorherige Analyse-Ergebnisse
   * @returns {Promise<Object>} Verhandlungstipps
   */
  async generateNegotiationTips(clauseText, analysisResult = null) {
    console.log('🎯 Legal Lens: Generiere Verhandlungstipps...');

    const systemPrompt = `Du bist ein erfahrener Verhandlungsexperte für Verträge.
Generiere praktische Verhandlungstipps für eine problematische Vertragsklausel.

Antworte in diesem JSON-Format:
{
  "argument": "Das Hauptargument für die Verhandlung (2-3 Sätze)",
  "emailTemplate": "Eine höfliche E-Mail-Vorlage an den Vertragspartner (max 150 Wörter)",
  "counterProposal": "Ein konkreter Gegenvorschlag für die Klausel",
  "tips": ["Tipp 1", "Tipp 2", "Tipp 3"],
  "successProbability": "low|medium|high",
  "fallbackPosition": "Was tun wenn Verhandlung scheitert"
}`;

    try {
      const contextInfo = analysisResult
        ? `\n\nVorherige Analyse:\n- Risiko-Level: ${analysisResult.riskLevel}\n- Marktüblich: ${analysisResult.marketComparison?.isStandard ? 'Ja' : 'Nein'}`
        : '';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Erstelle Verhandlungstipps für diese Klausel:${contextInfo}\n\n"${clauseText}"`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        negotiation: result,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Verhandlungstipps-Fehler:', error.message);
      throw new Error(`Verhandlungstipps-Generierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Chat-Funktion für Nachfragen zu einer Klausel
   *
   * @param {string} clauseText - Die Klausel
   * @param {string} question - Die Frage des Nutzers
   * @param {Array} previousMessages - Vorherige Chat-Nachrichten
   * @returns {Promise<Object>} Die Antwort
   */
  async chatAboutClause(clauseText, question, previousMessages = []) {
    console.log('💬 Legal Lens: Chat-Anfrage...');

    const systemPrompt = `Du bist ein freundlicher Vertragsexperte, der Fragen zu einer spezifischen Vertragsklausel beantwortet.

Die Klausel lautet:
"${clauseText}"

Antworte kurz, präzise und verständlich auf Deutsch. Maximal 3-4 Sätze.
Bei rechtlichen Fragen weise darauf hin, dass du keine Rechtsberatung gibst.`;

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...previousMessages.slice(-6), // Letzte 6 Nachrichten für Kontext
        { role: 'user', content: question }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.5,
        max_tokens: 300
      });

      const answer = response.choices[0].message.content;

      return {
        success: true,
        answer,
        tokensUsed: response.usage?.total_tokens || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Chat-Fehler:', error.message);
      throw new Error(`Chat fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Streaming-Version der Klausel-Analyse für bessere UX
   *
   * @param {string} clauseText - Die Klausel
   * @param {string} perspective - Die Perspektive
   * @param {Function} onChunk - Callback für Chunks
   * @param {string} contractContext - Optionaler Kontext
   */
  async analyzeClauseStreaming(clauseText, perspective, onChunk, contractContext = '') {
    console.log(`🔍 Legal Lens: Streaming-Analyse aus Perspektive "${perspective}"...`);

    const perspectiveConfig = this.perspectives[perspective];
    if (!perspectiveConfig) {
      throw new Error(`Unbekannte Perspektive: ${perspective}`);
    }

    const systemPrompt = `${perspectiveConfig.systemPrompt}

WICHTIG: Antworte IMMER auf Deutsch. Strukturiere deine Antwort so:

**Einfache Erklärung:**
[2-3 Sätze für Laien]

**Risiko-Bewertung:**
[Level: niedrig/mittel/hoch, Score: X/100]
[Gründe als Aufzählung]

**Auswirkungen:**
- Finanziell: [...]
- Rechtlich: [...]
- Praktisch: [...]

**Konsequenzen:**
[3-5 konkrete Punkte]

**Empfehlung:**
[Klare Handlungsempfehlung]

**Marktvergleich:**
[Standard: Ja/Nein, Üblich: ..., Abweichung: ...]`;

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: contractContext
              ? `Kontext:\n${contractContext.substring(0, 1000)}\n\nKlausel:\n"${clauseText}"`
              : `Analysiere:\n"${clauseText}"`
          }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 1200
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }

      return {
        success: true,
        fullContent,
        perspective,
        perspectiveName: perspectiveConfig.name
      };

    } catch (error) {
      console.error('❌ Streaming-Fehler:', error.message);
      throw new Error(`Streaming-Analyse fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Gibt verfügbare Perspektiven zurück
   */
  getAvailablePerspectives() {
    return Object.entries(this.perspectives).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description
    }));
  }

  /**
   * Prüft ob API-Key konfiguriert ist
   */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }
}

// Singleton-Export
module.exports = new ClauseAnalyzer();

// 📁 backend/services/alertExplainer.js
// GPT-4 Powered Alert Explanations

const OpenAI = require('openai');

class AlertExplainer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 🆕 Initialize cost optimization
    const { getInstance: getCostOptimization } = require('./costOptimization');
    this.costOptimization = getCostOptimization();
  }

  /**
   * Generate GPT-4 explanation for why a law change is relevant to a contract
   * @param {Object} lawChange - The law change object
   * @param {Object} contract - The contract object
   * @param {string} matchedText - The matched contract text chunk
   * @param {number} relevanceScore - Similarity score (0-1)
   * @returns {Promise<string>} - GPT-4 generated explanation
   */
  async explainRelevance(lawChange, contract, matchedText, relevanceScore) {
    try {
      const prompt = this.buildExplanationPrompt(lawChange, contract, matchedText, relevanceScore);

      // 🆕 Check rate limit (rough estimate: prompt ~200 tokens, completion ~150 tokens)
      const estimatedTokens = 350;
      const rateCheck = this.costOptimization.checkRateLimit('completion', estimatedTokens);

      if (!rateCheck.allowed) {
        console.warn(`[ALERT-EXPLAINER] Rate limit reached, waiting ${rateCheck.retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, rateCheck.retryAfter * 1000));
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective for this use case
        messages: [
          {
            role: 'system',
            content: `Du bist ein KI-Assistent, der Nutzern erklärt, warum ein neues Gesetz oder eine Gesetzesänderung für ihren Vertrag relevant ist.

Deine Aufgabe:
1. Erkläre in 2-3 kurzen, verständlichen Sätzen, warum die Änderung relevant ist
2. Fokus auf PRAKTISCHE Auswirkungen für den Nutzer
3. Nutze einfache Sprache (keine Juristensprache!)
4. Sei konkret und handlungsorientiert

Format:
- Kurz und prägnant (max. 150 Wörter)
- Keine Überschriften
- Direkte Ansprache ("Ihr Vertrag", "Sie müssen")
- Handlungsempfehlung am Ende`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for factual, consistent explanations
        max_tokens: 250
      });

      const explanation = response.choices[0].message.content.trim();

      // 🆕 Track cost
      const promptTokens = response.usage?.prompt_tokens || 200;
      const completionTokens = response.usage?.completion_tokens || 150;
      this.costOptimization.trackCompletionCost(promptTokens, completionTokens);

      console.log(`[ALERT-EXPLAINER] Generated explanation (${explanation.length} chars) for ${contract.contractName}`);

      return explanation;

    } catch (error) {
      console.error('[ALERT-EXPLAINER] Error generating explanation:', error);

      // Fallback explanation if GPT-4 fails
      return this.generateFallbackExplanation(lawChange, contract, relevanceScore);
    }
  }

  /**
   * Build the prompt for GPT-4
   */
  buildExplanationPrompt(lawChange, contract, matchedText, relevanceScore) {
    const relevancePercent = (relevanceScore * 100).toFixed(1);

    return `
🔍 **KONTEXT:**

**Gesetzesänderung:**
Titel: ${lawChange.title}
Beschreibung: ${lawChange.description || 'Keine Beschreibung verfügbar'}
Quelle: ${lawChange.source}
Bereich: ${lawChange.area}

**Betroffener Vertrag:**
Name: ${contract.contractName}
Relevanter Ausschnitt aus dem Vertrag:
"${matchedText.substring(0, 500)}${matchedText.length > 500 ? '...' : ''}"

**KI-Relevanz-Score:** ${relevancePercent}%

---

Erkläre in 2-3 einfachen Sätzen:
1. WAS ändert sich?
2. WARUM betrifft das diesen spezifischen Vertrag?
3. WAS sollte der Nutzer jetzt tun?
`.trim();
  }

  /**
   * Generate a simple fallback explanation if GPT-4 fails
   */
  generateFallbackExplanation(lawChange, contract, relevanceScore) {
    const relevancePercent = (relevanceScore * 100).toFixed(1);

    return `Diese Gesetzesänderung "${lawChange.title}" wurde als ${relevancePercent}% relevant für Ihren Vertrag "${contract.contractName}" eingestuft. Unsere KI hat Übereinstimmungen zwischen dem neuen Gesetz und Ihrem Vertragsinhalt gefunden. Wir empfehlen, den Vertrag im Optimizer zu prüfen und gegebenenfalls anzupassen.`;
  }

  /**
   * Batch explanation generation (for multiple alerts)
   * Includes rate limiting to avoid OpenAI quota issues
   */
  async explainBatch(alertData, delayMs = 1000) {
    const explanations = [];

    for (let i = 0; i < alertData.length; i++) {
      const { lawChange, contract, matchedText, relevanceScore } = alertData[i];

      try {
        const explanation = await this.explainRelevance(
          lawChange,
          contract,
          matchedText,
          relevanceScore
        );

        explanations.push({
          contractId: contract.contractId,
          explanation
        });

        // Rate limiting: Wait between requests
        if (i < alertData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        console.error(`[ALERT-EXPLAINER] Error for contract ${contract.contractName}:`, error);

        // Add fallback explanation
        explanations.push({
          contractId: contract.contractId,
          explanation: this.generateFallbackExplanation(lawChange, contract, relevanceScore)
        });
      }
    }

    return explanations;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new AlertExplainer();
    }
    return instance;
  },
  AlertExplainer
};

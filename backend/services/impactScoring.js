// 📁 backend/services/impactScoring.js
// Impact Scoring System for Legal Pulse Alerts

const OpenAI = require('openai');

class ImpactScoring {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Calculate comprehensive impact score for a law change on a contract
   * @param {Object} lawChange - The law change object
   * @param {Object} contract - The contract object
   * @param {string} matchedText - Matched contract text
   * @param {number} relevanceScore - Similarity score (0-1)
   * @returns {Promise<Object>} - Impact scores
   */
  async calculateImpact(lawChange, contract, matchedText, relevanceScore) {
    try {
      // Use GPT-4 to analyze impact
      const analysis = await this.analyzeWithGPT(lawChange, contract, matchedText);

      // Combine GPT analysis with heuristics
      const impact = {
        // Financial Impact (0-100)
        financial: this.calculateFinancialImpact(analysis, contract, lawChange),

        // Urgency (0-100)
        urgency: this.calculateUrgency(analysis, lawChange),

        // Complexity (0-100)
        complexity: this.calculateComplexity(analysis, contract, matchedText),

        // Overall Priority Score (weighted average)
        priority: 0,

        // Metadata
        reasons: analysis.reasons || [],
        deadline: analysis.deadline || null,
        estimatedCost: analysis.estimatedCost || null,
        actionRequired: analysis.actionRequired || 'Vertrag prüfen'
      };

      // Calculate weighted priority score
      impact.priority = Math.round(
        impact.financial * 0.35 +    // 35% weight on financial
        impact.urgency * 0.40 +       // 40% weight on urgency (most important!)
        impact.complexity * 0.25      // 25% weight on complexity
      );

      return impact;

    } catch (error) {
      console.error('[IMPACT-SCORING] Error calculating impact:', error);

      // Fallback to simple heuristics
      return this.calculateFallbackImpact(lawChange, contract, relevanceScore);
    }
  }

  /**
   * Use GPT-4 to analyze impact
   */
  async analyzeWithGPT(lawChange, contract, matchedText) {
    const prompt = `
Analysiere den Impact dieser Gesetzesänderung auf den Vertrag:

**Gesetz:**
${lawChange.title}
${lawChange.description || ''}

**Vertrag:**
Name: ${contract.contractName}
Relevanter Ausschnitt: "${matchedText.substring(0, 500)}"

Bewerte folgende Dimensionen (0-100):

1. **Finanzieller Impact**: Wie hoch könnte der finanzielle Schaden/Nutzen sein?
2. **Dringlichkeit**: Wie schnell muss gehandelt werden?
3. **Komplexität**: Wie schwierig ist die Anpassung?

Gib die Antwort als JSON zurück:
{
  "financial": <0-100>,
  "urgency": <0-100>,
  "complexity": <0-100>,
  "reasons": ["Grund 1", "Grund 2"],
  "deadline": "DD.MM.YYYY oder null",
  "estimatedCost": "€X,XXX oder null",
  "actionRequired": "Was muss getan werden?"
}
`.trim();

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein KI-Assistent für Impact-Analyse von Gesetzesänderungen auf Verträge. Antworte NUR mit validen JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  }

  /**
   * Calculate financial impact score
   */
  calculateFinancialImpact(analysis, contract, lawChange) {
    let score = analysis.financial || 50;

    // Boost score for certain law areas
    if (lawChange.area?.includes('steuer')) score += 15;
    if (lawChange.area?.includes('finanz')) score += 15;
    if (lawChange.area?.includes('verbraucherschutz')) score += 10;

    // Contract value heuristics (if available)
    if (contract.value) {
      if (contract.value > 100000) score += 20;
      else if (contract.value > 50000) score += 10;
      else if (contract.value > 10000) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate urgency score
   */
  calculateUrgency(analysis, lawChange) {
    let score = analysis.urgency || 50;

    // Check for deadline keywords
    const urgentKeywords = ['sofort', 'unverzüglich', 'dringend', 'frist', 'deadline'];
    const title = (lawChange.title + ' ' + (lawChange.description || '')).toLowerCase();

    const hasUrgentKeyword = urgentKeywords.some(kw => title.includes(kw));
    if (hasUrgentKeyword) score += 20;

    // Check law source (some sources are more urgent)
    if (lawChange.source?.includes('bundesgesetzblatt')) score += 10;

    // Check if deadline is soon
    if (analysis.deadline) {
      try {
        const deadlineDate = this.parseDeadline(analysis.deadline);
        const daysUntil = Math.floor((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 7) score += 40;
        else if (daysUntil < 30) score += 25;
        else if (daysUntil < 90) score += 15;
      } catch (e) {
        // Ignore parse errors
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate complexity score
   */
  calculateComplexity(analysis, contract, matchedText) {
    let score = analysis.complexity || 50;

    // More text = more complex
    const textLength = matchedText.length;
    if (textLength > 2000) score += 15;
    else if (textLength > 1000) score += 10;
    else if (textLength > 500) score += 5;

    // Complex legal terms increase complexity
    const complexTerms = ['§', 'abs.', 'ziffer', 'anlage', 'verpflichtet', 'haftung'];
    const termCount = complexTerms.filter(term => matchedText.toLowerCase().includes(term)).length;
    score += termCount * 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Fallback impact calculation (if GPT fails)
   */
  calculateFallbackImpact(lawChange, contract, relevanceScore) {
    const baseScore = Math.round(relevanceScore * 100);

    return {
      financial: baseScore,
      urgency: baseScore,
      complexity: baseScore,
      priority: baseScore,
      reasons: ['Basiert auf KI-Ähnlichkeitsanalyse'],
      deadline: null,
      estimatedCost: null,
      actionRequired: 'Vertrag im Optimizer prüfen'
    };
  }

  /**
   * Parse deadline string to Date
   */
  parseDeadline(deadlineStr) {
    // Try DD.MM.YYYY format
    const match = deadlineStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Try ISO format
    return new Date(deadlineStr);
  }

  /**
   * Get priority label
   */
  getPriorityLabel(priorityScore) {
    if (priorityScore >= 80) return { level: 'critical', label: 'Sehr dringend' };
    if (priorityScore >= 60) return { level: 'high', label: 'Dringend' };
    if (priorityScore >= 40) return { level: 'medium', label: 'Mittel' };
    return { level: 'low', label: 'Niedrig' };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ImpactScoring();
    }
    return instance;
  },
  ImpactScoring
};

// backend/services/tools/letterGenerator.js
const { OpenAI } = require('openai');

class LetterGenerator {
  constructor() {
    this.description = 'Generates legal letters and documents based on contract analysis';
    this.capabilities = ['letter_generation', 'template_creation', 'legal_drafting'];
    
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Letter templates and types
    this.letterTypes = {
      termination: {
        de: 'Kündigungsschreiben',
        en: 'Termination Letter',
        template: 'termination_template'
      },
      notice: {
        de: 'Mitteilung/Benachrichtigung',
        en: 'Notice Letter', 
        template: 'notice_template'
      },
      amendment: {
        de: 'Änderungsvereinbarung',
        en: 'Amendment Letter',
        template: 'amendment_template'
      },
      reminder: {
        de: 'Mahnung',
        en: 'Reminder Letter',
        template: 'reminder_template'
      },
      request: {
        de: 'Anfrage/Auskunft',
        en: 'Request Letter',
        template: 'request_template'
      }
    };
    
    // System prompts for different letter types
    this.systemPrompts = {
      termination: `Du bist ein erfahrener Rechtsanwalt, der ein professionelles Kündigungsschreiben erstellt.
        Verwende formelle Sprache, beziehe dich auf relevante Vertragsklauseln und halte rechtliche Standards ein.
        Strukturiere das Schreiben mit: Absender, Empfänger, Datum, Betreff, Anrede, Haupttext, Schlussformel.`,
      
      notice: `Du bist ein Rechtsexperte, der eine formelle Mitteilung oder Benachrichtigung verfasst.
        Das Schreiben soll klar, präzise und rechtssicher formuliert sein.
        Beziehe relevante Vertragsbestimmungen und Fristen mit ein.`,
      
      amendment: `Du erstellst eine professionelle Änderungsvereinbarung oder Nachtrag.
        Referenziere den ursprünglichen Vertrag und beschreibe Änderungen präzise.
        Verwende juristische Standardformulierungen.`,
      
      reminder: `Du verfasst eine höfliche aber bestimmte Mahnung oder Erinnerung.
        Beziehe dich auf Vertragsfristen und Verpflichtungen.
        Verwende einen professionellen aber eindringlichen Ton.`,
      
      request: `Du erstellst eine formelle Anfrage oder Auskunftsersuchen.
        Das Schreiben soll höflich aber bestimmt formuliert sein.
        Beziehe rechtliche Grundlagen und Fristen mit ein.`
    };
  }

  /**
   * Main execution method
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      const { question, retrievalResults } = context;
      
      // Identify letter type and intent
      const letterIntent = this.identifyLetterIntent(question);
      
      // Extract relevant contract information
      const contractInfo = this.extractContractInfo(retrievalResults);
      
      // Generate letter content
      const generatedLetter = await this.generateLetter(letterIntent, contractInfo, question, context);
      
      // Create structured output
      const letterData = this.structureLetter(generatedLetter, letterIntent);
      
      // Generate alternatives
      const alternatives = await this.generateAlternatives(letterIntent, contractInfo, context);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          letterType: letterIntent.type,
          confidence: letterIntent.confidence,
          generatedLetter: letterData,
          alternatives: alternatives.slice(0, 2), // Limit to 2 alternatives
          contractReferences: contractInfo.references,
          recommendations: this.generateRecommendations(letterIntent, contractInfo)
        },
        insights: this.createLetterInsights(letterIntent, contractInfo),
        citations: this.generateLetterCitations(contractInfo),
        metadata: {
          processingTime: duration,
          toolName: 'letterGenerator',
          letterType: letterIntent.type
        }
      };
      
    } catch (error) {
      console.error('LetterGenerator execution failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Identify the type of letter requested
   */
  identifyLetterIntent(question) {
    const questionLower = question.toLowerCase();
    
    const patterns = {
      termination: [
        /kündigung|kündig|beenden|terminate|cancel|end.*contract/i,
        /vertrag.*beenden|contract.*end|auflösen|dissolve/i
      ],
      notice: [
        /mitteilung|benachrichtig|notice|inform|notify/i,
        /hinweis|advice|advisement/i
      ],
      amendment: [
        /änder|anpass|modify|amend|change.*contract/i,
        /nachtrag|addendum|supplement/i
      ],
      reminder: [
        /mahnung|erinnerung|reminder|payment.*due/i,
        /säumnis|default|overdue/i
      ],
      request: [
        /anfrage|auskunft|request|inquiry|ask.*for/i,
        /information|details|clarification/i
      ]
    };
    
    let bestMatch = { type: 'request', confidence: 0.3 };
    
    for (const [type, typePatterns] of Object.entries(patterns)) {
      for (const pattern of typePatterns) {
        if (pattern.test(questionLower)) {
          const confidence = this.calculateIntentConfidence(questionLower, type);
          if (confidence > bestMatch.confidence) {
            bestMatch = { type, confidence };
          }
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate confidence score for letter intent
   */
  calculateIntentConfidence(question, type) {
    let confidence = 0.6;
    
    const specificWords = {
      termination: ['frist', 'deadline', 'zum', 'beenden'],
      notice: ['teilen', 'mit', 'hereby', 'inform'],
      amendment: ['ändern', 'modify', 'section', 'paragraph'],
      reminder: ['zahlbar', 'due', 'überfällig', 'payment'],
      request: ['bitte', 'please', 'würden', 'could']
    };
    
    const words = specificWords[type] || [];
    for (const word of words) {
      if (question.includes(word)) {
        confidence += 0.15;
      }
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Extract relevant contract information
   */
  extractContractInfo(retrievalResults) {
    const info = {
      parties: [],
      dates: [],
      clauses: [],
      amounts: [],
      references: [],
      keyTerms: []
    };
    
    if (!retrievalResults?.results) {
      return info;
    }
    
    for (const chunk of retrievalResults.results) {
      // Extract parties (basic pattern matching)
      const partyMatches = chunk.text.match(/\b([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)\s+(?:GmbH|AG|Ltd|Inc|Corp)\b/g);
      if (partyMatches) {
        info.parties.push(...partyMatches);
      }
      
      // Extract dates
      const dateMatches = chunk.text.match(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g);
      if (dateMatches) {
        info.dates.push(...dateMatches);
      }
      
      // Extract amounts
      const amountMatches = chunk.text.match(/\b\d+(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:€|EUR|USD|\$)\b/g);
      if (amountMatches) {
        info.amounts.push(...amountMatches);
      }
      
      // Store references for citations
      info.references.push({
        chunkId: chunk.chunkId,
        text: chunk.text.substring(0, 200) + '...',
        page: chunk.spans?.pageStart || 1,
        score: chunk.score
      });
      
      // Extract key legal terms
      const legalTerms = chunk.text.match(/\b(kündig|haft|zahlung|frist|notice|payment|liability|termination)\w*/gi);
      if (legalTerms) {
        info.keyTerms.push(...legalTerms);
      }
    }
    
    // Deduplicate arrays
    Object.keys(info).forEach(key => {
      if (Array.isArray(info[key])) {
        info[key] = [...new Set(info[key])];
      }
    });
    
    return info;
  }

  /**
   * Generate the letter using OpenAI
   */
  async generateLetter(letterIntent, contractInfo, question, context) {
    const systemPrompt = this.systemPrompts[letterIntent.type] || this.systemPrompts.request;
    
    const userPrompt = this.buildUserPrompt(letterIntent, contractInfo, question, context);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent legal writing
        max_tokens: 2000
      });
      
      return completion.choices[0].message.content;
      
    } catch (error) {
      console.error('OpenAI letter generation failed:', error);
      return this.generateFallbackLetter(letterIntent, contractInfo);
    }
  }

  /**
   * Build user prompt for letter generation
   */
  buildUserPrompt(letterIntent, contractInfo, question, context) {
    let prompt = `Erstelle ein ${this.letterTypes[letterIntent.type].de} basierend auf folgender Anfrage:\n\n`;
    prompt += `Anfrage: ${question}\n\n`;
    
    if (contractInfo.parties.length > 0) {
      prompt += `Vertragsparteien: ${contractInfo.parties.slice(0, 3).join(', ')}\n`;
    }
    
    if (contractInfo.dates.length > 0) {
      prompt += `Relevante Daten: ${contractInfo.dates.slice(0, 3).join(', ')}\n`;
    }
    
    if (contractInfo.amounts.length > 0) {
      prompt += `Beträge: ${contractInfo.amounts.slice(0, 3).join(', ')}\n`;
    }
    
    if (contractInfo.keyTerms.length > 0) {
      prompt += `Wichtige Begriffe: ${contractInfo.keyTerms.slice(0, 5).join(', ')}\n`;
    }
    
    prompt += '\nBitte erstelle ein vollständiges, rechtssicheres Schreiben mit:\n';
    prompt += '1. Kopfzeile mit Datum\n';
    prompt += '2. Empfängeradresse (Platzhalter verwenden)\n';
    prompt += '3. Betreff\n';
    prompt += '4. Höfliche Anrede\n';
    prompt += '5. Strukturierter Haupttext mit Verweis auf relevante Vertragsklauseln\n';
    prompt += '6. Professionelle Schlussformel\n';
    prompt += '7. Unterschriftsfeld\n\n';
    prompt += 'Verwende deutschen Rechtsstandard und professionelle Formulierungen.';
    
    return prompt;
  }

  /**
   * Generate fallback letter if OpenAI fails
   */
  generateFallbackLetter(letterIntent, contractInfo) {
    const type = letterIntent.type;
    const templates = {
      termination: `
[Datum: ${new Date().toLocaleDateString('de-DE')}]

[Empfängeradresse]

Betreff: Kündigung des Vertrages

Sehr geehrte Damen und Herren,

hiermit kündigen wir den zwischen uns bestehenden Vertrag ordentlich zum nächstmöglichen Termin.

Bitte bestätigen Sie uns den Erhalt dieser Kündigung schriftlich.

Mit freundlichen Grüßen

[Unterschrift]
      `,
      
      notice: `
[Datum: ${new Date().toLocaleDateString('de-DE')}]

[Empfängeradresse]

Betreff: Mitteilung bezüglich Vertrag

Sehr geehrte Damen und Herren,

hiermit teilen wir Ihnen folgende wichtige Information mit:

[Details einfügen]

Für Rückfragen stehen wir gerne zur Verfügung.

Mit freundlichen Grüßen

[Unterschrift]
      `
    };
    
    return templates[type] || templates.notice;
  }

  /**
   * Structure the generated letter
   */
  structureLetter(letterText, letterIntent) {
    const sections = this.parseLetter(letterText);
    
    return {
      type: letterIntent.type,
      fullText: letterText,
      sections,
      wordCount: letterText.split(/\s+/).length,
      metadata: {
        generated: new Date().toISOString(),
        letterType: this.letterTypes[letterIntent.type].de,
        confidence: letterIntent.confidence
      }
    };
  }

  /**
   * Parse letter into sections
   */
  parseLetter(letterText) {
    const sections = {
      header: '',
      recipient: '',
      subject: '',
      salutation: '',
      body: '',
      closing: '',
      signature: ''
    };
    
    const lines = letterText.split('\n').filter(line => line.trim());
    let currentSection = 'header';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Betreff:')) {
        sections.subject = trimmedLine;
        currentSection = 'salutation';
      } else if (trimmedLine.match(/^Sehr geehrte|^Dear/)) {
        sections.salutation = trimmedLine;
        currentSection = 'body';
      } else if (trimmedLine.match(/^Mit freundlichen Grüßen|^Sincerely/)) {
        sections.closing = trimmedLine;
        currentSection = 'signature';
      } else {
        sections[currentSection] += (sections[currentSection] ? '\n' : '') + trimmedLine;
      }
    }
    
    return sections;
  }

  /**
   * Generate alternative versions
   */
  async generateAlternatives(letterIntent, contractInfo, context) {
    const alternatives = [];
    
    // Generate a more formal version
    try {
      const formalPrompt = this.buildAlternativePrompt(letterIntent, contractInfo, 'formal');
      const formalLetter = await this.generateVariation(formalPrompt);
      
      alternatives.push({
        type: 'formal',
        title: 'Formelle Variante',
        content: formalLetter
      });
    } catch (error) {
      console.error('Failed to generate formal alternative:', error);
    }
    
    // Generate a shorter version
    try {
      const concisePrompt = this.buildAlternativePrompt(letterIntent, contractInfo, 'concise');
      const conciseLetter = await this.generateVariation(concisePrompt);
      
      alternatives.push({
        type: 'concise',
        title: 'Kurzfassung',
        content: conciseLetter
      });
    } catch (error) {
      console.error('Failed to generate concise alternative:', error);
    }
    
    return alternatives;
  }

  /**
   * Build prompt for alternative versions
   */
  buildAlternativePrompt(letterIntent, contractInfo, variant) {
    const basePrompt = this.systemPrompts[letterIntent.type];
    
    const variants = {
      formal: `${basePrompt}\n\nErstelle eine besonders formelle und juristische Version mit erweiterten Rechtsverweisen.`,
      concise: `${basePrompt}\n\nErstelle eine kurze, prägnante Version, die alle wesentlichen Punkte abdeckt.`
    };
    
    return variants[variant] || basePrompt;
  }

  /**
   * Generate letter variation
   */
  async generateVariation(prompt) {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.4,
      max_tokens: 1500
    });
    
    return completion.choices[0].message.content;
  }

  /**
   * Generate recommendations for the letter
   */
  generateRecommendations(letterIntent, contractInfo) {
    const recommendations = [];
    
    if (letterIntent.type === 'termination' && contractInfo.dates.length > 0) {
      recommendations.push({
        type: 'deadline',
        message: 'Prüfen Sie die Kündigungsfristen basierend auf den gefundenen Daten.',
        priority: 'high'
      });
    }
    
    if (contractInfo.amounts.length > 0) {
      recommendations.push({
        type: 'financial',
        message: 'Berücksichtigen Sie finanzielle Aspekte und offene Beträge.',
        priority: 'medium'
      });
    }
    
    recommendations.push({
      type: 'legal_review',
      message: 'Lassen Sie das Schreiben vor Versendung rechtlich prüfen.',
      priority: 'high'
    });
    
    if (letterIntent.confidence < 0.7) {
      recommendations.push({
        type: 'intent_verification',
        message: 'Überprüfen Sie, ob der gewählte Brieftyp Ihrer Absicht entspricht.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Create insights for the insights panel
   */
  createLetterInsights(letterIntent, contractInfo) {
    return {
      keyTerms: [
        letterIntent.type,
        ...contractInfo.keyTerms.slice(0, 5),
        'rechtsschreiben',
        'vertragskommunikation'
      ],
      parties: contractInfo.parties.map(party => ({
        name: party,
        role: 'contract_party'
      })),
      amounts: contractInfo.amounts.map(amount => ({
        amount,
        context: 'contract_reference'
      })),
      deadlines: contractInfo.dates.map(date => ({
        date,
        type: 'contract_date',
        relevance: letterIntent.type
      }))
    };
  }

  /**
   * Generate citations for contract references
   */
  generateLetterCitations(contractInfo) {
    return contractInfo.references.slice(0, 5).map(ref => ({
      chunkId: ref.chunkId,
      text: ref.text,
      page: ref.page,
      type: 'contract_reference',
      score: ref.score
    }));
  }

  /**
   * Health check for the tool
   */
  async healthCheck() {
    try {
      // Test intent identification
      const testQuestion = 'Ich möchte den Vertrag kündigen';
      const intent = this.identifyLetterIntent(testQuestion);
      
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
        letterTypesLoaded: Object.keys(this.letterTypes).length,
        intentDetection: intent.type === 'termination',
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

module.exports = LetterGenerator;
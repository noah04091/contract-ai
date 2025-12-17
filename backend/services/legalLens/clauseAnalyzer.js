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

    // Branchen-spezifische Kontext-Prompts
    this.industryContexts = {
      it_software: {
        name: 'IT & Software',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - IT & SOFTWARE:
- Prüfe SLAs (Service Level Agreements): Uptime-Garantien (99.9% üblich), Response-Zeiten, Verfügbarkeitsklauseln
- IP-Rechte & Source-Code: Wem gehört der Code? Source-Code-Escrow vorhanden? Nutzungsrechte bei Vertragsende?
- Daten & DSGVO: Auftragsverarbeitung, Serverstandort, Datenportabilität, Löschfristen
- Support & Wartung: Reaktionszeiten, Patch-Zyklen, End-of-Life-Regelungen
- Lizenzmodelle: Named User vs. Concurrent, Übertragbarkeit, Audit-Rechte
- Change Requests: Wie werden Änderungen gehandhabt und bepreist?
- Marktüblich in IT: 99.5-99.9% Uptime, 24-48h Support-Reaktion, jährliche Preisanpassung max. 5%`,
      },
      construction: {
        name: 'Bauwesen',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - BAUWESEN:
- VOB/B Konformität: Gilt VOB/B oder BGB-Werkvertragsrecht? Was wurde ausgeschlossen?
- Gewährleistungsfristen: VOB/B = 4 Jahre, BGB = 5 Jahre - was gilt hier?
- Nachträge & Mengenänderungen: Wie werden Mehr- und Mindermengen abgerechnet?
- Abnahme: Förmliche oder fiktive Abnahme? Teilabnahmen möglich?
- Sicherheiten: Vertragserfüllungsbürgschaft (5-10%), Gewährleistungsbürgschaft (3-5%)
- Bauzeitverlängerung: Wie werden Behinderungen gemeldet und vergütet?
- Zahlungsfristen: Nach VOB/B 21 Tage nach Zugang der Rechnung
- Marktüblich: 5% Sicherheitseinbehalt, Zahlungsziel 30 Tage, 4 Jahre Gewährleistung`,
      },
      real_estate: {
        name: 'Immobilien',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - IMMOBILIEN:
- Mietanpassung: Staffelmiete, Indexmiete oder freie Anpassung? Obergrenze?
- Nebenkosten: Was ist umlagefähig? Vorauszahlung oder Pauschale?
- Kaution: Max. 3 Monatsmieten (Wohnraum), bei Gewerbe oft höher - was gilt?
- Konkurrenzschutz: Bei Gewerbe - welche Nutzungen sind ausgeschlossen?
- Instandhaltung: Wer trägt was? Schönheitsreparaturen? Dach und Fach?
- Untervermietung: Erlaubt? Mit Zustimmung? Ausschluss der Mieterhöhung?
- Kündigungsfristen: Gewerbe oft 6-12 Monate, Wohnraum gesetzlich
- Marktüblich: 3 Monatskaltmieten Kaution, NK-Pauschale 2-3 €/m², Staffelmiete max. 10%/Jahr`,
      },
      consulting: {
        name: 'Beratung',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - BERATUNG:
- Honorarstruktur: Stundenhonorar, Tagessatz oder Festpreis? Was deckt es ab?
- Reisekosten: Pauschale oder nach Aufwand? Obergrenze?
- Erfolgsbeteiligung: Wie wird Erfolg gemessen und vergütet?
- Geheimhaltung/NDA: Dauer, Umfang, Vertragsstrafen
- Wettbewerbsverbot: Für wen gilt es? Wie lange nach Vertragsende?
- Arbeitsergebnisse: Wem gehören sie? Nutzungsrechte?
- Abnahmeverfahren: Wie werden Leistungen abgenommen?
- Marktüblich: 150-300€/h Senior-Berater, Tagessätze 1.200-2.500€, NDA 2-5 Jahre`,
      },
      manufacturing: {
        name: 'Produktion',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - PRODUKTION:
- Lieferzeiten: Fix oder Richtwert? Konsequenzen bei Verzug?
- Qualitätssicherung: Welche Standards (ISO, CE)? Prüfverfahren?
- Produkthaftung: Wer haftet für Mängel am Endprodukt?
- Mindestabnahme: Gibt es Mindestmengen oder -umsätze?
- Preisanpassung: Rohstoffklauseln? Anpassungsintervalle?
- Werkzeuge & Formen: Wem gehören sie? Aufbewahrungspflicht?
- Lieferketten-Compliance: LkSG-Anforderungen erfüllt?
- Marktüblich: 2-4 Wochen Lieferzeit, 0,5% Verzugspauschale/Tag max. 5%, 2 Jahre Gewährleistung`,
      },
      retail: {
        name: 'Handel',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - HANDEL:
- Rabatte & Boni: Staffelrabatte, Jahresboni, Naturalrabatte?
- Rückgaberecht: Über gesetzliches Widerrufsrecht hinaus?
- Exklusivität: Gebiets- oder Produktexklusivität?
- Mindestbestellwert: Gibt es Mindestmengen oder -werte?
- Zahlungsbedingungen: Skonto, Zahlungsfristen, Vorkasse?
- Preisbindung: Unverbindliche Preisempfehlung oder Fixpreis?
- Reklamationsabwicklung: Prozess, Fristen, Kostenübernahme?
- Marktüblich: 2% Skonto bei 14 Tagen, 30 Tage Zahlungsziel, 5-15% Jahresbonus ab Mindestumsatz`,
      },
      healthcare: {
        name: 'Gesundheitswesen',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - GESUNDHEITSWESEN:
- Datenschutz: Besondere Kategorien nach DSGVO Art. 9 - Patientendaten!
- Zulassungen: Medizinprodukte-Verordnung, CE-Kennzeichnung?
- Berufliche Schweigepflicht: § 203 StGB beachtet?
- Haftung: Verschuldensunabhängige Produkthaftung bei Medizinprodukten
- Dokumentation: Aufbewahrungsfristen (oft 10-30 Jahre)
- Compliance: Anti-Korruptionsregeln im Gesundheitswesen
- Zertifizierungen: ISO 13485 für Medizinprodukte?
- Marktüblich: 10 Jahre Aufbewahrungsfrist, Audit-Rechte quartalsweise, 24/7 Support bei kritischen Geräten`,
      },
      finance: {
        name: 'Finanzwesen',
        focusAreas: `
BRANCHENSPEZIFISCHER FOKUS - FINANZWESEN:
- Zinsen & Gebühren: Effektiver Jahreszins? Versteckte Gebühren?
- Kündigungsfristen: Wie schnell kannst du aus dem Vertrag raus?
- Widerrufsrecht: 14 Tage bei Verbraucherdarlehen
- Sicherheiten: Welche Sicherheiten werden verlangt?
- Provisionen: Abschluss- und Bestandsprovisionen transparent?
- Regulatorik: BaFin-Konformität, MiFID II, PSD2?
- Vorfälligkeitsentschädigung: Bei vorzeitiger Kündigung/Rückzahlung?
- Marktüblich: Effektivzins 3-8% (variiert stark), max. 1% Vorfälligkeitsentschädigung, 3 Monate Kündigungsfrist`,
      },
      general: {
        name: 'Allgemein',
        focusAreas: `
ALLGEMEINE PRÜFPUNKTE:
- AGB-Konformität: Sind die Klauseln mit AGB-Recht vereinbar?
- Haftungsbeschränkungen: Angemessen oder überzogen?
- Kündigungsfristen: Wie lange bist du gebunden?
- Datenschutz: DSGVO-konform?
- Gerichtsstand & anwendbares Recht: Deutsches Recht? Welches Gericht?
- Schriftformklauseln: Was muss schriftlich sein?
- Salvatorische Klausel: Vorhanden?`,
      }
    };

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

    // Analyse-Struktur für GPT - ERWEITERT für actionable insights
    this.analysisSchema = {
      type: 'object',
      properties: {
        // NEU: Primäre Handlungsempfehlung
        actionLevel: {
          type: 'string',
          enum: ['accept', 'negotiate', 'reject'],
          description: 'accept=unkritisch, negotiate=verhandelbar, reject=Dealbreaker'
        },
        actionReason: {
          type: 'string',
          description: 'Kurze Begründung für die Handlungsempfehlung (1 Satz)'
        },
        explanation: {
          type: 'object',
          properties: {
            simple: { type: 'string', description: 'Erklärung in 2-3 einfachen Sätzen für Laien' },
            detailed: { type: 'string', description: 'Ausführliche rechtliche Bedeutung' },
            whatItMeansForYou: { type: 'string', description: 'Konkret: Was bedeutet das für DICH als Unterzeichner?' }
          },
          required: ['simple', 'detailed', 'whatItMeansForYou']
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
        // NEU: Konkrete finanzielle/zeitliche Auswirkungen
        worstCase: {
          type: 'object',
          properties: {
            scenario: { type: 'string', description: 'Was ist das schlimmste was passieren kann?' },
            financialRisk: { type: 'string', description: 'Maximaler finanzieller Schaden in € (z.B. "bis zu 50.000€")' },
            timeRisk: { type: 'string', description: 'Zeitliche Bindung/Frist (z.B. "24 Monate Kündigungsfrist")' },
            probability: { type: 'string', enum: ['unlikely', 'possible', 'likely'] }
          },
          required: ['scenario', 'financialRisk', 'timeRisk', 'probability']
        },
        impact: {
          type: 'object',
          properties: {
            financial: { type: 'string', description: 'Konkrete finanzielle Auswirkungen mit Zahlen' },
            legal: { type: 'string', description: 'Rechtliche Konsequenzen bei Verletzung' },
            operational: { type: 'string', description: 'Praktische Auswirkungen im Geschäftsalltag' },
            negotiationPower: { type: 'number', minimum: 0, maximum: 100, description: 'Wie viel Verhandlungsspielraum hast du? 0=kein, 100=viel' }
          },
          required: ['financial', 'legal', 'operational', 'negotiationPower']
        },
        consequences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              scenario: { type: 'string' },
              probability: { type: 'string', enum: ['low', 'medium', 'high'] },
              impact: { type: 'string' }
            }
          },
          description: '3-5 konkrete Konsequenz-Szenarien'
        },
        recommendation: {
          type: 'string',
          description: 'Klare Handlungsempfehlung in einem Satz'
        },
        // NEU: Konkreter Verbesserungsvorschlag
        betterAlternative: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Bessere Formulierung der Klausel' },
            whyBetter: { type: 'string', description: 'Warum ist diese Formulierung besser?' },
            howToAsk: { type: 'string', description: 'Wie frage ich nach dieser Änderung?' }
          }
        },
        marketComparison: {
          type: 'object',
          properties: {
            isStandard: { type: 'boolean' },
            marketRange: { type: 'string', description: 'Was ist marktüblich? Mit konkreten Zahlen.' },
            deviation: { type: 'string', description: 'Wie weicht diese Klausel vom Markt ab?' }
          }
        }
      },
      required: ['actionLevel', 'actionReason', 'explanation', 'riskAssessment', 'worstCase', 'impact', 'consequences', 'recommendation']
    };
  }

  /**
   * Gibt Branchen-spezifischen Kontext zurück
   *
   * @param {string} industry - Die Branche
   * @returns {string} Der Branchen-Kontext für den Prompt
   */
  getIndustryContext(industry = 'general') {
    const context = this.industryContexts[industry] || this.industryContexts.general;
    return context.focusAreas;
  }

  /**
   * Gibt alle verfügbaren Branchen zurück
   */
  getAvailableIndustries() {
    return Object.entries(this.industryContexts).map(([key, value]) => ({
      id: key,
      name: value.name
    }));
  }

  /**
   * Analysiert eine einzelne Klausel aus einer bestimmten Perspektive
   *
   * @param {string} clauseText - Der Text der Klausel
   * @param {string} perspective - Die Perspektive (contractor, client, neutral, worstCase)
   * @param {string} contractContext - Optionaler Kontext zum Vertrag
   * @param {Object} options - Zusätzliche Optionen (inkl. industry für Branchen-Kontext)
   * @returns {Promise<Object>} Die Analyse
   */
  async analyzeClause(clauseText, perspective = 'contractor', contractContext = '', options = {}) {
    const { industry = 'general' } = options;
    console.log(`🔍 Legal Lens: Analysiere Klausel aus Perspektive "${perspective}" (Branche: ${industry})...`);

    const perspectiveConfig = this.perspectives[perspective];
    if (!perspectiveConfig) {
      throw new Error(`Unbekannte Perspektive: ${perspective}`);
    }

    const {
      model = 'gpt-4-turbo-preview',
      temperature = 0.3,
      maxTokens = 2000, // Erhöht für ausführlichere Analysen
      language = 'de'
    } = options;

    // Branchen-spezifischen Kontext hinzufügen
    const industryContext = this.getIndustryContext(industry);

    const systemPrompt = `${perspectiveConfig.systemPrompt}

${industryContext}

WICHTIG: Du bist ein erfahrener Vertragsanwalt der für Laien und Gründer berät.
Gib KONKRETE, ACTIONABLE Informationen - keine vagen Aussagen!

Antworte IMMER auf Deutsch in diesem exakten JSON-Format:
{
  "actionLevel": "accept|negotiate|reject",
  "actionReason": "Kurze Begründung warum akzeptieren/verhandeln/ablehnen (1 Satz)",
  "explanation": {
    "simple": "Erklärung in 2-3 EINFACHEN Sätzen - wie einem Freund erklären",
    "detailed": "Ausführliche rechtliche Bedeutung und Hintergründe",
    "whatItMeansForYou": "KONKRET: Was bedeutet das für DICH? Z.B. 'Du musst innerhalb von 14 Tagen zahlen, sonst drohen 5% Verzugszinsen'"
  },
  "riskAssessment": {
    "level": "low|medium|high",
    "score": 0-100,
    "reasons": ["Konkreter Grund 1", "Konkreter Grund 2", "Konkreter Grund 3"]
  },
  "worstCase": {
    "scenario": "Das SCHLIMMSTE was passieren kann - sei konkret!",
    "financialRisk": "KONKRETER €-Betrag, z.B. 'bis zu 10.000€' oder '3 Monatsgehälter' oder 'unbegrenzt'",
    "timeRisk": "KONKRETE Zeitangabe, z.B. '24 Monate Bindung' oder '6 Wochen Kündigungsfrist'",
    "probability": "unlikely|possible|likely"
  },
  "impact": {
    "financial": "Konkrete Kosten/Risiken mit €-BETRÄGEN",
    "legal": "Was passiert rechtlich bei Verstoß? Konkret!",
    "operational": "Wie beeinflusst das deinen Arbeitsalltag?",
    "negotiationPower": 0-100
  },
  "consequences": [
    {"scenario": "Was kann passieren?", "probability": "low|medium|high", "impact": "Konkrete Auswirkung"},
    {"scenario": "...", "probability": "...", "impact": "..."},
    {"scenario": "...", "probability": "...", "impact": "..."}
  ],
  "recommendation": "KLARE Handlungsempfehlung: Was sollst du TUN?",
  "betterAlternative": {
    "text": "Bessere Formulierung der Klausel (falls nötig)",
    "whyBetter": "Warum ist diese Formulierung fairer?",
    "howToAsk": "So fragst du danach: 'Können wir die Klausel so anpassen, dass...'"
  },
  "marketComparison": {
    "isStandard": true|false,
    "marketRange": "Was ist marktüblich? MIT KONKRETEN ZAHLEN/FRISTEN",
    "deviation": "Wie weicht diese Klausel ab? Ist das zu deinem Nachteil?"
  }
}

REGELN:
- actionLevel: "reject" NUR bei echten Dealbreakern (unfair, unüblich, zu riskant)
- actionLevel: "negotiate" bei verbesserungswürdigen Klauseln
- actionLevel: "accept" bei fairen, marktüblichen Klauseln
- IMMER konkrete Zahlen nennen wo möglich (€, %, Tage, Monate)
- KEINE vagen Aussagen wie "könnte teuer werden" - stattdessen "bis zu X€"
- Sprich den Leser direkt an mit "du/dein"`;

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

WICHTIG: Du bist ein erfahrener Vertragsanwalt der für Laien und Gründer berät.
Antworte IMMER auf Deutsch. Sei KONKRET - nenne €-Beträge, Fristen, Zeiträume!

Strukturiere deine Antwort so:

## 🎯 Handlungsempfehlung
[🟢 AKZEPTIEREN / 🟡 VERHANDELN / 🔴 ABLEHNEN]
[Kurze Begründung]

## 📖 Einfache Erklärung
[2-3 Sätze für Laien - wie einem Freund erklären]

## 💡 Was das für dich bedeutet
[KONKRET: Was musst DU tun/beachten? Mit Zahlen!]

## ⚠️ Worst-Case Szenario
- **Finanzielles Risiko:** [KONKRETER €-Betrag]
- **Zeitliches Risiko:** [KONKRETE Frist/Bindung]
- **Wahrscheinlichkeit:** [Unwahrscheinlich/Möglich/Wahrscheinlich]

## 📊 Risiko-Bewertung
**Level:** [niedrig/mittel/hoch] | **Score:** [X/100]
- Grund 1
- Grund 2
- Grund 3

## 📋 Mögliche Konsequenzen
1. [Szenario + Auswirkung]
2. [Szenario + Auswirkung]
3. [Szenario + Auswirkung]

## 💼 Bessere Alternative
**Vorschlag:** "[Bessere Formulierung]"
**So fragst du danach:** "[Konkreter Satz für Verhandlung]"

## 📈 Marktvergleich
- **Marktüblich:** [Ja/Nein]
- **Standard ist:** [Konkrete Zahlen/Fristen]
- **Abweichung:** [Wie weicht diese Klausel ab?]`;

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
        max_tokens: 1800
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
   * BATCH-VORANALYSE: Analysiert ALLE Klauseln in EINEM API-Call
   * Verwendet GPT-3.5-turbo für Kosteneffizienz (~10x günstiger als GPT-4)
   *
   * @param {Array} clauses - Array von Klausel-Objekten mit {id, text}
   * @param {string} contractContext - Optionaler Kontext (Vertragsname, Typ)
   * @returns {Promise<Object>} Risiko-Klassifizierung für alle Klauseln
   */
  async batchPreAnalyze(clauses, contractContext = '') {
    console.log(`⚡ Legal Lens: Batch-Voranalyse für ${clauses.length} Klauseln...`);

    if (!clauses || clauses.length === 0) {
      return { success: true, analyses: [], tokensUsed: 0 };
    }

    // Klauseln für den Prompt vorbereiten (max 20 auf einmal)
    const maxClauses = Math.min(clauses.length, 20);
    const clausesToAnalyze = clauses.slice(0, maxClauses);

    const clauseList = clausesToAnalyze
      .map((c, i) => `[${i + 1}] ID: ${c.id}\n"${c.text.substring(0, 500)}"`)
      .join('\n\n');

    const systemPrompt = `Du bist ein erfahrener Vertragsanalyst. Analysiere die folgenden ${clausesToAnalyze.length} Vertragsklauseln SCHNELL und EFFIZIENT.

Für JEDE Klausel gib zurück:
- riskLevel: "low" | "medium" | "high"
- riskScore: 0-100
- summary: Eine KURZE Zusammenfassung (max 15 Wörter)
- mainRisk: Das HAUPTRISIKO in einem Satz (oder "Kein besonderes Risiko")

Antworte NUR mit diesem JSON-Format:
{
  "analyses": [
    {
      "clauseId": "ID der Klausel",
      "riskLevel": "low|medium|high",
      "riskScore": 0-100,
      "summary": "Kurze Zusammenfassung",
      "mainRisk": "Hauptrisiko oder 'Kein besonderes Risiko'"
    }
  ],
  "overallRisk": "low|medium|high",
  "highRiskCount": 0
}`;

    try {
      const startTime = Date.now();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // 10x günstiger als GPT-4!
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: contractContext
              ? `Vertragskontext: ${contractContext}\n\nKlauseln:\n${clauseList}`
              : `Klauseln:\n${clauseList}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000
      });

      const processingTime = Date.now() - startTime;
      const result = JSON.parse(response.choices[0].message.content);
      const tokensUsed = response.usage?.total_tokens || 0;

      console.log(`✅ Batch-Voranalyse abgeschlossen in ${processingTime}ms (${tokensUsed} tokens)`);

      // Für Klauseln die nicht analysiert wurden (> 20), Standard-Werte setzen
      if (clauses.length > maxClauses) {
        const remainingClauses = clauses.slice(maxClauses);
        for (const clause of remainingClauses) {
          result.analyses.push({
            clauseId: clause.id,
            riskLevel: 'medium',
            riskScore: 50,
            summary: 'Noch nicht voranalysiert',
            mainRisk: 'Klicken für Detail-Analyse'
          });
        }
      }

      return {
        success: true,
        analyses: result.analyses || [],
        overallRisk: result.overallRisk || 'medium',
        highRiskCount: result.highRiskCount || 0,
        metadata: {
          model: 'gpt-3.5-turbo',
          tokensUsed,
          processingTimeMs: processingTime,
          analyzedAt: new Date().toISOString(),
          clausesAnalyzed: clausesToAnalyze.length,
          totalClauses: clauses.length
        }
      };

    } catch (error) {
      console.error('❌ Batch-Voranalyse Fehler:', error.message);

      // Fallback: Setze Standard-Werte für alle Klauseln
      return {
        success: false,
        error: error.message,
        analyses: clauses.map(c => ({
          clauseId: c.id,
          riskLevel: 'medium',
          riskScore: 50,
          summary: 'Analyse fehlgeschlagen',
          mainRisk: 'Klicken für Detail-Analyse'
        })),
        overallRisk: 'medium',
        highRiskCount: 0
      };
    }
  }

  /**
   * Prüft ob API-Key konfiguriert ist
   */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * SMART SUMMARY: Generiert Executive Summary nach Upload
   * Zeigt sofort die wichtigsten Risiken und Handlungsempfehlungen
   *
   * @param {string} fullText - Der vollständige Vertragstext
   * @param {string} contractName - Name des Vertrags
   * @param {Array} clauses - Optional: Bereits geparste Klauseln
   * @returns {Promise<Object>} Executive Summary mit Top-Risiken
   */
  async generateContractSummary(fullText, contractName = '', clauses = []) {
    console.log(`📊 Legal Lens: Generiere Smart Summary für "${contractName}"...`);

    const textLength = fullText?.length || 0;
    const truncatedText = fullText ? fullText.substring(0, 12000) : ''; // Max 12k chars für GPT

    const systemPrompt = `Du bist ein erfahrener Vertragsanwalt und analysierst Verträge für Laien und Gründer.

AUFGABE: Erstelle eine SOFORT-ÜBERSICHT für diesen Vertrag. Der Nutzer soll in 10 Sekunden verstehen:
1. Was für ein Vertrag ist das?
2. Was sind die TOP 3 RISIKEN (mit konkreten €-Beträgen und Fristen)?
3. Soll ich unterschreiben oder verhandeln?

WICHTIG:
- Nenne KONKRETE Zahlen (€, Monate, Prozent)
- Sei DIREKT und EHRLICH - beschönige nichts
- Sprich den Leser mit "du/dein" an
- Erkläre wie einem Freund ohne Jurastudium

Antworte NUR mit diesem JSON-Format:
{
  "contractType": "Arbeitsvertrag|Mietvertrag|Dienstleistungsvertrag|Kaufvertrag|SaaS-Vertrag|Sonstiges",
  "contractTypeDetail": "Kurze Spezifizierung, z.B. 'Unbefristeter Arbeitsvertrag' oder 'Gewerbemietvertrag'",

  "overallVerdict": {
    "action": "accept|negotiate|reject|review",
    "emoji": "🟢|🟡|🔴|⚪",
    "headline": "Ein Satz Empfehlung, z.B. 'Verhandelbar - 2 kritische Punkte klären'",
    "confidence": 0-100
  },

  "riskScore": {
    "overall": 0-100,
    "breakdown": {
      "financial": 0-100,
      "legal": 0-100,
      "operational": 0-100
    }
  },

  "quickStats": {
    "criticalCount": 0,
    "warningCount": 0,
    "okayCount": 0,
    "totalClauses": 0
  },

  "topRisks": [
    {
      "rank": 1,
      "severity": "critical|warning|info",
      "emoji": "🔴|🟡|🟢",
      "title": "Kurzer Titel (max 5 Wörter)",
      "section": "§-Nummer oder Abschnitt falls erkennbar",
      "whatItMeans": "Was bedeutet das für DICH? Konkret! (2 Sätze)",
      "worstCase": {
        "scenario": "Das Schlimmste was passieren kann",
        "financialRisk": "Konkreter €-Betrag (z.B. 'bis 10.000€' oder '3 Monatsgehälter')",
        "timeRisk": "Zeitliche Bindung (z.B. '24 Monate' oder 'unbefristet')"
      },
      "recommendation": "Konkrete Handlungsempfehlung (1 Satz)",
      "negotiationHint": "So sprichst du es an (1 Satz)"
    }
  ],

  "highlights": {
    "positive": ["Positiver Punkt 1", "Positiver Punkt 2"],
    "negative": ["Negativer Punkt 1", "Negativer Punkt 2"],
    "unusual": ["Ungewöhnliche Klausel 1"]
  },

  "keyTerms": {
    "duration": "Laufzeit in Klartext, z.B. 'Unbefristet mit 3 Monaten Kündigungsfrist'",
    "terminationNotice": "Kündigungsfrist, z.B. '3 Monate zum Monatsende'",
    "value": "Vertragswert falls erkennbar, z.B. '4.500€/Monat' oder 'Nicht angegeben'",
    "liability": "Haftungslimit falls vorhanden",
    "specialClauses": ["Besondere Klausel 1", "Besondere Klausel 2"]
  },

  "nextSteps": [
    {
      "priority": 1,
      "action": "Was als erstes tun?",
      "reason": "Warum ist das wichtig?"
    },
    {
      "priority": 2,
      "action": "Was als zweites tun?",
      "reason": "Warum ist das wichtig?"
    },
    {
      "priority": 3,
      "action": "Was als drittes tun?",
      "reason": "Warum ist das wichtig?"
    }
  ],

  "tldr": "Ein-Satz-Zusammenfassung: Was ist dieser Vertrag und was musst du beachten? (max 30 Wörter)"
}`;

    try {
      const startTime = Date.now();

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analysiere diesen Vertrag und erstelle eine Sofort-Übersicht:\n\nVertragsname: ${contractName || 'Unbekannt'}\nTextlänge: ${textLength} Zeichen\n\n---\n\n${truncatedText}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2500
      });

      const processingTime = Date.now() - startTime;
      const result = JSON.parse(response.choices[0].message.content);
      const tokensUsed = response.usage?.total_tokens || 0;

      console.log(`✅ Smart Summary generiert in ${processingTime}ms (${tokensUsed} tokens)`);

      return {
        success: true,
        summary: result,
        metadata: {
          model: 'gpt-4-turbo-preview',
          tokensUsed,
          processingTimeMs: processingTime,
          analyzedAt: new Date().toISOString(),
          textLength,
          contractName
        }
      };

    } catch (error) {
      console.error('❌ Smart Summary Fehler:', error.message);

      // Fallback-Response bei Fehler
      return {
        success: false,
        error: error.message,
        summary: {
          contractType: 'Unbekannt',
          contractTypeDetail: 'Analyse fehlgeschlagen',
          overallVerdict: {
            action: 'review',
            emoji: '⚪',
            headline: 'Automatische Analyse fehlgeschlagen - manuelle Prüfung empfohlen',
            confidence: 0
          },
          riskScore: { overall: 50, breakdown: { financial: 50, legal: 50, operational: 50 } },
          quickStats: { criticalCount: 0, warningCount: 0, okayCount: 0, totalClauses: 0 },
          topRisks: [],
          highlights: { positive: [], negative: [], unusual: [] },
          keyTerms: { duration: 'Nicht erkannt', terminationNotice: 'Nicht erkannt', value: 'Nicht erkannt' },
          nextSteps: [{ priority: 1, action: 'Vertrag manuell prüfen', reason: 'Automatische Analyse fehlgeschlagen' }],
          tldr: 'Die automatische Analyse ist fehlgeschlagen. Bitte prüfe den Vertrag manuell oder versuche es erneut.'
        }
      };
    }
  }

  /**
   * STREAMING Smart Summary für bessere UX
   * Zeigt Analyse-Fortschritt in Echtzeit
   *
   * @param {string} fullText - Der vollständige Vertragstext
   * @param {string} contractName - Name des Vertrags
   * @param {Function} onChunk - Callback für Streaming-Chunks
   * @returns {Promise<Object>} Finale Summary
   */
  async generateContractSummaryStreaming(fullText, contractName = '', onChunk) {
    console.log(`📊 Legal Lens: Streaming Smart Summary für "${contractName}"...`);

    const truncatedText = fullText ? fullText.substring(0, 10000) : '';

    const systemPrompt = `Du bist ein erfahrener Vertragsanwalt. Erstelle eine SOFORT-ÜBERSICHT.

SCHREIBE IN DIESEM FORMAT (MARKDOWN):

# 📋 Vertragstyp
[Vertragstyp + kurze Beschreibung]

## 🎯 Gesamtbewertung
**[🟢 AKZEPTABEL / 🟡 VERHANDELBAR / 🔴 KRITISCH]**
[Ein Satz warum]

---

## ⚠️ TOP 3 RISIKEN

### 1. 🔴 [Risiko-Titel]
**Was bedeutet das für dich?**
[2 Sätze konkret]

**Worst Case:**
- 💰 Finanziell: [€-Betrag]
- ⏰ Zeitlich: [Bindung/Frist]

**Empfehlung:** [1 Satz was tun]

---

### 2. 🟡 [Risiko-Titel]
[Gleiche Struktur]

---

### 3. 🟡 [Risiko-Titel]
[Gleiche Struktur]

---

## 📊 Risiko-Score: [X/100]
- 💰 Finanziell: [X/100]
- ⚖️ Rechtlich: [X/100]
- 🔧 Operativ: [X/100]

---

## ✅ Positiv | ❌ Negativ | ❓ Ungewöhnlich
**Positiv:** [Bullet Points]
**Negativ:** [Bullet Points]
**Ungewöhnlich:** [Bullet Points]

---

## 📋 Nächste Schritte
1. [Wichtigster Schritt]
2. [Zweiter Schritt]
3. [Dritter Schritt]

---

## 📝 TL;DR
[Ein Satz - max 30 Wörter]

---

WICHTIG: Nenne KONKRETE Zahlen (€, Monate, %). Sprich mit "du/dein". Sei ehrlich und direkt!`;

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analysiere diesen Vertrag:\n\nName: ${contractName || 'Unbekannt'}\n\n${truncatedText}`
          }
        ],
        stream: true,
        temperature: 0.3,
        max_tokens: 2000
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (onChunk) onChunk(content);
        }
      }

      return {
        success: true,
        content: fullContent,
        format: 'markdown'
      };

    } catch (error) {
      console.error('❌ Streaming Summary Fehler:', error.message);
      throw new Error(`Streaming Summary fehlgeschlagen: ${error.message}`);
    }
  }
}

// Singleton-Export
module.exports = new ClauseAnalyzer();

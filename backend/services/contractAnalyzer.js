// contractAnalyzer.js - ULTRA-INTELLIGENT Contract Analysis
// VERSION 10: PRODUCTION-READY mit OCR-Korrektur, Konfidenz-Scoring, Multi-Pass-Extraktion
// PRINCIPLE: Better NULL than wrong data! But better ESTIMATED than NULL!
// 🚀 OPTIMIERT für perfekte Kalender-Integration

class ContractAnalyzer {
  constructor() {
    // Vertragstyp-spezifische Defaults für intelligente Schätzungen
    this.contractDefaults = {
      insurance: {
        duration: { value: 1, unit: 'years', inMonths: 12 },
        cancellationPeriod: { value: 3, unit: 'months', inDays: 90 },
        autoRenewal: true,
        confidence: 40
      },
      telecom: {
        duration: { value: 24, unit: 'months', inMonths: 24 },
        cancellationPeriod: { value: 3, unit: 'months', inDays: 90 },
        autoRenewal: true,
        confidence: 40
      },
      fitness: {
        duration: { value: 12, unit: 'months', inMonths: 12 },
        cancellationPeriod: { value: 6, unit: 'weeks', inDays: 42 },
        autoRenewal: true,
        confidence: 40
      },
      energy: {
        duration: { value: 12, unit: 'months', inMonths: 12 },
        cancellationPeriod: { value: 6, unit: 'weeks', inDays: 42 },
        autoRenewal: true,
        confidence: 40
      },
      subscription: {
        duration: { value: 1, unit: 'months', inMonths: 1 },
        cancellationPeriod: { value: 0, unit: 'days', inDays: 0, type: 'daily' },
        autoRenewal: true,
        confidence: 35
      },
      finance: {
        duration: { value: 24, unit: 'months', inMonths: 24 },
        cancellationPeriod: { value: 3, unit: 'months', inDays: 90 },
        autoRenewal: false,
        confidence: 30
      },
      rental: {
        duration: { value: 12, unit: 'months', inMonths: 12 },
        cancellationPeriod: { value: 3, unit: 'months', inDays: 90 },
        autoRenewal: false,
        confidence: 35
      },
      mobility: {
        duration: { value: 24, unit: 'months', inMonths: 24 },
        cancellationPeriod: { value: 3, unit: 'months', inDays: 90 },
        autoRenewal: true,
        confidence: 40
      }
    };

    this.patterns = {
      // Provider patterns - intelligently detect from text
      provider: [
        // Company name with legal form - more specific patterns first
        /(?:Versicherer|Versicherung|Gesellschaft|Anbieter|Unternehmen)[\s:]+([A-Z][A-Za-zÄÖÜäöüß\s&\-\.]{2,}(?:AG|GmbH|SE|KG|OHG|e\.V\.|Bank|Versicherung|mbH|GmbH\s&\sCo\.\sKG))/gi,
        // Standalone company names with legal forms
        /^([A-Z][A-Za-zÄÖÜäöüß\s&\-\.]{2,}(?:AG|GmbH|SE|KG|OHG|e\.V\.|Bank|Versicherung|mbH))/gm,
        // Between patterns for contracts
        /zwischen\s+.*?\s+und\s+([A-Z][A-Za-zÄÖÜäöüß\s&\-\.]{2,}(?:AG|GmbH|SE|KG|Bank|Versicherung))/gi,
        // Headers with company names
        /^([A-Z][A-Za-zÄÖÜäöüß]{3,}[\s\w]*)\s*\n[=\-]{3,}/gm,
        // Email domain extraction as fallback
        /@([a-z0-9\-]{3,})\.(de|com|net|org)/gi
      ],

      // Contract details
      contractNumber: [
        /(?:Vertrags|Police|Versicherungsschein|Kunden|Mitglieds|Referenz)[\s\-]*(?:nummer|nr\.?)[\s:]+([A-Z0-9\-\/]+)/gi,
        /(?:Contract|Policy)[\s\-]*(?:number|no\.?)[\s:]+([A-Z0-9\-\/]+)/gi,
        /Policennummer[\s:]+([A-Z0-9\-\/]+)/gi,
        /Police[\s:]+([A-Z0-9\-\/]+)/gi
      ],

      customerNumber: [
        /(?:Kunden|Mitglieds|Partner|Versicherungsnehmer)[\s\-]*(?:nummer|nr\.?)[\s:]+([A-Z0-9\-\/]+)/gi,
        /(?:Customer|Member)[\s\-]*(?:number|no\.?)[\s:]+([A-Z0-9\-\/]+)/gi
      ],

      // ENHANCED Date patterns with priorities
      datesPriority1: [
        // 🆕 Kündigungsbestätigung patterns - HÖCHSTE Priorität
        /(?:Kündigung\s+wirksam\s+zum|wirksam\s+zum|gekündigt\s+zum|endet\s+zum)[\s:]*(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // Explicit markers - highest confidence
        /(?:ABLAUF|Vertragsende|Ablauf|Laufzeit\s+bis|Gültig\s+bis|Befristet\s+bis|endet\s+am|läuft\s+ab\s+am)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(?:Ende|Enddatum|Ablaufdatum|bis\s+zum)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(?:BEGINN|Vertragsbeginn|Beginn|Versicherungsbeginn|Gültig\s+ab|ab\s+dem)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(?:Start|Anfang|Startdatum|Vertragsdatum)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
      ],

      // 🆕 Briefdatum-Pattern (zum AUSSCHLIESSEN von Ablaufdatum-Erkennung)
      letterDatePattern: /^[A-ZÄÖÜa-zäöüß]+,?\s*(?:den\s+)?(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gm,

      datesPriority2: [
        // Insurance-specific patterns
        /(?:Hauptfälligkeit|Fälligkeit)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})?/gi,
        /(?:jährlich\s+zum|jeweils\s+zum|verlängert\s+sich\s+zum)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+/gi,
        /(?:gültig\s+)?ab[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
      ],

      datesPriority3: [
        // Generic patterns - lowest confidence
        /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/g
      ],

      // Contract duration patterns (Laufzeit)
      contractDuration: [
        /laufzeit[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /vertragsdauer[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /läuft\s+(?:zunächst\s+)?(\d+|ein|zwei|drei)\s*(jahr|monat|tag)/gi,
        /mindestlaufzeit[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /erstlaufzeit[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /für\s+(\d+|ein|zwei|drei)\s*(jahr|monat)(?:e)?/gi,
        // Annual patterns for insurance
        /jährlich(?:e)?(?:\s+verlängerung)?/gi,
        /(?:verlängert\s+sich\s+)?(?:jeweils\s+)?(?:um\s+)?ein\s+jahr/gi
      ],

      // ENHANCED Cancellation period patterns with complex cases
      cancellationPeriod: [
        // Complex patterns FIRST
        /(\d+)\s*monat[e]?\s+zum\s+quartalsende/gi,
        /(\d+)\s*woche[n]?\s+zum\s+monatsende/gi,
        /(\d+)\s*monat[e]?\s+zum\s+monatsende/gi,
        /bis\s+zum\s+(\d+)\.\s+des\s+(?:vor)?monats/gi,

        // Daily cancellation
        /täglich\s+(?:kündbar|gekündigt)/gi,
        /tägliche[rs]?\s+kündigungsrecht/gi,
        /jederzeit\s+(?:kündbar|gekündigt)/gi,
        /ohne\s+(?:kündigungsfrist|frist)/gi,
        /fristlos\s+kündbar/gi,

        // Standard patterns with time periods
        /kündigungsfrist[\s:]+(\d+)\s*(monat|woche|tag)/gi,
        /kündigung.*?(\d+)\s*(monat|woche|tag).*?vor/gi,
        /(\d+)\s*(monat|woche|tag).*?kündig/gi,
        /frist\s+von\s+(\d+)\s*(monat|woche|tag)/gi,
        /spätestens\s*(\d+)\s*(monat|woche|tag)/gi,
        /mindestens\s*(\d+)\s*(monat|woche|tag).*?vorher/gi,
        /(\d+)\s*(monat|woche|tag).*?zum\s+(?:ende|ablauf)/gi,
        /mit\s+einer\s+frist\s+von\s+(\d+)\s*(monat|woche|tag)/gi,

        // End of period patterns
        /zum\s+ende\s+der\s+(?:vertrags)?laufzeit/gi,
        /zum\s+ablauf\s+der\s+(?:vertrags)?laufzeit/gi
      ],

      // 🆕 Mindestlaufzeit / Erstlaufzeit patterns - "Kündigung ab X Monat möglich"
      minimumTerm: [
        // "Kündigung ab dem 6. Monat möglich"
        /kündigung\s+(?:erst\s+)?ab\s+(?:dem\s+)?(\d+)\.?\s*monat/gi,
        // "nach 6 Monaten kündbar"
        /nach\s+(\d+)\s*monat(?:en)?\s+kündbar/gi,
        // "frühestens nach 6 Monaten"
        /frühestens\s+(?:nach\s+)?(\d+)\s*monat/gi,
        // "Mindestlaufzeit 6 Monate"
        /mindestlaufzeit[\s:]*(\d+)\s*monat/gi,
        // "Erstlaufzeit 12 Monate"
        /erstlaufzeit[\s:]*(\d+)\s*monat/gi,
        // "Mindestvertragslaufzeit"
        /mindest(?:vertrags)?laufzeit[\s:]*(\d+)\s*monat/gi,
        // "erst nach Ablauf von 6 Monaten"
        /erst\s+nach\s+(?:ablauf\s+von\s+)?(\d+)\s*monat/gi,
        // "Vertrag kann ab 6 Monaten gekündigt werden"
        /(?:vertrag\s+)?kann\s+ab\s+(\d+)\s*monat(?:en)?\s+(?:ge)?kündigt/gi,
        // "bindungsfrist 6 monate"
        /bindungsfrist[\s:]*(\d+)\s*monat/gi,
        // "Mindestbindung 12 Monate"
        /mindestbindung[\s:]*(\d+)\s*monat/gi
      ],

      // Auto-renewal patterns (with negation checks)
      autoRenewal: [
        /verlängert\s*sich\s*(?:automatisch|stillschweigend)/gi,
        /automatische\s*verlängerung/gi,
        /stillschweigende\s*verlängerung/gi,
        /jeweils\s*(?:um\s*)?(?:ein|1)\s*(?:weiteres\s*)?jahr/gi,
        /jährlich\s*verlänger/gi,
        /erneuert\s*sich\s*automatisch/gi,
        /auto.*?renewal/gi,
        /vertrag\s*verlängert\s*sich/gi
      ],

      // Negation patterns for auto-renewal
      autoRenewalNegation: [
        /verlängert\s+sich\s+nicht/gi,
        /keine\s+(?:automatische|stillschweigende)\s+verlängerung/gi,
        /endet\s+(?:automatisch|endgültig)/gi,
        /nicht\s+(?:automatisch|stillschweigend)\s+verlänger/gi,
        /ohne\s+(?:automatische|stillschweigende)\s+verlängerung/gi
      ],

      // Costs
      monthlyCost: [
        /(?:Monatsbeitrag|Monatlich|mtl\.|pro\s+Monat)[\s:]+([0-9.,]+)\s*€/gi,
        /([0-9.,]+)\s*€\s*(?:\/\s*Monat|monatlich)/gi
      ],

      annualCost: [
        /(?:Jahresbeitrag|Jährlich|pro\s+Jahr)[\s:]+([0-9.,]+)\s*€/gi,
        /([0-9.,]+)\s*€\s*(?:\/\s*Jahr|jährlich)/gi
      ]
    };
  }

  /**
   * 🆕 OCR-FEHLERKORREKTUR - Preprocessing des Texts
   */
  preprocessOCRText(text) {
    console.log('🔧 OCR-Fehlerkorrektur wird angewendet...');

    let corrected = text
      // O statt 0
      .replace(/O(\d)/g, '0$1')
      .replace(/(\d)O/g, '$10')

      // l oder I statt 1
      .replace(/l(\d)/g, '1$1')
      .replace(/(\d)l/g, '$11')
      .replace(/I(\d)/g, '1$1')
      .replace(/(\d)I/g, '$11')

      // Komma statt Punkt in Daten
      .replace(/(\d{1,2}),(\d{1,2}),(\d{2,4})/g, '$1.$2.$3')
      .replace(/(\d{1,2});(\d{1,2});(\d{2,4})/g, '$1.$2.$3')

      // Leerzeichen in Daten entfernen
      .replace(/(\d{1,2})\s+\.\s+(\d{1,2})\s+\.\s+(\d{2,4})/g, '$1.$2.$3')

      // Doppelte Punkte
      .replace(/\.{2,}/g, '.');

    return corrected;
  }

  /**
   * 🆕 PLAUSIBILITÄTSCHECK für Daten
   */
  isPlausibleDate(date, role, contractType, text) {
    if (!date || isNaN(date.getTime())) return { valid: false, reason: 'Invalid date object' };

    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

    // Datum nicht in ferner Zukunft (>10 Jahre)
    if (date > tenYearsFromNow) {
      return { valid: false, reason: 'Date too far in future (>10 years)' };
    }

    // Datum nicht vor 1990
    if (date.getFullYear() < 1990) {
      return { valid: false, reason: 'Date before 1990' };
    }

    // Rolle-spezifische Checks
    if (role === 'end') {
      // Ablaufdatum kann in Vergangenheit liegen (wird später für Auto-Renewal adjustiert)
      // Aber nicht mehr als 5 Jahre zurück
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      if (date < fiveYearsAgo) {
        return { valid: false, reason: 'End date more than 5 years in past' };
      }
    }

    if (role === 'start') {
      // Startdatum sollte nicht weit in Zukunft liegen
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      if (date > sixMonthsFromNow) {
        return { valid: false, reason: 'Start date more than 6 months in future' };
      }
    }

    return { valid: true };
  }

  /**
   * 🆕 KONFIDENZ-SCORING für Datumsextraktion
   */
  scoreDateExtraction(date, context, position, textLength, role, contractType) {
    let confidence = 0;

    // Base confidence
    confidence += 20;

    // +40: Expliziter Marker gefunden
    if (role === 'end' && context.match(/(?:ablauf|ende|enddatum|bis|läuft|endet|befristet|gültig\s+bis)/i)) {
      confidence += 40;
    } else if (role === 'start' && context.match(/(?:beginn|start|anfang|ab\s+dem|vertragsbeginn)/i)) {
      confidence += 40;
    } else {
      confidence += 10; // Schwacher Kontext
    }

    // +20: Im ersten Drittel des Dokuments
    if (position < textLength / 3) {
      confidence += 15;
    } else if (position < textLength / 2) {
      confidence += 5;
    }

    // +20: Plausibilitätscheck bestanden
    const plausibility = this.isPlausibleDate(date, role, contractType, context);
    if (plausibility.valid) {
      confidence += 20;
    } else {
      confidence -= 30; // Penalty für unplausible Daten
    }

    // +5: Passt zu Vertragstyp-Erwartung
    if (this.matchesContractTypeExpectation(date, contractType, role)) {
      confidence += 5;
    }

    return Math.max(0, Math.min(100, confidence)); // Clamp 0-100
  }

  /**
   * 🆕 Check ob Datum zu Vertragstyp-Erwartung passt
   */
  matchesContractTypeExpectation(date, contractType, role) {
    if (!contractType || !date) return false;

    const defaults = this.contractDefaults[contractType];
    if (!defaults) return false;

    // Einfacher Check: Ist das Datum in einem plausiblen Bereich?
    // (Könnte erweitert werden)
    return true;
  }

  /**
   * Extract provider directly from text WITHOUT database
   */
  extractProviderFromText(text) {
    console.log('🔍 Extrahiere Provider direkt aus Text...');

    // 🔒 MINIMUM CONFIDENCE THRESHOLD - Provider wird NUR angezeigt wenn >= 90%
    const MIN_CONFIDENCE_THRESHOLD = 90;

    // First check for known providers with special patterns
    // ⚠️ WICHTIG: Nur eindeutige Patterns mit hoher Konfidenz verwenden!
    const specialProviders = [
      { pattern: /adam\s*riese/gi, name: 'Adam Riese', confidence: 95 },
      { pattern: /ADAM\s*RIESE/g, name: 'Adam Riese', confidence: 95 },
      { pattern: /allianz\s*(?:versicherung|direct|ag)?/gi, name: 'Allianz', confidence: 95 },
      { pattern: /ing[\s\-]?diba/gi, name: 'ING-DiBa', confidence: 95 },
      // ⚠️ ENTFERNT: /\bing\b/gi war zu aggressiv - matchte jedes "ing" im Text
      // ING muss jetzt als "ING-DiBa" oder mit Bank-Kontext erkannt werden
      { pattern: /\bING\s+(?:Bank|Konto|Girokonto)/g, name: 'ING', confidence: 92 },
      { pattern: /deutsche?\s*telekom/gi, name: 'Telekom', confidence: 95 },
      { pattern: /telekom\s*deutschland/gi, name: 'Telekom', confidence: 95 },
      { pattern: /vodafone\s*(?:gmbh|deutschland)?/gi, name: 'Vodafone', confidence: 95 },
      { pattern: /o2\s*telefonica/gi, name: 'O2 Telefonica', confidence: 95 },
      { pattern: /telefonica\s*germany/gi, name: 'O2 Telefonica', confidence: 95 },
      { pattern: /\baxa\s*(?:versicherung|ag)?/gi, name: 'AXA', confidence: 92 },
      { pattern: /\bergo\s*(?:versicherung|group|ag)?/gi, name: 'ERGO', confidence: 92 },
      { pattern: /huk[\s\-]?coburg/gi, name: 'HUK-Coburg', confidence: 95 },
      // ⚠️ ENTFERNT: /\bhuk\b/gi war zu kurz und unspezifisch
      { pattern: /debeka\s*(?:versicherung|krankenversicherung)?/gi, name: 'Debeka', confidence: 92 },
      { pattern: /r\+v\s*versicherung/gi, name: 'R+V Versicherung', confidence: 95 },
      { pattern: /generali\s*(?:versicherung|deutschland)?/gi, name: 'Generali', confidence: 92 },
      { pattern: /zurich\s*(?:versicherung|insurance)?/gi, name: 'Zurich', confidence: 92 },
      { pattern: /signal\s*iduna/gi, name: 'Signal Iduna', confidence: 95 },
      { pattern: /techniker\s*krankenkasse/gi, name: 'Techniker Krankenkasse', confidence: 95 },
      // ⚠️ ENTFERNT: /\btk\b/gi war zu kurz - "TK" könnte vieles sein
      { pattern: /\baok\s*(?:plus|bayern|niedersachsen|nordost|rheinland)?/gi, name: 'AOK', confidence: 92 },
      { pattern: /barmer\s*(?:gek|ersatzkasse)?/gi, name: 'Barmer', confidence: 92 },
      { pattern: /dak[\s\-]?gesundheit/gi, name: 'DAK-Gesundheit', confidence: 95 },
      // ⚠️ ENTFERNT: /dak/gi war zu kurz
      { pattern: /bavariadirekt/gi, name: 'BavariaDirekt Versicherung AG', confidence: 95 },
      { pattern: /bavaria\s*direkt/gi, name: 'BavariaDirekt Versicherung AG', confidence: 95 }
    ];

    // Check for special providers first
    for (const special of specialProviders) {
      const matches = text.match(special.pattern);
      if (matches && matches.length > 0) {
        // 🔒 NUR zurückgeben wenn Konfidenz >= Schwellenwert
        if (special.confidence >= MIN_CONFIDENCE_THRESHOLD) {
          console.log(`✅ Bekannter Provider gefunden: "${special.name}" (Konfidenz: ${special.confidence}% >= ${MIN_CONFIDENCE_THRESHOLD}%)`);
          return {
            name: special.name,
            displayName: special.name,
            confidence: special.confidence,
            extractedFromText: true
          };
        } else {
          console.log(`⚠️ Provider "${special.name}" gefunden, aber Konfidenz zu niedrig: ${special.confidence}% < ${MIN_CONFIDENCE_THRESHOLD}%`);
        }
      }
    }

    let bestMatch = null;
    let highestConfidence = 0;

    // Then try general patterns
    for (const pattern of this.patterns.provider) {
      const matches = Array.from(text.matchAll(pattern));

      for (const match of matches) {
        let providerName = match[1] || match[0];

        // Clean up the provider name
        providerName = providerName
          .replace(/^(?:Versicherer|Versicherung|Gesellschaft|Anbieter|Unternehmen|zwischen|und|Vertragspartner)[\s:]*/gi, '')
          .replace(/[\s:]+$/, '')
          .trim();

        // Skip if too short or invalid
        if (!providerName || providerName.length < 2) continue;

        // Skip common false positives
        if (providerName.toLowerCase() === 'en' ||
            providerName.toLowerCase() === 'de' ||
            providerName.toLowerCase() === 'und' ||
            providerName.toLowerCase() === 'oder') continue;

        // Calculate confidence based on pattern and position
        let confidence = 50;

        // Higher confidence for legal forms
        if (providerName.match(/(?:AG|GmbH|SE|KG|Bank|Versicherung|mbH)$/)) {
          confidence += 30;
        }

        // Higher confidence if found in first 1000 chars
        const position = match.index || 0;
        if (position < 1000) {
          confidence += 20;
        }

        console.log(`📊 Möglicher Provider gefunden: "${providerName}" (Konfidenz: ${confidence}%)`);

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = providerName;
        }
      }
    }

    if (bestMatch) {
      // 🔒 NUR zurückgeben wenn Konfidenz >= Schwellenwert
      if (highestConfidence >= MIN_CONFIDENCE_THRESHOLD) {
        console.log(`✅ Bester Provider-Match: "${bestMatch}" (Konfidenz: ${highestConfidence}% >= ${MIN_CONFIDENCE_THRESHOLD}%)`);

        // Clean up display name
        const displayName = bestMatch
          .replace(/(?:AG|GmbH|SE|KG|OHG|e\.V\.|mbH|GmbH\s&\sCo\.\sKG).*$/i, '')
          .trim();

        return {
          name: bestMatch,
          displayName: displayName,
          confidence: highestConfidence,
          extractedFromText: true
        };
      } else {
        console.log(`⚠️ Provider "${bestMatch}" gefunden, aber Konfidenz zu niedrig: ${highestConfidence}% < ${MIN_CONFIDENCE_THRESHOLD}% - NICHT VERWENDEN`);
      }
    }

    console.log('⚠️ Kein Provider mit ausreichender Konfidenz gefunden - returning NULL (besser NULL als falsche Daten!)');
    return null; // Better NULL than wrong data!
  }

  extractPattern(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim() || null;
      }
    }
    return null;
  }

  parseGermanDate(dateStr) {
    if (!dateStr) return null;

    // Handle DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const parts = dateStr.split(/[.\/-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      let year = parseInt(parts[2]);

      // Handle 2-digit years
      if (year < 100) {
        year += year < 30 ? 2000 : 1900;
      }

      return new Date(year, month, day);
    }
    return null;
  }

  /**
   * 🆕 Erkennt Briefdatum (z.B. "Berlin, 10.12.2025") und gibt es zurück
   * Wird verwendet um diese Daten von der Ablaufdatum-Erkennung auszuschließen
   */
  extractLetterDate(text) {
    // Pattern: Stadt, Datum oder Stadt, den Datum
    const letterDatePatterns = [
      /^([A-ZÄÖÜa-zäöüß]+),?\s*(?:den\s+)?(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gm,
      /([A-ZÄÖÜa-zäöüß]+),\s*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/g
    ];

    const letterDates = [];

    for (const pattern of letterDatePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        // Prüfe ob es eine Stadt ist (häufige deutsche Städte)
        const possibleCity = match[1]?.toLowerCase();
        const commonCities = ['berlin', 'münchen', 'hamburg', 'köln', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig', 'bremen', 'dresden', 'hannover', 'nürnberg', 'duisburg', 'bochum', 'wuppertal', 'bielefeld', 'bonn', 'mannheim', 'karlsruhe', 'augsburg', 'wiesbaden', 'gelsenkirchen', 'mönchengladbach', 'braunschweig', 'chemnitz', 'kiel', 'aachen', 'halle', 'magdeburg', 'freiburg', 'krefeld', 'lübeck', 'oberhausen', 'erfurt', 'mainz', 'rostock', 'kassel', 'hagen', 'hamm', 'saarbrücken', 'mülheim', 'potsdam', 'ludwigshafen', 'oldenburg', 'leverkusen', 'osnabrück', 'solingen', 'heidelberg', 'herne', 'neuss', 'darmstadt', 'paderborn', 'regensburg', 'ingolstadt', 'würzburg', 'wolfsburg', 'ulm', 'heilbronn', 'göttingen', 'pforzheim', 'offenbach', 'bottrop', 'reutlingen', 'durmersheim'];

        if (commonCities.includes(possibleCity)) {
          const day = parseInt(match[2]);
          const month = parseInt(match[3]);
          let year = parseInt(match[4]);
          if (year < 100) year += 2000;

          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            letterDates.push({
              date: date,
              city: match[1],
              dateString: `${day}.${month}.${year}`
            });
            console.log(`📮 Briefdatum erkannt: ${match[1]}, ${day}.${month}.${year}`);
          }
        }
      }
    }

    return letterDates;
  }

  /**
   * 🆕 ENHANCED: Multi-Pass Datumsextraktion mit Konfidenz-Scoring
   */
  extractDates(text, contractType) {
    console.log('📅 Multi-Pass Datumsextraktion gestartet...');

    // 🆕 Extrahiere Briefdaten zum Ausschließen
    const letterDates = this.extractLetterDate(text);
    const letterDateStrings = letterDates.map(ld => ld.dateString);

    let startDate = null;
    let endDate = null;
    let startDateConfidence = 0;
    let endDateConfidence = 0;

    const textLength = text.length;

    // ========== PASS 1: Explizite Marker (Hohe Konfidenz) ==========
    console.log('🔍 Pass 1: Explizite Datums-Marker...');

    for (const pattern of this.patterns.datesPriority1) {
      const matches = Array.from(text.matchAll(pattern));

      for (const match of matches) {
        let dateStr;

        if (match[3]) {
          dateStr = `${match[1]}.${match[2]}.${match[3]}`;
        } else if (match[2]) {
          const currentYear = new Date().getFullYear();
          dateStr = `${match[1]}.${match[2]}.${currentYear}`;
        } else {
          continue;
        }

        const date = this.parseGermanDate(dateStr);
        if (!date || isNaN(date.getTime())) continue;

        // 🆕 Prüfe ob es ein Briefdatum ist - wenn ja, ÜBERSPRINGEN (außer bei expliziten Kündigungs-Markern)
        const isLetterDate = letterDateStrings.some(lds => {
          const d = date.getDate();
          const m = date.getMonth() + 1;
          const y = date.getFullYear();
          return lds === `${d}.${m}.${y}`;
        });

        // Get context
        const contextStart = Math.max(0, match.index - 150);
        const contextEnd = Math.min(text.length, match.index + 150);
        const context = text.substring(contextStart, contextEnd).toLowerCase();

        // 🆕 Wenn Briefdatum und KEIN expliziter Kündigungs-Marker → überspringen
        const isCancellationMarker = context.match(/(?:kündigung\s+wirksam|wirksam\s+zum|gekündigt\s+zum)/i);
        if (isLetterDate && !isCancellationMarker) {
          console.log(`📮 Briefdatum übersprungen: ${dateStr}`);
          continue;
        }

        // Determine role
        const isStartMarker = context.match(/(?:beginn|start|anfang|ab\s+dem|versicherungsbeginn|vertragsbeginn)/i);
        const isEndMarker = context.match(/(?:ablauf|ende|enddatum|bis|läuft|endet|befristet|gültig\s+bis|hauptfälligkeit|kündigung\s+wirksam|wirksam\s+zum)/i);

        if (isStartMarker && !startDate) {
          const confidence = this.scoreDateExtraction(date, context, match.index, textLength, 'start', contractType);
          if (confidence > startDateConfidence) {
            startDate = date;
            startDateConfidence = confidence;
            console.log(`✅ Startdatum gefunden (Pass 1): ${date.toISOString()} (Konfidenz: ${confidence}%)`);
          }
        }

        if (isEndMarker && !endDate) {
          const confidence = this.scoreDateExtraction(date, context, match.index, textLength, 'end', contractType);
          if (confidence > endDateConfidence) {
            endDate = date;
            endDateConfidence = confidence;
            console.log(`✅ Enddatum gefunden (Pass 1): ${date.toISOString()} (Konfidenz: ${confidence}%)`);
          }
        }
      }
    }

    // ========== PASS 2: Versicherungs-spezifische Patterns (Mittlere Konfidenz) ==========
    if (!endDate || endDateConfidence < 70) {
      console.log('🔍 Pass 2: Versicherungs-spezifische Patterns...');

      for (const pattern of this.patterns.datesPriority2) {
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
          let dateStr;

          if (match[3]) {
            dateStr = `${match[1]}.${match[2]}.${match[3]}`;
          } else if (match[2]) {
            const currentYear = new Date().getFullYear();
            dateStr = `${match[1]}.${match[2]}.${currentYear}`;
          } else {
            continue;
          }

          const date = this.parseGermanDate(dateStr);
          if (!date || isNaN(date.getTime())) continue;

          const contextStart = Math.max(0, match.index - 100);
          const contextEnd = Math.min(text.length, match.index + 100);
          const context = text.substring(contextStart, contextEnd);

          const confidence = this.scoreDateExtraction(date, context, match.index, textLength, 'end', contractType);

          if (confidence > endDateConfidence && confidence > 40) {
            endDate = date;
            endDateConfidence = confidence;
            console.log(`✅ Enddatum gefunden (Pass 2): ${date.toISOString()} (Konfidenz: ${confidence}%)`);
          }
        }
      }
    }

    // ========== PASS 3: Generic Patterns mit Kontext-Analyse (Niedrige Konfidenz) ==========
    if ((!startDate && !endDate) || (startDateConfidence < 50 && endDateConfidence < 50)) {
      console.log('🔍 Pass 3: Generic Patterns mit Kontext-Analyse...');

      const allDates = [];

      for (const pattern of this.patterns.datesPriority3) {
        const matches = Array.from(text.matchAll(pattern));

        for (const match of matches) {
          const dateStr = `${match[1]}.${match[2]}.${match[3]}`;
          const date = this.parseGermanDate(dateStr);

          if (!date || isNaN(date.getTime())) continue;

          const contextStart = Math.max(0, match.index - 200);
          const contextEnd = Math.min(text.length, match.index + 200);
          const context = text.substring(contextStart, contextEnd).toLowerCase();

          // Plausibilitätscheck
          const plausibility = this.isPlausibleDate(date, null, contractType, context);
          if (!plausibility.valid) continue;

          allDates.push({
            date,
            context,
            index: match.index,
            isStart: context.match(/(?:beginn|start|anfang|ab|versicherungsbeginn)/i) !== null,
            isEnd: context.match(/(?:ablauf|ende|bis|läuft|endet|befristet)/i) !== null
          });
        }
      }

      // Analyze collected dates
      for (const dateInfo of allDates) {
        if (dateInfo.isStart && !startDate) {
          const confidence = this.scoreDateExtraction(dateInfo.date, dateInfo.context, dateInfo.index, textLength, 'start', contractType);
          if (confidence > startDateConfidence && confidence > 30) {
            startDate = dateInfo.date;
            startDateConfidence = confidence;
            console.log(`✅ Startdatum gefunden (Pass 3): ${startDate.toISOString()} (Konfidenz: ${confidence}%)`);
          }
        }

        if (dateInfo.isEnd && !endDate) {
          const confidence = this.scoreDateExtraction(dateInfo.date, dateInfo.context, dateInfo.index, textLength, 'end', contractType);
          if (confidence > endDateConfidence && confidence > 30) {
            endDate = dateInfo.date;
            endDateConfidence = confidence;
            console.log(`✅ Enddatum gefunden (Pass 3): ${endDate.toISOString()} (Konfidenz: ${confidence}%)`);
          }
        }
      }

      // Fallback: Sortiere nach Datum
      if (!startDate && !endDate && allDates.length >= 2) {
        allDates.sort((a, b) => a.date - b.date);

        const firstDate = allDates[0];
        const lastDate = allDates[allDates.length - 1];

        startDate = firstDate.date;
        startDateConfidence = 30;
        endDate = lastDate.date;
        endDateConfidence = 30;

        console.log(`⚠️ Fallback: Erstes/Letztes Datum verwendet (Konfidenz: 30%)`);
      }
    }

    // ========== PASS 4: Intelligente Schätzung (Falls immer noch kein Datum) ==========
    if (!endDate && startDate && contractType) {
      console.log('🔍 Pass 4: Intelligente Schätzung basierend auf Vertragstyp...');

      const defaults = this.contractDefaults[contractType];
      if (defaults) {
        endDate = new Date(startDate);

        if (defaults.duration.unit === 'years') {
          endDate.setFullYear(endDate.getFullYear() + defaults.duration.value);
        } else if (defaults.duration.unit === 'months') {
          endDate.setMonth(endDate.getMonth() + defaults.duration.value);
        }

        endDateConfidence = defaults.confidence;
        console.log(`✅ Enddatum geschätzt (${contractType}): ${endDate.toISOString()} (Konfidenz: ${endDateConfidence}%)`);
      }
    }

    console.log('📊 Datumsextraktion abgeschlossen:', {
      startDate: startDate?.toISOString() || 'nicht gefunden',
      startDateConfidence: `${startDateConfidence}%`,
      endDate: endDate?.toISOString() || 'nicht gefunden',
      endDateConfidence: `${endDateConfidence}%`
    });

    return {
      startDate,
      endDate,
      startDateConfidence,
      endDateConfidence
    };
  }

  /**
   * Extract contract duration (Laufzeit) - NOT cancellation period!
   */
  extractContractDuration(text) {
    console.log('🔍 Extrahiere Vertragslaufzeit...');

    // Check for annual contracts first (common for insurance)
    if (text.match(/jährlich(?:e)?(?:\s+verlängerung)?/gi) ||
        text.match(/(?:verlängert\s+sich\s+)?(?:jeweils\s+)?(?:um\s+)?ein\s+jahr/gi)) {
      console.log('✅ Jährliche Vertragslaufzeit erkannt');
      return {
        value: 1,
        unit: 'years',
        inMonths: 12,
        confidence: 80
      };
    }

    for (const pattern of this.patterns.contractDuration) {
      const matches = Array.from(text.matchAll(pattern));

      for (const match of matches) {
        let value = match[1];
        const unit = match[2]?.toLowerCase();

        if (!unit) continue;

        // Convert text numbers to digits
        const textToNumber = {
          'ein': 1, 'eine': 1, 'einen': 1,
          'zwei': 2,
          'drei': 3
        };

        if (textToNumber[value]) {
          value = textToNumber[value];
        } else {
          value = parseInt(value);
        }

        if (value && unit && value > 0 && value < 100) { // Sanity check
          const unitMap = {
            'jahr': 'years',
            'jahre': 'years',
            'monat': 'months',
            'monate': 'months',
            'tag': 'days',
            'tage': 'days'
          };

          const mappedUnit = unitMap[unit] || 'years';
          const inMonths = mappedUnit === 'years' ? value * 12 :
                           mappedUnit === 'months' ? value :
                           Math.round(value / 30); // days to months

          console.log(`✅ Vertragslaufzeit gefunden: ${value} ${unit} (Konfidenz: 85%)`);

          return {
            value: value,
            unit: mappedUnit,
            inMonths: Math.round(inMonths),
            confidence: 85
          };
        }
      }
    }

    // DEFAULT for insurance contracts
    if (text.toLowerCase().includes('versicherung') || text.toLowerCase().includes('police')) {
      console.log('✅ Standard-Versicherungslaufzeit: 1 Jahr (Konfidenz: 60%)');
      return {
        value: 1,
        unit: 'years',
        inMonths: 12,
        confidence: 60
      };
    }

    console.log('⚠️ Keine Vertragslaufzeit gefunden - returning NULL');
    return null;
  }

  /**
   * 🆕 ENHANCED: Extract cancellation period with complex patterns
   */
  extractCancellationPeriod(text) {
    console.log('🔍 Extrahiere Kündigungsfrist...');

    // PRIORITY 1: Check for complex patterns FIRST
    const complexPatterns = [
      {
        pattern: /(\d+)\s*monat[e]?\s+zum\s+quartalsende/gi,
        type: 'quarterly_deadline',
        calculate: (value) => ({ value, unit: 'months', inDays: value * 30, type: 'quarterly_deadline', confidence: 85 })
      },
      {
        pattern: /(\d+)\s*woche[n]?\s+zum\s+monatsende/gi,
        type: 'monthly_deadline',
        calculate: (value) => ({ value, unit: 'weeks', inDays: value * 7, type: 'monthly_deadline', confidence: 85 })
      },
      {
        pattern: /(\d+)\s*monat[e]?\s+zum\s+monatsende/gi,
        type: 'monthly_deadline',
        calculate: (value) => ({ value, unit: 'months', inDays: value * 30, type: 'monthly_deadline', confidence: 85 })
      }
    ];

    for (const complexPattern of complexPatterns) {
      const match = text.match(complexPattern.pattern);
      if (match) {
        const value = parseInt(match[1]);
        console.log(`✅ Komplexe Kündigungsfrist gefunden: ${value} ${complexPattern.type}`);
        return complexPattern.calculate(value);
      }
    }

    // PRIORITY 2: Check for daily/immediate cancellation
    const dailyPatterns = [
      /täglich[\s\(]/gi,
      /täglich\s+(?:kündbar|gekündigt|kündigen)/gi,
      /tägliche[rs]?\s+kündigungsrecht/gi,
      /jederzeit\s+(?:kündbar|gekündigt|kündigen)/gi,
      /ohne\s+(?:kündigungsfrist|frist)/gi,
      /fristlos\s+kündbar/gi,
      /täglich\s*\(jedoch\s+nicht\s+rückwirkend\)/gi
    ];

    for (const pattern of dailyPatterns) {
      const match = text.match(pattern);
      if (match) {
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(text.length, match.index + 100);
        const context = text.substring(contextStart, contextEnd).toLowerCase();

        if (context.includes('kündig') || context.includes('vertrag')) {
          console.log('✅ Tägliche Kündigung möglich! (Konfidenz: 90%)');
          return {
            value: 0,
            unit: 'days',
            inDays: 0,
            type: 'daily',
            confidence: 90
          };
        }
      }
    }

    // PRIORITY 3: End of period patterns
    const endOfPeriodPatterns = [
      /zum\s+ende\s+der\s+(?:vertrags)?laufzeit/gi,
      /zum\s+ablauf\s+der\s+(?:vertrags)?laufzeit/gi,
      /ende\s+der\s+vertragslaufzeit/gi
    ];

    const hasDaily = /täglich/i.test(text);
    if (!hasDaily) {
      for (const pattern of endOfPeriodPatterns) {
        if (pattern.test(text)) {
          console.log('✅ Kündigung zum Ende der Vertragslaufzeit möglich (Konfidenz: 75%)');
          return {
            value: 0,
            unit: 'days',
            inDays: 0,
            type: 'end_of_period',
            confidence: 75
          };
        }
      }
    }

    // PRIORITY 4: Standard patterns with specific time periods
    for (const pattern of this.patterns.cancellationPeriod) {
      const matches = Array.from(text.matchAll(pattern));

      for (const match of matches) {
        if (!match[1]) continue;

        const value = parseInt(match[1]);
        const unit = match[2]?.toLowerCase();

        if (value && unit && value > 0 && value < 365) {
          const unitMap = {
            'tag': 'days',
            'tage': 'days',
            'woche': 'weeks',
            'wochen': 'weeks',
            'monat': 'months',
            'monate': 'months'
          };

          const mappedUnit = unitMap[unit] || (unit.includes('monat') ? 'months' : unit.includes('woche') ? 'weeks' : 'days');
          const inDays = mappedUnit === 'months' ? value * 30 : mappedUnit === 'weeks' ? value * 7 : value;

          console.log(`✅ Kündigungsfrist gefunden: ${value} ${unit} (${inDays} Tage) (Konfidenz: 80%)`);

          return {
            value: value,
            unit: mappedUnit,
            inDays: inDays,
            type: 'standard',
            confidence: 80
          };
        }
      }
    }

    // Special terms
    if (text.match(/quartal/i) && text.match(/kündig/i)) {
      console.log('✅ Kündigungsfrist: Quartal (90 Tage) (Konfidenz: 70%)');
      return { value: 3, unit: 'months', inDays: 90, type: 'quarterly', confidence: 70 };
    }
    if (text.match(/halbjahr/i) && text.match(/kündig/i)) {
      console.log('✅ Kündigungsfrist: Halbjahr (180 Tage) (Konfidenz: 70%)');
      return { value: 6, unit: 'months', inDays: 180, type: 'half-yearly', confidence: 70 };
    }

    console.log('⚠️ Keine Kündigungsfrist gefunden - returning NULL');
    return null;
  }

  /**
   * 🆕 EXTRAHIERT MINDESTLAUFZEIT / ERSTLAUFZEIT
   * Erkennt Klauseln wie "Kündigung ab dem 6. Monat möglich", "Mindestlaufzeit 12 Monate"
   * Returns: { months: number, canCancelAfterDate: Date | null } oder null
   */
  extractMinimumTerm(text, startDate = null) {
    const lowerText = text.toLowerCase();

    console.log('🔍 Suche nach Mindestlaufzeit/Erstlaufzeit...');

    for (const pattern of this.patterns.minimumTerm) {
      // Reset lastIndex für globale Regex
      pattern.lastIndex = 0;
      const match = pattern.exec(lowerText);

      if (match) {
        const months = parseInt(match[1]);

        if (months > 0 && months <= 120) { // Max 10 Jahre sinnvoll
          console.log(`✅ Mindestlaufzeit gefunden: ${months} Monate - Pattern: ${pattern.source.substring(0, 40)}...`);

          // Berechne das Datum ab wann gekündigt werden kann
          let canCancelAfterDate = null;
          if (startDate) {
            const startDateObj = new Date(startDate);
            canCancelAfterDate = new Date(startDateObj);
            canCancelAfterDate.setMonth(canCancelAfterDate.getMonth() + months);
            console.log(`📅 Kündigung möglich ab: ${canCancelAfterDate.toLocaleDateString('de-DE')}`);
          }

          return {
            months: months,
            inDays: months * 30,
            canCancelAfterDate: canCancelAfterDate,
            source: 'extracted',
            confidence: 85
          };
        }
      }
    }

    // Fallback: Suche nach generischen Mustern
    const genericPatterns = [
      /(\d+)\s*monat(?:e|en)?\s*(?:mindest)?(?:laufzeit|bindung)/gi,
      /(?:mindest|erst)(?:laufzeit|bindung)\s*(?:von|:)?\s*(\d+)\s*monat/gi
    ];

    for (const pattern of genericPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(lowerText);
      if (match) {
        const months = parseInt(match[1] || match[2]);
        if (months > 0 && months <= 120) {
          console.log(`✅ Mindestlaufzeit gefunden (generic): ${months} Monate`);

          let canCancelAfterDate = null;
          if (startDate) {
            const startDateObj = new Date(startDate);
            canCancelAfterDate = new Date(startDateObj);
            canCancelAfterDate.setMonth(canCancelAfterDate.getMonth() + months);
          }

          return {
            months: months,
            inDays: months * 30,
            canCancelAfterDate: canCancelAfterDate,
            source: 'generic',
            confidence: 70
          };
        }
      }
    }

    console.log('⚠️ Keine Mindestlaufzeit gefunden');
    return null;
  }

  /**
   * 🆕 GENERIERT DYNAMISCHE QUICKFACTS basierend auf Dokument-Kategorie
   * Returns: Array mit 3 quickFact-Objekten { label, value, rating }
   */
  generateQuickFacts(data) {
    const {
      documentCategory,
      contractType,
      provider,
      contractNumber,
      finalEndDate,
      remainingMonths,
      remainingDays,
      cancellationPeriod,
      contractDuration,
      monthlyCost,
      annualCost,
      startDate
    } = data;

    // Hilfsfunktion: Datum formatieren
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
    };

    // Hilfsfunktion: Kündigungsfrist formatieren
    const formatCancellationPeriod = (cp) => {
      if (!cp) return null;
      if (cp.type === 'daily') return 'Täglich kündbar';
      if (cp.type === 'end_of_period') return 'Zum Laufzeitende';
      return `${cp.value} ${cp.unit === 'months' ? 'Monate' : cp.unit === 'weeks' ? 'Wochen' : 'Tage'}`;
    };

    // Hilfsfunktion: Laufzeit formatieren
    const formatDuration = (dur) => {
      if (!dur) return null;
      return `${dur.value} ${dur.unit === 'years' ? 'Jahr(e)' : dur.unit === 'months' ? 'Monat(e)' : 'Tag(e)'}`;
    };

    // Hilfsfunktion: Restlaufzeit formatieren
    const formatRemaining = (months, days) => {
      if (months === null || days === null) return null;
      if (days < 0) return 'Abgelaufen';
      if (months === 0) return `${days} Tag(e)`;
      return `${months} Monat(e)`;
    };

    // Hilfsfunktion: Rating basierend auf Restzeit
    const getRemainingRating = (days) => {
      if (days === null) return 'neutral';
      if (days < 0) return 'bad';
      if (days < 30) return 'bad';
      if (days < 90) return 'neutral';
      return 'good';
    };

    // 📄 KÜNDIGUNGSBESTÄTIGUNG
    if (documentCategory === 'cancellation_confirmation') {
      console.log('📊 Generiere QuickFacts für: KÜNDIGUNGSBESTÄTIGUNG');
      return [
        {
          label: 'Gekündigt zum',
          value: formatDate(finalEndDate) || 'Unbekannt',
          rating: finalEndDate ? 'neutral' : 'bad'
        },
        {
          label: 'Anbieter',
          value: provider?.displayName || provider?.name || 'Unbekannt',
          rating: 'neutral'
        },
        {
          label: 'Restlaufzeit',
          value: formatRemaining(remainingMonths, remainingDays) || 'Unbekannt',
          rating: getRemainingRating(remainingDays)
        }
      ];
    }

    // 🧾 RECHNUNG
    if (documentCategory === 'invoice') {
      console.log('📊 Generiere QuickFacts für: RECHNUNG');
      return [
        {
          label: 'Fällig am',
          value: formatDate(finalEndDate) || 'Unbekannt',
          rating: remainingDays !== null && remainingDays < 7 ? 'bad' : 'neutral'
        },
        {
          label: 'Betrag',
          value: monthlyCost ? `${monthlyCost.toFixed(2)} €` : (annualCost ? `${annualCost.toFixed(2)} €` : 'Unbekannt'),
          rating: 'neutral'
        },
        {
          label: 'Anbieter',
          value: provider?.displayName || provider?.name || 'Unbekannt',
          rating: 'neutral'
        }
      ];
    }

    // 👔 ARBEITSVERTRAG
    if (contractType === 'employment') {
      console.log('📊 Generiere QuickFacts für: ARBEITSVERTRAG');
      return [
        {
          label: 'Arbeitsbeginn',
          value: formatDate(startDate) || 'Unbekannt',
          rating: 'neutral'
        },
        {
          label: 'Kündigungsfrist',
          value: formatCancellationPeriod(cancellationPeriod) || 'Unbekannt',
          rating: cancellationPeriod ? 'neutral' : 'bad'
        },
        {
          label: 'Befristung',
          value: finalEndDate ? `Bis ${formatDate(finalEndDate)}` : 'Unbefristet',
          rating: finalEndDate ? 'neutral' : 'good'
        }
      ];
    }

    // 🏠 MIETVERTRAG
    if (contractType === 'rental') {
      console.log('📊 Generiere QuickFacts für: MIETVERTRAG');
      return [
        {
          label: 'Mietbeginn',
          value: formatDate(startDate) || 'Unbekannt',
          rating: 'neutral'
        },
        {
          label: 'Kündigungsfrist',
          value: formatCancellationPeriod(cancellationPeriod) || '3 Monate (gesetzlich)',
          rating: 'neutral'
        },
        {
          label: 'Monatliche Miete',
          value: monthlyCost ? `${monthlyCost.toFixed(2)} €` : 'Unbekannt',
          rating: 'neutral'
        }
      ];
    }

    // 🛒 EINMALIGER KAUFVERTRAG
    if (contractType === 'purchase') {
      console.log('📊 Generiere QuickFacts für: KAUFVERTRAG');
      return [
        {
          label: 'Kaufdatum',
          value: formatDate(startDate) || formatDate(finalEndDate) || 'Unbekannt',
          rating: 'neutral'
        },
        {
          label: 'Kaufpreis',
          value: monthlyCost ? `${monthlyCost.toFixed(2)} €` : (annualCost ? `${annualCost.toFixed(2)} €` : 'Unbekannt'),
          rating: 'neutral'
        },
        {
          label: 'Gewährleistung',
          value: finalEndDate ? `Bis ${formatDate(finalEndDate)}` : '2 Jahre (gesetzlich)',
          rating: 'neutral'
        }
      ];
    }

    // 📋 STANDARD: Laufender Vertrag (Abo, Versicherung, Telekom, etc.)
    console.log('📊 Generiere QuickFacts für: STANDARD VERTRAG');
    return [
      {
        label: 'Kündigungsfrist',
        value: formatCancellationPeriod(cancellationPeriod) || 'Unbekannt',
        rating: cancellationPeriod?.inDays > 90 ? 'bad' : (cancellationPeriod ? 'neutral' : 'bad')
      },
      {
        label: 'Ablaufdatum',
        value: formatDate(finalEndDate) || 'Unbekannt',
        rating: remainingDays !== null && remainingDays < 30 ? 'bad' : 'neutral'
      },
      {
        label: 'Laufzeit',
        value: formatDuration(contractDuration) || 'Unbekannt',
        rating: contractDuration?.inMonths > 24 ? 'bad' : 'neutral'
      }
    ];
  }

  /**
   * 🆕 ENHANCED: Auto-Renewal Detection mit Negation-Check
   */
  detectAutoRenewal(text) {
    console.log('🔍 Prüfe Auto-Renewal...');

    // PRIORITY 1: Check for NEGATIONS FIRST!
    for (const pattern of this.patterns.autoRenewalNegation) {
      const match = text.match(pattern);
      if (match) {
        console.log('✅ KEINE Auto-Renewal (Negation gefunden) (Konfidenz: 90%)');
        return { isAutoRenewal: false, confidence: 90 };
      }
    }

    // PRIORITY 2: Check for positive patterns
    for (const pattern of this.patterns.autoRenewal) {
      const match = text.match(pattern);
      if (match) {
        // Get context to verify
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(text.length, match.index + 200);
        const context = text.substring(contextStart, contextEnd).toLowerCase();

        // Double-check for negations in immediate context
        if (context.match(/nicht|ohne|keine/i)) {
          console.log('⚠️ Auto-Renewal Pattern gefunden, aber Negation im Kontext - skipping');
          continue;
        }

        console.log('✅ Auto-Renewal Klausel erkannt! (Konfidenz: 85%)');
        return { isAutoRenewal: true, confidence: 85 };
      }
    }

    console.log('⚠️ Keine Auto-Renewal Klausel gefunden (Konfidenz: 50%)');
    return { isAutoRenewal: false, confidence: 50 };
  }

  parseCost(costStr) {
    if (!costStr) return null;

    // Remove currency symbol and convert German decimal notation
    const normalized = costStr
      .replace('€', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')  // Remove thousand separators
      .replace(',', '.'); // Convert German decimal comma to dot

    const value = parseFloat(normalized);
    return isNaN(value) ? null : value;
  }

  /**
   * 🆕 DOKUMENT-KATEGORIE ERKENNUNG - V1
   * Erkennt ZUERST die Dokument-Kategorie (Kündigungsbestätigung, Rechnung, etc.)
   * BEVOR der Vertragstyp analysiert wird
   * Returns: { category: string, isActiveContract: boolean, effectiveDate?: Date }
   */
  detectDocumentCategory(text) {
    const lowerText = text.toLowerCase();

    // 📄 KÜNDIGUNGSBESTÄTIGUNG - Höchste Priorität
    const cancellationPatterns = [
      'kündigungsbestätigung',
      'kündigung bestätigen',
      'kündigung erhalten',
      'ihre kündigung',
      'kündigung wirksam zum',
      'kündigung wirksam ab',
      'wir bestätigen ihre kündigung',
      'hiermit bestätigen wir die kündigung'
    ];

    let cancellationScore = 0;
    cancellationPatterns.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        cancellationScore += pattern.includes('kündigungsbestätigung') ? 20 : 10;
      }
    });

    if (cancellationScore >= 10) {
      console.log('📄 Dokument-Kategorie: KÜNDIGUNGSBESTÄTIGUNG (Score:', cancellationScore, ')');

      // 🚀 ULTRA-ROBUSTE Datumsextraktion für Kündigungsbestätigungen
      // Extrahiere das ZUKÜNFTIGE Datum wann der Vertrag endet, NICHT das Ausstellungsdatum
      let effectiveDate = null;
      let dateSource = 'none';

      // PRIORITY 1: Explizite Kündigungs-/Enddatum-Muster (höchste Priorität)
      const explicitPatterns = [
        // "zum 10.05.2026" / "zum 10. Mai 2026"
        /(?:zum|ab|per|bis)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "wirksam zum 10.05.2026"
        /wirksam\s+(?:zum|ab)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "endet am 10.05.2026" / "endet zum 10.05.2026"
        /endet\s+(?:am|zum|per)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "gekündigt zum 10.05.2026"
        /gekündigt\s+(?:zum|per|ab)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "Vertrag endet: 10.05.2026"
        /vertrag\s+endet[\s:]+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "Vertragsende: 10.05.2026"
        /vertragsende[\s:]+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "läuft aus zum 10.05.2026"
        /läuft\s+aus\s+(?:zum|am|per)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "Kündigung wird wirksam am 10.05.2026"
        /kündigung\s+wird\s+wirksam\s+(?:am|zum)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi,
        // "Ihr Vertrag endet am 10.05.2026"
        /ihr\s+vertrag\s+endet\s+(?:am|zum)\s+(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/gi
      ];

      // Sammle ALLE gefundenen Daten
      const foundDates = [];
      const now = new Date();

      for (const pattern of explicitPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;

          if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            const date = new Date(year, month - 1, day);
            foundDates.push({ date, source: 'explicit', pattern: pattern.source });
            console.log(`📅 Datum gefunden (explicit): ${date.toLocaleDateString('de-DE')} - Pattern: ${pattern.source.substring(0, 30)}...`);
          }
        }
      }

      // PRIORITY 2: Falls keine expliziten Muster, suche nach allen Datums im Text
      if (foundDates.length === 0) {
        const allDatesPattern = /(\d{1,2})[.\s/]+(\d{1,2})[.\s/]+(\d{2,4})/g;
        let match;
        while ((match = allDatesPattern.exec(text)) !== null) {
          const day = parseInt(match[1]);
          const month = parseInt(match[2]);
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;

          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020) {
            const date = new Date(year, month - 1, day);
            foundDates.push({ date, source: 'generic', pattern: 'all_dates' });
          }
        }
      }

      // Wähle das ZUKÜNFTIGE Datum das am weitesten in der Zukunft liegt
      // (Bei Kündigungsbestätigungen ist das Vertragsende-Datum meist das späteste)
      const futureDates = foundDates.filter(d => d.date > now);

      if (futureDates.length > 0) {
        // Sortiere nach Datum aufsteigend - nehme das ERSTE zukünftige Datum
        // (das ist meist das Vertragsende, nicht irgendwann in 10 Jahren)
        futureDates.sort((a, b) => a.date - b.date);
        effectiveDate = futureDates[0].date;
        dateSource = futureDates[0].source;
        console.log(`✅ Kündigungsdatum gewählt (${dateSource}): ${effectiveDate.toLocaleDateString('de-DE')}`);
      } else if (foundDates.length > 0) {
        // Falls keine zukünftigen Daten, nimm das letzte vergangene (könnte ein kürzlich abgelaufener Vertrag sein)
        foundDates.sort((a, b) => b.date - a.date);
        effectiveDate = foundDates[0].date;
        dateSource = foundDates[0].source + '_past';
        console.log(`⚠️ Nur vergangene Daten gefunden, verwende: ${effectiveDate.toLocaleDateString('de-DE')}`);
      } else {
        console.log('❌ Kein Kündigungsdatum in der Bestätigung gefunden');
      }

      return {
        category: 'cancellation_confirmation',
        isActiveContract: false,
        effectiveDate: effectiveDate,
        dateSource: dateSource,
        displayLabels: {
          field1: 'Gekündigt zum',
          field2: 'Anbieter',
          field3: 'Restlaufzeit'
        }
      };
    }

    // 🧾 RECHNUNG
    const invoicePatterns = [
      'rechnung',
      'rechnungsnummer',
      'rechnungsbetrag',
      'zahlbar bis',
      'fällig am',
      'zahlungsziel',
      'rechnungsdatum'
    ];

    let invoiceScore = 0;
    invoicePatterns.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        invoiceScore += pattern === 'rechnung' ? 15 : 5;
      }
    });

    // Rechnung muss Score >= 15 haben UND darf kein "vertrag" enthalten
    if (invoiceScore >= 15 && !lowerText.includes('vertrag')) {
      console.log('🧾 Dokument-Kategorie: RECHNUNG (Score:', invoiceScore, ')');
      return {
        category: 'invoice',
        isActiveContract: false,
        displayLabels: {
          field1: 'Fällig am',
          field2: 'Betrag',
          field3: 'Zahlungsziel'
        }
      };
    }

    // 📋 Standard: Aktiver Vertrag (wird weiter analysiert)
    console.log('📋 Dokument-Kategorie: AKTIVER VERTRAG');
    return {
      category: 'active_contract',
      isActiveContract: true,
      displayLabels: {
        field1: 'Kündigungsfrist',
        field2: 'Ablaufdatum',
        field3: 'Laufzeit'
      }
    };
  }

  /**
   * 🎯 INTELLIGENTE CONTRACT TYPE DETECTION - V2
   * Erkennt Vertragstypen mit gewichteten Keywords und Kontext-Analyse
   * Unterstützt alle 8 Haupttypen: purchase, employment, rental, telecom, insurance, loan, service, other
   */
  detectContractType(text) {
    const lowerText = text.toLowerCase();

    // 🎯 V2: ALLE Vertragstypen mit gewichteten Keywords
    // Format: [keyword, weight] - höheres Gewicht = wichtiger für Typ-Erkennung
    const types = {
      // 🛒 KAUFVERTRAG (purchase)
      purchase: {
        strong: ['kaufvertrag', 'kaufpreis', 'käufer', 'verkäufer', 'verkauf', 'kfz-kaufvertrag', 'fahrzeugkauf', 'warenkauf', 'eigentumsübertragung'],
        medium: ['übergabe', 'kaufgegenstand', 'sachmängelhaftung', 'gewährleistung', 'rücktritt', 'anzahlung'],
        weak: ['zahlung', 'preis', 'ware']
      },

      // 👔 ARBEITSVERTRAG (employment)
      employment: {
        strong: ['arbeitsvertrag', 'arbeitgeber', 'arbeitnehmer', 'anstellung', 'beschäftigungsverhältnis', 'dienstvertrag'],
        medium: ['probezeit', 'kündigungsfrist', 'gehalt', 'vergütung', 'urlaub', 'überstunden', 'arbeitszeit', 'wettbewerbsverbot'],
        weak: ['tätigkeit', 'position', 'stelle']
      },

      // 🏠 MIETVERTRAG (rental)
      rental: {
        strong: ['mietvertrag', 'miete', 'mieter', 'vermieter', 'mietwohnung', 'mietgegenstand'],
        medium: ['nebenkosten', 'kaution', 'schönheitsreparaturen', 'betriebskosten', 'kaltmiete', 'warmmiete', 'mieterhöhung'],
        weak: ['wohnung', 'zimmer', 'quadratmeter']
      },

      // 📱 TELEKOMMUNIKATION (telecom)
      telecom: {
        strong: ['mobilfunkvertrag', 'internetvertrag', 'telekommunikationsvertrag', 'festnetzvertrag'],
        medium: ['mobilfunk', 'internet', 'dsl', 'glasfaser', 'festnetz', 'tarif', 'datenvolumen', 'flatrate', 'telefonie'],
        weak: ['gb', 'lte', '5g', 'router']
      },

      // 🛡️ VERSICHERUNG (insurance)
      insurance: {
        strong: ['versicherungsvertrag', 'versicherung', 'versicherer', 'versicherungsnehmer', 'police', 'versicherungspolice'],
        medium: ['haftpflicht', 'krankenversicherung', 'rechtsschutz', 'hausrat', 'lebensversicherung', 'deckung', 'schutzbrief', 'prämie', 'versicherungssumme'],
        weak: ['schadensfall', 'leistung']
      },

      // 💰 DARLEHEN/KREDIT (loan)
      loan: {
        strong: ['darlehensvertrag', 'kreditvertrag', 'kredit', 'darlehen', 'finanzierung'],
        medium: ['zinsen', 'tilgung', 'rate', 'kreditbetrag', 'darlehenssumme', 'effektivzins', 'sollzins', 'laufzeit', 'rückzahlung'],
        weak: ['bankkonto', 'überweisung']
      },

      // 🔧 DIENSTLEISTUNG (service)
      service: {
        strong: ['dienstleistungsvertrag', 'werkvertrag', 'dienstleistung', 'beauftragung', 'auftraggeber', 'auftragnehmer'],
        medium: ['honorar', 'vergütung', 'leistungsumfang', 'werklohn', 'abnahme', 'fertigstellung'],
        weak: ['erbringung', 'ausführung']
      }
    };

    // 📊 Berechne Scores mit Gewichtung
    const scores = {};

    for (const [type, keywords] of Object.entries(types)) {
      let score = 0;

      // Strong keywords: 10 Punkte
      if (keywords.strong) {
        keywords.strong.forEach(kw => {
          if (lowerText.includes(kw)) {
            score += 10;
            console.log(`  ✅ [${type}] Strong match: "${kw}" (+10)`);
          }
        });
      }

      // Medium keywords: 3 Punkte
      if (keywords.medium) {
        keywords.medium.forEach(kw => {
          if (lowerText.includes(kw)) {
            score += 3;
          }
        });
      }

      // Weak keywords: 1 Punkt
      if (keywords.weak) {
        keywords.weak.forEach(kw => {
          if (lowerText.includes(kw)) {
            score += 1;
          }
        });
      }

      scores[type] = score;
    }

    console.log('📊 Contract Type Scores:', scores);

    // Finde den Typ mit höchstem Score
    const maxScore = Math.max(...Object.values(scores));

    // Mindestens 5 Punkte erforderlich (sonst "other")
    if (maxScore < 5) {
      console.log('❓ Kein klarer Typ erkannt (Score < 5) → other');
      return 'other';
    }

    const detectedType = Object.keys(scores).find(key => scores[key] === maxScore);
    console.log(`✅ Vertragstyp erkannt: ${detectedType} (Score: ${maxScore})`);

    return detectedType;
  }

  /**
   * 🚀 MAIN ANALYSIS FUNCTION - ENHANCED
   * Mit OCR-Korrektur, Multi-Pass-Extraktion, Konfidenz-Scoring
   */
  async analyzeContract(text, filename = '') {
    try {
      console.log('📄 Analysiere Vertrag:', filename);
      console.log('📊 Text-Länge:', text.length, 'Zeichen');

      // 🆕 STEP 1: OCR-Fehlerkorrektur
      text = this.preprocessOCRText(text);

      // 🆕 STEP 1.5: Dokument-Kategorie erkennen (Kündigungsbestätigung, Rechnung, etc.)
      const documentCategory = this.detectDocumentCategory(text);
      console.log('📂 Dokument-Kategorie:', documentCategory.category);

      // Detect contract type (needed for intelligent estimation)
      const contractType = this.detectContractType(text);
      console.log('📋 Vertragstyp erkannt:', contractType);

      // Basic extraction
      const contractNumber = this.extractPattern(text, this.patterns.contractNumber);
      const customerNumber = this.extractPattern(text, this.patterns.customerNumber);

      // Provider detection
      const provider = this.extractProviderFromText(text);

      if (provider) {
        console.log(`✅ Provider erkannt: ${provider.displayName} (Konfidenz: ${provider.confidence}%)`);
      } else {
        console.log('❌ Kein Provider erkannt');
      }

      // 🆕 STEP 2: Multi-Pass Datumsextraktion mit Konfidenz
      const { startDate, endDate, startDateConfidence, endDateConfidence } = this.extractDates(text, contractType);

      // Contract duration (Laufzeit)
      const contractDuration = this.extractContractDuration(text);

      // Cancellation period (Kündigungsfrist)
      const cancellationPeriod = this.extractCancellationPeriod(text);

      // 🆕 Mindestlaufzeit / Erstlaufzeit extrahieren (z.B. "Kündigung ab 6. Monat möglich")
      const minimumTerm = this.extractMinimumTerm(text, startDate);

      // 🆕 STEP 3: Auto-renewal detection mit Negation-Check
      const autoRenewalResult = this.detectAutoRenewal(text);
      const isAutoRenewal = autoRenewalResult.isAutoRenewal;
      const autoRenewalConfidence = autoRenewalResult.confidence;

      // 🆕 STEP 4: Intelligente Schätzung für fehlende Daten
      let adjustedEndDate = endDate;
      let adjustedEndDateConfidence = endDateConfidence;
      let dataSource = 'extracted';

      // Handle auto-renewal for expired contracts
      if (endDate && isAutoRenewal && endDate < new Date()) {
        console.log('🔄 Auto-Renewal Vertrag - berechne nächste Periode');
        const now = new Date();
        adjustedEndDate = new Date(endDate);

        const renewalMonths = contractDuration?.inMonths || 12;

        while (adjustedEndDate < now) {
          adjustedEndDate.setMonth(adjustedEndDate.getMonth() + renewalMonths);
        }
        console.log(`📅 Nächstes Ablaufdatum berechnet: ${adjustedEndDate.toISOString()}`);
        dataSource = 'calculated';
      }

      // 🆕 Wenn kein Enddatum gefunden, aber Startdatum vorhanden → SCHÄTZE!
      if (!adjustedEndDate && startDate && contractType) {
        console.log('🤖 Kein Enddatum gefunden - verwende Vertragstyp-Defaults für Schätzung');

        const defaults = this.contractDefaults[contractType];
        if (defaults) {
          adjustedEndDate = new Date(startDate);

          if (defaults.duration.unit === 'years') {
            adjustedEndDate.setFullYear(adjustedEndDate.getFullYear() + defaults.duration.value);
          } else if (defaults.duration.unit === 'months') {
            adjustedEndDate.setMonth(adjustedEndDate.getMonth() + defaults.duration.value);
          }

          adjustedEndDateConfidence = defaults.confidence;
          dataSource = 'estimated';

          console.log(`✅ Enddatum geschätzt: ${adjustedEndDate.toISOString()} (Konfidenz: ${adjustedEndDateConfidence}%)`);
        }
      }

      // Extract costs
      const monthlyCostStr = this.extractPattern(text, this.patterns.monthlyCost);
      const annualCostStr = this.extractPattern(text, this.patterns.annualCost);
      const monthlyCost = this.parseCost(monthlyCostStr);
      const annualCost = this.parseCost(annualCostStr);

      // Calculate important dates
      const now = new Date();
      let nextCancellationDate = null;
      let autoRenewalDate = null;

      if (adjustedEndDate && cancellationPeriod && cancellationPeriod.inDays > 0) {
        const cancellationDeadline = new Date(adjustedEndDate);
        cancellationDeadline.setDate(cancellationDeadline.getDate() - cancellationPeriod.inDays);
        nextCancellationDate = cancellationDeadline;

        autoRenewalDate = new Date(adjustedEndDate);
        autoRenewalDate.setDate(autoRenewalDate.getDate() + 1);
      } else if (adjustedEndDate && cancellationPeriod?.type === 'daily') {
        nextCancellationDate = null;
        autoRenewalDate = new Date(adjustedEndDate);
        autoRenewalDate.setDate(autoRenewalDate.getDate() + 1);
      }

      // Risk assessment
      const riskFactors = [];
      if (adjustedEndDate && adjustedEndDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        riskFactors.push('Contract ending soon');
      }
      if (nextCancellationDate && nextCancellationDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        riskFactors.push('Cancellation deadline approaching');
      }
      if (isAutoRenewal) {
        riskFactors.push('Auto-renewal clause detected');
      }

      const riskLevel = riskFactors.length >= 2 ? 'high' :
                       riskFactors.length === 1 ? 'medium' : 'low';

      console.log('📊 Analyse abgeschlossen:', {
        provider: provider?.displayName || 'Nicht erkannt',
        contractNumber: contractNumber || 'Nicht gefunden',
        startDate: startDate?.toISOString() || 'Nicht gefunden',
        endDate: adjustedEndDate?.toISOString() || 'Nicht gefunden',
        endDateConfidence: `${adjustedEndDateConfidence}%`,
        dataSource: dataSource,
        contractDuration: contractDuration ? `${contractDuration.value} ${contractDuration.unit}` : 'Nicht gefunden',
        cancellationPeriod: cancellationPeriod ?
          (cancellationPeriod.type === 'daily' ? 'Täglich kündbar' :
           cancellationPeriod.type === 'end_of_period' ? 'Zum Ende der Laufzeit' :
           `${cancellationPeriod.value} ${cancellationPeriod.unit}`) : 'Nicht gefunden',
        isAutoRenewal,
        autoRenewalConfidence: `${autoRenewalConfidence}%`,
        contractType
      });

      // 🆕 Bei Kündigungsbestätigungen: Verwende das effectiveDate als endDate
      let finalEndDate = adjustedEndDate;
      let finalEndDateConfidence = adjustedEndDateConfidence;
      let finalDataSource = dataSource;

      if (documentCategory.category === 'cancellation_confirmation' && documentCategory.effectiveDate) {
        finalEndDate = documentCategory.effectiveDate;
        finalEndDateConfidence = 95; // Hohes Vertrauen bei explizitem Kündigungsdatum
        finalDataSource = 'extracted';
        console.log('📄 Kündigungsbestätigung: Verwende Kündigungsdatum als Ablaufdatum:', finalEndDate.toISOString());
      }

      // 🆕 Berechne Restlaufzeit für Kündigungsbestätigungen
      let remainingDays = null;
      let remainingMonths = null;
      if (finalEndDate) {
        const now = new Date();
        const diffTime = finalEndDate.getTime() - now.getTime();
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        remainingMonths = Math.ceil(remainingDays / 30);
      }

      // 🆕 GENERIERE DYNAMISCHE QUICKFACTS basierend auf Dokument-Kategorie
      const quickFacts = this.generateQuickFacts({
        documentCategory: documentCategory.category,
        contractType,
        provider,
        contractNumber,
        finalEndDate,
        remainingMonths,
        remainingDays,
        cancellationPeriod,
        contractDuration,
        monthlyCost,
        annualCost,
        startDate
      });

      return {
        success: true,
        data: {
          // 🆕 Dokument-Kategorie Information
          documentCategory: documentCategory.category,
          isActiveContract: documentCategory.isActiveContract,
          displayLabels: documentCategory.displayLabels,

          // Provider information
          provider: provider,

          // Contract identification
          contractNumber: contractNumber,
          customerNumber: customerNumber,
          contractType,

          // 🆕 Dates with CONFIDENCE SCORES (mit Kündigungsbestätigung-Logik)
          startDate: startDate?.toISOString() || null,
          startDateConfidence: startDateConfidence,
          endDate: finalEndDate?.toISOString() || null,
          endDateConfidence: finalEndDateConfidence,
          originalEndDate: endDate?.toISOString() || null,
          nextCancellationDate: nextCancellationDate?.toISOString() || null,
          autoRenewalDate: autoRenewalDate?.toISOString() || null,
          dataSource: finalDataSource, // 'extracted', 'calculated', 'estimated'

          // 🆕 Restlaufzeit (für Kündigungsbestätigungen)
          remainingDays: remainingDays,
          remainingMonths: remainingMonths,

          // Contract duration
          contractDuration: contractDuration,

          // Cancellation terms
          cancellationPeriod: cancellationPeriod,

          // 🆕 Mindestlaufzeit (z.B. "Kündigung ab 6. Monat möglich")
          minimumTerm: minimumTerm,
          canCancelAfterDate: minimumTerm?.canCancelAfterDate?.toISOString() || null,

          // 🆕 Auto-renewal with CONFIDENCE
          isAutoRenewal,
          autoRenewalConfidence: autoRenewalConfidence,

          // Costs
          monthlyCost: monthlyCost,
          annualCost: annualCost,

          // Risk assessment
          riskLevel,
          riskFactors,

          // 🆕 Dynamische QuickFacts (basierend auf Dokument-Kategorie)
          quickFacts: quickFacts,

          // Metadata
          analyzedAt: new Date().toISOString(),
          confidence: provider?.confidence || 0
        }
      };
    } catch (error) {
      console.error('❌ Contract analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ContractAnalyzer();

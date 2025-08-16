// contractAnalyzer.js - Intelligent Contract Analysis WITHOUT Provider Database
// PRINCIPLE: Better NULL than wrong data!
// Place this in backend/services/contractAnalyzer.js

class ContractAnalyzer {
  constructor() {
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

      // Dates - improved patterns
      dates: [
        /(?:BEGINN|Vertragsbeginn|Beginn|Versicherungsbeginn|Gültig\s+ab|ab\s+dem)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(?:ABLAUF|Vertragsende|Ablauf|Laufzeit\s+bis|Gültig\s+bis|Befristet\s+bis|endet\s+am|läuft\s+ab\s+am)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})[\s]*(?:Ende|Ablauf|bis)/gi
      ],
      
      // Contract duration patterns (Laufzeit)
      contractDuration: [
        /laufzeit[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /vertragsdauer[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /läuft\s+(?:zunächst\s+)?(\d+|ein|zwei|drei)\s*(jahr|monat|tag)/gi,
        /mindestlaufzeit[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /erstlaufzeit[\s:]+(\d+)\s*(jahr|monat|tag)/gi,
        /für\s+(\d+|ein|zwei|drei)\s*(jahr|monat)(?:e)?/gi
      ],
      
      // Cancellation period patterns (Kündigungsfrist) - ENHANCED
      cancellationPeriod: [
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
      
      // Auto-renewal patterns
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
   * Extract provider directly from text WITHOUT database
   */
  extractProviderFromText(text) {
    console.log('🔍 Extrahiere Provider direkt aus Text...');
    
    // First check for known providers with special patterns
    const specialProviders = [
      { pattern: /adam\s*riese/gi, name: 'Adam Riese', confidence: 95 },
      { pattern: /ADAM\s*RIESE/g, name: 'Adam Riese', confidence: 95 },
      { pattern: /allianz/gi, name: 'Allianz', confidence: 90 },
      { pattern: /ing[\s\-]?diba/gi, name: 'ING-DiBa', confidence: 90 },
      { pattern: /\bing\b/gi, name: 'ING', confidence: 85 },
      { pattern: /telekom/gi, name: 'Telekom', confidence: 90 },
      { pattern: /vodafone/gi, name: 'Vodafone', confidence: 90 },
      { pattern: /o2\s*telefonica/gi, name: 'O2 Telefonica', confidence: 90 },
      { pattern: /axa/gi, name: 'AXA', confidence: 85 },
      { pattern: /ergo/gi, name: 'ERGO', confidence: 85 },
      { pattern: /huk[\s\-]?coburg/gi, name: 'HUK-Coburg', confidence: 90 },
      { pattern: /\bhuk\b/gi, name: 'HUK', confidence: 85 },
      { pattern: /debeka/gi, name: 'Debeka', confidence: 85 },
      { pattern: /r\+v/gi, name: 'R+V Versicherung', confidence: 85 },
      { pattern: /generali/gi, name: 'Generali', confidence: 85 },
      { pattern: /zurich/gi, name: 'Zurich', confidence: 85 },
      { pattern: /signal\s*iduna/gi, name: 'Signal Iduna', confidence: 90 },
      { pattern: /techniker\s*krankenkasse/gi, name: 'Techniker Krankenkasse', confidence: 90 },
      { pattern: /\btk\b/gi, name: 'Techniker Krankenkasse', confidence: 80 },
      { pattern: /aok/gi, name: 'AOK', confidence: 85 },
      { pattern: /barmer/gi, name: 'Barmer', confidence: 85 },
      { pattern: /dak/gi, name: 'DAK', confidence: 85 }
    ];
    
    // Check for special providers first
    for (const special of specialProviders) {
      const matches = text.match(special.pattern);
      if (matches && matches.length > 0) {
        console.log(`✅ Bekannter Provider gefunden: "${special.name}" (Konfidenz: ${special.confidence}%)`);
        return {
          name: special.name,
          displayName: special.name,
          confidence: special.confidence,
          extractedFromText: true
        };
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
      console.log(`✅ Bester Provider-Match: "${bestMatch}" (Konfidenz: ${highestConfidence}%)`);
      
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
    }
    
    console.log('⚠️ Kein Provider im Text gefunden - returning NULL');
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
   * Extract all dates from text and determine start/end date
   */
  extractDates(text) {
    let startDate = null;
    let endDate = null;
    
    // Try all date patterns
    for (const pattern of this.patterns.dates) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const dateStr = `${match[1]}.${match[2]}.${match[3]}`;
        const date = this.parseGermanDate(dateStr);
        
        if (!date) continue;
        
        // Check context to determine if it's start or end date
        const context = text.substring(Math.max(0, match.index - 50), match.index);
        
        if (context.match(/(?:BEGINN|beginn|ab|start|gültig\s+ab)/i)) {
          if (!startDate) {
            startDate = date;
            console.log(`📅 Vertragsbeginn gefunden: ${startDate.toISOString()}`);
          }
        } else if (context.match(/(?:ABLAUF|ende|ablauf|bis|läuft|endet)/i)) {
          if (!endDate) {
            endDate = date;
            console.log(`📅 Vertragsende gefunden: ${endDate.toISOString()}`);
          }
        }
      }
    }
    
    return { startDate, endDate };
  }

  /**
   * Extract contract duration (Laufzeit) - NOT cancellation period!
   */
  extractContractDuration(text) {
    console.log('🔍 Extrahiere Vertragslaufzeit...');
    
    for (const pattern of this.patterns.contractDuration) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        let value = match[1];
        const unit = match[2].toLowerCase();
        
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
                           value / 30; // days to months
          
          console.log(`✅ Vertragslaufzeit gefunden: ${value} ${unit}`);
          
          return {
            value: value,
            unit: mappedUnit,
            inMonths: Math.round(inMonths)
          };
        }
      }
    }
    
    console.log('⚠️ Keine Vertragslaufzeit gefunden - returning NULL');
    return null; // Better NULL than wrong data!
  }

  /**
   * Extract cancellation period (Kündigungsfrist) - NOT duration!
   */
  extractCancellationPeriod(text) {
    console.log('🔍 Extrahiere Kündigungsfrist...');
    
    // PRIORITY 1: Check for daily/immediate cancellation FIRST (highest priority!)
    const dailyPatterns = [
      /täglich[\s\(]/gi,  // "täglich" with space or bracket after
      /täglich\s+(?:kündbar|gekündigt|kündigen)/gi,
      /tägliche[rs]?\s+kündigungsrecht/gi,
      /jederzeit\s+(?:kündbar|gekündigt|kündigen)/gi,
      /ohne\s+(?:kündigungsfrist|frist)/gi,
      /fristlos\s+kündbar/gi,
      /täglich\s*\(jedoch\s+nicht\s+rückwirkend\)/gi
    ];
    
    // Check for daily cancellation with higher priority
    for (const pattern of dailyPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Check context around "täglich" to confirm it's about cancellation
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(text.length, match.index + 100);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        
        if (context.includes('kündig') || context.includes('vertrag')) {
          console.log('✅ Tägliche Kündigung möglich! Found at position:', match.index);
          return {
            value: 0,
            unit: 'days',
            inDays: 0,
            type: 'daily'
          };
        }
      }
    }
    
    // PRIORITY 2: Only check for "end of period" if NO daily cancellation found
    // This prevents "zum Ende der Vertragslaufzeit" from overriding "täglich"
    const endOfPeriodPatterns = [
      /zum\s+ende\s+der\s+(?:vertrags)?laufzeit/gi,
      /zum\s+ablauf\s+der\s+(?:vertrags)?laufzeit/gi,
      /ende\s+der\s+vertragslaufzeit/gi
    ];
    
    // Only check if text does NOT contain "täglich"
    const hasDaily = /täglich/i.test(text);
    if (!hasDaily) {
      for (const pattern of endOfPeriodPatterns) {
        if (pattern.test(text)) {
          console.log('✅ Kündigung zum Ende der Vertragslaufzeit möglich');
          return {
            value: 0,
            unit: 'days',
            inDays: 0,
            type: 'end_of_period'
          };
        }
      }
    }
    
    // Standard patterns with specific time periods
    for (const pattern of this.patterns.cancellationPeriod) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        // Skip if it's one of the special patterns we already handled
        if (!match[1]) continue;
        
        const value = parseInt(match[1]);
        const unit = match[2]?.toLowerCase();
        
        if (value && unit && value > 0 && value < 365) { // Sanity check
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
          
          console.log(`✅ Kündigungsfrist gefunden: ${value} ${unit} (${inDays} Tage)`);
          
          return {
            value: value,
            unit: mappedUnit,
            inDays: inDays,
            type: 'standard'
          };
        }
      }
    }
    
    // Check for special terms
    if (text.match(/quartal/i) && text.match(/kündig/i)) {
      console.log('✅ Kündigungsfrist: Quartal (90 Tage)');
      return { value: 3, unit: 'months', inDays: 90, type: 'quarterly' };
    }
    if (text.match(/halbjahr/i) && text.match(/kündig/i)) {
      console.log('✅ Kündigungsfrist: Halbjahr (180 Tage)');
      return { value: 6, unit: 'months', inDays: 180, type: 'half-yearly' };
    }
    
    console.log('⚠️ Keine Kündigungsfrist gefunden - returning NULL');
    return null; // Better NULL than wrong data!
  }

  /**
   * Check for auto-renewal clauses
   */
  detectAutoRenewal(text) {
    for (const pattern of this.patterns.autoRenewal) {
      if (pattern.test(text)) {
        console.log('✅ Auto-Renewal Klausel erkannt!');
        return true;
      }
    }
    return false;
  }

  parseCost(costStr) {
    if (!costStr) return null;
    
    // Remove currency symbol and convert German decimal notation
    const normalized = costStr
      .replace('€', '')
      .replace(/\s/g, '')
      .replace('.', '')  // Remove thousand separators
      .replace(',', '.'); // Convert German decimal comma to dot
    
    const value = parseFloat(normalized);
    return isNaN(value) ? null : value;
  }

  detectContractType(text) {
    const types = {
      insurance: ['versicherung', 'police', 'versicherer', 'deckung', 'schutzbrief', 'haftpflicht', 'krankenversicherung', 'rechtsschutz'],
      telecom: ['mobilfunk', 'internet', 'telefon', 'dsl', 'glasfaser', 'festnetz', 'tarif', 'datenvolumen'],
      energy: ['strom', 'gas', 'energie', 'kwh', 'grundversorgung', 'kilowattstunde', 'verbrauch'],
      subscription: ['abo', 'abonnement', 'mitgliedschaft', 'premium', 'streaming', 'zeitschrift'],
      finance: ['kredit', 'darlehen', 'finanzierung', 'rate', 'zinsen', 'tilgung', 'girokonto', 'depot'],
      rental: ['miete', 'mietvertrag', 'nebenkosten', 'kaution', 'wohnung', 'mieter', 'vermieter'],
      fitness: ['fitness', 'gym', 'training', 'mitgliedschaft', 'studio', 'wellness'],
      mobility: ['leasing', 'carsharing', 'bahncard', 'nahverkehr', 'mobility']
    };

    const lowerText = text.toLowerCase();
    const scores = {};

    for (const [type, keywords] of Object.entries(types)) {
      scores[type] = keywords.filter(keyword => lowerText.includes(keyword)).length;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'other';

    return Object.keys(scores).find(key => scores[key] === maxScore);
  }

  /**
   * Main analysis function
   * PRINCIPLE: Better NULL than wrong data!
   */
  async analyzeContract(text, filename = '') {
    try {
      console.log('📄 Analysiere Vertrag:', filename);
      console.log('📊 Text-Länge:', text.length, 'Zeichen');
      
      // Basic extraction
      const contractNumber = this.extractPattern(text, this.patterns.contractNumber);
      const customerNumber = this.extractPattern(text, this.patterns.customerNumber);
      
      // Provider detection WITHOUT database
      const provider = this.extractProviderFromText(text);
      
      // Log what we found
      if (provider) {
        console.log(`✅ Provider erkannt: ${provider.displayName} (Konfidenz: ${provider.confidence}%)`);
      } else {
        console.log('❌ Kein Provider erkannt');
      }
      
      // Date extraction
      const { startDate, endDate } = this.extractDates(text);
      console.log('📅 Extrahierte Daten:', {
        startDate: startDate?.toISOString() || 'nicht gefunden',
        endDate: endDate?.toISOString() || 'nicht gefunden'
      });
      
      // Contract duration (Laufzeit) - separate from cancellation period!
      const contractDuration = this.extractContractDuration(text);
      
      // Cancellation period (Kündigungsfrist) - separate from duration!
      const cancellationPeriod = this.extractCancellationPeriod(text);
      
      // Auto-renewal detection
      const isAutoRenewal = this.detectAutoRenewal(text);
      
      // Handle auto-renewal for expired contracts
      let adjustedEndDate = endDate;
      if (endDate && isAutoRenewal && endDate < new Date()) {
        console.log('🔄 Auto-Renewal Vertrag - berechne nächste Periode');
        const now = new Date();
        adjustedEndDate = new Date(endDate);
        
        // If we have contract duration, use it for renewal period
        const renewalMonths = contractDuration?.inMonths || 12;
        
        while (adjustedEndDate < now) {
          adjustedEndDate.setMonth(adjustedEndDate.getMonth() + renewalMonths);
        }
        console.log(`📅 Nächstes Ablaufdatum berechnet: ${adjustedEndDate.toISOString()}`);
      }
      
      // Extract costs
      const monthlyCostStr = this.extractPattern(text, this.patterns.monthlyCost);
      const annualCostStr = this.extractPattern(text, this.patterns.annualCost);
      const monthlyCost = this.parseCost(monthlyCostStr);
      const annualCost = this.parseCost(annualCostStr);
      
      // Detect contract type
      const contractType = this.detectContractType(text);
      
      // Calculate important dates (only if we have the data!)
      const now = new Date();
      let nextCancellationDate = null;
      let autoRenewalDate = null;
      
      if (adjustedEndDate && cancellationPeriod && cancellationPeriod.inDays > 0) {
        const cancellationDeadline = new Date(adjustedEndDate);
        cancellationDeadline.setDate(cancellationDeadline.getDate() - cancellationPeriod.inDays);
        nextCancellationDate = cancellationDeadline;
        
        // Auto renewal is typically the day after contract end
        autoRenewalDate = new Date(adjustedEndDate);
        autoRenewalDate.setDate(autoRenewalDate.getDate() + 1);
      } else if (adjustedEndDate && cancellationPeriod?.type === 'daily') {
        // For daily cancellation, no specific deadline
        nextCancellationDate = null;
        autoRenewalDate = new Date(adjustedEndDate);
        autoRenewalDate.setDate(autoRenewalDate.getDate() + 1);
      }
      
      // Risk assessment (only if we have data!)
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
        endDate: adjustedEndDate?.toISOString() || 'Nicht gefunden',
        contractDuration: contractDuration ? `${contractDuration.value} ${contractDuration.unit}` : 'Nicht gefunden',
        cancellationPeriod: cancellationPeriod ? 
          (cancellationPeriod.type === 'daily' ? 'Täglich kündbar' : 
           cancellationPeriod.type === 'end_of_period' ? 'Zum Ende der Laufzeit' :
           `${cancellationPeriod.value} ${cancellationPeriod.unit}`) : 'Nicht gefunden',
        isAutoRenewal,
        contractType
      });

      return {
        success: true,
        data: {
          // Provider information (extracted from text)
          provider: provider, // NULL if not found
          
          // Contract identification
          contractNumber: contractNumber, // NULL if not found
          customerNumber: customerNumber, // NULL if not found
          contractType,
          
          // Dates
          startDate: startDate?.toISOString() || null,
          endDate: adjustedEndDate?.toISOString() || null,
          originalEndDate: endDate?.toISOString() || null, // Keep original for reference
          nextCancellationDate: nextCancellationDate?.toISOString() || null,
          autoRenewalDate: autoRenewalDate?.toISOString() || null,
          
          // Contract duration (Laufzeit)
          contractDuration: contractDuration, // NULL if not found
          
          // Cancellation terms (Kündigungsfrist)
          cancellationPeriod: cancellationPeriod, // NULL if not found
          
          // Auto-renewal
          isAutoRenewal,
          
          // Costs
          monthlyCost: monthlyCost, // NULL if not found
          annualCost: annualCost, // NULL if not found
          
          // Risk assessment
          riskLevel,
          riskFactors,
          
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
// contractAnalyzer.js - Intelligent Contract Analysis WITHOUT Provider Database
// Place this in backend/services/contractAnalyzer.js

class ContractAnalyzer {
  constructor() {
    this.patterns = {
      // Provider patterns - intelligently detect from text
      provider: [
        // Company name with legal form
        /(?:Versicherer|Versicherung|Gesellschaft|Anbieter|Unternehmen|zwischen.*?und|Vertragspartner)[\s:]*([A-Z][A-Za-zÄÖÜäöüß\s&\-\.]+(?:AG|GmbH|SE|KG|OHG|e\.V\.|Bank|Versicherung|mbH|GmbH\s&\sCo\.\sKG))/gi,
        // Standalone company names with legal forms
        /^([A-Z][A-Za-zÄÖÜäöüß\s&\-\.]+(?:AG|GmbH|SE|KG|OHG|e\.V\.|Bank|Versicherung|mbH))/gm,
        // Special patterns for known providers (but detected from text!)
        /adam\s*riese/gi,
        /ADAM\s*RIESE/g,
        /allianz/gi,
        /telekom/gi,
        /vodafone/gi,
        /o2\s*telefonica/gi,
        // Headers with company names
        /^([A-Z][A-Za-zÄÖÜäöüß]+[\s\w]*)\s*\n[=\-]{3,}/gm,
        // Email domain extraction as fallback
        /@([a-z0-9\-]+)\.(de|com|net|org)/gi
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
        /(?:Vertragsbeginn|Beginn|Versicherungsbeginn|Gültig\s+ab|ab\s+dem)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(?:Vertragsende|Ablauf|Laufzeit\s+bis|Gültig\s+bis|Befristet\s+bis|endet\s+am|läuft\s+ab\s+am)[\s:]*(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})/gi,
        /(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{2,4})[\s]*(?:Ende|Ablauf|bis)/gi
      ],
      
      // Cancellation terms - ENHANCED patterns
      cancellationPeriod: [
        /kündigungsfrist[\s:]+(\d+)\s*(monat|woche|tag)/gi,
        /kündigung.*?(\d+)\s*(monat|woche|tag).*?vor/gi,
        /(\d+)\s*(monat|woche|tag).*?kündig/gi,
        /frist.*?(\d+)\s*(monat|woche|tag)/gi,
        /spätestens\s*(\d+)\s*(monat|woche|tag)/gi,
        /mindestens\s*(\d+)\s*(monat|woche|tag).*?vorher/gi,
        /(\d+)\s*(monat|woche|tag).*?zum\s+(?:ende|ablauf)/gi,
        /mit\s+einer\s+frist\s+von\s+(\d+)\s*(monat|woche|tag)/gi
      ],
      
      // Auto-renewal patterns
      autoRenewal: [
        /verlängert\s*sich\s*(?:automatisch|stillschweigend)/gi,
        /automatische\s*verlängerung/gi,
        /stillschweigende\s*verlängerung/gi,
        /jeweils\s*um\s*(?:ein|1)\s*jahr/gi,
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
    
    let bestMatch = null;
    let highestConfidence = 0;
    
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
        if (!providerName || providerName.length < 3) continue;
        
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
        
        // Special handling for known providers (still detected from text!)
        const knownProviders = {
          'adam riese': { name: 'Adam Riese', confidence: 95 },
          'allianz': { name: 'Allianz', confidence: 90 },
          'telekom': { name: 'Telekom', confidence: 90 },
          'vodafone': { name: 'Vodafone', confidence: 90 },
          'ing': { name: 'ING', confidence: 85 },
          'ing-diba': { name: 'ING-DiBa', confidence: 90 },
          'axa': { name: 'AXA', confidence: 85 },
          'ergo': { name: 'ERGO', confidence: 85 },
          'huk': { name: 'HUK', confidence: 85 },
          'huk-coburg': { name: 'HUK-Coburg', confidence: 90 },
          'debeka': { name: 'Debeka', confidence: 85 },
          'r+v': { name: 'R+V Versicherung', confidence: 85 },
          'generali': { name: 'Generali', confidence: 85 },
          'zurich': { name: 'Zurich', confidence: 85 },
          'signal iduna': { name: 'Signal Iduna', confidence: 90 },
          'tk': { name: 'Techniker Krankenkasse', confidence: 85 },
          'aok': { name: 'AOK', confidence: 85 },
          'barmer': { name: 'Barmer', confidence: 85 },
          'dak': { name: 'DAK', confidence: 85 }
        };
        
        const lowerName = providerName.toLowerCase();
        for (const [key, value] of Object.entries(knownProviders)) {
          if (lowerName.includes(key)) {
            providerName = value.name;
            confidence = value.confidence;
            break;
          }
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
    
    console.log('⚠️ Kein Provider im Text gefunden');
    return null;
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
   * Extract all dates from text and determine end date
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
        
        if (context.match(/(?:beginn|ab|start|gültig\s+ab)/i)) {
          if (!startDate) startDate = date;
        } else if (context.match(/(?:ende|ablauf|bis|läuft|endet)/i)) {
          if (!endDate) endDate = date;
        }
      }
    }
    
    // If we only found one date, assume it's the end date
    if (!endDate && startDate) {
      // Look for typical contract duration (usually 1 year)
      if (text.match(/(?:ein|1)\s*jahr/i)) {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
    }
    
    return { startDate, endDate };
  }

  /**
   * Enhanced cancellation period extraction
   */
  extractCancellationPeriod(text) {
    console.log('🔍 Extrahiere Kündigungsfrist...');
    
    for (const pattern of this.patterns.cancellationPeriod) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        if (value && unit) {
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
            inDays: inDays
          };
        }
      }
    }
    
    // Check for special terms
    if (text.match(/quartal/i)) {
      console.log('✅ Kündigungsfrist: Quartal (90 Tage)');
      return { value: 3, unit: 'months', inDays: 90 };
    }
    if (text.match(/halbjahr/i)) {
      console.log('✅ Kündigungsfrist: Halbjahr (180 Tage)');
      return { value: 6, unit: 'months', inDays: 180 };
    }
    
    console.log('⚠️ Keine Kündigungsfrist gefunden - verwende Standard: 3 Monate');
    return { value: 3, unit: 'months', inDays: 90 }; // Default
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
    
    return parseFloat(normalized);
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
   */
  async analyzeContract(text, filename = '') {
    try {
      console.log('📄 Analysiere Vertrag:', filename);
      
      // Basic extraction
      const contractNumber = this.extractPattern(text, this.patterns.contractNumber);
      const customerNumber = this.extractPattern(text, this.patterns.customerNumber);
      
      // Provider detection WITHOUT database
      const provider = this.extractProviderFromText(text);
      
      // Date extraction
      const { startDate, endDate } = this.extractDates(text);
      
      // Cancellation period extraction (ENHANCED)
      const cancellationPeriod = this.extractCancellationPeriod(text);
      
      // Auto-renewal detection
      const isAutoRenewal = this.detectAutoRenewal(text);
      
      // Handle auto-renewal for expired contracts
      let adjustedEndDate = endDate;
      if (endDate && isAutoRenewal && endDate < new Date()) {
        console.log('🔄 Auto-Renewal Vertrag - berechne nächste Periode');
        const now = new Date();
        adjustedEndDate = new Date(endDate);
        while (adjustedEndDate < now) {
          adjustedEndDate.setFullYear(adjustedEndDate.getFullYear() + 1);
        }
        console.log(`📅 Nächstes Ablaufdatum berechnet: ${adjustedEndDate.toISOString()}`);
      }
      
      // Extract costs
      const monthlyCostStr = this.extractPattern(text, this.patterns.monthlyCost);
      const annualCostStr = this.extractPattern(text, this.patterns.annualCost);
      const monthlyCost = this.parseCost(monthlyCostStr);
      const annualCost = this.parseCost(annualCostStr) || (monthlyCost ? monthlyCost * 12 : null);
      
      // Detect contract type
      const contractType = this.detectContractType(text);
      
      // Calculate important dates
      const now = new Date();
      let nextCancellationDate = null;
      let autoRenewalDate = null;
      
      if (adjustedEndDate && cancellationPeriod) {
        const cancellationDeadline = new Date(adjustedEndDate);
        cancellationDeadline.setDate(cancellationDeadline.getDate() - cancellationPeriod.inDays);
        nextCancellationDate = cancellationDeadline;
        
        // Auto renewal is typically the day after contract end
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
        provider: provider?.displayName,
        contractNumber,
        endDate: adjustedEndDate?.toISOString(),
        isAutoRenewal,
        cancellationPeriod
      });

      return {
        success: true,
        data: {
          // Provider information (extracted from text)
          provider: provider,
          
          // Contract identification
          contractNumber,
          customerNumber,
          contractType,
          
          // Dates
          startDate: startDate?.toISOString(),
          endDate: adjustedEndDate?.toISOString(),
          originalEndDate: endDate?.toISOString(), // Keep original for reference
          nextCancellationDate: nextCancellationDate?.toISOString(),
          autoRenewalDate: autoRenewalDate?.toISOString(),
          
          // Cancellation terms
          cancellationPeriod,
          
          // Auto-renewal
          isAutoRenewal,
          
          // Costs
          monthlyCost,
          annualCost,
          
          // Risk assessment
          riskLevel,
          riskFactors,
          
          // Metadata
          analyzedAt: new Date().toISOString(),
          confidence: provider?.confidence || 0
        }
      };
    } catch (error) {
      console.error('Contract analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ContractAnalyzer();
// contractAnalyzer.js - Enhanced Contract Analysis with Provider Detection
// Place this in backend/services/contractAnalyzer.js

const { detectProviderWithConfidence } = require('./providerDatabase');

class ContractAnalyzer {
  constructor() {
    this.patterns = {
      // Provider patterns - look for company names in headers
      provider: [
        /^([A-Z][A-Za-zäöüÄÖÜß\s&\-\.]+(?:GmbH|AG|SE|KG|e\.V\.|Ltd|GmbH\s&\sCo\.\sKG))/m,
        /Vertragspartner:\s*([^\n]+)/i,
        /Anbieter:\s*([^\n]+)/i,
        /Gesellschaft:\s*([^\n]+)/i,
        /zwischen.*?und\s+([A-Z][A-Za-zäöüÄÖÜß\s&\-\.]+)/i,
        /Versicherer:\s*([^\n]+)/i,
        /Versicherungsgesellschaft:\s*([^\n]+)/i,
        /^([A-Z][A-Za-zäöüÄÖÜß]+[\s\w]*)\s*\n[=\-]{3,}/m, // Company name with underline
      ],
      
      // Contract details
      contractNumber: [
        /Vertragsnummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Versicherungsscheinnummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Police[:\s]+([A-Z0-9\-\/]+)/i,
        /Vertrags-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i,
        /Policennummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Kundennummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Mitgliedsnummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Referenznummer[:\s]+([A-Z0-9\-\/]+)/i
      ],
      
      customerNumber: [
        /Kundennummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Kunden-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i,
        /Mitgliedsnummer[:\s]+([A-Z0-9\-\/]+)/i,
        /Versicherungsnehmer-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i,
        /Partner-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i
      ],

      // Dates
      startDate: [
        /Vertragsbeginn[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Beginn[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Versicherungsbeginn[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Gültig\s+ab[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /ab\s+dem\s+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i
      ],
      
      endDate: [
        /Vertragsende[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Ablauf[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Laufzeit\s+bis[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Gültig\s+bis[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i,
        /Befristet\s+bis[:\s]+(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/i
      ],
      
      // Cancellation terms
      cancellationPeriod: [
        /Kündigungsfrist[:\s]+(\d+)\s*(Monat|Tag|Woche)/i,
        /kündbar\s+mit\s+(\d+)\s*(Monat|Tag|Woche)/i,
        /Kündigung\s+(\d+)\s*(Monat|Tag|Woche)\s+vor/i,
        /(\d+)\s*(Monat|Tag|Woche)n?\s+vor\s+Ablauf/i,
        /Frist\s+von\s+(\d+)\s*(Monat|Tag|Woche)/i
      ],
      
      // Monthly cost
      monthlyCost: [
        /Monatsbeitrag[:\s]+([0-9.,]+)\s*€/i,
        /Monatlich[:\s]+([0-9.,]+)\s*€/i,
        /mtl\.[:\s]+([0-9.,]+)\s*€/i,
        /pro\s+Monat[:\s]+([0-9.,]+)\s*€/i,
        /([0-9.,]+)\s*€\s*\/\s*Monat/i,
        /([0-9.,]+)\s*€\s*monatlich/i
      ],
      
      // Annual cost
      annualCost: [
        /Jahresbeitrag[:\s]+([0-9.,]+)\s*€/i,
        /Jährlich[:\s]+([0-9.,]+)\s*€/i,
        /pro\s+Jahr[:\s]+([0-9.,]+)\s*€/i,
        /([0-9.,]+)\s*€\s*\/\s*Jahr/i,
        /([0-9.,]+)\s*€\s*jährlich/i,
        /Gesamtbeitrag[:\s]+([0-9.,]+)\s*€/i
      ],

      // Contact information extraction
      email: [
        /E-Mail[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      ],
      
      phone: [
        /Tel\.?[:\s]+([\+0-9\s\-\(\)\/]+)/i,
        /Telefon[:\s]+([\+0-9\s\-\(\)\/]+)/i,
        /Hotline[:\s]+([\+0-9\s\-\(\)\/]+)/i,
        /Service[:\s]+([\+0-9\s\-\(\)\/]+)/i,
        /([\+0-9]{1,4}[\s\-]?[\(]?[0-9]{1,5}[\)]?[\s\-]?[0-9]{1,10})/
      ],
      
      address: [
        /([A-Za-zäöüÄÖÜß\s]+straße\s+\d+[\w]*)/i,
        /([A-Za-zäöüÄÖÜß\s]+weg\s+\d+[\w]*)/i,
        /([A-Za-zäöüÄÖÜß\s]+platz\s+\d+[\w]*)/i,
        /([A-Za-zäöüÄÖÜß\s]+allee\s+\d+[\w]*)/i,
        /(\d{5}\s+[A-Za-zäöüÄÖÜß\s]+)/  // PLZ + City
      ]
    };
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
    const parts = dateStr.split(/[\.\/-]/);
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

  analyzeCancellationPeriod(text) {
    const match = text.match(/(\d+)\s*(Monat|Tag|Woche)/i);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    const unitMap = {
      'tag': 'days',
      'tage': 'days',
      'woche': 'weeks',
      'wochen': 'weeks',
      'monat': 'months',
      'monate': 'months'
    };
    
    return {
      value,
      unit: unitMap[unit] || unit,
      inDays: unit.includes('tag') ? value : 
              unit.includes('woche') ? value * 7 : 
              value * 30
    };
  }

  detectContractType(text) {
    const types = {
      insurance: ['versicherung', 'police', 'versicherer', 'deckung', 'schutzbrief', 'haftpflicht', 'krankenversicherung'],
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

  async analyzeContract(text, filename = '') {
    try {
      // Basic extraction
      const contractNumber = this.extractPattern(text, this.patterns.contractNumber);
      const customerNumber = this.extractPattern(text, this.patterns.customerNumber);
      const startDateStr = this.extractPattern(text, this.patterns.startDate);
      const endDateStr = this.extractPattern(text, this.patterns.endDate);
      const cancellationStr = this.extractPattern(text, this.patterns.cancellationPeriod);
      const monthlyCostStr = this.extractPattern(text, this.patterns.monthlyCost);
      const annualCostStr = this.extractPattern(text, this.patterns.annualCost);
      
      // Provider detection with confidence
      const providerDetection = detectProviderWithConfidence(text);
      let provider = providerDetection.provider;
      
      // If no provider found in text, try filename
      if (!provider && filename) {
        const filenameDetection = detectProviderWithConfidence(filename);
        if (filenameDetection.confidence > 50) {
          provider = filenameDetection.provider;
        }
      }
      
      // Extract provider contact details from document if not in database
      let providerEmail = provider?.cancelEmail || provider?.email;
      let providerPhone = provider?.phone;
      let providerAddress = provider?.address;
      
      // Try to extract from document if not found
      if (!providerEmail) {
        providerEmail = this.extractPattern(text, this.patterns.email);
      }
      if (!providerPhone) {
        providerPhone = this.extractPattern(text, this.patterns.phone);
      }
      if (!providerAddress) {
        const street = this.extractPattern(text, this.patterns.address);
        if (street) {
          // Try to find ZIP and city
          const zipCityMatch = text.match(/(\d{5})\s+([A-Za-zäöüÄÖÜß\s]+)/);
          if (zipCityMatch) {
            providerAddress = {
              street: street,
              zip: zipCityMatch[1],
              city: zipCityMatch[2].trim()
            };
          }
        }
      }
      
      // Parse dates
      const startDate = this.parseGermanDate(startDateStr);
      const endDate = this.parseGermanDate(endDateStr);
      
      // Parse costs
      const monthlyCost = this.parseCost(monthlyCostStr);
      const annualCost = this.parseCost(annualCostStr) || (monthlyCost ? monthlyCost * 12 : null);
      
      // Parse cancellation period
      const cancellationPeriod = this.analyzeCancellationPeriod(cancellationStr || text);
      
      // Detect contract type
      const contractType = this.detectContractType(text);
      
      // Calculate important dates
      const now = new Date();
      let nextCancellationDate = null;
      let autoRenewalDate = null;
      
      if (endDate && cancellationPeriod) {
        const cancellationDeadline = new Date(endDate);
        cancellationDeadline.setDate(cancellationDeadline.getDate() - cancellationPeriod.inDays);
        nextCancellationDate = cancellationDeadline;
        
        // Auto renewal is typically the day after contract end
        autoRenewalDate = new Date(endDate);
        autoRenewalDate.setDate(autoRenewalDate.getDate() + 1);
      }
      
      // Risk assessment
      const riskFactors = [];
      if (endDate && endDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        riskFactors.push('Contract ending soon');
      }
      if (nextCancellationDate && nextCancellationDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        riskFactors.push('Cancellation deadline approaching');
      }
      if (text.toLowerCase().includes('automatisch') || text.toLowerCase().includes('verlänger')) {
        riskFactors.push('Auto-renewal clause detected');
      }
      if (text.toLowerCase().includes('preiserhöhung') || text.toLowerCase().includes('anpassung')) {
        riskFactors.push('Price increase clause detected');
      }
      
      const riskLevel = riskFactors.length >= 2 ? 'high' : 
                       riskFactors.length === 1 ? 'medium' : 'low';

      return {
        success: true,
        data: {
          // Provider information
          provider: provider ? {
            name: provider.name,
            displayName: provider.displayName,
            email: providerEmail,
            phone: providerPhone,
            address: providerAddress,
            category: provider.category,
            confidence: providerDetection.confidence
          } : null,
          
          // Contract identification
          contractNumber,
          customerNumber,
          contractType,
          
          // Dates
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          nextCancellationDate: nextCancellationDate?.toISOString(),
          autoRenewalDate: autoRenewalDate?.toISOString(),
          
          // Cancellation terms
          cancellationPeriod,
          
          // Costs
          monthlyCost,
          annualCost,
          
          // Risk assessment
          riskLevel,
          riskFactors,
          
          // Metadata
          analyzedAt: new Date().toISOString(),
          confidence: providerDetection.confidence || 0
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

  // Generate smart recommendations based on analysis
  generateRecommendations(analysis) {
    const recommendations = [];
    const { data } = analysis;
    
    if (data.riskLevel === 'high') {
      recommendations.push({
        type: 'urgent',
        title: 'Immediate Action Required',
        description: 'Your contract requires immediate attention to avoid auto-renewal or missing cancellation deadlines.',
        action: 'cancel_now'
      });
    }
    
    if (data.nextCancellationDate) {
      const daysUntilCancellation = Math.floor(
        (new Date(data.nextCancellationDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilCancellation <= 30) {
        recommendations.push({
          type: 'warning',
          title: `Cancellation deadline in ${daysUntilCancellation} days`,
          description: 'Act now to keep your options open.',
          action: 'prepare_cancellation'
        });
      }
    }
    
    if (data.contractType === 'insurance' || data.contractType === 'energy') {
      recommendations.push({
        type: 'optimization',
        title: 'Compare Better Offers',
        description: `The ${data.contractType} market changes frequently. You might find better rates.`,
        action: 'compare_offers'
      });
    }
    
    if (data.annualCost > 1000) {
      recommendations.push({
        type: 'savings',
        title: 'High-Value Contract',
        description: 'This contract represents significant annual spending. Regular reviews could lead to substantial savings.',
        action: 'review_contract'
      });
    }
    
    return recommendations;
  }
}

module.exports = new ContractAnalyzer();
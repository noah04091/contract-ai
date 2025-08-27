// backend/services/tools/deadlineScanner.js

class DeadlineScanner {
  constructor() {
    this.description = 'Scans contracts for deadlines, dates, and time-sensitive obligations';
    this.capabilities = ['deadline_detection', 'date_extraction', 'time_analysis'];
    
    // Date and deadline patterns for German and English
    this.datePatterns = {
      // Absolute dates
      absolute: [
        // German formats
        /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g,
        /\b(\d{1,2})\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{2,4})\b/gi,
        // English formats
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{2,4})\b/gi,
        /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2,4})\b/gi
      ],
      
      // Relative time periods
      relative: [
        // German
        /\b(\d+)\s*(Tag|Tage|Werktag|Werktage|Kalendertag|Kalendertage)\b/gi,
        /\b(\d+)\s*(Woche|Wochen|Monat|Monate|Jahr|Jahre)\b/gi,
        /\binner?halb\s+(\d+)\s*(Tag|Tage|Woche|Wochen|Monat|Monate|Jahr|Jahre)\b/gi,
        /\bbis\s+(\d+)\s*(Tag|Tage|Woche|Wochen|Monat|Monate|Jahr|Jahre)\b/gi,
        // English
        /\b(\d+)\s*(day|days|business\s+day|business\s+days|week|weeks|month|months|year|years)\b/gi,
        /\bwithin\s+(\d+)\s*(day|days|business\s+day|business\s+days|week|weeks|month|months|year|years)\b/gi,
        /\bup\s+to\s+(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/gi
      ]
    };
    
    // Deadline trigger patterns
    this.deadlinePatterns = [
      // German triggers
      /\b(frist|termin|stichtag|deadline|bis\s+zum|spätestens|kündigun(g|gs)frist)\b/gi,
      /\b(verlängerung|erneuerung|automatic|automatisch|unless|es\s+sei\s+denn)\b/gi,
      /\b(notice|mitteilung|benachrichtigung|kündigung|termination)\b/gi,
      // English triggers
      /\b(deadline|due\s+date|expiry|expiration|renewal|termination\s+date)\b/gi,
      /\b(shall\s+expire|must\s+be|no\s+later\s+than|prior\s+to)\b/gi
    ];
  }

  /**
   * Main execution method
   */
  async execute(context) {
    const startTime = Date.now();
    
    try {
      const { question, retrievalResults } = context;
      
      // Extract all dates and deadlines from retrieved chunks
      const extractedDeadlines = this.extractDeadlines(retrievalResults);
      
      // Classify deadline types
      const classifiedDeadlines = this.classifyDeadlines(extractedDeadlines);
      
      // Calculate urgency and priorities
      const prioritizedDeadlines = this.prioritizeDeadlines(classifiedDeadlines);
      
      // Generate calendar events
      const calendarEvents = this.generateCalendarEvents(prioritizedDeadlines);
      
      // Create insights
      const insights = this.createDeadlineInsights(prioritizedDeadlines);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          totalDeadlines: prioritizedDeadlines.length,
          upcomingDeadlines: prioritizedDeadlines.filter(d => d.urgency === 'high').length,
          deadlinesByType: this.groupDeadlinesByType(prioritizedDeadlines),
          calendarEvents,
          recommendations: this.generateRecommendations(prioritizedDeadlines)
        },
        insights,
        citations: this.generateCitations(prioritizedDeadlines),
        metadata: {
          processingTime: duration,
          toolName: 'deadlineScanner'
        }
      };
      
    } catch (error) {
      console.error('DeadlineScanner execution failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Extract deadlines from retrieval results
   */
  extractDeadlines(retrievalResults) {
    const deadlines = [];
    
    if (!retrievalResults?.results) {
      return deadlines;
    }
    
    for (const chunk of retrievalResults.results) {
      const chunkDeadlines = this.extractFromText(chunk.text, chunk);
      deadlines.push(...chunkDeadlines);
    }
    
    return deadlines;
  }

  /**
   * Extract deadlines from a single text chunk
   */
  extractFromText(text, sourceChunk) {
    const deadlines = [];
    
    // Check for deadline trigger words
    const hasDeadlineTrigger = this.deadlinePatterns.some(pattern => 
      pattern.test(text)
    );
    
    if (!hasDeadlineTrigger) {
      return deadlines; // Skip if no deadline indicators
    }
    
    // Extract absolute dates
    for (const pattern of this.datePatterns.absolute) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        deadlines.push({
          type: 'absolute',
          rawText: match[0],
          fullMatch: match,
          context: this.extractContext(text, match.index),
          sourceChunk: sourceChunk.chunkId,
          page: sourceChunk.spans?.pageStart || 1,
          extractedDate: this.parseAbsoluteDate(match),
          confidence: this.calculateDateConfidence(text, match.index)
        });
      }
    }
    
    // Extract relative dates
    for (const pattern of this.datePatterns.relative) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        deadlines.push({
          type: 'relative',
          rawText: match[0],
          fullMatch: match,
          context: this.extractContext(text, match.index),
          sourceChunk: sourceChunk.chunkId,
          page: sourceChunk.spans?.pageStart || 1,
          relativePeriod: this.parseRelativePeriod(match),
          confidence: this.calculateDateConfidence(text, match.index)
        });
      }
    }
    
    return deadlines;
  }

  /**
   * Parse absolute date from regex match
   */
  parseAbsoluteDate(match) {
    try {
      const dateString = match[0];
      
      // Handle different date formats
      if (/\d{1,2}\.\d{1,2}\.\d{2,4}/.test(dateString)) {
        // German format: DD.MM.YYYY
        const parts = dateString.split('.');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-based
        const year = parseInt(parts[2]);
        return new Date(year < 100 ? 2000 + year : year, month, day);
      }
      
      if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(dateString)) {
        // US format: MM/DD/YYYY
        const parts = dateString.split('/');
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        return new Date(year < 100 ? 2000 + year : year, month, day);
      }
      
      // Try to parse with Date constructor for text dates
      return new Date(dateString);
      
    } catch (error) {
      console.error('Date parsing failed:', error);
      return null;
    }
  }

  /**
   * Parse relative period from regex match
   */
  parseRelativePeriod(match) {
    const text = match[0].toLowerCase();
    const numbers = text.match(/\d+/g);
    const value = numbers ? parseInt(numbers[0]) : 1;
    
    let unit = 'days';
    if (/woche|week/i.test(text)) unit = 'weeks';
    else if (/monat|month/i.test(text)) unit = 'months';
    else if (/jahr|year/i.test(text)) unit = 'years';
    
    return {
      value,
      unit,
      text: match[0]
    };
  }

  /**
   * Extract surrounding context for better understanding
   */
  extractContext(text, matchIndex, contextLength = 100) {
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + contextLength);
    
    return {
      before: text.substring(start, matchIndex),
      after: text.substring(matchIndex, end),
      full: text.substring(start, end)
    };
  }

  /**
   * Calculate confidence score for date extraction
   */
  calculateDateConfidence(text, matchIndex) {
    let confidence = 0.5;
    
    const context = this.extractContext(text, matchIndex, 50).full.toLowerCase();
    
    // Boost confidence for strong deadline indicators
    const strongIndicators = [
      'frist', 'deadline', 'spätestens', 'no later than',
      'kündigung', 'termination', 'renewal', 'verlängerung'
    ];
    
    for (const indicator of strongIndicators) {
      if (context.includes(indicator)) {
        confidence += 0.2;
      }
    }
    
    // Reduce confidence for weak contexts
    const weakIndicators = ['beispiel', 'example', 'etwa', 'circa', 'approximately'];
    
    for (const indicator of weakIndicators) {
      if (context.includes(indicator)) {
        confidence -= 0.3;
      }
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Classify deadlines by type and importance
   */
  classifyDeadlines(deadlines) {
    return deadlines.map(deadline => {
      const classification = this.classifyDeadlineType(deadline.context.full);
      
      return {
        ...deadline,
        classification,
        importance: this.calculateImportance(deadline, classification)
      };
    });
  }

  /**
   * Classify deadline type based on context
   */
  classifyDeadlineType(context) {
    const contextLower = context.toLowerCase();
    
    const types = {
      termination: /kündigung|termination|cancel|beenden/i,
      payment: /zahlung|payment|rechnung|invoice|fällig|due/i,
      renewal: /verlängerung|renewal|extend|automatic/i,
      notice: /mitteilung|notice|inform|benachrichtig/i,
      performance: /leistung|performance|deliver|erfüllen/i,
      warranty: /gewährleistung|warranty|garantie/i
    };
    
    for (const [type, pattern] of Object.entries(types)) {
      if (pattern.test(contextLower)) {
        return type;
      }
    }
    
    return 'general';
  }

  /**
   * Calculate importance score for deadline
   */
  calculateImportance(deadline, classification) {
    let score = 0.5;
    
    // Type-based scoring
    const typeScores = {
      termination: 0.9,
      payment: 0.8,
      renewal: 0.7,
      notice: 0.6,
      performance: 0.7,
      warranty: 0.5,
      general: 0.4
    };
    
    score = typeScores[classification] || 0.5;
    
    // Confidence boost
    score *= deadline.confidence;
    
    return Math.min(1.0, score);
  }

  /**
   * Prioritize deadlines by urgency
   */
  prioritizeDeadlines(deadlines) {
    const now = new Date();
    
    return deadlines.map(deadline => {
      let urgency = 'low';
      let daysUntil = null;
      
      if (deadline.extractedDate) {
        const timeDiff = deadline.extractedDate.getTime() - now.getTime();
        daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysUntil < 0) urgency = 'overdue';
        else if (daysUntil <= 7) urgency = 'high';
        else if (daysUntil <= 30) urgency = 'medium';
        else urgency = 'low';
      } else if (deadline.relativePeriod) {
        // Estimate urgency for relative dates
        const { value, unit } = deadline.relativePeriod;
        let estimatedDays = value;
        
        if (unit === 'weeks') estimatedDays *= 7;
        else if (unit === 'months') estimatedDays *= 30;
        else if (unit === 'years') estimatedDays *= 365;
        
        if (estimatedDays <= 7) urgency = 'high';
        else if (estimatedDays <= 30) urgency = 'medium';
        else urgency = 'low';
      }
      
      return {
        ...deadline,
        urgency,
        daysUntil,
        priority: this.calculatePriority(deadline.importance, urgency)
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority score
   */
  calculatePriority(importance, urgency) {
    const urgencyScores = {
      overdue: 1.0,
      high: 0.9,
      medium: 0.6,
      low: 0.3
    };
    
    return importance * urgencyScores[urgency];
  }

  /**
   * Generate calendar events from deadlines
   */
  generateCalendarEvents(deadlines) {
    return deadlines
      .filter(deadline => deadline.extractedDate && deadline.urgency !== 'overdue')
      .map(deadline => ({
        id: `deadline_${deadline.sourceChunk}_${deadline.rawText}`,
        title: this.generateEventTitle(deadline),
        date: deadline.extractedDate.toISOString().split('T')[0],
        type: 'deadline',
        classification: deadline.classification,
        urgency: deadline.urgency,
        page: deadline.page,
        context: deadline.context.full.substring(0, 200) + '...'
      }));
  }

  /**
   * Generate event title for calendar
   */
  generateEventTitle(deadline) {
    const typeLabels = {
      termination: 'Kündigungsfrist',
      payment: 'Zahlungstermin',
      renewal: 'Verlängerungstermin',
      notice: 'Mitteilungsfrist',
      performance: 'Leistungstermin',
      warranty: 'Gewährleistungsfrist',
      general: 'Vertragstermin'
    };
    
    return typeLabels[deadline.classification] || 'Vertragstermin';
  }

  /**
   * Create insights for the insights panel
   */
  createDeadlineInsights(deadlines) {
    const now = new Date();
    
    const upcomingDeadlines = deadlines
      .filter(d => d.extractedDate && d.daysUntil > 0 && d.daysUntil <= 30)
      .map(d => ({
        date: d.extractedDate,
        type: d.classification,
        daysUntil: d.daysUntil,
        urgency: d.urgency,
        page: d.page,
        description: this.generateEventTitle(d)
      }));
    
    return {
      deadlines: upcomingDeadlines,
      keyTerms: deadlines.map(d => d.rawText).filter((v, i, a) => a.indexOf(v) === i),
      risks: deadlines
        .filter(d => d.urgency === 'high' || d.urgency === 'overdue')
        .map(d => ({
          type: 'deadline_risk',
          description: `${this.generateEventTitle(d)}: ${d.rawText}`,
          severity: d.urgency === 'overdue' ? 'high' : 'medium',
          daysUntil: d.daysUntil
        }))
    };
  }

  /**
   * Group deadlines by type
   */
  groupDeadlinesByType(deadlines) {
    const groups = {};
    
    for (const deadline of deadlines) {
      const type = deadline.classification || 'general';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(deadline);
    }
    
    return groups;
  }

  /**
   * Generate recommendations based on deadlines
   */
  generateRecommendations(deadlines) {
    const recommendations = [];
    
    // High urgency deadlines
    const highUrgency = deadlines.filter(d => d.urgency === 'high');
    if (highUrgency.length > 0) {
      recommendations.push({
        type: 'urgent_action',
        priority: 'high',
        message: `${highUrgency.length} Fristen laufen in den nächsten 7 Tagen ab.`,
        deadlines: highUrgency.slice(0, 3)
      });
    }
    
    // Overdue deadlines
    const overdue = deadlines.filter(d => d.urgency === 'overdue');
    if (overdue.length > 0) {
      recommendations.push({
        type: 'overdue_alert',
        priority: 'critical',
        message: `${overdue.length} Fristen sind bereits abgelaufen.`,
        deadlines: overdue.slice(0, 3)
      });
    }
    
    return recommendations;
  }

  /**
   * Generate citations for deadline references
   */
  generateCitations(deadlines) {
    return deadlines
      .filter(d => d.confidence > 0.6)
      .map(d => ({
        chunkId: d.sourceChunk,
        text: d.context.full,
        page: d.page,
        type: 'deadline_reference',
        confidence: d.confidence,
        deadlineType: d.classification
      }));
  }

  /**
   * Health check for the tool
   */
  async healthCheck() {
    try {
      const testText = 'Die Kündigungsfrist beträgt 3 Monate zum 31.12.2024.';
      const testChunk = { chunkId: 'test', spans: { pageStart: 1 } };
      const result = this.extractFromText(testText, testChunk);
      
      return {
        status: 'healthy',
        patternsLoaded: this.datePatterns.absolute.length + this.datePatterns.relative.length,
        testResult: result.length > 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = DeadlineScanner;
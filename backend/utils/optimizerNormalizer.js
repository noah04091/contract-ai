// 📁 backend/utils/optimizerNormalizer.js - REVOLUTION: Intelligent AI Output Normalization
const natural = require('natural'); // Optional: For advanced NLP features

// 🚀 REVOLUTIONARY: Multi-Layer Normalization Engine
class OptimizationNormalizer {
  constructor() {
    // Initialize NLP tools if available
    try {
      this.tokenizer = new natural.WordTokenizer();
      this.stemmer = natural.PorterStemmerDe;
      this.nlpAvailable = true;
    } catch (e) {
      this.nlpAvailable = false;
      console.log('📌 NLP libraries not available, using basic normalization');
    }
    
    // Instruction patterns to remove
    this.instructionPatterns = [
      /^(Fügen Sie |Ergänzen Sie |Ersetzen Sie |Ändern Sie |Bitte |Sollten Sie |Könnten Sie )/gi,
      /^(Add |Insert |Replace |Change |Please |Should |Could |You should |You could )/gi,
      /(hinzu|ein|folgendes|folgenden|wie folgt|dies|das)/gi,
      /^(Es wird empfohlen|Wir empfehlen|Empfehlung:|Vorschlag:)/gi,
      /^(It is recommended|We recommend|Recommendation:|Suggestion:)/gi
    ];
    
    // Legal boilerplate to remove
    this.boilerplatePatterns = [
      /Dieser Vertrag wurde.*?erstellt\./gi,
      /Die Parteien vereinbaren.*?wie folgt:/gi,
      /This agreement is.*?follows:/gi,
      /WICHTIG:|HINWEIS:|ACHTUNG:/gi
    ];
    
    // Quality thresholds
    this.qualityThresholds = {
      minImprovedTextLength: 20,
      maxImprovedTextLength: 2000,
      minReasoningLength: 30,
      maxReasoningLength: 500,
      minConfidence: 0,
      maxConfidence: 100,
      minRiskImpact: 0,
      maxRiskImpact: 10
    };
  }

  // 🚀 MAIN: Normalize complete optimization result
  normalizeOptimizationResult(rawResult, contractType = 'sonstiges') {
    console.log('🚀 NORMALIZER: Starting intelligent normalization...');
    
    // Parse result if it's a string
    let parsed = this.parseRawResult(rawResult);
    
    // Normalize metadata
    const normalizedMeta = this.normalizeMeta(parsed.meta, contractType);
    
    // Normalize categories and issues
    const normalizedCategories = this.normalizeCategories(parsed.categories || []);
    
    // Calculate scores and summary
    const scoreData = this.calculateScores(normalizedCategories);
    
    // Build final normalized result
    const normalized = {
      meta: normalizedMeta,
      categories: normalizedCategories,
      score: scoreData.score,
      summary: scoreData.summary,
      quality: this.assessQuality(normalizedCategories),
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ NORMALIZER: Complete - ${normalized.summary.totalIssues} issues normalized`);
    
    return normalized;
  }

  // 🚀 Parse raw AI output (JSON or text)
  parseRawResult(raw) {
    if (typeof raw === 'object' && raw !== null) {
      return raw;
    }
    
    if (typeof raw !== 'string') {
      return this.getEmptyStructure();
    }
    
    // Try JSON extraction
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('⚠️ JSON parsing failed, trying text extraction');
      }
    }
    
    // Fallback to structured text parsing
    return this.parseStructuredText(raw);
  }

  // 🚀 Parse structured text output
  parseStructuredText(text) {
    const result = this.getEmptyStructure();
    
    // Extract categories
    const categoryPattern = /(?:KATEGORIE|CATEGORY|BEREICH|SECTION):\s*([^\n]+)/gi;
    const categories = new Map();
    
    let match;
    while ((match = categoryPattern.exec(text)) !== null) {
      const categoryName = match[1].trim();
      const categoryKey = this.normalizeCategoryTag(categoryName);
      
      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, {
          tag: categoryKey,
          label: this.beautifyCategoryLabel(categoryName),
          present: true,
          issues: []
        });
      }
    }
    
    // Extract issues
    const issuePatterns = [
      /PROBLEM:\s*([\s\S]+?)(?=LÖSUNG:|EMPFEHLUNG:|PROBLEM:|KATEGORIE:|$)/gi,
      /ISSUE:\s*([\s\S]+?)(?=SOLUTION:|RECOMMENDATION:|ISSUE:|CATEGORY:|$)/gi
    ];
    
    const solutionPatterns = [
      /LÖSUNG:\s*([\s\S]+?)(?=BEGRÜNDUNG:|PROBLEM:|KATEGORIE:|$)/gi,
      /EMPFEHLUNG:\s*([\s\S]+?)(?=BEGRÜNDUNG:|PROBLEM:|KATEGORIE:|$)/gi,
      /SOLUTION:\s*([\s\S]+?)(?=REASONING:|PROBLEM:|CATEGORY:|$)/gi
    ];
    
    issuePatterns.forEach(pattern => {
      let issueMatch;
      while ((issueMatch = pattern.exec(text)) !== null) {
        const problem = issueMatch[1].trim();
        
        // Find corresponding solution
        let solution = '';
        solutionPatterns.forEach(solPattern => {
          const solMatch = solPattern.exec(text.substring(issueMatch.index));
          if (solMatch && solMatch.index < 500) {
            solution = solMatch[1].trim();
          }
        });
        
        if (solution) {
          const issue = {
            id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            summary: this.extractSummary(problem),
            originalText: problem.substring(0, 500),
            improvedText: this.cleanImprovedText(solution),
            legalReasoning: this.extractReasoning(text, issueMatch.index),
            risk: 5,
            impact: 5,
            confidence: 75,
            difficulty: 'Mittel'
          };
          
          // Add to first or create general category
          const firstCategory = categories.values().next().value || 
                              this.createGeneralCategory();
          
          if (!categories.has('general') && categories.size === 0) {
            categories.set('general', firstCategory);
          }
          
          const targetCategory = categories.values().next().value;
          if (targetCategory) {
            targetCategory.issues.push(issue);
          }
        }
      }
    });
    
    result.categories = Array.from(categories.values());
    return result;
  }

  // 🚀 Normalize metadata
  normalizeMeta(meta, contractType) {
    const normalized = {
      type: this.validateContractType(meta?.type || contractType),
      jurisdiction: this.normalizeJurisdiction(meta?.jurisdiction),
      language: this.normalizeLanguage(meta?.language),
      roles: this.normalizeRoles(meta?.roles),
      confidence: this.clamp(meta?.confidence || 80, 0, 100),
      detectedClauses: Array.isArray(meta?.detectedClauses) ? meta.detectedClauses : [],
      riskFactors: Array.isArray(meta?.riskFactors) ? meta.riskFactors : [],
      analysisVersion: meta?.analysisVersion || '3.0',
      timestamp: meta?.timestamp || new Date().toISOString()
    };
    
    return normalized;
  }

  // 🚀 Normalize categories
  normalizeCategories(categories) {
    if (!Array.isArray(categories)) {
      return [];
    }
    
    const normalizedCategories = new Map();
    
    categories.forEach(category => {
      if (!category || typeof category !== 'object') return;
      
      const tag = this.normalizeCategoryTag(category.tag);
      
      // Skip duplicates
      if (normalizedCategories.has(tag)) {
        // Merge issues
        const existing = normalizedCategories.get(tag);
        if (Array.isArray(category.issues)) {
          existing.issues.push(...category.issues);
        }
        return;
      }
      
      const normalizedCategory = {
        tag,
        label: this.beautifyCategoryLabel(category.label || tag),
        present: category.present !== false,
        issues: this.normalizeIssues(category.issues || [])
      };
      
      // Only add if has valid issues
      if (normalizedCategory.issues.length > 0) {
        normalizedCategories.set(tag, normalizedCategory);
      }
    });
    
    return Array.from(normalizedCategories.values());
  }

  // 🚀 Normalize issues
  normalizeIssues(issues) {
    if (!Array.isArray(issues)) {
      return [];
    }
    
    const normalized = [];
    const seenTexts = new Set();
    
    issues.forEach((issue, index) => {
      if (!issue || typeof issue !== 'object') return;
      
      // Clean improved text
      const improvedText = this.cleanImprovedText(issue.improvedText || '');
      
      // Skip if no valid improved text
      if (!improvedText || improvedText.length < this.qualityThresholds.minImprovedTextLength) {
        return;
      }
      
      // Skip duplicates
      const textHash = this.hashText(improvedText);
      if (seenTexts.has(textHash)) {
        return;
      }
      seenTexts.add(textHash);
      
      const normalizedIssue = {
        id: issue.id || `issue_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        summary: this.cleanSummary(issue.summary || 'Optimierungspotential'),
        originalText: this.cleanOriginalText(issue.originalText || ''),
        improvedText: this.truncateText(improvedText, this.qualityThresholds.maxImprovedTextLength),
        legalReasoning: this.cleanReasoning(issue.legalReasoning || issue.reasoning || ''),
        benchmark: this.cleanBenchmark(issue.benchmark),
        risk: this.clamp(parseInt(issue.risk) || 5, 0, 10),
        impact: this.clamp(parseInt(issue.impact) || 5, 0, 10),
        confidence: this.clamp(parseInt(issue.confidence) || 75, 0, 100),
        difficulty: this.normalizeDifficulty(issue.difficulty),
        category: issue.category,
        priority: this.calculatePriority(issue)
      };
      
      normalized.push(normalizedIssue);
    });
    
    // Sort by priority
    return normalized.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });
  }

  // 🚀 Clean improved text
  cleanImprovedText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.trim();
    
    // Remove instruction patterns
    this.instructionPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove boilerplate
    this.boilerplatePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Extract actual clause if wrapped in quotes
    const quoteMatch = cleaned.match(/["„»](.*?)[""]|:\s*(.+)/s);
    if (quoteMatch) {
      cleaned = quoteMatch[1] || quoteMatch[2] || cleaned;
    }
    
    // Remove leading numbers/bullets
    cleaned = cleaned.replace(/^[\d\-•*]+\.\s*/, '');
    
    // Trim and normalize whitespace
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    // Ensure it starts with capital letter
    if (cleaned.length > 0) {
      cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned;
  }

  // 🚀 Clean original text
  cleanOriginalText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.trim();
    
    // Handle special markers
    if (cleaned === 'FEHLT' || cleaned.toLowerCase() === 'missing') {
      return 'FEHLT - Klausel nicht vorhanden';
    }
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Truncate if too long
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 497) + '...';
    }
    
    return cleaned;
  }

  // 🚀 Clean reasoning
  cleanReasoning(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.trim();
    
    // Remove duplicate sentences
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim());
    const uniqueSentences = [...new Set(sentences)];
    
    // Take only first 3-4 sentences
    const maxSentences = 4;
    const selectedSentences = uniqueSentences.slice(0, maxSentences);
    
    cleaned = selectedSentences.join('. ');
    if (cleaned && !cleaned.endsWith('.')) {
      cleaned += '.';
    }
    
    // Ensure reasonable length
    if (cleaned.length > this.qualityThresholds.maxReasoningLength) {
      const truncated = cleaned.substring(0, this.qualityThresholds.maxReasoningLength - 3);
      const lastPeriod = truncated.lastIndexOf('.');
      cleaned = lastPeriod > 300 
        ? truncated.substring(0, lastPeriod + 1)
        : truncated + '...';
    }
    
    return cleaned;
  }

  // 🚀 Calculate scores
  calculateScores(categories) {
    let totalIssues = 0;
    let redFlags = 0;
    let quickWins = 0;
    let totalRisk = 0;
    let totalImpact = 0;
    
    categories.forEach(category => {
      category.issues.forEach(issue => {
        totalIssues++;
        totalRisk += issue.risk;
        totalImpact += issue.impact;
        
        if (issue.risk >= 8 || issue.priority === 'critical') {
          redFlags++;
        }
        
        if (issue.difficulty === 'Einfach' && issue.confidence >= 80 && issue.risk <= 4) {
          quickWins++;
        }
      });
    });
    
    const avgRisk = totalIssues > 0 ? totalRisk / totalIssues : 0;
    const avgImpact = totalIssues > 0 ? totalImpact / totalIssues : 0;
    
    // Calculate health score
    let healthScore = 100;
    healthScore -= Math.round(avgRisk * 8);
    healthScore -= Math.round((10 - avgImpact) * 2);
    healthScore = Math.max(10, Math.min(100, healthScore));
    
    return {
      score: {
        health: healthScore,
        risk: Math.round(avgRisk),
        impact: Math.round(avgImpact)
      },
      summary: {
        redFlags,
        quickWins,
        totalIssues
      }
    };
  }

  // 🚀 Assess quality
  assessQuality(categories) {
    const metrics = {
      totalIssues: 0,
      validIssues: 0,
      averageConfidence: 0,
      averageReasoningLength: 0,
      categoryCoverage: categories.length,
      hasHighPriority: false,
      hasBenchmarks: false
    };
    
    let totalConfidence = 0;
    let totalReasoningLength = 0;
    
    categories.forEach(category => {
      category.issues.forEach(issue => {
        metrics.totalIssues++;
        
        if (issue.improvedText && issue.improvedText.length >= this.qualityThresholds.minImprovedTextLength) {
          metrics.validIssues++;
        }
        
        totalConfidence += issue.confidence;
        totalReasoningLength += (issue.legalReasoning || '').length;
        
        if (issue.priority === 'critical' || issue.priority === 'high') {
          metrics.hasHighPriority = true;
        }
        
        if (issue.benchmark) {
          metrics.hasBenchmarks = true;
        }
      });
    });
    
    if (metrics.totalIssues > 0) {
      metrics.averageConfidence = Math.round(totalConfidence / metrics.totalIssues);
      metrics.averageReasoningLength = Math.round(totalReasoningLength / metrics.totalIssues);
    }
    
    // Calculate quality score
    let qualityScore = 0;
    
    if (metrics.validIssues === metrics.totalIssues) qualityScore += 25;
    if (metrics.averageConfidence >= 80) qualityScore += 25;
    if (metrics.averageReasoningLength >= 100) qualityScore += 20;
    if (metrics.categoryCoverage >= 3) qualityScore += 15;
    if (metrics.hasHighPriority) qualityScore += 10;
    if (metrics.hasBenchmarks) qualityScore += 5;
    
    return {
      score: qualityScore,
      metrics,
      grade: qualityScore >= 90 ? 'A+' : 
             qualityScore >= 80 ? 'A' :
             qualityScore >= 70 ? 'B' :
             qualityScore >= 60 ? 'C' : 'D'
    };
  }

  // 🚀 Helper: Normalize category tag
  normalizeCategoryTag(tag) {
    if (!tag || typeof tag !== 'string') return 'general';
    
    return tag.toLowerCase()
      .replace(/[äöü]/g, char => ({ä: 'ae', ö: 'oe', ü: 'ue'})[char])
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50);
  }

  // 🚀 Helper: Beautify category label
  beautifyCategoryLabel(label) {
    if (!label || typeof label !== 'string') return 'Allgemeine Optimierung';
    
    // Capitalize first letter of each word
    return label.split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // 🚀 Helper: Clean summary
  cleanSummary(summary) {
    if (!summary || typeof summary !== 'string') return 'Optimierungspotential erkannt';
    
    let cleaned = summary.trim();
    
    // Remove common prefixes
    const prefixes = ['Problem:', 'Issue:', 'Summary:', 'Zusammenfassung:'];
    prefixes.forEach(prefix => {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    });
    
    // Ensure proper capitalization
    if (cleaned.length > 0) {
      cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
    }
    
    // Truncate if too long
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 197) + '...';
    }
    
    return cleaned;
  }

  // 🚀 Helper: Clean benchmark
  cleanBenchmark(benchmark) {
    if (!benchmark || typeof benchmark !== 'string') return null;
    
    let cleaned = benchmark.trim();
    
    // Remove common prefixes
    const prefixes = ['Benchmark:', 'Markt:', 'Standard:'];
    prefixes.forEach(prefix => {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    });
    
    // Validate percentage mentions
    const percentMatch = cleaned.match(/(\d+)\s*%/);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1]);
      if (percent > 100) {
        cleaned = cleaned.replace(percentMatch[0], '95%');
      }
    }
    
    return cleaned.length > 10 ? cleaned : null;
  }

  // 🚀 Helper: Normalize difficulty
  normalizeDifficulty(difficulty) {
    if (!difficulty) return 'Mittel';
    
    const mapping = {
      'easy': 'Einfach',
      'einfach': 'Einfach',
      'simple': 'Einfach',
      'low': 'Einfach',
      'medium': 'Mittel',
      'mittel': 'Mittel',
      'moderate': 'Mittel',
      'normal': 'Mittel',
      'hard': 'Komplex',
      'komplex': 'Komplex',
      'complex': 'Komplex',
      'difficult': 'Komplex',
      'high': 'Komplex'
    };
    
    const lower = difficulty.toString().toLowerCase();
    return mapping[lower] || 'Mittel';
  }

  // 🚀 Helper: Calculate priority
  calculatePriority(issue) {
    const risk = issue.risk || 5;
    const impact = issue.impact || 5;
    const confidence = issue.confidence || 75;
    
    const score = (risk * 0.4) + (impact * 0.4) + ((100 - confidence) * 0.002);
    
    if (score >= 8 || risk >= 9) return 'critical';
    if (score >= 6 || risk >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  // 🚀 Helper: Validate contract type
  validateContractType(type) {
    const validTypes = [
      'arbeitsvertrag', 'mietvertrag', 'nda', 'saas_vertrag',
      'kaufvertrag', 'dienstvertrag', 'werkvertrag', 'agb',
      'lizenzvertrag', 'gesellschaftsvertrag', 'darlehensvertrag',
      'franchise', 'sonstiges'
    ];
    
    const normalized = (type || '').toLowerCase().replace(/[^a-z_]/g, '');
    return validTypes.includes(normalized) ? normalized : 'sonstiges';
  }

  // 🚀 Helper: Normalize jurisdiction
  normalizeJurisdiction(jurisdiction) {
    const mapping = {
      'de': 'DE',
      'deutschland': 'DE',
      'germany': 'DE',
      'at': 'AT',
      'austria': 'AT',
      'österreich': 'AT',
      'ch': 'CH',
      'switzerland': 'CH',
      'schweiz': 'CH',
      'us': 'US',
      'usa': 'US',
      'uk': 'UK',
      'gb': 'UK',
      'int': 'INT',
      'international': 'INT',
      'eu': 'EU'
    };
    
    const lower = (jurisdiction || 'DE').toLowerCase();
    return mapping[lower] || 'DE';
  }

  // 🚀 Helper: Normalize language
  normalizeLanguage(language) {
    const mapping = {
      'de': 'de',
      'deutsch': 'de',
      'german': 'de',
      'en': 'en',
      'english': 'en',
      'englisch': 'en'
    };
    
    const lower = (language || 'de').toLowerCase();
    return mapping[lower] || 'de';
  }

  // 🚀 Helper: Normalize roles
  normalizeRoles(roles) {
    if (!Array.isArray(roles)) return [];
    
    return roles
      .filter(role => role && typeof role === 'object')
      .map(role => ({
        type: (role.type || 'party').toLowerCase(),
        name: (role.name || 'Unbekannt').trim()
      }))
      .slice(0, 10); // Max 10 roles
  }

  // 🚀 Helper: Extract summary from text
  extractSummary(text) {
    if (!text || typeof text !== 'string') return 'Optimierung erforderlich';
    
    // Take first sentence or first 100 chars
    const firstSentence = text.match(/^[^.!?]+[.!?]/);
    if (firstSentence) {
      return this.cleanSummary(firstSentence[0]);
    }
    
    return this.cleanSummary(text.substring(0, 100) + '...');
  }

  // 🚀 Helper: Extract reasoning
  extractReasoning(text, position) {
    const reasoningPatterns = [
      /BEGRÜNDUNG:\s*([^§\n]+)/i,
      /REASONING:\s*([^§\n]+)/i,
      /RECHTLICH:\s*([^§\n]+)/i,
      /ERKLÄRUNG:\s*([^§\n]+)/i
    ];
    
    const searchText = text.substring(position, position + 1000);
    
    for (const pattern of reasoningPatterns) {
      const match = searchText.match(pattern);
      if (match) {
        return this.cleanReasoning(match[1]);
      }
    }
    
    return 'Juristische Optimierung zur Risikominimierung und Vertragsverbesserung.';
  }

  // 🚀 Helper: Hash text for duplicate detection
  hashText(text) {
    if (!text) return '';
    
    // Simple hash for duplicate detection
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // 🚀 Helper: Truncate text
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength - 3);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  // 🚀 Helper: Clamp value
  clamp(value, min, max) {
    const num = parseFloat(value) || min;
    return Math.max(min, Math.min(max, num));
  }

  // 🚀 Helper: Get empty structure
  getEmptyStructure() {
    return {
      meta: {
        type: 'sonstiges',
        jurisdiction: 'DE',
        language: 'de',
        roles: []
      },
      categories: [],
      score: { health: 75 },
      summary: { redFlags: 0, quickWins: 0, totalIssues: 0 }
    };
  }

  // 🚀 Helper: Create general category
  createGeneralCategory() {
    return {
      tag: 'general',
      label: 'Allgemeine Optimierungen',
      present: true,
      issues: []
    };
  }
}

// 🚀 EXPORT: Singleton instance
let normalizerInstance = null;

module.exports = {
  // Get singleton instance
  getInstance() {
    if (!normalizerInstance) {
      normalizerInstance = new OptimizationNormalizer();
    }
    return normalizerInstance;
  },
  
  // Direct normalization function
  normalizeOptimizationResult(rawResult, contractType) {
    const normalizer = this.getInstance();
    return normalizer.normalizeOptimizationResult(rawResult, contractType);
  },
  
  // Export class for testing
  OptimizationNormalizer
};
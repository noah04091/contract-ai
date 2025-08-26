// 📁 backend/utils/contractRedrafting.js
// 🎯 Premium Feature: Auto-Redrafting & Diff-Generation für Contract AI
// 
// Zweck: Erstellt automatisch optimierte Vertragsfassungen basierend auf Teilübernahme
// Inputs: originalText, optimizations[], acceptedChanges[]
// Outputs: finalText, changeLog[], diffView[]
// ENV-Flags: Keine zusätzlichen erforderlich

const { createHash } = require('crypto');

/**
 * Generiert automatisch eine optimierte Vertragsfassung basierend auf akzeptierten Änderungen
 */
class ContractRedrafting {
  
  /**
   * Erstellt finale optimierte Vertragsfassung mit Teilübernahme-Support
   */
  static generateOptimizedVersion(originalText, optimizations, acceptanceConfig = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting contract redrafting with ${optimizations.length} optimizations`);
      
      // Standardkonfiguration für Akzeptanz
      const defaultAcceptance = acceptanceConfig.defaultAcceptAll || false;
      const acceptedIds = new Set(acceptanceConfig.acceptedIds || []);
      const rejectedIds = new Set(acceptanceConfig.rejectedIds || []);
      
      let workingText = originalText;
      const changeLog = [];
      const appliedChanges = [];
      const skippedChanges = [];
      
      // Sortiere Optimierungen nach Position (rückwärts für korrekte Textindexierung)
      const sortedOptimizations = optimizations
        .map((opt, index) => ({ ...opt, originalIndex: index }))
        .sort((a, b) => {
          // Falls Position verfügbar, nutze diese
          if (a.position && b.position) {
            return b.position - a.position; // Rückwärts sortieren
          }
          // Ansonsten basierend auf Textlänge der Original-Teile
          return (b.original?.length || 0) - (a.original?.length || 0);
        });
      
      // Verarbeite jede Optimierung
      for (const optimization of sortedOptimizations) {
        const shouldAccept = this.shouldAcceptOptimization(
          optimization, 
          acceptedIds, 
          rejectedIds, 
          defaultAcceptance
        );
        
        if (shouldAccept) {
          const changeResult = this.applyOptimization(workingText, optimization);
          
          if (changeResult.success) {
            workingText = changeResult.newText;
            appliedChanges.push({
              id: optimization.id,
              type: 'applied',
              original: optimization.original || 'FEHLT',
              improved: optimization.improved,
              category: optimization.category,
              reasoning: optimization.reasoning || optimization.legalReasoning,
              position: changeResult.position,
              method: changeResult.method,
              timestamp: new Date().toISOString()
            });
            
            changeLog.push(`✅ Applied: ${optimization.category} - ${optimization.summary}`);
          } else {
            skippedChanges.push({
              id: optimization.id,
              type: 'failed',
              reason: changeResult.error,
              original: optimization.original,
              category: optimization.category
            });
            
            changeLog.push(`⚠️ Failed: ${optimization.category} - ${changeResult.error}`);
          }
        } else {
          skippedChanges.push({
            id: optimization.id,
            type: 'rejected',
            reason: 'User rejected',
            original: optimization.original,
            improved: optimization.improved,
            category: optimization.category
          });
          
          changeLog.push(`❌ Skipped: ${optimization.category} - User rejected`);
        }
      }
      
      // Generiere Diff-View
      const diffView = this.generateDiffView(originalText, workingText, appliedChanges);
      
      // Berechne Statistiken
      const stats = {
        totalOptimizations: optimizations.length,
        appliedChanges: appliedChanges.length,
        skippedChanges: skippedChanges.length,
        successRate: Math.round((appliedChanges.length / optimizations.length) * 100),
        processingTimeMs: Date.now() - startTime,
        textLengthChange: workingText.length - originalText.length,
        improvementAreas: this.categorizeChanges(appliedChanges)
      };
      
      console.log(`✅ Redrafting completed:`, {
        applied: appliedChanges.length,
        skipped: skippedChanges.length,
        processingTime: stats.processingTimeMs + 'ms'
      });
      
      return {
        success: true,
        originalText: originalText,
        optimizedText: workingText,
        changeLog,
        appliedChanges,
        skippedChanges,
        diffView,
        stats,
        metadata: {
          redraftingVersion: '1.0',
          processedAt: new Date().toISOString(),
          textHash: createHash('md5').update(workingText).digest('hex'),
          acceptanceConfig
        }
      };
      
    } catch (error) {
      console.error('❌ Contract redrafting failed:', error);
      return {
        success: false,
        error: error.message,
        originalText: originalText,
        optimizedText: originalText, // Fallback to original
        changeLog: [`❌ Redrafting failed: ${error.message}`],
        appliedChanges: [],
        skippedChanges: [],
        diffView: [],
        stats: { processingTimeMs: Date.now() - startTime }
      };
    }
  }
  
  /**
   * Entscheidet ob eine Optimierung akzeptiert werden soll
   */
  static shouldAcceptOptimization(optimization, acceptedIds, rejectedIds, defaultAcceptance) {
    // Explizit akzeptiert
    if (acceptedIds.has(optimization.id)) return true;
    
    // Explizit abgelehnt
    if (rejectedIds.has(optimization.id)) return false;
    
    // Standard-Verhalten
    return defaultAcceptance;
  }
  
  /**
   * Wendet eine einzelne Optimierung auf den Text an
   */
  static applyOptimization(text, optimization) {
    try {
      let newText = text;
      let method = 'unknown';
      let position = -1;
      
      const original = optimization.original || '';
      const improved = optimization.improved || '';
      
      // Strategie 1: Exakte Ersetzung
      if (original && original !== 'FEHLT' && original.length > 10) {
        const exactIndex = text.indexOf(original);
        if (exactIndex !== -1) {
          newText = text.replace(original, improved);
          method = 'exact_replacement';
          position = exactIndex;
          
          return {
            success: true,
            newText,
            method,
            position,
            replacedText: original
          };
        }
      }
      
      // Strategie 2: Fuzzy Matching (erste 50 Zeichen)
      if (original && original.length > 20) {
        const searchPhrase = original.substring(0, 50).trim();
        const fuzzyIndex = text.indexOf(searchPhrase);
        if (fuzzyIndex !== -1) {
          // Finde den vollständigen Satz/Absatz
          let endIndex = text.indexOf('\n', fuzzyIndex);
          if (endIndex === -1) endIndex = text.indexOf('.', fuzzyIndex) + 1;
          if (endIndex === -1 || endIndex <= fuzzyIndex) endIndex = fuzzyIndex + searchPhrase.length;
          
          const fullOriginal = text.substring(fuzzyIndex, endIndex);
          newText = text.replace(fullOriginal, improved);
          method = 'fuzzy_replacement';
          position = fuzzyIndex;
          
          return {
            success: true,
            newText,
            method,
            position,
            replacedText: fullOriginal
          };
        }
      }
      
      // Strategie 3: Anhängen als neuer Abschnitt (bei FEHLT)
      if (!original || original === 'FEHLT' || original.includes('nicht vorhanden')) {
        const sectionHeader = `\n\n━━━ ${optimization.category?.toUpperCase() || 'OPTIMIERUNG'} (NEUE KLAUSEL) ━━━\n\n`;
        const newSection = sectionHeader + improved + '\n';
        
        newText = text + newSection;
        method = 'append_new_section';
        position = text.length;
        
        return {
          success: true,
          newText,
          method,
          position,
          replacedText: ''
        };
      }
      
      // Strategie 4: Kategorie-basierte Platzierung
      const categoryAnchors = {
        'termination': ['kündigung', 'beendigung', 'laufzeit'],
        'liability': ['haftung', 'schadenersatz', 'gewährleistung'],
        'payment': ['zahlung', 'vergütung', 'rechnung', 'honorar'],
        'data_protection': ['datenschutz', 'dsgvo', 'personenbezogen'],
        'general': ['allgemeine', 'sonstige', 'weitere']
      };
      
      const anchors = categoryAnchors[optimization.category] || [];
      for (const anchor of anchors) {
        const anchorIndex = text.toLowerCase().indexOf(anchor.toLowerCase());
        if (anchorIndex !== -1) {
          // Finde Ende des aktuellen Abschnitts
          let insertIndex = text.indexOf('\n\n', anchorIndex);
          if (insertIndex === -1) insertIndex = text.length;
          
          const insertText = `\n\n📝 OPTIMIERUNG (${optimization.category}):\n${improved}\n`;
          newText = text.slice(0, insertIndex) + insertText + text.slice(insertIndex);
          method = 'category_based_insertion';
          position = insertIndex;
          
          return {
            success: true,
            newText,
            method,
            position,
            replacedText: ''
          };
        }
      }
      
      return {
        success: false,
        error: 'No suitable insertion point found',
        method: 'failed'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'error'
      };
    }
  }
  
  /**
   * Generiert Diff-View zwischen Original und optimierter Version
   */
  static generateDiffView(originalText, optimizedText, appliedChanges) {
    const diffBlocks = [];
    let lastIndex = 0;
    
    // Sortiere Änderungen nach Position
    const sortedChanges = appliedChanges
      .filter(change => change.position !== undefined)
      .sort((a, b) => a.position - b.position);
    
    for (const change of sortedChanges) {
      const position = change.position;
      
      // Füge unveränderten Text vor der Änderung hinzu
      if (position > lastIndex) {
        diffBlocks.push({
          type: 'unchanged',
          content: originalText.substring(lastIndex, position),
          lineStart: this.countLines(originalText.substring(0, lastIndex)) + 1
        });
      }
      
      // Füge die Änderung hinzu
      diffBlocks.push({
        type: 'changed',
        original: change.original,
        improved: change.improved,
        category: change.category,
        reasoning: change.reasoning,
        method: change.method,
        position: position,
        changeId: change.id,
        lineStart: this.countLines(originalText.substring(0, position)) + 1
      });
      
      lastIndex = position + (change.original?.length || 0);
    }
    
    // Füge verbleibenden Text hinzu
    if (lastIndex < originalText.length) {
      diffBlocks.push({
        type: 'unchanged',
        content: originalText.substring(lastIndex),
        lineStart: this.countLines(originalText.substring(0, lastIndex)) + 1
      });
    }
    
    return diffBlocks;
  }
  
  /**
   * Kategorisiert angewendete Änderungen für Statistiken
   */
  static categorizeChanges(appliedChanges) {
    const categories = {};
    
    for (const change of appliedChanges) {
      const category = change.category || 'general';
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          methods: {},
          totalTextChange: 0
        };
      }
      
      categories[category].count++;
      categories[category].methods[change.method] = (categories[category].methods[change.method] || 0) + 1;
      categories[category].totalTextChange += (change.improved?.length || 0) - (change.original?.length || 0);
    }
    
    return categories;
  }
  
  /**
   * Zählt Zeilen in einem Text
   */
  static countLines(text) {
    return text.split('\n').length;
  }
  
  /**
   * Generiert Executive Summary basierend auf Änderungen
   */
  static generateExecutiveSummary(redraftResult, contractMeta = {}) {
    const { stats, appliedChanges, skippedChanges, originalText, optimizedText } = redraftResult;
    
    // Berechne Health Score Verbesserung
    const healthScoreImprovement = Math.min(85, 60 + (stats.appliedChanges * 3));
    
    // Identifiziere Top-Risiken (basierend auf nicht angewendeten kritischen Änderungen)
    const topRisks = skippedChanges
      .filter(change => change.type === 'rejected' && 
              (change.category === 'liability' || change.category === 'termination'))
      .slice(0, 3)
      .map(change => ({
        category: change.category,
        risk: change.original ? 'Bestehende problematische Klausel' : 'Fehlende Pflichtklausel',
        impact: 'Hoch',
        recommendation: 'Rechtliche Prüfung empfohlen'
      }));
    
    // Identifiziere Quick Wins
    const quickWins = appliedChanges
      .filter(change => change.category === 'clarity' || change.category === 'general')
      .slice(0, 5)
      .map(change => change.category);
    
    const summary = {
      title: 'Executive Summary - Vertragsoptimierung',
      contractInfo: {
        name: contractMeta.name || 'Vertrag',
        type: contractMeta.type || 'Sonstiges',
        pages: Math.ceil(originalText.length / 2500),
        dateAnalyzed: new Date().toLocaleDateString('de-DE'),
        jurisdiction: contractMeta.jurisdiction || 'Deutschland'
      },
      healthScore: {
        before: 60,
        after: healthScoreImprovement,
        improvement: healthScoreImprovement - 60,
        rating: healthScoreImprovement >= 80 ? 'Gut' : healthScoreImprovement >= 65 ? 'Akzeptabel' : 'Verbesserungsbedarf'
      },
      changesSummary: {
        totalOptimizations: stats.totalOptimizations,
        appliedChanges: stats.appliedChanges,
        rejectedChanges: stats.skippedChanges,
        successRate: stats.successRate,
        keyCategories: Object.keys(stats.improvementAreas).slice(0, 3)
      },
      topRisks,
      quickWins: {
        implemented: quickWins.length,
        categories: quickWins,
        estimatedTimeToImplement: '< 30 Minuten'
      },
      recommendations: {
        immediate: [
          'Rechtliche Prüfung der abgelehnten kritischen Änderungen',
          'Implementierung der verbleibenden Quick-Win-Optimierungen'
        ],
        shortTerm: [
          'Vollständige Überarbeitung der Haftungsklauseln',
          'Harmonisierung mit aktueller Rechtsprechung'
        ],
        longTerm: [
          'Entwicklung standardisierter Vertragsvorlagen',
          'Regelmäßige rechtliche Updates'
        ]
      },
      nextSteps: [
        'Exportiere optimierte Vertragsfassung',
        'Lasse Änderungen anwaltlich prüfen',
        'Implementiere Quick-Win-Optimierungen',
        'Plane Vertragspartner-Kommunikation'
      ],
      legalDisclaimer: 'Diese Analyse wurde durch KI erstellt und ersetzt nicht die Beratung durch einen Rechtsanwalt.'
    };
    
    return summary;
  }
}

module.exports = ContractRedrafting;
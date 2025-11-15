import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FileText, Shield, Lightbulb, TrendingUp, Clock,
  Copy, AlertTriangle, BarChart3, Gavel, Scale // ✅ NEU: Icons für Rechtsgutachten
} from "lucide-react";
import styles from "../styles/AnalysisModal.module.css";

interface Contract {
  _id: string;
  name: string;
  analysis?: {
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    contractScore?: number;
    analysisId?: string;
    lastAnalyzed?: string;
    detailedLegalOpinion?: string; // ✅ NEU: Ausführliches Rechtsgutachten
  };
  legalPulse?: {
    riskScore: number | null;
    summary?: string;
    riskFactors?: string[];
    legalRisks?: string[];
    recommendations?: string[];
    analysisDate?: string;
  };
}

interface AnalysisModalProps {
  contract: Contract;
  show: boolean;
  onClose: () => void;
}

export default function AnalysisModal({ contract, show, onClose }: AnalysisModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  // ✅ Escape-Key-Handler und Focus-Trap für Accessibility
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose();
      }
    };

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && show) {
        const focusableElements = document.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArray = Array.from(focusableElements).filter(el => 
          el.closest('[role="dialog"]') !== null
        );
        
        if (focusableArray.length === 0) return;
        
        const firstElement = focusableArray[0] as HTMLElement;
        const lastElement = focusableArray[focusableArray.length - 1] as HTMLElement;
        
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('keydown', handleTabKey);
      
      // Focus auf erstes focusable Element beim Öffnen
      setTimeout(() => {
        const firstFocusable = document.querySelector('[role="dialog"] button') as HTMLElement;
        if (firstFocusable) firstFocusable.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [show, onClose]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return "Unbekannt";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#34c759";
    if (score >= 60) return "#ff9500";
    if (score >= 40) return "#ff6b35";
    return "#ff3b30";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Ausgezeichnet";
    if (score >= 60) return "Gut";
    if (score >= 40) return "Akzeptabel";
    return "Kritisch";
  };

  const formatTextToPoints = (text: string | string[] | object | number | null | undefined): string[] => {
    console.log('🔍 formatTextToPoints input:', { text, type: typeof text, isArray: Array.isArray(text) });
    
    if (!text) return ['Keine Details verfügbar'];
    
    // Wenn es bereits ein Array ist, direkt zurückgeben
    if (Array.isArray(text)) {
      return text.filter(item => item && typeof item === 'string' && item.trim().length > 0).slice(0, 6);
    }
    
    // Wenn es kein String ist, zu String konvertieren
    const textString = typeof text === 'string' ? text : String(text);
    
    const sentences = textString
      .split(/[.!?]+|[-•]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 300)
      .slice(0, 6);
    
    return sentences.length > 0 ? sentences : [textString.substring(0, 250) + '...'];
  };

  const handleCopyAnalysis = async () => {
    try {
      let analysisText = '';
      
      if (contract.analysis) {
        analysisText = `
Vertragsanalyse: ${contract.name}
Score: ${contract.analysis.contractScore || 'N/A'}/100

Zusammenfassung:
${contract.analysis.summary || 'Nicht verfügbar'}

Rechtssicherheit:
${contract.analysis.legalAssessment || 'Nicht verfügbar'}

Optimierungsvorschläge:
${contract.analysis.suggestions || 'Nicht verfügbar'}

Marktvergleich:
${contract.analysis.comparison || 'Nicht verfügbar'}

${contract.analysis.detailedLegalOpinion ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUSFÜHRLICHES RECHTSGUTACHTEN (Fachanwaltsniveau)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${contract.analysis.detailedLegalOpinion}
` : ''}
        `.trim();
      } else if (contract.legalPulse) {
        analysisText = `
Legal Pulse Analyse: ${contract.name}
Score: ${contract.legalPulse.riskScore || 'N/A'}/100

Zusammenfassung:
${contract.legalPulse.summary || 'Nicht verfügbar'}

Risikofaktoren:
${contract.legalPulse.riskFactors?.join('\n- ') || 'Nicht verfügbar'}

Rechtliche Hinweise:
${contract.legalPulse.legalRisks?.join('\n- ') || 'Nicht verfügbar'}

Empfehlungen:
${contract.legalPulse.recommendations?.join('\n- ') || 'Nicht verfügbar'}
        `.trim();
      }
      
      await navigator.clipboard.writeText(analysisText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
    }
  };

  if (!show) return null;

  // Bestimme welche Analyse-Struktur verwendet werden soll
  const hasNewAnalysis = contract.analysis && (
    contract.analysis.summary || 
    contract.analysis.legalAssessment || 
    contract.analysis.suggestions || 
    contract.analysis.comparison
  );

  const hasLegalPulse = contract.legalPulse && (
    contract.legalPulse.summary ||
    (contract.legalPulse.riskFactors && contract.legalPulse.riskFactors.length > 0) ||
    (contract.legalPulse.legalRisks && contract.legalPulse.legalRisks.length > 0) ||
    (contract.legalPulse.recommendations && contract.legalPulse.recommendations.length > 0)
  );

  const analysisScore = hasNewAnalysis 
    ? contract.analysis!.contractScore 
    : contract.legalPulse?.riskScore;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerIcon}>
                <BarChart3 size={24} />
              </div>
              <div className={styles.headerInfo}>
                <h2 id="analysis-modal-title" className={styles.title}>
                  {hasNewAnalysis ? '🤖 KI-Vertragsanalyse' : '🧠 Legal Pulse Analyse'}
                </h2>
                <p className={styles.contractName}>{contract.name}</p>
              </div>
            </div>
            
            <div className={styles.headerActions}>
              <button 
                className={styles.copyBtn}
                onClick={handleCopyAnalysis}
                title="Analyse kopieren"
              >
                <Copy size={18} />
                {copySuccess ? 'Kopiert!' : 'Kopieren'}
              </button>
              
              <button 
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Analysis Modal schließen"
                title="Schließen"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* Score Section */}
            {analysisScore !== null && analysisScore !== undefined && (
              <div className={styles.scoreSection}>
                <div className={styles.scoreDisplay}>
                  <div 
                    className={styles.scoreCircle}
                    style={{ '--score-color': getScoreColor(analysisScore) } as React.CSSProperties}
                  >
                    <span className={styles.scoreNumber}>{analysisScore}</span>
                    <span className={styles.scoreMax}>/100</span>
                  </div>
                  <div className={styles.scoreInfo}>
                    <h3 style={{ color: getScoreColor(analysisScore) }}>
                      {getScoreLabel(analysisScore)}
                    </h3>
                    <p>{hasNewAnalysis ? 'Contract Score' : 'Legal Pulse Score'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Sections */}
            <div className={styles.analysisGrid}>
              {hasNewAnalysis ? (
                /* Neue Analysis-Struktur */
                <>
                  {contract.analysis!.summary && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}>
                          <FileText size={20} />
                        </div>
                        <h3>📋 Zusammenfassung</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {formatTextToPoints(contract.analysis!.summary).map((point, index) => (
                            <li key={index} className={styles.point}>
                              <div className={styles.pointBullet}></div>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {contract.analysis!.legalAssessment && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.legalIcon}`}>
                          <Shield size={20} />
                        </div>
                        <h3>⚖️ Rechtssicherheit</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {formatTextToPoints(contract.analysis!.legalAssessment).map((point, index) => (
                            <li key={index} className={styles.point}>
                              <div className={`${styles.pointBullet} ${styles.legalBullet}`}></div>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {contract.analysis!.suggestions && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.suggestionsIcon}`}>
                          <Lightbulb size={20} />
                        </div>
                        <h3>💡 Optimierungsvorschläge</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {formatTextToPoints(contract.analysis!.suggestions).map((point, index) => (
                            <li key={index} className={styles.point}>
                              <div className={`${styles.pointBullet} ${styles.suggestionsBullet}`}></div>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {contract.analysis!.comparison && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.comparisonIcon}`}>
                          <TrendingUp size={20} />
                        </div>
                        <h3>📊 Marktvergleich</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {formatTextToPoints(contract.analysis!.comparison).map((point, index) => (
                            <li key={index} className={styles.point}>
                              <div className={`${styles.pointBullet} ${styles.comparisonBullet}`}></div>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ✅ NEU: Ausführliches Rechtsgutachten */}
                  {contract.analysis!.detailedLegalOpinion && (
                    <div className={`${styles.analysisSection} ${styles.legalOpinionSection}`}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.legalOpinionIcon}`}>
                          <Gavel size={20} />
                        </div>
                        <h3>📋 Ausführliches Rechtsgutachten</h3>
                        <div className={styles.legalOpinionBadge}>
                          <Scale size={14} />
                          <span>Fachanwaltsniveau</span>
                        </div>
                      </div>
                      <div className={styles.sectionContent}>
                        <div className={styles.legalOpinionText}>
                          {contract.analysis!.detailedLegalOpinion.split('\n\n').map((paragraph, index) => (
                            <p key={index} className={styles.legalOpinionParagraph}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : hasLegalPulse ? (
                /* Legal Pulse-Struktur */
                <>
                  {contract.legalPulse!.summary && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}>
                          <FileText size={20} />
                        </div>
                        <h3>📋 Zusammenfassung</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <div className={styles.summaryText}>
                          {contract.legalPulse!.summary}
                        </div>
                      </div>
                    </div>
                  )}

                  {contract.legalPulse!.riskFactors && contract.legalPulse!.riskFactors.length > 0 && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.riskIcon}`}>
                          <AlertTriangle size={20} />
                        </div>
                        <h3>⚠️ Identifizierte Risiken</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {contract.legalPulse!.riskFactors.map((risk, index) => (
                            <li key={index} className={styles.point}>
                              <div className={`${styles.pointBullet} ${styles.riskBullet}`}></div>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {contract.legalPulse!.legalRisks && contract.legalPulse!.legalRisks.length > 0 && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.legalIcon}`}>
                          <Shield size={20} />
                        </div>
                        <h3>⚖️ Rechtliche Hinweise</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {contract.legalPulse!.legalRisks.map((legal, index) => (
                            <li key={index} className={styles.point}>
                              <div className={`${styles.pointBullet} ${styles.legalBullet}`}></div>
                              <span>{legal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {contract.legalPulse!.recommendations && contract.legalPulse!.recommendations.length > 0 && (
                    <div className={styles.analysisSection}>
                      <div className={styles.sectionHeader}>
                        <div className={`${styles.sectionIcon} ${styles.suggestionsIcon}`}>
                          <Lightbulb size={20} />
                        </div>
                        <h3>💡 Empfehlungen</h3>
                      </div>
                      <div className={styles.sectionContent}>
                        <ul className={styles.pointsList}>
                          {contract.legalPulse!.recommendations.map((rec, index) => (
                            <li key={index} className={styles.point}>
                              <div className={`${styles.pointBullet} ${styles.suggestionsBullet}`}></div>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.analysisDate}>
                <Clock size={16} />
                <span>
                  Analyse durchgeführt: {
                    hasNewAnalysis && contract.analysis!.lastAnalyzed
                      ? formatDate(contract.analysis!.lastAnalyzed)
                      : hasLegalPulse && contract.legalPulse!.analysisDate
                      ? formatDate(contract.legalPulse!.analysisDate)
                      : 'Unbekannt'
                  }
                </span>
              </div>
              
              {hasNewAnalysis && contract.analysis!.analysisId && (
                <div className={styles.analysisId}>
                  <FileText size={16} />
                  <span>ID: {contract.analysis!.analysisId}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
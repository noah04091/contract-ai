/**
 * ResultsDashboard - Enterprise-Level Results View for Optimizer
 *
 * Features:
 * - Hero Score Card mit prominentem Health Score
 * - Category Tabs für Navigation
 * - Issue Cards mit Priority-Badges
 * - Vollständig responsive (Mobile-First)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  DollarSign,
  FileText,
  Lock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Eye,
  Download,
  MessageSquare,
  Briefcase,
  Scale,
  Info // 🆕 Phase 3c.3: Icon für Hinweise
} from 'lucide-react';
import styles from '../../styles/Optimizer.module.css';
import { OptimizationSuggestion, ContractHealthScore, DocumentScopeInfo } from '../../types/optimizer';

// Pitch-Stile
const PITCH_STYLES = [
  { id: 'lawyer', name: 'Juristisch', icon: <Scale size={18} />, description: 'Formal & rechtssicher' },
  { id: 'business', name: 'Business', icon: <Briefcase size={18} />, description: 'Professionell & überzeugend' },
  { id: 'simple', name: 'Verständlich', icon: <MessageSquare size={18} />, description: 'Einfach & klar' },
];

// 🆕 v2.0: Assessment Interface für Decision-First
interface ContractAssessment {
  overall: string;
  optimizationNeeded: boolean;
  reasoning: string;
  intentionalClauses: string[];
}

// 🆕 Phase 3c: DocumentScopeInfo wird aus types/optimizer.ts importiert

interface ResultsDashboardProps {
  optimizations: OptimizationSuggestion[];
  contractScore: ContractHealthScore;
  fileName: string;
  onGenerateContract: () => void;
  onExplainClick?: (optimization: OptimizationSuggestion) => void;
  onShowInContract?: (text: string) => void;
  onGeneratePitch?: (style: string) => void;
  onExport?: (format: string) => void;
  isGenerating?: boolean;
  isPremium?: boolean;
  // 🆕 v2.0: Decision-First Props
  assessment?: ContractAssessment;
  contractMaturity?: 'high' | 'medium' | 'low';
  recognizedAs?: string;
  onNewAnalysis?: () => void; // 🆕 Callback für neue Analyse
  // 🆕 Phase 3c: Document Scope für Explainability
  documentScope?: DocumentScopeInfo;
}

// Category configuration
const CATEGORIES = [
  { id: 'all', label: 'Alle', icon: <FileText size={18} /> },
  { id: 'termination', label: 'Kündigung', icon: <AlertTriangle size={18} /> },
  { id: 'liability', label: 'Haftung', icon: <Shield size={18} /> },
  { id: 'payment', label: 'Zahlung', icon: <DollarSign size={18} /> },
  { id: 'compliance', label: 'Datenschutz', icon: <Lock size={18} /> },
  { id: 'clarity', label: 'Klarheit', icon: <FileText size={18} /> },
];

// Priority labels
const PRIORITY_LABELS = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig'
};

// 🆕 Formatter für intentionalClauses: snake_case → Lesbare deutsche Begriffe
const formatIntentionalClause = (clause: string): string => {
  // Mapping für bekannte Klauseln
  const clauseMapping: Record<string, string> = {
    'haftungsbeschraenkung': 'Haftungsbeschränkung',
    'rueckgriffsrecht': 'Rückgriffsrecht',
    'abtretungsverbote': 'Abtretungsverbote',
    'ankauflimit': 'Ankauflimit',
    'kuendigungsfristen': 'Kündigungsfristen',
    'kuendigungsfrist': 'Kündigungsfrist',
    'vertragsstrafe': 'Vertragsstrafe',
    'geheimhaltung': 'Geheimhaltung',
    'wettbewerbsverbot': 'Wettbewerbsverbot',
    'datenschutz': 'Datenschutz',
    'gerichtsstand': 'Gerichtsstand',
    'schriftformerfordernis': 'Schriftformerfordernis',
    'salvatorische_klausel': 'Salvatorische Klausel',
    'kuendigungsrecht': 'Kündigungsrecht',
    'verlaengerungsklausel': 'Verlängerungsklausel',
    'zahlungsbedingungen': 'Zahlungsbedingungen',
    'gewaehrleistung': 'Gewährleistung',
    'schadenersatz': 'Schadenersatz',
    'hoeheregewalt': 'Höhere Gewalt',
    'force_majeure': 'Force Majeure',
    'probezeit': 'Probezeit',
    'urlaubsanspruch': 'Urlaubsanspruch',
    'ueberstundenregelung': 'Überstundenregelung',
    'nebentaetigkeit': 'Nebentätigkeit',
    'bonusregelung': 'Bonusregelung',
    'homeoffice': 'Home Office',
    'dienstwagen': 'Dienstwagen',
  };

  // Erst im Mapping nachschlagen
  const lowerClause = clause.toLowerCase().replace(/[-\s]/g, '_');
  if (clauseMapping[lowerClause]) {
    return clauseMapping[lowerClause];
  }

  // Fallback: Automatische Formatierung
  return clause
    // ae/oe/ue zu Umlauten
    .replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü')
    .replace(/Ae/g, 'Ä').replace(/Oe/g, 'Ö').replace(/Ue/g, 'Ü')
    // snake_case zu Leerzeichen
    .replace(/_/g, ' ')
    // Erster Buchstabe groß
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
};

// Category labels
const CATEGORY_LABELS = {
  termination: 'Kündigung',
  liability: 'Haftung',
  payment: 'Zahlung',
  compliance: 'Datenschutz',
  clarity: 'Klarheit'
};

export default function ResultsDashboard({
  optimizations,
  contractScore,
  fileName,
  onGenerateContract,
  onExplainClick,
  onShowInContract,
  onGeneratePitch,
  onExport,
  isGenerating = false,
  isPremium = true,
  // 🆕 v2.0: Decision-First Props
  assessment,
  contractMaturity,
  recognizedAs,
  onNewAnalysis,
  // 🆕 Phase 3c: Document Scope für Explainability
  documentScope
}: ResultsDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPitchMenu, setShowPitchMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Mark as used for future premium feature restrictions
  void isPremium;

  // Filter optimizations by category
  const filteredOptimizations = useMemo(() => {
    if (selectedCategory === 'all') return optimizations;
    return optimizations.filter(opt => opt.category === selectedCategory);
  }, [optimizations, selectedCategory]);

  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: optimizations.length };
    optimizations.forEach(opt => {
      counts[opt.category] = (counts[opt.category] || 0) + 1;
    });
    return counts;
  }, [optimizations]);

  // Count by priority
  const priorityCounts = useMemo(() => {
    return {
      critical: optimizations.filter(o => o.priority === 'critical').length,
      high: optimizations.filter(o => o.priority === 'high').length,
      medium: optimizations.filter(o => o.priority === 'medium').length,
      low: optimizations.filter(o => o.priority === 'low').length,
    };
  }, [optimizations]);

  // 📈 PROGNOSTIZIERTER SCORE: Berechne erwarteten Score nach Übernahme aller Optimierungen
  const projectedScore = useMemo(() => {
    // Basis: aktueller Score
    const baseScore = contractScore.overall;

    // Berechne Punkte pro nicht-übernommener Optimierung
    // Kritisch = 5 Punkte, Hoch = 3, Mittel = 2, Niedrig = 1
    const notImplemented = optimizations.filter(o => !o.implemented);
    const potentialGain = notImplemented.reduce((acc, opt) => {
      switch (opt.priority) {
        case 'critical': return acc + 5;
        case 'high': return acc + 3;
        case 'medium': return acc + 2;
        case 'low': return acc + 1;
        default: return acc + 1;
      }
    }, 0);

    // Maximiere auf 100
    return Math.min(100, baseScore + potentialGain);
  }, [contractScore.overall, optimizations]);

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  // Copy improved text
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Get score color (will be used for category scores in Phase 2)
  const _getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--apple-green)';
    if (score >= 60) return 'var(--apple-orange)';
    return 'var(--apple-red)';
  };
  void _getScoreColor; // Mark as intentionally unused for now

  // Get trend icon (will be used for category trends in Phase 2)
  const _getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp size={14} />;
      case 'down': return <TrendingDown size={14} />;
      default: return <Minus size={14} />;
    }
  };
  void _getTrendIcon; // Mark as intentionally unused for now

  // 🆕 v2.0: Perfect Contract State - Wenn 0 Optimierungen (Premium Ergebnis!)
  if (optimizations.length === 0) {
    return (
      <div className={styles.resultsDashboard}>
        {/* 🏆 Perfect Contract Hero */}
        <motion.div
          className={`${styles.heroScoreCard} ${styles.perfectContract}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Score Circle - Perfect State */}
          <div className={styles.scoreCircleWrapper}>
            <div
              className={`${styles.scoreCircle} ${styles.perfect}`}
              style={{ '--score-percent': contractScore.overall } as React.CSSProperties}
            >
              <div className={styles.scoreValue}>
                {contractScore.overall}<span>/100</span>
              </div>
            </div>
            <div className={`${styles.scoreTrend} ${styles.perfect}`}>
              <CheckCircle size={14} />
              <span>Exzellent</span>
            </div>
          </div>

          {/* Perfect Contract Info */}
          <div className={styles.scoreInfo}>
            <h2 className={styles.scoreTitle}>
              <CheckCircle size={24} style={{ color: 'var(--apple-green)', marginRight: '8px' }} />
              Professioneller Vertrag
            </h2>
            <p className={styles.scoreSubtitle}>
              <strong>Keine Optimierungen erforderlich.</strong> "{fileName}" erfüllt professionelle Standards.
            </p>

            {/* Assessment Details */}
            {assessment && (
              <div className={styles.assessmentBox}>
                <div className={styles.assessmentHeader}>
                  <Shield size={16} />
                  <span>Juristische Einschätzung</span>
                </div>
                <p className={styles.assessmentText}>{assessment.reasoning}</p>
                {assessment.intentionalClauses && assessment.intentionalClauses.length > 0 && (
                  <div className={styles.intentionalClauses}>
                    <strong>Als beabsichtigt erkannt:</strong>
                    <ul>
                      {assessment.intentionalClauses.map((clause, idx) => (
                        <li key={idx}>{formatIntentionalClause(clause)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Contract Meta Info */}
            <div className={styles.perfectMetrics}>
              {recognizedAs && (
                <div className={styles.metricBadge}>
                  <FileText size={14} />
                  <span>{recognizedAs}</span>
                </div>
              )}
              {contractMaturity && (
                <div className={`${styles.metricBadge} ${styles[`maturity${contractMaturity.charAt(0).toUpperCase() + contractMaturity.slice(1)}`]}`}>
                  <Shield size={14} />
                  <span>Reife: {contractMaturity === 'high' ? 'Hoch' : contractMaturity === 'medium' ? 'Mittel' : 'Niedrig'}</span>
                </div>
              )}
              {/* 🆕 Phase 3c.1: Amendment Badge */}
              {documentScope?.isAmendment && (
                <div className={`${styles.metricBadge} ${styles.amendment}`}>
                  <FileText size={14} />
                  <span>Änderungsvereinbarung</span>
                </div>
              )}
            </div>

            {/* 🆕 Phase 3c.1: Trust Badges */}
            <div className={styles.trustBadges}>
              <div className={styles.trustBadge}>
                <CheckCircle size={16} />
                <span>Professionell erstellt</span>
              </div>
              <div className={styles.trustBadge}>
                <Scale size={16} />
                <span>Juristisch konsistent</span>
              </div>
              <div className={styles.trustBadge}>
                <Shield size={16} />
                <span>Keine Risiken erkannt</span>
              </div>
              {documentScope?.isAmendment && (
                <div className={styles.trustBadge}>
                  <Sparkles size={16} />
                  <span>Scope-geprüft</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions - Export + Neue Analyse */}
          <div className={styles.heroActions}>
            {onExport && (
              <div className={styles.dropdownWrapper}>
                <motion.button
                  className={`${styles.heroActionBtn} ${styles.secondary}`}
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={18} />
                  <span>Bericht exportieren</span>
                  <ChevronDown size={14} className={showExportMenu ? styles.rotated : ''} />
                </motion.button>
                <AnimatePresence>
                  {showExportMenu && (
                    <>
                      <motion.div
                        className={styles.dropdownBackdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowExportMenu(false)}
                      />
                      <motion.div
                        className={styles.dropdownMenu}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <button
                          className={styles.dropdownItem}
                          onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                        >
                          <FileText size={18} />
                          <div className={styles.dropdownItemText}>
                            <span className={styles.dropdownItemName}>PDF Export</span>
                            <span className={styles.dropdownItemDesc}>Vollständiger Bericht</span>
                          </div>
                        </button>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => { onExport('docx'); setShowExportMenu(false); }}
                        >
                          <FileText size={18} />
                          <div className={styles.dropdownItemText}>
                            <span className={styles.dropdownItemName}>Word Export</span>
                            <span className={styles.dropdownItemDesc}>Bearbeitbar</span>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* 🆕 Neue Analyse Button */}
            {onNewAnalysis && (
              <motion.button
                className={`${styles.heroActionBtn} ${styles.outline}`}
                onClick={onNewAnalysis}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles size={18} />
                <span>Neuen Vertrag analysieren</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* 📊 Summary Cards für Perfect Contract */}
        <div className={styles.perfectSummary}>
          <motion.div
            className={styles.perfectSummaryCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.perfectIcon}>
              <CheckCircle size={32} />
            </div>
            <div className={styles.perfectCardContent}>
              <h3>Kein Handlungsbedarf</h3>
              <p>
                {documentScope?.isAmendment
                  ? 'Diese Änderungsvereinbarung wurde korrekt erstellt. Alle relevanten Punkte für einen Nachtrag sind abgedeckt.'
                  : 'Dieser Vertrag wurde professionell erstellt und enthält keine kritischen Lücken oder risikoreichen Klauseln.'
                }
              </p>
            </div>
          </motion.div>

          {/* 🆕 Phase 3c.2: Erweiterte Explainability Card */}
          <motion.div
            className={`${styles.perfectSummaryCard} ${styles.explainabilityCard}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.perfectIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              <Lightbulb size={32} />
            </div>
            <div className={styles.perfectCardContent}>
              <h3>Warum 0 Optimierungen?</h3>

              {/* Amendment-spezifische Erklärung */}
              {documentScope?.isAmendment ? (
                <div className={styles.explainabilityDetails}>
                  <p className={styles.explainabilityIntro}>
                    Dieses Dokument wurde als <strong>Änderungsvereinbarung</strong> erkannt und entsprechend analysiert:
                  </p>

                  <ul className={styles.explainabilityList}>
                    <li>
                      <CheckCircle size={14} />
                      <span>Dokumenttyp korrekt erkannt</span>
                    </li>
                    <li>
                      <CheckCircle size={14} />
                      <span>Nur änderungsrelevante Punkte geprüft</span>
                    </li>
                    <li>
                      <CheckCircle size={14} />
                      <span>Keine Pflichtklauseln erzwungen (→ gehören in Hauptvertrag)</span>
                    </li>
                    {documentScope.scopeReason && (
                      <li>
                        <Shield size={14} />
                        <span>{documentScope.scopeReason}</span>
                      </li>
                    )}
                  </ul>

                  {/* Skipped Checks Info */}
                  {documentScope.skippedMandatoryChecks && documentScope.skippedMandatoryChecks.length > 0 && (
                    <div className={styles.skippedChecks}>
                      <div className={styles.skippedChecksLabel}>
                        <Shield size={14} />
                        <span>Bewusst nicht geprüft (→ Hauptvertrag):</span>
                      </div>
                      <div className={styles.skippedChecksTags}>
                        {documentScope.skippedMandatoryChecks.slice(0, 4).map((check, idx) => (
                          <span key={idx} className={styles.skippedCheckTag}>{check}</span>
                        ))}
                        {documentScope.skippedMandatoryChecks.length > 4 && (
                          <span className={styles.skippedCheckTag}>+{documentScope.skippedMandatoryChecks.length - 4} weitere</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hard Scope Enforcement Stats */}
                  {documentScope.hardScopeEnforcement?.applied && documentScope.hardScopeEnforcement.filtered && documentScope.hardScopeEnforcement.filtered > 0 && (
                    <div className={styles.scopeEnforcementInfo}>
                      <Sparkles size={14} />
                      <span>
                        {documentScope.hardScopeEnforcement.filtered} nicht-relevante Punkte wurden automatisch gefiltert
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                // Standard-Erklärung für normale Verträge
                <p>
                  Unser KI-System optimiert nur, wenn echte juristische oder wirtschaftliche Risiken bestehen.
                  "Keine Optimierungen" bedeutet: Sie haben einen gut durchdachten Vertrag.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resultsDashboard}>
      {/* Hero Score Card */}
      <motion.div
        className={styles.heroScoreCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Score Circle */}
        <div className={styles.scoreCircleWrapper}>
          <div
            className={styles.scoreCircle}
            style={{ '--score-percent': contractScore.overall } as React.CSSProperties}
          >
            <div className={styles.scoreValue}>
              {contractScore.overall}<span>/100</span>
            </div>
          </div>
          <div className={`${styles.scoreTrend} ${contractScore.overall >= 70 ? styles.up : contractScore.overall >= 50 ? styles.stable : styles.down}`}>
            {contractScore.overall >= 70 ? <TrendingUp size={14} /> : contractScore.overall >= 50 ? <Minus size={14} /> : <TrendingDown size={14} />}
            <span>{contractScore.overall >= 70 ? 'Gut' : contractScore.overall >= 50 ? 'OK' : 'Kritisch'}</span>
          </div>
        </div>

        {/* Score Info */}
        <div className={styles.scoreInfo}>
          <h2 className={styles.scoreTitle}>
            Vertragsanalyse abgeschlossen
          </h2>
          <p className={styles.scoreSubtitle}>
            <strong>{optimizations.length} Optimierungen</strong> wurden in "{fileName}" identifiziert.
            {priorityCounts.critical > 0 && ` ${priorityCounts.critical} kritische Punkte erfordern Ihre Aufmerksamkeit.`}
          </p>

          {/* Quick Metrics */}
          <div className={styles.scoreMetrics}>
            {priorityCounts.critical > 0 && (
              <div className={`${styles.scoreMetric} ${styles.metricCritical}`}>
                <AlertTriangle size={16} />
                <span>{priorityCounts.critical} Kritisch</span>
              </div>
            )}
            {priorityCounts.high > 0 && (
              <div className={`${styles.scoreMetric} ${styles.metricWarning}`}>
                <AlertTriangle size={16} />
                <span>{priorityCounts.high} Hoch</span>
              </div>
            )}
            {(priorityCounts.medium + priorityCounts.low) > 0 && (
              <div className={`${styles.scoreMetric} ${styles.metricSuccess}`}>
                <CheckCircle size={16} />
                <span>{priorityCounts.medium + priorityCounts.low} Sonstige</span>
              </div>
            )}
          </div>

          {/* 📈 Score-Prognose Info */}
          {projectedScore > contractScore.overall && (
            <div className={styles.scoreProjection}>
              <TrendingUp size={14} />
              <span>
                Nach Übernahme aller Optimierungen: <strong>~{projectedScore}/100</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className={styles.heroActions}>
          <motion.button
            className={`${styles.heroActionBtn} ${styles.primary}`}
            onClick={onGenerateContract}
            disabled={isGenerating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles size={18} />
            <span>{isGenerating ? 'Generiere...' : 'Vertrag optimieren'}</span>
          </motion.button>

          {/* Pitch Dropdown */}
          {onGeneratePitch && (
            <div className={styles.dropdownWrapper}>
              <motion.button
                className={`${styles.heroActionBtn} ${styles.secondary}`}
                onClick={() => {
                  setShowPitchMenu(!showPitchMenu);
                  setShowExportMenu(false);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageSquare size={18} />
                <span>Pitch erstellen</span>
                <ChevronDown size={14} className={showPitchMenu ? styles.rotated : ''} />
              </motion.button>
              <AnimatePresence>
                {showPitchMenu && (
                  <>
                    <div
                      className={styles.dropdownBackdrop}
                      onClick={() => setShowPitchMenu(false)}
                    />
                    <motion.div
                      className={styles.dropdownMenu}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {PITCH_STYLES.map(style => (
                        <button
                          key={style.id}
                          className={styles.dropdownItem}
                          onClick={() => {
                            onGeneratePitch(style.id);
                            setShowPitchMenu(false);
                          }}
                        >
                          {style.icon}
                          <div className={styles.dropdownItemText}>
                            <span className={styles.dropdownItemName}>{style.name}</span>
                            <span className={styles.dropdownItemDesc}>{style.description}</span>
                          </div>
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Export Dropdown */}
          {onExport && (
            <div className={styles.dropdownWrapper}>
              <motion.button
                className={`${styles.heroActionBtn} ${styles.secondary}`}
                onClick={() => {
                  setShowExportMenu(!showExportMenu);
                  setShowPitchMenu(false);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={18} />
                <span>Exportieren</span>
                <ChevronDown size={14} className={showExportMenu ? styles.rotated : ''} />
              </motion.button>
              <AnimatePresence>
                {showExportMenu && (
                  <>
                    <div
                      className={styles.dropdownBackdrop}
                      onClick={() => setShowExportMenu(false)}
                    />
                    <motion.div
                      className={styles.dropdownMenu}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <button
                        className={styles.dropdownItem}
                        onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                      >
                        <FileText size={18} />
                        <div className={styles.dropdownItemText}>
                          <span className={styles.dropdownItemName}>PDF Export</span>
                          <span className={styles.dropdownItemDesc}>Vollständiger Bericht</span>
                        </div>
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => { onExport('docx'); setShowExportMenu(false); }}
                      >
                        <FileText size={18} />
                        <div className={styles.dropdownItemText}>
                          <span className={styles.dropdownItemName}>Word Export</span>
                          <span className={styles.dropdownItemDesc}>Bearbeitbar</span>
                        </div>
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => { onExport('json'); setShowExportMenu(false); }}
                      >
                        <FileText size={18} />
                        <div className={styles.dropdownItemText}>
                          <span className={styles.dropdownItemName}>JSON Export</span>
                          <span className={styles.dropdownItemDesc}>Maschinenlesbar</span>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        className={styles.categoryTabsContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className={styles.categoryTabs}>
          {CATEGORIES.map((category) => {
            const count = categoryCounts[category.id] || 0;
            const isActive = selectedCategory === category.id;
            const hasCritical = category.id !== 'all' &&
              optimizations.some(o => o.category === category.id && o.priority === 'critical');

            return (
              <button
                key={category.id}
                className={`${styles.categoryTab} ${isActive ? styles.active : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon}
                <span>{category.label}</span>
                <span className={`${styles.categoryTabBadge} ${hasCritical ? styles.critical : ''}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Issues List */}
      <div className={styles.issuesList}>
        <AnimatePresence mode="popLayout">
          {filteredOptimizations.length === 0 ? (
            <motion.div
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.emptyStateIcon}>
                <CheckCircle />
              </div>
              <h3 className={styles.emptyStateTitle}>
                Keine Optimierungen in dieser Kategorie
              </h3>
              <p className={styles.emptyStateText}>
                Wähle eine andere Kategorie oder zeige alle Optimierungen an.
              </p>
            </motion.div>
          ) : (
            filteredOptimizations.map((optimization, index) => {
              const isExpanded = expandedCards.has(optimization.id);
              const isCopied = copiedId === optimization.id;
              // 🆕 Phase 3c.3: Hinweis vs Optimierung Unterscheidung
              const optimizationIsHint = isHint(optimization);

              return (
                <motion.div
                  key={optimization.id}
                  className={`${styles.issueCard} ${optimizationIsHint ? styles.hint : styles[optimization.priority]}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  {/* Header */}
                  <div className={styles.issueHeader}>
                    <div className={styles.issueHeaderLeft}>
                      <div className={`${styles.issueIcon} ${optimizationIsHint ? styles.hint : styles[optimization.priority]}`}>
                        {/* 🆕 Phase 3c.3: Unterschiedliche Icons */}
                        {optimizationIsHint
                          ? <Info size={20} />
                          : optimization.priority === 'critical' || optimization.priority === 'high'
                            ? <AlertTriangle size={20} />
                            : <Lightbulb size={20} />
                        }
                      </div>
                      <div className={styles.issueTitleGroup}>
                        <h3 className={styles.issueTitle}>
                          {optimization.summary || CATEGORY_LABELS[optimization.category]}
                        </h3>
                        <div className={styles.issueMeta}>
                          {/* 🆕 Phase 3c.3: Hinweis Badge */}
                          {optimizationIsHint ? (
                            <span className={`${styles.issueBadge} ${styles.hint}`}>
                              <Info size={10} /> {HINT_LABEL}
                            </span>
                          ) : (
                            <span className={`${styles.issueBadge} ${styles[optimization.priority]}`}>
                              {PRIORITY_LABELS[optimization.priority]}
                            </span>
                          )}
                          <span className={`${styles.issueBadge} ${styles.category}`}>
                            {CATEGORY_LABELS[optimization.category]}
                          </span>
                          {!optimizationIsHint && optimization.implementationDifficulty === 'easy' && (
                            <span className={`${styles.issueBadge} ${styles.low}`}>
                              <Zap size={10} /> Quick Win
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.issueHeaderActions}>
                      {onExplainClick && (
                        <button
                          className={styles.issueActionBtn}
                          onClick={() => onExplainClick(optimization)}
                          title="KI erklärt"
                        >
                          <Lightbulb size={18} />
                        </button>
                      )}
                      <button
                        className={`${styles.issueActionBtn} ${styles.expand}`}
                        onClick={() => toggleExpand(optimization.id)}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={styles.issueContent}>
                    <p className={styles.issueSummary}>
                      {optimization.reasoning}
                    </p>

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          className={styles.issueDetails}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Diff View - 🆕 Phase 3c.3: Unterschiedliche Labels für Hinweise */}
                          <div className={`${styles.issueDiffView} ${optimizationIsHint ? styles.hintDiff : ''}`}>
                            <div className={styles.diffColumn}>
                              <div className={`${styles.diffLabel} ${optimizationIsHint ? styles.hintOriginal : styles.original}`}>
                                {optimizationIsHint ? <Info size={14} /> : <AlertTriangle size={14} />}
                                <span>{optimizationIsHint ? 'Aktueller Stand' : 'Aktuell (Problem)'}</span>
                              </div>
                              <div className={`${styles.diffBox} ${optimizationIsHint ? styles.hintOriginal : styles.original}`}>
                                {optimization.original || (optimizationIsHint ? 'Nicht vorhanden' : 'Klausel fehlt oder ist unvollständig')}
                              </div>
                            </div>
                            <div className={styles.diffColumn}>
                              <div className={`${styles.diffLabel} ${optimizationIsHint ? styles.hintImproved : styles.improved}`}>
                                <Lightbulb size={14} />
                                <span>{optimizationIsHint ? 'Empfehlung (optional)' : 'Optimiert'}</span>
                              </div>
                              <div className={`${styles.diffBox} ${optimizationIsHint ? styles.hintImproved : styles.improved}`}>
                                {optimization.improved}
                              </div>
                            </div>
                          </div>

                          {/* Full Reasoning */}
                          {optimization.reasoning && optimization.reasoning.length > 150 && (
                            <div className={styles.issueReasoning}>
                              <div className={styles.issueReasoningLabel}>
                                Juristische Begründung
                              </div>
                              <p className={styles.issueReasoningText}>
                                {optimization.reasoning}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  <div className={styles.issueFooter}>
                    <div className={styles.issueStats}>
                      <div className={styles.issueStat}>
                        <Shield size={14} />
                        <span>Risiko: {optimization.legalRisk}/10</span>
                      </div>
                      <div className={styles.issueStat}>
                        <TrendingUp size={14} />
                        <span>Impact: {optimization.businessImpact}/10</span>
                      </div>
                      {optimization.confidence && (
                        <div className={styles.issueStat}>
                          <Sparkles size={14} />
                          <span>KI: {optimization.confidence}%</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.issueFooterActions}>
                      {/* Vertrag anzeigen - immer sichtbar für Orientierung */}
                      {onShowInContract && (
                        <button
                          className={`${styles.applyBtn} ${styles.secondary}`}
                          onClick={() => onShowInContract(optimization.original || optimization.summary || optimization.category)}
                          title="Vertrag anzeigen"
                        >
                          <Eye size={14} />
                          <span>Vertrag</span>
                        </button>
                      )}
                      <button
                        className={`${styles.applyBtn} ${styles.secondary}`}
                        onClick={() => copyToClipboard(optimization.improved, optimization.id)}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{isCopied ? 'Kopiert!' : 'Kopieren'}</span>
                      </button>

                      {/* Details-Button */}
                      {!isExpanded && (
                        <button
                          className={`${styles.applyBtn} ${styles.primary}`}
                          onClick={() => toggleExpand(optimization.id)}
                        >
                          <ArrowRight size={14} />
                          <span>Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

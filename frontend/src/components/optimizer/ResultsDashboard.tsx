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
  Scale
} from 'lucide-react';
import styles from '../../styles/Optimizer.module.css';
import { OptimizationSuggestion, ContractHealthScore } from '../../types/optimizer';

// Pitch-Stile
const PITCH_STYLES = [
  { id: 'lawyer', name: 'Juristisch', icon: <Scale size={18} />, description: 'Formal & rechtssicher' },
  { id: 'business', name: 'Business', icon: <Briefcase size={18} />, description: 'Professionell & überzeugend' },
  { id: 'simple', name: 'Verständlich', icon: <MessageSquare size={18} />, description: 'Einfach & klar' },
];

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
  isPremium = true
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

              return (
                <motion.div
                  key={optimization.id}
                  className={`${styles.issueCard} ${styles[optimization.priority]}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  {/* Header */}
                  <div className={styles.issueHeader}>
                    <div className={styles.issueHeaderLeft}>
                      <div className={`${styles.issueIcon} ${styles[optimization.priority]}`}>
                        {optimization.priority === 'critical' || optimization.priority === 'high'
                          ? <AlertTriangle size={20} />
                          : <Lightbulb size={20} />
                        }
                      </div>
                      <div className={styles.issueTitleGroup}>
                        <h3 className={styles.issueTitle}>
                          {optimization.summary || CATEGORY_LABELS[optimization.category]}
                        </h3>
                        <div className={styles.issueMeta}>
                          <span className={`${styles.issueBadge} ${styles[optimization.priority]}`}>
                            {PRIORITY_LABELS[optimization.priority]}
                          </span>
                          <span className={`${styles.issueBadge} ${styles.category}`}>
                            {CATEGORY_LABELS[optimization.category]}
                          </span>
                          {optimization.implementationDifficulty === 'easy' && (
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
                          {/* Diff View */}
                          <div className={styles.issueDiffView}>
                            <div className={styles.diffColumn}>
                              <div className={`${styles.diffLabel} ${styles.original}`}>
                                <AlertTriangle size={14} />
                                <span>Aktuell (Problem)</span>
                              </div>
                              <div className={`${styles.diffBox} ${styles.original}`}>
                                {optimization.original || 'Klausel fehlt oder ist unvollständig'}
                              </div>
                            </div>
                            <div className={styles.diffColumn}>
                              <div className={`${styles.diffLabel} ${styles.improved}`}>
                                <CheckCircle size={14} />
                                <span>Optimiert</span>
                              </div>
                              <div className={`${styles.diffBox} ${styles.improved}`}>
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

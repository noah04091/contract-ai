// 📁 components/LegalLens/SmartSummary.tsx
// Smart Summary Komponente - Sofort-Übersicht nach Upload

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  X,
  ArrowRight,
  AlertCircle,
  Info
} from 'lucide-react';
import styles from '../../styles/SmartSummary.module.css';

interface TopRisk {
  rank: number;
  severity: 'critical' | 'warning' | 'info';
  emoji: string;
  title: string;
  section?: string;
  whatItMeans: string;
  worstCase: {
    scenario: string;
    financialRisk: string;
    timeRisk: string;
  };
  recommendation: string;
  negotiationHint?: string;
}

interface SmartSummaryData {
  contractType: string;
  contractTypeDetail: string;
  overallVerdict: {
    action: 'accept' | 'negotiate' | 'reject' | 'review';
    emoji: string;
    headline: string;
    confidence: number;
  };
  riskScore: {
    overall: number;
    breakdown: {
      financial: number;
      legal: number;
      operational: number;
    };
  };
  quickStats: {
    criticalCount: number;
    warningCount: number;
    okayCount: number;
    totalClauses: number;
  };
  topRisks: TopRisk[];
  highlights: {
    positive: string[];
    negative: string[];
    unusual: string[];
  };
  keyTerms: {
    duration: string;
    terminationNotice: string;
    value: string;
    liability?: string;
    specialClauses?: string[];
  };
  nextSteps: Array<{
    priority: number;
    action: string;
    reason: string;
  }>;
  tldr: string;
}

interface SmartSummaryProps {
  contractId: string;
  contractName: string;
  onDismiss: () => void;
}

const SmartSummary: React.FC<SmartSummaryProps> = ({
  contractId,
  contractName,
  onDismiss
}) => {
  const [summary, setSummary] = useState<SmartSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<number | null>(0);

  const getApiUrl = useCallback(() => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://api.contract-ai.de';
  }, []);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();

      // Erst prüfen ob gecachte Summary existiert
      const cacheResponse = await fetch(`${apiUrl}/api/legal-lens/${contractId}/smart-summary`, {
        credentials: 'include'
      });

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        if (cacheData.success && cacheData.summary && cacheData.cached) {
          console.log('[SmartSummary] Using cached summary');
          setSummary(cacheData.summary);
          setIsLoading(false);
          return;
        }
      }

      // Keine gecachte Summary - neue generieren
      console.log('[SmartSummary] Generating new summary...');
      const response = await fetch(`${apiUrl}/api/legal-lens/smart-summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Smart Summary konnte nicht generiert werden');
      }

      const data = await response.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else {
        throw new Error('Ungültige Antwort vom Server');
      }

    } catch (err) {
      console.error('[SmartSummary] Error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  }, [contractId, getApiUrl]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const getVerdictColor = (action: string) => {
    switch (action) {
      case 'accept': return '#22c55e';
      case 'negotiate': return '#f59e0b';
      case 'reject': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getVerdictBg = (action: string) => {
    switch (action) {
      case 'accept': return '#f0fdf4';
      case 'negotiate': return '#fffbeb';
      case 'reject': return '#fef2f2';
      default: return '#f8fafc';
    }
  };

  const getVerdictLabel = (action: string) => {
    switch (action) {
      case 'accept': return 'AKZEPTABEL';
      case 'negotiate': return 'VERHANDELBAR';
      case 'reject': return 'KRITISCH';
      default: return 'ZU PRÜFEN';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle size={18} />;
      case 'warning': return <AlertCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <h3 className={styles.loadingTitle}>KI analysiert Vertrag...</h3>
          <p className={styles.loadingSubtitle}>
            Identifiziere Risiken und erstelle Übersicht
          </p>
          <div className={styles.loadingSteps}>
            <div className={styles.loadingStep}>
              <CheckCircle size={16} /> Vertragstext extrahiert
            </div>
            <div className={`${styles.loadingStep} ${styles.active}`}>
              <RefreshCw size={16} className={styles.spinning} /> Analysiere Klauseln...
            </div>
            <div className={styles.loadingStep}>
              <Clock size={16} /> Erstelle Zusammenfassung
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertTriangle size={48} className={styles.errorIcon} />
          <h3 className={styles.errorTitle}>Analyse fehlgeschlagen</h3>
          <p className={styles.errorMessage}>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={loadSummary} className={styles.retryButton}>
              <RefreshCw size={16} /> Erneut versuchen
            </button>
            <button onClick={onDismiss} className={styles.skipButton}>
              Überspringen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className={styles.container}>
      {/* Header mit Close */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>📊</span>
          <div>
            <h2 className={styles.headerTitle}>Sofort-Übersicht</h2>
            <p className={styles.headerSubtitle}>{contractName}</p>
          </div>
        </div>
        <button onClick={onDismiss} className={styles.closeButton}>
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Verdict Card */}
        <div
          className={styles.verdictCard}
          style={{
            background: getVerdictBg(summary.overallVerdict.action),
            borderColor: getVerdictColor(summary.overallVerdict.action)
          }}
        >
          <div className={styles.verdictHeader}>
            <span className={styles.verdictEmoji}>{summary.overallVerdict.emoji}</span>
            <span
              className={styles.verdictLabel}
              style={{ color: getVerdictColor(summary.overallVerdict.action) }}
            >
              {getVerdictLabel(summary.overallVerdict.action)}
            </span>
          </div>
          <p className={styles.verdictHeadline}>{summary.overallVerdict.headline}</p>
          <div className={styles.contractType}>
            <span className={styles.contractTypeLabel}>{summary.contractType}</span>
            {summary.contractTypeDetail && (
              <span className={styles.contractTypeDetail}>{summary.contractTypeDetail}</span>
            )}
          </div>
        </div>

        {/* Risk Score */}
        <div className={styles.riskScoreSection}>
          <h3 className={styles.sectionTitle}>
            <TrendingUp size={18} /> Risiko-Score
          </h3>
          <div className={styles.riskScoreGrid}>
            <div className={styles.overallScore}>
              <div className={styles.scoreCircle}>
                <svg viewBox="0 0 100 100" className={styles.scoreSvg}>
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke={summary.riskScore.overall > 70 ? '#ef4444' : summary.riskScore.overall > 40 ? '#f59e0b' : '#22c55e'}
                    strokeWidth="8"
                    strokeDasharray={`${summary.riskScore.overall * 2.83} 283`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <span className={styles.scoreValue}>{summary.riskScore.overall}</span>
              </div>
              <span className={styles.scoreLabel}>Gesamt</span>
            </div>
            <div className={styles.breakdownScores}>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>💰 Finanziell</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{
                      width: `${summary.riskScore.breakdown.financial}%`,
                      background: summary.riskScore.breakdown.financial > 70 ? '#ef4444' : summary.riskScore.breakdown.financial > 40 ? '#f59e0b' : '#22c55e'
                    }}
                  />
                </div>
                <span className={styles.breakdownValue}>{summary.riskScore.breakdown.financial}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>⚖️ Rechtlich</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{
                      width: `${summary.riskScore.breakdown.legal}%`,
                      background: summary.riskScore.breakdown.legal > 70 ? '#ef4444' : summary.riskScore.breakdown.legal > 40 ? '#f59e0b' : '#22c55e'
                    }}
                  />
                </div>
                <span className={styles.breakdownValue}>{summary.riskScore.breakdown.legal}</span>
              </div>
              <div className={styles.breakdownItem}>
                <span className={styles.breakdownLabel}>🔧 Operativ</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{
                      width: `${summary.riskScore.breakdown.operational}%`,
                      background: summary.riskScore.breakdown.operational > 70 ? '#ef4444' : summary.riskScore.breakdown.operational > 40 ? '#f59e0b' : '#22c55e'
                    }}
                  />
                </div>
                <span className={styles.breakdownValue}>{summary.riskScore.breakdown.operational}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={styles.quickStats}>
          <div className={styles.statItem} style={{ borderColor: '#ef4444' }}>
            <span className={styles.statValue} style={{ color: '#ef4444' }}>
              {summary.quickStats.criticalCount}
            </span>
            <span className={styles.statLabel}>Kritisch</span>
          </div>
          <div className={styles.statItem} style={{ borderColor: '#f59e0b' }}>
            <span className={styles.statValue} style={{ color: '#f59e0b' }}>
              {summary.quickStats.warningCount}
            </span>
            <span className={styles.statLabel}>Prüfenswert</span>
          </div>
          <div className={styles.statItem} style={{ borderColor: '#22c55e' }}>
            <span className={styles.statValue} style={{ color: '#22c55e' }}>
              {summary.quickStats.okayCount}
            </span>
            <span className={styles.statLabel}>Standard</span>
          </div>
        </div>

        {/* Top Risks */}
        {summary.topRisks && summary.topRisks.length > 0 && (
          <div className={styles.topRisksSection}>
            <h3 className={styles.sectionTitle}>
              <AlertTriangle size={18} /> Top Risiken
            </h3>
            <div className={styles.riskList}>
              {summary.topRisks.map((risk, index) => (
                <div
                  key={index}
                  className={`${styles.riskCard} ${expandedRisk === index ? styles.expanded : ''}`}
                  onClick={() => setExpandedRisk(expandedRisk === index ? null : index)}
                >
                  <div className={styles.riskHeader}>
                    <div
                      className={styles.riskIcon}
                      style={{ color: getSeverityColor(risk.severity) }}
                    >
                      {getSeverityIcon(risk.severity)}
                    </div>
                    <div className={styles.riskTitleArea}>
                      <span className={styles.riskTitle}>{risk.title}</span>
                      {risk.section && (
                        <span className={styles.riskSection}>{risk.section}</span>
                      )}
                    </div>
                    <ChevronRight
                      size={18}
                      className={`${styles.riskChevron} ${expandedRisk === index ? styles.rotated : ''}`}
                    />
                  </div>

                  {expandedRisk === index && (
                    <div className={styles.riskContent}>
                      <div className={styles.riskMeaning}>
                        <strong>Was bedeutet das für dich?</strong>
                        <p>{risk.whatItMeans}</p>
                      </div>

                      <div className={styles.worstCase}>
                        <strong>Worst Case:</strong>
                        <div className={styles.worstCaseGrid}>
                          <div className={styles.worstCaseItem}>
                            <span className={styles.wcIcon}>💰</span>
                            <span className={styles.wcLabel}>Finanziell</span>
                            <span className={styles.wcValue}>{risk.worstCase.financialRisk}</span>
                          </div>
                          <div className={styles.worstCaseItem}>
                            <span className={styles.wcIcon}>⏰</span>
                            <span className={styles.wcLabel}>Zeitlich</span>
                            <span className={styles.wcValue}>{risk.worstCase.timeRisk}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.riskRecommendation}>
                        <strong>Empfehlung:</strong>
                        <p>{risk.recommendation}</p>
                      </div>

                      {risk.negotiationHint && (
                        <div className={styles.negotiationHint}>
                          <strong>So sprichst du es an:</strong>
                          <p>"{risk.negotiationHint}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Terms */}
        <div className={styles.keyTermsSection}>
          <h3 className={styles.sectionTitle}>
            <Clock size={18} /> Wichtige Konditionen
          </h3>
          <div className={styles.keyTermsGrid}>
            <div className={styles.keyTerm}>
              <span className={styles.ktLabel}>Laufzeit</span>
              <span className={styles.ktValue}>{summary.keyTerms.duration}</span>
            </div>
            <div className={styles.keyTerm}>
              <span className={styles.ktLabel}>Kündigungsfrist</span>
              <span className={styles.ktValue}>{summary.keyTerms.terminationNotice}</span>
            </div>
            {summary.keyTerms.value && summary.keyTerms.value !== 'Nicht angegeben' && (
              <div className={styles.keyTerm}>
                <span className={styles.ktLabel}>Vertragswert</span>
                <span className={styles.ktValue}>{summary.keyTerms.value}</span>
              </div>
            )}
          </div>
        </div>

        {/* Highlights */}
        <div className={styles.highlightsSection}>
          {summary.highlights.positive.length > 0 && (
            <div className={styles.highlightGroup}>
              <h4 className={styles.highlightTitle} style={{ color: '#22c55e' }}>
                ✅ Positiv
              </h4>
              <ul className={styles.highlightList}>
                {summary.highlights.positive.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.highlights.negative.length > 0 && (
            <div className={styles.highlightGroup}>
              <h4 className={styles.highlightTitle} style={{ color: '#ef4444' }}>
                ❌ Negativ
              </h4>
              <ul className={styles.highlightList}>
                {summary.highlights.negative.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.highlights.unusual.length > 0 && (
            <div className={styles.highlightGroup}>
              <h4 className={styles.highlightTitle} style={{ color: '#f59e0b' }}>
                ❓ Ungewöhnlich
              </h4>
              <ul className={styles.highlightList}>
                {summary.highlights.unusual.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Next Steps */}
        {summary.nextSteps && summary.nextSteps.length > 0 && (
          <div className={styles.nextStepsSection}>
            <h3 className={styles.sectionTitle}>
              <ArrowRight size={18} /> Nächste Schritte
            </h3>
            <div className={styles.stepsList}>
              {summary.nextSteps.map((step, index) => (
                <div key={index} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{step.priority}</span>
                  <div className={styles.stepContent}>
                    <span className={styles.stepAction}>{step.action}</span>
                    <span className={styles.stepReason}>{step.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TL;DR */}
        <div className={styles.tldrSection}>
          <h3 className={styles.tldrTitle}>📝 TL;DR</h3>
          <p className={styles.tldrText}>{summary.tldr}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={styles.footer}>
        <button onClick={onDismiss} className={styles.primaryButton}>
          Zur Detail-Analyse
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default SmartSummary;

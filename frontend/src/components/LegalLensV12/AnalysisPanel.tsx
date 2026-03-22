// 📁 components/LegalLens/AnalysisPanel.tsx
// Komponente für das Analyse-Panel (rechte Seite) - KOMPLETT ÜBERARBEITET

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GitCompare, BookmarkPlus, Wifi, Clock, Server, AlertTriangle, Copy, Check } from 'lucide-react';
import type {
  ClauseAnalysis,
  PerspectiveType,
  ClauseAlternative,
  NegotiationInfo,
  ChatMessage,
  ActionLevel
} from '../../types/legalLens';
import { PERSPECTIVES, ACTION_LABELS, PROBABILITY_LABELS, type PerspectiveInfo } from '../../types/legalLens';
import ClauseCompareModal from './ClauseCompareModal';
import ClauseSimulatorModal from './ClauseSimulatorModal';
import SaveClauseModal from './SaveClauseModal';
import { ErrorInfo, generateContentHash } from '../../hooks/useLegalLensV12';
import styles from '../../styles/LegalLensV12.module.css';

interface AnalysisPanelProps {
  analysis: ClauseAnalysis | null;
  currentPerspective: PerspectiveType;
  alternatives: ClauseAlternative[];
  negotiation: NegotiationInfo | null;
  chatHistory: ChatMessage[];
  isAnalyzing: boolean;
  isGeneratingAlternatives: boolean;
  isGeneratingNegotiation: boolean;
  isChatting: boolean;
  isRetrying?: boolean;
  retryCount?: number;
  streamingText: string;
  error: string | null;
  errorInfo?: ErrorInfo | null;
  originalClauseText?: string; // Für Klausel-Vergleich
  sourceContractId?: string;
  sourceContractName?: string;
  sourceClauseId?: string;
  currentIndustry?: string;
  analysisCache?: Record<string, unknown>;
  onLoadAlternatives: () => void;
  onLoadNegotiation: () => void;
  onSendChatMessage: (message: string) => void;
  onRetry: () => void;
  onClauseSaved?: (clauseId: string) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysis,
  currentPerspective,
  alternatives,
  negotiation,
  chatHistory,
  isAnalyzing,
  isGeneratingAlternatives,
  isGeneratingNegotiation,
  isChatting,
  isRetrying = false,
  retryCount = 0,
  streamingText,
  error,
  errorInfo,
  originalClauseText,
  sourceContractId,
  sourceContractName,
  sourceClauseId,
  currentIndustry,
  analysisCache = {},
  onLoadAlternatives,
  onLoadNegotiation,
  onSendChatMessage,
  onRetry,
  onClauseSaved
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  // ✅ Phase 2 Task 2.2: Progressive Disclosure - nur wichtigste Sektion offen
  // explanation = Was bedeutet das? (wichtig für Verständnis)
  // worstCase, risks, alternative, market = collapsed (User entscheidet selbst)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['explanation']));
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareAlternativeText, setCompareAlternativeText] = useState('');
  const [compareWhyBetter, setCompareWhyBetter] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Live elapsed timer during analysis
  useEffect(() => {
    if (!isAnalyzing) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const timer = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  // Ref für Auto-Scroll im Chat
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zum neuesten Chat-Eintrag
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory, isChatting]);

  // ✅ Feature 4: Auto-Expand bei High-Risk Klauseln
  const analysisActionLevel = analysis?.actionLevel ||
    analysis?.perspectives?.[currentPerspective]?.actionLevel;
  useEffect(() => {
    if (analysisActionLevel === 'reject') {
      setExpandedSections(new Set(['explanation', 'worstCase', 'risks']));
    } else {
      setExpandedSections(new Set(['explanation']));
    }
  }, [analysisActionLevel, analysis]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSendMessage = () => {
    if (chatInput.trim() && !isChatting) {
      onSendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Smart Quick Questions based on clause risk and type
  const quickQuestions = useMemo(() => {
    const questions: string[] = [];
    if (!analysis) return questions;

    const action = analysisActionLevel;
    if (action === 'reject') {
      questions.push('Welche rechtlichen Konsequenzen hat diese Klausel?');
      questions.push('Kann ich diese Klausel streichen lassen?');
      questions.push('Gibt es Urteile zu ähnlichen Klauseln?');
    } else if (action === 'negotiate') {
      questions.push('Was ist hier marktüblich?');
      questions.push('Wie verhandle ich diese Klausel am besten?');
      questions.push('Welche Kompromisse wären sinnvoll?');
    } else {
      questions.push('Gibt es versteckte Risiken?');
      questions.push('Ist diese Klausel AGB-konform?');
    }

    // Always offer these
    questions.push('Erkläre in einem Satz');

    return questions.slice(0, 4);
  }, [analysis, analysisActionLevel]);

  const copyEmailTemplate = () => {
    if (negotiation?.emailTemplate) {
      navigator.clipboard.writeText(negotiation.emailTemplate);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  const copyText = (text: string, fieldId?: string) => {
    navigator.clipboard.writeText(text);
    if (fieldId) {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const getCurrentPerspectiveInfo = () => {
    return PERSPECTIVES.find(p => p.id === currentPerspective) || PERSPECTIVES[0];
  };

  // Retrying State
  if (isRetrying) {
    return (
      <div className={styles.analysisContent}>
        <div className={styles.retryingState}>
          <div className={styles.retrySpinner} />
          <p className={styles.retryingText}>
            Verbindung wird hergestellt... (Versuch {retryCount + 1})
          </p>
        </div>
      </div>
    );
  }

  // Error State - verbessert mit errorInfo
  if (error) {
    const ErrorIcon = errorInfo?.type === 'network' ? Wifi :
                      errorInfo?.type === 'timeout' ? Clock :
                      errorInfo?.type === 'server' ? Server : AlertTriangle;

    return (
      <div className={styles.analysisContent}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>
            <ErrorIcon size={32} strokeWidth={1.5} />
          </span>
          <p className={styles.errorTitle}>{errorInfo?.message || error}</p>
          {errorInfo?.hint && (
            <p className={styles.errorHint}>{errorInfo.hint}</p>
          )}
          {errorInfo && errorInfo.retryCount > 0 && (
            <p className={styles.errorRetryInfo}>
              {errorInfo.retryCount} automatische Versuche fehlgeschlagen
            </p>
          )}
          {errorInfo?.canRetry !== false && (
            <button className={styles.retryButton} onClick={onRetry}>
              Erneut versuchen
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading State (Streaming)
  if (isAnalyzing) {
    const perspInfo = getCurrentPerspectiveInfo();
    return (
      <div className={styles.analysisContent}>
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>{perspInfo.icon || '🔍'}</span>
              Analyse läuft...
            </h4>
            <span className={styles.elapsedTime}>{elapsedSec}s</span>
          </div>
          {streamingText ? (
            <div className={styles.streamingTextContent}>
              {streamingText}
              <span className={styles.streamingCursor} />
            </div>
          ) : (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
              <span className={styles.loadingText}>
                {perspInfo.name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No Analysis Yet - aber Klausel ausgewählt
  // ✅ Phase 1 Task 4: Fallback-Text statt leerer Anzeige
  if (!analysis) {
    return (
      <div className={styles.analysisContent}>
        <div className={styles.emptyAnalysisState}>
          <span className={styles.emptyAnalysisIcon}>📋</span>
          <h4 className={styles.emptyAnalysisTitle}>Analyse wird vorbereitet</h4>
          <p className={styles.emptyAnalysisText}>
            Die Analyse für diese Klausel wird geladen. Bitte warten Sie einen Moment.
          </p>
        </div>
      </div>
    );
  }

  // Die Analyse kann in zwei Formaten kommen:
  // 1. Direkt von der API: analysis enthält die Perspektive-Daten direkt
  // 2. Aus dem Cache: analysis.perspectives[currentPerspective]
  const perspectiveData = analysis.perspectives?.[currentPerspective] || analysis;

  // Extrahiere die wichtigsten Felder (können auf verschiedenen Ebenen sein)
  const actionLevel: ActionLevel = perspectiveData?.actionLevel || analysis.actionLevel || 'negotiate';
  const actionReason = perspectiveData?.actionReason || analysis.actionReason || '';
  const worstCase = perspectiveData?.worstCase || analysis.worstCase;
  const betterAlternative = perspectiveData?.betterAlternative || analysis.betterAlternative;
  // Type-safe access to potentially direct analysis fields
  const analysisWithExtras = analysis as ClauseAnalysis & {
    marketComparison?: { isStandard: boolean; marketRange: string; deviation: string };
    riskAssessment?: { level: string; score: number; reasons: string[] };
  };
  const marketComparison = perspectiveData?.marketComparison || analysisWithExtras.marketComparison;
  const riskAssessment = perspectiveData?.riskAssessment || analysisWithExtras.riskAssessment;

  const actionInfo = ACTION_LABELS[actionLevel] || ACTION_LABELS.negotiate;

  // ✅ FIX Issue #2: "Auf einen Blick" zeigt NUR actionReason, NICHT die Erklärung
  // Die detaillierte Erklärung kommt in "Was bedeutet das?" - KEINE DUPLIZIERUNG!
  const oneSentenceSummary = actionReason || null;

  // Prüfe ob "Auf einen Blick" ANDERS ist als "Was bedeutet das?" (Erklärung)
  const explanationText = perspectiveData?.explanation?.simple ||
    perspectiveData?.explanation?.summary || '';
  const showOneSentenceSummary = oneSentenceSummary &&
    oneSentenceSummary !== explanationText &&
    oneSentenceSummary.length > 10;

  // ✅ Phase 2 Task 2.3: Risk-Score Erklärung Helper
  const getRiskScoreInfo = (score: number) => {
    if (score >= 80) return { label: 'Kritisch', color: '#dc2626', hint: 'Dringend prüfen' };
    if (score >= 60) return { label: 'Hoch', color: '#ea580c', hint: 'Aufmerksamkeit nötig' };
    if (score >= 40) return { label: 'Mittel', color: '#ca8a04', hint: 'Verhandeln empfohlen' };
    if (score >= 20) return { label: 'Niedrig', color: '#16a34a', hint: 'Akzeptabel' };
    return { label: 'Minimal', color: '#059669', hint: 'Unbedenklich' };
  };

  return (
    <div className={styles.analysisContent}>
      {/* 📝 FIX Issue #2: EIN-SATZ-ERKLÄRUNG - NUR wenn unterschiedlich von Erklärung */}
      {showOneSentenceSummary && (
        <div className={styles.oneSentenceSummary}>
          <span className={styles.summaryLabel}>Auf einen Blick</span>
          <p className={styles.summaryText}>{oneSentenceSummary}</p>
        </div>
      )}

      {/* 🎯 ACTION BADGE - DAS WICHTIGSTE ZUERST */}
      <div
        className={`${styles.analysisSection} ${styles.actionBadgeSection}`}
        style={{ '--action-bg': actionInfo.bgColor, '--action-color': actionInfo.color } as React.CSSProperties}
      >
        <div className={styles.actionBadgeHeader} style={{ marginBottom: actionReason ? '0.75rem' : 0 }}>
          <div className={styles.actionBadgeInfo}>
            <span className={styles.actionEmoji}>{actionInfo.emoji}</span>
            <div>
              <h3 className={styles.actionTitle}>
                {actionInfo.text}
              </h3>
              <span className={styles.metaLabel}>
                Handlungsempfehlung
              </span>
            </div>
          </div>
          <div className={styles.actionBadgeInfo}>
            {riskAssessment && (() => {
              const scoreInfo = getRiskScoreInfo(riskAssessment.score);
              const radius = 28;
              const circumference = 2 * Math.PI * radius;
              const arcLength = (riskAssessment.score / 100) * circumference * 0.75; // 270° arc
              return (
                <div className={styles.scoreCard} style={{ '--score-color': scoreInfo.color } as React.CSSProperties}>
                  <div className={styles.riskArcWrapper}>
                    <svg width="68" height="68" viewBox="0 0 68 68" className={styles.riskArcSvg}>
                      {/* Background arc */}
                      <circle
                        cx="34" cy="34" r={radius}
                        fill="none" stroke="#e2e8f0" strokeWidth="5"
                        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                        strokeLinecap="round"
                        transform="rotate(135 34 34)"
                      />
                      {/* Score arc */}
                      <circle
                        cx="34" cy="34" r={radius}
                        fill="none" stroke={scoreInfo.color} strokeWidth="5"
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeLinecap="round"
                        transform="rotate(135 34 34)"
                        className={styles.riskArcFill}
                      />
                    </svg>
                    <span className={styles.riskArcValue}>{riskAssessment.score}</span>
                  </div>
                  <div className={styles.scoreLabel}>
                    {scoreInfo.label}
                  </div>
                  <div className={styles.scoreHint}>
                    {scoreInfo.hint}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {/* ✅ FIX: actionReason NUR zeigen wenn NICHT schon in "Auf einen Blick" */}
        {actionReason && !showOneSentenceSummary && (
          <p className={styles.actionReasonText}>
            {actionReason}
          </p>
        )}
      </div>

      {/* 📖 Einfache Erklärung - IMMER anzeigen mit Fallback-Text */}
      <div className={styles.analysisSection}>
        <div
          className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
          onClick={() => toggleSection('explanation')}
        >
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>{getCurrentPerspectiveInfo().icon}</span>
            Was bedeutet das?
          </h4>
          <span className={styles.sectionToggle}>
            {expandedSections.has('explanation') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.has('explanation') && (
          <>
            <p className={styles.explanationMainText}>
              {perspectiveData?.explanation?.simple ||
               perspectiveData?.explanation?.summary ||
               'Diese Klausel regelt einen bestimmten Aspekt des Vertrags. Die detaillierte Erklärung wird gerade erstellt.'}
            </p>

            {/* Was das für DICH bedeutet - HIGHLIGHT */}
            {perspectiveData?.explanation?.whatItMeansForYou && (
              <div className={styles.whatItMeansBox}>
                <div className={styles.whatItMeansLabel}>
                  💡 Was das für dich bedeutet
                </div>
                <p className={styles.whatItMeansText}>
                  {perspectiveData.explanation.whatItMeansForYou}
                </p>
              </div>
            )}

            {perspectiveData?.explanation?.keyPoints?.length > 0 && (
              <ul className={styles.keyPoints}>
                {perspectiveData.explanation.keyPoints.map((point, idx) => (
                  <li key={idx} className={styles.keyPoint}>
                    <span className={styles.keyPointBullet}>•</span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* ⚠️ Worst-Case Szenario - MIT KONKRETEN ZAHLEN */}
      {worstCase && (
        <div className={styles.analysisSection}>
          <div
            className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
            onClick={() => toggleSection('worstCase')}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>⚠️</span>
              Worst-Case Szenario
            </h4>
            <span className={styles.sectionToggle}>
              {expandedSections.has('worstCase') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('worstCase') && (
            <div className={styles.contentGrid}>
              <p className={styles.contentParagraph}>
                {worstCase.scenario}
              </p>

              <div className={styles.worstCaseGrid}>
                {/* Finanzielles Risiko */}
                <div className={styles.riskCardFinancial}>
                  <div className={styles.riskCardLabelRed}>
                    💰 Finanzielles Risiko
                  </div>
                  <div className={styles.riskCardValueRed}>
                    {worstCase.financialRisk || 'Nicht bezifferbar'}
                  </div>
                </div>

                {/* Zeitliches Risiko */}
                <div className={styles.riskCardTime}>
                  <div className={styles.riskCardLabelYellow}>
                    ⏰ Zeitliche Bindung
                  </div>
                  <div className={styles.riskCardValueYellow}>
                    {worstCase.timeRisk || 'Keine Angabe'}
                  </div>
                </div>
              </div>

              {worstCase.probability && (
                <div className={styles.probabilityRow}>
                  <span>Wahrscheinlichkeit:</span>
                  <span
                    className={styles.probabilityBadge}
                    style={{
                      '--prob-bg': worstCase.probability === 'likely' ? '#fef2f2' :
                                   worstCase.probability === 'possible' ? '#fffbeb' : '#f0fdf4',
                      '--prob-color': worstCase.probability === 'likely' ? '#dc2626' :
                                      worstCase.probability === 'possible' ? '#d97706' : '#16a34a'
                    } as React.CSSProperties}
                  >
                    {PROBABILITY_LABELS[worstCase.probability] || worstCase.probability}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 📊 Risiko-Gründe */}
      {riskAssessment?.reasons && riskAssessment.reasons.length > 0 && (
        <div className={styles.analysisSection}>
          <div
            className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
            onClick={() => toggleSection('risks')}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📊</span>
              Risiko-Faktoren
            </h4>
            <span className={styles.sectionToggle}>
              {expandedSections.has('risks') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('risks') && (
            <div className={styles.risksColumn}>
              {riskAssessment.reasons.map((reason: string, idx: number) => (
                <div key={idx} className={styles.riskItem}>
                  <span className={styles.riskDot}>●</span>
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 💼 Bessere Alternative */}
      {betterAlternative && (
        <div className={styles.analysisSection}>
          <div
            className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
            onClick={() => toggleSection('alternative')}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>💼</span>
              Bessere Alternative
            </h4>
            <span className={styles.sectionToggle}>
              {expandedSections.has('alternative') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('alternative') && (
            <div className={styles.alternativeColumn}>
              {/* Vorgeschlagene Formulierung */}
              <div className={styles.suggestionBox}>
                <div className={styles.suggestionLabel}>
                  Vorgeschlagene Formulierung
                </div>
                <p className={styles.suggestionText}>
                  "{betterAlternative.text}"
                </p>
                <div className={styles.alternativeActions}>
                  <button
                    onClick={() => copyText(betterAlternative.text, 'betterAlt')}
                    className={`${styles.copyButtonGreen} ${copiedField === 'betterAlt' ? styles.copied : ''}`}
                  >
                    {copiedField === 'betterAlt' ? <><Check size={12} /> Kopiert!</> : <><Copy size={12} /> Kopieren</>}
                  </button>
                  {originalClauseText && (
                    <button
                      onClick={() => {
                        setCompareAlternativeText(betterAlternative.text);
                        setCompareWhyBetter(betterAlternative.whyBetter || '');
                        setShowCompareModal(true);
                      }}
                      className={styles.compareButtonBlue}
                    >
                      <GitCompare size={12} />
                      Vergleichen
                    </button>
                  )}
                </div>
              </div>

              {betterAlternative.whyBetter && (
                <p className={styles.whyBetterText}>
                  <strong>Warum besser:</strong> {betterAlternative.whyBetter}
                </p>
              )}

              {betterAlternative.howToAsk && (
                <div className={styles.howToAskBox}>
                  <div className={styles.howToAskLabel}>
                    <span>🗣️ So fragst du danach:</span>
                    <button
                      onClick={() => copyText(betterAlternative.howToAsk!, 'howToAsk')}
                      className={`${styles.copyBtnInline} ${copiedField === 'howToAsk' ? styles.copied : ''}`}
                    >
                      {copiedField === 'howToAsk' ? <><Check size={10} /> Kopiert</> : <><Copy size={10} /> Kopieren</>}
                    </button>
                  </div>
                  <p className={styles.howToAskText}>
                    "{betterAlternative.howToAsk}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 📈 Marktvergleich */}
      {marketComparison && (
        <div className={styles.analysisSection}>
          <div
            className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
            onClick={() => toggleSection('market')}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📈</span>
              Marktvergleich
            </h4>
            <span className={styles.sectionToggle}>
              {expandedSections.has('market') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('market') && (
            <div className={styles.marketColumn}>
              <div className={styles.marketBadgeRow}>
                <span
                  className={styles.marketBadge}
                  style={{
                    '--market-bg': marketComparison.isStandard ? '#f0fdf4' : '#fef2f2',
                    '--market-color': marketComparison.isStandard ? '#16a34a' : '#dc2626'
                  } as React.CSSProperties}
                >
                  {marketComparison.isStandard ? '✓ Marktüblich' : '✗ Nicht marktüblich'}
                </span>
              </div>
              {marketComparison.marketRange && (
                <p className={styles.marketInfoText}>
                  <strong>Üblicher Standard:</strong> {marketComparison.marketRange}
                </p>
              )}
              {marketComparison.deviation && (
                <p className={styles.marketInfoText}>
                  <strong>Abweichung:</strong> {marketComparison.deviation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🔄 Perspektiv-Vergleich — Wie sehen andere Perspektiven diese Klausel? */}
      {originalClauseText && (() => {
        const contentHash = generateContentHash(originalClauseText);
        const otherPerspectives = PERSPECTIVES.filter(p => p.id !== currentPerspective);
        const perspectiveResults: Array<{ info: PerspectiveInfo; actionLevel: ActionLevel; score?: number }> = [];

        for (const p of otherPerspectives) {
          const key = `v2-${contentHash}-${p.id}`;
          const cached = analysisCache[key] as {
            actionLevel?: ActionLevel;
            riskAssessment?: { score: number };
            perspectives?: Record<string, { actionLevel?: ActionLevel; riskAssessment?: { score: number } }>;
          } | undefined;
          if (cached) {
            const pd = cached.perspectives?.[p.id] || cached;
            perspectiveResults.push({
              info: p,
              actionLevel: (pd.actionLevel || 'negotiate') as ActionLevel,
              score: pd.riskAssessment?.score ?? cached.riskAssessment?.score
            });
          }
        }

        if (perspectiveResults.length === 0) return null;

        return (
          <div className={styles.analysisSection}>
            <div
              className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
              onClick={() => toggleSection('perspectives')}
            >
              <h4 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🔄</span>
                Andere Perspektiven
              </h4>
              <span className={styles.sectionToggle}>
                {expandedSections.has('perspectives') ? '▼' : '▶'}
              </span>
            </div>
            {expandedSections.has('perspectives') && (
              <div className={styles.perspectiveGrid}>
                {perspectiveResults.map(({ info, actionLevel: pAction, score: pScore }) => {
                  const pInfo = ACTION_LABELS[pAction] || ACTION_LABELS.negotiate;
                  return (
                    <div key={info.id} className={styles.perspectiveCard}>
                      <div className={styles.perspectiveCardHeader}>
                        <span>{info.icon}</span>
                        <span className={styles.perspectiveCardName}>{info.name}</span>
                      </div>
                      <div className={styles.perspectiveCardAction} style={{ color: pInfo.color }}>
                        {pInfo.emoji} {pInfo.text}
                      </div>
                      {pScore != null && (
                        <div className={styles.perspectiveCardScore}>
                          Risiko: {pScore}/100
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 💡 Weitere Alternativen (generiert) */}
      <div className={styles.analysisSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💡</span>
            Weitere Alternativen
          </h4>
          {alternatives.length === 0 && !isGeneratingAlternatives && (
            <button
              className={styles.actionButton}
              onClick={onLoadAlternatives}
            >
              Generieren
            </button>
          )}
        </div>
        {isGeneratingAlternatives ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>Generiere Alternativen...</span>
          </div>
        ) : alternatives.length > 0 ? (
          <div className={styles.alternativesColumn}>
            {alternatives.map((alt, idx) => (
              <div key={idx} className={styles.alternativeCard}>
                <p className={styles.alternativeCardText}>
                  "{alt.text}"
                </p>
                {alt.benefits && alt.benefits.length > 0 && (
                  <div className={styles.benefitsRow}>
                    {alt.benefits.map((benefit, bIdx) => (
                      <span key={bIdx} className={styles.benefitTag}>
                        {benefit}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.difficultyRow}>
                  <span
                    className={styles.difficultyDot}
                    style={{
                      '--diff-color': alt.difficulty === 'easy' ? '#16a34a' : alt.difficulty === 'hard' ? '#dc2626' : '#d97706'
                    } as React.CSSProperties}
                  />
                  <span>
                    {alt.difficulty === 'easy' ? 'Einfach umzusetzen' :
                     alt.difficulty === 'hard' ? 'Schwierig umzusetzen' : 'Mittlerer Aufwand'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyAlternativesText}>
            Klicken Sie auf "Generieren", um weitere alternative Formulierungen zu erhalten.
          </p>
        )}
      </div>

      {/* 🤝 Verhandlungstipps */}
      <div className={styles.analysisSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🤝</span>
            Verhandlungstipps
          </h4>
          {!negotiation && !isGeneratingNegotiation && (
            <button
              className={styles.actionButton}
              onClick={onLoadNegotiation}
            >
              Generieren
            </button>
          )}
        </div>
        {isGeneratingNegotiation ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>Generiere Verhandlungstipps...</span>
          </div>
        ) : negotiation ? (
          <>
            <p className={styles.explanationText}>{negotiation.argument}</p>
            {negotiation.tips?.length > 0 && (
              <div className={styles.negotiationTips}>
                {negotiation.tips.map((tip, idx) => (
                  <div key={idx} className={styles.tipItem}>
                    <span className={styles.tipIcon}>💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
            {negotiation.emailTemplate && (
              <>
                <pre className={styles.emailTemplate}>{negotiation.emailTemplate}</pre>
                <button className={styles.copyButton} onClick={copyEmailTemplate}>
                  {copiedTemplate ? '✓ Kopiert!' : '📋 E-Mail-Vorlage kopieren'}
                </button>
              </>
            )}
          </>
        ) : (
          <p className={styles.explanationText}>
            Klicken Sie auf "Generieren", um Verhandlungstipps zu erhalten.
          </p>
        )}
      </div>

      {/* 🧪 Klausel-Simulator */}
      {originalClauseText && sourceContractId && (
        <div className={styles.analysisSection}>
          <button
            className={styles.simulatorTriggerBtn}
            onClick={() => setShowSimulator(true)}
          >
            🧪 Klausel-Simulator — Was wäre wenn...?
          </button>
        </div>
      )}

      {/* 💬 Chat Section */}
      <div className={styles.chatSection}>
        <div className={styles.chatHeader}>
          <span>💬</span>
          <h4 className={styles.chatTitle}>Fragen zur Klausel</h4>
        </div>

        {(chatHistory.length > 0 || isChatting) && (
          <div className={styles.chatMessages} ref={chatMessagesRef}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                <div className={styles.messageContent}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className={`${styles.chatMessage} ${styles.assistant}`}>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingText}>KI denkt nach...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Smart Quick Questions */}
        {chatHistory.length === 0 && quickQuestions.length > 0 && !isChatting && (
          <div className={styles.quickQuestions}>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                className={styles.quickQuestionChip}
                onClick={() => onSendChatMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className={styles.chatInputContainer}>
          <textarea
            className={styles.chatInput}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stellen Sie eine Frage zu dieser Klausel..."
            rows={1}
          />
          <button
            className={styles.chatSendButton}
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatting}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Klausel-Vergleichs-Modal */}
      <ClauseCompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        originalText={originalClauseText || ''}
        alternativeText={compareAlternativeText}
        originalTitle="Aktuelle Klausel"
        alternativeTitle="Bessere Alternative"
        whyBetter={compareWhyBetter}
        onSelectAlternative={() => {
          copyText(compareAlternativeText);
          setShowCompareModal(false);
          setShowCopiedToast(true);
          setTimeout(() => setShowCopiedToast(false), 3000);
        }}
      />

      {/* Floating Save Button */}
      {originalClauseText && (
        <button
          onClick={() => setShowSaveModal(true)}
          className={styles.floatingSaveButton}
          title="Klausel in Bibliothek speichern"
        >
          <BookmarkPlus size={20} />
          <span>Klausel speichern</span>
        </button>
      )}

      {/* Toast Notification für kopierte Alternative */}
      {showCopiedToast && (
        <div className={styles.copiedToast}>
          <span>✓</span>
          <span>Alternative in Zwischenablage kopiert!</span>
        </div>
      )}

      {/* Save Clause Modal */}
      {showSaveModal && originalClauseText && (
        <SaveClauseModal
          clauseText={originalClauseText}
          sourceContractId={sourceContractId}
          sourceContractName={sourceContractName}
          sourceClauseId={sourceClauseId}
          originalAnalysis={{
            riskLevel: riskAssessment?.level as 'low' | 'medium' | 'high' | undefined,
            riskScore: riskAssessment?.score,
            actionLevel: actionLevel
          }}
          onClose={() => setShowSaveModal(false)}
          onSaved={(clauseId) => {
            onClauseSaved?.(clauseId);
            setShowSaveModal(false);
          }}
        />
      )}

      {/* Clause Simulator Modal */}
      {originalClauseText && sourceContractId && (
        <ClauseSimulatorModal
          isOpen={showSimulator}
          onClose={() => setShowSimulator(false)}
          originalText={originalClauseText}
          contractId={sourceContractId}
          industry={currentIndustry}
        />
      )}
    </div>
  );
};

export default AnalysisPanel;

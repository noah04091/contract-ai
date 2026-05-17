// 📁 components/LegalLens/AnalysisPanel.tsx
// Komponente für das Analyse-Panel (rechte Seite) - KOMPLETT ÜBERARBEITET

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GitCompare, BookmarkPlus, Wifi, Clock, Server, AlertTriangle, Copy, Check, MessageSquare, FlaskConical } from 'lucide-react';
import type {
  ClauseAnalysis,
  PerspectiveType,
  ClauseAlternative,
  NegotiationInfo,
  ChatMessage,
  ActionLevel
} from '../../types/legalLens';
import { PERSPECTIVES, ACTION_LABELS, PROBABILITY_LABELS, RISK_COLORS, type PerspectiveInfo } from '../../types/legalLens';
import ClauseCompareModal from './ClauseCompareModal';
import ClauseSimulatorModal from './ClauseSimulatorModal';
import SaveClauseModal from './SaveClauseModal';
import { ErrorInfo, generateContentHash } from '../../hooks/useLegalLensV12';
import styles from '../../styles/LegalLensV12.module.css';

/**
 * Indikator-Tooltip-Map (universelle High-Risk-Indikatoren A1-D2).
 * Match per Prefix — z.B. "A1: Verschuldensunabhängige..." → Tooltip aus A1.
 * Wenn Indikator nicht in Map: Tag wird trotzdem angezeigt, ohne Tooltip.
 */
const INDICATOR_TOOLTIPS: Record<string, string> = {
  A1: 'Verschuldensunabhängige Haftung/Garantie — du haftest auch ohne eigenes Fehlverhalten. Erhöhtes Risiko.',
  A2: 'Pauschalierter Schadensersatz ohne Bezug zum echten Schaden — kann zu unverhältnismäßig hohen Zahlungen führen.',
  B1: 'Einseitige Pflichten — die Klausel verteilt Lasten asymmetrisch, eine Seite trägt deutlich mehr.',
  B2: 'Verzicht auf gesetzliche Rechte — du gibst Ansprüche auf, die dir das Gesetz eigentlich zusichert.',
  B3: 'Beweislast-Umkehr — du musst beweisen, was eigentlich die Gegenseite beweisen müsste.',
  C1: 'Pflichten ohne Höchstgrenze — keine Deckelung, theoretisch unbegrenzte Verpflichtung.',
  C2: 'Knebel-Wirkung — schränkt deine wirtschaftliche Handlungsfreiheit so stark ein, dass du unbillig gebunden wirst (§ 138 BGB).',
  D1: 'Klausel kann nach §§ 305-310 BGB unwirksam sein — möglicherweise nicht durchsetzbar.',
  D2: 'Klausel widerspricht zwingendem deutschen Recht — höchstwahrscheinlich nichtig.'
};

/** Findet passenden Tooltip-Text für einen Indikator-String (z.B. "A1: Verschuldens...") */
function getIndicatorTooltip(reason: string): string | null {
  const match = reason.match(/^([A-D]\d):/);
  if (match) return INDICATOR_TOOLTIPS[match[1]] || null;
  return null;
}

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
  // 🔄 Sync mit Liste-Bewertung (assessRiskBatch) — Single Source of Truth
  listRiskScore?: number;
  listRiskLevel?: 'low' | 'medium' | 'high';
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
  listRiskScore,
  listRiskLevel,
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
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const scorePopoverRef = useRef<HTMLDivElement>(null);

  // Click-outside handler für Score-Popover
  useEffect(() => {
    if (!showScoreInfo) return;
    const handler = (e: MouseEvent) => {
      if (scorePopoverRef.current && !scorePopoverRef.current.contains(e.target as Node)) {
        setShowScoreInfo(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showScoreInfo]);

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
      setExpandedSections(new Set(['explanation', 'worstCase', 'risks', 'proposal']));
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

  // Loading State (Streaming) or waiting for analysis to start
  if (isAnalyzing) {
    const perspInfo = getCurrentPerspectiveInfo();
    return (
      <div className={styles.analysisContent}>
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>{perspInfo.icon || '🔍'}</span>
              {elapsedSec >= 8 ? 'Dauert etwas länger...' : 'Analyse läuft...'}
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
                {elapsedSec >= 8
                  ? 'Komplexe Klausel — Analyse benötigt etwas mehr Zeit'
                  : `${perspInfo.name}-Perspektive wird analysiert`
                }
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No Analysis Yet - Klausel ausgewählt, Analyse startet gleich
  if (!analysis) {
    return (
      <div className={styles.analysisContent}>
        <div className={styles.analysisSection}>
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>
              Analyse wird gestartet...
            </span>
          </div>
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
  // 🏛️ Phase 2: Rechtsquellen — null wenn keine relevanten Quellen (Frontend zeigt dann nichts)
  const legalSources = perspectiveData?.legalSources || (analysis as ClauseAnalysis & { legalSources?: import('../../types/legalLens').LegalSources | null }).legalSources;
  const hasLegalSources = !!legalSources && ((legalSources.statutes?.length || 0) + (legalSources.caselaw?.length || 0)) > 0;

  // ✅ FIX Issue #2: "Auf einen Blick" zeigt NUR actionReason, NICHT die Erklärung
  // Die detaillierte Erklärung kommt in "Was bedeutet das?" - KEINE DUPLIZIERUNG!
  const oneSentenceSummary = actionReason || null;

  // Prüfe ob "Auf einen Blick" ANDERS ist als "Was bedeutet das?" (Erklärung)
  const explanationText = perspectiveData?.explanation?.simple ||
    perspectiveData?.explanation?.summary || '';
  void oneSentenceSummary; void explanationText; // reserved für künftige Summary-Logik

  // ✅ Phase 2 Task 2.3: Risk-Score Erklärung Helper
  const getRiskScoreInfo = (score: number) => {
    if (score >= 80) return { label: 'Kritisch', color: '#dc2626', hint: 'Dringend prüfen' };
    if (score >= 60) return { label: 'Hoch', color: '#ea580c', hint: 'Aufmerksamkeit nötig' };
    if (score >= 40) return { label: 'Mittel', color: '#ca8a04', hint: 'Verhandeln empfohlen' };
    if (score >= 20) return { label: 'Niedrig', color: '#16a34a', hint: 'Akzeptabel' };
    return { label: 'Minimal', color: '#059669', hint: 'Unbedenklich' };
  };

  // 🔄 Single Source of Truth: Liste-Bewertung gewinnt (sonst Fallback auf Detail-Analyse).
  // Falls listRiskLevel vorhanden aber score fehlt, leiten wir einen repräsentativen Score ab.
  const deriveScoreFromLevel = (level?: 'low' | 'medium' | 'high'): number | undefined => {
    if (level === 'high') return 70;
    if (level === 'medium') return 50;
    if (level === 'low') return 25;
    return undefined;
  };
  const effectiveScore: number | undefined =
    (typeof listRiskScore === 'number')
      ? listRiskScore
      : (deriveScoreFromLevel(listRiskLevel) ?? riskAssessment?.score);

  // 🎯 Label direkt aus dem riskLevel (matched die Liste-Anzeige 1:1).
  // Falls listRiskLevel fehlt → Fallback auf Score-basierte Logik.
  const getRiskLevelDisplay = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':   return { label: 'Hoch',    color: RISK_COLORS.high,   hint: 'Aufmerksamkeit nötig' };
      case 'medium': return { label: 'Mittel',  color: RISK_COLORS.medium, hint: 'Verhandeln empfohlen' };
      case 'low':    return { label: 'Niedrig', color: RISK_COLORS.low,    hint: 'Akzeptabel' };
    }
  };
  const effectiveDisplay = listRiskLevel
    ? getRiskLevelDisplay(listRiskLevel)
    : (typeof effectiveScore === 'number' ? getRiskScoreInfo(effectiveScore) : null);

  return (
    <div className={styles.analysisContent}>
      {/* ✨ HERO: "Auf einen Blick" + Empfehlung-Badge + Meta-Stats — eine konsolidierte Card */}
      <div className={styles.glanceCard}>
        <div className={styles.glanceHeader}>
          <span className={styles.glanceLabel}>
            <span aria-hidden="true">✨</span> Auf einen Blick
          </span>
        </div>
        <div className={styles.glanceBody}>
          {/* Summary-Text: actionReason ODER Fallback aus erklärung */}
          {(oneSentenceSummary || explanationText) && (
            <p className={styles.glanceSummary}>
              {oneSentenceSummary || explanationText}
            </p>
          )}

          <div className={styles.glanceFooter}>
            {/* Empfehlung-Badge (klickbar mit Score-Popover) */}
            {effectiveDisplay && (() => {
              const scoreInfo = effectiveDisplay;
              return (
                <div className={styles.scorePopoverAnchor} ref={scorePopoverRef}>
                  <span className={styles.glanceRecLabel}>Empfehlung:</span>
                  <button
                    type="button"
                    className={styles.glanceBadge}
                    style={{ '--score-color': scoreInfo.color } as React.CSSProperties}
                    onClick={() => setShowScoreInfo(prev => !prev)}
                    title="Was bedeutet diese Bewertung?"
                    aria-label="Bewertung erklären"
                    aria-expanded={showScoreInfo}
                  >
                    <span
                      className={styles.glanceBadgeDot}
                      style={{ background: scoreInfo.color }}
                      aria-hidden="true"
                    />
                    <span style={{ color: scoreInfo.color }}>{scoreInfo.label}</span>
                    <span className={styles.scoreInfoIcon} aria-hidden="true">ⓘ</span>
                  </button>
                  {showScoreInfo && (
                    <div className={styles.scoreInfoPopover} role="dialog" aria-label="So berechnet sich der Score">
                      <div className={styles.scoreInfoHeader}>So berechnet sich der Score</div>
                      <p className={styles.scoreInfoDesc}>
                        Skala 0–100, basierend auf rechtlichem Risiko, finanzieller Tragweite, Marktüblichkeit und Verhandlungsbedarf.
                      </p>
                      <div className={styles.scoreInfoScale}>
                        <div className={styles.scoreScaleItem}><span className={styles.scoreScaleDot} style={{ background: '#059669' }} /><span className={styles.scoreScaleRange}>0–19</span><span className={styles.scoreScaleLabel}>Minimal — Unbedenklich</span></div>
                        <div className={styles.scoreScaleItem}><span className={styles.scoreScaleDot} style={{ background: '#16a34a' }} /><span className={styles.scoreScaleRange}>20–39</span><span className={styles.scoreScaleLabel}>Niedrig — Akzeptabel</span></div>
                        <div className={styles.scoreScaleItem}><span className={styles.scoreScaleDot} style={{ background: '#ca8a04' }} /><span className={styles.scoreScaleRange}>40–59</span><span className={styles.scoreScaleLabel}>Mittel — Verhandeln empfohlen</span></div>
                        <div className={styles.scoreScaleItem}><span className={styles.scoreScaleDot} style={{ background: '#ea580c' }} /><span className={styles.scoreScaleRange}>60–79</span><span className={styles.scoreScaleLabel}>Hoch — Aufmerksamkeit nötig</span></div>
                        <div className={styles.scoreScaleItem}><span className={styles.scoreScaleDot} style={{ background: '#dc2626' }} /><span className={styles.scoreScaleRange}>80–100</span><span className={styles.scoreScaleLabel}>Kritisch — Dringend prüfen</span></div>
                      </div>
                      <div className={styles.scoreInfoCurrent}>
                        Diese Klausel: <strong style={{ color: scoreInfo.color }}>{effectiveScore} — {scoreInfo.label}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Meta-Stats: Finanzielles + Zeitliches Risiko aus worstCase */}
            {(worstCase?.financialRisk || worstCase?.timeRisk) && (
              <div className={styles.glanceMeta}>
                {worstCase?.financialRisk && (
                  <span className={styles.glanceMetaItem}>💰 {worstCase.financialRisk}</span>
                )}
                {worstCase?.timeRisk && (
                  <span className={styles.glanceMetaItem}>⏰ {worstCase.timeRisk}</span>
                )}
              </div>
            )}
          </div>
        </div>
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

      {/* 🏛️ Phase 2: Was sagt das Gesetz? — Rechtsquellen-Sektion (conditional) */}
      {hasLegalSources && legalSources && (
        <div className={styles.legalSourceCard}>
          <div className={styles.legalSourceHeader}>
            <span className={styles.legalSourceLabel}>
              <span aria-hidden="true">🏛️</span> Was sagt das Gesetz?
            </span>
          </div>
          <div className={styles.legalSourceBody}>
            {legalSources.statutes?.map((statute, idx) => (
              <div key={`s-${idx}`} className={styles.legalSourceItem}>
                <div className={styles.legalSourceItemHead}>
                  <span className={styles.legalSourceIcon}>§</span>
                  <span className={styles.legalSourceTitle}>
                    {statute.section} {statute.code} — {statute.title}
                  </span>
                  {statute.sourceUrl && (
                    <a
                      href={statute.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.legalSourceLink}
                      title="Gesetzestext öffnen"
                    >
                      ↗ Lesen
                    </a>
                  )}
                </div>
                {statute.relevance_note && (
                  <div className={styles.legalSourceDesc}>{statute.relevance_note}</div>
                )}
              </div>
            ))}
            {legalSources.caselaw?.map((caselaw, idx) => (
              <div key={`c-${idx}`} className={styles.legalSourceItem}>
                <div className={styles.legalSourceItemHead}>
                  <span className={styles.legalSourceIcon}>⚖️</span>
                  <span className={styles.legalSourceTitle}>
                    {caselaw.court} {caselaw.caseNumber}
                    {caselaw.decisionDate && ` (${new Date(caselaw.decisionDate).getFullYear()})`}
                  </span>
                  {caselaw.sourceUrl && (
                    <a
                      href={caselaw.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.legalSourceLink}
                      title="Urteil öffnen"
                    >
                      ↗ Urteil lesen
                    </a>
                  )}
                </div>
                {caselaw.relevance_note && (
                  <div className={styles.legalSourceDesc}>{caselaw.relevance_note}</div>
                )}
                {caselaw.headnotes && caselaw.headnotes.length > 0 && (
                  <div className={styles.legalSourceQuote}>„{caselaw.headnotes[0]}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                    {worstCase.timeRisk || 'Nicht bezifferbar'}
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

      {/* 🎯 Worauf wir bei dieser Klausel achten — collapsable Trust-Layer */}
      {riskAssessment?.reasons && riskAssessment.reasons.length > 0 && (
        <div className={styles.analysisSection}>
          <div
            className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
            onClick={() => toggleSection('risks')}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎯</span>
              Worauf wir bei dieser Klausel achten
            </h4>
            <span className={styles.sectionToggle}>
              {expandedSections.has('risks') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('risks') && (
            <div className={styles.indicatorTags}>
              {riskAssessment.reasons.map((reason: string, idx: number) => {
                const tooltip = getIndicatorTooltip(reason);
                const displayText = reason.replace(/^[A-D]\d:\s*/, '');
                return (
                  <span
                    key={idx}
                    className={`${styles.indicatorTag}${tooltip ? ' ' + styles.indicatorTagInteractive : ''}`}
                    title={tooltip || undefined}
                  >
                    <span aria-hidden="true">⚠️</span>
                    <span>{displayText}</span>
                    {tooltip && (
                      <span className={styles.indicatorTooltip} role="tooltip">
                        {tooltip}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ✍️ Verhandlungs-Vorschlag — nur wenn nicht accept UND text vorhanden (Safety-Net zum Backend-Filter) */}
      {betterAlternative && betterAlternative.text && analysisActionLevel !== 'accept' && (
        <div className={styles.analysisSection}>
          <div
            className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
            onClick={() => toggleSection('proposal')}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>✍️</span>
              So sollte es heißen
            </h4>
            <span className={styles.sectionToggle}>
              {expandedSections.has('proposal') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('proposal') && (
          <div className={styles.proposalContent}>
            {/* Vorgeschlagene Formulierung */}
            <div className={styles.suggestionBox}>
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

      {/* 💡 Weitere Alternativen (generiert) — collapsable, default CLOSED */}
      <div className={styles.analysisSection}>
        <div
          className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
          onClick={() => toggleSection('moreAlternatives')}
        >
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💡</span>
            Weitere Formulierungs-Alternativen
            {alternatives.length > 0 && (
              <span className={styles.sectionCountBadge}>{alternatives.length}</span>
            )}
          </h4>
          <span className={styles.sectionToggle}>
            {expandedSections.has('moreAlternatives') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.has('moreAlternatives') && (
          <>
            {alternatives.length === 0 && !isGeneratingAlternatives && (
              <button
                className={styles.actionButton}
                onClick={(e) => { e.stopPropagation(); onLoadAlternatives(); }}
                style={{ marginTop: '0.5rem' }}
              >
                Generieren
              </button>
            )}
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
                Klick auf "Generieren", um weitere alternative Formulierungen zu bekommen.
              </p>
            )}
          </>
        )}
      </div>

      {/* 🤝 Verhandlungstipps & E-Mail — collapsable, default CLOSED */}
      <div className={styles.analysisSection}>
        <div
          className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
          onClick={() => toggleSection('negotiationTips')}
        >
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🤝</span>
            Verhandlungstipps & E-Mail-Vorlage
            {negotiation?.tips?.length ? (
              <span className={styles.sectionCountBadge}>{negotiation.tips.length}</span>
            ) : null}
          </h4>
          <span className={styles.sectionToggle}>
            {expandedSections.has('negotiationTips') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.has('negotiationTips') && (
          <>
            {!negotiation && !isGeneratingNegotiation && (
              <button
                className={styles.actionButton}
                onClick={(e) => { e.stopPropagation(); onLoadNegotiation(); }}
                style={{ marginTop: '0.5rem' }}
              >
                Generieren
              </button>
            )}
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
                    <div className={styles.emailHint}>
                      ⚠️ Diese E-Mail-Vorlage ist ein Vorschlag. <strong>Bitte vor dem Versand anpassen</strong>.
                    </div>
                    <pre className={styles.emailTemplate}>{negotiation.emailTemplate}</pre>
                    <button className={styles.copyButton} onClick={copyEmailTemplate}>
                      {copiedTemplate ? '✓ Kopiert!' : '📋 E-Mail-Vorlage kopieren'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <p className={styles.explanationText}>
                Klick auf "Generieren", um Verhandlungstipps zu bekommen.
              </p>
            )}
          </>
        )}
      </div>

      {/* 💬 Chat — collapsable, default CLOSED */}
      <div className={styles.analysisSection}>
        <div
          className={`${styles.sectionHeader} ${styles.sectionHeaderClickable}`}
          onClick={() => toggleSection('chat')}
        >
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💬</span>
            Fragen zur Klausel
            {chatHistory.length > 0 && (
              <span className={styles.sectionCountBadge}>{chatHistory.length}</span>
            )}
          </h4>
          <span className={styles.sectionToggle}>
            {expandedSections.has('chat') ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.has('chat') && (
          <>
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
                        <span className={styles.typingText}>Antwort wird erstellt...</span>
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
                placeholder="Stelle eine Frage zu dieser Klausel..."
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
          </>
        )}
      </div>

      {/* 🎯 Panel-Footer mit Quick-Actions: Chat öffnen + Simulator */}
      <div className={styles.panelFooter}>
        <button
          className={styles.panelFooterBtn}
          onClick={() => toggleSection('chat')}
          title="Frage zur Klausel stellen"
        >
          <MessageSquare size={14} />
          <span>Frage stellen</span>
        </button>
        {originalClauseText && sourceContractId && (
          <button
            className={styles.panelFooterBtn}
            onClick={() => setShowSimulator(true)}
            title="Klausel-Simulator: Was wäre wenn...?"
          >
            <FlaskConical size={14} />
            <span>Simulator</span>
          </button>
        )}
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
          contractName={sourceContractName}
          industry={currentIndustry}
          suggestedAlternative={betterAlternative?.text}
          onClauseSaved={onClauseSaved}
        />
      )}
    </div>
  );
};

export default AnalysisPanel;

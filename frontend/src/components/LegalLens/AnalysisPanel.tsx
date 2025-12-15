// 📁 components/LegalLens/AnalysisPanel.tsx
// Komponente für das Analyse-Panel (rechte Seite) - KOMPLETT ÜBERARBEITET

import React, { useState, useRef, useEffect } from 'react';
import { GitCompare } from 'lucide-react';
import type {
  ClauseAnalysis,
  PerspectiveType,
  ClauseAlternative,
  NegotiationInfo,
  ChatMessage,
  ActionLevel
} from '../../types/legalLens';
import { PERSPECTIVES, ACTION_LABELS, PROBABILITY_LABELS } from '../../types/legalLens';
import ClauseCompareModal from './ClauseCompareModal';
import { ErrorInfo } from '../../hooks/useLegalLens';
import styles from '../../styles/LegalLens.module.css';

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
  onLoadAlternatives: () => void;
  onLoadNegotiation: () => void;
  onSendChatMessage: (message: string) => void;
  onRetry: () => void;
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
  onLoadAlternatives,
  onLoadNegotiation,
  onSendChatMessage,
  onRetry
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['action', 'explanation', 'worstCase']));
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareAlternativeText, setCompareAlternativeText] = useState('');
  const [compareWhyBetter, setCompareWhyBetter] = useState('');

  // Ref für Auto-Scroll im Chat
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll zum neuesten Chat-Eintrag
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory, isChatting]);

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

  const copyEmailTemplate = () => {
    if (negotiation?.emailTemplate) {
      navigator.clipboard.writeText(negotiation.emailTemplate);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
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
    const errorIcon = errorInfo?.type === 'network' ? '📶' :
                      errorInfo?.type === 'timeout' ? '⏱️' :
                      errorInfo?.type === 'server' ? '🖥️' : '⚠️';

    return (
      <div className={styles.analysisContent}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>{errorIcon}</span>
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
    return (
      <div className={styles.analysisContent}>
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🔍</span>
              Analyse läuft...
            </h4>
          </div>
          {streamingText ? (
            <div style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              color: '#374151',
              whiteSpace: 'pre-wrap'
            }}>
              {streamingText}
              <span className={styles.streamingCursor} />
            </div>
          ) : (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
              <span className={styles.loadingText}>
                Analysiere aus Perspektive: {getCurrentPerspectiveInfo().name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No Analysis Yet
  if (!analysis) {
    return null;
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

  return (
    <div className={styles.analysisContent}>
      {/* 🎯 ACTION BADGE - DAS WICHTIGSTE ZUERST */}
      <div
        className={styles.analysisSection}
        style={{
          background: actionInfo.bgColor,
          border: `2px solid ${actionInfo.color}`,
          borderRadius: '12px'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: actionReason ? '0.75rem' : 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>{actionInfo.emoji}</span>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: actionInfo.color
              }}>
                {actionInfo.text}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Handlungsempfehlung
              </span>
            </div>
          </div>
          {riskAssessment && (
            <div style={{
              textAlign: 'right',
              padding: '0.5rem 1rem',
              background: 'white',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: actionInfo.color }}>
                {riskAssessment.score}/100
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Risiko-Score</div>
            </div>
          )}
        </div>
        {actionReason && (
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#374151',
            fontWeight: 500
          }}>
            {actionReason}
          </p>
        )}
      </div>

      {/* 📖 Einfache Erklärung */}
      {perspectiveData?.explanation && (
        <div className={styles.analysisSection}>
          <div
            className={styles.sectionHeader}
            onClick={() => toggleSection('explanation')}
            style={{ cursor: 'pointer' }}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>{getCurrentPerspectiveInfo().icon}</span>
              Was bedeutet das?
            </h4>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {expandedSections.has('explanation') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('explanation') && (
            <>
              <p style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: '#1e293b',
                margin: '0 0 1rem 0',
                fontWeight: 500
              }}>
                {perspectiveData.explanation.simple || perspectiveData.explanation.summary}
              </p>

              {/* Was das für DICH bedeutet - HIGHLIGHT */}
              {perspectiveData.explanation.whatItMeansForYou && (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#3b82f6',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    💡 Was das für dich bedeutet
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: '#1e40af',
                    lineHeight: 1.6
                  }}>
                    {perspectiveData.explanation.whatItMeansForYou}
                  </p>
                </div>
              )}

              {perspectiveData.explanation.keyPoints?.length > 0 && (
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
      )}

      {/* ⚠️ Worst-Case Szenario - MIT KONKRETEN ZAHLEN */}
      {worstCase && (
        <div className={styles.analysisSection}>
          <div
            className={styles.sectionHeader}
            onClick={() => toggleSection('worstCase')}
            style={{ cursor: 'pointer' }}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>⚠️</span>
              Worst-Case Szenario
            </h4>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {expandedSections.has('worstCase') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('worstCase') && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <p style={{
                margin: 0,
                fontSize: '0.95rem',
                color: '#374151',
                lineHeight: 1.6
              }}>
                {worstCase.scenario}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem'
              }}>
                {/* Finanzielles Risiko */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.875rem'
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#dc2626',
                    marginBottom: '0.375rem',
                    textTransform: 'uppercase'
                  }}>
                    💰 Finanzielles Risiko
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#991b1b'
                  }}>
                    {worstCase.financialRisk || 'Nicht bezifferbar'}
                  </div>
                </div>

                {/* Zeitliches Risiko */}
                <div style={{
                  background: '#fefce8',
                  border: '1px solid #fde047',
                  borderRadius: '8px',
                  padding: '0.875rem'
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#ca8a04',
                    marginBottom: '0.375rem',
                    textTransform: 'uppercase'
                  }}>
                    ⏰ Zeitliche Bindung
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#854d0e'
                  }}>
                    {worstCase.timeRisk || 'Keine Angabe'}
                  </div>
                </div>
              </div>

              {worstCase.probability && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#64748b'
                }}>
                  <span>Wahrscheinlichkeit:</span>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: worstCase.probability === 'likely' ? '#fef2f2' :
                               worstCase.probability === 'possible' ? '#fffbeb' : '#f0fdf4',
                    color: worstCase.probability === 'likely' ? '#dc2626' :
                           worstCase.probability === 'possible' ? '#d97706' : '#16a34a'
                  }}>
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
            className={styles.sectionHeader}
            onClick={() => toggleSection('risks')}
            style={{ cursor: 'pointer' }}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📊</span>
              Risiko-Faktoren
            </h4>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {expandedSections.has('risks') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('risks') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {riskAssessment.reasons.map((reason: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}
                >
                  <span style={{ color: '#ef4444' }}>●</span>
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
            className={styles.sectionHeader}
            onClick={() => toggleSection('alternative')}
            style={{ cursor: 'pointer' }}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>💼</span>
              Bessere Alternative
            </h4>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {expandedSections.has('alternative') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('alternative') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Vorgeschlagene Formulierung */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#16a34a',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Vorgeschlagene Formulierung
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#166534',
                  fontStyle: 'italic',
                  lineHeight: 1.6
                }}>
                  "{betterAlternative.text}"
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => copyText(betterAlternative.text)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Kopieren
                  </button>
                  {originalClauseText && (
                    <button
                      onClick={() => {
                        setCompareAlternativeText(betterAlternative.text);
                        setCompareWhyBetter(betterAlternative.whyBetter || '');
                        setShowCompareModal(true);
                      }}
                      style={{
                        padding: '0.375rem 0.75rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                    >
                      <GitCompare size={12} />
                      Vergleichen
                    </button>
                  )}
                </div>
              </div>

              {betterAlternative.whyBetter && (
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: 1.6
                }}>
                  <strong>Warum besser:</strong> {betterAlternative.whyBetter}
                </p>
              )}

              {betterAlternative.howToAsk && (
                <div style={{
                  background: '#eff6ff',
                  borderRadius: '8px',
                  padding: '0.875rem'
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#3b82f6',
                    marginBottom: '0.375rem'
                  }}>
                    🗣️ So fragst du danach:
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#1e40af',
                    fontStyle: 'italic'
                  }}>
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
            className={styles.sectionHeader}
            onClick={() => toggleSection('market')}
            style={{ cursor: 'pointer' }}
          >
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📈</span>
              Marktvergleich
            </h4>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {expandedSections.has('market') ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.has('market') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <span style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: marketComparison.isStandard ? '#f0fdf4' : '#fef2f2',
                  color: marketComparison.isStandard ? '#16a34a' : '#dc2626'
                }}>
                  {marketComparison.isStandard ? '✓ Marktüblich' : '✗ Nicht marktüblich'}
                </span>
              </div>
              {marketComparison.marketRange && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                  <strong>Üblicher Standard:</strong> {marketComparison.marketRange}
                </p>
              )}
              {marketComparison.deviation && (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                  <strong>Abweichung:</strong> {marketComparison.deviation}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <p style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.9rem',
                  color: '#1e293b',
                  fontStyle: 'italic',
                  lineHeight: 1.6
                }}>
                  "{alt.text}"
                </p>
                {alt.benefits && alt.benefits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
                    {alt.benefits.map((benefit, bIdx) => (
                      <span
                        key={bIdx}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          borderRadius: '4px'
                        }}
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: alt.difficulty === 'easy' ? '#16a34a' : alt.difficulty === 'hard' ? '#dc2626' : '#d97706'
                  }} />
                  <span>
                    {alt.difficulty === 'easy' ? 'Einfach umzusetzen' :
                     alt.difficulty === 'hard' ? 'Schwierig umzusetzen' : 'Mittlerer Aufwand'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
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
        }}
      />
    </div>
  );
};

export default AnalysisPanel;

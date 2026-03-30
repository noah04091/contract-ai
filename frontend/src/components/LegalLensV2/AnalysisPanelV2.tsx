import { useState, useCallback, lazy, Suspense } from 'react';
import type { V2Analysis } from '../../types/legalLensV2';
import RiskBadge from './RiskBadge';
import styles from '../../styles/LegalLensV2.module.css';

const ClauseSimulator = lazy(() => import('./ClauseSimulator'));

interface AdHocClause {
  id: string;
  text: string;
  title: string | null;
  mode: string;
}

interface AnalysisPanelV2Props {
  // Pre-parsed clause mode (from batch)
  clause: { id: string; text: string; title: string | null; number?: string } | null;
  analysis: V2Analysis | null;
  // On-demand mode (from PDF/text click)
  adHocClause: AdHocClause | null;
  isAnalyzingOnDemand: boolean;
  streamingText: string;
  onDemandAnalysis: Record<string, unknown> | null;
  // Common
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  clauseIndex?: number;
  totalClauses?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export default function AnalysisPanelV2({
  clause,
  analysis,
  adHocClause,
  isAnalyzingOnDemand,
  streamingText,
  onDemandAnalysis,
  isOpen,
  onClose,
  contractId,
  clauseIndex,
  totalClauses,
  onNavigate
}: AnalysisPanelV2Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  }, []);

  if (!isOpen) {
    return <div className={`${styles.analysisPanel} ${styles.analysisPanel_closed}`} />;
  }

  // Determine what we're showing
  const isOnDemandMode = !!adHocClause;
  const activeClauseText = adHocClause?.text || clause?.text || '';
  const activeTitle = adHocClause
    ? (adHocClause.title || getModeLabel(adHocClause.mode))
    : (clause?.title || `Klausel ${clause?.number || clause?.id?.replace('clause_', '') || ''}`);

  // Auto-Expand for high-risk
  const isHighRisk = analysis?.riskLevel === 'high' || analysis?.actionLevel === 'reject';

  return (
    <div className={`${styles.analysisPanel} ${styles.analysisPanel_open}`}>
      {/* Close Button */}
      <button className={styles.analysisPanelClose} onClick={onClose} title="Schliessen">
        &times;
      </button>

      {/* Header */}
      <div className={styles.analysisPanelHeader}>
        <h3 className={styles.analysisPanelClauseTitle}>{activeTitle}</h3>
        {!isOnDemandMode && clauseIndex != null && totalClauses != null && (
          <div className={styles.analysisPanelNav}>
            <span className={styles.analysisPanelPosition}>
              Klausel {clauseIndex + 1} von {totalClauses}
            </span>
            {onNavigate && (
              <div className={styles.analysisPanelNavBtns}>
                <button
                  className={styles.analysisPanelNavBtn}
                  onClick={() => onNavigate('prev')}
                  disabled={clauseIndex <= 0}
                  title="Vorherige Klausel"
                >
                  {'\u2039'}
                </button>
                <button
                  className={styles.analysisPanelNavBtn}
                  onClick={() => onNavigate('next')}
                  disabled={clauseIndex >= totalClauses - 1}
                  title="Nächste Klausel"
                >
                  {'\u203A'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ON-DEMAND MODE: Streaming analysis from PDF/text click       */}
      {/* ============================================================ */}
      {isOnDemandMode && (
        <>
          {/* Show the selected text */}
          <div className={styles.analysisPanelSelectedText}>
            <p>{activeClauseText.length > 300 ? activeClauseText.substring(0, 300) + '...' : activeClauseText}</p>
          </div>

          {/* Streaming text display */}
          {isAnalyzingOnDemand && (
            <div className={styles.analysisPanelStreaming}>
              {streamingText ? (
                <div className={styles.streamingContent}>
                  <p>{streamingText}<span className={styles.streamingCursor}>|</span></p>
                </div>
              ) : (
                <div className={styles.analysisPanelPending}>
                  <div className={styles.analysisPanelSpinner} />
                  <p>KI analysiert diese Klausel...</p>
                </div>
              )}
            </div>
          )}

          {/* Completed on-demand analysis */}
          {!isAnalyzingOnDemand && onDemandAnalysis && (
            <div className={styles.analysisPanelOnDemandResult}>
              {renderV1Analysis(onDemandAnalysis)}
            </div>
          )}

          {/* Completed on-demand: just streaming text, no structured result */}
          {!isAnalyzingOnDemand && !onDemandAnalysis && streamingText && (
            <div className={styles.analysisPanelOnDemandResult}>
              <p>{streamingText}</p>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* BATCH MODE: Pre-cached V2 analysis from batch                */}
      {/* ============================================================ */}
      {!isOnDemandMode && clause && (
        <>
          {!analysis ? (
            <div className={styles.analysisPanelPending}>
              <div className={styles.analysisPanelSpinner} />
              <p>Analyse wird vorbereitet...</p>
            </div>
          ) : (
            <>
              {/* Level 1 — Always visible */}
              <div className={`${styles.analysisPanelAction} ${styles[`analysisPanelAction_${analysis.actionLevel}`]}`}>
                <RiskBadge actionLevel={analysis.actionLevel} size="large" />
                <p className={styles.analysisPanelActionHint}>
                  {analysis.actionLevel === 'reject'
                    ? 'Diese Klausel ist ein Dealbreaker — unbedingt ansprechen.'
                    : analysis.actionLevel === 'negotiate'
                    ? 'Du solltest diese Klausel vor der Unterschrift anpassen.'
                    : 'Diese Klausel ist fair und marktüblich.'}
                </p>
                <p className={styles.analysisPanelExplanation}>
                  {analysis.explanation}
                </p>
              </div>

              {/* Level 2 — Expandable Sections */}
              <div className={styles.analysisPanelSections}>
                {analysis.realWorldImpact && (
                  <Section
                    title="Auswirkungen für dich"
                    icon="&#x1F3AF;"
                    isExpanded={expandedSections.has('impact') || isHighRisk}
                    onToggle={() => toggleSection('impact')}
                  >
                    <div className={styles.analysisPanelImpact}>
                      <p className={styles.impactText}>{analysis.realWorldImpact}</p>
                      {analysis.exampleScenario && (
                        <div className={styles.impactScenario}>
                          <strong>Rechenbeispiel:</strong>
                          <p>{analysis.exampleScenario}</p>
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                <Section
                  title={`Risiko-Bewertung (${analysis.riskScore}/100)`}
                  icon="&#x1F4CA;"
                  isExpanded={expandedSections.has('risk') || isHighRisk}
                  onToggle={() => toggleSection('risk')}
                >
                  <ul className={styles.analysisPanelList}>
                    {analysis.riskReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </Section>

                <Section
                  title="Fairness & Marktvergleich"
                  icon="&#x2696;"
                  isExpanded={expandedSections.has('fairness')}
                  onToggle={() => toggleSection('fairness')}
                >
                  <div className={styles.analysisPanelFairness}>
                    <span className={analysis.isMarketStandard ? styles.fairnessStandard : styles.fairnessDeviation}>
                      {analysis.isMarketStandard ? '\u2713 Marktüblich' : '\u2717 Nicht marktüblich'}
                    </span>
                    <p>{analysis.fairnessVerdict}</p>
                  </div>
                </Section>

                <Section
                  title="Verhandlungstipp"
                  icon="&#x1F4A1;"
                  isExpanded={expandedSections.has('negotiation') || isHighRisk}
                  onToggle={() => toggleSection('negotiation')}
                >
                  <div className={styles.analysisPanelNegotiation}>
                    <p className={styles.negotiationTip}>{analysis.negotiationTip}</p>
                    {analysis.betterWording && (
                      <div className={styles.negotiationWording}>
                        <div className={styles.negotiationWordingHeader}>
                          <span>Bessere Formulierung</span>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyToClipboard(analysis.betterWording!, 'wording')}
                          >
                            {copiedField === 'wording' ? 'Kopiert!' : 'Kopieren'}
                          </button>
                        </div>
                        <blockquote className={styles.negotiationWordingText}>
                          {analysis.betterWording}
                        </blockquote>
                      </div>
                    )}
                    {analysis.howToAsk && (
                      <div className={styles.negotiationHowToAsk}>
                        <strong>So ansprechen:</strong>
                        <p>{analysis.howToAsk}</p>
                      </div>
                    )}
                  </div>
                </Section>
              </div>

              {/* Level 3 — Deep Dive & Simulate */}
              <div className={styles.analysisPanelDeepDive}>
                <button
                  className={styles.simulateBtn}
                  onClick={() => setShowSimulator(true)}
                  title="Was passiert, wenn du diese Klausel änderst?"
                >
                  Klausel simulieren
                </button>
                <button className={styles.deepDiveBtn} title="Volle 4-Perspektiven-Analyse laden">
                  Tiefe Analyse
                </button>
                <button className={styles.chatBtn} title="Frage zu dieser Klausel stellen">
                  Frage stellen
                </button>
              </div>

              {showSimulator && (
                <Suspense fallback={null}>
                  <ClauseSimulator
                    originalClause={clause.text}
                    contractId={contractId}
                    onClose={() => setShowSimulator(false)}
                  />
                </Suspense>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Helper: Mode label for ad-hoc selections
// ============================================================

function getModeLabel(mode: string): string {
  switch (mode) {
    case 'sentence': return 'Satz-Analyse';
    case 'paragraph': return 'Paragraph-Analyse';
    case 'custom': return 'Freie Auswahl';
    default: return 'Klausel-Analyse';
  }
}

// ============================================================
// Helper: Render V1 analysis response
// ============================================================

function renderV1Analysis(analysis: Record<string, unknown>) {
  // V1 analysis has structured fields like explanation, riskLevel, etc.
  const explanation = (analysis.explanation as string) || (analysis.text as string) || '';
  const riskLevel = (analysis.riskLevel as string) || '';
  const riskScore = (analysis.riskScore as number) || 0;
  const worstCase = (analysis.worstCase as string) || '';
  const recommendation = (analysis.recommendation as string) || '';
  const betterAlternative = (analysis.betterAlternative as string) || '';
  const negotiationTip = (analysis.negotiationTip as string) || '';

  return (
    <div className={styles.v1AnalysisResult}>
      {/* Risk Badge */}
      {riskLevel && (
        <div className={`${styles.v1RiskBadge} ${styles[`v1RiskBadge_${riskLevel}`]}`}>
          {riskLevel === 'high' ? 'Hohes Risiko' : riskLevel === 'medium' ? 'Mittleres Risiko' : 'Niedriges Risiko'}
          {riskScore > 0 && ` (${riskScore}/100)`}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className={styles.v1Section}>
          <h4>Analyse</h4>
          <p>{explanation}</p>
        </div>
      )}

      {/* Worst Case */}
      {worstCase && (
        <div className={styles.v1Section}>
          <h4>Worst Case</h4>
          <p>{worstCase}</p>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className={styles.v1Section}>
          <h4>Empfehlung</h4>
          <p>{recommendation}</p>
        </div>
      )}

      {/* Better Alternative */}
      {betterAlternative && (
        <div className={styles.v1Section}>
          <h4>Bessere Alternative</h4>
          <p>{betterAlternative}</p>
        </div>
      )}

      {/* Negotiation Tip */}
      {negotiationTip && (
        <div className={styles.v1Section}>
          <h4>Verhandlungstipp</h4>
          <p>{negotiationTip}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Accordion Section Sub-Component
// ============================================================

function Section({
  title,
  icon,
  isExpanded,
  onToggle,
  children
}: {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.analysisPanelSection} ${isExpanded ? styles.analysisPanelSection_expanded : ''}`}>
      <button
        className={styles.analysisPanelSectionHeader}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span dangerouslySetInnerHTML={{ __html: icon }} />
        <span className={styles.analysisPanelSectionTitle}>{title}</span>
        <span className={styles.analysisPanelSectionChevron}>
          {isExpanded ? '\u25BE' : '\u25B8'}
        </span>
      </button>
      {isExpanded && (
        <div className={styles.analysisPanelSectionContent}>
          {children}
        </div>
      )}
    </div>
  );
}

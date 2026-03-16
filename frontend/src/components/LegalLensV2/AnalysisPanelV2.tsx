import { useState, useCallback, lazy, Suspense } from 'react';
import type { AnalysisPanelProps } from '../../types/legalLensV2';
import RiskBadge from './RiskBadge';
import styles from '../../styles/LegalLensV2.module.css';

const ClauseSimulator = lazy(() => import('./ClauseSimulator'));

export default function AnalysisPanelV2({ clause, analysis, isOpen, onClose, contractId }: AnalysisPanelProps) {
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

  // Auto-Expand für High-Risk
  const isHighRisk = analysis?.riskLevel === 'high' || analysis?.actionLevel === 'reject';

  if (!isOpen || !clause) {
    return <div className={`${styles.analysisPanel} ${styles.analysisPanel_closed}`} />;
  }

  return (
    <div className={`${styles.analysisPanel} ${styles.analysisPanel_open}`}>
      {/* Close Button */}
      <button className={styles.analysisPanelClose} onClick={onClose} title="Schliessen">
        &times;
      </button>

      {!analysis ? (
        <div className={styles.analysisPanelPending}>
          <div className={styles.analysisPanelSpinner} />
          <p>Analyse wird vorbereitet...</p>
        </div>
      ) : (
        <>
          {/* Level 1 — Immer sichtbar */}
          <div className={`${styles.analysisPanelAction} ${styles[`analysisPanelAction_${analysis.actionLevel}`]}`}>
            <RiskBadge actionLevel={analysis.actionLevel} size="large" />
            <p className={styles.analysisPanelExplanation}>
              {analysis.explanation}
            </p>
          </div>

          {/* Level 2 — Aufklappbare Sections */}
          <div className={styles.analysisPanelSections}>

            {/* Was bedeutet das für DICH? */}
            {analysis.realWorldImpact && (
              <Section
                id="impact"
                title="Auswirkungen f\u00fcr dich"
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

            {/* Risiko-Bewertung */}
            <Section
              id="risk"
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

            {/* Fairness & Marktvergleich */}
            <Section
              id="fairness"
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

            {/* Verhandlungstipp */}
            <Section
              id="negotiation"
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

          {/* Level 3 — Deep Dive, Simulate & Chat */}
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

          {/* Clause Simulator Modal */}
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
    </div>
  );
}

// ============================================================
// Accordion Section Sub-Component
// ============================================================

function Section({
  id: _id,
  title,
  icon,
  isExpanded,
  onToggle,
  children
}: {
  id: string;
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

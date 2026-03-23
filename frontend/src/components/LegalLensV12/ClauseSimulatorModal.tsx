// 📁 components/LegalLensV12/ClauseSimulatorModal.tsx
// Klausel-Simulator: Bearbeite eine Klausel und sieh sofort die Risiko-Änderung

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowRight, TrendingDown, TrendingUp, Minus, RotateCcw, Check, AlertTriangle, Copy } from 'lucide-react';
import { simulateClause } from '../../services/legalLensV2API';
import type { ClauseSimulation } from '../../types/legalLensV2';
import styles from '../../styles/LegalLensV12.module.css';

interface ClauseSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  contractId: string;
  industry?: string;
}

const RECOMMENDATION_LABELS: Record<string, { text: string; emoji: string; color: string; bg: string }> = {
  accept_change: { text: 'Änderung übernehmen', emoji: '✅', color: '#16a34a', bg: '#f0fdf4' },
  consider_change: { text: 'Änderung prüfen', emoji: '🤔', color: '#d97706', bg: '#fffbeb' },
  keep_original: { text: 'Original beibehalten', emoji: '⚠️', color: '#dc2626', bg: '#fef2f2' },
};

const ClauseSimulatorModal: React.FC<ClauseSimulatorModalProps> = ({
  isOpen,
  onClose,
  originalText,
  contractId,
  industry = 'general'
}) => {
  const [modifiedText, setModifiedText] = useState(originalText);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulation, setSimulation] = useState<ClauseSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevOriginalRef = useRef(originalText);

  // Only reset when the CLAUSE changes (different originalText), not on re-open
  useEffect(() => {
    if (isOpen && originalText !== prevOriginalRef.current) {
      setModifiedText(originalText);
      setSimulation(null);
      setError(null);
      setCopied(false);
      prevOriginalRef.current = originalText;
    }
  }, [isOpen, originalText]);

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  // Auto-focus textarea & auto-size on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        autoResize();
      }, 100);
    }
  }, [isOpen, autoResize]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSimulate = async () => {
    if (!modifiedText.trim() || modifiedText.trim() === originalText.trim()) {
      setError('Bitte ändere den Text, bevor du simulierst.');
      return;
    }

    setIsSimulating(true);
    setError(null);
    setSimulation(null);

    try {
      const result = await simulateClause(contractId, originalText, modifiedText, industry);
      setSimulation(result.simulation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation fehlgeschlagen');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setModifiedText(originalText);
    setSimulation(null);
    setError(null);
    setTimeout(autoResize, 0);
  };

  const handleCopyModified = () => {
    navigator.clipboard.writeText(modifiedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const hasChanges = modifiedText.trim() !== originalText.trim();
  const scoreDelta = simulation ? simulation.modifiedRiskScore - simulation.originalRiskScore : 0;

  return (
    <div className={styles.simulatorOverlay} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={styles.simulatorModal}>
        {/* Header */}
        <div className={styles.simulatorHeader}>
          <div className={styles.simulatorHeaderLeft}>
            <span className={styles.simulatorIcon}>🧪</span>
            <div>
              <h3 className={styles.simulatorTitle}>Klausel-Simulator</h3>
              <p className={styles.simulatorSubtitle}>
                Bearbeite die Klausel und sieh sofort, wie sich das Risiko ändert
              </p>
            </div>
          </div>
          <button className={styles.simulatorCloseBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Editor Area */}
        <div className={styles.simulatorBody}>
          <div className={styles.simulatorColumns}>
            {/* Original */}
            <div className={styles.simulatorColumn}>
              <div className={styles.simulatorColumnHeader}>
                <span className={styles.simulatorColumnLabel}>Original</span>
                {simulation && (
                  <span className={styles.simulatorScore} style={{ '--score-color': getScoreColor(simulation.originalRiskScore) } as React.CSSProperties}>
                    {simulation.originalRiskScore}/100
                  </span>
                )}
              </div>
              <div className={styles.simulatorOriginalText}>
                {originalText}
              </div>
            </div>

            {/* Arrow */}
            <div className={styles.simulatorArrow}>
              <ArrowRight size={20} />
            </div>

            {/* Modified */}
            <div className={styles.simulatorColumn}>
              <div className={styles.simulatorColumnHeader}>
                <span className={styles.simulatorColumnLabel}>Deine Version</span>
                {simulation && (
                  <span className={styles.simulatorScore} style={{ '--score-color': getScoreColor(simulation.modifiedRiskScore) } as React.CSSProperties}>
                    {simulation.modifiedRiskScore}/100
                  </span>
                )}
              </div>
              <textarea
                ref={textareaRef}
                className={styles.simulatorTextarea}
                value={modifiedText}
                onChange={(e) => {
                  setModifiedText(e.target.value);
                  if (simulation) setSimulation(null);
                  // Auto-resize on input
                  setTimeout(autoResize, 0);
                }}
                placeholder="Bearbeite die Klausel hier..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.simulatorActions}>
            <button
              className={styles.simulatorResetBtn}
              onClick={handleReset}
              disabled={!hasChanges && !simulation}
            >
              <RotateCcw size={14} />
              Zurücksetzen
            </button>
            <button
              className={styles.simulatorRunBtn}
              onClick={handleSimulate}
              disabled={isSimulating || !hasChanges}
            >
              {isSimulating ? (
                <>
                  <div className={styles.simulatorSpinner} />
                  Analysiere...
                </>
              ) : (
                <>
                  🧪 Simulation starten
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.simulatorError}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Results */}
          {simulation && (
            <div className={styles.simulatorResults}>
              {/* Risk Delta Banner */}
              <div className={`${styles.simulatorDelta} ${
                simulation.riskChange === 'reduced' ? styles.simulatorDeltaGood :
                simulation.riskChange === 'increased' ? styles.simulatorDeltaBad :
                styles.simulatorDeltaNeutral
              }`}>
                <div className={styles.simulatorDeltaIcon}>
                  {simulation.riskChange === 'reduced' ? <TrendingDown size={24} /> :
                   simulation.riskChange === 'increased' ? <TrendingUp size={24} /> :
                   <Minus size={24} />}
                </div>
                <div className={styles.simulatorDeltaInfo}>
                  <span className={styles.simulatorDeltaValue}>
                    {scoreDelta > 0 ? '+' : ''}{scoreDelta} Punkte
                  </span>
                  <span className={styles.simulatorDeltaLabel}>
                    {simulation.riskChange === 'reduced' ? 'Risiko reduziert' :
                     simulation.riskChange === 'increased' ? 'Risiko erhöht' :
                     'Risiko unverändert'}
                  </span>
                </div>
                <div className={styles.simulatorScoreCompare}>
                  <span>{simulation.originalRiskScore}</span>
                  <ArrowRight size={14} />
                  <span>{simulation.modifiedRiskScore}</span>
                </div>
              </div>

              {/* Summary */}
              <div className={styles.simulatorResultSection}>
                <p className={styles.simulatorResultText}>{simulation.summary}</p>
              </div>

              {/* For You / Counterparty */}
              <div className={styles.simulatorResultGrid}>
                <div className={styles.simulatorResultCard}>
                  <span className={styles.simulatorResultCardLabel}>👤 Für dich</span>
                  <p>{simulation.forYou}</p>
                </div>
                <div className={styles.simulatorResultCard}>
                  <span className={styles.simulatorResultCardLabel}>🤝 Für die Gegenseite</span>
                  <p>{simulation.forCounterparty}</p>
                </div>
              </div>

              {/* Market Assessment */}
              {simulation.marketAssessment && (
                <div className={styles.simulatorMarket}>
                  <span>📊</span>
                  <p>{simulation.marketAssessment}</p>
                </div>
              )}

              {/* Recommendation */}
              {simulation.recommendation && (() => {
                const rec = RECOMMENDATION_LABELS[simulation.recommendation] || RECOMMENDATION_LABELS.consider_change;
                return (
                  <div className={styles.simulatorRecommendation} style={{ '--rec-bg': rec.bg, '--rec-color': rec.color } as React.CSSProperties}>
                    <span className={styles.simulatorRecIcon}>{rec.emoji}</span>
                    <div>
                      <strong>{rec.text}</strong>
                      {simulation.recommendationReason && (
                        <p className={styles.simulatorRecReason}>{simulation.recommendationReason}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Copy modified text button */}
              {simulation.recommendation !== 'keep_original' && (
                <button className={styles.simulatorCopyBtn} onClick={handleCopyModified}>
                  {copied ? <><Check size={14} /> Kopiert!</> : <><Copy size={14} /> Geänderte Klausel kopieren</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getScoreColor(score: number): string {
  if (score >= 70) return '#dc2626';
  if (score >= 40) return '#d97706';
  return '#16a34a';
}

export default ClauseSimulatorModal;

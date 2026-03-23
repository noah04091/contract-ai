// 📁 components/LegalLensV12/ClauseSimulatorModal.tsx
// Klausel-Simulator: Bearbeite eine Klausel und sieh sofort die Risiko-Änderung

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ArrowRight, TrendingDown, TrendingUp, Minus, RotateCcw, Check, AlertTriangle, Copy, Loader2, BookmarkPlus } from 'lucide-react';
import { simulateClause, rewriteClause } from '../../services/legalLensV2API';
import type { ClauseSimulation } from '../../types/legalLensV2';
import SaveClauseModal from './SaveClauseModal';
import styles from '../../styles/LegalLensV12.module.css';

interface ClauseSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  contractId: string;
  contractName?: string;
  industry?: string;
  suggestedAlternative?: string;
  onClauseSaved?: (clauseId: string) => void;
}

const RECOMMENDATION_LABELS: Record<string, { text: string; emoji: string; color: string; bg: string }> = {
  accept_change: { text: 'Änderung übernehmen', emoji: '✅', color: '#16a34a', bg: '#f0fdf4' },
  consider_change: { text: 'Änderung prüfen', emoji: '🤔', color: '#d97706', bg: '#fffbeb' },
  keep_original: { text: 'Original beibehalten', emoji: '⚠️', color: '#dc2626', bg: '#fef2f2' },
};

interface QuickAction {
  label: string;
  icon: string;
  instruction: string;
}

// Word-level diff algorithm
function computeWordDiff(original: string, modified: string): Array<{ type: 'same' | 'added' | 'removed'; text: string }> {
  const origWords = original.split(/(\s+)/);
  const modWords = modified.split(/(\s+)/);

  // LCS-based diff
  const m = origWords.length;
  const n = modWords.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === modWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const result: Array<{ type: 'same' | 'added' | 'removed'; text: string }> = [];
  let i = m, j = n;
  const ops: Array<{ type: 'same' | 'added' | 'removed'; text: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === modWords[j - 1]) {
      ops.push({ type: 'same', text: origWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', text: modWords[j - 1] });
      j--;
    } else {
      ops.push({ type: 'removed', text: origWords[i - 1] });
      i--;
    }
  }

  ops.reverse();

  // Merge consecutive same-type segments
  for (const op of ops) {
    if (result.length > 0 && result[result.length - 1].type === op.type) {
      result[result.length - 1].text += op.text;
    } else {
      result.push({ ...op });
    }
  }

  return result;
}

const ClauseSimulatorModal: React.FC<ClauseSimulatorModalProps> = ({
  isOpen,
  onClose,
  originalText,
  contractId,
  contractName,
  industry = 'general',
  suggestedAlternative,
  onClauseSaved
}) => {
  const [modifiedText, setModifiedText] = useState(originalText);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [simulation, setSimulation] = useState<ClauseSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSaveOriginal, setShowSaveOriginal] = useState(false);
  const [showSaveModified, setShowSaveModified] = useState(false);
  const [rewriteCache, setRewriteCache] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevOriginalRef = useRef(originalText);

  // Only reset when the CLAUSE changes (different originalText), not on re-open
  useEffect(() => {
    if (isOpen && originalText !== prevOriginalRef.current) {
      setModifiedText(originalText);
      setSimulation(null);
      setError(null);
      setCopied(false);
      setRewriteCache({});
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

  // Quick actions
  const quickActions: QuickAction[] = useMemo(() => {
    const actions: QuickAction[] = [];
    if (suggestedAlternative) {
      actions.push({
        label: 'KI-Vorschlag',
        icon: '💡',
        instruction: `Verbessere diese Klausel zugunsten des Unterzeichners. Orientiere dich an folgendem Verbesserungsvorschlag, aber formuliere die GESAMTE Klausel vollständig um (nicht nur den kritischen Teil):\n\nVerbesserungsvorschlag: "${suggestedAlternative}"`
      });
    }
    actions.push(
      { label: 'Kürzer formulieren', icon: '✂️', instruction: 'Formuliere die Klausel kürzer und prägnanter, ohne den rechtlichen Inhalt zu ändern.' },
      { label: 'Haftung begrenzen', icon: '🛡️', instruction: 'Ergänze eine angemessene Haftungsbegrenzung oder verschärfe eine bestehende zugunsten des Unterzeichners.' },
      { label: 'Kündigungsrecht', icon: '🚪', instruction: 'Ergänze ein ordentliches Kündigungsrecht mit angemessener Frist oder verbessere ein bestehendes.' },
      { label: 'Einfacher formulieren', icon: '📝', instruction: 'Formuliere die Klausel in einfacherer, verständlicherer Sprache, behalte aber die rechtliche Wirkung bei.' }
    );
    return actions;
  }, [suggestedAlternative]);

  const handleQuickAction = async (action: QuickAction) => {
    // Check cache first — instant if already generated
    const cacheKey = action.instruction;
    if (rewriteCache[cacheKey]) {
      setModifiedText(rewriteCache[cacheKey]);
      setSimulation(null);
      setError(null);
      setTimeout(autoResize, 0);
      return;
    }

    // API call
    setIsRewriting(true);
    setError(null);

    try {
      const result = await rewriteClause(contractId, originalText, action.instruction, industry);
      setRewriteCache(prev => ({ ...prev, [cacheKey]: result.rewrittenClause }));
      setModifiedText(result.rewrittenClause);
      setSimulation(null);
      setTimeout(autoResize, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Umformulierung fehlgeschlagen');
    } finally {
      setIsRewriting(false);
    }
  };

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

  // Compute diff for display
  const diffResult = useMemo(() => {
    if (!simulation || modifiedText.trim() === originalText.trim()) return null;
    return computeWordDiff(originalText, modifiedText);
  }, [simulation, originalText, modifiedText]);

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

        {/* Quick Actions */}
        <div className={styles.simulatorQuickActions}>
          <span className={styles.simulatorQuickLabel}>Schnell-Aktionen:</span>
          <div className={styles.simulatorQuickChips}>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                className={styles.simulatorQuickChip}
                onClick={() => handleQuickAction(action)}
                disabled={isRewriting || isSimulating}
              >
                <span>{action.icon}</span>
                {action.label}
                {rewriteCache[action.instruction] && (
                  <Check size={10} className={styles.simulatorChipCached} />
                )}
              </button>
            ))}
          </div>
          {isRewriting && (
            <div className={styles.simulatorRewritingHint}>
              <Loader2 size={14} className={styles.spinIcon} />
              KI formuliert um...
            </div>
          )}
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
                  setTimeout(autoResize, 0);
                }}
                placeholder="Bearbeite die Klausel hier..."
              />
            </div>
          </div>

          {/* Diff View — shown after simulation */}
          {diffResult && simulation && (
            <div className={styles.simulatorDiffSection}>
              <div className={styles.simulatorDiffHeader}>Änderungen im Detail</div>
              <div className={styles.simulatorDiffContent}>
                {diffResult.map((segment, idx) => (
                  <span
                    key={idx}
                    className={
                      segment.type === 'added' ? styles.diffAdded :
                      segment.type === 'removed' ? styles.diffRemoved :
                      undefined
                    }
                  >
                    {segment.text}
                  </span>
                ))}
              </div>
            </div>
          )}

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

              {/* Action buttons row */}
              <div className={styles.simulatorActionRow}>
                {simulation.recommendation !== 'keep_original' && (
                  <button className={styles.simulatorCopyBtn} onClick={handleCopyModified}>
                    {copied ? <><Check size={14} /> Kopiert!</> : <><Copy size={14} /> Kopieren</>}
                  </button>
                )}
                <button className={styles.simulatorSaveBtn} onClick={() => setShowSaveModified(true)}>
                  <BookmarkPlus size={14} />
                  Neue Klausel speichern
                </button>
                <button className={styles.simulatorSaveOriginalBtn} onClick={() => setShowSaveOriginal(true)}>
                  <BookmarkPlus size={14} />
                  Original speichern
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Modified Clause Modal */}
      {showSaveModified && (
        <SaveClauseModal
          clauseText={modifiedText}
          sourceContractId={contractId}
          sourceContractName={contractName}
          originalAnalysis={simulation ? {
            riskScore: simulation.modifiedRiskScore,
            riskLevel: simulation.modifiedRiskScore >= 70 ? 'high' : simulation.modifiedRiskScore >= 40 ? 'medium' : 'low',
            actionLevel: simulation.recommendation === 'accept_change' ? 'accept' : simulation.recommendation === 'keep_original' ? 'reject' : 'negotiate'
          } : undefined}
          onClose={() => setShowSaveModified(false)}
          onSaved={(clauseId) => {
            onClauseSaved?.(clauseId);
            setShowSaveModified(false);
          }}
        />
      )}

      {/* Save Original Clause Modal */}
      {showSaveOriginal && (
        <SaveClauseModal
          clauseText={originalText}
          sourceContractId={contractId}
          sourceContractName={contractName}
          originalAnalysis={simulation ? {
            riskScore: simulation.originalRiskScore,
            riskLevel: simulation.originalRiskScore >= 70 ? 'high' : simulation.originalRiskScore >= 40 ? 'medium' : 'low'
          } : undefined}
          onClose={() => setShowSaveOriginal(false)}
          onSaved={(clauseId) => {
            onClauseSaved?.(clauseId);
            setShowSaveOriginal(false);
          }}
        />
      )}
    </div>
  );
};

function getScoreColor(score: number): string {
  if (score >= 70) return '#dc2626';
  if (score >= 40) return '#d97706';
  return '#16a34a';
}

export default ClauseSimulatorModal;

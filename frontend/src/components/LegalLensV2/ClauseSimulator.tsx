import { useState, useCallback } from 'react';
import type { ClauseSimulation } from '../../types/legalLensV2';
import * as api from '../../services/legalLensV2API';
import styles from '../../styles/LegalLensV2.module.css';

interface ClauseSimulatorProps {
  originalClause: string;
  contractId: string;
  onClose: () => void;
}

const RECOMMENDATION_LABELS: Record<string, { label: string; className: string }> = {
  accept_change: { label: 'Änderung empfohlen', className: 'simRecAccept' },
  consider_change: { label: 'Änderung prüfen', className: 'simRecConsider' },
  keep_original: { label: 'Original beibehalten', className: 'simRecKeep' }
};

export default function ClauseSimulator({ originalClause, contractId, onClose }: ClauseSimulatorProps) {
  const [modifiedClause, setModifiedClause] = useState(originalClause);
  const [simulation, setSimulation] = useState<ClauseSimulation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async () => {
    if (!modifiedClause.trim() || modifiedClause === originalClause) return;

    setIsSimulating(true);
    setError(null);

    try {
      const result = await api.simulateClause(contractId, originalClause, modifiedClause);
      setSimulation(result.simulation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation fehlgeschlagen');
    } finally {
      setIsSimulating(false);
    }
  }, [contractId, originalClause, modifiedClause]);

  const scoreDiff = simulation ? simulation.originalRiskScore - simulation.modifiedRiskScore : 0;
  const rec = simulation ? RECOMMENDATION_LABELS[simulation.recommendation] || RECOMMENDATION_LABELS.consider_change : null;

  return (
    <div className={styles.simOverlay} onClick={onClose}>
      <div className={styles.simModal} onClick={e => e.stopPropagation()}>
        <button className={styles.simClose} onClick={onClose}>&times;</button>
        <h2 className={styles.simTitle}>Klausel simulieren</h2>
        <p className={styles.simSubtitle}>
          Ändere die Klausel und sieh sofort, wie sich das Risiko verändert.
        </p>

        {/* Original (readonly) */}
        <div className={styles.simSection}>
          <label className={styles.simLabel}>Original</label>
          <div className={styles.simOriginalText}>{originalClause}</div>
        </div>

        {/* Editable */}
        <div className={styles.simSection}>
          <label className={styles.simLabel}>Deine Version</label>
          <textarea
            className={styles.simTextarea}
            value={modifiedClause}
            onChange={e => setModifiedClause(e.target.value)}
            rows={5}
            placeholder="Schreibe hier deine alternative Klausel..."
          />
        </div>

        {/* Simulate Button */}
        <button
          className={styles.simRunBtn}
          onClick={runSimulation}
          disabled={isSimulating || modifiedClause === originalClause || !modifiedClause.trim()}
        >
          {isSimulating ? 'Simuliere...' : 'Simulation starten'}
        </button>

        {error && <p className={styles.simError}>{error}</p>}

        {/* Results */}
        {simulation && (
          <div className={styles.simResults}>
            {/* Risk Comparison */}
            <div className={styles.simRiskCompare}>
              <div className={styles.simRiskBox}>
                <span className={styles.simRiskLabel}>Vorher</span>
                <span className={`${styles.simRiskScore} ${styles[`simRisk_${getRiskClass(simulation.originalRiskScore)}`]}`}>
                  {simulation.originalRiskScore}
                </span>
              </div>
              <div className={styles.simRiskArrow}>
                {simulation.riskChange === 'reduced' && <span className={styles.simArrowDown}>&darr;</span>}
                {simulation.riskChange === 'increased' && <span className={styles.simArrowUp}>&uarr;</span>}
                {simulation.riskChange === 'unchanged' && <span className={styles.simArrowEqual}>=</span>}
                <span className={styles.simRiskDiff}>
                  {scoreDiff > 0 ? `-${scoreDiff}` : scoreDiff < 0 ? `+${Math.abs(scoreDiff)}` : '0'}
                </span>
              </div>
              <div className={styles.simRiskBox}>
                <span className={styles.simRiskLabel}>Nachher</span>
                <span className={`${styles.simRiskScore} ${styles[`simRisk_${getRiskClass(simulation.modifiedRiskScore)}`]}`}>
                  {simulation.modifiedRiskScore}
                </span>
              </div>
            </div>

            {/* Summary */}
            <p className={styles.simSummary}>{simulation.summary}</p>

            {/* Details */}
            <div className={styles.simDetails}>
              <div className={styles.simDetailItem}>
                <strong>Für dich:</strong>
                <p>{simulation.forYou}</p>
              </div>
              <div className={styles.simDetailItem}>
                <strong>Für die Gegenseite:</strong>
                <p>{simulation.forCounterparty}</p>
              </div>
              <div className={styles.simDetailItem}>
                <strong>Markteinordnung:</strong>
                <p>{simulation.marketAssessment}</p>
              </div>
            </div>

            {/* Recommendation */}
            {rec && (
              <div className={`${styles.simRecommendation} ${styles[rec.className]}`}>
                <span className={styles.simRecLabel}>{rec.label}</span>
                <span className={styles.simRecReason}>{simulation.recommendationReason}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getRiskClass(score: number): string {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

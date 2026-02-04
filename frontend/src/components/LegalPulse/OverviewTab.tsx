import { Activity, Zap, ArrowRight, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { Contract } from '../../types/legalPulse';
import styles from '../../pages/LegalPulse.module.css';

interface OverviewTabProps {
  selectedContract: Contract;
  onNavigate: NavigateFunction;
  onSetActiveTab: (tab: 'overview' | 'risks' | 'recommendations' | 'legalChanges' | 'history' | 'forecast') => void;
}

export default function OverviewTab({ selectedContract, onNavigate, onSetActiveTab }: OverviewTabProps) {
  if (!selectedContract.legalPulse) {
    return (
      <div className={styles.overviewTab}>
        <div className={styles.noAnalysisState}>
          <div className={styles.noAnalysisIcon}>
            <Activity size={32} />
          </div>
          <h3>Legal Pulse Analyse ausstehend</h3>
          <p>Dieser Vertrag wurde noch nicht durch Legal Pulse analysiert. Die Analyse startet automatisch, sobald Sie den Vertrag analysieren lassen.</p>
          <div className={styles.noAnalysisSteps}>
            <div className={styles.noAnalysisStep}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <strong>Vertrag analysieren</strong>
                <p>Lassen Sie den Vertrag von unserer KI analysieren</p>
              </div>
            </div>
            <div className={styles.noAnalysisStep}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <strong>Legal Pulse startet automatisch</strong>
                <p>Risikoanalyse, Empfehlungen und Monitoring werden erstellt</p>
              </div>
            </div>
            <div className={styles.noAnalysisStep}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <strong>Laufende Überwachung</strong>
                <p>Wöchentliche Prüfung auf relevante Rechtsänderungen</p>
              </div>
            </div>
          </div>
          <button
            className={styles.noAnalysisCta}
            onClick={() => onNavigate(`/contracts`)}
          >
            <Zap size={16} />
            Zur Vertragsanalyse
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overviewTab}>
      <div className={styles.overviewGrid}>
        {/* Risk Distribution */}
        {selectedContract.legalPulse?.topRisks && selectedContract.legalPulse.topRisks.length > 0 && (() => {
          const risks = selectedContract.legalPulse!.topRisks!;
          const resolvedCount = risks.filter(r => r.status === 'resolved' || r.status === 'accepted').length;
          const total = risks.length;
          return (
            <div className={styles.overviewRiskDistribution}>
              <h4>Risikoverteilung</h4>
              {resolvedCount > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '8px', fontSize: '0.82rem', color: '#10b981', fontWeight: 500
                }}>
                  <CheckCircle size={14} />
                  {resolvedCount}/{total} Risiken behoben
                </div>
              )}
              <div className={styles.riskDistributionBar}>
                {['critical', 'high', 'medium', 'low'].map(sev => {
                  const count = risks.filter((r) => (r.userEdits?.severity || r.severity) === sev && r.status !== 'resolved' && r.status !== 'accepted').length;
                  if (count === 0) return null;
                  const colors: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' };
                  const labels: Record<string, string> = { critical: 'Kritisch', high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };
                  const openTotal = total - resolvedCount;
                  return (
                    <div
                      key={sev}
                      className={styles.riskDistSegment}
                      style={{ width: openTotal > 0 ? `${(count / openTotal) * 100}%` : '0%', background: colors[sev] }}
                      title={`${labels[sev]}: ${count} (offen)`}
                    >
                      {count}
                    </div>
                  );
                })}
                {resolvedCount > 0 && (
                  <div
                    className={styles.riskDistSegment}
                    style={{
                      width: `${(resolvedCount / total) * 100}%`,
                      background: '#9ca3af',
                      fontSize: '0.7rem'
                    }}
                    title={`Behoben: ${resolvedCount}`}
                  >
                    {resolvedCount}
                  </div>
                )}
              </div>
              <div className={styles.riskDistLegend}>
                {['critical', 'high', 'medium', 'low'].map(sev => {
                  const count = risks.filter((r) => (r.userEdits?.severity || r.severity) === sev && r.status !== 'resolved' && r.status !== 'accepted').length;
                  if (count === 0) return null;
                  const colors: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a' };
                  const labels: Record<string, string> = { critical: 'Kritisch', high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };
                  return (
                    <span key={sev} className={styles.riskDistLegendItem}>
                      <span className={styles.riskDistDot} style={{ background: colors[sev] }} />
                      {count}x {labels[sev]}
                    </span>
                  );
                })}
                {resolvedCount > 0 && (
                  <span className={styles.riskDistLegendItem}>
                    <span className={styles.riskDistDot} style={{ background: '#9ca3af' }} />
                    {resolvedCount}x Behoben
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Top Risks Preview */}
        <div className={styles.overviewPreviewSection}>
          <div className={styles.overviewPreviewHeader}>
            <h4>Top-Risiken</h4>
            <button className={styles.overviewPreviewLink} onClick={() => onSetActiveTab('risks')}>
              Alle anzeigen <ArrowRight size={14} />
            </button>
          </div>
          {selectedContract.legalPulse?.topRisks?.slice(0, 3).map((risk, i) => {
            const isResolved = risk.status === 'resolved' || risk.status === 'accepted';
            const effectiveSeverity = risk.userEdits?.severity || risk.severity;
            return (
              <div key={i} className={styles.overviewPreviewItem} onClick={() => onSetActiveTab('risks')} style={{ cursor: 'pointer', opacity: isResolved ? 0.6 : 1 }}>
                <span className={styles.overviewPreviewBadge} style={{
                  background: isResolved ? '#9ca3af' : effectiveSeverity === 'critical' ? '#dc2626' : effectiveSeverity === 'high' ? '#ea580c' : effectiveSeverity === 'medium' ? '#d97706' : '#16a34a'
                }}>
                  {isResolved ? 'Behoben' : effectiveSeverity === 'critical' ? 'Kritisch' : effectiveSeverity === 'high' ? 'Hoch' : effectiveSeverity === 'medium' ? 'Mittel' : 'Niedrig'}
                </span>
                <div className={styles.overviewPreviewText}>
                  <strong style={{ textDecoration: isResolved ? 'line-through' : 'none' }}>{risk.userEdits?.title || risk.title}</strong>
                  {risk.description && <span>{risk.description.length > 80 ? risk.description.substring(0, 80) + '\u2026' : risk.description}</span>}
                </div>
              </div>
            );
          }) || <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Keine Risiken identifiziert</p>}
        </div>

        {/* Top Recommendations Preview */}
        <div className={styles.overviewPreviewSection}>
          <div className={styles.overviewPreviewHeader}>
            <h4>Top-Empfehlungen</h4>
            <button className={styles.overviewPreviewLink} onClick={() => onSetActiveTab('recommendations')}>
              Alle anzeigen <ArrowRight size={14} />
            </button>
          </div>
          {selectedContract.legalPulse?.recommendations?.slice(0, 2).map((rec, i) => (
            <div key={i} className={styles.overviewPreviewItem} onClick={() => onSetActiveTab('recommendations')} style={{ cursor: 'pointer' }}>
              <span className={styles.overviewPreviewBadge} style={{
                background: rec.priority === 'critical' ? '#dc2626' : rec.priority === 'high' ? '#ea580c' : rec.priority === 'medium' ? '#0284c7' : '#16a34a'
              }}>
                {rec.priority === 'critical' ? 'Kritisch' : rec.priority === 'high' ? 'Hoch' : rec.priority === 'medium' ? 'Mittel' : 'Niedrig'}
              </span>
              <div className={styles.overviewPreviewText}>
                <strong>{rec.title}</strong>
                {rec.effort && <span>Aufwand: {rec.effort}</span>}
              </div>
            </div>
          )) || <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Keine Empfehlungen vorhanden</p>}
        </div>

        {/* Actions */}
        <div className={styles.overviewActions}>
          <h4>Nächste Schritte</h4>
          <div className={styles.actionsList}>
            <button className={styles.actionButton} onClick={() => onSetActiveTab('risks')}>
              <AlertTriangle size={16} />
              Risiken im Detail ansehen
            </button>
            <button className={styles.actionButton} onClick={() => onSetActiveTab('recommendations')}>
              <CheckCircle size={16} />
              Empfehlungen umsetzen
            </button>
            <button
              className={`${styles.actionButton} ${styles.primaryAction}`}
              onClick={() => onNavigate(`/compare?contractId=${selectedContract._id}`)}
            >
              <FileText size={16} />
              Vertrag vergleichen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

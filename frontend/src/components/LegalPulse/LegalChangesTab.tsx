import { Shield } from 'lucide-react';
import { WeeklyCheckContract } from '../../types/legalPulse';
import styles from '../../pages/LegalPulse.module.css';

interface LegalChangesTabProps {
  contractWeeklyCheck: WeeklyCheckContract['latestCheck'] | null;
  contractWeeklyCheckLoading: boolean;
}

export default function LegalChangesTab({ contractWeeklyCheck, contractWeeklyCheckLoading }: LegalChangesTabProps) {
  return (
    <div className={styles.legalChangesTab}>
      <div className={styles.sectionHeader}>
        <h3><Shield size={18} /> Rechtsänderungs-Überwachung</h3>
        <p>Auswirkungen erkannter Rechtsänderungen auf diesen Vertrag</p>
      </div>

      {contractWeeklyCheckLoading ? (
        <div className={styles.legalChangesLoading} role="status" aria-busy="true">
          <div className={styles.loadingSpinner} aria-hidden="true"></div>
          <p>Lade Rechtsänderungs-Prüfung...</p>
        </div>
      ) : !contractWeeklyCheck ? (
        <div className={styles.legalChangesEmpty}>
          <Shield size={40} />
          <h4>Noch keine Prüfung durchgeführt</h4>
          <p>Die automatische Rechtsänderungs-Prüfung für diesen Vertrag erfolgt beim nächsten wöchentlichen Check.</p>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          <div className={`${styles.legalChangesStatus} ${styles[`lcStatus_${contractWeeklyCheck.stage2Results.overallStatus}`] || ''}`}>
            <div className={styles.legalChangesStatusInfo}>
              <span className={styles.legalChangesStatusBadge}>
                {contractWeeklyCheck.stage2Results.overallStatus === 'aktuell' ? 'Aktuell' :
                 contractWeeklyCheck.stage2Results.overallStatus === 'handlungsbedarf' ? 'Handlungsbedarf' : 'Kritisch'}
              </span>
              <span className={styles.legalChangesStatusDate}>
                Letzter Check: {new Date(contractWeeklyCheck.checkDate).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <span className={styles.legalChangesStatusCount}>
              {contractWeeklyCheck.stage2Results.findings.length} {contractWeeklyCheck.stage2Results.findings.length === 1 ? 'Befund' : 'Befunde'}
            </span>
          </div>

          {/* Summary */}
          {contractWeeklyCheck.stage2Results.summary && (
            <p className={styles.legalChangesSummary}>{contractWeeklyCheck.stage2Results.summary}</p>
          )}

          {/* Metadata */}
          {contractWeeklyCheck.metadata && (
            <div className={styles.legalChangesMeta}>
              <span>Vertrag analysiert: {contractWeeklyCheck.metadata.analyzedPercentage}%</span>
              <span>Geprüft gegen: {contractWeeklyCheck.metadata.dataSourcesUsed?.length || '?'} offizielle Quellen</span>
              <span>Konfidenz: {Math.round(contractWeeklyCheck.metadata.confidenceScore * 100)}%</span>
              <span>Erkannte Änderungen seit: {new Date(contractWeeklyCheck.metadata.lastDataSync || contractWeeklyCheck.checkDate).toLocaleDateString('de-DE')}</span>
            </div>
          )}

          {/* Stage 1: Erkannte Rechtsänderungen */}
          {contractWeeklyCheck.stage1Results.relevantChanges.length > 0 && (
            <div className={styles.legalChangesStage1}>
              <h4>Erkannte Rechtsänderungen der letzten 7 Tage</h4>
              <ul>
                {contractWeeklyCheck.stage1Results.relevantChanges.map((change, idx) => (
                  <li key={idx}>
                    {change.title}
                    <span className={styles.legalChangesRelevance}>({(change.score * 100).toFixed(0)}% Relevanz)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stage 2: Findings */}
          {contractWeeklyCheck.stage2Results.findings.length > 0 && (
            <div className={styles.legalChangesFindings}>
              <h4>Erkannte Auswirkungen auf Ihren Vertrag</h4>
              {contractWeeklyCheck.stage2Results.findings.map((finding, idx) => (
                <div key={idx} className={`${styles.legalChangesFinding} ${styles[`lcFinding_${finding.severity}`] || ''}`}>
                  <div className={styles.legalChangesFindingHeader}>
                    <span className={`${styles.findingSeverityBadge} ${styles[`severity_${finding.severity}`] || ''}`}>
                      {finding.severity === 'critical' ? 'Kritisch' : finding.severity === 'warning' ? 'Warnung' : 'Info'}
                    </span>
                    <span className={styles.legalChangesFindingType}>
                      {finding.type === 'law_change' ? 'Gesetzesänderung' :
                       finding.type === 'risk' ? 'Risiko' :
                       finding.type === 'compliance' ? 'Compliance' : 'Verbesserung'}
                    </span>
                    <strong>{finding.title}</strong>
                  </div>
                  <p className={styles.legalChangesFindingDesc}>{finding.description}</p>
                  {finding.affectedClause && (
                    <div className={styles.legalChangesFindingDetail}>
                      <strong>Betroffene Klausel:</strong> {finding.affectedClause}
                    </div>
                  )}
                  {finding.legalBasis && (
                    <div className={styles.legalChangesFindingDetail}>
                      <strong>Rechtsgrundlage:</strong> {finding.legalBasis}
                    </div>
                  )}
                  {finding.recommendation && (
                    <div className={styles.legalChangesFindingRec}>
                      <strong>Empfehlung:</strong> {finding.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className={styles.legalChangesDisclaimer}>
            <Shield size={14} />
            <p>
              <strong>Wichtiger Hinweis:</strong> Diese Analyse prüft erkannte Rechtsänderungen aus 20 offiziellen Quellen.
              Sie ersetzt keine anwaltliche Beratung. Alle Angaben ohne Gewähr.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

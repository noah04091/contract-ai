import type { ViewMode } from '../../types/legalLensV2';
import RiskScoreGauge from './RiskScoreGauge';
import styles from '../../styles/LegalLensV2.module.css';

interface V2HeaderProps {
  contractName: string;
  overallRiskScore: number;
  stats: { high: number; medium: number; low: number; total: number };
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filterRiskOnly: boolean;
  onFilterToggle: () => void;
  onBack: () => void;
  isAnalyzing: boolean;
  analysisProgress: { completed: number; total: number; percentage: number };
  worstClause: { clauseId: string; title: string | null; riskScore: number; explanation: string } | null;
  onSelectClause?: (clauseId: string) => void;
}

export default function V2Header({
  contractName,
  overallRiskScore,
  stats,
  viewMode,
  onViewModeChange,
  filterRiskOnly,
  onFilterToggle,
  onBack,
  isAnalyzing,
  analysisProgress,
  worstClause,
  onSelectClause
}: V2HeaderProps) {
  return (
    <header className={styles.v2Header}>
      <div className={styles.v2HeaderLeft}>
        <button className={styles.v2HeaderBack} onClick={onBack} title="Zurück">
          &larr;
        </button>
        <h1 className={styles.v2HeaderTitle}>{contractName || 'Vertrag'}</h1>
      </div>

      <div className={styles.v2HeaderCenter}>
        <RiskScoreGauge score={overallRiskScore} size={40} strokeWidth={3} />

        <div className={styles.v2HeaderStats}>
          {stats.high > 0 && <span className={styles.statHigh}>{'\u{1F534}'} {stats.high} kritisch</span>}
          {stats.medium > 0 && <span className={styles.statMedium}>{'\u{1F7E1}'} {stats.medium} verhandeln</span>}
          {stats.low > 0 && <span className={styles.statLow}>{'\u{1F7E2}'} {stats.low} sicher</span>}
        </div>

        {/* Kritischste Klausel */}
        {worstClause && worstClause.riskScore >= 50 && (
          <button
            className={styles.worstClauseIndicator}
            onClick={() => onSelectClause?.(worstClause.clauseId)}
            title={worstClause.explanation?.length > 120 ? worstClause.explanation.slice(0, 120) + '...' : worstClause.explanation}
          >
            <span className={styles.worstClauseIcon}>&#x26A0;</span>
            <span className={styles.worstClauseLabel}>
              Kritischste Klausel: {worstClause.title || 'Unbenannt'} ({worstClause.riskScore}/100)
            </span>
          </button>
        )}
      </div>

      <div className={styles.v2HeaderRight}>
        {/* Filter Toggle */}
        <button
          className={`${styles.v2HeaderFilterBtn} ${filterRiskOnly ? styles.v2HeaderFilterBtn_active : ''}`}
          onClick={onFilterToggle}
          title="Nur Risiken anzeigen"
        >
          Nur Risiken
        </button>

        {/* View Mode Switch */}
        <div className={styles.viewModeSwitch}>
          {(['pdf', 'text', 'split'] as const).map(mode => (
            <button
              key={mode}
              className={`${styles.viewModeBtn} ${viewMode === mode ? styles.viewModeBtn_active : ''}`}
              onClick={() => onViewModeChange(mode)}
            >
              {mode === 'pdf' ? 'PDF' : mode === 'text' ? 'Text' : 'Split'}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Progress Bar */}
      {isAnalyzing && (
        <div className={styles.v2HeaderProgress}>
          <div
            className={styles.v2HeaderProgressBar}
            style={{ width: `${analysisProgress.percentage}%` }}
          />
          <span className={styles.v2HeaderProgressText}>
            Analysiere Klausel {analysisProgress.completed}/{analysisProgress.total}...
          </span>
        </div>
      )}
    </header>
  );
}

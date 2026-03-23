import { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Loader2, FileText, BarChart3, HelpCircle, X, AlertCircle } from 'lucide-react';
import { apiCall } from '../../utils/api';
import type { AnalysisResult, Scores } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface HistoryItem {
  _id: string;
  fileName: string;
  status: string;
  scores?: { overall: number };
  structure?: { contractType: string; contractTypeLabel?: string };
  performance?: { clauseCount: number };
  createdAt: string;
}

interface Props {
  currentResult: AnalysisResult;
}

const SCORE_KEYS: { key: keyof Omit<Scores, 'overall' | 'perClause' | 'explanation'>; label: string; color: string }[] = [
  { key: 'risk', label: 'Risiko', color: '#FF3B30' },
  { key: 'fairness', label: 'Fairness', color: '#AF52DE' },
  { key: 'clarity', label: 'Klarheit', color: '#007AFF' },
  { key: 'completeness', label: 'Vollständigkeit', color: '#34C759' },
  { key: 'marketStandard', label: 'Marktstandard', color: '#FF9500' }
];

function ScoreDelta({ value, size = 'normal' }: { value: number; size?: 'normal' | 'large' }) {
  if (value === 0) return <span className={styles.cmpDeltaNeutral}><Minus size={size === 'large' ? 16 : 12} /> 0</span>;
  if (value > 0) return <span className={styles.cmpDeltaPositive}><ArrowUpRight size={size === 'large' ? 16 : 12} /> +{value}</span>;
  return <span className={styles.cmpDeltaNegative}><ArrowDownRight size={size === 'large' ? 16 : 12} /> {value}</span>;
}

export default function CompareResults({ currentResult }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<AnalysisResult | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load history
  useEffect(() => {
    (async () => {
      try {
        const data = await apiCall('/optimizer-v2/history') as { success?: boolean; results?: HistoryItem[] };
        if (data?.success && data.results) {
          setHistory(data.results.filter(r => r._id !== currentResult.resultId && r.status === 'completed'));
          setLoadError(false);
        }
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    })();
  }, [currentResult.resultId]);

  // Load selected result
  useEffect(() => {
    if (!selectedId) { setCompareResult(null); setCompareError(false); return; }
    setLoadingCompare(true);
    setCompareError(false);
    (async () => {
      try {
        const data = await apiCall(`/optimizer-v2/results/${selectedId}`) as { success?: boolean; result?: AnalysisResult };
        if (data?.success && data.result) {
          setCompareResult(data.result);
        }
      } catch {
        setCompareError(true);
      }
      setLoadingCompare(false);
    })();
  }, [selectedId]);

  // Score deltas
  const deltas = useMemo(() => {
    if (!compareResult) return null;
    const a = currentResult.scores;
    const b = compareResult.scores;
    return {
      overall: a.overall - b.overall,
      sub: SCORE_KEYS.map(({ key, label, color }) => ({
        key, label, color,
        current: (a[key] as number) ?? 0,
        compare: (b[key] as number) ?? 0,
        delta: ((a[key] as number) ?? 0) - ((b[key] as number) ?? 0)
      }))
    };
  }, [currentResult, compareResult]);

  if (loading) {
    return (
      <div className={styles.cmpContainer}>
        <div className={styles.cmpLoading}><Loader2 size={20} className={styles.spinIcon} /> Lade Historie...</div>
      </div>
    );
  }

  return (
    <div className={styles.cmpContainer}>
      <div className={styles.cmpTitleRow}>
        <h3 className={styles.cmpTitle}>Analysen vergleichen</h3>
        <button
          className={styles.cmpHelpBtn}
          onClick={() => setShowHelp(s => !s)}
          title="Was ist der Analysenvergleich?"
        >
          <HelpCircle size={16} />
        </button>
      </div>
      <p className={styles.cmpSubtitle}>Vergleiche die aktuelle Analyse mit einem früheren Ergebnis</p>

      {showHelp && (
        <div className={styles.cmpHelpBox}>
          <button className={styles.cmpHelpClose} onClick={() => setShowHelp(false)}><X size={14} /></button>
          <strong>Wozu der Vergleich?</strong>
          <ul>
            <li><strong>Fortschritt messen</strong> — Sieh auf einen Blick, ob sich dein Vertrag nach einer Überarbeitung verbessert hat (Score-Deltas).</li>
            <li><strong>Schwachstellen aufdecken</strong> — Vergleiche Sub-Scores (Risiko, Fairness, Klarheit etc.) und erkenne, welche Bereiche sich verändert haben.</li>
            <li><strong>Verschiedene Verträge benchmarken</strong> — Vergleiche z. B. deinen Mietvertrag mit einem Dienstleistungsvertrag, um zu sehen, wo Unterschiede liegen.</li>
            <li><strong>Verhandlungsgrundlage</strong> — Dokumentiere die Verbesserung nach einer Verhandlungsrunde mit konkreten Zahlen.</li>
          </ul>
        </div>
      )}

      {/* History selector */}
      {loadError ? (
        <div className={styles.cmpEmpty}>
          <AlertCircle size={20} />
          <p>Historie konnte nicht geladen werden. Bitte lade die Seite neu.</p>
        </div>
      ) : history.length === 0 ? (
        <div className={styles.cmpEmpty}>
          <FileText size={20} />
          <p>Keine weiteren Analysen vorhanden. Lade einen zweiten Vertrag hoch, um Ergebnisse zu vergleichen.</p>
        </div>
      ) : (
        <div className={styles.cmpSelector}>
          <label className={styles.cmpSelectorLabel}>Vergleichen mit:</label>
          <div className={styles.cmpSelectWrap}>
            <select
              className={styles.cmpSelect}
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value || null)}
            >
              <option value="">Analyse auswählen...</option>
              {history.map(h => (
                <option key={h._id} value={h._id}>
                  {h.fileName} — {h.scores?.overall || '?'}/100 — {new Date(h.createdAt).toLocaleDateString('de-DE')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Intro card when no comparison selected yet */}
      {!selectedId && !loadError && history.length > 0 && (
        <div className={styles.cmpIntro}>
          <div className={styles.cmpIntroCard}>
            <div className={styles.cmpIntroIcon}>
              <BarChart3 size={28} />
            </div>
            <div className={styles.cmpIntroContent}>
              <h4>Aktuelle Analyse</h4>
              <div className={styles.cmpIntroStats}>
                <div className={styles.cmpIntroStat}>
                  <span className={styles.cmpIntroStatValue} style={{ color: currentResult.scores.overall >= 60 ? '#34C759' : currentResult.scores.overall >= 40 ? '#FF9500' : '#FF3B30' }}>
                    {currentResult.scores.overall}
                  </span>
                  <span className={styles.cmpIntroStatLabel}>Score</span>
                </div>
                <div className={styles.cmpIntroStat}>
                  <span className={styles.cmpIntroStatValue}>{currentResult.clauses.length}</span>
                  <span className={styles.cmpIntroStatLabel}>Klauseln</span>
                </div>
                <div className={styles.cmpIntroStat}>
                  <span className={styles.cmpIntroStatValue} style={{ color: '#FF9500' }}>
                    {currentResult.optimizations.filter(o => o.needsOptimization).length}
                  </span>
                  <span className={styles.cmpIntroStatLabel}>Optimierbar</span>
                </div>
              </div>
              <p className={styles.cmpIntroHint}>
                Wähle oben eine frühere Analyse aus, um die Score-Entwicklung und Unterschiede zu sehen.
              </p>
            </div>
          </div>
          <div className={styles.cmpIntroFeatures}>
            <div className={styles.cmpIntroFeature}>
              <ArrowUpRight size={16} style={{ color: '#34C759' }} />
              <span>Score-Veränderungen auf einen Blick</span>
            </div>
            <div className={styles.cmpIntroFeature}>
              <BarChart3 size={16} style={{ color: '#007AFF' }} />
              <span>5 Sub-Scores im direkten Vergleich</span>
            </div>
            <div className={styles.cmpIntroFeature}>
              <FileText size={16} style={{ color: '#FF9500' }} />
              <span>Klausel- und Optimierungsstatistik</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading compare */}
      {loadingCompare && (
        <div className={styles.cmpLoading}><Loader2 size={16} className={styles.spinIcon} /> Lade Ergebnis...</div>
      )}
      {compareError && !loadingCompare && (
        <div className={styles.cmpErrorMsg}>
          <AlertCircle size={14} />
          Ergebnis konnte nicht geladen werden. Bitte wähle eine andere Analyse.
        </div>
      )}

      {/* Comparison dashboard */}
      {compareResult && deltas && (
        <div className={styles.cmpDashboard}>
          {/* Overall score comparison */}
          <div className={styles.cmpOverallRow}>
            <div className={styles.cmpScoreBox}>
              <span className={styles.cmpScoreLabel}>{compareResult.fileName || 'Vorher'}</span>
              <span className={styles.cmpScoreValue}>{compareResult.scores.overall}</span>
              <span className={styles.cmpScoreMax}>/100</span>
            </div>
            <div className={styles.cmpArrow}>
              <BarChart3 size={20} />
              <ScoreDelta value={deltas.overall} size="large" />
            </div>
            <div className={styles.cmpScoreBox}>
              <span className={styles.cmpScoreLabel}>{currentResult.fileName || 'Aktuell'}</span>
              <span className={styles.cmpScoreValue} style={{ color: deltas.overall > 0 ? '#34C759' : deltas.overall < 0 ? '#FF3B30' : undefined }}>
                {currentResult.scores.overall}
              </span>
              <span className={styles.cmpScoreMax}>/100</span>
            </div>
          </div>

          {/* Sub-score comparison */}
          <div className={styles.cmpSubScores}>
            {deltas.sub.map(({ key, label, color, current, compare, delta }) => (
              <div key={key} className={styles.cmpSubRow}>
                <span className={styles.cmpSubLabel} style={{ color }}>{label}</span>
                <div className={styles.cmpSubBar}>
                  <div className={styles.cmpSubBarTrack}>
                    <div className={styles.cmpSubBarCompare} style={{ width: `${compare}%`, background: `${color}40` }} />
                    <div className={styles.cmpSubBarCurrent} style={{ width: `${current}%`, background: color }} />
                  </div>
                </div>
                <span className={styles.cmpSubValues}>{compare} → {current}</span>
                <ScoreDelta value={delta} />
              </div>
            ))}
          </div>

          {/* Clause count comparison */}
          <div className={styles.cmpClauseStats}>
            <div className={styles.cmpClauseStat}>
              <span>Klauseln</span>
              <span>{compareResult.clauses.length} → {currentResult.clauses.length}</span>
            </div>
            <div className={styles.cmpClauseStat}>
              <span>Optimierbar</span>
              <span>
                {compareResult.optimizations.filter(o => o.needsOptimization).length} → {currentResult.optimizations.filter(o => o.needsOptimization).length}
              </span>
            </div>
            <div className={styles.cmpClauseStat}>
              <span>Vertragstyp</span>
              <span>{compareResult.structure?.contractTypeLabel || '?'} / {currentResult.structure?.contractTypeLabel || '?'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

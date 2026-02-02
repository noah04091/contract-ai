import { Clock, Activity, AlertTriangle, CheckCircle, Zap, ArrowRight } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Contract } from '../../types/legalPulse';
import styles from '../../pages/LegalPulse.module.css';

interface HistoryTabProps {
  selectedContract: Contract;
  onNavigate: NavigateFunction;
  scoreHistory: Array<{ date: string; score: number }>;
  riskLevel: { level: string; color: string; icon: string };
  getRiskScoreColor: (score: number | null) => string;
}

export default function HistoryTab({
  selectedContract,
  onNavigate,
  scoreHistory,
  riskLevel,
  getRiskScoreColor
}: HistoryTabProps) {
  if (!selectedContract.legalPulse) {
    return (
      <div className={styles.historyTab}>
        <div className={styles.noAnalysisState}>
          <div className={styles.noAnalysisIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
            <Clock size={32} color="#3b82f6" />
          </div>
          <h3>Noch keine Analyse-Historie</h3>
          <p>Die Analyse-Historie zeigt die Entwicklung des Risiko-Scores über Zeit. Nach der ersten Analyse wird hier der Verlauf sichtbar.</p>
          <div className={styles.noAnalysisFeatures}>
            <div className={styles.noAnalysisFeature}>
              <Activity size={18} color="#3b82f6" />
              <span>Score-Verlauf über Zeit</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span>Trend-Erkennung</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <CheckCircle size={18} color="#10b981" />
              <span>Fortschritts-Tracking</span>
            </div>
          </div>
          <button
            className={styles.noAnalysisCta}
            onClick={() => onNavigate(`/contracts`)}
          >
            <Zap size={16} />
            Vertrag analysieren
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.historyTab}>
      <div className={styles.sectionHeader}>
        <h3>Analyse-Historie</h3>
        <p>Entwicklung des Risiko-Scores über Zeit</p>
      </div>

      {scoreHistory.length <= 1 ? (
        <div className={styles.historySinglePoint}>
          <div className={styles.historySingleIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h4>Erste Analyse durchgeführt</h4>
          {selectedContract.legalPulse?.lastAnalysis && (
            <p className={styles.historySingleDate}>
              am {new Date(selectedContract.legalPulse.lastAnalysis).toLocaleDateString('de-DE', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          )}
          <div className={styles.historySingleScore}>
            <span style={{ color: riskLevel.color, fontWeight: 700, fontSize: '1.5rem' }}>
              {selectedContract.legalPulse?.riskScore ?? '\u2014'}
            </span>
            <span style={{ color: '#6b7280' }}>/100 Risiko-Score</span>
            <span style={{ color: riskLevel.color, fontWeight: 600 }}>
              {riskLevel.icon} {riskLevel.level}
            </span>
          </div>
          <p className={styles.historySingleHint}>
            Der Verlauf wird sichtbar, sobald weitere Analysen durchgeführt werden.
            Legal Pulse prüft Ihren Vertrag automatisch wöchentlich auf Veränderungen.
          </p>
          {selectedContract.legalPulse?.nextScheduledCheck && (
            <div className={styles.historySingleNext}>
              <Clock size={14} />
              Nächste geplante Prüfung: {new Date(selectedContract.legalPulse.nextScheduledCheck).toLocaleDateString('de-DE', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.chartLegend}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.legendIcon}>
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Zeitverlauf des Risiko-Scores (0–100); höher = riskanter</span>
          </div>
          <div className={styles.historyContent}>
            <div className={styles.historyChart}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      color: '#1f2937'
                    }}
                    labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                    itemStyle={{ color: '#1f2937' }}
                    formatter={(value: number) => [`${Number(value).toFixed(1)}/100`, 'Risiko-Score']}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={getRiskScoreColor(selectedContract.legalPulse?.riskScore ?? null)}
                    fill={`${getRiskScoreColor(selectedContract.legalPulse?.riskScore ?? null)}20`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

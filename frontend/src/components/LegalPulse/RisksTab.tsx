import { useState } from 'react';
import { AlertTriangle, Shield, Activity, Zap, ArrowRight, CheckCircle, Filter } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { Contract, RiskObject, RiskStatus } from '../../types/legalPulse';
import RiskCard from '../RiskCard';
import styles from '../../pages/LegalPulse.module.css';

interface RisksTabProps {
  selectedContract: Contract;
  onNavigate: NavigateFunction;
  onSaveRiskToLibrary: (risk: RiskObject) => void;
  onSetNotification: (notification: { message: string; type: 'success' | 'error' }) => void;
  onRiskUpdate?: (index: number, updates: { status?: RiskStatus; userComment?: string; userEdits?: { title?: string; description?: string; severity?: string } }) => Promise<void>;
  onContractUpdated?: (contract: Contract) => void;
}

type RiskFilter = 'all' | 'open' | 'resolved';

export default function RisksTab({ selectedContract, onNavigate, onSaveRiskToLibrary, onSetNotification, onRiskUpdate }: RisksTabProps) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  if (!selectedContract.legalPulse) {
    return (
      <div className={styles.risksTab}>
        <div className={styles.noAnalysisState}>
          <div className={styles.noAnalysisIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <h3>Risikoanalyse nicht verf\u00FCgbar</h3>
          <p>Um Risiken zu identifizieren, muss der Vertrag zuerst analysiert werden. Die Legal Pulse Risikoanalyse erkennt automatisch rechtliche Schwachstellen und bewertet deren Kritikalit\u00E4t.</p>
          <div className={styles.noAnalysisFeatures}>
            <div className={styles.noAnalysisFeature}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>Automatische Risikoerkennung</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <Shield size={18} color="#3b82f6" />
              <span>Schwachstellen-Bewertung</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <Activity size={18} color="#10b981" />
              <span>Handlungsempfehlungen</span>
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

  const risks = selectedContract.legalPulse?.topRisks || [];
  const totalRisks = risks.length;
  const resolvedCount = risks.filter(r => r.status === 'resolved' || r.status === 'accepted').length;
  const openCount = totalRisks - resolvedCount;

  // Filter risks
  const filteredRisks = risks.filter(risk => {
    if (riskFilter === 'open') return !risk.status || risk.status === 'open';
    if (riskFilter === 'resolved') return risk.status === 'resolved' || risk.status === 'accepted';
    return true;
  });

  return (
    <div className={styles.risksTab}>
      <div className={styles.sectionHeader}>
        <h3>Identifizierte Risiken</h3>
        <p>Diese rechtlichen Risiken wurden in Ihrem Vertrag identifiziert</p>
      </div>

      {/* Progress & Filter Bar */}
      {totalRisks > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color={resolvedCount > 0 ? '#10b981' : '#9ca3af'} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                {resolvedCount}/{totalRisks} Risiken behoben
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {openCount} offen
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            background: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: totalRisks > 0 ? `${(resolvedCount / totalRisks) * 100}%` : '0%',
              height: '100%',
              background: resolvedCount === totalRisks ? '#10b981' : '#3b82f6',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {([
              { key: 'all' as RiskFilter, label: `Alle (${totalRisks})` },
              { key: 'open' as RiskFilter, label: `Offen (${openCount})` },
              { key: 'resolved' as RiskFilter, label: `Behoben (${resolvedCount})` },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setRiskFilter(f.key)}
                style={{
                  padding: '5px 14px',
                  border: '1px solid',
                  borderColor: riskFilter === f.key ? '#3b82f6' : '#d1d5db',
                  borderRadius: '8px',
                  background: riskFilter === f.key ? '#eff6ff' : 'white',
                  color: riskFilter === f.key ? '#3b82f6' : '#6b7280',
                  fontSize: '0.8rem',
                  fontWeight: riskFilter === f.key ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {f.key === 'all' && <Filter size={12} />}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.risksList}>
        {filteredRisks.length > 0 ? (
          filteredRisks.map((risk, _filteredIndex) => {
            // Find the original index in the full risks array
            const originalIndex = risks.indexOf(risk);
            return (
              <RiskCard
                key={originalIndex}
                risk={risk}
                index={originalIndex}
                contractId={selectedContract._id}
                onSaveToLibrary={onSaveRiskToLibrary}
                onRiskUpdate={onRiskUpdate}
                onFeedback={(feedback) => {
                  onSetNotification({
                    message: feedback === 'helpful'
                      ? "\u2713 Danke f\u00fcr Ihr Feedback!"
                      : "\u2713 Feedback gespeichert",
                    type: "success"
                  });
                }}
              />
            );
          })
        ) : totalRisks > 0 ? (
          <div className={styles.noAnalysisState} style={{ padding: '48px 32px' }}>
            <Filter size={40} color="#9ca3af" />
            <h3 style={{ color: '#6b7280' }}>
              {riskFilter === 'open' ? 'Alle Risiken behoben!' : 'Keine behobenen Risiken'}
            </h3>
            <p>{riskFilter === 'open'
              ? 'Alle identifizierten Risiken wurden als behoben markiert.'
              : 'Es wurden noch keine Risiken als behoben markiert.'
            }</p>
          </div>
        ) : (
          <div className={styles.noAnalysisState} style={{ padding: '48px 32px' }}>
            <CheckCircle size={40} color="#10b981" />
            <h3 style={{ color: '#10b981' }}>Keine Risiken erkannt</h3>
            <p>Die Analyse hat keine kritischen rechtlichen Risiken in diesem Vertrag identifiziert.</p>
          </div>
        )}
      </div>
    </div>
  );
}

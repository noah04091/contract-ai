import { AlertTriangle, Shield, Activity, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { Contract, RiskObject } from '../../types/legalPulse';
import RiskCard from '../RiskCard';
import styles from '../../pages/LegalPulse.module.css';

interface RisksTabProps {
  selectedContract: Contract;
  onNavigate: NavigateFunction;
  onSaveRiskToLibrary: (risk: RiskObject) => void;
  onSetNotification: (notification: { message: string; type: 'success' | 'error' }) => void;
}

export default function RisksTab({ selectedContract, onNavigate, onSaveRiskToLibrary, onSetNotification }: RisksTabProps) {
  if (!selectedContract.legalPulse) {
    return (
      <div className={styles.risksTab}>
        <div className={styles.noAnalysisState}>
          <div className={styles.noAnalysisIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <h3>Risikoanalyse nicht verfügbar</h3>
          <p>Um Risiken zu identifizieren, muss der Vertrag zuerst analysiert werden. Die Legal Pulse Risikoanalyse erkennt automatisch rechtliche Schwachstellen und bewertet deren Kritikalität.</p>
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

  return (
    <div className={styles.risksTab}>
      <div className={styles.sectionHeader}>
        <h3>Identifizierte Risiken</h3>
        <p>Diese rechtlichen Risiken wurden in Ihrem Vertrag identifiziert</p>
      </div>
      <div className={styles.risksList}>
        {selectedContract.legalPulse?.topRisks?.length ? (
          selectedContract.legalPulse.topRisks.map((risk, index) => (
            <RiskCard
              key={index}
              risk={risk}
              index={index}
              contractId={selectedContract._id}
              onSaveToLibrary={onSaveRiskToLibrary}
              onFeedback={(feedback) => {
                onSetNotification({
                  message: feedback === 'helpful'
                    ? "\u2713 Danke f\u00fcr Ihr Feedback!"
                    : "\u2713 Feedback gespeichert",
                  type: "success"
                });
              }}
            />
          ))
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

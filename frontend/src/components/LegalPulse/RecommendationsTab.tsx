import { CheckCircle, Zap, Shield, ArrowRight } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { Contract, RecommendationObject, RecommendationInput, RecommendationState } from '../../types/legalPulse';
import RecommendationCard from '../RecommendationCard';
import styles from '../../pages/LegalPulse.module.css';

interface RecommendationsTabProps {
  selectedContract: Contract;
  onNavigate: NavigateFunction;
  onImplementRecommendation: (recommendation: RecommendationInput) => void;
  onSaveRecommendationToLibrary: (recommendation: RecommendationObject) => void;
  onSetNotification: (notification: { message: string; type: 'success' | 'error' }) => void;
  onRecommendationUpdate?: (index: number, updates: {
    status?: RecommendationState;
    userComment?: string;
    userEdits?: { title?: string; description?: string; priority?: string }
  }) => Promise<void>;
}

export default function RecommendationsTab({
  selectedContract,
  onNavigate,
  onImplementRecommendation,
  onSaveRecommendationToLibrary,
  onSetNotification,
  onRecommendationUpdate
}: RecommendationsTabProps) {
  if (!selectedContract.legalPulse) {
    return (
      <div className={styles.recommendationsTab}>
        <div className={styles.noAnalysisState}>
          <div className={styles.noAnalysisIcon} style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
            <CheckCircle size={32} color="#10b981" />
          </div>
          <h3>Empfehlungen werden nach Analyse erstellt</h3>
          <p>Nach der Vertragsanalyse erhalten Sie konkrete, priorisierte Handlungsempfehlungen zur Risikominimierung und Vertragsoptimierung.</p>
          <div className={styles.noAnalysisFeatures}>
            <div className={styles.noAnalysisFeature}>
              <CheckCircle size={18} color="#10b981" />
              <span>Priorisierte Maßnahmen</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <Zap size={18} color="#f59e0b" />
              <span>1-Klick Umsetzung</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <Shield size={18} color="#3b82f6" />
              <span>Rechtliche Absicherung</span>
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
    <div className={styles.recommendationsTab}>
      <div className={styles.sectionHeader}>
        <h3>Empfohlene Maßnahmen</h3>
        <p>Konkrete Schritte zur Risikominimierung</p>
      </div>
      <div className={styles.recommendationsList}>
        {selectedContract.legalPulse?.recommendations?.length ? (
          selectedContract.legalPulse.recommendations.map((recommendation, index) => {
            return (
              <RecommendationCard
                key={index}
                recommendation={recommendation}
                index={index}
                contractId={selectedContract._id}
                onImplement={onImplementRecommendation}
                onSaveToLibrary={onSaveRecommendationToLibrary}
                onRecommendationUpdate={onRecommendationUpdate}
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
        ) : (
          <div className={styles.noAnalysisState} style={{ padding: '48px 32px' }}>
            <CheckCircle size={40} color="#10b981" />
            <h3 style={{ color: '#10b981' }}>Keine Empfehlungen notwendig</h3>
            <p>Dieser Vertrag ist gut aufgestellt. Es wurden keine dringenden Handlungsempfehlungen identifiziert.</p>
          </div>
        )}
      </div>
    </div>
  );
}

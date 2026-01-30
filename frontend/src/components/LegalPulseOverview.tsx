// LegalPulseOverview.tsx
import React from 'react';
import InfoTooltip from '../components/InfoTooltip';
import { fixUtf8Display } from "../utils/textUtils";
import styles from "../styles/LegalPulseOverview.module.css";

interface Contract {
  _id: string;
  name: string;
  legalPulse?: {
    riskScore: number | null;
  };
}

interface LegalPulseOverviewProps {
  contracts: Contract[];
}

type RiskLevel = 'high' | 'medium' | 'low' | 'unrated';

const LegalPulseOverview: React.FC<LegalPulseOverviewProps> = ({ contracts }) => {
  const getRiskLevel = (riskScore: number | null | undefined): RiskLevel => {
    if (riskScore === null || riskScore === undefined) return 'unrated';
    if (riskScore <= 30) return 'low';
    if (riskScore <= 60) return 'medium';
    return 'high';
  };

  const getRiskLabel = (riskLevel: RiskLevel): string => {
    switch (riskLevel) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      case 'unrated': return 'Unbewertet';
    }
  };

  const formatRiskScore = (riskScore: number | null | undefined): string => {
    if (riskScore === null || riskScore === undefined) return 'Nicht bewertet';
    return `Risk Score: ${riskScore}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>🧠 Legal Pulse Analyse</h3>
          <InfoTooltip
            title="Was ist Legal Pulse?"
            content="Legal Pulse analysiert Ihre Verträge automatisch auf rechtliche Risiken, Compliance-Probleme und Optimierungsmöglichkeiten. Der KI-Score (0-100) zeigt potenzielle Schwachstellen und hilft bei der Prioritisierung von Vertragsüberprüfungen."
            position="bottom"
            size="lg"
          />
        </div>
        <span className={styles.count}>
          {contracts.length} {contracts.length === 1 ? 'Vertrag' : 'Verträge'}
        </span>
      </div>
      
      {contracts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Keine Verträge gefunden</p>
        </div>
      ) : (
        <div className={styles.contractList}>
          {contracts.map((contract, index) => {
            const riskLevel = getRiskLevel(contract.legalPulse?.riskScore);
            const riskLabel = getRiskLabel(riskLevel);
            const riskScoreText = formatRiskScore(contract.legalPulse?.riskScore);
            
            return (
              <div 
                key={contract._id} 
                className={styles.contractItem}
                style={{ animationDelay: `${index * 50}ms` }}
                title={riskScoreText}
              >
                <div className={styles.contractName}>
                  {fixUtf8Display(contract.name)}
                </div>
                <div className={styles.riskBadgeContainer}>
                  <span className={`${styles.riskBadge} ${styles[riskLevel]}`}>
                    {riskLabel}
                  </span>
                  {contract.legalPulse?.riskScore !== null && 
                   contract.legalPulse?.riskScore !== undefined && (
                    <span className={styles.riskScore}>
                      {contract.legalPulse.riskScore}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LegalPulseOverview;
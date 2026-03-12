import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, AlertCircle, CheckCircle, Shield,
  ChevronDown, ChevronUp, Scale
} from 'lucide-react';
import {
  RiskFinding,
  CLAUSE_AREA_LABELS, RISK_TYPE_LABELS,
  ClauseArea,
} from '../../../types/compare';
import styles from '../../../styles/Compare.module.css';

interface RisksTabProps {
  risks: RiskFinding[];
}

export default function RisksTab({ risks }: RisksTabProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (risks.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <Shield size={48} strokeWidth={1} />
        <h3>Keine Risiken identifiziert</h3>
        <p>Die KI hat keine besonderen Risiken in den Verträgen gefunden.</p>
      </div>
    );
  }

  // Group by severity
  const grouped = {
    critical: risks.filter(r => r.severity === 'critical'),
    high: risks.filter(r => r.severity === 'high'),
    medium: risks.filter(r => r.severity === 'medium'),
    low: risks.filter(r => r.severity === 'low'),
  };

  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;
  const severityConfig = {
    critical: { label: 'Kritisch', color: '#d70015', bg: 'rgba(215, 0, 21, 0.06)', Icon: AlertTriangle },
    high: { label: 'Hoch', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.06)', Icon: AlertCircle },
    medium: { label: 'Mittel', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.06)', Icon: AlertTriangle },
    low: { label: 'Niedrig', color: '#34c759', bg: 'rgba(52, 199, 89, 0.06)', Icon: CheckCircle },
  };

  let globalIndex = 0;

  return (
    <div className={styles.risksTab}>
      {severityOrder.map((severity) => {
        const items = grouped[severity];
        if (items.length === 0) return null;
        const config = severityConfig[severity];

        return (
          <div key={severity} className={styles.riskGroup}>
            <div className={styles.riskGroupHeader} style={{ borderLeftColor: config.color }}>
              <config.Icon size={16} style={{ color: config.color }} />
              <span style={{ color: config.color, fontWeight: 600 }}>
                {config.label} ({items.length})
              </span>
            </div>

            {items.map((risk) => {
              const idx = globalIndex++;
              const isExpanded = expandedIndex === idx;

              return (
                <motion.div
                  key={idx}
                  className={styles.riskCard}
                  style={{ borderLeftColor: config.color, background: isExpanded ? config.bg : undefined }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <div
                    className={styles.riskCardHeader}
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  >
                    <div className={styles.riskCardTitle}>
                      <span className={styles.riskAreaBadge}>
                        {CLAUSE_AREA_LABELS[risk.clauseArea as ClauseArea] || risk.clauseArea}
                      </span>
                      <span className={styles.riskTypeBadge}>
                        {RISK_TYPE_LABELS[risk.riskType] || risk.riskType}
                      </span>
                      <h4>{risk.title}</h4>
                    </div>
                    <div className={styles.riskCardActions}>
                      <span className={styles.contractBadge} data-contract={risk.contract}>
                        {risk.contract === 'both' ? 'Beide' : `Vertrag ${risk.contract}`}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className={styles.riskCardContent}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className={styles.riskDescription}>{risk.description}</p>

                        {risk.legalBasis && (
                          <div className={styles.riskLegalBasis}>
                            <Scale size={13} />
                            <span>Rechtsgrundlage: {risk.legalBasis}</span>
                          </div>
                        )}

                        {risk.financialExposure && (
                          <div className={styles.riskFinancial}>
                            <span>Finanzielle Exposition: {risk.financialExposure}</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

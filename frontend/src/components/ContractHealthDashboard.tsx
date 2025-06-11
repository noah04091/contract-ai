// 📁 src/components/ContractHealthDashboard.tsx
import React from "react";
import { motion } from "framer-motion";
import { Globe, Zap, TrendingUp } from "lucide-react";
import { ContractHealthScore } from "../types/optimizer";
import styles from "./ContractHealthDashboard.module.css";

interface ContractHealthDashboardProps {
  score: ContractHealthScore;
  showSimulation: boolean;
  newScore: number;
}

const ContractHealthDashboard: React.FC<ContractHealthDashboardProps> = ({ 
  score, 
  showSimulation, 
  newScore 
}) => {
  const scoreColor = (s: number) => {
    if (s >= 90) return '#34c759';
    if (s >= 70) return '#ff9500';
    if (s >= 50) return '#ff453a';
    return '#d70015';
  };

  const currentScore = showSimulation ? newScore : score.overall;
  const improvement = newScore - score.overall;

  const categoryLabels = {
    termination: 'Kündigung',
    liability: 'Haftung',
    payment: 'Zahlung',
    clarity: 'Klarheit',
    compliance: 'Compliance'
  };

  return (
    <motion.div
      className={styles.dashboard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Background Pattern */}
      <div 
        className={styles.backgroundPattern}
        style={{ backgroundColor: `${scoreColor(currentScore)}15` }}
      ></div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>Vertragsgesundheit</h3>
            <div className={styles.subtitle}>
              <Globe size={14} />
              <span>{score.industryPercentile}. Perzentil in deiner Branche</span>
            </div>
          </div>
          
          <div className={styles.scoreSection}>
            <motion.div 
              className={styles.score}
              style={{ color: scoreColor(currentScore) }}
              animate={{ scale: showSimulation && improvement > 0 ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              {currentScore}
            </motion.div>
            <div className={styles.scoreLabel}>von 100 Punkten</div>
          </div>
        </div>

        {showSimulation && improvement > 0 && (
          <motion.div
            className={styles.simulationBanner}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Zap size={20} />
            <div>
              <div className={styles.simulationTitle}>Simulation aktiv</div>
              <div className={styles.simulationSubtitle}>
                Potentielle Verbesserung: +{improvement} Punkte
              </div>
            </div>
          </motion.div>
        )}

        {/* Category Breakdown */}
        <div className={styles.categories}>
          {Object.entries(score.categories).map(([category, data]) => (
            <div key={category} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryName}>
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </span>
                <div className={styles.categoryScore}>
                  <span style={{ color: scoreColor(data.score) }}>
                    {data.score}
                  </span>
                  {data.trend === 'up' && <TrendingUp size={12} className={styles.trendUp} />}
                  {data.trend === 'down' && <TrendingUp size={12} className={styles.trendDown} />}
                </div>
              </div>
              <div className={styles.progressBar}>
                <motion.div
                  className={styles.progressFill}
                  style={{ backgroundColor: scoreColor(data.score) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${data.score}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ContractHealthDashboard;
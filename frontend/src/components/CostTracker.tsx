// ✨ CostTracker.tsx - Premium Cost Overview Component
import { useMemo } from 'react';
import styles from '../styles/CostTracker.module.css';

interface Contract {
  _id: string;
  name: string;
  amount?: number;
  createdAt: string;
  uploadedAt?: string;
}

interface CostTrackerProps {
  contract: Contract;
}

export default function CostTracker({ contract }: CostTrackerProps) {
  // 💰 Berechne Kosten
  const costs = useMemo(() => {
    const monthlyPrice = contract.amount || 0;
    const yearlyPrice = monthlyPrice * 12;

    // Berechne Monate seit Upload
    const createdDate = new Date(contract.createdAt || contract.uploadedAt || Date.now());
    const now = new Date();
    const monthsSinceCreation = Math.max(1,
      (now.getFullYear() - createdDate.getFullYear()) * 12 +
      (now.getMonth() - createdDate.getMonth())
    );

    const totalCost = monthlyPrice * monthsSinceCreation;

    return {
      monthly: monthlyPrice.toFixed(2),
      yearly: yearlyPrice.toFixed(2),
      total: totalCost.toFixed(2),
      months: monthsSinceCreation
    };
  }, [contract.amount, contract.createdAt, contract.uploadedAt]);

  const handleCompare = () => {
    // TODO: Navigation zu Compare-Feature
    console.log('🔍 Navigate to Compare feature for contract:', contract._id);
    alert('Compare-Feature coming soon! 🚀');
  };

  return (
    <div className={styles.costTracker}>
      <h4 className={styles.title}>
        <span className={styles.icon}>💰</span>
        Kosten-Übersicht
      </h4>

      <div className={styles.costGrid}>
        <div className={styles.costItem}>
          <span className={styles.costLabel}>Monatlich</span>
          <strong className={styles.costValue}>{costs.monthly}€</strong>
        </div>

        <div className={styles.costItem}>
          <span className={styles.costLabel}>Jährlich</span>
          <strong className={styles.costValue}>{costs.yearly}€</strong>
        </div>

        <div className={styles.costItem}>
          <span className={styles.costLabel}>
            Seit Upload ({costs.months}M)
          </span>
          <strong className={styles.costValue}>{costs.total}€</strong>
        </div>
      </div>

      {contract.amount && contract.amount > 0 && (
        <button
          className={styles.compareBtn}
          onClick={handleCompare}
          title="Vergleiche Preise und finde günstigere Alternativen"
        >
          <span>Einsparpotenzial prüfen</span>
          <span className={styles.arrow}>→</span>
        </button>
      )}

      {(!contract.amount || contract.amount === 0) && (
        <p className={styles.noCostHint}>
          💡 Tipp: Füge einen Preis hinzu, um Kosten zu tracken
        </p>
      )}
    </div>
  );
}

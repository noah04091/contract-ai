// 📁 components/LegalLens/ClauseSkeleton.tsx
// Skeleton Loading für Klausel-Liste

import React from 'react';
import styles from '../../styles/LegalLens.module.css';

interface ClauseSkeletonProps {
  count?: number;
  showHeader?: boolean;
}

/**
 * Skeleton Loading Komponente für die Klausel-Liste.
 * Zeigt animierte Platzhalter während die echten Daten laden.
 */
const ClauseSkeleton: React.FC<ClauseSkeletonProps> = ({
  count = 5,
  showHeader = true
}) => {
  // Generiere unterschiedliche Höhen für natürlicheres Aussehen
  const getRandomHeight = (index: number): number => {
    // Pseudo-random basierend auf Index für Konsistenz
    const heights = [60, 80, 100, 70, 90, 75, 85, 95];
    return heights[index % heights.length];
  };

  return (
    <div className={styles.contractPanel}>
      {showHeader && (
        <div className={styles.contractHeader}>
          <h3 className={styles.contractTitle}>Dokument</h3>
          <span className={styles.clauseCount}>
            <span className={styles.skeletonText} style={{ width: '80px' }} />
          </span>
        </div>
      )}

      <div className={styles.clauseList}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className={`${styles.clauseItem} ${styles.skeleton}`}
            style={{ minHeight: getRandomHeight(index) }}
          >
            {/* Header Skeleton */}
            <div className={styles.clauseHeader}>
              <span className={styles.skeletonText} style={{ width: '120px' }} />
              <span className={`${styles.skeletonBadge}`} />
            </div>

            {/* Text Skeleton - multiple lines */}
            <div className={styles.skeletonTextBlock}>
              <span className={styles.skeletonText} style={{ width: '100%' }} />
              <span className={styles.skeletonText} style={{ width: '95%' }} />
              {index % 2 === 0 && (
                <span className={styles.skeletonText} style={{ width: '60%' }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClauseSkeleton;

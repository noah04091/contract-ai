// 📄 src/components/ContractsSkeleton.tsx - Skeleton Loader for Contracts Table
import SkeletonLoader, { SkeletonAvatar } from './SkeletonLoader';
import styles from '../styles/Contracts.module.css';

export default function ContractsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.contractsTable}>
        <thead>
          <tr>
            <th>Vertragsname</th>
            <th>Kündigungsfrist</th>
            <th>Ablaufdatum</th>
            <th>Status</th>
            <th>Hochgeladen</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className={styles.tableRow}>
              <td>
                <div className={styles.contractName}>
                  <SkeletonAvatar size="32px" />
                  <SkeletonLoader width="150px" height="0.875rem" />
                </div>
              </td>
              <td>
                <SkeletonLoader width="80px" height="0.875rem" />
              </td>
              <td>
                <SkeletonLoader width="100px" height="0.875rem" />
              </td>
              <td>
                <SkeletonLoader width="60px" height="24px" />
              </td>
              <td>
                <SkeletonLoader width="100px" height="0.875rem" />
              </td>
              <td>
                <div className={styles.actionButtons}>
                  <SkeletonAvatar size="28px" />
                  <SkeletonAvatar size="28px" />
                  <SkeletonAvatar size="28px" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mobile cards skeleton
export function ContractsCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className={styles.mobileCardsContainer}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className={styles.contractCard}>
          <div className={styles.cardHeader}>
            <SkeletonAvatar size="40px" />
            <div className={styles.cardTitle} style={{ flex: 1 }}>
              <SkeletonLoader width="70%" height="1rem" />
              <div style={{ marginTop: '0.5rem' }}>
                <SkeletonLoader width="40%" height="0.75rem" />
              </div>
            </div>
          </div>

          <div className={styles.cardDetails}>
            <div className={styles.cardDetailItem}>
              <SkeletonLoader width="100px" height="0.75rem" />
              <SkeletonLoader width="80px" height="0.875rem" />
            </div>
            <div className={styles.cardDetailItem}>
              <SkeletonLoader width="100px" height="0.75rem" />
              <SkeletonLoader width="80px" height="0.875rem" />
            </div>
          </div>

          <div className={styles.cardActions}>
            {Array.from({ length: 4 }).map((_, btnIndex) => (
              <SkeletonLoader
                key={btnIndex}
                width="calc(50% - 0.25rem)"
                height="44px"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

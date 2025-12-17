// 📊 src/components/DashboardSkeleton.tsx - Skeleton Loader for Dashboard
import SkeletonLoader from './SkeletonLoader';
import styles from '../pages/Dashboard.module.css';

export default function DashboardSkeleton() {
  return (
    <div className={styles.dashboardContent}>
      {/* Metrics Cards Grid Skeleton */}
      <div className={styles.metricsGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <SkeletonLoader variant="circular" width="32px" height="32px" />
              <SkeletonLoader width="40px" height="1rem" />
            </div>
            <SkeletonLoader width="60px" height="2rem" />
            <SkeletonLoader width="120px" height="1rem" />
            <SkeletonLoader width="100px" height="0.875rem" />
          </div>
        ))}
      </div>

      {/* Priority Contracts Table Skeleton */}
      <div className={styles.priorityContractsSection}>
        <div className={styles.sectionHeader}>
          <SkeletonLoader width="200px" height="1.5rem" />
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.contractTable}>
            <thead>
              <tr>
                <th>Kategorie</th>
                <th>Name</th>
                <th>Laufzeit</th>
                <th>Ablaufdatum</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className={styles.contractRow}>
                  <td>
                    <SkeletonLoader width="80px" height="0.875rem" />
                  </td>
                  <td>
                    <SkeletonLoader width="150px" height="0.875rem" />
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
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <SkeletonLoader variant="circular" width="32px" height="32px" />
                      <SkeletonLoader variant="circular" width="32px" height="32px" />
                      <SkeletonLoader variant="circular" width="32px" height="32px" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className={styles.quickActionsSection}>
        <div className={styles.sectionHeader}>
          <SkeletonLoader width="180px" height="1.25rem" />
        </div>
        <div className={styles.quickActionsGrid}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={styles.quickActionCard}>
              <SkeletonLoader variant="circular" width="40px" height="40px" />
              <div style={{ flex: 1 }}>
                <SkeletonLoader width="120px" height="1rem" />
                <div style={{ marginTop: '0.5rem' }}>
                  <SkeletonLoader width="100px" height="0.875rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

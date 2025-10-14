// 💀 src/components/SkeletonLoader.tsx - Modern Skeleton Loader Component
import styles from './SkeletonLoader.module.css';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  className?: string;
}

export default function SkeletonLoader({
  width = '100%',
  height = '1rem',
  variant = 'text',
  className = ''
}: SkeletonLoaderProps) {
  const variantClass = variant === 'text' ? styles.textSkeleton
                      : variant === 'circular' ? styles.circularSkeleton
                      : styles.rectangularSkeleton;

  return (
    <div
      className={`${styles.skeleton} ${variantClass} ${className}`}
      style={{ width, height }}
      aria-label="Loading..."
    />
  );
}

// Compound components for common patterns
export function SkeletonText({ lines = 1, gap = '0.5rem' }: { lines?: number; gap?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          height="0.875rem"
          width={i === lines - 1 && lines > 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = '200px' }: { height?: string }) {
  return (
    <div className={styles.skeletonCard}>
      <SkeletonLoader variant="rectangular" height={height} />
    </div>
  );
}

export function SkeletonAvatar({ size = '40px' }: { size?: string }) {
  return (
    <SkeletonLoader variant="circular" width={size} height={size} />
  );
}

// 📁 frontend/src/components/HeartbeatIcon.tsx
// Legal Pulse 2.0 Phase 3 - Animated Heartbeat Icon

import React from 'react';
import styles from '../styles/HeartbeatIcon.module.css';

interface HeartbeatIconProps {
  healthScore: number;
  riskScore: number;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

const HeartbeatIcon: React.FC<HeartbeatIconProps> = ({
  healthScore,
  riskScore,
  size = 'medium',
  animated = true
}) => {
  // Determine beat speed based on health
  const getBeatSpeed = () => {
    if (healthScore >= 80) return 'slow'; // Healthy = slow, steady beat
    if (healthScore >= 50) return 'normal';
    return 'fast'; // Unhealthy = fast, urgent beat
  };

  // Determine color based on risk
  const getColor = () => {
    if (riskScore < 30) return 'green';
    if (riskScore < 60) return 'yellow';
    return 'red';
  };

  const beatSpeed = getBeatSpeed();
  const color = getColor();
  const sizeClass = styles[`heartbeat-${size}`];
  const animationClass = animated ? styles[`heartbeat-${beatSpeed}`] : '';

  return (
    <div className={`${styles.heartbeatContainer} ${sizeClass}`}>
      <svg
        className={`${styles.heartbeatIcon} ${animationClass} ${styles[`heartbeat-${color}`]}`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Heart shape */}
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="currentColor"
          opacity="0.3"
        />

        {/* Heartbeat line */}
        <path
          className={styles.heartbeatLine}
          d="M2 12h3l2-4 2 8 2-4h11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* Health indicator */}
      <div className={styles.healthIndicator}>
        <span className={styles.healthValue}>{healthScore}</span>
        <span className={styles.healthLabel}>Health</span>
      </div>
    </div>
  );
};

export default HeartbeatIcon;

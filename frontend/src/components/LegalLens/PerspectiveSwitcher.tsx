// 📁 components/LegalLens/PerspectiveSwitcher.tsx
// Komponente für den Perspektiven-Wechsler

import React from 'react';
import type { PerspectiveType } from '../../types/legalLens';
import { PERSPECTIVES } from '../../types/legalLens';
import styles from '../../styles/LegalLens.module.css';

interface PerspectiveSwitcherProps {
  currentPerspective: PerspectiveType;
  onChangePerspective: (perspective: PerspectiveType) => void;
  disabled?: boolean;
}

const PerspectiveSwitcher: React.FC<PerspectiveSwitcherProps> = ({
  currentPerspective,
  onChangePerspective,
  disabled = false
}) => {
  return (
    <div className={styles.perspectiveSwitcher}>
      {PERSPECTIVES.map((perspective) => (
        <button
          key={perspective.id}
          className={`${styles.perspectiveButton} ${currentPerspective === perspective.id ? styles.active : ''}`}
          onClick={() => onChangePerspective(perspective.id)}
          disabled={disabled}
          title={perspective.description}
        >
          <span className={styles.perspectiveIcon}>{perspective.icon}</span>
          <span>{perspective.name}</span>
        </button>
      ))}
    </div>
  );
};

export default PerspectiveSwitcher;

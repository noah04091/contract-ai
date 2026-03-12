import React from 'react';
import { Shield, Scale, UserCheck } from 'lucide-react';
import type { OptimizationMode } from '../../types/optimizerV2';
import { MODE_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  activeMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  compact?: boolean;
}

const MODE_ICONS = {
  neutral: Scale,
  proCreator: Shield,
  proRecipient: UserCheck
};

export default function NegotiationModeSelector({ activeMode, onModeChange, compact }: Props) {
  return (
    <div className={`${styles.modeSelector} ${compact ? styles.modeSelectorCompact : ''}`}>
      {(Object.keys(MODE_LABELS) as OptimizationMode[]).map(mode => {
        const Icon = MODE_ICONS[mode];
        const config = MODE_LABELS[mode];
        const isActive = activeMode === mode;

        return (
          <button
            key={mode}
            className={`${styles.modeButton} ${isActive ? styles.modeButtonActive : ''}`}
            style={isActive ? { borderColor: config.color, backgroundColor: `${config.color}10` } : undefined}
            onClick={() => onModeChange(mode)}
          >
            <Icon size={compact ? 14 : 16} style={isActive ? { color: config.color } : undefined} />
            <span className={styles.modeLabel}>{config.label}</span>
            {!compact && <span className={styles.modeDescription}>{config.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

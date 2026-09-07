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

const MODE_TOOLTIPS: Record<OptimizationMode, string> = {
  neutral: 'Ausgewogen: Formulierungen, die für beide Seiten tragbar sind. Passend für partnerschaftliche Verträge.',
  proCreator: 'Als Anbieter: Stärkt die Seite, die den Vertrag stellt. Engere Haftung, bessere Kündigungsrechte, mehr Schutz.',
  proRecipient: 'Als Kunde: Stärkt die Seite, die unterschreiben soll. Bessere Gewährleistung, fairere Zahlungsbedingungen, mehr Rechte.'
};

export default function NegotiationModeSelector({ activeMode, onModeChange, compact }: Props) {
  return (
    <div className={`${styles.modeSelector} ${compact ? styles.modeSelectorCompact : ''}`}>
      {(Object.keys(MODE_LABELS) as OptimizationMode[]).map(mode => {
        const Icon = MODE_ICONS[mode];
        const config = MODE_LABELS[mode];
        const isActive = activeMode === mode;

        const activeStyle = isActive ? {
          borderColor: config.color,
          boxShadow: `0 0 0 1px ${config.color}, 0 2px 12px ${config.color}20`,
          background: `${config.color}06`
        } : undefined;

        return (
          <button
            key={mode}
            className={`${styles.modeButton} ${isActive ? styles.modeButtonActive : ''}`}
            style={activeStyle}
            onClick={() => onModeChange(mode)}
            title={MODE_TOOLTIPS[mode]}
          >
            <span
              className={styles.modeIconDot}
              style={isActive ? { background: config.color, color: 'white' } : undefined}
            >
              <Icon size={compact ? 13 : 14} />
            </span>
            <span className={styles.modeLabel} style={isActive ? { color: config.color } : undefined}>
              {config.label}
            </span>
            {!compact && <span className={styles.modeDescription}>{config.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

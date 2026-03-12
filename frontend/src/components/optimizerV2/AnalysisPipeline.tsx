import React from 'react';
import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';
import type { StageInfo } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  stages: StageInfo[];
  currentStage: number;
  progress: number;
  message: string;
  onCancel: () => void;
}

export default function AnalysisPipeline({ stages, currentStage, progress, message, onCancel }: Props) {
  return (
    <div className={styles.pipelineContainer}>
      <div className={styles.pipelineHeader}>
        <h2 className={styles.pipelineTitle}>KI-Analyse läuft</h2>
        <button className={styles.cancelButton} onClick={onCancel}>Abbrechen</button>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBar}>
          <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressPercent}>{Math.round(progress)}%</span>
      </div>

      {/* Current message */}
      <p className={styles.progressMessage}>{message}</p>

      {/* Stage indicators */}
      <div className={styles.stageList}>
        {stages.map((stage) => (
          <div key={stage.number} className={`${styles.stageItem} ${styles[`stage_${stage.status}`]}`}>
            <div className={styles.stageIcon}>
              {stage.status === 'completed' && <Check size={14} />}
              {stage.status === 'running' && <Loader2 size={14} className={styles.spinIcon} />}
              {stage.status === 'pending' && <Circle size={14} />}
              {stage.status === 'error' && <AlertCircle size={14} />}
            </div>
            <div className={styles.stageContent}>
              <span className={styles.stageName}>{stage.name}</span>
              <span className={styles.stageDescription}>{stage.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

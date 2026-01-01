// 📁 src/components/InlineAnalysisProgress.tsx
// Kompakte Inline-Analyse-Anzeige - Modern & Professionell

import { motion } from 'framer-motion';
import { FileText, Target, Scale, Sparkles, CheckCircle2, Check } from 'lucide-react';
import styles from './InlineAnalysisProgress.module.css';

interface InlineAnalysisProgressProps {
  progress: number; // 0-100
  fileName?: string;
}

const STEPS = [
  { id: 'upload', label: 'Upload', icon: FileText, threshold: 0 },
  { id: 'type', label: 'Typ erkennen', icon: Target, threshold: 15 },
  { id: 'gaps', label: 'Analyse', icon: Scale, threshold: 35 },
  { id: 'ai', label: 'KI-Optimierung', icon: Sparkles, threshold: 55 },
  { id: 'qc', label: 'Qualitätscheck', icon: CheckCircle2, threshold: 85 },
  { id: 'done', label: 'Fertig', icon: Check, threshold: 100 },
];

export default function InlineAnalysisProgress({ progress }: InlineAnalysisProgressProps) {
  // Finde aktuellen Schritt basierend auf Progress
  const currentStepIndex = STEPS.findIndex((_step, index) => {
    const nextStep = STEPS[index + 1];
    return nextStep ? progress < nextStep.threshold : true;
  });

  const currentStep = STEPS[currentStepIndex] || STEPS[0];
  const CurrentIcon = currentStep.icon;

  return (
    <div className={styles.container}>
      {/* Header mit Icon und Titel */}
      <div className={styles.header}>
        <motion.div
          className={styles.iconWrapper}
          animate={{ rotate: progress < 100 ? 360 : 0 }}
          transition={{ duration: 2, repeat: progress < 100 ? Infinity : 0, ease: "linear" }}
        >
          <CurrentIcon size={20} />
        </motion.div>
        <div className={styles.info}>
          <span className={styles.title}>
            {progress < 100 ? 'Analyse läuft...' : 'Analyse abgeschlossen'}
          </span>
          <span className={styles.step}>{currentStep.label}</span>
        </div>
        <motion.span
          className={styles.percentage}
          key={progress}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {progress}%
        </motion.span>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        <div className={styles.progressGlow} style={{ width: `${progress}%` }} />
      </div>

      {/* Steps Dots */}
      <div className={styles.steps}>
        {STEPS.slice(0, -1).map((step, index) => {
          const StepIcon = step.icon;
          const isDone = progress >= (STEPS[index + 1]?.threshold || 100);
          const isActive = index === currentStepIndex;

          return (
            <div
              key={step.id}
              className={`${styles.stepDot} ${isDone ? styles.done : ''} ${isActive ? styles.active : ''}`}
              title={step.label}
            >
              {isDone ? (
                <Check size={10} />
              ) : (
                <StepIcon size={10} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

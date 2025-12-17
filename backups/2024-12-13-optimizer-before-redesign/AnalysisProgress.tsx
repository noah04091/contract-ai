// 📁 src/components/AnalysisProgress.tsx
// Premium Analysis Progress Component - Apple/Microsoft Level

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Target,
  Scale,
  Sparkles,
  CheckCircle2,
  Check,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import type { AnalysisProgress, AnalysisStep, StepId } from '../types/analysisProgress';
import { formatEta } from '../utils/analysisAdapter';
import styles from '../styles/AnalysisProgress.module.css';

// Icons for each step
const STEP_ICONS: Record<StepId, typeof FileText> = {
  upload: FileText,
  type: Target,
  gaps: Scale,
  ai: Sparkles,
  qc: CheckCircle2,
  done: Check
};

interface AnalysisProgressProps {
  progress: AnalysisProgress;
  onRetry?: (stepId: StepId) => void;
}

export const AnalysisProgressComponent: React.FC<AnalysisProgressProps> = ({
  progress,
  onRetry
}) => {
  const [prevPercent, setPrevPercent] = useState(0);

  // Track progress changes for animations
  useEffect(() => {
    setPrevPercent(progress.percent);
  }, [progress.percent]);

  const currentStep = progress.steps.find(s => s.status === 'active');
  const completedCount = progress.steps.filter(s => s.status === 'done').length;

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      role="status"
      aria-live="polite"
      aria-label={`Analyse läuft: ${progress.percent}% abgeschlossen`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Analyse läuft</h2>
          <p className={styles.subtitle}>
            {currentStep
              ? `Schritt ${completedCount + 1}/${progress.steps.length}: ${currentStep.label}`
              : 'Analyse wird vorbereitet...'}
          </p>
        </div>
        <div className={styles.percentageContainer}>
          <motion.span
            key={progress.percent}
            className={styles.percentage}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {progress.percent}%
          </motion.span>
          {progress.etaSeconds !== undefined && (
            <span className={styles.eta}>
              {formatEta(progress.etaSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBarTrack}>
          <motion.div
            className={styles.progressBarFill}
            initial={{ width: `${prevPercent}%` }}
            animate={{ width: `${progress.percent}%` }}
            transition={{
              duration: 0.26,
              ease: [0.2, 0.8, 0.2, 1]
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className={styles.steps} role="list">
        <AnimatePresence mode="sync">
          {progress.steps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              index={index}
              onRetry={onRetry}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Individual Step Component
interface StepItemProps {
  step: AnalysisStep;
  index: number;
  onRetry?: (stepId: StepId) => void;
}

const StepItem: React.FC<StepItemProps> = ({ step, index, onRetry }) => {
  const Icon = STEP_ICONS[step.id];
  const isDone = step.status === 'done';
  const isActive = step.status === 'active';
  const hasError = step.status === 'error';
  const hasWarning = step.status === 'warn';

  // Use matchMedia for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      className={`${styles.step} ${styles[step.status]}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.3,
        delay: prefersReducedMotion ? 0 : index * 0.06, // 60ms stagger
        ease: [0.2, 0.8, 0.2, 1]
      }}
      role="listitem"
      aria-label={`${step.label}: ${step.status === 'done' ? 'abgeschlossen' : step.status === 'active' ? 'aktiv' : 'wartend'}`}
    >
      {/* Step Indicator */}
      <div className={styles.stepIndicator}>
        {isDone ? (
          <motion.div
            className={styles.checkIcon}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              duration: prefersReducedMotion ? 0 : 0.12
            }}
          >
            <Check size={16} />
          </motion.div>
        ) : hasError ? (
          <AlertCircle size={16} />
        ) : hasWarning ? (
          <AlertTriangle size={16} />
        ) : (
          <Icon size={16} />
        )}

        {/* Pulsing indicator for active step */}
        {isActive && !prefersReducedMotion && (
          <motion.div
            className={styles.activePulse}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 0, 0.4]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <span className={styles.stepLabel}>{step.label}</span>

          {/* Duration for completed steps */}
          {isDone && step.durationMs && (
            <span className={styles.duration}>
              {(step.durationMs / 1000).toFixed(1)}s
            </span>
          )}

          {/* Warning badge */}
          {hasWarning && step.warnings && (
            <span className={styles.warningBadge}>
              {step.warnings} {step.warnings === 1 ? 'Hinweis' : 'Hinweise'}
            </span>
          )}
        </div>

        {/* Subtext */}
        {step.subtext && (
          <span className={styles.stepSubtext}>{step.subtext}</span>
        )}

        {/* Error handling */}
        {hasError && step.error && (
          <motion.div
            className={styles.errorContainer}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <p className={styles.errorMessage}>{step.error.message}</p>
            <div className={styles.errorActions}>
              {step.error.logUrl && (
                <a
                  href={step.error.logUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.logLink}
                >
                  Logs anzeigen
                  <ExternalLink size={14} />
                </a>
              )}
              {onRetry && (
                <button
                  onClick={() => onRetry(step.id)}
                  className={styles.retryButton}
                  aria-label={`${step.label} erneut versuchen`}
                >
                  <RefreshCw size={14} />
                  Erneut versuchen
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AnalysisProgressComponent;

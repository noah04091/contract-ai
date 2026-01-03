// 📁 frontend/src/components/Tour/ProductTour.tsx
// 🎯 Product Tour Component - Wraps react-joyride with custom styling

import Joyride, { TooltipRenderProps } from 'react-joyride';
import { motion } from 'framer-motion';
import { useTour } from '../../hooks/useTour';
import type { TourId } from '../../config/tourConfig';
import styles from './ProductTour.module.css';

interface ProductTourProps {
  tourId: TourId;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

// Custom Tooltip Component
function CustomTooltip({
  index,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) {
  return (
    <motion.div
      {...tooltipProps}
      className={styles.tooltip}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Progress indicator */}
      <div className={styles.progress}>
        {Array.from({ length: size }).map((_, i) => (
          <div
            key={i}
            className={`${styles.progressDot} ${i <= index ? styles.active : ''}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {step.title && <h3 className={styles.title}>{step.title}</h3>}
        <p className={styles.description}>{step.content}</p>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button {...skipProps} className={styles.skipButton}>
          Tour beenden
        </button>

        <div className={styles.navButtons}>
          {index > 0 && (
            <button {...backProps} className={styles.backButton}>
              Zurück
            </button>
          )}
          <button {...primaryProps} className={styles.nextButton}>
            {isLastStep ? 'Fertig' : 'Weiter'}
          </button>
        </div>
      </div>

      {/* Step counter */}
      <div className={styles.stepCounter}>
        {index + 1} / {size}
      </div>
    </motion.div>
  );
}

export function ProductTour({
  tourId,
  autoStart = true,
  onComplete,
  onSkip,
}: ProductTourProps) {
  const {
    isRunning,
    stepIndex,
    handleJoyrideCallback,
    tour,
    isLoading,
  } = useTour({
    tourId,
    autoStart,
    onComplete,
    onSkip,
  });

  // Don't render if loading or no tour
  if (isLoading || !tour) {
    return null;
  }

  return (
    <Joyride
      steps={tour.steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      floaterProps={{
        disableAnimation: false,
      }}
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: 8,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
      locale={{
        back: 'Zurück',
        close: 'Schließen',
        last: 'Fertig',
        next: 'Weiter',
        skip: 'Tour beenden',
      }}
    />
  );
}

export default ProductTour;

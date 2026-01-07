// 📁 frontend/src/components/Tour/ProductTour.tsx
// 🎯 Product Tour Component - Wraps react-joyride with custom styling

import { useEffect } from 'react';
import Joyride, { TooltipRenderProps } from 'react-joyride';
import { motion } from 'framer-motion';
import { useTour } from '../../hooks/useTour';
import type { TourId } from '../../config/tourConfig';
import styles from './ProductTour.module.css';

// 🔧 FIX: Injectiere CSS für center-placement Zentrierung
// React-joyride nutzt react-floater, das .__floater Klassen verwendet
const CENTERING_STYLE_ID = 'joyride-center-fix';

function injectCenteringStyles() {
  if (document.getElementById(CENTERING_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = CENTERING_STYLE_ID;
  style.textContent = `
    /* Fix: Zentriere Tooltip bei center placement */
    .__floater.__floater__open[data-placement="center"] {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      right: auto !important;
      bottom: auto !important;
    }

    /* Fallback: Wenn target=body, auch zentrieren */
    .react-joyride__spotlight[style*="width: 100%"][style*="height: 100%"] ~ .__floater {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
    }
  `;
  document.head.appendChild(style);
}

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
  // 🔧 FIX: Bei center placement eigene Zentrierung verwenden
  const isCentered = step.placement === 'center';

  // Für center placement: tooltipProps überschreiben mit fixer Zentrierung
  const finalTooltipProps = isCentered
    ? {
        ...tooltipProps,
        style: {
          // Überschreibe alle inline styles von react-floater
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          // Andere styles behalten
          ...(tooltipProps.style || {}),
          // Diese MÜSSEN überschrieben werden (nach spread)
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
      }
    : tooltipProps;

  return (
    <motion.div
      {...finalTooltipProps}
      className={`${styles.tooltip} ${isCentered ? styles.centered : ''}`}
      initial={{ opacity: 0, scale: 0.9, y: isCentered ? 0 : 10 }}
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

  // 🔧 FIX: Inject centering styles on mount
  useEffect(() => {
    injectCenteringStyles();
  }, []);

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
      // 🔧 Joyride Positionierung
      scrollOffset={100}                // Offset beim Scrollen
      floaterProps={{
        disableAnimation: false,
        hideArrow: true, // Arrow bei center placement verstecken
        styles: {
          floater: {
            filter: 'none',
          },
          // 🔧 FIX: Explizite Zentrierung für center placement
          floaterWithComponent: {
            maxWidth: 'none',
          },
        },
        // 🔧 FIX: Offset auf 0 setzen für echte Zentrierung
        offset: 0,
      }}
      styles={{
        options: {
          zIndex: 99999,  // 🔧 Höher als alle anderen Elemente
          primaryColor: '#3B82F6',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          mixBlendMode: 'normal' as const,
        },
        tooltip: {
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
        tooltipContainer: {
          textAlign: 'left' as const,
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

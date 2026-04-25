// 📁 frontend/src/components/Tour/ProductTour.tsx
// 🎯 Product Tour Component - Wraps react-joyride with custom styling

import React from 'react';
import { createPortal } from 'react-dom';
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
  const isCentered = step.placement === 'center';

  // Tooltip-Inhalt (wird animiert)
  const tooltipContent = (
    <motion.div
      className={styles.tooltip}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
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

  // 🔧 FIX: Bei center placement - Wrapper für Zentrierung mit INLINE STYLES
  // Inline-styles haben höchste Priorität und können nicht durch CSS überschrieben werden
  if (isCentered) {
    console.log('🎯 [Tour] Rendering CENTERED tooltip via Portal');
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          pointerEvents: 'none',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ pointerEvents: 'auto' }}>
          {tooltipContent}
        </div>
      </div>,
      document.body
    );
  }

  // Normal positioning für non-center steps (verwendet tooltipProps von react-floater)
  return (
    <div {...tooltipProps}>
      {tooltipContent}
    </div>
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

  // Highlight-Effekt auf das aktuelle Ziel-Element
  React.useEffect(() => {
    if (!isRunning || !tour) return;
    const step = tour.steps[stepIndex];
    if (!step?.target || typeof step.target !== 'string') return;

    const el = document.querySelector(step.target) as HTMLElement;
    if (!el) return;

    // Style injizieren
    el.style.outline = '2px solid #3B82F6';
    el.style.outlineOffset = '4px';
    el.style.borderRadius = '12px';
    el.style.transition = 'outline 0.3s ease';

    return () => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.borderRadius = '';
      el.style.transition = '';
    };
  }, [isRunning, stepIndex, tour]);

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
      disableOverlay
      spotlightClicks
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      scrollOffset={100}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: 12,
      }}
      styles={{
        options: {
          zIndex: 99999,
          primaryColor: '#3B82F6',
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

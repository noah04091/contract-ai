// 📁 frontend/src/components/Tour/SimpleTour.tsx
// 🎯 Simple, Reliable Tour System - No react-joyride dependencies
// Uses fixed positioning and manual element highlighting for 100% reliability

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTour } from '../../hooks/useTour';
import type { TourId } from '../../config/tourConfig';
import styles from './SimpleTour.module.css';

interface SimpleTourProps {
  tourId: TourId;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SimpleTour({
  tourId,
  autoStart = true,
  onComplete,
  onSkip,
}: SimpleTourProps) {
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

  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Get current step
  const currentStep = tour?.steps[stepIndex];

  // Calculate target element position (viewport coordinates for fixed positioning)
  const updateTargetPosition = useCallback(() => {
    if (!currentStep?.target || currentStep.target === 'body') {
      setTargetRect(null);
      return;
    }

    const selector = currentStep.target as string;
    const element = document.querySelector(selector);

    if (element) {
      const rect = element.getBoundingClientRect();
      // Use viewport coordinates directly (for position: fixed)
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Update position on step change and window resize
  useEffect(() => {
    if (!isRunning) return;

    updateTargetPosition();

    // Update on resize
    const handleResize = () => updateTargetPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    // ResizeObserver for element size changes
    if (currentStep?.target && currentStep.target !== 'body') {
      const element = document.querySelector(currentStep.target as string);
      if (element) {
        observerRef.current = new ResizeObserver(updateTargetPosition);
        observerRef.current.observe(element);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      observerRef.current?.disconnect();
    };
  }, [isRunning, stepIndex, updateTargetPosition, currentStep]);

  // Bring target element to front (above overlay)
  useEffect(() => {
    if (!isRunning || !currentStep?.target || currentStep.target === 'body') return;

    const element = document.querySelector(currentStep.target as string) as HTMLElement;
    if (!element) return;

    // Save original styles
    const originalPosition = element.style.position;
    const originalZIndex = element.style.zIndex;

    // Just bring to front, no other effects
    element.style.position = 'relative';
    element.style.zIndex = '99992';

    return () => {
      element.style.position = originalPosition;
      element.style.zIndex = originalZIndex;
    };
  }, [isRunning, stepIndex, currentStep]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (!tour) return;

    if (stepIndex < tour.steps.length - 1) {
      // Simulate joyride callback for step change
      handleJoyrideCallback({
        action: 'next',
        index: stepIndex,
        type: 'step:after',
        status: 'running',
        controlled: true,
        lifecycle: 'complete',
        size: tour.steps.length,
        step: tour.steps[stepIndex],
        origin: null,
      } as any);
    } else {
      // Complete tour
      handleJoyrideCallback({
        action: 'next',
        index: stepIndex,
        type: 'tour:end',
        status: 'finished',
        controlled: true,
        lifecycle: 'complete',
        size: tour.steps.length,
        step: tour.steps[stepIndex],
        origin: null,
      } as any);
    }
  }, [stepIndex, tour, handleJoyrideCallback]);

  // Handle previous step
  const handleBack = useCallback(() => {
    if (!tour || stepIndex <= 0) return;

    handleJoyrideCallback({
      action: 'prev',
      index: stepIndex,
      type: 'step:before',
      status: 'running',
      controlled: true,
      lifecycle: 'complete',
      size: tour.steps.length,
      step: tour.steps[stepIndex],
      origin: null,
    } as any);
  }, [stepIndex, tour, handleJoyrideCallback]);

  // Handle skip/close
  const handleClose = useCallback(() => {
    handleJoyrideCallback({
      action: 'skip',
      index: stepIndex,
      type: 'tour:end',
      status: 'skipped',
      controlled: true,
      lifecycle: 'complete',
      size: tour?.steps.length || 0,
      step: tour?.steps[stepIndex] || {} as any,
      origin: null,
    } as any);
  }, [stepIndex, tour, handleJoyrideCallback]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRunning) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, handleClose]);

  // Don't render if not running or loading
  if (!mounted || isLoading || !isRunning || !tour || !currentStep) {
    return null;
  }

  const totalSteps = tour.steps.length;

  const tourContent = (
    <AnimatePresence>
      {isRunning && (
        <>
          {/* Dark Overlay - only when NO target element */}
          {!targetRect && (
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
          )}

          {/* Spotlight - creates dark overlay WITH hole for target */}
          {targetRect && (
            <motion.div
              className={styles.spotlight}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
              transition={{ duration: 0.3 }}
              onClick={handleClose}
            />
          )}

          {/* Tooltip - Always centered in viewport */}
          <motion.div
            className={styles.tooltipContainer}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.tooltip}>
              {/* Close button */}
              <button className={styles.closeBtn} onClick={handleClose}>
                <X size={18} />
              </button>

              {/* Progress dots */}
              <div className={styles.progress}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.dot} ${i === stepIndex ? styles.active : ''} ${i < stepIndex ? styles.completed : ''}`}
                  />
                ))}
              </div>

              {/* Content */}
              <div className={styles.content}>
                {currentStep.title && (
                  <h3 className={styles.title}>{currentStep.title}</h3>
                )}
                <p className={styles.description}>{currentStep.content}</p>
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                <button className={styles.skipBtn} onClick={handleClose}>
                  Tour beenden
                </button>
                <div className={styles.navBtns}>
                  {stepIndex > 0 && (
                    <button className={styles.backBtn} onClick={handleBack}>
                      Zurück
                    </button>
                  )}
                  <button className={styles.nextBtn} onClick={handleNext}>
                    {stepIndex === totalSteps - 1 ? 'Fertig' : 'Weiter'}
                  </button>
                </div>
              </div>

              {/* Step counter */}
              <div className={styles.stepCounter}>
                {stepIndex + 1} / {totalSteps}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body level
  return createPortal(tourContent, document.body);
}

export default SimpleTour;

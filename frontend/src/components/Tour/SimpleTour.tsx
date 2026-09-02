// 📁 frontend/src/components/Tour/SimpleTour.tsx
// 🎯 Simple, Reliable Tour System - No react-joyride dependencies
// Uses fixed positioning and manual element highlighting for 100% reliability

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { CallBackProps } from 'react-joyride';
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

  // 📱 27.08.2026 (Noahs Handy-Test): Auf dem Handy zeigt die Tour KEINE Elemente
  // mehr, sondern nur noch ihre Karten. Grund ist nicht Bequemlichkeit, sondern
  // dass das Hervorheben dort schlicht nicht funktioniert:
  //   · Viele Ziele sind gar nicht sichtbar (Seitenleiste, breite Werkzeugleiste).
  //   · Sichtbare Ziele liegen oft ausserhalb des Ausschnitts, man müsste scrollen.
  //   · Das Herausheben per z-index reisst das Element aus seinem Zusammenhang —
  //     auf Noahs Screenshot schwebte "Datei hierher ziehen" oben über allem.
  // Der Text der Schritte trägt sich auch ohne Hervorhebung; er beschreibt, was es
  // gibt, statt auf einen Punkt zu deuten.
  const [istHandy, setIstHandy] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const beiWechsel = (e: MediaQueryListEvent) => setIstHandy(e.matches);
    mq.addEventListener('change', beiWechsel);
    return () => mq.removeEventListener('change', beiWechsel);
  }, []);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Get current step
  const currentStep = tour?.steps[stepIndex];

  // Calculate target element position (viewport coordinates for fixed positioning)
  const updateTargetPosition = useCallback(() => {
    // Auf dem Handy gibt es keine Hervorhebung (Begründung oben bei istHandy).
    if (istHandy || !currentStep?.target || currentStep.target === 'body') {
      setTargetRect(null);
      return;
    }

    const selector = currentStep.target as string;
    const element = document.querySelector(selector);

    // ⚠️ 27.08.2026 (Noahs Handy-Test): Es genügt nicht, dass das Element im
    // Dokument EXISTIERT — es muss auch sichtbar sein. Die Seitenleiste steht auf
    // dem Handy zwar im Dokument, ist aber ausgeblendet; getBoundingClientRect
    // liefert dann lauter Nullen, und die Tour zeichnete eine Hervorhebung der
    // Größe null. Für den Nutzer sah es aus, als würde nichts hervorgehoben oder
    // als säße der Rahmen an einer sinnlosen Stelle.
    // Ohne sichtbares Ziel wird der Schritt jetzt wie ein zielloser behandelt:
    // die Karte steht mittig, ohne falsche Hervorhebung.
    const sichtbar = element instanceof HTMLElement
      && element.getClientRects().length > 0
      && element.offsetWidth > 0
      && element.offsetHeight > 0;

    if (element && sichtbar) {
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
  }, [currentStep, istHandy]);

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
    // Auf dem Handy NICHT herausheben: Das riss das Element aus seinem Zusammenhang
    // und liess es an unpassender Stelle über allem schweben (Noahs Screenshot).
    if (istHandy) return;
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
    // istHandy in den Abhängigkeiten: Dreht jemand das Gerät oder ändert die
    // Fenstergröße, muss das Herausheben sofort greifen bzw. entfallen.
  }, [isRunning, stepIndex, currentStep, istHandy]);

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
      } as CallBackProps);
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
      } as CallBackProps);
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
    } as CallBackProps);
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
      step: tour?.steps[stepIndex] || ({} as CallBackProps['step']),
      origin: null,
    } as CallBackProps);
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

          {/* Tooltip - Transform-basierte Zentrierung auf WRAPPER (nicht motion.div!)
              So kann framer-motion das transform nicht überschreiben */}
          {/* ⚠️ 27.08.2026 (Noahs Handy-Screenshot: "Dein / Command / Center" auf drei
              Zeilen): Dieser Wrapper hatte KEINE Breite. Die Handy-Regel der Karte
              (width: 100%) bezog sich damit auf einen Rahmen, der selbst nur so breit
              ist wie sein Inhalt — die Angabe war zirkulär und wirkungslos. Zusammen
              mit min-width: 0 schrumpfte die Karte auf die Breite des längsten Wortes.
              Jetzt hat der Wrapper eine echte Breite: auf großen Bildschirmen 420 Pixel,
              auf dem Handy die Bildschirmbreite abzüglich 32 Pixel Rand.
              dvh statt vh, damit die Karte nicht hinter den Browserleisten sitzt. */}
          <div
            style={{
              position: 'fixed',
              top: '50dvh',
              left: '50vw',
              transform: 'translate(-50%, -50%)',
              width: 'min(420px, calc(100vw - 32px))',
              maxHeight: 'calc(100dvh - 32px)',
              zIndex: 99999,
            }}
          >
            <motion.div
              className={styles.tooltip}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
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

            </motion.div>

            {/* Step counter — 02.09.2026 (Noahs Fund: Karte war um 36px scrollbar).
                Der Zähler hing vorher als absolut positioniertes Kind 36px UNTER der
                Karte. Seit die Karte overflow-y: auto hat (27.08., lange Texte auf dem
                Handy), zählt so ein Kind zum scrollbaren Bereich, und der Zähler liess
                sich in die Karte hineinscrollen (bei jedem Schritt aufs Neue).
                Jetzt ist er ein Geschwister der Karte in diesem Wrapper, der kein
                overflow hat. Optik unverändert: mittig, 7px unter der Karte. */}
            <div className={styles.stepCounterWrap}>
              <div className={styles.stepCounter}>
                {stepIndex + 1} / {totalSteps}
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body level
  return createPortal(tourContent, document.body);
}

export default SimpleTour;

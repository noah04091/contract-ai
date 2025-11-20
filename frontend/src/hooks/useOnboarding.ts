// 📁 frontend/src/hooks/useOnboarding.ts
// Hook für Onboarding-Tour State Management

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'contractai_onboarding_completed';
const ONBOARDING_VERSION = '1.0'; // Erhöhen wenn Tour aktualisiert wird

export function useOnboarding() {
  const [runTour, setRunTour] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Prüfe ob User die Tour bereits gesehen hat
  useEffect(() => {
    const completedVersion = localStorage.getItem(ONBOARDING_KEY);

    // Noch nie gesehen oder veraltete Version
    if (!completedVersion || completedVersion !== ONBOARDING_VERSION) {
      setIsFirstVisit(true);
      // Verzögerung, damit Seite vollständig geladen ist
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Tour manuell starten
  const startTour = () => {
    setRunTour(true);
  };

  // Tour beenden und als abgeschlossen markieren
  const finishTour = () => {
    setRunTour(false);
    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
    setIsFirstVisit(false);
  };

  // Tour überspringen
  const skipTour = () => {
    setRunTour(false);
    localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
    setIsFirstVisit(false);
  };

  // Tour zurücksetzen (für Testing oder "Tour erneut anzeigen")
  const resetTour = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsFirstVisit(true);
    setRunTour(true);
  };

  return {
    runTour,
    isFirstVisit,
    startTour,
    finishTour,
    skipTour,
    resetTour
  };
}

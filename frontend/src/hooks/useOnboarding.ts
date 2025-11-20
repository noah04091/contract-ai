// 📁 frontend/src/hooks/useOnboarding.ts
// Hook für Onboarding-Tour State Management (Pro-Seite)

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ONBOARDING_KEY = 'contractai_onboarding_tours';
const ONBOARDING_VERSION = '1.0';

interface CompletedTours {
  [path: string]: string; // path -> version
}

export function useOnboarding() {
  const location = useLocation();
  const [runTour, setRunTour] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Prüfe ob User die Tour für diese Seite bereits gesehen hat
  useEffect(() => {
    const currentPath = location.pathname;

    // Lade gespeicherte Tours
    const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
    const completedTours: CompletedTours = savedToursJson ? JSON.parse(savedToursJson) : {};

    // Prüfe ob Tour für diese Seite bereits abgeschlossen
    const tourVersion = completedTours[currentPath];

    // Noch nie gesehen oder veraltete Version für diese Seite
    if (!tourVersion || tourVersion !== ONBOARDING_VERSION) {
      setIsFirstVisit(true);
      // Verzögerung, damit Seite vollständig geladen ist
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1500); // Etwas länger, damit Elemente geladen sind
      return () => clearTimeout(timer);
    } else {
      setIsFirstVisit(false);
      setRunTour(false);
    }
  }, [location.pathname]);

  // Tour manuell starten
  const startTour = () => {
    setRunTour(true);
  };

  // Tour beenden und als abgeschlossen markieren (nur für aktuelle Seite!)
  const finishTour = () => {
    setRunTour(false);

    const currentPath = location.pathname;
    const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
    const completedTours: CompletedTours = savedToursJson ? JSON.parse(savedToursJson) : {};

    // Markiere nur diese Seite als abgeschlossen
    completedTours[currentPath] = ONBOARDING_VERSION;
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedTours));

    setIsFirstVisit(false);
  };

  // Tour überspringen (nur für aktuelle Seite)
  const skipTour = () => {
    setRunTour(false);

    const currentPath = location.pathname;
    const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
    const completedTours: CompletedTours = savedToursJson ? JSON.parse(savedToursJson) : {};

    // Markiere nur diese Seite als abgeschlossen
    completedTours[currentPath] = ONBOARDING_VERSION;
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedTours));

    setIsFirstVisit(false);
  };

  // Tour zurücksetzen (für Testing oder "Tour erneut anzeigen")
  const resetTour = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsFirstVisit(true);
    setRunTour(true);
  };

  // Einzelne Seite zurücksetzen
  const resetPageTour = (path?: string) => {
    const targetPath = path || location.pathname;
    const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
    const completedTours: CompletedTours = savedToursJson ? JSON.parse(savedToursJson) : {};

    delete completedTours[targetPath];
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedTours));

    if (targetPath === location.pathname) {
      setIsFirstVisit(true);
      setRunTour(true);
    }
  };

  return {
    runTour,
    isFirstVisit,
    startTour,
    finishTour,
    skipTour,
    resetTour,
    resetPageTour
  };
}

// 📁 frontend/src/hooks/useOnboarding.ts
// Hook für Onboarding-Tour State Management (Pro-Seite)
// WICHTIG: Tour erscheint NUR EINMAL pro Seite - danach NIE wieder!

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ONBOARDING_KEY = 'contractai_onboarding_completed';

interface CompletedTours {
  [path: string]: boolean; // path -> true (gesehen) - PERMANENT!
}

// Helper: Normalisiert Pfade für konsistente Speicherung
const normalizePath = (path: string): string => {
  // Entferne trailing slashes und lowercase
  return path.replace(/\/+$/, '').toLowerCase() || '/';
};

export function useOnboarding() {
  const location = useLocation();
  const [runTour, setRunTour] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const hasCheckedRef = useRef<string | null>(null);

  // Prüfe ob User die Tour für diese Seite bereits gesehen hat
  useEffect(() => {
    const currentPath = normalizePath(location.pathname);

    // Verhindere doppelte Checks für den gleichen Pfad
    if (hasCheckedRef.current === currentPath) {
      return;
    }
    hasCheckedRef.current = currentPath;

    // Lade gespeicherte Tours
    let completedTours: CompletedTours = {};
    try {
      const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
      if (savedToursJson) {
        completedTours = JSON.parse(savedToursJson);
      }
    } catch (e) {
      // Bei korrupten Daten: nichts tun, Tour wird angezeigt
      console.warn('Onboarding localStorage corrupt, resetting');
    }

    // STRIKTE REGEL: Einmal gesehen = FÜR IMMER gesehen
    const alreadySeen = completedTours[currentPath] === true;

    if (alreadySeen) {
      // Tour wurde bereits gesehen - NIEMALS wieder anzeigen
      setIsFirstVisit(false);
      setRunTour(false);
      return;
    }

    // Erster Besuch dieser Seite
    setIsFirstVisit(true);

    // Dashboard braucht länger (Charts laden), andere Seiten schneller
    const delay = currentPath === '/dashboard' ? 3000 : 1000;

    const timer = setTimeout(() => {
      // Nochmal prüfen ob nicht zwischenzeitlich gespeichert wurde
      try {
        const freshData = localStorage.getItem(ONBOARDING_KEY);
        const freshTours: CompletedTours = freshData ? JSON.parse(freshData) : {};
        if (freshTours[currentPath] === true) {
          setRunTour(false);
          return;
        }
      } catch (e) {
        // Ignorieren
      }
      setRunTour(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Tour manuell starten (nur für Debug/Testing)
  const startTour = () => {
    setRunTour(true);
  };

  // PERMANENT speichern: Diese Seite wurde gesehen
  const markAsCompleted = (path: string) => {
    const normalizedPath = normalizePath(path);
    let completedTours: CompletedTours = {};

    try {
      const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
      if (savedToursJson) {
        completedTours = JSON.parse(savedToursJson);
      }
    } catch (e) {
      // Bei Fehler: neues Objekt
    }

    // PERMANENT markieren - wird NIE wieder angezeigt
    completedTours[normalizedPath] = true;
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedTours));
  };

  // Tour beenden und als PERMANENT abgeschlossen markieren
  const finishTour = () => {
    setRunTour(false);
    setIsFirstVisit(false);
    markAsCompleted(location.pathname);
  };

  // Tour überspringen = auch PERMANENT abgeschlossen
  const skipTour = () => {
    setRunTour(false);
    setIsFirstVisit(false);
    markAsCompleted(location.pathname);
  };

  // Tour zurücksetzen (NUR für Development/Testing!)
  const resetTour = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    hasCheckedRef.current = null;
    setIsFirstVisit(true);
    setRunTour(true);
  };

  // Einzelne Seite zurücksetzen (NUR für Development/Testing!)
  const resetPageTour = (path?: string) => {
    const targetPath = normalizePath(path || location.pathname);

    try {
      const savedToursJson = localStorage.getItem(ONBOARDING_KEY);
      const completedTours: CompletedTours = savedToursJson ? JSON.parse(savedToursJson) : {};

      delete completedTours[targetPath];
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(completedTours));

      if (normalizePath(location.pathname) === targetPath) {
        hasCheckedRef.current = null;
        setIsFirstVisit(true);
        setRunTour(true);
      }
    } catch (e) {
      // Ignorieren
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

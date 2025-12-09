// 📁 frontend/src/hooks/useOnboarding.ts
// Hook für Onboarding-Tour State Management (Pro-Seite)
// WICHTIG: Tour erscheint NUR EINMAL pro Seite - danach NIE wieder!
// ✅ V3: Serverseitige Speicherung - funktioniert über alle Browser/Geräte hinweg

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Helper: Normalisiert Pfade für konsistente Speicherung
const normalizePath = (path: string): string => {
  // Entferne trailing slashes und lowercase
  return path.replace(/\/+$/, '').toLowerCase() || '/';
};

// Helper: Auth-Token aus localStorage holen
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Helper: completedTours aus User-Daten holen (über /auth/me)
const fetchCompletedTours = async (): Promise<string[]> => {
  const token = getAuthToken();
  if (!token) return [];

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.user?.completedTours || [];
  } catch {
    return [];
  }
};

// Helper: Tour als abgeschlossen markieren (API-Call)
const markTourCompletedOnServer = async (path: string): Promise<boolean> => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/api/auth/complete-tour`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    });

    return response.ok;
  } catch {
    return false;
  }
};

export function useOnboarding() {
  const location = useLocation();
  const [runTour, setRunTour] = useState(false);
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Beim ersten Laden: completedTours vom Server holen
  useEffect(() => {
    let isMounted = true;

    const loadCompletedTours = async () => {
      const tours = await fetchCompletedTours();
      if (isMounted) {
        setCompletedTours(tours);
        setIsLoading(false);
      }
    };

    loadCompletedTours();

    return () => {
      isMounted = false;
    };
  }, []);

  // Beim Laden der Seite: Prüfe ob Tour angezeigt werden soll
  useEffect(() => {
    // Warten bis completedTours geladen sind
    if (isLoading) return;

    const currentPath = normalizePath(location.pathname);

    // Sofort prüfen ob bereits gesehen
    if (completedTours.includes(currentPath)) {
      setRunTour(false);
      return;
    }

    // Nur eingeloggte User bekommen die Tour
    const token = getAuthToken();
    if (!token) {
      setRunTour(false);
      return;
    }

    // Kurze Verzögerung damit die Seite erst laden kann
    const timer = setTimeout(() => {
      // Nochmal prüfen
      if (!completedTours.includes(currentPath)) {
        setRunTour(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname, completedTours, isLoading]);

  // Tour beenden und als PERMANENT abgeschlossen markieren (serverseitig!)
  const finishTour = useCallback(async () => {
    setRunTour(false);
    const currentPath = normalizePath(location.pathname);

    // Optimistisch: Sofort lokal als abgeschlossen markieren
    setCompletedTours(prev => [...prev, currentPath]);

    // Dann auf Server speichern
    await markTourCompletedOnServer(currentPath);
  }, [location.pathname]);

  // Tour überspringen = auch PERMANENT abgeschlossen (serverseitig!)
  const skipTour = useCallback(async () => {
    setRunTour(false);
    const currentPath = normalizePath(location.pathname);

    // Optimistisch: Sofort lokal als abgeschlossen markieren
    setCompletedTours(prev => [...prev, currentPath]);

    // Dann auf Server speichern
    await markTourCompletedOnServer(currentPath);
  }, [location.pathname]);

  // Tour manuell starten (nur für Debug/Testing)
  const startTour = useCallback(() => {
    setRunTour(true);
  }, []);

  // Alle Tours zurücksetzen (NUR für Development/Testing!)
  // Hinweis: Diese Funktion löscht NICHT die Server-Daten, nur lokal
  const resetAllTours = useCallback(() => {
    setCompletedTours([]);
    setRunTour(true);
  }, []);

  return {
    runTour,
    finishTour,
    skipTour,
    startTour,
    resetAllTours,
    isLoading // Optional: Falls UI darauf reagieren soll
  };
}

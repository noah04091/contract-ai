// 📁 frontend/src/hooks/useOnboarding.ts
// Enterprise Onboarding System v3.0 - React Hook
// 🔄 Mit Event-basierter Synchronisation zwischen Instanzen

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type {
  OnboardingState,
  OnboardingStatusResponse,
} from '../types/onboarding';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// 🔄 Custom Event für Synchronisation zwischen useOnboarding Instanzen
// Wenn eine Instanz den Status ändert (complete/skip), sollen alle anderen
// Instanzen ihre Daten neu laden.
const ONBOARDING_SYNC_EVENT = 'onboarding-state-sync';

/**
 * 🔄 Utility-Funktion zum Auslösen eines Onboarding-Sync-Events
 * Kann von anderen Komponenten aufgerufen werden (z.B. nach Analyse, Upload, etc.)
 * um alle useOnboarding-Instanzen zum Neu-Laden zu veranlassen.
 */
export function triggerOnboardingSync(): void {
  console.log('🔄 [Onboarding] Manual sync triggered');
  window.dispatchEvent(new Event(ONBOARDING_SYNC_EVENT));
}

// Helper to get token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

interface UseOnboardingReturn {
  // State
  onboardingState: OnboardingState | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  shouldShowModal: boolean;
  shouldShowChecklist: boolean;
  checklistProgress: number;
  checklistTotal: number;

  // Actions
  startOnboarding: () => Promise<void>;
  completeStep: (stepId: string, data?: Record<string, unknown>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  markFeatureSeen: (featureId: string) => Promise<void>;
  updateChecklistItem: (itemId: string) => Promise<void>;
  updatePreferences: (showTooltips: boolean) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  refetch: () => Promise<void>;
  hideChecklist: () => Promise<void>;  // 🆕 Dauerhaft ausblenden
  showChecklist: () => Promise<void>;  // 🆕 Wieder einblenden
}

export function useOnboarding(): UseOnboardingReturn {
  const { user } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [shouldShowChecklist, setShouldShowChecklist] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState(0);
  const [checklistTotal, setChecklistTotal] = useState(5);

  // Fetch current onboarding status
  const fetchStatus = useCallback(async () => {
    const token = getToken();
    console.log('🎓 [Onboarding] fetchStatus called, token:', token ? 'present' : 'missing');

    if (!token) {
      console.log('🎓 [Onboarding] No token, skipping fetch');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/onboarding/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding status');
      }

      const data: OnboardingStatusResponse = await response.json();
      console.log('🎓 [Onboarding] API Response:', {
        status: data.status,
        shouldShowModal: data.shouldShowModal,
        shouldShowChecklist: data.shouldShowChecklist
      });

      setOnboardingState({
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        skippedAt: data.skippedAt,
        completedSteps: data.completedSteps,
        profile: data.profile,
        seenFeatures: data.seenFeatures,
        showTooltips: data.showTooltips,
        checklist: data.checklist
      });

      setShouldShowModal(data.shouldShowModal);
      setShouldShowChecklist(data.shouldShowChecklist);
      setChecklistProgress(data.checklistProgress);
      setChecklistTotal(data.checklistTotal);
    } catch (err) {
      console.error('🎓 [Onboarding] Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + re-fetch when user changes (e.g., after login)
  useEffect(() => {
    console.log('🎓 [Onboarding] Initial/User-change effect, user:', user?.email || 'null');
    fetchStatus();
  }, [fetchStatus, user?.email]); // Re-fetch when user email changes (login/logout)

  // 🔄 Event-Listener für Synchronisation zwischen Instanzen
  // Wenn eine andere useOnboarding-Instanz den Status ändert (complete/skip),
  // laden wir unsere Daten neu um synchron zu bleiben.
  useEffect(() => {
    const handleSyncEvent = () => {
      console.log('🔄 [Onboarding] Sync event received, refetching status...');
      fetchStatus();
    };

    window.addEventListener(ONBOARDING_SYNC_EVENT, handleSyncEvent);
    return () => window.removeEventListener(ONBOARDING_SYNC_EVENT, handleSyncEvent);
  }, [fetchStatus]);

  // Also sync checklist progress from user object if available
  // ⚠️ WICHTIG: shouldShowModal wird NICHT von user.onboarding gesetzt!
  // Nur die API ist die "Single Source of Truth" für shouldShowModal.
  // user.onboarding kann stale sein nach Skip/Complete.
  useEffect(() => {
    if (user?.onboarding) {
      console.log('🎓 [Onboarding] Syncing checklist from user.onboarding (NOT modal state!)');

      // Nur Checklist-Daten synchronisieren, NICHT shouldShowModal!
      const checklist = user.onboarding.checklist || {};
      const progress = Object.values(checklist).filter(Boolean).length;
      const total = Object.keys(checklist).length || 5;

      setChecklistProgress(progress);
      setChecklistTotal(total);

      // shouldShowChecklist ist OK zu syncen (hat keine Race Condition)
      const status = user.onboarding.status;
      setShouldShowChecklist(status === 'completed' && progress < total);
    }
  }, [user?.onboarding]);

  // Start onboarding
  const startOnboarding = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to start onboarding');

      await fetchStatus();
    } catch (err) {
      console.error('Error starting onboarding:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchStatus]);

  // Complete a step
  const completeStep = useCallback(async (stepId: string, data?: Record<string, unknown>) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/step/${stepId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      });

      if (!response.ok) throw new Error('Failed to complete step');

      // Optimistic update
      setOnboardingState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          completedSteps: [
            ...prev.completedSteps,
            { stepId, completedAt: new Date().toISOString(), data }
          ],
          profile: stepId === 'personalization' && data ? { ...prev.profile, ...data } : prev.profile
        };
      });
    } catch (err) {
      console.error('Error completing step:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to complete onboarding');

      // ✅ Optimistic Update für sofortige UI-Reaktion
      setShouldShowModal(false);
      setShouldShowChecklist(true); // Checklist sofort anzeigen!
      setOnboardingState(prev => prev ? {
        ...prev,
        status: 'completed',
        completedAt: new Date().toISOString()
      } : prev);

      // 🔄 WICHTIG: Alle anderen useOnboarding-Instanzen benachrichtigen!
      // Dies stellt sicher, dass z.B. OnboardingChecklist sofort aktualisiert wird.
      console.log('🔄 [Onboarding] Dispatching sync event after complete');
      window.dispatchEvent(new Event(ONBOARDING_SYNC_EVENT));

      // ✅ Refetch um sicherzustellen dass alle Daten aktuell sind
      // (z.B. für Checklist-Items die während des Onboardings aktualisiert wurden)
      await fetchStatus();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchStatus]);

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/skip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to skip onboarding');

      // ✅ Optimistic Update
      setShouldShowModal(false);
      setShouldShowChecklist(true); // Checklist auch bei Skip anzeigen
      setOnboardingState(prev => prev ? {
        ...prev,
        status: 'skipped',
        skippedAt: new Date().toISOString()
      } : prev);

      // 🔄 WICHTIG: Alle anderen useOnboarding-Instanzen benachrichtigen!
      console.log('🔄 [Onboarding] Dispatching sync event after skip');
      window.dispatchEvent(new Event(ONBOARDING_SYNC_EVENT));

      // ✅ Refetch für aktuelle Daten
      await fetchStatus();
    } catch (err) {
      console.error('Error skipping onboarding:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchStatus]);

  // Mark feature as seen
  const markFeatureSeen = useCallback(async (featureId: string) => {
    const token = getToken();
    if (!token) return;

    // Check if already seen
    if (onboardingState?.seenFeatures.includes(featureId)) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/feature/${featureId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to mark feature seen');

      setOnboardingState(prev => prev ? {
        ...prev,
        seenFeatures: [...prev.seenFeatures, featureId]
      } : prev);
    } catch (err) {
      console.error('Error marking feature seen:', err);
    }
  }, [onboardingState?.seenFeatures]);

  // Update checklist item
  const updateChecklistItem = useCallback(async (itemId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/checklist/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to update checklist');

      setOnboardingState(prev => {
        if (!prev) return prev;
        const newChecklist = { ...prev.checklist, [itemId]: true };
        const newProgress = Object.values(newChecklist).filter(Boolean).length;
        setChecklistProgress(newProgress);

        // Hide checklist if complete
        if (newProgress >= checklistTotal) {
          setShouldShowChecklist(false);
        }

        return { ...prev, checklist: newChecklist };
      });
    } catch (err) {
      console.error('Error updating checklist:', err);
    }
  }, [checklistTotal]);

  // Update preferences
  const updatePreferences = useCallback(async (showTooltips: boolean) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ showTooltips })
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      setOnboardingState(prev => prev ? { ...prev, showTooltips } : prev);
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  }, []);

  // Reset onboarding (for testing/debug)
  const resetOnboarding = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to reset onboarding');

      await fetchStatus();
    } catch (err) {
      console.error('Error resetting onboarding:', err);
    }
  }, [fetchStatus]);

  // 🆕 Checklist dauerhaft ausblenden (in DB gespeichert)
  const hideChecklist = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/hide-checklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to hide checklist');

      // Optimistic Update
      setShouldShowChecklist(false);
      console.log('🙈 Checklist dauerhaft ausgeblendet');

      await fetchStatus();
    } catch (err) {
      console.error('Error hiding checklist:', err);
    }
  }, [fetchStatus]);

  // 🆕 Checklist wieder einblenden
  const showChecklist = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/onboarding/show-checklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to show checklist');

      console.log('👁️ Checklist wieder eingeblendet');

      await fetchStatus();
    } catch (err) {
      console.error('Error showing checklist:', err);
    }
  }, [fetchStatus]);

  return {
    onboardingState,
    isLoading,
    error,
    shouldShowModal,
    shouldShowChecklist,
    checklistProgress,
    checklistTotal,
    startOnboarding,
    completeStep,
    completeOnboarding,
    skipOnboarding,
    markFeatureSeen,
    updateChecklistItem,
    updatePreferences,
    resetOnboarding,
    refetch: fetchStatus,
    hideChecklist,
    showChecklist
  };
}

export default useOnboarding;

// 📁 frontend/src/hooks/useTour.ts
// 🎯 Product Tour Hook - Manages tour state and persistence

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { TourId } from '../config/tourConfig';
import { getTourById } from '../config/tourConfig';
import type { CallBackProps } from 'react-joyride';
import { STATUS } from 'react-joyride';

// Helper to get auth token
function getToken(): string | null {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}

interface UseTourOptions {
  tourId: TourId;
  autoStart?: boolean; // Start automatically if not seen
  onComplete?: () => void;
  onSkip?: () => void;
}

interface UseTourReturn {
  // State
  isRunning: boolean;
  stepIndex: number;
  hasSeenTour: boolean;
  isLoading: boolean;

  // Actions
  startTour: () => void;
  stopTour: () => void;
  resetTour: () => Promise<void>;

  // Joyride callback handler
  handleJoyrideCallback: (data: CallBackProps) => void;

  // Tour config
  tour: ReturnType<typeof getTourById>;
}

export function useTour({
  tourId,
  autoStart = true,
  onComplete,
  onSkip,
}: UseTourOptions): UseTourReturn {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default true to prevent flash
  const [isLoading, setIsLoading] = useState(true);

  const tour = getTourById(tourId);

  // Check if user has seen this tour
  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/onboarding/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // API returns seenFeatures directly, not nested under onboarding
          const seenFeatures = data.seenFeatures || [];
          const showTooltips = data.showTooltips !== false;

          const hasSeen = seenFeatures.includes(tourId);
          setHasSeenTour(hasSeen);

          // Auto-start if enabled and not seen and tooltips are enabled
          if (autoStart && !hasSeen && showTooltips && tour) {
            // Längerer Delay und Element-Check vor Start
            setTimeout(() => {
              // Prüfe ob das erste Target-Element existiert
              const firstStep = tour.steps[0];
              if (firstStep?.target && typeof firstStep.target === 'string' && firstStep.target !== 'body') {
                const targetElement = document.querySelector(firstStep.target);
                if (!targetElement) {
                  console.warn(`[Tour] Target element not found: ${firstStep.target}, skipping tour`);
                  return;
                }
              }
              setIsRunning(true);
            }, 1500); // Erhöht auf 1.5s
          }
        }
      } catch (error) {
        console.error('Error checking tour status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTourStatus();
  }, [user, tourId, autoStart, tour]);

  // Mark tour as seen
  const markTourAsSeen = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      await fetch(`/api/onboarding/feature/${tourId}`, {
        method: 'POST',  // Backend expects POST, not PUT!
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setHasSeenTour(true);
    } catch (error) {
      console.error('Error marking tour as seen:', error);
    }
  }, [tourId]);

  // Start tour manually
  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  // Stop tour
  const stopTour = useCallback(() => {
    setIsRunning(false);
    setStepIndex(0);
  }, []);

  // Reset tour (allow re-seeing)
  const resetTour = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Remove from seenFeatures via API
      await fetch('/api/onboarding/reset-feature', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureId: tourId }),
      });

      setHasSeenTour(false);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, [tourId]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, index, type, action } = data;

    // Update step index on step changes
    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    // Handle back navigation (for SimpleTour)
    if (type === 'step:before' && action === 'prev') {
      setStepIndex(prev => Math.max(0, prev - 1));
    }

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      setIsRunning(false);
      markTourAsSeen();
      onComplete?.();
    }

    // Handle tour skip
    if (status === STATUS.SKIPPED || action === 'skip') {
      setIsRunning(false);
      markTourAsSeen();
      onSkip?.();
    }

    // Handle close (X button)
    if (action === 'close') {
      setIsRunning(false);
      markTourAsSeen();
    }
  }, [markTourAsSeen, onComplete, onSkip]);

  return {
    isRunning,
    stepIndex,
    hasSeenTour,
    isLoading,
    startTour,
    stopTour,
    resetTour,
    handleJoyrideCallback,
    tour,
  };
}

export default useTour;

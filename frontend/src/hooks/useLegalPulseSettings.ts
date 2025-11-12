// 📁 frontend/src/hooks/useLegalPulseSettings.ts
// Custom Hook for Legal Pulse Settings Management

import { useState, useEffect, useCallback } from 'react';

export interface LegalPulseSettings {
  enabled: boolean;
  similarityThreshold: number; // 0.5-0.95
  categories: string[];
  digestMode: 'instant' | 'daily' | 'weekly';
  emailNotifications: boolean;
}

interface UseLegalPulseSettingsReturn {
  settings: LegalPulseSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  availableCategories: string[];
  updateSettings: (updates: Partial<LegalPulseSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

/**
 * Custom hook for managing Legal Pulse settings
 * Handles fetching, caching, and updating user settings
 */
export function useLegalPulseSettings(): UseLegalPulseSettingsReturn {
  const [settings, setSettings] = useState<LegalPulseSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available categories (matches backend validation)
  const availableCategories = [
    'Arbeitsrecht',
    'Mietrecht',
    'Kaufrecht',
    'Vertragsrecht',
    'Datenschutz',
    'Verbraucherrecht',
    'Steuerrecht',
    'Gesellschaftsrecht',
    'Insolvenzrecht',
    'Handelsrecht'
  ];

  /**
   * Fetch settings from backend
   */
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) {
          return import.meta.env.VITE_API_URL;
        }
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return 'https://api.contract-ai.de';
      };

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/legal-pulse/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
        throw new Error(data.message || 'Failed to load settings');
      }
    } catch (err) {
      console.error('[Legal Pulse Settings] Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');

      // Set default settings as fallback
      setSettings({
        enabled: true,
        similarityThreshold: 0.70,
        categories: ['Arbeitsrecht', 'Mietrecht', 'Kaufrecht', 'Vertragsrecht', 'Datenschutz', 'Verbraucherrecht'],
        digestMode: 'instant',
        emailNotifications: true
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update settings on backend
   */
  const updateSettings = useCallback(async (updates: Partial<LegalPulseSettings>): Promise<boolean> => {
    if (!settings) {
      console.error('[Legal Pulse Settings] Cannot update: settings not loaded');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const getApiUrl = () => {
        if (import.meta.env.VITE_API_URL) {
          return import.meta.env.VITE_API_URL;
        }
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return 'https://api.contract-ai.de';
      };

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/legal-pulse/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.settings) {
        // Update local state with new settings
        setSettings(data.settings);
        console.log('[Legal Pulse Settings] ✓ Settings updated successfully');
        return true;
      } else {
        throw new Error(data.message || 'Failed to update settings');
      }
    } catch (err) {
      console.error('[Legal Pulse Settings] Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  /**
   * Manually refresh settings from backend
   */
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    availableCategories,
    updateSettings,
    refreshSettings
  };
}

export default useLegalPulseSettings;

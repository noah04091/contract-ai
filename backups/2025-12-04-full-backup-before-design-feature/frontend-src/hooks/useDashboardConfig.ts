// Hook für Dashboard-Konfiguration mit LocalStorage Persistenz

import { useState, useEffect, useCallback } from 'react';
import {
  DashboardConfig,
  WidgetConfig,
  WidgetId,
  DEFAULT_DASHBOARD_CONFIG,
  DASHBOARD_CONFIG_KEY,
} from '../types/dashboard';

interface UseDashboardConfigReturn {
  config: DashboardConfig;
  isLoading: boolean;
  // Widget Visibility
  isWidgetVisible: (id: WidgetId) => boolean;
  toggleWidgetVisibility: (id: WidgetId) => void;
  setWidgetVisibility: (id: WidgetId, visible: boolean) => void;
  // Widget Order (für Drag & Drop)
  getWidgetOrder: () => WidgetConfig[];
  reorderWidgets: (activeId: WidgetId, overId: WidgetId) => void;
  // Reset
  resetToDefault: () => void;
  // Gesamt-Konfiguration
  updateConfig: (newConfig: Partial<DashboardConfig>) => void;
}

export function useDashboardConfig(): UseDashboardConfigReturn {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Lade Konfiguration aus LocalStorage beim Mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(DASHBOARD_CONFIG_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig) as DashboardConfig;

        // Versionsprüfung und Migration falls nötig
        if (parsed.version === DEFAULT_DASHBOARD_CONFIG.version) {
          // Merge mit Default um neue Widgets zu ergänzen
          const mergedWidgets = DEFAULT_DASHBOARD_CONFIG.widgets.map((defaultWidget) => {
            const savedWidget = parsed.widgets.find((w) => w.id === defaultWidget.id);
            if (savedWidget) {
              return { ...defaultWidget, ...savedWidget };
            }
            return defaultWidget;
          });

          setConfig({ ...parsed, widgets: mergedWidgets });
        } else {
          // Bei Versionsmismatch: Default verwenden aber Reihenfolge/Visibility übernehmen
          console.log('Dashboard config version mismatch, migrating...');
          setConfig(DEFAULT_DASHBOARD_CONFIG);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard config:', error);
      setConfig(DEFAULT_DASHBOARD_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Speichere Konfiguration in LocalStorage bei Änderungen
  const saveConfig = useCallback((newConfig: DashboardConfig) => {
    try {
      localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error saving dashboard config:', error);
    }
  }, []);

  // Widget Visibility prüfen
  const isWidgetVisible = useCallback(
    (id: WidgetId): boolean => {
      const widget = config.widgets.find((w) => w.id === id);
      return widget?.visible ?? true;
    },
    [config.widgets]
  );

  // Widget Visibility umschalten
  const toggleWidgetVisibility = useCallback(
    (id: WidgetId) => {
      setConfig((prev) => {
        const widget = prev.widgets.find((w) => w.id === id);

        // Required Widgets können nicht ausgeblendet werden
        if (widget?.required) {
          return prev;
        }

        const newWidgets = prev.widgets.map((w) =>
          w.id === id ? { ...w, visible: !w.visible } : w
        );
        const newConfig = { ...prev, widgets: newWidgets };
        saveConfig(newConfig);
        return newConfig;
      });
    },
    [saveConfig]
  );

  // Widget Visibility setzen
  const setWidgetVisibility = useCallback(
    (id: WidgetId, visible: boolean) => {
      setConfig((prev) => {
        const widget = prev.widgets.find((w) => w.id === id);

        // Required Widgets können nicht ausgeblendet werden
        if (widget?.required && !visible) {
          return prev;
        }

        const newWidgets = prev.widgets.map((w) =>
          w.id === id ? { ...w, visible } : w
        );
        const newConfig = { ...prev, widgets: newWidgets };
        saveConfig(newConfig);
        return newConfig;
      });
    },
    [saveConfig]
  );

  // Widget-Reihenfolge abrufen (sortiert nach order)
  const getWidgetOrder = useCallback((): WidgetConfig[] => {
    return [...config.widgets].sort((a, b) => a.order - b.order);
  }, [config.widgets]);

  // Widgets neu ordnen (Drag & Drop)
  const reorderWidgets = useCallback(
    (activeId: WidgetId, overId: WidgetId) => {
      setConfig((prev) => {
        const widgets = [...prev.widgets];
        const activeIndex = widgets.findIndex((w) => w.id === activeId);
        const overIndex = widgets.findIndex((w) => w.id === overId);

        if (activeIndex === -1 || overIndex === -1) {
          return prev;
        }

        // Element entfernen und an neuer Position einfügen
        const [removed] = widgets.splice(activeIndex, 1);
        widgets.splice(overIndex, 0, removed);

        // Order-Werte neu vergeben
        const reorderedWidgets = widgets.map((w, index) => ({
          ...w,
          order: index,
        }));

        const newConfig = { ...prev, widgets: reorderedWidgets };
        saveConfig(newConfig);
        return newConfig;
      });
    },
    [saveConfig]
  );

  // Auf Default zurücksetzen
  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_DASHBOARD_CONFIG);
    saveConfig(DEFAULT_DASHBOARD_CONFIG);
  }, [saveConfig]);

  // Gesamt-Konfiguration aktualisieren
  const updateConfig = useCallback(
    (newConfig: Partial<DashboardConfig>) => {
      setConfig((prev) => {
        const updated = { ...prev, ...newConfig };
        saveConfig(updated);
        return updated;
      });
    },
    [saveConfig]
  );

  return {
    config,
    isLoading,
    isWidgetVisible,
    toggleWidgetVisibility,
    setWidgetVisibility,
    getWidgetOrder,
    reorderWidgets,
    resetToDefault,
    updateConfig,
  };
}

export default useDashboardConfig;

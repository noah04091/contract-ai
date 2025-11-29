// Dashboard Widget Typen und Konfiguration

export type WidgetId =
  | 'metrics'
  | 'generatedContracts'
  | 'savedAlternatives'
  | 'legalPulse'
  | 'upcomingDeadlines'
  | 'priorityContracts'
  | 'quickActions'
  | 'analyticsStatus'
  | 'analyticsUploads'
  | 'analyticsRisk'
  | 'analyticsTrend';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  icon: string;
  visible: boolean;
  order: number;
  // Manche Widgets können nicht ausgeblendet werden
  required?: boolean;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  version: number; // Für zukünftige Migrationen
}

// Standard-Konfiguration für neue User
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  version: 1,
  widgets: [
    {
      id: 'metrics',
      title: 'Statistik-Übersicht',
      description: 'Verträge, Status und Kosten auf einen Blick',
      icon: '📊',
      visible: true,
      order: 0,
      required: true, // Dieses Widget sollte immer sichtbar sein
    },
    {
      id: 'generatedContracts',
      title: 'KI-Generierte Verträge',
      description: 'Ihre zuletzt mit KI erstellten Verträge',
      icon: '✨',
      visible: true,
      order: 1,
    },
    {
      id: 'savedAlternatives',
      title: 'Gespeicherte Alternativen',
      description: 'Ihre gemerkten Vertragsalternativen',
      icon: '🔖',
      visible: true,
      order: 2,
    },
    {
      id: 'legalPulse',
      title: 'Legal Pulse Analysen',
      description: 'Risikoanalyse der neuesten Verträge',
      icon: '⚖️',
      visible: true,
      order: 3,
    },
    {
      id: 'upcomingDeadlines',
      title: 'Anstehende Termine',
      description: 'Wichtige Fristen in den nächsten 30 Tagen',
      icon: '📅',
      visible: true,
      order: 4,
    },
    {
      id: 'priorityContracts',
      title: 'Wichtige Verträge',
      description: 'Verträge die Ihre Aufmerksamkeit erfordern',
      icon: '📋',
      visible: true,
      order: 5,
    },
    {
      id: 'quickActions',
      title: 'Schnellaktionen',
      description: 'Häufig verwendete Funktionen',
      icon: '⚡',
      visible: true,
      order: 6,
    },
    {
      id: 'analyticsStatus',
      title: 'Statusverteilung',
      description: 'Übersicht aller Vertragsstatus',
      icon: '📈',
      visible: true,
      order: 7,
    },
    {
      id: 'analyticsUploads',
      title: 'Upload-Trends',
      description: 'Monatliche Vertragsaktivitäten',
      icon: '📊',
      visible: true,
      order: 8,
    },
    {
      id: 'analyticsRisk',
      title: 'Risiko-Analyse',
      description: 'Legal Pulse Bewertungen',
      icon: '⚠️',
      visible: true,
      order: 9,
    },
    {
      id: 'analyticsTrend',
      title: '30-Tage Trend',
      description: 'Tägliche Vertragsaktivitäten',
      icon: '📅',
      visible: true,
      order: 10,
    },
  ],
};

// LocalStorage Key
export const DASHBOARD_CONFIG_KEY = 'contract-ai-dashboard-config';

// 📁 frontend/src/config/tourConfig.ts
// 🎯 Contextual Product Tours - Enterprise Grade
// Geführte Touren für neue Features

import type { Step } from 'react-joyride';

// Tour IDs - used to track which tours have been seen
export type TourId =
  | 'dashboard'
  | 'contracts'
  | 'calendar'
  | 'optimizer'
  | 'legal-lens'
  | 'contract-builder';

// Tour configuration type
export interface TourConfig {
  id: TourId;
  name: string;
  description: string;
  steps: Step[];
  // Only show if user hasn't completed onboarding for this feature
  requiresFeature?: string;
}

// Shared styles for tour tooltips
const tooltipStyles = {
  options: {
    primaryColor: '#3B82F6',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    arrowColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: 1.6,
  },
  buttonNext: {
    backgroundColor: '#3B82F6',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
  },
  buttonBack: {
    color: '#6b7280',
    marginRight: '10px',
  },
  buttonSkip: {
    color: '#9ca3af',
  },
};

// ============================================================
// DASHBOARD TOUR
// ============================================================
export const dashboardTour: TourConfig = {
  id: 'dashboard',
  name: 'Dashboard Tour',
  description: 'Lerne dein Dashboard kennen',
  steps: [
    {
      target: '[data-tour="dashboard-welcome"]',
      content: 'Willkommen in deinem Dashboard! Hier siehst du alles auf einen Blick: Verträge, Fristen, und wichtige Aktionen.',
      title: 'Dein Command Center',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-stats"]',
      content: 'Diese Karten zeigen dir die wichtigsten Kennzahlen: Aktive Verträge, bevorstehende Fristen, und mehr.',
      title: 'Statistiken im Überblick',
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-urgent"]',
      content: 'Hier werden dringende Aktionen angezeigt - Fristen die bald ablaufen oder Verträge die Aufmerksamkeit brauchen.',
      title: 'Dringende Aktionen',
      placement: 'left',
    },
    {
      target: '[data-tour="dashboard-quick-actions"]',
      content: 'Mit diesen Schnellaktionen kannst du direkt loslegen: Vertrag hochladen, analysieren, oder generieren.',
      title: 'Schnellaktionen',
      placement: 'top',
    },
    {
      target: '[data-tour="dashboard-sidebar"]',
      content: 'Über die Sidebar navigierst du zu allen Bereichen: Verträge, Kalender, Optimizer, und mehr.',
      title: 'Navigation',
      placement: 'right',
    },
  ],
};

// ============================================================
// CONTRACTS TOUR
// ============================================================
export const contractsTour: TourConfig = {
  id: 'contracts',
  name: 'Verträge Tour',
  description: 'Lerne die Vertragsverwaltung kennen',
  steps: [
    {
      target: '[data-tour="contracts-upload"]',
      content: 'Hier kannst du neue Verträge hochladen. Unterstützt werden PDF, DOC, und DOCX Dateien bis 10 MB.',
      title: 'Vertrag hochladen',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="contracts-list"]',
      content: 'Deine Verträge werden hier aufgelistet. Du kannst nach Name, Datum, oder Status filtern und sortieren.',
      title: 'Vertragsliste',
      placement: 'top',
    },
    {
      target: '[data-tour="contracts-search"]',
      content: 'Mit der Suche findest du schnell jeden Vertrag. Suche nach Name, Inhalt, oder Vertragspartner.',
      title: 'Suche',
      placement: 'bottom',
    },
    {
      target: '[data-tour="contracts-folders"]',
      content: 'Organisiere deine Verträge in Ordnern. Erstelle eigene Ordner oder nutze die Smart Folders für automatische Kategorisierung.',
      title: 'Ordner & Organisation',
      placement: 'right',
    },
    {
      target: '[data-tour="contracts-analyze"]',
      content: 'Klicke auf "Analysieren" um eine KI-Analyse zu starten. Du erhältst Risikobewertung, Klauselanalyse, und Optimierungsvorschläge.',
      title: 'KI-Analyse',
      placement: 'left',
    },
  ],
};

// ============================================================
// CALENDAR TOUR
// ============================================================
export const calendarTour: TourConfig = {
  id: 'calendar',
  name: 'Kalender Tour',
  description: 'Lerne den Fristenkalender kennen',
  steps: [
    {
      target: '[data-tour="calendar-view"]',
      content: 'Der Kalender zeigt alle wichtigen Vertragstermine: Kündigungsfristen, Verlängerungen, und Zahlungstermine.',
      title: 'Fristenkalender',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="calendar-event"]',
      content: 'Klicke auf ein Event für Details. Du kannst Erinnerungen setzen, Notizen hinzufügen, oder direkt zum Vertrag springen.',
      title: 'Event Details',
      placement: 'top',
    },
    {
      target: '[data-tour="calendar-filters"]',
      content: 'Filtere nach Event-Typ: Kündigungen, Verlängerungen, Zahlungen, oder eigene Erinnerungen.',
      title: 'Filter',
      placement: 'left',
    },
    {
      target: '[data-tour="calendar-create"]',
      content: 'Erstelle eigene Erinnerungen für wichtige Termine. Diese werden automatisch per E-Mail erinnert.',
      title: 'Erinnerung erstellen',
      placement: 'bottom',
    },
    {
      target: '[data-tour="calendar-stats"]',
      content: 'Die Statistik-Karten zeigen dir auf einen Blick: Kommende Fristen, kritische Events, und mehr.',
      title: 'Statistiken',
      placement: 'left',
    },
  ],
};

// ============================================================
// OPTIMIZER TOUR
// ============================================================
export const optimizerTour: TourConfig = {
  id: 'optimizer',
  name: 'Optimizer Tour',
  description: 'Lerne den KI-Optimizer kennen',
  steps: [
    {
      target: '[data-tour="optimizer-upload"]',
      content: 'Lade einen Vertrag hoch, den du optimieren möchtest. Die KI analysiert und verbessert ihn.',
      title: 'Vertrag optimieren',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="optimizer-perspective"]',
      content: 'Wähle deine Perspektive: Neutral, als Vertragsersteller, oder als Empfänger. Die Optimierungen werden entsprechend angepasst.',
      title: 'Perspektive wählen',
      placement: 'bottom',
    },
    {
      target: '[data-tour="optimizer-results"]',
      content: 'Hier siehst du alle Optimierungsvorschläge. Jeder Vorschlag zeigt Original, Verbesserung, und Begründung.',
      title: 'Optimierungen',
      placement: 'top',
    },
    {
      target: '[data-tour="optimizer-apply"]',
      content: 'Wähle die Vorschläge aus, die du übernehmen möchtest, und generiere den optimierten Vertrag.',
      title: 'Anwenden',
      placement: 'left',
    },
  ],
};

// ============================================================
// LEGAL LENS TOUR
// ============================================================
export const legalLensTour: TourConfig = {
  id: 'legal-lens',
  name: 'Legal Lens Tour',
  description: 'Lerne Legal Lens kennen',
  steps: [
    {
      target: '[data-tour="legal-lens-document"]',
      content: 'Hier siehst du deinen Vertrag. Klicke auf eine beliebige Klausel, um sie zu analysieren.',
      title: 'Dokument-Ansicht',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="legal-lens-clause"]',
      content: 'Markierte Klauseln zeigen potenzielle Risiken oder wichtige Punkte. Grün = OK, Gelb = Achtung, Rot = Risiko.',
      title: 'Klausel-Markierungen',
      placement: 'left',
    },
    {
      target: '[data-tour="legal-lens-explanation"]',
      content: 'Die Erklärung zeigt dir in einfacher Sprache, was die Klausel bedeutet und worauf du achten solltest.',
      title: 'Klausel-Erklärung',
      placement: 'left',
    },
    {
      target: '[data-tour="legal-lens-actions"]',
      content: 'Von hier aus kannst du direkt zur Optimierung springen oder die Klausel mit Experten teilen.',
      title: 'Aktionen',
      placement: 'top',
    },
  ],
};

// ============================================================
// CONTRACT BUILDER TOUR
// ============================================================
export const contractBuilderTour: TourConfig = {
  id: 'contract-builder',
  name: 'Contract Builder Tour',
  description: 'Lerne den Vertragsbaukasten kennen',
  steps: [
    {
      target: '[data-tour="builder-toolbar"]',
      content: 'Die Toolbar enthält alle Bausteine: Überschriften, Absätze, Klauseln, Tabellen, und mehr.',
      title: 'Bausteine',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="builder-canvas"]',
      content: 'Ziehe Bausteine auf die Arbeitsfläche und ordne sie per Drag & Drop an.',
      title: 'Arbeitsfläche',
      placement: 'left',
    },
    {
      target: '[data-tour="builder-properties"]',
      content: 'Im Eigenschaften-Panel passt du den ausgewählten Baustein an: Text, Styling, Variablen.',
      title: 'Eigenschaften',
      placement: 'left',
    },
    {
      target: '[data-tour="builder-variables"]',
      content: 'Variablen werden automatisch erkannt. Klicke darauf, um den Wert einzutragen.',
      title: 'Variablen',
      placement: 'left',
    },
    {
      target: '[data-tour="builder-export"]',
      content: 'Wenn du fertig bist, exportiere den Vertrag als PDF oder speichere ihn als Vorlage.',
      title: 'Export',
      placement: 'bottom',
    },
  ],
};

// All tours combined
export const ALL_TOURS: TourConfig[] = [
  dashboardTour,
  contractsTour,
  calendarTour,
  optimizerTour,
  legalLensTour,
  contractBuilderTour,
];

// Get tour by ID
export function getTourById(id: TourId): TourConfig | undefined {
  return ALL_TOURS.find(tour => tour.id === id);
}

// Export tooltip styles for customization
export { tooltipStyles };

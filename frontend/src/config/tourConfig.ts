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
// 🎯 Interaktive Tour mit Element-Highlighting (nur sichtbare Elemente!)
export const dashboardTour: TourConfig = {
  id: 'dashboard',
  name: 'Dashboard Tour',
  description: 'Lerne dein Dashboard kennen',
  steps: [
    {
      target: '[data-tour="dashboard-welcome"]',
      content: 'Willkommen in deinem Dashboard! Hier siehst du alles auf einen Blick: Verträge, Fristen, und wichtige Aktionen.',
      title: '🏠 Dein Command Center',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-stats"]',
      content: 'Diese Karten zeigen dir die wichtigsten Kennzahlen: Aktive Verträge, bevorstehende Fristen, und mehr.',
      title: '📊 Statistiken im Überblick',
      placement: 'bottom',
    },
    {
      target: '[data-tour="dashboard-sidebar"]',
      content: 'Über die Sidebar navigierst du zu allen Bereichen: Verträge, Kalender, Optimizer, und mehr.',
      title: '📍 Navigation',
      placement: 'right',
    },
    {
      target: '[data-tour="dashboard-quick-actions"]',
      content: 'Mit diesen Schnellaktionen kannst du direkt loslegen: Vertrag hochladen, analysieren, oder generieren.',
      title: '🚀 Schnellaktionen',
      placement: 'bottom',
    },
  ],
};

// ============================================================
// CONTRACTS TOUR
// ============================================================
// 🎯 Interaktive Tour - NUR Elemente im sichtbaren Bereich (Header/Sidebar)
export const contractsTour: TourConfig = {
  id: 'contracts',
  name: 'Verträge Tour',
  description: 'Lerne die Vertragsverwaltung kennen',
  steps: [
    {
      target: '[data-tour="contracts-upload"]',
      content: 'Hier kannst du neue Verträge hochladen. Unterstützt werden PDF, DOC, und DOCX Dateien bis 10 MB. Einfach per Drag & Drop!',
      title: '📄 Vertrag hochladen',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="contracts-search"]',
      content: 'Mit der Suche findest du schnell jeden Vertrag. Suche nach Name, Inhalt, oder Vertragspartner.',
      title: '🔍 Suche',
      placement: 'bottom',
    },
    {
      target: '[data-tour="contracts-folders"]',
      content: 'Organisiere deine Verträge in Ordnern. Erstelle eigene Ordner oder nutze die Smart Folders für automatische Kategorisierung.',
      title: '📁 Ordner & Organisation',
      placement: 'right',
    },
    {
      target: 'body',
      content: 'In der Liste unten siehst du alle deine Verträge. Klicke auf einen Vertrag um Details zu sehen oder eine KI-Analyse zu starten!',
      title: '🤖 Verträge & KI-Analyse',
      placement: 'center',
    },
  ],
};

// ============================================================
// CALENDAR TOUR
// ============================================================
// 🎯 Interaktive Tour mit Element-Highlighting
export const calendarTour: TourConfig = {
  id: 'calendar',
  name: 'Kalender Tour',
  description: 'Lerne den Fristenkalender kennen',
  steps: [
    {
      target: '[data-tour="calendar-view"]',
      content: 'Der Kalender zeigt alle wichtigen Vertragstermine: Kündigungsfristen, Verlängerungen, und Zahlungstermine.',
      title: '📅 Fristenkalender',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="calendar-create"]',
      content: 'Klicke hier um eigene Erinnerungen zu erstellen. Du wirst automatisch per E-Mail erinnert!',
      title: '➕ Erinnerung erstellen',
      placement: 'bottom',
    },
    {
      target: '[data-tour="calendar-stats"]',
      content: 'Diese Statistik-Karten zeigen dir auf einen Blick: Kommende Fristen, kritische Events, und mehr. Klicke darauf für Details.',
      title: '📊 Statistiken',
      placement: 'left',
    },
    {
      target: 'body',
      content: 'Klicke auf einen Tag oder ein Event im Kalender für Details. Du kannst Erinnerungen bearbeiten oder direkt zum Vertrag springen.',
      title: '📌 Events bearbeiten',
      placement: 'center',
    },
  ],
};

// ============================================================
// OPTIMIZER TOUR
// ============================================================
// 🎯 Interaktive Tour mit Element-Highlighting
export const optimizerTour: TourConfig = {
  id: 'optimizer',
  name: 'Optimizer Tour',
  description: 'Lerne den KI-Optimizer kennen',
  steps: [
    {
      target: '[data-tour="optimizer-upload"]',
      content: 'Lade hier einen Vertrag hoch, den du optimieren möchtest. Die KI analysiert und verbessert ihn automatisch.',
      title: '🔧 Vertrag optimieren',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="optimizer-perspective"]',
      content: 'Wähle deine Perspektive: Neutral, als Vertragsersteller, oder als Empfänger. Die Optimierungen werden entsprechend angepasst.',
      title: '👁️ Perspektive wählen',
      placement: 'bottom',
    },
    {
      target: 'body',
      content: 'Nach der Analyse siehst du alle Optimierungsvorschläge mit Original, Verbesserung, und Begründung. Wähle aus, was du übernehmen möchtest!',
      title: '📝 Optimierungen anwenden',
      placement: 'center',
    },
  ],
};

// ============================================================
// LEGAL LENS TOUR
// ============================================================
// 🎯 Interaktive Tour mit Element-Highlighting
export const legalLensTour: TourConfig = {
  id: 'legal-lens',
  name: 'Legal Lens Tour',
  description: 'Lerne Legal Lens kennen',
  steps: [
    {
      target: '[data-tour="legal-lens-document"]',
      content: 'Hier siehst du deinen Vertrag. Klicke auf eine beliebige Stelle, um die Klausel zu analysieren.',
      title: '🔍 Dokument-Ansicht',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Markierte Klauseln zeigen Risiken: Grün = OK, Gelb = Achtung, Rot = Risiko. Klicke auf eine Klausel für Details!',
      title: '🚦 Klausel-Markierungen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Die Erklärung zeigt dir in einfacher Sprache, was die Klausel bedeutet. Von hier kannst du zur Optimierung springen.',
      title: '💡 Klausel verstehen',
      placement: 'center',
    },
  ],
};

// ============================================================
// CONTRACT BUILDER TOUR
// ============================================================
// 🎯 Interaktive Tour mit Element-Highlighting
export const contractBuilderTour: TourConfig = {
  id: 'contract-builder',
  name: 'Contract Builder Tour',
  description: 'Lerne den Vertragsbaukasten kennen',
  steps: [
    {
      target: '[data-tour="builder-toolbar"]',
      content: 'Die Toolbar enthält alle Bausteine: Überschriften, Absätze, Klauseln, Tabellen, und mehr. Ziehe sie auf die Arbeitsfläche!',
      title: '🧱 Bausteine',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="builder-canvas"]',
      content: 'Das ist deine Arbeitsfläche. Ziehe Bausteine hierher und ordne sie per Drag & Drop an.',
      title: '📄 Arbeitsfläche',
      placement: 'left',
    },
    {
      target: '[data-tour="builder-properties"]',
      content: 'Wenn du einen Baustein auswählst, erscheint hier das Eigenschaften-Panel. Text, Styling, und Variablen anpassen.',
      title: '⚙️ Eigenschaften',
      placement: 'left',
    },
    {
      target: '[data-tour="builder-export"]',
      content: 'Wenn du fertig bist, exportiere den Vertrag als PDF oder speichere ihn als wiederverwendbare Vorlage.',
      title: '📤 Export',
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

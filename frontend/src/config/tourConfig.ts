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
// 🔧 FIX: Alle Steps auf placement: 'center' für konsistentes, bug-freies Verhalten
export const dashboardTour: TourConfig = {
  id: 'dashboard',
  name: 'Dashboard Tour',
  description: 'Lerne dein Dashboard kennen',
  steps: [
    {
      target: 'body',
      content: 'Willkommen in deinem Dashboard! Hier siehst du alles auf einen Blick: Verträge, Fristen, und wichtige Aktionen.',
      title: '🏠 Dein Command Center',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Die Karten oben zeigen dir die wichtigsten Kennzahlen: Aktive Verträge, bevorstehende Fristen, und mehr.',
      title: '📊 Statistiken im Überblick',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Im Bereich "Dringende Aktionen" werden Fristen angezeigt, die bald ablaufen oder Verträge die Aufmerksamkeit brauchen.',
      title: '⚡ Dringende Aktionen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Mit den Schnellaktionen kannst du direkt loslegen: Vertrag hochladen, analysieren, oder generieren.',
      title: '🚀 Schnellaktionen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Über die linke Sidebar navigierst du zu allen Bereichen: Verträge, Kalender, Optimizer, und mehr.',
      title: '📍 Navigation',
      placement: 'center',
    },
  ],
};

// ============================================================
// CONTRACTS TOUR
// ============================================================
// 🔧 FIX: Alle Steps auf placement: 'center' um Scroll-/Sprung-Bugs zu vermeiden
export const contractsTour: TourConfig = {
  id: 'contracts',
  name: 'Verträge Tour',
  description: 'Lerne die Vertragsverwaltung kennen',
  steps: [
    {
      target: 'body',
      content: 'Willkommen bei deiner Vertragsverwaltung! Hier lädst du Verträge hoch und behältst den Überblick. Unterstützt werden PDF, DOC, und DOCX Dateien bis 10 MB.',
      title: '📄 Vertrag hochladen',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Deine Verträge werden in einer übersichtlichen Liste angezeigt. Du kannst nach Name, Datum, oder Status filtern und sortieren.',
      title: '📋 Vertragsliste',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Mit der Suchleiste oben findest du schnell jeden Vertrag. Suche nach Name, Inhalt, oder Vertragspartner.',
      title: '🔍 Suche & Filter',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Organisiere deine Verträge in Ordnern über die linke Seitenleiste. Erstelle eigene Ordner oder nutze die Smart Folders für automatische Kategorisierung.',
      title: '📁 Ordner & Organisation',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Klicke auf einen Vertrag und dann auf "Analysieren" um eine KI-Analyse zu starten. Du erhältst Risikobewertung, Klauselanalyse, und Optimierungsvorschläge.',
      title: '🤖 KI-Analyse',
      placement: 'center',
    },
  ],
};

// ============================================================
// CALENDAR TOUR
// ============================================================
// 🔧 FIX: Alle Steps auf placement: 'center' um Scroll-/Sprung-Bugs zu vermeiden
export const calendarTour: TourConfig = {
  id: 'calendar',
  name: 'Kalender Tour',
  description: 'Lerne den Fristenkalender kennen',
  steps: [
    {
      target: 'body',
      content: 'Willkommen im Fristenkalender! Hier siehst du alle wichtigen Vertragstermine: Kündigungsfristen, Verlängerungen, und Zahlungstermine.',
      title: '📅 Fristenkalender',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Klicke auf ein Event im Kalender für Details. Du kannst Erinnerungen setzen, Notizen hinzufügen, oder direkt zum Vertrag springen.',
      title: '📌 Event Details',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'In der rechten Seitenleiste kannst du nach Event-Typ filtern: Kündigungen, Verlängerungen, Zahlungen, oder eigene Erinnerungen.',
      title: '🔍 Filter',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Über den Plus-Button im Header oder durch Klick auf einen Tag kannst du eigene Erinnerungen erstellen. Diese werden automatisch per E-Mail erinnert.',
      title: '➕ Erinnerung erstellen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Die Statistik-Karten in der Seitenleiste zeigen dir auf einen Blick: Kommende Fristen, kritische Events, und mehr. Klicke darauf für Details.',
      title: '📊 Statistiken',
      placement: 'center',
    },
  ],
};

// ============================================================
// OPTIMIZER TOUR
// ============================================================
// 🔧 FIX: Alle Steps auf placement: 'center' um Scroll-/Sprung-Bugs zu vermeiden
export const optimizerTour: TourConfig = {
  id: 'optimizer',
  name: 'Optimizer Tour',
  description: 'Lerne den KI-Optimizer kennen',
  steps: [
    {
      target: 'body',
      content: 'Willkommen beim KI-Optimizer! Lade einen Vertrag hoch, den du optimieren möchtest. Die KI analysiert und verbessert ihn automatisch.',
      title: '🔧 Vertrag optimieren',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Wähle deine Perspektive: Neutral, als Vertragsersteller, oder als Empfänger. Die Optimierungen werden entsprechend angepasst.',
      title: '👁️ Perspektive wählen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Nach der Analyse siehst du alle Optimierungsvorschläge. Jeder Vorschlag zeigt Original, Verbesserung, und Begründung.',
      title: '📝 Optimierungen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Wähle die Vorschläge aus, die du übernehmen möchtest, und generiere den optimierten Vertrag als PDF.',
      title: '✅ Anwenden',
      placement: 'center',
    },
  ],
};

// ============================================================
// LEGAL LENS TOUR
// ============================================================
// 🔧 FIX: Alle Steps auf placement: 'center' um Scroll-/Sprung-Bugs zu vermeiden
export const legalLensTour: TourConfig = {
  id: 'legal-lens',
  name: 'Legal Lens Tour',
  description: 'Lerne Legal Lens kennen',
  steps: [
    {
      target: 'body',
      content: 'Willkommen bei Legal Lens! Hier siehst du deinen Vertrag mit interaktiver Klausel-Analyse. Klicke auf eine beliebige Klausel, um sie zu analysieren.',
      title: '🔍 Dokument-Ansicht',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Markierte Klauseln zeigen potenzielle Risiken oder wichtige Punkte. Grün = OK, Gelb = Achtung, Rot = Risiko.',
      title: '🚦 Klausel-Markierungen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Wenn du auf eine Klausel klickst, zeigt dir die Erklärung in einfacher Sprache, was sie bedeutet und worauf du achten solltest.',
      title: '💡 Klausel-Erklärung',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Von der Klausel-Ansicht aus kannst du direkt zur Optimierung springen oder die Klausel mit Experten teilen.',
      title: '⚡ Aktionen',
      placement: 'center',
    },
  ],
};

// ============================================================
// CONTRACT BUILDER TOUR
// ============================================================
// 🔧 FIX: Alle Steps auf placement: 'center' um Scroll-/Sprung-Bugs zu vermeiden
export const contractBuilderTour: TourConfig = {
  id: 'contract-builder',
  name: 'Contract Builder Tour',
  description: 'Lerne den Vertragsbaukasten kennen',
  steps: [
    {
      target: 'body',
      content: 'Willkommen im Contract Builder! In der linken Toolbar findest du alle Bausteine: Überschriften, Absätze, Klauseln, Tabellen, und mehr.',
      title: '🧱 Bausteine',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: 'Die große Fläche in der Mitte ist deine Arbeitsfläche. Ziehe Bausteine hierher und ordne sie per Drag & Drop an.',
      title: '📄 Arbeitsfläche',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Wenn du einen Baustein auswählst, erscheint rechts das Eigenschaften-Panel. Hier passt du Text, Styling, und Variablen an.',
      title: '⚙️ Eigenschaften',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Variablen wie {{name}} werden automatisch erkannt und hervorgehoben. Klicke darauf, um den Wert direkt einzutragen.',
      title: '🔤 Variablen',
      placement: 'center',
    },
    {
      target: 'body',
      content: 'Wenn du fertig bist, klicke oben rechts auf "Export" um den Vertrag als PDF zu speichern, oder speichere ihn als wiederverwendbare Vorlage.',
      title: '📤 Export',
      placement: 'center',
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

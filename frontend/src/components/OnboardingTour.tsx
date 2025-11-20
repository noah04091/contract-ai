// 📁 frontend/src/components/OnboardingTour.tsx
// Interactive Onboarding Tour für neue User

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation } from 'react-router-dom';

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

export default function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const location = useLocation();
  const [steps, setSteps] = useState<Step[]>([]);

  // Tour-Steps basierend auf aktueller Route
  useEffect(() => {
    const currentPath = location.pathname;

    // Dashboard Tour
    if (currentPath === '/dashboard') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Willkommen bei Contract AI! 🎉</h2>
              <p>Lass mich dir zeigen, wie du das Beste aus deiner Vertragsverwaltung herausholst.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: '.recharts-wrapper',
          content: 'Hier siehst du deine Vertragsstatistiken auf einen Blick - von Vertragstypen bis zu monatlichen Kosten.',
          placement: 'bottom'
        },
        {
          target: '[href="/contracts"]',
          content: 'In der Verwaltung kannst du alle deine Verträge hochladen, organisieren und analysieren.',
          placement: 'right'
        },
        {
          target: '[href="/calendar"]',
          content: 'Der Kalender zeigt dir alle wichtigen Fristen und Kündigungstermine.',
          placement: 'right'
        },
        {
          target: '[href="/optimizer"]',
          content: 'Der Optimizer hilft dir, bessere Konditionen aus deinen Verträgen herauszuholen.',
          placement: 'right'
        }
      ]);
    }

    // Contracts Tour
    else if (currentPath === '/contracts') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Deine Vertragsverwaltung 📄</h2>
              <p>Hier hast du die volle Kontrolle über alle deine Verträge.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'button[class*="newContractButton"]',
          content: 'Klicke hier, um neue Verträge hochzuladen. Ziehe einfach PDFs per Drag & Drop!',
          placement: 'bottom'
        },
        {
          target: 'button[class*="exportButton"]',
          content: 'Exportiere dein gesamtes Portfolio als Excel-Tabelle für die Offline-Analyse.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="folderBar"]',
          content: 'Organisiere deine Verträge in Ordnern. Die KI schlägt dir automatisch passende Ordner vor!',
          placement: 'bottom'
        },
        {
          target: 'input[placeholder*="Suche"]',
          content: 'Suche blitzschnell nach Verträgen - durchsucht Namen, Anbieter und Inhalte.',
          placement: 'bottom'
        }
      ]);
    }

    // Calendar Tour
    else if (currentPath === '/calendar') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Dein Fristenkalender 📅</h2>
              <p>Verpasse nie wieder eine wichtige Frist!</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: '.fc-toolbar',
          content: 'Wechsle zwischen Monats-, Wochen- und Tagesansicht für die perfekte Übersicht.',
          placement: 'bottom'
        },
        {
          target: '.fc-daygrid',
          content: 'Alle Kündigungsfristen und wichtigen Termine werden automatisch aus deinen Verträgen extrahiert.',
          placement: 'top'
        }
      ]);
    }

    // Optimizer Tour
    else if (currentPath === '/optimizer') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Vertragsoptimierung 🚀</h2>
              <p>Hole mehr aus deinen Verträgen heraus mit KI-gestützter Optimierung.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'select',
          content: 'Wähle einen Vertrag aus, den du optimieren möchtest.',
          placement: 'bottom'
        }
      ]);
    }

    // Compare Tour
    else if (currentPath === '/compare') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Vertragsvergleich ⚖️</h2>
              <p>Vergleiche zwei Verträge Seite an Seite mit KI-Analyse.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        }
      ]);
    }

    // Generate Tour
    else if (currentPath === '/generate') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Vertragsgenerator ✍️</h2>
              <p>Erstelle professionelle Verträge in Minuten mit KI-Unterstützung.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        }
      ]);
    }

    // Legal Pulse Tour
    else if (currentPath === '/legal-pulse') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Legal Pulse ⚖️</h2>
              <p>Bleib auf dem Laufenden über relevante Gesetzesänderungen.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        }
      ]);
    }

    // Default Tour (kein spezifischer Ort)
    else {
      setSteps([]);
    }
  }, [location.pathname]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    // Tour beendet oder übersprungen
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  };

  // Keine Tour für diese Route
  if (steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: '#ffffff',
          zIndex: 10000
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontSize: '15px'
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px'
        },
        tooltipContent: {
          padding: '10px 0'
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 500
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: '10px'
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '14px'
        }
      }}
      locale={{
        back: 'Zurück',
        close: 'Schließen',
        last: 'Fertig',
        next: 'Weiter',
        skip: 'Überspringen'
      }}
    />
  );
}

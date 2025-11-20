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
    else if (currentPath === '/legal-pulse' || currentPath === '/legalpulse') {
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

    // Chat Tour
    else if (currentPath === '/chat') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Legal Chat 💬</h2>
              <p>Stelle der KI Fragen zu deinen Verträgen und erhalte sofortige Antworten.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'button[class*="newChatButton"]',
          content: 'Starte einen neuen Chat, um Fragen zu deinen Verträgen zu stellen.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="chatHistory"]',
          content: 'Alle deine Chats werden hier gespeichert. Du kannst jederzeit zu früheren Gesprächen zurückkehren.',
          placement: 'right'
        },
        {
          target: 'div[class*="attachmentArea"]',
          content: 'Lade Verträge hoch, um spezifische Fragen zu ihnen zu stellen. Die KI analysiert sie automatisch.',
          placement: 'top'
        },
        {
          target: 'div[class*="smartQuestions"]',
          content: 'Die KI schlägt dir passende Fragen vor, die du zu deinen Verträgen stellen kannst.',
          placement: 'left'
        }
      ]);
    }

    // Profile Tour
    else if (currentPath === '/profile') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Dein Profil 👤</h2>
              <p>Verwalte deine Kontoeinstellungen, Abonnement und persönlichen Daten.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'button[class*="planButton"]',
          content: 'Hier siehst du deinen aktuellen Plan und kannst upgraden, um mehr Features freizuschalten.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="usageStats"]',
          content: 'Überwache deine Nutzung - wie viele Analysen du diesen Monat bereits verwendet hast.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="invoicesSection"]',
          content: 'Lade alle deine Rechnungen als PDF herunter - perfekt für die Buchhaltung.',
          placement: 'top'
        },
        {
          target: 'button[class*="passwordChange"]',
          content: 'Ändere hier dein Passwort oder aktualisiere deine E-Mail-Adresse.',
          placement: 'left'
        }
      ]);
    }

    // Envelopes (Digitale Signaturen) Tour
    else if (currentPath === '/envelopes') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Digitale Signaturen ✍️</h2>
              <p>Erstelle, versende und verfolge digital signierte Verträge - rechtssicher und einfach.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'button[class*="createEnvelope"]',
          content: 'Erstelle ein neues Signatur-Envelope. Lade einen Vertrag hoch und füge Unterzeichner hinzu.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="envelopesList"]',
          content: 'Alle deine Signatur-Envelopes werden hier angezeigt. Sieh den Status in Echtzeit: Versendet, Signiert, Abgeschlossen.',
          placement: 'bottom'
        },
        {
          target: 'button[class*="filterButton"]',
          content: 'Filtere nach Status: Entwürfe, Ausstehend, Abgeschlossen oder Abgelaufen.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="statusBadge"]',
          content: 'Jedes Envelope zeigt seinen Status: Grün = Fertig, Gelb = In Arbeit, Rot = Problem.',
          placement: 'left'
        }
      ]);
    }

    // Company Profile Tour
    else if (currentPath === '/company-profile') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Firmenprofile 🏢</h2>
              <p>Speichere deine Firmendaten einmal und nutze sie automatisch für alle generierten Verträge.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'button[class*="createProfile"]',
          content: 'Erstelle ein neues Firmenprofil mit allen wichtigen Daten: Name, Adresse, USt-ID, Bankverbindung.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="profilesList"]',
          content: 'Verwalte mehrere Firmenprofile - perfekt wenn du für verschiedene Unternehmen Verträge erstellst.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="logoUpload"]',
          content: 'Lade dein Firmenlogo hoch. Es wird automatisch in generierte Verträge eingefügt.',
          placement: 'left'
        },
        {
          target: 'button[class*="setDefault"]',
          content: 'Setze ein Profil als Standard. Dieses wird automatisch beim Vertragsgenerator vorausgewählt.',
          placement: 'top'
        }
      ]);
    }

    // Better Contracts Tour
    else if (currentPath === '/better-contracts') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Bessere Verträge 🎯</h2>
              <p>Lerne Best Practices für faire Vertragsgestaltung und vermeide häufige Fehler.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'div[class*="categoryCards"]',
          content: 'Wähle eine Vertragskategorie: Mietverträge, Arbeitsverträge, Freelancer-Verträge und mehr.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="tipsSection"]',
          content: 'Hier findest du konkrete Tipps: Was sollte in deinem Vertrag stehen? Welche Klauseln sind wichtig?',
          placement: 'bottom'
        },
        {
          target: 'div[class*="examplesSection"]',
          content: 'Schau dir Beispiel-Klauseln an, die du direkt in deine Verträge übernehmen kannst.',
          placement: 'top'
        },
        {
          target: 'button[class*="generateFromTemplate"]',
          content: 'Erstelle direkt einen Vertrag basierend auf den Best Practices - mit einem Klick zum Generator.',
          placement: 'left'
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

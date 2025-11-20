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
          target: 'div[class*="history"]',
          content: 'Alle deine Chats werden hier gespeichert. Du kannst jederzeit zu früheren Gesprächen zurückkehren.',
          placement: 'right'
        },
        {
          target: 'div[class*="uploadSection"]',
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
    else if (currentPath === '/profile' || currentPath === '/me') {
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
          target: 'button[class*="upgradeButton"]',
          content: 'Hier siehst du deinen aktuellen Plan und kannst upgraden, um mehr Features freizuschalten.',
          placement: 'bottom'
        },
        {
          target: 'button[class*="companyProfileButton"]',
          content: 'Erstelle ein Firmenprofil für die automatische Vertragserstellung mit deinen Firmendaten.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="invoicesContainer"]',
          content: 'Lade alle deine Rechnungen als PDF herunter - perfekt für die Buchhaltung.',
          placement: 'top'
        },
        {
          target: 'button[class*="passwordButton"]',
          content: 'Ändere hier dein Passwort für mehr Sicherheit.',
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
          target: 'div[class*="headerActions"]',
          content: 'Hier kannst du die Ansicht aktualisieren und neue Signaturanfragen erstellen.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="filterTabs"]',
          content: 'Filtere nach Status: Alle, Offen oder Abgeschlossen.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="cardsContainer"]',
          content: 'Alle deine Signatur-Envelopes werden hier angezeigt. Sieh den Status und Fortschritt in Echtzeit.',
          placement: 'top'
        },
        {
          target: 'div[class*="statusBadge"]',
          content: 'Jedes Envelope zeigt seinen Status: Grün = Abgeschlossen, Gelb = In Arbeit, Blau = Gesendet.',
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
              <h2>Firmenprofil 🏢</h2>
              <p>Speichere deine Firmendaten einmal und nutze sie automatisch für alle generierten Verträge.</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: 'div[class*="logoUpload"]',
          content: 'Lade dein Firmenlogo hoch. Es wird automatisch in generierte Verträge eingefügt.',
          placement: 'bottom'
        },
        {
          target: 'div[class*="formSection"]',
          content: 'Trage hier alle wichtigen Firmendaten ein: Name, Adresse, USt-ID, Kontaktdaten und Bankverbindung.',
          placement: 'top'
        },
        {
          target: 'button[class*="saveButton"]',
          content: 'Speichere dein Firmenprofil. Die Daten werden automatisch beim Vertragsgenerator verwendet.',
          placement: 'left'
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
              <p>Finde günstigere Alternativen zu deinen bestehenden Verträgen und spare Geld!</p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        },
        {
          target: '.contract-uploader',
          content: 'Lade deinen aktuellen Vertrag hoch (z.B. Handy, Internet, Versicherung). Die KI extrahiert automatisch alle wichtigen Daten.',
          placement: 'bottom'
        },
        {
          target: '.contract-progress-steps',
          content: 'Der Prozess ist in 3 Schritte unterteilt: Upload, Preis-Eingabe und Alternativen-Suche.',
          placement: 'top'
        }
      ]);
    }

    // Default Tour (kein spezifischer Ort)
    else {
      setSteps([]);
    }
  }, [location.pathname]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    // Log für Debugging
    if (type === 'error:target_not_found') {
      console.warn(`⚠️ Onboarding Tour: Step ${index} - Target nicht gefunden, überspringe...`);
      // Tour läuft trotzdem weiter zum nächsten Step
      return;
    }

    // Tour beendet oder übersprungen
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }

    // Bei Fehler auch beenden (falls alle Targets fehlen)
    if (status === STATUS.ERROR) {
      console.warn('⚠️ Onboarding Tour: Fehler aufgetreten, beende Tour');
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
      disableScrolling={false}
      spotlightClicks={false}
      disableOverlayClose={true}
      hideBackButton={false}
      floaterProps={{
        disableAnimation: false
      }}
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

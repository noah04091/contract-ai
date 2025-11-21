// 📁 frontend/src/components/OnboardingTour.tsx
// Interactive Onboarding Tour für neue User - VEREINFACHT & FUNKTIONIEREND

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

  // Tour-Steps basierend auf aktueller Route - NUR FUNKTIONIERENDE STEPS
  useEffect(() => {
    const currentPath = location.pathname;

    // Dashboard Tour - NUR Willkommen (Charts laden zu spät)
    if (currentPath === '/dashboard') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Willkommen bei Contract AI! 🎉</h2>
              <p>Dies ist dein Dashboard - hier siehst du alle wichtigen Statistiken zu deinen Verträgen auf einen Blick.</p>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Nutze die Navigation links, um deine Verträge zu verwalten, Fristen zu überwachen und die KI-Features zu nutzen.
              </p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <p>Hier verwaltest du alle deine Verträge. Du kannst:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Neue Verträge per Drag & Drop hochladen</li>
                <li>Verträge in Ordnern organisieren</li>
                <li>Nach Verträgen suchen und filtern</li>
                <li>Verträge als Excel exportieren</li>
              </ul>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <p>Hier siehst du alle wichtigen Termine aus deinen Verträgen:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Kündigungsfristen</li>
                <li>Vertragsverlängerungen</li>
                <li>Zahlungstermine</li>
              </ul>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Wechsle zwischen Monats-, Wochen- und Tagesansicht mit den Buttons oben.
              </p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <p>Die KI analysiert deine Verträge und gibt dir konkrete Verbesserungsvorschläge:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Risiken identifizieren</li>
                <li>Bessere Konditionen vorschlagen</li>
                <li>Klauseln verbessern</li>
              </ul>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Wähle einen Vertrag aus der Liste, um die Optimierung zu starten.
              </p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <p>Vergleiche zwei Verträge Seite an Seite und lass die KI die wichtigsten Unterschiede hervorheben.</p>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Perfekt um verschiedene Angebote oder Vertragsversionen zu vergleichen.
              </p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        }
      ]);
    }

    // Generate Tour
    else if (currentPath === '/generate' || currentPath === '/Generate') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Vertragsgenerator ✍️</h2>
              <p>Erstelle professionelle Verträge in wenigen Minuten:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Wähle einen Vertragstyp</li>
                <li>Fülle die wichtigsten Felder aus</li>
                <li>Die KI generiert einen rechtssicheren Vertrag</li>
              </ul>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Dein Firmenprofil wird automatisch eingefügt, wenn vorhanden.
              </p>
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
              <p>Analysiere deine Verträge auf rechtliche Risiken:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Unwirksame Klauseln erkennen</li>
                <li>Gesetzesänderungen prüfen</li>
                <li>Compliance-Check durchführen</li>
              </ul>
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
              <p>Dein KI-Rechtsassistent für alle Vertragsfragen:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Fragen zu Vertragsrecht stellen</li>
                <li>Verträge hochladen und analysieren lassen</li>
                <li>Konkrete Handlungsempfehlungen erhalten</li>
              </ul>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Die Chat-Historie wird automatisch gespeichert.
              </p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <p>Verwalte hier dein Konto:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Abo-Status und Upgrade-Optionen</li>
                <li>Rechnungen herunterladen</li>
                <li>Passwort ändern</li>
                <li>Firmenprofil verknüpfen</li>
              </ul>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        }
      ]);
    }

    // Envelopes Tour
    else if (currentPath === '/envelopes') {
      setSteps([
        {
          target: 'body',
          content: (
            <div>
              <h2>Digitale Signaturen ✍️</h2>
              <p>Erstelle und verwalte digitale Signaturanfragen:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Verträge zum Unterschreiben versenden</li>
                <li>Status in Echtzeit verfolgen</li>
                <li>Erinnerungen an Unterzeichner senden</li>
                <li>Signierte Dokumente herunterladen</li>
              </ul>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <p>Speichere deine Firmendaten einmalig:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Firmenname und Rechtsform</li>
                <li>Adresse und Kontaktdaten</li>
                <li>USt-ID und Handelsregister</li>
                <li>Bankverbindung</li>
                <li>Firmenlogo</li>
              </ul>
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                Diese Daten werden automatisch in generierte Verträge eingefügt.
              </p>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
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
              <h2>Bessere Verträge finden 🎯</h2>
              <p>Finde günstigere Alternativen zu deinen bestehenden Verträgen:</p>
              <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '14px' }}>
                <li>Vertrag hochladen (Handy, Internet, Versicherung...)</li>
                <li>Aktuellen Preis eingeben</li>
                <li>KI findet bessere Angebote</li>
              </ul>
            </div>
          ),
          placement: 'center',
          disableBeacon: true
        }
      ]);
    }

    // Default - keine Tour
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
      showSkipButton
      hideBackButton
      disableOverlayClose={true}
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
          padding: '24px',
          fontSize: '15px',
          maxWidth: '420px'
        },
        tooltipContent: {
          padding: '10px 0'
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 500
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '14px'
        }
      }}
      locale={{
        close: 'Verstanden',
        last: 'Verstanden',
        next: 'Verstanden',
        skip: 'Überspringen'
      }}
    />
  );
}

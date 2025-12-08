// 📁 frontend/src/components/OnboardingTour.tsx
// Interactive Onboarding Tour - V2 Modern & Professional Design

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation } from 'react-router-dom';

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

// Einheitliche Styled Components für Tour-Content
const TourContent = ({
  icon,
  title,
  description,
  features
}: {
  icon: string;
  title: string;
  description: string;
  features?: string[];
}) => (
  <div style={{
    textAlign: 'left',
    minWidth: '340px',
    maxWidth: '460px'
  }}>
    {/* Header mit Icon */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    }}>
      <span style={{
        fontSize: '32px',
        lineHeight: 1
      }}>{icon}</span>
      <h2 style={{
        margin: 0,
        fontSize: '20px',
        fontWeight: 700,
        color: '#111827',
        lineHeight: 1.3
      }}>{title}</h2>
    </div>

    {/* Beschreibung */}
    <p style={{
      margin: '0 0 16px 0',
      fontSize: '15px',
      lineHeight: 1.6,
      color: '#4b5563'
    }}>
      {description}
    </p>

    {/* Feature-Liste */}
    {features && features.length > 0 && (
      <ul style={{
        margin: 0,
        padding: 0,
        listStyle: 'none'
      }}>
        {features.map((feature, index) => (
          <li key={index} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: index < features.length - 1 ? '10px' : 0,
            fontSize: '14px',
            lineHeight: 1.5,
            color: '#374151'
          }}>
            <span style={{
              color: '#3b82f6',
              fontWeight: 600,
              flexShrink: 0,
              marginTop: '2px'
            }}>•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

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
            <TourContent
              icon="🎉"
              title="Willkommen bei Contract AI!"
              description="Dies ist dein Dashboard – hier siehst du alle wichtigen Statistiken und Informationen zu deinen Verträgen auf einen Blick."
              features={[
                'Übersicht über alle Verträge und deren Status',
                'Anstehende Fristen und Erinnerungen',
                'Quick Actions für häufige Aufgaben',
                'Navigation zu allen Features über die Seitenleiste'
              ]}
            />
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
            <TourContent
              icon="📄"
              title="Deine Vertragsverwaltung"
              description="Hier verwaltest du alle deine Verträge zentral an einem Ort. Lade neue Verträge hoch und organisiere sie nach deinen Wünschen."
              features={[
                'Neue Verträge per Drag & Drop hochladen',
                'Verträge in Ordnern strukturieren',
                'Suchen, filtern und sortieren',
                'Als Excel exportieren'
              ]}
            />
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
            <TourContent
              icon="📅"
              title="Dein Fristenkalender"
              description="Behalte alle wichtigen Termine aus deinen Verträgen im Blick. Nie wieder eine Kündigungsfrist verpassen!"
              features={[
                'Kündigungsfristen automatisch erkannt',
                'Vertragsverlängerungen im Überblick',
                'Zahlungstermine tracken',
                'Monats-, Wochen- und Tagesansicht'
              ]}
            />
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
            <TourContent
              icon="🚀"
              title="Vertragsoptimierung"
              description="Lass die KI deine Verträge analysieren und erhalte konkrete Verbesserungsvorschläge für bessere Konditionen."
              features={[
                'Risiken und Schwachstellen identifizieren',
                'Bessere Konditionen vorschlagen',
                'Klauseln optimieren lassen',
                'Rechtssicherheit verbessern'
              ]}
            />
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
            <TourContent
              icon="⚖️"
              title="Vertragsvergleich"
              description="Vergleiche zwei Verträge direkt nebeneinander. Die KI hebt automatisch die wichtigsten Unterschiede hervor."
              features={[
                'Side-by-Side Vergleichsansicht',
                'Unterschiede automatisch markiert',
                'Ideal für verschiedene Angebote',
                'Vertragsversionen vergleichen'
              ]}
            />
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
            <TourContent
              icon="✍️"
              title="Vertragsgenerator"
              description="Erstelle professionelle, rechtssichere Verträge in wenigen Minuten. Wähle einen Vertragstyp und fülle die wichtigsten Felder aus."
              features={[
                'Viele Vertragstypen verfügbar',
                'KI generiert rechtssicheren Vertrag',
                'Firmenprofil wird automatisch eingefügt',
                'Direkt als PDF herunterladen'
              ]}
            />
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
            <TourContent
              icon="⚡"
              title="Legal Pulse"
              description="Analysiere deine Verträge auf rechtliche Risiken und bleibe über aktuelle Gesetzesänderungen informiert."
              features={[
                'Unwirksame Klauseln automatisch erkennen',
                'Gesetzesänderungen prüfen',
                'Compliance-Check durchführen',
                'Handlungsempfehlungen erhalten'
              ]}
            />
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
            <TourContent
              icon="💬"
              title="Legal Chat"
              description="Dein persönlicher KI-Rechtsassistent für alle Fragen rund um Verträge. Lade Dokumente hoch und erhalte sofort Antworten."
              features={[
                'Fragen zu Vertragsrecht stellen',
                'Verträge hochladen und analysieren',
                'Konkrete Handlungsempfehlungen',
                'Chat-Historie wird gespeichert'
              ]}
            />
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
            <TourContent
              icon="👤"
              title="Dein Profil"
              description="Verwalte hier dein Konto, sieh deinen Abo-Status ein und lade vergangene Rechnungen herunter."
              features={[
                'Abo-Status und Upgrade-Optionen',
                'Rechnungen herunterladen',
                'Passwort ändern',
                'Firmenprofil verknüpfen'
              ]}
            />
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
            <TourContent
              icon="✒️"
              title="Digitale Signaturen"
              description="Erstelle und verwalte digitale Signaturanfragen. Versende Verträge zum Unterschreiben und verfolge den Status in Echtzeit."
              features={[
                'Verträge zum Unterschreiben versenden',
                'Status in Echtzeit verfolgen',
                'Erinnerungen an Unterzeichner senden',
                'Signierte Dokumente herunterladen'
              ]}
            />
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
            <TourContent
              icon="🏢"
              title="Firmenprofil"
              description="Speichere deine Firmendaten einmalig ab. Diese werden automatisch in generierte Verträge eingefügt."
              features={[
                'Firmenname und Rechtsform',
                'Adresse und Kontaktdaten',
                'USt-ID und Handelsregister',
                'Bankverbindung und Logo'
              ]}
            />
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
            <TourContent
              icon="🎯"
              title="Bessere Verträge finden"
              description="Finde günstigere Alternativen zu deinen bestehenden Verträgen. Die KI analysiert dein Angebot und sucht bessere Optionen."
              features={[
                'Vertrag hochladen (Handy, Internet, etc.)',
                'Aktuellen Preis eingeben',
                'KI findet bessere Angebote',
                'Direkt wechseln oder kündigen'
              ]}
            />
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
      disableScrolling={true}
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#0066ff',
          textColor: '#111827',
          backgroundColor: '#ffffff',
          // Dunklerer, solider Overlay - KEIN Blur
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          arrowColor: '#ffffff',
          zIndex: 10000
        },
        // Solider weißer Hintergrund - KEIN Blur, KEINE Transparenz
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          // Entferne alle Filter/Blur-Effekte
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          filter: 'none'
        },
        spotlight: {
          // Kein Spotlight bei center placement - komplett ausblenden
          backgroundColor: 'transparent',
          borderRadius: 0
        },
        tooltip: {
          borderRadius: '16px',
          padding: '28px 32px',
          // Solider weißer Hintergrund
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          maxWidth: '520px',
          width: 'auto',
          // Stelle sicher, dass kein Blur durchkommt
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          isolation: 'isolate'
        },
        tooltipContainer: {
          textAlign: 'left',
          backgroundColor: '#ffffff'
        },
        tooltipContent: {
          padding: '0 0 20px 0',
          textAlign: 'left',
          backgroundColor: '#ffffff'
        },
        tooltipFooter: {
          marginTop: '0',
          backgroundColor: '#ffffff'
        },
        buttonNext: {
          backgroundColor: '#0066ff',
          borderRadius: '10px',
          padding: '14px 28px',
          fontSize: '15px',
          fontWeight: 600,
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(0, 102, 255, 0.35)',
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer'
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: 500,
          padding: '14px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer'
        },
        buttonClose: {
          display: 'none'
        }
      }}
      locale={{
        close: 'Verstanden',
        last: 'Verstanden',
        next: 'Verstanden',
        skip: 'Überspringen'
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            // Entferne filter - kann Blur verursachen
            filter: 'none'
          }
        }
      }}
    />
  );
}

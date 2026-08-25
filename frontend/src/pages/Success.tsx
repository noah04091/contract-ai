import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import styles from "../styles/Success.module.css";
import { fetchUserData } from '../utils/fetchUserData';
import { useAuth } from '../context/AuthContext';
import Galaxy from '../components/Galaxy';

const Success: React.FC = () => {
  const { refetchUser } = useAuth(); // 🔄 AuthContext refreshen nach Abo-Kauf
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [planName, setPlanName] = useState<string>('');

  // Subscription Status Polling with Fallback
  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 30; // 60 Sekunden polling
    let fallbackAttempts = 0;

    // Fallback: Direkt bei Stripe verifizieren
    const verifyWithStripe = async (): Promise<boolean> => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) return false;


        const response = await fetch('/api/stripe/verify-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.subscriptionActive) {
            setSubscriptionActive(true);
            setPlanName(data.subscriptionPlan === 'business' ? 'Business' : 'Enterprise');
            setIsLoading(false);
            // 🔄 AuthContext aktualisieren damit alle Seiten den neuen Status haben
            refetchUser();
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error('❌ [FALLBACK] Fehler:', error);
        return false;
      }
    };

    const checkSubscriptionStatus = async () => {
      try {
        const data = await fetchUserData();

        // Check if subscription is active and not free
        if (data.subscriptionActive && data.subscriptionPlan !== 'free') {
          setSubscriptionActive(true);
          setPlanName(data.subscriptionPlan === 'business' ? 'Business' : 'Enterprise');
          setIsLoading(false);
          // 🔄 AuthContext aktualisieren damit alle Seiten den neuen Status haben
          refetchUser();
          return true; // Stop polling
        }

        pollCount++;

        // Automatischer Fallback bei mehreren Intervallen (10s, 20s, 30s, 45s)
        const fallbackIntervals = [5, 10, 15, 22];
        if (fallbackIntervals.includes(pollCount) && fallbackAttempts < 4) {
          fallbackAttempts++;
          const fallbackSuccess = await verifyWithStripe();
          if (fallbackSuccess) {
            return true; // Stop polling
          }
        }

        if (pollCount >= maxPolls) {
          // Letzter Versuch mit Fallback
          const fallbackSuccess = await verifyWithStripe();
          if (fallbackSuccess) {
            return true;
          }
          // Auch wenn nicht aktiviert, Loading beenden - User kann zum Dashboard
          setIsLoading(false);
          return true; // Stop polling
        }

        return false; // Continue polling
      } catch (error) {
        console.error('❌ Error checking subscription status:', error);
        pollCount++;
        return pollCount >= maxPolls;
      }
    };

    // Initial check
    checkSubscriptionStatus().then(shouldStop => {
      if (!shouldStop) {
        // Start polling every 2 seconds
        const interval = setInterval(async () => {
          const shouldStop = await checkSubscriptionStatus();
          if (shouldStop) {
            clearInterval(interval);
          }
        }, 2000);

        return () => clearInterval(interval);
      }
    });

    document.title = 'Bezahlung erfolgreich | Contract AI';

    // Animation beim Laden der Seite
    const timer = setTimeout(() => {
      const successIcon = document.querySelector(`.${styles.successIcon}`);
      const successContent = document.querySelector(`.${styles.successContent}`);

      if (successIcon) {
        successIcon.classList.add(styles.animate);
      }

      if (successContent) {
        successContent.classList.add(styles.animate);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Helmet>
        <title>Erfolgreich abonniert | Contract AI</title>
        <meta name="description" content="Danke für dein Vertrauen! Dein Abo bei Contract AI ist nun aktiv. Starte jetzt mit deiner Vertragsanalyse und allen Premium-Features." />
        <meta name="keywords" content="Abo erfolgreich, Vertragsanalyse starten, Contract AI Premium" />
        <link rel="canonical" href="https://www.contract-ai.de/success" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Erfolgreich abonniert | Contract AI" />
        <meta property="og:description" content="Du hast erfolgreich dein Contract AI Abo abgeschlossen. Los geht's mit allen Premium-Funktionen!" />
        <meta property="og:url" content="https://www.contract-ai.de/success" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Erfolgreich abonniert | Contract AI" />
        <meta name="twitter:description" content="Abo abgeschlossen — jetzt alle Premium-Funktionen nutzen und Verträge wie ein Profi managen!" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.successContainer}>
        {/* Galaxy Background */}
        <div className={styles.galaxyBackground}>
          <Galaxy
            density={1.5}
            glowIntensity={0.5}
            saturation={0.8}
            hueShift={240}
            speed={0.5}
            mouseInteraction={false}
            mouseRepulsion={false}
            transparent={false}
          />
        </div>

        <div className={styles.successCard}>
          <div className={styles.successIconContainer}>
            <div className={styles.successIcon}>✓</div>
          </div>
          
          <div className={styles.successContent}>
            {/* ⚠️ 25.08.2026: Diese Seite hat gesiezt, während das gesamte übrige
                Produkt duzt (Registrierung, Onboarding, Erststart, Mails). Der Wechsel
                fiel ausgerechnet auf den Moment, in dem jemand gerade Geld überwiesen
                hat — da wirkt eine plötzlich distanzierte Anrede wie ein anderes
                Unternehmen. Durchgängig auf Du umgestellt. */}
            <h1 className={styles.title}>Bezahlung erfolgreich</h1>

            <p className={styles.message}>
              Danke für dein Vertrauen.
              Deine Zahlung ist angekommen{subscriptionActive ? ' und dein Konto ist freigeschaltet' : ''}.
            </p>

            <div className={styles.detailsContainer}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.detailValue}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.spinner}>⏳</span>
                      Wird aktiviert...
                    </span>
                  ) : subscriptionActive ? (
                    <span style={{ color: '#22c55e' }}>✅ Aktiv</span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>⏳ Aktivierung läuft...</span>
                  )}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Plan</span>
                <span className={styles.detailValue}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.spinner}>⏳</span>
                      Laden...
                    </span>
                  ) : planName ? (
                    <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{planName}</span>
                  ) : (
                    'Wird geladen...'
                  )}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Zugang</span>
                <span className={styles.detailValue}>
                  {subscriptionActive ? 'Sofort verfügbar' : 'Nach Aktivierung'}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Rechnung</span>
                <span className={styles.detailValue}>Kommt per E-Mail</span>
              </div>
            </div>

            {/* ⚠️ 25.08.2026: Bleibt die Freischaltung nach 60 Sekunden aus, stand hier
                bisher nur ein oranges "Aktivierung läuft…" — ohne jede Handlung für
                jemanden, der gerade bezahlt hat. Das ist der unangenehmste denkbare
                Moment für eine Sackgasse. Jetzt bekommt genau dieser Fall eine
                Erklärung und einen Weg. */}
            {!isLoading && !subscriptionActive && (
              <p className={styles.message} style={{ fontSize: '14px', opacity: 0.9 }}>
                Deine Zahlung ist durch, die Freischaltung dauert hier gerade länger als
                gewöhnlich. Du kannst das Fenster schließen, sie läuft im Hintergrund weiter.
                Ist in ein paar Minuten noch nichts passiert, schreib uns kurz, wir erledigen
                das von Hand.
              </p>
            )}

            <div className={styles.buttonContainer}>
              <Link to="/dashboard" className={styles.dashboardButton}>
                Weiter zum Dashboard
              </Link>
            </div>

            <p className={styles.supportText}>
              Fragen? Schreib uns über den <Link to="/support" className={styles.supportLink}>Support</Link> oder antworte einfach auf die Bestätigungs-E-Mail.
            </p>
          </div>
        </div>
        
        <div className={styles.confetti}>
          <span>🎉</span>
          <span>✨</span>
          <span>🎉</span>
          <span>✨</span>
          <span>🎉</span>
        </div>
      </div>
    </>
  );
};

export default Success;
import React, { useState, useEffect } from 'react';
import styles from './CookieConsentBanner.module.css';

// TypeScript-Interface für Window-Erweiterung
declare global {
  interface Window {
    openCookieSettings?: () => void;
  }
}

interface CookieConsent {
  essentiell: boolean;
  marketing: boolean;
  timestamp: number;
}

const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);

  // Consent aus localStorage laden oder initialisieren
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      // Kein Consent vorhanden → Banner anzeigen
      setIsVisible(true);
    } else {
      // Vorhandenen Consent laden
      try {
        const consent: CookieConsent = JSON.parse(savedConsent);
        setMarketingAccepted(consent.marketing);
        
        // Marketing-Skripte laden, falls bereits akzeptiert
        if (consent.marketing) {
          loadMarketingScripts();
        }
      } catch (error) {
        console.error('Error parsing consent data:', error);
        setIsVisible(true);
      }
    }

    // Globale Funktion zum Öffnen des Cookie-Banners
    window.openCookieSettings = () => {
      setIsVisible(true);
      setShowSettings(false);
    };

    // Cleanup
    return () => {
      delete window.openCookieSettings;
    };
  }, []);

  // Marketing-Skripte laden (Beispiel mit Stripe)
  const loadMarketingScripts = () => {
    // Beispiel: Stripe laden
    if (!document.querySelector('script[src*="stripe"]')) {
      const stripeScript = document.createElement('script');
      stripeScript.src = 'https://js.stripe.com/v3/';
      stripeScript.async = true;
      document.head.appendChild(stripeScript);
    }

    // Hier können weitere Marketing-Tools geladen werden:
    // Google Analytics, Facebook Pixel, etc.
    console.log('Marketing scripts loaded');
  };

  // Consent speichern
  const saveConsent = (essentiell: boolean, marketing: boolean) => {
    const consent: CookieConsent = {
      essentiell,
      marketing,
      timestamp: Date.now()
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    setMarketingAccepted(marketing);
    
    // Marketing-Skripte laden, falls akzeptiert
    if (marketing) {
      loadMarketingScripts();
    }
    
    setIsVisible(false);
    setShowSettings(false);
  };

  // Nur notwendige Cookies akzeptieren
  const handleAcceptEssential = () => {
    saveConsent(true, false);
  };

  // Alle Cookies akzeptieren
  const handleAcceptAll = () => {
    saveConsent(true, true);
  };

  // Auswahl speichern
  const handleSaveSelection = () => {
    saveConsent(true, marketingAccepted);
  };

  if (!isVisible) {
    return null; // Kein Zahnrad mehr - wird über Footer-Link geöffnet
  }

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} />
      
      {/* Banner */}
      <div className={styles.banner}>
        <div className={styles.content}>
          <h2 className={styles.title}>Cookie-Einstellungen</h2>
          <p className={styles.description}>
            Wir verwenden Cookies, um Ihnen die bestmögliche Nutzererfahrung zu bieten. 
            Essenzielle Cookies sind für die Grundfunktionen unserer Website erforderlich. 
            Marketing-Cookies helfen uns dabei, unser Angebot zu verbessern und zu personalisieren.
          </p>
          <p className={styles.privacyLink}>
            Mehr erfahren in unserer <a href="/datenschutz" className={styles.privacyLinkAnchor}>Datenschutzerklärung</a>
          </p>

          {showSettings && (
            <div className={styles.settings}>
              <div className={styles.cookieCategory}>
                <div className={styles.categoryHeader}>
                  <label className={styles.categoryLabel}>
                    <input 
                      type="checkbox" 
                      checked={true} 
                      disabled 
                      className={styles.checkbox}
                    />
                    <span className={styles.categoryName}>Essenzielle Cookies</span>
                  </label>
                </div>
                <p className={styles.categoryDescription}>
                  Diese Cookies sind für die Grundfunktionen der Website erforderlich 
                  und können nicht deaktiviert werden.
                </p>
              </div>

              <div className={styles.cookieCategory}>
                <div className={styles.categoryHeader}>
                  <label className={styles.categoryLabel}>
                    <input 
                      type="checkbox" 
                      checked={marketingAccepted}
                      onChange={(e) => setMarketingAccepted(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.categoryName}>Marketing-Cookies</span>
                  </label>
                </div>
                <p className={styles.categoryDescription}>
                  Diese Cookies werden für Marketingzwecke verwendet und helfen uns dabei, 
                  relevante Werbung und Inhalte anzuzeigen.
                </p>
              </div>
            </div>
          )}

          <div className={styles.buttons}>
            {!showSettings ? (
              <>
                <button 
                  className={styles.button}
                  onClick={handleAcceptEssential}
                >
                  Nur notwendige akzeptieren
                </button>
                <button 
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={handleAcceptAll}
                >
                  Alle akzeptieren
                </button>
                <button 
                  className={styles.buttonLink}
                  onClick={() => setShowSettings(true)}
                >
                  Einstellungen anpassen
                </button>
              </>
            ) : (
              <>
                <button 
                  className={styles.button}
                  onClick={() => setShowSettings(false)}
                >
                  Zurück
                </button>
                <button 
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={handleSaveSelection}
                >
                  Auswahl speichern
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CookieConsentBanner;
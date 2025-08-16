import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import "../../styles/landing.css";

const LegalPulse: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Legal Pulse - Frühwarnsystem für Risiken | Contract AI";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Ihr Echtzeit-Radar für Vertragsrisiken. Legal Pulse hält Sie auf dem neuesten Stand und schützt vor bösen Überraschungen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Ihr Echtzeit-Radar für Vertragsrisiken. Legal Pulse hält Sie auf dem neuesten Stand und schützt vor bösen Überraschungen.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const vorteile = [
    {
      title: "Immer aktuell",
      description: "Kein Risiko durch veraltete Klauseln"
    },
    {
      title: "Automatisiert",
      description: "Sie müssen nicht selbst recherchieren"
    },
    {
      title: "Proaktiv",
      description: "Erkennen & handeln, bevor Probleme entstehen"
    }
  ];

  const funktionen = [
    "Prüft Ihre Verträge regelmäßig",
    "Erkennt neue rechtliche Risiken",
    "Gibt konkrete Handlungsempfehlungen"
  ];

  return (
    <>
      <div className={styles.featureContainer}>
        
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <h1 className={`${styles.heroTitle} fadeInUp`}>
            Ihr Echtzeit-Radar für <br />
            <span className={styles.heroTitleHighlight}>Vertragsrisiken</span>
          </h1>
          <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
            Gesetze ändern sich, Märkte wandeln sich – Legal Pulse hält Sie immer auf dem 
            neuesten Stand und schützt vor bösen Überraschungen.
          </p>
        </section>
        
        {/* Was es macht Section */}
        <section className={styles.funktionSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.2s' }}>
            <h2 className={styles.sectionTitle}>Was es macht</h2>
            <div className={styles.funktionGrid}>
              {funktionen.map((funktion, index) => (
                <div key={index} className={`${styles.funktionItem} fadeInUp`} style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                  <div className={styles.funktionIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <p className={styles.funktionText}>{funktion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vorteile Section */}
        <section className={styles.vorteileSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.4s' }}>
            <h2 className={styles.sectionTitle}>Ihre Vorteile</h2>
            <div className={styles.vorteileGrid}>
              {vorteile.map((vorteil, index) => (
                <div key={index} className={`${styles.vorteilCard} fadeInUp`} style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
                  <h3 className={styles.vorteilTitle}>{vorteil.title}</h3>
                  <p className={styles.vorteilText}>{vorteil.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Beispiel Section */}
        <section className={styles.beispielSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.6s' }}>
            <h2 className={styles.sectionTitle}>Praxisbeispiel</h2>
            <div className={styles.beispielBox}>
              <div className={styles.beispielIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <blockquote className={styles.beispielText}>
                „Neue EU-Datenschutzrichtlinie betrifft Ihre Auftragsverarbeitungsverträge – 
                Anpassung empfohlen."
              </blockquote>
              <p className={styles.beispielHinweis}>
                Frühzeitige Warnung vor rechtlichen Änderungen
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Überwachung</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>∅ 48h</div>
                <div className={styles.statLabel}>Reaktionszeit</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>100+</div>
                <div className={styles.statLabel}>Rechtsquellen</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Bleiben Sie rechtlich auf der sicheren Seite</h2>
              <p className={styles.ctaSubtitle}>
                Aktivieren Sie Legal Pulse und schützen Sie sich vor Risiken
              </p>
              {user && user.subscriptionActive ? (
                <Link to="/legalpulse" className={styles.ctaButton}>
                  Zum Legal Pulse
                </Link>
              ) : (
                <Link to="/login" className={styles.ctaButton}>
                  Jetzt kostenlos testen
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
};

export default LegalPulse;
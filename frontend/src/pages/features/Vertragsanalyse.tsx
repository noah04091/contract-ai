import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";

const Vertragsanalyse: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Vertragsanalyse mit KI | Contract AI";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'KI-gestützte Vertragsanalyse – Chancen, Risiken & Verständlichkeit auf einen Blick. Analysieren Sie Verträge in Sekunden mit Contract AI.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'KI-gestützte Vertragsanalyse – Chancen, Risiken & Verständlichkeit auf einen Blick. Analysieren Sie Verträge in Sekunden mit Contract AI.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const vorteile = [
    {
      title: "Schnell",
      description: "Analyse in Sekunden statt Stunden."
    },
    {
      title: "Präzise",
      description: "Erkennt auch versteckte Formulierungsfallen."
    },
    {
      title: "Übersichtlich",
      description: "Ampelsystem & Score für schnelle Entscheidungen."
    }
  ];

  const funktionen = [
    "Unsere KI prüft Ihren Vertrag Zeile für Zeile.",
    "Risiken werden markiert, Chancen hervorgehoben.",
    "Verständlichkeit wird mit einem Score bewertet – perfekt für Laien und Profis."
  ];

  return (
    <div className={styles.featureContainer}>
      
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </div>
        <h1 className={`${styles.heroTitle} fadeInUp`}>
          KI-gestützte Vertragsanalyse – <br />
          <span className={styles.heroTitleHighlight}>Chancen, Risiken & Verständlichkeit auf einen Blick</span>
        </h1>
        <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
          Komplexe Verträge müssen nicht kompliziert sein. Mit Contract AI sehen Sie sofort, 
          wo Chancen liegen, welche Risiken verborgen sind und wie verständlich der Vertrag formuliert ist.
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
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <blockquote className={styles.beispielText}>
              „Ihre Kündigungsfrist ist ungewöhnlich lang – das könnte zu Nachteilen führen. 
              Kürzen Sie diese auf 3 Monate, um flexibler zu bleiben."
            </blockquote>
            <p className={styles.beispielHinweis}>
              So könnte eine typische Analyse-Empfehlung aussehen
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>15 Sek</div>
              <div className={styles.statLabel}>Durchschnittliche Analysezeit</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>98%</div>
              <div className={styles.statLabel}>Erkennungsgenauigkeit</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>1000+</div>
              <div className={styles.statLabel}>Analysierte Verträge</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Bereit für Ihre erste Vertragsanalyse?</h2>
            <p className={styles.ctaSubtitle}>
              Laden Sie jetzt Ihren Vertrag hoch und erhalten Sie in Sekunden eine detaillierte Analyse
            </p>
            {user && user.subscriptionActive ? (
              <Link to="/contracts" className={styles.ctaButton}>
                Vertrag hochladen und analysieren
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
  );
};

export default Vertragsanalyse;
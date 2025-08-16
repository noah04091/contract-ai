import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import "../../styles/landing.css";

const Optimierung: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Verträge optimieren & verbessern | Contract AI";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Schwachstellen erkennen – bessere Verträge in Minuten. Optimieren Sie Ihre Verträge mit KI-gestützten Formulierungsvorschlägen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Schwachstellen erkennen – bessere Verträge in Minuten. Optimieren Sie Ihre Verträge mit KI-gestützten Formulierungsvorschlägen.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const vorteile = [
    {
      title: "Besser verhandeln",
      description: "Optimierte Formulierungen bringen Sie in eine stärkere Position."
    },
    {
      title: "Verständlich",
      description: "Auch ohne Jurastudium nachvollziehbar."
    },
    {
      title: "Sofort umsetzbar",
      description: "Änderungen können direkt übernommen werden."
    }
  ];

  const funktionen = [
    "Analysiert jede Klausel auf Fairness & Rechtssicherheit",
    "Macht Vorschläge in klarer, verständlicher Sprache",
    "Passt Formulierungen an Ihre Branche an"
  ];

  return (
    <>
      <div className={styles.featureContainer}>
        
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h1 className={`${styles.heroTitle} fadeInUp`}>
            Schwachstellen erkennen – <br />
            <span className={styles.heroTitleHighlight}>bessere Verträge in Minuten</span>
          </h1>
          <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
            Schlechte Klauseln kosten Zeit, Geld und Nerven. Unsere KI findet sie – 
            und liefert Ihnen sofort bessere Formulierungen.
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <blockquote className={styles.beispielText}>
                „Der Vertrag sieht keine Verzugszinsen vor – 
                Empfehlung: 5 % über dem Basiszinssatz ergänzen."
              </blockquote>
              <p className={styles.beispielHinweis}>
                Konkrete Verbesserungsvorschläge für Ihre Verträge
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>87%</div>
                <div className={styles.statLabel}>Fairere Verträge</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>3.5x</div>
                <div className={styles.statLabel}>Schneller als manuell</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Verfügbar</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Optimieren Sie Ihre Verträge jetzt</h2>
              <p className={styles.ctaSubtitle}>
                Verwandeln Sie schwache Klauseln in starke Formulierungen
              </p>
              {user && user.subscriptionActive ? (
                <Link to="/optimizer" className={styles.ctaButton}>
                  Jetzt Vertrag optimieren
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

export default Optimierung;
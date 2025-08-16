import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import "../../styles/landing.css";

const Vergleich: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Verträge intelligent vergleichen | Contract AI";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Welcher Vertrag ist besser? Finden Sie es heraus! Contract AI vergleicht Verträge und liefert klare Empfehlungen.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Welcher Vertrag ist besser? Finden Sie es heraus! Contract AI vergleicht Verträge und liefert klare Empfehlungen.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const vorteile = [
    {
      title: "Klarheit",
      description: "Keine versteckten Unterschiede mehr"
    },
    {
      title: "Entscheidungshilfe",
      description: "Für Kauf, Miete, Dienstleistung"
    },
    {
      title: "Objektiv",
      description: "KI-Bewertung statt Bauchgefühl"
    }
  ];

  const funktionen = [
    "Zeigt Unterschiede visuell nebeneinander",
    "Bewertet Fairness und Risiken",
    "Gibt eine klare Handlungsempfehlung"
  ];

  return (
    <>
      <div className={styles.featureContainer}>
        
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 3H3v18h18V3z"></path>
              <path d="M9 3v18"></path>
              <path d="M3 9h18"></path>
            </svg>
          </div>
          <h1 className={`${styles.heroTitle} fadeInUp`}>
            Welcher Vertrag ist besser? <br />
            <span className={styles.heroTitleHighlight}>Finden Sie es heraus!</span>
          </h1>
          <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
            Manchmal ist der Unterschied zwischen zwei Verträgen nicht auf den ersten Blick erkennbar. 
            Unsere KI vergleicht beide und liefert Ihnen eine klare Empfehlung.
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
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
              </div>
              <blockquote className={styles.beispielText}>
                „Vertrag B hat kürzere Kündigungsfristen und niedrigere Nebenkosten – 
                Empfehlung: Vertrag B."
              </blockquote>
              <p className={styles.beispielHinweis}>
                Klare Entscheidungshilfe auf einen Blick
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>2-3 Min</div>
                <div className={styles.statLabel}>Vergleichsdauer</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>95%</div>
                <div className={styles.statLabel}>Genauigkeit</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>50+</div>
                <div className={styles.statLabel}>Vergleichskriterien</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Treffen Sie die richtige Entscheidung</h2>
              <p className={styles.ctaSubtitle}>
                Vergleichen Sie Ihre Verträge und wählen Sie den besten
              </p>
              {user && user.subscriptionActive ? (
                <Link to="/compare" className={styles.ctaButton}>
                  Jetzt Verträge vergleichen
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

export default Vergleich;
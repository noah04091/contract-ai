import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import "../../styles/landing.css";

const Generator: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Verträge automatisch erstellen | Contract AI";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Individuelle, rechtssichere Verträge in Minuten. Erstellen Sie professionelle Verträge aus geprüften Vorlagen mit Contract AI.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Individuelle, rechtssichere Verträge in Minuten. Erstellen Sie professionelle Verträge aus geprüften Vorlagen mit Contract AI.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const vorteile = [
    {
      title: "Schnell",
      description: "In unter 10 Minuten einsatzbereit"
    },
    {
      title: "Rechtssicher",
      description: "Basierend auf geprüften Vorlagen"
    },
    {
      title: "Individuell",
      description: "Passt sich automatisch an Ihre Angaben an"
    }
  ];

  const funktionen = [
    "Auswahl aus geprüften, juristischen Vorlagen",
    "Intelligente Eingabemasken passen Text automatisch an",
    "Export als PDF & digitale Signatur möglich"
  ];

  return (
    <>
      <div className={styles.featureContainer}>
        
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h1 className={`${styles.heroTitle} fadeInUp`}>
            Individuelle, rechtssichere <br />
            <span className={styles.heroTitleHighlight}>Verträge in Minuten</span>
          </h1>
          <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
            Ob Freelancer, NDA oder Mietvertrag – erstellen Sie mit wenigen Klicks 
            einen professionellen Vertrag aus geprüften Vorlagen.
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
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <blockquote className={styles.beispielText}>
                „Freelancervertrag mit angepasstem Leistungsumfang und Zahlungsplan erstellt – 
                sofort einsatzbereit."
              </blockquote>
              <p className={styles.beispielHinweis}>
                Von der Vorlage zum fertigen Vertrag in wenigen Minuten
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>30+</div>
                <div className={styles.statLabel}>Vertragsvorlagen</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}> 10 Min</div>
                <div className={styles.statLabel}>Erstellungszeit</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>100%</div>
                <div className={styles.statLabel}>Rechtssicher</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Erstellen Sie Ihren ersten Vertrag</h2>
              <p className={styles.ctaSubtitle}>
                Professionelle Verträge in Minuten – ohne Anwalt
              </p>
              {user && user.subscriptionActive ? (
                <Link to="/generate" className={styles.ctaButton}>
                  Zum Vertragsgenerator
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

export default Generator;
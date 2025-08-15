import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";

const Fristen: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Fristen automatisch erkennen | Contract AI";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Nie wieder Kündigungsfristen verpassen. Contract AI erkennt Fristen automatisch und erinnert Sie rechtzeitig.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Nie wieder Kündigungsfristen verpassen. Contract AI erkennt Fristen automatisch und erinnert Sie rechtzeitig.';
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const vorteile = [
    {
      title: "Keine bösen Überraschungen",
      description: "Rechtzeitig kündigen oder verlängern"
    },
    {
      title: "Automatisch",
      description: "Sie müssen nichts selbst eintragen"
    },
    {
      title: "Individuell",
      description: "Erinnerungszeitpunkt frei wählbar"
    }
  ];

  const funktionen = [
    "Liest Vertragsfristen automatisch aus",
    "Trägt sie in Ihren persönlichen Kalender ein",
    "Sendet E-Mail-Reminder, bevor es zu spät ist"
  ];

  return (
    <div className={styles.featureContainer}>
      
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h1 className={`${styles.heroTitle} fadeInUp`}>
          Nie wieder <br />
          <span className={styles.heroTitleHighlight}>Kündigungsfristen verpassen</span>
        </h1>
        <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
          Ob Mietvertrag, Versicherung oder SaaS-Abo – Fristen im Blick zu behalten, ist mühsam. 
          Contract AI erkennt sie automatisch und erinnert Sie rechtzeitig.
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
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <blockquote className={styles.beispielText}>
              „Ihre Kfz-Versicherung läuft am 30.11. aus – 
              Kündigung bis 30.09. möglich."
            </blockquote>
            <p className={styles.beispielHinweis}>
              Automatische Erinnerung zur richtigen Zeit
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.7s' }}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>100%</div>
              <div className={styles.statLabel}>Fristenerkennung</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>∅ 30 Tage</div>
              <div className={styles.statLabel}>Vorlaufzeit</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>500€</div>
              <div className={styles.statLabel}>Durchschnittliche Ersparnis</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Behalten Sie alle Fristen im Blick</h2>
            <p className={styles.ctaSubtitle}>
              Lassen Sie Contract AI Ihre Verträge überwachen und rechtzeitig erinnern
            </p>
            {user && user.subscriptionActive ? (
              <Link to="/calendar" className={styles.ctaButton}>
                Zum Fristenkalender
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

export default Fristen;
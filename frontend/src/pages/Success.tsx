import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet";
import styles from "../styles/Success.module.css";

const Success: React.FC = () => {
  // Setze Seitentitel
  useEffect(() => {
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
        <link rel="canonical" href="https://contract-ai.de/success" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Erfolgreich abonniert | Contract AI" />
        <meta property="og:description" content="Du hast erfolgreich dein Contract AI Abo abgeschlossen. Los geht's mit allen Premium-Funktionen!" />
        <meta property="og:url" content="https://contract-ai.de/success" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Erfolgreich abonniert | Contract AI" />
        <meta name="twitter:description" content="Abo abgeschlossen — jetzt alle Premium-Funktionen nutzen und Verträge wie ein Profi managen!" />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIconContainer}>
            <div className={styles.successIcon}>✓</div>
          </div>
          
          <div className={styles.successContent}>
            <h1 className={styles.title}>Bezahlung erfolgreich</h1>
            
            <p className={styles.message}>
              Vielen Dank für Ihr Abonnement bei Contract AI. 
              Ihre Zahlung wurde erfolgreich verarbeitet und Ihr Konto wurde aktiviert.
            </p>
            
            <div className={styles.detailsContainer}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.detailValue}>Aktiv</span>
              </div>
              
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Zugang</span>
                <span className={styles.detailValue}>Sofort</span>
              </div>
              
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Bestätigung</span>
                <span className={styles.detailValue}>Per E-Mail gesendet</span>
              </div>
            </div>
            
            <div className={styles.buttonContainer}>
              <Link to="/dashboard" className={styles.dashboardButton}>
                Weiter zum Dashboard
              </Link>
            </div>
            
            <p className={styles.supportText}>
              Falls Sie Fragen haben, kontaktieren Sie bitte unseren <Link to="/support" className={styles.supportLink}>Kundensupport</Link>.
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
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  );
};

export default Success;
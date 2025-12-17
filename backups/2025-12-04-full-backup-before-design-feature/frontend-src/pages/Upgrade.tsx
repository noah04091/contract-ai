import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { CreditCard, Star, CheckCircle, AlertCircle, Zap, Shield, Lock, BarChart, Rocket } from "lucide-react";
import styles from "../styles/Upgrade.module.css";

interface NotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  return (
    <motion.div 
      className={`${styles.notification} ${styles[type]}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {type === "success" ? (
        <CheckCircle size={18} className={styles.notificationIcon} />
      ) : (
        <AlertCircle size={18} className={styles.notificationIcon} />
      )}
      <span className={styles.notificationMessage}>{message}</span>
      <button onClick={onClose} className={styles.notificationClose}>
        ✕
      </button>
    </motion.div>
  );
};

export default function Upgrade() {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setNotification(null);
    
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan: "premium" })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setNotification({
          message: "Fehler beim Weiterleiten zu Stripe.",
          type: "error"
        });
      }
    } catch (err) {
      setNotification({
        message: "Stripe-Verbindung fehlgeschlagen.",
        type: "error"
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const premiumFeatures = [
    {
      icon: <Zap size={20} />,
      text: "Unbegrenzte Vertragsanalysen"
    },
    {
      icon: <BarChart size={20} />,
      text: "KI-Optimierung & Vertragsvergleich"
    },
    {
      icon: <Shield size={20} />,
      text: "Erinnerungen bei Vertragsablauf"
    },
    {
      icon: <Rocket size={20} />,
      text: "KI-Vertragserstellung"
    },
    {
      icon: <Lock size={20} />,
      text: "PDF-Export mit Branding"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Upgrade auf Premium | Contract AI</title>
        <meta name="description" content="Upgrade dein Contract AI Konto auf Premium und erhalte Zugang zu erweiterten Analyse- und Optimierungsfunktionen für deine Verträge." />
        <meta name="keywords" content="Upgrade, Contract AI Premium, Premium Funktionen, Vertragsmanagement Upgrade" />
        <link rel="canonical" href="https://www.contract-ai.de/upgrade" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Upgrade auf Premium | Contract AI" />
        <meta property="og:description" content="Wechsle jetzt auf Premium und profitiere von allen Profi-Funktionen für deine Vertragsanalyse." />
        <meta property="og:url" content="https://www.contract-ai.de/upgrade" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Upgrade auf Premium | Contract AI" />
        <meta name="twitter:description" content="Starte mit Contract AI Premium durch und hol das Maximum aus deinen Verträgen heraus." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.pageContainer}>
        <motion.div 
          className={styles.upgradeContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.upgradeContent}>
            <motion.div 
              className={styles.headingContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className={styles.premiumBadge}>
                <Star size={24} className={styles.premiumIcon} />
              </div>
              <h1 className={styles.title}>Contract AI Premium</h1>
              <p className={styles.subtitle}>
                Erweitere deine Möglichkeiten mit Premium-Funktionen für professionelles Vertragsmanagement
              </p>
            </motion.div>
            
            <motion.div 
              className={styles.planCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className={styles.priceInfo}>
                <div className={styles.priceContainer}>
                  <span className={styles.price}>9,90 €</span>
                  <span className={styles.period}>pro Monat</span>
                </div>
                <div className={styles.priceTagline}>
                  Schalte alle Premium-Funktionen frei
                </div>
              </div>
              
              <ul className={styles.featuresList}>
                {premiumFeatures.map((feature, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  >
                    <div className={styles.featureIcon}>{feature.icon}</div>
                    <span>{feature.text}</span>
                  </motion.li>
                ))}
              </ul>
              
              <motion.button 
                onClick={handleUpgrade} 
                disabled={loading} 
                className={styles.upgradeButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {loading ? (
                  <>
                    <span className={styles.buttonSpinner}></span>
                    <span>Weiterleitung zu Stripe...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Jetzt upgraden mit Stripe</span>
                  </>
                )}
              </motion.button>
              
              <div className={styles.secureNote}>
                <Lock size={14} />
                <span>Sichere Zahlungsabwicklung. Jederzeit kündbar.</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence>
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
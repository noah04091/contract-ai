import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
import { CreditCard, Star, CheckCircle, AlertCircle, Zap, Shield, Lock, BarChart } from "lucide-react";
import styles from "../styles/Subscribe.module.css";

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

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}> = ({ icon, title, description, delay }) => {
  return (
    <motion.div 
      className={styles.featureCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)" }}
    >
      <div className={styles.featureIcon}>{icon}</div>
      <div>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </motion.div>
  );
};

export default function Subscribe() {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setNotification(null);
    
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Weiterleitung zu Stripe Checkout
      } else {
        setNotification({
          message: "Fehler beim Starten des Zahlungsprozesses.",
          type: "error"
        });
      }
    } catch (err) {
      setNotification({
        message: `Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Zap size={22} />,
      title: "Unbegrenzte Analysen",
      description: "Analysiere so viele Verträge wie du möchtest, ohne Einschränkungen."
    },
    {
      icon: <BarChart size={22} />,
      title: "Vertragsvergleich & Optimierung",
      description: "Vergleiche und optimiere deine Verträge mit unserer fortschrittlichen KI."
    },
    {
      icon: <Lock size={22} />,
      title: "KI-Vertragserstellung",
      description: "Erstelle maßgeschneiderte Verträge mit unserer KI-gestützten Technologie."
    },
    {
      icon: <Shield size={22} />,
      title: "Premium Support",
      description: "Genieße prioritären Support und Zugang zu exklusiven Features."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Abo abschließen | Contract AI</title>
        <meta name="description" content="Schließe dein Contract AI Abo ab und schalte alle Premium-Funktionen für deine Vertragsanalyse und -optimierung frei." />
        <meta name="keywords" content="Abo abschließen, Contract AI Premium, Vertragsanalyse Abo, Upgrade Vertragsmanagement" />
        <link rel="canonical" href="https://www.contract-ai.de/subscribe" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Abo abschließen | Contract AI" />
        <meta property="og:description" content="Entdecke alle Vorteile von Contract AI Premium und starte direkt mit der besten Vertragsanalyse." />
        <meta property="og:url" content="https://contract-ai.de/subscribe" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Abo abschließen | Contract AI" />
        <meta name="twitter:description" content="Schalte jetzt Contract AI Premium frei und sichere dir alle Profi-Funktionen für deine Verträge." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.pageContainer}>
        <motion.div 
          className={styles.container}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.header}>
            <motion.div 
              className={styles.premiumBadge}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Star size={24} className={styles.premiumIcon} />
            </motion.div>
            
            <motion.h1 
              className={styles.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Upgrade auf Premium
            </motion.h1>
            
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Schalte alle Premium-Funktionen frei und verbessere dein Vertragsmanagement
            </motion.p>
          </div>

          <motion.div 
            className={styles.pricingCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className={styles.priceContainer}>
              <h2 className={styles.price}>9,99 €</h2>
              <span className={styles.period}>pro Monat</span>
            </div>
            
            <ul className={styles.benefitsList}>
              <li><CheckCircle size={16} /> Unbegrenzte Vertragsanalysen</li>
              <li><CheckCircle size={16} /> KI-Vertragsoptimierung</li>
              <li><CheckCircle size={16} /> Vertragsvergleich</li>
              <li><CheckCircle size={16} /> KI-Vertragserstellung</li>
              <li><CheckCircle size={16} /> PDF-Export mit Branding</li>
              <li><CheckCircle size={16} /> Erinnerungen per E-Mail</li>
              <li><CheckCircle size={16} /> Prioritäts-Support</li>
            </ul>
            
            <motion.button 
              onClick={handleSubscribe} 
              disabled={loading}
              className={styles.subscribeButton}
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
                  <span>Jetzt abonnieren</span>
                </>
              )}
            </motion.button>
            
            <p className={styles.secureInfo}>
              <Lock size={14} />
              <span>Sichere Zahlung über Stripe. Jederzeit kündbar</span>
            </p>
          </motion.div>

          <div className={styles.featuresContainer}>
            <motion.h2 
              className={styles.featuresTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Premium-Vorteile
            </motion.h2>
            
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={0.7 + index * 0.1}
                />
              ))}
            </div>
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
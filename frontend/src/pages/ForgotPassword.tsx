import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail } from "lucide-react";
import styles from "./ForgotPassword.module.css";
import { Link } from "react-router-dom";

interface NotificationProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type = "success", onClose }) => {
  return (
    <motion.div
      className={`${styles.notification} ${styles[type]}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <span className={styles.notificationMessage}>{message}</span>
      <button onClick={onClose} className={styles.notificationClose}>
        ✕
      </button>
    </motion.div>
  );
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'sent'>('idle');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "✅ E-Mail zum Zurücksetzen wurde gesendet!", type: "success" });
        setEmail("");
        setFormStatus('sent');
      } else {
        setNotification({ message: "❌ " + (data.message || "Unbekannter Fehler"), type: "error" });
      }
    } catch (err) {
      console.error("Fehler beim E-Mail-Reset:", err);
      setNotification({ message: "❌ Netzwerkfehler – bitte erneut versuchen", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div 
        className={styles.formContainer}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className={styles.headerContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className={styles.headerContent}>
            <motion.div 
              className={styles.iconWrapper}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
            >
              <div className={styles.iconBackground}>
                <Mail size={24} className={styles.headerIcon} />
              </div>
            </motion.div>
            <motion.h1 
              className={styles.title}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Passwort zurücksetzen
            </motion.h1>
          </div>
          <div className={styles.headerBlur} />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {formStatus === 'idle' ? (
            <motion.form 
              key="reset-form"
              onSubmit={handleRequestReset} 
              className={styles.form}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className={styles.formDescription}>
                Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.
              </p>
              
              <div className={styles.inputContainer}>
                <div className={styles.inputWrapper}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Deine E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <motion.button 
                type="submit" 
                className={styles.submitButton} 
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {loading ? (
                  <>
                    <span className={styles.buttonSpinner}></span>
                    <span>Wird gesendet...</span>
                  </>
                ) : (
                  <>
                    <span className={styles.buttonIcon}>📩</span>
                    <span>Zurücksetzen anfordern</span>
                  </>
                )}
              </motion.button>
              
              <div className={styles.links}>
                <Link to="/login" className={styles.link}>Zurück zum Login</Link>
              </div>
            </motion.form>
          ) : (
            <motion.div 
              key="success-message"
              className={styles.successContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.successIcon}>📧</div>
              <h2 className={styles.successTitle}>E-Mail gesendet!</h2>
              <p className={styles.successText}>
                Wir haben dir einen Link zum Zurücksetzen deines Passworts gesendet. 
                Bitte überprüfe deinen Posteingang und auch den Spam-Ordner.
              </p>
              <motion.button 
                className={styles.backButton}
                onClick={() => setFormStatus('idle')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Neue Anfrage stellen
              </motion.button>
              <Link to="/login" className={styles.loginLink}>
                Zurück zum Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
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
  );
}
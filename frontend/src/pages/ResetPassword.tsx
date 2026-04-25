import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Key, Lock, CheckCircle, AlertCircle, ChevronLeft, Eye, EyeOff } from "lucide-react";
import styles from "./ResetPassword.module.css";

// API URL für Backend-Calls
const API_URL = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

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
      {type === "success" ? (
        <CheckCircle size={20} className={styles.notificationIcon} />
      ) : (
        <AlertCircle size={20} className={styles.notificationIcon} />
      )}
      <span className={styles.notificationMessage}>{message}</span>
      <button onClick={onClose} className={styles.notificationClose}>
        ✕
      </button>
    </motion.div>
  );
};

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValidated, setTokenValidated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromURL = urlParams.get("token");

    if (tokenFromURL) {
      setToken(tokenFromURL);
      validateToken(tokenFromURL);
    } else {
      setTokenValidated(false);
      setNotification({ 
        message: "Ungültiger oder fehlender Link", 
        type: "error" 
      });
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/validate-reset-token?token=${token}`, {
        method: "GET",
      });

      if (res.ok) {
        setTokenValidated(true);
      } else {
        setTokenValidated(false);
        setNotification({ 
          message: "Dieser Reset-Link ist ungültig oder abgelaufen", 
          type: "error" 
        });
      }
    } catch (err) {
      console.error("Fehler bei der Token-Validierung:", err);
      setTokenValidated(false);
      setNotification({ 
        message: "Fehler bei der Überprüfung des Links", 
        type: "error" 
      });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setNotification({ 
        message: "Die Passwörter stimmen nicht überein", 
        type: "error" 
      });
      return;
    }

    if (newPassword.length < 8) {
      setNotification({ 
        message: "Das Passwort muss mindestens 8 Zeichen lang sein", 
        type: "error" 
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ 
          message: "Passwort erfolgreich geändert! Du wirst zum Login weitergeleitet.", 
          type: "success" 
        });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        // Zeige spezifische Passwort-Fehler falls vorhanden
        const errorMessage = data.errors && data.errors.length > 0
          ? data.errors.join('. ')
          : (data.message || "Fehler beim Zurücksetzen des Passworts");
        setNotification({
          message: errorMessage,
          type: "error"
        });
      }
    } catch (err) {
      console.error("Fehler beim Zurücksetzen:", err);
      setNotification({ 
        message: "Fehler beim Zurücksetzen des Passworts", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <>
      <Helmet>
        <title>Passwort zurücksetzen | Contract AI</title>
        <meta name="description" content="Hier kannst du dein Contract AI Passwort mit einem sicheren Link zurücksetzen und sofort wieder einloggen." />
        <meta name="keywords" content="Passwort zurücksetzen, Passwort ändern, Contract AI Login" />
        <link rel="canonical" href="https://www.contract-ai.de/reset-password" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Passwort zurücksetzen | Contract AI" />
        <meta property="og:description" content="Sichere Passwortänderung für dein Contract AI Konto. Schnell und unkompliziert." />
        <meta property="og:url" content="https://www.contract-ai.de/reset-password" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Passwort zurücksetzen | Contract AI" />
        <meta name="twitter:description" content="Setze dein Passwort für Contract AI jetzt sicher zurück und greife sofort wieder auf deine Verträge zu." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>
      
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
                  <Key size={24} className={styles.headerIcon} />
                </div>
              </motion.div>
              <motion.h1 
                className={styles.title}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Neues Passwort setzen
              </motion.h1>
            </div>
            <div className={styles.headerBlur} />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {tokenValidated === null ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Überprüfe Sicherheitstoken...</p>
              </div>
            ) : tokenValidated === false ? (
              <motion.div 
                className={styles.errorContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle size={48} className={styles.errorIcon} />
                <h2 className={styles.errorTitle}>Ungültiger Link</h2>
                <p className={styles.errorText}>
                  Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.
                </p>
                <motion.button 
                  className={styles.backButton}
                  onClick={handleBackToLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ChevronLeft size={16} />
                  <span>Zurück zum Login</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.form 
                onSubmit={handleReset} 
                className={styles.form}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <p className={styles.formDescription}>
                  Gib dein neues Passwort ein, um den Zurücksetzungsprozess abzuschließen.
                </p>
                
                <div className={styles.inputContainer}>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className={styles.input}
                      placeholder="Neues Passwort"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className={styles.inputContainer}>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={styles.input}
                      placeholder="Passwort bestätigen"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <p className={styles.passwordHint}>
                  Mind. 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl
                </p>
                
                <motion.button 
                  type="submit" 
                  className={styles.submitButton} 
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {isLoading ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.buttonIcon}>💾</span>
                      <span>Passwort speichern</span>
                    </>
                  )}
                </motion.button>
                
                <div className={styles.links}>
                  <button 
                    type="button" 
                    onClick={handleBackToLogin} 
                    className={styles.linkButton}
                  >
                    Zurück zum Login
                  </button>
                </div>
              </motion.form>
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
    </>
  );
}
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Key, CreditCard, Trash2, AlertCircle, CheckCircle, LogOut } from "lucide-react";
import styles from "../styles/Profile.module.css";
import { useAuth } from "../context/AuthContext";

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

export default function Profile() {
  const { user, isLoading } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setNotification({ 
        message: "Die Passwörter stimmen nicht überein", 
        type: "error" 
      });
      return;
    }

    setIsPasswordChanging(true);
    setNotification(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({
          message: "Passwort erfolgreich geändert",
          type: "success"
        });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setNotification({
          message: data.message || "Fehler beim Passwortwechsel",
          type: "error"
        });
      }
    } catch {
      setNotification({
        message: "Fehler beim Passwortwechsel",
        type: "error"
      });
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const handleAccountDelete = async () => {
    const confirmDelete = window.confirm(
      "Willst du deinen Account wirklich löschen? Alle Verträge gehen verloren!"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/auth/delete", {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        window.alert("Account gelöscht. Bis bald!");
        window.location.href = "/";
      } else {
        setNotification({
          message: "Fehler beim Löschen des Accounts",
          type: "error"
        });
      }
    } catch {
      setNotification({
        message: "Fehler beim Löschen des Accounts",
        type: "error"
      });
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setNotification(null);

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setNotification({
          message: "Upgrade fehlgeschlagen",
          type: "error"
        });
      }
    } catch {
      setNotification({
        message: "Upgrade fehlgeschlagen",
        type: "error"
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Lade Profildaten...</p>
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      <motion.div 
        className={styles.container}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <motion.div 
            className={styles.profileIcon}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <User size={32} className={styles.icon} />
          </motion.div>
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Dein Profil
          </motion.h1>
        </div>

        {user ? (
          <motion.div 
            className={styles.content}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className={styles.userInfo}>
              <div className={styles.emailContainer}>
                <div className={styles.label}>E-Mail-Adresse</div>
                <div className={styles.email}>{user.email}</div>
              </div>

              <div className={styles.subscriptionContainer}>
                <div className={styles.label}>Abo-Status</div>
                {isLoading ? (
                  <span>Lade Abo-Status...</span>
                ) : !user ? (
                  <span>❌ Nicht eingeloggt</span>
                ) : user.subscriptionActive ? (
                  <div className={styles.premium}>
                    <span className={styles.premiumIcon}>💎</span>
                    🔒 Premium – aktiv
                  </div>
                ) : (
                  <div className={styles.standard}>
                    <span className={styles.standardIcon}>🔓</span>
                    Standard – kein Abo aktiv
                  </div>
                )}
              </div>
            </div>

            {!user.subscriptionActive && (
              <motion.div 
                className={styles.upgradeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className={styles.upgradeContent}>
                  <CreditCard size={24} className={styles.upgradeIcon} />
                  <div>
                    <h3 className={styles.upgradeTitle}>Upgrade auf Premium</h3>
                    <p className={styles.upgradeDescription}>
                      Erhalte Zugriff auf unbegrenzte Analysen, Vertragsoptimierung, KI-Vertragserstellung und mehr.
                    </p>
                  </div>
                </div>
                <motion.button 
                  className={styles.upgradeButton}
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {isUpgrading ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      <span>Lade Stripe...</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.upgradeButtonIcon}>💳</span>
                      <span>Jetzt upgraden</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            <motion.div 
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className={styles.sectionHeader}>
                <Key size={18} className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Passwort ändern</h2>
              </div>
              
              <div className={styles.passwordForm}>
                <div className={styles.inputGroup}>
                  <label htmlFor="oldPassword">Aktuelles Passwort</label>
                  <input
                    id="oldPassword"
                    type="password"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="newPassword">Neues Passwort</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword">Passwort bestätigen</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
                
                <motion.button 
                  onClick={handlePasswordChange}
                  className={styles.passwordButton}
                  disabled={isPasswordChanging || !oldPassword || !newPassword || !confirmPassword}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {isPasswordChanging ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      <span>Wird geändert...</span>
                    </>
                  ) : (
                    <>
                      <Key size={16} />
                      <span>Passwort ändern</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

            <motion.div 
              className={styles.dangerSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className={styles.dangerHeader}>
                <Trash2 size={18} className={styles.dangerIcon} />
                <h2 className={styles.dangerTitle}>Konto löschen</h2>
              </div>
              
              <p className={styles.dangerText}>
                Diese Aktion ist permanent und kann nicht rückgängig gemacht werden. Alle deine Verträge und Daten werden gelöscht.
              </p>
              
              <motion.button 
                onClick={handleAccountDelete}
                className={styles.deleteButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Trash2 size={16} />
                <span>Account löschen</span>
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <div className={styles.errorContainer}>
            <AlertCircle size={40} className={styles.errorIcon} />
            <p className={styles.errorMessage}>Keine Benutzerdaten gefunden.</p>
            <motion.button 
              className={styles.logoutButton}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = "/login"}
            >
              <LogOut size={16} />
              <span>Zurück zum Login</span>
            </motion.button>
          </div>
        )}
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
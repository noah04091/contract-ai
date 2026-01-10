import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { User, Key, CreditCard, Trash2, AlertCircle, CheckCircle, LogOut, FileText, Download, MessageSquare, Users, Link2, Mail, RefreshCw, Compass, Edit3, Camera, Database } from "lucide-react";
import styles from "../styles/Profile.module.css";
import { useAuth } from "../hooks/useAuth";;

interface NotificationProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

interface Invoice {
  invoiceNumber: string;
  plan: string;
  amount: number;
  date: string;
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
  const [isPortalOpening, setIsPortalOpening] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(() => {
    const saved = localStorage.getItem('assistantBotEnabled');
    return saved === null ? true : saved === 'true';
  });

  // E-Mail-Präferenzen State
  const [emailDigestMode, setEmailDigestMode] = useState<'instant' | 'daily' | 'weekly'>('instant');
  const [isEmailPrefsLoading, setIsEmailPrefsLoading] = useState(false);
  const [isPremiumOrHigher, setIsPremiumOrHigher] = useState(false);

  // Onboarding/Tour Reset State
  const [isResettingTour, setIsResettingTour] = useState(false);

  // 🆕 Profil bearbeiten State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // 🆕 E-Mail ändern State
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // 🆕 Profilbild State
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  // 🆕 Daten-Export State
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchInvoices = async () => {
        setIsLoadingInvoices(true);
        try {
          const res = await fetch('/api/invoices/me', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setInvoices(data);
          } else {
            setNotification({
              message: "Fehler beim Laden der Rechnungen",
              type: "error"
            });
          }
        } catch (error) {
          console.error("Fehler beim Laden der Rechnungen:", error); // <--- das ist neu
          setNotification({
            message: "Fehler beim Laden der Rechnungen",
            type: "error"
          });
        } finally {
          setIsLoadingInvoices(false);
        }
      };
      
      fetchInvoices();

      // Fetch email preferences
      const fetchEmailPrefs = async () => {
        try {
          const res = await fetch('/api/calendar/email-preferences', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setEmailDigestMode(data.emailDigestMode || 'instant');
            setIsPremiumOrHigher(data.isPremiumOrHigher || false);
          }
        } catch (error) {
          console.error("Fehler beim Laden der E-Mail-Einstellungen:", error);
        }
      };
      fetchEmailPrefs();
    }
  }, [user]);

  const handleEmailPrefsChange = async (mode: 'instant' | 'daily' | 'weekly') => {
    setIsEmailPrefsLoading(true);
    try {
      const res = await fetch('/api/calendar/email-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailDigestMode: mode })
      });

      const data = await res.json();

      if (res.ok) {
        setEmailDigestMode(mode);
        setNotification({
          message: data.message || "E-Mail-Einstellungen gespeichert",
          type: "success"
        });
      } else {
        setNotification({
          message: data.error || "Fehler beim Speichern",
          type: "error"
        });
      }
    } catch {
      setNotification({
        message: "Fehler beim Speichern der E-Mail-Einstellungen",
        type: "error"
      });
    } finally {
      setIsEmailPrefsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  };

  const formatAmount = (amount: number): string => {
    return (amount / 100).toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR'
    });
  };

  // ✅ NEUE VERSION: CSP-Fix für PDF-Download
  const handleDownload = (invoiceNumber: string) => {
    try {
      // Direkte Navigation - keine fetch(), keine CSP-Probleme
      const downloadUrl = `/api/invoices/download/${invoiceNumber}`;
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error("Fehler beim Öffnen des PDF-Links:", error);
      setNotification({
        message: "Fehler beim Herunterladen der Rechnung",
        type: "error"
      });
    }
  };

  const handleChatbotToggle = () => {
    const newValue = !isChatbotEnabled;
    setIsChatbotEnabled(newValue);
    localStorage.setItem('assistantBotEnabled', String(newValue));
    // Dispatch custom event so AssistantWidget can react immediately
    window.dispatchEvent(new Event('assistantBotToggled'));

    setNotification({
      message: newValue ? "Chatbot aktiviert" : "Chatbot deaktiviert",
      type: "success"
    });
  };

  // Handler für Tour/Onboarding Reset
  const handleResetTour = async () => {
    setIsResettingTour(true);
    try {
      const res = await fetch('/api/onboarding/reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        // Clear sessionStorage for checklist hidden state
        sessionStorage.removeItem('contract-ai-checklist-hidden');

        setNotification({
          message: "Tour wurde zurückgesetzt! Lade die Seite neu, um sie erneut zu sehen.",
          type: "success"
        });

        // Reload after short delay to show the notification
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setNotification({
          message: "Fehler beim Zurücksetzen der Tour",
          type: "error"
        });
      }
    } catch {
      setNotification({
        message: "Fehler beim Zurücksetzen der Tour",
        type: "error"
      });
    } finally {
      setIsResettingTour(false);
    }
  };

  // 🆕 Handler: Name bearbeiten starten
  const handleStartEditName = () => {
    setEditFirstName((user as any)?.firstName || '');
    setEditLastName((user as any)?.lastName || '');
    setIsEditingName(true);
  };

  // 🆕 Handler: Name speichern
  const handleSaveName = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      setNotification({ message: "Vorname und Nachname erforderlich", type: "error" });
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "Name erfolgreich geändert", type: "success" });
        setIsEditingName(false);
        // Seite neu laden um User-Daten zu aktualisieren
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setNotification({ message: data.message || "Fehler beim Speichern", type: "error" });
      }
    } catch {
      setNotification({ message: "Fehler beim Speichern des Namens", type: "error" });
    } finally {
      setIsSavingName(false);
    }
  };

  // 🆕 Handler: E-Mail ändern
  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !emailPassword) {
      setNotification({ message: "E-Mail und Passwort erforderlich", type: "error" });
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await fetch('/api/auth/request-email-change', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          password: emailPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "Bestätigungs-E-Mail gesendet! Bitte prüfen Sie Ihr Postfach.", type: "success" });
        setIsEditingEmail(false);
        setNewEmail('');
        setEmailPassword('');
      } else {
        setNotification({ message: data.message || "Fehler beim Ändern der E-Mail", type: "error" });
      }
    } catch {
      setNotification({ message: "Fehler beim Ändern der E-Mail", type: "error" });
    } finally {
      setIsSavingEmail(false);
    }
  };

  // 🆕 Handler: Profilbild hochladen
  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      setNotification({ message: "Nur PNG, JPEG oder WebP erlaubt", type: "error" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotification({ message: "Bild zu groß. Maximum: 2MB", type: "error" });
      return;
    }

    setIsUploadingPicture(true);

    try {
      // Konvertiere zu Base64
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result as string;

        const res = await fetch('/api/auth/upload-profile-picture', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData })
        });

        const data = await res.json();

        if (res.ok) {
          setNotification({ message: "Profilbild hochgeladen", type: "success" });
          setTimeout(() => window.location.reload(), 1000);
        } else {
          setNotification({ message: data.message || "Fehler beim Upload", type: "error" });
        }
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setNotification({ message: "Fehler beim Hochladen", type: "error" });
      setIsUploadingPicture(false);
    }
  };

  // 🆕 Handler: Profilbild löschen
  const handleDeleteProfilePicture = async () => {
    if (!window.confirm("Profilbild wirklich löschen?")) return;

    try {
      const res = await fetch('/api/auth/profile-picture', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setNotification({ message: "Profilbild gelöscht", type: "success" });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setNotification({ message: "Fehler beim Löschen", type: "error" });
      }
    } catch {
      setNotification({ message: "Fehler beim Löschen", type: "error" });
    }
  };

  // 🆕 Handler: DSGVO Daten-Export
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/auth/export-data', {
        credentials: 'include'
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-ai-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setNotification({ message: "Daten erfolgreich exportiert", type: "success" });
      } else {
        setNotification({ message: "Fehler beim Export", type: "error" });
      }
    } catch {
      setNotification({ message: "Fehler beim Export", type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

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
        // Zeige spezifische Passwort-Fehler falls vorhanden
        const errorMessage = data.errors && data.errors.length > 0
          ? data.errors.join('. ')
          : (data.message || "Fehler beim Passwortwechsel");
        setNotification({
          message: errorMessage,
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan: "premium" })
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
    <>
      <Helmet>
        <title>Mein Profil & Vertragsstatus | Contract AI</title>
        <meta name="description" content="Verwalte dein Nutzerprofil, sieh deine Abo-Details und behalte alle Vertragsaktivitäten im Blick. Dein persönlicher Bereich bei Contract AI." />
        <meta name="keywords" content="Profil, Benutzerkonto, Vertragsstatus, Account verwalten, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/profile" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Mein Profil & Vertragsstatus | Contract AI" />
        <meta property="og:description" content="Alle Vertragsdetails und Abo-Infos auf einen Blick. Verwalte dein Contract AI Profil einfach und sicher." />
        <meta property="og:url" content="https://www.contract-ai.de/profile" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mein Profil & Vertragsstatus | Contract AI" />
        <meta name="twitter:description" content="Deine persönlichen Vertrags- und Abo-Infos jederzeit im Blick. Mit Contract AI alles an einem Ort." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
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
                {/* 🆕 Profilbild */}
                <div className={styles.profilePictureSection}>
                  <div className={styles.profilePictureWrapper}>
                    {(user as any).profilePicture ? (
                      <img src={(user as any).profilePicture} alt="Profilbild" className={styles.profilePicture} />
                    ) : (
                      <div className={styles.profilePicturePlaceholder}>
                        <User size={40} />
                      </div>
                    )}
                    <label className={styles.profilePictureUpload}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleProfilePictureUpload}
                        disabled={isUploadingPicture}
                        style={{ display: 'none' }}
                      />
                      {isUploadingPicture ? (
                        <span className={styles.buttonSpinner}></span>
                      ) : (
                        <Camera size={16} />
                      )}
                    </label>
                  </div>
                  {(user as any).profilePicture && (
                    <button onClick={handleDeleteProfilePicture} className={styles.deletePictureButton}>
                      Bild entfernen
                    </button>
                  )}
                </div>

                {/* 🆕 Name bearbeiten */}
                <div className={styles.nameContainer}>
                  <div className={styles.label}>Name</div>
                  {isEditingName ? (
                    <div className={styles.editNameForm}>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="Vorname"
                        className={styles.input}
                      />
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Nachname"
                        className={styles.input}
                      />
                      <div className={styles.editNameButtons}>
                        <button onClick={handleSaveName} disabled={isSavingName} className={styles.saveButton}>
                          {isSavingName ? 'Speichern...' : 'Speichern'}
                        </button>
                        <button onClick={() => setIsEditingName(false)} className={styles.cancelButton}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.nameDisplay}>
                      <span>{(user as any).name || user.email?.split('@')[0]}</span>
                      <button onClick={handleStartEditName} className={styles.editButton}>
                        <Edit3 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 🆕 E-Mail bearbeiten */}
                <div className={styles.emailContainer}>
                  <div className={styles.label}>E-Mail-Adresse</div>
                  {isEditingEmail ? (
                    <div className={styles.editEmailForm}>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Neue E-Mail-Adresse"
                        className={styles.input}
                      />
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Aktuelles Passwort zur Bestätigung"
                        className={styles.input}
                      />
                      <div className={styles.editNameButtons}>
                        <button onClick={handleChangeEmail} disabled={isSavingEmail} className={styles.saveButton}>
                          {isSavingEmail ? 'Senden...' : 'Bestätigungs-E-Mail senden'}
                        </button>
                        <button onClick={() => { setIsEditingEmail(false); setNewEmail(''); setEmailPassword(''); }} className={styles.cancelButton}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.nameDisplay}>
                      <span>{user.email}</span>
                      <button onClick={() => setIsEditingEmail(true)} className={styles.editButton}>
                        <Edit3 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.subscriptionContainer}>
                  <div className={styles.label}>Abo-Status</div>
                  {isLoading ? (
                    <span>Lade Abo-Status...</span>
                  ) : !user ? (
                    <span>❌ Nicht eingeloggt</span>
                  ) : user.subscriptionPlan === "business" ? (
                    <div className={styles.premium}>
                      <span className={styles.premiumIcon}>🏢</span>
                      Business – aktiv
                    </div>
                  ) : user.subscriptionPlan === "premium" ? (
                    <div className={styles.premium}>
                      <span className={styles.premiumIcon}>💎</span>
                      Premium – aktiv
                    </div>
                  ) : (
                    <div className={styles.standard}>
                      <span className={styles.standardIcon}>🔓</span>
                      Standard – kein Abo aktiv
                    </div>
                  )}
                </div>
              </div>

              {/* Company Profile Section - visible for all, functional for Business/Premium */}
              <motion.div
                className={styles.companyProfileSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className={styles.companyProfileContent}>
                  <FileText size={24} className={styles.companyProfileIcon} />
                  <div>
                    <h3 className={styles.companyProfileTitle}>Firmenprofil</h3>
                    <p className={styles.companyProfileDescription}>
                      Richten Sie Ihr Firmenprofil ein für automatische Daten in generierten Verträgen.
                    </p>
                  </div>
                </div>
                {user?.subscriptionActive && (user.subscriptionPlan === 'business' || user.subscriptionPlan === 'premium') ? (
                  <motion.button
                    className={styles.companyProfileButton}
                    onClick={() => window.location.href = '/company-profile'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>🏢</span>
                    <span>Firmenprofil anlegen</span>
                  </motion.button>
                ) : (
                  <motion.button
                    className={styles.upgradeFeatureButton}
                    onClick={() => window.location.href = '/pricing'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>⭐</span>
                    <span>Upgrade auf Premium</span>
                  </motion.button>
                )}
              </motion.div>

              {/* REST API Access Section - visible for all, functional for Premium */}
              <motion.div
                className={styles.companyProfileSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className={styles.companyProfileContent}>
                  <Key size={24} className={styles.companyProfileIcon} />
                  <div>
                    <h3 className={styles.companyProfileTitle}>REST API-Zugang</h3>
                    <p className={styles.companyProfileDescription}>
                      Verwalte deine API-Keys für programmatischen Zugriff auf Contract AI. Automatisiere Workflows und integriere mit eigenen Systemen.
                    </p>
                  </div>
                </div>
                {user?.subscriptionActive && user.subscriptionPlan === 'premium' ? (
                  <motion.button
                    className={styles.companyProfileButton}
                    onClick={() => window.location.href = '/api-keys'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>🔑</span>
                    <span>API-Keys verwalten</span>
                  </motion.button>
                ) : (
                  <motion.button
                    className={styles.upgradeFeatureButton}
                    onClick={() => window.location.href = '/pricing'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>⭐</span>
                    <span>Upgrade auf Premium</span>
                  </motion.button>
                )}
              </motion.div>

              {/* Team Management Section - visible for all, functional for Premium */}
              <motion.div
                className={styles.companyProfileSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className={styles.companyProfileContent}>
                  <Users size={24} className={styles.companyProfileIcon} />
                  <div>
                    <h3 className={styles.companyProfileTitle}>Team-Management</h3>
                    <p className={styles.companyProfileDescription}>
                      Erstelle eine Organisation, lade Team-Mitglieder ein und arbeite gemeinsam an Verträgen. Bis zu 10 User pro Team.
                    </p>
                  </div>
                </div>
                {user?.subscriptionActive && user.subscriptionPlan === 'premium' ? (
                  <motion.button
                    className={styles.companyProfileButton}
                    onClick={() => window.location.href = '/team'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>👥</span>
                    <span>Team verwalten</span>
                  </motion.button>
                ) : (
                  <motion.button
                    className={styles.upgradeFeatureButton}
                    onClick={() => window.location.href = '/pricing'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>⭐</span>
                    <span>Upgrade auf Premium</span>
                  </motion.button>
                )}
              </motion.div>

              {/* CRM/ERP Integrations Section - visible for all, functional for Premium/Business */}
              <motion.div
                className={styles.companyProfileSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.75 }}
              >
                <div className={styles.companyProfileContent}>
                  <Link2 size={24} className={styles.companyProfileIcon} />
                  <div>
                    <h3 className={styles.companyProfileTitle}>CRM/ERP Integrationen</h3>
                    <p className={styles.companyProfileDescription}>
                      Verbinde Contract AI mit Salesforce, HubSpot oder SAP. Synchronisiere Verträge automatisch mit deinen Geschäftssystemen.
                    </p>
                  </div>
                </div>
                {user?.subscriptionActive && (user.subscriptionPlan === 'premium' || user.subscriptionPlan === 'business') ? (
                  <motion.button
                    className={styles.companyProfileButton}
                    onClick={() => window.location.href = '/integrations'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>🔗</span>
                    <span>Integrationen verwalten</span>
                  </motion.button>
                ) : (
                  <motion.button
                    className={styles.upgradeFeatureButton}
                    onClick={() => window.location.href = '/pricing'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className={styles.companyProfileButtonIcon}>⭐</span>
                    <span>Upgrade auf Premium</span>
                  </motion.button>
                )}
              </motion.div>

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

              {/* Chatbot Settings Section */}
              <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
              >
                <div className={styles.sectionHeader}>
                  <MessageSquare size={18} className={styles.sectionIcon} />
                  <h2 className={styles.sectionTitle}>KI-Assistent</h2>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <h3 className={styles.settingLabel}>Chatbot anzeigen</h3>
                    <p className={styles.settingDescription}>
                      Aktiviere oder deaktiviere den KI-Assistenten auf allen Seiten
                    </p>
                  </div>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isChatbotEnabled}
                      onChange={handleChatbotToggle}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </motion.div>

              {/* E-Mail Benachrichtigungen Section */}
              <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.58 }}
              >
                <div className={styles.sectionHeader}>
                  <Mail size={18} className={styles.sectionIcon} />
                  <h2 className={styles.sectionTitle}>E-Mail Benachrichtigungen</h2>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <h3 className={styles.settingLabel}>Kalender-Erinnerungen</h3>
                    <p className={styles.settingDescription}>
                      Wähle, wie du E-Mail-Erinnerungen erhalten möchtest
                    </p>
                  </div>
                  <select
                    className={styles.emailPrefsDropdown}
                    value={emailDigestMode}
                    onChange={(e) => handleEmailPrefsChange(e.target.value as 'instant' | 'daily' | 'weekly')}
                    disabled={isEmailPrefsLoading}
                  >
                    <option value="instant">⚡ Sofort (einzeln)</option>
                    <option value="daily" disabled={!isPremiumOrHigher}>
                      📅 Täglich (7 Uhr){!isPremiumOrHigher ? ' 🔒' : ''}
                    </option>
                    <option value="weekly" disabled={!isPremiumOrHigher}>
                      📆 Wöchentlich{!isPremiumOrHigher ? ' 🔒' : ''}
                    </option>
                  </select>
                </div>
              </motion.div>

              {/* Onboarding & Tour Section */}
              <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.59 }}
              >
                <div className={styles.sectionHeader}>
                  <Compass size={18} className={styles.sectionIcon} />
                  <h2 className={styles.sectionTitle}>Einführung & Hilfe</h2>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <h3 className={styles.settingLabel}>Produkt-Tour erneut starten</h3>
                    <p className={styles.settingDescription}>
                      Zeige die Einführungs-Tour und Checklist erneut an, um alle Features kennenzulernen
                    </p>
                  </div>
                  <motion.button
                    className={styles.resetTourButton}
                    onClick={handleResetTour}
                    disabled={isResettingTour}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {isResettingTour ? (
                      <>
                        <span className={styles.buttonSpinner}></span>
                        <span>Wird zurückgesetzt...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        <span>Tour zurücksetzen</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>

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
                      minLength={8}
                    />
                    <p className={styles.passwordHint}>
                      Mind. 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl
                    </p>
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

              {/* 🆕 DSGVO Daten-Export */}
              <motion.div
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 }}
              >
                <div className={styles.sectionHeader}>
                  <Database size={18} className={styles.sectionIcon} />
                  <h2 className={styles.sectionTitle}>Meine Daten (DSGVO)</h2>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <h3 className={styles.settingLabel}>Daten exportieren</h3>
                    <p className={styles.settingDescription}>
                      Laden Sie alle Ihre Daten als JSON-Datei herunter (Profil, Verträge, Kalender-Events)
                    </p>
                  </div>
                  <motion.button
                    className={styles.exportButton}
                    onClick={handleExportData}
                    disabled={isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {isExporting ? (
                      <>
                        <span className={styles.buttonSpinner}></span>
                        <span>Exportiere...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Daten exportieren</span>
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

              {/* Neue Rechnungssektion */}
              <motion.div 
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className={styles.sectionHeader}>
                  <FileText size={18} className={styles.sectionIcon} />
                  <h2 className={styles.sectionTitle}>📄 Rechnungen</h2>
                </div>
                
                {isLoadingInvoices ? (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Lade Rechnungsdaten...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <p className={styles.noInvoices}>
                    Keine Rechnungen gefunden.
                  </p>
                ) : (
                  <div className={styles.invoicesContainer}>
                    <div className={styles.invoiceTable}>
                      <div className={styles.invoiceTableHeader}>
                        <div className={styles.invoiceDate}>Datum</div>
                        <div className={styles.invoicePlan}>Abo-Typ</div>
                        <div className={styles.invoiceAmount}>Betrag</div>
                        <div className={styles.invoiceAction}></div>
                      </div>
                      
                      {invoices.map((invoice) => (
                        <motion.div 
                          key={invoice.invoiceNumber}
                          className={styles.invoiceRow}
                          whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                        >
                          <div className={styles.invoiceDate}>{formatDate(invoice.date)}</div>
                          <div className={styles.invoicePlan}>
                            {invoice.plan === 'premium' ? (
                              <span className={styles.premiumPlan}>
                                <span className={styles.premiumIcon}>💎</span>
                                Premium
                              </span>
                            ) : invoice.plan === 'business' ? (
                              <span className={styles.businessPlan}>
                                <span className={styles.businessIcon}>🏢</span>
                                Business
                              </span>
                            ) : (
                              <span className={styles.standardPlan}>
                                <span className={styles.standardIcon}>🔓</span>
                                Standard
                              </span>
                            )}
                          </div>
                          <div className={styles.invoiceAmount}>{formatAmount(invoice.amount)}</div>
                          <div className={styles.invoiceAction}>
                            <motion.button 
                              className={styles.downloadButton}
                              onClick={() => handleDownload(invoice.invoiceNumber)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              aria-label="Download Rechnung"
                            >
                              <Download size={16} />
                              <span>PDF</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Responsive Card View für mobile Geräte */}
                    <div className={styles.invoiceCards}>
                      {invoices.map((invoice) => (
                        <motion.div 
                          key={invoice.invoiceNumber}
                          className={styles.invoiceCard}
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <div className={styles.invoiceCardHeader}>
                            <div className={styles.invoiceDate}>{formatDate(invoice.date)}</div>
                            <div className={styles.invoiceAmount}>{formatAmount(invoice.amount)}</div>
                          </div>
                          <div className={styles.invoiceCardContent}>
                            <div className={styles.invoicePlanLabel}>Abo-Typ:</div>
                            <div className={styles.invoicePlan}>
                              {invoice.plan === 'premium' ? (
                                <span className={styles.premiumPlan}>
                                  <span className={styles.premiumIcon}>💎</span>
                                  Premium
                                </span>
                              ) : invoice.plan === 'business' ? (
                                <span className={styles.businessPlan}>
                                  <span className={styles.businessIcon}>🏢</span>
                                  Business
                                </span>
                              ) : (
                                <span className={styles.standardPlan}>
                                  <span className={styles.standardIcon}>🔓</span>
                                  Standard
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={styles.invoiceCardFooter}>
                            <motion.button 
                              className={styles.downloadButton}
                              onClick={() => handleDownload(invoice.invoiceNumber)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <Download size={16} />
                              <span>Rechnung herunterladen</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {user?.subscriptionActive && (
                <p style={{ fontSize: "0.85rem", marginTop: "2rem", textAlign: "center" }}>
                  💳{" "}
                  <span
                    style={{
                      textDecoration: "underline",
                      cursor: "pointer",
                      color: "#666"
                    }}
                    onClick={async () => {
                      setIsPortalOpening(true);
                      try {
                        const res = await fetch("/api/stripe/portal", {
                          method: "POST",
                          credentials: "include",
                        });
                        const data = await res.json();
                        if (res.ok && data.url) {
                          window.location.href = data.url;
                        }
                      } catch {
                        alert("Fehler beim Öffnen des Kundenportals");
                        setIsPortalOpening(false);
                      }
                    }}
                  >
                    {isPortalOpening ? (
                      <>
                        <span className={styles.buttonSpinner}></span>
                        <span>Wird geöffnet...</span>
                      </>
                    ) : (
                      "Abo kündigen"
                    )}
                  </span>
                </p>
              )}
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
    </>
  );
}
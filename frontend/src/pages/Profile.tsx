import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  Key, CreditCard, Trash2, AlertCircle, CheckCircle, LogOut,
  FileText, Download, Users, Link2, RefreshCw,
  Edit3, Camera, CheckCircle2, Star, Settings, ChevronDown
} from "lucide-react";
import styles from "../styles/Profile.module.css";
import { useAuth } from "../hooks/useAuth";
import NotificationSettingsModal from "../components/NotificationSettingsModal";

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
  const [visibleInvoicesCount, setVisibleInvoicesCount] = useState(3);
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(() => {
    const saved = localStorage.getItem('assistantBotEnabled');
    return saved === null ? true : saved === 'true';
  });

  // Notification Settings Modal State
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Onboarding/Tour Reset State
  const [isResettingTour, setIsResettingTour] = useState(false);

  // Profil bearbeiten State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // E-Mail ändern State
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Profilbild State
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  // Daten-Export State
  const [isExporting, setIsExporting] = useState(false);

  // Password Section Expanded State
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

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
          console.error("Fehler beim Laden der Rechnungen:", error);
          setNotification({
            message: "Fehler beim Laden der Rechnungen",
            type: "error"
          });
        } finally {
          setIsLoadingInvoices(false);
        }
      };

      fetchInvoices();
    }
  }, [user]);

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

  const handleDownload = (invoiceNumber: string) => {
    try {
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
    window.dispatchEvent(new Event('assistantBotToggled'));

    setNotification({
      message: newValue ? "Chatbot aktiviert" : "Chatbot deaktiviert",
      type: "success"
    });
  };

  const handleResetTour = async () => {
    setIsResettingTour(true);
    try {
      const res = await fetch('/api/onboarding/reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        sessionStorage.removeItem('contract-ai-checklist-hidden');
        setNotification({
          message: "Tour wurde zurückgesetzt! Lade die Seite neu, um sie erneut zu sehen.",
          type: "success"
        });
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

  const handleStartEditName = () => {
    setEditFirstName(user?.firstName || '');
    setEditLastName(user?.lastName || '');
    setIsEditingName(true);
  };

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

  const compressImage = (file: File, maxSize = 200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas nicht unterstützt'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      setNotification({ message: "Nur PNG, JPEG oder WebP erlaubt", type: "error" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setNotification({ message: "Bild zu groß. Maximum: 10MB", type: "error" });
      return;
    }

    setIsUploadingPicture(true);

    try {
      const compressedImage = await compressImage(file, 200);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/auth/upload-profile-picture', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: compressedImage }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "Profilbild hochgeladen", type: "success" });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setNotification({ message: data.message || "Fehler beim Upload", type: "error" });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setNotification({ message: "Upload-Timeout. Bitte erneut versuchen.", type: "error" });
      } else {
        setNotification({ message: "Fehler beim Hochladen", type: "error" });
      }
    } finally {
      setIsUploadingPicture(false);
    }
  };

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
        setIsPasswordSectionOpen(false);
      } else {
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

  const handleOpenPortal = async () => {
    setIsPortalOpening(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setNotification({
          message: "Fehler beim Öffnen des Kundenportals",
          type: "error"
        });
        setIsPortalOpening(false);
      }
    } catch {
      setNotification({
        message: "Fehler beim Öffnen des Kundenportals",
        type: "error"
      });
      setIsPortalOpening(false);
    }
  };

  // Helper function for subscription check
  const isEnterprise = user?.subscriptionActive && user.subscriptionPlan === 'enterprise';

  // Get initials for avatar placeholder
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  if (isLoading) return (
    <div className={styles.pageContainer}>
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Lade Profildaten...</p>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Mein Profil & Vertragsstatus | Contract AI</title>
        <meta name="description" content="Verwalte dein Nutzerprofil, sieh deine Abo-Details und behalte alle Vertragsaktivitäten im Blick. Dein persönlicher Bereich bei Contract AI." />
        <meta name="keywords" content="Profil, Benutzerkonto, Vertragsstatus, Account verwalten, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/profile" />

        <meta property="og:title" content="Mein Profil & Vertragsstatus | Contract AI" />
        <meta property="og:description" content="Alle Vertragsdetails und Abo-Infos auf einen Blick. Verwalte dein Contract AI Profil einfach und sicher." />
        <meta property="og:url" content="https://www.contract-ai.de/profile" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />

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
          {/* Page Header */}
          <header className={styles.header}>
            <motion.h1
              className={styles.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Mein Profil
            </motion.h1>
            <p className={styles.subtitle}>Verwalte dein Konto, Abonnement und Einstellungen</p>
          </header>

          {user ? (
            <>
              {/* Profile Card */}
              <motion.div
                className={styles.profileCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {/* Avatar Section */}
                <div className={styles.profileAvatarSection}>
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="Profilbild" className={styles.profilePicture} />
                  ) : (
                    <div className={styles.profilePicturePlaceholder}>
                      {getInitials()}
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
                      <Camera size={14} />
                    )}
                  </label>
                  {user.profilePicture && (
                    <button onClick={handleDeleteProfilePicture} className={styles.deletePictureButton}>
                      Bild entfernen
                    </button>
                  )}
                </div>

                {/* Profile Info */}
                <div className={styles.profileInfo}>
                  {/* Name Field */}
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>Name</span>
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
                      <span className={styles.profileValue}>
                        {user.name || user.email?.split('@')[0]}
                        <button onClick={handleStartEditName} className={styles.profileEditBtn} title="Bearbeiten">
                          <Edit3 size={14} />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>E-Mail</span>
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
                            {isSavingEmail ? 'Senden...' : 'Bestätigen'}
                          </button>
                          <button onClick={() => { setIsEditingEmail(false); setNewEmail(''); setEmailPassword(''); }} className={styles.cancelButton}>
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className={styles.profileValue}>
                        {user.email}
                        <button onClick={() => setIsEditingEmail(true)} className={styles.profileEditBtn} title="Bearbeiten">
                          <Edit3 size={14} />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Member Since */}
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>Mitglied seit</span>
                    <span className={styles.profileValue}>
                      {user.createdAt ? formatDate(user.createdAt) : 'Unbekannt'}
                    </span>
                  </div>

                  {/* Verified Status */}
                  <div className={styles.profileField}>
                    <span className={styles.profileLabel}>Verifiziert</span>
                    <span className={`${styles.profileValue} ${styles.verifiedBadge}`}>
                      <CheckCircle2 size={16} />
                      Ja
                    </span>
                  </div>
                </div>

                {/* Subscription Badge */}
                <div className={styles.profileSubscription}>
                  <div className={`${styles.subscriptionBadge} ${
                    user.subscriptionPlan === 'enterprise' ? styles.enterprise :
                    user.subscriptionPlan === 'business' ? styles.business :
                    styles.free
                  }`}>
                    <span>
                      {user.subscriptionPlan === 'enterprise' ? '🚀' :
                       user.subscriptionPlan === 'business' ? '🏢' : '🔓'}
                    </span>
                    <span>
                      {user.subscriptionPlan === 'enterprise' ? 'Enterprise' :
                       user.subscriptionPlan === 'business' ? 'Business' : 'Free'}
                    </span>
                  </div>
                  {user.subscriptionActive && (
                    <button
                      className={styles.manageSubscriptionBtn}
                      onClick={handleOpenPortal}
                      disabled={isPortalOpening}
                    >
                      {isPortalOpening ? 'Laden...' : 'Abo verwalten'}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Upgrade Section for Free Users */}
              {!user.subscriptionActive && (
                <motion.div
                  className={styles.upgradeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className={styles.upgradeContent}>
                    <CreditCard size={24} className={styles.upgradeIcon} />
                    <div>
                      <h3 className={styles.upgradeTitle}>Upgrade auf Business oder Enterprise</h3>
                      <p className={styles.upgradeDescription}>
                        Erhalte Zugriff auf erweiterte Analysen, Vertragsoptimierung, KI-Chat und mehr.
                      </p>
                    </div>
                  </div>
                  <motion.button
                    className={styles.upgradeButton}
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isUpgrading ? (
                      <>
                        <span className={styles.buttonSpinner}></span>
                        <span>Lade...</span>
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

              {/* Settings Section */}
              <motion.section
                className={styles.sectionGroup}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className={styles.sectionHeader}>
                  <div className={`${styles.sectionIcon} ${styles.settings}`}>⚙️</div>
                  <h2 className={styles.sectionTitle}>Einstellungen</h2>
                  <span className={`${styles.sectionBadge} ${styles.included}`}>Für alle verfügbar</span>
                </div>

                <div className={styles.settingsGrid}>
                  {/* AI Assistant Card */}
                  <div className={styles.settingsCard}>
                    <div className={styles.settingsCardHeader}>
                      <span className={styles.settingsCardIcon}>💬</span>
                      <span className={styles.settingsCardTitle}>KI-Assistent</span>
                    </div>
                    <div className={styles.settingRow}>
                      <div className={styles.settingInfo}>
                        <h4>Chatbot anzeigen</h4>
                        <p>Assistenten auf allen Seiten anzeigen</p>
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
                  </div>

                  {/* Notifications Settings Card */}
                  <div className={styles.settingsCard}>
                    <div className={styles.settingsCardHeader}>
                      <span className={styles.settingsCardIcon}>🔔</span>
                      <span className={styles.settingsCardTitle}>Benachrichtigungen</span>
                    </div>
                    <div className={styles.settingRow}>
                      <div className={styles.settingInfo}>
                        <h4>Alle Einstellungen</h4>
                        <p>E-Mail, Push, In-App & Zeitplan</p>
                      </div>
                      <motion.button
                        className={styles.settingsOpenButton}
                        onClick={() => setShowNotificationSettings(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Settings size={14} />
                        Verwalten
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Enterprise Features Section */}
              <motion.section
                className={styles.sectionGroup}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className={styles.sectionHeader}>
                  <div className={`${styles.sectionIcon} ${styles.enterprise}`}>🏆</div>
                  <h2 className={styles.sectionTitle}>Enterprise Features</h2>
                  <span className={`${styles.sectionBadge} ${isEnterprise ? styles.included : styles.locked}`}>
                    {isEnterprise ? '✓ In deinem Abo' : '🔒 Upgrade erforderlich'}
                  </span>
                </div>

                <div className={styles.featureGrid}>
                  {/* Company Profile */}
                  <div className={`${styles.featureCard} ${!isEnterprise ? styles.locked : ''}`}>
                    <div className={styles.featureHeader}>
                      <div className={`${styles.featureIcon} ${styles.blue}`}>🏢</div>
                      <div className={styles.featureContent}>
                        <h3 className={styles.featureTitle}>
                          Firmenprofil
                          {!isEnterprise && <span className={styles.featureLockBadge}>Enterprise</span>}
                        </h3>
                        <p className={styles.featureDescription}>
                          Hinterlege deine Firmendaten für automatisches Ausfüllen in generierten Verträgen.
                        </p>
                      </div>
                    </div>
                    {isEnterprise ? (
                      <motion.button
                        className={`${styles.featureButton} ${styles.primary}`}
                        onClick={() => window.location.href = '/company-profile'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FileText size={16} />
                        Firmenprofil bearbeiten
                      </motion.button>
                    ) : (
                      <motion.button
                        className={`${styles.featureButton} ${styles.upgrade}`}
                        onClick={() => window.location.href = '/pricing'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Star size={16} />
                        Upgrade auf Enterprise (29€/Monat)
                      </motion.button>
                    )}
                  </div>

                  {/* Team Management */}
                  <div className={`${styles.featureCard} ${!isEnterprise ? styles.locked : ''}`}>
                    <div className={styles.featureHeader}>
                      <div className={`${styles.featureIcon} ${styles.orange}`}>👥</div>
                      <div className={styles.featureContent}>
                        <h3 className={styles.featureTitle}>
                          Team-Management
                          {!isEnterprise && <span className={styles.featureLockBadge}>Enterprise</span>}
                        </h3>
                        <p className={styles.featureDescription}>
                          Erstelle Teams, lade Mitglieder ein und arbeite gemeinsam an Verträgen.
                        </p>
                      </div>
                    </div>
                    {isEnterprise ? (
                      <motion.button
                        className={`${styles.featureButton} ${styles.primary}`}
                        onClick={() => window.location.href = '/team'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Users size={16} />
                        Team verwalten
                      </motion.button>
                    ) : (
                      <motion.button
                        className={`${styles.featureButton} ${styles.upgrade}`}
                        onClick={() => window.location.href = '/pricing'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Star size={16} />
                        Upgrade auf Enterprise (29€/Monat)
                      </motion.button>
                    )}
                  </div>

                  {/* REST API Access */}
                  <div className={`${styles.featureCard} ${!isEnterprise ? styles.locked : ''}`}>
                    <div className={styles.featureHeader}>
                      <div className={`${styles.featureIcon} ${styles.purple}`}>🔑</div>
                      <div className={styles.featureContent}>
                        <h3 className={styles.featureTitle}>
                          REST API-Zugang
                          {!isEnterprise && <span className={styles.featureLockBadge}>Enterprise</span>}
                        </h3>
                        <p className={styles.featureDescription}>
                          Programmatischer Zugriff auf alle Contract AI Funktionen. Automatisiere Workflows.
                        </p>
                      </div>
                    </div>
                    {isEnterprise ? (
                      <motion.button
                        className={`${styles.featureButton} ${styles.primary}`}
                        onClick={() => window.location.href = '/api-keys'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Key size={16} />
                        API-Keys verwalten
                      </motion.button>
                    ) : (
                      <motion.button
                        className={`${styles.featureButton} ${styles.upgrade}`}
                        onClick={() => window.location.href = '/pricing'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Star size={16} />
                        Upgrade auf Enterprise (29€/Monat)
                      </motion.button>
                    )}
                  </div>

                  {/* CRM/ERP Integrations */}
                  <div className={`${styles.featureCard} ${!isEnterprise ? styles.locked : ''}`}>
                    <div className={styles.featureHeader}>
                      <div className={`${styles.featureIcon} ${styles.blue}`}>🔗</div>
                      <div className={styles.featureContent}>
                        <h3 className={styles.featureTitle}>
                          CRM/ERP Integrationen
                          {!isEnterprise && <span className={styles.featureLockBadge}>Enterprise</span>}
                        </h3>
                        <p className={styles.featureDescription}>
                          Verbinde mit Salesforce, HubSpot, SAP und mehr. Automatische Synchronisation.
                        </p>
                      </div>
                    </div>
                    {isEnterprise ? (
                      <motion.button
                        className={`${styles.featureButton} ${styles.primary}`}
                        onClick={() => window.location.href = '/integrations'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link2 size={16} />
                        Integrationen verwalten
                      </motion.button>
                    ) : (
                      <motion.button
                        className={`${styles.featureButton} ${styles.upgrade}`}
                        onClick={() => window.location.href = '/pricing'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Star size={16} />
                        Upgrade auf Enterprise (29€/Monat)
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* Account Actions */}
              <motion.div
                className={styles.accountActions}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                {/* Data Export */}
                <div className={styles.accountActionCard}>
                  <div className={`${styles.accountActionIcon} ${styles.export}`}>📦</div>
                  <h3 className={styles.accountActionTitle}>Daten exportieren</h3>
                  <p className={styles.accountActionDesc}>Alle deine Daten als JSON herunterladen</p>
                  <motion.button
                    className={styles.accountActionBtn}
                    onClick={handleExportData}
                    disabled={isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isExporting ? (
                      <span className={styles.buttonSpinner}></span>
                    ) : (
                      <Download size={14} />
                    )}
                    {isExporting ? 'Exportiere...' : 'Exportieren'}
                  </motion.button>
                </div>

                {/* Password Change */}
                <div className={styles.accountActionCard}>
                  <div className={`${styles.accountActionIcon} ${styles.password}`}>🔐</div>
                  <h3 className={styles.accountActionTitle}>Passwort ändern</h3>
                  <p className={styles.accountActionDesc}>Aktualisiere dein Passwort</p>
                  <motion.button
                    className={styles.accountActionBtn}
                    onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Key size={14} />
                    {isPasswordSectionOpen ? 'Schließen' : 'Ändern'}
                  </motion.button>
                </div>

                {/* Tour Reset */}
                <div className={styles.accountActionCard}>
                  <div className={`${styles.accountActionIcon} ${styles.tour}`}>🎓</div>
                  <h3 className={styles.accountActionTitle}>Tour zurücksetzen</h3>
                  <p className={styles.accountActionDesc}>Einführungstour erneut starten</p>
                  <motion.button
                    className={styles.accountActionBtn}
                    onClick={handleResetTour}
                    disabled={isResettingTour}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isResettingTour ? (
                      <span className={styles.buttonSpinner}></span>
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {isResettingTour ? 'Lädt...' : 'Zurücksetzen'}
                  </motion.button>
                </div>
              </motion.div>

              {/* Password Change Section (Expandable) */}
              <AnimatePresence>
                {isPasswordSectionOpen && (
                  <motion.div
                    className={styles.passwordSection}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
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
                )}
              </AnimatePresence>

              {/* Invoices Section */}
              <motion.section
                className={styles.sectionGroup}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className={styles.sectionHeader}>
                  <div className={`${styles.sectionIcon} ${styles.invoices}`}>📄</div>
                  <h2 className={styles.sectionTitle}>Rechnungen</h2>
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
                    {/* Desktop Table */}
                    <div className={styles.invoiceTable}>
                      <div className={styles.invoiceTableHeader}>
                        <div>Datum</div>
                        <div>Abo-Typ</div>
                        <div>Betrag</div>
                        <div></div>
                      </div>

                      {invoices.slice(0, visibleInvoicesCount).map((invoice) => (
                        <div key={invoice.invoiceNumber} className={styles.invoiceRow}>
                          <div className={styles.invoiceDate}>{formatDate(invoice.date)}</div>
                          <div className={styles.invoicePlan}>
                            {invoice.plan === 'enterprise' ? (
                              <span className={styles.premiumPlan}>
                                <span className={styles.premiumIcon}>🚀</span>
                                Enterprise
                              </span>
                            ) : invoice.plan === 'business' ? (
                              <span className={styles.businessPlan}>
                                <span className={styles.businessIcon}>🏢</span>
                                Business
                              </span>
                            ) : (
                              <span className={styles.standardPlan}>
                                <span className={styles.standardIcon}>🔓</span>
                                Free
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
                            >
                              <Download size={14} />
                              PDF
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile Cards */}
                    <div className={styles.invoiceCards}>
                      {invoices.slice(0, visibleInvoicesCount).map((invoice) => (
                        <div key={invoice.invoiceNumber} className={styles.invoiceCard}>
                          <div className={styles.invoiceCardHeader}>
                            <div className={styles.invoiceDate}>{formatDate(invoice.date)}</div>
                            <div className={styles.invoiceAmount}>{formatAmount(invoice.amount)}</div>
                          </div>
                          <div className={styles.invoiceCardContent}>
                            <div className={styles.invoicePlanLabel}>Abo-Typ:</div>
                            <div className={styles.invoicePlan}>
                              {invoice.plan === 'enterprise' ? (
                                <span className={styles.premiumPlan}>
                                  <span className={styles.premiumIcon}>🚀</span>
                                  Enterprise
                                </span>
                              ) : invoice.plan === 'business' ? (
                                <span className={styles.businessPlan}>
                                  <span className={styles.businessIcon}>🏢</span>
                                  Business
                                </span>
                              ) : (
                                <span className={styles.standardPlan}>
                                  <span className={styles.standardIcon}>🔓</span>
                                  Free
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={styles.invoiceCardFooter}>
                            <motion.button
                              className={styles.downloadButton}
                              onClick={() => handleDownload(invoice.invoiceNumber)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Download size={14} />
                              Rechnung herunterladen
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Load More Button */}
                    {invoices.length > visibleInvoicesCount && (
                      <motion.button
                        className={styles.loadMoreButton}
                        onClick={() => setVisibleInvoicesCount(prev => prev + 3)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ChevronDown size={16} />
                        Mehr anzeigen ({invoices.length - visibleInvoicesCount} weitere)
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.section>

              {/* Danger Zone */}
              <motion.div
                className={styles.dangerSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
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
                >
                  <Trash2 size={16} />
                  <span>Account löschen</span>
                </motion.button>
              </motion.div>
            </>
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

        {/* Notification Settings Modal */}
        <NotificationSettingsModal
          isOpen={showNotificationSettings}
          onClose={() => setShowNotificationSettings(false)}
          onSaved={() => setNotification({ message: "Benachrichtigungseinstellungen gespeichert", type: "success" })}
        />
      </div>
    </>
  );
}

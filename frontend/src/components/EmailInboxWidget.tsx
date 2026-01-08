// 📁 frontend/src/components/EmailInboxWidget.tsx
// Premium Enterprise Design - E-Mail Upload Widget

import { useState } from "react";
import { Copy, HelpCircle, RefreshCw, Power, Check, Mail, Zap, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./EmailInboxWidget.module.css";
import EmailTutorialModal from "./EmailTutorialModal";
import { apiCall } from "../utils/api";
import { useToast } from "../context/ToastContext";

interface EmailInboxWidgetProps {
  emailInboxAddress: string | null;
  emailInboxEnabled: boolean;
  onUpdate: () => void;
}

export default function EmailInboxWidget({
  emailInboxAddress,
  emailInboxEnabled,
  onUpdate
}: EmailInboxWidgetProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success } = useToast();

  const handleCopy = () => {
    if (emailInboxAddress) {
      navigator.clipboard.writeText(emailInboxAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success("E-Mail-Adresse kopiert!", 3000);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Neue E-Mail-Adresse generieren? Die alte Adresse wird ungültig.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall("/auth/email-inbox/regenerate", {
        method: "POST"
      }) as { emailInboxAddress: string };
      console.log("Neue Adresse generiert:", response.emailInboxAddress);
      onUpdate();
    } catch (error) {
      console.error("Fehler beim Regenerieren:", error);
      alert("Fehler beim Generieren einer neuen Adresse");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      await apiCall("/auth/email-inbox/toggle", {
        method: "PUT",
        body: JSON.stringify({ enabled })
      });
      onUpdate();
    } catch (error) {
      console.error("Fehler beim Toggle:", error);
      alert("Fehler beim Aktivieren/Deaktivieren");
    } finally {
      setLoading(false);
    }
  };

  if (!emailInboxAddress) {
    return null;
  }

  return (
    <>
      <motion.div
        className={`${styles.widget} ${!emailInboxEnabled ? styles.disabled : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>
              <div className={styles.headerIcon}>
                <Mail />
              </div>
              <h3 className={styles.title}>E-Mail Upload</h3>
            </div>
            <span className={`${styles.statusBadge} ${emailInboxEnabled ? styles.statusActive : styles.statusInactive}`}>
              {emailInboxEnabled ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <p className={styles.subtitle}>
            Leite E-Mails mit Verträgen an deine persönliche Adresse weiter
          </p>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Address Section */}
          <div className={styles.addressSection}>
            <div className={styles.addressLabel}>Deine Upload-Adresse</div>
            <div className={styles.addressBox}>
              <code className={styles.address}>{emailInboxAddress}</code>
              <div className={styles.controls}>
                <button
                  onClick={handleCopy}
                  className={`${styles.controlButton} ${copied ? styles.success : ''}`}
                  title="Kopieren"
                  disabled={loading || !emailInboxEnabled}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button
                  onClick={handleRegenerate}
                  className={styles.controlButton}
                  title="Neue Adresse"
                  disabled={loading}
                >
                  <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                </button>
                <button
                  onClick={() => handleToggle(!emailInboxEnabled)}
                  className={`${styles.controlButton} ${emailInboxEnabled ? styles.active : styles.inactive}`}
                  title={emailInboxEnabled ? "Deaktivieren" : "Aktivieren"}
                  disabled={loading}
                >
                  <Power size={18} />
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className={styles.controlButton}
                  title="Hilfe"
                  disabled={loading}
                >
                  <HelpCircle size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className={styles.howItWorks}>
            <h4 className={styles.howItWorksTitle}>
              <Zap size={16} />
              So funktioniert's
            </h4>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <p><strong>Adresse kopieren</strong> – Klicke auf das Kopier-Symbol</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <p><strong>E-Mail weiterleiten</strong> – Leite Vertrags-E-Mails an diese Adresse</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <p><strong>Automatisch importiert</strong> – Anhänge werden als Verträge gespeichert</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning when disabled */}
          {!emailInboxEnabled && (
            <div className={styles.warningBox}>
              <AlertTriangle size={18} className={styles.warningIcon} />
              <p className={styles.warningText}>
                E-Mail-Upload ist deaktiviert. Klicke auf den Power-Button zum Aktivieren.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tutorial Modal */}
      <EmailTutorialModal
        show={showTutorial}
        emailAddress={emailInboxAddress}
        emailEnabled={emailInboxEnabled}
        onClose={() => setShowTutorial(false)}
        onCopy={handleCopy}
        onRegenerate={handleRegenerate}
        onToggle={handleToggle}
      />
    </>
  );
}

// 📁 frontend/src/components/EmailInboxWidget.tsx
// Kompaktes Widget für E-Mail-Inbox Feature in Contracts-Seite

import { useState } from "react";
import { Copy, HelpCircle, RefreshCw, Power, Check } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./EmailInboxWidget.module.css";
import EmailTutorialModal from "./EmailTutorialModal";
import { apiCall } from "../utils/api";
import { useToast } from "../context/ToastContext";

interface EmailInboxWidgetProps {
  emailInboxAddress: string | null;
  emailInboxEnabled: boolean;
  onUpdate: () => void; // Callback um User-Daten neu zu laden
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

  // Copy to Clipboard
  const handleCopy = () => {
    if (emailInboxAddress) {
      navigator.clipboard.writeText(emailInboxAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // ✅ Spezifischer Toast mit klarer Handlungsaufforderung
      success("📧 Email-Adresse kopiert! Leite jetzt deine Verträge weiter.", 4000);
    }
  };

  // Regenerate Address
  const handleRegenerate = async () => {
    if (!confirm("Neue E-Mail-Adresse generieren? Die alte Adresse wird ungültig.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall("/auth/email-inbox/regenerate", {
        method: "POST"
      }) as { emailInboxAddress: string };
      console.log("✅ Neue Adresse generiert:", response.emailInboxAddress);
      onUpdate(); // User-Daten neu laden
    } catch (error) {
      console.error("❌ Fehler beim Regenerieren:", error);
      alert("Fehler beim Generieren einer neuen Adresse");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Inbox
  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      await apiCall("/auth/email-inbox/toggle", {
        method: "PUT",
        body: JSON.stringify({ enabled })
      });
      console.log(`✅ Inbox ${enabled ? 'aktiviert' : 'deaktiviert'}`);
      onUpdate(); // User-Daten neu laden
    } catch (error) {
      console.error("❌ Fehler beim Toggle:", error);
      alert("Fehler beim Aktivieren/Deaktivieren");
    } finally {
      setLoading(false);
    }
  };

  if (!emailInboxAddress) {
    return null; // Feature nicht verfügbar (alter User ohne Migration)
  }

  return (
    <>
      <motion.div
        className={`${styles.widget} ${!emailInboxEnabled ? styles.disabled : ''}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Status Badge wenn deaktiviert */}
        {!emailInboxEnabled && (
          <div className={styles.statusBar}>
            <span className={styles.disabledBadge}>Deaktiviert</span>
          </div>
        )}

        {/* Haupt-Content: E-Mail Adresse mit Controls */}
        <div className={styles.addressContainer}>
          <div className={styles.addressLabel}>Deine persönliche Upload-Adresse:</div>
          <div className={styles.addressBox}>
            <code className={styles.address}>{emailInboxAddress}</code>
            <div className={styles.controls}>
              <button
                onClick={handleCopy}
                className={`${styles.controlButton} ${copied ? styles.success : ''}`}
                title="Adresse kopieren"
                disabled={loading || !emailInboxEnabled}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <button
                onClick={handleRegenerate}
                className={styles.controlButton}
                title="Neue Adresse generieren"
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
                title="Anleitung anzeigen"
                disabled={loading}
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Warning wenn deaktiviert */}
        {!emailInboxEnabled && (
          <p className={styles.warningText}>
            E-Mail-Upload ist deaktiviert. Klicke auf den Power-Button zum Aktivieren.
          </p>
        )}
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

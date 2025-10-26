// 📁 frontend/src/components/EmailInboxWidget.tsx
// Kompaktes Widget für E-Mail-Inbox Feature in Contracts-Seite

import { useState } from "react";
import { Mail, Copy, HelpCircle, RefreshCw, Power, Check } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./EmailInboxWidget.module.css";
import EmailTutorialModal from "./EmailTutorialModal";
import { apiCall } from "../utils/api";

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

  // Copy to Clipboard
  const handleCopy = () => {
    if (emailInboxAddress) {
      navigator.clipboard.writeText(emailInboxAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Mail size={20} className={styles.icon} />
            <span className={styles.title}>E-Mail-Upload</span>
            {!emailInboxEnabled && <span className={styles.disabledBadge}>Deaktiviert</span>}
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className={styles.helpButton}
            title="Anleitung anzeigen"
            disabled={loading}
          >
            <HelpCircle size={16} />
          </button>
        </div>

        <p className={styles.description}>
          Leite E-Mails mit Verträgen an deine persönliche Adresse weiter:
        </p>

        <div className={styles.addressBox}>
          <code className={styles.address}>{emailInboxAddress}</code>
          <div className={styles.controls}>
            <button
              onClick={handleCopy}
              className={`${styles.controlButton} ${copied ? styles.success : ''}`}
              title="Adresse kopieren"
              disabled={loading || !emailInboxEnabled}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleRegenerate}
              className={styles.controlButton}
              title="Neue Adresse generieren"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            </button>
            <button
              onClick={() => handleToggle(!emailInboxEnabled)}
              className={`${styles.controlButton} ${emailInboxEnabled ? styles.active : styles.inactive}`}
              title={emailInboxEnabled ? "Deaktivieren" : "Aktivieren"}
              disabled={loading}
            >
              <Power size={16} />
            </button>
          </div>
        </div>

        {!emailInboxEnabled && (
          <p className={styles.warningText}>
            ⚠️ E-Mail-Upload ist deaktiviert. Klicke auf <Power size={12} style={{display: 'inline', verticalAlign: 'middle'}} /> zum Aktivieren.
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

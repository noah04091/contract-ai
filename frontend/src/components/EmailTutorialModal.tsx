// 📁 frontend/src/components/EmailTutorialModal.tsx
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ArrowRight, CheckCircle, Copy, RefreshCw, Power } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import styles from "./EmailTutorialModal.module.css";

interface EmailTutorialModalProps {
  show: boolean;
  emailAddress: string | null;
  emailEnabled: boolean;
  onClose: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onToggle: (enabled: boolean) => void;
}

export default function EmailTutorialModal({
  show,
  emailAddress,
  emailEnabled,
  onClose,
  onCopy,
  onRegenerate,
  onToggle
}: EmailTutorialModalProps) {
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const handleRegenerate = () => {
    if (showRegenerateConfirm) {
      onRegenerate();
      setShowRegenerateConfirm(false);
    } else {
      setShowRegenerateConfirm(true);
    }
  };

  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Wrapper - für Zentrierung */}
          <div className={styles.modalWrapper}>
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
            <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>

            <div className={styles.header}>
              <Mail size={32} className={styles.icon} />
              <h2>📧 Automatischer E-Mail-Upload</h2>
              <p>Verträge per E-Mail hochladen – ohne Login!</p>
            </div>

            {/* E-Mail-Adresse + Controls */}
            <div className={styles.addressSection}>
              <div className={styles.addressBox}>
                <code>{emailAddress || 'Lädt...'}</code>
                <div className={styles.addressControls}>
                  <button
                    onClick={onCopy}
                    className={styles.iconButton}
                    title="Adresse kopieren"
                    aria-label="Copy email address"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className={`${styles.iconButton} ${showRegenerateConfirm ? styles.confirm : ''}`}
                    title={showRegenerateConfirm ? "Nochmal klicken zum Bestätigen" : "Neue Adresse generieren"}
                    aria-label="Regenerate email address"
                  >
                    <RefreshCw size={16} className={showRegenerateConfirm ? styles.spinning : ''} />
                  </button>
                  <button
                    onClick={() => onToggle(!emailEnabled)}
                    className={`${styles.iconButton} ${emailEnabled ? styles.active : styles.inactive}`}
                    title={emailEnabled ? "Deaktivieren" : "Aktivieren"}
                    aria-label="Toggle email inbox"
                  >
                    <Power size={16} />
                  </button>
                </div>
              </div>
              {showRegenerateConfirm && (
                <p className={styles.warning}>
                  ⚠️ Die alte Adresse wird ungültig. Nochmal klicken zum Bestätigen.
                </p>
              )}
              {!emailEnabled && (
                <p className={styles.warning}>
                  ⚠️ E-Mail-Upload ist deaktiviert. Klicke auf <Power size={14} style={{display: 'inline', verticalAlign: 'middle'}} /> zum Aktivieren.
                </p>
              )}
            </div>

            {/* Anleitung */}
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h3>E-Mail weiterleiten</h3>
                  <p>Leite E-Mails mit PDF-Verträgen an deine persönliche Adresse weiter.</p>
                </div>
              </div>

              <ArrowRight className={styles.arrow} size={24} />

              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h3>Automatische Verarbeitung</h3>
                  <p>Das System erkennt PDF-Anhänge automatisch und lädt sie hoch.</p>
                </div>
              </div>

              <ArrowRight className={styles.arrow} size={24} />

              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h3>Sofort verfügbar</h3>
                  <p>Deine Verträge erscheinen automatisch in deinem Dashboard.</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className={styles.features}>
              <h3>✨ Vorteile</h3>
              <ul>
                <li><CheckCircle size={16} /> Kein manueller Upload nötig</li>
                <li><CheckCircle size={16} /> Funktioniert von jedem E-Mail-Postfach</li>
                <li><CheckCircle size={16} /> Automatische Speicherung & Organisation</li>
                <li><CheckCircle size={16} /> E-Mail-Betreff wird als Notiz gespeichert</li>
                <li><CheckCircle size={16} /> Sichere Server-side Verschlüsselung</li>
              </ul>
            </div>

            {/* Wichtige Hinweise */}
            <div className={styles.notes}>
              <h4>📌 Wichtig:</h4>
              <ul>
                <li>PDF- und DOCX-Dateien werden verarbeitet (max. 15 MB)</li>
                <li>E-Mails werden nicht gespeichert (nur Metadaten)</li>
                <li>Du kannst deine Adresse jederzeit neu generieren</li>
              </ul>
            </div>

            <div className={styles.footer}>
              <button onClick={onClose} className={styles.gotItButton}>
                Verstanden!
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

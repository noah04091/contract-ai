// 🆘 HelpModal.tsx - Hilfe für Signaturprozess
// Erklärt Workflow, Support-Kontakt, Datenschutz

import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, FileSignature, Shield, Mail } from "lucide-react";
import styles from "../styles/HelpModal.module.css";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <HelpCircle size={24} />
              </div>
              <h2 className={styles.title} id="help-title">
                Hilfe zur Signatur
              </h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Schließen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
              {/* Section 1: Wie ausfüllen */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FileSignature size={20} className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Wie funktioniert die Signatur?</h3>
                </div>
                <div className={styles.sectionContent}>
                  <ol className={styles.stepList}>
                    <li>
                      <strong>Felder auswählen:</strong> Klicken Sie auf ein markiertes Feld im Dokument
                      oder wählen Sie ein Feld aus der Liste rechts.
                    </li>
                    <li>
                      <strong>Ausfüllen:</strong> Je nach Feldtyp können Sie eine Signatur zeichnen,
                      ein Datum eingeben oder Text eintragen.
                    </li>
                    <li>
                      <strong>Navigation:</strong> Nutzen Sie "Nächstes Feld" oder die Pfeiltasten (←/→)
                      um zwischen Feldern zu wechseln.
                    </li>
                    <li>
                      <strong>Fertigstellen:</strong> Sobald alle Pflichtfelder ausgefüllt sind,
                      können Sie das Dokument mit "Fertigstellen" einreichen.
                    </li>
                  </ol>

                  <div className={styles.tipBox}>
                    <strong>💡 Tipp:</strong> Ihre Eingaben werden automatisch alle 5 Sekunden gespeichert.
                    Sie können jederzeit pausieren und später weitermachen.
                  </div>

                  <div className={styles.keyboardShortcuts}>
                    <strong>⌨️ Tastatur-Shortcuts:</strong>
                    <ul>
                      <li><kbd>Strg+S</kbd> / <kbd>⌘+S</kbd> – Manuelles Speichern</li>
                      <li><kbd>→</kbd> oder <kbd>N</kbd> – Nächstes Feld</li>
                      <li><kbd>←</kbd> oder <kbd>P</kbd> – Vorheriges Feld</li>
                      <li><kbd>Esc</kbd> – Modal schließen</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 2: Probleme */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Mail size={20} className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Hilfe bei Problemen</h3>
                </div>
                <div className={styles.sectionContent}>
                  <p>
                    Falls Sie technische Schwierigkeiten haben oder Fragen zum Dokument,
                    wenden Sie sich bitte an:
                  </p>
                  <div className={styles.contactBox}>
                    <strong>Support-Team</strong>
                    <p>
                      📧 E-Mail: <a href="mailto:support@contract-ai.de">support@contract-ai.de</a>
                    </p>
                    <p className={styles.note}>
                      Bitte geben Sie bei Anfragen die Dokument-Nummer aus der E-Mail an.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Datenschutz */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Shield size={20} className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Datenschutz & Sicherheit</h3>
                </div>
                <div className={styles.sectionContent}>
                  <ul className={styles.securityList}>
                    <li>
                      Ihre Signaturen werden verschlüsselt übertragen und sicher gespeichert.
                    </li>
                    <li>
                      Zwischenspeicherungen erfolgen nur lokal in Ihrem Browser
                      und werden nach der Signatur automatisch gelöscht.
                    </li>
                    <li>
                      Der Signaturlink ist nur für Sie gültig und läuft nach Ablauf automatisch ab.
                    </li>
                    <li>
                      Weitere Informationen finden Sie in unserer{" "}
                      <a href="/datenschutz" target="_blank" rel="noopener noreferrer">
                        Datenschutzerklärung
                      </a>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button className={styles.closeFooterButton} onClick={onClose}>
                Schließen
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, FileText, Zap, X } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./UploadSuccessModal.module.css";

interface UploadedContract {
  _id: string;
  name: string;
  uploadedAt: string;
}

interface UploadSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedContracts: UploadedContract[];
  onAnalyze: () => void;
  onSkip: () => void;
  analysisCount?: number;
  analysisLimit?: number;
}

export default function UploadSuccessModal({
  isOpen,
  onClose,
  uploadedContracts,
  onAnalyze,
  onSkip,
  analysisCount = 0,
  analysisLimit = 0
}: UploadSuccessModalProps) {
  const contractCount = uploadedContracts.length;
  const remainingAnalyses = analysisLimit - analysisCount;
  const hasEnoughAnalyses = remainingAnalyses >= contractCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button className={styles.closeButton} onClick={onClose} aria-label="Schließen">
              <X size={20} />
            </button>

            {/* Success Header */}
            <div className={styles.header}>
              <motion.div
                className={styles.successIcon}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <CheckCircle size={48} />
              </motion.div>
              <h2 className={styles.title}>
                ✅ {contractCount} Vertrag{contractCount > 1 ? 'e' : ''} erfolgreich hochgeladen!
              </h2>
              <p className={styles.subtitle}>
                Was möchtest du als Nächstes tun?
              </p>
            </div>

            {/* Content Area */}
            <div className={styles.content}>
              {/* Uploaded Files List */}
              <div className={styles.filesList}>
                {uploadedContracts.map((contract, index) => (
                  <motion.div
                    key={contract._id}
                    className={styles.fileItem}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <FileText size={16} />
                    <span>{contract.name}</span>
                  </motion.div>
                ))}
              </div>

              {/* Action Cards */}
              <div className={styles.actionsGrid}>
                {/* Analyze Card */}
                <motion.div
                  className={`${styles.actionCard} ${styles.analyzeCard} ${!hasEnoughAnalyses ? styles.disabled : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className={styles.cardIcon}>
                    <Zap size={32} />
                  </div>
                  <h3 className={styles.cardTitle}>Analysieren</h3>
                  <p className={styles.cardDescription}>
                    KI-gestützte Analyse starten
                  </p>
                  <div className={styles.cardInfo}>
                    <span className={styles.analysisCount}>
                      {contractCount} Analyse{contractCount > 1 ? 'n' : ''} verbraucht
                    </span>
                    {analysisLimit > 0 && (
                      <span className={styles.analysisRemaining}>
                        ({remainingAnalyses} übrig)
                      </span>
                    )}
                  </div>
                  <button
                    className={`${styles.cardButton} ${styles.primaryButton}`}
                    onClick={onAnalyze}
                    disabled={!hasEnoughAnalyses}
                  >
                    {hasEnoughAnalyses ? 'Jetzt analysieren' : 'Limit erreicht'}
                  </button>
                  {!hasEnoughAnalyses && (
                    <p className={styles.upgradeHint}>
                      <Link to="/pricing" onClick={onClose}>Upgrade für mehr Analysen</Link>
                    </p>
                  )}
                </motion.div>

                {/* Skip Card */}
                <motion.div
                  className={`${styles.actionCard} ${styles.skipCard}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className={styles.cardIcon}>
                    <CheckCircle size={32} />
                  </div>
                  <h3 className={styles.cardTitle}>Fertig</h3>
                  <p className={styles.cardDescription}>
                    Nur verwalten
                  </p>
                  <div className={styles.cardInfo}>
                    <span className={styles.analysisCount}>
                      0 Analysen verbraucht
                    </span>
                  </div>
                  <button
                    className={`${styles.cardButton} ${styles.secondaryButton}`}
                    onClick={onSkip}
                  >
                    Speichern
                  </button>
                </motion.div>
              </div>
            </div>

            {/* Info Footer */}
            <div className={styles.footer}>
              <p className={styles.footerText}>
                💡 Du kannst Verträge jederzeit später unter <strong>"Meine Verträge"</strong> analysieren
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

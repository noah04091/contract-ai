import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, FileText, Search, Save, X, Radar, Check } from "lucide-react";
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
  isPremium?: boolean;
}

export default function UploadSuccessModal({
  isOpen,
  onClose,
  uploadedContracts,
  onAnalyze,
  onSkip,
  analysisCount = 0,
  analysisLimit = 0,
  isPremium = false
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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
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
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle size={40} />
              </motion.div>
              <h2 className={styles.title}>
                Erfolgreich hochgeladen!
              </h2>
              <p className={styles.subtitle}>
                {contractCount} Vertrag{contractCount > 1 ? 'e' : ''} wurde{contractCount > 1 ? 'n' : ''} gespeichert
              </p>
            </div>

            {/* Content Area */}
            <div className={styles.content}>
              {/* Uploaded Files List */}
              <div className={styles.filesList}>
                {uploadedContracts.slice(0, 5).map((contract, index) => (
                  <motion.div
                    key={contract._id}
                    className={styles.fileItem}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <div className={styles.fileIcon}>
                      <FileText size={16} />
                    </div>
                    <span>{contract.name}</span>
                  </motion.div>
                ))}
                {uploadedContracts.length > 5 && (
                  <div className={styles.moreFiles}>
                    +{uploadedContracts.length - 5} weitere Dateien
                  </div>
                )}
              </div>

              {/* Question */}
              <p className={styles.questionText}>
                Was möchtest du als Nächstes tun?
              </p>

              {/* Action Cards */}
              <div className={styles.actionsGrid}>
                {/* Analyze Card - Recommended */}
                <motion.div
                  className={`${styles.actionCard} ${styles.analyzeCard} ${!hasEnoughAnalyses ? styles.disabled : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={hasEnoughAnalyses ? { y: -4 } : {}}
                >
                  <div className={styles.recommendedBadge}>Empfohlen</div>
                  <div className={styles.cardIcon}>
                    <Search size={26} />
                  </div>
                  <h3 className={styles.cardTitle}>KI-Rechtsprüfung</h3>
                  <p className={styles.cardDescription}>
                    Sofortige Analyse wie vom Anwalt
                  </p>

                  {/* Feature List */}
                  <ul className={styles.featureList}>
                    <li>
                      <Check size={14} />
                      <span>Risiken erkennen</span>
                    </li>
                    <li>
                      <Check size={14} />
                      <span>Klauseln bewerten</span>
                    </li>
                    <li>
                      <Check size={14} />
                      <span>Optimierungsvorschläge</span>
                    </li>
                  </ul>

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
                  whileHover={{ y: -4 }}
                >
                  <div className={styles.cardIcon}>
                    <Save size={26} />
                  </div>
                  <h3 className={styles.cardTitle}>Nur speichern</h3>
                  <p className={styles.cardDescription}>
                    Später analysieren
                  </p>

                  {/* Feature List */}
                  <ul className={styles.featureList}>
                    <li>
                      <Check size={14} />
                      <span>In Verwaltung sehen</span>
                    </li>
                    <li>
                      <Check size={14} />
                      <span>Fristen tracken</span>
                    </li>
                    <li>
                      <Check size={14} />
                      <span>Jederzeit prüfbar</span>
                    </li>
                  </ul>

                  <div className={styles.cardInfo}>
                    <span className={styles.analysisCountFree}>
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

              {/* Legal Pulse Info Banner */}
              <motion.div
                className={styles.legalPulseBanner}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className={styles.bannerIcon}>
                  <Radar size={22} />
                </div>
                <div className={styles.bannerContent}>
                  <h5 className={styles.bannerTitle}>Legal Pulse aktiv</h5>
                  <p className={styles.bannerText}>
                    {isPremium
                      ? "Deine Verträge werden automatisch auf Gesetzesänderungen überwacht. Du erhältst Benachrichtigungen bei relevanten Änderungen."
                      : "Mit Premium werden deine Verträge automatisch auf Gesetzesänderungen überwacht."
                    }
                  </p>
                </div>
                {!isPremium && (
                  <Link to="/pricing" className={styles.bannerLink} onClick={onClose}>
                    Premium
                  </Link>
                )}
              </motion.div>
            </div>

            {/* Info Footer */}
            <div className={styles.footer}>
              <p className={styles.footerText}>
                Du kannst Verträge jederzeit später unter <Link to="/contracts" onClick={onClose}><strong>Meine Verträge</strong></Link> analysieren
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

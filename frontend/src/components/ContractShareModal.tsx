import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Copy, Check, Share2, Mail, MessageSquare, 
  QrCode, ExternalLink 
} from "lucide-react";
import styles from "../styles/ContractShareModal.module.css";

interface ContractShareModalProps {
  contract: {
    _id: string;
    name: string;
  };
  onClose: () => void;
  show: boolean;
}

export default function ContractShareModal({ 
  contract, 
  onClose, 
  show 
}: ContractShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Generiere den Contract-Link
  const contractLink = `https://contract-ai.de/contracts/${contract._id}`;
  
  // Erstelle Share-Texte
  const shareText = `Vertrag "${contract.name}" - Contract AI`;
  const emailSubject = encodeURIComponent(`Vertrag: ${contract.name}`);
  const emailBody = encodeURIComponent(
    `Hallo,\n\nIch teile mit dir den Vertrag "${contract.name}".\n\nLink: ${contractLink}\n\nViele Grüße`
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(contractLink);
      setCopied(true);
      setCopySuccess("Link erfolgreich kopiert!");
      
      setTimeout(() => {
        setCopied(false);
        setCopySuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopySuccess("Fehler beim Kopieren");
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const handleShareViaEmail = () => {
    const mailtoLink = `mailto:?subject=${emailSubject}&body=${emailBody}`;
    window.open(mailtoLink, '_blank');
  };

  const handleShareViaSMS = () => {
    const smsText = encodeURIComponent(`${shareText}\n${contractLink}`);
    const smsLink = `sms:?body=${smsText}`;
    window.open(smsLink, '_self');
  };

  const handleOpenInNewTab = () => {
    window.open(contractLink, '_blank', 'noopener,noreferrer');
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Share2 size={24} />
            </div>
            <div className={styles.headerText}>
              <h2>Vertrag teilen</h2>
              <p>"{contract.name}"</p>
            </div>
            <button 
              className={styles.closeBtn}
              onClick={onClose}
              title="Schließen"
            >
              <X size={20} />
            </button>
          </div>

          {/* Link Section */}
          <div className={styles.linkSection}>
            <label className={styles.linkLabel}>Vertragslink</label>
            <div className={styles.linkContainer}>
              <input 
                type="text" 
                value={contractLink}
                readOnly
                className={styles.linkInput}
                onClick={(e) => e.currentTarget.select()}
              />
              <button 
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopyLink}
                title="Link kopieren"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    <span>Kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Kopieren</span>
                  </>
                )}
              </button>
            </div>
            
            {copySuccess && (
              <motion.div 
                className={styles.copySuccess}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Check size={16} />
                <span>{copySuccess}</span>
              </motion.div>
            )}
          </div>

          {/* Share Options */}
          <div className={styles.shareOptions}>
            <h3>Teilen via</h3>
            <div className={styles.shareGrid}>
              <button 
                className={styles.shareOption}
                onClick={handleShareViaEmail}
                title="Per E-Mail teilen"
              >
                <div className={styles.shareIcon}>
                  <Mail size={20} />
                </div>
                <span>E-Mail</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={handleShareViaSMS}
                title="Per SMS teilen"
              >
                <div className={styles.shareIcon}>
                  <MessageSquare size={20} />
                </div>
                <span>SMS</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={handleOpenInNewTab}
                title="In neuem Tab öffnen"
              >
                <div className={styles.shareIcon}>
                  <ExternalLink size={20} />
                </div>
                <span>Öffnen</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={() => {
                  // QR-Code Funktionalität könnte hier implementiert werden
                  alert("QR-Code Funktionalität kommt bald!");
                }}
                title="QR-Code anzeigen"
              >
                <div className={styles.shareIcon}>
                  <QrCode size={20} />
                </div>
                <span>QR-Code</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerInfo}>
              <p>
                <strong>Hinweis:</strong> Der Link ist nur für Benutzer mit entsprechenden 
                Berechtigungen zugänglich.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
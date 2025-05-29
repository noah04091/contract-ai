import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileText, Calendar, Clock, AlertCircle, CheckCircle, 
  Info, Eye, Download, Share2, Edit, Trash2, Star
} from "lucide-react";
import styles from "../styles/ContractDetailsView.module.css";
import ReminderToggle from "./ReminderToggle";

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  reminder?: boolean;
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
}

interface ContractDetailsViewProps {
  contract: Contract;
  onClose: () => void;
  show: boolean;
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
}

export default function ContractDetailsView({ 
  contract, 
  onClose, 
  show, 
  onEdit, 
  onDelete 
}: ContractDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analysis'>('overview');

  const formatDate = (dateString: string): string => {
    if (!dateString) return "Unbekannt";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return <CheckCircle size={16} className={styles.statusIconActive} />;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return <AlertCircle size={16} className={styles.statusIconWarning} />;
    } else {
      return <Info size={16} className={styles.statusIconNeutral} />;
    }
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return styles.statusActive;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return styles.statusWarning;
    } else if (statusLower === "gekündigt" || statusLower === "beendet") {
      return styles.statusCancelled;
    } else {
      return styles.statusNeutral;
    }
  };

  const handleEdit = () => {
    if (onEdit) onEdit(contract._id);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(contract._id, contract.name);
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
          className={styles.drawer}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.contractInfo}>
                <div className={styles.contractIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className={styles.contractName}>{contract.name}</h2>
                  <div className={styles.contractMeta}>
                    <span className={styles.uploadDate}>
                      Hochgeladen am {formatDate(contract.createdAt)}
                    </span>
                    {contract.isGenerated && (
                      <span className={styles.generatedBadge}>
                        <Star size={12} />
                        KI-Generiert
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.headerActions}>
                <button 
                  className={styles.actionBtn}
                  onClick={() => {/* Share functionality */}}
                  title="Teilen"
                >
                  <Share2 size={18} />
                </button>
                <button 
                  className={styles.actionBtn}
                  onClick={handleEdit}
                  title="Bearbeiten"
                >
                  <Edit size={18} />
                </button>
                <button 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={handleDelete}
                  title="Löschen"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  className={styles.closeBtn}
                  onClick={onClose}
                  title="Schließen"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className={styles.statusBar}>
              <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                {getStatusIcon(contract.status)}
                <span>{contract.status}</span>
              </div>
              
              <div className={styles.quickStats}>
                {contract.kuendigung && (
                  <div className={styles.quickStat}>
                    <Clock size={14} />
                    <span>Kündigung: {contract.kuendigung}</span>
                  </div>
                )}
                {contract.expiryDate && (
                  <div className={styles.quickStat}>
                    <Calendar size={14} />
                    <span>Läuft ab: {formatDate(contract.expiryDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabNav}>
              <button 
                className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Info size={16} />
                <span>Übersicht</span>
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'content' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('content')}
                disabled={!contract.content}
              >
                <Eye size={16} />
                <span>Inhalt</span>
                {!contract.content && <span className={styles.comingSoon}>Bald</span>}
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('analysis')}
                disabled
              >
                <FileText size={16} />
                <span>Analyse</span>
                <span className={styles.comingSoon}>Bald</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {activeTab === 'overview' && (
              <motion.div 
                className={styles.overviewTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <FileText size={18} />
                    Vertragsdetails
                  </h3>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <label>Vertragsname</label>
                      <span>{contract.name || "Unbekannt"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Status</label>
                      <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                        {getStatusIcon(contract.status)}
                        <span>{contract.status}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Kündigungsfrist</label>
                      <span>{contract.kuendigung || "Nicht angegeben"}</span>
                    </div>
                    {contract.laufzeit && (
                      <div className={styles.detailItem}>
                        <label>Laufzeit</label>
                        <span>{contract.laufzeit}</span>
                      </div>
                    )}
                    {contract.expiryDate && (
                      <div className={styles.detailItem}>
                        <label>Ablaufdatum</label>
                        <span>{formatDate(contract.expiryDate)}</span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <label>Hochgeladen am</label>
                      <span>{formatDate(contract.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <AlertCircle size={18} />
                    Einstellungen
                  </h3>
                  <div className={styles.settingsGrid}>
                    <ReminderToggle
                      contractId={contract._id}
                      initialValue={contract.reminder || false}
                    />
                  </div>
                </div>

                {contract.isGenerated && (
                  <div className={styles.section}>
                    <div className={styles.aiNotice}>
                      <Star size={20} />
                      <div>
                        <h4>KI-Generierter Vertrag</h4>
                        <p>Dieser Vertrag wurde von unserer KI erstellt. Bitte prüfe alle Details vor der Verwendung.</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'content' && (
              <motion.div 
                className={styles.contentTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {contract.content ? (
                  <div className={styles.contentViewer}>
                    <div className={styles.contentHeader}>
                      <h3>Vertragsinhalt</h3>
                      <button className={styles.downloadBtn}>
                        <Download size={16} />
                        <span>Herunterladen</span>
                      </button>
                    </div>
                    <div className={styles.contentText}>
                      {contract.content}
                    </div>
                  </div>
                ) : (
                  <div className={styles.noContent}>
                    <FileText size={48} />
                    <h3>Kein Inhalt verfügbar</h3>
                    <p>Der Vertragsinhalt konnte nicht geladen werden oder ist nicht verfügbar.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div 
                className={styles.analysisTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.comingSoonContent}>
                  <FileText size={48} />
                  <h3>KI-Analyse</h3>
                  <p>Die intelligente Vertragsanalyse ist bald verfügbar und wird dir wichtige Insights zu diesem Vertrag liefern.</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
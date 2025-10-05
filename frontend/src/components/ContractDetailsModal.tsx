// src/components/ContractDetailsModal.tsx
import styles from "../styles/ContractDetailsModal.module.css";
import ReminderToggle from "./ReminderToggle";

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  reminder?: boolean;
}

interface ContractDetailsModalProps {
  contract: Contract;
  onClose: () => void;
  show: boolean;
}

export default function ContractDetailsModal({ contract, onClose, show }: ContractDetailsModalProps) {
  if (!show) return null;

  const getStatusClass = (status: string) => {
    const normalized = status.toLowerCase().replace(/\s+/g, '');
    return normalized;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        <div className={styles.modalHeader}>
          <h3>📃 Vertragsdetails</h3>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Vertragsname</span>
            <span className={styles.detailValue}>{contract.name || "Unbekannt"}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Kündigungsfrist</span>
            <span className={styles.detailValue}>{contract.kuendigung || "Unbekannt"}</span>
          </div>

          {contract.laufzeit && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Laufzeit</span>
              <span className={styles.detailValue}>{contract.laufzeit}</span>
            </div>
          )}

          {contract.expiryDate && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Ablaufdatum</span>
              <span className={styles.detailValue}>{contract.expiryDate}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={`${styles.statusBadge} ${styles[getStatusClass(contract.status)]}`}>
              {contract.status || "Unbekannt"}
            </span>
          </div>

          {/* 🛎️ Erinnerung aktivieren */}
          <div className={styles.detailRow}>
            <ReminderToggle
              contractId={contract._id}
              initialValue={contract.reminder || false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

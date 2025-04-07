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

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
        <h3>📃 Vertragsdetails</h3>

        <div className={styles.detailRow}>
          <strong>Name:</strong> {contract.name || "Unbekannt"}
        </div>
        <div className={styles.detailRow}>
          <strong>Kündigungsfrist:</strong> {contract.kuendigung || "Unbekannt"}
        </div>
        {contract.laufzeit && (
          <div className={styles.detailRow}>
            <strong>Laufzeit:</strong> {contract.laufzeit}
          </div>
        )}
        {contract.expiryDate && (
          <div className={styles.detailRow}>
            <strong>Ablaufdatum:</strong> {contract.expiryDate}
          </div>
        )}
        <div className={styles.detailRow}>
          <strong>Status:</strong> {contract.status || "Unbekannt"}
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
  );
}

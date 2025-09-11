// src/components/ReminderToggle.tsx
import { useState } from "react";
import { toggleContractReminder } from "../utils/api";
import styles from "../styles/ReminderToggle.module.css";

export interface ReminderToggleProps {
  contractId: string;
  initialValue: boolean;
  onToggle?: (newValue: boolean) => void; // ✅ NEU: Parent-Update-Callback
}

export default function ReminderToggle({ contractId, initialValue, onToggle }: ReminderToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await toggleContractReminder(contractId, !enabled);
      const newValue = !enabled;
      setEnabled(newValue);
      
      // ✅ VERBESSERUNG: Parent über Änderung informieren
      if (onToggle) {
        onToggle(newValue);
      }
    } catch (err) {
      console.error("Fehler beim Umschalten der Erinnerung:", err);
      alert("❌ Konnte Erinnerung nicht aktualisieren.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.toggleBox}>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading}
          onChange={handleToggle}
        />
        🔔 Erinnerung aktivieren
      </label>
    </div>
  );
}

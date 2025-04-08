// src/components/ReminderToggle.tsx
import { useState } from "react";
import axios from "axios";
import styles from "../styles/ReminderToggle.module.css";

export interface ReminderToggleProps {
  contractId: string;
  initialValue: boolean;
}

export default function ReminderToggle({ contractId, initialValue }: ReminderToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.put(
        `http://https://contract-ai-backend.onrender.com/contracts/${contractId}/reminder`,
        { reminder: !enabled },
        {
          headers: { Authorization: token },
        }
      );
      if (res.status === 200) {
        setEnabled(!enabled);
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

// src/components/ContractReminderToggle.tsx
import { useState } from "react";

interface Props {
  contractId: string;
  initiallyActive: boolean;
  onToggle?: (newState: boolean) => void;
}

export default function ContractReminderToggle({ contractId, initiallyActive, onToggle }: Props) {
  const [active, setActive] = useState(initiallyActive);
  const [loading, setLoading] = useState(false);

  const toggleReminder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://contract-ai-backend.onrender.com/contracts/${contractId}/reminder`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten des Reminders");
      const newState = !active;
      setActive(newState);
      onToggle?.(newState);
    } catch (err) {
      alert("❌ Fehler beim Umschalten des Reminders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleReminder}
      disabled={loading}
      title={active ? "Erinnerung deaktivieren" : "Erinnerung aktivieren"}
      style={{
        backgroundColor: active ? "#ffc107" : "#eee",
        border: "none",
        borderRadius: 4,
        padding: "0.4rem 0.6rem",
        cursor: "pointer",
      }}
    >
      {loading ? "⏳" : active ? "🔕" : "🔔"}
    </button>
  );
}

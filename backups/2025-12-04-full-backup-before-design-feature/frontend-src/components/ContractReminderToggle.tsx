// TODO: Diese Komponente scheint unbenutzt zu sein (keine Imports gefunden)
// Alternative zu ReminderToggle.tsx mit button-style statt checkbox-style
// Erwäge Entfernung oder Integration in ReminderToggle.tsx
import { useState } from "react";

interface Props {
  contractId: string;
  initiallyActive: boolean;
  onToggle?: (newState: boolean) => void;
}

export default function ContractReminderToggle({
  contractId,
  initiallyActive,
  onToggle,
}: Props) {
  const [active, setActive] = useState(initiallyActive);
  const [loading, setLoading] = useState(false);

  const toggleReminder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/reminder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reminder: !active }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten des Reminders");

      const newState = !active;
      setActive(newState);
      onToggle?.(newState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      console.error("❌ Fehler beim Reminder-Toggle:", message);
      alert("❌ Fehler beim Umschalten der Erinnerung");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleReminder}
      disabled={loading}
      title={active ? "🔕 Erinnerung deaktivieren" : "🔔 Erinnerung aktivieren"}
      style={{
        backgroundColor: active ? "#ffc107" : "#eee",
        border: "none",
        borderRadius: 4,
        padding: "0.4rem 0.6rem",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s ease",
      }}
    >
      {loading ? "⏳" : active ? "🔕" : "🔔"}
    </button>
  );
}

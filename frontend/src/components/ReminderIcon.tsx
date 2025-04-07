// src/components/ReminderIcon.tsx
import { useState } from "react";
import styles from "../styles/ReminderIcon.module.css";

interface ReminderIconProps {
  contractId: string;
  isActive: boolean;
  onToggle: (contractId: string, value: boolean) => void;
}

export default function ReminderIcon({ contractId, isActive, onToggle }: ReminderIconProps) {
  const [active, setActive] = useState(isActive);

  const handleClick = () => {
    const newValue = !active;
    setActive(newValue);
    onToggle(contractId, newValue);
  };

  return (
    <span className={styles.icon} onClick={handleClick} title="Erinnerung aktivieren/deaktivieren">
      {active ? "🔔" : "🔕"}
    </span>
  );
}

// src/components/ContractNotification.tsx
import styles from "./ContractNotification.module.css";

interface Contract {
  _id: string;
  name: string;
  expiryDate?: string;
  status?: string;
}

interface Props {
  contracts: Contract[];
}

export default function ContractNotification({ contracts }: Props) {
  const today = new Date();
  const soonThreshold = 30; // Tage

  const soonExpiring = contracts.filter((contract) => {
    if (!contract.expiryDate) return false;
    const expiry = new Date(contract.expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= soonThreshold;
  });

  if (soonExpiring.length === 0) return null;

  return (
    <div className={styles.notification}>
      <h3>⚠️ Erinnerung: Bald ablaufende Verträge</h3>
      <ul>
        {soonExpiring.map((c) => (
          <li key={c._id}>
            <strong>{c.name}</strong> läuft bald ab (am {c.expiryDate})
          </li>
        ))}
      </ul>
    </div>
  );
}

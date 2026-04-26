import { Shield, Lock, MapPin, Check } from "lucide-react";
import styles from "./TrustBadgeRow.module.css";

export default function TrustBadgeRow() {
  return (
    <div className={styles.trustBadgeRow} role="list" aria-label="Sicherheits- und Vertrauenshinweise">
      <div className={styles.item} role="listitem">
        <Shield size={14} className={styles.icon} aria-hidden="true" />
        <span>DSGVO</span>
      </div>
      <div className={styles.item} role="listitem">
        <Lock size={14} className={styles.icon} aria-hidden="true" />
        <span>SSL</span>
      </div>
      <div className={styles.item} role="listitem">
        <MapPin size={14} className={styles.icon} aria-hidden="true" />
        <span>Server DE</span>
      </div>
      <div className={styles.item} role="listitem">
        <Check size={14} className={styles.icon} aria-hidden="true" />
        <span>14-Tage Garantie</span>
      </div>
    </div>
  );
}

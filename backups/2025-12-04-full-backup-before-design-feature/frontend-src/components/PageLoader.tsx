// src/components/PageLoader.tsx
import styles from "./PageLoader.module.css";

export default function PageLoader() {
  return (
    <div className={styles.loaderOverlay}>
      <div className={styles.spinner}></div>
    </div>
  );
}

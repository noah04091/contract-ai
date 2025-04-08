// 📁 src/components/Footer.tsx
import { Link } from "react-router-dom";
import styles from "../styles/Footer.module.css"; // Achte darauf, dass diese Datei existiert

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Link to="/impressum">Impressum</Link>
      <span>•</span>
      <Link to="/datenschutz">Datenschutz</Link>
      <span>•</span>
      <Link to="/agb">AGB</Link>
    </footer>
  );
}

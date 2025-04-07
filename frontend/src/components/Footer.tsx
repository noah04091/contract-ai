// 📁 src/components/Footer.tsx
import { Link } from "react-router-dom";
import styles from "../styles/Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>
        © {new Date().getFullYear()} Contract AI &nbsp;|&nbsp;
        <Link to="/impressum">Impressum</Link> &nbsp;|&nbsp;
        <Link to="/datenschutz">Datenschutz</Link> &nbsp;|&nbsp;
        <Link to="/agb">AGB</Link>
      </p>
    </footer>
  );
}

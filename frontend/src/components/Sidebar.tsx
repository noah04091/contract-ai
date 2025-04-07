// 📁 src/components/Sidebar.tsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "../styles/Sidebar.module.css";
import logo from "../assets/logo.png";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    alert("🚪 Erfolgreich ausgeloggt!");
    navigate("/login");
  };

  const createLink = (path: string, label: string, emoji: string) => (
    <li className={location.pathname === path ? styles.active : ""} key={path}>
      <Link to={path} className={styles.sidebarLink}>
        <span className={styles.icon}>{emoji}</span>
        <span className={styles.label}>{label}</span>
      </Link>
    </li>
  );

  return (
    <>
      <div
        className={styles.toggleHoverZone}
        onMouseEnter={() => setIsOpen(true)}
      >
        <button className={styles.toggleButton}>☰</button>
      </div>

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className={styles.logoBox}>
          <img src={logo} alt="Logo" className={styles.logo} />
        </div>

        <ul className={styles.linkGroup}>
          {createLink("/", "Home", "🏠")}
          {createLink("/dashboard", "Dashboard", "📊")}
          {createLink("/contracts", "Verträge", "📄")}
          {createLink("/calendar", "Kalender", "🗓️")}
          {createLink("/optimizer", "Optimierer", "🧠")}
          {createLink("/compare", "Vergleich", "🔍")}
          {createLink("/better-contracts", "Bessere Anbieter", "💡")} {/* ✅ NEU */}
          {createLink("/generate", "Generator", "⚙️")}
          {createLink("/chat", "Vertrags-Chat", "💬")}
        </ul>

        <hr className={styles.divider} />

        <ul className={styles.linkGroup}>
          {isAuthenticated ? (
            <>
              {createLink("/me", "Profil", "👤")}
              <li>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  🚪 Logout
                </button>
              </li>
            </>
          ) : (
            <>
              {createLink("/login", "Login", "🔐")}
              {createLink("/register", "Registrieren", "📝")}
            </>
          )}
        </ul>
      </aside>
    </>
  );
}

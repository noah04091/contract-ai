import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/Navbar.module.css";
import Notification from "./Notification";
import ThemeToggle from "./ThemeToggle";
import logo from "../assets/logo.png";
import { clearAuthData } from "../utils/api";

interface UserData {
  email: string;
  subscriptionActive: boolean;
}

export default function Navbar() {
  const [user, setUser] = useState<UserData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Cookie-basierter Auth-Check über Proxy
    fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Fehler beim Laden des Benutzerprofils");
        return res.json();
      })
      .then((data) => setUser({ email: data.email, subscriptionActive: data.subscriptionActive }))
      .catch((err) => {
        console.warn("❌ Auth fehlgeschlagen:", err);
        clearAuthData();
        setUser(null);
      });
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout-Fehler:", err);
    }

    clearAuthData();
    setUser(null);
    setNotification({ message: "✅ Erfolgreich ausgeloggt", type: "success" });
    setTimeout(() => navigate("/login"), 1000);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.logoWrapper}>
          <button
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            ☰
          </button>
          <Link to="/">
            <img src={logo} alt="Logo" className={styles.logoImage} />
          </Link>
        </div>

        <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.showMenu : ""}`}>
          <Link to="/contracts" className={styles.navLink}>📁 Verträge</Link>
          <Link to="/optimizer" className={styles.navLink}>🧠 Optimierer</Link>
          <Link to="/compare" className={styles.navLink}>📊 Vergleich</Link>
          <Link to="/chat" className={styles.navLink}>💬 KI-Chat</Link>

          {user && !user.subscriptionActive && (
            <Link to="/pricing" className={styles.navLink}>💰 Preise</Link>
          )}
        </div>

        <div className={styles.navRight}>
          <ThemeToggle />

          {user && (
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={styles.profileButton}
              >
                👤 {user.subscriptionActive && <span className={styles.badge}>Premium</span>} Account ▾
              </button>
              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <span className={styles.dropdownItem}>✅ {user.email}</span>
                  <Link to="/me" className={styles.dropdownItem}>👤 Profil</Link>
                  <button onClick={handleLogout} className={styles.dropdownItem}>🚪 Logout</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </nav>
  );
}

import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import styles from "../styles/Navbar.module.css";
import Notification from "./Notification";
import ThemeToggle from "./ThemeToggle";
import logo from "../assets/logo.png";

interface DecodedToken {
  exp: number;
  email: string;
  iat: number;
}

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
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login");
      } else {
        fetch("https://contract-ai-backend.onrender.com/auth/me", {
          headers: { Authorization: token },
        })
          .then((res) => res.json())
          .then((data) =>
            setUser({ email: data.email, subscriptionActive: data.subscriptionActive })
          )
          .catch(() => {
            setUser(null);
            localStorage.removeItem("token");
          });
      }
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
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

  const handleLogout = () => {
    localStorage.removeItem("token");
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

          {/* Nur für nicht-Premium-Nutzer sichtbar */}
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

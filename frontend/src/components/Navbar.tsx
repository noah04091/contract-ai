import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/Navbar.module.css";
import Notification from "./Notification";
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
  const [isScrolled, setIsScrolled] = useState(false);
  
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 🔐 Benutzerstatus laden
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error("Nicht eingeloggt");
        const data = await res.json();
        setUser({ email: data.email, subscriptionActive: data.subscriptionActive });
      } catch (err) {
        console.warn("❌ Auth fehlgeschlagen:", err);
        clearAuthData();
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  // 🧠 Klick außerhalb des Dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll handler to add glassmorphism effect when scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🚪 Logout-Handler
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

  // Render HomePage Navbar
  const renderHomePageNavbar = () => {
    return (
      <>
        <div className={styles.leftSection}>
          <Link to="/" className={styles.logoLink}>
            <motion.img 
              src={logo} 
              alt="Contract AI Logo" 
              className={styles.logoImage}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          </Link>
        </div>

        <div className={styles.navLinks}>
          <motion.div className={styles.navLinksInner}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/" className={`${styles.navLink} ${location.pathname === "/" ? styles.activeNavLink : ""}`}>
                <span className={styles.navLinkIcon}>🏠</span>
                <span className={styles.navLinkText}>Dashboard</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/contracts" className={`${styles.navLink} ${location.pathname === "/contracts" ? styles.activeNavLink : ""}`}>
                <span className={styles.navLinkIcon}>📁</span>
                <span className={styles.navLinkText}>Verträge</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/optimizer" className={`${styles.navLink} ${location.pathname === "/optimizer" ? styles.activeNavLink : ""}`}>
                <span className={styles.navLinkIcon}>🧠</span>
                <span className={styles.navLinkText}>Optimierer</span>
              </Link>
            </motion.div>
            {user && !user.subscriptionActive && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/pricing" className={`${styles.navLink} ${location.pathname === "/pricing" ? styles.activeNavLink : ""}`}>
                  <span className={styles.navLinkIcon}>💰</span>
                  <span className={styles.navLinkText}>Preise</span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className={styles.navRight}>
          {user ? (
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={styles.profileButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={styles.profileIcon}>👤</span>
                {user.subscriptionActive && <span className={styles.badge}>Premium</span>} 
                <span>Account</span>
                <motion.span
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={styles.dropdownArrow}
                >
                  ▾
                </motion.span>
              </motion.button>
              
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div 
                    className={styles.dropdownMenu}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className={styles.dropdownItem}>✅ {user.email}</span>
                    <Link to="/me" className={styles.dropdownItem}>👤 Profil</Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>🚪 Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/login" className={styles.loginButton}>
                  <span>Anmelden</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className={styles.registerButton}>
                  <span>Registrieren</span>
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render Inner Pages Navbar
  const renderInnerPagesNavbar = () => {
    return (
      <>
        <div className={styles.leftSection}>
          <motion.button
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Menü öffnen"
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </motion.button>
        </div>

        <Link to="/" className={styles.logoCenterWrapper}>
          <motion.img 
            src={logo} 
            alt="Contract AI Logo" 
            className={styles.logoCenterImage}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          />
        </Link>

        <div className={styles.navRight}>
          {user ? (
            <motion.button
              onClick={handleLogout}
              className={styles.logoutButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={styles.logoutIcon}>🚪</span>
              <span>Logout</span>
            </motion.button>
          ) : (
            <div className={styles.authButtons}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/login" className={styles.loginButton}>
                  <span>Anmelden</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className={styles.registerButton}>
                  <span>Registrieren</span>
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <motion.nav 
      className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ""} ${!isHomePage ? styles.innerPageNavbar : ""}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }}
    >
      <div className={styles.navbarContent}>
        {isHomePage ? renderHomePageNavbar() : renderInnerPagesNavbar()}
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className={`${styles.mobileMenu}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className={styles.mobileMenuLinks}>
              <Link to="/" className={styles.mobileNavLink}>
                <span className={styles.mobileNavIcon}>🏠</span>
                <span>Dashboard</span>
              </Link>
              <Link to="/contracts" className={styles.mobileNavLink}>
                <span className={styles.mobileNavIcon}>📁</span>
                <span>Verträge</span>
              </Link>
              <Link to="/optimizer" className={styles.mobileNavLink}>
                <span className={styles.mobileNavIcon}>🧠</span>
                <span>Optimierer</span>
              </Link>
              {user && !user.subscriptionActive && (
                <Link to="/pricing" className={styles.mobileNavLink}>
                  <span className={styles.mobileNavIcon}>💰</span>
                  <span>Preise</span>
                </Link>
              )}
              {user && (
                <>
                  <div className={styles.userInfo}>
                    <span>✅ {user.email}</span>
                    {user.subscriptionActive && (
                      <span className={styles.premiumBadge}>Premium</span>
                    )}
                  </div>
                  <Link to="/me" className={styles.mobileNavLink}>
                    <span className={styles.mobileNavIcon}>👤</span>
                    <span>Profil</span>
                  </Link>
                  <button onClick={handleLogout} className={styles.mobileNavLink}>
                    <span className={styles.mobileNavIcon}>🚪</span>
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
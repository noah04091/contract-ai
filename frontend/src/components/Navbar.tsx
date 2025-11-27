import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/Navbar.module.css";
import Notification from "./Notification";
import logo from "../assets/logo.png";
import { clearAuthData } from "../utils/api";
import { useAuth } from "../hooks/useAuth";;

// ✅ HINZUGEFÜGT: Minimal Interface für TypeScript Fix
interface User {
  email?: string;
  subscriptionActive?: boolean;
  subscriptionPlan?: string;
}

// Feature-Daten für das Mega-Menü
const featureCategories = [
  {
    title: "Analyse & Optimierung",
    features: [
      { name: "KI-Vertragsanalyse", description: "Automatische Analyse mit GPT-4", icon: "🔍", path: "/features/vertragsanalyse" },
      { name: "Vertragsoptimierung", description: "KI-gestützte Verbesserungsvorschläge", icon: "✨", path: "/features/optimierung" },
      { name: "Legal Pulse", description: "Rechtliche Risikoanalyse", icon: "⚖️", path: "/features/legalpulse" },
      { name: "Vertragsvergleich", description: "Zwei Verträge vergleichen", icon: "📊", path: "/features/vergleich" },
    ]
  },
  {
    title: "Verwaltung & Organisation",
    features: [
      { name: "Vertragsverwaltung", description: "Alle Verträge an einem Ort", icon: "📁", path: "/features/vertragsverwaltung" },
      { name: "Fristenkalender", description: "Keine Frist mehr verpassen", icon: "📅", path: "/features/fristen" },
      { name: "E-Mail Upload", description: "Verträge per E-Mail hochladen", icon: "📧", path: "/features/email-upload" },
    ]
  },
  {
    title: "Erstellung & Signatur",
    features: [
      { name: "Vertragsgenerator", description: "Verträge mit KI erstellen", icon: "📝", path: "/features/generator" },
      { name: "Digitale Signatur", description: "Rechtsgültig digital unterschreiben", icon: "✍️", path: "/features/digitalesignatur" },
    ]
  }
];

export default function Navbar() {
  const { user, setUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  
  // Definiere geschützte Seiten
  const protectedRoutes = ["/dashboard", "/contracts", "/optimizer", "/premium", "/me", "/calendar", "/compare", "/better-contracts", "/Generate", "/chat", "/envelopes", "/generate", "/legal-pulse"];
  const isProtectedPage = protectedRoutes.includes(location.pathname);
  
  // Definiere nicht-geschützte Seiten (außer Homepage und Auth-Seiten)
  const publicRoutes = ["/about", "/blog", "/pricing", "/help", "/datenschutz", "/agb", "/impressum"];
  const isPublicPage = publicRoutes.includes(location.pathname);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ✅ GEÄNDERT: TypeScript Fix - user: any wurde zu user: User | null
  const renderSubscriptionBadge = (user: User | null, isMobile: boolean = false) => {
    if (!user?.subscriptionActive) return null;
    
    const badgeClass = isMobile ? styles.badgeMobile : styles.badge;
    
    if (user.subscriptionPlan === "business") {
      return <span className={badgeClass}>🏢 Business</span>;
    } else if (user.subscriptionPlan === "premium") {
      return <span className={badgeClass}>💎 Premium</span>;
    }
    
    return null; // Fallback für unbekannte Pläne
  };

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auth-Status wird jetzt über useAuth() verwaltet

  // 🧠 Klick außerhalb des Dropdowns/Mobilmenüs/Sidebar/MegaMenu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }

      // Schließe das Mega-Menü bei Klick außerhalb
      if (megaMenuOpen && megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }

      // Schließe das mobile Menü bei Klick außerhalb, aber nicht beim Hamburger-Button
      if (
        !isHomePage &&
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest(`.${styles.hamburger}`)
      ) {
        setMobileMenuOpen(false);
      }

      // Schließe die Sidebar beim Klick auf den Hintergrund
      if (sidebarOpen) {
        const target = e.target as Element;
        if (target.classList.contains(styles.sidebarBackdrop)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen, isHomePage, sidebarOpen, megaMenuOpen]);

  // Scroll-Handler für Glasmorphismus-Effekt
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Initiale Überprüfung beim Laden
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ESC-Taste zum Schließen der Menüs
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
        setSidebarOpen(false);
        setMegaMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, []);

  // Mega-Menu Hover Handler mit Delay
  const handleMegaMenuEnter = () => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    setMegaMenuOpen(true);
  };

  const handleMegaMenuLeave = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 150);
  };

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

  // Toggle Sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Render HomePage Navbar
  const renderHomePageNavbar = () => {
    // Wenn eingeloggt: Zeige App-Navigation
    if (user) {
      return (
        <>
          {/* Left Section - Logo */}
          <div className={styles.leftSection}>
            {!isMobile && (
              <Link to="/" className={styles.logoLink}>
                <motion.img
                  src={logo}
                  alt="Contract AI Logo"
                  className={styles.logoImage}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                />
              </Link>
            )}
          </div>

          {/* Center Section - App Navigation für eingeloggte User */}
          <div className={styles.centerSection}>
            {isMobile && (
              <Link to="/" className={styles.logoLink}>
                <motion.img
                  src={logo}
                  alt="Contract AI Logo"
                  className={styles.logoImage}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                />
              </Link>
            )}

            {!isMobile && (
              <div className={styles.navLinks}>
                <motion.div className={styles.navLinksInner}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/dashboard" className={`${styles.navLink} ${location.pathname === "/dashboard" ? styles.activeNavLink : ""}`}>
                      <span className={styles.navLinkIcon}>📊</span>
                      <span className={styles.navLinkText}>Dashboard</span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/contracts" className={`${styles.navLink} ${location.pathname === "/contracts" ? styles.activeNavLink : ""}`}>
                      <span className={styles.navLinkIcon}>📁</span>
                      <span className={styles.navLinkText}>Verträge</span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/calendar" className={`${styles.navLink} ${location.pathname === "/calendar" ? styles.activeNavLink : ""}`}>
                      <span className={styles.navLinkIcon}>📅</span>
                      <span className={styles.navLinkText}>Kalender</span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/legalpulse" className={`${styles.navLink} ${location.pathname === "/legalpulse" ? styles.activeNavLink : ""}`}>
                      <span className={styles.navLinkIcon}>⚖️</span>
                      <span className={styles.navLinkText}>Legal Pulse</span>
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Right Section - User Menu */}
          <div className={styles.rightSection}>
            {isMobile ? (
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <motion.button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={styles.profileButtonMobile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Account
                  {renderSubscriptionBadge(user, true)}
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
                      <span className={styles.dropdownItem}>{user.email}</span>
                      <Link to="/me" className={styles.dropdownItem}>Profil</Link>
                      <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <motion.button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={styles.profileButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {renderSubscriptionBadge(user)}
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
                      <span className={styles.dropdownItem}>{user.email}</span>
                      <Link to="/me" className={styles.dropdownItem}>Profil</Link>
                      <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      );
    }

    // Nicht eingeloggt: Zeige Marketing-Navigation mit Mega-Menü
    return (
      <>
        {/* Left Section - Logo (Desktop) oder Hamburger (Mobile) */}
        <div className={styles.leftSection}>
          {isMobile ? (
            <motion.button
              className={styles.mobileHamburger}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              whileTap={{ scale: 0.95 }}
              aria-label="Menü öffnen"
            >
              <motion.div
                animate={mobileNavOpen ? "open" : "closed"}
                className={styles.hamburgerIcon}
              >
                <span className={`${styles.hamburgerLine} ${mobileNavOpen ? styles.hamburgerLineOpen1 : ''}`}></span>
                <span className={`${styles.hamburgerLine} ${mobileNavOpen ? styles.hamburgerLineOpen2 : ''}`}></span>
                <span className={`${styles.hamburgerLine} ${mobileNavOpen ? styles.hamburgerLineOpen3 : ''}`}></span>
              </motion.div>
            </motion.button>
          ) : (
            <Link to="/" className={styles.logoLink}>
              <motion.img
                src={logo}
                alt="Contract AI Logo"
                className={styles.logoImage}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              />
            </Link>
          )}
        </div>

        {/* Center Section - Logo (Mobile) oder Marketing Navigation (Desktop) */}
        <div className={styles.centerSection}>
          {isMobile && (
            <Link to="/" className={styles.logoLink}>
              <motion.img
                src={logo}
                alt="Contract AI Logo"
                className={styles.logoImageMobile}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              />
            </Link>
          )}

          {!isMobile && (
            <div className={styles.navLinks}>
              <motion.div className={styles.navLinksInner}>
                {/* Funktionen mit Mega-Menü */}
                <div
                  className={styles.megaMenuWrapper}
                  ref={megaMenuRef}
                  onMouseEnter={handleMegaMenuEnter}
                  onMouseLeave={handleMegaMenuLeave}
                >
                  <motion.button
                    className={`${styles.navLink} ${styles.megaMenuTrigger} ${megaMenuOpen ? styles.activeNavLink : ""}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                  >
                    <span className={styles.navLinkText}>Funktionen</span>
                    <motion.span
                      className={styles.megaMenuArrow}
                      animate={{ rotate: megaMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {megaMenuOpen && (
                      <motion.div
                        className={styles.megaMenu}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <div className={styles.megaMenuContent}>
                          {featureCategories.map((category, catIndex) => (
                            <div key={catIndex} className={styles.megaMenuCategory}>
                              <h3 className={styles.megaMenuCategoryTitle}>{category.title}</h3>
                              <div className={styles.megaMenuFeatures}>
                                {category.features.map((feature, featIndex) => (
                                  <Link
                                    key={featIndex}
                                    to={feature.path}
                                    className={styles.megaMenuFeature}
                                    onClick={() => setMegaMenuOpen(false)}
                                  >
                                    <span className={styles.megaMenuFeatureIcon}>{feature.icon}</span>
                                    <div className={styles.megaMenuFeatureText}>
                                      <span className={styles.megaMenuFeatureName}>{feature.name}</span>
                                      <span className={styles.megaMenuFeatureDesc}>{feature.description}</span>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className={styles.megaMenuFooter}>
                          <Link to="/pricing" className={styles.megaMenuFooterLink} onClick={() => setMegaMenuOpen(false)}>
                            <span>Alle Preise ansehen</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Preise */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/pricing" className={`${styles.navLink} ${location.pathname === "/pricing" ? styles.activeNavLink : ""}`}>
                    <span className={styles.navLinkText}>Preise</span>
                  </Link>
                </motion.div>

                {/* Über uns */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/about" className={`${styles.navLink} ${location.pathname === "/about" ? styles.activeNavLink : ""}`}>
                    <span className={styles.navLinkText}>Über uns</span>
                  </Link>
                </motion.div>

                {/* Blog */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/blog" className={`${styles.navLink} ${location.pathname === "/blog" ? styles.activeNavLink : ""}`}>
                    <span className={styles.navLinkText}>Blog</span>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Right Section - Auth Buttons */}
        <div className={styles.rightSection}>
          {isMobile ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/register" className={styles.registerButtonMobile}>
                Starten
              </Link>
            </motion.div>
          ) : (
            <div className={styles.authButtons}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/login" className={styles.loginButton}>
                  <span>Anmelden</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/register" className={styles.registerButton}>
                  <span>Kostenlos starten</span>
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render Auth Pages Navbar - HYBRIDE LÖSUNG: Hamburger + Zentrierung
  const renderAuthPagesNavbar = () => {
    return (
      <>
        {/* Left Section - Hamburger Button */}
        <div className={styles.leftSection}>
          {/* Desktop: Immer Hamburger, Mobile: Nur wenn eingeloggt */}
          {(!isMobile || user) && (
            <motion.button
              className={styles.hamburger}
              onClick={toggleSidebar}
              aria-label="Menü öffnen"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              animate={{ rotate: sidebarOpen ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {sidebarOpen ? "✕" : "☰"}
            </motion.button>
          )}
        </div>

        {/* Center Section - Logo always centered */}
        <div className={styles.centerSection}>
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

        {/* Right Section - Auth Buttons */}
        <div className={styles.rightSection}>
          {/* Desktop: Auth Buttons wenn nicht eingeloggt */}
          {!isMobile && !user && (
            <div className={styles.authButtons}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/login" className={styles.loginButton}>
                  <span>Anmelden</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/register" className={styles.registerButton}>
                  <span>Registrieren</span>
                </Link>
              </motion.div>
            </div>
          )}

          {/* Desktop: User Dropdown wenn eingeloggt */}
          {!isMobile && user && (
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={styles.profileButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {renderSubscriptionBadge(user)} {/* ✅ KORRIGIERT */}
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
                    <span className={styles.dropdownItem}>{user.email}</span>
                    <Link to="/me" className={styles.dropdownItem}>Profil</Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render Protected Pages Navbar
  const renderProtectedPagesNavbar = () => {
    return (
      <>
        {/* Left Section - Hamburger wenn eingeloggt */}
        <div className={styles.leftSection}>
          {user && (
            <motion.button
              className={styles.hamburger}
              onClick={toggleSidebar}
              aria-label="Menü öffnen"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              animate={{ rotate: sidebarOpen ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {sidebarOpen ? "✕" : "☰"}
            </motion.button>
          )}
        </div>

        {/* Center Section - Logo always centered */}
        <div className={styles.centerSection}>
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

        {/* Right Section */}
        <div className={styles.rightSection}>
          {/* Desktop: User Dropdown wenn eingeloggt */}
          {!isMobile && user && (
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={styles.profileButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {renderSubscriptionBadge(user)} {/* ✅ KORRIGIERT */}
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
                    <span className={styles.dropdownItem}>{user.email}</span>
                    <Link to="/me" className={styles.dropdownItem}>Profil</Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mobile: User Dropdown wenn eingeloggt */}
          {isMobile && user && (
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={styles.profileButtonMobile}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Account
                {renderSubscriptionBadge(user, true)} {/* ✅ KORRIGIERT */}
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
                    <span className={styles.dropdownItem}>{user.email}</span>
                    <Link to="/me" className={styles.dropdownItem}>Profil</Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render Public Pages Navbar (für nicht-eingeloggte: Marketing-Navbar, für eingeloggte: Hamburger)
  const renderPublicPagesNavbar = () => {
    // Nicht eingeloggt: Zeige die gleiche Marketing-Navbar wie auf der Homepage
    if (!user) {
      return renderHomePageNavbar();
    }

    // Eingeloggt: Zeige Hamburger-Navbar
    return (
      <>
        {/* Left Section */}
        <div className={styles.leftSection}>
          {/* Hamburger - auf Desktop UND Mobile */}
          <motion.button
            className={styles.hamburger}
            onClick={toggleSidebar}
            aria-label="Menü öffnen"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            animate={{ rotate: sidebarOpen ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {sidebarOpen ? "✕" : "☰"}
          </motion.button>
        </div>

        {/* Center Section - Logo always centered */}
        <div className={styles.centerSection}>
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

        {/* Right Section */}
        <div className={styles.rightSection}>
          {/* Desktop: Auth Buttons oder User Dropdown */}
          {!isMobile && !user && (
            <div className={styles.authButtons}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/login" className={styles.loginButton}>
                  <span>Anmelden</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/register" className={styles.registerButton}>
                  <span>Registrieren</span>
                </Link>
              </motion.div>
            </div>
          )}

          {!isMobile && user && (
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={styles.profileButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {renderSubscriptionBadge(user)} {/* ✅ KORRIGIERT */}
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
                    <span className={styles.dropdownItem}>{user.email}</span>
                    <Link to="/me" className={styles.dropdownItem}>Profil</Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <motion.nav 
        className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ""} ${!isHomePage ? styles.innerPageNavbar : ""} ${isAuthPage ? styles.authPageNavbar : ""} ${isMobile && isPublicPage ? styles.mobileLogoOnly : ""}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.19, 1.0, 0.22, 1.0] }}
      >
        <div className={styles.navbarContent}>
          {isHomePage 
            ? renderHomePageNavbar() 
            : isAuthPage
              ? renderAuthPagesNavbar()
              : isProtectedPage
                ? renderProtectedPagesNavbar()
                : renderPublicPagesNavbar()}
        </div>

        <AnimatePresence>
          {!isHomePage && mobileMenuOpen && (
            <motion.div 
              ref={mobileMenuRef}
              className={styles.mobileMenu}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className={styles.mobileMenuInner}>
                <div className={styles.mobileMenuLinks}>
                  <Link to={user ? "/dashboard" : "/"} className={`${styles.mobileNavLink} ${location.pathname === "/dashboard" ? styles.activeMobileNavLink : ""}`}>
                    <span className={styles.mobileNavIcon}>📊</span>
                    <span>Dashboard</span>
                  </Link>
                  <Link to={user ? "/contracts" : "/features/vertragsverwaltung"} className={`${styles.mobileNavLink} ${location.pathname === "/contracts" ? styles.activeMobileNavLink : ""}`}>
                    <span className={styles.mobileNavIcon}>📁</span>
                    <span>Verträge</span>
                  </Link>
                  <Link to={user ? "/calendar" : "/features/fristen"} className={`${styles.mobileNavLink} ${location.pathname === "/calendar" ? styles.activeMobileNavLink : ""}`}>
                    <span className={styles.mobileNavIcon}>📅</span>
                    <span>Kalender</span>
                  </Link>
                  {!user ? (
                    <Link to="/pricing" className={`${styles.mobileNavLink} ${location.pathname === "/pricing" ? styles.activeMobileNavLink : ""}`}>
                      <span className={styles.mobileNavIcon}>💰</span>
                      <span>Preise</span>
                    </Link>
                  ) : (
                    <Link to="/legalpulse" className={`${styles.mobileNavLink} ${location.pathname === "/legalpulse" ? styles.activeMobileNavLink : ""}`}>
                      <span className={styles.mobileNavIcon}>⚖️</span>
                      <span>Legal Pulse</span>
                    </Link>
                  )}
                  {user && (
                    <>
                      <div className={styles.userInfo}>
                        <span className={styles.userEmail}>{user.email}</span>
                        {/* ✅ KORRIGIERT: Mobile Menu Badge */}
                        {user.subscriptionActive && (
                          <span className={styles.premiumBadge}>
                            {user.subscriptionPlan === "business" ? "🏢 Business" : "💎 Premium"}
                          </span>
                        )}
                      </div>
                      <Link to="/me" className={`${styles.mobileNavLink} ${location.pathname === "/me" ? styles.activeMobileNavLink : ""}`}>
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
                <motion.button
                  className={styles.closeMobileMenu}
                  onClick={() => setMobileMenuOpen(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Schließen
                </motion.button>
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

      {/* Mobile Navigation Slide-In Panel (für nicht-eingeloggte User) */}
      <AnimatePresence>
        {mobileNavOpen && !user && (
          <>
            {/* Backdrop */}
            <motion.div
              className={styles.mobileNavBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setMobileNavOpen(false);
                setMobileFeaturesOpen(false);
              }}
            />

            {/* Slide-In Panel */}
            <motion.div
              className={styles.mobileNavPanel}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Panel Header */}
              <div className={styles.mobileNavHeader}>
                <span className={styles.mobileNavTitle}>Menü</span>
                <motion.button
                  className={styles.mobileNavClose}
                  onClick={() => {
                    setMobileNavOpen(false);
                    setMobileFeaturesOpen(false);
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.button>
              </div>

              {/* Navigation Links */}
              <div className={styles.mobileNavLinks}>
                {/* Funktionen mit Aufklapp-Menü */}
                <div className={styles.mobileNavSection}>
                  <motion.button
                    className={styles.mobileNavLinkWithArrow}
                    onClick={() => setMobileFeaturesOpen(!mobileFeaturesOpen)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className={styles.mobileNavLinkIcon}>✨</span>
                    <span className={styles.mobileNavLinkText}>Funktionen</span>
                    <motion.span
                      className={styles.mobileNavArrow}
                      animate={{ rotate: mobileFeaturesOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.span>
                  </motion.button>

                  {/* Features Submenu */}
                  <AnimatePresence>
                    {mobileFeaturesOpen && (
                      <motion.div
                        className={styles.mobileNavSubmenu}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {featureCategories.map((category, catIndex) => (
                          <div key={catIndex} className={styles.mobileNavCategory}>
                            <span className={styles.mobileNavCategoryTitle}>{category.title}</span>
                            {category.features.map((feature, featIndex) => (
                              <Link
                                key={featIndex}
                                to={feature.path}
                                className={styles.mobileNavFeature}
                                onClick={() => {
                                  setMobileNavOpen(false);
                                  setMobileFeaturesOpen(false);
                                }}
                              >
                                <span className={styles.mobileNavFeatureIcon}>{feature.icon}</span>
                                <span className={styles.mobileNavFeatureName}>{feature.name}</span>
                              </Link>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Preise */}
                <Link
                  to="/pricing"
                  className={styles.mobileNavLinkItem}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkIcon}>💰</span>
                  <span className={styles.mobileNavLinkText}>Preise</span>
                </Link>

                {/* Über uns */}
                <Link
                  to="/about"
                  className={styles.mobileNavLinkItem}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkIcon}>👥</span>
                  <span className={styles.mobileNavLinkText}>Über uns</span>
                </Link>

                {/* Blog */}
                <Link
                  to="/blog"
                  className={styles.mobileNavLinkItem}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkIcon}>📝</span>
                  <span className={styles.mobileNavLinkText}>Blog</span>
                </Link>
              </div>

              {/* Auth Buttons am Ende */}
              <div className={styles.mobileNavAuth}>
                <Link
                  to="/login"
                  className={styles.mobileNavLoginBtn}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Anmelden
                </Link>
                <Link
                  to="/register"
                  className={styles.mobileNavRegisterBtn}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Kostenlos starten
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar Implementation - Enhanced Apple Design */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div 
              className={styles.sidebarBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar content */}
            <motion.div 
              className={styles.sidebar}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              <div className={styles.sidebarHeader}>
                <img src={logo} alt="Contract AI Logo" className={styles.sidebarLogo} />
                <motion.button 
                  className={styles.sidebarClose} 
                  onClick={() => setSidebarOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </motion.button>
              </div>
              
              <div className={styles.sidebarContent}>
                <div className={styles.sidebarSection}>
                  <h3 className={styles.sidebarTitle}>Navigation</h3>
                  <ul className={styles.sidebarNav}>
                    <li>
                      <Link to="/" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>🏠</span>
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link to="/dashboard" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>📊</span>
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/contracts" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>📄</span>
                        Verträge
                      </Link>
                    </li>
                    <li>
                      <Link to="/envelopes" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>✉️</span>
                        Signaturen
                      </Link>
                    </li>
                    <li>
                      <Link to="/calendar" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>🗓️</span>
                        Kalender
                      </Link>
                    </li>
                    <li>
                      <Link to="/optimizer" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>🧠</span>
                        Optimierer
                      </Link>
                    </li>
                    <li>
                      <Link to="/compare" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>🔍</span>
                        Vergleich
                      </Link>
                    </li>
                    <li>
                      <Link to="/better-contracts" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>💡</span>
                        Bessere Anbieter
                      </Link>
                    </li>
                    <li>
                      <Link to="/Generate" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>⚙️</span>
                        Generator
                      </Link>
                    </li>
                    <li>
                      <Link to="/chat" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>💬</span>
                        Vertrags-Chat
                      </Link>
                    </li>
                    <li>
                      <Link to="/legalpulse" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>⚖️</span>
                        Legal Pulse
                      </Link>
                    </li>
                    <li>
                      <Link to="/hilfe" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>❓</span>
                        Hilfe
                      </Link>
                    </li>
                    <li>
                      <Link to="/blog" className={styles.sidebarLink} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.sidebarIcon}>📰</span>
                        Blog
                      </Link>
                    </li>
                  </ul>
                </div>
                
                {!user ? (
                  <div className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>Account</h3>
                    <div className={styles.sidebarAuth}>
                      <Link to="/login" className={styles.sidebarAuthBtn} onClick={() => setSidebarOpen(false)}>
                        Login
                      </Link>
                      <Link to="/register" className={`${styles.sidebarAuthBtn} ${styles.primary}`} onClick={() => setSidebarOpen(false)}>
                        Registrieren
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>Account</h3>
                    <div className={styles.sidebarUser}>
                      <div className={styles.sidebarUserInfo}>
                        <div className={styles.sidebarUserAvatar}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <div className={styles.sidebarUserDetails}>
                          <span className={styles.sidebarUserEmail}>{user.email}</span>
                          <span className={styles.sidebarUserPlan}>
                            {user.subscriptionActive ? (
                              <span className={styles.premiumBadgeSidebar}>
                                {/* ✅ KORRIGIERT: Sidebar Badge */}
                                {user.subscriptionPlan === "business" ? "🏢 Business" : "💎 Premium"}
                              </span>
                            ) : (
                              <span className={styles.standardBadge}>Standard</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <Link to="/me" className={styles.sidebarUserProfile} onClick={() => setSidebarOpen(false)}>
                        Profil bearbeiten
                      </Link>
                      <Link to="/company-profile" className={styles.sidebarUserProfile} onClick={() => setSidebarOpen(false)}>
                        🏢 Firmenprofil (NEU!)
                      </Link>
                      <motion.button 
                        className={styles.sidebarLogoutBtn} 
                        onClick={() => {
                          setSidebarOpen(false);
                          handleLogout();
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className={styles.sidebarLogoutIcon}>🚪</span>
                        Logout
                      </motion.button>
                    </div>
                  </div>
                )}
                
                <div className={styles.sidebarSection}>
                  <h3 className={styles.sidebarTitle}>Weitere Links</h3>
                  <ul className={styles.sidebarLinks}>
                    <li>
                      <Link to="/about" className={`${styles.sidebarLink} ${styles.secondary}`} onClick={() => setSidebarOpen(false)}>
                        Über uns
                      </Link>
                    </li>
                    <li>
                      <Link to="/datenschutz" className={`${styles.sidebarLink} ${styles.secondary}`} onClick={() => setSidebarOpen(false)}>
                        Datenschutz
                      </Link>
                    </li>
                    <li>
                      <Link to="/agb" className={`${styles.sidebarLink} ${styles.secondary}`} onClick={() => setSidebarOpen(false)}>
                        AGB
                      </Link>
                    </li>
                    <li>
                      <Link to="/impressum" className={`${styles.sidebarLink} ${styles.secondary}`} onClick={() => setSidebarOpen(false)}>
                        Impressum
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
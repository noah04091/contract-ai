import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  Building2,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  FileText,
  Calendar,
  Search,
  Sparkles,
  Rocket,
  Scale,
  MessageSquare,
  Lightbulb,
  Hammer,
  PenTool,
  BookOpen,
  Users,
  Link2,
  Star,
  X,
  TrendingUp
} from "lucide-react";
import styles from "../styles/Navbar.module.css";
import Notification from "./Notification";
import logo from "../assets/logo.png";
import { clearAuthData } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

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

  // User display helpers
  const userName = useMemo(() => {
    if (!user) return 'User';
    // TODO: Add name field to User interface when available
    return user.email?.split('@')[0] || 'User';
  }, [user]);

  const userInitial = useMemo(() => {
    return userName.charAt(0).toUpperCase();
  }, [userName]);

  const formatPlan = (plan?: string): string => {
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'premium') return 'Premium';
    if (plan === 'business') return 'Business';
    if (plan === 'legendary' || plan === 'enterprise') return 'Enterprise';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };
  const isHomePage = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  
  // Definiere geschützte Seiten
  const protectedRoutes = ["/dashboard", "/contracts", "/optimizer", "/premium", "/me", "/calendar", "/compare", "/better-contracts", "/Generate", "/chat", "/envelopes", "/generate", "/legal-pulse"];
  const isProtectedPage = protectedRoutes.includes(location.pathname);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/legal-lens" className={`${styles.navLink} ${location.pathname.startsWith("/legal-lens") ? styles.activeNavLink : ""}`}>
                      <span className={styles.navLinkIcon}>🔍</span>
                      <span className={styles.navLinkText}>Legal Lens</span>
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
                  className={styles.userButtonNew}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={styles.userAvatarSmall}>{userInitial}</div>
                  <div className={styles.userInfoSmall}>
                    <span className={styles.userNameSmall}>{userName}</span>
                    <span className={styles.userPlanSmall}>{formatPlan(user.subscriptionPlan)}</span>
                  </div>
                  <ChevronDown size={16} strokeWidth={2} />
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      className={styles.dropdownMenuNew}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={styles.dropdownUserHeader}>
                        <div className={styles.dropdownUserAvatar}>{userInitial}</div>
                        <div>
                          <div className={styles.dropdownUserName}>{userName}</div>
                          <div className={styles.dropdownUserEmail}>{user.email}</div>
                        </div>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <div className={styles.dropdownList}>
                        <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <UserIcon size={16} strokeWidth={1.75} />
                          <span>Mein Profil</span>
                        </Link>
                        <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <Building2 size={16} strokeWidth={1.75} />
                          <span>Unternehmen</span>
                        </Link>
                        <Link to="/pricing" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <CreditCard size={16} strokeWidth={1.75} />
                          <span>Abo verwalten</span>
                        </Link>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <div className={styles.dropdownList}>
                        <Link to="/hilfe" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <HelpCircle size={16} strokeWidth={1.75} />
                          <span>Hilfe & Support</span>
                        </Link>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <button className={`${styles.dropdownItemNew} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                        <LogOut size={16} strokeWidth={1.75} />
                        <span>Abmelden</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <motion.button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={styles.userButtonNew}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={styles.userAvatarSmall}>{userInitial}</div>
                  <div className={styles.userInfoSmall}>
                    <span className={styles.userNameSmall}>{userName}</span>
                    <span className={styles.userPlanSmall}>{formatPlan(user.subscriptionPlan)}</span>
                  </div>
                  <ChevronDown size={16} strokeWidth={2} />
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      className={styles.dropdownMenuNew}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={styles.dropdownUserHeader}>
                        <div className={styles.dropdownUserAvatar}>{userInitial}</div>
                        <div>
                          <div className={styles.dropdownUserName}>{userName}</div>
                          <div className={styles.dropdownUserEmail}>{user.email}</div>
                        </div>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <div className={styles.dropdownList}>
                        <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <UserIcon size={16} strokeWidth={1.75} />
                          <span>Mein Profil</span>
                        </Link>
                        <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <Building2 size={16} strokeWidth={1.75} />
                          <span>Unternehmen</span>
                        </Link>
                        <Link to="/pricing" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <CreditCard size={16} strokeWidth={1.75} />
                          <span>Abo verwalten</span>
                        </Link>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <div className={styles.dropdownList}>
                        <Link to="/hilfe" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                          <HelpCircle size={16} strokeWidth={1.75} />
                          <span>Hilfe & Support</span>
                        </Link>
                      </div>
                      <div className={styles.dropdownDivider} />
                      <button className={`${styles.dropdownItemNew} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                        <LogOut size={16} strokeWidth={1.75} />
                        <span>Abmelden</span>
                      </button>
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
                className={styles.userButtonNew}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.userAvatarSmall}>{userInitial}</div>
                <div className={styles.userInfoSmall}>
                  <span className={styles.userNameSmall}>{userName}</span>
                  <span className={styles.userPlanSmall}>{formatPlan(user.subscriptionPlan)}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    className={styles.dropdownMenuNew}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.dropdownUserHeader}>
                      <div className={styles.dropdownUserAvatar}>{userInitial}</div>
                      <div>
                        <div className={styles.dropdownUserName}>{userName}</div>
                        <div className={styles.dropdownUserEmail}>{user.email}</div>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <UserIcon size={16} strokeWidth={1.75} />
                        <span>Mein Profil</span>
                      </Link>
                      <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <Building2 size={16} strokeWidth={1.75} />
                        <span>Unternehmen</span>
                      </Link>
                      <Link to="/pricing" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <CreditCard size={16} strokeWidth={1.75} />
                        <span>Abo verwalten</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/hilfe" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <HelpCircle size={16} strokeWidth={1.75} />
                        <span>Hilfe & Support</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItemNew} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                      <LogOut size={16} strokeWidth={1.75} />
                      <span>Abmelden</span>
                    </button>
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
                className={styles.userButtonNew}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.userAvatarSmall}>{userInitial}</div>
                <div className={styles.userInfoSmall}>
                  <span className={styles.userNameSmall}>{userName}</span>
                  <span className={styles.userPlanSmall}>{formatPlan(user.subscriptionPlan)}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    className={styles.dropdownMenuNew}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.dropdownUserHeader}>
                      <div className={styles.dropdownUserAvatar}>{userInitial}</div>
                      <div>
                        <div className={styles.dropdownUserName}>{userName}</div>
                        <div className={styles.dropdownUserEmail}>{user.email}</div>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <UserIcon size={16} strokeWidth={1.75} />
                        <span>Mein Profil</span>
                      </Link>
                      <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <Building2 size={16} strokeWidth={1.75} />
                        <span>Unternehmen</span>
                      </Link>
                      <Link to="/pricing" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <CreditCard size={16} strokeWidth={1.75} />
                        <span>Abo verwalten</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/hilfe" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <HelpCircle size={16} strokeWidth={1.75} />
                        <span>Hilfe & Support</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItemNew} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                      <LogOut size={16} strokeWidth={1.75} />
                      <span>Abmelden</span>
                    </button>
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
                className={styles.userButtonNew}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.userAvatarSmall}>{userInitial}</div>
                <div className={styles.userInfoSmall}>
                  <span className={styles.userNameSmall}>{userName}</span>
                  <span className={styles.userPlanSmall}>{formatPlan(user.subscriptionPlan)}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    className={styles.dropdownMenuNew}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.dropdownUserHeader}>
                      <div className={styles.dropdownUserAvatar}>{userInitial}</div>
                      <div>
                        <div className={styles.dropdownUserName}>{userName}</div>
                        <div className={styles.dropdownUserEmail}>{user.email}</div>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <UserIcon size={16} strokeWidth={1.75} />
                        <span>Mein Profil</span>
                      </Link>
                      <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <Building2 size={16} strokeWidth={1.75} />
                        <span>Unternehmen</span>
                      </Link>
                      <Link to="/pricing" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <CreditCard size={16} strokeWidth={1.75} />
                        <span>Abo verwalten</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/hilfe" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <HelpCircle size={16} strokeWidth={1.75} />
                        <span>Hilfe & Support</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItemNew} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                      <LogOut size={16} strokeWidth={1.75} />
                      <span>Abmelden</span>
                    </button>
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
                className={styles.userButtonNew}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={styles.userAvatarSmall}>{userInitial}</div>
                <div className={styles.userInfoSmall}>
                  <span className={styles.userNameSmall}>{userName}</span>
                  <span className={styles.userPlanSmall}>{formatPlan(user.subscriptionPlan)}</span>
                </div>
                <ChevronDown size={16} strokeWidth={2} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    className={styles.dropdownMenuNew}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.dropdownUserHeader}>
                      <div className={styles.dropdownUserAvatar}>{userInitial}</div>
                      <div>
                        <div className={styles.dropdownUserName}>{userName}</div>
                        <div className={styles.dropdownUserEmail}>{user.email}</div>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <UserIcon size={16} strokeWidth={1.75} />
                        <span>Mein Profil</span>
                      </Link>
                      <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <Building2 size={16} strokeWidth={1.75} />
                        <span>Unternehmen</span>
                      </Link>
                      <Link to="/pricing" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <CreditCard size={16} strokeWidth={1.75} />
                        <span>Abo verwalten</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownList}>
                      <Link to="/hilfe" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                        <HelpCircle size={16} strokeWidth={1.75} />
                        <span>Hilfe & Support</span>
                      </Link>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItemNew} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                      <LogOut size={16} strokeWidth={1.75} />
                      <span>Abmelden</span>
                    </button>
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
        className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ""} ${!isHomePage ? styles.innerPageNavbar : ""} ${isAuthPage ? styles.authPageNavbar : ""}`}
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
                    <>
                      <Link to="/legalpulse" className={`${styles.mobileNavLink} ${location.pathname === "/legalpulse" ? styles.activeMobileNavLink : ""}`}>
                        <span className={styles.mobileNavIcon}>⚖️</span>
                        <span>Legal Pulse</span>
                      </Link>
                      <Link to="/legal-lens" className={`${styles.mobileNavLink} ${location.pathname.startsWith("/legal-lens") ? styles.activeMobileNavLink : ""}`}>
                        <span className={styles.mobileNavIcon}>🔍</span>
                        <span>Legal Lens</span>
                      </Link>
                    </>
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

      {/* Sidebar Implementation - Dashboard V2 Design */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              className={styles.sidebarOverlayNew}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar content */}
            <motion.aside
              className={styles.sidebarNew}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              {/* Logo Header */}
              <div className={styles.sidebarLogoNew}>
                <Link to="/dashboard" className={styles.logoLinkNew} onClick={() => setSidebarOpen(false)}>
                  <img src={logo} alt="Contract AI" className={styles.logoImageNew} />
                </Link>
                <motion.button
                  className={styles.sidebarCloseNew}
                  onClick={() => setSidebarOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={20} strokeWidth={2} />
                </motion.button>
              </div>

              {/* Navigation */}
              <nav className={styles.sidebarNavNew}>
                {/* ÜBERSICHT Section */}
                <div className={styles.navSectionNew}>
                  <div className={styles.navSectionTitleNew}>ÜBERSICHT</div>
                  <ul className={styles.navListNew}>
                    <li className={styles.navItemNew}>
                      <Link to="/dashboard" className={`${styles.navLinkNew} ${location.pathname === '/dashboard' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><LayoutDashboard size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Dashboard</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/contracts" className={`${styles.navLinkNew} ${location.pathname === '/contracts' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><FileText size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Verträge</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/calendar" className={`${styles.navLinkNew} ${location.pathname === '/calendar' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Calendar size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Kalender</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* KI-ASSISTENT Section */}
                <div className={styles.navSectionNew}>
                  <div className={styles.navSectionTitleNew}>KI-ASSISTENT</div>
                  <ul className={styles.navListNew}>
                    <li className={styles.navItemNew}>
                      <Link to="/Generate" className={`${styles.navLinkNew} ${location.pathname === '/Generate' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Sparkles size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Vertrag erstellen</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/optimizer" className={`${styles.navLinkNew} ${location.pathname === '/optimizer' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Rocket size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Vertrag optimieren</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/compare" className={`${styles.navLinkNew} ${location.pathname === '/compare' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Scale size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Verträge vergleichen</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/chat" className={`${styles.navLinkNew} ${location.pathname === '/chat' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><MessageSquare size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>KI-Chat</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/legal-lens" className={`${styles.navLinkNew} ${location.pathname === '/legal-lens' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Search size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Legal Lens</span>
                        <span className={`${styles.navBadgeNew} ${styles.navBadgeBlue}`}>NEU</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/legalpulse" className={`${styles.navLinkNew} ${location.pathname === '/legalpulse' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Lightbulb size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Legal Pulse</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/better-contracts" className={`${styles.navLinkNew} ${location.pathname === '/better-contracts' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><TrendingUp size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Bessere Anbieter</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* WERKZEUGE Section */}
                <div className={styles.navSectionNew}>
                  <div className={styles.navSectionTitleNew}>WERKZEUGE</div>
                  <ul className={styles.navListNew}>
                    <li className={styles.navItemNew}>
                      <Link to="/contract-builder" className={`${styles.navLinkNew} ${location.pathname === '/contract-builder' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Hammer size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>ContractForge</span>
                        <span className={`${styles.navBadgeNew} ${styles.navBadgeGreen}`}>NEU</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/clause-library" className={`${styles.navLinkNew} ${location.pathname === '/clause-library' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><BookOpen size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Klausel-Bibliothek</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/envelopes" className={`${styles.navLinkNew} ${location.pathname === '/envelopes' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><PenTool size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Digitale Signatur</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* EINSTELLUNGEN Section */}
                <div className={styles.navSectionNew}>
                  <div className={styles.navSectionTitleNew}>EINSTELLUNGEN</div>
                  <ul className={styles.navListNew}>
                    <li className={styles.navItemNew}>
                      <Link to="/me" className={`${styles.navLinkNew} ${location.pathname === '/me' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><UserIcon size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Profil</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/company-profile" className={`${styles.navLinkNew} ${location.pathname === '/company-profile' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Building2 size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Unternehmen</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/team" className={`${styles.navLinkNew} ${location.pathname === '/team' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Users size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Team</span>
                        <span className={`${styles.navBadgeNew} ${styles.navBadgePurple}`}>PRO</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/integrations" className={`${styles.navLinkNew} ${location.pathname === '/integrations' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Link2 size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Integrationen</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </nav>

              {/* Upgrade Card - Nur für Free-User */}
              {(!user?.subscriptionActive || user?.subscriptionPlan === 'free') && (
                <div className={styles.upgradeCardNew}>
                  <div className={styles.upgradeIconNew}>
                    <Star size={24} strokeWidth={1.5} />
                  </div>
                  <div className={styles.upgradeTitleNew}>Upgrade auf Pro</div>
                  <div className={styles.upgradeTextNew}>
                    Unbegrenzte Analysen und alle Features freischalten
                  </div>
                  <Link to="/pricing" className={styles.upgradeButtonNew} onClick={() => setSidebarOpen(false)}>
                    Jetzt upgraden
                  </Link>
                </div>
              )}


              {/* Login/Register für nicht eingeloggte User */}
              {!user && (
                <div className={styles.sidebarAuthNew}>
                  <Link to="/login" className={styles.authButtonNew} onClick={() => setSidebarOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className={`${styles.authButtonNew} ${styles.authButtonPrimaryNew}`} onClick={() => setSidebarOpen(false)}>
                    Registrieren
                  </Link>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  Building2,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  LayoutDashboard,
  FileText,
  Calendar,
  Search,
  Sparkles,
  Rocket,
  Scale,
  MessageSquare,
  Radar,
  Hammer,
  PenTool,
  BookOpen,
  Users,
  Link2,
  Star,
  X,
  TrendingUp,
  XCircle,
  Shield
} from "lucide-react";
import styles from "../styles/Navbar.module.css";
import Notification from "./Notification";
import logo from "../assets/logo.webp";
import { clearAuthData } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

// ✅ API Base URL für Production
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// Zentrale Linien-Icons für Mega-Menü (Desktop) und Mobil-Menü — ersetzen den
// früheren Emoji-Satz (renderte je Gerät anders und brach die Marken-Linie).
const navIcon = (paths: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);
const navIcons = {
  analyse: navIcon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  optimieren: navIcon(<path d="M12 3l1.9 5.4L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.6z" />),
  vergleich: navIcon(<><rect x="3" y="4" width="7.5" height="16" rx="1.5" /><rect x="13.5" y="4" width="7.5" height="16" rx="1.5" /></>),
  lens: navIcon(<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="3" /></>),
  generator: navIcon(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />),
  builder: navIcon(<><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>),
  signatur: navIcon(<path d="M3 17c3-1 5-4 6-7l3 3c3-1 6-3 7-6M4 21h16" />),
  verwaltung: navIcon(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />),
  fristen: navIcon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></>),
  email: navIcon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  pulse: navIcon(<path d="M3 12h4l2-6 4 12 2-6h6" />),
  arbeit: navIcon(<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  miete: navIcon(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>),
  nda: navIcon(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  kauf: navIcon(<><path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  aufhebung: navIcon(<><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v4h4M10 13l4 4M14 13l-4 4" /></>),
  agentur: navIcon(<><circle cx="9" cy="8" r="3" /><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5" /><path d="M15 5.5a3 3 0 1 1 1 5.8M15.5 15.2c2.6.3 4.5 2.2 4.5 4.8" /></>),
};

// Feature-Daten für das Mega-Menü
const featureCategories = [
  {
    title: "Analysieren",
    description: "Verträge verstehen & bewerten",
    features: [
      { name: "KI-Vertragsanalyse", description: "Risiken & Chancen erkennen", icon: navIcons.analyse, path: "/features/vertragsanalyse" },
      { name: "Vertrag optimieren", description: "Tiefenanalyse & Optimierung", icon: navIcons.optimieren, path: "/features/optimierung" },
      { name: "Vertragsvergleich", description: "Zwei Versionen vergleichen", icon: navIcons.vergleich, path: "/features/vergleich" },
      { name: "Legal Lens", description: "Klauseln sofort verstehen", icon: navIcons.lens, path: "/features/legal-lens" },
    ]
  },
  {
    title: "Erstellen",
    description: "Verträge professionell erstellen",
    features: [
      { name: "Vertragsgenerator", description: "50+ Vorlagen nutzen", icon: navIcons.generator, path: "/features/generator" },
      { name: "Contract Builder", description: "Drag & Drop Editor", icon: navIcons.builder, path: "/features/contract-builder" },
      { name: "Digitale Signatur", description: "Rechtsgültig unterschreiben", icon: navIcons.signatur, path: "/features/digitalesignatur" },
    ]
  },
  {
    title: "Verwalten",
    description: "Verträge organisieren & überwachen",
    features: [
      { name: "Vertragsverwaltung", description: "Zentrale Organisation", icon: navIcons.verwaltung, path: "/features/vertragsverwaltung" },
      { name: "Fristenkalender", description: "Keine Frist verpassen", icon: navIcons.fristen, path: "/features/fristen" },
      { name: "E-Mail Upload", description: "Per E-Mail hochladen", icon: navIcons.email, path: "/features/email-upload" },
      { name: "Legal Pulse", description: "Gesetzesänderungen tracken", icon: navIcons.pulse, path: "/features/legalpulse" },
    ]
  }
];

const contractTypeCategories = [
  {
    title: "Verträge prüfen",
    description: "Spezialisierte KI-Analyse je Vertragstyp",
    features: [
      { name: "Arbeitsvertrag prüfen", description: "Probezeit, Überstunden, Kündigung", icon: navIcons.arbeit, path: "/arbeitsvertrag-pruefen" },
      { name: "Mietvertrag prüfen", description: "Kaution, Schönheitsreparaturen", icon: navIcons.miete, path: "/mietvertrag-pruefen" },
      { name: "NDA prüfen", description: "Geheimhaltung & Vertragsstrafe", icon: navIcons.nda, path: "/nda-pruefen" },
      { name: "Kaufvertrag prüfen", description: "Gewährleistung & Stornogebühren", icon: navIcons.kauf, path: "/kaufvertrag-pruefen" },
      { name: "Aufhebungsvertrag prüfen", description: "Abfindung & Sperrzeit", icon: navIcons.aufhebung, path: "/aufhebungsvertrag-pruefen" },
      { name: "Agenturvertrag prüfen", description: "Laufzeit & Leistungsumfang", icon: navIcons.agentur, path: "/agenturvertrag-pruefen" },
    ]
  }
];

export default function Navbar() {
  const { user, setUser } = useAuth();

  // 19.08.2026 (Noahs A-Z-Test): Eingeloggt führt das Logo ins Dashboard statt auf
  // die Landingpage — Standard-Verhalten von Apps; ausgeloggt bleibt die Landingpage.
  const logoTarget = user ? "/dashboard" : "/";

  // 🎯 Paket D3 (19.08.2026, Mockup-Entscheidung 3): "Mein Profil" (/me = Konto) und
  // "Unternehmen" (/company-profile) klangen für Privatpersonen wie dasselbe bzw.
  // falsch. Jetzt: /me = "Einstellungen" (Branchenstandard Stripe/DocuSign/Slack);
  // /company-profile heißt je nach gewähltem Profil-Typ "Firmenprofil" (business)
  // oder "Mein Profil" (personal/noch nicht gewählt). Typ via localStorage.
  let storedProfileType: string | null = null;
  try { storedProfileType = localStorage.getItem('contractai_profileType'); } catch { /* blockiert */ }
  const companyProfileLabel = storedProfileType === 'business' ? 'Firmenprofil' : 'Mein Profil';
  // Icon passend zum Label: Gebäude für Firmenprofil, Person für Mein Profil
  // (das Zahnrad gehört jetzt zu "Einstellungen" — Noahs Icon-Feedback 19.08.)
  const CompanyProfileIcon = storedProfileType === 'business' ? Building2 : UserIcon;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [typesMenuOpen, setTypesMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Hintergrundseite einfrieren, solange das Vollbild-Menü offen ist — sonst
  // reicht der Browser Wischgesten an die Seite dahinter weiter (Scroll-
  // Durchbluten, Noahs Fund 07.09.). position:fixed statt overflow:hidden,
  // weil iOS Safari Letzteres bei Touch ignoriert; Scrollposition bleibt erhalten.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const y = window.scrollY;
    const b = document.body.style;
    b.position = 'fixed';
    b.top = `-${y}px`;
    b.left = '0';
    b.right = '0';
    return () => {
      b.position = '';
      b.top = '';
      b.left = '';
      b.right = '';
      window.scrollTo(0, y);
    };
  }, [mobileNavOpen]);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [mobileTypesOpen, setMobileTypesOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const megaMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typesMenuRef = useRef<HTMLDivElement>(null);
  const typesMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const location = useLocation();

  // User display helpers - 🆕 Nutze firstName/name aus Registrierung
  const userName = useMemo(() => {
    if (!user) return 'User';
    if (user.firstName) return user.firstName;
    if (user.name) return user.name.split(' ')[0];
    return user.email?.split('@')[0] || 'User';
  }, [user]);

  // Voller Anzeigename fürs Dropdown (Name > Vorname > E-Mail-Präfix)
  const displayName = useMemo(() => {
    if (!user) return 'User';
    return user.name?.trim() || user.firstName || user.email?.split('@')[0] || 'User';
  }, [user]);

  // Initialen: Vor- + Nachname → zwei Buchstaben, sonst einer.
  // Array.from statt charAt: zerteilt keine Mehrbyte-Zeichen (Emoji etc.)
  const userInitials = useMemo(() => {
    const name = user?.name?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      const first = Array.from(parts[0])[0] || '';
      const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || '' : '';
      const initials = (first + last).toUpperCase();
      if (initials) return initials;
    }
    const fallback = user?.firstName || user?.email || 'U';
    return (Array.from(fallback)[0] || 'U').toUpperCase();
  }, [user]);

  // 🆕 Avatar-Komponente: Zeigt Profilbild oder Initialen
  const [avatarError, setAvatarError] = useState(false);

  const UserAvatar = ({ size = 'small', className }: { size?: 'small' | 'dropdown', className?: string }) => {
    const sizeClass = size === 'dropdown' ? styles.dropdownUserAvatar : styles.userAvatarSmall;

    // Zeige Profilbild nur wenn vorhanden UND kein Ladefehler
    if (user?.profilePicture && !avatarError) {
      return (
        <div className={`${sizeClass} ${className || ''}`}>
          <img
            src={user.profilePicture}
            alt={`Profilbild von ${userName}`}
            className={styles.userAvatarImage}
            onError={() => setAvatarError(true)}
            loading="lazy"
          />
        </div>
      );
    }

    // Fallback: Initialen
    return <div className={`${sizeClass} ${className || ''}`}>{userInitials}</div>;
  };

  const formatPlan = (plan?: string): string => {
    if (!plan || plan === 'free') return 'Free';
    if (plan === 'business') return 'Business';
    if (plan === 'enterprise') return 'Enterprise';
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };
  const isHomePage = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  
  // Definiere geschützte Seiten
  const protectedRoutes = ["/dashboard", "/contracts", "/contracts-v2", "/contracts-legacy", "/optimizer", "/premium", "/me", "/calendar", "/compare", "/better-contracts", "/generate", "/chat", "/envelopes", "/generate", "/legal-pulse", "/cancellations", "/playbook-review"];
  const isProtectedPage = protectedRoutes.includes(location.pathname);

  // 26.08.2026 (Noahs Befund): In der eingeloggten App klebt die Navbar NICHT.
  // Beim Arbeiten braucht der Inhalt die volle Höhe, und die Arbeitsseiten bringen
  // eigene klebende Kopfzeilen mit (belegt: der Schritt-Balken in /generate lag
  // komplett hinter der Navbar, die mit z-index 1000 alles überdeckt). Auf
  // Marketing-Seiten bleibt sie sticky — dort ist die Navigation der Zweck.
  // Diese Liste bewusst breiter als protectedRoutes oben: sie deckt auch /pulse,
  // /legal-lens & Co. ab und matcht Unterseiten. NEUE ARBEITSSEITE? HIER EINTRAGEN.
  const appPagePrefixes = [
    "/dashboard", "/contracts", "/contracts-v2", "/contracts-legacy", "/optimizer",
    "/compare", "/chat", "/generate", "/calendar", "/pulse", "/legal-pulse",
    "/legal-lens", "/better-contracts", "/cancellations", "/playbook-review",
    "/clause-library", "/contract-builder", "/envelopes", "/me", "/company-profile",
    "/team", "/integrations", "/api-keys", "/premium", "/upgrade"
  ];
  const isAppPage = !!user && appPagePrefixes.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );
  
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

      // Schließe das Vertragstypen-Menü bei Klick außerhalb
      if (typesMenuOpen && typesMenuRef.current && !typesMenuRef.current.contains(e.target as Node)) {
        setTypesMenuOpen(false);
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
  }, [mobileMenuOpen, isHomePage, sidebarOpen, megaMenuOpen, typesMenuOpen]);

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
        setTypesMenuOpen(false);
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

  // Vertragstypen-Menu Hover Handler mit Delay (spiegelt Mega-Menu)
  const handleTypesMenuEnter = () => {
    if (typesMenuTimeoutRef.current) {
      clearTimeout(typesMenuTimeoutRef.current);
    }
    setTypesMenuOpen(true);
  };

  const handleTypesMenuLeave = () => {
    typesMenuTimeoutRef.current = setTimeout(() => {
      setTypesMenuOpen(false);
    }, 150);
  };

  // 🚪 Logout-Handler
  const handleLogout = async () => {
    try {
      // ✅ Production-kompatible URL
      await fetch(`${API_BASE}/api/auth/logout`, {
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

  // EIN gemeinsamer Profil-Baustein für alle Navbar-Varianten (Desktop + Mobile):
  // Avatar-only-Trigger (GitHub/Stripe-Muster), Name/E-Mail/Plan-Badge leben im Dropdown.
  const isFreePlan = !user?.subscriptionPlan || user.subscriptionPlan === 'free';
  const userMenu = user ? (
    <div className={styles.dropdownWrapper} ref={dropdownRef}>
      <motion.button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={styles.userMenuTrigger}
        whileTap={{ scale: 0.94 }}
        aria-label="Konto-Menü"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
      >
        <UserAvatar size="small" />
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
              <UserAvatar size="dropdown" />
              <div className={styles.dropdownUserInfo}>
                <div className={styles.dropdownUserNameRow}>
                  <span className={styles.dropdownUserName}>{displayName}</span>
                  <span className={`${styles.planBadge} ${isFreePlan ? styles.planBadgeFree : ''}`}>
                    {formatPlan(user.subscriptionPlan)}
                  </span>
                </div>
                <div className={styles.dropdownUserEmail}>{user.email}</div>
              </div>
            </div>
            {isFreePlan && (
              <Link to="/pricing" className={styles.upgradeRow} onClick={() => setDropdownOpen(false)}>
                <span>3 Analysen/Monat inklusive</span>
                <span className={styles.upgradeRowCta}>Upgrade →</span>
              </Link>
            )}
            <div className={styles.dropdownDivider} />
            <div className={styles.dropdownList}>
              <Link to="/me" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                <Settings size={16} strokeWidth={1.75} />
                <span>Einstellungen</span>
              </Link>
              <Link to="/company-profile" className={styles.dropdownItemNew} onClick={() => setDropdownOpen(false)}>
                <CompanyProfileIcon size={16} strokeWidth={1.75} />
                <span>{companyProfileLabel}</span>
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
  ) : null;

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
              <Link to={logoTarget} className={styles.logoLink}>
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
              <Link to={logoTarget} className={styles.logoLink}>
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
                    <Link to="/pulse" className={`${styles.navLink} ${location.pathname.startsWith("/pulse") ? styles.activeNavLink : ""}`}>
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
            {userMenu}
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
            <Link to={logoTarget} className={styles.logoLink}>
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
            <Link to={logoTarget} className={styles.logoLink}>
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
                              <div className={styles.megaMenuCategoryHeader}>
                                <h3 className={styles.megaMenuCategoryTitle}>{category.title}</h3>
                                <span className={styles.megaMenuCategoryDesc}>{category.description}</span>
                              </div>
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
                          <Link to="/features" className={styles.megaMenuFooterLink} onClick={() => setMegaMenuOpen(false)}>
                            <span>Alle Funktionen ansehen</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Vertragstypen mit Mega-Menü */}
                <div
                  className={styles.megaMenuWrapper}
                  ref={typesMenuRef}
                  onMouseEnter={handleTypesMenuEnter}
                  onMouseLeave={handleTypesMenuLeave}
                >
                  <motion.button
                    className={`${styles.navLink} ${styles.megaMenuTrigger} ${typesMenuOpen ? styles.activeNavLink : ""}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTypesMenuOpen(!typesMenuOpen)}
                  >
                    <span className={styles.navLinkText}>Vertragstypen</span>
                    <motion.span
                      className={styles.megaMenuArrow}
                      animate={{ rotate: typesMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {typesMenuOpen && (
                      <motion.div
                        className={styles.megaMenu}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <div className={styles.megaMenuContentSingle}>
                          {contractTypeCategories.map((category, catIndex) => (
                            <div key={catIndex} className={styles.megaMenuCategory}>
                              <div className={styles.megaMenuCategoryHeader}>
                                <h3 className={styles.megaMenuCategoryTitle}>{category.title}</h3>
                                <span className={styles.megaMenuCategoryDesc}>{category.description}</span>
                              </div>
                              <div className={styles.megaMenuFeaturesGrid}>
                                {category.features.map((feature, featIndex) => (
                                  <Link
                                    key={featIndex}
                                    to={feature.path}
                                    className={styles.megaMenuFeature}
                                    onClick={() => setTypesMenuOpen(false)}
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
                        <div className={`${styles.megaMenuFooter} ${styles.megaMenuFooterSplit}`}>
                          <span className={styles.megaMenuNote}>Dein Vertragstyp ist nicht dabei? <strong>Contract&nbsp;AI prüft jeden Vertrag.</strong></span>
                          <Link to="/rechtslexikon" className={styles.megaMenuFooterLink} onClick={() => setTypesMenuOpen(false)}>
                            <span>Rechtslexikon durchsuchen</span>
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
          <Link to={logoTarget} className={styles.logoLink}>
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
            userMenu
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
          <Link to={logoTarget} className={styles.logoLink}>
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
            userMenu
          )}

          {/* Mobile: User Dropdown wenn eingeloggt */}
          {isMobile && user && (
            userMenu
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
          <Link to={logoTarget} className={styles.logoLink}>
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
            userMenu
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <motion.nav
        className={`${styles.navbar} ${isScrolled && !isAppPage ? styles.navbarScrolled : ""} ${!isHomePage ? styles.innerPageNavbar : ""} ${isAuthPage ? styles.authPageNavbar : ""} ${isAppPage ? styles.appNavbar : ""}`}
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
                      <Link to="/pulse" className={`${styles.mobileNavLink} ${location.pathname.startsWith("/pulse") ? styles.activeMobileNavLink : ""}`}>
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
                            {formatPlan(user.subscriptionPlan)}
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
              {/* Panel Header — Marke statt "Menü" */}
              <div className={styles.mobileNavHeader}>
                <img src={logo} alt="Contract AI" className={styles.mobileNavLogo} />
                <motion.button
                  className={styles.mobileNavClose}
                  onClick={() => {
                    setMobileNavOpen(false);
                    setMobileFeaturesOpen(false);
                  }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Menü schließen"
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
                        <Link
                          to="/features"
                          className={styles.mobileNavAllFeatures}
                          onClick={() => {
                            setMobileNavOpen(false);
                            setMobileFeaturesOpen(false);
                          }}
                        >
                          <span>Alle Funktionen ansehen</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Vertragstypen mit Aufklapp-Menü */}
                <div className={styles.mobileNavSection}>
                  <motion.button
                    className={styles.mobileNavLinkWithArrow}
                    onClick={() => setMobileTypesOpen(!mobileTypesOpen)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className={styles.mobileNavLinkText}>Vertragstypen</span>
                    <motion.span
                      className={styles.mobileNavArrow}
                      animate={{ rotate: mobileTypesOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {mobileTypesOpen && (
                      <motion.div
                        className={styles.mobileNavSubmenu}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {contractTypeCategories.map((category, catIndex) => (
                          <div key={catIndex} className={styles.mobileNavCategory}>
                            <span className={styles.mobileNavCategoryTitle}>{category.title}</span>
                            {category.features.map((feature, featIndex) => (
                              <Link
                                key={featIndex}
                                to={feature.path}
                                className={styles.mobileNavFeature}
                                onClick={() => {
                                  setMobileNavOpen(false);
                                  setMobileTypesOpen(false);
                                }}
                              >
                                <span className={styles.mobileNavFeatureIcon}>{feature.icon}</span>
                                <span className={styles.mobileNavFeatureName}>{feature.name}</span>
                              </Link>
                            ))}
                          </div>
                        ))}
                        <span className={styles.mobileNavNote}>Dein Vertragstyp ist nicht dabei? Contract&nbsp;AI prüft jeden Vertrag.</span>
                        <Link
                          to="/rechtslexikon"
                          className={styles.mobileNavAllFeatures}
                          onClick={() => {
                            setMobileNavOpen(false);
                            setMobileTypesOpen(false);
                          }}
                        >
                          <span>Rechtslexikon durchsuchen</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={styles.mobileNavSep} />

                {/* Preise */}
                <Link
                  to="/pricing"
                  className={styles.mobileNavLinkItem}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkText}>Preise</span>
                </Link>

                {/* Über uns */}
                <Link
                  to="/about"
                  className={styles.mobileNavLinkItem}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkText}>Über uns</span>
                </Link>

                {/* Blog */}
                <Link
                  to="/blog"
                  className={styles.mobileNavLinkItem}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkText}>Blog</span>
                </Link>

                {/* Hilfe-Center — dezenter Zusatzpunkt */}
                <Link
                  to="/hilfe"
                  className={`${styles.mobileNavLinkItem} ${styles.mobileNavLinkMuted}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className={styles.mobileNavLinkText}>Hilfe-Center</span>
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
                    <li className={styles.navItemNew}>
                      <Link to="/cancellations" className={`${styles.navLinkNew} ${location.pathname === '/cancellations' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><XCircle size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Kündigungen</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* KI-ASSISTENT Section */}
                <div className={styles.navSectionNew}>
                  <div className={styles.navSectionTitleNew}>KI-ASSISTENT</div>
                  <ul className={styles.navListNew}>
                    <li className={styles.navItemNew}>
                      <Link to="/generate" className={`${styles.navLinkNew} ${location.pathname === '/generate' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
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
                      <Link to="/pulse" className={`${styles.navLinkNew} ${location.pathname.startsWith('/pulse') ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Radar size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Legal Pulse</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/better-contracts" className={`${styles.navLinkNew} ${location.pathname === '/better-contracts' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><TrendingUp size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Anbieterwechsel</span>
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
                      <Link to="/playbook-review" className={`${styles.navLinkNew} ${location.pathname.startsWith('/playbook-review') ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><Shield size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Playbook Review</span>
                        <span className={`${styles.navBadgeNew} ${styles.navBadgeBlue}`}>NEU</span>
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
                        <span className={styles.navIconNew}><Settings size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>Einstellungen</span>
                      </Link>
                    </li>
                    <li className={styles.navItemNew}>
                      <Link to="/company-profile" className={`${styles.navLinkNew} ${location.pathname === '/company-profile' ? styles.navLinkActiveNew : ''}`} onClick={() => setSidebarOpen(false)}>
                        <span className={styles.navIconNew}><CompanyProfileIcon size={20} strokeWidth={1.75} /></span>
                        <span className={styles.navLabelNew}>{companyProfileLabel}</span>
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
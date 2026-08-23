import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/DashboardV2.module.css";
import { Helmet } from "react-helmet-async";
// Recharts removed - cleaner layout without activity chart
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Plus,
  Sparkles,
  Scale,
  Clock,
  ArrowRight,
  Shield,
  Calendar,
  Bell,
  ExternalLink,
  Zap,
  RefreshCw,
  Upload,
  AlertCircle,
  X,
  PenTool
} from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { fixUtf8Display } from "../utils/textUtils";
import { DashboardLayout } from "../components/DashboardV2";
import AdminDashboard from "../components/AdminDashboard"; // 🔐 Admin Dashboard
import { OnboardingChecklist } from "../components/Onboarding"; // 🎓 Onboarding Checklist
import SetupGuide, { SETUP_GUIDE_ENABLED } from "../components/DashboardV2/SetupGuide"; // 🎯 Erststart für neue Konten
import { SimpleTour } from "../components/Tour"; // 🎯 Simple Tour (zuverlässiger)

// ============================================
// TYPES
// ============================================

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  expiryDate?: string;
  status?: string;
  uploadedAt?: string;
  filePath?: string;
  reminder?: boolean;
  isGenerated?: boolean;
  createdAt?: string;
  updatedAt?: string;
  legalPulse?: {
    riskScore: number | null;
  };
  contractType?: 'recurring' | 'one-time' | null;
  paymentAmount?: number;
  paymentFrequency?: 'monthly' | 'yearly' | 'weekly';
}

interface UserData {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  analysisCount?: number;
  analysisLimit?: number;
  subscriptionPlan?: string;
  profilePicture?: string;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface PendingEnvelope {
  _id: string;
  title: string;
  status: string;
  sentAt?: string;
  expiresAt?: string;
  contractId?: string;
}

interface PulseAnalyzedContract {
  _id: string;
  name: string;
  riskScore: number;
  completedAt?: string;
}

// ============================================
// CONSTANTS
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken") || localStorage.getItem("token");
};

// getContractStatus entfernt - Stats werden jetzt server-side berechnet

const getDaysUntilExpiry = (expiryDate?: string): number | null => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
};

const formatFullDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getRelativeTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return formatDate(dateString);
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return 'Gute Nacht';
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  if (hour < 22) return 'Guten Abend';
  return 'Gute Nacht';
};

// ============================================
// ANIMATED NUMBER HOOK
// ============================================

const useCountUp = (end: number, duration: number = 1000, startOnMount: boolean = true) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startOnMount) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
      const currentCount = Math.floor(easeOutQuart * end);

      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);
      }

      if (percentage < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    // Small delay before starting animation
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, startOnMount]);

  return count;
};

// Animated Number Component
const AnimatedNumber = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const count = useCountUp(value, duration);
  return <>{count}</>;
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

// Calendar Event Type
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  severity: 'info' | 'warning' | 'critical';
  contractName?: string;
  daysUntil: number;
}

export default function DashboardV2() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [recentContractsData, setRecentContractsData] = useState<Contract[]>([]);
  const [urgentContractsData, setUrgentContractsData] = useState<Contract[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [pendingEnvelopes, setPendingEnvelopes] = useState<PendingEnvelope[]>([]);
  const [pulseAnalyzedContracts, setPulseAnalyzedContracts] = useState<PulseAnalyzedContract[]>([]);
  // ⚠️ Bis 23.08.2026 lag dieser Merker in localStorage unter einem festen
  // Schlüssel. Er hing damit am BROWSER statt am Konto: Wer den Bereich einmal
  // ausgeblendet hatte, sah ihn auch mit einem frisch registrierten Konto nie
  // wieder (Noahs Testfund). Jetzt entscheidet das Konto, siehe unten.
  // Diese State-Variable hält nur das sofortige Ausblenden im laufenden Besuch,
  // bevor die Server-Antwort zurück ist.
  const [dismissedLocally, setDismissedLocally] = useState<boolean>(false);
  const [summaryStats, setSummaryStats] = useState<{total: number; active: number; expiringSoon: number; expired: number; generated: number; analyzed: number} | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Kontobezogen: Das Backend führt diesen Merker im Nutzer-Dokument
  // (onboarding.checklistHiddenByUser, gesetzt über POST /api/onboarding/hide-checklist).
  // Ein neu registriertes Konto hat ihn nicht, sieht den Erststart also wieder,
  // auch im selben Browser. Die alte Checkliste nutzt dieselbe Quelle.
  const onboardingDismissed = dismissedLocally || Boolean(user?.onboarding?.checklistHiddenByUser);

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================

  const showNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const token = getAuthToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // OPTIMIERT: Nutze den schnellen Summary-Endpoint statt alle Contracts zu laden
      const summaryResponse = await fetch(
        `${API_BASE}/api/dashboard/notifications/summary`,
        { headers, credentials: "include" }
      );

      if (summaryResponse.status === 401) {
        navigate('/login?redirect=/dashboard');
        return;
      }

      if (summaryResponse.ok) {
        const data = await summaryResponse.json();

        if (data.success) {
          // User-Daten setzen
          setUserData(data.user);

          // Stats direkt vom Server nutzen (SCHNELL!)
          setSummaryStats(data.stats);

          // Recent & Urgent Contracts separat speichern
          setRecentContractsData(data.recentContracts || []);
          setUrgentContractsData(data.urgentContracts || []);
          setPendingEnvelopes(data.pendingEnvelopes || []);
          setPulseAnalyzedContracts(data.pulseAnalyzedContracts || []);

          // Contracts zusammenführen (für Filter-Anzeige)
          const allContracts = [...(data.recentContracts || [])];

          // Urgent Contracts hinzufügen (ohne Duplikate)
          (data.urgentContracts || []).forEach((uc: Contract) => {
            if (!allContracts.find(c => c._id === uc._id)) {
              allContracts.push(uc);
            }
          });

          // Generated Contracts hinzufügen (ohne Duplikate)
          (data.generatedContracts || []).forEach((gc: Contract) => {
            if (!allContracts.find(c => c._id === gc._id)) {
              allContracts.push(gc);
            }
          });

          // Reminder Contracts hinzufügen (ohne Duplikate)
          (data.reminderContracts || []).forEach((rc: Contract) => {
            if (!allContracts.find(c => c._id === rc._id)) {
              allContracts.push(rc);
            }
          });

          setContracts(allContracts);

          if (showRefreshIndicator) {
            showNotification('Daten aktualisiert', 'success');
          }
        }
      } else {
        throw new Error('Dashboard konnte nicht geladen werden');
      }

      // 🆕 Bald-fällig-Count separat (konsistent mit Contracts-Filter "bald_ablaufend")
      try {
        const baldFalligResponse = await fetch(
          `${API_BASE}/api/contracts?status=bald_ablaufend&limit=1`,
          { headers, credentials: "include" }
        );
        if (baldFalligResponse.ok) {
          const baldFalligData = await baldFalligResponse.json();
          const correctCount = baldFalligData?.pagination?.total;
          if (typeof correctCount === 'number') {
            setSummaryStats(prev => prev ? { ...prev, expiringSoon: correctCount } : prev);
          }
        }
      } catch (baldFalligErr) {
        console.warn("Bald-fällig-Count konnte nicht geladen werden:", baldFalligErr);
        // Fallback: stats.expiringSoon bleibt auf Wert aus Summary
      }

      // 📅 Kalender-Events separat laden
      try {
        const calendarResponse = await fetch(
          `${API_BASE}/api/calendar/upcoming?days=30`,
          { headers, credentials: "include" }
        );
        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json();
          if (calendarData.success && calendarData.events) {
            setUpcomingEvents(calendarData.events);
          }
        }
      } catch (calendarErr) {
        console.warn("Calendar events could not be loaded:", calendarErr);
        // Kein Error anzeigen - Kalender ist optional
      }

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Verbindung zum Server fehlgeschlagen. Bitte versuche es erneut.");
      if (showRefreshIndicator) {
        showNotification('Aktualisierung fehlgeschlagen', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Stats direkt vom Server (SCHNELL - keine Client-Side Berechnung nötig!)
  const stats = useMemo(() => {
    if (summaryStats) {
      return {
        total: summaryStats.total,
        active: summaryStats.active,
        expiringSoon: summaryStats.expiringSoon,
        expired: summaryStats.expired,
        generated: summaryStats.generated,
        analyzed: summaryStats.analyzed,
        withReminder: 0 // TODO: Später vom Server holen wenn nötig
      };
    }
    // Fallback für alte Contracts-Logik (sollte nicht mehr genutzt werden)
    return { total: 0, active: 0, expiringSoon: 0, expired: 0, generated: 0, analyzed: 0, withReminder: 0 };
  }, [summaryStats]);

  // Recent Contracts direkt vom Server
  const recentContracts = useMemo(() => {
    return recentContractsData;
  }, [recentContractsData]);

  // Urgent Contracts direkt vom Server
  const urgentContracts = useMemo(() => {
    return urgentContractsData;
  }, [urgentContractsData]);

  const analysisUsage = useMemo(() => {
    const used = userData?.analysisCount || 0;
    const total = userData?.analysisLimit ?? 3; // Default: Free = 3
    // -1 bedeutet unbegrenzt (Backend sendet -1 statt Infinity wegen JSON)
    const isUnlimited = total === -1 || total === null || total === Infinity;
    const percentage = isUnlimited ? 0 : (total > 0 ? (used / total) * 100 : 0);
    const remaining = isUnlimited ? Infinity : total - used;
    return { used, total, percentage: Math.min(percentage, 100), remaining, isUnlimited };
  }, [userData]);

  // Benutzername ermitteln - 🆕 Priorisiere firstName/name aus Registrierung
  const userName = useMemo(() => {
    if (userData?.firstName) return userData.firstName; // 🆕 Direkt Vorname nutzen
    if (userData?.name) return userData.name.split(' ')[0]; // Fallback: Erster Teil des vollständigen Namens
    if (userData?.email) return userData.email.split('@')[0]; // Legacy-Fallback
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }, [userData, user]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  // 🎯 Erststart: Ist die Einrichtung noch offen? Maßgeblich sind die beiden
  // Kernschritte, die der Nutzer selbst gehen muss — Konto und E-Mail sind zum
  // Zeitpunkt der ersten Anmeldung ohnehin erledigt, das Profil ist freiwillig.
  const setupIncomplete = !(
    user?.onboarding?.checklist?.firstContractUploaded &&
    user?.onboarding?.checklist?.firstAnalysisComplete
  );

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleContractClick = (contractId: string) => {
    navigate(`/contracts/${contractId}`);
  };

  const handleDismissOnboarding = useCallback(() => {
    // Sofort ausblenden, damit der Klick sich unmittelbar anfühlt.
    setDismissedLocally(true);

    // Dauerhaft merken, aber am Konto statt am Browser. Schlägt der Aufruf fehl,
    // bleibt der Bereich für diesen Besuch ausgeblendet und kommt beim nächsten
    // wieder. Das ist der harmlosere Ausgang als ein Merker, der nie mehr weggeht.
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      fetch('/api/onboarding/hide-checklist', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).catch(() => { /* stiller Fehlschlag, siehe oben */ });

      // Aufräumen bei Gelegenheit: Der browserweite Alt-Merker wird nirgends mehr
      // gelesen, liegt aber noch in vielen Browsern herum.
      localStorage.removeItem('dashboard-onboarding-dismissed');
    } catch {
      // localStorage nicht verfügbar (privates Fenster)
    }
  }, []);

  const handleStatCardClick = (filter: string) => {
    // Navigiere zur Vertragsseite mit entsprechendem Filter
    switch (filter) {
      case 'total':
        navigate('/contracts');
        break;
      case 'active':
        navigate('/contracts?status=active');
        break;
      case 'expiring':
        navigate('/contracts?status=expiring');
        break;
      case 'quota':
        navigate('/pricing');
        break;
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <DashboardLayout user={userData}>
        <div className={styles.dashboard}>
          <Helmet><title>Dashboard | Contract AI</title></Helmet>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}>
              <RefreshCw size={32} className={styles.spinIcon} />
            </div>
            <h2>Dashboard wird geladen...</h2>
            <p>Deine Verträge werden abgerufen</p>
          </div>
          <div className={styles.loadingGrid}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonShimmer} />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error && contracts.length === 0) {
    return (
      <DashboardLayout user={userData}>
        <div className={styles.dashboard}>
          <Helmet><title>Dashboard | Contract AI</title></Helmet>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <h2>Verbindungsfehler</h2>
            <p>{error}</p>
            <button onClick={handleRefresh} className={styles.retryBtn}>
              <RefreshCw size={16} />
              Erneut versuchen
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  // 🔐 ADMIN CHECK - Show admin dashboard for admin users
  const isAdmin = user?.role === 'admin';

  // 🔐 If admin, show AdminDashboard
  if (isAdmin) {
    return (
      <DashboardLayout user={userData}>
        <Helmet>
          <title>Admin Dashboard | Contract AI</title>
        </Helmet>
        <AdminDashboard />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={userData}>
      <div className={styles.dashboard}>
        <Helmet>
          <title>Dashboard | Contract AI</title>
        </Helmet>

        {/* Notification Toasts */}
        {notifications.length > 0 && (
          <div className={styles.notificationContainer}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`${styles.notification} ${styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}
              >
                {notification.type === 'success' && <CheckCircle size={16} />}
                {notification.type === 'error' && <AlertCircle size={16} />}
                {notification.type === 'warning' && <AlertTriangle size={16} />}
                {notification.type === 'info' && <Bell size={16} />}
                <span>{notification.message}</span>
                <button onClick={() => removeNotification(notification.id)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 🎯 Simple Tour */}
        <SimpleTour tourId="dashboard" />

        {/* ============================================
            HEADER - Clean & Minimal
            ============================================ */}
        <header className={styles.header} data-tour="dashboard-welcome">
          <div>
            <h1 className={styles.greeting}>{getGreeting()}, {userName}</h1>
            <p className={styles.subline}>
              {stats.total === 0
                ? 'Willkommen! Lade deinen ersten Vertrag hoch.'
                : `${stats.total} Vertrag${stats.total !== 1 ? 'e' : ''} in deinem Portfolio${stats.expiringSoon > 0 ? ` • ${stats.expiringSoon} läuft bald ab` : ''}`
              }
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={handleRefresh}
              className={styles.refreshBtn}
              disabled={isRefreshing}
              title="Daten aktualisieren"
            >
              <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
            </button>
            <Link to="/contracts?upload=true" className={styles.newBtn}>
              <Plus size={18} />
              <span>Neuer Vertrag</span>
            </Link>
          </div>
        </header>

        {/* ============================================
            ERSTSTART (21.08.2026) — ersetzt für neu registrierte Konten die
            Kombination aus Checkliste und Willkommensbox durch EINE geführte
            Ansicht. Abschalten: SETUP_GUIDE_ENABLED in SetupGuide.tsx auf false.

            ⚠️ 21.08. korrigiert: Die Anzeige hing an `stats.total === 0`. Nach dem
            ersten Upload fiel das Dashboard dadurch zurück in den alten Aufbau —
            die alte Checkliste kam zurück, mitten in der laufenden Einrichtung.
            Maßgeblich ist jetzt, ob die Einrichtung ABGESCHLOSSEN ist. Solange
            das nicht der Fall ist, bleibt die geführte Ansicht oben stehen; mit
            vorhandenen Verträgen erscheint das normale Dashboard darunter.
            ============================================ */}
        {SETUP_GUIDE_ENABLED && setupIncomplete && !onboardingDismissed && (
          <SetupGuide
            checklist={user?.onboarding?.checklist}
            freeAnalyses={analysisUsage.isUnlimited ? null : Math.max(0, analysisUsage.remaining)}
            showPossibilities={stats.total === 0}
            onUploaded={() => { fetchData(true); }}
            onDismiss={handleDismissOnboarding}
          />
        )}

        {/* Bisheriger Aufbau nur noch, wenn der Erststart abgeschaltet ist */}
        {!SETUP_GUIDE_ENABLED && (
          <OnboardingChecklist className={styles.onboardingChecklist} />
        )}

        {/* ============================================
            ONBOARDING - Für neue User ohne Verträge
            ============================================ */}
        {!SETUP_GUIDE_ENABLED && stats.total === 0 && !onboardingDismissed ? (
          <div className={styles.onboarding} style={{ position: 'relative' }}>
            <button
              onClick={handleDismissOnboarding}
              aria-label="Willkommens-Box ausblenden"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'rgba(0, 0, 0, 0.5)',
                transition: 'background 0.15s ease, color 0.15s ease',
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)';
              }}
            >
              <X size={18} />
            </button>
            <div className={styles.onboardingHero}>
              <div className={styles.onboardingIconWrapper}>
                <div className={styles.onboardingIconBg} />
                <Sparkles size={32} className={styles.onboardingIcon} />
              </div>
              <h2>Willkommen bei Contract AI</h2>
              <p>Starte in wenigen Schritten mit der intelligenten Vertragsverwaltung.</p>
            </div>

            <div className={styles.onboardingSteps}>
              {/* ?upload=true öffnet den Upload-Bereich direkt (wie der
                  "Neuer Vertrag"-Knopf im Header) statt nur die Vertragsliste. */}
              <Link to="/contracts?upload=true" className={styles.onboardingStep}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepIcon} style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
                  <Upload size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h3>Vertrag hochladen</h3>
                  <p>Lade einen PDF-Vertrag hoch oder erstelle einen mit KI</p>
                </div>
                <ArrowRight size={18} className={styles.stepArrow} />
              </Link>

              {/* Schritt 2 führte vorher auf /pulse (Legal Pulse = Business-Feature!) —
                  die Analyse startet aber in /contracts. Neue Free-User liefen so
                  direkt in eine Bezahlschranke statt zum Wert-Moment. */}
              <Link to="/contracts" className={styles.onboardingStep}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepIcon} style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <Shield size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h3>KI-Analyse starten</h3>
                  <p>Lass die KI Risiken und Optimierungspotenzial erkennen</p>
                </div>
                <ArrowRight size={18} className={styles.stepArrow} />
              </Link>

              {/* "Erinnerung setzen" versprach eine manuelle Aktion, die erst ab
                  Business geht — die automatischen Fristen-Mails gibt es dagegen
                  für alle Pläne. Text entsprechend ehrlich formuliert. */}
              <Link to="/calendar" className={styles.onboardingStep}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepIcon} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <Bell size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h3>Fristen im Blick behalten</h3>
                  <p>Wir erinnern dich automatisch per E-Mail an wichtige Fristen</p>
                </div>
                <ArrowRight size={18} className={styles.stepArrow} />
              </Link>
            </div>

            <div className={styles.onboardingCta}>
              <Link to="/contracts?upload=true" className={styles.onboardingPrimaryBtn}>
                <Plus size={18} />
                <span>Ersten Vertrag hinzufügen</span>
              </Link>
              <Link to="/generate" className={styles.onboardingSecondaryBtn}>
                <Sparkles size={18} />
                <span>Mit KI erstellen</span>
              </Link>
            </div>
          </div>
        ) : (stats.total > 0 || onboardingDismissed || (SETUP_GUIDE_ENABLED && !setupIncomplete)) ? (
          <>
        {/* ============================================
            ROW 1: STATS - Überblick auf einen Blick
            ============================================ */}
        <div className={styles.statsRow} data-tour="dashboard-stats">
          {/* Stat: Total Contracts */}
          <div
            className={`${styles.statCard} ${styles.clickable}`}
            onClick={() => handleStatCardClick('total')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('total')}
          >
            <div className={styles.statIcon}>
              <FileText size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}><AnimatedNumber value={stats.total} /></span>
              <span className={styles.statLabel}>Verträge</span>
            </div>
            {stats.generated > 0 && (
              <div className={styles.statTrend}>
                <Sparkles size={12} />
                <span>{stats.generated} KI</span>
              </div>
            )}
          </div>

          {/* Stat: Active */}
          <div
            className={`${styles.statCard} ${styles.clickable}`}
            onClick={() => handleStatCardClick('active')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('active')}
          >
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
              <CheckCircle size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}><AnimatedNumber value={stats.active} /></span>
              <span className={styles.statLabel}>Aktiv</span>
            </div>
            <div className={`${styles.statTrend} ${styles.trendGreen}`}>
              <TrendingUp size={12} />
              <span>{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%</span>
            </div>
          </div>

          {/* Stat: Expiring */}
          <div
            className={`${styles.statCard} ${styles.clickable}`}
            onClick={() => handleStatCardClick('expiring')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('expiring')}
          >
            <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
              <AlertTriangle size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}><AnimatedNumber value={stats.expiringSoon} /></span>
              <span className={styles.statLabel}>Bald fällig</span>
            </div>
            {stats.expiringSoon > 0 && (
              <div className={`${styles.statTrend} ${styles.trendOrange}`}>
                <Bell size={12} />
                <span>Achtung</span>
              </div>
            )}
          </div>

          {/* Stat: Quota */}
          <div
            className={`${styles.statCard} ${styles.clickable}`}
            onClick={() => handleStatCardClick('quota')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('quota')}
          >
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
              <Zap size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                <AnimatedNumber value={analysisUsage.used} />{analysisUsage.isUnlimited ? '/∞' : `/${analysisUsage.total}`}
              </span>
              <span className={styles.statLabel}>Analysen</span>
            </div>
            {!analysisUsage.isUnlimited && (
              <div className={styles.quotaBar}>
                <div
                  className={`${styles.quotaFill} ${analysisUsage.percentage > 80 ? styles.quotaWarning : ''}`}
                  style={{ width: `${analysisUsage.percentage}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ============================================
            ROW 2: MAIN CONTENT - Zwei Listen nebeneinander
            ============================================ */}
        <div className={styles.mainRow}>
          {/* Recent Contracts */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <Clock size={16} className={styles.cardIcon} />
                <span>Zuletzt bearbeitet</span>
              </div>
              <Link to="/contracts" className={styles.cardLink}>
                Alle <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.listContainer}>
              {recentContracts.length > 0 ? (
                recentContracts.map(contract => (
                  <div
                    key={contract._id}
                    className={styles.listItem}
                    onClick={() => handleContractClick(contract._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleContractClick(contract._id)}
                  >
                    <div className={styles.listItemIcon}>
                      {contract.isGenerated ? <Sparkles size={16} /> : <FileText size={16} />}
                    </div>
                    <div className={styles.listItemContent}>
                      <span className={styles.listItemTitle}>{fixUtf8Display(contract.name)}</span>
                      <span className={styles.listItemMeta}>
                        {getRelativeTime(contract.updatedAt || contract.createdAt || contract.uploadedAt)}
                      </span>
                    </div>
                    <ExternalLink size={14} className={styles.listItemAction} />
                  </div>
                ))
              ) : (
                <div className={styles.emptyStateCard}>
                  <div className={styles.emptyStateIconWrapper}>
                    <div className={styles.emptyStateIconBg} />
                    <FileText size={24} className={styles.emptyStateIcon} />
                  </div>
                  <div className={styles.emptyStateContent}>
                    <h4>Keine Verträge vorhanden</h4>
                    <p>Lade deinen ersten Vertrag hoch und starte mit der KI-Analyse.</p>
                  </div>
                  <Link to="/contracts" className={styles.emptyStateCta}>
                    <Plus size={16} />
                    <span>Vertrag hinzufügen</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Urgent / Deadlines + Calendar Events */}
          <div className={styles.card} data-tour="dashboard-urgent">
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <AlertTriangle size={16} className={styles.cardIconOrange} />
                <span>Anstehende Termine</span>
              </div>
              <Link to="/calendar" className={styles.cardLink}>
                Kalender <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.listContainer}>
              {/* Urgent Contracts */}
              {urgentContracts.map(contract => {
                const days = getDaysUntilExpiry(contract.expiryDate);
                return (
                  <div
                    key={`contract-${contract._id}`}
                    className={styles.listItem}
                    onClick={() => handleContractClick(contract._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleContractClick(contract._id)}
                  >
                    <div className={`${styles.listItemIcon} ${styles.listItemIconOrange}`}>
                      <FileText size={16} />
                    </div>
                    <div className={styles.listItemContent}>
                      <span className={styles.listItemTitle}>{fixUtf8Display(contract.name)}</span>
                      <span className={styles.listItemMeta}>
                        Vertrag läuft ab • {formatFullDate(contract.expiryDate)}
                      </span>
                    </div>
                    <span className={`${styles.daysBadge} ${days && days <= 7 ? styles.daysBadgeUrgent : ''}`}>
                      {days} {days === 1 ? 'Tag' : 'Tage'}
                    </span>
                  </div>
                );
              })}

              {/* Calendar Events */}
              {upcomingEvents.map(event => (
                <div
                  key={`event-${event.id}`}
                  className={styles.listItem}
                  onClick={() => navigate(`/calendar?eventId=${event.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/calendar?eventId=${event.id}`)}
                >
                  <div className={`${styles.listItemIcon} ${event.severity === 'critical' ? styles.listItemIconRed : event.severity === 'warning' ? styles.listItemIconOrange : styles.listItemIconBlue}`}>
                    <Bell size={16} />
                  </div>
                  <div className={styles.listItemContent}>
                    <span className={styles.listItemTitle}>{event.title}</span>
                    <span className={styles.listItemMeta}>
                      {event.contractName ? `${event.contractName} • ` : ''}{formatFullDate(event.date)}
                    </span>
                  </div>
                  <span className={`${styles.daysBadge} ${event.daysUntil <= 7 ? styles.daysBadgeUrgent : ''}`}>
                    {event.daysUntil} {event.daysUntil === 1 ? 'Tag' : 'Tage'}
                  </span>
                </div>
              ))}

              {/* Empty State */}
              {urgentContracts.length === 0 && upcomingEvents.length === 0 && (
                <div className={styles.emptyStateCard}>
                  <div className={`${styles.emptyStateIconWrapper} ${styles.emptyStateSuccess}`}>
                    <div className={styles.emptyStateIconBg} />
                    <CheckCircle size={24} className={styles.emptyStateIcon} />
                  </div>
                  <div className={styles.emptyStateContent}>
                    <h4>Alles im grünen Bereich</h4>
                    <p>Keine Ereignisse in den nächsten 30 Tagen.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================
            ROW 3: QUICK ACTIONS - Horizontale Aktionsleiste
            ============================================ */}
        <div className={styles.quickActionsRow} data-tour="dashboard-quick-actions">
          <Link to="/generate" className={styles.quickActionCard}>
            <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
              <Sparkles size={20} />
            </div>
            <div className={styles.quickActionContent}>
              <span className={styles.quickActionTitle}>KI-Generator</span>
              <span className={styles.quickActionDesc}>Vertrag mit KI erstellen</span>
            </div>
            <ArrowRight size={16} className={styles.quickActionArrow} />
          </Link>

          <Link to="/pulse" className={styles.quickActionCard}>
            <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <Scale size={20} />
            </div>
            <div className={styles.quickActionContent}>
              <span className={styles.quickActionTitle}>Legal Pulse</span>
              <span className={styles.quickActionDesc}>Risiken analysieren</span>
            </div>
            <ArrowRight size={16} className={styles.quickActionArrow} />
          </Link>

          <Link to="/contracts" className={styles.quickActionCard}>
            <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
              <FileText size={20} />
            </div>
            <div className={styles.quickActionContent}>
              <span className={styles.quickActionTitle}>Verträge</span>
              <span className={styles.quickActionDesc}>Alle Verträge verwalten</span>
            </div>
            <ArrowRight size={16} className={styles.quickActionArrow} />
          </Link>

          <Link to="/calendar" className={styles.quickActionCard}>
            <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
              <Calendar size={20} />
            </div>
            <div className={styles.quickActionContent}>
              <span className={styles.quickActionTitle}>Kalender</span>
              <span className={styles.quickActionDesc}>Fristen im Blick</span>
            </div>
            <ArrowRight size={16} className={styles.quickActionArrow} />
          </Link>
        </div>

        {/* ============================================
            FEATURE SECTIONS - 3 Column
            ============================================ */}
        <div className={styles.featureGrid}>

          {/* KI-Generierte Verträge */}
          <div className={styles.featureSection}>
            <div className={styles.featureSectionHeader}>
              <div className={styles.featureSectionIcon} style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h3>KI-Generierte Verträge</h3>
                <p>Mit künstlicher Intelligenz erstellt</p>
              </div>
            </div>
            <div className={styles.featureSectionContent}>
              {contracts.filter(c => c.isGenerated).slice(0, 3).map(contract => (
                <div
                  key={contract._id}
                  className={styles.featureItem}
                  onClick={() => handleContractClick(contract._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleContractClick(contract._id)}
                >
                  <Sparkles size={14} />
                  <span>{fixUtf8Display(contract.name)}</span>
                  <span className={styles.featureItemMeta}>{getRelativeTime(contract.createdAt)}</span>
                </div>
              ))}
              {contracts.filter(c => c.isGenerated).length === 0 && (
                <div className={styles.featureEmptyPremium}>
                  <div className={styles.featureEmptyIcon} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.1))' }}>
                    <Sparkles size={20} style={{ color: '#3B82F6' }} />
                  </div>
                  <div className={styles.featureEmptyText}>
                    <span>Noch keine KI-Verträge</span>
                    <p>Erstelle Verträge mit künstlicher Intelligenz</p>
                  </div>
                  <Link to="/generate" className={styles.featureEmptyCta}>
                    Jetzt erstellen
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            {contracts.filter(c => c.isGenerated).length > 0 && (
              <Link to="/contracts?filter=generated" className={styles.featureSectionLink}>
                Alle anzeigen <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {/* Ausstehende Signaturen */}
          <div className={styles.featureSection}>
            <div className={styles.featureSectionHeader}>
              <div className={styles.featureSectionIcon} style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                <PenTool size={18} />
              </div>
              <div>
                <h3>Ausstehende Signaturen</h3>
                <p>Warten auf Unterschrift</p>
              </div>
            </div>
            <div className={styles.featureSectionContent}>
              {pendingEnvelopes.slice(0, 3).map(envelope => (
                <div
                  key={envelope._id}
                  className={styles.featureItem}
                  onClick={() => navigate(`/envelopes?view=${envelope._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/envelopes?view=${envelope._id}`)}
                >
                  <PenTool size={14} />
                  <span>{fixUtf8Display(envelope.title)}</span>
                  <span className={styles.featureItemMeta}>{getRelativeTime(envelope.sentAt)}</span>
                </div>
              ))}
              {pendingEnvelopes.length === 0 && (
                <div className={styles.featureEmptyPremium}>
                  <div className={styles.featureEmptyIcon} style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.1))' }}>
                    <PenTool size={20} style={{ color: '#6366F1' }} />
                  </div>
                  <div className={styles.featureEmptyText}>
                    <span>Keine ausstehenden Signaturen</span>
                    <p>Versende Verträge zur digitalen Unterschrift</p>
                  </div>
                  <Link to="/envelopes" className={styles.featureEmptyCta}>
                    Zur Signatur-Übersicht
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            {pendingEnvelopes.length > 0 && (
              <Link to="/envelopes" className={styles.featureSectionLink}>
                Alle anzeigen <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {/* Legal Pulse Analysen */}
          <div className={styles.featureSection}>
            <div className={styles.featureSectionHeader}>
              <div className={styles.featureSectionIcon} style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <Scale size={18} />
              </div>
              <div>
                <h3>Legal Pulse</h3>
                <p>Risikoanalysen deiner Verträge</p>
              </div>
            </div>
            <div className={styles.featureSectionContent}>
              {pulseAnalyzedContracts.map(contract => {
                const score = contract.riskScore;
                const color = score <= 30 ? '#10B981' : score <= 60 ? '#F59E0B' : '#EF4444';
                return (
                  <div
                    key={contract._id}
                    className={styles.featureItem}
                    onClick={() => navigate(`/pulse/${contract._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/pulse/${contract._id}`)}
                  >
                    <Shield size={14} style={{ color }} />
                    <span>{fixUtf8Display(contract.name)}</span>
                    <span className={styles.riskScore} style={{ color }}>{score}%</span>
                  </div>
                );
              })}
              {pulseAnalyzedContracts.length === 0 && (
                <div className={styles.featureEmptyPremium}>
                  <div className={styles.featureEmptyIcon} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))' }}>
                    <Shield size={20} style={{ color: '#10B981' }} />
                  </div>
                  <div className={styles.featureEmptyText}>
                    <span>Noch keine Analysen</span>
                    <p>Analysiere Verträge auf Risiken und Optimierungspotenzial</p>
                  </div>
                  <Link to="/pulse" className={styles.featureEmptyCta}>
                    Analyse starten
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            {pulseAnalyzedContracts.length > 0 && (
              <Link to="/pulse" className={styles.featureSectionLink}>
                Alle Analysen <ArrowRight size={14} />
              </Link>
            )}
          </div>

        </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

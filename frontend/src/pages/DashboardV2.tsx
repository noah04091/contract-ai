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
  Bookmark,
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
  X
} from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "../components/DashboardV2";

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
  name?: string;
  analysisCount?: number;
  analysisLimit?: number;
  subscriptionPlan?: string;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
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

export default function DashboardV2() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [recentContractsData, setRecentContractsData] = useState<Contract[]>([]);
  const [urgentContractsData, setUrgentContractsData] = useState<Contract[]>([]);
  const [summaryStats, setSummaryStats] = useState<{total: number; active: number; expiringSoon: number; expired: number; generated: number; analyzed: number} | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

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

          // Contracts für Kompatibilität (falls irgendwo noch genutzt)
          const allContracts = [...(data.recentContracts || [])];
          (data.urgentContracts || []).forEach((uc: Contract) => {
            if (!allContracts.find(c => c._id === uc._id)) {
              allContracts.push(uc);
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
    const total = userData?.analysisLimit || 15;
    const percentage = total > 0 ? (used / total) * 100 : 0;
    const remaining = total - used;
    return { used, total, percentage: Math.min(percentage, 100), remaining };
  }, [userData]);

  // Benutzername ermitteln
  const userName = useMemo(() => {
    if (userData?.name) return userData.name.split(' ')[0];
    if (userData?.email) return userData.email.split('@')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }, [userData, user]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleContractClick = (contractId: string) => {
    navigate(`/contracts/${contractId}`);
  };

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
        navigate('/subscribe');
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

        {/* ============================================
            HEADER - Clean & Minimal
            ============================================ */}
        <header className={styles.header}>
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
            <Link to="/contracts" className={styles.newBtn}>
              <Plus size={18} />
              <span>Neuer Vertrag</span>
            </Link>
          </div>
        </header>

        {/* ============================================
            ONBOARDING - Für neue User ohne Verträge
            ============================================ */}
        {stats.total === 0 ? (
          <div className={styles.onboarding}>
            <div className={styles.onboardingHero}>
              <div className={styles.onboardingIconWrapper}>
                <div className={styles.onboardingIconBg} />
                <Sparkles size={32} className={styles.onboardingIcon} />
              </div>
              <h2>Willkommen bei Contract AI</h2>
              <p>Starte in wenigen Schritten mit der intelligenten Vertragsverwaltung.</p>
            </div>

            <div className={styles.onboardingSteps}>
              <Link to="/contracts" className={styles.onboardingStep}>
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

              <Link to="/legalpulse" className={styles.onboardingStep}>
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

              <Link to="/calendar" className={styles.onboardingStep}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepIcon} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <Bell size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h3>Erinnerung setzen</h3>
                  <p>Verpasse nie wieder eine wichtige Frist</p>
                </div>
                <ArrowRight size={18} className={styles.stepArrow} />
              </Link>
            </div>

            <div className={styles.onboardingCta}>
              <Link to="/contracts" className={styles.onboardingPrimaryBtn}>
                <Plus size={18} />
                <span>Ersten Vertrag hinzufügen</span>
              </Link>
              <Link to="/generate" className={styles.onboardingSecondaryBtn}>
                <Sparkles size={18} />
                <span>Mit KI erstellen</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
        {/* ============================================
            ROW 1: STATS - Überblick auf einen Blick
            ============================================ */}
        <div className={styles.statsRow}>
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
                <AnimatedNumber value={analysisUsage.used} />/{analysisUsage.total}
              </span>
              <span className={styles.statLabel}>Analysen</span>
            </div>
            <div className={styles.quotaBar}>
              <div
                className={`${styles.quotaFill} ${analysisUsage.percentage > 80 ? styles.quotaWarning : ''}`}
                style={{ width: `${analysisUsage.percentage}%` }}
              />
            </div>
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
                      <span className={styles.listItemTitle}>{contract.name}</span>
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

          {/* Urgent / Deadlines */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <AlertTriangle size={16} className={styles.cardIconOrange} />
                <span>Bald fällig</span>
              </div>
              <Link to="/calendar" className={styles.cardLink}>
                Kalender <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.listContainer}>
              {urgentContracts.length > 0 ? (
                urgentContracts.map(contract => {
                  const days = getDaysUntilExpiry(contract.expiryDate);
                  return (
                    <div
                      key={contract._id}
                      className={styles.listItem}
                      onClick={() => handleContractClick(contract._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleContractClick(contract._id)}
                    >
                      <div className={`${styles.listItemIcon} ${styles.listItemIconOrange}`}>
                        <Calendar size={16} />
                      </div>
                      <div className={styles.listItemContent}>
                        <span className={styles.listItemTitle}>{contract.name}</span>
                        <span className={styles.listItemMeta}>
                          {formatFullDate(contract.expiryDate)}
                        </span>
                      </div>
                      <span className={`${styles.daysBadge} ${days && days <= 7 ? styles.daysBadgeUrgent : ''}`}>
                        {days} {days === 1 ? 'Tag' : 'Tage'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyStateCard}>
                  <div className={`${styles.emptyStateIconWrapper} ${styles.emptyStateSuccess}`}>
                    <div className={styles.emptyStateIconBg} />
                    <CheckCircle size={24} className={styles.emptyStateIcon} />
                  </div>
                  <div className={styles.emptyStateContent}>
                    <h4>Alles im grünen Bereich</h4>
                    <p>Keine Verträge laufen in den nächsten 30 Tagen ab.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================
            ROW 3: QUICK ACTIONS - Horizontale Aktionsleiste
            ============================================ */}
        <div className={styles.quickActionsRow}>
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

          <Link to="/legalpulse" className={styles.quickActionCard}>
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
                  <span>{contract.name}</span>
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

          {/* Gemerkte Verträge */}
          <div className={styles.featureSection}>
            <div className={styles.featureSectionHeader}>
              <div className={styles.featureSectionIcon} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                <Bookmark size={18} />
              </div>
              <div>
                <h3>Gemerkte Verträge</h3>
                <p>Mit aktiver Erinnerung</p>
              </div>
            </div>
            <div className={styles.featureSectionContent}>
              {contracts.filter(c => c.reminder).slice(0, 3).map(contract => (
                <div
                  key={contract._id}
                  className={styles.featureItem}
                  onClick={() => handleContractClick(contract._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleContractClick(contract._id)}
                >
                  <Bell size={14} />
                  <span>{contract.name}</span>
                  <span className={styles.featureItemMeta}>Erinnerung aktiv</span>
                </div>
              ))}
              {contracts.filter(c => c.reminder).length === 0 && (
                <div className={styles.featureEmptyPremium}>
                  <div className={styles.featureEmptyIcon} style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))' }}>
                    <Bell size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <div className={styles.featureEmptyText}>
                    <span>Keine Erinnerungen aktiv</span>
                    <p>Aktiviere Erinnerungen für wichtige Fristen</p>
                  </div>
                  <Link to="/contracts" className={styles.featureEmptyCta}>
                    Verträge ansehen
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            {contracts.filter(c => c.reminder).length > 0 && (
              <Link to="/contracts?filter=reminder" className={styles.featureSectionLink}>
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
              {contracts.filter(c => c.legalPulse?.riskScore != null).slice(0, 3).map(contract => {
                const score = contract.legalPulse?.riskScore || 0;
                const color = score <= 30 ? '#10B981' : score <= 60 ? '#F59E0B' : '#EF4444';
                return (
                  <div
                    key={contract._id}
                    className={styles.featureItem}
                    onClick={() => navigate(`/legalpulse/${contract._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/legalpulse/${contract._id}`)}
                  >
                    <Shield size={14} style={{ color }} />
                    <span>{contract.name}</span>
                    <span className={styles.riskScore} style={{ color }}>{score}%</span>
                  </div>
                );
              })}
              {contracts.filter(c => c.legalPulse?.riskScore != null).length === 0 && (
                <div className={styles.featureEmptyPremium}>
                  <div className={styles.featureEmptyIcon} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))' }}>
                    <Shield size={20} style={{ color: '#10B981' }} />
                  </div>
                  <div className={styles.featureEmptyText}>
                    <span>Noch keine Analysen</span>
                    <p>Analysiere Verträge auf Risiken und Optimierungspotenzial</p>
                  </div>
                  <Link to="/legalpulse" className={styles.featureEmptyCta}>
                    Analyse starten
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            {contracts.filter(c => c.legalPulse?.riskScore != null).length > 0 && (
              <Link to="/legalpulse" className={styles.featureSectionLink}>
                Alle Analysen <ArrowRight size={14} />
              </Link>
            )}
          </div>

        </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

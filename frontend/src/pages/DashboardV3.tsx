import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/DashboardV3.module.css";
import { Helmet } from "react-helmet-async";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Plus,
  Sparkles,
  Scale,
  Clock,
  ArrowRight,
  Shield,
  Calendar,
  ExternalLink,
  Zap,
  BarChart2,
  Lightbulb,
  ArrowUpRight,
  ChevronRight
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
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getContractStatus = (contract: Contract): string => {
  if (!contract.expiryDate) return 'unknown';
  const expiry = new Date(contract.expiryDate);
  const now = new Date();
  const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'warning';
  return 'active';
};

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

const getRelativeTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return formatDate(dateString);
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export default function DashboardV2() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  useAuth(); // Stellt sicher, dass Auth-Context verfügbar ist

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

        const [userResponse, contractsResponse] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, { headers, credentials: "include" }),
          fetch(`${API_BASE}/api/contracts`, { headers, credentials: "include" }),
        ]);

        if (userResponse.ok) {
          const userJson = await userResponse.json();
          setUserData(userJson.user || userJson);
        }

        if (contractsResponse.ok) {
          const contractsJson = await contractsResponse.json();
          setContracts(contractsJson.contracts || contractsJson || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter(c => getContractStatus(c) === 'active').length;
    const expiringSoon = contracts.filter(c => getContractStatus(c) === 'warning').length;
    const generated = contracts.filter(c => c.isGenerated).length;
    const analyzed = contracts.filter(c => c.legalPulse?.riskScore !== null && c.legalPulse?.riskScore !== undefined).length;
    const withReminder = contracts.filter(c => c.reminder).length;
    return { total, active, expiringSoon, generated, analyzed, withReminder };
  }, [contracts]);

  const recentContracts = useMemo(() => {
    return [...contracts]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.uploadedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.uploadedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [contracts]);

  const urgentContracts = useMemo(() => {
    return contracts
      .filter(c => {
        const days = getDaysUntilExpiry(c.expiryDate);
        return days !== null && days > 0 && days <= 30;
      })
      .sort((a, b) => {
        const daysA = getDaysUntilExpiry(a.expiryDate) || Infinity;
        const daysB = getDaysUntilExpiry(b.expiryDate) || Infinity;
        return daysA - daysB;
      })
      .slice(0, 3);
  }, [contracts]);

  const analysisUsage = useMemo(() => {
    const used = userData?.analysisCount || 0;
    const total = userData?.analysisLimit || 15;
    const percentage = total > 0 ? (used / total) * 100 : 0;
    return { used, total, percentage: Math.min(percentage, 100) };
  }, [userData]);

  // Smart Insights
  const insights = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; type: 'warning' | 'info' | 'success'; action?: string; link?: string }[] = [];

    if (stats.expiringSoon > 0) {
      items.push({
        icon: AlertTriangle,
        text: `${stats.expiringSoon} ${stats.expiringSoon === 1 ? 'Vertrag läuft' : 'Verträge laufen'} in den nächsten 30 Tagen aus`,
        type: 'warning',
        action: 'Prüfen',
        link: '/calendar'
      });
    }

    const unanalyzed = contracts.filter(c => !c.legalPulse?.riskScore).length;
    if (unanalyzed > 0 && contracts.length > 0) {
      items.push({
        icon: Shield,
        text: `${unanalyzed} ${unanalyzed === 1 ? 'Vertrag wurde' : 'Verträge wurden'} noch nicht analysiert`,
        type: 'info',
        action: 'Analysieren',
        link: '/legalpulse'
      });
    }

    if (stats.total === 0) {
      items.push({
        icon: Lightbulb,
        text: 'Lade deinen ersten Vertrag hoch oder erstelle einen mit KI',
        type: 'info',
        action: 'Loslegen',
        link: '/contracts'
      });
    }

    if (analysisUsage.percentage >= 80 && analysisUsage.percentage < 100) {
      items.push({
        icon: Zap,
        text: `Dein Analyse-Kontingent ist zu ${Math.round(analysisUsage.percentage)}% aufgebraucht`,
        type: 'warning',
        action: 'Upgraden',
        link: '/upgrade'
      });
    }

    if (items.length === 0 && stats.total > 0) {
      items.push({
        icon: CheckCircle,
        text: 'Alle Verträge sind aktuell und geprüft',
        type: 'success'
      });
    }

    return items.slice(0, 3);
  }, [contracts, stats, analysisUsage]);

  // Mini chart data
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayContracts = contracts.filter(c => {
        const created = new Date(c.createdAt || c.uploadedAt || '');
        return created.toDateString() === date.toDateString();
      });
      return { day: i, value: dayContracts.length + Math.floor(Math.random() * 2) };
    });
  }, [contracts]);

  // 🆕 Nutze firstName/name aus Registrierung
  const userName = userData?.firstName || userData?.name?.split(' ')[0] || userData?.email?.split('@')[0] || 'User';

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <DashboardLayout user={userData}>
        <div className={styles.dashboard}>
          <Helmet><title>Dashboard | Contract AI</title></Helmet>
          <div className={styles.loadingGrid}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={styles.skeletonCard} />
            ))}
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

        {/* ============================================
            HERO SECTION - Welcome + Quick Stats
            ============================================ */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>{getGreeting()}, {userName}</h1>
              <p className={styles.heroSubtitle}>
                Du hast <strong>{stats.total}</strong> {stats.total === 1 ? 'Vertrag' : 'Verträge'} in deinem Portfolio
                {stats.expiringSoon > 0 && <span className={styles.heroAlert}> · {stats.expiringSoon} benötigen Aufmerksamkeit</span>}
              </p>
            </div>
            <div className={styles.heroActions}>
              <Link to="/contracts" className={styles.btnPrimary}>
                <Plus size={18} />
                Neuer Vertrag
              </Link>
              <Link to="/generate" className={styles.btnSecondary}>
                <Sparkles size={18} />
                KI-Generator
              </Link>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className={styles.heroPills}>
            <div className={styles.heroPill}>
              <CheckCircle size={16} />
              <span>{stats.active} Aktiv</span>
            </div>
            <div className={styles.heroPill}>
              <Sparkles size={16} />
              <span>{stats.generated} KI-erstellt</span>
            </div>
            <div className={styles.heroPill}>
              <Shield size={16} />
              <span>{stats.analyzed} Analysiert</span>
            </div>
            <div className={`${styles.heroPill} ${styles.heroPillQuota}`}>
              <Zap size={16} />
              <span>{analysisUsage.used}/{analysisUsage.total} Analysen</span>
              <div className={styles.pillProgress}>
                <div className={styles.pillProgressFill} style={{ width: `${analysisUsage.percentage}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SMART INSIGHTS - AI Recommendations
            ============================================ */}
        {insights.length > 0 && (
          <section className={styles.insights}>
            <div className={styles.insightsHeader}>
              <Lightbulb size={18} />
              <span>Smart Insights</span>
            </div>
            <div className={styles.insightsList}>
              {insights.map((insight, i) => (
                <div key={i} className={`${styles.insightItem} ${styles[`insight${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}`]}`}>
                  <div className={styles.insightIcon}>
                    <insight.icon size={18} />
                  </div>
                  <span className={styles.insightText}>{insight.text}</span>
                  {insight.action && insight.link && (
                    <Link to={insight.link} className={styles.insightAction}>
                      {insight.action}
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================
            MAIN GRID - Focused Layout
            ============================================ */}
        <div className={styles.mainGrid}>

          {/* === LEFT COLUMN: Activity + Urgent === */}
          <div className={styles.gridLeft}>

            {/* Activity Chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <BarChart2 size={18} />
                  <span>Aktivität</span>
                </div>
                <span className={styles.cardMeta}>Letzte 7 Tage</span>
              </div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ payload }) => payload?.[0] ? (
                        <div className={styles.chartTooltip}>{payload[0].value} Aktionen</div>
                      ) : null}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Urgent Deadlines */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <AlertTriangle size={18} className={styles.iconWarning} />
                  <span>Bald fällig</span>
                </div>
                <Link to="/calendar" className={styles.cardLink}>
                  Kalender <ChevronRight size={16} />
                </Link>
              </div>
              <div className={styles.cardContent}>
                {urgentContracts.length > 0 ? (
                  urgentContracts.map(contract => {
                    const days = getDaysUntilExpiry(contract.expiryDate);
                    return (
                      <div
                        key={contract._id}
                        className={styles.listItem}
                        onClick={() => navigate(`/contracts/${contract._id}`)}
                      >
                        <div className={`${styles.listIcon} ${styles.listIconWarning}`}>
                          <Calendar size={16} />
                        </div>
                        <div className={styles.listContent}>
                          <span className={styles.listTitle}>{contract.name}</span>
                          <span className={styles.listMeta}>{formatDate(contract.expiryDate)}</span>
                        </div>
                        <span className={`${styles.badge} ${days && days <= 7 ? styles.badgeUrgent : styles.badgeWarning}`}>
                          {days}d
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <CheckCircle size={24} />
                    <span>Keine dringenden Fristen</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT COLUMN: Recent Contracts === */}
          <div className={styles.gridRight}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <Clock size={18} />
                  <span>Letzte Verträge</span>
                </div>
                <Link to="/contracts" className={styles.cardLink}>
                  Alle anzeigen <ChevronRight size={16} />
                </Link>
              </div>
              <div className={styles.cardContent}>
                {recentContracts.length > 0 ? (
                  recentContracts.map(contract => (
                    <div
                      key={contract._id}
                      className={styles.listItem}
                      onClick={() => navigate(`/contracts/${contract._id}`)}
                    >
                      <div className={`${styles.listIcon} ${contract.isGenerated ? styles.listIconPurple : ''}`}>
                        {contract.isGenerated ? <Sparkles size={16} /> : <FileText size={16} />}
                      </div>
                      <div className={styles.listContent}>
                        <span className={styles.listTitle}>{contract.name}</span>
                        <span className={styles.listMeta}>
                          {getRelativeTime(contract.createdAt || contract.uploadedAt)}
                          {contract.legalPulse?.riskScore != null && (
                            <span className={styles.riskBadge} style={{
                              color: contract.legalPulse.riskScore <= 30 ? '#10B981' :
                                     contract.legalPulse.riskScore <= 60 ? '#F59E0B' : '#EF4444'
                            }}>
                              · {contract.legalPulse.riskScore}% Risiko
                            </span>
                          )}
                        </span>
                      </div>
                      <ExternalLink size={14} className={styles.listAction} />
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <FileText size={24} />
                    <span>Noch keine Verträge</span>
                    <Link to="/contracts" className={styles.emptyLink}>Ersten hinzufügen</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================
            QUICK ACTIONS - Feature Access
            ============================================ */}
        <section className={styles.quickSection}>
          <h2 className={styles.sectionTitle}>Schnellzugriff</h2>
          <div className={styles.quickGrid}>
            <Link to="/generate" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                <Sparkles size={22} />
              </div>
              <div className={styles.quickContent}>
                <h3>KI-Generator</h3>
                <p>Verträge mit KI erstellen</p>
              </div>
              <ArrowRight size={18} className={styles.quickArrow} />
            </Link>

            <Link to="/legalpulse" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <Scale size={22} />
              </div>
              <div className={styles.quickContent}>
                <h3>Legal Pulse</h3>
                <p>Risikoanalyse durchführen</p>
              </div>
              <ArrowRight size={18} className={styles.quickArrow} />
            </Link>

            <Link to="/legal-lens" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
                <Shield size={22} />
              </div>
              <div className={styles.quickContent}>
                <h3>Legal Lens</h3>
                <p>Interaktive Vertragsanalyse</p>
              </div>
              <ArrowRight size={18} className={styles.quickArrow} />
            </Link>

            <Link to="/calendar" className={styles.quickCard}>
              <div className={styles.quickIcon} style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                <Calendar size={22} />
              </div>
              <div className={styles.quickContent}>
                <h3>Kalender</h3>
                <p>Fristen im Überblick</p>
              </div>
              <ArrowRight size={18} className={styles.quickArrow} />
            </Link>
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}

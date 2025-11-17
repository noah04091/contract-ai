// 📁 frontend/src/components/AdminDashboard.tsx
// 🔐 Admin Dashboard Component - Integrated into main Dashboard

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Activity,
  Server,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from './AdminDashboard.module.css';

interface User {
  _id: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionActive: boolean;
  analysisCount: number;
  optimizationCount: number;
  createdAt: string;
  verified?: boolean;
}

interface AdminStats {
  costs: {
    today: {
      spent: number;
      limit: number;
      remaining: number;
      percentUsed: number;
      isLimitReached: boolean;
    };
    month: {
      total: number;
      calls: number;
      tokens: number;
      byModel: Record<string, { calls: number; cost: number }>;
      byFeature: Record<string, { calls: number; cost: number }>;
    };
    trend: Array<{ date: string; cost: number; calls: number }>;
    topUsers: Array<{
      _id: string;
      email: string;
      plan: string;
      totalCost: number;
      totalCalls: number;
      totalTokens: number;
    }>;
  };
  users: {
    total: number;
    free: number;
    business: number;
    premium: number;
    activeSubscriptions: number;
    verified: number;
    newLast30Days: number;
    dailyRegistrations: Array<{ date: string; count: number }>;
  };
  conversion: {
    rate: number;
    premiumUpgradeRate: number;
    totalPaidUsers: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    breakdown: {
      business: number;
      premium: number;
    };
  };
  usage: {
    totalAnalyses: number;
    totalOptimizations: number;
    totalContracts: number;
    avgAnalysesPerUser: number;
    byPlan: Array<{
      plan: string;
      analyses: number;
      users: number;
      avgPerUser: number;
    }>;
    mostActive: Array<{
      email: string;
      plan: string;
      analyses: number;
    }>;
  };
  system: {
    mongoStatus: string;
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    nodeVersion: string;
  };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'costs' | 'system' | 'users'>('costs');
  const [users, setUsers] = useState<User[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Admin Statistics (includes users, costs, revenue, etc.)
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setIsLoading(true);

        // Fetch comprehensive admin stats
        const statsResponse = await fetch('/api/admin/stats', {
          credentials: 'include'
        });

        if (!statsResponse.ok) {
          throw new Error('Fehler beim Laden der Admin-Statistiken');
        }

        const statsData = await statsResponse.json();
        setAdminStats(statsData);

        // Fetch users separately for the users tab
        const usersResponse = await fetch('/api/auth/users', {
          credentials: 'include'
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Fehler beim Laden der Admin-Daten');
        setIsLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  // Extract statistics from adminStats or use fallback values
  const stats = adminStats || {
    costs: { today: { spent: 0, limit: 100, remaining: 100, percentUsed: 0, isLimitReached: false }, month: { total: 0, calls: 0, tokens: 0, byModel: {}, byFeature: {} }, trend: [], topUsers: [] },
    users: { total: 0, free: 0, business: 0, premium: 0, activeSubscriptions: 0, verified: 0, newLast30Days: 0, dailyRegistrations: [] },
    conversion: { rate: 0, premiumUpgradeRate: 0, totalPaidUsers: 0 },
    revenue: { mrr: 0, arr: 0, arpu: 0, breakdown: { business: 0, premium: 0 } },
    usage: { totalAnalyses: 0, totalOptimizations: 0, totalContracts: 0, avgAnalysesPerUser: 0, byPlan: [], mostActive: [] },
    system: { mongoStatus: 'Unknown', uptime: 0, memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }, nodeVersion: 'Unknown' }
  };

  // Prepare Chart Data
  const planDistribution = [
    { name: 'Free', value: stats.users.free, color: '#94a3b8' },
    { name: 'Business', value: stats.users.business, color: '#3b82f6' },
    { name: 'Premium', value: stats.users.premium, color: '#10b981' }
  ];

  // Format cost trend data for charts
  const dailyCostData = stats.costs.trend.map(day => ({
    date: new Date(day.date).toLocaleDateString('de-DE'),
    cost: parseFloat(day.cost.toFixed(2)),
    calls: day.calls
  }));

  // Format feature cost breakdown
  const featureCostData = Object.entries(stats.costs.month.byFeature).map(([feature, data]) => ({
    name: feature,
    cost: parseFloat(data.cost.toFixed(2)),
    calls: data.calls
  }));

  return (
    <div className={styles.adminContainer}>
      {/* 🔐 Admin Header */}
      <div className={styles.adminHeader}>
        <div>
          <h1>🔐 Admin Dashboard</h1>
          <p>Vollständige Systemübersicht und Verwaltung</p>
        </div>
        <div className={styles.adminBadge}>
          <AlertCircle size={20} />
          <span>Administrator</span>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <XCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'costs' ? styles.active : ''}`}
          onClick={() => setActiveTab('costs')}
        >
          <DollarSign size={20} />
          <span>Cost Tracking</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'system' ? styles.active : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Activity size={20} />
          <span>System Overview</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          <span>User Management</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* 💰 COST TRACKING TAB */}
        {activeTab === 'costs' && (
          <div className={styles.costsTab}>
            {/* Daily Budget Alert */}
            {stats.costs.today.percentUsed > 80 && (
              <div className={`${styles.alertBanner} ${stats.costs.today.isLimitReached ? styles.danger : styles.warning}`}>
                <AlertCircle size={20} />
                <span>
                  {stats.costs.today.isLimitReached
                    ? `⚠️ Tageslimit erreicht! $${stats.costs.today.spent.toFixed(2)} / $${stats.costs.today.limit.toFixed(2)}`
                    : `⚠️ ${stats.costs.today.percentUsed.toFixed(0)}% des Tageslimits verbraucht ($${stats.costs.today.spent.toFixed(2)} / $${stats.costs.today.limit.toFixed(2)})`
                  }
                </span>
              </div>
            )}

            {/* Cost Overview Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <DollarSign />
                </div>
                <div className={styles.statContent}>
                  <h3>Kosten Heute</h3>
                  <p className={styles.statValue}>${stats.costs.today.spent.toFixed(2)}</p>
                  <span className={styles.statSubtext}>
                    Verbleibend: ${stats.costs.today.remaining.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp />
                </div>
                <div className={styles.statContent}>
                  <h3>Kosten Monat</h3>
                  <p className={styles.statValue}>${stats.costs.month.total.toFixed(2)}</p>
                  <span className={styles.statSubtext}>
                    {stats.costs.month.calls} API Calls
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Zap />
                </div>
                <div className={styles.statContent}>
                  <h3>Total Tokens (Monat)</h3>
                  <p className={styles.statValue}>{(stats.costs.month.tokens / 1000).toFixed(1)}K</p>
                  <span className={styles.statSubtext}>
                    ~${(stats.costs.month.tokens * 0.00001).toFixed(2)} equivalent
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity />
                </div>
                <div className={styles.statContent}>
                  <h3>Ø Cost per Call</h3>
                  <p className={styles.statValue}>
                    ${stats.costs.month.calls > 0
                      ? (stats.costs.month.total / stats.costs.month.calls).toFixed(4)
                      : '0.00'}
                  </p>
                  <span className={styles.statSubtext}>Durchschnitt</span>
                </div>
              </div>
            </div>

            {/* Cost Trend Chart */}
            {dailyCostData.length > 0 && (
              <div className={styles.chartCard}>
                <h3>📈 Tägliche Kosten (letzte 30 Tage)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyCostData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'cost') return `$${value}`;
                        if (name === 'calls') return `${value} calls`;
                        return value;
                      }}
                    />
                    <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} name="Kosten" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Feature Cost Breakdown */}
            {featureCostData.length > 0 && (
              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3>📊 Kosten nach Feature</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={featureCostData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Bar dataKey="cost" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartCard}>
                  <h3>📊 API Calls nach Feature</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={featureCostData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Expensive Users */}
            {stats.costs.topUsers.length > 0 && (
              <div className={styles.tableCard}>
                <h3>💸 Top 10 teuerste User (aktueller Monat)</h3>
                <table className={styles.topUsersTable}>
                  <thead>
                    <tr>
                      <th>Rang</th>
                      <th>E-Mail</th>
                      <th>Plan</th>
                      <th>Kosten</th>
                      <th>API Calls</th>
                      <th>Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.costs.topUsers.map((user, index) => (
                      <tr key={user._id}>
                        <td>#{index + 1}</td>
                        <td className={styles.emailCell}>{user.email}</td>
                        <td>
                          <span className={`${styles.planBadge} ${styles[user.plan]}`}>
                            {user.plan}
                          </span>
                        </td>
                        <td className={styles.costCell}>${user.totalCost.toFixed(2)}</td>
                        <td>{user.totalCalls}</td>
                        <td>{(user.totalTokens / 1000).toFixed(1)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 📊 SYSTEM OVERVIEW TAB */}
        {activeTab === 'system' && (
          <div className={styles.systemTab}>
            {/* Revenue & Business Metrics */}
            <div className={styles.sectionHeader}>
              <h2>💰 Revenue & Business Metriken</h2>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <DollarSign />
                </div>
                <div className={styles.statContent}>
                  <h3>MRR (Monthly Recurring Revenue)</h3>
                  <p className={styles.statValue}>€{stats.revenue.mrr.toFixed(0)}</p>
                  <span className={styles.statSubtext}>Pro Monat</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp />
                </div>
                <div className={styles.statContent}>
                  <h3>ARR (Annual Recurring Revenue)</h3>
                  <p className={styles.statValue}>€{stats.revenue.arr.toFixed(0)}</p>
                  <span className={styles.statSubtext}>Pro Jahr</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users />
                </div>
                <div className={styles.statContent}>
                  <h3>ARPU (Avg Revenue per User)</h3>
                  <p className={styles.statValue}>€{stats.revenue.arpu.toFixed(2)}</p>
                  <span className={styles.statSubtext}>Pro User</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <CheckCircle />
                </div>
                <div className={styles.statContent}>
                  <h3>Conversion Rate</h3>
                  <p className={styles.statValue}>{stats.conversion.rate.toFixed(1)}%</p>
                  <span className={styles.statSubtext}>
                    {stats.conversion.totalPaidUsers} bezahlende User
                  </span>
                </div>
              </div>
            </div>

            {/* User Metrics */}
            <div className={styles.sectionHeader}>
              <h2>👥 User Metriken</h2>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users />
                </div>
                <div className={styles.statContent}>
                  <h3>Gesamt User</h3>
                  <p className={styles.statValue}>{stats.users.total}</p>
                  <span className={styles.statSubtext}>
                    {stats.users.verified} verifiziert
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp />
                </div>
                <div className={styles.statContent}>
                  <h3>Neue User (30 Tage)</h3>
                  <p className={styles.statValue}>{stats.users.newLast30Days}</p>
                  <span className={styles.statSubtext}>Wachstum</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <CheckCircle />
                </div>
                <div className={styles.statContent}>
                  <h3>Aktive Abos</h3>
                  <p className={styles.statValue}>{stats.users.activeSubscriptions}</p>
                  <span className={styles.statSubtext}>
                    {((stats.users.activeSubscriptions / stats.users.total) * 100).toFixed(1)}% Aktivierung
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity />
                </div>
                <div className={styles.statContent}>
                  <h3>Premium Upgrade Rate</h3>
                  <p className={styles.statValue}>{stats.conversion.premiumUpgradeRate.toFixed(1)}%</p>
                  <span className={styles.statSubtext}>
                    {stats.users.premium} Premium User
                  </span>
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className={styles.sectionHeader}>
              <h2>📊 Usage Statistiken</h2>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity />
                </div>
                <div className={styles.statContent}>
                  <h3>Total Analysen</h3>
                  <p className={styles.statValue}>{stats.usage.totalAnalyses}</p>
                  <span className={styles.statSubtext}>
                    Ø {stats.usage.avgAnalysesPerUser.toFixed(1)} pro User
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Zap />
                </div>
                <div className={styles.statContent}>
                  <h3>Total Optimierungen</h3>
                  <p className={styles.statValue}>{stats.usage.totalOptimizations}</p>
                  <span className={styles.statSubtext}>Alle Nutzer</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Database />
                </div>
                <div className={styles.statContent}>
                  <h3>Total Verträge</h3>
                  <p className={styles.statValue}>{stats.usage.totalContracts}</p>
                  <span className={styles.statSubtext}>In der Datenbank</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Server />
                </div>
                <div className={styles.statContent}>
                  <h3>System Status</h3>
                  <p className={styles.statValue}>
                    {stats.system.mongoStatus === 'Connected' ? 'Online' : 'Offline'}
                  </p>
                  <span className={styles.statSubtext}>
                    Uptime: {(stats.system.uptime / 3600).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className={styles.chartsRow}>
              <div className={styles.chartCard}>
                <h3>📊 Plan-Verteilung</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.chartCard}>
                <h3>📈 Revenue Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Business', revenue: stats.revenue.breakdown.business, users: stats.users.business },
                    { name: 'Premium', revenue: stats.revenue.breakdown.premium, users: stats.users.premium }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'revenue') return `€${value}`;
                      return value;
                    }} />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue (MRR)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Most Active Users Table */}
            {stats.usage.mostActive.length > 0 && (
              <div className={styles.tableCard}>
                <h3>🔥 Top 10 aktivste User (nach Analysen)</h3>
                <table className={styles.topUsersTable}>
                  <thead>
                    <tr>
                      <th>Rang</th>
                      <th>E-Mail</th>
                      <th>Plan</th>
                      <th>Analysen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.usage.mostActive.map((user, index) => (
                      <tr key={index}>
                        <td>#{index + 1}</td>
                        <td className={styles.emailCell}>{user.email}</td>
                        <td>
                          <span className={`${styles.planBadge} ${styles[user.plan]}`}>
                            {user.plan}
                          </span>
                        </td>
                        <td>{user.analyses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 👥 USER MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className={styles.usersTab}>
            <div className={styles.tableHeader}>
              <h3>👥 Alle Benutzer ({stats.users.total})</h3>
              <div className={styles.tableFilters}>
                <span>{stats.users.premium} Premium</span>
                <span>{stats.users.business} Business</span>
                <span>{stats.users.free} Free</span>
              </div>
            </div>

            <div className={styles.tableContainer}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <Activity className={styles.spinner} />
                  <p>Lade Benutzerdaten...</p>
                </div>
              ) : users.length > 0 ? (
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th>E-Mail</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Analysen</th>
                      <th>Optimierungen</th>
                      <th>Verifiziert</th>
                      <th>Erstellt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id}>
                        <td className={styles.emailCell}>{user.email}</td>
                        <td>
                          <span className={`${styles.planBadge} ${styles[user.subscriptionPlan]}`}>
                            {user.subscriptionPlan}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${user.subscriptionActive ? styles.active : styles.inactive}`}>
                            {user.subscriptionActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td>{user.analysisCount || 0}</td>
                        <td>{user.optimizationCount || 0}</td>
                        <td>
                          {user.verified ? (
                            <CheckCircle size={18} className={styles.verifiedIcon} />
                          ) : (
                            <XCircle size={18} className={styles.unverifiedIcon} />
                          )}
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString('de-DE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <Users size={48} />
                  <p>Keine Benutzer gefunden</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

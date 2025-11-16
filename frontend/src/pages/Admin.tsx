// 🔐 Admin Dashboard - Comprehensive admin panel for Contract AI
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Users, FileText, Activity, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import styles from './Admin.module.css';

interface BudgetStatus {
  date: string;
  spent: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  percentUsed: number;
}

interface CostStats {
  startDate: string;
  endDate: string;
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  avgCostPerCall: number;
  byFeature: {
    [key: string]: {
      calls: number;
      cost: number;
      tokens: number;
    };
  };
  byModel: {
    [key: string]: {
      calls: number;
      cost: number;
    };
  };
}

interface TrendData {
  date: string;
  cost: number;
  calls: number;
}

interface User {
  _id: string;
  email: string;
  role: string;
  verified: boolean;
  isPremium: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  analysisCount?: number;
}

interface SystemStats {
  totalUsers: number;
  totalContracts: number;
  totalAnalysesToday: number;
  totalAPICalls: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'costs' | 'system' | 'users'>('costs');

  // Cost Tracking State
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [costStats, setCostStats] = useState<CostStats | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  // System State
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [userFilter, setUserFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Test admin access by calling a protected endpoint
        const response = await fetch('/api/cost-tracking/budget', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.status === 403) {
          // Not admin - redirect to dashboard
          navigate('/dashboard');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to verify admin access');
        }

        // User is admin - load dashboard data
        loadDashboardData();
      } catch (error) {
        console.error('Admin access check failed:', error);
        navigate('/dashboard');
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCostData(),
        loadSystemStats(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCostData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load budget status
      const budgetRes = await fetch('/api/cost-tracking/budget', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudgetStatus(budgetData.budget);
      }

      // Load cost stats (last 30 days)
      const statsRes = await fetch('/api/cost-tracking/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setCostStats(statsData.stats);
      }

      // Load trend data (last 30 days)
      const trendRes = await fetch('/api/cost-tracking/trend?days=30', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (trendRes.ok) {
        const trendDataRes = await trendRes.json();
        setTrendData(trendDataRes.trend);
      }
    } catch (error) {
      console.error('Failed to load cost data:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load contracts to count
      const contractsRes = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (contractsRes.ok) {
        const contractsData = await contractsRes.json();
        const contracts = Array.isArray(contractsData) ? contractsData : contractsData.contracts || [];

        // Calculate stats
        const totalContracts = contracts.length;
        const today = new Date().toISOString().split('T')[0];
        const totalAnalysesToday = contracts.filter((c: any) =>
          c.analysis?.lastAnalyzed && c.analysis.lastAnalyzed.startsWith(today)
        ).length;

        setSystemStats({
          totalUsers: 0, // Will be set from users
          totalContracts,
          totalAnalysesToday,
          totalAPICalls: budgetStatus?.spent ? Math.round(budgetStatus.spent / 0.01) : 0 // Rough estimate
        });
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);

        // Update system stats with user count
        setSystemStats(prev => prev ? { ...prev, totalUsers: data.users?.length || 0 } : null);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // If endpoint doesn't exist, we'll just show empty
      setUsers([]);
    }
  };

  const filteredUsers = users.filter(user => {
    if (userFilter === 'all') return true;
    return user.role === userFilter;
  });

  // Prepare chart data
  const featureChartData = costStats?.byFeature
    ? Object.entries(costStats.byFeature).map(([feature, data]) => ({
        name: feature,
        cost: data.cost,
        calls: data.calls
      }))
    : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Lade Admin-Dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>🔐 Admin Dashboard</h1>
          <p>Umfassende Übersicht über Contract AI</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          ← Zurück zum Dashboard
        </button>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tab} ${activeTab === 'costs' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('costs')}
        >
          <DollarSign size={20} />
          Cost Tracking
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'system' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Activity size={20} />
          System-Übersicht
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          User-Management
        </button>
      </div>

      {/* Cost Tracking Tab */}
      {activeTab === 'costs' && (
        <div className={styles.tabContent}>
          {/* Budget Status Card */}
          <div className={styles.budgetCard}>
            <div className={styles.budgetHeader}>
              <h2>💰 Tägliches Budget</h2>
              <span className={styles.date}>{budgetStatus?.date}</span>
            </div>

            <div className={styles.budgetStats}>
              <div className={styles.budgetStat}>
                <span className={styles.label}>Ausgegeben</span>
                <span className={styles.value}>${budgetStatus?.spent.toFixed(2) || '0.00'}</span>
              </div>
              <div className={styles.budgetStat}>
                <span className={styles.label}>Limit</span>
                <span className={styles.value}>${budgetStatus?.limit.toFixed(2) || '100.00'}</span>
              </div>
              <div className={styles.budgetStat}>
                <span className={styles.label}>Verbleibend</span>
                <span className={styles.value}>${budgetStatus?.remaining.toFixed(2) || '100.00'}</span>
              </div>
            </div>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${budgetStatus?.percentUsed || 0}%`,
                  backgroundColor: (budgetStatus?.percentUsed || 0) > 80 ? '#ef4444' : '#3b82f6'
                }}
              />
            </div>
            <div className={styles.progressLabel}>
              {budgetStatus?.percentUsed.toFixed(1)}% genutzt
            </div>
          </div>

          {/* Cost Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <DollarSign className={styles.statIcon} style={{ color: '#3b82f6' }} />
              <div>
                <div className={styles.statValue}>${costStats?.totalCost.toFixed(2) || '0.00'}</div>
                <div className={styles.statLabel}>Gesamtkosten (30 Tage)</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <Activity className={styles.statIcon} style={{ color: '#10b981' }} />
              <div>
                <div className={styles.statValue}>{costStats?.totalCalls.toLocaleString() || '0'}</div>
                <div className={styles.statLabel}>API Calls (30 Tage)</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <TrendingUp className={styles.statIcon} style={{ color: '#f59e0b' }} />
              <div>
                <div className={styles.statValue}>${costStats?.avgCostPerCall.toFixed(4) || '0.0000'}</div>
                <div className={styles.statLabel}>Ø Kosten pro Call</div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className={styles.chartCard}>
            <h3>📈 Kostenverlauf (30 Tage)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cost" stroke="#3b82f6" name="Kosten ($)" />
                <Line type="monotone" dataKey="calls" stroke="#10b981" name="API Calls" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Feature Breakdown */}
          <div className={styles.chartCard}>
            <h3>🎯 Kosten nach Features</h3>
            <div className={styles.chartsRow}>
              <ResponsiveContainer width="50%" height={300}>
                <PieChart>
                  <Pie
                    data={featureChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cost"
                  >
                    {featureChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="50%" height={300}>
                <BarChart data={featureChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" fill="#3b82f6" name="Kosten ($)" />
                  <Bar dataKey="calls" fill="#10b981" name="Calls" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* System Overview Tab */}
      {activeTab === 'system' && (
        <div className={styles.tabContent}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <Users className={styles.statIcon} style={{ color: '#3b82f6' }} />
              <div>
                <div className={styles.statValue}>{systemStats?.totalUsers.toLocaleString() || '0'}</div>
                <div className={styles.statLabel}>Registrierte Benutzer</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <FileText className={styles.statIcon} style={{ color: '#10b981' }} />
              <div>
                <div className={styles.statValue}>{systemStats?.totalContracts.toLocaleString() || '0'}</div>
                <div className={styles.statLabel}>Hochgeladene Verträge</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <Activity className={styles.statIcon} style={{ color: '#f59e0b' }} />
              <div>
                <div className={styles.statValue}>{systemStats?.totalAnalysesToday.toLocaleString() || '0'}</div>
                <div className={styles.statLabel}>Analysen heute</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <TrendingUp className={styles.statIcon} style={{ color: '#8b5cf6' }} />
              <div>
                <div className={styles.statValue}>{systemStats?.totalAPICalls.toLocaleString() || '0'}</div>
                <div className={styles.statLabel}>API Calls (geschätzt)</div>
              </div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <AlertCircle size={24} style={{ color: '#3b82f6' }} />
            <div>
              <h3>System-Informationen</h3>
              <p>Diese Statistiken werden in Echtzeit aus der Datenbank geladen.</p>
              <p><strong>Letzte Aktualisierung:</strong> {new Date().toLocaleString('de-DE')}</p>
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className={styles.tabContent}>
          <div className={styles.userControls}>
            <h2>👥 Benutzerverwaltung</h2>
            <div className={styles.filterButtons}>
              <button
                className={`${styles.filterBtn} ${userFilter === 'all' ? styles.active : ''}`}
                onClick={() => setUserFilter('all')}
              >
                Alle ({users.length})
              </button>
              <button
                className={`${styles.filterBtn} ${userFilter === 'admin' ? styles.active : ''}`}
                onClick={() => setUserFilter('admin')}
              >
                Admins ({users.filter(u => u.role === 'admin').length})
              </button>
              <button
                className={`${styles.filterBtn} ${userFilter === 'user' ? styles.active : ''}`}
                onClick={() => setUserFilter('user')}
              >
                Users ({users.filter(u => u.role === 'user').length})
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rolle</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Verifiziert</th>
                  <th>Analysen</th>
                  <th>Registriert</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user._id}>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.badge} ${user.role === 'admin' ? styles.adminBadge : styles.userBadge}`}>
                        {user.role === 'admin' ? '🔐 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.planBadge}>
                        {user.subscriptionPlan || 'free'}
                      </span>
                    </td>
                    <td>
                      {user.subscriptionStatus === 'active' ? (
                        <CheckCircle size={16} style={{ color: '#10b981' }} />
                      ) : (
                        <Clock size={16} style={{ color: '#6b7280' }} />
                      )}
                    </td>
                    <td>
                      {user.verified ? (
                        <CheckCircle size={16} style={{ color: '#10b981' }} />
                      ) : (
                        <Clock size={16} style={{ color: '#f59e0b' }} />
                      )}
                    </td>
                    <td>{user.analysisCount || 0}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className={styles.emptyState}>
              <Users size={64} style={{ color: '#9ca3af' }} />
              <p>Keine Benutzer gefunden</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;

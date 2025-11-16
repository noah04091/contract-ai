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

interface CostEntry {
  _id: string;
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  endpoint: string;
  userId?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'costs' | 'system' | 'users'>('costs');
  const [users, setUsers] = useState<User[]>([]);
  const [costData, setCostData] = useState<CostEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/auth/users', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Benutzerdaten');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Fehler beim Laden der Benutzerdaten');
      }
    };

    fetchUsers();
  }, []);

  // Fetch Cost Data (Mock for now - would come from MongoDB)
  useEffect(() => {
    // TODO: Implement actual cost tracking endpoint
    // For now, using mock data
    const mockCostData: CostEntry[] = [];
    setCostData(mockCostData);
    setIsLoading(false);
  }, []);

  // Calculate Statistics
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.subscriptionPlan === 'premium').length;
  const businessUsers = users.filter(u => u.subscriptionPlan === 'business').length;
  const freeUsers = users.filter(u => u.subscriptionPlan === 'free').length;
  const activeSubscriptions = users.filter(u => u.subscriptionActive).length;
  const verifiedUsers = users.filter(u => u.verified).length;

  const totalAnalyses = users.reduce((sum, u) => sum + (u.analysisCount || 0), 0);
  const totalOptimizations = users.reduce((sum, u) => sum + (u.optimizationCount || 0), 0);

  const totalCost = costData.reduce((sum, entry) => sum + entry.estimatedCost, 0);

  // Prepare Chart Data
  const planDistribution = [
    { name: 'Free', value: freeUsers, color: '#94a3b8' },
    { name: 'Business', value: businessUsers, color: '#3b82f6' },
    { name: 'Premium', value: premiumUsers, color: '#10b981' }
  ];

  const dailyCosts = costData.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('de-DE');
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += entry.estimatedCost;
    return acc;
  }, {} as Record<string, number>);

  const dailyCostData = Object.entries(dailyCosts).map(([date, cost]) => ({
    date,
    cost: parseFloat(cost.toFixed(2))
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
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <DollarSign />
                </div>
                <div className={styles.statContent}>
                  <h3>Gesamtkosten (Monat)</h3>
                  <p className={styles.statValue}>${totalCost.toFixed(2)}</p>
                  <span className={styles.statSubtext}>OpenAI API Kosten</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp />
                </div>
                <div className={styles.statContent}>
                  <h3>Analysen (Gesamt)</h3>
                  <p className={styles.statValue}>{totalAnalyses}</p>
                  <span className={styles.statSubtext}>Alle Nutzer</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Zap />
                </div>
                <div className={styles.statContent}>
                  <h3>Optimierungen</h3>
                  <p className={styles.statValue}>{totalOptimizations}</p>
                  <span className={styles.statSubtext}>Alle Nutzer</span>
                </div>
              </div>
            </div>

            {dailyCostData.length > 0 ? (
              <div className={styles.chartCard}>
                <h3>📈 Tägliche Kosten (letzte 30 Tage)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyCostData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Database size={48} />
                <p>Keine Kostendaten verfügbar</p>
                <span>Cost Tracking muss erst im Backend implementiert werden</span>
              </div>
            )}
          </div>
        )}

        {/* 📊 SYSTEM OVERVIEW TAB */}
        {activeTab === 'system' && (
          <div className={styles.systemTab}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users />
                </div>
                <div className={styles.statContent}>
                  <h3>Gesamt User</h3>
                  <p className={styles.statValue}>{totalUsers}</p>
                  <span className={styles.statSubtext}>{verifiedUsers} verifiziert</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <CheckCircle />
                </div>
                <div className={styles.statContent}>
                  <h3>Aktive Abos</h3>
                  <p className={styles.statValue}>{activeSubscriptions}</p>
                  <span className={styles.statSubtext}>Premium & Business</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Server />
                </div>
                <div className={styles.statContent}>
                  <h3>System Status</h3>
                  <p className={styles.statValue}>Online</p>
                  <span className={styles.statSubtext}>MongoDB Connected</span>
                </div>
              </div>
            </div>

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
                <h3>📈 User Activity</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Analysen', value: totalAnalyses },
                    { name: 'Optimierungen', value: totalOptimizations }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 👥 USER MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className={styles.usersTab}>
            <div className={styles.tableHeader}>
              <h3>👥 Alle Benutzer ({totalUsers})</h3>
              <div className={styles.tableFilters}>
                <span>{premiumUsers} Premium</span>
                <span>{businessUsers} Business</span>
                <span>{freeUsers} Free</span>
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

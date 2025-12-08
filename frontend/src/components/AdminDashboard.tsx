// frontend/src/components/AdminDashboard.tsx
// Admin Dashboard Component - Professional Edition

import { useState, useEffect, useMemo } from 'react';
import {
  Euro,
  TrendingUp,
  Users,
  Activity,
  Server,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Gift,
  Star,
  MessageSquare,
  Clock,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  UserX,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Edit3,
  RotateCcw,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Ban,
  Download
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

// USD to EUR conversion rate (approximate)
const USD_TO_EUR = 0.92;

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
  role?: string;
  betaTester?: boolean;
  suspended?: boolean;
  suspendReason?: string;
  lastLoginAt?: string;
}

interface BetaTester {
  _id: string;
  email: string;
  verified: boolean;
  betaRegisteredAt: string;
  betaExpiresAt: string;
  betaReminderSent: boolean;
  betaReminderSentAt?: string;
  analysisCount: number;
  optimizationCount: number;
  hasFeedback: boolean;
  feedbackRating: number | null;
  feedbackDate: string | null;
}

interface BetaFeedback {
  _id: string;
  name: string;
  email: string;
  rating: number;
  improvements: string;
  wouldPay: string;
  testimonial: string;
  createdAt: string;
}

interface BetaStats {
  overview: {
    totalBetaTesters: number;
    verifiedBetaTesters: number;
    pendingVerification: number;
    remindersSent: number;
    totalFeedbacks: number;
    feedbackRate: number;
  };
  feedback: {
    total: number;
    avgRating: number;
    ratingDistribution: Array<{ stars: number; count: number }>;
    paymentWillingness: Array<{ answer: string; count: number }>;
    withTestimonial: number;
  };
  engagement: {
    engaged: number;
    engagementRate: number;
    expiringSoon: number;
    expired: number;
  };
  betaTesters: BetaTester[];
  recentFeedbacks: BetaFeedback[];
}

// Deleted Account Interface
interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
  ip?: string;
  timestamp?: string;
}

interface DeletedAccount {
  _id: string;
  email: string;
  subscriptionPlan: string;
  betaTester: boolean;
  analysisCount: number;
  contractsDeleted: number;
  accountCreatedAt: string;
  accountDeletedAt: string;
  accountAgeInDays: number | null;
  registrationDevice: DeviceInfo | null;
  lastLoginDevice: DeviceInfo | null;
  deletionDevice: DeviceInfo | null;
  deletedBy: 'user' | 'admin';
  deletedByAdmin?: string;
  verified: boolean;
}

interface DeletedAccountsStats {
  stats: {
    total: number;
    deletedByUser: number;
    deletedByAdmin: number;
    last30Days: number;
    avgAccountAgeDays: number;
    deviceBreakdown: Array<{ device: string; count: number }>;
    planBreakdown: Array<{ plan: string; count: number }>;
  };
  accounts: DeletedAccount[];
}

// Detailed User Profile Interface
interface UserDetails {
  _id: string;
  email: string;
  role: string;
  verified: boolean;
  suspended: boolean;
  suspendReason: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionActive: boolean;
  isPremium: boolean;
  betaTester: boolean;
  betaExpiresAt: string | null;
  analysisCount: number;
  optimizationCount: number;
  contractCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  registrationDevice: DeviceInfo | null;
  lastLoginDevice: DeviceInfo | null;
  lastPlanChange: {
    from: string;
    to: string;
    changedAt: string;
    changedBy: string;
  } | null;
  costThisMonth: {
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
  };
}

// Activity Log Interface
interface ActivityLog {
  _id: string;
  type: string;
  userId: string | null;
  userEmail: string | null;
  description: string;
  details: Record<string, unknown>;
  metadata: {
    ip: string | null;
    userAgent: string | null;
    source: string;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  createdAt: string;
}

interface ActivityLogData {
  activities: ActivityLog[];
  stats: {
    totalActivities: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    timeRange: string;
  };
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

// Helper function to convert USD to EUR
const toEuro = (usd: number): number => usd * USD_TO_EUR;

// Format Euro currency
const formatEuro = (amount: number, decimals = 2): string => {
  return `${amount.toFixed(decimals).replace('.', ',')} €`;
};

// Helper to get device icon
const getDeviceIcon = (device: string | undefined) => {
  if (!device) return <Monitor size={16} />;
  const d = device.toLowerCase();
  if (d.includes('iphone') || d.includes('android handy') || d.includes('handy')) return <Smartphone size={16} />;
  if (d.includes('ipad') || d.includes('tablet')) return <Tablet size={16} />;
  return <Monitor size={16} />;
};

// Helper to format activity type
const formatActivityType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'user_registered': 'Registrierung',
    'user_verified': 'Verifiziert',
    'user_login': 'Login',
    'user_deleted': 'Gelöscht',
    'user_suspended': 'Gesperrt',
    'user_unsuspended': 'Entsperrt',
    'plan_changed': 'Plan geändert',
    'subscription_activated': 'Abo aktiviert',
    'subscription_cancelled': 'Abo gekündigt',
    'contract_analyzed': 'Analyse',
    'contract_optimized': 'Optimierung',
    'contract_generated': 'Generiert',
    'contract_deleted': 'Vertrag gelöscht',
    'api_limit_reached': 'API-Limit',
    'error_critical': 'Kritisch',
    'admin_action': 'Admin-Aktion',
    'system_event': 'System'
  };
  return typeMap[type] || type;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'costs' | 'system' | 'users' | 'beta' | 'deleted' | 'activity' | 'settings'>('costs');
  const [users, setUsers] = useState<User[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [betaStats, setBetaStats] = useState<BetaStats | null>(null);
  const [deletedAccountsData, setDeletedAccountsData] = useState<DeletedAccountsStats | null>(null);
  const [activityLogData, setActivityLogData] = useState<ActivityLogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortField, setSortField] = useState<'email' | 'createdAt' | 'analysisCount'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; userId?: string; email?: string; bulk?: boolean }>({ show: false });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User Action Modal State
  const [userActionModal, setUserActionModal] = useState<{
    show: boolean;
    user: User | null;
    action: 'plan' | 'reset' | 'verify' | 'suspend' | 'password' | null;
  }>({ show: false, user: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [newPlan, setNewPlan] = useState<string>('free');

  // User Detail Modal State
  const [userDetailModal, setUserDetailModal] = useState<{
    show: boolean;
    user: UserDetails | null;
    loading: boolean;
  }>({ show: false, user: null, loading: false });
  const [suspendReason, setSuspendReason] = useState<string>('');

  // Fetch Admin Statistics
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      // Fetch beta stats
      const betaResponse = await fetch('/api/admin/beta-stats', {
        credentials: 'include'
      });

      if (betaResponse.ok) {
        const betaData = await betaResponse.json();
        setBetaStats(betaData);
      }

      // Fetch deleted accounts
      const deletedResponse = await fetch('/api/admin/deleted-accounts', {
        credentials: 'include'
      });

      if (deletedResponse.ok) {
        const deletedData = await deletedResponse.json();
        setDeletedAccountsData(deletedData);
      }

      // Fetch activity log
      const activityResponse = await fetch('/api/admin/activity-log?limit=100', {
        credentials: 'include'
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityLogData(activityData);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Fehler beim Laden der Admin-Daten');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.email.toLowerCase().includes(query)
      );
    }

    // Plan filter
    if (filterPlan !== 'all') {
      result = result.filter(user => user.subscriptionPlan === filterPlan);
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'verified') {
        result = result.filter(user => user.verified === true);
      } else if (filterStatus === 'unverified') {
        result = result.filter(user => user.verified === false);
      } else if (filterStatus === 'active') {
        result = result.filter(user => user.subscriptionActive === true);
      } else if (filterStatus === 'beta') {
        result = result.filter(user => user.betaTester === true);
      } else if (filterStatus === 'suspended') {
        result = result.filter(user => user.suspended === true);
      }
    }

    // Date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(user => new Date(user.createdAt) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(user => new Date(user.createdAt) <= toDate);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === 'email') {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (sortField === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = a.analysisCount || 0;
        bVal = b.analysisCount || 0;
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return result;
  }, [users, searchQuery, filterPlan, filterStatus, filterDateFrom, filterDateTo, sortField, sortDirection]);

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Select all filtered users (except admins)
  const selectAllUsers = () => {
    const selectableUsers = filteredUsers.filter(u => u.role !== 'admin');
    if (selectedUsers.size === selectableUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(selectableUsers.map(u => u._id)));
    }
  };

  // Delete single user
  const deleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        setSuccessMessage(data.message);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Fehler beim Löschen des Benutzers');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation({ show: false });
    }
  };

  // Bulk delete users
  const bulkDeleteUsers = async () => {
    if (selectedUsers.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: Array.from(selectedUsers) })
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => prev.filter(u => !selectedUsers.has(u._id)));
        setSelectedUsers(new Set());
        setSuccessMessage(data.message);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh stats
        fetchData();
      } else {
        setError(data.message);
      }
    } catch {
      setError('Fehler beim Löschen der Benutzer');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation({ show: false });
    }
  };

  // ========================================
  // USER ACTION FUNCTIONS
  // ========================================

  // Open user action modal
  const openUserAction = (user: User, action: 'plan' | 'reset' | 'verify' | 'suspend' | 'password') => {
    setUserActionModal({ show: true, user, action });
    if (action === 'plan') {
      setNewPlan(user.subscriptionPlan || 'free');
    }
    if (action === 'suspend') {
      setSuspendReason('');
    }
  };

  // Close user action modal
  const closeUserAction = () => {
    setUserActionModal({ show: false, user: null, action: null });
    setNewPlan('free');
    setSuspendReason('');
  };

  // Execute user action
  const executeUserAction = async () => {
    if (!userActionModal.user || !userActionModal.action) return;

    setActionLoading(true);
    const userId = userActionModal.user._id;
    const userEmail = userActionModal.user.email;

    try {
      let response;
      let endpoint = '';
      let method = 'PUT';
      let body: Record<string, unknown> = {};

      switch (userActionModal.action) {
        case 'plan':
          endpoint = `/api/admin/users/${userId}/plan`;
          body = { plan: newPlan };
          break;
        case 'reset':
          endpoint = `/api/admin/users/${userId}/reset-analysis`;
          break;
        case 'verify':
          endpoint = `/api/admin/users/${userId}/verify`;
          break;
        case 'suspend':
          endpoint = `/api/admin/users/${userId}/suspend`;
          body = {
            suspended: !userActionModal.user.suspended,
            reason: suspendReason || undefined
          };
          break;
        case 'password':
          endpoint = `/api/admin/users/${userId}/send-reset`;
          method = 'POST';
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      const data = await response.json();

      if (data.success) {
        // Update local user state
        setUsers(prev => prev.map(u => {
          if (u._id !== userId) return u;

          switch (userActionModal.action) {
            case 'plan':
              return {
                ...u,
                subscriptionPlan: newPlan,
                subscriptionActive: newPlan !== 'free',
                subscriptionStatus: newPlan === 'free' ? 'inactive' : 'active'
              };
            case 'reset':
              return { ...u, analysisCount: 0, optimizationCount: 0 };
            case 'verify':
              return { ...u, verified: true };
            case 'suspend':
              return {
                ...u,
                suspended: !u.suspended,
                suspendReason: !u.suspended ? (suspendReason || 'Kein Grund') : undefined
              };
            default:
              return u;
          }
        }));

        setSuccessMessage(data.message);
        setTimeout(() => setSuccessMessage(null), 4000);
        closeUserAction();

        // Refresh data for stats update
        if (userActionModal.action === 'plan') {
          fetchData();
        }
      } else {
        setError(data.message);
      }
    } catch {
      setError(`Fehler bei Aktion für ${userEmail}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Sort handler
  const handleSort = (field: 'email' | 'createdAt' | 'analysisCount') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ========================================
  // EXPORT FUNCTIONS
  // ========================================

  // Helper: Convert data to CSV string
  const convertToCSV = (data: Record<string, unknown>[], headers: { key: string; label: string }[]): string => {
    const headerRow = headers.map(h => `"${h.label}"`).join(';');
    const dataRows = data.map(row => {
      return headers.map(h => {
        const value = row[h.key];
        if (value === null || value === undefined) return '""';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(';');
    });
    return [headerRow, ...dataRows].join('\n');
  };

  // Helper: Trigger download
  const downloadCSV = (csvContent: string, filename: string) => {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export: User List
  const exportUserList = () => {
    const headers = [
      { key: 'email', label: 'E-Mail' },
      { key: 'subscriptionPlan', label: 'Plan' },
      { key: 'subscriptionActive', label: 'Abo Aktiv' },
      { key: 'verified', label: 'Verifiziert' },
      { key: 'suspended', label: 'Gesperrt' },
      { key: 'analysisCount', label: 'Analysen' },
      { key: 'optimizationCount', label: 'Optimierungen' },
      { key: 'betaTester', label: 'Beta-Tester' },
      { key: 'role', label: 'Rolle' },
      { key: 'createdAt', label: 'Registriert am' },
      { key: 'lastLoginAt', label: 'Letzter Login' }
    ];

    const exportData = filteredUsers.map(user => ({
      ...user,
      subscriptionActive: user.subscriptionActive ? 'Ja' : 'Nein',
      verified: user.verified ? 'Ja' : 'Nein',
      suspended: user.suspended ? 'Ja' : 'Nein',
      betaTester: user.betaTester ? 'Ja' : 'Nein',
      role: user.role || 'user',
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '',
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('de-DE') : 'Nie'
    }));

    const csv = convertToCSV(exportData, headers);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `contract-ai-users-${date}.csv`);
    setSuccessMessage(`${filteredUsers.length} Benutzer exportiert`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Export: Cost Report
  const exportCostReport = () => {
    if (!adminStats?.costs.topUsers) {
      setError('Keine Kostendaten verfügbar');
      return;
    }

    const headers = [
      { key: 'email', label: 'E-Mail' },
      { key: 'plan', label: 'Plan' },
      { key: 'totalCostEUR', label: 'Kosten (EUR)' },
      { key: 'totalCalls', label: 'API Calls' },
      { key: 'totalTokens', label: 'Tokens' }
    ];

    const exportData = adminStats.costs.topUsers.map(user => ({
      email: user.email,
      plan: user.plan,
      totalCostEUR: (user.totalCost * USD_TO_EUR).toFixed(2).replace('.', ','),
      totalCalls: user.totalCalls,
      totalTokens: user.totalTokens
    }));

    // Add summary row
    const totalCost = adminStats.costs.month.total * USD_TO_EUR;
    const summaryData = [
      ...exportData,
      {
        email: '--- GESAMT ---',
        plan: '',
        totalCostEUR: totalCost.toFixed(2).replace('.', ','),
        totalCalls: adminStats.costs.month.calls,
        totalTokens: adminStats.costs.month.tokens
      }
    ];

    const csv = convertToCSV(summaryData, headers);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `contract-ai-kosten-${date}.csv`);
    setSuccessMessage('Kosten-Report exportiert');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Export: Deleted Accounts
  const exportDeletedAccounts = () => {
    if (!deletedAccountsData?.accounts) {
      setError('Keine gelöschten Accounts verfügbar');
      return;
    }

    const headers = [
      { key: 'email', label: 'E-Mail' },
      { key: 'subscriptionPlan', label: 'Plan' },
      { key: 'betaTester', label: 'Beta-Tester' },
      { key: 'analysisCount', label: 'Analysen' },
      { key: 'contractsDeleted', label: 'Verträge gelöscht' },
      { key: 'accountCreatedAt', label: 'Registriert am' },
      { key: 'accountDeletedAt', label: 'Gelöscht am' },
      { key: 'accountAgeInDays', label: 'Lebensdauer (Tage)' },
      { key: 'deletedBy', label: 'Gelöscht von' },
      { key: 'registrationDevice', label: 'Registrierungs-Gerät' },
      { key: 'verified', label: 'War verifiziert' }
    ];

    const exportData = deletedAccountsData.accounts.map(acc => ({
      email: acc.email,
      subscriptionPlan: acc.subscriptionPlan,
      betaTester: acc.betaTester ? 'Ja' : 'Nein',
      analysisCount: acc.analysisCount,
      contractsDeleted: acc.contractsDeleted,
      accountCreatedAt: acc.accountCreatedAt ? new Date(acc.accountCreatedAt).toLocaleDateString('de-DE') : '',
      accountDeletedAt: acc.accountDeletedAt ? new Date(acc.accountDeletedAt).toLocaleDateString('de-DE') : '',
      accountAgeInDays: acc.accountAgeInDays ?? 'Unbekannt',
      deletedBy: acc.deletedBy === 'user' ? 'Selbst' : `Admin (${acc.deletedByAdmin || ''})`,
      registrationDevice: acc.registrationDevice?.device || 'Unbekannt',
      verified: acc.verified ? 'Ja' : 'Nein'
    }));

    const csv = convertToCSV(exportData, headers);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `contract-ai-geloeschte-accounts-${date}.csv`);
    setSuccessMessage(`${deletedAccountsData.accounts.length} gelöschte Accounts exportiert`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Fetch User Details for Profile Modal
  const fetchUserDetails = async (userId: string) => {
    setUserDetailModal({ show: true, user: null, loading: true });

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der User-Details');
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUserDetailModal({ show: true, user: data.user, loading: false });
      } else {
        throw new Error(data.message || 'User nicht gefunden');
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Fehler beim Laden der User-Details');
      setUserDetailModal({ show: false, user: null, loading: false });
    }
  };

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

  // Format cost trend data for charts (converted to EUR)
  const dailyCostData = stats.costs.trend.map(day => ({
    date: new Date(day.date).toLocaleDateString('de-DE'),
    cost: parseFloat(toEuro(day.cost).toFixed(2)),
    calls: day.calls
  }));

  // Format feature cost breakdown (converted to EUR)
  const featureCostData = Object.entries(stats.costs.month.byFeature).map(([feature, data]) => ({
    name: feature,
    cost: parseFloat(toEuro(data.cost).toFixed(2)),
    calls: data.calls
  }));

  return (
    <div className={styles.adminContainer}>
      {/* Admin Header */}
      <div className={styles.adminHeader}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Vollständige Systemübersicht und Verwaltung</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshButton} onClick={fetchData} disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? styles.spinning : ''} />
            Aktualisieren
          </button>
          <div className={styles.adminBadge}>
            <AlertCircle size={20} />
            <span>Administrator</span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={styles.successBanner}>
          <CheckCircle size={20} />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}><X size={16} /></button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorBanner}>
          <XCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={24} className={styles.warningIcon} />
              <h3>Benutzer löschen?</h3>
            </div>
            <div className={styles.modalBody}>
              {deleteConfirmation.bulk ? (
                <p>Möchten Sie wirklich <strong>{selectedUsers.size} Benutzer</strong> unwiderruflich löschen? Alle zugehörigen Verträge und Daten werden ebenfalls gelöscht.</p>
              ) : (
                <p>Möchten Sie <strong>{deleteConfirmation.email}</strong> wirklich unwiderruflich löschen? Alle zugehörigen Verträge und Daten werden ebenfalls gelöscht.</p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setDeleteConfirmation({ show: false })}
                disabled={isDeleting}
              >
                Abbrechen
              </button>
              <button
                className={styles.deleteButton}
                onClick={() => deleteConfirmation.bulk ? bulkDeleteUsers() : deleteUser(deleteConfirmation.userId!)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Löschen...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Endgültig löschen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Action Modal */}
      {userActionModal.show && userActionModal.user && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              {userActionModal.action === 'plan' && <Edit3 size={24} className={styles.actionIcon} />}
              {userActionModal.action === 'reset' && <RotateCcw size={24} className={styles.actionIcon} />}
              {userActionModal.action === 'verify' && <ShieldCheck size={24} className={styles.verifyIcon} />}
              {userActionModal.action === 'suspend' && (
                userActionModal.user.suspended
                  ? <Unlock size={24} className={styles.verifyIcon} />
                  : <Ban size={24} className={styles.warningIcon} />
              )}
              {userActionModal.action === 'password' && <Key size={24} className={styles.actionIcon} />}
              <h3>
                {userActionModal.action === 'plan' && 'Plan ändern'}
                {userActionModal.action === 'reset' && 'Zähler zurücksetzen'}
                {userActionModal.action === 'verify' && 'Benutzer verifizieren'}
                {userActionModal.action === 'suspend' && (userActionModal.user.suspended ? 'Benutzer entsperren' : 'Benutzer sperren')}
                {userActionModal.action === 'password' && 'Passwort-Reset senden'}
              </h3>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalUserInfo}>
                <strong>Benutzer:</strong> {userActionModal.user.email}
              </p>

              {/* Plan Selection */}
              {userActionModal.action === 'plan' && (
                <div className={styles.formGroup}>
                  <label>Neuer Plan:</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className={styles.planSelect}
                  >
                    <option value="free">Free (Kostenlos)</option>
                    <option value="business">Business (19€/Monat)</option>
                    <option value="premium">Premium (39€/Monat)</option>
                    <option value="legendary">Legendary (Unlimitiert)</option>
                  </select>
                  <p className={styles.formHint}>
                    Aktueller Plan: <strong>{userActionModal.user.subscriptionPlan}</strong>
                  </p>
                </div>
              )}

              {/* Reset Confirmation */}
              {userActionModal.action === 'reset' && (
                <div className={styles.confirmInfo}>
                  <p>Dies setzt den Analyse-Zähler und Optimierungs-Zähler auf 0 zurück.</p>
                  <p className={styles.currentValue}>
                    Aktuell: <strong>{userActionModal.user.analysisCount}</strong> Analysen
                  </p>
                </div>
              )}

              {/* Verify Confirmation */}
              {userActionModal.action === 'verify' && (
                <div className={styles.confirmInfo}>
                  {userActionModal.user.verified ? (
                    <p className={styles.alreadyDone}>Dieser Benutzer ist bereits verifiziert.</p>
                  ) : (
                    <p>Der Benutzer wird manuell verifiziert und kann sich danach einloggen.</p>
                  )}
                </div>
              )}

              {/* Suspend with Reason */}
              {userActionModal.action === 'suspend' && (
                <div className={styles.formGroup}>
                  {!userActionModal.user.suspended ? (
                    <>
                      <label>Sperrgrund (optional):</label>
                      <input
                        type="text"
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="z.B. Verstoß gegen Nutzungsbedingungen"
                        className={styles.reasonInput}
                      />
                      <p className={styles.formHint}>
                        Der Benutzer kann sich nach der Sperrung nicht mehr einloggen.
                      </p>
                    </>
                  ) : (
                    <div className={styles.confirmInfo}>
                      <p>Der Benutzer wird entsperrt und kann sich wieder einloggen.</p>
                      {userActionModal.user.suspendReason && (
                        <p className={styles.currentValue}>
                          Sperrgrund war: <strong>{userActionModal.user.suspendReason}</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Password Reset Confirmation */}
              {userActionModal.action === 'password' && (
                <div className={styles.confirmInfo}>
                  <p>Es wird eine E-Mail mit einem Passwort-Reset-Link an den Benutzer gesendet.</p>
                  <p className={styles.formHint}>Der Link ist 1 Stunde gültig.</p>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={closeUserAction}
                disabled={actionLoading}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.actionButton} ${
                  userActionModal.action === 'suspend' && !userActionModal.user.suspended
                    ? styles.dangerButton
                    : styles.primaryButton
                }`}
                onClick={executeUserAction}
                disabled={actionLoading || (userActionModal.action === 'verify' && userActionModal.user.verified)}
              >
                {actionLoading ? (
                  <>
                    <RefreshCw size={16} className={styles.spinning} />
                    Wird ausgeführt...
                  </>
                ) : (
                  <>
                    {userActionModal.action === 'plan' && 'Plan ändern'}
                    {userActionModal.action === 'reset' && 'Zurücksetzen'}
                    {userActionModal.action === 'verify' && 'Verifizieren'}
                    {userActionModal.action === 'suspend' && (userActionModal.user.suspended ? 'Entsperren' : 'Sperren')}
                    {userActionModal.action === 'password' && 'E-Mail senden'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'costs' ? styles.active : ''}`}
          onClick={() => setActiveTab('costs')}
        >
          <Euro size={20} />
          <span>Kosten-Tracking</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'system' ? styles.active : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <Activity size={20} />
          <span>System-Übersicht</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          <span>User-Management</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'beta' ? styles.active : ''}`}
          onClick={() => setActiveTab('beta')}
        >
          <Gift size={20} />
          <span>Beta-Programm</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'deleted' ? styles.active : ''}`}
          onClick={() => setActiveTab('deleted')}
        >
          <UserX size={20} />
          <span>Gelöschte Accounts</span>
          {deletedAccountsData && deletedAccountsData.stats.total > 0 && (
            <span className={styles.tabBadge}>{deletedAccountsData.stats.total}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'activity' ? styles.active : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Clock size={20} />
          <span>Activity Log</span>
          {activityLogData && activityLogData.stats.totalActivities > 0 && (
            <span className={styles.tabBadge}>{activityLogData.stats.totalActivities}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Server size={20} />
          <span>Einstellungen</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* COST TRACKING TAB */}
        {activeTab === 'costs' && (
          <div className={styles.costsTab}>
            {/* Export Button */}
            <div className={styles.tabHeader}>
              <h2>Kosten-Übersicht</h2>
              <button className={styles.exportButton} onClick={exportCostReport}>
                <Download size={16} />
                CSV Export
              </button>
            </div>

            {/* Daily Budget Alert */}
            {stats.costs.today.percentUsed > 80 && (
              <div className={`${styles.alertBanner} ${stats.costs.today.isLimitReached ? styles.danger : styles.warning}`}>
                <AlertCircle size={20} />
                <span>
                  {stats.costs.today.isLimitReached
                    ? `Tageslimit erreicht! ${formatEuro(toEuro(stats.costs.today.spent))} / ${formatEuro(toEuro(stats.costs.today.limit))}`
                    : `${stats.costs.today.percentUsed.toFixed(0)}% des Tageslimits verbraucht (${formatEuro(toEuro(stats.costs.today.spent))} / ${formatEuro(toEuro(stats.costs.today.limit))})`
                  }
                </span>
              </div>
            )}

            {/* Cost Overview Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Euro />
                </div>
                <div className={styles.statContent}>
                  <h3>Kosten Heute</h3>
                  <p className={styles.statValue}>{formatEuro(toEuro(stats.costs.today.spent))}</p>
                  <span className={styles.statSubtext}>
                    Verbleibend: {formatEuro(toEuro(stats.costs.today.remaining))}
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp />
                </div>
                <div className={styles.statContent}>
                  <h3>Kosten Monat</h3>
                  <p className={styles.statValue}>{formatEuro(toEuro(stats.costs.month.total))}</p>
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
                    ~{formatEuro(toEuro(stats.costs.month.tokens * 0.00001))} equivalent
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity />
                </div>
                <div className={styles.statContent}>
                  <h3>Kosten/Call</h3>
                  <p className={styles.statValue}>
                    {stats.costs.month.calls > 0
                      ? formatEuro(toEuro(stats.costs.month.total / stats.costs.month.calls), 4)
                      : '0,00 €'}
                  </p>
                  <span className={styles.statSubtext}>Durchschnitt</span>
                </div>
              </div>
            </div>

            {/* Cost Trend Chart */}
            {dailyCostData.length > 0 && (
              <div className={styles.chartCard}>
                <h3>Tägliche Kosten (letzte 30 Tage)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyCostData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `${value} €`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'cost') return [`${value.toFixed(2).replace('.', ',')} €`, 'Kosten'];
                        if (name === 'calls') return [`${value} calls`, 'API Calls'];
                        return [value, name];
                      }}
                    />
                    <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} name="cost" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Feature Cost Breakdown */}
            {featureCostData.length > 0 && (
              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3>Kosten nach Feature</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={featureCostData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `${value} €`} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2).replace('.', ',')} €`, 'Kosten']} />
                      <Bar dataKey="cost" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartCard}>
                  <h3>API Calls nach Feature</h3>
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
                <h3>Top 10 teuerste User (aktueller Monat)</h3>
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
                        <td className={styles.costCell}>{formatEuro(toEuro(user.totalCost))}</td>
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

        {/* SYSTEM OVERVIEW TAB */}
        {activeTab === 'system' && (
          <div className={styles.systemTab}>
            {/* Revenue & Business Metrics */}
            <div className={styles.sectionHeader}>
              <h2>Revenue & Business Metriken</h2>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Euro />
                </div>
                <div className={styles.statContent}>
                  <h3>MRR (Monthly Recurring Revenue)</h3>
                  <p className={styles.statValue}>{formatEuro(stats.revenue.mrr, 0)}</p>
                  <span className={styles.statSubtext}>Pro Monat</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <TrendingUp />
                </div>
                <div className={styles.statContent}>
                  <h3>ARR (Annual Recurring Revenue)</h3>
                  <p className={styles.statValue}>{formatEuro(stats.revenue.arr, 0)}</p>
                  <span className={styles.statSubtext}>Pro Jahr</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users />
                </div>
                <div className={styles.statContent}>
                  <h3>ARPU (Avg Revenue per User)</h3>
                  <p className={styles.statValue}>{formatEuro(stats.revenue.arpu)}</p>
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
              <h2>User Metriken</h2>
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
              <h2>Usage Statistiken</h2>
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
                    {stats.usage.avgAnalysesPerUser.toFixed(1)} pro User
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
                <h3>Plan-Verteilung</h3>
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
                <h3>Revenue Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Business', revenue: stats.revenue.breakdown.business, users: stats.users.business },
                    { name: 'Premium', revenue: stats.revenue.breakdown.premium, users: stats.users.premium }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value} €`} />
                    <Tooltip formatter={(value: number, name: string) => {
                      if (name === 'revenue') return [`${value.toFixed(0)} €`, 'Revenue (MRR)'];
                      return [value, name];
                    }} />
                    <Bar dataKey="revenue" fill="#10b981" name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Most Active Users Table */}
            {stats.usage.mostActive.length > 0 && (
              <div className={styles.tableCard}>
                <h3>Top 10 aktivste User (nach Analysen)</h3>
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

        {/* USER MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className={styles.usersTab}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              {/* Search */}
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="E-Mail suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className={styles.clearSearch}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className={styles.filters}>
                <div className={styles.filterGroup}>
                  <Filter size={16} />
                  <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                  >
                    <option value="all">Alle Pläne</option>
                    <option value="free">Free</option>
                    <option value="business">Business</option>
                    <option value="premium">Premium</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Alle Status</option>
                    <option value="verified">Verifiziert</option>
                    <option value="unverified">Nicht verifiziert</option>
                    <option value="active">Aktives Abo</option>
                    <option value="beta">Beta-Tester</option>
                    <option value="suspended">Gesperrt</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className={styles.filterGroup}>
                  <Calendar size={16} />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    placeholder="Von"
                    className={styles.dateInput}
                  />
                  <span className={styles.dateSeparator}>–</span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    placeholder="Bis"
                    className={styles.dateInput}
                  />
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className={styles.quickFilters}>
                <button
                  className={styles.quickFilterBtn}
                  onClick={() => {
                    const today = new Date();
                    setFilterDateFrom(today.toISOString().split('T')[0]);
                    setFilterDateTo(today.toISOString().split('T')[0]);
                  }}
                >
                  Heute
                </button>
                <button
                  className={styles.quickFilterBtn}
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setFilterDateFrom(weekAgo.toISOString().split('T')[0]);
                    setFilterDateTo(today.toISOString().split('T')[0]);
                  }}
                >
                  Letzte 7 Tage
                </button>
                <button
                  className={styles.quickFilterBtn}
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    setFilterDateFrom(monthAgo.toISOString().split('T')[0]);
                    setFilterDateTo(today.toISOString().split('T')[0]);
                  }}
                >
                  Letzte 30 Tage
                </button>
                <button
                  className={styles.quickFilterBtn}
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterPlan('all');
                    setFilterStatus('all');
                    setSearchQuery('');
                  }}
                >
                  Filter zurücksetzen
                </button>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className={styles.bulkActions}>
                  <span className={styles.selectedCount}>
                    {selectedUsers.size} ausgewählt
                  </span>
                  <button
                    className={styles.bulkDeleteButton}
                    onClick={() => setDeleteConfirmation({ show: true, bulk: true })}
                  >
                    <Trash2 size={16} />
                    Ausgewählte löschen
                  </button>
                </div>
              )}

              {/* Export Button */}
              <button className={styles.exportButton} onClick={exportUserList}>
                <Download size={16} />
                CSV Export
              </button>
            </div>

            {/* Stats Row */}
            <div className={styles.userStatsRow}>
              <div className={styles.userStat}>
                <span className={styles.userStatValue}>{filteredUsers.length}</span>
                <span className={styles.userStatLabel}>Angezeigt</span>
              </div>
              <div className={styles.userStat}>
                <span className={styles.userStatValue}>{users.length}</span>
                <span className={styles.userStatLabel}>Gesamt</span>
              </div>
              <div className={styles.userStat}>
                <span className={`${styles.userStatValue} ${styles.premium}`}>{stats.users.premium}</span>
                <span className={styles.userStatLabel}>Premium</span>
              </div>
              <div className={styles.userStat}>
                <span className={`${styles.userStatValue} ${styles.business}`}>{stats.users.business}</span>
                <span className={styles.userStatLabel}>Business</span>
              </div>
              <div className={styles.userStat}>
                <span className={styles.userStatValue}>{stats.users.free}</span>
                <span className={styles.userStatLabel}>Free</span>
              </div>
            </div>

            {/* User Table */}
            <div className={styles.tableContainer}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <RefreshCw className={styles.spinner} size={32} />
                  <p>Lade Benutzerdaten...</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th className={styles.checkboxCol}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.filter(u => u.role !== 'admin').length && filteredUsers.length > 0}
                          onChange={selectAllUsers}
                        />
                      </th>
                      <th
                        className={styles.sortable}
                        onClick={() => handleSort('email')}
                      >
                        E-Mail
                        {sortField === 'email' && (
                          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th
                        className={styles.sortable}
                        onClick={() => handleSort('analysisCount')}
                      >
                        Analysen
                        {sortField === 'analysisCount' && (
                          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </th>
                      <th>Verifiziert</th>
                      <th
                        className={styles.sortable}
                        onClick={() => handleSort('createdAt')}
                      >
                        Erstellt
                        {sortField === 'createdAt' && (
                          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user._id} className={`${user.role === 'admin' ? styles.adminRow : ''} ${user.suspended ? styles.suspendedRow : ''}`}>
                        <td className={styles.checkboxCol}>
                          {user.role !== 'admin' && (
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user._id)}
                              onChange={() => toggleUserSelection(user._id)}
                            />
                          )}
                        </td>
                        <td className={styles.emailCell}>
                          <span
                            className={styles.clickableEmail}
                            onClick={() => fetchUserDetails(user._id)}
                            title="Klicken für Details"
                          >
                            {user.email}
                          </span>
                          {user.role === 'admin' && (
                            <span className={styles.adminTag}>Admin</span>
                          )}
                          {user.betaTester && (
                            <span className={styles.betaTag}>Beta</span>
                          )}
                          {user.suspended && (
                            <span className={styles.suspendedTag}>Gesperrt</span>
                          )}
                        </td>
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
                        <td>
                          {user.verified ? (
                            <CheckCircle size={18} className={styles.verifiedIcon} />
                          ) : (
                            <XCircle size={18} className={styles.unverifiedIcon} />
                          )}
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString('de-DE')}</td>
                        <td>
                          {user.role !== 'admin' && (
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.actionBtn}
                                onClick={() => openUserAction(user, 'plan')}
                                title="Plan ändern"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className={styles.actionBtn}
                                onClick={() => openUserAction(user, 'reset')}
                                title="Zähler zurücksetzen"
                              >
                                <RotateCcw size={14} />
                              </button>
                              {!user.verified && (
                                <button
                                  className={`${styles.actionBtn} ${styles.verifyBtn}`}
                                  onClick={() => openUserAction(user, 'verify')}
                                  title="Verifizieren"
                                >
                                  <ShieldCheck size={14} />
                                </button>
                              )}
                              <button
                                className={`${styles.actionBtn} ${user.suspended ? styles.unlockBtn : styles.suspendBtn}`}
                                onClick={() => openUserAction(user, 'suspend')}
                                title={user.suspended ? 'Entsperren' : 'Sperren'}
                              >
                                {user.suspended ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>
                              <button
                                className={styles.actionBtn}
                                onClick={() => openUserAction(user, 'password')}
                                title="Passwort-Reset senden"
                              >
                                <Key size={14} />
                              </button>
                              <button
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={() => setDeleteConfirmation({ show: true, userId: user._id, email: user.email })}
                                title="Löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <Users size={48} />
                  <p>Keine Benutzer gefunden</p>
                  <span>Versuche andere Filter oder Suchbegriffe</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BETA PROGRAM TAB */}
        {activeTab === 'beta' && (
          <div className={styles.betaTab}>
            {/* Beta Overview Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.betaIcon}`}>
                  <Gift />
                </div>
                <div className={styles.statContent}>
                  <h3>Beta-Tester Gesamt</h3>
                  <p className={styles.statValue}>{betaStats?.overview.totalBetaTesters || 0}</p>
                  <span className={styles.statSubtext}>
                    {betaStats?.overview.verifiedBetaTesters || 0} verifiziert
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <MessageSquare />
                </div>
                <div className={styles.statContent}>
                  <h3>Feedbacks erhalten</h3>
                  <p className={styles.statValue}>{betaStats?.feedback.total || 0}</p>
                  <span className={styles.statSubtext}>
                    {betaStats?.overview.feedbackRate || 0}% Feedback-Rate
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Star />
                </div>
                <div className={styles.statContent}>
                  <h3>Bewertung</h3>
                  <p className={styles.statValue}>
                    {betaStats?.feedback.avgRating.toFixed(1) || '0.0'}
                  </p>
                  <span className={styles.statSubtext}>
                    {betaStats?.feedback.withTestimonial || 0} Testimonials
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity />
                </div>
                <div className={styles.statContent}>
                  <h3>Engagement</h3>
                  <p className={styles.statValue}>
                    {betaStats?.engagement.engagementRate || 0}%
                  </p>
                  <span className={styles.statSubtext}>
                    {betaStats?.engagement.engaged || 0} aktive Tester
                  </span>
                </div>
              </div>
            </div>

            {/* Status Cards */}
            <div className={styles.betaStatusRow}>
              <div className={`${styles.statusCard} ${styles.pending}`}>
                <Clock size={24} />
                <div>
                  <h4>Ausstehende Verifizierung</h4>
                  <p>{betaStats?.overview.pendingVerification || 0}</p>
                </div>
              </div>

              <div className={`${styles.statusCard} ${styles.sent}`}>
                <Mail size={24} />
                <div>
                  <h4>Erinnerungen gesendet</h4>
                  <p>{betaStats?.overview.remindersSent || 0}</p>
                </div>
              </div>

              <div className={`${styles.statusCard} ${styles.warning}`}>
                <AlertCircle size={24} />
                <div>
                  <h4>Laufen bald ab</h4>
                  <p>{betaStats?.engagement.expiringSoon || 0}</p>
                </div>
              </div>

              <div className={`${styles.statusCard} ${styles.expired}`}>
                <XCircle size={24} />
                <div>
                  <h4>Abgelaufen</h4>
                  <p>{betaStats?.engagement.expired || 0}</p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            {betaStats && (
              <div className={styles.chartsRow}>
                {/* Rating Distribution */}
                <div className={styles.chartCard}>
                  <h3>Bewertungsverteilung</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={betaStats.feedback.ratingDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stars" tickFormatter={(v) => `${v} Sterne`} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${value} Bewertungen`, 'Anzahl']} />
                      <Bar dataKey="count" fill="#f7931e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Payment Willingness */}
                <div className={styles.chartCard}>
                  <h3>Zahlungsbereitschaft</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={betaStats.feedback.paymentWillingness.map(p => ({
                          name: p.answer === 'ja' ? 'Ja' : p.answer === 'vielleicht' ? 'Vielleicht' : 'Nein',
                          value: p.count,
                          color: p.answer === 'ja' ? '#10b981' : p.answer === 'vielleicht' ? '#f59e0b' : '#ef4444'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {betaStats.feedback.paymentWillingness.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.answer === 'ja' ? '#10b981' : entry.answer === 'vielleicht' ? '#f59e0b' : '#ef4444'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Beta Testers Table */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Beta-Tester ({betaStats?.betaTesters.length || 0})</h3>
                <a
                  href="https://www.contract-ai.de/beta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.betaLink}
                >
                  <ExternalLink size={16} />
                  Beta-Seite öffnen
                </a>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th>E-Mail</th>
                      <th>Status</th>
                      <th>Registriert</th>
                      <th>Läuft ab</th>
                      <th>Analysen</th>
                      <th>Feedback</th>
                      <th>Erinnerung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {betaStats?.betaTesters.map(tester => (
                      <tr key={tester._id}>
                        <td className={styles.emailCell}>{tester.email}</td>
                        <td>
                          {tester.verified ? (
                            <span className={`${styles.statusBadge} ${styles.active}`}>
                              <CheckCircle size={14} /> Verifiziert
                            </span>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles.inactive}`}>
                              <Clock size={14} /> Ausstehend
                            </span>
                          )}
                        </td>
                        <td>{new Date(tester.betaRegisteredAt).toLocaleDateString('de-DE')}</td>
                        <td>
                          {new Date(tester.betaExpiresAt) < new Date() ? (
                            <span className={styles.expiredBadge}>Abgelaufen</span>
                          ) : (
                            new Date(tester.betaExpiresAt).toLocaleDateString('de-DE')
                          )}
                        </td>
                        <td>{tester.analysisCount || 0}</td>
                        <td>
                          {tester.hasFeedback ? (
                            <span className={styles.feedbackBadge}>
                              {tester.feedbackRating}
                            </span>
                          ) : (
                            <span className={styles.noFeedbackBadge}>—</span>
                          )}
                        </td>
                        <td>
                          {tester.betaReminderSent ? (
                            <CheckCircle size={18} className={styles.verifiedIcon} />
                          ) : (
                            <span className={styles.noFeedbackBadge}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Feedbacks */}
            {betaStats && betaStats.recentFeedbacks.length > 0 && (
              <div className={styles.tableCard}>
                <h3>Letzte Feedbacks</h3>
                <div className={styles.feedbackList}>
                  {betaStats.recentFeedbacks.map(feedback => (
                    <div key={feedback._id} className={styles.feedbackItem}>
                      <div className={styles.feedbackHeader}>
                        <div className={styles.feedbackUser}>
                          <strong>{feedback.name}</strong>
                          <span>{feedback.email}</span>
                        </div>
                        <div className={styles.feedbackMeta}>
                          <span className={styles.feedbackRating}>
                            {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                          </span>
                          <span className={styles.feedbackDate}>
                            {new Date(feedback.createdAt).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>

                      <div className={styles.feedbackDetails}>
                        <div className={styles.feedbackWouldPay}>
                          <strong>Würde zahlen:</strong>
                          <span className={`${styles.payBadge} ${styles[feedback.wouldPay]}`}>
                            {feedback.wouldPay === 'ja' ? 'Ja' : feedback.wouldPay === 'vielleicht' ? 'Vielleicht' : 'Nein'}
                          </span>
                        </div>

                        {feedback.improvements && (
                          <div className={styles.feedbackText}>
                            <strong>Verbesserungsvorschläge:</strong>
                            <p>{feedback.improvements}</p>
                          </div>
                        )}

                        {feedback.testimonial && (
                          <div className={styles.feedbackTestimonial}>
                            <strong>Testimonial:</strong>
                            <blockquote>"{feedback.testimonial}"</blockquote>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DELETED ACCOUNTS TAB */}
        {activeTab === 'deleted' && (
          <div className={styles.deletedTab}>
            {/* Overview Stats */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.deletedIcon}`}>
                  <UserX />
                </div>
                <div className={styles.statContent}>
                  <h3>Gelöschte Accounts</h3>
                  <p className={styles.statValue}>{deletedAccountsData?.stats.total || 0}</p>
                  <span className={styles.statSubtext}>Gesamt</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Users />
                </div>
                <div className={styles.statContent}>
                  <h3>Selbst gelöscht</h3>
                  <p className={styles.statValue}>{deletedAccountsData?.stats.deletedByUser || 0}</p>
                  <span className={styles.statSubtext}>Durch User</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <AlertCircle />
                </div>
                <div className={styles.statContent}>
                  <h3>Admin gelöscht</h3>
                  <p className={styles.statValue}>{deletedAccountsData?.stats.deletedByAdmin || 0}</p>
                  <span className={styles.statSubtext}>Durch Admin</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Calendar />
                </div>
                <div className={styles.statContent}>
                  <h3>Letzte 30 Tage</h3>
                  <p className={styles.statValue}>{deletedAccountsData?.stats.last30Days || 0}</p>
                  <span className={styles.statSubtext}>
                    Ø {deletedAccountsData?.stats.avgAccountAgeDays || 0} Tage Lebensdauer
                  </span>
                </div>
              </div>
            </div>

            {/* Device Breakdown Chart */}
            {deletedAccountsData && deletedAccountsData.stats.deviceBreakdown.length > 0 && (
              <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                  <h3>Registrierungs-Geräte</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={deletedAccountsData.stats.deviceBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="device" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" name="Anzahl" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartCard}>
                  <h3>Plan bei Löschung</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={deletedAccountsData.stats.planBreakdown.map(p => ({
                          name: p.plan,
                          value: p.count,
                          color: p.plan === 'free' ? '#94a3b8' : p.plan === 'business' ? '#3b82f6' : '#10b981'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {deletedAccountsData.stats.planBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.plan === 'free' ? '#94a3b8' : entry.plan === 'business' ? '#3b82f6' : '#10b981'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Deleted Accounts Table */}
            <div className={styles.tableCard}>
              <div className={styles.tabHeader}>
                <h3>Gelöschte Accounts (letzte 100)</h3>
                <button
                  className={styles.exportButton}
                  onClick={exportDeletedAccounts}
                  title="Als CSV exportieren"
                >
                  📥 Export CSV
                </button>
              </div>
              <div className={styles.tableContainer}>
                {deletedAccountsData && deletedAccountsData.accounts.length > 0 ? (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>E-Mail</th>
                        <th>Plan</th>
                        <th>Registriert mit</th>
                        <th>Letzter Login</th>
                        <th>Gelöscht am</th>
                        <th>Gelöscht von</th>
                        <th>Lebensdauer</th>
                        <th>Analysen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedAccountsData.accounts.map(account => (
                        <tr key={account._id}>
                          <td className={styles.emailCell}>
                            {account.email}
                            {account.betaTester && (
                              <span className={styles.betaTag}>Beta</span>
                            )}
                          </td>
                          <td>
                            <span className={`${styles.planBadge} ${styles[account.subscriptionPlan]}`}>
                              {account.subscriptionPlan}
                            </span>
                          </td>
                          <td>
                            {account.registrationDevice ? (
                              <div className={styles.deviceInfo}>
                                {getDeviceIcon(account.registrationDevice.device)}
                                <span>{account.registrationDevice.device}</span>
                                <span className={styles.deviceDetail}>
                                  {account.registrationDevice.browser} / {account.registrationDevice.os}
                                </span>
                              </div>
                            ) : (
                              <span className={styles.noData}>—</span>
                            )}
                          </td>
                          <td>
                            {account.lastLoginDevice ? (
                              <div className={styles.deviceInfo}>
                                {getDeviceIcon(account.lastLoginDevice.device)}
                                <span>{account.lastLoginDevice.device}</span>
                              </div>
                            ) : (
                              <span className={styles.noData}>Nie eingeloggt</span>
                            )}
                          </td>
                          <td>
                            {new Date(account.accountDeletedAt).toLocaleDateString('de-DE')}
                            <span className={styles.timeDetail}>
                              {new Date(account.accountDeletedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td>
                            {account.deletedBy === 'user' ? (
                              <span className={styles.deletedByUser}>Selbst</span>
                            ) : (
                              <span className={styles.deletedByAdmin}>
                                Admin
                                {account.deletedByAdmin && (
                                  <span className={styles.adminEmail}>{account.deletedByAdmin}</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td>
                            {account.accountAgeInDays !== null ? (
                              <span>{account.accountAgeInDays} Tage</span>
                            ) : (
                              <span className={styles.noData}>—</span>
                            )}
                          </td>
                          <td>{account.analysisCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.emptyState}>
                    <UserX size={48} />
                    <p>Keine gelöschten Accounts</p>
                    <span>Bisher wurden keine Accounts gelöscht</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <div className={styles.activityTab}>
            {/* Activity Stats */}
            {activityLogData && (
              <div className={styles.activityStatsRow}>
                <div className={styles.activityStatCard}>
                  <Activity size={24} className={styles.activityIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{activityLogData.stats.totalActivities}</span>
                    <span className={styles.activityStatLabel}>Aktivitäten (24h)</span>
                  </div>
                </div>
                <div className={styles.activityStatCard}>
                  <CheckCircle size={24} className={styles.infoIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{activityLogData.stats.bySeverity.info || 0}</span>
                    <span className={styles.activityStatLabel}>Info</span>
                  </div>
                </div>
                <div className={styles.activityStatCard}>
                  <AlertTriangle size={24} className={styles.warningIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{activityLogData.stats.bySeverity.warning || 0}</span>
                    <span className={styles.activityStatLabel}>Warnungen</span>
                  </div>
                </div>
                <div className={styles.activityStatCard}>
                  <AlertCircle size={24} className={styles.errorIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{(activityLogData.stats.bySeverity.error || 0) + (activityLogData.stats.bySeverity.critical || 0)}</span>
                    <span className={styles.activityStatLabel}>Fehler</span>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Log Table */}
            <div className={styles.tableCard}>
              <div className={styles.tabHeader}>
                <h3>Aktivitäts-Protokoll</h3>
                <button
                  className={styles.exportButton}
                  onClick={fetchData}
                  title="Aktualisieren"
                >
                  <RefreshCw size={16} />
                  Aktualisieren
                </button>
              </div>
              <div className={styles.tableContainer}>
                {activityLogData && activityLogData.activities.length > 0 ? (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Zeitpunkt</th>
                        <th>Typ</th>
                        <th>Beschreibung</th>
                        <th>User</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogData.activities.map(activity => (
                        <tr key={activity._id} className={styles[`severity${activity.severity.charAt(0).toUpperCase() + activity.severity.slice(1)}`]}>
                          <td>
                            {new Date(activity.createdAt).toLocaleDateString('de-DE')}
                            <span className={styles.timeDetail}>
                              {new Date(activity.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td>
                            <span className={styles.activityTypeBadge}>
                              {formatActivityType(activity.type)}
                            </span>
                          </td>
                          <td className={styles.activityDescription}>{activity.description}</td>
                          <td>
                            {activity.userEmail ? (
                              <span className={styles.activityEmail}>{activity.userEmail}</span>
                            ) : (
                              <span className={styles.noData}>System</span>
                            )}
                          </td>
                          <td>
                            <span className={`${styles.severityBadge} ${styles[activity.severity]}`}>
                              {activity.severity === 'info' && <CheckCircle size={12} />}
                              {activity.severity === 'warning' && <AlertTriangle size={12} />}
                              {activity.severity === 'error' && <AlertCircle size={12} />}
                              {activity.severity === 'critical' && <AlertCircle size={12} />}
                              {activity.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.emptyState}>
                    <Clock size={48} />
                    <p>Keine Aktivitäten</p>
                    <span>Es wurden noch keine Aktivitäten protokolliert</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            {/* Quick Actions */}
            <div className={styles.settingsSection}>
              <h3>Schnellaktionen</h3>
              <div className={styles.settingsGrid}>
                <div className={styles.settingsCard}>
                  <div className={styles.settingsCardHeader}>
                    <Mail size={24} />
                    <h4>Admin-Berichte senden</h4>
                  </div>
                  <p>Manuelle Zusammenfassungs-E-Mails generieren</p>
                  <div className={styles.settingsActions}>
                    <button
                      className={styles.settingsButton}
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/send-daily-summary', {
                            method: 'POST',
                            credentials: 'include'
                          });
                          if (res.ok) {
                            setSuccessMessage('Daily Summary E-Mail wurde gesendet!');
                            setTimeout(() => setSuccessMessage(null), 3000);
                          }
                        } catch {
                          setError('Fehler beim Senden');
                        }
                      }}
                    >
                      Daily Summary senden
                    </button>
                    <button
                      className={styles.settingsButton}
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/admin/send-weekly-summary', {
                            method: 'POST',
                            credentials: 'include'
                          });
                          if (res.ok) {
                            setSuccessMessage('Weekly Summary E-Mail wurde gesendet!');
                            setTimeout(() => setSuccessMessage(null), 3000);
                          }
                        } catch {
                          setError('Fehler beim Senden');
                        }
                      }}
                    >
                      Weekly Summary senden
                    </button>
                  </div>
                </div>

                <div className={styles.settingsCard}>
                  <div className={styles.settingsCardHeader}>
                    <RefreshCw size={24} />
                    <h4>Daten aktualisieren</h4>
                  </div>
                  <p>Admin-Dashboard-Daten neu laden</p>
                  <div className={styles.settingsActions}>
                    <button
                      className={styles.settingsButton}
                      onClick={() => {
                        fetchData();
                        setSuccessMessage('Daten werden aktualisiert...');
                        setTimeout(() => setSuccessMessage(null), 2000);
                      }}
                    >
                      Alle Daten aktualisieren
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* API Budget Info */}
            <div className={styles.settingsSection}>
              <h3>API-Budget (Heute)</h3>
              <div className={styles.budgetInfo}>
                <div className={styles.budgetBar}>
                  <div
                    className={styles.budgetProgress}
                    style={{ width: `${Math.min(stats.costs.today.percentUsed, 100)}%` }}
                  />
                </div>
                <div className={styles.budgetDetails}>
                  <span>Verbraucht: {formatEuro(toEuro(stats.costs.today.spent))}</span>
                  <span>Limit: {formatEuro(toEuro(stats.costs.today.limit))}</span>
                  <span>Verbleibend: {formatEuro(toEuro(stats.costs.today.remaining))}</span>
                </div>
                {stats.costs.today.isLimitReached && (
                  <div className={styles.budgetWarning}>
                    <AlertTriangle size={16} />
                    <span>Tägliches Limit erreicht!</span>
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className={styles.settingsSection}>
              <h3>System-Status</h3>
              <div className={styles.systemStatusGrid}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>MongoDB</span>
                  <span className={`${styles.statusValue} ${stats.system.mongoStatus === 'connected' ? styles.statusOk : styles.statusError}`}>
                    {stats.system.mongoStatus === 'connected' ? 'Verbunden' : stats.system.mongoStatus}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Node Version</span>
                  <span className={styles.statusValue}>{stats.system.nodeVersion}</span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Uptime</span>
                  <span className={styles.statusValue}>
                    {Math.floor(stats.system.uptime / 3600)}h {Math.floor((stats.system.uptime % 3600) / 60)}m
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Heap Used</span>
                  <span className={styles.statusValue}>
                    {(stats.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(0)} MB
                  </span>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className={styles.settingsSection}>
              <h3>Admin-Info</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span>Cron Jobs:</span>
                  <span>Daily Summary (18:00), Weekly Summary (So 20:00)</span>
                </div>
                <div className={styles.infoItem}>
                  <span>Activity Log:</span>
                  <span>Automatische Protokollierung aktiv (30 Tage Retention)</span>
                </div>
                <div className={styles.infoItem}>
                  <span>Admin E-Mails:</span>
                  <span>Registrierungs-Benachrichtigungen aktiviert</span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* User Detail Modal */}
      {userDetailModal.show && (
        <div className={styles.modalOverlay} onClick={() => setUserDetailModal({ show: false, user: null, loading: false })}>
          <div className={styles.userDetailModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>User Profil</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setUserDetailModal({ show: false, user: null, loading: false })}
              >
                <X size={20} />
              </button>
            </div>

            {userDetailModal.loading ? (
              <div className={styles.modalLoading}>
                <RefreshCw className={styles.spinning} size={32} />
                <p>Lade User-Details...</p>
              </div>
            ) : userDetailModal.user ? (
              <div className={styles.userDetailContent}>
                {/* User Header */}
                <div className={styles.userDetailHeader}>
                  <div className={styles.userAvatar}>
                    {userDetailModal.user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userMainInfo}>
                    <h3>{userDetailModal.user.email}</h3>
                    <div className={styles.userTags}>
                      <span className={`${styles.planBadge} ${styles[userDetailModal.user.subscriptionPlan]}`}>
                        {userDetailModal.user.subscriptionPlan}
                      </span>
                      {userDetailModal.user.role === 'admin' && (
                        <span className={styles.adminTag}>Admin</span>
                      )}
                      {userDetailModal.user.betaTester && (
                        <span className={styles.betaTag}>Beta</span>
                      )}
                      {userDetailModal.user.suspended && (
                        <span className={styles.suspendedTag}>Gesperrt</span>
                      )}
                      {userDetailModal.user.verified ? (
                        <span className={styles.verifiedTag}>Verifiziert</span>
                      ) : (
                        <span className={styles.unverifiedTag}>Nicht verifiziert</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Stats Grid */}
                <div className={styles.userStatsGrid}>
                  <div className={styles.userStatCard}>
                    <Activity size={20} />
                    <div>
                      <span className={styles.statValue}>{userDetailModal.user.analysisCount}</span>
                      <span className={styles.statLabel}>Analysen</span>
                    </div>
                  </div>
                  <div className={styles.userStatCard}>
                    <Zap size={20} />
                    <div>
                      <span className={styles.statValue}>{userDetailModal.user.optimizationCount}</span>
                      <span className={styles.statLabel}>Optimierungen</span>
                    </div>
                  </div>
                  <div className={styles.userStatCard}>
                    <Database size={20} />
                    <div>
                      <span className={styles.statValue}>{userDetailModal.user.contractCount}</span>
                      <span className={styles.statLabel}>Verträge</span>
                    </div>
                  </div>
                  <div className={styles.userStatCard}>
                    <Euro size={20} />
                    <div>
                      <span className={styles.statValue}>
                        {formatEuro(toEuro(userDetailModal.user.costThisMonth.totalCost))}
                      </span>
                      <span className={styles.statLabel}>Kosten (Monat)</span>
                    </div>
                  </div>
                </div>

                {/* User Details Sections */}
                <div className={styles.userDetailSections}>
                  {/* Account Info */}
                  <div className={styles.detailSection}>
                    <h4><Calendar size={16} /> Account-Info</h4>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Registriert am</span>
                        <span className={styles.detailValue}>
                          {userDetailModal.user.createdAt
                            ? new Date(userDetailModal.user.createdAt).toLocaleString('de-DE')
                            : '—'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Letzter Login</span>
                        <span className={styles.detailValue}>
                          {userDetailModal.user.lastLoginAt
                            ? new Date(userDetailModal.user.lastLoginAt).toLocaleString('de-DE')
                            : 'Nie eingeloggt'}
                        </span>
                      </div>
                      {userDetailModal.user.betaExpiresAt && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Beta läuft ab</span>
                          <span className={styles.detailValue}>
                            {new Date(userDetailModal.user.betaExpiresAt).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className={styles.detailSection}>
                    <h4><Smartphone size={16} /> Geräte</h4>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Registrierungs-Gerät</span>
                        <span className={styles.detailValue}>
                          {userDetailModal.user.registrationDevice ? (
                            <div className={styles.deviceInfoDetail}>
                              {getDeviceIcon(userDetailModal.user.registrationDevice.device)}
                              <span>{userDetailModal.user.registrationDevice.device}</span>
                              <span className={styles.deviceSubInfo}>
                                {userDetailModal.user.registrationDevice.browser} / {userDetailModal.user.registrationDevice.os}
                              </span>
                            </div>
                          ) : '—'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Letztes Login-Gerät</span>
                        <span className={styles.detailValue}>
                          {userDetailModal.user.lastLoginDevice ? (
                            <div className={styles.deviceInfoDetail}>
                              {getDeviceIcon(userDetailModal.user.lastLoginDevice.device)}
                              <span>{userDetailModal.user.lastLoginDevice.device}</span>
                              <span className={styles.deviceSubInfo}>
                                {userDetailModal.user.lastLoginDevice.browser} / {userDetailModal.user.lastLoginDevice.os}
                              </span>
                            </div>
                          ) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className={styles.detailSection}>
                    <h4><Star size={16} /> Abonnement</h4>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Plan</span>
                        <span className={styles.detailValue}>
                          <span className={`${styles.planBadge} ${styles[userDetailModal.user.subscriptionPlan]}`}>
                            {userDetailModal.user.subscriptionPlan}
                          </span>
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Status</span>
                        <span className={styles.detailValue}>
                          {userDetailModal.user.subscriptionActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      {userDetailModal.user.lastPlanChange && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Letzte Plan-Änderung</span>
                          <span className={styles.detailValue}>
                            {userDetailModal.user.lastPlanChange.from} → {userDetailModal.user.lastPlanChange.to}
                            <span className={styles.changeDetail}>
                              am {new Date(userDetailModal.user.lastPlanChange.changedAt).toLocaleDateString('de-DE')}
                              {' '}durch {userDetailModal.user.lastPlanChange.changedBy}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Usage This Month */}
                  <div className={styles.detailSection}>
                    <h4><TrendingUp size={16} /> API-Nutzung (dieser Monat)</h4>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>API Calls</span>
                        <span className={styles.detailValue}>{userDetailModal.user.costThisMonth.totalCalls}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Tokens</span>
                        <span className={styles.detailValue}>
                          {userDetailModal.user.costThisMonth.totalTokens.toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Kosten</span>
                        <span className={styles.detailValue}>
                          {formatEuro(toEuro(userDetailModal.user.costThisMonth.totalCost))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Suspended Info */}
                  {userDetailModal.user.suspended && userDetailModal.user.suspendReason && (
                    <div className={`${styles.detailSection} ${styles.warningSection}`}>
                      <h4><Ban size={16} /> Sperrgrund</h4>
                      <p className={styles.suspendReasonText}>{userDetailModal.user.suspendReason}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

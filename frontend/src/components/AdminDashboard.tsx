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
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Send as SendIcon } from 'lucide-react';
import CampaignsTab from './CampaignsTab';
import styles from './AdminDashboard.module.css';

// API URL für Backend-Calls
const API_URL = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// USD to EUR conversion rate (approximate)
const USD_TO_EUR = 0.88; // Stand April 2026 — bei Bedarf aktualisieren

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

interface EmailLog {
  _id: string;
  to: string | null;
  subject: string | null;
  category: string | null;
  userId: string | null;
  messageId: string | null;
  source: string | null;
  status: 'sent' | 'failed' | string;
  sentAt?: string;
  failedAt?: string;
  createdAt: string;
  error?: string;
}

interface EmailLogsData {
  logs: EmailLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
  };
}

interface EmailLogsStats {
  total: number;
  sent24h: number;
  sent7d: number;
  sent30d: number;
  byCategory: Array<{ _id: string; count: number }>;
  byStatus: Array<{ _id: string; count: number }>;
}

interface UpcomingCampaign {
  _id: string;
  name: string;
  subject: string;
  scheduledFor: string | null;
  status: 'queued' | 'sending';
  recipientCount: number;
  segmentFilter?: {
    userIds?: string[];
    emails?: string[];
    plan?: string;
    subscriptionActive?: boolean;
    minAnalysisCount?: number;
    createdAfter?: string;
    createdBefore?: string;
  };
  stats?: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  startedAt?: string | null;
  queuedAt?: string | null;
  createdByEmail?: string | null;
}

interface FinanceStats {
  monthlyRevenue: Array<{ month: string; revenue: number; count: number; byPlan: { business: number; enterprise: number } }>;
  monthlyCosts: Array<{ month: string; cost: number; calls: number }>;
  monthlyRefunds: Array<{ month: string; total: number; count: number }>;
  refunds: {
    total: number;
    count: number;
    avg: number;
    list: Array<{
      customerName: string;
      customerEmail: string;
      refundAmount: number;
      refundedAt: string;
      refundNote: string;
      subscriptionPlan: string;
    }>;
  };
  churn: {
    currentMonth: { canceled: number; paidUsers: number; rate: number };
    lastMonth: { canceled: number; rate: number };
    trend: 'up' | 'down' | 'stable';
  };
  currentMRR: number;
  revenuePerUser: Array<{
    email: string;
    customerName: string;
    plan: string;
    currentPlan: string;
    status: 'active' | 'canceled';
    canceledAt: string | null;
    totalRevenue: number;
    invoiceCount: number;
    firstPayment: string;
    lastPayment: string;
  }>;
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
    enterprise: number;
    activeSubscriptions: number;
    verified: number;
    newLast30Days: number;
    dailyRegistrations: Array<{ date: string; count: number }>;
  };
  conversion: {
    rate: number;
    premiumUpgradeRate?: number;
    enterpriseUpgradeRate?: number;
    totalPaidUsers: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    breakdown: {
      business: number;
      premium?: number;
      enterprise?: number;
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
  return `${(amount ?? 0).toFixed(decimals).replace('.', ',')} €`;
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
  const [activeTab, setActiveTab] = useState<'costs' | 'system' | 'users' | 'beta' | 'deleted' | 'activity' | 'monitoring' | 'finance' | 'emails' | 'campaigns' | 'settings'>('costs');
  const [users, setUsers] = useState<User[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [betaStats, setBetaStats] = useState<BetaStats | null>(null);
  const [deletedAccountsData, setDeletedAccountsData] = useState<DeletedAccountsStats | null>(null);
  const [activityLogData, setActivityLogData] = useState<ActivityLogData | null>(null);
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [emailLogsData, setEmailLogsData] = useState<EmailLogsData | null>(null);
  const [emailLogsStats, setEmailLogsStats] = useState<EmailLogsStats | null>(null);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogsPage, setEmailLogsPage] = useState(1);
  const [emailLogsSearch, setEmailLogsSearch] = useState('');
  const [emailLogsSearchInput, setEmailLogsSearchInput] = useState('');
  const [emailLogsCategory, setEmailLogsCategory] = useState<string>('all');
  const [emailLogsStatus, setEmailLogsStatus] = useState<string>('all');
  const [upcomingCampaigns, setUpcomingCampaigns] = useState<UpcomingCampaign[] | null>(null);
  const [verificationStats, setVerificationStats] = useState<{ totalUnverified: number; eligibleForReminder: number; optedOutCount: number; intervalDays: number; maxAgeDays: number } | null>(null);
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

  // Monitoring State
  const [cronStatus, setCronStatus] = useState<Array<{
    jobName: string;
    status: 'completed' | 'failed' | 'running';
    startedAt: string;
    completedAt?: string;
    duration?: number;
    error?: string;
  }>>([]);
  const [errorLogs, setErrorLogs] = useState<Array<{
    timestamp: string;
    severity: string;
    error: string;
    route?: string;
    count: number;
  }>>([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  // Weekly Legal Check State
  const [weeklyCheckStats, setWeeklyCheckStats] = useState<{
    isHealthy: boolean;
    lastRun: string | null;
    lastRunStatus: string;
    lastError: { at: string; message: string } | null;
    nextScheduledRun: string;
    cronExpression: string;
    cronEnabled: boolean;
    stats: {
      period: { from: string; to: string };
      totalChecks: number;
      uniqueUsers: number;
      uniqueContracts: number;
      totalFindings: number;
      criticalFindings: number;
      warningFindings: number;
      alertsSent: number;
      estimatedCost: string;
    };
    healthHistory: Array<{
      runAt: string;
      status: string;
      usersChecked: number;
      contractsChecked: number;
      findingsCount: number;
      duration: number;
      cost: string;
      error: string | null;
    }>;
  } | null>(null);
  const [weeklyCheckTriggering, setWeeklyCheckTriggering] = useState(false);

  // Fetch Admin Statistics
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch comprehensive admin stats
      const statsResponse = await fetch(`${API_URL}/api/admin/stats`, {
        credentials: 'include'
      });

      if (!statsResponse.ok) {
        throw new Error('Fehler beim Laden der Admin-Statistiken');
      }

      const statsData = await statsResponse.json();
      setAdminStats(statsData);

      // Fetch users separately for the users tab
      const usersResponse = await fetch(`${API_URL}/api/auth/users`, {
        credentials: 'include'
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Fetch beta stats
      const betaResponse = await fetch(`${API_URL}/api/admin/beta-stats`, {
        credentials: 'include'
      });

      if (betaResponse.ok) {
        const betaData = await betaResponse.json();
        setBetaStats(betaData);
      }

      // Fetch deleted accounts
      const deletedResponse = await fetch(`${API_URL}/api/admin/deleted-accounts`, {
        credentials: 'include'
      });

      if (deletedResponse.ok) {
        const deletedData = await deletedResponse.json();
        setDeletedAccountsData(deletedData);
      }

      // Fetch activity log
      const activityResponse = await fetch(`${API_URL}/api/admin/activity-log?limit=100`, {
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

  // Fetch Monitoring Data (Cron Status & Errors)
  const fetchMonitoringData = async () => {
    try {
      setMonitoringLoading(true);
      const [cronRes, errorsRes, weeklyCheckRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/cron/status`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/errors?hours=24`, { credentials: 'include' }),
        fetch(`${API_URL}/api/legal-pulse/admin/weekly-check-stats`, { credentials: 'include' })
      ]);

      if (cronRes.ok) {
        const cronData = await cronRes.json();
        setCronStatus(cronData.jobs || []);
      }

      if (errorsRes.ok) {
        const errorsData = await errorsRes.json();
        setErrorLogs(errorsData.recentErrors || []);
      }

      if (weeklyCheckRes.ok) {
        const weeklyData = await weeklyCheckRes.json();
        setWeeklyCheckStats(weeklyData.weeklyCheck || null);
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
    } finally {
      setMonitoringLoading(false);
    }
  };

  // Trigger Weekly Legal Check manually
  const triggerWeeklyCheck = async () => {
    if (weeklyCheckTriggering) return;
    try {
      setWeeklyCheckTriggering(true);
      const res = await fetch(`${API_URL}/api/legal-pulse/admin/weekly-check-trigger`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        setSuccessMessage('Weekly Legal Check wurde gestartet. Überprüfen Sie die Logs.');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const data = await res.json();
        setError(data.message || 'Fehler beim Starten des Weekly Checks');
      }
    } catch (err) {
      console.error('Error triggering weekly check:', err);
      setError('Fehler beim Starten des Weekly Checks');
    } finally {
      setWeeklyCheckTriggering(false);
    }
  };

  // Load monitoring data when tab is selected
  useEffect(() => {
    if (activeTab === 'monitoring') {
      fetchMonitoringData();
    }
  }, [activeTab]);

  // Fetch Finance Data (lazy loaded)
  const fetchFinanceData = async () => {
    try {
      setFinanceLoading(true);
      const res = await fetch(`${API_URL}/api/admin/finance-stats`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFinanceStats(data);
      }
    } catch (err) {
      console.error('Error fetching finance data:', err);
    } finally {
      setFinanceLoading(false);
    }
  };

  // Load finance data when tab is selected
  useEffect(() => {
    if (activeTab === 'finance' && !financeStats) {
      fetchFinanceData();
    }
  }, [activeTab]);

  // Fetch Email Logs (paginated, filtered)
  const fetchEmailLogs = async (
    page = emailLogsPage,
    search = emailLogsSearch,
    category = emailLogsCategory,
    status = emailLogsStatus
  ) => {
    try {
      setEmailLogsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '50'
      });
      if (search) params.set('search', search);
      if (category && category !== 'all') params.set('category', category);
      if (status && status !== 'all') params.set('status', status);

      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/email-logs?${params.toString()}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/admin/email-logs/stats`, { credentials: 'include' })
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        if (data.success) setEmailLogsData(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.success) setEmailLogsStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching email logs:', err);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  // Load email logs when tab is selected or filters change
  useEffect(() => {
    if (activeTab === 'emails') {
      fetchEmailLogs(emailLogsPage, emailLogsSearch, emailLogsCategory, emailLogsStatus);
    }
  }, [activeTab, emailLogsPage, emailLogsSearch, emailLogsCategory, emailLogsStatus]);

  // Fetch geplante + laufende Kampagnen (für "Geplant & Laufend" Sektion in Mails-Tab)
  const fetchUpcomingCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/email-logs/upcoming`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setUpcomingCampaigns(data.upcoming || []);
      }
    } catch (err) {
      console.error('Error fetching upcoming campaigns:', err);
    }
  };

  // Initial-Fetch + Auto-Refresh alle 30s solange Mails-Tab aktiv
  useEffect(() => {
    if (activeTab !== 'emails') return;
    fetchUpcomingCampaigns();
    // Verification Reminder Stats laden
    fetch(`${API_URL}/api/admin/verification-reminder-stats`, { credentials: 'include' })
      .then(r => r.json()).then(d => { if (d.success) setVerificationStats(d); }).catch(() => {});
    const timer = setInterval(fetchUpcomingCampaigns, 30000);
    return () => clearInterval(timer);
  }, [activeTab]);

  // triggerVerificationReminders entfernt — Cron läuft vollautomatisch (täglich 10:20)

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
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
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
      const response = await fetch(`${API_URL}/api/admin/users/bulk-delete`, {
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

      const response = await fetch(`${API_URL}${endpoint}`, {
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
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
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
    users: { total: 0, free: 0, business: 0, enterprise: 0, activeSubscriptions: 0, verified: 0, newLast30Days: 0, dailyRegistrations: [] },
    conversion: { rate: 0, premiumUpgradeRate: 0, totalPaidUsers: 0 },
    revenue: { mrr: 0, arr: 0, arpu: 0, breakdown: { business: 0, enterprise: 0 } },
    usage: { totalAnalyses: 0, totalOptimizations: 0, totalContracts: 0, avgAnalysesPerUser: 0, byPlan: [], mostActive: [] },
    system: { mongoStatus: 'Unknown', uptime: 0, memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }, nodeVersion: 'Unknown' }
  };

  // Prepare Chart Data
  const planDistribution = [
    { name: 'Free', value: stats.users.free, color: '#94a3b8' },
    { name: 'Business', value: stats.users.business, color: '#3b82f6' },
    { name: 'Premium', value: stats.users.enterprise, color: '#10b981' }
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
          className={`${styles.tab} ${activeTab === 'monitoring' ? styles.active : ''}`}
          onClick={() => setActiveTab('monitoring')}
        >
          <AlertTriangle size={20} />
          <span>Monitoring</span>
          {errorLogs.length > 0 && (
            <span className={styles.tabBadge} style={{ background: '#ef4444' }}>{errorLogs.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'finance' ? styles.active : ''}`}
          onClick={() => setActiveTab('finance')}
        >
          <TrendingUp size={20} />
          <span>Finanzen</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'emails' ? styles.active : ''}`}
          onClick={() => setActiveTab('emails')}
        >
          <Mail size={20} />
          <span>Mails</span>
          {emailLogsStats && emailLogsStats.sent24h > 0 && (
            <span className={styles.tabBadge}>{emailLogsStats.sent24h}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'campaigns' ? styles.active : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <SendIcon size={20} />
          <span>Kampagnen</span>
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
                    : `${(stats.costs.today.percentUsed ?? 0).toFixed(0)}% des Tageslimits verbraucht (${formatEuro(toEuro(stats.costs.today.spent))} / ${formatEuro(toEuro(stats.costs.today.limit))})`
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
                  <p className={styles.statValue}>{((stats.costs.month.tokens ?? 0) / 1000).toFixed(1)}K</p>
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
                  <p className={styles.statValue}>{(stats.conversion.rate ?? 0).toFixed(1)}%</p>
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
                    {(stats.users.total > 0 ? (stats.users.activeSubscriptions / stats.users.total) * 100 : 0).toFixed(1)}% Aktivierung
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Activity />
                </div>
                <div className={styles.statContent}>
                  <h3>Premium Upgrade Rate</h3>
                  <p className={styles.statValue}>{(stats.conversion.enterpriseUpgradeRate ?? 0).toFixed(1)}%</p>
                  <span className={styles.statSubtext}>
                    {stats.users.enterprise} Premium User
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
                    {(stats.usage.avgAnalysesPerUser ?? 0).toFixed(1)} pro User
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
                    Uptime: {((stats.system.uptime ?? 0) / 3600).toFixed(1)}h
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
                    { name: 'Enterprise', revenue: stats.revenue.breakdown.enterprise ?? 0, users: stats.users.enterprise }
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
                <span className={`${styles.userStatValue} ${styles.premium}`}>{stats.users.enterprise}</span>
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
                    {(betaStats?.feedback.avgRating ?? 0).toFixed(1) || '0.0'}
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

        {/* MONITORING TAB */}
        {activeTab === 'monitoring' && (
          <div className={styles.monitoringTab || styles.systemTab}>
            <div className={styles.tabHeader}>
              <h2>System Monitoring</h2>
              <button
                className={styles.refreshButton || styles.exportButton}
                onClick={fetchMonitoringData}
                disabled={monitoringLoading}
              >
                <RefreshCw size={16} className={monitoringLoading ? styles.spinning : ''} />
                Aktualisieren
              </button>
            </div>

            {/* Cron Job Status */}
            <div className={styles.statsSection}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} />
                Cron-Job Status
              </h3>
              <div className={styles.tableContainer || ''} style={{ overflowX: 'auto' }}>
                <table className={styles.usersTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Job Name</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Letzter Run</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Dauer</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Fehler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cronStatus.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                          {monitoringLoading ? 'Laden...' : 'Noch keine Cron-Jobs ausgeführt'}
                        </td>
                      </tr>
                    ) : (
                      cronStatus.map((job, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontWeight: 500 }}>{job.jobName}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '13px',
                              fontWeight: 500,
                              background: job.status === 'completed' ? '#dcfce7' : job.status === 'failed' ? '#fee2e2' : '#fef3c7',
                              color: job.status === 'completed' ? '#166534' : job.status === 'failed' ? '#991b1b' : '#92400e'
                            }}>
                              {job.status === 'completed' && <CheckCircle size={14} />}
                              {job.status === 'failed' && <XCircle size={14} />}
                              {job.status === 'running' && <RefreshCw size={14} />}
                              {job.status === 'completed' ? 'Erfolgreich' : job.status === 'failed' ? 'Fehlgeschlagen' : 'Läuft'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                            {job.startedAt ? new Date(job.startedAt).toLocaleString('de-DE') : '-'}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                            {job.duration ? `${(job.duration / 1000).toFixed(1)}s` : '-'}
                          </td>
                          <td style={{ padding: '12px', color: '#ef4444', fontSize: '14px' }}>
                            {job.error || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error Logs */}
            <div className={styles.statsSection} style={{ marginTop: '32px' }}>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} />
                Fehler-Log (letzte 24h)
                {errorLogs.length > 0 && (
                  <span style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>
                    {errorLogs.length}
                  </span>
                )}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.usersTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Zeitpunkt</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Severity</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Route</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Fehler</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#16a34a' }}>
                          <CheckCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                          Keine Fehler in den letzten 24 Stunden
                        </td>
                      </tr>
                    ) : (
                      errorLogs.map((log, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                            {new Date(log.timestamp).toLocaleString('de-DE')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background: log.severity === 'critical' ? '#fee2e2' : log.severity === 'high' ? '#ffedd5' : '#fef3c7',
                              color: log.severity === 'critical' ? '#991b1b' : log.severity === 'high' ? '#c2410c' : '#92400e'
                            }}>
                              {log.severity}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px' }}>
                            {log.route || '-'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.error}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                            {log.count}x
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Legal Check */}
            <div className={styles.statsSection} style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <ShieldCheck size={20} />
                  Weekly Legal Check
                  {weeklyCheckStats?.isHealthy !== undefined && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: weeklyCheckStats.isHealthy ? '#dcfce7' : '#fee2e2',
                      color: weeklyCheckStats.isHealthy ? '#166534' : '#991b1b'
                    }}>
                      {weeklyCheckStats.isHealthy ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {weeklyCheckStats.isHealthy ? 'Healthy' : 'Error'}
                    </span>
                  )}
                  {!weeklyCheckStats?.cronEnabled && (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#fef3c7',
                      color: '#92400e'
                    }}>
                      CRON DISABLED
                    </span>
                  )}
                </h3>
                <button
                  onClick={triggerWeeklyCheck}
                  disabled={weeklyCheckTriggering}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: weeklyCheckTriggering ? '#e5e7eb' : '#3b82f6',
                    color: weeklyCheckTriggering ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: weeklyCheckTriggering ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Zap size={14} />
                  {weeklyCheckTriggering ? 'Wird gestartet...' : 'Manuell starten'}
                </button>
              </div>

              {weeklyCheckStats ? (
                <>
                  {/* Status Overview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Letzter Run</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        {weeklyCheckStats.lastRun ? new Date(weeklyCheckStats.lastRun).toLocaleString('de-DE') : 'Noch nie'}
                      </div>
                      <div style={{ fontSize: '12px', color: weeklyCheckStats.lastRunStatus === 'success' ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
                        Status: {weeklyCheckStats.lastRunStatus}
                      </div>
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Nächster Run</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        {new Date(weeklyCheckStats.nextScheduledRun).toLocaleString('de-DE')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', marginTop: '4px' }}>
                        {weeklyCheckStats.cronExpression}
                      </div>
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Letzte 4 Wochen</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        {weeklyCheckStats.stats.totalChecks} Checks
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {weeklyCheckStats.stats.uniqueUsers} User, {weeklyCheckStats.stats.uniqueContracts} Verträge
                      </div>
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Findings</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        {weeklyCheckStats.stats.totalFindings} gefunden
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                        <span style={{ color: '#dc2626' }}>{weeklyCheckStats.stats.criticalFindings} kritisch</span>
                        <span style={{ color: '#f59e0b' }}>{weeklyCheckStats.stats.warningFindings} Warnung</span>
                      </div>
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Alerts gesendet</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        {weeklyCheckStats.stats.alertsSent}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Digest-Queue Einträge
                      </div>
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Geschätzte Kosten</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        ${weeklyCheckStats.stats.estimatedCost}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        GPT-4o-mini
                      </div>
                    </div>
                  </div>

                  {/* Last Error Alert */}
                  {weeklyCheckStats.lastError && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 600, marginBottom: '8px' }}>
                        <AlertTriangle size={16} />
                        Letzter Fehler
                      </div>
                      <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
                        {new Date(weeklyCheckStats.lastError.at).toLocaleString('de-DE')}: {weeklyCheckStats.lastError.message}
                      </div>
                    </div>
                  )}

                  {/* Health History Table */}
                  <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>Run-Historie</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className={styles.usersTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Zeitpunkt</th>
                          <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Status</th>
                          <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Geprüfte User</th>
                          <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Verträge</th>
                          <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Findings</th>
                          <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Dauer</th>
                          <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Kosten</th>
                          <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }}>Fehler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyCheckStats.healthHistory.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                              Noch keine Weekly Checks durchgeführt
                            </td>
                          </tr>
                        ) : (
                          weeklyCheckStats.healthHistory.map((h, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px', fontSize: '13px' }}>
                                {new Date(h.runAt).toLocaleString('de-DE')}
                              </td>
                              <td style={{ padding: '10px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: h.status === 'success' ? '#dcfce7' : '#fee2e2',
                                  color: h.status === 'success' ? '#166534' : '#991b1b'
                                }}>
                                  {h.status === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                  {h.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{h.usersChecked}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{h.contractsChecked}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: h.findingsCount > 0 ? 600 : 400 }}>
                                {h.findingsCount}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{h.duration.toFixed(1)}s</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>${h.cost}</td>
                              <td style={{ padding: '10px', fontSize: '12px', color: '#dc2626', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {h.error || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  {monitoringLoading ? 'Lade Weekly Check Daten...' : 'Keine Daten verfügbar'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div className={styles.financeTab}>
            {financeLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw className={styles.spinning} size={32} />
                <p>Lade Finanzdaten...</p>
              </div>
            ) : financeStats ? (() => {
              // Prepare merged chart data
              const allMonths = new Set<string>();
              financeStats.monthlyRevenue.forEach(r => allMonths.add(r.month));
              financeStats.monthlyCosts.forEach(c => allMonths.add(c.month));
              financeStats.monthlyRefunds.forEach(r => allMonths.add(r.month));

              const revenueMap = Object.fromEntries(financeStats.monthlyRevenue.map(r => [r.month, r]));
              const costsMap = Object.fromEntries(financeStats.monthlyCosts.map(c => [c.month, c]));
              const refundsMap = Object.fromEntries(financeStats.monthlyRefunds.map(r => [r.month, r]));

              const chartData = Array.from(allMonths).sort().map(month => ({
                month,
                label: month.slice(5) + '/' + month.slice(2, 4),
                revenue: revenueMap[month]?.revenue || 0,
                costs: parseFloat((((costsMap[month]?.cost || 0) * USD_TO_EUR)).toFixed(2)),
                refunds: refundsMap[month]?.total || 0
              }));

              // Current month stats
              const currentMonth = new Date().toISOString().slice(0, 7);
              const currentRevenue = revenueMap[currentMonth]?.revenue || 0;
              const currentCosts = parseFloat(((costsMap[currentMonth]?.cost || 0) * USD_TO_EUR).toFixed(2));
              const currentRefunds = refundsMap[currentMonth]?.total || 0;
              const netRevenue = parseFloat((currentRevenue - currentCosts - currentRefunds).toFixed(2));

              // Plan breakdown for pie chart
              const totalBusiness = financeStats.monthlyRevenue.reduce((sum, r) => sum + r.byPlan.business, 0);
              const totalEnterprise = financeStats.monthlyRevenue.reduce((sum, r) => sum + r.byPlan.enterprise, 0);
              const planPieData = [
                { name: 'Business', value: totalBusiness, color: '#3b82f6' },
                { name: 'Enterprise', value: totalEnterprise, color: '#10b981' }
              ].filter(d => d.value > 0);

              return (
                <>
                  {/* KPI Cards */}
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon} style={{ background: netRevenue >= 0 ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fef2f2, #fecaca)', color: netRevenue >= 0 ? '#059669' : '#dc2626' }}>
                        <Euro size={28} />
                      </div>
                      <div className={styles.statContent}>
                        <h3>Netto-Einnahmen</h3>
                        <p className={styles.statValue} style={{ color: netRevenue >= 0 ? '#059669' : '#dc2626' }}>
                          {formatEuro(netRevenue)}
                        </p>
                        <span className={styles.statSubtext}>nach Kosten & Refunds</span>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#3b82f6' }}>
                        <TrendingUp size={28} />
                      </div>
                      <div className={styles.statContent}>
                        <h3>MRR</h3>
                        <p className={styles.statValue}>{formatEuro(financeStats.currentMRR)}</p>
                        <span className={styles.statSubtext}>ARR: {formatEuro(financeStats.currentMRR * 12)}</span>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', color: '#ea580c' }}>
                        <RotateCcw size={28} />
                      </div>
                      <div className={styles.statContent}>
                        <h3>Refunds gesamt</h3>
                        <p className={styles.statValue}>{formatEuro(financeStats.refunds.total)}</p>
                        <span className={styles.statSubtext}>{financeStats.refunds.count} Erstattungen</span>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statIcon} style={{
                        background: financeStats.churn.trend === 'up' ? 'linear-gradient(135deg, #fef2f2, #fecaca)' : financeStats.churn.trend === 'down' ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                        color: financeStats.churn.trend === 'up' ? '#dc2626' : financeStats.churn.trend === 'down' ? '#059669' : '#64748b'
                      }}>
                        <Users size={28} />
                      </div>
                      <div className={styles.statContent}>
                        <h3>Churn Rate</h3>
                        <p className={styles.statValue}>
                          {financeStats.churn.currentMonth.rate}%
                          {financeStats.churn.trend === 'up' && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '1rem' }}>&#9650;</span>}
                          {financeStats.churn.trend === 'down' && <span style={{ color: '#059669', marginLeft: '0.5rem', fontSize: '1rem' }}>&#9660;</span>}
                        </p>
                        <span className={styles.statSubtext}>Vormonat: {financeStats.churn.lastMonth.rate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue per User Table */}
                  {(() => {
                    const activeUsers = financeStats.revenuePerUser.filter(u => u.status === 'active');
                    const canceledUsers = financeStats.revenuePerUser.filter(u => u.status === 'canceled');
                    const activeRevenue = activeUsers.reduce((s, u) => s + u.totalRevenue, 0);
                    const canceledRevenue = canceledUsers.reduce((s, u) => s + u.totalRevenue, 0);

                    return (
                      <>
                        {/* Active Subscribers */}
                        <div className={styles.tableCard}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>
                              <span style={{ color: '#059669' }}>&#9679;</span> Aktive Abonnenten ({activeUsers.length} Kunden, {formatEuro(activeRevenue)} Gesamtumsatz)
                            </h3>
                          </div>
                          {activeUsers.length > 0 ? (
                            <div className={styles.tableContainer} style={{ border: 'none', boxShadow: 'none' }}>
                              <table className={styles.userTable}>
                                <thead>
                                  <tr>
                                    <th>Kunde</th>
                                    <th>E-Mail</th>
                                    <th>Aktueller Plan</th>
                                    <th>Rechnungen</th>
                                    <th>Umsatz</th>
                                    <th>Erste Zahlung</th>
                                    <th>Letzte Zahlung</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeUsers.map((user, idx) => (
                                    <tr key={idx}>
                                      <td>{user.customerName}</td>
                                      <td className={styles.emailCell}>{user.email}</td>
                                      <td>
                                        <span className={`${styles.planBadge} ${styles[user.currentPlan] || ''}`}>
                                          {user.currentPlan}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>{user.invoiceCount || '-'}</td>
                                      <td style={{ fontWeight: 600, color: user.totalRevenue > 0 ? '#059669' : '#f59e0b' }}>
                                        {user.totalRevenue > 0 ? formatEuro(user.totalRevenue) : 'Zahlung ausstehend'}
                                      </td>
                                      <td>{user.firstPayment ? new Date(user.firstPayment).toLocaleDateString('de-DE') : '-'}</td>
                                      <td>{user.lastPayment ? new Date(user.lastPayment).toLocaleDateString('de-DE') : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Keine aktiven Abonnenten</p>
                          )}
                        </div>

                        {/* Canceled / Former Subscribers */}
                        <div className={styles.tableCard}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>
                              <span style={{ color: '#94a3b8' }}>&#9679;</span> Ehemalige Abonnenten ({canceledUsers.length} Kunden, {formatEuro(canceledRevenue)} Gesamtumsatz)
                            </h3>
                          </div>
                          {canceledUsers.length > 0 ? (
                            <div className={styles.tableContainer} style={{ border: 'none', boxShadow: 'none' }}>
                              <table className={styles.userTable}>
                                <thead>
                                  <tr>
                                    <th>Kunde</th>
                                    <th>E-Mail</th>
                                    <th>Ehem. Plan</th>
                                    <th>Rechnungen</th>
                                    <th>Umsatz</th>
                                    <th>Erste Zahlung</th>
                                    <th>Letzte Zahlung</th>
                                    <th>Gekündigt am</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {canceledUsers.map((user, idx) => (
                                    <tr key={idx} style={{ opacity: 0.7 }}>
                                      <td>{user.customerName}</td>
                                      <td className={styles.emailCell}>{user.email}</td>
                                      <td>
                                        <span className={`${styles.planBadge}`} style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                                          {user.plan}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>{user.invoiceCount}</td>
                                      <td style={{ fontWeight: 600, color: '#94a3b8' }}>{formatEuro(user.totalRevenue)}</td>
                                      <td>{user.firstPayment ? new Date(user.firstPayment).toLocaleDateString('de-DE') : '-'}</td>
                                      <td>{user.lastPayment ? new Date(user.lastPayment).toLocaleDateString('de-DE') : '-'}</td>
                                      <td style={{ color: '#dc2626' }}>{user.canceledAt ? new Date(user.canceledAt).toLocaleDateString('de-DE') : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Keine ehemaligen Abonnenten</p>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* Revenue vs Costs AreaChart */}
                  <div className={styles.chartCard} style={{ marginBottom: '2rem' }}>
                    <h3>Einnahmen vs. Kosten (letzte 12 Monate)</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = { revenue: 'Einnahmen', costs: 'Kosten (EUR)', refunds: 'Refunds' };
                            return [formatEuro(value), labels[name] || name];
                          }}
                        />
                        <Legend formatter={(value: string) => {
                          const labels: Record<string, string> = { revenue: 'Einnahmen', costs: 'Kosten (EUR)', refunds: 'Refunds' };
                          return labels[value] || value;
                        }} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="costs" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                        <Area type="monotone" dataKey="refunds" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Two columns: Plan PieChart + Churn Card */}
                  <div className={styles.chartsRow}>
                    <div className={styles.chartCard}>
                      <h3>Revenue nach Plan</h3>
                      {planPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={planPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {planPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>Noch keine Daten</p>
                      )}
                    </div>

                    <div className={styles.chartCard}>
                      <h3>Churn-Details</h3>
                      <div className={styles.churnCard}>
                        <div className={styles.churnRate}>
                          <span style={{
                            fontSize: '3rem',
                            fontWeight: 700,
                            color: financeStats.churn.currentMonth.rate > 10 ? '#dc2626' : financeStats.churn.currentMonth.rate > 5 ? '#f59e0b' : '#059669'
                          }}>
                            {financeStats.churn.currentMonth.rate}%
                          </span>
                          <span className={`${styles.churnTrend} ${styles[financeStats.churn.trend]}`}>
                            {financeStats.churn.trend === 'up' ? '&#9650; steigend' : financeStats.churn.trend === 'down' ? '&#9660; sinkend' : '&#9644; stabil'}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Dieser Monat</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>{financeStats.churn.currentMonth.canceled}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>von {financeStats.churn.currentMonth.paidUsers} zahlenden</div>
                          </div>
                          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Vormonat</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>{financeStats.churn.lastMonth.canceled}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{financeStats.churn.lastMonth.rate}% Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refund Table */}
                  <div className={styles.tableCard}>
                    <h3>Refund-Übersicht ({financeStats.refunds.count} gesamt, {formatEuro(financeStats.refunds.avg)} Durchschnitt)</h3>
                    {financeStats.refunds.list.length > 0 ? (
                      <div className={styles.tableContainer} style={{ border: 'none', boxShadow: 'none' }}>
                        <table className={styles.userTable}>
                          <thead>
                            <tr>
                              <th>Kunde</th>
                              <th>E-Mail</th>
                              <th>Plan</th>
                              <th>Betrag</th>
                              <th>Datum</th>
                              <th>Notiz</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financeStats.refunds.list.map((refund, idx) => (
                              <tr key={idx}>
                                <td>{refund.customerName}</td>
                                <td className={styles.emailCell}>{refund.customerEmail}</td>
                                <td>
                                  <span className={`${styles.planBadge} ${styles[refund.subscriptionPlan] || ''}`}>
                                    {refund.subscriptionPlan || '-'}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600, color: '#ea580c' }}>{formatEuro(refund.refundAmount)}</td>
                                <td>{refund.refundedAt ? new Date(refund.refundedAt).toLocaleDateString('de-DE') : '-'}</td>
                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{refund.refundNote || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Keine Refunds vorhanden</p>
                    )}
                  </div>
                </>
              );
            })() : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>Keine Finanzdaten verfügbar</p>
            )}
          </div>
        )}

        {/* EMAILS TAB - Versendete Mails */}
        {activeTab === 'emails' && (
          <div className={styles.activityTab}>
            {/* Stats Row */}
            {emailLogsStats && (
              <div className={styles.activityStatsRow}>
                <div className={styles.activityStatCard}>
                  <Mail size={24} className={styles.activityIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{emailLogsStats.total.toLocaleString('de-DE')}</span>
                    <span className={styles.activityStatLabel}>Gesamt</span>
                  </div>
                </div>
                <div className={styles.activityStatCard}>
                  <Clock size={24} className={styles.infoIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{emailLogsStats.sent24h.toLocaleString('de-DE')}</span>
                    <span className={styles.activityStatLabel}>Letzte 24h</span>
                  </div>
                </div>
                <div className={styles.activityStatCard}>
                  <Calendar size={24} className={styles.infoIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{emailLogsStats.sent7d.toLocaleString('de-DE')}</span>
                    <span className={styles.activityStatLabel}>Letzte 7 Tage</span>
                  </div>
                </div>
                <div className={styles.activityStatCard}>
                  <Activity size={24} className={styles.infoIcon} />
                  <div>
                    <span className={styles.activityStatValue}>{emailLogsStats.sent30d.toLocaleString('de-DE')}</span>
                    <span className={styles.activityStatLabel}>Letzte 30 Tage</span>
                  </div>
                </div>
              </div>
            )}

            {/* Geplant & Laufend (Upcoming Campaigns) */}
            {upcomingCampaigns !== null && (
              <div className={styles.tableCard} style={{ marginBottom: '1.5rem' }}>
                <div className={styles.tabHeader}>
                  <h3 style={{ margin: 0 }}>
                    📅 Geplant &amp; Laufend
                    {upcomingCampaigns.length > 0 && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>
                        ({upcomingCampaigns.length})
                      </span>
                    )}
                  </h3>
                </div>
                <div style={{ padding: '1rem' }}>
                  {upcomingCampaigns.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                      Keine geplanten oder laufenden Kampagnen — alles abgearbeitet ✓
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {upcomingCampaigns.map(c => {
                        const isScheduled = c.status === 'queued' && c.scheduledFor;
                        const isSendingNow = c.status === 'sending';
                        const isImmediateQueued = c.status === 'queued' && !c.scheduledFor;
                        const scheduledMs = c.scheduledFor ? new Date(c.scheduledFor).getTime() - Date.now() : 0;

                        // Relative time
                        let relTime = '';
                        if (isScheduled && scheduledMs > 0) {
                          const min = Math.round(scheduledMs / 60000);
                          if (min < 60) relTime = `in ${min} Min`;
                          else if (min < 1440) relTime = `in ${Math.round(min / 60)} Std`;
                          else relTime = `in ${Math.round(min / 1440)} Tagen`;
                        }

                        // Segment-Beschreibung
                        const sf = c.segmentFilter || {};
                        let segmentDesc: string;
                        if (sf.userIds?.length) segmentDesc = `${sf.userIds.length} spezifische User`;
                        else if (sf.emails?.length) segmentDesc = `${sf.emails.length} spezifische Emails`;
                        else {
                          const parts: string[] = [];
                          if (sf.plan) parts.push(`Plan: ${sf.plan}`);
                          if (sf.subscriptionActive) parts.push('aktive Abos');
                          if (sf.minAnalysisCount) parts.push(`≥ ${sf.minAnalysisCount} Analysen`);
                          if (sf.createdAfter || sf.createdBefore) parts.push('Datums-Range');
                          segmentDesc = parts.length > 0 ? parts.join(' + ') : 'Alle Marketing-User';
                        }

                        // Progress for sending
                        const sentSoFar = c.stats?.sent ?? 0;
                        const failedSoFar = c.stats?.failed ?? 0;
                        const totalCount = c.stats?.total ?? c.recipientCount;
                        const remainingCount = Math.max(0, totalCount - sentSoFar - failedSoFar);
                        const progressPct = totalCount > 0 ? Math.round((sentSoFar / totalCount) * 100) : 0;

                        return (
                          <div
                            key={c._id}
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: `1px solid ${isSendingNow ? '#fbbf24' : isScheduled ? '#c4b5fd' : '#bfdbfe'}`,
                              background: isSendingNow ? '#fffbeb' : isScheduled ? '#f5f3ff' : '#eff6ff'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.25rem' }}>
                                  {isSendingNow ? '⏳ ' : '📅 '}
                                  {c.name || c.subject}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.15rem' }}>
                                  Betreff: {c.subject}
                                </div>
                                {isScheduled && c.scheduledFor && (
                                  <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 500 }}>
                                    Geplant: {new Date(c.scheduledFor).toLocaleString('de-DE')}
                                    {relTime && <span style={{ marginLeft: '0.5rem', color: '#64748b', fontWeight: 400 }}>({relTime})</span>}
                                  </div>
                                )}
                                {isSendingNow && c.startedAt && (
                                  <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 500 }}>
                                    Läuft seit: {new Date(c.startedAt).toLocaleString('de-DE')}
                                  </div>
                                )}
                                {isImmediateQueued && (
                                  <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 500 }}>
                                    Wird beim nächsten Cron-Tick gestartet (max. 1 Min)
                                  </div>
                                )}
                                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                                  An: <strong>{c.recipientCount}</strong> Empfänger ({segmentDesc})
                                  {c.createdByEmail && (
                                    <span style={{ marginLeft: '0.5rem', color: '#94a3b8' }}>
                                      · von {c.createdByEmail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isSendingNow && totalCount > 0 && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>
                                  <span>{sentSoFar} / {totalCount} versendet ({remainingCount} ausstehend{failedSoFar > 0 ? `, ${failedSoFar} Fehler` : ''})</span>
                                  <span>{progressPct}%</span>
                                </div>
                                <div style={{ height: '6px', background: '#fef3c7', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${progressPct}%`, background: '#f59e0b', transition: 'width 0.3s' }} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Reminders */}
            {verificationStats && (
              <div className={styles.tableCard} style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  📧 Verifizierungs-Erinnerungen
                  <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                    (automatisch alle {verificationStats.intervalDays} Tage · Cron 10:20 Uhr · Stop nach {verificationStats.maxAgeDays / 30} Monaten)
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <strong>{verificationStats.totalUnverified}</strong> nicht verifiziert
                  {' · '}<strong>{verificationStats.eligibleForReminder}</strong> bereit für nächste Erinnerung
                  {verificationStats.optedOutCount > 0 && (
                    <span style={{ color: '#f59e0b' }}> · {verificationStats.optedOutCount} abbestellt</span>
                  )}
                </div>
              </div>
            )}

            {/* Filters + Table */}
            <div className={styles.tableCard}>
              <div className={styles.tabHeader}>
                <h3>Versendete Mails</h3>
                <button
                  className={styles.exportButton}
                  onClick={() => {
                    setEmailLogsPage(1);
                    fetchEmailLogs(1, emailLogsSearch, emailLogsCategory, emailLogsStatus);
                  }}
                  disabled={emailLogsLoading}
                  title="Aktualisieren"
                >
                  <RefreshCw size={16} />
                  Aktualisieren
                </button>
              </div>

              {/* Filter Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0 }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Empfänger oder Betreff suchen..."
                    value={emailLogsSearchInput}
                    onChange={(e) => setEmailLogsSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEmailLogsPage(1);
                        setEmailLogsSearch(emailLogsSearchInput);
                      }
                    }}
                    style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
                <select
                  value={emailLogsCategory}
                  onChange={(e) => { setEmailLogsPage(1); setEmailLogsCategory(e.target.value); }}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
                >
                  <option value="all">Alle Kategorien</option>
                  {emailLogsData?.filters.categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={emailLogsStatus}
                  onChange={(e) => { setEmailLogsPage(1); setEmailLogsStatus(e.target.value); }}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
                >
                  <option value="all">Alle Status</option>
                  <option value="sent">Gesendet</option>
                  <option value="failed">Fehlgeschlagen</option>
                </select>
                {(emailLogsSearch || emailLogsCategory !== 'all' || emailLogsStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setEmailLogsSearchInput('');
                      setEmailLogsSearch('');
                      setEmailLogsCategory('all');
                      setEmailLogsStatus('all');
                      setEmailLogsPage(1);
                    }}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.875rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <X size={14} /> Filter zurücksetzen
                  </button>
                )}
              </div>

              {/* Table */}
              <div className={styles.tableContainer}>
                {emailLogsLoading && !emailLogsData ? (
                  <div className={styles.emptyState}>
                    <RefreshCw size={48} />
                    <p>Lade Mail-Protokoll...</p>
                  </div>
                ) : emailLogsData && emailLogsData.logs.length > 0 ? (
                  <table className={styles.userTable}>
                    <thead>
                      <tr>
                        <th>Zeitpunkt</th>
                        <th>Empfänger</th>
                        <th>Betreff</th>
                        <th>Kategorie</th>
                        <th>Status</th>
                        <th>Quelle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogsData.logs.map(log => {
                        const ts = log.sentAt || log.failedAt || log.createdAt;
                        const dateObj = ts ? new Date(ts) : null;
                        return (
                          <tr key={log._id}>
                            <td>
                              {dateObj ? dateObj.toLocaleDateString('de-DE') : '—'}
                              {dateObj && (
                                <span className={styles.timeDetail}>
                                  {dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={styles.activityEmail}>{log.to || '—'}</span>
                            </td>
                            <td className={styles.activityDescription}>{log.subject || '—'}</td>
                            <td>
                              <span className={styles.activityTypeBadge}>{log.category || 'general'}</span>
                            </td>
                            <td>
                              <span className={`${styles.severityBadge} ${styles[log.status === 'sent' ? 'info' : 'error']}`}>
                                {log.status === 'sent' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                {log.status === 'sent' ? 'Gesendet' : 'Fehler'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.source || '—'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.emptyState}>
                    <Mail size={48} />
                    <p>Keine versendeten Mails</p>
                    <span>Sobald Mails versendet werden, erscheinen sie hier</span>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {emailLogsData && emailLogsData.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    Seite {emailLogsData.pagination.page} von {emailLogsData.pagination.totalPages}
                    {' · '}
                    {emailLogsData.pagination.total.toLocaleString('de-DE')} Einträge
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setEmailLogsPage(p => Math.max(1, p - 1))}
                      disabled={emailLogsData.pagination.page <= 1 || emailLogsLoading}
                      style={{ padding: '0.5rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: emailLogsData.pagination.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: emailLogsData.pagination.page <= 1 ? 0.5 : 1 }}
                    >
                      Zurück
                    </button>
                    <button
                      onClick={() => setEmailLogsPage(p => Math.min(emailLogsData.pagination.totalPages, p + 1))}
                      disabled={emailLogsData.pagination.page >= emailLogsData.pagination.totalPages || emailLogsLoading}
                      style={{ padding: '0.5rem 0.875rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: emailLogsData.pagination.page >= emailLogsData.pagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: emailLogsData.pagination.page >= emailLogsData.pagination.totalPages ? 0.5 : 1 }}
                    >
                      Weiter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && <CampaignsTab />}

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
                          const res = await fetch(`${API_URL}/api/admin/send-daily-summary`, {
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
                          const res = await fetch(`${API_URL}/api/admin/send-weekly-summary`, {
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
                    {((stats.system.memoryUsage?.heapUsed ?? 0) / 1024 / 1024).toFixed(0)} MB
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

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "./LegalPulse.module.css";
import Notification from "../components/Notification";
import RiskCard from "../components/RiskCard";
import RecommendationCard from "../components/RecommendationCard";
import ContractRiskGrid from "../components/ContractRiskGrid";
import LegalPulseSettings from "../components/LegalPulseSettings";
import LegalPulseFeedWidget from "../components/LegalPulseFeedWidget";
import { useLegalPulseFeed } from "../hooks/useLegalPulseFeed";
import { WelcomePopup } from "../components/Tour";
import OneClickCancelModal from "../components/OneClickCancelModal";
import SaveClauseModal from "../components/LegalLens/SaveClauseModal";
import { Activity, Zap, XCircle, Bell, ArrowRight, Download, Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  expiryDate?: string;
  status?: string;
  uploadedAt?: string;
  filePath?: string;
  s3Key?: string;
  s3Location?: string;
  s3Bucket?: string;
  reminder?: boolean;
  isGenerated?: boolean;
  createdAt?: string;
  // For OneClickCancelModal
  provider?: string;
  contractNumber?: string;
  customerNumber?: string;
  amount?: number;
  legalPulse?: {
    riskScore: number | null;
    healthScore?: number;
    lastAnalysis?: string;
    lastChecked?: string;
    lastRecommendation?: string;
    topRisks?: string[];
    recommendations?: string[];
    scoreHistory?: Array<{date: string, score: number}>;
    analysisHistory?: Array<{
      date: string;
      riskScore: number;
      healthScore?: number;
      changes: string[];
      triggeredBy: string;
    }>;
    lawInsights?: Array<{
      law: string;
      sectionId: string;
      sourceUrl?: string;
      relevance?: number;
      area?: string;
    }>;
  };
}

interface RiskDetail {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  solution: string;
  impact: string;
  recommendation: string;
  affectedClauseText?: string;
  replacementText?: string;
  legalBasis?: string;
}

interface RecommendationStatus {
  [key: string]: boolean;
}

// Type for risk objects (from RiskCard component)
interface RiskObject {
  title: string;
  description?: string;
  severity?: string;
  impact?: string;
  solution?: string;
  recommendation?: string;
  affectedClauses?: string[];
  affectedClauseText?: string;
  replacementText?: string;
  legalBasis?: string;
}

// Type for recommendation objects (from RecommendationCard component)
interface RecommendationObject {
  title: string;
  description?: string;
  priority?: string;
  effort?: string;
  impact?: string;
  steps?: string[];
  affectedClauseRef?: string;
  suggestedText?: string;
  legalBasis?: string;
}

// Union types for backwards compatibility
type RiskInput = string | RiskObject;
type RecommendationInput = string | RecommendationObject;

// Monitoring Health Types (V7)
interface MonitoringHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastSuccessfulRun: string | null;
  hoursAgo: number | null;
  nextExpectedRun: string | null;
  feeds: {
    active: number;
    errored: number;
    totalFeeds: number;
  };
  vectorStore: {
    contractChunks: number;
    lawSections: number;
    indexedContracts: number;
    totalContracts: number;
    indexCoverage: number;
  };
  pendingDigests: number;
  lastStats: {
    lawChangesProcessed: number;
    contractsChecked: number;
    alertsSent: number;
    duration: number;
  } | null;
}

interface PulseAlert {
  _id: string;
  contractId: string;
  contractName: string;
  lawTitle: string;
  lawArea: string | null;
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string | null;
  read: boolean;
  createdAt: string;
}

// Weekly Legal Check Types
interface WeeklyCheckFinding {
  type: 'law_change' | 'risk' | 'improvement' | 'compliance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedClause?: string;
  legalBasis?: string;
  recommendation?: string;
}

interface WeeklyCheckContract {
  contractId: string;
  contractName: string;
  latestCheck: {
    checkDate: string;
    stage1Results: {
      lawChangesFound: number;
      relevantChanges: Array<{ lawId: string; title: string; score: number }>;
    };
    stage2Results: {
      hasChanges: boolean;
      overallStatus: 'aktuell' | 'handlungsbedarf' | 'kritisch';
      findings: WeeklyCheckFinding[];
      summary: string;
    };
  };
  history: Array<{
    checkDate: string;
    overallStatus: string;
    findingsCount: number;
    summary: string;
  }>;
}

interface WeeklyChecksData {
  contracts: WeeklyCheckContract[];
  totalChecks: number;
}

// ML Forecast Types
interface ForecastEvent {
  type: string;
  severity: string;
  description: string;
  probability: number;
}

interface ForecastMonth {
  month: number;
  date: string;
  predictedRisk: number;
  predictedHealth: number;
  confidence: number;
  events: ForecastEvent[];
  method: 'ml' | 'heuristic';
}

interface ForecastData {
  contractId: string;
  currentState: {
    impactScore: number;
    factors: {
      baseRisk: number;
      ageFactor: number;
      changeDensity: number;
      lawChangeFactor: number;
      trendFactor: number;
    };
    recommendation: string;
  };
  forecast: ForecastMonth[];
  forecastMethod: 'ml' | 'heuristic';
  generatedAt: string;
  summary: {
    avgRisk: number;
    maxRisk: number;
    criticalMonths: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    highProbabilityEvents: number;
    recommendation: string;
  };
}

interface ExternalSearchResult {
  source: string;
  title: string;
  description?: string;
  date?: string;
  documentId?: string;
  relevance?: number;
  url?: string;
}

// Team Collaboration Types
interface Organization {
  id: string;
  name: string;
  ownerId: string;
  companyLogo?: string;
  memberCount: number;
  maxMembers: number;
}

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

interface Membership {
  role: 'admin' | 'member' | 'viewer';
  permissions: string[];
  isOwner: boolean;
}

export default function LegalPulse() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // ✅ Separate state for initial load
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'recommendations' | 'history' | 'forecast'>('overview');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskDetail | null>(null);
  const [riskModalType, setRiskModalType] = useState<'details' | 'solutions'>('details');
  const [completedRecommendations, setCompletedRecommendations] = useState<RecommendationStatus>({});
  const [showTooltip, setShowTooltip] = useState<{ [key: string]: boolean }>({});
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [showFeedSidebar, setShowFeedSidebar] = useState(false);
  const [showSearchSidebar, setShowSearchSidebar] = useState(false);
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [externalSearchSources, setExternalSearchSources] = useState<string[]>(['eulex', 'bundesanzeiger', 'govdata']);
  const [externalSearchArea, setExternalSearchArea] = useState('');
  const [externalSearchResults, setExternalSearchResults] = useState<ExternalSearchResult[]>([]);
  const [isExternalSearchLoading, setIsExternalSearchLoading] = useState(false);
  const [externalSearchHasMore, setExternalSearchHasMore] = useState(false);
  const [externalSearchOffset, setExternalSearchOffset] = useState(0);
  const [heroMinimized, setHeroMinimized] = useState(false);

  // Reminder State
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderDate, setReminderDate] = useState('');

  // Save to Library State
  const [showSaveClauseModal, setShowSaveClauseModal] = useState(false);
  const [clauseToSave, setClauseToSave] = useState<{ text: string; sourceContractId?: string; sourceContractName?: string; originalAnalysis?: { riskLevel: 'low' | 'medium' | 'high'; riskScore: number; mainRisk: string } } | null>(null);

  // Export Report State
  const [isExportingReport, setIsExportingReport] = useState(false);

  // V7: Monitoring Health & Alert History
  const [monitoringHealth, setMonitoringHealth] = useState<MonitoringHealth | null>(null);
  const [alertHistory, setAlertHistory] = useState<PulseAlert[]>([]);
  const [alertsUnreadCount, setAlertsUnreadCount] = useState(0);
  const [showAlertHistory, setShowAlertHistory] = useState(false);

  // Weekly Legal Check State
  const [weeklyChecks, setWeeklyChecks] = useState<WeeklyChecksData | null>(null);
  const [weeklyChecksLoading, setWeeklyChecksLoading] = useState(false);
  const [showWeeklyChecks, setShowWeeklyChecks] = useState(false);
  const [expandedWeeklyCheck, setExpandedWeeklyCheck] = useState<string | null>(null);

  // ML Forecast State
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // One-Click Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [contractToCancel, setContractToCancel] = useState<Contract | null>(null);

  // Team Collaboration State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [, setMembership] = useState<Membership | null>(null); // membership stored for future use
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamFilter, setTeamFilter] = useState<'my' | 'all' | string>('my'); // 'my', 'all', or specific userId

  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'risk'>('date');

  // Pagination State for Infinite Scroll
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    total: 0,
    hasMore: true
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null); // ✅ Ref für IntersectionObserver
  const isFirstMountRef = useRef(true); // ✅ Skip first mount in filter useEffect
  const contractsSectionRef = useRef<HTMLDivElement>(null); // ✅ Ref für "Jetzt Risiken prüfen" Scroll

  // Optimizer Integration
  const [isStartingOptimizer, setIsStartingOptimizer] = useState(false);

  // 🔐 User Subscription Check für Premium-Gating - MUSS vor Feed Hook sein!
  const [userPlan, setUserPlan] = useState<string>('free');
  const canAccessLegalPulse = ['business', 'enterprise'].includes(userPlan.toLowerCase());

  // Feed Hook - 🔐 NUR für Premium-User (SSE-Verbindung ist teuer)
  const feedHook = useLegalPulseFeed();
  // Für Free-User: leere Events, nicht verbunden
  const feedEvents = canAccessLegalPulse ? feedHook.events : [];
  const feedConnected = canAccessLegalPulse ? feedHook.isConnected : false;
  const clearEvents = canAccessLegalPulse ? feedHook.clearEvents : () => {};

  // 🔐 SSE-Verbindung trennen für Free-User
  useEffect(() => {
    if (!canAccessLegalPulse && feedHook.disconnect) {
      feedHook.disconnect();
    }
  }, [canAccessLegalPulse]);

  // ✅ REMOVED: Mock data logic - now using real data only

  // V7: Fetch Monitoring Health
  const fetchMonitoringHealth = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/legal-pulse/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMonitoringHealth(data.health);
      }
    } catch (err) {
      console.error("Health fetch error:", err);
    }
  };

  // V7: Fetch Alert History
  const fetchAlertHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/legal-pulse/alerts?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAlertHistory(data.alerts);
          setAlertsUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      console.error("Alert history fetch error:", err);
    }
  };

  // V7: Mark alerts as read
  const markAlertsAsRead = async (alertIds: string[]) => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || "";
      await fetch(`${API_BASE}/api/legal-pulse/alerts/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ alertIds })
      });
      // Update local state
      setAlertHistory(prev => prev.map(a =>
        alertIds.includes(a._id) ? { ...a, read: true } : a
      ));
      setAlertsUnreadCount(prev => Math.max(0, prev - alertIds.length));
    } catch (err) {
      console.error("Mark alerts read error:", err);
    }
  };

  // Fetch Weekly Legal Checks
  const fetchWeeklyChecks = async () => {
    setWeeklyChecksLoading(true);
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/legal-pulse/weekly-checks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWeeklyChecks(data);
      }
    } catch (err) {
      console.error("Weekly checks fetch error:", err);
    } finally {
      setWeeklyChecksLoading(false);
    }
  };

  // V7: Fetch health, alerts, and weekly checks on mount (only for premium users)
  useEffect(() => {
    if (canAccessLegalPulse) {
      fetchMonitoringHealth();
      fetchAlertHistory();
      fetchWeeklyChecks();
    }
  }, [canAccessLegalPulse]);

  // ✅ Fetch Contracts mit Server-seitiger Filterung
  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      // ✅ Filter-Parameter ans Backend senden
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        skip: '0',
        search: searchQuery,
        riskFilter: riskFilter,
        sort: sortBy
      });

      // 👥 Team Filter: Add organization filter if applicable
      if (organization && teamFilter !== 'my') {
        if (teamFilter === 'all') {
          params.set('organizationId', organization.id);
        } else {
          // Filter by specific team member
          params.set('organizationId', organization.id);
          params.set('userId', teamFilter);
        }
      }

      const url = `/api/contracts?${params}`;
      const contractsResponse = await fetch(url, { credentials: "include" });
      const contractsData = await contractsResponse.json();

      const contractsArray = Array.isArray(contractsData)
        ? contractsData
        : (contractsData.contracts || []);

      // Update pagination info
      if (contractsData.pagination) {
        setPagination({
          skip: contractsArray.length, // Start bei 20 für nächsten Load
          limit: contractsData.pagination.limit,
          total: contractsData.pagination.total,
          hasMore: contractsData.pagination.hasMore
        });
      }

      // ✅ Use real data only - no mock enrichment
      setContracts(contractsArray);

      if (contractId) {
        const contract = contractsArray.find((c: Contract) => c._id === contractId);
        if (contract) {
          setSelectedContract(contract);
        } else {
          setNotification({ message: "Vertrag nicht gefunden", type: "error" });
        }
      }
    } catch (err) {
      console.error("Error loading contracts:", err);
      setNotification({ message: "Fehler beim Laden der Daten", type: "error" });
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false); // ✅ Initial load is done
    }
  };

  // ✅ Initial Load beim Mount
  useEffect(() => {
    fetchContracts();
  }, [contractId]);

  // 🔐 User Plan bei Mount fetchen
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          // API gibt { user: { subscriptionPlan: ... } } zurück
          const user = data.user || data;
          setUserPlan(user.subscriptionPlan || user.plan || 'free');
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
        setUserPlan('free');
      }
    };
    fetchUserPlan();
  }, []);

  // 👥 Team Collaboration: Fetch Organization & Members for Premium Users
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!canAccessLegalPulse) return;

      try {
        const res = await fetch('/api/organizations/my-organization', {
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();

          if (data.success && data.organization) {
            setOrganization(data.organization);
            setMembership(data.membership);

            // Fetch team members if user is admin
            if (data.membership?.role === 'admin' || data.membership?.isOwner) {
              const membersRes = await fetch(`/api/organizations/${data.organization.id}/members`, {
                credentials: 'include'
              });

              if (membersRes.ok) {
                const membersData = await membersRes.json();
                if (membersData.success) {
                  setTeamMembers(membersData.members || []);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
      }
    };

    fetchOrganization();
  }, [canAccessLegalPulse]);

  // Hero Auto-Minimize nach erstem Besuch
  // Erstes Mal: Hero offen, danach: minimiert mit "Mehr anzeigen"
  useEffect(() => {
    const visits = parseInt(localStorage.getItem('legalPulse_heroVisits') || '0');
    const dismissed = localStorage.getItem('legalPulse_heroDismissed') === 'true';

    if (dismissed) {
      setHeroMinimized(true);
    } else if (visits >= 1) {
      // Nach dem ersten Besuch: Hero minimiert
      setHeroMinimized(true);
    }
    // Immer Visit Counter erhöhen
    localStorage.setItem('legalPulse_heroVisits', (visits + 1).toString());
  }, []);

  // ✅ Reload bei Filter-Änderungen (mit Debouncing für Search)
  useEffect(() => {
    // ✅ Überspringe First Mount (Initial Load useEffect übernimmt das)
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    const debounceTimer = setTimeout(() => {
      console.log('🔄 Filter geändert, lade Contracts neu...');
      fetchContracts();
    }, searchQuery ? 500 : 0); // 500ms Debounce für Search

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, riskFilter, sortBy, teamFilter]);

  // ✅ IntersectionObserver für Infinite Scroll
  useEffect(() => {
    if (!loadMoreRef.current || !pagination.hasMore || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && pagination.hasMore) {
          loadMoreContracts();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [pagination.hasMore, isLoadingMore, pagination.skip]); // Re-run wenn sich pagination ändert

  // ✅ Load more contracts (Infinite Scroll) mit Filtern
  const loadMoreContracts = async () => {
    if (isLoadingMore || !pagination.hasMore) return;

    setIsLoadingMore(true);
    try {
      // ✅ Gleiche Filter wie bei fetchContracts verwenden!
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        skip: pagination.skip.toString(),
        search: searchQuery,
        riskFilter: riskFilter,
        sort: sortBy
      });

      const url = `/api/contracts?${params}`;
      const contractsResponse = await fetch(url, { credentials: "include" });
      const contractsData = await contractsResponse.json();

      const contractsArray = Array.isArray(contractsData)
        ? contractsData
        : (contractsData.contracts || []);

      // Update pagination info
      if (contractsData.pagination) {
        setPagination(prev => ({
          skip: prev.skip + contractsArray.length,
          limit: contractsData.pagination.limit,
          total: contractsData.pagination.total,
          hasMore: contractsData.pagination.hasMore
        }));
      }

      // Enrich and append new contracts
      // ✅ Use real data only - no mock enrichment
      setContracts(prev => [...prev, ...contractsArray]);
    } catch (err) {
      console.error("Error loading more contracts:", err);
      setNotification({ message: "Fehler beim Laden weiterer Verträge", type: "error" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getRiskLevel = (score: number | null) => {
    if (score === null || score === undefined) return { level: 'Unbekannt', color: '#6b7280', icon: '❓' };
    if (score <= 30) return { level: 'Niedrig', color: '#10b981', icon: '✅' };
    if (score <= 60) return { level: 'Mittel', color: '#f59e0b', icon: '⚠️' };
    return { level: 'Hoch', color: '#ef4444', icon: '🔴' };
  };

  const getRiskScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return '#6b7280';
    if (score <= 30) return '#10b981';
    if (score <= 60) return '#f59e0b';
    return '#ef4444';
  };

  const dismissHero = () => {
    localStorage.setItem('legalPulse_heroDismissed', 'true');
    setHeroMinimized(true);
  };

  const expandHero = () => {
    setHeroMinimized(false);
  };

  // Scroll zu den Pulse-Analysen
  const scrollToContracts = () => {
    contractsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // ✅ Keine lokale Filterung mehr - Backend macht das jetzt!

  // Helper to validate severity type
  const validateSeverity = (severity?: string): 'low' | 'medium' | 'high' => {
    if (severity === 'low' || severity === 'high') return severity;
    return 'medium'; // default
  };

  // Event Handlers
  const handleShowRiskDetails = (risk: RiskInput) => {
    // Convert to RiskDetail format (supports both string and object)
    const riskDetail: RiskDetail = typeof risk === 'string'
      ? {
          id: 'legacy-risk',
          title: risk,
          description: risk,
          severity: 'medium',
          solution: 'Detaillierte Analyse erforderlich',
          impact: 'Potenzielle rechtliche Auswirkungen',
          recommendation: 'Rechtliche Prüfung empfohlen'
        }
      : {
          id: risk.title || 'risk',
          title: risk.title || 'Unbekanntes Risiko',
          description: risk.description || risk.title || 'Keine Beschreibung verfügbar',
          severity: validateSeverity(risk.severity),
          solution: risk.solution || 'Lösung wird analysiert',
          impact: risk.impact || 'Auswirkungen werden geprüft',
          recommendation: risk.recommendation || 'Empfehlung wird erstellt',
          affectedClauseText: typeof risk === 'object' ? risk.affectedClauseText : undefined,
          replacementText: typeof risk === 'object' ? risk.replacementText : undefined,
          legalBasis: typeof risk === 'object' ? risk.legalBasis : undefined
        };

    setSelectedRisk(riskDetail);
    setRiskModalType('details');
    setShowRiskModal(true);
  };

  const handleShowSolution = (risk: RiskInput) => {
    // Convert to RiskDetail format (supports both string and object)
    const riskDetail: RiskDetail = typeof risk === 'string'
      ? {
          id: 'legacy-risk',
          title: risk,
          description: risk,
          severity: 'medium',
          solution: 'Detaillierte Analyse erforderlich',
          impact: 'Potenzielle rechtliche Auswirkungen',
          recommendation: 'Rechtliche Prüfung empfohlen'
        }
      : {
          id: risk.title || 'risk',
          title: risk.title || 'Unbekanntes Risiko',
          description: risk.description || risk.title || 'Keine Beschreibung verfügbar',
          severity: validateSeverity(risk.severity),
          solution: risk.solution || 'Lösung wird analysiert',
          impact: risk.impact || 'Auswirkungen werden geprüft',
          recommendation: risk.recommendation || 'Empfehlung wird erstellt',
          affectedClauseText: typeof risk === 'object' ? risk.affectedClauseText : undefined,
          replacementText: typeof risk === 'object' ? risk.replacementText : undefined,
          legalBasis: typeof risk === 'object' ? risk.legalBasis : undefined
        };

    setSelectedRisk(riskDetail);
    setRiskModalType('solutions');
    setShowRiskModal(true);
  };

  const handleMarkRecommendationComplete = (recommendationIndex: number) => {
    const key = `${selectedContract?._id}-${recommendationIndex}`;
    setCompletedRecommendations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    const action = completedRecommendations[key] ? "als offen markiert" : "als erledigt markiert";
    setNotification({ 
      message: `Empfehlung ${action}`, 
      type: "success" 
    });
  };

  const handleImplementRecommendation = (recommendation: RecommendationInput) => {
    const recText = typeof recommendation === 'string' ? recommendation : recommendation.title || recommendation.description;
    setNotification({
      message: "Weiterleitung zum Optimizer...",
      type: "success"
    });
    // Navigate to optimizer with recommendation context
    navigate('/optimizer', {
      state: {
        contractId: selectedContract?._id,
        recommendation: recText
      }
    });
  };

  // Save Risk to Clause Library
  const handleSaveRiskToLibrary = (risk: RiskObject) => {
    const parts = [
      risk.affectedClauseText || risk.description || risk.title,
      risk.replacementText ? `\n\nVorgeschlagener Ersatz:\n${risk.replacementText}` : '',
      risk.legalBasis ? `\n\nRechtsgrundlage: ${risk.legalBasis}` : ''
    ];

    setClauseToSave({
      text: parts.join(''),
      sourceContractId: selectedContract?._id,
      sourceContractName: selectedContract?.name,
      originalAnalysis: {
        riskLevel: risk.severity === 'critical' || risk.severity === 'high' ? 'high' : risk.severity === 'medium' ? 'medium' : 'low',
        riskScore: risk.severity === 'critical' ? 90 : risk.severity === 'high' ? 75 : risk.severity === 'medium' ? 50 : 25,
        mainRisk: risk.title
      }
    });
    setShowSaveClauseModal(true);
  };

  // Save Recommendation to Clause Library
  const handleSaveRecommendationToLibrary = (rec: RecommendationObject) => {
    const parts = [
      rec.suggestedText || rec.description || rec.title,
      rec.affectedClauseRef ? `\n\nBetrifft: ${rec.affectedClauseRef}` : '',
      rec.legalBasis ? `\n\nRechtsgrundlage: ${rec.legalBasis}` : ''
    ];

    setClauseToSave({
      text: parts.join(''),
      sourceContractId: selectedContract?._id,
      sourceContractName: selectedContract?.name,
      originalAnalysis: {
        riskLevel: rec.priority === 'critical' || rec.priority === 'high' ? 'high' : rec.priority === 'medium' ? 'medium' : 'low',
        riskScore: rec.priority === 'critical' ? 90 : rec.priority === 'high' ? 75 : rec.priority === 'medium' ? 50 : 25,
        mainRisk: rec.title
      }
    });
    setShowSaveClauseModal(true);
  };

  // Export Legal Pulse Report as PDF
  const handleExportReport = async () => {
    if (!selectedContract) return;
    setIsExportingReport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/legal-pulse/report/${selectedContract._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Report generation failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Legal-Pulse-Report-${selectedContract.name || 'Vertrag'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setNotification({ message: 'Report wurde heruntergeladen', type: 'success' });
    } catch {
      setNotification({ message: 'Fehler beim Erstellen des Reports', type: 'error' });
    } finally {
      setIsExportingReport(false);
    }
  };

  const handleContractCardClick = (contract: Contract) => {
    navigate(`/legalpulse/${contract._id}`);
  };

  const handleMouseEnter = (contractId: string) => {
    setShowTooltip(prev => ({ ...prev, [contractId]: true }));
  };

  const handleMouseLeave = (contractId: string) => {
    setShowTooltip(prev => ({ ...prev, [contractId]: false }));
  };

  // External Legal Search Handler
  const handleExternalSearch = async (append = false) => {
    if (!externalSearchQuery.trim()) {
      setNotification({ message: "Bitte geben Sie einen Suchbegriff ein", type: "error" });
      return;
    }

    setIsExternalSearchLoading(true);
    try {
      const offset = append ? externalSearchOffset : 0;
      const params = new URLSearchParams({
        query: externalSearchQuery,
        sources: externalSearchSources.join(','),
        limit: '100',
        offset: offset.toString()
      });

      if (externalSearchArea) {
        params.append('area', externalSearchArea);
      }

      const response = await fetch(`/api/external-legal/search?${params.toString()}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        const newResults = data.results || [];

        if (append) {
          setExternalSearchResults(prev => [...prev, ...newResults]);
        } else {
          setExternalSearchResults(newResults);
          setExternalSearchOffset(0);
        }

        setExternalSearchHasMore(newResults.length === 100);
        setExternalSearchOffset(append ? offset + newResults.length : newResults.length);

        if (!append) {
          setNotification({
            message: `${newResults.length} Ergebnisse gefunden${newResults.length === 100 ? ' (mehr verfügbar)' : ''}`,
            type: "success"
          });
        }
      } else {
        setNotification({ message: data.message || "Fehler bei der Suche", type: "error" });
      }
    } catch (error) {
      console.error('External search error:', error);
      setNotification({ message: "Fehler bei der externen Suche", type: "error" });
    } finally {
      setIsExternalSearchLoading(false);
    }
  };

  const handleLoadMoreResults = () => {
    handleExternalSearch(true);
  };

  const toggleExternalSource = (source: string) => {
    setExternalSearchSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  // ML Forecast API Call
  const fetchForecast = async (contractId: string) => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const response = await fetch(`/api/predictive/forecast/${contractId}?months=6`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.forecast) {
        setForecastData(data.forecast);
      } else {
        setForecastError(data.message || 'Prognose konnte nicht geladen werden');
      }
    } catch (error) {
      console.error('[LEGAL-PULSE] Forecast fetch error:', error);
      setForecastError('Verbindungsfehler bei der Prognose');
    } finally {
      setForecastLoading(false);
    }
  };

  // Fetch forecast when switching to forecast tab
  useEffect(() => {
    if (activeTab === 'forecast' && selectedContract && !forecastData && !forecastLoading) {
      fetchForecast(selectedContract._id);
    }
  }, [activeTab, selectedContract?._id]);

  // Reset forecast when contract changes
  useEffect(() => {
    setForecastData(null);
    setForecastError(null);
  }, [selectedContract?._id]);

  // Legal Pulse → Optimizer Handoff
  const handleStartOptimizer = async () => {
    if (!selectedContract) {
      console.log('[LP-OPTIMIZER] Kein Vertrag ausgewählt');
      return;
    }

    console.log('[LP-OPTIMIZER] Starting optimizer for contract:', selectedContract._id);
    console.log('[LP-OPTIMIZER] Contract has S3 Key:', !!selectedContract.s3Key);
    console.log('[LP-OPTIMIZER] Contract has filePath:', !!selectedContract.filePath);
    console.log('[LP-OPTIMIZER] Full contract storage info:', {
      s3Key: selectedContract.s3Key,
      s3Location: selectedContract.s3Location,
      filePath: selectedContract.filePath
    });

    setIsStartingOptimizer(true);
    try {
      console.log('[LP-OPTIMIZER] Sending API request...');

      // Send contract ID and any available storage info
      // Backend will handle both S3 and legacy local storage
      const response = await fetch('/api/optimize/start-from-legalpulse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          contractId: selectedContract._id,
          s3Key: selectedContract.s3Key, // May be undefined for legacy contracts
          s3Location: selectedContract.s3Location, // May be undefined for legacy contracts
          risks: selectedContract.legalPulse?.topRisks || [],
          recommendations: selectedContract.legalPulse?.recommendations || []
        })
      });

      console.log('[LP-OPTIMIZER] Response status:', response.status);
      const data = await response.json();
      console.log('[LP-OPTIMIZER] Response data:', data);

      if (data.success && data.jobId) {
        console.log('[LP-OPTIMIZER] Job created successfully:', data.jobId);
        setNotification({
          message: 'Optimierung wird gestartet...',
          type: 'success'
        });
        // Navigate to optimizer page with jobId
        setTimeout(() => {
          navigate(`/optimizer/${data.jobId}`);
        }, 500);
      } else {
        setNotification({
          message: data.message || 'Fehler beim Starten der Optimierung',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('[LP-OPTIMIZER] Error:', error);
      setNotification({
        message: 'Fehler beim Starten der Optimierung',
        type: 'error'
      });
    } finally {
      setIsStartingOptimizer(false);
    }
  };

  // Detailansicht für einzelnen Vertrag
  if (contractId && selectedContract) {
    const riskLevel = getRiskLevel(selectedContract.legalPulse?.riskScore || null);
    const scoreHistory = selectedContract.legalPulse?.scoreHistory || [];

    // Check if Legal Pulse analysis is still loading/running
    const isAnalysisLoading = !selectedContract.legalPulse ||
                             (selectedContract.legalPulse.riskScore === null &&
                              !selectedContract.legalPulse.lastChecked);

    // 🔐 Premium-Check für Detail-Ansicht
    if (!canAccessLegalPulse) {
      return (
        <div className={styles.legalPulseContainer}>
          <Helmet>
            <title>Legal Pulse: {selectedContract.name} – Contract AI</title>
          </Helmet>

          <div className={styles.premiumGate}>
            <button
              className={styles.backButton}
              onClick={() => navigate('/legalpulse')}
              style={{ marginBottom: '2rem' }}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Zurück zur Übersicht
            </button>

            <div className={styles.premiumGateCard}>
              <div className={styles.premiumGateIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <h2>Premium-Feature</h2>
              <h3>{selectedContract.name}</h3>
              <p>Die detaillierte Legal Pulse Analyse mit Risiko-Score, Empfehlungen und Verlaufsdaten ist nur für Business- und Enterprise-Kunden verfügbar.</p>

              <div className={styles.premiumGateFeatures}>
                <div className={styles.premiumGateFeature}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Detaillierter Risiko-Score (0-100)</span>
                </div>
                <div className={styles.premiumGateFeature}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Top-Risiken mit Lösungsvorschlägen</span>
                </div>
                <div className={styles.premiumGateFeature}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Handlungsempfehlungen</span>
                </div>
                <div className={styles.premiumGateFeature}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Score-Verlauf & Trends</span>
                </div>
                <div className={styles.premiumGateFeature}>
                  <span className={styles.checkIcon}>✓</span>
                  <span>Echtzeit-Benachrichtigungen</span>
                </div>
              </div>

              <Link to="/subscribe" className={styles.premiumGateButton}>
                Jetzt upgraden
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.legalPulseContainer}>
        <Helmet>
          <title>Legal Pulse: {selectedContract.name} – Contract AI</title>
          <meta name="description" content={`Rechtliche Risikoanalyse für ${selectedContract.name}`} />
        </Helmet>

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.headerTop}>
            <button
              className={styles.backButton}
              onClick={() => navigate('/legalpulse')}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Zurück zur Übersicht
            </button>

            <button
              className={styles.optimizeButton}
              onClick={handleStartOptimizer}
              disabled={isStartingOptimizer}
            >
              {isStartingOptimizer ? (
                <>
                  <div className={styles.spinner}></div>
                  Wird gestartet...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor"/>
                  </svg>
                  Vertrag optimieren
                </>
              )}
            </button>
          </div>

          <div className={styles.contractHeader}>
            <div className={styles.contractTitle}>
              <h1>{selectedContract.name}</h1>
              {selectedContract.isGenerated && (
                <span className={styles.generatedBadge}>✨ KI-Generiert</span>
              )}
            </div>
            <p className={styles.lastAnalysis}>
              Letzte Analyse: {new Date(selectedContract.legalPulse?.lastAnalysis || Date.now()).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Score Hero Section */}
        <div className={styles.scoreSection}>
          <div className={styles.scoreCard}>
            <div className={styles.scoreHeader}>
              <h2>Risiko-Score</h2>
            </div>
            {isAnalysisLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner}></div>
                <div className={styles.loadingText}>
                  <h3>Legal Pulse Analyse läuft...</h3>
                  <p>Die KI-Analyse wird im Hintergrund durchgeführt. Dies kann bis zu 30 Sekunden dauern.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className={styles.refreshButton}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}
                  >
                    🔄 Seite aktualisieren
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.scoreDisplay}>
                <div
                  className={styles.scoreCircle}
                  style={{ '--score-color': riskLevel.color, '--score': selectedContract.legalPulse?.riskScore || 0 } as React.CSSProperties}
                >
                  <span className={styles.scoreNumber}>
                    {selectedContract.legalPulse?.riskScore || '—'}
                  </span>
                  <span className={styles.scoreMax}>/100</span>
                </div>
                <div className={styles.riskLevel}>
                  <span className={styles.riskIcon}>{riskLevel.icon}</span>
                  <span
                    className={styles.riskLabel}
                    style={{ color: riskLevel.color }}
                  >
                    {riskLevel.level}
                  </span>
                </div>
              </div>
            )}

            {/* Health Score Badge */}
            {selectedContract.legalPulse?.healthScore !== undefined && (
              <div className={styles.healthScoreBadge}>
                <span className={styles.healthLabel}>Legal Health:</span>
                <span
                  className={styles.healthValue}
                  style={{
                    color: selectedContract.legalPulse.healthScore >= 80 ? '#10b981' :
                           selectedContract.legalPulse.healthScore >= 50 ? '#f59e0b' : '#ef4444'
                  }}
                >
                  {selectedContract.legalPulse.healthScore}/100
                </span>
              </div>
            )}
            
            {scoreHistory.length > 0 && (
              <div className={styles.scoreTrend}>
                <h4>Entwicklung über Zeit</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: '#1f2937'
                      }}
                      labelStyle={{
                        color: '#1f2937',
                        fontWeight: 600
                      }}
                      itemStyle={{
                        color: '#1f2937'
                      }}
                      formatter={(value: number) => [`${Number(value).toFixed(1)}/100`, 'Score']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke={getRiskScoreColor(selectedContract.legalPulse?.riskScore || null)}
                      strokeWidth={2}
                      dot={{ fill: getRiskScoreColor(selectedContract.legalPulse?.riskScore || null), strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12L5 10L12 17L22 7" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Übersicht
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'risks' ? styles.active : ''}`}
            onClick={() => setActiveTab('risks')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2"/>
              <path d="M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Risiken ({selectedContract.legalPulse?.topRisks?.length || 0})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'recommendations' ? styles.active : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 2.96086 3.58579 2.58579C3.96086 2.21071 4.46957 2 5 2H16" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Empfehlungen ({selectedContract.legalPulse?.recommendations?.length || 0})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L16 14" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Historie
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'forecast' ? styles.active : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            ML-Prognose
          </button>

          {/* Export Report Button */}
          <button
            className={styles.exportReportButton}
            onClick={handleExportReport}
            disabled={isExportingReport}
            title="Legal Pulse Audit-Report als PDF exportieren"
          >
            <Download size={14} />
            {isExportingReport ? 'Wird erstellt...' : 'Report'}
          </button>
        </div>

        {/* Quick Actions Bar - Shows for high-risk contracts */}
        {selectedContract && selectedContract.legalPulse?.riskScore && selectedContract.legalPulse.riskScore > 60 && (
          <div className={styles.quickActionsBar}>
            <div className={styles.quickActionsHeader}>
              <span className={styles.quickActionsIcon}>⚡</span>
              <div>
                <h4>Empfohlene Aktionen</h4>
                <p>Dieser Vertrag hat einen hohen Risiko-Score ({selectedContract.legalPulse.riskScore}/100)</p>
              </div>
            </div>
            <div className={styles.quickActionsButtons}>
              <button
                className={styles.quickActionBtn}
                onClick={() => navigate(`/optimizer?contractId=${selectedContract._id}`)}
              >
                <Zap size={18} />
                Vertrag optimieren
                <ArrowRight size={14} />
              </button>
              <button
                className={`${styles.quickActionBtn} ${styles.cancelBtn}`}
                onClick={() => {
                  setContractToCancel(selectedContract);
                  setShowCancelModal(true);
                }}
              >
                <XCircle size={18} />
                Kündigung vorbereiten
              </button>
              <button
                className={styles.quickActionBtn}
                onClick={() => navigate(`/calendar?contractId=${selectedContract._id}`)}
              >
                <Bell size={18} />
                Frist-Reminder
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'overview' && (
            <div className={styles.overviewTab}>
              <div className={styles.overviewGrid}>
                <div className={styles.quickStats}>
                  <h3>Schnellübersicht</h3>
                  <div className={styles.statsList}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Risiko-Level:</span>
                      <span className={styles.statValue} style={{ color: riskLevel.color }}>
                        {riskLevel.icon} {riskLevel.level}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Identifizierte Risiken:</span>
                      <span className={styles.statValue}>
                        {selectedContract.legalPulse?.topRisks?.length || 0}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Empfohlene Maßnahmen:</span>
                      <span className={styles.statValue}>
                        {selectedContract.legalPulse?.recommendations?.length || 0}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Letzte Empfehlung:</span>
                      <span className={styles.statValue}>
                        {selectedContract.legalPulse?.lastRecommendation || 'Keine verfügbar'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.overviewActions}>
                  <h3>Nächste Schritte</h3>
                  <div className={styles.actionsList}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => setActiveTab('risks')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V13" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2"/>
                        <path d="M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Risiken analysieren
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => setActiveTab('recommendations')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Empfehlungen umsetzen
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.primaryAction}`}
                      onClick={handleStartOptimizer}
                      disabled={isStartingOptimizer}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {isStartingOptimizer ? 'Wird gestartet...' : 'Vertrag optimieren'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <div className={styles.risksTab}>
              <div className={styles.sectionHeader}>
                <h3>🔴 Identifizierte Risiken</h3>
                <p>Diese rechtlichen Risiken wurden in Ihrem Vertrag identifiziert</p>
              </div>
              <div className={styles.risksList}>
                {selectedContract.legalPulse?.topRisks?.map((risk, index) => (
                  <RiskCard
                    key={index}
                    risk={risk}
                    index={index}
                    contractId={selectedContract._id}
                    onShowDetails={handleShowRiskDetails}
                    onShowSolution={handleShowSolution}
                    onSaveToLibrary={handleSaveRiskToLibrary}
                    onFeedback={(feedback) => {
                      setNotification({
                        message: feedback === 'helpful'
                          ? "✓ Danke für Ihr Feedback!"
                          : "✓ Feedback gespeichert",
                        type: "success"
                      });
                    }}
                  />
                )) || (
                  <div className={styles.emptyState}>
                    <p>Keine Risiken identifiziert</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className={styles.recommendationsTab}>
              <div className={styles.sectionHeader}>
                <h3>💡 Empfohlene Maßnahmen</h3>
                <p>Konkrete Schritte zur Risikominimierung</p>
              </div>
              <div className={styles.recommendationsList}>
                {selectedContract.legalPulse?.recommendations?.map((recommendation, index) => {
                  const isCompleted = completedRecommendations[`${selectedContract._id}-${index}`];
                  return (
                    <RecommendationCard
                      key={index}
                      recommendation={recommendation}
                      index={index}
                      contractId={selectedContract._id}
                      isCompleted={isCompleted}
                      onMarkComplete={handleMarkRecommendationComplete}
                      onImplement={handleImplementRecommendation}
                      onSaveToLibrary={handleSaveRecommendationToLibrary}
                      onFeedback={(feedback) => {
                        setNotification({
                          message: feedback === 'helpful'
                            ? "✓ Danke für Ihr Feedback!"
                            : "✓ Feedback gespeichert",
                          type: "success"
                        });
                      }}
                    />
                  );
                }) || (
                  <div className={styles.emptyState}>
                    <p>Keine Empfehlungen verfügbar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className={styles.historyTab}>
              <div className={styles.sectionHeader}>
                <h3>📊 Analyse-Historie</h3>
                <p>Entwicklung des Risiko-Scores über Zeit</p>
              </div>
              <div className={styles.chartLegend}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.legendIcon}>
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Zeitverlauf des Risiko-Scores (0–100); höher = riskanter</span>
              </div>
              <div className={styles.historyContent}>
                <div className={styles.historyChart}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#1f2937'
                        }}
                        labelStyle={{
                          color: '#1f2937',
                          fontWeight: 600
                        }}
                        itemStyle={{
                          color: '#1f2937'
                        }}
                        formatter={(value: number) => [`${Number(value).toFixed(1)}/100`, 'Risiko-Score']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke={getRiskScoreColor(selectedContract.legalPulse?.riskScore || null)}
                        fill={`${getRiskScoreColor(selectedContract.legalPulse?.riskScore || null)}20`}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'forecast' && (
            <div className={styles.forecastTab}>
              <div className={styles.sectionHeader}>
                <h3>🤖 ML-Prognose</h3>
                <p>KI-basierte Vorhersagen für Risiken und Vertragsentwicklung</p>
              </div>

              {/* Loading State */}
              {forecastLoading && (
                <div className={styles.forecastLoading}>
                  <div className={styles.loadingSpinner}></div>
                  <p>Prognose wird berechnet...</p>
                </div>
              )}

              {/* Error State */}
              {forecastError && !forecastLoading && (
                <div className={styles.forecastError}>
                  <div className={styles.infoBox} style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
                    <div className={styles.infoIcon}>⚠️</div>
                    <div className={styles.infoContent}>
                      <h4>Prognose nicht verfügbar</h4>
                      <p>{forecastError}</p>
                      <button
                        className={styles.retryButton}
                        onClick={() => selectedContract && fetchForecast(selectedContract._id)}
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Forecast Data */}
              {forecastData && !forecastLoading && (
                <>
                  {/* Forecast Overview Cards */}
                  <div className={styles.forecastCards}>
                    <div className={styles.forecastCard}>
                      <div className={styles.cardIcon}>🎯</div>
                      <div className={styles.cardContent}>
                        <h4>Risiko-Trend (6 Monate)</h4>
                        <div className={styles.cardValue} style={{
                          color: forecastData.summary.trend === 'increasing' ? '#ef4444' :
                                 forecastData.summary.trend === 'stable' ? '#f59e0b' : '#10b981'
                        }}>
                          {forecastData.summary.trend === 'increasing' ? '↑ Steigend' :
                           forecastData.summary.trend === 'stable' ? '→ Stabil' : '↓ Sinkend'}
                        </div>
                        <p className={styles.cardDescription}>
                          Durchschnittliches Risiko: {forecastData.summary.avgRisk}/100
                        </p>
                      </div>
                    </div>
                    <div className={styles.forecastCard}>
                      <div className={styles.cardIcon}>⚠️</div>
                      <div className={styles.cardContent}>
                        <h4>Kritische Monate</h4>
                        <div className={styles.cardValue} style={{
                          color: forecastData.summary.criticalMonths > 2 ? '#ef4444' :
                                 forecastData.summary.criticalMonths > 0 ? '#f59e0b' : '#10b981'
                        }}>
                          {forecastData.summary.criticalMonths} von 6
                        </div>
                        <p className={styles.cardDescription}>
                          Maximales Risiko: {forecastData.summary.maxRisk}/100
                        </p>
                      </div>
                    </div>
                    <div className={styles.forecastCard}>
                      <div className={styles.cardIcon}>📊</div>
                      <div className={styles.cardContent}>
                        <h4>Modell-Typ</h4>
                        <div className={styles.cardValue}>
                          {forecastData.forecastMethod === 'ml' ? '🧠 Machine Learning' : '📈 Heuristik'}
                        </div>
                        <p className={styles.cardDescription}>
                          Konfidenz: {forecastData.forecast[0]?.confidence
                            ? `${Math.round(forecastData.forecast[0].confidence * 100)}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Box */}
                  <div className={styles.mlStatus}>
                    <div className={styles.infoBox}>
                      <div className={styles.infoIcon}>💡</div>
                      <div className={styles.infoContent}>
                        <h4>Empfehlung</h4>
                        <p>{forecastData.summary.recommendation}</p>
                        {forecastData.summary.highProbabilityEvents > 0 && (
                          <p className={styles.infoNote}>
                            {forecastData.summary.highProbabilityEvents} wahrscheinliche Events in den nächsten 6 Monaten erwartet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Forecast Chart */}
                  <div className={styles.forecastSection}>
                    <h4>📅 6-Monats-Prognose</h4>
                    <div className={styles.forecastChart}>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={forecastData.forecast}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis
                            dataKey="month"
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(month) => `Monat ${month}`}
                          />
                          <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            formatter={(value: number, name: string) => [
                              `${Math.round(value)}/100`,
                              name === 'predictedRisk' ? 'Risiko' : 'Gesundheit'
                            ]}
                            labelFormatter={(month) => `Monat ${month}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="predictedRisk"
                            stroke="#ef4444"
                            fill="#fef2f2"
                            strokeWidth={2}
                            name="Risiko"
                          />
                          <Area
                            type="monotone"
                            dataKey="predictedHealth"
                            stroke="#10b981"
                            fill="#ecfdf5"
                            strokeWidth={2}
                            name="Gesundheit"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Predicted Events Timeline */}
                  {forecastData.forecast.some(f => f.events && f.events.length > 0) && (
                    <div className={styles.forecastSection}>
                      <h4>🔮 Vorhergesagte Events</h4>
                      <div className={styles.eventsTimeline}>
                        {forecastData.forecast.map((month, idx) => (
                          month.events && month.events.length > 0 && (
                            <div key={idx} className={styles.eventMonth}>
                              <div className={styles.eventMonthHeader}>
                                <span className={styles.monthLabel}>Monat {month.month}</span>
                                <span className={styles.eventDate}>
                                  {new Date(month.date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              {month.events.map((event, eventIdx) => (
                                <div
                                  key={eventIdx}
                                  className={styles.eventItem}
                                  style={{
                                    borderLeftColor: event.severity === 'critical' ? '#ef4444' :
                                                     event.severity === 'high' ? '#f59e0b' :
                                                     event.severity === 'medium' ? '#3b82f6' : '#10b981'
                                  }}
                                >
                                  <div className={styles.eventType}>
                                    {event.type === 'law_change' ? '⚖️' :
                                     event.type === 'expiry' ? '📅' :
                                     event.type === 'deadline' ? '⏰' : '📊'} {event.type}
                                  </div>
                                  <div className={styles.eventDescription}>{event.description}</div>
                                  <div className={styles.eventProbability}>
                                    Wahrscheinlichkeit: {Math.round(event.probability * 100)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* No contract selected */}
              {!selectedContract && !forecastLoading && (
                <div className={styles.mlStatus}>
                  <div className={styles.infoBox}>
                    <div className={styles.infoIcon}>ℹ️</div>
                    <div className={styles.infoContent}>
                      <h4>Kein Vertrag ausgewählt</h4>
                      <p>Wählen Sie einen Vertrag aus der Liste, um die ML-Prognose anzuzeigen.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Risk Details Modal */}
        {showRiskModal && selectedRisk && (
          <div className={styles.modalOverlay} onClick={() => setShowRiskModal(false)}>
            <div className={styles.riskModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{selectedRisk.title}</h2>
                <button
                  className={styles.modalCloseButton}
                  onClick={() => setShowRiskModal(false)}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              <div className={styles.modalBody}>
                {riskModalType === 'details' ? (
                  <>
                    {/* Details View: Beschreibung + Auswirkungen */}
                    <div className={styles.riskDetailSection}>
                      <h4>🔍 Beschreibung</h4>
                      <p>{selectedRisk.description}</p>
                    </div>

                    <div className={styles.riskDetailSection}>
                      <h4>⚠️ Auswirkungen</h4>
                      <p>{selectedRisk.impact}</p>
                    </div>

                    {selectedRisk.affectedClauseText && (
                      <div className={styles.riskDetailSection}>
                        <h4>📄 Betroffene Klausel</h4>
                        <div className={styles.clauseQuoteBlock}>
                          {selectedRisk.affectedClauseText}
                        </div>
                      </div>
                    )}

                    {selectedRisk.legalBasis && (
                      <div className={styles.riskDetailSection}>
                        <h4>⚖️ Rechtsgrundlage</h4>
                        <p className={styles.legalBasisText}>{selectedRisk.legalBasis}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Solutions View: Lösungsvorschlag + Empfehlung */}
                    <div className={styles.riskDetailSection}>
                      <h4>💡 Lösungsvorschlag</h4>
                      <p>{selectedRisk.solution}</p>
                    </div>

                    <div className={styles.riskDetailSection}>
                      <h4>📋 Empfehlung</h4>
                      <p>{selectedRisk.recommendation}</p>
                    </div>

                    {selectedRisk.replacementText && (
                      <div className={styles.riskDetailSection}>
                        <h4>✏️ Vorgeschlagener Ersatztext</h4>
                        <div className={styles.replacementTextBlock}>
                          {selectedRisk.replacementText}
                        </div>
                      </div>
                    )}

                    {selectedRisk.legalBasis && (
                      <div className={styles.riskDetailSection}>
                        <h4>⚖️ Rechtsgrundlage</h4>
                        <p className={styles.legalBasisText}>{selectedRisk.legalBasis}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Reminder Section */}
                <div className={styles.reminderSection}>
                  {!showReminderPicker ? (
                    <button
                      className={styles.reminderButton}
                      onClick={() => setShowReminderPicker(true)}
                    >
                      🔔 Erinnerung setzen
                    </button>
                  ) : (
                    <div className={styles.reminderPicker}>
                      <label>Erinnerungsdatum:</label>
                      <input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={styles.reminderDateInput}
                      />
                      <div className={styles.reminderPickerActions}>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => setShowReminderPicker(false)}
                        >
                          Abbrechen
                        </button>
                        <button
                          className={styles.primaryButton}
                          disabled={!reminderDate}
                          onClick={async () => {
                            if (!reminderDate || !selectedContract) return;
                            try {
                              const token = localStorage.getItem('token');
                              const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/calendar/events`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  contractId: selectedContract._id,
                                  title: `Risiko prüfen: ${selectedRisk.title}`,
                                  description: `Legal Pulse Erinnerung: ${selectedRisk.description}`,
                                  date: reminderDate,
                                  type: 'reminder'
                                })
                              });
                              const data = await res.json();
                              if (data.success || res.ok) {
                                setNotification({ message: 'Erinnerung erstellt!', type: 'success' });
                                setShowReminderPicker(false);
                                setReminderDate('');
                              } else {
                                setNotification({ message: 'Fehler beim Erstellen der Erinnerung', type: 'error' });
                              }
                            } catch {
                              setNotification({ message: 'Fehler beim Erstellen der Erinnerung', type: 'error' });
                            }
                          }}
                        >
                          Erinnerung erstellen
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setShowRiskModal(false)}
                  >
                    Schließen
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={() => {
                      setShowRiskModal(false);
                      navigate('/optimizer', {
                        state: {
                          contractId: selectedContract._id,
                          riskToFix: selectedRisk
                        }
                      });
                    }}
                  >
                    Jetzt optimieren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Clause Modal */}
        {showSaveClauseModal && clauseToSave && (
          <SaveClauseModal
            clauseText={clauseToSave.text}
            sourceContractId={clauseToSave.sourceContractId}
            sourceContractName={clauseToSave.sourceContractName}
            originalAnalysis={clauseToSave.originalAnalysis}
            onClose={() => {
              setShowSaveClauseModal(false);
              setClauseToSave(null);
            }}
            onSaved={() => {
              setShowSaveClauseModal(false);
              setClauseToSave(null);
              setNotification({ message: 'Klausel in Bibliothek gespeichert!', type: 'success' });
            }}
          />
        )}

        {/* Bottom CTA */}
        <div className={styles.bottomCTA}>
          <div className={styles.ctaContent}>
            <h2>Bleiben Sie vorbereitet. Reagieren Sie jetzt.</h2>
            <p>Optimieren Sie Ihren Vertrag mit unserer KI-gestützten Lösung</p>
            <button
              className={styles.primaryCTAButton}
              onClick={() => navigate('/optimizer')}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Vertrag jetzt optimieren
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Übersichtsseite (wenn keine contractId)
  return (
    <div className={styles.legalPulseContainer}>
      <WelcomePopup
        featureId="legal-pulse"
        icon={<Activity size={32} />}
        title="Legal Pulse - Risiko-Monitoring"
        description="Legal Pulse überwacht Ihre Verträge automatisch auf Gesetzesänderungen und rechtliche Risiken. Bei relevanten Änderungen werden Sie benachrichtigt."
        tip="Klicken Sie auf einen Vertrag, um Details zur Risikoanalyse zu sehen."
      />

      {/* 🔐 Premium Upgrade Banner für Free-User */}
      {!canAccessLegalPulse && (
        <div className={styles.premiumBanner}>
          <div className={styles.premiumBannerContent}>
            <div className={styles.premiumBannerIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <div className={styles.premiumBannerText}>
              <h3>Legal Pulse ist ein Premium-Feature</h3>
              <p>Upgrade auf Business oder Enterprise, um automatisches Risiko-Monitoring, Gesetzesänderungs-Alerts und detaillierte Analysen für alle deine Verträge zu erhalten.</p>
            </div>
            <Link to="/subscribe" className={styles.premiumBannerButton}>
              Jetzt upgraden
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className={styles.premiumBannerInfo}>
            <span>📊 Du siehst hier deine Verträge, aber die Legal Pulse Analyse ist deaktiviert.</span>
          </div>
        </div>
      )}

      <Helmet>
        <title>Legal Pulse – Risiken erkennen & Verträge schützen | Contract AI</title>
        <meta name="description" content="Erkenne rechtliche Risiken frühzeitig & schütze deine Verträge mit Legal Pulse. Bleib immer einen Schritt voraus. Jetzt prüfen & absichern!" />
        <meta name="keywords" content="Legal Pulse, Vertragsrisiken erkennen, Gesetzesänderungen, Frühwarnsystem Verträge, Risiken prüfen, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/legalpulse" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Legal Pulse – Risiken erkennen & Verträge schützen | Contract AI" />
        <meta property="og:description" content="Mit Legal Pulse erkennst du rechtliche Risiken frühzeitig & schützt deine Verträge proaktiv. Bleib immer up to date. Jetzt ausprobieren!" />
        <meta property="og:url" content="https://www.contract-ai.de/legalpulse" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Legal Pulse – Risiken erkennen & Verträge schützen | Contract AI" />
        <meta name="twitter:description" content="Erkenne rechtliche Risiken & sichere deine Verträge ab – mit Legal Pulse von Contract AI. Jetzt prüfen & geschützt bleiben!" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Hero Section - Smart Collapse */}
      {!heroMinimized ? (
        <div className={styles.heroSection}>
          {/* Dismiss Button */}
          <button className={styles.heroDismiss} onClick={dismissHero} title="Ausblenden">
            ×
          </button>

          {/* Original Hero Content */}
          <div className={styles.heroContent}>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.heroTitle}>
                Legal Pulse
              </h1>
              <span className={styles.monitoringBadgeLarge}>LAUFENDE ÜBERWACHUNG</span>
            </div>
            <p className={styles.heroSubtitle}>
              Kontinuierliche Überwachung aller Verträge auf rechtliche Risiken und Gesetzesänderungen.
            </p>
            <button className={styles.heroCTA} onClick={scrollToContracts}>
              Jetzt Risiken prüfen
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardIcon}>⚡</div>
              <div className={styles.heroCardContent}>
                <h4>Live-Analyse</h4>
                <p>Kontinuierliche Überwachung</p>
              </div>
            </div>
            <div className={styles.heroCard}>
              <div className={styles.heroCardIcon}>🎯</div>
              <div className={styles.heroCardContent}>
                <h4>Präzise Bewertung</h4>
                <p>KI-basierte Risikoerkennung</p>
              </div>
            </div>
            <div className={styles.heroCard}>
              <div className={styles.heroCardIcon}>📊</div>
              <div className={styles.heroCardContent}>
                <h4>Actionable Insights</h4>
                <p>Konkrete Handlungsempfehlungen</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.heroMinimized}>
          <div className={styles.heroMinimizedContent}>
            <h2>Legal Pulse <span className={styles.monitoringBadge}>LAUFEND</span></h2>
            <p>Kontinuierliche Überwachung Ihrer Verträge</p>
          </div>
          <button className={styles.heroExpandButton} onClick={expandHero}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Mehr anzeigen
          </button>
        </div>
      )}

      {/* V7: Monitoring Status Widget (Premium only) */}
      {canAccessLegalPulse && monitoringHealth && (
        <div className={styles.monitoringStatusBar}>
          <div className={styles.monitoringStatusItem}>
            {monitoringHealth.status === 'healthy' ? (
              <CheckCircle size={16} className={styles.statusHealthy} />
            ) : monitoringHealth.status === 'warning' ? (
              <AlertTriangle size={16} className={styles.statusWarning} />
            ) : monitoringHealth.status === 'critical' ? (
              <XCircle size={16} className={styles.statusCritical} />
            ) : (
              <Clock size={16} className={styles.statusUnknown} />
            )}
            <span>
              {monitoringHealth.lastSuccessfulRun
                ? `Letzte Pr${String.fromCharCode(252)}fung: vor ${monitoringHealth.hoursAgo?.toFixed(0)}h`
                : 'Noch keine Pr\u00fcfung durchgef\u00fchrt'}
            </span>
          </div>
          <div className={styles.monitoringStatusItem}>
            <Shield size={16} />
            <span>{monitoringHealth.feeds.active} aktive Rechtsquellen</span>
          </div>
          <div className={styles.monitoringStatusItem}>
            <Activity size={16} />
            <span>{monitoringHealth.vectorStore.indexedContracts}/{monitoringHealth.vectorStore.totalContracts} Vertr{String.fromCharCode(228)}ge {String.fromCharCode(252)}berwacht</span>
          </div>
          {alertsUnreadCount > 0 && (
            <button
              className={styles.alertHistoryButton}
              onClick={() => setShowAlertHistory(!showAlertHistory)}
            >
              <Bell size={16} />
              <span>{alertsUnreadCount} neue Warnungen</span>
            </button>
          )}
        </div>
      )}

      {/* V7: Alert History Panel */}
      {showAlertHistory && alertHistory.length > 0 && (
        <div className={styles.alertHistoryPanel}>
          <div className={styles.alertHistoryHeader}>
            <h3>Vergangene Warnungen</h3>
            <button onClick={() => {
              const unreadIds = alertHistory.filter(a => !a.read).map(a => a._id);
              if (unreadIds.length > 0) markAlertsAsRead(unreadIds);
            }}>
              Alle als gelesen markieren
            </button>
          </div>
          <div className={styles.alertHistoryList}>
            {alertHistory.map(alert => (
              <div
                key={alert._id}
                className={`${styles.alertHistoryItem} ${!alert.read ? styles.alertUnread : ''}`}
              >
                <div className={styles.alertSeverityBadge} data-severity={alert.severity}>
                  {alert.severity === 'critical' ? 'Kritisch' :
                   alert.severity === 'high' ? 'Hoch' :
                   alert.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                </div>
                <div className={styles.alertContent}>
                  <strong>{alert.lawTitle}</strong>
                  <span className={styles.alertContract}>Betrifft: {alert.contractName}</span>
                  {alert.explanation && (
                    <p className={styles.alertExplanation}>{alert.explanation}</p>
                  )}
                </div>
                <div className={styles.alertMeta}>
                  <span>{new Date(alert.createdAt).toLocaleDateString('de-DE')}</span>
                  <span className={styles.alertScore}>
                    {(alert.score * 100).toFixed(0)}% Relevanz
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Legal Check Section */}
      {canAccessLegalPulse && (
        <div className={styles.weeklyCheckSection}>
          <div className={styles.weeklyCheckHeader}>
            <div className={styles.weeklyCheckTitle}>
              <Shield size={20} />
              <h3>W{String.fromCharCode(246)}chentlicher Rechtscheck</h3>
              {weeklyChecks && weeklyChecks.contracts.length > 0 && (
                <span className={styles.weeklyCheckBadge}>
                  {weeklyChecks.contracts.filter(c => c.latestCheck.stage2Results.overallStatus !== 'aktuell').length} mit Handlungsbedarf
                </span>
              )}
            </div>
            <button
              className={styles.weeklyCheckToggle}
              onClick={() => {
                if (!showWeeklyChecks && !weeklyChecks) fetchWeeklyChecks();
                setShowWeeklyChecks(!showWeeklyChecks);
              }}
            >
              {showWeeklyChecks ? 'Ausblenden' : 'Anzeigen'}
            </button>
          </div>

          {showWeeklyChecks && (
            <div className={styles.weeklyCheckContent}>
              {weeklyChecksLoading ? (
                <div className={styles.weeklyCheckLoading}>Lade Rechtschecks...</div>
              ) : !weeklyChecks || weeklyChecks.contracts.length === 0 ? (
                <div className={styles.weeklyCheckEmpty}>
                  <p>Noch keine w{String.fromCharCode(246)}chentlichen Rechtschecks durchgef{String.fromCharCode(252)}hrt. Der erste Check erfolgt automatisch am n{String.fromCharCode(228)}chsten Sonntag.</p>
                </div>
              ) : (
                <div className={styles.weeklyCheckList}>
                  {weeklyChecks.contracts.map(contract => {
                    const status = contract.latestCheck.stage2Results.overallStatus;
                    const findings = contract.latestCheck.stage2Results.findings;
                    const isExpanded = expandedWeeklyCheck === contract.contractId;

                    return (
                      <div
                        key={contract.contractId}
                        className={`${styles.weeklyCheckCard} ${styles[`weeklyStatus_${status}`] || ''}`}
                      >
                        <div
                          className={styles.weeklyCheckCardHeader}
                          onClick={() => setExpandedWeeklyCheck(isExpanded ? null : contract.contractId)}
                        >
                          <div className={styles.weeklyCheckCardInfo}>
                            <span className={`${styles.weeklyStatusBadge} ${styles[`weeklyBadge_${status}`] || ''}`}>
                              {status === 'aktuell' ? 'Aktuell' : status === 'handlungsbedarf' ? 'Handlungsbedarf' : 'Kritisch'}
                            </span>
                            <strong>{contract.contractName}</strong>
                          </div>
                          <div className={styles.weeklyCheckCardMeta}>
                            <span>{findings.length} {findings.length === 1 ? 'Befund' : 'Befunde'}</span>
                            <span>{new Date(contract.latestCheck.checkDate).toLocaleDateString('de-DE')}</span>
                            <span className={styles.weeklyExpandIcon}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className={styles.weeklyCheckDetails}>
                            <p className={styles.weeklyCheckSummary}>
                              {contract.latestCheck.stage2Results.summary}
                            </p>

                            {contract.latestCheck.stage1Results.relevantChanges.length > 0 && (
                              <div className={styles.weeklyStage1}>
                                <h5>Relevante Gesetzes{String.fromCharCode(228)}nderungen (letzte 7 Tage)</h5>
                                <ul>
                                  {contract.latestCheck.stage1Results.relevantChanges.map((change, idx) => (
                                    <li key={idx}>
                                      {change.title} <span className={styles.weeklyScore}>({(change.score * 100).toFixed(0)}% Relevanz)</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {findings.length > 0 && (
                              <div className={styles.weeklyFindings}>
                                <h5>KI-Analyse Befunde</h5>
                                {findings.map((finding, idx) => (
                                  <div key={idx} className={`${styles.weeklyFinding} ${styles[`findingSeverity_${finding.severity}`] || ''}`}>
                                    <div className={styles.weeklyFindingHeader}>
                                      <span className={`${styles.findingSeverityBadge} ${styles[`severity_${finding.severity}`] || ''}`}>
                                        {finding.severity === 'critical' ? 'Kritisch' : finding.severity === 'warning' ? 'Warnung' : 'Info'}
                                      </span>
                                      <span className={styles.findingType}>
                                        {finding.type === 'law_change' ? `Gesetzes${String.fromCharCode(228)}nderung` :
                                         finding.type === 'risk' ? 'Risiko' :
                                         finding.type === 'compliance' ? 'Compliance' : 'Verbesserung'}
                                      </span>
                                      <strong>{finding.title}</strong>
                                    </div>
                                    <p>{finding.description}</p>
                                    {finding.affectedClause && (
                                      <div className={styles.findingClause}>
                                        <strong>Betroffene Klausel:</strong> {finding.affectedClause}
                                      </div>
                                    )}
                                    {finding.legalBasis && (
                                      <div className={styles.findingLegal}>
                                        <strong>Rechtsgrundlage:</strong> {finding.legalBasis}
                                      </div>
                                    )}
                                    {finding.recommendation && (
                                      <div className={styles.findingRecommendation}>
                                        <strong>Empfehlung:</strong> {finding.recommendation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contracts Overview */}
      <div ref={contractsSectionRef} className={styles.contractsSection}>
        {/* 🆕 Professional Empty State when NO contracts exist */}
        {!isInitialLoading && pagination.total === 0 && !searchQuery && riskFilter === 'all' ? (
          <div className={styles.professionalEmptyState}>
            <div className={styles.emptyStateHeader}>
              <div className={styles.emptyStateIconLarge}>
                <Activity size={48} strokeWidth={1.5} />
              </div>
              <h2>Starten Sie Ihre Vertragsüberwachung</h2>
              <p>Legal Pulse analysiert Ihre Verträge kontinuierlich auf rechtliche Risiken und Gesetzesänderungen.</p>
            </div>

            <div className={styles.emptyStateFeatures}>
              <div className={styles.emptyStateFeature}>
                <div className={styles.featureIcon}>
                  <Zap size={24} />
                </div>
                <h4>Echtzeit-Monitoring</h4>
                <p>Automatische Überwachung aller Verträge rund um die Uhr</p>
              </div>
              <div className={styles.emptyStateFeature}>
                <div className={styles.featureIcon}>
                  <Bell size={24} />
                </div>
                <h4>Gesetzesänderungs-Alerts</h4>
                <p>Sofortige Benachrichtigung bei relevanten Rechtsänderungen</p>
              </div>
              <div className={styles.emptyStateFeature}>
                <div className={styles.featureIcon}>
                  <ArrowRight size={24} />
                </div>
                <h4>Handlungsempfehlungen</h4>
                <p>Konkrete Schritte zur Risikominimierung</p>
              </div>
            </div>

            <div className={styles.emptyStateCTA}>
              <Link to="/contracts?upload=true" className={styles.emptyStatePrimaryButton}>
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Ersten Vertrag hochladen
              </Link>
              <Link to="/dashboard" className={styles.emptyStateSecondaryButton}>
                Zum Dashboard
              </Link>
            </div>
          </div>
        ) : (
        <>
        {/* Header with Title (left) and Action Buttons (right) in ONE row */}
        <div className={styles.sectionHeaderWithActions}>
          <h2 className={styles.sectionTitle}>
            📋 {teamFilter === 'my' ? 'Ihre' : teamFilter === 'all' ? 'Team' : ''} Pulse-Analysen
            <span className={styles.contractCount}>({pagination.total} Verträge)</span>
          </h2>

          {/* 👥 Team Filter Widget - Only for Premium with Organization */}
          {organization && canAccessLegalPulse && (
            <div className={styles.teamWidget}>
              <span className={styles.teamLabel}>👥</span>
              <select
                className={styles.teamSelect}
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="my">Meine Verträge</option>
                <option value="all">Team ({organization.name})</option>
                {teamMembers.length > 0 && (
                  <>
                    <option disabled>──────────</option>
                    {teamMembers.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name || member.email}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )}

          {/* Dashboard Actions - All 4 Buttons */}
          <div className={styles.dashboardActions}>
          <button
            className={styles.dashboardActionButton}
            onClick={() => navigate('/contracts?upload=true')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Vertrag hinzufügen
          </button>
          <button
            className={styles.dashboardActionButton}
            onClick={() => setShowSettingsSidebar(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.87653 6.85425 4.02405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Einstellungen
          </button>
          <button
            className={styles.dashboardActionButton}
            onClick={() => setShowFeedSidebar(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Live Feed
            {feedEvents.length > 0 && <span className={styles.feedBadge}>{feedEvents.length}</span>}
          </button>
          <button
            className={styles.dashboardActionButton}
            onClick={() => setShowSearchSidebar(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Gesetzessuche
          </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        {!isInitialLoading && (pagination.total > 0 || searchQuery || riskFilter !== 'all') && (
          <div className={styles.filterSection}>
            {/* ✅ Subtile Lade-Anzeige während Filter/Suche (ohne Input zu unmounten) */}
            {isLoading && (
              <div className={styles.filterLoadingIndicator}>
                <div className={styles.miniSpinner}></div>
                <span>Suche läuft...</span>
              </div>
            )}

            <div className={styles.filterBar}>
              {/* Search Input */}
              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder="Verträge durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    className={styles.clearSearchButton}
                    onClick={() => setSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className={styles.quickFilters}>
                <button
                  className={`${styles.quickFilterButton} ${riskFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setRiskFilter('all')}
                >
                  Alle
                </button>
                <button
                  className={`${styles.quickFilterButton} ${styles.critical} ${riskFilter === 'critical' ? styles.active : ''}`}
                  onClick={() => setRiskFilter('critical')}
                >
                  🔴 Kritisch
                </button>
                <button
                  className={`${styles.quickFilterButton} ${styles.high} ${riskFilter === 'high' ? styles.active : ''}`}
                  onClick={() => setRiskFilter('high')}
                >
                  ⚠️ Hoch
                </button>
                <button
                  className={`${styles.quickFilterButton} ${styles.medium} ${riskFilter === 'medium' ? styles.active : ''}`}
                  onClick={() => setRiskFilter('medium')}
                >
                  ⚡ Mittel
                </button>
                <button
                  className={`${styles.quickFilterButton} ${styles.low} ${riskFilter === 'low' ? styles.active : ''}`}
                  onClick={() => setRiskFilter('low')}
                >
                  ✅ Niedrig
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className={styles.sortBox}>
                <label htmlFor="sort-select" className={styles.sortLabel}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.sortIcon}>
                    <path d="M3 6H21" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 12H21" stroke="currentColor" strokeWidth="2"/>
                    <path d="M11 18H21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'risk')}
                  className={styles.sortSelect}
                >
                  <option value="date">Neueste zuerst</option>
                  <option value="risk">Höchstes Risiko zuerst</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {isInitialLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Lade Pulse-Analysen...</p>
          </div>
        ) : contracts.length > 0 ? (
          <ContractRiskGrid
            contracts={contracts}
            pagination={pagination}
            isLoadingMore={isLoadingMore}
            loadMoreRef={loadMoreRef}
            searchQuery={searchQuery}
            riskFilter={riskFilter}
            showTooltip={showTooltip}
            getRiskLevel={getRiskLevel}
            onContractClick={handleContractCardClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onLoadMore={loadMoreContracts}
            onResetFilters={() => {
              setSearchQuery('');
              setRiskFilter('all');
              setSortBy('date');
            }}
            canAccessLegalPulse={canAccessLegalPulse}
          />
        ) : (
          <div className={styles.emptyState}>
            {/* ✅ Unterscheidung: Keine Suchergebnisse vs. wirklich keine Verträge */}
            {pagination.total > 0 || searchQuery || riskFilter !== 'all' ? (
              // Keine Suchergebnisse
              <>
                <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <h3>Keine Verträge gefunden</h3>
                <p>Für Ihre Suche "{searchQuery}" und die gewählten Filter wurden keine Ergebnisse gefunden.</p>
                <div className={styles.emptyStateActions}>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setRiskFilter('all');
                      setSortBy('date');
                    }}
                    className={styles.primaryButton}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Filter zurücksetzen
                  </button>
                </div>
              </>
            ) : (
              // Wirklich keine Verträge vorhanden
              <>
                <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <h3>Noch keine Verträge analysiert</h3>
                <p>Laden Sie Ihre ersten Verträge hoch, um mit der Risikoanalyse zu beginnen.</p>
                <div className={styles.emptyStateActions}>
                  <Link to="/contracts?upload=true" className={styles.primaryButton}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Vertrag hochladen
                  </Link>
                  <Link to="/dashboard" className={styles.secondaryButton}>
                    Zum Dashboard
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* Bottom CTA - Passend zu Legal Pulse - Only show when contracts exist */}
      {pagination.total > 0 && (
      <div className={styles.bottomCTALight}>
        <div className={styles.ctaLightContent}>
          <div className={styles.ctaLightIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Behalten Sie den Überblick</h2>
          <p>Laden Sie weitere Verträge hoch oder optimieren Sie bestehende Risiken</p>
          <div className={styles.ctaLightButtons}>
            <button
              className={styles.ctaLightPrimary}
              onClick={() => navigate('/contracts?upload=true')}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Vertrag hochladen
            </button>
            <button
              className={styles.ctaLightSecondary}
              onClick={() => navigate('/optimizer')}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Verträge optimieren
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Settings Sidebar */}
      {showSettingsSidebar && (
        <div className={styles.sidebarOverlay} onClick={() => setShowSettingsSidebar(false)}>
          <div className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sidebarHeader}>
              <h2>Legal Pulse Einstellungen</h2>
              <button className={styles.closeSidebar} onClick={() => setShowSettingsSidebar(false)}>×</button>
            </div>
            <div className={styles.sidebarContent}>
              <LegalPulseSettings
                compact={false}
                onSaveSuccess={() => {
                  setNotification({ message: "✓ Einstellungen gespeichert", type: "success" });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feed Sidebar */}
      {showFeedSidebar && (
        <div className={styles.sidebarOverlay} onClick={() => setShowFeedSidebar(false)}>
          <div className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sidebarHeader}>
              <h2>Live Feed</h2>
              <button className={styles.closeSidebar} onClick={() => setShowFeedSidebar(false)}>×</button>
            </div>
            <div className={styles.sidebarContent}>
              <LegalPulseFeedWidget
                feedConnected={feedConnected}
                feedEvents={feedEvents}
                onClearEvents={clearEvents}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Sidebar */}
      {showSearchSidebar && (
        <div className={styles.sidebarOverlay} onClick={() => setShowSearchSidebar(false)}>
          <div className={`${styles.sidebar} ${styles.wideSidebar}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sidebarHeader}>
              <h2>Externe Gesetzessuche</h2>
              <button className={styles.closeSidebar} onClick={() => setShowSearchSidebar(false)}>×</button>
            </div>
            <div className={styles.sidebarContent}>
              <div className={styles.externalSearchForm}>
                <div className={styles.searchInputGroup}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Suchbegriff eingeben (z.B. DSGVO, Arbeitsrecht, ...)"
                    value={externalSearchQuery}
                    onChange={(e) => setExternalSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleExternalSearch()}
                  />
                  <button
                    className={styles.searchButton}
                    onClick={() => handleExternalSearch(false)}
                    disabled={isExternalSearchLoading}
                  >
                    {isExternalSearchLoading ? (
                      <>
                        <div className={styles.spinner}></div>
                        Suche läuft...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Suchen
                      </>
                    )}
                  </button>
                </div>

                {/* Source Filters */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Datenquellen:</label>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={externalSearchSources.includes('eulex')}
                        onChange={() => toggleExternalSource('eulex')}
                      />
                      <span>🇪🇺 EU-Lex</span>
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={externalSearchSources.includes('bundesanzeiger')}
                        onChange={() => toggleExternalSource('bundesanzeiger')}
                      />
                      <span>🇩🇪 Bundesanzeiger</span>
                    </label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={externalSearchSources.includes('govdata')}
                        onChange={() => toggleExternalSource('govdata')}
                      />
                      <span>📊 GovData</span>
                    </label>
                  </div>
                </div>

                {/* Area Filter */}
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Rechtsbereich (optional):</label>
                  <select
                    className={styles.areaSelect}
                    value={externalSearchArea}
                    onChange={(e) => setExternalSearchArea(e.target.value)}
                  >
                    <option value="">Alle Bereiche</option>
                    <option value="Datenschutz">Datenschutz</option>
                    <option value="Arbeitsrecht">Arbeitsrecht</option>
                    <option value="Vertragsrecht">Vertragsrecht</option>
                    <option value="Handelsrecht">Handelsrecht</option>
                    <option value="Steuerrecht">Steuerrecht</option>
                    <option value="IT-Recht">IT-Recht</option>
                  </select>
                </div>
              </div>

              {/* Search Results */}
              <div className={styles.externalSearchResults}>
                {externalSearchResults.length > 0 ? (
                  <div className={styles.resultsTable}>
                    <div className={styles.resultsHeader}>
                      <h4>Suchergebnisse ({externalSearchResults.length})</h4>
                    </div>
                    <div className={styles.resultsList}>
                      {externalSearchResults.map((result, index) => (
                        <div key={index} className={styles.resultCard}>
                          <div className={styles.resultHeader}>
                            <span className={styles.resultSource}>
                              {result.source === 'eulex' && '🇪🇺 EU-Lex'}
                              {result.source === 'bundesanzeiger' && '🇩🇪 Bundesanzeiger'}
                              {result.source === 'govdata' && '📊 GovData'}
                            </span>
                            {result.date && (
                              <span className={styles.resultDate}>
                                {new Date(result.date).toLocaleDateString('de-DE')}
                              </span>
                            )}
                          </div>
                          <h5 className={styles.resultTitle}>{result.title}</h5>
                          {result.description && (
                            <p className={styles.resultDescription}>{result.description}</p>
                          )}
                          {result.documentId && (
                            <div className={styles.resultMeta}>
                              <span className={styles.metaLabel}>Dokument-ID:</span>
                              <span className={styles.metaValue}>{result.documentId}</span>
                            </div>
                          )}
                          {result.relevance && (
                            <div className={styles.resultRelevance}>
                              <span className={styles.relevanceLabel}>Relevanz:</span>
                              <div className={styles.relevanceBar}>
                                <div
                                  className={styles.relevanceFill}
                                  style={{ width: `${result.relevance}%` }}
                                ></div>
                              </div>
                              <span className={styles.relevanceValue}>{result.relevance}%</span>
                            </div>
                          )}
                          {result.url && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.resultLink}
                            >
                              Zur Quelle →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Load More Button */}
                    {externalSearchHasMore && (
                      <div className={styles.loadMoreContainer}>
                        <button
                          className={styles.loadMoreButton}
                          onClick={handleLoadMoreResults}
                          disabled={isExternalSearchLoading}
                        >
                          {isExternalSearchLoading ? (
                            <>
                              <div className={styles.spinner}></div>
                              Lädt...
                            </>
                          ) : (
                            <>
                              Mehr laden
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  !isExternalSearchLoading && (
                    <div className={styles.emptyState}>
                      <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <h4>Noch keine Suche durchgeführt</h4>
                      <p>Geben Sie einen Suchbegriff ein, um externe Gesetze und Änderungen zu finden</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-Click Cancel Modal */}
      {showCancelModal && contractToCancel && (
        <OneClickCancelModal
          contract={{
            _id: contractToCancel._id,
            name: contractToCancel.name,
            provider: contractToCancel.provider,
            contractNumber: contractToCancel.contractNumber,
            customerNumber: contractToCancel.customerNumber,
            expiryDate: contractToCancel.expiryDate,
            amount: contractToCancel.amount
          }}
          show={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setContractToCancel(null);
          }}
          onSuccess={() => {
            fetchContracts();
            setShowCancelModal(false);
            setContractToCancel(null);
          }}
        />
      )}
    </div>
  );
}
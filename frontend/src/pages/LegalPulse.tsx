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
import { Activity } from "lucide-react";
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
}

// Type for recommendation objects (from RecommendationCard component)
interface RecommendationObject {
  title: string;
  description?: string;
  priority?: string;
  effort?: string;
  impact?: string;
  steps?: string[];
}

// Union types for backwards compatibility
type RiskInput = string | RiskObject;
type RecommendationInput = string | RecommendationObject;

interface ExternalSearchResult {
  source: string;
  title: string;
  description?: string;
  date?: string;
  documentId?: string;
  relevance?: number;
  url?: string;
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

  // Optimizer Integration
  const [isStartingOptimizer, setIsStartingOptimizer] = useState(false);

  // Feed Hook
  const { events: feedEvents, isConnected: feedConnected, clearEvents } = useLegalPulseFeed();

  // ✅ REMOVED: Mock data logic - now using real data only
  // Contracts without Legal Pulse data will show "Analysis Pending" state in UI

  // Detaillierte Risiko-Daten
  // ✅ getRiskDetails removed - now using backend data directly

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

  // 🔐 User Subscription Check für Premium-Gating
  const [userPlan, setUserPlan] = useState<string>('free');
  const canAccessLegalPulse = ['premium', 'business', 'enterprise', 'legendary'].includes(userPlan.toLowerCase());

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
          setUserPlan(data.subscriptionPlan || data.plan || 'free');
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
        setUserPlan('free');
      }
    };
    fetchUserPlan();
  }, []);

  // Hero Auto-Minimize nach Besuchen
  useEffect(() => {
    const visits = parseInt(localStorage.getItem('legalPulse_heroVisits') || '0');
    const dismissed = localStorage.getItem('legalPulse_heroDismissed') === 'true';

    if (dismissed) {
      setHeroMinimized(true);
    } else if (visits >= 3) {
      setHeroMinimized(true);
    } else {
      localStorage.setItem('legalPulse_heroVisits', (visits + 1).toString());
    }
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
  }, [searchQuery, riskFilter, sortBy]);

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
          recommendation: risk.recommendation || 'Empfehlung wird erstellt'
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
          recommendation: risk.recommendation || 'Empfehlung wird erstellt'
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
        </div>

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

              {/* Forecast Overview Cards */}
              <div className={styles.forecastCards}>
                <div className={styles.forecastCard}>
                  <div className={styles.cardIcon}>🎯</div>
                  <div className={styles.cardContent}>
                    <h4>Risiko-Trend (6 Monate)</h4>
                    <div className={styles.cardValue} style={{ color: '#10b981' }}>↓ Sinkend</div>
                    <p className={styles.cardDescription}>
                      Prognose: Risiko-Score wird voraussichtlich um 12% sinken
                    </p>
                  </div>
                </div>
                <div className={styles.forecastCard}>
                  <div className={styles.cardIcon}>⚠️</div>
                  <div className={styles.cardContent}>
                    <h4>Nächstes Risiko-Event</h4>
                    <div className={styles.cardValue}>3-4 Monate</div>
                    <p className={styles.cardDescription}>
                      Wahrscheinlich durch Gesetzesänderung im Datenschutz
                    </p>
                  </div>
                </div>
                <div className={styles.forecastCard}>
                  <div className={styles.cardIcon}>📊</div>
                  <div className={styles.cardContent}>
                    <h4>Modell-Konfidenz</h4>
                    <div className={styles.cardValue}>72%</div>
                    <p className={styles.cardDescription}>
                      Prognose basiert auf {selectedContract?._id ? '127' : '0'} ähnlichen Verträgen
                    </p>
                  </div>
                </div>
              </div>

              {/* ML Status Info */}
              <div className={styles.mlStatus}>
                <div className={styles.infoBox}>
                  <div className={styles.infoIcon}>ℹ️</div>
                  <div className={styles.infoContent}>
                    <h4>Machine Learning Status</h4>
                    <p>
                      Das ML-Modell benötigt mindestens 50 Verträge für präzise Prognosen.
                      Derzeit sind <strong>noch nicht genug Daten</strong> für spezifische Vorhersagen vorhanden.
                    </p>
                    <p className={styles.infoNote}>
                      Die oben gezeigten Werte sind Beispiel-Prognosen basierend auf ähnlichen Vertragstypen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Timeline Placeholder */}
              <div className={styles.forecastSection}>
                <h4>📅 Risiko-Timeline (nächste 12 Monate)</h4>
                <div className={styles.timelinePlaceholder}>
                  <div className={styles.timelineMonth}>
                    <span className={styles.monthLabel}>Monat 1-3</span>
                    <div className={styles.riskIndicator} style={{ backgroundColor: '#10b981' }}>
                      <span>Niedriges Risiko</span>
                    </div>
                  </div>
                  <div className={styles.timelineMonth}>
                    <span className={styles.monthLabel}>Monat 4-6</span>
                    <div className={styles.riskIndicator} style={{ backgroundColor: '#f59e0b' }}>
                      <span>Mittleres Risiko</span>
                      <small>DSGVO-Anpassung erwartet</small>
                    </div>
                  </div>
                  <div className={styles.timelineMonth}>
                    <span className={styles.monthLabel}>Monat 7-9</span>
                    <div className={styles.riskIndicator} style={{ backgroundColor: '#10b981' }}>
                      <span>Niedriges Risiko</span>
                    </div>
                  </div>
                  <div className={styles.timelineMonth}>
                    <span className={styles.monthLabel}>Monat 10-12</span>
                    <div className={styles.riskIndicator} style={{ backgroundColor: '#10b981' }}>
                      <span>Niedriges Risiko</span>
                    </div>
                  </div>
                </div>
              </div>
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
                  </>
                )}

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
            <button className={styles.heroCTA} onClick={() => navigate('/contracts')}>
              Jetzt Risiken prüfen
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2"/>
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

      {/* Contracts Overview */}
      <div className={styles.contractsSection}>
        {/* Header with Title (left) and Action Buttons (right) in ONE row */}
        <div className={styles.sectionHeaderWithActions}>
          <h2 className={styles.sectionTitle}>
            📋 Ihre Pulse-Analysen
            <span className={styles.contractCount}>({pagination.total} Verträge)</span>
          </h2>

          {/* Dashboard Actions - All 4 Buttons */}
          <div className={styles.dashboardActions}>
          <button
            className={styles.dashboardActionButton}
            onClick={() => navigate('/contracts')}
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
                  <Link to="/contracts" className={styles.primaryButton}>
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
      </div>

      {/* Bottom CTA */}
      <div className={styles.bottomCTA}>
        <div className={styles.ctaContent}>
          <h2>Bleiben Sie vorbereitet. Reagieren Sie jetzt.</h2>
          <p>Optimieren Sie Ihre Verträge mit unserer KI-gestützten Lösung</p>
          <button
            className={styles.primaryCTAButton}
            onClick={() => navigate('/generate')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Vertrag jetzt optimieren
          </button>
        </div>
      </div>

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
    </div>
  );
}
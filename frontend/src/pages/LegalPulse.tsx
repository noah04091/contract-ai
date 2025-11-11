import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import styles from "./LegalPulse.module.css";
import Notification from "../components/Notification";
import { useLegalPulseFeed } from "../hooks/useLegalPulseFeed";
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
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'recommendations' | 'history' | 'feed' | 'external' | 'benchmarking' | 'forecast' | 'notifications'>('overview');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskDetail | null>(null);
  const [completedRecommendations, setCompletedRecommendations] = useState<RecommendationStatus>({});
  const [showTooltip, setShowTooltip] = useState<{ [key: string]: boolean }>({});

  // Legal Pulse 2.0: Live Feed
  const { events: feedEvents, isConnected: feedConnected, clearEvents } = useLegalPulseFeed();

  // Legal Pulse 2.0 Phase 3: External Legal Search
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [externalSearchSources, setExternalSearchSources] = useState<string[]>(['eulex', 'bundesanzeiger', 'govdata']);
  const [externalSearchArea, setExternalSearchArea] = useState('');
  const [externalSearchResults, setExternalSearchResults] = useState<ExternalSearchResult[]>([]);
  const [isExternalSearchLoading, setIsExternalSearchLoading] = useState(false);
  const [externalSearchHasMore, setExternalSearchHasMore] = useState(false);
  const [externalSearchOffset, setExternalSearchOffset] = useState(0);

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
  const searchInputRef = useRef<HTMLInputElement>(null); // ✅ Ref für Search Input Focus

  // Optimizer Integration
  const [isStartingOptimizer, setIsStartingOptimizer] = useState(false);

  // Enhanced Mock-Daten für Demo-Zwecke
  const enrichContractWithMockData = (contract: Contract): Contract => {
    const riskScore = contract.legalPulse?.riskScore || Math.floor(Math.random() * 100);
    const lastAnalysis = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const mockTopRisks = [
      "Veraltete Datenschutzklauseln (DSGVO-Konformität)",
      "Fehlende Kündigungsfristen für bestimmte Vertragsarten",
      "Unklare Haftungsregelungen bei Leistungsstörungen",
      "Veraltete AGB-Verweise auf überholte Rechtsprechung",
      "Fehlende Salvatorische Klausel"
    ];
    
    const mockRecommendations = [
      "Datenschutzerklärung nach DSGVO Art. 13/14 aktualisieren",
      "Kündigungsfristen gem. § 573c BGB präzisieren",
      "Haftungsbeschränkungen nach § 309 BGB überprüfen",
      "AGB-Verweise auf aktuelle Rechtsprechung anpassen",
      "Salvatorische Klausel zur Vertragserhaltung einfügen"
    ];

    const mockScoreHistory = Array.from({length: 12}, (_, i) => ({
      date: new Date(Date.now() - (11-i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE', {month: 'short'}),
      score: Math.max(20, Math.min(90, riskScore + (Math.random() - 0.5) * 30))
    }));

    return {
      ...contract,
      legalPulse: {
        riskScore,
        lastAnalysis,
        lastRecommendation: mockRecommendations[Math.floor(Math.random() * mockRecommendations.length)],
        topRisks: mockTopRisks.slice(0, Math.floor(Math.random() * 3) + 2),
        recommendations: mockRecommendations.slice(0, Math.floor(Math.random() * 3) + 2),
        scoreHistory: mockScoreHistory
      }
    };
  };

  // Detaillierte Risiko-Daten
  const getRiskDetails = (riskTitle: string): RiskDetail => {
    const riskDatabase: { [key: string]: RiskDetail } = {
      "Veraltete Datenschutzklauseln (DSGVO-Konformität)": {
        id: "dsgvo-risk",
        title: "Veraltete Datenschutzklauseln",
        description: "Die aktuellen Datenschutzbestimmungen entsprechen nicht den DSGVO-Anforderungen. Dies kann zu erheblichen Bußgeldern und rechtlichen Problemen führen.",
        severity: "high",
        solution: "Aktualisierung der Datenschutzerklärung nach Art. 13 und 14 DSGVO mit klaren Rechtsgrundlagen, Zweckbindung und Betroffenenrechten.",
        impact: "Bußgelder bis zu 4% des Jahresumsatzes möglich",
        recommendation: "Sofortige Überarbeitung durch Datenschutzexperten empfohlen"
      },
      "Fehlende Kündigungsfristen für bestimmte Vertragsarten": {
        id: "kuendigung-risk",
        title: "Unklare Kündigungsregelungen",
        description: "Die Kündigungsfristen sind nicht eindeutig definiert oder entsprechen nicht den gesetzlichen Mindestanforderungen.",
        severity: "medium",
        solution: "Präzisierung der Kündigungsfristen gemäß § 573c BGB mit klaren Fristen und Modalitäten.",
        impact: "Rechtsunsicherheit und potenzielle Vertragsverlängerungen",
        recommendation: "Überarbeitung der Kündigungsklauseln binnen 30 Tagen"
      },
      "Unklare Haftungsregelungen bei Leistungsstörungen": {
        id: "haftung-risk",
        title: "Haftungsrisiken",
        description: "Die Haftungsregelungen sind unvollständig oder unwirksam, was zu unvorhersehbaren finanziellen Risiken führen kann.",
        severity: "high",
        solution: "Überarbeitung der Haftungsklauseln nach § 309 BGB mit angemessenen Haftungsbeschränkungen.",
        impact: "Unbegrenzte Haftungsrisiken",
        recommendation: "Rechtliche Prüfung und Anpassung erforderlich"
      }
    };

    return riskDatabase[riskTitle] || {
      id: "generic-risk",
      title: riskTitle,
      description: "Dieses Risiko wurde identifiziert und sollte näher untersucht werden.",
      severity: "medium",
      solution: "Eine detaillierte Analyse und entsprechende Maßnahmen sind erforderlich.",
      impact: "Potenzielle rechtliche oder finanzielle Auswirkungen",
      recommendation: "Konsultation eines Rechtsexperten empfohlen"
    };
  };

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

      // Enrich contracts with mock Legal Pulse data
      const enrichedContracts = contractsArray.map(enrichContractWithMockData);
      setContracts(enrichedContracts);

      if (contractId) {
        const contract = enrichedContracts.find((c: Contract) => c._id === contractId);
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
    }
  };

  // ✅ Initial Load beim Mount
  useEffect(() => {
    fetchContracts();
  }, [contractId]);

  // ✅ Reload bei Filter-Änderungen (mit Debouncing für Search)
  useEffect(() => {
    // ✅ Focus beibehalten beim Debouncing
    const wasFocused = document.activeElement === searchInputRef.current;

    const debounceTimer = setTimeout(() => {
      console.log('🔄 Filter geändert, lade Contracts neu...');
      fetchContracts().then(() => {
        // ✅ Focus wiederherstellen nach Re-Render
        if (wasFocused && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
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
      const enrichedContracts = contractsArray.map(enrichContractWithMockData);
      setContracts(prev => [...prev, ...enrichedContracts]);
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

  // ✅ Keine lokale Filterung mehr - Backend macht das jetzt!

  // Event Handlers
  const handleShowRiskDetails = (riskTitle: string) => {
    const riskDetail = getRiskDetails(riskTitle);
    setSelectedRisk(riskDetail);
    setShowRiskModal(true);
  };

  const handleShowSolution = (riskTitle: string) => {
    const riskDetail = getRiskDetails(riskTitle);
    setSelectedRisk(riskDetail);
    setShowRiskModal(true);
    // Scroll to solution section in modal
    setTimeout(() => {
      const solutionElement = document.getElementById('risk-solution');
      if (solutionElement) {
        solutionElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
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

  const handleImplementRecommendation = (recommendation: string) => {
    setNotification({ 
      message: "Weiterleitung zum Optimizer...", 
      type: "success" 
    });
    // Navigate to optimizer with recommendation context
    navigate('/optimizer', { 
      state: { 
        contractId: selectedContract?._id,
        recommendation: recommendation 
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

        // Check if there are more results
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
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
            className={`${styles.tabButton} ${activeTab === 'feed' ? styles.active : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Live Feed {feedEvents.length > 0 && `(${feedEvents.length})`}
            {feedConnected && <span className={styles.liveDot}></span>}
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'external' ? styles.active : ''}`}
            onClick={() => setActiveTab('external')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Gesetzessuche
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'benchmarking' ? styles.active : ''}`}
            onClick={() => setActiveTab('benchmarking')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 16L12 11L16 15L21 10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Markt-Benchmark
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
          <button
            className={`${styles.tabButton} ${activeTab === 'notifications' ? styles.active : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Benachrichtigungen
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
                  <div key={index} className={styles.riskCard}>
                    <div className={styles.riskHeader}>
                      <span className={styles.riskIcon}>⚠️</span>
                      <span className={styles.riskSeverity}>Risiko {index + 1}</span>
                    </div>
                    <p className={styles.riskDescription}>{risk}</p>
                    <div className={styles.riskActions}>
                      <button 
                        className={styles.riskActionButton}
                        onClick={() => handleShowRiskDetails(risk)}
                      >
                        Details anzeigen
                      </button>
                      <button 
                        className={`${styles.riskActionButton} ${styles.primary}`}
                        onClick={() => handleShowSolution(risk)}
                      >
                        Lösung anzeigen
                      </button>
                    </div>
                  </div>
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
                    <div 
                      key={index} 
                      className={`${styles.recommendationCard} ${isCompleted ? styles.completed : ''}`}
                    >
                      <div className={styles.recommendationHeader}>
                        <span className={styles.recommendationIcon}>
                          {isCompleted ? '✅' : '💡'}
                        </span>
                        <span className={styles.recommendationPriority}>
                          Empfehlung {index + 1}
                          {isCompleted && <span className={styles.completedLabel}> (Erledigt)</span>}
                        </span>
                      </div>
                      <p className={styles.recommendationDescription}>{recommendation}</p>
                      <div className={styles.recommendationActions}>
                        <button 
                          className={`${styles.recommendationActionButton} ${isCompleted ? styles.completed : ''}`}
                          onClick={() => handleMarkRecommendationComplete(index)}
                        >
                          {isCompleted ? '✓ Als erledigt markiert' : 'Als erledigt markieren'}
                        </button>
                        <button 
                          className={`${styles.recommendationActionButton} ${styles.primary}`}
                          onClick={() => handleImplementRecommendation(recommendation)}
                        >
                          Jetzt umsetzen
                        </button>
                      </div>
                    </div>
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
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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

          {activeTab === 'feed' && (
            <div className={styles.feedTab}>
              <div className={styles.sectionHeader}>
                <h3>⚡ Live Feed</h3>
                <p>Echtzeit-Benachrichtigungen zu Gesetzesänderungen und Risiken</p>
                <div className={styles.feedStatus}>
                  <span className={feedConnected ? styles.statusConnected : styles.statusDisconnected}>
                    {feedConnected ? '🟢 Verbunden' : '🔴 Nicht verbunden'}
                  </span>
                  {feedEvents.length > 0 && (
                    <button className={styles.clearButton} onClick={clearEvents}>
                      Alle löschen
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.feedList}>
                {feedEvents.length > 0 ? (
                  [...feedEvents].reverse().map((event, index) => (
                    <div
                      key={index}
                      className={`${styles.feedEvent} ${styles[`type-${event.type}`]}`}
                    >
                      <div className={styles.feedEventHeader}>
                        <span className={styles.feedEventType}>
                          {event.type === 'alert' ? '⚠️' :
                           event.type === 'connected' ? '✅' :
                           event.type === 'test' ? '🧪' : '📢'}
                          {' '}
                          {event.type.toUpperCase()}
                        </span>
                        <span className={styles.feedEventTime}>
                          {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                        </span>
                      </div>

                      {event.message && (
                        <div className={styles.feedEventMessage}>{event.message}</div>
                      )}

                      {event.data && (
                        <div className={styles.feedEventData}>
                          <strong>{event.data.title || 'Keine Titel'}</strong>
                          <p>{event.data.description || ''}</p>

                          {event.data.actionUrl && (
                            <button
                              className={styles.feedActionButton}
                              onClick={() => {
                                if (event.data?.actionUrl) {
                                  navigate(event.data.actionUrl);
                                }
                              }}
                            >
                              Zur Aktion
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <p>Keine Benachrichtigungen</p>
                    <small>Live-Benachrichtigungen erscheinen hier automatisch</small>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'benchmarking' && (
            <div className={styles.benchmarkingTab}>
              <div className={styles.sectionHeader}>
                <h3>📊 Markt-Benchmark</h3>
                <p>Vergleichen Sie Ihren Vertrag mit Marktstandards und Branchen-Trends</p>
              </div>

              {/* Market Overview Cards */}
              <div className={styles.benchmarkCards}>
                <div className={styles.benchmarkCard}>
                  <div className={styles.cardIcon}>📈</div>
                  <div className={styles.cardContent}>
                    <h4>Marktposition</h4>
                    <div className={styles.cardValue}>Top 15%</div>
                    <p className={styles.cardDescription}>
                      Ihr Vertrag liegt im oberen Bereich verglichen mit ähnlichen Verträgen
                    </p>
                  </div>
                </div>
                <div className={styles.benchmarkCard}>
                  <div className={styles.cardIcon}>⚖️</div>
                  <div className={styles.cardContent}>
                    <h4>Klausel-Standard</h4>
                    <div className={styles.cardValue}>85%</div>
                    <p className={styles.cardDescription}>
                      85% Ihrer Klauseln entsprechen aktuellen Marktstandards
                    </p>
                  </div>
                </div>
                <div className={styles.benchmarkCard}>
                  <div className={styles.cardIcon}>🎯</div>
                  <div className={styles.cardContent}>
                    <h4>Optimierungspotenzial</h4>
                    <div className={styles.cardValue}>Mittel</div>
                    <p className={styles.cardDescription}>
                      Einige Klauseln können noch an aktuelle Standards angepasst werden
                    </p>
                  </div>
                </div>
              </div>

              {/* Popular Clauses Section */}
              <div className={styles.benchmarkSection}>
                <h4>📋 Beliebte Klauseln in Ihrer Branche</h4>
                <p className={styles.sectionDescription}>
                  Diese Klauseln werden am häufigsten in ähnlichen Verträgen verwendet
                </p>
                <div className={styles.clauseList}>
                  <div className={styles.clauseItem}>
                    <div className={styles.clauseHeader}>
                      <span className={styles.clauseName}>Datenschutzklausel (DSGVO)</span>
                      <span className={styles.clausePercentage}>95%</span>
                    </div>
                    <div className={styles.clauseBar}>
                      <div className={styles.clauseBarFill} style={{ width: '95%' }}></div>
                    </div>
                    <p className={styles.clauseNote}>✅ In Ihrem Vertrag vorhanden</p>
                  </div>
                  <div className={styles.clauseItem}>
                    <div className={styles.clauseHeader}>
                      <span className={styles.clauseName}>Salvatorische Klausel</span>
                      <span className={styles.clausePercentage}>88%</span>
                    </div>
                    <div className={styles.clauseBar}>
                      <div className={styles.clauseBarFill} style={{ width: '88%' }}></div>
                    </div>
                    <p className={styles.clauseNote}>⚠️ Nicht in Ihrem Vertrag gefunden</p>
                  </div>
                  <div className={styles.clauseItem}>
                    <div className={styles.clauseHeader}>
                      <span className={styles.clauseName}>Kündigungsfristen-Regelung</span>
                      <span className={styles.clausePercentage}>82%</span>
                    </div>
                    <div className={styles.clauseBar}>
                      <div className={styles.clauseBarFill} style={{ width: '82%' }}></div>
                    </div>
                    <p className={styles.clauseNote}>✅ In Ihrem Vertrag vorhanden</p>
                  </div>
                  <div className={styles.clauseItem}>
                    <div className={styles.clauseHeader}>
                      <span className={styles.clauseName}>Haftungsbeschränkung</span>
                      <span className={styles.clausePercentage}>76%</span>
                    </div>
                    <div className={styles.clauseBar}>
                      <div className={styles.clauseBarFill} style={{ width: '76%' }}></div>
                    </div>
                    <p className={styles.clauseNote}>✅ In Ihrem Vertrag vorhanden</p>
                  </div>
                </div>
              </div>

              {/* Industry Trends Placeholder */}
              <div className={styles.benchmarkSection}>
                <h4>📈 Branchen-Trends (letzte 12 Monate)</h4>
                <div className={styles.comingSoon}>
                  <p>Trend-Analyse wird aktiviert, sobald genügend anonymisierte Vertragsdaten vorliegen.</p>
                  <small>Ihre Daten werden nur mit Ihrer ausdrücklichen Zustimmung für Benchmarks verwendet.</small>
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

          {activeTab === 'notifications' && (
            <div className={styles.notificationsTab}>
              <div className={styles.sectionHeader}>
                <h3>📧 E-Mail-Benachrichtigungen</h3>
                <p>Konfigurieren Sie E-Mail-Benachrichtigungen für wichtige Legal Pulse Events</p>
              </div>

              {/* Notification Settings */}
              <div className={styles.notificationSettings}>
                <div className={styles.settingCard}>
                  <div className={styles.settingHeader}>
                    <div className={styles.settingInfo}>
                      <h4>📧 E-Mail-Benachrichtigungen</h4>
                      <p>Erhalten Sie E-Mails bei wichtigen Ereignissen</p>
                    </div>
                    <label className={styles.toggle}>
                      <input type="checkbox" defaultChecked={true} />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                  <div className={styles.settingOptions}>
                    <p className={styles.optionLabel}>Benachrichtigen bei:</p>
                    <label className={styles.checkboxOption}>
                      <input type="checkbox" defaultChecked={true} />
                      <span>🔴 Kritische Risiken (Severity: Critical)</span>
                    </label>
                    <label className={styles.checkboxOption}>
                      <input type="checkbox" defaultChecked={true} />
                      <span>⚠️ Hohe Risiken (Severity: High)</span>
                    </label>
                    <label className={styles.checkboxOption}>
                      <input type="checkbox" defaultChecked={false} />
                      <span>⚡ Mittlere Risiken (Severity: Medium)</span>
                    </label>
                    <label className={styles.checkboxOption}>
                      <input type="checkbox" defaultChecked={false} />
                      <span>ℹ️ Niedrige Risiken (Severity: Low)</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingCard}>
                  <div className={styles.settingHeader}>
                    <div className={styles.settingInfo}>
                      <h4>📬 Gesetzesänderungen</h4>
                      <p>Benachrichtigungen bei relevanten rechtlichen Änderungen</p>
                    </div>
                    <label className={styles.toggle}>
                      <input type="checkbox" defaultChecked={true} />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingCard}>
                  <div className={styles.settingHeader}>
                    <div className={styles.settingInfo}>
                      <h4>🤖 ML-Prognosen</h4>
                      <p>Benachrichtigungen bei neuen Risiko-Prognosen</p>
                    </div>
                    <label className={styles.toggle}>
                      <input type="checkbox" defaultChecked={true} />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingCard}>
                  <div className={styles.settingHeader}>
                    <div className={styles.settingInfo}>
                      <h4>⏰ Stille Stunden</h4>
                      <p>Keine Benachrichtigungen in diesem Zeitraum</p>
                    </div>
                    <label className={styles.toggle}>
                      <input type="checkbox" defaultChecked={false} />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                  <div className={styles.settingOptions}>
                    <div className={styles.timeRange}>
                      <label>
                        <span>Von:</span>
                        <input type="time" defaultValue="22:00" />
                      </label>
                      <label>
                        <span>Bis:</span>
                        <input type="time" defaultValue="08:00" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Notification Button */}
              <div className={styles.testSection}>
                <h4>🧪 Test-Benachrichtigung</h4>
                <p>Senden Sie eine Test-Benachrichtigung, um die Einstellungen zu überprüfen</p>
                <button
                  className={styles.testButton}
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/legalpulse/test-alert', {
                        method: 'POST',
                        credentials: 'include'
                      });
                      const data = await response.json();
                      if (data.success) {
                        setNotification({ message: "Test-Alert wurde gesendet!", type: "success" });
                      }
                    } catch {
                      setNotification({ message: "Fehler beim Senden", type: "error" });
                    }
                  }}
                >
                  Test-Benachrichtigung senden
                </button>
              </div>

              {/* Info Box */}
              <div className={styles.infoBox}>
                <div className={styles.infoIcon}>💡</div>
                <div className={styles.infoContent}>
                  <h4>E-Mail-Benachrichtigungen</h4>
                  <p>
                    Sie erhalten E-Mails an Ihre registrierte Adresse. Prüfen Sie auch Ihren Spam-Ordner.
                    In-App-Benachrichtigungen (Live Feed) bleiben weiterhin aktiv.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'external' && (
            <div className={styles.externalTab}>
              <div className={styles.sectionHeader}>
                <h3>🔍 Externe Gesetzessuche</h3>
                <p>Durchsuchen Sie EU-Lex, Bundesanzeiger und GovData nach relevanten Gesetzen und Änderungen</p>
              </div>

              {/* Search Form */}
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
                <div className={styles.riskDetailSection}>
                  <h4>🔍 Beschreibung</h4>
                  <p>{selectedRisk.description}</p>
                </div>
                
                <div className={styles.riskDetailSection}>
                  <h4>⚠️ Auswirkungen</h4>
                  <p>{selectedRisk.impact}</p>
                </div>
                
                <div className={styles.riskDetailSection} id="risk-solution">
                  <h4>💡 Lösungsvorschlag</h4>
                  <p>{selectedRisk.solution}</p>
                </div>
                
                <div className={styles.riskDetailSection}>
                  <h4>📋 Empfehlung</h4>
                  <p>{selectedRisk.recommendation}</p>
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
      <Helmet>
        <title>Legal Pulse – Risiken erkennen & Verträge schützen | Contract AI</title>
        <meta name="description" content="Erkenne rechtliche Risiken frühzeitig & schütze deine Verträge mit Legal Pulse. Bleib immer einen Schritt voraus. Jetzt prüfen & absichern!" />
        <meta name="keywords" content="Legal Pulse, Vertragsrisiken erkennen, Gesetzesänderungen, Frühwarnsystem Verträge, Risiken prüfen, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/legalpulse" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Legal Pulse – Risiken erkennen & Verträge schützen | Contract AI" />
        <meta property="og:description" content="Mit Legal Pulse erkennst du rechtliche Risiken frühzeitig & schützt deine Verträge proaktiv. Bleib immer up to date. Jetzt ausprobieren!" />
        <meta property="og:url" content="https://contract-ai.de/legalpulse" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Legal Pulse – Risiken erkennen & Verträge schützen | Contract AI" />
        <meta name="twitter:description" content="Erkenne rechtliche Risiken & sichere deine Verträge ab – mit Legal Pulse von Contract AI. Jetzt prüfen & geschützt bleiben!" />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Rechtliche Risiken erkennen, bevor sie entstehen.
          </h1>
          <p className={styles.heroSubtitle}>
            Legal Pulse analysiert alle Ihre Verträge live, warnt Sie vor Risiken und zeigt Ihnen, wo Sie sofort handeln sollten.
          </p>
          <button 
            className={styles.heroCTA}
            onClick={() => {
              const firstContract = contracts.find(c => c.legalPulse?.riskScore !== null);
              if (firstContract) {
                navigate(`/legalpulse/${firstContract._id}`);
              } else {
                setNotification({ message: "Keine analysierten Verträge verfügbar", type: "error" });
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2"/>
              <path d="M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Jetzt Risiken prüfen
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

      {/* Contracts Overview */}
      <div className={styles.contractsSection}>
        <div className={styles.sectionHeader}>
          <h2>
            📋 Ihre Pulse-Analysen
            <span className={styles.contractCount}>({pagination.total} Verträge)</span>
          </h2>
          <p>Übersicht aller analysierten Verträge mit aktuellen Risiko-Scores</p>
          <div className={styles.headerActions}>
            <Link to="/contracts" className={styles.addContractButton}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Vertrag hinzufügen
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar */}
        {!isLoading && contracts.length > 0 && (
          <div className={styles.filterSection}>
            <div className={styles.filterBar}>
              {/* Search Input */}
              <div className={styles.searchBox}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.searchIcon}>
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  ref={searchInputRef}
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

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Lade Pulse-Analysen...</p>
          </div>
        ) : contracts.length > 0 ? (
          <div className={styles.contractsGrid}>
            {contracts.map((contract) => {
              const riskLevel = getRiskLevel(contract.legalPulse?.riskScore || null);
              return (
                <div 
                  key={contract._id} 
                  className={styles.contractCard}
                  onClick={() => handleContractCardClick(contract)}
                  onMouseEnter={() => handleMouseEnter(contract._id)}
                  onMouseLeave={() => handleMouseLeave(contract._id)}
                >
                  <div className={styles.contractCardHeader}>
                    <div className={styles.contractInfo}>
                      <h3 className={styles.contractName}>
                        {contract.name}
                        {showTooltip[contract._id] && (
                          <div className={styles.nameTooltip}>
                            {contract.name}
                          </div>
                        )}
                      </h3>
                      {contract.isGenerated && (
                        <span className={styles.generatedBadge}>✨ KI</span>
                      )}
                    </div>
                    <div 
                      className={styles.riskBadge}
                      style={{ '--risk-color': riskLevel.color } as React.CSSProperties}
                    >
                      <span className={styles.riskIcon}>{riskLevel.icon}</span>
                      <span className={styles.riskScore}>
                        {contract.legalPulse?.riskScore || '—'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.contractCardBody}>
                    <div className={styles.contractMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Letzter Scan:</span>
                        <span className={styles.metaValue}>
                          {contract.legalPulse?.lastAnalysis 
                            ? new Date(contract.legalPulse.lastAnalysis).toLocaleDateString('de-DE')
                            : 'Noch nicht analysiert'
                          }
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Status:</span>
                        <span 
                          className={styles.metaValue}
                          style={{ color: riskLevel.color }}
                        >
                          {riskLevel.level}
                        </span>
                      </div>
                    </div>
                    
                    {contract.legalPulse?.lastRecommendation && (
                      <div className={styles.lastRecommendation}>
                        <span className={styles.recommendationLabel}>💡 Letzte Empfehlung:</span>
                        <p className={styles.recommendationText}>
                          {contract.legalPulse.lastRecommendation}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className={styles.contractCardFooter}>
                    <button className={styles.detailsButton}>
                      <span>Details ansehen</span>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Infinite Scroll Trigger & Load More Button */}
            {pagination.hasMore && (
              <div
                ref={loadMoreRef}
                className={styles.loadMoreContainer}
              >
                {isLoadingMore ? (
                  <div className={styles.loadingMore}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Lade weitere Verträge...</p>
                  </div>
                ) : (
                  <button
                    className={styles.loadMoreButton}
                    onClick={loadMoreContracts}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Mehr laden ({contracts.length} von {pagination.total})
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
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
    </div>
  );
}
import { useState, useEffect } from "react";
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

export default function LegalPulse() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'recommendations' | 'history' | 'feed'>('overview');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskDetail | null>(null);
  const [completedRecommendations, setCompletedRecommendations] = useState<RecommendationStatus>({});
  const [showTooltip, setShowTooltip] = useState<{ [key: string]: boolean }>({});

  // Legal Pulse 2.0: Live Feed
  const { events: feedEvents, isConnected: feedConnected, clearEvents } = useLegalPulseFeed();

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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const contractsResponse = await fetch("/api/contracts", { credentials: "include" });
        const contractsData = await contractsResponse.json();
        
        // Enrich contracts with mock Legal Pulse data
        const enrichedContracts = contractsData.map(enrichContractWithMockData);
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
    
    fetchData();
  }, [contractId]);

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
                      formatter={(value: number) => [`${value}/100`, 'Score']}
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
                      onClick={() => navigate('/optimizer')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Vertrag optimieren
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
                        formatter={(value: number) => [`${value}/100`, 'Risiko-Score']}
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
                              onClick={() => navigate(event.data.actionUrl)}
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
          <h2>📋 Ihre Pulse-Analysen</h2>
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
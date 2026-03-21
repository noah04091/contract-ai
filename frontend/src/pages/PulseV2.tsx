import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// DashboardLayout not used — PulseV2 uses the global Navbar only
import { usePulseV2 } from '../hooks/usePulseV2';
import { AnalysisPipeline } from '../components/pulseV2/AnalysisPipeline';
import { ContractDetail } from '../components/pulseV2/ContractDetail';
import { FindingCard } from '../components/pulseV2/FindingCard';
import { PortfolioInsightsPanel } from '../components/pulseV2/PortfolioInsightsPanel';
import { ActionItem } from '../components/pulseV2/ActionItem';
import { LegalAlertsPanel } from '../components/pulseV2/LegalAlertsPanel';
import { PortfolioImprovementCard } from '../components/pulseV2/PortfolioImprovementCard';
import { MonitoringStatusCard } from '../components/pulseV2/MonitoringStatusCard';
import type { PulseV2DashboardItem, PulseV2PortfolioInsight, PulseV2Action, PulseV2LegalAlert, PulseV2Finding, PulseV2Clause } from '../types/pulseV2';
import '../styles/PulseV2.module.css';

const API_BASE = '/api';

/** Safely extract string from contractType (may be string or object) */
function safeContractType(ct: unknown): string {
  if (!ct) return '';
  if (typeof ct === 'string') return ct;
  if (typeof ct === 'object' && ct !== null) {
    const obj = ct as Record<string, unknown>;
    return String(obj.displayName || obj.name || '');
  }
  return '';
}

const PulseV2: React.FC = () => {
  const { contractId } = useParams<{ contractId?: string }>();
  const navigate = useNavigate();

  if (contractId) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0f4ff 0%, #fafbff 50%, #f8fafc 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }}>
          <ContractView contractId={contractId} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0f4ff 0%, #fafbff 50%, #f8fafc 100%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px' }}>
        <DashboardView onSelectContract={(id) => navigate(`/pulse/${id}`)} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Contract View — Single contract analysis
// ═══════════════════════════════════════════════════════════
const ContractView: React.FC<{ contractId: string }> = ({ contractId }) => {
  const {
    status, progress, progressMessage, stages,
    result, error,
    partialFindings, partialClauses, contractMeta,
    startAnalysis, cancelAnalysis, loadLatest,
  } = usePulseV2();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLatest(contractId);
      setLoading(false);
    })();
  }, [contractId, loadLatest]);

  const handleStartAnalysis = useCallback(() => {
    startAnalysis(contractId);
  }, [contractId, startAnalysis]);

  if (loading && status === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
        Lade...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/pulse')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 13,
          color: '#6b7280',
          background: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        &#8592; Alle Verträge
      </button>

      {/* Analysis Running */}
      {status === 'analyzing' && (
        <>
          <AnalysisPipeline
            stages={stages}
            progress={progress}
            message={progressMessage}
            onCancel={cancelAnalysis}
          />

          {/* Progressive Rendering: Show partial findings as they stream in */}
          {(partialFindings.length > 0 || contractMeta) && (
            <div style={{ marginTop: 20 }}>
              {/* Contract header with meta */}
              {contractMeta && (
                <div style={{
                  padding: '16px 24px',
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    border: '3px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: '#f9fafb',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>...</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                      {contractMeta.name || 'Vertragsanalyse'}
                    </h2>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                      {contractMeta.type && (
                        <span style={{
                          background: '#eff6ff',
                          color: '#1e40af',
                          padding: '2px 8px',
                          borderRadius: 4,
                          marginRight: 8,
                          fontSize: 12,
                        }}>
                          {contractMeta.type}
                        </span>
                      )}
                      <span>Score wird berechnet...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Streamed findings */}
              {partialFindings.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    Befunde ({partialFindings.length} bisher)
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      display: 'inline-block',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  </div>
                  {[...(partialFindings as PulseV2Finding[])]
                    .sort((a, b) => {
                      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
                    })
                    .map((finding, idx) => {
                      const clause = partialClauses.find(c => c.id === finding.clauseId);
                      return (
                        <FindingCard
                          key={`partial-${finding.clauseId}-${idx}`}
                          finding={finding}
                          clause={clause as PulseV2Clause | undefined}
                          contractId={contractId}
                          disabled
                        />
                      );
                    })}

                  {/* Skeleton placeholder for more findings loading */}
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #d1d5db',
                    borderRadius: 8,
                    background: '#fff',
                    padding: '16px 20px',
                    marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 60, height: 18, background: '#f3f4f6', borderRadius: 4 }} />
                      <div style={{ width: 50, height: 18, background: '#f3f4f6', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: '70%', height: 16, background: '#f3f4f6', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ width: '90%', height: 14, background: '#f9fafb', borderRadius: 4 }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{
          padding: 24,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            Analyse fehlgeschlagen
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d' }}>{error}</div>
          <button
            onClick={handleStartAnalysis}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              fontSize: 13,
              color: '#fff',
              background: '#dc2626',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Result */}
      {status === 'completed' && result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={handleStartAnalysis}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Erneut analysieren
            </button>
          </div>
          <ContractDetail result={result} />
        </>
      )}

      {/* No result yet */}
      {status === 'idle' && !result && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1f50d;</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            Noch keine Analyse vorhanden
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Starten Sie eine tiefgehende Legal Pulse V2 Analyse für diesen Vertrag.
          </div>
          <button
            onClick={handleStartAnalysis}
            style={{
              padding: '12px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Analyse starten
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Dashboard View — Portfolio Dashboard
// ═══════════════════════════════════════════════════════════
type DashboardFilter = 'all' | 'critical' | 'action_needed' | 'unanalyzed';
type SortBy = 'score_asc' | 'score_desc' | 'name' | 'recent';

const DashboardView: React.FC<{ onSelectContract: (id: string) => void }> = ({ onSelectContract }) => {
  const [items, setItems] = useState<PulseV2DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, analyzed: 0 });
  const [insights, setInsights] = useState<PulseV2PortfolioInsight[]>([]);
  const [actions, setActions] = useState<PulseV2Action[]>([]);
  const [legalAlerts, setLegalAlerts] = useState<PulseV2LegalAlert[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<{ hasData: boolean; avgScoreNow: number | null; avgScorePrevious: number | null; delta: number; contractsAnalyzed: number; contractsImproved: number; contractsWorsened: number; actionsTotal: number; actionsCompleted: number; criticalNow: number; criticalResolved: number; topImprovement: { contractId: string; name: string; delta: number; scoreNow: number } | null; topDecline: { contractId: string; name: string; delta: number; scoreNow: number } | null } | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<{ status: 'green' | 'yellow' | 'red' | 'neutral'; statusLabel: string; contractsMonitored: number; lastScan: string | null; lastScheduledScan: string | null; lastRadarScan: string | null; nextMonitorScan: string; nextRadarScan: string; alertsTotal: number; severityCounts: { critical: number; high: number; medium: number; low: number }; recentAlertsCount: number } | null>(null);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('score_asc');

  // Debounce search to avoid excessive re-renders
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, insightsRes, alertsRes, summaryRes, monitorRes] = await Promise.all([
          fetch(`${API_BASE}/legal-pulse-v2/dashboard`, { credentials: 'include' }),
          fetch(`${API_BASE}/legal-pulse-v2/portfolio-insights`, { credentials: 'include' }),
          fetch(`${API_BASE}/legal-pulse-v2/legal-alerts`, { credentials: 'include' }),
          fetch(`${API_BASE}/legal-pulse-v2/portfolio-summary`, { credentials: 'include' }),
          fetch(`${API_BASE}/legal-pulse-v2/monitoring-status`, { credentials: 'include' }),
        ]);
        const dashData = await dashRes.json();
        setItems(dashData.items || []);
        setStats({ total: dashData.totalContracts || 0, analyzed: dashData.analyzedContracts || 0 });

        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights || []);
        setActions(insightsData.actions || []);

        const alertsData = await alertsRes.json();
        setLegalAlerts(alertsData.alerts || []);

        const summaryData = await summaryRes.json();
        setPortfolioSummary(summaryData);

        const monitorData = await monitorRes.json();
        setMonitoringStatus(monitorData);
      } catch (err) {
        console.error('[PulseV2] Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshMonitoringStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/legal-pulse-v2/monitoring-status`, { credentials: 'include' });
      const data = await res.json();
      setMonitoringStatus(data);
    } catch (err) {
      console.error('[PulseV2] Monitoring refresh error:', err);
    }
  }, []);

  // Derived stats
  const alertStats = useMemo(() => {
    const now = Date.now();
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;
    const criticalContracts = items.filter(i => i.v2CriticalCount > 0);
    const renewalSoon = items.filter(i => {
      if (!i.endDate) return false;
      const diff = new Date(i.endDate).getTime() - now;
      return diff > 0 && diff < sixtyDays;
    });
    const analyzedItems = items.filter(i => i.hasV2Result && i.v2Score !== null);
    const avgScore = analyzedItems.length > 0
      ? Math.round(analyzedItems.reduce((sum, i) => sum + (i.v2Score || 0), 0) / analyzedItems.length)
      : null;
    const openActions = actions.filter(a => a.status === 'open');
    const unanalyzed = items.filter(i => !i.hasV2Result);

    return { criticalContracts, renewalSoon, avgScore, openActions, unanalyzed };
  }, [items, actions]);

  // Filtered + searched + sorted items
  const filteredItems = useMemo(() => {
    let result = items;

    // Status filter
    switch (filter) {
      case 'critical':
        result = result.filter(i => i.v2CriticalCount > 0);
        break;
      case 'action_needed':
        result = result.filter(i => i.hasV2Result && i.v2Score !== null && i.v2Score < 60);
        break;
      case 'unanalyzed':
        result = result.filter(i => !i.hasV2Result);
        break;
    }

    // Search (debounced)
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase().trim();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.contractType && safeContractType(i.contractType).toLowerCase().includes(q)) ||
        (i.provider && i.provider.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'score_asc':
          return (a.v2Score ?? 999) - (b.v2Score ?? 999);
        case 'score_desc':
          return (b.v2Score ?? -1) - (a.v2Score ?? -1);
        case 'name':
          return a.name.localeCompare(b.name, 'de');
        case 'recent':
          return (b.v2LastAnalysis ? new Date(b.v2LastAnalysis).getTime() : 0)
            - (a.v2LastAnalysis ? new Date(a.v2LastAnalysis).getTime() : 0);
        default:
          return 0;
      }
    });

    return result;
  }, [items, filter, debouncedQuery, sortBy]);

  // Contract name map for insights panel
  const contractNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.contractId, item.name);
    }
    return map;
  }, [items]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Lade Dashboard...</div>;
  }

  // First-Use: no contracts analyzed yet
  const isFirstUse = stats.analyzed === 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Legal Pulse
          </h1>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#3b82f6',
            background: '#eff6ff',
            padding: '3px 10px',
            borderRadius: 20,
            letterSpacing: '0.5px',
          }}>
            V2
          </span>
        </div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
          {stats.analyzed} von {stats.total} Verträgen analysiert
        </div>
      </div>

      {/* ══════════ Monitoring Status ══════════ */}
      {monitoringStatus && (
        <MonitoringStatusCard
          monitoring={monitoringStatus}
          onRefresh={refreshMonitoringStatus}
          onNavigate={(id) => onSelectContract(id)}
        />
      )}

      {/* ══════════ Hero: Portfolio Health Score ══════════ */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)',
        padding: '36px 44px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 40,
      }}>
        {/* SVG Score Ring */}
        {(() => {
          const score = alertStats.avgScore;
          const color = score === null ? '#d1d5db' : score >= 70 ? '#22c55e' : score >= 50 ? '#d97706' : '#dc2626';
          const label = score === null ? 'Keine Daten' : score >= 70 ? 'Stabil' : score >= 50 ? 'Aufmerksamkeit nötig' : 'Handlungsbedarf';
          const pct = score !== null ? score / 100 : 0;
          const radius = 52;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference * (1 - pct);
          return (
            <>
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                  {score !== null && (
                    <circle
                      cx="60" cy="60" r={radius}
                      fill="none" stroke={color} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  )}
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: score !== null ? color : '#cbd5e1', lineHeight: 1 }}>
                    {score ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
                    Score
                  </span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.3px' }}>
                  Contract Health
                </div>
                <div style={{ fontSize: 15, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
                  {isFirstUse
                    ? 'Noch kein Vertrag analysiert. Starten Sie Ihre erste Analyse.'
                    : label
                  }
                </div>
                {!isFirstUse && stats.analyzed > 0 && (
                  <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#64748b' }}>
                    <span><strong style={{ color: '#0f172a' }}>{stats.analyzed}</strong> analysiert</span>
                    <span><strong style={{ color: alertStats.criticalContracts.length > 0 ? '#dc2626' : '#0f172a' }}>{alertStats.criticalContracts.length}</strong> kritisch</span>
                    <span><strong style={{ color: '#0f172a' }}>{alertStats.renewalSoon.length}</strong> bald ablaufend</span>
                  </div>
                )}
                {isFirstUse && items.length > 0 && (
                  <button
                    onClick={() => onSelectContract(items[0].contractId)}
                    style={{
                      padding: '10px 28px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    Erste Analyse starten
                  </button>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* ══════════ First-Use: Demo Insight + Value Proposition ══════════ */}
      {isFirstUse && (
        <>
          {/* Demo Insight — creates curiosity */}
          <div style={{
            padding: '16px 24px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #d97706',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                Wussten Sie?
              </div>
              <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.5 }}>
                Haftungsklauseln in deutschen Verträgen enthalten häufig unwirksame Formulierungen (§307 BGB). Legal Pulse prüft jede Klausel auf Durchsetzbarkeit.
              </div>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => onSelectContract(items[0].contractId)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#92400e',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Jetzt prüfen
              </button>
            )}
          </div>

          {/* Value Props */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { icon: '\u2696️', title: 'Rechtliche Risiken erkennen', desc: 'KI-Analyse prüft jede Klausel auf Wirksamkeit, DSGVO und Haftungsrisiken.' },
              { icon: '\ud83d\udcb0', title: 'Kostenfallen vermeiden', desc: 'Erkennt automatische Verlängerungen, versteckte Gebühren und überhöhte Preise.' },
              { icon: '\ud83d\udcca', title: 'Portfolio überwachen', desc: 'Alle Verträge auf einen Blick — mit Fristen, Scores und Handlungsempfehlungen.' },
            ].map(card => (
              <div key={card.title} style={{
                padding: 24,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Portfolio Improvement Tracking */}
      {portfolioSummary && (
        <PortfolioImprovementCard
          summary={portfolioSummary}
          onNavigate={(id) => onSelectContract(id)}
        />
      )}

      {/* Alert Cards — only when we have data */}
      {stats.analyzed > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}>
          <AlertCard
            icon="&#9888;"
            label="Kritische Verträge"
            value={alertStats.criticalContracts.length}
            color={alertStats.criticalContracts.length > 0 ? '#dc2626' : '#22c55e'}
            bg={alertStats.criticalContracts.length > 0 ? '#fef2f2' : '#f0fdf4'}
            onClick={() => setFilter(alertStats.criticalContracts.length > 0 ? 'critical' : 'all')}
          />
          <AlertCard
            icon="&#8635;"
            label="Renewal < 60 Tage"
            value={alertStats.renewalSoon.length}
            color={alertStats.renewalSoon.length > 0 ? '#d97706' : '#6b7280'}
            bg={alertStats.renewalSoon.length > 0 ? '#fffbeb' : '#f9fafb'}
          />
          <AlertCard
            icon="&#9889;"
            label="Offene Aktionen"
            value={alertStats.openActions.length}
            color={alertStats.openActions.length > 0 ? '#ea580c' : '#6b7280'}
            bg={alertStats.openActions.length > 0 ? '#fff7ed' : '#f9fafb'}
          />
          <AlertCard
            icon="&#9733;"
            label="Durchschnitt-Score"
            value={alertStats.avgScore ?? '—'}
            color={
              alertStats.avgScore === null ? '#9ca3af'
                : alertStats.avgScore >= 70 ? '#22c55e'
                : alertStats.avgScore >= 50 ? '#d97706'
                : '#dc2626'
            }
            bg="#f9fafb"
          />
        </div>
      )}

      {/* Legal Radar Alerts */}
      <LegalAlertsPanel
        alerts={legalAlerts}
        onDismiss={async (alertId) => {
          try {
            await fetch(`${API_BASE}/legal-pulse-v2/legal-alerts/${alertId}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'dismissed' }),
            });
            setLegalAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'dismissed' } : a));
          } catch (err) {
            console.error('[PulseV2] Alert dismiss failed:', err);
          }
        }}
        onNavigate={(contractId) => onSelectContract(contractId)}
      />

      {/* Portfolio Insights */}
      {insights.length > 0 && (
        <PortfolioInsightsPanel insights={insights} contractNames={contractNames} />
      )}

      {/* Action Center */}
      {alertStats.openActions.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)',
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.3px' }}>
            Handlungsbedarf
            <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              {alertStats.openActions.length} offen
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...alertStats.openActions]
              .sort((a, b) => {
                const order: Record<string, number> = { now: 0, plan: 1, watch: 2 };
                return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
              })
              .slice(0, 5)
              .map(action => (
                <ActionItem key={action.id} action={action} />
              ))
            }
            {alertStats.openActions.length > 5 && (
              <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: 8 }}>
                + {alertStats.openActions.length - 5} weitere Aktionen
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ Contract Grid: Search + Filter + Sort ══════════ */}
      <div style={{ marginBottom: 20 }}>
        {/* Row 1: Title + Search + Sort */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Verträge</span>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <span style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              color: '#9ca3af',
              pointerEvents: 'none',
            }}>&#128269;</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Vertrag suchen..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                fontSize: 13,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                outline: 'none',
                color: '#0f172a',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#9ca3af',
                  padding: 2,
                }}
              >&times;</button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            style={{
              padding: '8px 12px',
              fontSize: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              color: '#334155',
              background: '#fff',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <option value="score_asc">Schlechteste zuerst</option>
            <option value="score_desc">Beste zuerst</option>
            <option value="name">Name A–Z</option>
            <option value="recent">Zuletzt analysiert</option>
          </select>
        </div>

        {/* Row 2: Filter buttons + count */}
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {([
            ['all', 'Alle'],
            ['critical', `Kritisch (${alertStats.criticalContracts.length})`],
            ['action_needed', 'Handlungsbedarf'],
            ['unanalyzed', `Nicht analysiert (${alertStats.unanalyzed.length})`],
          ] as [DashboardFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '5px 14px',
                fontSize: 12,
                borderRadius: 20,
                border: filter === key ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                background: filter === key ? '#3b82f6' : '#fff',
                color: filter === key ? '#fff' : '#64748b',
                cursor: 'pointer',
                fontWeight: filter === key ? 600 : 500,
                transition: 'all 0.15s ease',
                boxShadow: filter === key ? '0 2px 4px rgba(59,130,246,0.2)' : 'none',
              }}
            >
              {label}
            </button>
          ))}

          {/* Count indicator */}
          {(debouncedQuery || filter !== 'all') && (
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
              {filteredItems.length} von {items.length} Verträgen
            </span>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 72,
          background: '#fff',
          borderRadius: 20,
          color: '#64748b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {items.length === 0 ? (
            'Keine Verträge vorhanden.'
          ) : (
            <>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                {debouncedQuery
                  ? `Keine Treffer für „${debouncedQuery}“`
                  : 'Keine Verträge für diesen Filter.'
                }
              </div>
              <button
                onClick={() => { setFilter('all'); setSearchQuery(''); }}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(59,130,246,0.2)',
                }}
              >
                Alle anzeigen
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}>
          {filteredItems.map(item => (
            <ContractCard key={item.contractId} item={item} onClick={() => onSelectContract(item.contractId)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Alert Card
// ═══════════════════════════════════════════════════════════
const AlertCard: React.FC<{
  icon: string;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  onClick?: () => void;
}> = ({ icon, label, value, color, bg, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '20px 24px',
      background: bg || '#fff',
      borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)',
      cursor: onClick ? 'pointer' : 'default',
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 16 }} dangerouslySetInnerHTML={{ __html: icon }} />
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, letterSpacing: '0.2px' }}>{label}</span>
    </div>
    <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// Contract Card
// ═══════════════════════════════════════════════════════════
const ContractCard: React.FC<{ item: PulseV2DashboardItem; onClick: () => void }> = ({ item, onClick }) => {
  const score = item.v2Score;
  const scoreColor = score === null ? '#cbd5e1' : score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
  const now = Date.now();
  const daysUntilExpiry = item.endDate ? Math.ceil((new Date(item.endDate).getTime() - now) / (1000 * 60 * 60 * 24)) : null;
  const pct = score !== null ? score / 100 : 0;
  const r = 22;
  const circ = 2 * Math.PI * r;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '18px 20px',
        background: '#fff',
        borderRadius: 16,
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        boxShadow: item.v2CriticalCount > 0
          ? '0 0 0 1px #fecaca, 0 1px 3px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = item.v2CriticalCount > 0
          ? '0 0 0 1px #fecaca, 0 1px 3px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)';
      }}
    >
      {/* Mini SVG Score Ring */}
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
          {score !== null && (
            <circle
              cx="26" cy="26" r={r}
              fill="none" stroke={scoreColor} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
            />
          )}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: score !== null ? scoreColor : '#cbd5e1' }}>
            {score ?? '—'}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#0f172a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {item.name}
          {item.v2CriticalCount > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#dc2626',
              background: '#fef2f2',
              padding: '2px 8px',
              borderRadius: 20,
              flexShrink: 0,
              letterSpacing: '0.3px',
            }}>
              {item.v2CriticalCount} KRITISCH
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          {item.contractType && <span>{safeContractType(item.contractType)} · </span>}
          {item.provider && <span>{item.provider} · </span>}
          {item.hasV2Result
            ? `${item.v2FindingsCount} Befunde`
            : 'Noch nicht analysiert'
          }
        </div>
        {daysUntilExpiry !== null && (
          <div style={{
            fontSize: 11,
            marginTop: 3,
            color: daysUntilExpiry < 0 ? '#dc2626' : daysUntilExpiry < 30 ? '#d97706' : '#94a3b8',
            fontWeight: daysUntilExpiry < 30 ? 600 : 400,
          }}>
            {daysUntilExpiry < 0 ? 'Abgelaufen' : daysUntilExpiry === 0 ? 'Läuft heute ab' : `${daysUntilExpiry} Tage bis Ablauf`}
          </div>
        )}
      </div>

      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <path d="M7 5l5 5-5 5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default PulseV2;

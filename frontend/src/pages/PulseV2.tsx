import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardV2/DashboardLayout';
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

const PulseV2: React.FC = () => {
  const { contractId } = useParams<{ contractId?: string }>();
  const navigate = useNavigate();

  if (contractId) {
    return (
      <DashboardLayout>
        <ContractView contractId={contractId} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardView onSelectContract={(id) => navigate(`/pulse/${id}`)} />
    </DashboardLayout>
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
        (i.contractType && i.contractType.toLowerCase().includes(q)) ||
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Legal Pulse
          </h1>
          <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            {stats.analyzed} von {stats.total} Verträgen analysiert
          </div>
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
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        padding: '32px 40px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}>
        {/* Score Circle */}
        {(() => {
          const score = alertStats.avgScore;
          const color = score === null ? '#d1d5db' : score >= 70 ? '#22c55e' : score >= 50 ? '#d97706' : '#dc2626';
          const label = score === null ? 'Keine Daten' : score >= 70 ? 'Stabil' : score >= 50 ? 'Aufmerksamkeit nötig' : 'Handlungsbedarf';
          return (
            <>
              <div style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: `5px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: score === null ? '#f9fafb' : undefined,
              }}>
                <span style={{ fontSize: 36, fontWeight: 800, color }}>
                  {score ?? '—'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                  Contract Health
                </div>
                <div style={{ fontSize: 15, color: '#6b7280', marginBottom: 8 }}>
                  {isFirstUse
                    ? 'Noch kein Vertrag analysiert. Starten Sie Ihre erste Analyse.'
                    : label
                  }
                </div>
                {isFirstUse && items.length > 0 && (
                  <button
                    onClick={() => onSelectContract(items[0].contractId)}
                    style={{
                      padding: '10px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
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
              { icon: '\u2696\ufe0f', title: 'Rechtliche Risiken erkennen', desc: 'KI-Analyse prüft jede Klausel auf Wirksamkeit, DSGVO und Haftungsrisiken.' },
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
          gap: 12,
          marginBottom: 24,
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
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            Handlungsbedarf
            <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
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
      <div style={{ marginBottom: 16 }}>
        {/* Row 1: Title + Search + Sort */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Vertr\u00e4ge</span>

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
                padding: '7px 10px 7px 32px',
                fontSize: 13,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                outline: 'none',
                color: '#111827',
                background: '#fff',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
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
              padding: '7px 10px',
              fontSize: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              color: '#374151',
              background: '#fff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="score_asc">Schlechteste zuerst</option>
            <option value="score_desc">Beste zuerst</option>
            <option value="name">Name A\u2013Z</option>
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
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: filter === key ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                background: filter === key ? '#eff6ff' : '#fff',
                color: filter === key ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                fontWeight: filter === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}

          {/* Count indicator */}
          {(debouncedQuery || filter !== 'all') && (
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
              {filteredItems.length} von {items.length} Vertr\u00e4gen
            </span>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f9fafb',
          borderRadius: 12,
          color: '#6b7280',
        }}>
          {items.length === 0 ? (
            'Keine Vertr\u00e4ge vorhanden.'
          ) : (
            <>
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                {debouncedQuery
                  ? `Keine Treffer f\u00fcr \u201e${debouncedQuery}\u201c`
                  : 'Keine Vertr\u00e4ge f\u00fcr diesen Filter.'
                }
              </div>
              <button
                onClick={() => { setFilter('all'); setSearchQuery(''); }}
                style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  color: '#3b82f6',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  cursor: 'pointer',
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
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
      padding: '16px 20px',
      background: bg,
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 16 }} dangerouslySetInnerHTML={{ __html: icon }} />
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// Contract Card
// ═══════════════════════════════════════════════════════════
const ContractCard: React.FC<{ item: PulseV2DashboardItem; onClick: () => void }> = ({ item, onClick }) => {
  const score = item.v2Score;
  const scoreColor = score === null ? '#9ca3af' : score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
  const now = Date.now();
  const daysUntilExpiry = item.endDate ? Math.ceil((new Date(item.endDate).getTime() - now) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        background: '#fff',
        border: `1px solid ${item.v2CriticalCount > 0 ? '#fecaca' : '#e5e7eb'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      {/* Score Circle */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: `3px solid ${scoreColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor }}>
          {score ?? '—'}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {item.name}
          {item.v2CriticalCount > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#dc2626',
              background: '#fef2f2',
              padding: '1px 6px',
              borderRadius: 4,
              flexShrink: 0,
            }}>
              {item.v2CriticalCount} KRITISCH
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          {item.contractType && <span>{item.contractType} · </span>}
          {item.provider && <span>{item.provider} · </span>}
          {item.hasV2Result
            ? `${item.v2FindingsCount} Befunde`
            : 'Noch nicht analysiert'
          }
        </div>
        {daysUntilExpiry !== null && (
          <div style={{
            fontSize: 11,
            marginTop: 2,
            color: daysUntilExpiry < 0 ? '#dc2626' : daysUntilExpiry < 30 ? '#d97706' : '#9ca3af',
            fontWeight: daysUntilExpiry < 30 ? 600 : 400,
          }}>
            {daysUntilExpiry < 0 ? 'Abgelaufen' : daysUntilExpiry === 0 ? 'Läuft heute ab' : `${daysUntilExpiry} Tage bis Ablauf`}
          </div>
        )}
      </div>

      <span style={{ fontSize: 16, color: '#d1d5db' }}>&#8250;</span>
    </div>
  );
};

export default PulseV2;

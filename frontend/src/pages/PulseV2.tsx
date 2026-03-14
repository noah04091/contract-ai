import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardV2/DashboardLayout';
import { usePulseV2 } from '../hooks/usePulseV2';
import { AnalysisPipeline } from '../components/pulseV2/AnalysisPipeline';
import { ContractDetail } from '../components/pulseV2/ContractDetail';
import { PortfolioInsightsPanel } from '../components/pulseV2/PortfolioInsightsPanel';
import { ActionItem } from '../components/pulseV2/ActionItem';
import { LegalAlertsPanel } from '../components/pulseV2/LegalAlertsPanel';
import type { PulseV2DashboardItem, PulseV2PortfolioInsight, PulseV2Action, PulseV2LegalAlert } from '../types/pulseV2';

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
        <AnalysisPipeline
          stages={stages}
          progress={progress}
          message={progressMessage}
          onCancel={cancelAnalysis}
        />
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

const DashboardView: React.FC<{ onSelectContract: (id: string) => void }> = ({ onSelectContract }) => {
  const [items, setItems] = useState<PulseV2DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, analyzed: 0 });
  const [insights, setInsights] = useState<PulseV2PortfolioInsight[]>([]);
  const [actions, setActions] = useState<PulseV2Action[]>([]);
  const [legalAlerts, setLegalAlerts] = useState<PulseV2LegalAlert[]>([]);
  const [filter, setFilter] = useState<DashboardFilter>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, insightsRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/legal-pulse-v2/dashboard`, { credentials: 'include' }),
          fetch(`${API_BASE}/legal-pulse-v2/portfolio-insights`, { credentials: 'include' }),
          fetch(`${API_BASE}/legal-pulse-v2/legal-alerts`, { credentials: 'include' }),
        ]);
        const dashData = await dashRes.json();
        setItems(dashData.items || []);
        setStats({ total: dashData.totalContracts || 0, analyzed: dashData.analyzedContracts || 0 });

        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights || []);
        setActions(insightsData.actions || []);

        const alertsData = await alertsRes.json();
        setLegalAlerts(alertsData.alerts || []);
      } catch (err) {
        console.error('[PulseV2] Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
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

  // Filtered items
  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'critical':
        return items.filter(i => i.v2CriticalCount > 0);
      case 'action_needed':
        return items.filter(i => i.hasV2Result && i.v2Score !== null && i.v2Score < 60);
      case 'unanalyzed':
        return items.filter(i => !i.hasV2Result);
      default:
        return items;
    }
  }, [items, filter]);

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

      {/* Alert Cards */}
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

      {/* Contract Grid */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Verträge</span>
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
      </div>

      {filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f9fafb',
          borderRadius: 12,
          color: '#6b7280',
        }}>
          {items.length === 0 ? 'Keine Verträge vorhanden.' : 'Keine Verträge für diesen Filter.'}
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

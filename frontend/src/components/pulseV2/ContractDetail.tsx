import React, { useState, useEffect, useCallback } from 'react';
import type { PulseV2Result, PulseV2Action } from '../../types/pulseV2';
import { HealthScoreGauge } from './HealthScoreGauge';
import { FindingCard } from './FindingCard';
import { ScoreTrend } from './ScoreTrend';
import { PortfolioInsightsPanel } from './PortfolioInsightsPanel';
import { ActionItem } from './ActionItem';

interface ContractDetailProps {
  result: PulseV2Result;
}

type FilterSeverity = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info';
type FilterType = 'all' | 'risk' | 'compliance' | 'opportunity' | 'information';

export const ContractDetail: React.FC<ContractDetailProps> = ({ result }) => {
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [actions, setActions] = useState<PulseV2Action[]>(result.actions || []);

  // Build contract name map for portfolio insights
  const [contractNames, setContractNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setActions(result.actions || []);
  }, [result]);

  useEffect(() => {
    // Build name map from related contracts in context
    const names = new Map<string, string>();
    names.set(result.contractId, result.context?.contractName || 'Aktueller Vertrag');
    if (result.context?.relatedContracts) {
      for (const rc of result.context.relatedContracts) {
        if (rc.name) names.set(rc.name, rc.name);
      }
    }
    setContractNames(names);
  }, [result]);

  const handleActionStatusChange = useCallback(async (actionId: string, status: 'open' | 'done' | 'dismissed') => {
    try {
      const res = await fetch(`/api/legal-pulse-v2/results/${result._id}/actions/${actionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.actions) {
        setActions(data.actions);
      }
    } catch (err) {
      console.error('[PulseV2] Action update failed:', err);
    }
  }, [result._id]);

  const findings = result.clauseFindings || [];
  const clauses = result.clauses || [];

  const filteredFindings = findings.filter(f => {
    if (filterSeverity !== 'all' && f.severity !== filterSeverity) return false;
    if (filterType !== 'all' && f.type !== filterType) return false;
    return true;
  });

  const clauseMap = new Map(clauses.map(c => [c.id, c]));

  // Stats
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const opportunityCount = findings.filter(f => f.type === 'opportunity').length;

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 32,
        marginBottom: 24,
        padding: 24,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
      }}>
        <HealthScoreGauge scores={result.scores} riskTrend={result.context?.riskTrend} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            {result.context?.contractName || 'Vertragsanalyse'}
          </h2>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            {result.document?.contractType && (
              <span style={{
                background: '#eff6ff',
                color: '#1e40af',
                padding: '2px 8px',
                borderRadius: 4,
                marginRight: 8,
                fontSize: 12,
              }}>
                {result.document.contractType}
              </span>
            )}
            {result.context?.provider && (
              <span style={{ marginRight: 12 }}>Anbieter: {result.context.provider}</span>
            )}
            {result.context?.daysUntilExpiry !== null && result.context?.daysUntilExpiry !== undefined && (
              <span style={{
                color: (result.context.daysUntilExpiry ?? 999) < 30 ? '#dc2626' : '#6b7280',
              }}>
                {(result.context.daysUntilExpiry ?? 0) < 0
                  ? 'Abgelaufen'
                  : `${result.context.daysUntilExpiry} Tage bis Ablauf`
                }
              </span>
            )}
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Stat label="Klauseln" value={clauses.length} />
            <Stat label="Befunde" value={findings.length} />
            {criticalCount > 0 && <Stat label="Kritisch" value={criticalCount} color="#dc2626" />}
            {highCount > 0 && <Stat label="Hoch" value={highCount} color="#ea580c" />}
            {mediumCount > 0 && <Stat label="Mittel" value={mediumCount} color="#d97706" />}
            {opportunityCount > 0 && <Stat label="Chancen" value={opportunityCount} color="#16a34a" />}
          </div>

          {/* Meta */}
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Analysiert am {new Date(result.createdAt).toLocaleDateString('de-DE')} um {new Date(result.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            {result.costs?.totalCostUSD ? ` · $${result.costs.totalCostUSD.toFixed(4)}` : ''}
            {result.document?.qualityScore ? ` · Dokumentqualität: ${result.document.qualityScore}%` : ''}
          </div>
        </div>
      </div>

      {/* Score Timeline */}
      <ScoreTrend contractId={result.contractId} />

      {/* Portfolio Insights */}
      <PortfolioInsightsPanel
        insights={result.portfolioInsights || []}
        contractNames={contractNames}
      />

      {/* Action Recommendations */}
      {actions.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            Handlungsempfehlungen
            <span style={{
              marginLeft: 8,
              fontSize: 12,
              color: '#6b7280',
              fontWeight: 400,
            }}>
              {actions.filter(a => a.status === 'open').length} offen
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...actions]
              .sort((a, b) => {
                const order: Record<string, number> = { now: 0, plan: 1, watch: 2 };
                return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
              })
              .map(action => (
              <ActionItem
                key={action.id}
                action={action}
                onStatusChange={handleActionStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Filter:</span>
        {/* Severity filters */}
        {(['all', 'critical', 'high', 'medium', 'low', 'info'] as FilterSeverity[]).map(s => (
          <FilterBtn
            key={s}
            active={filterSeverity === s}
            onClick={() => setFilterSeverity(s)}
            label={s === 'all' ? 'Alle Stufen' : s === 'critical' ? 'Kritisch' : s === 'high' ? 'Hoch' : s === 'medium' ? 'Mittel' : s === 'low' ? 'Niedrig' : 'Info'}
          />
        ))}
        <span style={{ color: '#d1d5db' }}>|</span>
        {(['all', 'risk', 'compliance', 'opportunity', 'information'] as FilterType[]).map(t => (
          <FilterBtn
            key={t}
            active={filterType === t}
            onClick={() => setFilterType(t)}
            label={t === 'all' ? 'Alle Typen' : t === 'risk' ? 'Risiken' : t === 'compliance' ? 'Compliance' : t === 'opportunity' ? 'Chancen' : 'Infos'}
          />
        ))}
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#9ca3af',
          background: '#f9fafb',
          borderRadius: 12,
        }}>
          {findings.length === 0
            ? 'Keine Befunde — der Vertrag scheint solide zu sein.'
            : 'Keine Befunde für den gewählten Filter.'
          }
        </div>
      ) : (
        filteredFindings.map((finding, idx) => (
          <FindingCard
            key={`${finding.clauseId}-${idx}`}
            finding={finding}
            clause={clauseMap.get(finding.clauseId)}
            contractId={result.contractId}
          />
        ))
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <div style={{
    background: '#f9fafb',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 13,
  }}>
    <span style={{ color: '#6b7280' }}>{label}: </span>
    <span style={{ fontWeight: 600, color: color || '#111827' }}>{value}</span>
  </div>
);

const FilterBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px',
      fontSize: 12,
      borderRadius: 6,
      border: active ? '1px solid #3b82f6' : '1px solid #e5e7eb',
      background: active ? '#eff6ff' : '#fff',
      color: active ? '#2563eb' : '#6b7280',
      cursor: 'pointer',
      fontWeight: active ? 600 : 400,
    }}
  >
    {label}
  </button>
);

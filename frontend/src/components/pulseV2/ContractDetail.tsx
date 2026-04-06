import React, { useState, useEffect, useCallback } from 'react';
import type { PulseV2Result, PulseV2Action } from '../../types/pulseV2';
import { HealthScoreGauge } from './HealthScoreGauge';
import { FindingCard } from './FindingCard';
import { ScoreTrend } from './ScoreTrend';
import { PortfolioInsightsPanel } from './PortfolioInsightsPanel';
import { ActionItem } from './ActionItem';

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

interface ContractDetailProps {
  result: PulseV2Result;
}

export const ContractDetail: React.FC<ContractDetailProps> = ({ result }) => {
  const [actions, setActions] = useState<PulseV2Action[]>(result.actions || []);
  const [showAllFindings, setShowAllFindings] = useState(false);

  // Build contract name map for portfolio insights
  const [contractNames, setContractNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setActions(result.actions || []);
  }, [result]);

  useEffect(() => {
    const names = new Map<string, string>();
    names.set(result.contractId, result.context?.contractName || 'Aktueller Vertrag');
    if (result.context?.relatedContracts) {
      for (const rc of result.context.relatedContracts) {
        if (rc.name) names.set(rc.name, rc.name);
      }
    }
    setContractNames(names);
  }, [result]);

  const handleActionStatusChange = useCallback(async (actionId: string, status: 'open' | 'done' | 'dismissed', _resultId?: string) => {
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
  const clauseMap = new Map(clauses.map(c => [c.id, c]));

  // Severity counts
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

  // Type counts
  const riskCount = findings.filter(f => f.type === 'risk').length;
  const complianceCount = findings.filter(f => f.type === 'compliance').length;
  const opportunityCount = findings.filter(f => f.type === 'opportunity').length;

  // Top findings: only critical + high, max 3
  const topFindings = findings
    .filter(f => f.severity === 'critical' || f.severity === 'high');

  // Medium findings: visible but secondary
  const mediumFindings = findings.filter(f => f.severity === 'medium');

  // Secondary findings: low + info, collapsed by default
  const secondaryFindings = findings.filter(f => f.severity === 'low' || f.severity === 'info');

  // Score label + context description
  const score = result.scores?.overall ?? 0;
  const scoreLabel = score >= 80 ? 'Gut' : score >= 60 ? 'Akzeptabel' : score >= 40 ? 'Bedenklich' : 'Kritisch';
  const scoreLabelColor = score >= 80 ? '#15803d' : score >= 60 ? '#d97706' : score >= 40 ? '#ea580c' : '#dc2626';
  const scoreDescription = score >= 80
    ? 'Solider Vertrag ohne wesentliche Risiken.'
    : score >= 60
      ? `Solider Vertrag mit ${criticalCount + highCount > 0 ? 'einigen wichtigen Punkten' : 'einseitigen Klauseln'}. Keine akuten Risiken.`
      : score >= 40
        ? `Vertrag mit ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'wichtigem Punkt' : 'wichtigen Punkten'}, die geprüft werden sollten.`
        : `Vertrag mit erheblichen Risiken. ${criticalCount > 0 ? `${criticalCount} kritische${criticalCount > 1 ? ' Punkte' : 'r Punkt'} erfordert sofortige Aufmerksamkeit.` : 'Dringend prüfen.'}`;

  return (
    <div>
      {/* ═══ Quality Warning Banner ═══ */}
      {result.qualityWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          color: '#92400e',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#9888;</span>
          <div>
            <div style={{ fontWeight: 600 }}>Eingeschränkte Dokumentqualität (Score: {result.qualityWarning.score}/100)</div>
            <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>
              {result.qualityWarning.message}. Für bessere Ergebnisse laden Sie eine höher aufgelöste PDF hoch.
            </div>
          </div>
        </div>
      )}

      {/* ═══ Coverage Warning Banner ═══ */}
      {result.coverage && result.coverage.percentage < 100 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          color: '#1e40af',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#9432;</span>
          <div>
            <div style={{ fontWeight: 600 }}>
              {result.coverage.analyzed} von {result.coverage.total} Klauseln analysiert ({result.coverage.percentage}%)
            </div>
            <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
              {result.coverage.notAnalyzed} Klauseln konnten nicht vollständig ausgewertet werden.
            </div>
          </div>
        </div>
      )}

      {/* ═══ Header: Score + Contract Overview ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 32,
        marginBottom: 20,
        padding: 24,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ position: 'relative' }}>
          <HealthScoreGauge scores={result.scores} riskTrend={result.context?.riskTrend} />
          {result.previousResultId && result.context?.riskTrend && result.context.riskTrend !== 'stable' && (() => {
            const isImproving = result.context!.riskTrend === 'improving';
            return (
              <div style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                fontSize: 11,
                fontWeight: 700,
                color: isImproving ? '#15803d' : '#dc2626',
                background: isImproving ? '#dcfce7' : '#fef2f2',
                border: `1px solid ${isImproving ? '#86efac' : '#fecaca'}`,
                padding: '1px 6px',
                borderRadius: 6,
              }}>
                {isImproving ? '\u2191' : '\u2193'}
              </div>
            );
          })()}
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
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
                {safeContractType(result.document.contractType)}
              </span>
            )}
            {result.context?.provider && (
              <span style={{ marginRight: 12 }}>Anbieter: {safeContractType(result.context.provider)}</span>
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

          {/* Status line */}
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: scoreLabelColor,
            marginBottom: 8,
          }}>
            {scoreLabel}
            {findings.length > 0 && (
              <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 13, marginLeft: 8 }}>
                &mdash; {findings.length} Befunde in {result.coverage ? `${result.coverage.analyzed}/${result.coverage.total}` : String(clauses.length)} Klauseln
                {result.coverage && result.coverage.percentage < 100 && (
                  <span style={{ color: '#d97706', marginLeft: 4 }}>({result.coverage.percentage}%)</span>
                )}
              </span>
            )}
          </div>

          {/* Score context */}
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {scoreDescription}
          </div>

          {/* Meta */}
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Analysiert am {new Date(result.createdAt).toLocaleDateString('de-DE')} um {new Date(result.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ═══ Risk Overview: compact severity bars ═══ */}
      {findings.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
            Risiko-Übersicht
          </div>

          {/* Severity bar */}
          <div style={{
            display: 'flex',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 12,
            background: '#f3f4f6',
          }}>
            {criticalCount > 0 && <div style={{ width: `${(criticalCount / findings.length) * 100}%`, background: '#dc2626' }} />}
            {highCount > 0 && <div style={{ width: `${(highCount / findings.length) * 100}%`, background: '#ea580c' }} />}
            {mediumCount > 0 && <div style={{ width: `${(mediumCount / findings.length) * 100}%`, background: '#d97706' }} />}
            {lowCount > 0 && <div style={{ width: `${(lowCount / findings.length) * 100}%`, background: '#9ca3af' }} />}
            {infoCount > 0 && <div style={{ width: `${(infoCount / findings.length) * 100}%`, background: '#d1d5db' }} />}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
            {criticalCount > 0 && <SeverityDot color="#dc2626" label="Kritisch" count={criticalCount} />}
            {highCount > 0 && <SeverityDot color="#ea580c" label="Hoch" count={highCount} />}
            {mediumCount > 0 && <SeverityDot color="#d97706" label="Mittel" count={mediumCount} />}
            {lowCount > 0 && <SeverityDot color="#9ca3af" label="Niedrig" count={lowCount} />}
            {infoCount > 0 && <SeverityDot color="#d1d5db" label="Info" count={infoCount} />}
            <span style={{ color: '#d1d5db' }}>|</span>
            {riskCount > 0 && <span style={{ color: '#6b7280' }}>{riskCount} Risiken</span>}
            {complianceCount > 0 && <span style={{ color: '#6b7280' }}>{complianceCount} Compliance</span>}
            {opportunityCount > 0 && <span style={{ color: '#16a34a' }}>{opportunityCount} Chancen</span>}
          </div>
        </div>
      )}

      {/* ═══ Handlungsbedarf (Actions) — the CORE section ═══ */}
      {actions.length > 0 && (() => {
        const doneCount = actions.filter(a => a.status === 'done').length;
        const totalCount = actions.length;
        const progressPct = Math.round((doneCount / totalCount) * 100);

        return (
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                Handlungsbedarf
                <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                  {actions.filter(a => a.status === 'open').length} offen
                </span>
              </div>
              {doneCount > 0 && (
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  {doneCount}/{totalCount} erledigt
                </span>
              )}
            </div>

            {doneCount > 0 && (
              <div style={{
                height: 4,
                background: '#f3f4f6',
                borderRadius: 2,
                marginBottom: 16,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            {progressPct === 100 && (
              <div style={{
                padding: '16px 20px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                marginBottom: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>&#127881;</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>
                  Alle Maßnahmen erledigt
                </div>
                <div style={{ fontSize: 13, color: '#16a34a', marginTop: 2 }}>
                  Starten Sie eine neue Analyse, um den verbesserten Score zu sehen.
                </div>
              </div>
            )}

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
                  contractId={result.contractId}
                  onStatusChange={handleActionStatusChange}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══ Top Risiken — only critical + high, max 3 ═══ */}
      {topFindings.length > 0 && (() => {
        const topCritical = topFindings.filter(f => f.severity === 'critical').length;
        const topHigh = topFindings.filter(f => f.severity === 'high').length;
        const urgencyColor = topCritical > 0 ? '#dc2626' : '#ea580c';
        const urgencyBg = topCritical > 0 ? '#fef2f2' : '#fff7ed';
        const urgencyBorder = topCritical > 0 ? '#fecaca' : '#fed7aa';

        // Build subline parts
        const total = topCritical + topHigh;
        const subParts: string[] = [];
        if (topCritical > 0) subParts.push(`${topCritical} kritisch`);
        if (topHigh > 0) subParts.push(`${topHigh} hoch`);

        return (
        <div style={{
          background: '#fff',
          border: `1px solid ${urgencyBorder}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{
            marginBottom: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: urgencyBg,
              fontSize: 13,
              flexShrink: 0,
              marginTop: 1,
            }}>&#9888;</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: urgencyColor }}>
                {total} {total === 1 ? 'Risiko erfordert' : 'Risiken erfordern'} Aufmerksamkeit
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {subParts.join(' · ')}
              </div>
            </div>
          </div>
          {topFindings.map((finding, idx) => (
            <FindingCard
              key={`top-${finding.clauseId}-${idx}`}
              finding={finding}
              clause={clauseMap.get(finding.clauseId)}
              contractId={result.contractId}
              resultId={result._id}
            />
          ))}
        </div>
        );
      })()}

      {/* ═══ Weitere Hinweise (Medium) ═══ */}
      {mediumFindings.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 14 }}>
            Weitere Hinweise
            <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>
              {mediumFindings.length} {mediumFindings.length === 1 ? 'Punkt' : 'Punkte'}
            </span>
          </div>
          {mediumFindings.map((finding, idx) => (
            <FindingCard
              key={`med-${finding.clauseId}-${idx}`}
              finding={finding}
              clause={clauseMap.get(finding.clauseId)}
              contractId={result.contractId}
              resultId={result._id}
            />
          ))}
        </div>
      )}

      {/* ═══ Score Timeline ═══ */}
      <ScoreTrend contractId={result.contractId} />

      {/* ═══ Portfolio Insights ═══ */}
      <PortfolioInsightsPanel
        insights={result.portfolioInsights || []}
        contractNames={contractNames}
      />

      {/* ═══ Weitere Details — low + info, collapsed ═══ */}
      {secondaryFindings.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          overflow: 'hidden',
          marginTop: 20,
        }}>
          <button
            onClick={() => setShowAllFindings(!showAllFindings)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: showAllFindings ? '#f9fafb' : '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
            }}
          >
            <span>
              {secondaryFindings.length} {secondaryFindings.length === 1 ? 'weiteren Punkt' : 'weitere Punkte'} anzeigen
              <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                {lowCount > 0 && `${lowCount} niedrig`}
                {lowCount > 0 && infoCount > 0 && ' \u00b7 '}
                {infoCount > 0 && `${infoCount} branchenüblich`}
              </span>
            </span>
            <span style={{
              fontSize: 12,
              color: '#9ca3af',
              transform: showAllFindings ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}>
              &#9660;
            </span>
          </button>

          {showAllFindings && (
            <div style={{ padding: '0 20px 20px' }}>
              {secondaryFindings.map((finding, idx) => (
                <FindingCard
                  key={`sec-${finding.clauseId}-${idx}`}
                  finding={finding}
                  clause={clauseMap.get(finding.clauseId)}
                  contractId={result.contractId}
                  resultId={result._id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No findings at all */}
      {findings.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#15803d',
          background: '#f0fdf4',
          borderRadius: 12,
          marginTop: 20,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>&#10003;</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Keine Befunde</div>
          <div style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>
            Der Vertrag scheint solide zu sein. Legal Pulse überwacht ihn weiterhin.
          </div>
        </div>
      )}
    </div>
  );
};

const SeverityDot: React.FC<{ color: string; label: string; count: number }> = ({ color, label, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ color: '#4b5563' }}>{count} {label}</span>
  </div>
);

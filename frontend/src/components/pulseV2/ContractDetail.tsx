import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PulseV2Result, PulseV2Action, PulseV2LegalAlert } from '../../types/pulseV2';
import { HealthScoreGauge } from './HealthScoreGauge';
import { FindingCard } from './FindingCard';
import { ScoreTrend } from './ScoreTrend';
import { PortfolioInsightsPanel } from './PortfolioInsightsPanel';
import { ActionItem } from './ActionItem';
import { ImpactGraph } from './ImpactGraph';

/** Smooth scroll to a section by id */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Clickable text style */
const clickableStyle: React.CSSProperties = {
  cursor: 'pointer',
  textDecoration: 'underline',
  textDecorationStyle: 'dotted',
  textUnderlineOffset: 2,
};

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
  monitorInfo?: { nextRadarScan: string | null; alertCount: number } | null;
  contractAlerts?: PulseV2LegalAlert[];
}

export const ContractDetail: React.FC<ContractDetailProps> = ({ result, monitorInfo, contractAlerts }) => {
  const navigate = useNavigate();
  const [actions, setActions] = useState<PulseV2Action[]>(result.actions || []);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showActionHistory, setShowActionHistory] = useState(false);
  const [showJuristischeInfo, setShowJuristischeInfo] = useState(false);
  const juristischeInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showJuristischeInfo) return;
    const handler = (e: MouseEvent) => {
      if (juristischeInfoRef.current && !juristischeInfoRef.current.contains(e.target as Node)) {
        setShowJuristischeInfo(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showJuristischeInfo]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Secondary findings: low + info, collapsed by default (medium already covered by Actions)
  const secondaryFindings = findings.filter(f => f.severity === 'low' || f.severity === 'info');

  // All actionable findings (critical/high/medium) — passed to optimizer for context
  const actionableFindingSummaries = findings
    .filter(f => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium')
    .map(f => ({
      title: f.title,
      description: f.description,
      severity: f.severity,
      type: f.type,
      legalBasis: f.legalBasis,
      affectedText: f.affectedText,
      clauseTitle: clauseMap.get(f.clauseId)?.title,
    }));

  // Score label + context description
  const score = result.scores?.overall ?? 0;
  const scoreLabel = score >= 80 ? 'Gut' : score >= 60 ? 'Akzeptabel' : score >= 40 ? 'Bedenklich' : 'Kritisch';
  const scoreLabelColor = score >= 80 ? '#15803d' : score >= 60 ? '#d97706' : score >= 40 ? '#ea580c' : '#dc2626';
  const scoreDescription = score >= 80
    ? 'Solider Vertrag ohne wesentliche Risiken.'
    : score >= 60
      ? `Solider Vertrag mit ${criticalCount + highCount > 0 ? 'einigen wichtigen Punkten' : 'einseitigen Klauseln'}. Keine akuten Risiken.`
      : score >= 40
        ? (criticalCount + highCount > 0
          ? `Vertrag mit ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'wichtigem Punkt, der geprüft werden sollte' : 'wichtigen Punkten, die geprüft werden sollten'}.`
          : 'Vertrag mit Optimierungspotenzial. Siehe Empfehlungen unten.')
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
              <span
                onClick={() => scrollToSection('empfehlungen')}
                style={{ fontWeight: 400, color: '#6b7280', fontSize: 13, marginLeft: 8, ...clickableStyle }}
              >
                &mdash; {findings.length} Befunde in {result.coverage ? `${result.coverage.analyzed}/${result.coverage.total}` : String(clauses.length)} Klauseln
                {result.coverage && result.coverage.percentage < 100 && (
                  <span style={{ color: '#d97706', marginLeft: 4 }}>({result.coverage.percentage}%)</span>
                )}
              </span>
            )}
          </div>

          {/* Score context */}
          <div
            onClick={() => scrollToSection('empfehlungen')}
            style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, ...clickableStyle }}
          >
            {scoreDescription}
          </div>

          {/* Meta */}
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: monitorInfo ? 10 : 0 }}>
            Analysiert am {new Date(result.createdAt).toLocaleDateString('de-DE')} um {new Date(result.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Monitoring Status */}
          {monitorInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#15803d',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              padding: '6px 10px',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 4px rgba(34,197,94,0.5)',
                flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600 }}>Aktiv überwacht</span>
              <span style={{ color: '#16a34a', fontSize: 11 }}>Bei Änderungen werden Sie per E-Mail benachrichtigt</span>
              {monitorInfo.alertCount > 0 && (
                <span
                  onClick={() => scrollToSection('contract-alerts')}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    marginLeft: 'auto',
                    cursor: 'pointer',
                  }}
                >
                  {monitorInfo.alertCount} {monitorInfo.alertCount === 1 ? 'Alert' : 'Alerts'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Juristische Einschätzung ═══ */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <span style={{ fontSize: 16 }}>&#x2696;&#xFE0F;</span>
          Juristische Einschätzung
          <span
            onClick={() => setShowJuristischeInfo(!showJuristischeInfo)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#6b7280',
              cursor: 'pointer',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ?
          </span>
          {showJuristischeInfo && (
            <div ref={juristischeInfoRef} style={{
              position: 'absolute',
              top: 28,
              left: 28,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: 12,
              fontWeight: 400,
              color: '#374151',
              lineHeight: 1.6,
              maxWidth: 360,
              zIndex: 10,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Was ist das?</div>
              Diese Einschätzung wird automatisch aus den Analyseergebnissen generiert — basierend auf Score, Befunden und Vertragsdaten. Sie gibt eine erste Orientierung und ersetzt keine individuelle anwaltliche Beratung.
              <div
                onClick={() => setShowJuristischeInfo(false)}
                style={{ marginTop: 8, color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
              >
                Verstanden
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          {(() => {
            const ctx = result.context;
            const contractType = safeContractType(ctx?.contractType || result.document?.contractType);
            const parties = ctx?.parties || result.document?.extractedMeta?.parties || [];
            const scores = result.scores;

            // Build summary paragraphs
            const lines: (string | React.ReactNode)[] = [];

            // Line 1: Contract identification
            if (contractType && parties.length >= 2) {
              lines.push(`Bei dem vorliegenden Dokument handelt es sich um einen ${contractType} zwischen ${parties[0]} und ${parties[1]}${parties.length > 2 ? ` (sowie ${parties.length - 2} weiteren Parteien)` : ''}.`);
            } else if (contractType) {
              lines.push(`Bei dem vorliegenden Dokument handelt es sich um einen ${contractType}.`);
            }

            // Line 2: Duration & deadlines
            if (ctx?.duration || ctx?.endDate) {
              const durationParts: string[] = [];
              if (ctx?.duration) durationParts.push(`Laufzeit: ${ctx.duration}`);
              if (ctx?.endDate) {
                const end = new Date(ctx.endDate);
                durationParts.push(`Vertragsende: ${end.toLocaleDateString('de-DE')}`);
              }
              if (ctx?.autoRenewal) durationParts.push('mit automatischer Verlängerung');
              if (ctx?.daysUntilExpiry !== null && ctx?.daysUntilExpiry !== undefined) {
                if (ctx.daysUntilExpiry <= 30) {
                  durationParts.push(`Achtung: Ablauf in ${ctx.daysUntilExpiry} Tagen`);
                } else if (ctx.daysUntilExpiry <= 90) {
                  durationParts.push(`Ablauf in ${ctx.daysUntilExpiry} Tagen`);
                }
              }
              if (durationParts.length > 0) lines.push(durationParts.join(' \u2014 ') + '.');
            }

            // Line 3: Overall assessment
            if (scores) {
              const overall = scores.overall ?? 0;
              if (overall >= 80) {
                lines.push(`Die Analyse ergibt eine insgesamt solide vertragliche Gestaltung (Score: ${overall}/100). ${criticalCount === 0 && highCount === 0 ? 'Es wurden keine kritischen Mängel festgestellt.' : ''}`);
              } else if (overall >= 60) {
                if (criticalCount + highCount > 0) {
                  lines.push(`Die Analyse zeigt eine grundsätzlich akzeptable Vertragsgestaltung (Score: ${overall}/100), jedoch mit Optimierungsbedarf in ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'Punkt' : 'Punkten'}.`);
                } else {
                  lines.push(`Die Analyse zeigt eine grundsätzlich akzeptable Vertragsgestaltung (Score: ${overall}/100). Es wurden keine wesentlichen Mängel festgestellt.`);
                }
              } else if (overall >= 40) {
                if (criticalCount + highCount > 0) {
                  lines.push(`Die Analyse zeigt deutlichen Handlungsbedarf (Score: ${overall}/100). Es wurden ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'wesentlicher Mangel' : 'wesentliche Mängel'} identifiziert, die einer juristischen Überprüfung bedürfen.`);
                } else {
                  lines.push(`Die Analyse zeigt Optimierungspotenzial (Score: ${overall}/100). Es liegen keine kritischen Einzelmängel vor, jedoch deuten die Teilscores auf strukturelle Schwächen hin.`);
                }
              } else {
                lines.push(`Die Analyse ergibt erhebliche vertragliche Risiken (Score: ${overall}/100). ${criticalCount > 0 ? `${criticalCount} kritische${criticalCount > 1 ? ' Mängel erfordern' : 'r Mangel erfordert'} sofortiges Handeln.` : 'Eine umfassende Überarbeitung wird empfohlen.'}`);
              }
            }

            // Line 4: Key risk areas
            const riskAreas: string[] = [];
            if (scores && scores.compliance < 50) riskAreas.push('Compliance');
            if (scores && scores.terms < 50) riskAreas.push('Vertragskonditionen');
            if (scores && scores.completeness < 50) riskAreas.push('Vollständigkeit');
            if (scores && scores.risk < 50) riskAreas.push('Risikoabsicherung');
            if (riskAreas.length > 0) {
              lines.push(
                <span
                  key="risk-areas-link"
                  onClick={() => scrollToSection('risiko-uebersicht')}
                  style={{ ...clickableStyle, color: '#3b82f6' }}
                >
                  Besonderer Prüfungsbedarf besteht in den Bereichen: {riskAreas.join(', ')}.
                </span>
              );
            }

            // Line 5: Findings breakdown — clickable
            if (findings.length > 0) {
              const parts: string[] = [];
              if (criticalCount > 0) parts.push(`${criticalCount} kritisch`);
              if (highCount > 0) parts.push(`${highCount} hoch`);
              if (mediumCount > 0) parts.push(`${mediumCount} mittel`);
              if (lowCount + infoCount > 0) parts.push(`${lowCount + infoCount} gering`);
              lines.push(
                <span
                  key="findings-link"
                  onClick={() => scrollToSection(criticalCount + highCount > 0 ? 'empfehlungen' : 'geprueft')}
                  style={{ ...clickableStyle, color: '#3b82f6' }}
                >
                  Insgesamt {findings.length} Befunde: {parts.join(', ')}.
                </span>
              );
            }

            return lines.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0' }}>{line}</p>
            ));
          })()}
        </div>
      </div>

      {/* ═══ Risk Overview: compact severity bars ═══ */}
      {findings.length > 0 && (
        <div id="risiko-uebersicht" style={{
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

          {/* Legend — clickable to scroll to section */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
            {criticalCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ cursor: 'pointer' }}><SeverityDot color="#dc2626" label="Kritisch" count={criticalCount} /></span>}
            {highCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ cursor: 'pointer' }}><SeverityDot color="#ea580c" label="Hoch" count={highCount} /></span>}
            {mediumCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ cursor: 'pointer' }}><SeverityDot color="#d97706" label="Mittel" count={mediumCount} /></span>}
            {lowCount > 0 && <span onClick={() => scrollToSection('geprueft')} style={{ cursor: 'pointer' }}><SeverityDot color="#9ca3af" label="Niedrig" count={lowCount} /></span>}
            {infoCount > 0 && <span onClick={() => scrollToSection('geprueft')} style={{ cursor: 'pointer' }}><SeverityDot color="#d1d5db" label="Info" count={infoCount} /></span>}
            <span style={{ color: '#d1d5db' }}>|</span>
            {riskCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ color: '#6b7280', cursor: 'pointer' }}>{riskCount} Risiken</span>}
            {complianceCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ color: '#6b7280', cursor: 'pointer' }}>{complianceCount} Compliance</span>}
            {opportunityCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ color: '#16a34a', cursor: 'pointer' }}>{opportunityCount} Chancen</span>}
          </div>
        </div>
      )}

      {/* ═══ Empfehlungen — Actions + kritische Findings zusammen ═══ */}
      {(actions.length > 0 || topFindings.length > 0) && (() => {
        const openActions = actions.filter(a => a.status === 'open');
        const doneActions = actions.filter(a => a.status === 'done');
        const dismissedActions = actions.filter(a => a.status === 'dismissed');
        const doneCount = doneActions.length;
        const totalCount = actions.length;
        const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const historyActions = [...doneActions, ...dismissedActions];

        const hasCriticalFindings = topFindings.length > 0;
        const borderColor = hasCriticalFindings
          ? (criticalCount > 0 ? '#fecaca' : '#fed7aa')
          : '#e5e7eb';

        return (
          <div id="empfehlungen" style={{
            background: '#fff',
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                Empfehlungen
                {openActions.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                    {openActions.length} offen
                  </span>
                )}
              </div>
              {doneCount > 0 && (
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  {doneCount}/{totalCount} erledigt
                </span>
              )}
            </div>

            {/* Subtext — erklärt die Sektion */}
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16, lineHeight: 1.5 }}>
              Basierend auf der Analyse aller {clauses.length} Klauseln.
              {hasCriticalFindings
                ? ' Beginnen Sie mit dem obersten Punkt — dieser hat die höchste Priorität.'
                : ' Sortiert nach Relevanz. Beginnen Sie mit dem obersten Punkt.'}
            </div>

            {/* Progress bar */}
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
                  Alle Empfehlungen umgesetzt
                </div>
                <div style={{ fontSize: 13, color: '#16a34a', marginTop: 2 }}>
                  Der Score wird bei der nächsten Analyse aktualisiert.
                </div>
              </div>
            )}

            {/* Critical + High Findings — wenn vorhanden, ganz oben */}
            {hasCriticalFindings && (
              <div style={{ marginBottom: openActions.length > 0 ? 16 : 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                  padding: '6px 10px',
                  background: criticalCount > 0 ? '#fef2f2' : '#fff7ed',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: criticalCount > 0 ? '#dc2626' : '#ea580c',
                }}>
                  <span style={{ fontSize: 13 }}>&#9888;</span>
                  {topFindings.length} {topFindings.length === 1 ? 'Klausel erfordert' : 'Klauseln erfordern'} besondere Aufmerksamkeit
                </div>
                {topFindings.map((finding, idx) => (
                  <FindingCard
                    key={`top-${finding.clauseId}-${idx}`}
                    finding={finding}
                    clause={clauseMap.get(finding.clauseId)}
                    contractId={result.contractId}
                    resultId={result._id}
                    allFindings={actionableFindingSummaries}
                  />
                ))}
              </div>
            )}

            {/* Actions — Optimierungsvorschläge */}
            {openActions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...openActions]
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
            )}

            {/* Historie — done + dismissed, collapsible */}
            {historyActions.length > 0 && (
              <div style={{ marginTop: openActions.length > 0 ? 16 : 0 }}>
                <button
                  onClick={() => setShowActionHistory(!showActionHistory)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#6b7280',
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    transform: showActionHistory ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}>
                    &#x203A;
                  </span>
                  Erledigte Empfehlungen
                  {doneActions.length > 0 && (
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
                      {doneActions.length} umgesetzt
                    </span>
                  )}
                  {dismissedActions.length > 0 && (
                    <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                      {dismissedActions.length} ausgeblendet
                    </span>
                  )}
                </button>
                {showActionHistory && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {historyActions.map(action => (
                      <ActionItem
                        key={`hist_${action.id}`}
                        action={action}
                        contractId={result.contractId}
                        onStatusChange={handleActionStatusChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ Legal Radar Alerts — laws that affect this contract ═══ */}
      {contractAlerts && contractAlerts.length > 0 && (
        <div id="contract-alerts" style={{
          background: '#fff',
          border: '1px solid #fecaca',
          borderRadius: 12,
          overflow: 'hidden',
          marginTop: 20,
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #fef2f2',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>&#9878;&#65039;</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                Legal Radar — Gesetzesänderungen
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {contractAlerts.length === 1
                  ? 'Eine aktuelle Rechtsänderung betrifft diesen Vertrag. Nutzen Sie „Klausel automatisch anpassen" um den Vorschlag direkt zu übernehmen.'
                  : `${contractAlerts.length} aktuelle Rechtsänderungen betreffen diesen Vertrag. Nutzen Sie „Klausel automatisch anpassen" um Vorschläge direkt zu übernehmen.`}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {contractAlerts.map(alert => (
              <ImpactGraph key={alert._id} alert={alert} hideContractInfo />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Score Timeline ═══ */}
      <ScoreTrend contractId={result.contractId} />

      {/* ═══ Portfolio Insights ═══ */}
      <PortfolioInsightsPanel
        insights={result.portfolioInsights || []}
        contractNames={contractNames}
      />

      {/* ═══ Geprüft & unauffällig — low + info only, collapsed ═══ */}
      {secondaryFindings.length > 0 && (() => {
        const allCheckedFindings = secondaryFindings;
        const contractType = safeContractType(result.context?.contractType || result.document?.contractType);
        return (
          <div id="geprueft" style={{
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
                textAlign: 'left',
              }}
            >
              <div>
                <div>
                  Geprüft &amp; unauffällig
                  <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                    {allCheckedFindings.length} {allCheckedFindings.length === 1 ? 'Klausel' : 'Klauseln'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400, marginTop: 2 }}>
                  {contractType
                    ? `Diese Klauseln sind für einen ${contractType} üblich und erfordern kein Handeln.`
                    : 'Diese Klauseln wurden geprüft und erfordern kein Handeln.'}
                </div>
              </div>
              <span style={{
                fontSize: 12,
                color: '#9ca3af',
                transform: showAllFindings ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                flexShrink: 0,
                marginLeft: 12,
              }}>
                &#9660;
              </span>
            </button>

            {showAllFindings && (
              <div style={{ padding: '0 20px 20px' }}>
                {allCheckedFindings.map((finding, idx) => (
                  <FindingCard
                    key={`checked-${finding.clauseId}-${idx}`}
                    finding={finding}
                    clause={clauseMap.get(finding.clauseId)}
                    contractId={result.contractId}
                    resultId={result._id}
                    allFindings={actionableFindingSummaries}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Bottom padding so content isn't hidden behind floating bar */}
      <div style={{ height: 72 }} />

      {/* ═══ Floating Quick Actions Bar ═══ */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #e5e7eb',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 50,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}>
        {/* Mini Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <HealthScoreGauge scores={result.scores} size="small" />
        </div>

        {/* Contextual message + CTA */}
        {score < 60 ? (
          <>
            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              {criticalCount + highCount > 0
                ? `${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'Problem' : 'Probleme'} erkannt`
                : 'Handlungsbedarf'}
            </span>
            <button
              onClick={() => navigate(`/optimizer?contractId=${result.contractId}`, {
                state: { source: 'legal_pulse_v2', pulseFindings: actionableFindingSummaries },
              })}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Jetzt optimieren &#8594;
            </button>
          </>
        ) : score < 80 ? (
          <>
            <span style={{ fontSize: 13, color: '#d97706', fontWeight: 500 }}>
              {criticalCount + highCount > 0
                ? `${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'Verbesserung' : 'Verbesserungen'} möglich`
                : 'Optimierungspotenzial vorhanden'}
            </span>
            <button
              onClick={() => navigate(`/optimizer?contractId=${result.contractId}`, {
                state: { source: 'legal_pulse_v2', pulseFindings: actionableFindingSummaries },
              })}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#7c3aed',
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Vertrag verbessern &#8594;
            </button>
          </>
        ) : (
          <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            &#10003; Guter Vertrag &mdash; wird weiter überwacht
          </span>
        )}

        {/* Scroll to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Nach oben"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#9ca3af',
            flexShrink: 0,
            marginLeft: 4,
          }}
        >
          &#8593;
        </button>
      </div>
    </div>
  );
};

const SeverityDot: React.FC<{ color: string; label: string; count: number }> = ({ color, label, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ color: '#4b5563' }}>{count} {label}</span>
  </div>
);

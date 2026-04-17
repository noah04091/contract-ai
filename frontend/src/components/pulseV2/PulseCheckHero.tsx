import React, { useMemo, useState } from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';

interface RadarData {
  feeds: { total: number; enabled: number; disabled: number };
  laws: { total: number; newThisWeek: number; processed: number; unprocessed: number; withEmbedding: number };
  alertsThisWeek: {
    total: number;
    severity: { critical: number; high: number; medium: number; low: number };
    directions: { negative: number; positive: number; neutral: number };
    resolved: number; dismissed: number; resolutionRate: number;
    feedbackCount: number; usefulRate: number;
  };
  email: { sent: number; failed: number; deliveryRate: number };
  recentRuns: {
    runAt: string; lawChanges: number; contractsMatched: number;
    alertsSent: number; positiveAlerts: number; negativeAlerts: number; durationMs: number;
  }[];
}

interface PulseCheckHeroProps {
  stats: { total: number; analyzed: number };
  alerts: PulseV2LegalAlert[];
  criticalContractCount: number;
  openActionCount: number;
  renewalSoonCount: number;
  unanalyzedCount: number;
  severityCounts: { critical: number; high: number; medium: number; low: number };
  recentAlertsCount: number;
  lastVisit: string | null;
  avgScore: number | null;
  radarData?: RadarData | null;
  onAnalyzeFirst?: () => void;
}

type Status = 'green' | 'yellow' | 'red';

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'vor wenigen Minuten';
    if (hours === 1) return 'vor 1 Stunde';
    return `vor ${hours} Stunden`;
  }
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'vor 1 Woche';
  if (weeks < 5) return `vor ${weeks} Wochen`;
  const months = Math.floor(days / 30);
  if (months <= 1) return 'vor 1 Monat';
  return `vor ${months} Monaten`;
}

const STATUS_CONFIG: Record<Status, { color: string; bg: string; border: string; dot: string; label: string }> = {
  green: {
    color: '#15803d',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
    border: 'rgba(34,197,94,0.25)',
    dot: '#22c55e',
    label: 'Alles im Griff',
  },
  yellow: {
    color: '#92400e',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    border: 'rgba(234,179,8,0.3)',
    dot: '#eab308',
    label: 'Aufmerksamkeit nötig',
  },
  red: {
    color: '#991b1b',
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    border: 'rgba(239,68,68,0.3)',
    dot: '#ef4444',
    label: 'Achtung erforderlich',
  },
};

export const PulseCheckHero: React.FC<PulseCheckHeroProps> = ({
  stats,
  alerts,
  criticalContractCount,
  openActionCount,
  renewalSoonCount,
  severityCounts,
  recentAlertsCount,
  lastVisit,
  avgScore,
  radarData,
  onAnalyzeFirst,
}) => {
  const [radarExpanded, setRadarExpanded] = useState(false);

  const newSinceLastVisit = useMemo(() => {
    if (!lastVisit) return 0;
    const threshold = new Date(lastVisit).getTime();
    return alerts.filter(a =>
      a.status !== 'dismissed' &&
      a.status !== 'resolved' &&
      a.createdAt &&
      new Date(a.createdAt).getTime() > threshold
    ).length;
  }, [alerts, lastVisit]);

  const status: Status = useMemo(() => {
    if ((severityCounts?.critical ?? 0) > 0 || criticalContractCount > 0) return 'red';
    if (recentAlertsCount > 0 || openActionCount >= 5 || newSinceLastVisit > 0) return 'yellow';
    return 'green';
  }, [severityCounts, criticalContractCount, recentAlertsCount, openActionCount, newSinceLastVisit]);

  const config = STATUS_CONFIG[status];
  const isFirstUse = stats.analyzed === 0;

  const greeting = isFirstUse ? 'Legal Pulse startbereit' : 'Willkommen zurück';
  let statusMessage: React.ReactNode;

  if (isFirstUse) {
    statusMessage = <>Analysieren Sie Ihre Verträge, um die automatische Überwachung zu aktivieren.</>;
  } else if (status === 'red') {
    const critCount = severityCounts?.critical ?? 0;
    const parts: string[] = [];
    if (critCount > 0) parts.push(`${critCount} kritische Warnung${critCount === 1 ? '' : 'en'}`);
    if (criticalContractCount > 0 && critCount === 0) parts.push(`${criticalContractCount} kritischer Vertrag${criticalContractCount === 1 ? '' : 'e'}`);
    if (openActionCount > 0) parts.push(`${openActionCount} offene Aufgabe${openActionCount === 1 ? '' : 'n'}`);
    statusMessage = <>Achtung: {parts.join(' + ')} warten.</>;
  } else if (status === 'yellow') {
    if (newSinceLastVisit > 0 && lastVisit) {
      statusMessage = <>{newSinceLastVisit} neue Warnung{newSinceLastVisit === 1 ? '' : 'en'} seit Ihrem letzten Besuch {formatRelativeTime(lastVisit)}.</>;
    } else if (openActionCount >= 5) {
      statusMessage = <>{openActionCount} offene Aufgaben warten auf Bearbeitung.</>;
    } else {
      statusMessage = <>{recentAlertsCount} aktuelle Warnung{recentAlertsCount === 1 ? '' : 'en'} im Legal Radar.</>;
    }
  } else {
    if (lastVisit) {
      statusMessage = <>Alles im Griff — keine neuen Warnungen seit {formatRelativeTime(lastVisit)}.</>;
    } else {
      statusMessage = <>Keine kritischen Befunde. Ihre Verträge werden überwacht.</>;
    }
  }

  // Score ring
  const score = avgScore;
  const scoreColor = score === null ? '#d1d5db' : score >= 70 ? '#22c55e' : score >= 50 ? '#d97706' : '#dc2626';
  const scoreLabel = score === null ? 'Keine Daten' : score >= 70 ? 'Stabil' : score >= 50 ? 'Aufmerksamkeit nötig' : 'Handlungsbedarf';
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - (score !== null ? score / 100 : 0));

  const showRightPanel = !isFirstUse && (avgScore !== null || radarData);

  return (
    <div style={{
      position: 'relative',
      background: config.bg,
      borderRadius: 20,
      padding: 'clamp(24px, 3vw, 36px) clamp(20px, 4vw, 44px)',
      marginBottom: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.04)',
      border: `1px solid ${config.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        flexWrap: 'wrap',
      }}>
        {/* ── Left: Status dot + text ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 320px', minWidth: 0 }}>
          {/* Pulsing dot */}
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: config.dot, opacity: 0.25,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              background: config.dot,
              boxShadow: `0 0 12px ${config.dot}88`,
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                {greeting}
              </h1>
              <span style={{
                fontSize: 11, fontWeight: 700, color: config.color,
                background: '#ffffffaa', padding: '3px 10px', borderRadius: 6,
                letterSpacing: '0.3px', textTransform: 'uppercase',
              }}>
                {config.label}
              </span>
            </div>
            <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>
              {statusMessage}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
              <span>
                <strong style={{ color: '#0f172a' }}>{stats.analyzed}</strong>
                {' '}/ {stats.total} analysiert
              </span>
              {renewalSoonCount > 0 && (
                <span title="Einzelverträge mit Ablauf in den nächsten 60 Tagen">
                  <strong style={{ color: '#d97706' }}>{renewalSoonCount}</strong>
                  {' '}Vertr{renewalSoonCount === 1 ? 'ag läuft' : 'äge laufen'} in &lt; 60 Tagen aus
                </span>
              )}
              {criticalContractCount > 0 && (
                <span title="Verträge mit mindestens einem kritischen Befund">
                  <strong style={{ color: '#dc2626' }}>{criticalContractCount}</strong>
                  {' '}{criticalContractCount === 1 ? 'kritischer Vertrag' : 'kritische Verträge'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Score + Radar glass panel ── */}
        {showRightPanel && (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexShrink: 0,
            minWidth: 0,
          }}>
            {/* Score Ring */}
            {score !== null && (
              <div style={{
                position: 'relative', width: 96, height: 96, flexShrink: 0,
                filter: `drop-shadow(0 0 10px ${scoreColor}25)`,
              }}>
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="7" />
                  <circle
                    cx="48" cy="48" r={radius}
                    fill="none" stroke={scoreColor} strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 3 }}>
                    Score
                  </span>
                </div>
              </div>
            )}

            {/* Score label + Radar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              {score !== null && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' }}>
                    Contract Health
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{scoreLabel}</div>
                </div>
              )}

              {/* Radar 2×2 grid — clickable to expand */}
              {radarData && (
                <div
                  onClick={() => setRadarExpanded(!radarExpanded)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px 18px',
                    borderTop: score !== null ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    paddingTop: score !== null ? 10 : 0,
                    cursor: 'pointer',
                    borderRadius: 8,
                    position: 'relative',
                  }}
                  title="Klicken für Radar-Details"
                >
                  <RadarStat value={`${radarData.feeds.enabled}/${radarData.feeds.total}`} label="Feeds" color={radarData.feeds.enabled > 0 ? '#059669' : '#d97706'} />
                  <RadarStat value={radarData.laws.total.toLocaleString('de-DE')} label="Laws" color="#3b82f6" />
                  <RadarStat value={String(radarData.alertsThisWeek.total)} label="Alerts" color={radarData.alertsThisWeek.total > 0 ? '#ea580c' : '#64748b'} />
                  <RadarStat value={`${radarData.email.deliveryRate}%`} label="Delivery" color={radarData.email.deliveryRate >= 90 ? '#059669' : '#dc2626'} />
                  {/* Expand indicator */}
                  <div style={{
                    position: 'absolute', bottom: -2, right: -4,
                    fontSize: 10, color: '#94a3b8',
                    transform: radarExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}>&#8250;</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* First-use CTA only */}
        {isFirstUse && onAnalyzeFirst && (
          <button
            onClick={onAnalyzeFirst}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600,
              color: '#fff', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}
          >
            Erste Analyse starten
          </button>
        )}
      </div>

      {/* ── Radar Expanded Details ── */}
      {radarExpanded && radarData && (
        <div style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.8)',
          padding: '20px 24px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        }}>
          {/* Rechtsquellen-Abdeckung */}
          <SectionLabel>Rechtsquellen-Abdeckung</SectionLabel>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
            <DetailStat label="Neu diese Woche" value={String(radarData.laws.newThisWeek)} color="#2563eb" />
            <DetailStat label="Verarbeitet" value={String(radarData.laws.processed)} color="#059669" />
            <DetailStat label="Unverarbeitet" value={String(radarData.laws.unprocessed)} color="#d97706" />
            <DetailStat label="Mit Embedding" value={String(radarData.laws.withEmbedding)} color="#7c3aed" />
          </div>

          {/* Alerts diese Woche */}
          <SectionLabel>Deine Alerts (diese Woche)</SectionLabel>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
            <DetailStat label="Negativ" value={String(radarData.alertsThisWeek.directions.negative)} color="#dc2626" />
            <DetailStat label="Positiv" value={String(radarData.alertsThisWeek.directions.positive)} color="#059669" />
            <DetailStat label="Behoben" value={`${radarData.alertsThisWeek.resolutionRate}%`} color="#2563eb" />
            {radarData.alertsThisWeek.feedbackCount > 0 && (
              <DetailStat label="Hilfreich-Rate" value={`${radarData.alertsThisWeek.usefulRate}%`} color="#7c3aed" />
            )}
          </div>

          {/* Letzte Radar-Läufe */}
          {radarData.recentRuns.length > 0 && (
            <>
              <SectionLabel>Letzte Radar-Läufe</SectionLabel>
              <div style={{
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.04)',
                padding: '4px 14px',
              }}>
                {radarData.recentRuns.slice(0, 5).map((run, idx) => (
                  <div key={idx} style={{
                    display: 'flex', gap: 16, padding: '7px 0',
                    fontSize: 12, color: '#475569',
                    borderBottom: idx < Math.min(radarData.recentRuns.length, 5) - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ color: '#94a3b8', minWidth: 120, fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(run.runAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{run.lawChanges} Laws geprüft</span>
                    <span>{run.contractsMatched} Matches</span>
                    <span style={{ color: run.alertsSent > 0 ? '#ea580c' : '#94a3b8' }}>
                      {run.alertsSent} Alert{run.alertsSent === 1 ? '' : 's'}
                      {run.positiveAlerts > 0 && <span style={{ color: '#059669' }}> ({run.positiveAlerts}+)</span>}
                    </span>
                    <span style={{ color: '#94a3b8', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(run.durationMs / 1000)}s
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──

const RadarStat: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
    <span style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1.4 }}>{value}</span>
    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
  </div>
);

const DetailStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', minWidth: 70 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    marginBottom: 10,
  }}>
    {children}
  </div>
);

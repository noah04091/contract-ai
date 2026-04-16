import React, { useMemo } from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';

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
  onJumpToRadar: () => void;
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
    label: 'Handlungsbedarf',
  },
};

export const PulseCheckHero: React.FC<PulseCheckHeroProps> = ({
  stats,
  alerts,
  criticalContractCount,
  openActionCount,
  renewalSoonCount,
  unanalyzedCount,
  severityCounts,
  recentAlertsCount,
  lastVisit,
  onJumpToRadar,
  onAnalyzeFirst,
}) => {
  // Count "new since last visit"
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

  // Unified status calculation
  const status: Status = useMemo(() => {
    if ((severityCounts?.critical ?? 0) > 0 || criticalContractCount > 0) return 'red';
    if (recentAlertsCount > 0 || openActionCount >= 5 || newSinceLastVisit > 0) return 'yellow';
    return 'green';
  }, [severityCounts, criticalContractCount, recentAlertsCount, openActionCount, newSinceLastVisit]);

  const config = STATUS_CONFIG[status];
  const isFirstUse = stats.analyzed === 0;

  // Build status message — greeting depends on usage state, not on localStorage
  // (returning users without lastVisit should NOT see the first-use text).
  const greeting = isFirstUse ? 'Legal Pulse startbereit' : 'Willkommen zurück';
  let statusMessage: React.ReactNode;

  if (isFirstUse) {
    statusMessage = (
      <>
        Analysieren Sie Ihre Verträge, um die automatische Überwachung zu aktivieren.
      </>
    );
  } else if (status === 'red') {
    const critCount = severityCounts?.critical ?? 0;
    const parts: string[] = [];
    if (critCount > 0) parts.push(`${critCount} kritische Warnung${critCount === 1 ? '' : 'en'}`);
    if (criticalContractCount > 0 && critCount === 0) parts.push(`${criticalContractCount} kritischer Vertrag${criticalContractCount === 1 ? '' : 'e'}`);
    if (openActionCount > 0) parts.push(`${openActionCount} offene Aufgabe${openActionCount === 1 ? '' : 'n'}`);
    statusMessage = <>Achtung: {parts.join(' + ')} warten.</>;
  } else if (status === 'yellow') {
    if (newSinceLastVisit > 0 && lastVisit) {
      statusMessage = (
        <>
          {newSinceLastVisit} neue Warnung{newSinceLastVisit === 1 ? '' : 'en'} seit Ihrem letzten Besuch {formatRelativeTime(lastVisit)}.
        </>
      );
    } else if (openActionCount >= 5) {
      statusMessage = <>{openActionCount} offene Aufgaben warten auf Bearbeitung.</>;
    } else {
      statusMessage = <>{recentAlertsCount} aktuelle Warnung{recentAlertsCount === 1 ? '' : 'en'} im Legal Radar.</>;
    }
  } else {
    // green
    if (lastVisit) {
      statusMessage = <>Alles im Griff — keine neuen Warnungen seit {formatRelativeTime(lastVisit)}.</>;
    } else {
      statusMessage = <>Keine kritischen Befunde. Ihre Verträge werden überwacht.</>;
    }
  }

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
        gap: 24,
        flexWrap: 'wrap',
      }}>
        {/* Left: Status dot + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 320px', minWidth: 0 }}>
          {/* Pulsing dot */}
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: config.dot,
              opacity: 0.25,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute',
              inset: 8,
              borderRadius: '50%',
              background: config.dot,
              boxShadow: `0 0 12px ${config.dot}88`,
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
                {greeting}
              </h1>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: config.color,
                background: '#ffffffaa',
                padding: '3px 10px',
                borderRadius: 6,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}>
                {config.label}
              </span>
            </div>
            <div style={{
              fontSize: 15,
              color: '#334155',
              lineHeight: 1.5,
              fontWeight: 500,
            }}>
              {statusMessage}
            </div>
            <div style={{
              display: 'flex',
              gap: 18,
              marginTop: 10,
              fontSize: 12,
              color: '#64748b',
              flexWrap: 'wrap',
            }}>
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
                <span>
                  <strong style={{ color: '#dc2626' }}>{criticalContractCount}</strong>
                  {' '}kritisch
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: CTAs */}
        <div style={{
          display: 'flex',
          gap: 10,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          {!isFirstUse && (newSinceLastVisit > 0 || recentAlertsCount > 0 || openActionCount > 0) && (
            <button
              onClick={onJumpToRadar}
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: status === 'red'
                  ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                  : status === 'yellow'
                  ? 'linear-gradient(135deg, #d97706, #b45309)'
                  : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap',
              }}
            >
              Jetzt prüfen →
            </button>
          )}
          {unanalyzedCount > 0 && onAnalyzeFirst && (
            <button
              onClick={onAnalyzeFirst}
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {unanalyzedCount} Vertr{unanalyzedCount === 1 ? 'ag' : 'äge'} analysieren
            </button>
          )}
          {isFirstUse && onAnalyzeFirst && (
            <button
              onClick={onAnalyzeFirst}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              Erste Analyse starten
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

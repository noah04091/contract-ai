// PulseCommandCenter — neuer Dashboard-Kopf (Redesign Variante A „Ruhig-Enterprise", 21.07.2026).
// ERSETZT PulseCheckHero rein visuell: identische Props, KEINE Logik-/Datenänderung.
// Rollback = im PulseV2.tsx die eine Render-Zeile zurücktauschen (alte Komponente bleibt im Repo).
import React from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';

interface Props {
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
  radarData?: unknown;
  lastScan?: string | null;
  lastRadarScan?: string | null;
  lastRadarRun?: string | null;
  nextRadarScan?: string | null;
  onAnalyzeFirst?: () => void;
}

const C = {
  ink: '#0f172a', soft: '#475569', faint: '#94a3b8', line: '#e2e8f0',
  blue: '#2563eb', blueSoft: '#eff6ff', ok: '#059669', okSoft: '#ecfdf5',
  warn: '#d97706', warnSoft: '#fffbeb', warnLine: '#fde68a', crit: '#dc2626',
};

function rel(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  const diffMin = Math.round((d - Date.now()) / 60000);
  const abs = Math.abs(diffMin);
  const txt = abs < 60 ? `${abs} Min.` : abs < 2880 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} Tagen`;
  return diffMin <= 0 ? `vor ${txt}` : `in ${txt.replace('Tagen', 'Tagen')}`;
}

export const PulseCommandCenter: React.FC<Props> = (p) => {
  const openAlerts = p.alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved').length;
  const score = p.avgScore;
  const sc = p.severityCounts;
  const status: 'red' | 'yellow' | 'green' | 'neutral' =
    p.stats.analyzed === 0 ? 'neutral'
    : sc.critical > 0 || p.criticalContractCount > 0 ? 'red'
    : (sc.high + sc.medium > 0 || openAlerts > 0 || p.openActionCount > 0) ? 'yellow'
    : 'green';
  const statusCfg = {
    red: { label: 'Handlungsbedarf', c: C.crit, bg: '#fef2f2', bd: '#fecaca' },
    yellow: { label: 'Aufmerksamkeit nötig', c: C.warn, bg: C.warnSoft, bd: C.warnLine },
    green: { label: 'Alles sicher', c: C.ok, bg: C.okSoft, bd: '#a7f3d0' },
    neutral: { label: 'Noch nicht aktiv', c: C.faint, bg: '#f8fafc', bd: C.line },
  }[status];
  const ringColor = status === 'red' ? C.crit : status === 'yellow' ? C.warn : status === 'green' ? C.ok : C.line;
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;

  const checked = rel(p.lastRadarRun || p.lastScan);
  const next = rel(p.nextRadarScan);
  const infoParts = [
    `${p.stats.analyzed} ${p.stats.analyzed === 1 ? 'Vertrag' : 'Verträge'} überwacht`,
    checked ? `zuletzt geprüft ${checked}` : null,
    next ? `nächste Prüfung ${next}` : null,
  ].filter(Boolean);

  const kpis: Array<{ v: React.ReactNode; l: string; c?: string }> = [
    { v: openAlerts, l: 'Offene Radar-Alerts', c: openAlerts > 0 ? C.crit : undefined },
    { v: p.openActionCount, l: 'Offene Aufgaben' },
    { v: p.criticalContractCount, l: 'Kritische Verträge', c: p.criticalContractCount > 0 ? C.crit : undefined },
    { v: `${p.stats.analyzed}/${p.stats.total}`, l: 'Verträge überwacht' },
  ];
  const tabs: Array<{ label: string; n?: number; target: string }> = [
    { label: 'Legal Radar', n: openAlerts, target: 'legal-alerts' },
    { label: 'Aufgaben', n: p.openActionCount, target: 'pulse-tasks' },
    { label: 'Portfolio', target: 'pulse-portfolio' },
    { label: 'Verträge', n: p.stats.analyzed, target: 'pulse-contracts' },
  ];

  return (
    <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: '0 1px 2px rgba(15,23,42,.05)', padding: '20px 22px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: `conic-gradient(${ringColor} 0 ${pct}%, ${C.line} 0)` }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 19, fontWeight: 700, color: C.ink }}>
            {score != null ? score : '–'}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: C.ink }}>Legal Pulse</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: C.soft }}>{infoParts.join(' · ')}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, background: statusCfg.bg, border: `1px solid ${statusCfg.bd}`, color: statusCfg.c, fontWeight: 600, fontSize: 12.5, padding: '7px 13px', borderRadius: 999 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusCfg.c }} />
          {statusCfg.label}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
        {kpis.map(k => (
          <div key={k.l} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 13px' }}>
            <b style={{ display: 'block', fontSize: 19, color: k.c || C.ink, fontVariantNumeric: 'tabular-nums' }}>{k.v}</b>
            <span style={{ fontSize: 11, color: C.faint }}>{k.l}</span>
          </div>
        ))}
      </div>

      <nav style={{ display: 'flex', gap: 4, marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 11, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.label}
            onClick={() => document.getElementById(t.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{ fontWeight: 600, fontSize: 12.5, color: C.soft, background: 'transparent', border: 0, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.blueSoft; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.soft; }}
          >
            {t.label}
            {typeof t.n === 'number' && t.n > 0 && (
              <span style={{ background: C.line, borderRadius: 99, padding: '0 6px', fontSize: 10.5, marginLeft: 5, color: C.soft }}>{t.n}</span>
            )}
          </button>
        ))}
      </nav>

      {p.stats.analyzed === 0 && p.onAnalyzeFirst && (
        <button onClick={p.onAnalyzeFirst} style={{ marginTop: 14, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: C.blue, border: 0, borderRadius: 9, cursor: 'pointer' }}>
          Ersten Vertrag analysieren
        </button>
      )}
    </div>
  );
};
export default PulseCommandCenter;

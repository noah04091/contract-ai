import React, { useState, useEffect, useRef } from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';
import { ImpactGraph } from './ImpactGraph';
import { cleanContractName } from '../../utils/contractName';
import styles from '../../styles/PulseV2.module.css';

interface LegalAlertsPanelProps {
  alerts: PulseV2LegalAlert[];
  onDismiss?: (alertId: string) => void;
  onRestore?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
  lastVisit?: string | null;
}

interface AlertGroup {
  lawId: string;
  lawTitle: string;
  lawArea: string;
  lawStatus?: string;
  plainSummary: string;
  alerts: PulseV2LegalAlert[];
  highestSeverity: string;
  hasPositive: boolean;
  mostRecentCreatedAt: string;
}

type ViewMode = 'timeline' | 'bylaw';

interface TimeBucket {
  key: 'today' | 'week' | 'month' | 'older';
  label: string;
  groups: AlertGroup[];
}

/**
 * Extract a canonical fingerprint from a law/ruling title (client-side fallback
 * for alerts created before backend fingerprinting was added).
 */
function extractFingerprintFromTitle(title: string): string | null {
  if (!title) return null;
  const t = title.trim();

  const euDir = t.match(/(?:richtlinie|directive)\s*\(?(?:EU|EG|EWG)\)?\s*(?:Nr\.?\s*)?(\d{4})[-/](\d+)/i)
             || t.match(/\((?:EU|EG|EWG)\)\s*(\d{4})[-/](\d+)/i);
  if (euDir) return `eu_rl_${euDir[1]}_${euDir[2]}`;

  const euReg = t.match(/(?:verordnung|regulation)\s*\(?(?:EU|EG|EWG)\)?\s*(?:Nr\.?\s*)?(\d{4})[-/](\d+)/i);
  if (euReg) return `eu_vo_${euReg[1]}_${euReg[2]}`;

  const euGeneric = t.match(/\((?:EU|EG|EWG)\)\s*(?:Nr\.?\s*)?(\d{4})[-/](\d+)/i);
  if (euGeneric) return `eu_${euGeneric[1]}_${euGeneric[2]}`;

  const btDs = t.match(/(?:drucksache|bt[-\s]*drs\.?)\s*(\d{1,2})[-/](\d+)/i);
  if (btDs) return `bt_ds_${btDs[1]}_${btDs[2]}`;

  const brDs = t.match(/(?:bundesrat|br[-\s]*drs\.?)\s*(\d+)[-/](\d{2,4})/i);
  if (brDs) return `br_ds_${brDs[1]}_${brDs[2]}`;

  const bgbl = t.match(/BGBl\.?\s*(I{1,3}|[12])\s*(\d{4})\s*,?\s*(\d+)/i);
  if (bgbl) return `bgbl_${bgbl[1]}_${bgbl[2]}_${bgbl[3]}`;

  const courtCase = t.match(/\b([IVX]+)\s+(Z[RB]|AR|StR|BLw)\s+(\d+)[-/](\d{2,4})\b/);
  if (courtCase) return `court_${courtCase[1]}_${courtCase[2]}_${courtCase[3]}_${courtCase[4]}`;

  return null;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const URGENCY_ORDER: Record<string, number> = {
  effective: 0,       // In Kraft — sofort handeln
  court_decision: 1,  // Urteil — bereits entschieden
  passed: 2,          // Verabschiedet — bald in Kraft
  guideline: 3,       // Leitlinie — empfohlen
  proposal: 4,        // Entwurf — vorbereiten
  unknown: 5,
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Woche${Math.floor(diffDays / 7) > 1 ? 'n' : ''}`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function groupAlertsByLaw(alerts: PulseV2LegalAlert[]): AlertGroup[] {
  const map = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const fp = alert.legislationFingerprint
            || extractFingerprintFromTitle(alert.lawTitle);
    const key = fp || alert.lawId || alert.lawTitle;
    if (!map.has(key)) {
      map.set(key, {
        lawId: alert.lawId,
        lawTitle: alert.lawTitle,
        lawArea: alert.lawArea,
        lawStatus: alert.lawStatus,
        plainSummary: alert.plainSummary || alert.impactSummary || '',
        alerts: [],
        highestSeverity: alert.severity,
        hasPositive: false,
        mostRecentCreatedAt: alert.createdAt || '',
      });
    }
    const group = map.get(key)!;
    group.alerts.push(alert);
    if ((SEVERITY_ORDER[alert.severity] || 3) < (SEVERITY_ORDER[group.highestSeverity] || 3)) {
      group.highestSeverity = alert.severity;
    }
    if (alert.impactDirection === 'positive') group.hasPositive = true;
    if (!group.plainSummary && alert.plainSummary) group.plainSummary = alert.plainSummary;
    if (alert.createdAt && (!group.mostRecentCreatedAt || new Date(alert.createdAt) > new Date(group.mostRecentCreatedAt))) {
      group.mostRecentCreatedAt = alert.createdAt;
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    // Primary: lawStatus urgency (In Kraft > Urteil > Verabschiedet > ...)
    const urgA = URGENCY_ORDER[a.lawStatus || 'unknown'] ?? 5;
    const urgB = URGENCY_ORDER[b.lawStatus || 'unknown'] ?? 5;
    if (urgA !== urgB) return urgA - urgB;
    // Secondary: severity
    return (SEVERITY_ORDER[a.highestSeverity] || 3) - (SEVERITY_ORDER[b.highestSeverity] || 3);
  });
}

/**
 * Group law-groups into time buckets by their most recent alert.
 */
function groupByTime(groups: AlertGroup[]): TimeBucket[] {
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;
  const buckets: Record<TimeBucket['key'], AlertGroup[]> = {
    today: [], week: [], month: [], older: [],
  };

  for (const g of groups) {
    if (!g.mostRecentCreatedAt) {
      buckets.older.push(g);
      continue;
    }
    const ageDays = (now - new Date(g.mostRecentCreatedAt).getTime()) / DAY;
    if (ageDays < 1) buckets.today.push(g);
    else if (ageDays < 7) buckets.week.push(g);
    else if (ageDays < 30) buckets.month.push(g);
    else buckets.older.push(g);
  }

  // Sort each bucket by recency descending
  const sortByRecent = (a: AlertGroup, b: AlertGroup) =>
    new Date(b.mostRecentCreatedAt || 0).getTime() - new Date(a.mostRecentCreatedAt || 0).getTime();

  const all: TimeBucket[] = [
    { key: 'today', label: 'Heute', groups: buckets.today.sort(sortByRecent) },
    { key: 'week', label: 'Diese Woche', groups: buckets.week.sort(sortByRecent) },
    { key: 'month', label: 'Diesen Monat', groups: buckets.month.sort(sortByRecent) },
    { key: 'older', label: 'Älter', groups: buckets.older.sort(sortByRecent) },
  ];
  return all.filter(b => b.groups.length > 0);
}

export const LegalAlertsPanel: React.FC<LegalAlertsPanelProps> = ({ alerts, onDismiss, onRestore, onNavigate, lastVisit }) => {
  const [showDismissed, setShowDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<string, boolean>>({ older: true });
  const infoRef = useRef<HTMLDivElement>(null);

  const lastVisitTs = lastVisit ? new Date(lastVisit).getTime() : 0;
  const isNewAlert = (a: PulseV2LegalAlert): boolean =>
    !!lastVisitTs && !!a.createdAt && new Date(a.createdAt).getTime() > lastVisitTs;

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInfo]);

  const active = alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved');
  const dismissed = alerts.filter(a => a.status === 'dismissed');
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  // Auto-switch back to active view when no dismissed alerts remain
  useEffect(() => {
    if (showDismissed && dismissed.length === 0) {
      setShowDismissed(false);
    }
  }, [showDismissed, dismissed.length]);

  if (active.length === 0 && resolvedCount === 0 && dismissed.length === 0) return null;

  const criticalCount = active.filter(a => a.severity === 'critical' && a.impactDirection !== 'positive').length;
  const highCount = active.filter(a => a.severity === 'high' && a.impactDirection !== 'positive').length;
  const positiveCount = active.filter(a => a.impactDirection === 'positive').length;

  const displayAlerts = showDismissed ? dismissed : active;
  const groups = groupAlertsByLaw(displayAlerts);
  const timeBuckets = viewMode === 'timeline' ? groupByTime(groups) : [];
  const newCount = active.filter(isNewAlert).length;

  return (
    <div className={`${styles.sectionCard} ${styles.fadeIn}`} style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 16,
      padding: 24,
      marginBottom: 28,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 14, borderLeft: '3px solid #3b82f6' }}>
          <span style={{ fontSize: 18 }}>&#9878;&#65039;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
            Legal Radar
          </span>
          {/* Info icon */}
          <div ref={infoRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className={styles.btnInfo}
              onClick={() => setShowInfo(!showInfo)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '1px solid #d1d5db', background: showInfo ? '#f3f4f6' : '#fff',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: '#9ca3af', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 0,
              }}
              title="Wie funktioniert der Legal Radar?"
            >
              ?
            </button>
            {showInfo && (
              <div style={{
                position: 'absolute', top: 24, left: -8,
                width: 320, padding: '14px 16px',
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100, fontSize: 12, color: '#4b5563', lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                  So funktioniert der Legal Radar
                </div>
                <p style={{ margin: '0 0 8px' }}>
                  Der Legal Radar pr&uuml;ft automatisch <strong>2x t&auml;glich</strong> aktuelle Gesetzesänderungen,
                  Urteile und EU-Verordnungen gegen Ihre analysierten Vertr&auml;ge.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Datenquellen:</strong> Bundesgesetzblatt, BGH/BAG-Rechtsprechung,
                  EU-Amtsblatt, Fachpublikationen — &uuml;ber 26 RSS-Feeds.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Alerts bleiben sichtbar</strong>, bis Sie sie als &bdquo;behoben&ldquo; markieren (Auto-Fix &uuml;bernehmen)
                  oder ausblenden. Es gibt <strong>keine automatische Archivierung</strong>. Ausgeblendete Alerts k&ouml;nnen Sie
                  jederzeit &uuml;ber den &bdquo;Ausgeblendete&ldquo;-Reiter wiederherstellen.
                </p>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>
                  Neue Alerts erscheinen automatisch, sobald relevante Rechts&auml;nderungen erkannt werden.
                </p>
                <button
                  onClick={() => setShowInfo(false)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: 14,
                  }}
                >&times;</button>
              </div>
            )}
          </div>

          {!showDismissed && groups.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#fff',
              background: criticalCount > 0 ? '#dc2626' : '#ea580c',
              padding: '2px 8px', borderRadius: 10,
            }}>
              {groups.length} {groups.length === 1 ? 'Gesetz' : 'Gesetze'} &middot; {active.length} {active.length === 1 ? 'Vertrag' : 'Verträge'}
            </span>
          )}
          {!showDismissed && newCount > 0 && (
            <span
              title={`${newCount} Alert${newCount === 1 ? '' : 's'} seit Ihrem letzten Besuch`}
              style={{
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: '#2563eb', padding: '2px 8px', borderRadius: 10,
                letterSpacing: '0.5px', textTransform: 'uppercase',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              {newCount} NEU
            </span>
          )}
          {!showDismissed && resolvedCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#059669',
              background: '#ecfdf5', padding: '2px 8px', borderRadius: 10,
            }}>
              {resolvedCount} behoben
            </span>
          )}
          {!showDismissed && criticalCount > 0 && (
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{criticalCount} kritisch</span>
          )}
          {!showDismissed && highCount > 0 && (
            <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>{highCount} hoch</span>
          )}
          {!showDismissed && positiveCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#059669',
              background: '#ecfdf5', padding: '2px 8px', borderRadius: 10,
            }}>
              {positiveCount} Chance{positiveCount > 1 ? 'n' : ''}
            </span>
          )}
        </div>

        {/* Right-side controls: view mode toggle + dismissed tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!showDismissed && groups.length > 0 && (
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: 8,
              padding: 2,
              gap: 0,
            }}>
              {(['timeline', 'bylaw'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={mode === 'timeline' ? 'Chronologisch nach Datum gruppieren' : 'Nach Gesetz/Urteil gruppieren'}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: viewMode === mode ? '#0f172a' : '#64748b',
                    background: viewMode === mode ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    boxShadow: viewMode === mode ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {mode === 'timeline' ? 'Zeitstrahl' : 'Nach Gesetz'}
                </button>
              ))}
            </div>
          )}
          {dismissed.length > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600,
                color: showDismissed ? '#111827' : '#9ca3af',
                background: showDismissed ? '#f3f4f6' : 'transparent',
                border: `1px solid ${showDismissed ? '#d1d5db' : 'transparent'}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              {showDismissed ? `Aktive (${active.length})` : `Ausgeblendete (${dismissed.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Dismissed view header */}
      {showDismissed && (
        <div style={{
          padding: '8px 12px', marginBottom: 12,
          background: '#f9fafb', borderRadius: 8,
          fontSize: 12, color: '#6b7280',
        }}>
          Ausgeblendete Alerts werden nicht in Ihren Aktionen berücksichtigt.
          Sie können jeden Alert wiederherstellen.
        </div>
      )}

      {/* Grouped alerts */}
      {displayAlerts.length === 0 ? (
        <div style={{ fontSize: 13, color: showDismissed ? '#6b7280' : '#059669', textAlign: 'center', padding: 16, background: showDismissed ? '#f9fafb' : '#f0fdf4', borderRadius: 8 }}>
          {showDismissed
            ? 'Keine ausgeblendeten Alerts.'
            : `Alle Alerts behoben. ${resolvedCount} Klausel(n) wurden angepasst.`
          }
        </div>
      ) : viewMode === 'timeline' && !showDismissed ? (
        <div>
          {timeBuckets.map(bucket => {
            const isCollapsed = collapsedBuckets[bucket.key];
            return (
              <div key={bucket.key} style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setCollapsedBuckets(prev => ({ ...prev, [bucket.key]: !prev[bucket.key] }))}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    marginBottom: 6,
                  }}
                >
                  <span style={{
                    fontSize: 10,
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.15s ease',
                  }}>&#x25B6;</span>
                  {bucket.label}
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#94a3b8',
                    background: '#f1f5f9', padding: '1px 8px', borderRadius: 10,
                    textTransform: 'none', letterSpacing: 0,
                  }}>
                    {bucket.groups.length}
                  </span>
                </button>
                {!isCollapsed && bucket.groups.map(group => (
                  <LawGroup
                    key={group.lawId}
                    group={group}
                    onDismiss={onDismiss}
                    onRestore={undefined}
                    onNavigate={onNavigate}
                    isNew={group.alerts.some(isNewAlert)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {groups.slice(0, 8).map(group => (
            <LawGroup
              key={group.lawId}
              group={group}
              onDismiss={showDismissed ? undefined : onDismiss}
              onRestore={showDismissed ? onRestore : undefined}
              onNavigate={onNavigate}
              isNew={!showDismissed && group.alerts.some(isNewAlert)}
            />
          ))}
          {groups.length > 8 && (
            <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: 8 }}>
              + {groups.length - 8} weitere Gesetze
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Single law group with expandable contract details ──
const LAW_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  proposal: { label: 'Entwurf', color: '#6b7280', bg: '#f3f4f6' },
  passed: { label: 'Verabschiedet', color: '#d97706', bg: '#fffbeb' },
  effective: { label: 'In Kraft', color: '#dc2626', bg: '#fef2f2' },
  court_decision: { label: 'Urteil', color: '#7c3aed', bg: '#f5f3ff' },
  guideline: { label: 'Leitlinie', color: '#2563eb', bg: '#eff6ff' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#6b7280',
};

const LawGroup: React.FC<{
  group: AlertGroup;
  onDismiss?: (alertId: string) => void;
  onRestore?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
  isNew?: boolean;
}> = ({ group, onDismiss, onRestore, onNavigate, isNew }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState<string | null>(null);
  const dismissRef = useRef<HTMLDivElement>(null);
  const sevColor = group.hasPositive ? '#059669' : (SEVERITY_COLORS[group.highestSeverity] || '#6b7280');

  useEffect(() => {
    if (!confirmDismiss) return;
    const handler = (e: MouseEvent) => {
      if (dismissRef.current && !dismissRef.current.contains(e.target as Node)) {
        setConfirmDismiss(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmDismiss]);
  const statusConf = group.lawStatus ? LAW_STATUS_LABELS[group.lawStatus] : null;

  return (
    <div className={styles.lawGroupCard} style={{
      border: `1px solid ${sevColor}22`,
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      marginBottom: 12,
    }}>
      {/* Group header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          background: group.hasPositive ? '#f0fdf4' : '#fafafa',
          borderRadius: expanded ? '10px 10px 0 0' : 10,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: sevColor, flexShrink: 0,
          }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.lawTitle}
            </span>
            {isNew && (
              <span
                title="Seit Ihrem letzten Besuch erkannt"
                style={{
                  fontSize: 9, fontWeight: 700, color: '#fff',
                  background: '#2563eb', padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.5px', textTransform: 'uppercase',
                  animation: 'pulse 2s ease-in-out infinite',
                  flexShrink: 0,
                }}
              >
                NEU
              </span>
            )}
          </div>
          {statusConf && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: statusConf.color, background: statusConf.bg,
              padding: '1px 6px', borderRadius: 4, flexShrink: 0,
            }}>
              {statusConf.label}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6b7280',
            background: '#f3f4f6', padding: '1px 8px', borderRadius: 8, flexShrink: 0,
          }}>
            {group.alerts.length} {group.alerts.length === 1 ? 'Vertrag' : 'Verträge'}
          </span>
          {group.mostRecentCreatedAt && (
            <span
              title={`Erkannt am ${new Date(group.mostRecentCreatedAt).toLocaleDateString('de-DE')}`}
              style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}
            >
              Erkannt {formatRelativeDate(group.mostRecentCreatedAt)}
            </span>
          )}
          <span style={{
            fontSize: 14, color: '#9ca3af',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s', flexShrink: 0,
          }}>&#8250;</span>
        </div>

        {group.plainSummary && (
          <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, paddingLeft: 16 }}>
            {group.plainSummary}
          </div>
        )}

        {(() => {
          // Dedupe pills by contractId — multiple alerts can reference the same contract.
          const uniqueContracts = Array.from(
            new Map(group.alerts.map(a => [a.contractId, a])).values()
          );
          const visible = uniqueContracts.slice(0, 4);
          const remaining = uniqueContracts.length - visible.length;
          return (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingLeft: 16 }}>
              {visible.map(a => (
                <span key={a.contractId || a._id} style={{
                  fontSize: 11, color: '#6b7280', background: '#f3f4f6',
                  padding: '2px 8px', borderRadius: 6, maxWidth: 200,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cleanContractName(a.contractName)}
                </span>
              ))}
              {remaining > 0 && (
                <span style={{ fontSize: 11, color: '#9ca3af' }}>+{remaining} weitere</span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className={styles.expandContent} style={{ padding: '0 8px 8px', background: '#fff' }}>
          {group.alerts.map(alert => (
            <div key={alert._id} style={{ position: 'relative' }}>
              <ImpactGraph alert={alert} onNavigate={onNavigate} />

              {/* Dismiss button with confirmation */}
              {onDismiss && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDismiss(alert._id); }}
                    title="Ausblenden"
                    style={{
                      position: 'absolute', top: 14, right: 40,
                      width: 22, height: 22, borderRadius: 4,
                      border: '1px solid #d1d5db', background: '#fff',
                      cursor: 'pointer', fontSize: 11, color: '#9ca3af',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >&#10005;</button>

                  {/* Confirmation popup */}
                  {confirmDismiss === alert._id && (
                    <div ref={dismissRef} style={{
                      position: 'absolute', top: 40, right: 20,
                      width: 260, padding: '12px 14px',
                      background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      zIndex: 10,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                        Alert ausblenden?
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 10 }}>
                        Der Alert wird aus Ihrer aktiven Ansicht entfernt und nicht mehr in Ihren Aktionen berücksichtigt.
                        Sie können ihn jederzeit über &bdquo;Ausgeblendete&ldquo; wiederherstellen.
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDismiss(null); }}
                          style={{
                            padding: '4px 12px', fontSize: 12, fontWeight: 500,
                            color: '#6b7280', background: '#f3f4f6',
                            border: '1px solid #d1d5db', borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >Abbrechen</button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(alert._id);
                            setConfirmDismiss(null);
                          }}
                          style={{
                            padding: '4px 12px', fontSize: 12, fontWeight: 600,
                            color: '#fff', background: '#dc2626',
                            border: 'none', borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >Ausblenden</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Restore button (dismissed view) */}
              {onRestore && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRestore(alert._id); }}
                  title="Wiederherstellen"
                  style={{
                    position: 'absolute', top: 14, right: 40,
                    padding: '2px 10px', borderRadius: 4,
                    border: '1px solid #a7f3d0', background: '#ecfdf5',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    color: '#059669', zIndex: 1,
                  }}
                >Wiederherstellen</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

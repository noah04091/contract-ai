import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
// DashboardLayout not used — PulseV2 uses the global Navbar only
import { usePulseV2 } from '../hooks/usePulseV2';
import { AnalysisPipeline } from '../components/pulseV2/AnalysisPipeline';
import { ContractDetail } from '../components/pulseV2/ContractDetail';
import { FindingCard } from '../components/pulseV2/FindingCard';
import { PortfolioInsightsPanel } from '../components/pulseV2/PortfolioInsightsPanel';
import { ActionItem, isLegallyMotivated } from '../components/pulseV2/ActionItem';
import { LegalAlertsPanel } from '../components/pulseV2/LegalAlertsPanel';
import { PortfolioImprovementCard } from '../components/pulseV2/PortfolioImprovementCard';
import { PulseCommandCenter } from '../components/pulseV2/PulseCommandCenter';
// Redesign 21.07.: alter Hero bleibt für Rollback erhalten — Import inaktiv
// import { PulseCheckHero } from '../components/pulseV2/PulseCheckHero';
// Klartext-Redesign 05.08. (Phase 1, HINTER SCHALTER ?ansicht=neu — Standard bleibt die alte Ansicht):
import { usePulseLayoutV3, PulseStatusHeroV3, RechtsCheckStage } from '../components/pulseV2/PulseKlartextV3';
import { SystemStatusPanel } from '../components/pulseV2/SystemStatusPanel';
import { useRadarHealth } from '../components/pulseV2/RadarHealthCard';
import type { PulseV2DashboardItem, PulseV2PortfolioInsight, PulseV2Action, PulseV2LegalAlert, PulseV2Finding, PulseV2Clause } from '../types/pulseV2';
import { useToast } from '../context/ToastContext';
import { cleanContractName } from '../utils/contractName';
import styles from '../styles/PulseV2.module.css';

const API_BASE = '/api';

/** Safely extract string from DB fields that may be stored as object {name, displayName, ...} */
function safeStr(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
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
        {/* alertId (optional) → Deep-Link: Zielseite scrollt zum Alert und klappt ihn auf */}
        <DashboardView onSelectContract={(id, alertId) => navigate(`/pulse/${id}${alertId ? `?alert=${encodeURIComponent(alertId)}` : ''}`)} />
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
    result, error, rejected,
    partialFindings, partialClauses, contractMeta,
    startAnalysis, cancelAnalysis, loadLatest,
  } = usePulseV2();
  const navigate = useNavigate();
  // Deep-Link von einer Legal-Radar-Meldung: ?alert=<id> → zum Alert scrollen + aufklappen
  const [searchParams] = useSearchParams();
  const highlightAlertId = searchParams.get('alert');
  const [loading, setLoading] = useState(true);
  const [monitorInfo, setMonitorInfo] = useState<{ nextRadarScan: string | null; alertCount: number } | null>(null);
  const [contractAlerts, setContractAlerts] = useState<PulseV2LegalAlert[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLatest(contractId);
      setLoading(false);
    })();
  }, [contractId, loadLatest]);

  // Sticky-Fix (nur diese Seite): global gilt body{overflow-x:hidden} — das macht
  // den Body zum nie scrollenden Scroll-Container und deaktiviert position:sticky
  // der Status-Spalte. 'clip' klippt identisch, erzeugt aber keinen Scroll-Container.
  // Beim Verlassen der Seite wird der vorherige Wert wiederhergestellt.
  useEffect(() => {
    const prev = document.body.style.overflowX;
    document.body.style.overflowX = 'clip';
    return () => { document.body.style.overflowX = prev; };
  }, []);

  // Fetch monitoring info (next scan + alerts for this contract)
  useEffect(() => {
    (async () => {
      try {
        const [monRes, alertRes] = await Promise.all([
          fetch('/api/legal-pulse-v2/monitoring-status', { credentials: 'include' }),
          fetch('/api/legal-pulse-v2/legal-alerts', { credentials: 'include' }),
        ]);
        const monData = monRes.ok ? await monRes.json() : null;
        const alertData = alertRes.ok ? await alertRes.json() : { alerts: [] };
        // ALLE Status laden (auch erledigt/ausgeblendet) — die Vertragsseite hat
        // jetzt eigene Reiter dafür. Der Zähler im "Aktiv überwacht"-Band zählt
        // nur die OFFENEN (sinkt also sichtbar beim Abarbeiten).
        const filteredAlerts = (alertData.alerts || []).filter(
          (a: PulseV2LegalAlert) => a.contractId === contractId
        );
        setContractAlerts(filteredAlerts);
        setMonitorInfo({
          nextRadarScan: monData?.nextRadarScan || null,
          alertCount: filteredAlerts.filter((a: PulseV2LegalAlert) => a.status !== 'dismissed' && a.status !== 'resolved').length,
        });
      } catch {
        // Non-critical — silently ignore
      }
    })();
  }, [contractId]);

  // Alert-Status von der Vertragsseite aus ändern (erledigt/ausblenden/wiederherstellen)
  const handleAlertStatusChange = useCallback(async (alertId: string, status: 'resolved' | 'dismissed' | 'unread') => {
    try {
      const res = await fetch(`/api/legal-pulse-v2/legal-alerts/${alertId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return false;
      setContractAlerts(prev => {
        const next = prev.map(a => a._id === alertId ? { ...a, status, statusChangedAt: new Date().toISOString() } : a);
        setMonitorInfo(m => m ? { ...m, alertCount: next.filter(a => a.status !== 'dismissed' && a.status !== 'resolved').length } : m);
        return next;
      });
      return true;
    } catch { return false; }
  }, []);

  // Alle offenen Alerts dieses Vertrags auf einmal erledigen
  const handleBulkResolve = useCallback(async () => {
    try {
      const res = await fetch('/api/legal-pulse-v2/legal-alerts-bulk', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, status: 'resolved' }),
      });
      if (!res.ok) return false;
      const now = new Date().toISOString();
      setContractAlerts(prev => prev.map(a =>
        a.status !== 'dismissed' && a.status !== 'resolved' ? { ...a, status: 'resolved' as const, statusChangedAt: now } : a
      ));
      setMonitorInfo(m => m ? { ...m, alertCount: 0 } : m);
      return true;
    } catch { return false; }
  }, [contractId]);

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
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top-Toolbar: Zurück links, Erneut analysieren rechts — immer auf einer Höhe,
          direkt unter der Navbar. Auf Handy bricht der Analyse-Button unter den
          Zurück-Button (flexWrap), nichts wird abgeschnitten. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}>
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
          }}
        >
          &#8592; Alle Verträge
        </button>
        {status === 'completed' && result && (
          <button
            onClick={handleStartAnalysis}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Erneut analysieren
          </button>
        )}
      </div>

      {/* Analysis Running — bewusst schmal halten (Lesebreite), Seite selbst ist 1360px */}
      {status === 'analyzing' && (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
                          {safeStr(contractMeta.type)}
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
                          findingIndex={idx}
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
        </div>
      )}

      {/* Rejected: Document is not a contract */}
      {status === 'error' && rejected && (
        <div style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid #fde68a',
          borderRadius: 16,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#fef3c7', border: '1px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L2 18h16L10 2z" stroke="#b45309" strokeWidth="1.5" fill="none"/>
                <path d="M10 8v4M10 14v1" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e', letterSpacing: '-0.01em' }}>
              Dokument ist kein Vertrag
            </div>
          </div>
          <div style={{
            fontSize: 13, lineHeight: 1.6, color: '#78350f',
            padding: '12px 16px', background: 'rgba(255,255,255,0.5)',
            borderRadius: 10, marginBottom: 14,
          }}>
            Legal Pulse ist auf die Analyse von Verträgen spezialisiert. Dieses Dokument wurde als
            anderer Dokumenttyp erkannt (z.{'\u00A0'}B. Rechnung, Angebot, Formular) und kann daher
            nicht ausgewertet werden.
          </div>
          <div style={{ fontSize: 12, color: '#a16207', lineHeight: 1.5, marginBottom: 14 }}>
            Laden Sie einen Vertrag hoch, um eine vollständige Risikoanalyse mit Klauselbewertung,
            Handlungsempfehlungen und Gesetzesmonitoring zu erhalten.
          </div>
          {/* Override: user explicitly bypasses the document gate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => startAnalysis(contractId, { lenientMode: true })}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Trotzdem analysieren
            </button>
            <span style={{ fontSize: 11, color: '#a16207', lineHeight: 1.4 }}>
              Wenn Sie sicher sind, dass es ein Vertrag ist, können Sie die Analyse erzwingen.
              Ergebnisse können bei Nicht-Verträgen ungenau sein.
            </span>
          </div>
        </div>
      )}

      {/* Premium Required */}
      {status === 'error' && !rejected && error === 'PREMIUM_REQUIRED' && (
        <div style={{
          padding: 32,
          background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
          border: '1px solid #c7d2fe',
          borderRadius: 12,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1f512;</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1e1b4b', marginBottom: 8 }}>
            Premium-Funktion
          </div>
          <div style={{ fontSize: 14, color: '#4338ca', marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
            Die Legal Pulse Analyse ist ab dem Business-Plan verfügbar. Upgraden Sie jetzt, um Ihre Verträge tiefgehend analysieren zu lassen.
          </div>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              padding: '12px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              background: '#2563eb',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Pläne ansehen
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && !rejected && error !== 'PREMIUM_REQUIRED' && (
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

      {/* Result — der „Erneut analysieren"-Button sitzt jetzt oben in der Toolbar */}
      {status === 'completed' && result && (
        <ContractDetail
          result={result}
          monitorInfo={monitorInfo}
          contractAlerts={contractAlerts}
          highlightAlertId={highlightAlertId}
          onAlertStatusChange={handleAlertStatusChange}
          onBulkResolveAlerts={handleBulkResolve}
        />
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
              background: '#2563eb',
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
// Action Center — Handlungsbedarf Section
// ═══════════════════════════════════════════════════════════

const ActionCenter: React.FC<{
  actions: PulseV2Action[];
  actionsRef: React.RefObject<HTMLDivElement | null>;
  contractNames: Map<string, string>;
  contractLastAnalysisMap?: Map<string, string>;
  onStatusChange?: (actionId: string, status: 'open' | 'done' | 'dismissed', resultId?: string) => void;
  /** Klartext-Ansicht: dringende Aufgaben als Karten, Rest als schlanke Zeilen (Klick klappt auf) */
  klartext?: boolean;
}> = ({ actions, actionsRef, contractNames, contractLastAnalysisMap, onStatusChange, klartext }) => {
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  // Klartext-Ansicht: welche „Zum Einplanen"-Zeilen sind zur vollen Karte aufgeklappt?
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // Einheitliche Reiter-Mechanik (wie Legal Radar): Offen/Erledigt/Ausgeblendet
  const [tab, setTab] = useState<'open' | 'done' | 'dismissed'>('open');
  const infoRef = useRef<HTMLDivElement>(null);

  // TÜV 06.08.: Aufgeklappte Klartext-Zeilen beim Reiter-Wechsel zurücksetzen —
  // liegen gelassener State könnte sonst später unerwartet vorexpandierte Zeilen zeigen.
  useEffect(() => { setExpandedRows(new Set()); }, [tab]);

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

  // Split actions by status
  const openActions = actions.filter(a => a.status === 'open');
  const doneActions = actions.filter(a => a.status === 'done');
  const dismissedActions = actions.filter(a => a.status === 'dismissed');
  const historyCount = doneActions.length + dismissedActions.length;

  // Leerer Reiter (letzter Eintrag wiederhergestellt) → zurück zu "Offen"
  useEffect(() => {
    if (tab === 'open') return;
    if (actions.filter(a => a.status === tab).length === 0) setTab('open');
  }, [tab, actions]);

  const sorted = [...openActions].sort((a, b) => {
    const order: Record<string, number> = { now: 0, plan: 1, watch: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  const displayActions = showAll ? sorted : sorted.slice(0, 5);
  const hiddenCount = sorted.length - 5;
  const nowCount = openActions.filter(a => a.priority === 'now').length;
  const planCount = openActions.filter(a => a.priority === 'plan').length;

  return (
    <div ref={actionsRef} style={{
      background: '#fff',
      borderRadius: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)',
      padding: 24,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.3px', flexWrap: 'wrap' }}>
        Handlungsbedarf
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          {openActions.length} offen
        </span>
        {nowCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>
            {nowCount} dringend
          </span>
        )}
        {/* Info tooltip */}
        <div ref={infoRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '1px solid #d1d5db', background: showInfo ? '#f3f4f6' : '#fff',
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              color: '#9ca3af', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: 0,
            }}
            title="Was ist der Handlungsbedarf?"
          >
            ?
          </button>
          {showInfo && (
            <div style={{
              position: 'absolute', top: 24, left: -8,
              width: 340, padding: '14px 16px',
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100, fontSize: 12, color: '#4b5563', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                Was ist der Handlungsbedarf?
              </div>
              <p style={{ margin: '0 0 8px' }}>
                Hier sehen Sie alle <strong>konkreten Schritte</strong>, die Sie f&uuml;r Ihre
                Vertr&auml;ge unternehmen sollten — priorisiert nach Dringlichkeit.
              </p>
              <p style={{ margin: '0 0 8px' }}>
                <strong style={{ color: '#dc2626' }}>Sofort</strong> = Innerhalb von 7 Tagen handeln (Fristablauf, kritisches Risiko)<br />
                <strong style={{ color: '#d97706' }}>Planen</strong> = Innerhalb von 30 Tagen einplanen<br />
                <strong style={{ color: '#6b7280' }}>Beobachten</strong> = Im Auge behalten, kein sofortiger Handlungsbedarf
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>
                Jede Empfehlung zeigt den n&auml;chsten konkreten Schritt und welche Vertr&auml;ge betroffen sind.
                Klicken Sie auf einen Vertrag um direkt zu den Details zu gelangen.
              </p>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#9ca3af', padding: 2,
                }}
              >
                &#10005;
              </button>
            </div>
          )}
        </div>
        {/* Reiter erst, sobald es Erledigte/Ausgeblendete gibt (einheitliche Regel) */}
        {historyCount > 0 && (
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 2, marginLeft: 'auto' }}>
            {([
              { key: 'open' as const, label: 'Offen', n: openActions.length },
              { key: 'done' as const, label: 'Erledigt', n: doneActions.length },
              { key: 'dismissed' as const, label: 'Ausgeblendet', n: dismissedActions.length },
            ]).filter(t => t.key === 'open' || t.n > 0).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '4px 11px', fontSize: 11.5, fontWeight: 600,
                  color: tab === t.key ? '#0f172a' : '#64748b',
                  background: tab === t.key ? '#ffffff' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: tab === t.key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t.label} ({t.n})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {(nowCount > 0 || planCount > 0) && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 14,
          padding: '8px 12px', background: '#fafbfc', borderRadius: 8,
          fontSize: 12, color: '#6b7280',
        }}>
          {nowCount > 0 && (
            <span>{nowCount} Aktion{nowCount > 1 ? 'en' : ''} mit sofortigem Handlungsbedarf</span>
          )}
          {nowCount > 0 && planCount > 0 && <span>|</span>}
          {planCount > 0 && (
            <span>{planCount} Aktion{planCount > 1 ? 'en' : ''} zum Einplanen</span>
          )}
        </div>
      )}

      {/* Erledigt-/Ausgeblendet-Reiter: Liste mit Wiederherstellen (via ActionItem) */}
      {tab !== 'open' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: tab === 'done' ? '#166534' : '#6b7280', background: tab === 'done' ? '#f0fdf4' : '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            {tab === 'done'
              ? 'Erledigte Empfehlungen wandern nach 90 Tagen automatisch zu „Ausgeblendet" und werden dort nach weiteren 90 Tagen entfernt. Wiederherstellen ist jederzeit möglich.'
              : 'Ausgeblendete Empfehlungen werden 90 Tage nach dem Ausblenden automatisch entfernt. Wiederherstellen ist jederzeit möglich.'}
          </div>
          {(tab === 'done' ? doneActions : dismissedActions).map(action => (
            <ActionItem key={`${tab}_${action.resultId || ''}_${action.id}`} action={action} resultId={action.resultId} contractNames={contractNames} contractLastAnalysisMap={contractLastAnalysisMap} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}

      {/* Open actions */}
      {tab === 'open' && klartext && openActions.length > 0 && (
        /* Klartext-Ansicht: Dringendes (priority now) als volle Karten, der Rest als
           schlanke Zeilen — Klick auf eine Zeile klappt die volle Karte auf. */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.filter(a => a.priority === 'now').map((action, idx) => (
            <ActionItem key={`${action.resultId || ''}_${action.id}`} action={action} resultId={action.resultId} contractNames={contractNames} contractLastAnalysisMap={contractLastAnalysisMap} onStatusChange={onStatusChange} suppressAgeWarning={idx > 0} />
          ))}
          {sorted.some(a => a.priority !== 'now') && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '6px 0 4px' }}>
                Zum Einplanen — ohne Eile
              </div>
              {sorted.filter(a => a.priority !== 'now').map(action => {
                const rowKey = `${action.resultId || ''}_${action.id}`;
                const isExpanded = expandedRows.has(rowKey);
                const firstContract = (action.relatedContracts || []).map(id => contractNames.get(id)).find(Boolean);
                // Noah-Feedback 06.08.: Die Zeile bleibt IMMER sichtbar und klappt per Klick
                // auf UND wieder zu (vorher konnte man nur öffnen, nie schließen).
                const toggleRow = () => setExpandedRows(prev => {
                  const next = new Set(prev);
                  if (next.has(rowKey)) next.delete(rowKey); else next.add(rowKey);
                  return next;
                });
                return (
                  <div key={rowKey}>
                    {/* UI-Audit 06.08.: Hover-Feedback + Tastatur-Zugang (Enter/Space) */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={toggleRow}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(); } }}
                      className={styles.klartextRow}
                      style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '10px 6px', borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9', fontSize: 13.5, borderRadius: 8, cursor: 'pointer', background: isExpanded ? '#f8fafc' : undefined }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: '#0f172a', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {action.title}
                        {isLegallyMotivated(action) && (
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#3730a3', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 5, padding: '1px 6px', verticalAlign: '1px' }}>§ GESETZLICH</span>
                        )}
                      </span>
                      {firstContract && !isExpanded && <span style={{ color: '#94a3b8', fontSize: 12, flexShrink: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstContract}</span>}
                      <span style={{ color: '#cbd5e1', fontWeight: 700, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>&#8250;</span>
                    </div>
                    {isExpanded && (
                      <div style={{ margin: '2px 0 10px' }}>
                        <ActionItem action={action} resultId={action.resultId} contractNames={contractNames} contractLastAnalysisMap={contractLastAnalysisMap} onStatusChange={onStatusChange} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Klassische Ansicht — UND der Leer-Zustand (gilt für beide Ansichten) */}
      {tab === 'open' && (!klartext || openActions.length === 0) && (openActions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayActions.map(action => (
            <ActionItem key={`${action.resultId || ''}_${action.id}`} action={action} resultId={action.resultId} contractNames={contractNames} contractLastAnalysisMap={contractLastAnalysisMap} onStatusChange={onStatusChange} />
          ))}
          {hiddenCount > 0 && !showAll && (
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <button
                className={styles.btnShowMore}
                onClick={() => setShowAll(true)}
                style={{
                  fontSize: 12, color: '#3b82f6', fontWeight: 600,
                  padding: '6px 20px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 20, cursor: 'pointer',
                }}
              >
                + {hiddenCount} weitere anzeigen
              </button>
            </div>
          )}
          {showAll && sorted.length > 5 && (
            <div style={{ textAlign: 'center', paddingTop: 2 }}>
              <button
                onClick={() => setShowAll(false)}
                style={{
                  fontSize: 11, color: '#9ca3af', fontWeight: 500,
                  padding: '4px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                Weniger anzeigen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '16px 20px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>
            Alle Ma&szlig;nahmen erledigt
          </div>
          <div style={{ fontSize: 13, color: '#16a34a', marginTop: 2 }}>
            Keine offenen Handlungsempfehlungen vorhanden.
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Dashboard View — Portfolio Dashboard
// ═══════════════════════════════════════════════════════════
type DashboardFilter = 'all' | 'critical' | 'action_needed' | 'unanalyzed';
type SortBy = 'score_asc' | 'score_desc' | 'name' | 'recent';

const DashboardView: React.FC<{ onSelectContract: (id: string, alertId?: string) => void }> = ({ onSelectContract }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<PulseV2DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [stats, setStats] = useState({ total: 0, analyzed: 0 });
  const [insights, setInsights] = useState<PulseV2PortfolioInsight[]>([]);
  const [actions, setActions] = useState<PulseV2Action[]>([]);
  const [legalAlerts, setLegalAlerts] = useState<PulseV2LegalAlert[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<{ hasData: boolean; avgScoreNow: number | null; avgScorePrevious: number | null; delta: number; contractsAnalyzed: number; contractsImproved: number; contractsWorsened: number; actionsTotal: number; actionsCompleted: number; criticalNow: number; criticalResolved: number; topImprovement: { contractId: string; name: string; delta: number; scoreNow: number } | null; topDecline: { contractId: string; name: string; delta: number; scoreNow: number } | null; improvedContracts?: { contractId: string; name: string; delta: number; scoreNow: number }[]; worsenedContracts?: { contractId: string; name: string; delta: number; scoreNow: number }[]; actionsByContract?: { contractId: string; name: string; actions: { title: string; priority: string; status: string }[]; total: number; completed: number }[] } | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<{ status: 'green' | 'yellow' | 'red' | 'neutral'; statusLabel: string; contractsMonitored: number; lastScan: string | null; lastScheduledScan: string | null; lastRadarScan: string | null; lastRadarRun: string | null; nextMonitorScan: string; nextRadarScan: string; alertsTotal: number; severityCounts: { critical: number; high: number; medium: number; low: number }; recentAlertsCount: number } | null>(null);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [showAllUnanalyzed, setShowAllUnanalyzed] = useState(false); // UX-Fix: Friedhof eingeklappt
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('score_asc');
  const radarRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const contractsRef = useRef<HTMLDivElement>(null);
  const { data: radarData } = useRadarHealth();
  const layoutV3 = usePulseLayoutV3(); // Klartext-Ansicht nur per Schalter, Standard: alte Ansicht

  // "Last visit" tracking — captured on mount, updated on unmount
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  useEffect(() => {
    // Capture previous lastVisit on mount (before overwriting)
    const previous = localStorage.getItem('legalPulse.lastVisit');
    setLastVisit(previous);
    // Immediately mark "now" as the new baseline, so subsequent refreshes during this session
    // don't flood the NEU-badges. "Leave-and-return" is captured via the stored previous value.
    const markNow = () => {
      try { localStorage.setItem('legalPulse.lastVisit', new Date().toISOString()); } catch { /* ignore */ }
    };
    // Update on unmount + before unload as fallback
    window.addEventListener('beforeunload', markNow);
    return () => {
      markNow();
      window.removeEventListener('beforeunload', markNow);
    };
  }, []);

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
        const dashData = dashRes.ok ? await dashRes.json() : { items: [], totalContracts: 0, analyzedContracts: 0 };
        setItems(dashData.items || []);
        setStats({ total: dashData.totalContracts || 0, analyzed: dashData.analyzedContracts || 0 });

        const insightsData = insightsRes.ok ? await insightsRes.json() : { insights: [], actions: [] };
        setInsights(insightsData.insights || []);
        setActions(insightsData.actions || []);

        const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [] };
        setLegalAlerts(alertsData.alerts || []);

        const summaryData = summaryRes.ok ? await summaryRes.json() : {};
        setPortfolioSummary(summaryData);

        const monitorData = monitorRes.ok ? await monitorRes.json() : {};
        setMonitoringStatus(monitorData);
      } catch (err) {
        console.error('[PulseV2] Dashboard load error:', err);
        setDashboardError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Handle action status changes from the dashboard (done/dismissed)
  const handleActionStatusChange = useCallback(async (actionId: string, status: 'open' | 'done' | 'dismissed', resultId?: string) => {
    if (!resultId) return;
    try {
      const res = await fetch(`${API_BASE}/legal-pulse-v2/results/${resultId}/actions/${actionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setActions(prev => prev.map(a =>
          (a.id === actionId && a.resultId === resultId) ? { ...a, status } : a
        ));
      } else {
        toast.error('Status-Änderung konnte nicht gespeichert werden.');
      }
    } catch (err) {
      console.error('[PulseV2] Action status update failed:', err);
      toast.error('Verbindungsfehler — bitte erneut versuchen.');
    }
  }, [toast]);

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

  // Klartext-Ansicht: offene Radar-Meldungen je Vertrag (für die Ampel-Aussage der Karten)
  const openAlertsByContract = useMemo(() => {
    const m = new Map<string, number>();
    if (!layoutV3) return m; // TÜV 06.08.: bei alter Ansicht keine unnötige Rechenarbeit
    for (const a of legalAlerts) {
      if (a.status === 'unread' || a.status === 'read') {
        const key = String(a.contractId);
        m.set(key, (m.get(key) || 0) + 1);
      }
    }
    return m;
  }, [legalAlerts, layoutV3]);

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
        (i.contractType && safeStr(i.contractType).toLowerCase().includes(q)) ||
        (i.provider && safeStr(i.provider).toLowerCase().includes(q))
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
      map.set(item.contractId, cleanContractName(item.name));
    }
    return map;
  }, [items]);

  // Last analysis timestamp per contract (used for action age / stagnation)
  const contractLastAnalysisMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.v2LastAnalysis) map.set(item.contractId, item.v2LastAnalysis);
    }
    return map;
  }, [items]);

  // Neuer Nutzer ohne Analyse → eigener, aufgeräumter Empty State (statt Banner+Command-Center+Toast+Karten)
  const isFirstUse = stats.analyzed === 0;

  const startFirstAnalysis = () => {
    const firstUnanalyzed = items.find(i => !i.hasV2Result);
    if (firstUnanalyzed) {
      onSelectContract(firstUnanalyzed.contractId);
    } else if (stats.total === 0) {
      // Noch gar keine Verträge → zur Verträge-Seite leiten, wo man hochlädt
      navigate('/contracts');
    } else if (contractsRef.current) {
      contractsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Klartext-Redesign: das Panel wird in BEIDEN Ansichten identisch verwendet —
  // in der neuen Ansicht nur zusätzlich von der Rechts-Check-Bühne umrahmt.
  const legalAlertsPanelEl = (
    <LegalAlertsPanel
      alerts={legalAlerts}
      lastVisit={lastVisit}
      klartext={layoutV3}
      onDismiss={async (alertId) => {
        try {
          const res = await fetch(`${API_BASE}/legal-pulse-v2/legal-alerts/${alertId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'dismissed' }),
          });
          if (res.ok) {
            setLegalAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'dismissed' } : a));
          } else {
            toast.error('Alert konnte nicht ausgeblendet werden.');
          }
        } catch (err) {
          console.error('[PulseV2] Alert dismiss failed:', err);
          toast.error('Verbindungsfehler — bitte erneut versuchen.');
        }
      }}
      onResolve={async (alertId) => {
        try {
          const res = await fetch(`${API_BASE}/legal-pulse-v2/legal-alerts/${alertId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' }),
          });
          if (res.ok) {
            setLegalAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'resolved', statusChangedAt: new Date().toISOString() } : a));
            toast.success('Alert als erledigt markiert.');
          } else {
            toast.error('Alert konnte nicht als erledigt markiert werden.');
          }
        } catch (err) {
          console.error('[PulseV2] Alert resolve failed:', err);
          toast.error('Verbindungsfehler — bitte erneut versuchen.');
        }
      }}
      onRestore={async (alertId) => {
        try {
          const res = await fetch(`${API_BASE}/legal-pulse-v2/legal-alerts/${alertId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'unread' }),
          });
          if (res.ok) {
            setLegalAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: 'unread' } : a));
          } else {
            toast.error('Alert konnte nicht wiederhergestellt werden.');
          }
        } catch (err) {
          console.error('[PulseV2] Alert restore failed:', err);
          toast.error('Verbindungsfehler — bitte erneut versuchen.');
        }
      }}
      onNavigate={(contractId, alertId) => onSelectContract(contractId, alertId)}
    />
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Lade Dashboard...</div>;
  }

  if (dashboardError) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#dc2626' }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Dashboard konnte nicht geladen werden</div>
        <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            color: '#fff', background: '#3b82f6', border: 'none',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          Seite neu laden
        </button>
      </div>
    );
  }

  return (
    <div>
      {isFirstUse ? (
        /* ══════════ Empty State (neuer Nutzer, aufgeräumt) ══════════ */
        <div>
          <div style={{
            background: 'linear-gradient(135deg, #f6fbff 0%, #eef5fe 60%, #f7fafe 100%)',
            border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: 18,
            padding: 'clamp(28px, 4vw, 44px) clamp(20px, 4vw, 40px)',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(59,130,246,0.06)',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' as const }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid rgba(59,130,246,0.2)', display: 'grid', placeItems: 'center', boxShadow: '0 1px 3px rgba(37,99,235,0.12)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </span>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Legal Pulse</h1>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '4px 11px', borderRadius: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Laufende Überwachung</span>
            </div>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 22px' }}>
              Legal Pulse überwacht deine Verträge laufend — auf rechtliche Risiken, neue Urteile und Gesetzesänderungen sowie Optimierungspotenzial. Lade einen Vertrag hoch und analysiere ihn, um die Überwachung zu starten.
            </p>
            <button onClick={startFirstAnalysis} style={{ padding: '12px 26px', fontSize: 14, fontWeight: 600, color: '#fff', background: '#2563eb', border: 0, borderRadius: 10, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
              {stats.total === 0 ? 'Vertrag hochladen' : 'Ersten Vertrag analysieren'}
            </button>
            {stats.total > 0 && (
              <div style={{ marginTop: 14, fontSize: 13, color: '#64748b' }}>
                <strong style={{ color: '#0f172a' }}>{stats.total} {stats.total === 1 ? 'Vertrag' : 'Verträge'}</strong> bereit — einmal analysieren genügt, danach läuft die Überwachung automatisch.
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 28 }}>
            {[
              { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', t: 'Rechtliche Risiken erkennen', s: 'Die KI prüft jede Klausel auf Wirksamkeit, DSGVO-Konformität und Haftungsrisiken.' },
              { d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM14.8 9a3.5 3.5 0 1 0 0 6M7.5 11.2h6M7.5 13.4h5', t: 'Kostenfallen vermeiden', s: 'Erkennt automatische Verlängerungen, versteckte Gebühren und überhöhte Preise.' },
              { d: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', t: 'Gesetze im Blick behalten', s: 'Neue Urteile und Gesetzesänderungen werden automatisch gegen deine Verträge geprüft.' },
            ].map(c => (
              <div key={c.t} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#eff6ff', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={c.d} /></svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>{c.t}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>{c.s}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {layoutV3 ? (
            /* Klartext-Ansicht (Schalter ?ansicht=neu): Ein-Satz-Verdikt statt KPI-Kacheln */
            <PulseStatusHeroV3
              alerts={legalAlerts}
              actions={actions}
              monitoredCount={monitoringStatus?.contractsMonitored ?? stats.analyzed}
              avgScore={alertStats.avgScore}
              insightsCount={insights.length}
              analyzedCount={stats.analyzed}
              lastRadarRun={monitoringStatus?.lastRadarRun ?? null}
            />
          ) : (
            <PulseCommandCenter
              stats={stats}
              alerts={legalAlerts}
              criticalContractCount={alertStats.criticalContracts.length}
              openActionCount={alertStats.openActions.length}
              renewalSoonCount={alertStats.renewalSoon.length}
              unanalyzedCount={alertStats.unanalyzed.length}
              severityCounts={monitoringStatus?.severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0 }}
              recentAlertsCount={monitoringStatus?.recentAlertsCount ?? 0}
              lastVisit={lastVisit}
              avgScore={alertStats.avgScore}
              radarData={radarData ?? null}
              lastScan={monitoringStatus?.lastScheduledScan ?? monitoringStatus?.lastScan ?? null}
              lastRadarScan={monitoringStatus?.lastRadarScan ?? null}
              lastRadarRun={monitoringStatus?.lastRadarRun ?? null}
              nextRadarScan={monitoringStatus?.nextRadarScan ?? null}
              onAnalyzeFirst={startFirstAnalysis}
            />
          )}

          {/* ══════════ Zone 2: Legal Radar (Herzstück) ══════════ */}
          {/* UI-Audit 06.08.: scrollMarginTop — sonst landet die Ziel-Überschrift beim
              Anker-Sprung hinter der Sticky-Navbar */}
          <div ref={radarRef} id="legal-alerts" style={{ scrollMarginTop: 90 }} />
          {layoutV3 ? (
            <RechtsCheckStage
              alerts={legalAlerts}
              monitoredCount={monitoringStatus?.contractsMonitored ?? stats.analyzed}
              lastRadarRun={monitoringStatus?.lastRadarRun ?? null}
              lawChangesLastRun={radarData?.recentRuns?.[0]?.lawChanges ?? null}
              lawsNewThisWeek={radarData?.laws?.newThisWeek ?? null}
              alertsThisWeek={radarData?.alertsThisWeek?.total ?? null}
            >
              {legalAlertsPanelEl}
            </RechtsCheckStage>
          ) : legalAlertsPanelEl}

          <div id="pulse-tasks" style={{ scrollMarginTop: 90 }} />
          {/* Action Center */}
          {actions.length > 0 && (
            <ActionCenter
              actions={actions}
              actionsRef={actionsRef}
              contractNames={contractNames}
              contractLastAnalysisMap={contractLastAnalysisMap}
              onStatusChange={handleActionStatusChange}
              klartext={layoutV3}
            />
          )}

          {/* Zone 3: Contract Health + Radar — now consolidated into PulseCheckHero above */}

          <div id="pulse-portfolio" style={{ scrollMarginTop: 90 }} />
          {/* Portfolio: Trend + Insights nebeneinander (Mockup-Zweispalter) */}
          {/* Noah-Feedback 06.08.: Die kompakte Entwicklungs-Zeile war Verschlimmbesserung
              („kurze Info, kein Mehrwert") — die bewährte volle Karte mit klickbaren
              Verbessert/Verschlechtert-Listen gilt wieder für BEIDE Ansichten. */}
          {(portfolioSummary || insights.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 14, alignItems: 'stretch', marginBottom: 20 }}>
              {portfolioSummary && (
                <PortfolioImprovementCard
                  summary={portfolioSummary}
                  lastAnalysisMap={contractLastAnalysisMap}
                  onNavigate={(id) => onSelectContract(id)}
                />
              )}
              {insights.length > 0 && (
                <PortfolioInsightsPanel insights={insights} contractNames={contractNames} openActions={layoutV3 ? actions.filter(a => a.status === 'open') : undefined} />
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════ Contract Grid: Search + Filter + Sort ══════════ */}
      <div ref={contractsRef} style={{ marginBottom: 20 }}>
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
              className={styles.searchInput}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="pulse-contracts"
              placeholder="Vertrag suchen..."
              style={{
                scrollMarginTop: 90,
                width: '100%',
                padding: '8px 12px 8px 34px',
                fontSize: 13,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                outline: 'none',
                color: '#0f172a',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
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
              className={styles.filterPill}
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
        (() => {
          // UX-Fix 21.07.: In der „Alle"-Ansicht die analysierten (überwachten) Verträge
          // zuerst zeigen und den langen „Noch nicht analysiert"-Rest einklappen —
          // sonst scrollt der Nutzer durch hunderte Rechnungen/Uploads, um seine
          // überwachten Verträge zu finden. Suche/andere Filter bleiben unverändert.
          const collapseUnanalyzed = filter === 'all' && !debouncedQuery;
          const analyzed = collapseUnanalyzed ? filteredItems.filter(i => i.hasV2Result) : filteredItems;
          const unanalyzed = collapseUnanalyzed ? filteredItems.filter(i => !i.hasV2Result) : [];
          return (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 14,
              }}>
                {(showAllUnanalyzed ? [...analyzed, ...unanalyzed] : analyzed).map(item => (
                  <ContractCard key={item.contractId} item={item} onClick={() => onSelectContract(item.contractId)} klartext={layoutV3} openAlertCount={openAlertsByContract.get(String(item.contractId)) ?? 0} />
                ))}
              </div>
              {collapseUnanalyzed && unanalyzed.length > 0 && !showAllUnanalyzed && (
                <button
                  className={styles.btnShowMore}
                  onClick={() => setShowAllUnanalyzed(true)}
                  style={{
                    marginTop: 14,
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 13,
                    color: '#6b7280',
                    background: '#f9fafb',
                    border: '1px dashed #d1d5db',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  {layoutV3
                    ? `💤 ${unanalyzed.length} hochgeladene Dokumente werden noch nicht überwacht — die Überwachung beginnt mit der Analyse. Anzeigen ›`
                    : `+ ${unanalyzed.length} nicht analysierte Dokumente anzeigen (werden nicht überwacht)`}
                </button>
              )}
            </>
          );
        })()
      )}

      {/* ══════════ System-Status (eingeklappt, am Ende) ══════════ */}
      <div style={{ marginTop: 32 }}>
        <SystemStatusPanel
          monitoring={monitoringStatus}
          radarData={radarData ?? null}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Contract Card
// ═══════════════════════════════════════════════════════════
const ContractCard: React.FC<{
  item: PulseV2DashboardItem;
  onClick: () => void;
  /** Klartext-Ansicht: Ampel-Status in Alltagssprache statt „N Befunde" */
  klartext?: boolean;
  openAlertCount?: number;
}> = ({ item, onClick, klartext, openAlertCount = 0 }) => {
  const score = item.v2Score;
  const scoreColor = score === null ? '#cbd5e1' : score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
  const now = Date.now();
  const daysUntilExpiry = item.endDate ? Math.ceil((new Date(item.endDate).getTime() - now) / (1000 * 60 * 60 * 24)) : null;
  const pct = score !== null ? score / 100 : 0;
  const r = 22;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className={styles.contractCard}
      onClick={onClick}
      style={{
        padding: '18px 20px',
        background: '#fff',
        borderRadius: 16,
        cursor: 'pointer',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        border: '1px solid rgba(0,0,0,0.04)',
        borderLeft: item.v2CriticalCount > 0 ? '4px solid #ef4444' : `4px solid ${scoreColor}`,
        boxShadow: item.v2CriticalCount > 0
          ? '0 1px 3px rgba(220,38,38,0.1), 0 4px 16px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
      }}
    >
      {/* Mini SVG Score Ring */}
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, filter: `drop-shadow(0 0 6px ${scoreColor}33)` }}>
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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          letterSpacing: '-0.2px',
          minWidth: 0,
        }}>
          {/* UI-Audit 06.08.: Ellipsis gehört auf den Text-SPAN (mit minWidth:0), nicht auf
              den Flex-Container — sonst wird bei langen Namen hart abgeschnitten und das
              KRITISCH-Badge kann aus der Karte gedrängt werden. */}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cleanContractName(item.name)}
          </span>
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
          {item.contractType && <span>{safeStr(item.contractType)} · </span>}
          {item.provider && <span>{safeStr(item.provider)} · </span>}
          {klartext ? (
            /* Klartext-Ansicht: Ampel-Aussage statt Befund-Zahl */
            !item.hasV2Result ? (
              <span>Noch nicht analysiert — wird nicht überwacht</span>
            ) : item.v2CriticalCount > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>{item.v2CriticalCount} kritische{item.v2CriticalCount === 1 ? 'r Punkt' : ' Punkte'} offen</span>
            ) : openAlertCount > 0 ? (
              <span style={{ color: '#d97706', fontWeight: 600 }}>{openAlertCount} {openAlertCount === 1 ? 'Punkt' : 'Punkte'} offen</span>
            ) : (
              <span style={{ color: '#059669', fontWeight: 600 }}>Alles ruhig — wird überwacht</span>
            )
          ) : (
            item.hasV2Result
              ? `${item.v2FindingsCount} Befunde`
              : 'Noch nicht analysiert'
          )}
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

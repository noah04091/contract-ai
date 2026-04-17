import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// DashboardLayout not used — PulseV2 uses the global Navbar only
import { usePulseV2 } from '../hooks/usePulseV2';
import { AnalysisPipeline } from '../components/pulseV2/AnalysisPipeline';
import { ContractDetail } from '../components/pulseV2/ContractDetail';
import { FindingCard } from '../components/pulseV2/FindingCard';
import { PortfolioInsightsPanel } from '../components/pulseV2/PortfolioInsightsPanel';
import { ActionItem } from '../components/pulseV2/ActionItem';
import { LegalAlertsPanel } from '../components/pulseV2/LegalAlertsPanel';
import { PortfolioImprovementCard } from '../components/pulseV2/PortfolioImprovementCard';
import { PulseCheckHero } from '../components/pulseV2/PulseCheckHero';
import { SystemStatusPanel } from '../components/pulseV2/SystemStatusPanel';
import { useRadarHealth, RadarHealthCompact, RadarHealthExpanded } from '../components/pulseV2/RadarHealthCard';
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
        <DashboardView onSelectContract={(id) => navigate(`/pulse/${id}`)} />
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
        const filteredAlerts = (alertData.alerts || []).filter(
          (a: PulseV2LegalAlert) => a.contractId === contractId && a.status !== 'dismissed'
        );
        setContractAlerts(filteredAlerts);
        setMonitorInfo({
          nextRadarScan: monData?.nextRadarScan || null,
          alertCount: filteredAlerts.length,
        });
      } catch {
        // Non-critical — silently ignore
      }
    })();
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
        </>
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
          <div style={{ fontSize: 12, color: '#a16207', lineHeight: 1.5 }}>
            Laden Sie einen Vertrag hoch, um eine vollständige Risikoanalyse mit Klauselbewertung,
            Handlungsempfehlungen und Gesetzesmonitoring zu erhalten.
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && !rejected && (
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

          <ContractDetail result={result} monitorInfo={monitorInfo} contractAlerts={contractAlerts} />
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
// Action Center — Handlungsbedarf Section
// ═══════════════════════════════════════════════════════════

const ActionCenter: React.FC<{
  actions: PulseV2Action[];
  actionsRef: React.RefObject<HTMLDivElement | null>;
  contractNames: Map<string, string>;
  contractLastAnalysisMap?: Map<string, string>;
  onStatusChange?: (actionId: string, status: 'open' | 'done' | 'dismissed', resultId?: string) => void;
}> = ({ actions, actionsRef, contractNames, contractLastAnalysisMap, onStatusChange }) => {
  const [showAll, setShowAll] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.3px' }}>
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

      {/* Open actions */}
      {openActions.length > 0 ? (
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
      )}

      {/* Historie — collapsible section for done + dismissed actions */}
      {historyCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
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
              transform: showHistory ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}>
              &#x203A;
            </span>
            Historie
            {doneActions.length > 0 && (
              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
                {doneActions.length} erledigt
              </span>
            )}
            {dismissedActions.length > 0 && (
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                {dismissedActions.length} ausgeblendet
              </span>
            )}
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {[...doneActions, ...dismissedActions].map(action => (
                <ActionItem key={`hist_${action.resultId || ''}_${action.id}`} action={action} resultId={action.resultId} contractNames={contractNames} contractLastAnalysisMap={contractLastAnalysisMap} onStatusChange={onStatusChange} />
              ))}
            </div>
          )}
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
  const toast = useToast();
  const [items, setItems] = useState<PulseV2DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [stats, setStats] = useState({ total: 0, analyzed: 0 });
  const [insights, setInsights] = useState<PulseV2PortfolioInsight[]>([]);
  const [actions, setActions] = useState<PulseV2Action[]>([]);
  const [legalAlerts, setLegalAlerts] = useState<PulseV2LegalAlert[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<{ hasData: boolean; avgScoreNow: number | null; avgScorePrevious: number | null; delta: number; contractsAnalyzed: number; contractsImproved: number; contractsWorsened: number; actionsTotal: number; actionsCompleted: number; criticalNow: number; criticalResolved: number; topImprovement: { contractId: string; name: string; delta: number; scoreNow: number } | null; topDecline: { contractId: string; name: string; delta: number; scoreNow: number } | null; improvedContracts?: { contractId: string; name: string; delta: number; scoreNow: number }[]; worsenedContracts?: { contractId: string; name: string; delta: number; scoreNow: number }[]; actionsByContract?: { contractId: string; name: string; actions: { title: string; priority: string; status: string }[]; total: number; completed: number }[] } | null>(null);
  const [monitoringStatus, setMonitoringStatus] = useState<{ status: 'green' | 'yellow' | 'red' | 'neutral'; statusLabel: string; contractsMonitored: number; lastScan: string | null; lastScheduledScan: string | null; lastRadarScan: string | null; nextMonitorScan: string; nextRadarScan: string; alertsTotal: number; severityCounts: { critical: number; high: number; medium: number; low: number }; recentAlertsCount: number } | null>(null);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('score_asc');
  const [radarExpanded, setRadarExpanded] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const radarRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const contractsRef = useRef<HTMLDivElement>(null);
  const { data: radarData } = useRadarHealth();

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

  // Hero auto-collapse: first visit = open, after that = collapsed
  useEffect(() => {
    const dismissed = localStorage.getItem('pulseV2_heroDismissed') === 'true';
    const visits = parseInt(localStorage.getItem('pulseV2_heroVisits') || '0');
    if (dismissed || visits >= 1) {
      setHeroCollapsed(true);
    }
    localStorage.setItem('pulseV2_heroVisits', String(visits + 1));
  }, []);

  const collapseHero = () => {
    localStorage.setItem('pulseV2_heroDismissed', 'true');
    setHeroCollapsed(true);
  };

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

  // First-Use: no contracts analyzed yet
  const isFirstUse = stats.analyzed === 0;

  return (
    <div>
      {/* ══════════ Intro Hero Banner (original) ══════════ */}
      {!heroCollapsed ? (
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 50%, #f8fafc 100%)',
          borderRadius: 20,
          padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 52px)',
          marginBottom: 28,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 48,
          flexWrap: 'wrap' as const,
        }}>
          {/* Collapse button */}
          <button
            onClick={collapseHero}
            title="Einklappen"
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 32, height: 32, borderRadius: '50%',
              border: 'none', background: 'rgba(59,130,246,0.08)',
              cursor: 'pointer', fontSize: 16, color: '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            &times;
          </button>

          {/* Left: Title + Subtitle */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                Legal Pulse
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#1d4ed8',
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                padding: '4px 12px', borderRadius: 6,
                letterSpacing: '0.5px', textTransform: 'uppercase',
              }}>
                Laufende Überwachung
              </span>
            </div>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6, maxWidth: 480 }}>
              Kontinuierliche Überwachung aller Verträge auf rechtliche Risiken, Gesetzesänderungen und Optimierungspotenzial.
            </p>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#64748b', flexWrap: 'wrap' as const }}>
              <span><strong style={{ color: '#0f172a', fontSize: 18 }}>{stats.analyzed}</strong> / {stats.total} analysiert</span>
              {alertStats.criticalContracts.length > 0 && (
                <span><strong style={{ color: '#dc2626', fontSize: 18 }}>{alertStats.criticalContracts.length}</strong> kritisch</span>
              )}
              {alertStats.openActions.length > 0 && (
                <span><strong style={{ color: '#d97706', fontSize: 18 }}>{alertStats.openActions.length}</strong> offene Empfehlungen</span>
              )}
            </div>
          </div>

          {/* Right: Feature cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 280px', minWidth: 0 }}>
            {[
              { icon: '\u26A1', title: 'KI-Analyse', desc: '6-Stufen Deep Analysis Pipeline' },
              { icon: '\uD83D\uDEE1\uFE0F', title: 'Legal Radar', desc: 'Gesetzesänderungen automatisch erkennen' },
              { icon: '\uD83D\uDCCA', title: 'Portfolio Health', desc: 'Alle Verträge auf einen Blick' },
            ].map((card) => (
              <div key={card.title} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#ffffff', padding: '14px 18px',
                borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                minWidth: 0,
              }}>
                <div style={{
                  fontSize: 20, width: 42, height: 42,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#f0f7ff', borderRadius: 10,
                }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Minimized Hero */
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)', borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.1)',
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Legal Pulse</h1>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#1d4ed8',
              background: '#dbeafe', padding: '2px 8px', borderRadius: 4,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              Aktiv
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              {stats.analyzed} / {stats.total} Verträge analysiert
            </span>
          </div>
          <button
            onClick={() => setHeroCollapsed(false)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              color: '#3b82f6', background: '#eff6ff',
              border: '1px solid #bfdbfe', borderRadius: 8,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            &#9432; Mehr anzeigen
          </button>
        </div>
      )}

      {/* ══════════ Zone 1: Pulse-Check Hero ══════════ */}
      <PulseCheckHero
        stats={stats}
        alerts={legalAlerts}
        criticalContractCount={alertStats.criticalContracts.length}
        openActionCount={alertStats.openActions.length}
        renewalSoonCount={alertStats.renewalSoon.length}
        unanalyzedCount={alertStats.unanalyzed.length}
        severityCounts={monitoringStatus?.severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0 }}
        recentAlertsCount={monitoringStatus?.recentAlertsCount ?? 0}
        lastVisit={lastVisit}
        onJumpToRadar={() => {
          if (radarRef.current) {
            radarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
        onAnalyzeFirst={() => {
          const firstUnanalyzed = items.find(i => !i.hasV2Result);
          if (firstUnanalyzed) {
            onSelectContract(firstUnanalyzed.contractId);
          } else if (contractsRef.current) {
            contractsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      {isFirstUse ? (
        /* ══════════ First-Use: Demo Insight + Value Proposition ══════════ */
        <>
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { icon: '\u2696️', title: 'Rechtliche Risiken erkennen', desc: 'KI-Analyse prüft jede Klausel auf Wirksamkeit, DSGVO und Haftungsrisiken.' },
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
      ) : (
        <>
          {/* ══════════ Zone 2: Legal Radar (Herzstück) ══════════ */}
          <div ref={radarRef} id="legal-alerts" />
          <LegalAlertsPanel
            alerts={legalAlerts}
            lastVisit={lastVisit}
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
            onNavigate={(contractId) => onSelectContract(contractId)}
          />

          {/* Action Center */}
          {actions.length > 0 && (
            <ActionCenter
              actions={actions}
              actionsRef={actionsRef}
              contractNames={contractNames}
              contractLastAnalysisMap={contractLastAnalysisMap}
              onStatusChange={handleActionStatusChange}
            />
          )}

          {/* ══════════ Zone 3: Portfolio Health + Radar Compact ══════════ */}
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
            padding: '36px 44px',
            marginBottom: 28,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 40,
            }}>
              {(() => {
                const score = alertStats.avgScore;
                const color = score === null ? '#d1d5db' : score >= 70 ? '#22c55e' : score >= 50 ? '#d97706' : '#dc2626';
                const label = score === null ? 'Keine Daten' : score >= 70 ? 'Stabil' : score >= 50 ? 'Aufmerksamkeit nötig' : 'Handlungsbedarf';
                const pct = score !== null ? score / 100 : 0;
                const radius = 52;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference * (1 - pct);
                return (
                  <>
                    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0, filter: `drop-shadow(0 0 12px ${color}33)` }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        {score !== null && (
                          <circle
                            cx="60" cy="60" r={radius}
                            fill="none" stroke={color} strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                          />
                        )}
                      </svg>
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: score !== null ? color : '#cbd5e1', lineHeight: 1 }}>
                          {score ?? '—'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
                          Score
                        </span>
                      </div>
                    </div>
                    <div style={{ flex: 1, borderLeft: '4px solid #3b82f6', paddingLeft: 16 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.3px' }}>
                        Contract Health
                      </div>
                      <div style={{ fontSize: 15, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
                        {label}
                      </div>
                      {stats.analyzed > 0 && (
                        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#64748b', flexWrap: 'wrap' as const }}>
                          <span style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}><strong style={{ color: '#0f172a' }}>{stats.analyzed}</strong> analysiert</span>
                          <span style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}><strong style={{ color: alertStats.criticalContracts.length > 0 ? '#dc2626' : '#0f172a' }}>{alertStats.criticalContracts.length}</strong> kritisch</span>
                          <span style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}><strong style={{ color: '#0f172a' }}>{alertStats.renewalSoon.length}</strong> bald ablaufend</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              {radarData && (
                <RadarHealthCompact
                  data={radarData}
                  expanded={radarExpanded}
                  onToggle={() => setRadarExpanded(!radarExpanded)}
                />
              )}
            </div>
            {radarExpanded && radarData && <RadarHealthExpanded data={radarData} />}
          </div>

          {/* Portfolio Improvement Tracking */}
          {portfolioSummary && (
            <PortfolioImprovementCard
              summary={portfolioSummary}
              lastAnalysisMap={contractLastAnalysisMap}
              onNavigate={(id) => onSelectContract(id)}
            />
          )}

          {/* Portfolio Insights */}
          {insights.length > 0 && (
            <PortfolioInsightsPanel insights={insights} contractNames={contractNames} />
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
              placeholder="Vertrag suchen..."
              style={{
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}>
          {filteredItems.map(item => (
            <ContractCard key={item.contractId} item={item} onClick={() => onSelectContract(item.contractId)} />
          ))}
        </div>
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
const ContractCard: React.FC<{ item: PulseV2DashboardItem; onClick: () => void }> = ({ item, onClick }) => {
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
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          letterSpacing: '-0.2px',
        }}>
          {cleanContractName(item.name)}
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
          {item.hasV2Result
            ? `${item.v2FindingsCount} Befunde`
            : 'Noch nicht analysiert'
          }
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

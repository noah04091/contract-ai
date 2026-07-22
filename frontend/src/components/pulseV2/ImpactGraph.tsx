import React, { useState, useCallback } from 'react';
import type { PulseV2LegalAlert, PulseV2AutoFixResult } from '../../types/pulseV2';
import { cleanContractName } from '../../utils/contractName';
import styles from '../../styles/PulseV2.module.css';

interface ImpactGraphProps {
  alert: PulseV2LegalAlert;
  onNavigate?: (contractId: string) => void;
  hideContractInfo?: boolean;
}

const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2' },
  high: { color: '#ea580c', bg: '#fff7ed' },
  medium: { color: '#d97706', bg: '#fffbeb' },
  low: { color: '#6b7280', bg: '#f9fafb' },
};

const POSITIVE_COLORS = { color: '#059669', bg: '#ecfdf5' };


// Redesign E4 (Mockup 863486b9): Schritt-Zeile — Mono-Label links, Inhalt rechts
const StepRow: React.FC<{ label: string; first?: boolean; strong?: boolean; children: React.ReactNode }> = ({ label, first, strong, children }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '118px 1fr', gap: 12,
    padding: '9px 0', borderTop: first ? 'none' : '1px solid #e2e8f0', fontSize: 13,
  }}>
    <b style={{ color: '#94a3b8', fontWeight: 600, fontSize: 10.5, fontFamily: 'ui-monospace, Consolas, monospace', letterSpacing: '0.05em', textTransform: 'uppercase', paddingTop: 2 }}>{label}</b>
    <span style={{ color: strong ? '#0f172a' : '#475569', fontWeight: strong ? 600 : 400, minWidth: 0 }}>{children}</span>
  </div>
);
export const ImpactGraph: React.FC<ImpactGraphProps> = ({ alert, onNavigate, hideContractInfo }) => {
  const [expanded, setExpanded] = useState(false);
  const isPositive = alert.impactDirection === 'positive';
  const sev = isPositive ? POSITIVE_COLORS : (SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low);
  const hasClauseImpacts = alert.clauseImpacts && alert.clauseImpacts.length > 0;

  return (
    <div style={{
      border: `1px solid ${sev.color}22`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          background: sev.bg,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Severity indicator */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: sev.color, flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            {hideContractInfo ? alert.lawTitle : cleanContractName(alert.contractName)}
            {hasClauseImpacts && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: '#6b7280', background: '#f3f4f6',
                padding: '1px 6px', borderRadius: 4, flexShrink: 0,
              }}>
                {alert.clauseImpacts.length} Klausel{alert.clauseImpacts.length > 1 ? 'n' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {alert.plainSummary || alert.impactSummary}
          </div>
        </div>

        {/* Expand arrow */}
        <span style={{
          fontSize: 14, color: '#9ca3af',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s',
        }}>
          &#8250;
        </span>
      </div>

      {/* Expanded: Impact details (Redesign E4 — Mockup-Steps-Grid) */}
      {expanded && (
        <div style={{ padding: '2px 16px 16px', background: '#fff' }}>
          <div>
            <StepRow first label="Was sich ändert">{alert.impactSummary || alert.plainSummary || alert.lawTitle}</StepRow>
            {!hideContractInfo && (
              <StepRow label="Betrifft">
                <span
                  onClick={() => onNavigate?.(alert.contractId)}
                  style={{ fontWeight: 600, color: '#0f172a', cursor: onNavigate ? 'pointer' : 'default', textDecoration: onNavigate ? 'underline' : 'none', textUnderlineOffset: 3 }}
                >{cleanContractName(alert.contractName)}</span>
                {alert.clauseImpacts?.length > 0 && <span style={{ color: '#94a3b8' }}> — {alert.clauseImpacts.length} Klausel{alert.clauseImpacts.length > 1 ? 'n' : ''}</span>}
                {alert.deepVerified && (
                  <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>&#10003; Am Vertragstext belegt</span>
                )}
              </StepRow>
            )}
            <StepRow label={isPositive ? 'Ihr Vorteil' : 'Wenn nichts passiert'}>
              {alert.businessImpact || (isPositive ? '' : 'Die betroffenen Klauseln könnten nicht mehr rechtskonform sein. Eine Prüfung wird empfohlen.')}
            </StepRow>
            <StepRow label="Nächster Schritt" strong>
              {alert.recommendation || 'Klausel prüfen und ggf. anpassen — der Vorschlag unten hilft dabei.'}
            </StepRow>

            {alert.deepVerified && alert.evidenceQuote && (
              <div style={{ margin: '10px 0 2px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '9px 13px', fontSize: 12.5, color: '#065f46', fontStyle: 'italic' }}>
                &bdquo;{alert.evidenceQuote}&ldquo;
              </div>
            )}

            {/* Aktionen */}
            <div style={{ display: 'flex', gap: 8, margin: '12px 0 4px', alignItems: 'center', flexWrap: 'wrap' }}>
              {!hideContractInfo && onNavigate && (
                <button onClick={() => onNavigate(alert.contractId)} style={{ fontWeight: 600, fontSize: 12.5, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>Vertrag öffnen</button>
              )}
              {alert.lawSource && alert.lawSource.startsWith('http') && (
                <a href={alert.lawSource} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 12.5, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', textDecoration: 'none' }}>Quelle</a>
              )}
            </div>

            {/* Step 4: Affected Clauses */}
            {hasClauseImpacts && alert.clauseImpacts.map((ci, idx) => (
              <React.Fragment key={idx}>
                <ClauseImpactNode clauseImpact={ci} severity={alert.severity} alertId={alert._id} contractId={alert.contractId} />
              </React.Fragment>
            ))}

            
            {/* D3: User feedback */}
            <FeedbackButtons alertId={alert._id} existingFeedback={alert.userFeedback} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-Components ────────────────────────────────────────




const ClauseImpactNode: React.FC<{
  clauseImpact: { clauseId: string; clauseTitle: string; impact: string; suggestedChange: string };
  severity: string;
  alertId: string;
  contractId?: string;
}> = ({ clauseImpact, severity, alertId, contractId }) => {
  const [showFix, setShowFix] = useState(false);
  const [autoFix, setAutoFix] = useState<PulseV2AutoFixResult | null>(null);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [showClauseText, setShowClauseText] = useState(false);
  const [clauseText, setClauseText] = useState<string | null>(null);
  const [clauseTextLoading, setClauseTextLoading] = useState(false);
  const sev = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;

  const handleShowClause = useCallback(async () => {
    if (clauseText !== null) { setShowClauseText(!showClauseText); return; }
    if (!contractId) return;
    setClauseTextLoading(true);
    try {
      const titleParam = encodeURIComponent(clauseImpact.clauseTitle || '');
      const res = await fetch(`/api/legal-pulse-v2/clause-text/${contractId}/${clauseImpact.clauseId}?title=${titleParam}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setClauseText(data.text || 'Kein Text verfügbar');
      } else {
        setClauseText('Klausel konnte nicht geladen werden.');
      }
      setShowClauseText(true);
    } catch {
      setClauseText('Verbindungsfehler beim Laden der Klausel.');
      setShowClauseText(true);
    } finally { setClauseTextLoading(false); }
  }, [contractId, clauseImpact.clauseId, clauseText, showClauseText]);

  const handleAutoFix = useCallback(async () => {
    setFixLoading(true);
    setFixError(null);
    try {
      const res = await fetch('/api/legal-pulse-v2/auto-fix-clause', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, clauseId: clauseImpact.clauseId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: PulseV2AutoFixResult = await res.json();
      setAutoFix(data);
    } catch (err) {
      console.error('[PulseV2] Auto-fix failed:', err);
      setFixError(err instanceof Error ? err.message : 'Fehler beim Generieren');
    } finally {
      setFixLoading(false);
    }
  }, [alertId, clauseImpact.clauseId]);

  const handleCopy = useCallback(() => {
    if (!autoFix) return;
    navigator.clipboard.writeText(autoFix.fixedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [autoFix]);

  const handleApply = useCallback(async () => {
    if (!autoFix) return;
    setApplyLoading(true);
    try {
      const res = await fetch('/api/legal-pulse-v2/apply-fix', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          clauseId: clauseImpact.clauseId,
          fixedText: autoFix.fixedText,
          reasoning: autoFix.reasoning,
          legalBasis: autoFix.legalBasis,
          changeType: autoFix.changeType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setApplied(true);
    } catch (err) {
      console.error('[PulseV2] Apply fix failed:', err);
      setFixError(err instanceof Error ? err.message : 'Fehler beim Übernehmen');
    } finally {
      setApplyLoading(false);
    }
  }, [autoFix, alertId, clauseImpact.clauseId]);

  const CHANGE_TYPE_LABELS: Record<string, string> = {
    major_rewrite: 'Umfassende Überarbeitung',
    targeted_fix: 'Gezielte Anpassung',
    addition: 'Ergänzung',
    removal: 'Streichung',
  };

  return (
    <div style={{
      padding: '10px 12px',
      background: '#f9fafb',
      borderRadius: 8,
      borderLeft: `3px solid ${sev.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>&#9888;&#65039;</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: sev.color, textTransform: 'uppercase', marginBottom: 2 }}>
            Betroffene Klausel
          </div>
          {/* Clickable clause title + impact to expand full text */}
          <div
            className={contractId ? styles.clauseClickable : undefined}
            onClick={contractId ? handleShowClause : undefined}
            style={{
              cursor: contractId ? 'pointer' : 'default',
              borderRadius: 6,
              padding: contractId ? '4px 6px' : 0,
              margin: contractId ? '-4px -6px 0' : 0,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
              {clauseImpact.clauseTitle}
              {contractId && (
                <span style={{
                  fontSize: 10, color: '#9ca3af',
                  transform: showClauseText ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                  display: 'inline-block',
                }}>&#9660;</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
              {clauseImpact.impact}
            </div>
          </div>
          {clauseTextLoading && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Klausel wird geladen...</div>
          )}
          {showClauseText && clauseText && (
            <div style={{
              marginTop: 6, padding: '10px 12px',
              background: '#f8fafc', borderRadius: 6,
              border: '1px solid #e2e8f0',
              fontSize: 12, color: '#334155',
              lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {clauseText}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {clauseImpact.suggestedChange && (
              <button
                className={styles.btnAction}
                onClick={() => setShowFix(!showFix)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {showFix ? 'Vorschlag ausblenden' : 'Änderungsvorschlag'}
              </button>
            )}

            {!autoFix && (
              <button
                className={styles.btnAction}
                onClick={handleAutoFix}
                disabled={fixLoading}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: fixLoading ? '#9ca3af' : '#059669',
                  background: fixLoading ? '#f3f4f6' : '#ecfdf5',
                  border: `1px solid ${fixLoading ? '#d1d5db' : '#a7f3d0'}`,
                  borderRadius: 6,
                  cursor: fixLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {fixLoading ? (
                  <>
                    <span style={{
                      width: 12, height: 12, border: '2px solid #d1d5db',
                      borderTopColor: '#059669', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Wird generiert...
                  </>
                ) : (
                  'Klausel automatisch anpassen'
                )}
              </button>
            )}
          </div>

          {/* Fix error */}
          {fixError && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 6, fontSize: 12, color: '#dc2626',
            }}>
              {fixError}
            </div>
          )}

          {/* Stale warning */}
          {autoFix?.staleWarning && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 6, fontSize: 12, color: '#92400e',
            }}>
              {autoFix.staleWarning}
            </div>
          )}

          {/* Simple suggested change (from radar) */}
          {showFix && clauseImpact.suggestedChange && (
            <div style={{
              marginTop: 8,
              padding: '10px 12px',
              background: '#f0fdf4',
              borderRadius: 6,
              border: '1px solid #bbf7d0',
              fontSize: 13,
              color: '#166534',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
              {clauseImpact.suggestedChange}
            </div>
          )}

          {/* Auto-fix result */}
          {autoFix && (
            <div style={{
              marginTop: 12,
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '10px 12px',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>&#9989;</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>
                    Auto-Fix generiert
                  </span>
                  <span style={{
                    fontSize: 11, color: '#047857',
                    background: '#d1fae5', padding: '1px 8px',
                    borderRadius: 10, fontWeight: 500,
                  }}>
                    {CHANGE_TYPE_LABELS[autoFix.changeType] || autoFix.changeType}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      color: '#6b7280', background: '#fff',
                      border: '1px solid #d1d5db', borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    {showDiff ? 'Nur neuer Text' : 'Diff anzeigen'}
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      color: copied ? '#059669' : '#2563eb',
                      background: copied ? '#ecfdf5' : '#eff6ff',
                      border: `1px solid ${copied ? '#a7f3d0' : '#bfdbfe'}`,
                      borderRadius: 4, cursor: 'pointer',
                    }}
                  >
                    {copied ? 'Kopiert!' : 'Kopieren'}
                  </button>
                  {!applied ? (
                    <button
                      className={styles.btnPrimary}
                      onClick={handleApply}
                      disabled={applyLoading}
                      style={{
                        padding: '3px 10px', fontSize: 11, fontWeight: 600,
                        color: '#fff',
                        background: applyLoading ? '#9ca3af' : '#059669',
                        border: 'none', borderRadius: 4,
                        cursor: applyLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {applyLoading ? 'Wird gespeichert...' : 'Übernehmen'}
                    </button>
                  ) : (
                    <span style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      color: '#059669', background: '#ecfdf5',
                      border: '1px solid #a7f3d0', borderRadius: 4,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      &#10003; Übernommen
                    </span>
                  )}
                </div>
              </div>

              {/* Reasoning + Legal basis */}
              <div style={{ padding: '10px 12px', background: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
                <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.5 }}>
                  {autoFix.reasoning}
                </div>
                <div style={{ fontSize: 11, color: '#047857', marginTop: 4, fontStyle: 'italic' }}>
                  Rechtsgrundlage: {autoFix.legalBasis}
                </div>
              </div>

              {/* Diff or plain text */}
              <div style={{
                padding: '12px',
                background: '#fff',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {showDiff ? (
                  autoFix.diffs.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        background: d.type === 'add' ? '#dcfce7'
                          : d.type === 'remove' ? '#fee2e2' : 'transparent',
                        textDecoration: d.type === 'remove' ? 'line-through' : 'none',
                        color: d.type === 'add' ? '#166534'
                          : d.type === 'remove' ? '#991b1b' : '#111827',
                      }}
                    >
                      {d.text}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#166534' }}>{autoFix.fixedText}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS keyframe for spinner */}
      {fixLoading && (
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      )}
    </div>
  );
};

// D3: Feedback buttons component
const FeedbackButtons: React.FC<{
  alertId: string;
  existingFeedback?: { useful: boolean; comment?: string; feedbackAt: string };
}> = ({ alertId, existingFeedback }) => {
  const [feedback, setFeedback] = useState<boolean | null>(existingFeedback?.useful ?? null);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = useCallback(async (useful: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/legal-pulse-v2/legal-alerts/${alertId}/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useful }),
      });
      if (res.ok) setFeedback(useful);
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  }, [alertId]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: 12, color: '#9ca3af' }}>War dieser Alert hilfreich?</span>
      <button
        onClick={() => handleFeedback(true)}
        disabled={submitting || feedback !== null}
        style={{
          padding: '2px 8px', fontSize: 12, borderRadius: 4,
          border: '1px solid #d1d5db', cursor: feedback !== null ? 'default' : 'pointer',
          background: feedback === true ? '#ecfdf5' : '#fff',
          color: feedback === true ? '#059669' : '#6b7280',
          opacity: submitting ? 0.5 : 1,
        }}
      >
        &#128077; Ja
      </button>
      <button
        onClick={() => handleFeedback(false)}
        disabled={submitting || feedback !== null}
        style={{
          padding: '2px 8px', fontSize: 12, borderRadius: 4,
          border: '1px solid #d1d5db', cursor: feedback !== null ? 'default' : 'pointer',
          background: feedback === false ? '#fef2f2' : '#fff',
          color: feedback === false ? '#dc2626' : '#6b7280',
          opacity: submitting ? 0.5 : 1,
        }}
      >
        &#128078; Nein
      </button>
      {feedback !== null && (
        <span style={{ fontSize: 11, color: '#9ca3af' }}>Danke!</span>
      )}
    </div>
  );
};

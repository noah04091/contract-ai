import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PulseV2Finding, PulseV2Clause } from '../../types/pulseV2';
import { ClauseHistory } from './ClauseHistory';
import { getLegalReferenceUrl } from '../../utils/legalLinks';

const SaveClauseModal = lazy(() => import('../LegalLens/SaveClauseModal'));
import styles from '../../styles/PulseV2.module.css';

interface PulseFindingSummary {
  title: string;
  description: string;
  severity: string;
  type: string;
  legalBasis?: string;
  affectedText?: string;
  clauseTitle?: string;
}

interface FindingCardProps {
  finding: PulseV2Finding;
  findingIndex: number;
  clause?: PulseV2Clause;
  contractId?: string;
  resultId?: string;
  disabled?: boolean;
  /** All actionable findings (critical/high/medium) — passed to optimizer for context */
  allFindings?: PulseFindingSummary[];
  onFindingStatusChange?: (findingIndex: number, status: 'open' | 'resolved' | 'dismissed', comment?: string) => void;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Kritisch' },
  high: { color: '#ea580c', bg: '#fff7ed', label: 'Hoch' },
  medium: { color: '#d97706', bg: '#fffbeb', label: 'Mittel' },
  low: { color: '#2563eb', bg: '#eff6ff', label: 'Niedrig' },
  info: { color: '#6b7280', bg: '#f9fafb', label: 'Info' },
};

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  risk: { icon: '⚠️', label: 'Risiko' },
  compliance: { icon: '\ud83d\udcdc', label: 'Compliance' },
  opportunity: { icon: '\ud83d\udca1', label: 'Chance' },
  information: { icon: 'ℹ️', label: 'Information' },
};

const ENFORCEABILITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  valid: { color: '#059669', bg: '#ecfdf5', label: 'Wirksam' },
  questionable: { color: '#d97706', bg: '#fffbeb', label: 'Fraglich' },
  likely_invalid: { color: '#dc2626', bg: '#fef2f2', label: 'Wahrsch. unwirksam' },
  unknown: { color: '#6b7280', bg: '#f9fafb', label: 'Unbekannt' },
};

export const FindingCard: React.FC<FindingCardProps> = ({ finding, findingIndex, clause, contractId, resultId, disabled, allFindings, onFindingStatusChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const navigate = useNavigate();
  const severity = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const typeInfo = TYPE_CONFIG[finding.type] || TYPE_CONFIG.information;
  const hasHistory = clause?.history && clause.history.length > 1;
  const isActionable = !disabled && contractId && (finding.severity === 'critical' || finding.severity === 'high' || finding.severity === 'medium');
  const [quickFix, setQuickFix] = useState<{ fixedText: string; reasoning: string; legalBasis: string; diffs?: { type: string; value: string }[] } | null>(null);
  const [quickFixLoading, setQuickFixLoading] = useState(false);
  const [quickFixError, setQuickFixError] = useState<string | null>(null);
  const [fixApplied, setFixApplied] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [clauseSaved, setClauseSaved] = useState(false);
  const [commentText, setCommentText] = useState(finding.userComment || '');
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const reminderRef = useRef<HTMLDivElement>(null);

  const userStatus = finding.userStatus || 'open';
  const isResolved = userStatus === 'resolved';
  const isDismissed = userStatus === 'dismissed';

  // Close reminder dropdown on click outside
  useEffect(() => {
    if (!reminderOpen) return;
    const handler = (e: MouseEvent) => {
      if (reminderRef.current && !reminderRef.current.contains(e.target as Node)) {
        setReminderOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [reminderOpen]);

  const handleQuickFix = useCallback(async () => {
    if (!finding.affectedText || quickFixLoading) return;
    setQuickFixLoading(true);
    setQuickFixError(null);
    try {
      const res = await fetch('/api/legal-pulse-v2/quick-fix', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affectedText: finding.affectedText,
          findingTitle: finding.title,
          findingDescription: finding.description,
          legalBasis: finding.legalBasis || '',
          severity: finding.severity,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 429) {
          setQuickFixError('Limit erreicht — maximal 15 Quick-Fixes pro Stunde. Später erneut versuchen.');
        } else {
          setQuickFixError(err.error || 'Fehler beim Generieren');
        }
        return;
      }
      const data = await res.json();
      setQuickFix(data);
    } catch {
      setQuickFixError('Netzwerkfehler');
    } finally {
      setQuickFixLoading(false);
    }
  }, [finding, quickFixLoading]);

  const handleCreateReminder = useCallback(async (daysFromNow: number) => {
    if (!contractId) return;
    setReminderLoading(true);
    try {
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + daysFromNow);
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          title: `Legal Pulse: ${finding.title}`,
          description: `${severity.label} — ${finding.description}${finding.legalBasis ? `\nRechtsgrundlage: ${finding.legalBasis}` : ''}`,
          date: reminderDate.toISOString(),
          type: 'LEGAL_PULSE_REMINDER',
          severity: finding.severity === 'critical' ? 'critical' : finding.severity === 'high' ? 'warning' : 'info',
        }),
      });
      if (res.ok) {
        setReminderSent(true);
        setReminderOpen(false);
      }
    } catch (err) {
      console.error('[PulseV2] Reminder creation failed:', err);
    } finally {
      setReminderLoading(false);
    }
  }, [contractId, finding, severity.label]);

  const handleSaveComment = useCallback(async () => {
    if (!resultId || commentText === (finding.userComment || '')) return;
    setCommentSaving(true);
    try {
      const res = await fetch(`/api/legal-pulse-v2/results/${resultId}/findings/${findingIndex}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      });
      if (!res.ok) console.error('[PulseV2] Comment save failed');
    } catch (err) {
      console.error('[PulseV2] Comment save error:', err);
    } finally {
      setCommentSaving(false);
    }
  }, [resultId, findingIndex, commentText, finding.userComment]);

  // Estimated score improvement for visual feedback
  const scoreBoost = fixApplied
    ? finding.severity === 'critical' ? 8 : finding.severity === 'high' ? 5 : 3
    : 0;

  return (
    <div
      className={styles.findingCard}
      style={{
        border: (fixApplied || isResolved) ? '1px solid #bbf7d0' : isDismissed ? '1px solid #e5e7eb' : `1px solid ${severity.color}22`,
        borderLeft: (fixApplied || isResolved) ? '4px solid #22c55e' : isDismissed ? '4px solid #d1d5db' : `4px solid ${severity.color}`,
        borderRadius: 8,
        background: (fixApplied || isResolved) ? '#f0fdf4' : isDismissed ? '#f9fafb' : '#fff',
        marginBottom: 12,
        overflow: 'hidden',
        opacity: isDismissed ? 0.6 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        onClick={() => !disabled && setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>{typeInfo.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: (fixApplied || isResolved) ? '#059669' : isDismissed ? '#9ca3af' : severity.color,
              background: (fixApplied || isResolved) ? '#ecfdf5' : isDismissed ? '#f3f4f6' : severity.bg,
              padding: '2px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
            }}>
              {fixApplied ? '✔ Verbessert' : isResolved ? '✔ Erledigt' : isDismissed ? '— Nicht relevant' : severity.label}
            </span>
            <span style={{
              fontSize: 11,
              color: '#6b7280',
              background: '#f3f4f6',
              padding: '2px 8px',
              borderRadius: 4,
            }}>
              {typeInfo.label}
            </span>
            {finding.enforceability && finding.enforceability !== 'unknown' && (() => {
              const enf = ENFORCEABILITY_CONFIG[finding.enforceability];
              return (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: enf.color,
                  background: enf.bg,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: `1px solid ${enf.color}22`,
                }}>
                  {enf.label}
                </span>
              );
            })()}
            {finding.confidence < 80 && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {finding.confidence}% Konfidenz
              </span>
            )}
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            marginTop: 4,
            color: (fixApplied || isResolved || isDismissed) ? '#6b7280' : '#111827',
            textDecoration: (fixApplied || isResolved) ? 'line-through' : 'none',
          }}>
            {finding.title}
            {fixApplied && scoreBoost > 0 && (
              <span style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#059669',
                textDecoration: 'none',
                display: 'inline-block',
              }}>
                +{scoreBoost} Score
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
            {finding.description}
          </div>
        </div>
        {!disabled && (
          <span style={{ fontSize: 14, color: '#9ca3af', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            &#9660;
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className={styles.expandContent} style={{
          padding: '0 16px 16px',
          borderTop: '1px solid #f3f4f6',
          marginTop: -4,
          paddingTop: 12,
        }}>
          {/* Reasoning */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Begründung
            </div>
            <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>
              {finding.reasoning}
            </div>
          </div>

          {/* Affected Text */}
          {finding.affectedText && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                Betroffener Text
                {finding.affectedTextVerified === true && (
                  <span style={{
                    fontSize: 10,
                    color: '#15803d',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '1px 5px',
                    borderRadius: 4,
                    fontWeight: 500,
                  }}>
                    {finding.affectedTextApproximate ? 'sinngemäß verifiziert' : 'verifiziert'}
                  </span>
                )}
                {finding.affectedTextVerified === false && (
                  <span style={{
                    fontSize: 10,
                    color: '#92400e',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    padding: '1px 5px',
                    borderRadius: 4,
                    fontWeight: 500,
                  }}>
                    sinngemäß erkannt
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                background: finding.affectedTextVerified === false ? '#fffbeb' : '#f9fafb',
                padding: '8px 12px',
                borderRadius: 6,
                borderLeft: `3px solid ${finding.affectedTextVerified === false ? '#fde68a' : '#d1d5db'}`,
                fontStyle: 'italic',
              }}>
                &ldquo;{finding.affectedText}&rdquo;
              </div>
            </div>
          )}

          {/* Legal Basis */}
          {finding.legalBasis && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Rechtsgrundlage
              </div>
              {(() => {
                const ref = getLegalReferenceUrl(finding.legalBasis!);
                return ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 13,
                      color: '#1e40af',
                      background: '#eff6ff',
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {ref.text}
                    <span style={{ fontSize: 11, opacity: 0.6 }}>↗</span>
                  </a>
                ) : (
                  <div style={{
                    fontSize: 13,
                    color: '#1e40af',
                    background: '#eff6ff',
                    padding: '4px 8px',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}>
                    {finding.legalBasis}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Clause Context */}
          {clause && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                Klausel: {clause.sectionNumber} — {clause.title}
                {hasHistory && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '1px solid #a7f3d0',
                      cursor: 'pointer',
                    }}
                  >
                    v{clause.history!.length} — Historie anzeigen
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                Kategorie: {finding.category}
                {finding.isIntentional && ' • Vermutlich absichtlich so formuliert'}
              </div>
            </div>
          )}

          {/* Clause History Modal */}
          {showHistory && contractId && clause && (
            <ClauseHistory
              contractId={contractId}
              clauseId={clause.id}
              onClose={() => setShowHistory(false)}
            />
          )}

          {/* ═══ Action Buttons ═══ */}
          {isActionable && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid #f3f4f6',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              {/* Quick Fix */}
              {finding.affectedText && !quickFix && !fixApplied && (
                <button
                  className={styles.btnAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickFix();
                  }}
                  disabled={quickFixLoading}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: quickFixLoading ? '#9ca3af' : '#059669',
                    background: quickFixLoading ? '#f9fafb' : '#ecfdf5',
                    border: `1px solid ${quickFixLoading ? '#e5e7eb' : '#a7f3d0'}`,
                    borderRadius: 6,
                    cursor: quickFixLoading ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {quickFixLoading ? (
                    <><span style={{ animation: 'pulse 1s ease-in-out infinite' }}>&#9889;</span> Wird generiert...</>
                  ) : (
                    <>&#9889; Quick Fix</>
                  )}
                </button>
              )}

              {fixApplied && (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  &#10003; Klausel verbessert &middot; Risiko reduziert
                </span>
              )}

              {/* Optimize (full) */}
              <button
                className={styles.btnAction}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/optimizer?contractId=${contractId}`, {
                    state: {
                      source: 'legal_pulse_v2',
                      pulseFindings: allFindings || [{
                        title: finding.title,
                        description: finding.description,
                        severity: finding.severity,
                        type: finding.type,
                        legalBasis: finding.legalBasis,
                        affectedText: finding.affectedText,
                        clauseTitle: clause?.title,
                      }],
                    },
                  });
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#7c3aed',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Ganzen Vertrag optimieren &#8594;
              </button>

              {/* Save to Clause Library */}
              {(finding.affectedText || quickFix) && !clauseSaved && (
                <button
                  className={styles.btnAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSaveModal(true);
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0369a1',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  &#128218; In Bibliothek
                </button>
              )}
              {clauseSaved && (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  &#10003; Gespeichert
                </span>
              )}

              {/* Remind */}
              {!reminderSent ? (
                <div ref={reminderRef} style={{ position: 'relative' }}>
                  <button
                    className={styles.btnAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      setReminderOpen(!reminderOpen);
                    }}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0369a1',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    &#128276; Erinnern
                  </button>

                  {/* Quick date picker */}
                  {reminderOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: 6,
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      minWidth: 160,
                    }}>
                      {[
                        { days: 3, label: 'In 3 Tagen' },
                        { days: 7, label: 'In 1 Woche' },
                        { days: 14, label: 'In 2 Wochen' },
                        { days: 30, label: 'In 1 Monat' },
                      ].map(opt => (
                        <button
                          key={opt.days}
                          className={styles.dropdownOption}
                          disabled={reminderLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateReminder(opt.days);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            color: '#374151',
                            background: reminderLoading ? '#f9fafb' : '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: reminderLoading ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span style={{
                  fontSize: 12,
                  color: '#059669',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  &#10003; Erinnerung erstellt
                </span>
              )}
            </div>
          )}

          {/* ═══ Resolve/Dismiss + Edit ═══ */}
          {resultId && !disabled && (
            <div style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid #f3f4f6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {!isResolved && !isDismissed && (
                  <>
                    <button
                      className={styles.btnAction}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFindingStatusChange?.(findingIndex, 'resolved');
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#059669',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      &#10003; Erledigt
                    </button>
                    <button
                      className={styles.btnAction}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFindingStatusChange?.(findingIndex, 'dismissed');
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#6b7280',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      &#10005; Nicht relevant
                    </button>
                    <button
                      className={styles.btnIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentOpen(!commentOpen);
                      }}
                      title="Notiz hinzufügen"
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: `1px solid ${commentOpen || finding.userComment ? '#bfdbfe' : '#d1d5db'}`,
                        background: commentOpen || finding.userComment ? '#eff6ff' : '#fff',
                        cursor: 'pointer', fontSize: 13, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: finding.userComment ? '#3b82f6' : '#9ca3af',
                      }}
                    >
                      &#9998;
                    </button>
                  </>
                )}
                {(isResolved || isDismissed) && (
                  <>
                    <button
                      className={styles.btnSecondary}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFindingStatusChange?.(findingIndex, 'open');
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#6b7280',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      &#x21A9; Wieder öffnen
                    </button>
                    <button
                      className={styles.btnIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentOpen(!commentOpen);
                      }}
                      title="Notiz hinzufügen"
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: `1px solid ${commentOpen || finding.userComment ? '#bfdbfe' : '#d1d5db'}`,
                        background: commentOpen || finding.userComment ? '#eff6ff' : '#fff',
                        cursor: 'pointer', fontSize: 13, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: finding.userComment ? '#3b82f6' : '#9ca3af',
                      }}
                    >
                      &#9998;
                    </button>
                    {finding.userStatusAt && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {isResolved ? 'Erledigt' : 'Ausgeblendet'} am {new Date(finding.userStatusAt).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Saved comment display */}
              {finding.userComment && !commentOpen && (
                <div
                  onClick={(e) => { e.stopPropagation(); setCommentOpen(true); }}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: '#6b7280',
                    fontStyle: 'italic',
                    cursor: 'pointer',
                  }}
                >
                  &#9998; {finding.userComment}
                </div>
              )}

              {/* Inline comment input */}
              {commentOpen && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onBlur={() => { handleSaveComment(); setCommentOpen(false); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveComment(); setCommentOpen(false); }
                      if (e.key === 'Escape') { setCommentText(finding.userComment || ''); setCommentOpen(false); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    placeholder="Notiz hinzufügen..."
                    maxLength={500}
                    style={{
                      flex: 1,
                      padding: '5px 10px',
                      fontSize: 12,
                      color: '#374151',
                      background: '#fff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      outline: 'none',
                    }}
                  />
                  {commentSaving && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>...</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Fix Error */}
          {quickFixError && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 13,
              color: '#dc2626',
            }}>
              {quickFixError}
            </div>
          )}

          {/* ═══ Quick Fix Result ═══ */}
          {quickFix && !fixApplied && (
            <div style={{
              marginTop: 14,
              padding: 16,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#15803d',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                &#10024; Verbesserungsvorschlag
              </div>

              {/* Original vs Fixed */}
              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 4, textTransform: 'uppercase' }}>
                    Aktuell (problematisch)
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#7f1d1d',
                    background: '#fef2f2',
                    padding: '8px 12px',
                    borderRadius: 6,
                    borderLeft: '3px solid #fecaca',
                    lineHeight: 1.5,
                  }}>
                    {finding.affectedText}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginBottom: 4, textTransform: 'uppercase' }}>
                    Verbessert (rechtssicher)
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#14532d',
                    background: '#dcfce7',
                    padding: '8px 12px',
                    borderRadius: 6,
                    borderLeft: '3px solid #86efac',
                    lineHeight: 1.5,
                  }}>
                    {quickFix.fixedText}
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div style={{
                fontSize: 12,
                color: '#374151',
                marginBottom: 8,
                lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 600 }}>Warum besser: </span>
                {quickFix.reasoning}
              </div>

              {/* Legal Basis */}
              {quickFix.legalBasis && (() => {
                const ref = getLegalReferenceUrl(quickFix.legalBasis);
                return ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 12,
                      color: '#1e40af',
                      background: '#eff6ff',
                      padding: '3px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                      marginBottom: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {ref.text}
                    <span style={{ fontSize: 10, opacity: 0.6 }}>↗</span>
                  </a>
                ) : (
                  <div style={{
                    fontSize: 12,
                    color: '#1e40af',
                    background: '#eff6ff',
                    padding: '3px 8px',
                    borderRadius: 4,
                    display: 'inline-block',
                    marginBottom: 12,
                  }}>
                    {quickFix.legalBasis}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  className={styles.btnPrimary}
                  onClick={async (e) => {
                    e.stopPropagation();
                    // Persist fix to backend if we have context
                    if (resultId && finding.clauseId) {
                      try {
                        const res = await fetch('/api/legal-pulse-v2/apply-quick-fix', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            resultId,
                            clauseId: finding.clauseId,
                            fixedText: quickFix.fixedText,
                            reasoning: quickFix.reasoning,
                            legalBasis: quickFix.legalBasis,
                            findingTitle: finding.title,
                          }),
                        });
                        if (res.ok) {
                          setFixApplied(true);
                          return;
                        }
                      } catch {
                        // Backend unreachable — don't pretend it was saved
                      }
                    }
                    // Backend failed or no context — copy to clipboard as fallback
                    try { await navigator.clipboard.writeText(quickFix.fixedText); } catch { /* clipboard not available */ }
                    setQuickFixError('Verbesserung konnte nicht gespeichert werden. Der Text wurde in die Zwischenablage kopiert.');
                  }}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                    background: '#059669',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                  }}
                >
                  &#10003; Anwenden &amp; Speichern
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickFix(null);
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    color: '#6b7280',
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save to Clause Library Modal */}
      {showSaveModal && (
        <Suspense fallback={null}>
          <SaveClauseModal
            clauseText={quickFix ? quickFix.fixedText : (finding.affectedText || '')}
            sourceContractId={contractId}
            sourceClauseId={clause?.id}
            originalAnalysis={{
              riskLevel: finding.severity === 'critical' || finding.severity === 'high' ? 'high' : finding.severity === 'medium' ? 'medium' : 'low',
              riskScore: finding.severity === 'critical' ? 90 : finding.severity === 'high' ? 75 : finding.severity === 'medium' ? 55 : 30,
              mainRisk: finding.title,
            }}
            onClose={() => setShowSaveModal(false)}
            onSaved={() => {
              setShowSaveModal(false);
              setClauseSaved(true);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

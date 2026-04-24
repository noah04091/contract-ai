import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PulseV2Action } from '../../types/pulseV2';
import styles from '../../styles/PulseV2.module.css';

interface ActionItemProps {
  action: PulseV2Action;
  contractId?: string;
  resultId?: string;
  contractNames?: Map<string, string>;
  contractLastAnalysisMap?: Map<string, string>;
  onStatusChange?: (actionId: string, status: 'open' | 'done' | 'dismissed', resultId?: string) => void;
  onCommentSave?: (actionId: string, comment: string) => void;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string; deadline: string }> = {
  now: { color: '#dc2626', bg: '#fef2f2', label: 'Diese Woche handeln', icon: '\u26a1', deadline: 'Innerhalb 7 Tagen' },
  plan: { color: '#d97706', bg: '#fffbeb', label: 'Empfohlen', icon: '\ud83d\udcc5', deadline: 'Bei nächster Vertragsprüfung' },
  watch: { color: '#6b7280', bg: '#f9fafb', label: 'Nur beobachten', icon: '\ud83d\udc41\ufe0f', deadline: 'Kein Handlungsbedarf' },
};

/**
 * Format "vor X Tagen" from an ISO date string.
 */
function formatAgeDe(iso: string): { text: string; days: number } {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return { text: 'heute erstellt', days: 0 };
  if (days === 1) return { text: 'erstellt vor 1 Tag', days };
  if (days < 30) return { text: `erstellt vor ${days} Tagen`, days };
  const months = Math.floor(days / 30);
  if (months === 1) return { text: 'erstellt vor 1 Monat', days };
  return { text: `erstellt vor ${months} Monaten`, days };
}

/**
 * Detect if an action was triggered by legal changes (Gesetz/BGH/DSGVO/Urteil etc.).
 */
function isLegallyMotivated(action: PulseV2Action): boolean {
  const haystack = `${action.title || ''} ${action.description || ''} ${action.nextStep || ''}`.toLowerCase();
  return /\b(gesetz|gesetzes|bgh|dsgvo|urteil|bag|eugh|bverfg|§\s*\d|paragraph)\b/i.test(haystack);
}

/**
 * Detect impact type from text and return icon
 */
function getImpactIcon(impact: string): string {
  const lower = impact.toLowerCase();
  if (/kosten|geld|preis|gebühr|zahlung|finanziell|bußgeld/i.test(lower)) return '\ud83d\udcb0';
  if (/risiko|haftung|schaden|klage/i.test(lower)) return '\u2696\ufe0f';
  if (/frist|ablauf|termin|deadline|verlängerung/i.test(lower)) return '\u23f1\ufe0f';
  if (/dsgvo|datenschutz|compliance/i.test(lower)) return '\ud83d\udee1\ufe0f';
  if (/verbesser|optimier|potential|chance/i.test(lower)) return '\ud83d\udca1';
  return '\ud83d\udccc';
}

export const ActionItem: React.FC<ActionItemProps> = ({ action, contractId, resultId, contractNames, contractLastAnalysisMap, onStatusChange, onCommentSave }) => {
  const navigate = useNavigate();
  const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.watch;
  const isDone = action.status === 'done';
  const isDismissed = action.status === 'dismissed';
  const [commentText, setCommentText] = useState(action.userComment || '');
  const [savedComment, setSavedComment] = useState(action.userComment || '');
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  // Sync local state when parent props change (after server response)
  useEffect(() => {
    setSavedComment(action.userComment || '');
    if (!commentOpen) setCommentText(action.userComment || '');
  }, [action.userComment, commentOpen]);

  const handleSaveComment = useCallback(async () => {
    if (commentText === savedComment) return;
    setCommentSaving(true);
    try {
      if (onCommentSave) {
        await onCommentSave(action.id, commentText);
      } else if (resultId) {
        const res = await fetch(`/api/legal-pulse-v2/results/${resultId}/actions/${action.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: commentText }),
        });
        if (!res.ok) throw new Error('Save failed');
      }
      setSavedComment(commentText);
    } catch (err) {
      console.error('[PulseV2] Action comment save error:', err);
      setCommentText(savedComment);
    } finally {
      setCommentSaving(false);
    }
  }, [action.id, savedComment, commentText, onCommentSave, resultId]);

  // Resolve contract ID: relatedContracts may contain filenames (old data) instead of real IDs.
  // Build reverse lookup: name → contractId to handle both cases.
  const resolveContractId = (id: string): string | null => {
    if (!contractNames) return null;
    // If the ID is already a valid contractId in the map, use it directly
    if (contractNames.has(id)) return id;
    // Otherwise try reverse lookup: maybe `id` is a filename — find matching contractId by name
    for (const [cId, name] of contractNames.entries()) {
      if (name === id || id.includes(name) || name.includes(id)) return cId;
    }
    return null;
  };

  // Derive "age" from the contract's last analysis (best proxy for when this action was created).
  // Uses relatedContracts[0] → contractLastAnalysisMap lookup.
  const ageInfo = (() => {
    if (!contractLastAnalysisMap || !action.relatedContracts || action.relatedContracts.length === 0) return null;
    const rawId = action.relatedContracts[0];
    const resolvedId = resolveContractId(rawId) || rawId;
    const lastAnalysis = contractLastAnalysisMap.get(resolvedId);
    if (!lastAnalysis) return null;
    return formatAgeDe(lastAnalysis);
  })();

  const isStagnating = !!ageInfo && ageInfo.days > 30 && action.priority === 'now' && action.status === 'open';
  const legallyMotivated = isLegallyMotivated(action);

  return (
    <div className={styles.actionCard} style={{
      padding: 16,
      background: isDone ? '#f0fdf4' : isDismissed ? '#f9fafb' : '#fff',
      border: `1px solid ${isDone ? '#bbf7d0' : isDismissed ? '#e5e7eb' : priority.color + '33'}`,
      borderLeft: `4px solid ${isDone ? '#22c55e' : isDismissed ? '#d1d5db' : priority.color}`,
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      opacity: isDismissed ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{priority.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: priority.color,
              background: priority.bg,
              padding: '2px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
            }}>
              {priority.label}
            </span>
            {/* Deadline */}
            <span style={{ fontSize: 11, color: action.priority === 'now' ? '#dc2626' : '#9ca3af', fontWeight: action.priority === 'now' ? 600 : 400 }}>
              {priority.deadline}
            </span>
            {/* Legally motivated badge */}
            {legallyMotivated && (
              <span
                title="Diese Empfehlung bezieht sich auf ein Gesetz, Urteil oder eine rechtliche Norm."
                style={{
                  fontSize: 10, fontWeight: 700, color: '#1d4ed8',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  padding: '2px 6px', borderRadius: 4,
                  letterSpacing: '0.3px', textTransform: 'uppercase',
                  cursor: 'help',
                }}
              >
                &#128220; Gesetzlich
              </span>
            )}
            {/* Age */}
            {ageInfo && (
              <span
                title="Geschätzt aus der letzten Vertragsanalyse, aus der diese Empfehlung stammt."
                style={{ fontSize: 11, color: '#9ca3af', cursor: 'help' }}
              >
                &middot; {ageInfo.text}
              </span>
            )}
            {/* Confidence */}
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {action.confidence}% Konfidenz
            </span>
            {isDone && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Erledigt</span>}
          </div>

          {/* Stagnation warning */}
          {isStagnating && ageInfo && (
            <div style={{
              marginTop: 4,
              padding: '6px 10px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 6,
              fontSize: 12,
              color: '#92400e',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>&#9888;&#65039;</span>
              <span>
                Diese dringende Aufgabe ist seit {ageInfo.days} Tagen offen. Bitte priorisieren.
              </span>
            </div>
          )}

          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: isDone ? '#16a34a' : '#111827',
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            {action.title}
          </div>

          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
            {action.description}
          </div>

          {/* Next Step */}
          {action.nextStep && !isDone && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              background: '#f0f9ff',
              borderRadius: 6,
              fontSize: 13,
              color: '#1e40af',
              borderLeft: '3px solid #3b82f6',
            }}>
              <span style={{ fontWeight: 600 }}>Nächster Schritt: </span>
              {action.nextStep}
            </div>
          )}

          {/* Impact — with icon */}
          {action.estimatedImpact && (
            <div style={{
              fontSize: 12,
              color: '#6b7280',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{getImpactIcon(action.estimatedImpact)}</span>
              {action.estimatedImpact}
            </div>
          )}

          {/* Related contracts — clickable links to Pulse detail */}
          {action.relatedContracts && action.relatedContracts.length > 0 && contractNames && !contractId && (
            <div style={{
              marginTop: 8,
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Betrifft:</span>
              {action.relatedContracts.map((id) => {
                const resolvedId = resolveContractId(id);
                const name = (resolvedId && contractNames.get(resolvedId)) || contractNames.get(id) || id;
                return (
                  <button
                    key={id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (resolvedId) {
                        navigate(`/pulse/${resolvedId}`);
                      }
                    }}
                    style={{
                      fontSize: 11, fontWeight: 500,
                      color: resolvedId ? '#3b82f6' : '#9ca3af',
                      background: resolvedId ? '#eff6ff' : '#f9fafb',
                      border: `1px solid ${resolvedId ? '#bfdbfe' : '#e5e7eb'}`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      cursor: resolvedId ? 'pointer' : 'default',
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Buttons — open actions: checkmark + dismiss + edit */}
        {onStatusChange && !isDismissed && !isDone && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              className={styles.btnIcon}
              onClick={() => onStatusChange(action.id, 'done', action.resultId)}
              title="Als erledigt markieren"
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              &#10003;
            </button>
            <button
              className={styles.btnIcon}
              onClick={() => onStatusChange(action.id, 'dismissed', action.resultId)}
              title="Ausblenden"
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
              }}
            >
              &#10005;
            </button>
            <button
              className={styles.btnIcon}
              onClick={() => setCommentOpen(!commentOpen)}
              title="Notiz hinzufügen"
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${commentOpen || savedComment ? '#bfdbfe' : '#d1d5db'}`,
                background: commentOpen || savedComment ? '#eff6ff' : '#fff',
                cursor: 'pointer', fontSize: 13, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: savedComment ? '#3b82f6' : '#9ca3af',
              }}
            >
              &#9998;
            </button>
          </div>
        )}
        {/* Reactivate + edit for done/dismissed actions */}
        {onStatusChange && (isDismissed || isDone) && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              className={styles.btnSecondary}
              onClick={() => onStatusChange(action.id, 'open', action.resultId)}
              title="Wieder öffnen"
              style={{
                height: 28, borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                color: '#6b7280', padding: '0 10px',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              &#x21A9; Aktivieren
            </button>
            <button
              className={styles.btnIcon}
              onClick={() => setCommentOpen(!commentOpen)}
              title="Notiz hinzufügen"
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${commentOpen || savedComment ? '#bfdbfe' : '#d1d5db'}`,
                background: commentOpen || savedComment ? '#eff6ff' : '#fff',
                cursor: 'pointer', fontSize: 13, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: savedComment ? '#3b82f6' : '#9ca3af',
              }}
            >
              &#9998;
            </button>
          </div>
        )}
      </div>

      {/* Saved comment display (when not editing) */}
      {savedComment && !commentOpen && (
        <div
          onClick={() => setCommentOpen(true)}
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#6b7280',
            fontStyle: 'italic',
            cursor: 'pointer',
            paddingLeft: 28,
          }}
        >
          &#9998; {savedComment}
        </div>
      )}

      {/* Inline comment input (when editing) */}
      {commentOpen && (
        <div style={{
          marginTop: 8,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          paddingLeft: 28,
        }}>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onBlur={() => { handleSaveComment(); setCommentOpen(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSaveComment(); setCommentOpen(false); }
              if (e.key === 'Escape') { setCommentText(savedComment || ''); setCommentOpen(false); }
            }}
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
  );
};

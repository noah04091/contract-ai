import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PulseV2Action } from '../../types/pulseV2';

interface ActionItemProps {
  action: PulseV2Action;
  contractId?: string;
  onStatusChange?: (actionId: string, status: 'open' | 'done' | 'dismissed') => void;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  now: { color: '#dc2626', bg: '#fef2f2', label: 'Sofort', icon: '\u26a1' },
  plan: { color: '#d97706', bg: '#fffbeb', label: 'Planen', icon: '\ud83d\udcc5' },
  watch: { color: '#6b7280', bg: '#f9fafb', label: 'Beobachten', icon: '\ud83d\udc41\ufe0f' },
};

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

export const ActionItem: React.FC<ActionItemProps> = ({ action, contractId, onStatusChange }) => {
  const navigate = useNavigate();
  const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.watch;
  const isDone = action.status === 'done';
  const isDismissed = action.status === 'dismissed';

  // Check if action relates to a fixable clause (for deep link)
  const hasOptimizeLink = contractId && !isDone && (
    action.priority === 'now' || action.priority === 'plan'
  );

  return (
    <div style={{
      padding: 16,
      background: isDone ? '#f0fdf4' : isDismissed ? '#f9fafb' : '#fff',
      border: `1px solid ${isDone ? '#bbf7d0' : isDismissed ? '#e5e7eb' : priority.color + '33'}`,
      borderLeft: `4px solid ${isDone ? '#22c55e' : isDismissed ? '#d1d5db' : priority.color}`,
      borderRadius: 8,
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
            {/* Micro-Trust: always show confidence */}
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {action.confidence}% Konfidenz
            </span>
            {isDone && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Erledigt</span>}
          </div>

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

          {/* Deep Link: optimize this clause */}
          {hasOptimizeLink && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/optimize/${contractId}`);
              }}
              style={{
                marginTop: 10,
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
              Klausel optimieren &#8594;
            </button>
          )}
        </div>

        {/* Status Buttons */}
        {onStatusChange && !isDismissed && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {action.status !== 'done' && (
              <button
                onClick={() => onStatusChange(action.id, 'done')}
                title="Als erledigt markieren"
                style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                &#10003;
              </button>
            )}
            <button
              onClick={() => onStatusChange(action.id, action.status === 'dismissed' ? 'open' : 'dismissed')}
              title="Ausblenden"
              style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
              }}
            >
              &#10005;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

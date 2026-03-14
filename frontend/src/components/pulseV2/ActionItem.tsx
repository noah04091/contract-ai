import React from 'react';
import type { PulseV2Action } from '../../types/pulseV2';

interface ActionItemProps {
  action: PulseV2Action;
  onStatusChange?: (actionId: string, status: 'open' | 'done' | 'dismissed') => void;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  now: { color: '#dc2626', bg: '#fef2f2', label: 'Sofort', icon: '\u26a1' },
  plan: { color: '#d97706', bg: '#fffbeb', label: 'Planen', icon: '\ud83d\udcc5' },
  watch: { color: '#6b7280', bg: '#f9fafb', label: 'Beobachten', icon: '\ud83d\udc41\ufe0f' },
};

export const ActionItem: React.FC<ActionItemProps> = ({ action, onStatusChange }) => {
  const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.watch;
  const isDone = action.status === 'done';
  const isDismissed = action.status === 'dismissed';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
            {action.confidence < 85 && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{action.confidence}%</span>
            )}
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

          {/* Impact */}
          {action.estimatedImpact && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              Impact: {action.estimatedImpact}
            </div>
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

import React from 'react';
import type { StageInfo } from '../../types/pulseV2';

interface AnalysisPipelineProps {
  stages: StageInfo[];
  progress: number;
  message: string;
  onCancel?: () => void;
}

const STATUS_ICONS: Record<string, string> = {
  pending: '\u23f3',
  running: '\u2699\ufe0f',
  completed: '\u2705',
  error: '\u274c',
};

export const AnalysisPipeline: React.FC<AnalysisPipelineProps> = ({
  stages,
  progress,
  message,
  onCancel,
}) => {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 24,
      maxWidth: 500,
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Analyse läuft...
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {message}
          {progress > 0 && progress < 100 && (
            <span style={{ marginLeft: 6, fontWeight: 600, color: '#3b82f6' }}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: 8,
        background: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, progress))}%`,
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          borderRadius: 4,
          transition: 'width 0.5s ease-out',
        }} />
      </div>

      {/* Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((stage) => (
          <div
            key={stage.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: stage.status === 'running' ? '#eff6ff' : stage.status === 'completed' ? '#f0fdf4' : stage.status === 'error' ? '#fef2f2' : '#f9fafb',
              border: stage.status === 'running' ? '1px solid #bfdbfe' : stage.status === 'error' ? '1px solid #fecaca' : '1px solid transparent',
            }}
          >
            <span style={{ fontSize: 16 }}>{STATUS_ICONS[stage.status]}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13,
                fontWeight: stage.status === 'running' ? 600 : 400,
                color: stage.status === 'completed' ? '#16a34a' : stage.status === 'running' ? '#2563eb' : stage.status === 'error' ? '#dc2626' : '#6b7280',
              }}>
                {stage.name}
              </div>
              {stage.status === 'running' && stage.detail && (
                <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>
                  {stage.detail}
                </div>
              )}
              {stage.status === 'error' && stage.detail && (
                <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                  {stage.detail}
                </div>
              )}
            </div>
            {stage.status === 'running' && (
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid #3b82f6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            )}
          </div>
        ))}
      </div>

      {onCancel && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              color: '#6b7280',
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

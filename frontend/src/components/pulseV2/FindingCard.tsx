import React, { useState } from 'react';
import type { PulseV2Finding, PulseV2Clause } from '../../types/pulseV2';

interface FindingCardProps {
  finding: PulseV2Finding;
  clause?: PulseV2Clause;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Kritisch' },
  high: { color: '#ea580c', bg: '#fff7ed', label: 'Hoch' },
  medium: { color: '#d97706', bg: '#fffbeb', label: 'Mittel' },
  low: { color: '#2563eb', bg: '#eff6ff', label: 'Niedrig' },
  info: { color: '#6b7280', bg: '#f9fafb', label: 'Info' },
};

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  risk: { icon: '\u26a0\ufe0f', label: 'Risiko' },
  compliance: { icon: '\ud83d\udcdc', label: 'Compliance' },
  opportunity: { icon: '\ud83d\udca1', label: 'Chance' },
  information: { icon: '\u2139\ufe0f', label: 'Information' },
};

export const FindingCard: React.FC<FindingCardProps> = ({ finding, clause }) => {
  const [expanded, setExpanded] = useState(false);
  const severity = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const typeInfo = TYPE_CONFIG[finding.type] || TYPE_CONFIG.information;

  return (
    <div
      style={{
        border: `1px solid ${severity.color}22`,
        borderLeft: `4px solid ${severity.color}`,
        borderRadius: 8,
        background: '#fff',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
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
              color: severity.color,
              background: severity.bg,
              padding: '2px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
            }}>
              {severity.label}
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
            {finding.confidence < 80 && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {finding.confidence}% Konfidenz
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: '#111827' }}>
            {finding.title}
          </div>
          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
            {finding.description}
          </div>
        </div>
        <span style={{ fontSize: 14, color: '#9ca3af', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          &#9660;
        </span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{
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
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Betroffener Text
              </div>
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                background: '#f9fafb',
                padding: '8px 12px',
                borderRadius: 6,
                borderLeft: '3px solid #d1d5db',
                fontStyle: 'italic',
              }}>
                "{finding.affectedText}"
              </div>
            </div>
          )}

          {/* Legal Basis */}
          {finding.legalBasis && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Rechtsgrundlage
              </div>
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
            </div>
          )}

          {/* Clause Context */}
          {clause && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Klausel: {clause.sectionNumber} — {clause.title}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                Kategorie: {finding.category}
                {finding.isIntentional && ' • Vermutlich absichtlich so formuliert'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

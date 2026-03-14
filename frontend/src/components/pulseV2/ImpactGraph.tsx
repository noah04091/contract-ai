import React, { useState } from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';

interface ImpactGraphProps {
  alert: PulseV2LegalAlert;
  onNavigate?: (contractId: string) => void;
}

const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2' },
  high: { color: '#ea580c', bg: '#fff7ed' },
  medium: { color: '#d97706', bg: '#fffbeb' },
  low: { color: '#6b7280', bg: '#f9fafb' },
};

export const ImpactGraph: React.FC<ImpactGraphProps> = ({ alert, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low;
  const hasClauseImpacts = alert.clauseImpacts && alert.clauseImpacts.length > 0;

  return (
    <div style={{
      border: `1px solid ${sev.color}22`,
      borderRadius: 10,
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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
            {alert.lawTitle}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {alert.lawArea} &middot; {alert.contractName}
            {hasClauseImpacts && ` \u00b7 ${alert.clauseImpacts.length} Klausel(n) betroffen`}
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

      {/* Expanded: Impact Graph */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', background: '#fff' }}>
          {/* Flow: Law -> Contract -> Clauses -> Fix */}
          <div style={{ paddingTop: 16 }}>
            {/* Step 1: Law Change */}
            <GraphNode
              icon="&#9878;&#65039;"
              label="Gesetzesänderung"
              title={alert.lawTitle}
              detail={alert.impactSummary}
              color="#6366f1"
            />

            <GraphConnector />

            {/* Step 2: Affected Contract */}
            <GraphNode
              icon="&#128196;"
              label="Betroffener Vertrag"
              title={alert.contractName}
              detail={`${alert.clauseImpacts?.length || 0} Klausel(n) betroffen`}
              color="#0891b2"
              onClick={() => onNavigate?.(alert.contractId)}
              clickable={!!onNavigate}
            />

            {/* Step 3: Affected Clauses */}
            {hasClauseImpacts && alert.clauseImpacts.map((ci, idx) => (
              <React.Fragment key={idx}>
                <GraphConnector />
                <ClauseImpactNode clauseImpact={ci} severity={alert.severity} />
              </React.Fragment>
            ))}

            {/* Step 4: Recommendation */}
            {alert.recommendation && (
              <>
                <GraphConnector />
                <GraphNode
                  icon="&#9989;"
                  label="Empfohlene Aktion"
                  title={alert.recommendation}
                  color="#16a34a"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sub-Components ────────────────────────────────────────

const GraphNode: React.FC<{
  icon: string;
  label: string;
  title: string;
  detail?: string;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ icon, label, title, detail, color, onClick, clickable }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '10px 12px',
      background: `${color}08`,
      borderRadius: 8,
      borderLeft: `3px solid ${color}`,
      cursor: clickable ? 'pointer' : 'default',
    }}
  >
    <span style={{ fontSize: 18, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: icon }} />
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 500, color: '#111827',
        textDecoration: clickable ? 'underline' : 'none',
      }}>
        {title}
      </div>
      {detail && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{detail}</div>
      )}
    </div>
  </div>
);

const GraphConnector: React.FC = () => (
  <div style={{
    width: 2, height: 16,
    background: '#d1d5db',
    marginLeft: 22,
  }} />
);

const ClauseImpactNode: React.FC<{
  clauseImpact: { clauseId: string; clauseTitle: string; impact: string; suggestedChange: string };
  severity: string;
}> = ({ clauseImpact, severity }) => {
  const [showFix, setShowFix] = useState(false);
  const sev = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;

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
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
            {clauseImpact.clauseTitle}
          </div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
            {clauseImpact.impact}
          </div>

          {clauseImpact.suggestedChange && (
            <button
              onClick={() => setShowFix(!showFix)}
              style={{
                marginTop: 8,
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
              {showFix ? 'Vorschlag ausblenden' : 'Änderungsvorschlag anzeigen'}
            </button>
          )}

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
        </div>
      </div>
    </div>
  );
};

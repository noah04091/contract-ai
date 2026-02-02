import { useState } from 'react';
import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RiskCard.module.css';

interface RiskObject {
  title: string;
  description?: string;
  severity?: string;
  impact?: string;
  solution?: string;
  recommendation?: string;
  affectedClauses?: string[];
  affectedClauseText?: string;
  replacementText?: string;
  legalBasis?: string;
}

interface RiskCardProps {
  risk: string | RiskObject;
  index: number;
  contractId: string;
  onSaveToLibrary?: (risk: RiskObject) => void;
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
}

export default function RiskCard({
  risk,
  index,
  contractId,
  onSaveToLibrary,
  onFeedback
}: RiskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const riskTitle = typeof risk === 'string' ? risk : risk.title;
  const riskObj = typeof risk === 'object' ? risk : null;
  const riskSeverity = riskObj?.severity || 'medium';
  const description = riskObj?.description;
  const impact = riskObj?.impact;
  const solution = riskObj?.solution;
  const affectedClauses = riskObj?.affectedClauses;
  const affectedClauseText = riskObj?.affectedClauseText;
  const replacementText = riskObj?.replacementText;
  const legalBasis = riskObj?.legalBasis;

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical': return { label: 'Kritisch', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '\u26D4' };
      case 'high': return { label: 'Hoch', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '\u26A0\uFE0F' };
      case 'medium': return { label: 'Mittel', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '\uD83D\uDFE1' };
      case 'low': return { label: 'Niedrig', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '\uD83D\uDFE2' };
      default: return { label: 'Mittel', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '\u26A0\uFE0F' };
    }
  };

  const severityConfig = getSeverityConfig(riskSeverity);

  const hasExpandableContent = impact || solution || affectedClauseText || replacementText;

  const handleCopyReplacement = async () => {
    if (replacementText) {
      try {
        await navigator.clipboard.writeText(replacementText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = replacementText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div
      className={styles.riskCard}
      style={{ borderLeftColor: severityConfig.color }}
    >
      {/* Header */}
      <div className={styles.riskHeader}>
        <span
          className={styles.severityBadge}
          style={{ background: severityConfig.color }}
        >
          {severityConfig.label}
        </span>
        {legalBasis && (
          <span className={styles.legalBadge}>
            {legalBasis.split(' - ')[0]}
          </span>
        )}
        {affectedClauses && affectedClauses.length > 0 && (
          <div className={styles.clauseTags}>
            {affectedClauses.slice(0, 3).map((clause, i) => (
              <span key={i} className={styles.clauseTag}>{clause}</span>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className={styles.riskTitle}>{riskTitle}</h4>

      {/* Description - always visible */}
      {description && description !== riskTitle && (
        <p className={styles.riskDescription}>{description}</p>
      )}

      {/* Affected Clause Quote */}
      {affectedClauseText && !expanded && (
        <div className={styles.clauseQuote}>
          <span className={styles.clauseQuoteLabel}>Betroffene Klausel:</span>
          <span className={styles.clauseQuoteText}>
            {affectedClauseText.length > 120
              ? affectedClauseText.substring(0, 120) + '\u2026'
              : affectedClauseText}
          </span>
        </div>
      )}

      {/* Expand/Collapse */}
      {hasExpandableContent && (
        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expanded ? 'Weniger anzeigen' : 'Details & L\u00F6sung anzeigen'}
        </button>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className={styles.expandedContent}>
          {/* Impact */}
          {impact && (
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Auswirkung
              </div>
              <p className={styles.detailText}>{impact}</p>
            </div>
          )}

          {/* Solution */}
          {solution && (
            <div className={styles.detailSection} style={{ borderLeftColor: '#10b981' }}>
              <div className={styles.detailLabel} style={{ color: '#10b981' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                L{String.fromCharCode(246)}sungsvorschlag
              </div>
              <p className={styles.detailText}>{solution}</p>
            </div>
          )}

          {/* Full Affected Clause */}
          {affectedClauseText && (
            <div className={styles.detailSection} style={{ borderLeftColor: '#f59e0b' }}>
              <div className={styles.detailLabel} style={{ color: '#92400e' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Betroffene Vertragsklausel
              </div>
              <blockquote className={styles.clauseBlockquote}>
                {affectedClauseText}
              </blockquote>
            </div>
          )}

          {/* Replacement Text */}
          {replacementText && (
            <div className={styles.detailSection} style={{ borderLeftColor: '#3b82f6' }}>
              <div className={styles.detailLabel} style={{ color: '#1d4ed8' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Vorgeschlagener Ersatztext
                <button className={styles.copyButton} onClick={handleCopyReplacement}>
                  {copied ? '\u2713 Kopiert' : 'Kopieren'}
                </button>
              </div>
              <div className={styles.replacementBlock}>
                {replacementText}
              </div>
            </div>
          )}

          {/* Legal Basis Full */}
          {legalBasis && (
            <div className={styles.legalBasisFull}>
              <strong>Rechtsgrundlage:</strong> {legalBasis}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.riskActions}>
        {onSaveToLibrary && riskObj && (
          <button
            className={styles.actionBtn}
            onClick={() => onSaveToLibrary(riskObj)}
            title="In Klauselbibliothek speichern"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
            Speichern
          </button>
        )}
        <FeedbackButtons
          itemId={`${contractId}-risk-${index}`}
          itemType="risk"
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
}

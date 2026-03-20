// 📁 components/LegalLens/NegotiationChecklist.tsx
// Interaktive Verhandlungs-Checkliste

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  X,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  Target,
  MessageSquare,
  Download
} from 'lucide-react';
import type {
  NegotiationChecklistItem,
  NegotiationChecklistSummary,
  PerspectiveType
} from '../../types/legalLens';
import * as legalLensAPI from '../../services/legalLensAPI';
import styles from '../../styles/NegotiationChecklist.module.css';

interface NegotiationChecklistProps {
  contractId: string;
  contractName?: string;
  perspective: PerspectiveType;
  onClose: () => void;
}

const PRIORITY_LABELS = {
  1: { text: 'Kritisch', color: '#dc2626', bg: '#fef2f2' },
  2: { text: 'Wichtig', color: '#d97706', bg: '#fffbeb' },
  3: { text: 'Optional', color: '#16a34a', bg: '#f0fdf4' }
};

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Finanziell',
  liability: 'Haftung',
  termination: 'Kündigung',
  scope: 'Leistungsumfang',
  other: 'Sonstiges'
};

const DIFFICULTY_LABELS = {
  easy: { text: 'Einfach', color: '#16a34a' },
  medium: { text: 'Mittel', color: '#d97706' },
  hard: { text: 'Schwierig', color: '#dc2626' }
};

const NegotiationChecklist: React.FC<NegotiationChecklistProps> = ({
  contractId,
  contractName = 'Vertrag',
  perspective,
  onClose
}) => {
  const [checklist, setChecklist] = useState<NegotiationChecklistItem[]>([]);
  const [summary, setSummary] = useState<NegotiationChecklistSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Checkliste laden
  const loadChecklist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await legalLensAPI.generateNegotiationChecklist(contractId, perspective);
      if (response.success) {
        // Items mit checked = false initialisieren
        const itemsWithChecked = response.checklist.map(item => ({
          ...item,
          checked: false
        }));
        setChecklist(itemsWithChecked);
        setSummary(response.summary);
        // Ersten kritischen Punkt automatisch aufklappen
        const firstCritical = itemsWithChecked.find(i => i.priority === 1);
        if (firstCritical) {
          setExpandedItems(new Set([firstCritical.id]));
        }
      }
    } catch (err) {
      console.error('[NegotiationChecklist] Load error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setIsLoading(false);
    }
  }, [contractId, perspective]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Item ein-/ausklappen
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Checkbox toggle
  const toggleChecked = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // Text kopieren
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // PDF Export
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await legalLensAPI.exportChecklistPdf(contractId, perspective);

      // Download triggern
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Checkliste_${contractName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('[NegotiationChecklist] PDF exported successfully');
    } catch (err) {
      console.error('[NegotiationChecklist] PDF export failed:', err);
      // Optionally: Show error toast
    } finally {
      setIsExporting(false);
    }
  };

  // Fortschritt berechnen
  const completedCount = checklist.filter(i => i.checked).length;
  const progressPercent = checklist.length > 0
    ? Math.round((completedCount / checklist.length) * 100)
    : 0;

  // Loading State
  if (isLoading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Analysiere Verhandlungspunkte...</p>
            <span className={styles.loadingHint}>Dies kann einen Moment dauern</span>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.errorContainer}>
            <AlertTriangle size={48} />
            <h3>Fehler beim Laden</h3>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={loadChecklist} className={styles.retryButton}>
                Erneut versuchen
              </button>
              <button onClick={onClose} className={styles.closeButton}>
                Schliessen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>
              <ClipboardCheck size={24} />
              <div>
                <h2>Verhandlungs-Checkliste</h2>
                <span className={styles.contractName}>{contractName}</span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.exportPdfBtn}
                onClick={handleExportPdf}
                disabled={isExporting || checklist.length === 0}
                title="Als PDF exportieren"
              >
                {isExporting ? (
                  <Loader2 size={18} className={styles.spinning} />
                ) : (
                  <Download size={18} />
                )}
                <span>PDF</span>
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <Target size={18} />
                <span className={styles.summaryValue}>{summary.totalIssues}</span>
                <span className={styles.summaryLabel}>Punkte</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.critical}`}>
                <AlertTriangle size={18} />
                <span className={styles.summaryValue}>{summary.criticalCount}</span>
                <span className={styles.summaryLabel}>Kritisch</span>
              </div>
              <div className={styles.summaryCard}>
                <Clock size={18} />
                <span className={styles.summaryValue}>{summary.estimatedNegotiationTime}</span>
                <span className={styles.summaryLabel}>Geschätzt</span>
              </div>
            </div>
          )}

          {/* Strategy */}
          {summary?.overallStrategy && (
            <div className={styles.strategyBox}>
              <MessageSquare size={16} />
              <p>{summary.overallStrategy}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {completedCount} von {checklist.length} erledigt
            </span>
          </div>
        </header>

        {/* Checklist Items */}
        <div className={styles.content}>
          {checklist.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const priorityInfo = PRIORITY_LABELS[item.priority];
            const difficultyInfo = DIFFICULTY_LABELS[item.difficulty];

            return (
              <div
                key={item.id}
                className={`${styles.checklistItem} ${item.checked ? styles.checked : ''}`}
                style={{ '--priority-color': priorityInfo.color } as React.CSSProperties}
              >
                {/* Item Header */}
                <div className={styles.itemHeader}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={item.checked || false}
                      onChange={() => toggleChecked(item.id)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxCustom}>
                      {item.checked && <Check size={14} />}
                    </span>
                  </label>

                  <button
                    className={styles.itemTitleBtn}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <span className={styles.itemEmoji}>{item.emoji}</span>
                    <div className={styles.itemTitleContent}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <div className={styles.itemMeta}>
                        <span
                          className={styles.priorityBadge}
                          style={{
                            backgroundColor: priorityInfo.bg,
                            color: priorityInfo.color
                          }}
                        >
                          {priorityInfo.text}
                        </span>
                        <span className={styles.categoryBadge}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        {item.section && (
                          <span className={styles.sectionBadge}>{item.section}</span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className={styles.itemContent}>
                    {/* Issue */}
                    <div className={styles.contentSection}>
                      <h4>Problem</h4>
                      <p>{item.issue}</p>
                    </div>

                    {/* Risk */}
                    <div className={`${styles.contentSection} ${styles.riskSection}`}>
                      <h4>Risiko</h4>
                      <p>{item.risk}</p>
                    </div>

                    {/* What to say */}
                    <div className={`${styles.contentSection} ${styles.whatToSaySection}`}>
                      <div className={styles.sectionHeader}>
                        <h4>So sagst du es</h4>
                        <button
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(item.whatToSay, `say-${item.id}`)}
                        >
                          {copiedId === `say-${item.id}` ? (
                            <>
                              <Check size={14} />
                              Kopiert
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Kopieren
                            </>
                          )}
                        </button>
                      </div>
                      <blockquote>{item.whatToSay}</blockquote>
                    </div>

                    {/* Alternative */}
                    <div className={`${styles.contentSection} ${styles.alternativeSection}`}>
                      <div className={styles.sectionHeader}>
                        <h4>Bessere Formulierung</h4>
                        <button
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(item.alternativeSuggestion, `alt-${item.id}`)}
                        >
                          {copiedId === `alt-${item.id}` ? (
                            <>
                              <Check size={14} />
                              Kopiert
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Kopieren
                            </>
                          )}
                        </button>
                      </div>
                      <blockquote className={styles.alternative}>
                        {item.alternativeSuggestion}
                      </blockquote>
                    </div>

                    {/* Difficulty */}
                    <div className={styles.difficultyInfo}>
                      <span>Verhandlungsschwierigkeit:</span>
                      <span
                        className={styles.difficultyBadge}
                        style={{ color: difficultyInfo.color }}
                      >
                        {difficultyInfo.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {checklist.length === 0 && !isLoading && (
          <div className={styles.emptyState}>
            <Check size={48} />
            <h3>Keine Verhandlungspunkte gefunden</h3>
            <p>Der Vertrag scheint ausgewogen zu sein.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NegotiationChecklist;

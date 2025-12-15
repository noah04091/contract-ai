// 📁 components/LegalLens/ClauseCompareModal.tsx
// Modal für Side-by-Side Klausel-Vergleich

import React, { useState, useMemo } from 'react';
import { X, Copy, Check, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import styles from '../../styles/LegalLens.module.css';

interface ClauseCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  alternativeText: string;
  originalTitle?: string;
  alternativeTitle?: string;
  whyBetter?: string;
  onSelectOriginal?: () => void;
  onSelectAlternative?: () => void;
}

// Hilfsfunktion um Unterschiede zu finden (vereinfacht)
const findDifferences = (original: string, alternative: string): {
  originalHighlights: { start: number; end: number }[];
  alternativeHighlights: { start: number; end: number }[];
} => {
  // Wörter tokenisieren
  const originalWords = original.split(/(\s+)/);
  const alternativeWords = alternative.split(/(\s+)/);

  // Sets für schnelle Lookups
  const originalSet = new Set(originalWords.filter(w => w.trim()));
  const alternativeSet = new Set(alternativeWords.filter(w => w.trim()));

  // Finde Wörter die nur im Original sind
  const originalHighlights: { start: number; end: number }[] = [];
  let pos = 0;
  for (const word of originalWords) {
    if (word.trim() && !alternativeSet.has(word)) {
      originalHighlights.push({ start: pos, end: pos + word.length });
    }
    pos += word.length;
  }

  // Finde Wörter die nur in der Alternative sind
  const alternativeHighlights: { start: number; end: number }[] = [];
  pos = 0;
  for (const word of alternativeWords) {
    if (word.trim() && !originalSet.has(word)) {
      alternativeHighlights.push({ start: pos, end: pos + word.length });
    }
    pos += word.length;
  }

  return { originalHighlights, alternativeHighlights };
};

// Text mit Highlights rendern
const renderHighlightedText = (
  text: string,
  highlights: { start: number; end: number }[],
  type: 'removed' | 'added'
): React.ReactNode => {
  if (highlights.length === 0) {
    return text;
  }

  // Sortiere Highlights nach Position
  const sorted = [...highlights].sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  sorted.forEach((h, idx) => {
    // Text vor dem Highlight
    if (h.start > lastEnd) {
      parts.push(
        <span key={`text-${idx}`}>{text.slice(lastEnd, h.start)}</span>
      );
    }
    // Highlighteter Text
    parts.push(
      <mark
        key={`highlight-${idx}`}
        className={type === 'removed' ? styles.diffRemoved : styles.diffAdded}
      >
        {text.slice(h.start, h.end)}
      </mark>
    );
    lastEnd = h.end;
  });

  // Rest nach dem letzten Highlight
  if (lastEnd < text.length) {
    parts.push(<span key="text-last">{text.slice(lastEnd)}</span>);
  }

  return parts;
};

const ClauseCompareModal: React.FC<ClauseCompareModalProps> = ({
  isOpen,
  onClose,
  originalText,
  alternativeText,
  originalTitle = 'Original-Klausel',
  alternativeTitle = 'Bessere Alternative',
  whyBetter,
  onSelectOriginal,
  onSelectAlternative
}) => {
  const [copiedSide, setCopiedSide] = useState<'original' | 'alternative' | null>(null);

  // Berechne Unterschiede
  const { originalHighlights, alternativeHighlights } = useMemo(
    () => findDifferences(originalText, alternativeText),
    [originalText, alternativeText]
  );

  // Statistiken
  const stats = useMemo(() => {
    const originalWordCount = originalText.split(/\s+/).length;
    const alternativeWordCount = alternativeText.split(/\s+/).length;
    const diffCount = originalHighlights.length + alternativeHighlights.length;
    const changePercent = Math.round((diffCount / (originalWordCount + alternativeWordCount)) * 100);

    return {
      originalWordCount,
      alternativeWordCount,
      diffCount,
      changePercent
    };
  }, [originalText, alternativeText, originalHighlights, alternativeHighlights]);

  const handleCopy = async (text: string, side: 'original' | 'alternative') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSide(side);
      setTimeout(() => setCopiedSide(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.compareModalOverlay} onClick={onClose}>
      <div className={styles.compareModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.compareModalHeader}>
          <div>
            <h2 className={styles.compareModalTitle}>
              Klausel-Vergleich
            </h2>
            <p className={styles.compareModalSubtitle}>
              {stats.diffCount} Änderungen · {stats.changePercent}% unterschiedlich
            </p>
          </div>
          <button className={styles.compareModalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.compareModalContent}>
          {/* Original Side */}
          <div className={styles.compareSide}>
            <div className={styles.compareSideHeader}>
              <div className={styles.compareSideIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className={styles.compareSideTitle}>{originalTitle}</h3>
                <span className={styles.compareSideWordCount}>
                  {stats.originalWordCount} Wörter
                </span>
              </div>
              <button
                className={styles.compareCopyBtn}
                onClick={() => handleCopy(originalText, 'original')}
              >
                {copiedSide === 'original' ? <Check size={14} /> : <Copy size={14} />}
                {copiedSide === 'original' ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>
            <div className={styles.compareSideText}>
              {renderHighlightedText(originalText, originalHighlights, 'removed')}
            </div>
            {onSelectOriginal && (
              <button
                className={styles.compareSelectBtn}
                onClick={onSelectOriginal}
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                Original behalten
              </button>
            )}
          </div>

          {/* Arrow Divider */}
          <div className={styles.compareDivider}>
            <ArrowRight size={24} />
          </div>

          {/* Alternative Side */}
          <div className={styles.compareSide}>
            <div className={styles.compareSideHeader}>
              <div className={styles.compareSideIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Shield size={16} />
              </div>
              <div>
                <h3 className={styles.compareSideTitle}>{alternativeTitle}</h3>
                <span className={styles.compareSideWordCount}>
                  {stats.alternativeWordCount} Wörter
                </span>
              </div>
              <button
                className={styles.compareCopyBtn}
                onClick={() => handleCopy(alternativeText, 'alternative')}
              >
                {copiedSide === 'alternative' ? <Check size={14} /> : <Copy size={14} />}
                {copiedSide === 'alternative' ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>
            <div className={styles.compareSideText}>
              {renderHighlightedText(alternativeText, alternativeHighlights, 'added')}
            </div>
            {onSelectAlternative && (
              <button
                className={`${styles.compareSelectBtn} ${styles.recommended}`}
                onClick={onSelectAlternative}
              >
                Alternative übernehmen ✓
              </button>
            )}
          </div>
        </div>

        {/* Why Better Section */}
        {whyBetter && (
          <div className={styles.compareWhyBetter}>
            <strong>💡 Warum ist die Alternative besser?</strong>
            <p>{whyBetter}</p>
          </div>
        )}

        {/* Legend */}
        <div className={styles.compareLegend}>
          <div className={styles.compareLegendItem}>
            <span className={styles.diffRemoved}>Entfernt</span>
            <span className={styles.compareLegendText}>Text aus Original</span>
          </div>
          <div className={styles.compareLegendItem}>
            <span className={styles.diffAdded}>Hinzugefügt</span>
            <span className={styles.compareLegendText}>Neuer Text</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClauseCompareModal;

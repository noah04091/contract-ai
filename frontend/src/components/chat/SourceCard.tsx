// frontend/src/components/chat/SourceCard.tsx
import React from 'react';
import styles from '../../styles/Chat.module.css';

interface SourceCardProps {
  page: number;
  snippet: string;
  type?: 'contract_source' | 'analysis_result' | 'tool_reference';
  confidence?: number;
  span?: [number, number];
  onShowInPdf?: (page: number, span?: [number, number]) => void;
}

const SourceCard: React.FC<SourceCardProps> = ({
  page,
  snippet,
  type = 'contract_source',
  confidence,
  span,
  onShowInPdf
}) => {
  
  /**
   * Get icon based on source type
   */
  const getSourceIcon = () => {
    switch (type) {
      case 'analysis_result':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82L21 18.07A2 2 0 0 1 21 21.4A2 2 0 0 1 18.07 21L16.82 19.73A1.65 1.65 0 0 0 15 19.4A1.65 1.65 0 0 0 13.18 19.73L12 18.94A1.65 1.65 0 0 0 9.82 19.4A1.65 1.65 0 0 0 8 19.73L6.93 21A2 2 0 0 1 3.6 21A2 2 0 0 1 3 18.07L4.27 16.82A1.65 1.65 0 0 0 4.6 15A1.65 1.65 0 0 0 4.27 13.18L3 12A2 2 0 0 1 3 8.07A2 2 0 0 1 6.93 3L8 4.27A1.65 1.65 0 0 0 9.82 4.6A1.65 1.65 0 0 0 12 3.94A1.65 1.65 0 0 0 13.18 4.27L15 4.6A1.65 1.65 0 0 0 16.82 4.27L18.07 3A2 2 0 0 1 21.4 3A2 2 0 0 1 21 6.93L19.73 8A1.65 1.65 0 0 0 19.4 9.82A1.65 1.65 0 0 0 19.73 11.18L21 12.06A2 2 0 0 1 21.4 15Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      case 'tool_reference':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94L14.7 6.3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  /**
   * Get confidence color
   */
  const getConfidenceColor = (conf?: number) => {
    if (!conf) return 'var(--text-muted)';
    
    if (conf >= 0.8) return 'var(--success-color, #10b981)';
    if (conf >= 0.6) return 'var(--warning-color, #f59e0b)';
    return 'var(--error-color, #ef4444)';
  };

  /**
   * Truncate text to reasonable length
   */
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  };

  /**
   * Get type label in German
   */
  const getTypeLabel = () => {
    switch (type) {
      case 'analysis_result':
        return 'Analyse';
      case 'tool_reference':
        return 'Tool';
      default:
        return 'Quelle';
    }
  };

  /**
   * Handle click to show in PDF
   */
  const handleShowInPdf = () => {
    if (onShowInPdf) {
      onShowInPdf(page, span);
    }
  };

  const isClickable = !!onShowInPdf;

  return (
    <div 
      className={`${styles.sourceCard} ${isClickable ? styles.clickable : ''}`}
      onClick={isClickable ? handleShowInPdf : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleShowInPdf();
        }
      } : undefined}
    >
      <div className={styles.sourceHeader}>
        <div className={styles.sourceIcon}>
          {getSourceIcon()}
        </div>
        <div className={styles.sourceInfo}>
          <div className={styles.sourcePage}>
            <span className={styles.pageLabel}>Seite {page}</span>
            <span className={styles.sourceType}>{getTypeLabel()}</span>
          </div>
          {confidence !== undefined && (
            <div 
              className={styles.confidenceBadge}
              style={{ color: getConfidenceColor(confidence) }}
            >
              {Math.round(confidence * 100)}%
            </div>
          )}
        </div>
        {isClickable && (
          <div className={styles.showInPdfButton}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      
      <div className={styles.sourceSnippet}>
        {truncateText(snippet)}
      </div>
      
      {isClickable && (
        <div className={styles.sourceAction}>
          Im PDF anzeigen
        </div>
      )}
    </div>
  );
};

export default SourceCard;
/**
 * PageBreakBlock - Visueller Seitenumbruch mit Seitenende/Seitenanfang
 */

import React from 'react';
import styles from './PageBreakBlock.module.css';

interface PageBreakBlockProps {
  isSelected: boolean;
  isPreview: boolean;
  pageNumber?: number; // Seitennummer vor dem Umbruch
}

export const PageBreakBlock: React.FC<PageBreakBlockProps> = ({
  isSelected,
  isPreview,
  pageNumber = 1,
}) => {
  if (isPreview) {
    return (
      <div className={styles.pageBreakPreview}>
        {/* Im Preview wird der eigentliche Seitenumbruch beim PDF-Export angewandt */}
      </div>
    );
  }

  return (
    <div className={`${styles.pageBreakContainer} ${isSelected ? styles.selected : ''}`}>
      {/* Ende der aktuellen Seite */}
      <div className={styles.pageEnd}>
        <div className={styles.pageEndLine} />
        <span className={styles.pageLabel}>Ende Seite {pageNumber}</span>
        <div className={styles.pageEndLine} />
      </div>

      {/* Visueller Abstand zwischen Seiten */}
      <div className={styles.pageSeparator}>
        <div className={styles.separatorPattern} />
      </div>

      {/* Anfang der nächsten Seite */}
      <div className={styles.pageStart}>
        <div className={styles.pageStartLine} />
        <span className={styles.pageLabel}>Seite {pageNumber + 1}</span>
        <div className={styles.pageStartLine} />
      </div>
    </div>
  );
};

export default PageBreakBlock;

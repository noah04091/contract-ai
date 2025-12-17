/**
 * PageBreakBlock - Echter visueller Seitenumbruch wie bei DIN A4 Blättern
 */

import React from 'react';
import styles from './PageBreakBlock.module.css';

interface PageBreakBlockProps {
  isSelected: boolean;
  isPreview: boolean;
  pageNumber?: number;
}

export const PageBreakBlock: React.FC<PageBreakBlockProps> = ({
  isSelected,
  isPreview,
  pageNumber = 1,
}) => {
  if (isPreview) {
    return (
      <div className={styles.pageBreakPreview}>
        {/* Im Preview/PDF-Export: echter Seitenumbruch */}
      </div>
    );
  }

  return (
    <div className={`${styles.pageBreakContainer} ${isSelected ? styles.selected : ''}`}>
      {/* Seitenende - unterer Rand der aktuellen Seite */}
      <div className={styles.pageEndShadow} />

      {/* Seitennummer der aktuellen Seite */}
      <div className={styles.pageNumberBadge}>
        Seite {pageNumber}
      </div>

      {/* Grauer Bereich zwischen den Seiten */}
      <div className={styles.pageSeparator} />

      {/* Seitenanfang - oberer Rand der neuen Seite */}
      <div className={styles.pageStartShadow} />

      {/* Seitennummer der nächsten Seite */}
      <div className={styles.pageNumberBadgeNext}>
        Seite {pageNumber + 1}
      </div>
    </div>
  );
};

export default PageBreakBlock;

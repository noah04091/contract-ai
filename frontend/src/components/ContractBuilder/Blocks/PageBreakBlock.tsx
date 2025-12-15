/**
 * PageBreakBlock - Seitenumbruch
 */

import React from 'react';
import { FileStack } from 'lucide-react';
import styles from './PageBreakBlock.module.css';

interface PageBreakBlockProps {
  isSelected: boolean;
  isPreview: boolean;
}

export const PageBreakBlock: React.FC<PageBreakBlockProps> = ({
  isSelected,
  isPreview,
}) => {
  if (isPreview) {
    return (
      <div className={styles.pageBreakPreview}>
        {/* Im Preview wird der eigentliche Seitenumbruch beim PDF-Export angewandt */}
      </div>
    );
  }

  return (
    <div className={`${styles.pageBreak} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.breakLine} />
      <div className={styles.breakLabel}>
        <FileStack size={14} />
        <span>Seitenumbruch</span>
      </div>
      <div className={styles.breakLine} />
    </div>
  );
};

export default PageBreakBlock;

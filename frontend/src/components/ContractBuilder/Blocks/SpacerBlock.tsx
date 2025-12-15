/**
 * SpacerBlock - Abstandshalter
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import styles from './SpacerBlock.module.css';

interface SpacerBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const SpacerBlock: React.FC<SpacerBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const height = content.height || 24;

  return (
    <div
      className={`${styles.spacer} ${isSelected ? styles.selected : ''}`}
      style={{ height: `${height}px` }}
    >
      {!isPreview && (
        <div className={styles.spacerIndicator}>
          <span>{height}px</span>
        </div>
      )}
    </div>
  );
};

export default SpacerBlock;

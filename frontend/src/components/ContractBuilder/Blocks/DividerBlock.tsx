/**
 * DividerBlock - Visueller Trenner
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import styles from './DividerBlock.module.css';

interface DividerBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const DividerBlock: React.FC<DividerBlockProps> = ({
  content,
  isSelected,
}) => {
  const { style } = content;

  const dividerStyle = style || 'solid';

  return (
    <div className={`${styles.divider} ${isSelected ? styles.selected : ''}`}>
      <hr
        className={`${styles.line} ${styles[dividerStyle]}`}
      />
    </div>
  );
};

export default DividerBlock;

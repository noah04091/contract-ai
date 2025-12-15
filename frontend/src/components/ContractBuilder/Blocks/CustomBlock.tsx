/**
 * CustomBlock - Benutzerdefinierter Block
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Puzzle } from 'lucide-react';
import styles from './CustomBlock.module.css';

interface CustomBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const CustomBlock: React.FC<CustomBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { body, title } = content;

  return (
    <div className={`${styles.custom} ${isSelected ? styles.selected : ''}`}>
      {!isPreview && (
        <div className={styles.customBadge}>
          <Puzzle size={12} />
          <span>Benutzerdefiniert</span>
        </div>
      )}

      {title && (
        <h4 className={styles.customTitle}>
          {isPreview ? (
            title
          ) : (
            <VariableHighlight text={title} />
          )}
        </h4>
      )}

      <div className={styles.customContent}>
        {isPreview ? (
          <p>{body || 'Benutzerdefinierter Inhalt'}</p>
        ) : (
          <VariableHighlight text={body || 'Benutzerdefinierter Inhalt'} multiline />
        )}
      </div>
    </div>
  );
};

export default CustomBlock;

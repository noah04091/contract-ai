/**
 * PreambleBlock - Präambel / Vorwort des Vertrags
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './PreambleBlock.module.css';

interface PreambleBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const PreambleBlock: React.FC<PreambleBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { preambleText } = content;

  return (
    <div className={`${styles.preamble} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.preambleHeader}>
        <span className={styles.preambleTitle}>Präambel</span>
      </div>
      <div className={styles.preambleContent}>
        {isPreview ? (
          <p>{preambleText || 'Die Vertragsparteien vereinbaren Folgendes:'}</p>
        ) : (
          <VariableHighlight
            text={preambleText || 'Die Vertragsparteien vereinbaren Folgendes:'}
            multiline
          />
        )}
      </div>
    </div>
  );
};

export default PreambleBlock;

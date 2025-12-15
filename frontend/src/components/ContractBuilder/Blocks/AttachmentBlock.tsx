/**
 * AttachmentBlock - Anlage-Verweis
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Paperclip } from 'lucide-react';
import styles from './AttachmentBlock.module.css';

interface AttachmentBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const AttachmentBlock: React.FC<AttachmentBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { attachmentTitle, attachmentDescription } = content;

  return (
    <div className={`${styles.attachment} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.attachmentHeader}>
        <Paperclip size={16} className={styles.icon} />
        <span className={styles.attachmentLabel}>Anlage</span>
      </div>

      <h4 className={styles.attachmentTitle}>
        {isPreview ? (
          attachmentTitle || 'Anlage 1'
        ) : (
          <VariableHighlight text={attachmentTitle || 'Anlage 1'} />
        )}
      </h4>

      {attachmentDescription && (
        <p className={styles.attachmentDescription}>
          {isPreview ? (
            attachmentDescription
          ) : (
            <VariableHighlight text={attachmentDescription} />
          )}
        </p>
      )}
    </div>
  );
};

export default AttachmentBlock;

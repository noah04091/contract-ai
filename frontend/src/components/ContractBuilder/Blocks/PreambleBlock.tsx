/**
 * PreambleBlock - Präambel / Vorwort des Vertrags
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './PreambleBlock.module.css';

interface PreambleBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const PreambleBlock: React.FC<PreambleBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { preambleText } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (isPreview) return;
    setIsEditing(true);
    setEditValue(preambleText || 'Die Vertragsparteien vereinbaren Folgendes:');
  }, [isPreview, preambleText]);

  const handleSave = useCallback(() => {
    updateBlockContent(blockId, { preambleText: editValue });
    syncVariables();
    setIsEditing(false);
    setEditValue('');
  }, [editValue, blockId, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  }, [handleSave]);

  return (
    <div className={`${styles.preamble} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.preambleHeader}>
        <span className={styles.preambleTitle}>Präambel</span>
      </div>
      <div className={styles.preambleContent}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.inlineTextarea}
            rows={Math.max(3, editValue.split('\n').length)}
          />
        ) : (
          <VariableHighlight
            text={preambleText || 'Die Vertragsparteien vereinbaren Folgendes:'}
            multiline
            isPreview={isPreview}
            onDoubleClick={handleDoubleClick}
          />
        )}
      </div>
    </div>
  );
};

export default PreambleBlock;

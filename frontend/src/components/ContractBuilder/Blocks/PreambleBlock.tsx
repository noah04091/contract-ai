/**
 * PreambleBlock - Präambel / Vorwort des Vertrags
 * Unterstützt Inline-Editing per Doppelklick
 * 4 Layout-Varianten: accent-bar (default), bordered, minimal, quote
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
  const { preambleText, preambleLayout = 'accent-bar' } = content;
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

  const textContent = preambleText || 'Die Vertragsparteien vereinbaren Folgendes:';

  const renderEditor = () => (
    <textarea
      ref={textareaRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={styles.inlineTextarea}
      rows={Math.max(3, editValue.split('\n').length)}
    />
  );

  const renderText = () => (
    <VariableHighlight
      text={textContent}
      multiline
      isPreview={isPreview}
      onDoubleClick={handleDoubleClick}
    />
  );

  // Layout: accent-bar (default)
  if (preambleLayout === 'accent-bar' || !preambleLayout) {
    return (
      <div className={`${styles.preamble} ${styles.accentBar} ${isSelected ? styles.selected : ''}`}>
        <div className={styles.preambleHeader}>
          <span className={styles.preambleTitle}>Präambel</span>
        </div>
        <div className={styles.preambleContent}>
          {isEditing ? renderEditor() : renderText()}
        </div>
      </div>
    );
  }

  // Layout: bordered
  if (preambleLayout === 'bordered') {
    return (
      <div className={`${styles.preamble} ${styles.bordered} ${isSelected ? styles.selected : ''}`}>
        <div className={styles.borderedHeader}>
          <span className={styles.borderedLine} />
          <span className={styles.borderedTitle}>PRÄAMBEL</span>
          <span className={styles.borderedLine} />
        </div>
        <div className={styles.borderedContent}>
          {isEditing ? renderEditor() : renderText()}
        </div>
      </div>
    );
  }

  // Layout: minimal
  if (preambleLayout === 'minimal') {
    return (
      <div className={`${styles.preamble} ${styles.minimal} ${isSelected ? styles.selected : ''}`}>
        <div className={styles.minimalHeader}>
          <span className={styles.minimalTitle}>Präambel</span>
        </div>
        <div className={styles.minimalContent}>
          {isEditing ? renderEditor() : renderText()}
        </div>
      </div>
    );
  }

  // Layout: quote
  return (
    <div className={`${styles.preamble} ${styles.quote} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.quoteContent}>
        {isEditing ? renderEditor() : renderText()}
      </div>
    </div>
  );
};

export default PreambleBlock;

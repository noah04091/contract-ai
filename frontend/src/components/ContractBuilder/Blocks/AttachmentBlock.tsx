/**
 * AttachmentBlock - Anlage-Verweis
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Paperclip } from 'lucide-react';
import styles from './AttachmentBlock.module.css';

interface AttachmentBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | 'description' | null;

export const AttachmentBlock: React.FC<AttachmentBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { attachmentTitle, attachmentDescription } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField) {
      if (editingField === 'description') {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [editingField]);

  const handleDoubleClick = useCallback((field: EditingField, currentValue: string) => {
    if (isPreview) return;
    setEditingField(field);
    setEditValue(currentValue);
  }, [isPreview]);

  const handleSave = useCallback(() => {
    if (!editingField) return;

    if (editingField === 'title') {
      updateBlockContent(blockId, { attachmentTitle: editValue });
    } else if (editingField === 'description') {
      updateBlockContent(blockId, { attachmentDescription: editValue });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [handleSave]);

  return (
    <div className={`${styles.attachment} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.attachmentHeader}>
        <Paperclip size={16} className={styles.icon} />
        <span className={styles.attachmentLabel}>Anlage</span>
      </div>

      <h4 className={styles.attachmentTitle}>
        {editingField === 'title' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.inlineInput}
          />
        ) : (
          <VariableHighlight
            text={attachmentTitle || 'Anlage 1'}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('title', attachmentTitle || 'Anlage 1')}
          />
        )}
      </h4>

      <div className={styles.attachmentDescription}>
        {editingField === 'description' ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.inlineTextarea}
            rows={Math.max(2, editValue.split('\n').length)}
          />
        ) : (
          <VariableHighlight
            text={attachmentDescription || 'Beschreibung der Anlage...'}
            multiline
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('description', attachmentDescription || '')}
          />
        )}
      </div>
    </div>
  );
};

export default AttachmentBlock;

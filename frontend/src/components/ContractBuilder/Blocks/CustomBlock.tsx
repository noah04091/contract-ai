/**
 * CustomBlock - Benutzerdefinierter Block
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Puzzle } from 'lucide-react';
import styles from './CustomBlock.module.css';

interface CustomBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | 'body' | null;

export const CustomBlock: React.FC<CustomBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { body, title } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField) {
      if (editingField === 'body') {
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
      updateBlockContent(blockId, { title: editValue });
    } else if (editingField === 'body') {
      updateBlockContent(blockId, { body: editValue });
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
    <div className={`${styles.custom} ${isSelected ? styles.selected : ''}`}>
      {!isPreview && (
        <div className={styles.customBadge}>
          <Puzzle size={12} />
          <span>Benutzerdefiniert</span>
        </div>
      )}

      <h4 className={styles.customTitle}>
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
            text={title || 'Benutzerdefinierter Block'}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('title', title || 'Benutzerdefinierter Block')}
          />
        )}
      </h4>

      <div className={styles.customContent}>
        {editingField === 'body' ? (
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
            text={body || 'Benutzerdefinierter Inhalt...'}
            multiline
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('body', body || '')}
          />
        )}
      </div>
    </div>
  );
};

export default CustomBlock;

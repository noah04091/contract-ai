/**
 * DateFieldBlock - Datumsfeld
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Calendar } from 'lucide-react';
import styles from './DateFieldBlock.module.css';

interface DateFieldBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'label' | 'variable' | null;

export const DateFieldBlock: React.FC<DateFieldBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Variable für das Datum - Default ist {{datum}} falls nicht anders definiert
  const dateVariable = content.body || '{{datum}}';
  const label = content.title || 'Datum';

  useEffect(() => {
    if (editingField) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingField]);

  const handleDoubleClick = useCallback((field: EditingField, currentValue: string) => {
    if (isPreview) return;
    setEditingField(field);
    setEditValue(currentValue);
  }, [isPreview]);

  const handleSave = useCallback(() => {
    if (!editingField) return;

    if (editingField === 'label') {
      updateBlockContent(blockId, { title: editValue });
    } else if (editingField === 'variable') {
      updateBlockContent(blockId, { body: editValue });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [handleSave]);

  return (
    <div className={`${styles.dateField} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.dateWrapper}>
        <Calendar size={14} className={styles.icon} />

        {/* Label */}
        <span className={styles.dateLabel}>
          {editingField === 'label' ? (
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
              text={label}
              isPreview={isPreview}
              onDoubleClick={() => handleDoubleClick('label', label)}
            />
          )}
          :
        </span>

        {/* Datum-Variable */}
        <span className={styles.dateValue}>
          {editingField === 'variable' ? (
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
              text={dateVariable}
              isPreview={isPreview}
              onDoubleClick={() => handleDoubleClick('variable', dateVariable)}
            />
          )}
        </span>
      </div>
    </div>
  );
};

export default DateFieldBlock;

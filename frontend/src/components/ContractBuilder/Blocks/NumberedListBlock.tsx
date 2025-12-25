/**
 * NumberedListBlock - Nummerierte Liste
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './NumberedListBlock.module.css';

interface NumberedListBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | `item-${number}` | null;

export const NumberedListBlock: React.FC<NumberedListBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { title, items, listStyle } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Default items falls keine definiert
  const listItems = items && items.length > 0
    ? items
    : ['Listenpunkt 1', 'Listenpunkt 2', 'Listenpunkt 3'];

  // Nummerierungsstil
  const getListStyleType = () => {
    switch (listStyle) {
      case 'alpha': return 'lower-alpha';
      case 'roman': return 'lower-roman';
      case 'decimal':
      default: return 'decimal';
    }
  };

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

    if (editingField === 'title') {
      updateBlockContent(blockId, { title: editValue });
    } else if (editingField.startsWith('item-')) {
      const index = parseInt(editingField.split('-')[1], 10);
      const newItems = [...listItems];
      newItems[index] = editValue;
      updateBlockContent(blockId, { items: newItems });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, listItems, updateBlockContent, syncVariables]);

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
    <div className={`${styles.numberedList} ${isSelected ? styles.selected : ''}`}>
      {/* Optionaler Titel */}
      <div className={styles.listTitle}>
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
        ) : title ? (
          <VariableHighlight
            text={title}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('title', title)}
          />
        ) : !isPreview ? (
          <span
            className={styles.placeholder}
            onDoubleClick={() => handleDoubleClick('title', '')}
          >
            Titel hinzufügen...
          </span>
        ) : null}
      </div>

      {/* Liste */}
      <ol
        className={styles.list}
        style={{ listStyleType: getListStyleType() }}
      >
        {listItems.map((item: string, index: number) => (
          <li key={index} className={styles.listItem}>
            {editingField === `item-${index}` ? (
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
                text={item}
                isPreview={isPreview}
                onDoubleClick={() => handleDoubleClick(`item-${index}`, item)}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default NumberedListBlock;

/**
 * HeaderBlock - Vertragskopf mit Titel und optionalem Logo
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './HeaderBlock.module.css';

interface HeaderBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | 'subtitle' | null;

export const HeaderBlock: React.FC<HeaderBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { title, subtitle, logo } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
    } else if (editingField === 'subtitle') {
      updateBlockContent(blockId, { subtitle: editValue });
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
    <div className={`${styles.header} ${isSelected ? styles.selected : ''}`}>
      {/* Logo */}
      {logo && (
        <div className={styles.logoWrapper}>
          <img
            src={logo}
            alt="Logo"
            className={styles.logo}
          />
        </div>
      )}

      {/* Titel */}
      <h1 className={styles.title}>
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
            text={title || 'Vertragstitel'}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('title', title || 'Vertragstitel')}
          />
        )}
      </h1>

      {/* Untertitel */}
      <p className={styles.subtitle}>
        {editingField === 'subtitle' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.inlineInput}
          />
        ) : subtitle ? (
          <VariableHighlight
            text={subtitle}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('subtitle', subtitle)}
          />
        ) : !isPreview ? (
          <span
            className={styles.placeholder}
            onDoubleClick={() => handleDoubleClick('subtitle', '')}
            style={{ cursor: 'text' }}
          >
            Untertitel hinzufügen...
          </span>
        ) : null}
      </p>

      {/* Decorative Line */}
      <div className={styles.decorativeLine} />
    </div>
  );
};

export default HeaderBlock;

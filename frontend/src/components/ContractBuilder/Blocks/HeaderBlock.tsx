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
  const {
    title,
    subtitle,
    logo,
    showDivider = true,
    dividerColor,
    titleFontSize = 24,
    subtitleFontSize = 14,
    headerLayout = 'centered'
  } = content;
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

  // Titel-Komponente (wiederverwendbar)
  const renderTitle = () => (
    <h1 className={styles.title} style={{ fontSize: `${titleFontSize}px` }}>
      {editingField === 'title' ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={styles.inlineInput}
          style={{ fontSize: `${titleFontSize}px` }}
        />
      ) : (
        <VariableHighlight
          text={title || 'Vertragstitel'}
          isPreview={isPreview}
          onDoubleClick={() => handleDoubleClick('title', title || 'Vertragstitel')}
        />
      )}
    </h1>
  );

  // Untertitel-Komponente (wiederverwendbar)
  const renderSubtitle = () => (
    <p className={styles.subtitle} style={{ fontSize: `${subtitleFontSize}px` }}>
      {editingField === 'subtitle' ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={styles.inlineInput}
          style={{ fontSize: `${subtitleFontSize}px` }}
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
  );

  // Zentriertes Layout (Standard)
  const renderCenteredLayout = () => (
    <>
      {logo && (
        <div className={styles.logoWrapper}>
          <img src={logo} alt="Logo" className={styles.logo} />
        </div>
      )}
      {renderTitle()}
      {renderSubtitle()}
      {showDivider && (
        <div
          className={styles.decorativeLine}
          style={dividerColor ? { backgroundColor: dividerColor } : undefined}
        />
      )}
    </>
  );

  // Logo Links Layout
  const renderLeftLogoLayout = () => (
    <div className={styles.leftLogoLayout}>
      {logo && (
        <div className={styles.leftLogoWrapper}>
          <img src={logo} alt="Logo" className={styles.leftLogo} />
        </div>
      )}
      <div className={styles.leftLogoText}>
        {renderTitle()}
        {renderSubtitle()}
      </div>
    </div>
  );

  // Minimal Layout (nur Text, kein Logo, keine Linie)
  const renderMinimalLayout = () => (
    <div className={styles.minimalLayout}>
      {renderTitle()}
      {renderSubtitle()}
    </div>
  );

  // Layout auswählen
  const renderLayout = () => {
    switch (headerLayout) {
      case 'left-logo':
        return renderLeftLogoLayout();
      case 'minimal':
        return renderMinimalLayout();
      default:
        return renderCenteredLayout();
    }
  };

  return (
    <div className={`${styles.header} ${isSelected ? styles.selected : ''} ${styles[headerLayout] || ''}`}>
      {renderLayout()}
    </div>
  );
};

export default HeaderBlock;

/**
 * CustomBlock - Freitext-Block
 * Ein freier Textbaustein, der im fertigen Vertrag wie normaler Inhalt aussieht
 * und über das Eigenschaften-Panel voll stylebar ist (Farbe/Rahmen/Schrift via
 * Wrapper). Unterstützt Inline-Editing per Doppelklick.
 *
 * Bewusst KEIN separater Titel: das Backend rendert für custom-Blöcke nur einen
 * reinen Textkörper, ein Titel ginge im PDF lautlos verloren. Wer eine
 * Überschrift braucht, nutzt den Klausel-Block.
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

export const CustomBlock: React.FC<CustomBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  // body ist die kanonische Quelle; text nur als Legacy-Fallback (alte, über das
  // früher fehlerhafte Panel geschriebene Daten weiterhin anzeigen).
  const bodyValue = (content.body ?? (content as { text?: string }).text ?? '') as string;
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
    setEditValue(bodyValue);
    setIsEditing(true);
  }, [isPreview, bodyValue]);

  const handleSave = useCallback(() => {
    if (!isEditing) return;
    updateBlockContent(blockId, { body: editValue });
    syncVariables();
    setIsEditing(false);
    setEditValue('');
  }, [isEditing, editValue, blockId, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  }, []);

  return (
    <div className={`${styles.custom} ${isSelected ? styles.selected : ''}`}>
      {!isPreview && (
        <div className={styles.customBadge}>
          <Puzzle size={12} />
          <span>Freitext</span>
        </div>
      )}

      <div className={styles.customContent}>
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
        ) : bodyValue ? (
          <VariableHighlight
            text={bodyValue}
            multiline
            isPreview={isPreview}
            onDoubleClick={handleDoubleClick}
          />
        ) : !isPreview ? (
          <span className={styles.placeholder} onDoubleClick={handleDoubleClick}>
            Doppelklick zum Bearbeiten …
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default CustomBlock;

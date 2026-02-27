/**
 * ClauseBlock - Standard-Vertragsklausel mit Nummerierung
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './ClauseBlock.module.css';

interface ClauseBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | 'body' | `subclause-${number}` | null;

export const ClauseBlock: React.FC<ClauseBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { number, clauseTitle, body: rawBody, subclauses, clauseLayout = 'standard' } = content;
  // Im Preview-Modus (PDF-Export) Tipp-Zeilen aus dem Body filtern
  const body = isPreview && rawBody
    ? rawBody.split('\n').filter(line => !line.trim().startsWith('💡')).join('\n').trimEnd()
    : rawBody;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Paragraphen-Nummer formatieren
  const formatNumber = (num: string | undefined) => {
    if (!num || num === 'auto') return '§';
    if (num.startsWith('§')) return num;
    return `§ ${num}`;
  };

  // Fokus auf Input setzen wenn Editing startet
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

  // Doppelklick-Handler zum Starten des Editings
  const handleDoubleClick = useCallback((field: EditingField, currentValue: string) => {
    if (isPreview) return; // Kein Editing im Preview-Modus
    setEditingField(field);
    setEditValue(currentValue);
  }, [isPreview]);

  // Unterklausel löschen und Rest renummerieren
  const handleDeleteSubclause = useCallback((index: number) => {
    const newSubclauses = [...(subclauses || [])];
    newSubclauses.splice(index, 1);
    // Renummerieren
    const renumbered = newSubclauses.map((sub, i) => ({
      ...sub,
      number: `(${i + 1})`,
    }));
    updateBlockContent(blockId, { subclauses: renumbered });
    syncVariables();
  }, [subclauses, blockId, updateBlockContent, syncVariables]);

  // Speichern der Änderungen
  const handleSave = useCallback(() => {
    if (!editingField) return;

    if (editingField === 'title') {
      updateBlockContent(blockId, { clauseTitle: editValue });
    } else if (editingField === 'body') {
      updateBlockContent(blockId, { body: editValue });
    } else if (editingField.startsWith('subclause-')) {
      const index = parseInt(editingField.split('-')[1], 10);
      const newSubclauses = [...(subclauses || [])];
      if (newSubclauses[index]) {
        // Leerer Text → Subclause entfernen
        if (!editValue.trim()) {
          newSubclauses.splice(index, 1);
          const renumbered = newSubclauses.map((sub, i) => ({
            ...sub,
            number: `(${i + 1})`,
          }));
          updateBlockContent(blockId, { subclauses: renumbered });
        } else {
          newSubclauses[index] = { ...newSubclauses[index], text: editValue };
          updateBlockContent(blockId, { subclauses: newSubclauses });
        }
      }
    }

    // Variablen synchronisieren falls neue hinzugefügt wurden
    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, subclauses, updateBlockContent, syncVariables]);

  // Abbrechen des Editings
  const handleCancel = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  // Tastatur-Handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  // Textarea spezieller Handler (Shift+Enter für neue Zeile)
  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
    // Shift+Enter erlaubt neue Zeilen
  }, [handleSave, handleCancel]);

  // Layout-Klasse bestimmen
  const layoutClass = clauseLayout === 'indented' ? styles.indented
    : clauseLayout === 'boxed' ? styles.boxed
    : '';

  return (
    <div className={`${styles.clause} ${layoutClass} ${isSelected ? styles.selected : ''}`}>
      {/* Klausel-Header */}
      <div className={styles.clauseHeader}>
        <span className={styles.clauseNumber}>
          {formatNumber(number)}
        </span>
        <h3 className={styles.clauseTitle}>
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
              text={clauseTitle || 'Klauseltitel'}
              isPreview={isPreview}
              onDoubleClick={() => handleDoubleClick('title', clauseTitle || 'Klauseltitel')}
            />
          )}
        </h3>
      </div>

      {/* Klausel-Body */}
      <div className={styles.clauseBody}>
        {editingField === 'body' ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleTextareaKeyDown}
            className={styles.inlineTextarea}
            rows={Math.max(3, editValue.split('\n').length)}
          />
        ) : body ? (
          <VariableHighlight
            text={body}
            multiline
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('body', body)}
          />
        ) : (
          <span
            className={styles.placeholder}
            onDoubleClick={() => !isPreview && handleDoubleClick('body', '')}
            style={{ cursor: !isPreview ? 'text' : 'default' }}
          >
            Doppelklick zum Bearbeiten...
          </span>
        )}
      </div>

      {/* Unterklauseln */}
      {subclauses && subclauses.length > 0 && (
        <ol className={styles.subclauses}>
          {subclauses.map((sub, index) => (
            <li key={`sub-${sub.number || index}`} className={styles.subclause}>
              <span className={styles.subclauseNumber}>
                {sub.number || `(${index + 1})`}
              </span>
              <span className={styles.subclauseText}>
                {editingField === `subclause-${index}` ? (
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
                    text={sub.text || ''}
                    isPreview={isPreview}
                    onDoubleClick={() => handleDoubleClick(`subclause-${index}`, sub.text || '')}
                  />
                )}
              </span>
              {!isPreview && (
                <button
                  className={styles.subclauseDelete}
                  onClick={() => handleDeleteSubclause(index)}
                  title="Unterklausel entfernen"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default ClauseBlock;

/**
 * DefinitionsBlock - Begriffsbestimmungen
 * Strukturierte Liste mit Begriff + Definition
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Plus, X } from 'lucide-react';
import styles from './DefinitionsBlock.module.css';

interface DefinitionsBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

interface Definition {
  term: string;
  definition: string;
}

type EditingField = { type: 'title' } | { type: 'term'; index: number } | { type: 'definition'; index: number } | null;

export const DefinitionsBlock: React.FC<DefinitionsBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { definitionsTitle, definitions = [] } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Default definitions if empty
  const currentDefinitions: Definition[] = useMemo(() =>
    definitions.length > 0
      ? definitions
      : [
          { term: 'Vertragsgegenstand', definition: 'bezeichnet die in diesem Vertrag vereinbarten Leistungen.' },
          { term: 'Vergütung', definition: 'bezeichnet die für die Leistungen zu zahlende Gegenleistung.' },
        ],
    [definitions]
  );

  useEffect(() => {
    if (editingField) {
      if (editingField.type === 'definition') {
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

    if (editingField.type === 'title') {
      updateBlockContent(blockId, { definitionsTitle: editValue });
    } else if (editingField.type === 'term') {
      const newDefs = [...currentDefinitions];
      newDefs[editingField.index] = { ...newDefs[editingField.index], term: editValue };
      updateBlockContent(blockId, { definitions: newDefs });
    } else if (editingField.type === 'definition') {
      const newDefs = [...currentDefinitions];
      newDefs[editingField.index] = { ...newDefs[editingField.index], definition: editValue };
      updateBlockContent(blockId, { definitions: newDefs });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, currentDefinitions, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [handleSave]);

  const addDefinition = useCallback(() => {
    const newDefs = [...currentDefinitions, { term: 'Neuer Begriff', definition: 'Definition hier eingeben...' }];
    updateBlockContent(blockId, { definitions: newDefs });
  }, [blockId, currentDefinitions, updateBlockContent]);

  const removeDefinition = useCallback((index: number) => {
    const newDefs = currentDefinitions.filter((_, i) => i !== index);
    updateBlockContent(blockId, { definitions: newDefs });
  }, [blockId, currentDefinitions, updateBlockContent]);

  const isEditingTitle = editingField?.type === 'title';
  const isEditingTerm = (index: number) => editingField?.type === 'term' && editingField.index === index;
  const isEditingDefinition = (index: number) => editingField?.type === 'definition' && editingField.index === index;

  return (
    <div className={`${styles.definitions} ${isSelected ? styles.selected : ''}`}>
      {/* Titel */}
      <h3 className={styles.title}>
        {isEditingTitle ? (
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
            text={definitionsTitle || '§ 1 Definitionen'}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick({ type: 'title' }, definitionsTitle || '§ 1 Definitionen')}
          />
        )}
      </h3>

      {/* Intro Text */}
      <p className={styles.intro}>
        Im Sinne dieses Vertrages gelten folgende Begriffsbestimmungen:
      </p>

      {/* Definitions List */}
      <div className={styles.definitionsList}>
        {currentDefinitions.map((def, index) => (
          <div key={`def-${index}-${def.term.slice(0, 15)}`} className={styles.definitionItem}>
            <div className={styles.termRow}>
              {/* Term */}
              <span className={styles.termLabel}>
                {isEditingTerm(index) ? (
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
                  <>
                    <span className={styles.termQuote}>"</span>
                    <VariableHighlight
                      text={def.term}
                      isPreview={isPreview}
                      onDoubleClick={() => handleDoubleClick({ type: 'term', index }, def.term)}
                    />
                    <span className={styles.termQuote}>"</span>
                  </>
                )}
              </span>

              {/* Remove Button */}
              {!isPreview && currentDefinitions.length > 1 && (
                <button
                  className={styles.removeButton}
                  onClick={() => removeDefinition(index)}
                  title="Definition entfernen"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Definition Text */}
            <div className={styles.definitionText}>
              {isEditingDefinition(index) ? (
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
                  text={def.definition}
                  multiline
                  isPreview={isPreview}
                  onDoubleClick={() => handleDoubleClick({ type: 'definition', index }, def.definition)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Button */}
      {!isPreview && (
        <button className={styles.addButton} onClick={addDefinition}>
          <Plus size={14} />
          <span>Definition hinzufügen</span>
        </button>
      )}
    </div>
  );
};

export default DefinitionsBlock;

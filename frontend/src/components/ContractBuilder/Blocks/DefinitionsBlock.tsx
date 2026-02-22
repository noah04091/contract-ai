/**
 * DefinitionsBlock - Begriffsbestimmungen
 * Strukturierte Liste mit Begriff + Definition
 * Unterstützt Inline-Editing per Doppelklick
 * 4 Layout-Varianten: card (default), table, inline, numbered
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
  const { definitionsTitle, definitions = [], definitionsLayout = 'card' } = content;
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

  // Shared: Title
  const renderTitle = () => (
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
  );

  // Shared: Add Button
  const renderAddButton = () => (
    !isPreview && (
      <button className={styles.addButton} onClick={addDefinition}>
        <Plus size={14} />
        <span>Definition hinzufügen</span>
      </button>
    )
  );

  // Shared: Remove Button
  const renderRemoveButton = (index: number) => (
    !isPreview && currentDefinitions.length > 1 && (
      <button
        className={styles.removeButton}
        onClick={() => removeDefinition(index)}
        title="Definition entfernen"
      >
        <X size={14} />
      </button>
    )
  );

  const layout = definitionsLayout || 'card';

  // ============================================
  // LAYOUT: card (default)
  // ============================================
  if (layout === 'card') {
    return (
      <div className={`${styles.definitions} ${styles.layoutCard} ${isSelected ? styles.selected : ''}`}>
        {renderTitle()}
        <p className={styles.intro}>Im Sinne dieses Vertrages gelten folgende Begriffsbestimmungen:</p>
        <div className={styles.definitionsList}>
          {currentDefinitions.map((def, index) => (
            <div key={`def-${index}-${def.term.slice(0, 15)}`} className={styles.definitionItem}>
              <div className={styles.termRow}>
                <span className={styles.termLabel}>
                  {isEditingTerm(index) ? (
                    <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineInput} />
                  ) : (
                    <>
                      <span className={styles.termQuote}>&ldquo;</span>
                      <VariableHighlight text={def.term} isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'term', index }, def.term)} />
                      <span className={styles.termQuote}>&rdquo;</span>
                    </>
                  )}
                </span>
                {renderRemoveButton(index)}
              </div>
              <div className={styles.definitionText}>
                {isEditingDefinition(index) ? (
                  <textarea ref={textareaRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineTextarea} rows={Math.max(2, editValue.split('\n').length)} />
                ) : (
                  <VariableHighlight text={def.definition} multiline isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'definition', index }, def.definition)} />
                )}
              </div>
            </div>
          ))}
        </div>
        {renderAddButton()}
      </div>
    );
  }

  // ============================================
  // LAYOUT: table
  // ============================================
  if (layout === 'table') {
    return (
      <div className={`${styles.definitions} ${styles.layoutTable} ${isSelected ? styles.selected : ''}`}>
        {renderTitle()}
        <table className={styles.defTable}>
          <thead>
            <tr>
              <th className={styles.defTableHeader}>Begriff</th>
              <th className={styles.defTableHeader}>Definition</th>
              {!isPreview && <th className={styles.defTableHeaderAction} />}
            </tr>
          </thead>
          <tbody>
            {currentDefinitions.map((def, index) => (
              <tr key={`def-${index}-${def.term.slice(0, 15)}`} className={styles.defTableRow}>
                <td className={styles.defTableTerm}>
                  {isEditingTerm(index) ? (
                    <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineInput} />
                  ) : (
                    <VariableHighlight text={def.term} isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'term', index }, def.term)} />
                  )}
                </td>
                <td className={styles.defTableDef}>
                  {isEditingDefinition(index) ? (
                    <textarea ref={textareaRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineTextarea} rows={Math.max(2, editValue.split('\n').length)} />
                  ) : (
                    <VariableHighlight text={def.definition} multiline isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'definition', index }, def.definition)} />
                  )}
                </td>
                {!isPreview && (
                  <td className={styles.defTableAction}>
                    {renderRemoveButton(index)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {renderAddButton()}
      </div>
    );
  }

  // ============================================
  // LAYOUT: inline
  // ============================================
  if (layout === 'inline') {
    return (
      <div className={`${styles.definitions} ${styles.layoutInline} ${isSelected ? styles.selected : ''}`}>
        {renderTitle()}
        <div className={styles.inlineList}>
          {currentDefinitions.map((def, index) => (
            <div key={`def-${index}-${def.term.slice(0, 15)}`} className={styles.inlineItem}>
              <div className={styles.inlineRow}>
                <span className={styles.inlineTermWrap}>
                  {isEditingTerm(index) ? (
                    <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineInput} />
                  ) : (
                    <>
                      <strong>&ldquo;</strong>
                      <strong>
                        <VariableHighlight text={def.term} isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'term', index }, def.term)} />
                      </strong>
                      <strong>&rdquo;</strong>
                    </>
                  )}
                  <span className={styles.inlineDash}> &mdash; </span>
                  {isEditingDefinition(index) ? (
                    <textarea ref={textareaRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineTextarea} rows={Math.max(2, editValue.split('\n').length)} />
                  ) : (
                    <VariableHighlight text={def.definition} multiline isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'definition', index }, def.definition)} />
                  )}
                </span>
                {renderRemoveButton(index)}
              </div>
            </div>
          ))}
        </div>
        {renderAddButton()}
      </div>
    );
  }

  // ============================================
  // LAYOUT: numbered
  // ============================================
  return (
    <div className={`${styles.definitions} ${styles.layoutNumbered} ${isSelected ? styles.selected : ''}`}>
      {renderTitle()}
      <div className={styles.numberedList}>
        {currentDefinitions.map((def, index) => {
          const letter = String.fromCharCode(97 + (index % 26)); // a, b, c, ...
          return (
            <div key={`def-${index}-${def.term.slice(0, 15)}`} className={styles.numberedItem}>
              <span className={styles.numberedLabel}>({letter})</span>
              <div className={styles.numberedContent}>
                <span className={styles.numberedTermWrap}>
                  {isEditingTerm(index) ? (
                    <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineInput} />
                  ) : (
                    <>
                      &ldquo;
                      <strong>
                        <VariableHighlight text={def.term} isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'term', index }, def.term)} />
                      </strong>
                      &rdquo;
                    </>
                  )}
                </span>
                {' bedeutet '}
                {isEditingDefinition(index) ? (
                  <textarea ref={textareaRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={styles.inlineTextarea} rows={Math.max(2, editValue.split('\n').length)} />
                ) : (
                  <VariableHighlight text={def.definition} multiline isPreview={isPreview} onDoubleClick={() => handleDoubleClick({ type: 'definition', index }, def.definition)} />
                )}
                {renderRemoveButton(index)}
              </div>
            </div>
          );
        })}
      </div>
      {renderAddButton()}
    </div>
  );
};

export default DefinitionsBlock;

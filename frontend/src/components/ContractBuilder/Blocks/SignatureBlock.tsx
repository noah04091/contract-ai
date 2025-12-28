/**
 * SignatureBlock - Unterschriftenbereich
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { PenTool, Calendar, MapPin, User } from 'lucide-react';
import styles from './SignatureBlock.module.css';

interface SignatureBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = { type: 'label'; index: number } | { type: 'witness'; index: number } | null;

export const SignatureBlock: React.FC<SignatureBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { signatureFields, witnesses, showSignatureIcons = false } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Default signature fields falls keine definiert
  const fields = signatureFields && signatureFields.length > 0
    ? signatureFields
    : [
        { partyIndex: 0, label: 'Partei 1', showDate: true, showPlace: true },
        { partyIndex: 1, label: 'Partei 2', showDate: true, showPlace: true },
      ];

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

    if (editingField.type === 'label') {
      const newFields = [...fields];
      newFields[editingField.index] = {
        ...newFields[editingField.index],
        label: editValue
      };
      updateBlockContent(blockId, { signatureFields: newFields });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, fields, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [handleSave]);

  const isEditingLabel = (index: number) => {
    return editingField?.type === 'label' && editingField.index === index;
  };

  return (
    <div className={`${styles.signature} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.signatureHeader}>
        {showSignatureIcons && <PenTool size={16} />}
        <span>Unterschriften</span>
      </div>

      <div className={styles.signatureGrid}>
        {fields.map((field, index) => (
          <div key={index} className={styles.signatureField}>
            {/* Ort und Datum */}
            {(field.showPlace || field.showDate) && (
              <div className={styles.placeDateRow}>
                {field.showPlace && (
                  <div className={styles.placeField}>
                    {showSignatureIcons && <MapPin size={12} className={styles.fieldIcon} />}
                    <span className={styles.fieldLabel}>Ort</span>
                    <div className={styles.fieldLine} />
                  </div>
                )}
                {field.showDate && (
                  <div className={styles.dateField}>
                    {showSignatureIcons && <Calendar size={12} className={styles.fieldIcon} />}
                    <span className={styles.fieldLabel}>Datum</span>
                    <div className={styles.fieldLine} />
                  </div>
                )}
              </div>
            )}

            {/* Unterschriftslinie */}
            <div className={styles.signatureLine}>
              <div className={styles.signatureLineInner} />
            </div>

            {/* Label */}
            <div className={styles.signatureLabel}>
              {showSignatureIcons && <User size={12} className={styles.labelIcon} />}
              {isEditingLabel(index) ? (
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
                  text={field.label || 'Unterschrift'}
                  isPreview={isPreview}
                  onDoubleClick={() => handleDoubleClick({ type: 'label', index }, field.label || 'Unterschrift')}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Zeugen - nur anzeigen wenn mehr als 0 */}
      {witnesses !== undefined && witnesses > 0 && (
        <div className={styles.witnessSection}>
          <div className={styles.witnessHeader}>
            <span>Zeugen</span>
          </div>
          <div className={styles.witnessGrid}>
            {Array.from({ length: witnesses }).map((_, index) => (
              <div key={index} className={styles.witnessField}>
                <div className={styles.signatureLine}>
                  <div className={styles.signatureLineInner} />
                </div>
                <span className={styles.witnessLabel}>Zeuge {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureBlock;

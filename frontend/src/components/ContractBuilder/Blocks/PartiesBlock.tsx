/**
 * PartiesBlock - Vertragsparteien (2 Spalten)
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { User, Building2, Mail, Phone, FileText } from 'lucide-react';
import styles from './PartiesBlock.module.css';

interface PartiesBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type PartyField = 'role' | 'name' | 'address' | 'taxId' | 'email' | 'phone';
type EditingField = { party: 1 | 2; field: PartyField } | null;

export const PartiesBlock: React.FC<PartiesBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { party1, party2 } = content;
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

  const handleDoubleClick = useCallback((party: 1 | 2, field: PartyField, currentValue: string) => {
    if (isPreview) return;
    setEditingField({ party, field });
    setEditValue(currentValue);
  }, [isPreview]);

  const handleSave = useCallback(() => {
    if (!editingField) return;

    const { party, field } = editingField;
    const partyKey = party === 1 ? 'party1' : 'party2';
    const currentParty = party === 1 ? party1 : party2;

    updateBlockContent(blockId, {
      [partyKey]: {
        ...currentParty,
        [field]: editValue
      }
    });

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, party1, party2, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [handleSave]);

  const isEditing = (party: 1 | 2, field: PartyField) => {
    return editingField?.party === party && editingField?.field === field;
  };

  const renderEditableField = (party: 1 | 2, field: PartyField, value: string, defaultValue: string) => {
    if (isEditing(party, field)) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={styles.inlineInput}
        />
      );
    }

    return (
      <VariableHighlight
        text={value || defaultValue}
        isPreview={isPreview}
        onDoubleClick={() => handleDoubleClick(party, field, value || defaultValue)}
      />
    );
  };

  const renderParty = (party: typeof party1, partyNum: 1 | 2) => {
    if (!party) return null;

    return (
      <div className={styles.partyCard}>
        <div className={styles.partyHeader}>
          <div className={styles.partyIcon}>
            {partyNum === 1 ? <Building2 size={18} /> : <User size={18} />}
          </div>
          <span className={styles.partyRole}>
            {renderEditableField(partyNum, 'role', party.role || '', `Partei ${partyNum}`)}
          </span>
        </div>

        <div className={styles.partyDetails}>
          {/* Name */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Name:</span>
            <span className={styles.detailValue}>
              {renderEditableField(partyNum, 'name', party.name || '', '{{name}}')}
            </span>
          </div>

          {/* Adresse */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Adresse:</span>
            <span className={styles.detailValue}>
              {renderEditableField(partyNum, 'address', party.address || '', '{{adresse}}')}
            </span>
          </div>

          {/* Steuer-ID */}
          <div className={styles.detailRow}>
            <FileText size={12} className={styles.detailIcon} />
            <span className={styles.detailValue}>
              {renderEditableField(partyNum, 'taxId', party.taxId || '', '{{steuer_id}}')}
            </span>
          </div>

          {/* E-Mail */}
          <div className={styles.detailRow}>
            <Mail size={12} className={styles.detailIcon} />
            <span className={styles.detailValue}>
              {renderEditableField(partyNum, 'email', party.email || '', '{{email}}')}
            </span>
          </div>

          {/* Telefon */}
          <div className={styles.detailRow}>
            <Phone size={12} className={styles.detailIcon} />
            <span className={styles.detailValue}>
              {renderEditableField(partyNum, 'phone', party.phone || '', '{{telefon}}')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Default parties falls keine definiert
  const defaultParty1 = party1 || { role: 'Auftraggeber', name: '{{auftraggeber_name}}', address: '{{auftraggeber_adresse}}' };
  const defaultParty2 = party2 || { role: 'Auftragnehmer', name: '{{auftragnehmer_name}}', address: '{{auftragnehmer_adresse}}' };

  return (
    <div className={`${styles.parties} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.partiesGrid}>
        {renderParty(defaultParty1, 1)}
        <div className={styles.partiesDivider}>
          <span className={styles.andText}>und</span>
        </div>
        {renderParty(defaultParty2, 2)}
      </div>
    </div>
  );
};

export default PartiesBlock;

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
  const { party1, party2, showPartyIcons = false, partiesLayout = 'modern' } = content;
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

  // Prefix für Variablen basierend auf Partei
  const getVariablePrefix = (partyNum: 1 | 2) => {
    const p1 = party1?.role?.toLowerCase().replace(/\s+/g, '_') || 'partei1';
    const p2 = party2?.role?.toLowerCase().replace(/\s+/g, '_') || 'partei2';
    return partyNum === 1 ? p1 : p2;
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

  // Prüft ob ein Feld einen echten Wert hat (nicht leer, kein Platzhalter, kein "-")
  const hasRealValue = (value: string | undefined): boolean => {
    if (!value || !value.trim()) return false;
    if (value.trim() === '-' || value.trim() === '–') return false;
    if (/^\{\{.*\}\}$/.test(value.trim())) return false; // Variable-Platzhalter
    return true;
  };

  const renderParty = (party: typeof party1, partyNum: 1 | 2) => {
    if (!party) return null;

    // Eindeutige Prefix für Variablen pro Partei
    const prefix = getVariablePrefix(partyNum);

    // Optionale Felder: In Preview/PDF nur anzeigen wenn ausgefüllt
    const showTaxId = !isPreview || hasRealValue(party.taxId);
    const showEmail = !isPreview || hasRealValue(party.email);
    const showPhone = !isPreview || hasRealValue(party.phone);
    const showAddress = !isPreview || hasRealValue(party.address);

    return (
      <div className={styles.partyCard}>
        <div className={styles.partyHeader}>
          {/* Icons nur anzeigen wenn explizit aktiviert */}
          {showPartyIcons && (
            <div className={styles.partyIcon}>
              {partyNum === 1 ? <Building2 size={18} /> : <User size={18} />}
            </div>
          )}
          <span className={styles.partyRole}>
            {renderEditableField(partyNum, 'role', party.role || '', `Partei ${partyNum}`)}
          </span>
        </div>

        <div className={styles.partyDetails}>
          {/* Name */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Name:</span>
            <span className={styles.detailValue}>
              {renderEditableField(partyNum, 'name', party.name || '', `{{${prefix}_name}}`)}
            </span>
          </div>

          {/* Adresse - in Preview nur wenn ausgefüllt */}
          {showAddress && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Adresse:</span>
              <span className={styles.detailValue}>
                {renderEditableField(partyNum, 'address', party.address || '', `{{${prefix}_adresse}}`)}
              </span>
            </div>
          )}

          {/* Steuer-ID - in Preview nur wenn ausgefüllt */}
          {showTaxId && (
            <div className={styles.detailRow}>
              {showPartyIcons && <FileText size={12} className={styles.detailIcon} />}
              {!showPartyIcons && <span className={styles.detailLabel}>Steuer-ID:</span>}
              <span className={styles.detailValue}>
                {renderEditableField(partyNum, 'taxId', party.taxId || '', `{{${prefix}_steuer_id}}`)}
              </span>
            </div>
          )}

          {/* E-Mail - in Preview nur wenn ausgefüllt */}
          {showEmail && (
            <div className={styles.detailRow}>
              {showPartyIcons && <Mail size={12} className={styles.detailIcon} />}
              {!showPartyIcons && <span className={styles.detailLabel}>E-Mail:</span>}
              <span className={styles.detailValue}>
                {renderEditableField(partyNum, 'email', party.email || '', `{{${prefix}_email}}`)}
              </span>
            </div>
          )}

          {/* Telefon - in Preview nur wenn ausgefüllt */}
          {showPhone && (
            <div className={styles.detailRow}>
              {showPartyIcons && <Phone size={12} className={styles.detailIcon} />}
              {!showPartyIcons && <span className={styles.detailLabel}>Telefon:</span>}
              <span className={styles.detailValue}>
                {renderEditableField(partyNum, 'phone', party.phone || '', `{{${prefix}_telefon}}`)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Default parties falls keine definiert
  const defaultParty1 = party1 || { role: 'Auftraggeber', name: '{{auftraggeber_name}}', address: '{{auftraggeber_adresse}}' };
  const defaultParty2 = party2 || { role: 'Auftragnehmer', name: '{{auftragnehmer_name}}', address: '{{auftragnehmer_adresse}}' };

  // Klassisches Layout rendern (vertikal, traditionell)
  const renderClassicLayout = () => {
    const p1 = defaultParty1;
    const p2 = defaultParty2;
    const prefix1 = getVariablePrefix(1);
    const prefix2 = getVariablePrefix(2);

    return (
      <div className={styles.classicLayout}>
        <div className={styles.classicIntro}>zwischen</div>

        <div className={styles.classicParty}>
          <div className={styles.classicName}>
            {renderEditableField(1, 'name', p1.name || '', `{{${prefix1}_name}}`)}
          </div>
          {(!isPreview || hasRealValue(p1.address)) && (
            <div className={styles.classicAddress}>
              {renderEditableField(1, 'address', p1.address || '', `{{${prefix1}_adresse}}`)}
            </div>
          )}
          <div className={styles.classicDesignation}>
            - nachfolgend "<span className={styles.classicRole}>
              {renderEditableField(1, 'role', p1.role || '', 'Auftraggeber')}
            </span>" genannt -
          </div>
        </div>

        <div className={styles.classicConnector}>und</div>

        <div className={styles.classicParty}>
          <div className={styles.classicName}>
            {renderEditableField(2, 'name', p2.name || '', `{{${prefix2}_name}}`)}
          </div>
          {(!isPreview || hasRealValue(p2.address)) && (
            <div className={styles.classicAddress}>
              {renderEditableField(2, 'address', p2.address || '', `{{${prefix2}_adresse}}`)}
            </div>
          )}
          <div className={styles.classicDesignation}>
            - nachfolgend "<span className={styles.classicRole}>
              {renderEditableField(2, 'role', p2.role || '', 'Auftragnehmer')}
            </span>" genannt -
          </div>
        </div>
      </div>
    );
  };

  // Modernes Layout rendern (side-by-side)
  const renderModernLayout = () => {
    return (
      <div className={styles.partiesGrid}>
        {renderParty(defaultParty1, 1)}
        <div className={styles.partiesDivider}>
          <span className={styles.andText}>und</span>
        </div>
        {renderParty(defaultParty2, 2)}
      </div>
    );
  };

  return (
    <div className={`${styles.parties} ${isSelected ? styles.selected : ''}`}>
      {partiesLayout === 'classic' ? renderClassicLayout() : renderModernLayout()}
    </div>
  );
};

export default PartiesBlock;

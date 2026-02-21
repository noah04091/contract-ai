/**
 * SignatureBlock - Unterschriftenbereich
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  const { signatureFields, witnesses, showSignatureIcons = false, signatureLayout = 'modern' } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Default signature fields falls keine definiert
  const fields = useMemo(() =>
    signatureFields && signatureFields.length > 0
      ? signatureFields
      : [
          { partyIndex: 0, label: 'Partei 1', showDate: true, showPlace: true },
          { partyIndex: 1, label: 'Partei 2', showDate: true, showPlace: true },
        ],
    [signatureFields]
  );

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

  // Modernes Layout - Karten mit separaten Ort/Datum Feldern
  const renderModernLayout = () => (
    <>
      <div className={styles.signatureHeader}>
        {showSignatureIcons && <PenTool size={16} />}
        <span>Unterschriften</span>
      </div>

      <div className={styles.signatureGrid}>
        {fields.map((field, index) => (
          <div key={`sig-${field.partyIndex ?? index}-${field.label || index}`} className={styles.signatureField}>
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
              <div key={`witness-${index}`} className={styles.witnessField}>
                <div className={styles.signatureLine}>
                  <div className={styles.signatureLineInner} />
                </div>
                <span className={styles.witnessLabel}>Zeuge {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  // Klassisches Layout - traditionelle Unterschriftslinien
  const renderClassicLayout = () => (
    <div className={styles.classicLayout}>
      {fields.map((field, index) => (
        <div key={`csig-${field.partyIndex ?? index}-${field.label || index}`} className={styles.classicSignatureField}>
          {/* Ort, Datum Zeile */}
          <div className={styles.classicPlaceDateRow}>
            <span className={styles.classicLabel}>Ort, Datum</span>
            <div className={styles.classicLine} />
          </div>

          {/* Unterschrift Zeile */}
          <div className={styles.classicSignatureRow}>
            <div className={styles.classicLine} />
          </div>

          {/* Label unter der Linie */}
          <div className={styles.classicNameLabel}>
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
                text={field.label || `(${index === 0 ? 'Auftraggeber' : 'Auftragnehmer'})`}
                isPreview={isPreview}
                onDoubleClick={() => handleDoubleClick({ type: 'label', index }, field.label || `(${index === 0 ? 'Auftraggeber' : 'Auftragnehmer'})`)}
              />
            )}
          </div>
        </div>
      ))}

      {/* Zeugen klassisch */}
      {witnesses !== undefined && witnesses > 0 && (
        <div className={styles.classicWitnessSection}>
          <div className={styles.classicWitnessTitle}>Zeugen:</div>
          {Array.from({ length: witnesses }).map((_, index) => (
            <div key={`cwitness-${index}`} className={styles.classicSignatureField}>
              <div className={styles.classicPlaceDateRow}>
                <span className={styles.classicLabel}>Ort, Datum</span>
                <div className={styles.classicLine} />
              </div>
              <div className={styles.classicSignatureRow}>
                <div className={styles.classicLine} />
              </div>
              <div className={styles.classicNameLabel}>(Zeuge {index + 1})</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Formales Layout - mit Firmenstempel-Bereich
  const renderFormalLayout = () => (
    <div className={styles.formalLayout}>
      <div className={styles.formalHeader}>Unterschriften</div>
      {fields.map((field, index) => (
        <div key={`fsig-${field.partyIndex ?? index}-${field.label || index}`} className={styles.formalSignatureField}>
          {/* Ort, Datum Zeile */}
          <div className={styles.formalPlaceDateRow}>
            <div className={styles.formalPlaceDate}>
              <span className={styles.formalLabel}>Ort, Datum</span>
              <div className={styles.formalLine} />
            </div>
          </div>

          <div className={styles.formalSignatureArea}>
            {/* Firmenstempel */}
            <div className={styles.formalStamp}>
              <span className={styles.formalStampLabel}>Firmenstempel</span>
            </div>
            {/* Unterschrift */}
            <div className={styles.formalSignature}>
              <div className={styles.formalSigLine} />
              <div className={styles.formalNameLabel}>
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
                    text={field.label || `(Name, Funktion)`}
                    isPreview={isPreview}
                    onDoubleClick={() => handleDoubleClick({ type: 'label', index }, field.label || '(Name, Funktion)')}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Zeugen formal */}
      {witnesses !== undefined && witnesses > 0 && (
        <div className={styles.formalWitnessSection}>
          <div className={styles.formalWitnessTitle}>Zeugen:</div>
          {Array.from({ length: witnesses }).map((_, index) => (
            <div key={`fwitness-${index}`} className={styles.formalSignatureField}>
              <div className={styles.formalPlaceDateRow}>
                <div className={styles.formalPlaceDate}>
                  <span className={styles.formalLabel}>Ort, Datum</span>
                  <div className={styles.formalLine} />
                </div>
              </div>
              <div className={styles.formalSignature} style={{ maxWidth: '350px' }}>
                <div className={styles.formalSigLine} />
                <div className={styles.formalNameLabel}>(Zeuge {index + 1})</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Corporate Layout - Strukturierte Boxen
  const renderCorporateLayout = () => (
    <div className={styles.corporateLayout}>
      <div className={styles.corporateHeader}>Unterschriften der Vertragsparteien</div>
      <div className={styles.corporateGrid}>
        {fields.map((field, index) => (
          <div key={`csig2-${field.partyIndex ?? index}-${field.label || index}`} className={styles.corporateCard}>
            <div className={styles.corporateCardHeader}>
              <span className={styles.corporatePartyLabel}>Partei {index + 1}</span>
            </div>
            <div className={styles.corporateCardBody}>
              <div className={styles.corporateField}>
                <span className={styles.corporateFieldLabel}>Name / Firma</span>
                <div className={styles.corporateFieldValue}>
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
                      text={field.label || '___________________'}
                      isPreview={isPreview}
                      onDoubleClick={() => handleDoubleClick({ type: 'label', index }, field.label || '')}
                    />
                  )}
                </div>
              </div>
              {field.showDate && (
                <div className={styles.corporateField}>
                  <span className={styles.corporateFieldLabel}>Datum</span>
                  <div className={styles.corporateFieldLine} />
                </div>
              )}
              {field.showPlace && (
                <div className={styles.corporateField}>
                  <span className={styles.corporateFieldLabel}>Ort</span>
                  <div className={styles.corporateFieldLine} />
                </div>
              )}
              <div className={styles.corporateField}>
                <span className={styles.corporateFieldLabel}>Unterschrift</span>
                <div className={styles.corporateSignatureLine} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {witnesses !== undefined && witnesses > 0 && (
        <div className={styles.corporateWitness}>
          <div className={styles.corporateWitnessTitle}>Zeugen</div>
          <div className={styles.corporateGrid}>
            {Array.from({ length: witnesses }).map((_, index) => (
              <div key={`cwitness2-${index}`} className={styles.corporateCard}>
                <div className={styles.corporateCardBody}>
                  <div className={styles.corporateField}>
                    <span className={styles.corporateFieldLabel}>Unterschrift</span>
                    <div className={styles.corporateSignatureLine} />
                  </div>
                  <div className={styles.corporateFieldValue}>Zeuge {index + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Elegant Layout - Dekorative Trennlinie, Serif-Labels
  const renderElegantLayout = () => (
    <div className={styles.elegantLayout}>
      <div className={styles.elegantDecoLine} />
      <div className={styles.elegantTitle}>Unterschriften</div>
      <div className={styles.elegantGrid}>
        {fields.map((field, index) => (
          <div key={`esig-${field.partyIndex ?? index}-${field.label || index}`} className={styles.elegantField}>
            {(field.showPlace || field.showDate) && (
              <div className={styles.elegantMetaRow}>
                {field.showPlace && (
                  <div className={styles.elegantMeta}>
                    <span className={styles.elegantMetaLabel}>Ort</span>
                    <div className={styles.elegantMetaLine} />
                  </div>
                )}
                {field.showDate && (
                  <div className={styles.elegantMeta}>
                    <span className={styles.elegantMetaLabel}>Datum</span>
                    <div className={styles.elegantMetaLine} />
                  </div>
                )}
              </div>
            )}
            <div className={styles.elegantSigArea}>
              <div className={styles.elegantSigLine} />
            </div>
            <div className={styles.elegantLabel}>
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

      {witnesses !== undefined && witnesses > 0 && (
        <div className={styles.elegantWitnessSection}>
          <div className={styles.elegantWitnessTitle}>Zeugen</div>
          <div className={styles.elegantGrid}>
            {Array.from({ length: witnesses }).map((_, index) => (
              <div key={`ewitness-${index}`} className={styles.elegantField}>
                <div className={styles.elegantSigArea}>
                  <div className={styles.elegantSigLine} />
                </div>
                <div className={styles.elegantLabel}>Zeuge {index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderByLayout = () => {
    switch (signatureLayout) {
      case 'classic':
        return renderClassicLayout();
      case 'formal':
        return renderFormalLayout();
      case 'corporate':
        return renderCorporateLayout();
      case 'elegant':
        return renderElegantLayout();
      default:
        return renderModernLayout();
    }
  };

  return (
    <div className={`${styles.signature} ${isSelected ? styles.selected : ''}`}>
      {renderByLayout()}
    </div>
  );
};

export default SignatureBlock;

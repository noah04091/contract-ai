/**
 * CoverBlock - Ganzseitiger Deckblatt-Block mit 5 Layout-Varianten
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './CoverBlock.module.css';

export type CoverLayout = 'executive-center' | 'modern-sidebar' | 'minimal-clean' | 'corporate-banner' | 'elegant-frame';

interface CoverBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField =
  | 'coverTitle'
  | 'coverSubtitle'
  | 'contractType'
  | 'coverDate'
  | 'referenceNumber'
  | 'confidentialityNotice'
  | 'partySummary1'
  | 'partySummary2'
  | null;

export const CoverBlock: React.FC<CoverBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const updateBlockContent = useContractBuilderStore((s) => s.updateBlockContent);
  const document = useContractBuilderStore((s) => s.document);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const coverLayout = (content.coverLayout as CoverLayout) || 'executive-center';
  const coverTitle = content.coverTitle || document?.metadata?.name || 'Vertragstitel';
  const coverSubtitle = content.coverSubtitle || '';
  const contractType = content.contractType || document?.metadata?.contractType || '';
  const coverDate = content.coverDate || new Date().toLocaleDateString('de-DE');
  const referenceNumber = content.referenceNumber || '';
  const confidentialityNotice = content.confidentialityNotice || '';
  const partySummary1 = content.partySummary1 || '';
  const partySummary2 = content.partySummary2 || '';
  const accentColor = content.coverAccentColor || '#0B1324';

  useEffect(() => {
    if (editingField) {
      inputRef.current?.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editingField]);

  const handleDoubleClick = useCallback(
    (field: EditingField, currentValue: string) => {
      if (isPreview) return;
      setEditingField(field);
      setEditValue(currentValue);
    },
    [isPreview]
  );

  const handleSave = useCallback(() => {
    if (!editingField) return;
    updateBlockContent(blockId, { [editingField]: editValue });
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, updateBlockContent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        setEditingField(null);
        setEditValue('');
      }
    },
    [handleSave]
  );

  const renderEditable = useCallback(
    (field: EditingField, value: string, placeholder: string, className: string, multiline = false) => {
      if (editingField === field) {
        const Tag = multiline ? 'textarea' : 'input';
        return (
          <Tag
            ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
            type={multiline ? undefined : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`${styles.inlineInput} ${className}`}
            rows={multiline ? 2 : undefined}
          />
        );
      }
      if (!value && isPreview) return null;
      return (
        <VariableHighlight
          text={value || placeholder}
          isPreview={isPreview}
          onDoubleClick={() => handleDoubleClick(field, value || '')}
        />
      );
    },
    [editingField, editValue, isPreview, handleSave, handleKeyDown, handleDoubleClick]
  );

  // ─── Layout: Executive Center ────────────────────────────────────────
  const renderExecutiveCenter = () => (
    <div className={styles.executiveCenter}>
      <div className={styles.ecSpacer} />
      <div className={styles.ecContent}>
        {contractType && (
          <div className={styles.ecContractType} onDoubleClick={() => handleDoubleClick('contractType', contractType)}>
            {renderEditable('contractType', contractType, 'Vertragstyp', styles.ecContractTypeInput)}
          </div>
        )}
        <div className={styles.ecDividerTop} style={{ borderColor: accentColor }} />
        <h1 className={styles.ecTitle} onDoubleClick={() => handleDoubleClick('coverTitle', coverTitle)}>
          {renderEditable('coverTitle', coverTitle, 'Vertragstitel', styles.ecTitleInput)}
        </h1>
        {(coverSubtitle || !isPreview) && (
          <div className={styles.ecSubtitle} onDoubleClick={() => handleDoubleClick('coverSubtitle', coverSubtitle)}>
            {renderEditable('coverSubtitle', coverSubtitle, 'Untertitel (optional)', styles.ecSubtitleInput)}
          </div>
        )}
        <div className={styles.ecDividerBottom} style={{ borderColor: accentColor }} />

        <div className={styles.ecParties}>
          {(partySummary1 || !isPreview) && (
            <div className={styles.ecParty} onDoubleClick={() => handleDoubleClick('partySummary1', partySummary1)}>
              {renderEditable('partySummary1', partySummary1, 'Partei 1', styles.ecPartyInput)}
            </div>
          )}
          {(partySummary1 || partySummary2 || !isPreview) && <div className={styles.ecPartyDivider}>und</div>}
          {(partySummary2 || !isPreview) && (
            <div className={styles.ecParty} onDoubleClick={() => handleDoubleClick('partySummary2', partySummary2)}>
              {renderEditable('partySummary2', partySummary2, 'Partei 2', styles.ecPartyInput)}
            </div>
          )}
        </div>
      </div>

      <div className={styles.ecFooter}>
        {(referenceNumber || !isPreview) && (
          <div className={styles.ecRef} onDoubleClick={() => handleDoubleClick('referenceNumber', referenceNumber)}>
            {renderEditable('referenceNumber', referenceNumber, 'Aktenzeichen / Ref.', styles.ecRefInput)}
          </div>
        )}
        <div className={styles.ecDate} onDoubleClick={() => handleDoubleClick('coverDate', coverDate)}>
          {renderEditable('coverDate', coverDate, 'Datum', styles.ecDateInput)}
        </div>
        {(confidentialityNotice || !isPreview) && (
          <div className={styles.ecConfidential} onDoubleClick={() => handleDoubleClick('confidentialityNotice', confidentialityNotice)}>
            {renderEditable('confidentialityNotice', confidentialityNotice, 'Vertraulichkeitsvermerk', styles.ecConfInput)}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Layout: Modern Sidebar ──────────────────────────────────────────
  const renderModernSidebar = () => (
    <div className={styles.modernSidebar}>
      <div className={styles.msSidebar} style={{ backgroundColor: accentColor }} />
      <div className={styles.msContent}>
        <div className={styles.msTop}>
          {(contractType || !isPreview) && (
            <div className={styles.msContractType} style={{ color: accentColor }}>
              {renderEditable('contractType', contractType, 'Vertragstyp', styles.msTypeInput)}
            </div>
          )}
        </div>
        <div className={styles.msCenter}>
          <h1 className={styles.msTitle}>
            {renderEditable('coverTitle', coverTitle, 'Vertragstitel', styles.msTitleInput)}
          </h1>
          {(coverSubtitle || !isPreview) && (
            <div className={styles.msSubtitle}>
              {renderEditable('coverSubtitle', coverSubtitle, 'Untertitel', styles.msSubInput)}
            </div>
          )}
          <div className={styles.msDivider} style={{ backgroundColor: accentColor }} />
          <div className={styles.msParties}>
            {(partySummary1 || !isPreview) && (
              <div className={styles.msParty}>
                {renderEditable('partySummary1', partySummary1, 'Partei 1', styles.msPartyInput)}
              </div>
            )}
            {(partySummary2 || !isPreview) && (
              <div className={styles.msParty}>
                {renderEditable('partySummary2', partySummary2, 'Partei 2', styles.msPartyInput)}
              </div>
            )}
          </div>
        </div>
        <div className={styles.msBottom}>
          <div className={styles.msDate}>
            {renderEditable('coverDate', coverDate, 'Datum', styles.msDateInput)}
          </div>
          {(referenceNumber || !isPreview) && (
            <div className={styles.msRef}>
              {renderEditable('referenceNumber', referenceNumber, 'Ref.', styles.msRefInput)}
            </div>
          )}
          {(confidentialityNotice || !isPreview) && (
            <div className={styles.msConfidential}>
              {renderEditable('confidentialityNotice', confidentialityNotice, 'Vertraulich', styles.msConfInput)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Layout: Minimal Clean ───────────────────────────────────────────
  const renderMinimalClean = () => (
    <div className={styles.minimalClean}>
      <div className={styles.mcSpacer} />
      <div className={styles.mcCenter}>
        {(contractType || !isPreview) && (
          <div className={styles.mcType}>
            {renderEditable('contractType', contractType, 'Vertragstyp', styles.mcTypeInput)}
          </div>
        )}
        <h1 className={styles.mcTitle}>
          {renderEditable('coverTitle', coverTitle, 'Vertragstitel', styles.mcTitleInput)}
        </h1>
        {(coverSubtitle || !isPreview) && (
          <div className={styles.mcSubtitle}>
            {renderEditable('coverSubtitle', coverSubtitle, 'Untertitel', styles.mcSubInput)}
          </div>
        )}
      </div>
      <div className={styles.mcFooter}>
        <div className={styles.mcFooterRow}>
          {(partySummary1 || !isPreview) && (
            <div className={styles.mcFooterItem}>
              {renderEditable('partySummary1', partySummary1, 'Partei 1', styles.mcPartyInput)}
            </div>
          )}
          {(partySummary2 || !isPreview) && (
            <div className={styles.mcFooterItem}>
              {renderEditable('partySummary2', partySummary2, 'Partei 2', styles.mcPartyInput)}
            </div>
          )}
        </div>
        <div className={styles.mcFooterMeta}>
          <span>{renderEditable('coverDate', coverDate, 'Datum', styles.mcDateInput)}</span>
          {(referenceNumber || !isPreview) && (
            <span>{renderEditable('referenceNumber', referenceNumber, 'Ref.', styles.mcRefInput)}</span>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Layout: Corporate Banner ────────────────────────────────────────
  const renderCorporateBanner = () => (
    <div className={styles.corporateBanner}>
      <div className={styles.cbBanner} style={{ backgroundColor: accentColor }}>
        {content.coverLogo && (
          <img src={content.coverLogo} alt="Logo" className={styles.cbLogo} />
        )}
        {(contractType || !isPreview) && (
          <div className={styles.cbType}>
            {renderEditable('contractType', contractType, 'Vertragstyp', styles.cbTypeInput)}
          </div>
        )}
      </div>
      <div className={styles.cbBody}>
        <h1 className={styles.cbTitle}>
          {renderEditable('coverTitle', coverTitle, 'Vertragstitel', styles.cbTitleInput)}
        </h1>
        {(coverSubtitle || !isPreview) && (
          <div className={styles.cbSubtitle}>
            {renderEditable('coverSubtitle', coverSubtitle, 'Untertitel', styles.cbSubInput)}
          </div>
        )}
        <div className={styles.cbDivider} style={{ borderColor: accentColor }} />
        <div className={styles.cbParties}>
          {(partySummary1 || !isPreview) && (
            <div className={styles.cbParty}>
              <span className={styles.cbPartyLabel}>Partei 1</span>
              {renderEditable('partySummary1', partySummary1, 'Name / Firma', styles.cbPartyInput)}
            </div>
          )}
          {(partySummary2 || !isPreview) && (
            <div className={styles.cbParty}>
              <span className={styles.cbPartyLabel}>Partei 2</span>
              {renderEditable('partySummary2', partySummary2, 'Name / Firma', styles.cbPartyInput)}
            </div>
          )}
        </div>
      </div>
      <div className={styles.cbFooter}>
        <div className={styles.cbFooterLeft}>
          {renderEditable('coverDate', coverDate, 'Datum', styles.cbDateInput)}
        </div>
        <div className={styles.cbFooterRight}>
          {(referenceNumber || !isPreview) &&
            renderEditable('referenceNumber', referenceNumber, 'Ref.-Nr.', styles.cbRefInput)}
        </div>
      </div>
      {(confidentialityNotice || !isPreview) && (
        <div className={styles.cbConfidential} style={{ borderColor: accentColor }}>
          {renderEditable('confidentialityNotice', confidentialityNotice, 'Vertraulichkeitsvermerk', styles.cbConfInput)}
        </div>
      )}
    </div>
  );

  // ─── Layout: Elegant Frame ───────────────────────────────────────────
  const renderElegantFrame = () => (
    <div className={styles.elegantFrame}>
      <div className={styles.efOuterFrame} style={{ borderColor: accentColor }}>
        <div className={styles.efInnerFrame} style={{ borderColor: accentColor }}>
          <div className={styles.efContent}>
            <div className={styles.efTopDecor} style={{ borderColor: accentColor }} />
            {(contractType || !isPreview) && (
              <div className={styles.efType} style={{ color: accentColor }}>
                {renderEditable('contractType', contractType, 'Vertragstyp', styles.efTypeInput)}
              </div>
            )}
            <h1 className={styles.efTitle}>
              {renderEditable('coverTitle', coverTitle, 'Vertragstitel', styles.efTitleInput)}
            </h1>
            <div className={styles.efAccentLine} style={{ backgroundColor: accentColor }} />
            {(coverSubtitle || !isPreview) && (
              <div className={styles.efSubtitle}>
                {renderEditable('coverSubtitle', coverSubtitle, 'Untertitel', styles.efSubInput)}
              </div>
            )}
            <div className={styles.efParties}>
              {(partySummary1 || !isPreview) && (
                <div className={styles.efParty}>
                  {renderEditable('partySummary1', partySummary1, 'Partei 1', styles.efPartyInput)}
                </div>
              )}
              {(partySummary1 || partySummary2 || !isPreview) && (
                <div className={styles.efPartyConnector} style={{ color: accentColor }}>&#10040;</div>
              )}
              {(partySummary2 || !isPreview) && (
                <div className={styles.efParty}>
                  {renderEditable('partySummary2', partySummary2, 'Partei 2', styles.efPartyInput)}
                </div>
              )}
            </div>
            <div className={styles.efBottomDecor} style={{ borderColor: accentColor }} />
            <div className={styles.efMeta}>
              <span>{renderEditable('coverDate', coverDate, 'Datum', styles.efDateInput)}</span>
              {(referenceNumber || !isPreview) && (
                <span>{renderEditable('referenceNumber', referenceNumber, 'Ref.', styles.efRefInput)}</span>
              )}
            </div>
            {(confidentialityNotice || !isPreview) && (
              <div className={styles.efConfidential}>
                {renderEditable('confidentialityNotice', confidentialityNotice, 'Vertraulich', styles.efConfInput)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLayout = () => {
    switch (coverLayout) {
      case 'executive-center':
        return renderExecutiveCenter();
      case 'modern-sidebar':
        return renderModernSidebar();
      case 'minimal-clean':
        return renderMinimalClean();
      case 'corporate-banner':
        return renderCorporateBanner();
      case 'elegant-frame':
        return renderElegantFrame();
      default:
        return renderExecutiveCenter();
    }
  };

  return (
    <div className={`${styles.cover} ${isSelected ? styles.selected : ''}`}>
      {renderLayout()}
    </div>
  );
};

export default CoverBlock;

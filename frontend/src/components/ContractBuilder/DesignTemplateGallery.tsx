/**
 * DesignTemplateGallery - Modal zur Auswahl von Design-Vorlagen
 * Zeigt 8 Templates als CSS-gerenderte Preview-Karten
 * Previews zeigen strukturelle Unterschiede: Cover, Header, Preamble, Definitions, Clauses, Signature
 */

import React, { useState } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { designTemplates, DesignTemplate } from '../../data/designTemplates';
import { useContractBuilderStore } from '../../stores/contractBuilderStore';
import styles from './DesignTemplateGallery.module.css';

interface DesignTemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesignTemplateGallery: React.FC<DesignTemplateGalleryProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);
  const applyDesignTemplate = useContractBuilderStore((s) => s.applyDesignTemplate);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!selectedTemplate) return;
    applyDesignTemplate(selectedTemplate);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Palette size={20} />
            <span>Design-Vorlage wählen</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </div>

        <p className={styles.subtitle}>
          Wählen Sie ein Design-Template. Nur Layout und Farben werden geändert — Ihre Inhalte bleiben erhalten.
        </p>

        {/* Template Grid */}
        <div className={styles.grid}>
          {designTemplates.map((template) => (
            <button
              key={template.id}
              className={`${styles.card} ${selectedTemplate?.id === template.id ? styles.cardSelected : ''}`}
              onClick={() => setSelectedTemplate(template)}
            >
              {/* CSS Preview */}
              <div className={styles.preview}>
                <TemplatePreview template={template} />
              </div>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{template.name}</div>
                <div className={styles.cardDesc}>{template.description}</div>
                <div className={styles.cardMeta}>
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: template.preview.primaryColor }}
                  />
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: template.preview.secondaryColor }}
                  />
                  <span className={styles.fontLabel}>{template.preview.fontFamily}</span>
                </div>
              </div>
              {selectedTemplate?.id === template.id && (
                <div className={styles.selectedBadge}>
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Abbrechen
          </button>
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={!selectedTemplate}
          >
            <Palette size={16} />
            <span>Design anwenden</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * TemplatePreview - CSS-gerenderte Mini-Vorschau eines Templates
 * Zeigt strukturelle Unterschiede: Cover, Header, Preamble, Definitions, Clauses, Signature
 */
const TemplatePreview: React.FC<{ template: DesignTemplate }> = ({ template }) => {
  const { primaryColor, secondaryColor, accentColor, fontFamily } = template.preview;

  return (
    <div
      className={styles.previewContainer}
      style={{ fontFamily, color: primaryColor }}
    >
      {/* Cover mini */}
      <div className={styles.previewCover}>
        {template.coverLayout === 'modern-sidebar' && (
          <div className={styles.pvSidebar} style={{ backgroundColor: accentColor }} />
        )}
        {template.coverLayout === 'corporate-banner' && (
          <div className={styles.pvBanner} style={{ backgroundColor: primaryColor }} />
        )}
        {template.coverLayout === 'elegant-frame' && (
          <div className={styles.pvFrame} style={{ borderColor: accentColor }}>
            <div className={styles.pvFrameInner} style={{ borderColor: accentColor }}>
              <div className={styles.pvTitle} style={{ color: primaryColor }}>Vertrag</div>
              <div className={styles.pvAccentLine} style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        )}
        {(template.coverLayout === 'executive-center' || template.coverLayout === 'minimal-clean') && (
          <div className={styles.pvCenterContent}>
            {template.coverLayout === 'executive-center' && (
              <div className={styles.pvDecoLine} style={{ borderColor: accentColor }} />
            )}
            <div className={styles.pvTitle} style={{ color: primaryColor }}>Vertrag</div>
            {template.coverLayout === 'executive-center' && (
              <div className={styles.pvDecoLine} style={{ borderColor: accentColor }} />
            )}
          </div>
        )}
      </div>

      {/* Header mini */}
      <div className={styles.previewHeader}>
        {template.headerLayout === 'centered' && (
          <div className={styles.pvHeaderCentered}>
            <div className={styles.pvHeaderTitle} style={{ backgroundColor: primaryColor }} />
            <div className={styles.pvHeaderDivider} style={{ backgroundColor: accentColor }} />
          </div>
        )}
        {template.headerLayout === 'left-logo' && (
          <div className={styles.pvHeaderLeft}>
            <div className={styles.pvLogoBox} style={{ borderColor: accentColor }} />
            <div className={styles.pvHeaderTitle} style={{ backgroundColor: primaryColor }} />
          </div>
        )}
        {template.headerLayout === 'minimal' && (
          <div className={styles.pvHeaderMinimal}>
            <div className={styles.pvHeaderTitle} style={{ backgroundColor: primaryColor }} />
          </div>
        )}
      </div>

      {/* Preamble mini */}
      <div className={styles.previewPreamble}>
        {template.preambleLayout === 'accent-bar' && (
          <div className={styles.pvPreambleAccent}>
            <div className={styles.pvPreambleBar} style={{ backgroundColor: accentColor }} />
            <div className={styles.pvPreambleLines}>
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '90%' }} />
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '60%' }} />
            </div>
          </div>
        )}
        {template.preambleLayout === 'bordered' && (
          <div className={styles.pvPreambleBordered} style={{ borderColor: secondaryColor }}>
            <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '85%' }} />
            <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '55%' }} />
          </div>
        )}
        {template.preambleLayout === 'minimal' && (
          <div className={styles.pvPreambleMinimal}>
            <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '80%' }} />
            <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '50%' }} />
          </div>
        )}
        {template.preambleLayout === 'quote' && (
          <div className={styles.pvPreambleQuote}>
            <div className={styles.pvQuoteMark} style={{ color: accentColor }}>&ldquo;</div>
            <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '70%' }} />
            <div className={styles.pvQuoteMark} style={{ color: accentColor }}>&rdquo;</div>
          </div>
        )}
      </div>

      {/* Definitions mini */}
      <div className={styles.previewDefs}>
        {template.definitionsLayout === 'card' && (
          <div className={styles.pvDefsCards}>
            {[1, 2].map((i) => (
              <div key={i} className={styles.pvDefCard} style={{ borderLeftColor: accentColor, borderColor: secondaryColor }}>
                <div className={styles.pvLine} style={{ backgroundColor: primaryColor, width: '35%', opacity: 0.6 }} />
              </div>
            ))}
          </div>
        )}
        {template.definitionsLayout === 'table' && (
          <div className={styles.pvDefsTable}>
            <div className={styles.pvDefsTableRow} style={{ borderBottomColor: secondaryColor }}>
              <div className={styles.pvLine} style={{ backgroundColor: primaryColor, width: '30%', opacity: 0.5 }} />
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '55%' }} />
            </div>
            <div className={styles.pvDefsTableRow} style={{ borderBottomColor: secondaryColor }}>
              <div className={styles.pvLine} style={{ backgroundColor: primaryColor, width: '25%', opacity: 0.5 }} />
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '60%' }} />
            </div>
          </div>
        )}
        {template.definitionsLayout === 'inline' && (
          <div className={styles.pvDefsInline}>
            <div className={styles.pvDefsInlineRow}>
              <div className={styles.pvLine} style={{ backgroundColor: primaryColor, width: '25%', opacity: 0.7 }} />
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '55%' }} />
            </div>
            <div className={styles.pvDefsSep} style={{ backgroundColor: secondaryColor }} />
            <div className={styles.pvDefsInlineRow}>
              <div className={styles.pvLine} style={{ backgroundColor: primaryColor, width: '20%', opacity: 0.7 }} />
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '50%' }} />
            </div>
          </div>
        )}
        {template.definitionsLayout === 'numbered' && (
          <div className={styles.pvDefsNumbered}>
            {['a', 'b'].map((letter) => (
              <div key={letter} className={styles.pvDefsNumRow}>
                <span className={styles.pvDefsNumLabel} style={{ color: accentColor }}>({letter})</span>
                <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '70%' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clause mini */}
      <div className={styles.previewClauses}>
        {[1, 2].map((i) => (
          <div key={i} className={styles.pvClause}>
            <div
              className={styles.pvClauseTitle}
              style={{
                color: primaryColor,
                borderLeft: template.clauseLayout === 'indented' ? `2px solid ${accentColor}` : undefined,
                paddingLeft: template.clauseLayout === 'indented' ? '4px' : undefined,
                border: template.clauseLayout === 'boxed' ? `1px solid ${secondaryColor}` : undefined,
                padding: template.clauseLayout === 'boxed' ? '2px 3px' : undefined,
                borderRadius: template.clauseLayout === 'boxed' ? '1px' : undefined,
              }}
            />
            <div className={styles.pvClauseLines}>
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor }} />
              <div className={styles.pvLine} style={{ backgroundColor: secondaryColor, width: '75%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Signature mini */}
      <div className={styles.previewSignature}>
        <div className={styles.pvSigLine} style={{ borderColor: primaryColor }} />
        <div className={styles.pvSigLine} style={{ borderColor: primaryColor }} />
      </div>
    </div>
  );
};

export default DesignTemplateGallery;

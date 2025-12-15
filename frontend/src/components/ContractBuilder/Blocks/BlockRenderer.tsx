/**
 * BlockRenderer - Rendert den richtigen Block-Typ basierend auf block.type
 */

import React from 'react';
import { Block } from '../../../stores/contractBuilderStore';
import { HeaderBlock } from './HeaderBlock';
import { PartiesBlock } from './PartiesBlock';
import { ClauseBlock } from './ClauseBlock';
import { SignatureBlock } from './SignatureBlock';
import { PreambleBlock } from './PreambleBlock';
import { TableBlock } from './TableBlock';
import { DividerBlock } from './DividerBlock';
import { SpacerBlock } from './SpacerBlock';
import { PageBreakBlock } from './PageBreakBlock';
import { AttachmentBlock } from './AttachmentBlock';
import { DateFieldBlock } from './DateFieldBlock';
import { CustomBlock } from './CustomBlock';
import styles from './BlockRenderer.module.css';

interface BlockRendererProps {
  block: Block;
  isSelected: boolean;
  isPreview: boolean;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  isSelected,
  isPreview,
}) => {
  // Block-spezifische Styles anwenden
  const blockStyles: React.CSSProperties = {
    fontFamily: block.style?.fontFamily,
    fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
    fontWeight: block.style?.fontWeight,
    lineHeight: block.style?.lineHeight,
    letterSpacing: block.style?.letterSpacing ? `${block.style.letterSpacing}px` : undefined,
    textAlign: block.style?.textAlign,
    color: block.style?.textColor,
    backgroundColor: block.style?.backgroundColor,
    marginTop: block.style?.marginTop ? `${block.style.marginTop}px` : undefined,
    marginBottom: block.style?.marginBottom ? `${block.style.marginBottom}px` : undefined,
    paddingTop: block.style?.paddingTop ? `${block.style.paddingTop}px` : undefined,
    paddingRight: block.style?.paddingRight ? `${block.style.paddingRight}px` : undefined,
    paddingBottom: block.style?.paddingBottom ? `${block.style.paddingBottom}px` : undefined,
    paddingLeft: block.style?.paddingLeft ? `${block.style.paddingLeft}px` : undefined,
    borderStyle: block.style?.borderStyle,
    borderWidth: block.style?.borderWidth ? `${block.style.borderWidth}px` : undefined,
    borderColor: block.style?.borderColor,
    borderRadius: block.style?.borderRadius ? `${block.style.borderRadius}px` : undefined,
    opacity: block.style?.opacity,
    boxShadow: block.style?.shadow ? '0 2px 8px rgba(0,0,0,0.1)' : undefined,
  };

  // Entferne undefined Werte
  Object.keys(blockStyles).forEach(key => {
    if (blockStyles[key as keyof typeof blockStyles] === undefined) {
      delete blockStyles[key as keyof typeof blockStyles];
    }
  });

  const renderBlock = () => {
    switch (block.type) {
      case 'header':
        return (
          <HeaderBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'parties':
        return (
          <PartiesBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'preamble':
        return (
          <PreambleBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'clause':
        return (
          <ClauseBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'table':
        return (
          <TableBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'signature':
        return (
          <SignatureBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'attachment':
        return (
          <AttachmentBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'date-field':
        return (
          <DateFieldBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'divider':
        return (
          <DividerBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'spacer':
        return (
          <SpacerBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'page-break':
        return (
          <PageBreakBlock
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'custom':
        return (
          <CustomBlock
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      default:
        return (
          <div className={styles.unknownBlock}>
            <span>Unbekannter Block-Typ: {block.type}</span>
          </div>
        );
    }
  };

  return (
    <div
      className={styles.blockWrapper}
      style={blockStyles}
      data-highlight={block.style?.highlight}
    >
      {renderBlock()}

      {/* Legal Basis Tags */}
      {block.legalBasis && block.legalBasis.length > 0 && !isPreview && (
        <div className={styles.legalBasis}>
          {block.legalBasis.map((basis, index) => (
            <span key={index} className={styles.legalTag}>
              {basis}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockRenderer;

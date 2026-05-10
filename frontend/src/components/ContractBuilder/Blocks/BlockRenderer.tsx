/**
 * BlockRenderer - Rendert den richtigen Block-Typ basierend auf block.type
 */

import React, { Component } from 'react';
import { Block } from '../../../stores/contractBuilderStore';
import { HeaderBlock } from './HeaderBlock';
import { CoverBlock } from './CoverBlock';
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
import { LogoBlock } from './LogoBlock';
import { NumberedListBlock } from './NumberedListBlock';
import { DefinitionsBlock } from './DefinitionsBlock';
import { NoticeBlock } from './NoticeBlock';
import styles from './BlockRenderer.module.css';

// Error Boundary für einzelne Blöcke — verhindert dass ein fehlerhafter Block den Builder crasht
interface BlockErrorBoundaryProps {
  blockId: string;
  blockType: string;
  children: React.ReactNode;
}

interface BlockErrorBoundaryState {
  hasError: boolean;
}

class BlockErrorBoundary extends Component<BlockErrorBoundaryProps, BlockErrorBoundaryState> {
  constructor(props: BlockErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BlockErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[BlockRenderer] Fehler in Block ${this.props.blockType} (${this.props.blockId}):`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.blockError}>
          <span>Block konnte nicht geladen werden ({this.props.blockType})</span>
          <button
            className={styles.blockErrorRetry}
            onClick={() => this.setState({ hasError: false })}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface BlockRendererProps {
  block: Block;
  isSelected: boolean;
  isPreview: boolean;
  pageNumber?: number; // Für Seitenumbrüche
}

// Font-Stacks mit Fallbacks
const fontStacks: Record<string, string> = {
  'Inter': "'Inter', system-ui, sans-serif",
  'Roboto': "'Roboto', Arial, sans-serif",
  'Open Sans': "'Open Sans', Arial, sans-serif",
  'Lato': "'Lato', Arial, sans-serif",
  'Merriweather': "'Merriweather', Georgia, serif",
  'Georgia': "Georgia, 'Times New Roman', serif",
  'Times New Roman': "'Times New Roman', Times, serif",
  'Arial': "Arial, Helvetica, sans-serif",
  'Source Code Pro': "'Source Code Pro', 'Courier New', monospace",
};

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  isSelected,
  isPreview,
  pageNumber = 1,
}) => {
  // Block-spezifische Styles anwenden
  const resolvedFont = block.style?.fontFamily
    ? (fontStacks[block.style.fontFamily] || block.style.fontFamily)
    : undefined;

  const blockStyles: React.CSSProperties = {
    fontFamily: resolvedFont,
    fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
    fontWeight: block.style?.fontWeight,
    fontStyle: block.style?.fontStyle,
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
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'cover':
        return (
          <CoverBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'parties':
        return (
          <PartiesBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'preamble':
        return (
          <PreambleBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'clause':
        return (
          <ClauseBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'table':
        return (
          <TableBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'signature':
        return (
          <SignatureBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'attachment':
        return (
          <AttachmentBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
            style={block.style}
          />
        );

      case 'date-field':
        return (
          <DateFieldBlock
            blockId={block.id}
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
            pageNumber={pageNumber}
          />
        );

      case 'custom':
        return (
          <CustomBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'logo':
        return (
          <LogoBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'numbered-list':
        return (
          <NumberedListBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'definitions':
        return (
          <DefinitionsBlock
            blockId={block.id}
            content={block.content}
            isSelected={isSelected}
            isPreview={isPreview}
          />
        );

      case 'notice':
        return (
          <NoticeBlock
            blockId={block.id}
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
      <BlockErrorBoundary blockId={block.id} blockType={block.type}>
        {renderBlock()}
      </BlockErrorBoundary>

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

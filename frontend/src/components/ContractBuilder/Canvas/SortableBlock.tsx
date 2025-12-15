/**
 * SortableBlock - Wrapper für sortierbare Blöcke mit DND-Kit
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block } from '../../../stores/contractBuilderStore';
import { BlockRenderer } from '../Blocks/BlockRenderer';
import { GripVertical, Lock, Sparkles, AlertTriangle } from 'lucide-react';
import styles from './SortableBlock.module.css';

interface SortableBlockProps {
  block: Block;
  index: number;
  isSelected: boolean;
  isPreview: boolean;
  onClick: () => void;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({
  block,
  index,
  isSelected,
  isPreview,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    disabled: block.locked || isPreview,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Risk Level Farben
  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'high': return '#e53e3e';
      case 'medium': return '#dd6b20';
      case 'low': return '#38a169';
      default: return 'transparent';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${styles.sortableBlock}
        ${isSelected ? styles.selected : ''}
        ${isDragging ? styles.dragging : ''}
        ${block.locked ? styles.locked : ''}
        ${isPreview ? styles.preview : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      data-block-id={block.id}
      data-block-type={block.type}
    >
      {/* Block Controls - nur im Edit-Modus sichtbar */}
      {!isPreview && (
        <div className={styles.blockControls}>
          {/* Drag Handle */}
          <button
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
            disabled={block.locked}
            title={block.locked ? 'Block ist gesperrt' : 'Ziehen zum Verschieben'}
          >
            <GripVertical size={16} />
          </button>

          {/* Block Info */}
          <div className={styles.blockInfo}>
            <span className={styles.blockType}>{getBlockTypeLabel(block.type)}</span>
            <span className={styles.blockIndex}>#{index + 1}</span>
          </div>

          {/* Status Icons */}
          <div className={styles.statusIcons}>
            {block.locked && (
              <span className={styles.iconBadge} title="Gesperrt">
                <Lock size={12} />
              </span>
            )}
            {block.aiGenerated && (
              <span className={styles.iconBadge} title="KI-generiert">
                <Sparkles size={12} />
              </span>
            )}
            {block.riskLevel && block.riskLevel !== 'low' && (
              <span
                className={styles.iconBadge}
                style={{ color: getRiskColor(block.riskLevel) }}
                title={`Risiko: ${block.riskLevel}`}
              >
                <AlertTriangle size={12} />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Risk Indicator Bar */}
      {block.riskLevel && !isPreview && (
        <div
          className={styles.riskIndicator}
          style={{ backgroundColor: getRiskColor(block.riskLevel) }}
        />
      )}

      {/* Block Content */}
      <div className={styles.blockContent}>
        <BlockRenderer
          block={block}
          isSelected={isSelected}
          isPreview={isPreview}
        />
      </div>

      {/* Selection Border */}
      {isSelected && !isPreview && (
        <div className={styles.selectionBorder} />
      )}
    </div>
  );
};

// Helper: Block-Typ Label
function getBlockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'header': 'Kopfzeile',
    'parties': 'Parteien',
    'preamble': 'Präambel',
    'clause': 'Klausel',
    'numbered-list': 'Aufzählung',
    'table': 'Tabelle',
    'signature': 'Unterschrift',
    'attachment': 'Anlage',
    'date-field': 'Datum',
    'divider': 'Trenner',
    'spacer': 'Abstand',
    'logo': 'Logo',
    'page-break': 'Seitenumbruch',
    'custom': 'Benutzerdefiniert',
  };
  return labels[type] || type;
}

export default SortableBlock;

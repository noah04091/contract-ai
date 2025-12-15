/**
 * BuilderCanvas - Hauptkomponente für den visuellen Vertragseditor
 * Drag & Drop Canvas mit DND-Kit
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useContractBuilderStore, Block } from '../../../stores/contractBuilderStore';
import { SortableBlock } from './SortableBlock';
import { BlockRenderer } from '../Blocks/BlockRenderer';
import { DropZone } from './DropZone';
import styles from './BuilderCanvas.module.css';

interface BuilderCanvasProps {
  className?: string;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    document: currentDocument,
    selectedBlockId,
    zoom,
    view,
    reorderBlocks,
    setSelectedBlock,
    setDragState,
  } = useContractBuilderStore();

  const blocks = currentDocument?.content.blocks || [];
  const design = currentDocument?.design;

  // Sensoren für Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mindestens 8px bewegen bevor Drag startet
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Measuring Strategy für bessere Performance
  const measuringConfig = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  // Drag Start Handler
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setDragState({
      isDragging: true,
      draggedBlockId: active.id as string,
      dragOverBlockId: null,
    });
  }, [setDragState]);

  // Drag Over Handler
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setDragState({
      isDragging: true,
      draggedBlockId: activeId,
      dragOverBlockId: over?.id as string || null,
    });
  }, [activeId, setDragState]);

  // Drag End Handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setDragState({
      isDragging: false,
      draggedBlockId: null,
      dragOverBlockId: null,
    });

    if (!over) return;

    const oldIndex = blocks.findIndex((block: Block) => block.id === active.id);
    const newIndex = blocks.findIndex((block: Block) => block.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      reorderBlocks(oldIndex, newIndex);
    }
  }, [blocks, reorderBlocks, setDragState]);

  // Block auswählen
  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlock(blockId);
  }, [setSelectedBlock]);

  // Canvas-Klick zum Deselektieren
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains(styles.pageContent)) {
      setSelectedBlock(null);
    }
  }, [setSelectedBlock]);

  // Aktiver Block für DragOverlay
  const activeBlock = activeId ? blocks.find((b: Block) => b.id === activeId) : null;

  // Page Styles basierend auf Design
  const pageStyles: React.CSSProperties = {
    '--primary-color': design?.primaryColor || '#1a365d',
    '--secondary-color': design?.secondaryColor || '#2d3748',
    '--accent-color': design?.accentColor || '#3182ce',
    '--text-primary': design?.textPrimary || '#1a202c',
    '--text-secondary': design?.textSecondary || '#4a5568',
    '--font-family': design?.fontFamily || 'Inter, sans-serif',
    '--heading-font': design?.headingFont || 'Inter, sans-serif',
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'top center',
  } as React.CSSProperties;

  return (
    <div
      ref={canvasRef}
      className={`${styles.canvas} ${className || ''}`}
      onClick={handleCanvasClick}
    >
      {/* Zoom Indicator */}
      <div className={styles.zoomIndicator}>
        {zoom}%
      </div>

      {/* Paper/Document Area */}
      <div className={styles.paperWrapper}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          measuring={measuringConfig}
        >
          <div
            className={`${styles.paper} ${view === 'preview' ? styles.previewMode : ''}`}
            style={pageStyles}
          >
            {/* Page Header (optional) */}
            {design?.showHeaderOnAllPages && (
              <div className={styles.pageHeader}>
                {/* Wiederholender Header */}
              </div>
            )}

            {/* Content Area */}
            <div className={styles.pageContent}>
              {blocks.length === 0 ? (
                <DropZone
                  position={0}
                  isEmpty
                  message="Ziehen Sie Blöcke hierher oder klicken Sie, um zu beginnen"
                />
              ) : (
                <SortableContext
                  items={blocks.map((b: Block) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block: Block, index: number) => {
                    // Berechne Seitennummer für page-break Blöcke
                    const pageBreaksBefore = blocks
                      .slice(0, index)
                      .filter((b: Block) => b.type === 'page-break').length;
                    const pageNumber = pageBreaksBefore + 1;

                    return (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        index={index}
                        isSelected={selectedBlockId === block.id}
                        isPreview={view === 'preview'}
                        onClick={() => handleBlockClick(block.id)}
                        pageNumber={pageNumber}
                      />
                    );
                  })}
                </SortableContext>
              )}
            </div>

            {/* Page Footer */}
            {design?.showPageNumbers && (
              <div className={`${styles.pageFooter} ${styles[design.pageNumberPosition || 'bottom-center']}`}>
                <span className={styles.pageNumber}>Seite 1</span>
              </div>
            )}

            {/* Watermark */}
            {design?.watermark && (
              <div
                className={styles.watermark}
                style={{ opacity: design.watermarkOpacity || 0.1 }}
              >
                {design.watermark}
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeBlock ? (
              <div className={styles.dragOverlay}>
                <BlockRenderer
                  block={activeBlock}
                  isSelected={false}
                  isPreview={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default BuilderCanvas;

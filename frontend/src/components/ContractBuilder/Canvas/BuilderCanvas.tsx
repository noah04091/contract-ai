/**
 * BuilderCanvas - Hauptkomponente für den visuellen Vertragseditor
 * NEU: Separate A4-Seiten mit echten Seitenumbrüchen
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
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
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useContractBuilderStore, Block, _pageBreakFlags } from '../../../stores/contractBuilderStore';
import { SortableBlock } from './SortableBlock';
import { BlockRenderer } from '../Blocks/BlockRenderer';
import { DropZone } from './DropZone';
import styles from './BuilderCanvas.module.css';

interface BuilderCanvasProps {
  className?: string;
}

// Blöcke nach Seiten gruppieren (PageBreak-Blöcke sind die Trennpunkte)
function groupBlocksByPage(blocks: Block[]): Block[][] {
  const pages: Block[][] = [[]];
  let currentPageIndex = 0;

  blocks.forEach((block) => {
    if (block.type === 'page-break') {
      // Starte eine neue Seite
      currentPageIndex++;
      pages[currentPageIndex] = [];
    } else {
      pages[currentPageIndex].push(block);
    }
  });

  return pages;
}

// A4 Seitenhöhe: 297mm ≈ 1122px (bei 96 DPI: 297mm × 3.78px/mm)
// Paper Padding: ~27mm (12mm oben + 15mm unten) ≈ 102px
// Nutzbare Höhe: 1122px - 102px = ~1020px
// MAXIMIERT: Wir nutzen fast den gesamten verfügbaren Platz
const PAGE_CONTENT_HEIGHT_FALLBACK = 1002; // Fallback: 265mm bei 96DPI

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageContentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map()); // Refs für Intersection Observer
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overflowPages, setOverflowPages] = useState<Set<number>>(new Set());
  const autoPageBreakProcessed = useRef<Set<string>>(new Set()); // Verhindert endlose Loops
  const isAutoBreaking = useRef(false); // Concurrent-Guard

  const {
    document: currentDocument,
    selectedBlockId,
    activePageIndex,
    zoom,
    view,
    reorderBlocks,
    setSelectedBlock,
    setActivePage,
    setDragState,
    autoInsertPageBreak,
    deleteBlock,
  } = useContractBuilderStore();

  // Ref-Callback für Page Elemente (für Intersection Observer)
  const setPageRef = useCallback((pageIndex: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageIndex, el);
    } else {
      pageRefs.current.delete(pageIndex);
    }
  }, []);

  const blocks = currentDocument?.content.blocks || [];
  const design = currentDocument?.design;

  // Blöcke nach Seiten gruppieren
  const pages = useMemo(() => groupBlocksByPage(blocks), [blocks]);

  // Scroll-basiertes Auto-Aktivieren der sichtbaren Seite
  useEffect(() => {
    if (view === 'preview') return; // Nur im Edit-Modus
    if (pages.length === 0) return; // Keine Seiten vorhanden

    // Kurze Verzögerung damit Refs gesetzt werden können
    const timeoutId = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          // Finde die Seite mit der größten Sichtbarkeit
          let maxVisibility = 0;
          let mostVisiblePage = -1;

          entries.forEach((entry) => {
            const pageIndex = parseInt(entry.target.getAttribute('data-page-index') || '-1');
            if (pageIndex >= 0 && entry.intersectionRatio > maxVisibility) {
              maxVisibility = entry.intersectionRatio;
              mostVisiblePage = pageIndex;
            }
          });

          // Aktiviere die am meisten sichtbare Seite (nur wenn >30% sichtbar)
          // Nach Auto-PageBreak 1s warten, damit activePageIndex nicht sofort zurückgesetzt wird
          if (mostVisiblePage >= 0 && maxVisibility > 0.3) {
            if (Date.now() - _pageBreakFlags.lastAutoBreakTime > 1000) {
              setActivePage(mostVisiblePage);
            }
          }
        },
        {
          root: canvasRef.current,
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
          rootMargin: '-10% 0px -10% 0px', // Etwas Puffer oben und unten
        }
      );

      // Beobachte alle Seiten
      pageRefs.current.forEach((el) => {
        if (el) observer.observe(el);
      });

      // Speichere Observer für Cleanup
      (window as unknown as { __pageObserver?: IntersectionObserver }).__pageObserver = observer;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const obs = (window as unknown as { __pageObserver?: IntersectionObserver }).__pageObserver;
      if (obs) {
        obs.disconnect();
      }
    };
  }, [view, setActivePage, pages.length]);

  // Überlauf-Erkennung und automatischer Seitenumbruch
  useEffect(() => {
    const checkOverflowAndAutoBreak = () => {
      const newOverflowPages = new Set<number>();

      pages.forEach((pageBlocks, pageIndex) => {
        const pageContentEl = pageContentRefs.current.get(pageIndex);
        if (!pageContentEl) return;

        let cumulativeHeight = 0;

        // Gehe durch alle Blöcke auf dieser Seite
        for (const block of pageBlocks) {
          const blockEl = blockRefs.current.get(block.id);
          if (!blockEl) continue;

          const blockHeight = blockEl.offsetHeight + 16; // +16 für margin
          cumulativeHeight += blockHeight;

          // Prüfe ob dieser Block die Seite überläuft (dynamische Höhe vom DOM)
          if (cumulativeHeight > (pageContentEl.clientHeight || PAGE_CONTENT_HEIGHT_FALLBACK)) {
            newOverflowPages.add(pageIndex);

            // Auto-Seitenumbruch nur wenn nicht bereits verarbeitet und kein anderer läuft
            const processKey = `${pageIndex}-${block.id}`;
            if (!autoPageBreakProcessed.current.has(processKey) && view !== 'preview' && !isAutoBreaking.current) {
              autoPageBreakProcessed.current.add(processKey);
              isAutoBreaking.current = true;

              // Verzögert den PageBreak einfügen um Race Conditions zu vermeiden
              setTimeout(() => {
                autoInsertPageBreak(block.id);
                isAutoBreaking.current = false;
              }, 50);

              return; // Nur einen PageBreak pro Durchlauf
            }
            break;
          }
        }
      });

      setOverflowPages(newOverflowPages);
    };

    // Prüfe nach kurzer Verzögerung (damit DOM aktualisiert ist)
    const timer = setTimeout(checkOverflowAndAutoBreak, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [blocks, pages, autoInsertPageBreak, view]);

  // Reset processed list nur wenn sich Block-IDs ändern (nicht nur Anzahl)
  const blockIdsKey = useMemo(() => blocks.map(b => b.id).join(','), [blocks]);
  useEffect(() => {
    autoPageBreakProcessed.current.clear();
  }, [blockIdsKey]);

  // Ref-Callback für pageContent Elemente
  const setPageContentRef = useCallback((pageIndex: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageContentRefs.current.set(pageIndex, el);
    } else {
      pageContentRefs.current.delete(pageIndex);
    }
  }, []);

  // Ref-Callback für Block Elemente (für Höhenmessung)
  const setBlockRef = useCallback((blockId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      blockRefs.current.set(blockId, el);
    } else {
      blockRefs.current.delete(blockId);
    }
  }, []);

  // Sensoren für Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  // Seite auswählen
  const handlePageClick = useCallback((pageIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePage(pageIndex);
  }, [setActivePage]);

  // Leere Seite löschen (entfernt den zugehörigen page-break Block)
  const handleDeleteEmptyPage = useCallback((pageIndex: number) => {
    if (pageIndex === 0) return; // Erste Seite kann nicht gelöscht werden
    // Finde den N-ten page-break Block (pageIndex - 1, da Seite 0 keinen hat)
    const pageBreakBlocks = blocks.filter((b: Block) => b.type === 'page-break');
    const pageBreakToDelete = pageBreakBlocks[pageIndex - 1];
    if (pageBreakToDelete) {
      deleteBlock(pageBreakToDelete.id);
    }
  }, [blocks, deleteBlock]);

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
  } as React.CSSProperties;

  const zoomStyle: React.CSSProperties = {
    transform: `scale(${zoom / 100})`,
    transformOrigin: 'top center',
  };

  return (
    <div
      ref={canvasRef}
      className={`${styles.canvas} ${className || ''}`}
      onClick={handleCanvasClick}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={measuringConfig}
      >
        <SortableContext
          items={blocks.map((b: Block) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Seiten Container */}
          <div className={styles.pagesContainer} style={zoomStyle}>
            {pages.length === 0 || (pages.length === 1 && pages[0].length === 0) ? (
              // Leeres Dokument - eine leere Seite
              <div className={styles.paperWrapper}>
                <div
                  className={`${styles.paper} ${styles.activePage} ${view === 'preview' ? styles.previewMode : ''}`}
                  style={pageStyles}
                  onClick={(e) => handlePageClick(0, e)}
                >
                  {/* Aktive Seite Badge */}
                  {view !== 'preview' && (
                    <div className={styles.activePageBadge}>
                      Aktive Seite
                    </div>
                  )}
                  <div className={styles.pageContent}>
                    <DropZone
                      position={0}
                      isEmpty
                      message="Ziehen Sie Blöcke hierher oder klicken Sie, um zu beginnen"
                    />
                  </div>
                  {/* Page Footer */}
                  {design?.showPageNumbers && (
                    <div className={`${styles.pageFooter} ${styles[design.pageNumberPosition || 'bottom-center']}`}>
                      <span className={styles.pageNumber}>Seite 1</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Seiten mit Inhalten
              pages.map((pageBlocks, pageIndex) => (
                <div key={pageIndex} className={styles.paperWrapper}>
                  <div
                    ref={setPageRef(pageIndex)}
                    className={`
                      ${styles.paper}
                      ${view === 'preview' ? styles.previewMode : ''}
                      ${activePageIndex === pageIndex && view !== 'preview' ? styles.activePage : ''}
                    `}
                    style={pageStyles}
                    data-page={pageIndex + 1}
                    data-page-index={pageIndex}
                    onClick={(e) => handlePageClick(pageIndex, e)}
                  >
                    {/* Aktive Seite Indikator */}
                    {activePageIndex === pageIndex && view !== 'preview' && (
                      <div className={styles.activePageBadge}>
                        Aktive Seite
                      </div>
                    )}

                    {/* Page Header (optional) */}
                    {design?.showHeaderOnAllPages && pageIndex > 0 && (
                      <div className={styles.pageHeader}>
                        {/* Wiederholender Header */}
                      </div>
                    )}

                    {/* Content Area */}
                    <div
                      className={styles.pageContent}
                      ref={setPageContentRef(pageIndex)}
                    >
                      {pageBlocks.length === 0 ? (
                        <div className={styles.emptyPage}>
                          <span>Seite {pageIndex + 1}</span>
                          <span className={styles.emptyPageHint}>
                            {activePageIndex === pageIndex
                              ? 'Blöcke werden hier eingefügt'
                              : 'Hierher scrollen um Blöcke einzufügen'}
                          </span>
                          {pageIndex > 0 && view !== 'preview' && (
                            <button
                              className={styles.deletePageButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEmptyPage(pageIndex);
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Leere Seite entfernen</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        pageBlocks.map((block: Block) => (
                          <div key={block.id} ref={setBlockRef(block.id)}>
                            <SortableBlock
                              block={block}
                              index={blocks.findIndex((b: Block) => b.id === block.id)}
                              isSelected={selectedBlockId === block.id}
                              isPreview={view === 'preview'}
                              onClick={() => handleBlockClick(block.id)}
                              pageNumber={pageIndex + 1}
                            />
                          </div>
                        ))
                      )}
                    </div>

                    {/* Überlauf-Warnung */}
                    {overflowPages.has(pageIndex) && view !== 'preview' && (
                      <>
                        <div className={styles.overflowOverlay} />
                        <div className={styles.overflowWarning}>
                          <AlertTriangle size={14} />
                          <span>Inhalt zu lang – Seitenumbruch einfügen</span>
                        </div>
                      </>
                    )}

                    {/* Page Footer */}
                    {design?.showPageNumbers && (
                      <div className={`${styles.pageFooter} ${styles[design.pageNumberPosition || 'bottom-center']}`}>
                        <span className={styles.pageNumber}>Seite {pageIndex + 1}</span>
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

                  {/* Seiten-Trenner Label (nur im Edit-Modus) */}
                  {pageIndex < pages.length - 1 && view !== 'preview' && (
                    <div className={styles.pageSeparatorLabel}>
                      <span>Seitenumbruch nach Seite {pageIndex + 1}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SortableContext>

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
  );
};

export default BuilderCanvas;

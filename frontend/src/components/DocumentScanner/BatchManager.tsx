/**
 * BatchManager
 *
 * Horizontale scrollbare Thumbnail-Leiste am unteren Bildschirmrand:
 * - Nummerierte Seiten mit Löschen-Button
 * - Tap zum Auswählen/Bearbeiten
 * - "+" Button zum Hinzufügen
 */

import React from "react";
import { X, Plus } from "lucide-react";
import type { ScannedPage } from "./hooks/useBatchPages";
import styles from "./DocumentScanner.module.css";

interface BatchManagerProps {
  pages: ScannedPage[];
  activePage: number;
  onSelectPage: (index: number) => void;
  onRemovePage: (index: number) => void;
  onAddPage: () => void;
  maxPages: number;
}

const BatchManager: React.FC<BatchManagerProps> = ({
  pages,
  activePage,
  onSelectPage,
  onRemovePage,
  onAddPage,
  maxPages,
}) => {
  if (pages.length === 0) return null;

  return (
    <div className={styles.batchContainer}>
      <div className={styles.batchScroll}>
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`${styles.batchItem} ${index === activePage ? styles.batchItemActive : ""}`}
            onClick={() => onSelectPage(index)}
          >
            <img
              src={page.thumbnailUrl}
              alt={`Seite ${index + 1}`}
              className={styles.batchThumb}
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
            <span className={styles.batchNumber}>{index + 1}</span>
            <button
              className={styles.batchRemove}
              onClick={(e) => {
                e.stopPropagation();
                onRemovePage(index);
              }}
              title="Seite entfernen"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {pages.length < maxPages && (
          <button className={styles.batchAdd} onClick={onAddPage} title="Weitere Seite scannen">
            <Plus size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BatchManager;

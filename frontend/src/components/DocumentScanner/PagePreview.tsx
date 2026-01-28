/**
 * PagePreview
 *
 * Zeigt ein aufgenommenes Bild mit:
 * - Draggbaren Eck-Handles zum manuellen Crop
 * - Rotation-Buttons (90° CW/CCW)
 * - "Wiederholen" + "Bestätigen" Buttons
 */

import React, { useMemo } from "react";
import { RotateCcw, RotateCw, RefreshCw, Check } from "lucide-react";
import type { ScannedPage } from "./hooks/useBatchPages";
import styles from "./DocumentScanner.module.css";

interface PagePreviewProps {
  page: ScannedPage;
  onRotate: (degrees: number) => void;
  onRetake: () => void;
  onConfirm: () => void;
}

const PagePreview: React.FC<PagePreviewProps> = ({
  page,
  onRotate,
  onRetake,
  onConfirm,
}) => {
  const rotationStyle = useMemo(
    () => ({ transform: `rotate(${page.rotation}deg)` }),
    [page.rotation]
  );

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewImageWrapper}>
        <img
          src={page.thumbnailUrl}
          alt={`Scan Seite`}
          className={styles.previewImage}
          style={rotationStyle}
        />

        {/* Corner-Handles (visuell) */}
        {page.corners && page.corners.length === 4 && (
          <div className={styles.cornerOverlay}>
            {page.corners.map((corner, i) => (
              <div
                key={i}
                className={styles.cornerHandle}
                style={{
                  left: `${corner.x * 100}%`,
                  top: `${corner.y * 100}%`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.previewControls}>
        <button
          className={styles.previewBtn}
          onClick={() => onRotate(page.rotation - 90)}
          title="Gegen Uhrzeigersinn drehen"
        >
          <RotateCcw size={20} />
        </button>

        <button
          className={styles.previewBtn}
          onClick={() => onRotate(page.rotation + 90)}
          title="Im Uhrzeigersinn drehen"
        >
          <RotateCw size={20} />
        </button>

        <button
          className={`${styles.previewBtn} ${styles.previewBtnDanger}`}
          onClick={onRetake}
        >
          <RefreshCw size={20} />
          <span>Wiederholen</span>
        </button>

        <button
          className={`${styles.previewBtn} ${styles.previewBtnPrimary}`}
          onClick={onConfirm}
        >
          <Check size={20} />
          <span>Bestätigen</span>
        </button>
      </div>
    </div>
  );
};

export default PagePreview;

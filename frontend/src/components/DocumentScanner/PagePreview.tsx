/**
 * PagePreview
 *
 * Zeigt das Scan-Bild mit CSS-basiertem visuellem Crop.
 * Kein Canvas, kein Blob — nur das Original-DataURL + clip-path.
 *
 * - Rotation-Buttons (90° CW/CCW)
 * - "Ecken anpassen" → zurück zur CornerAdjustment
 * - "Wiederholen" + "Bestätigen" Buttons
 */

import React, { useMemo } from "react";
import { RotateCcw, RotateCw, RefreshCw, Check, Crop } from "lucide-react";
import type { ScannedPage } from "./hooks/useBatchPages";
import styles from "./DocumentScanner.module.css";

interface PagePreviewProps {
  page: ScannedPage;
  onRotate: (degrees: number) => void;
  onRetake: () => void;
  onConfirm: () => void;
  onAdjustCorners?: () => void;
}

const PagePreview: React.FC<PagePreviewProps> = ({
  page,
  onRotate,
  onRetake,
  onConfirm,
  onAdjustCorners,
}) => {
  // CSS-based visual crop: clip-path shows only the document area
  const previewStyle = useMemo((): React.CSSProperties => {
    const style: React.CSSProperties = {
      transform: `rotate(${page.rotation}deg)`,
    };

    if (page.corners && page.corners.length === 4) {
      const xs = page.corners.map((c) => c.x);
      const ys = page.corners.map((c) => c.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const cropW = maxX - minX;
      const cropH = maxY - minY;

      if (cropW > 0.05 && cropH > 0.05) {
        // clip-path: inset(top right bottom left) — clips to bounding box
        style.clipPath = `inset(${minY * 100}% ${(1 - maxX) * 100}% ${(1 - maxY) * 100}% ${minX * 100}%)`;
      }
    }

    return style;
  }, [page.corners, page.rotation]);

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewImageWrapper}>
        <img
          src={page.previewDataUrl}
          alt="Scan Seite"
          className={styles.previewImage}
          style={previewStyle}
          onError={(e) => {
            console.warn("[Scanner] Preview image failed to load");
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
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

        {onAdjustCorners && (
          <button
            className={styles.previewBtn}
            onClick={onAdjustCorners}
            title="Ecken anpassen"
          >
            <Crop size={20} />
            <span>Ecken</span>
          </button>
        )}

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

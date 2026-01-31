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
  const previewStyle = useMemo(
    (): React.CSSProperties => ({
      transform: `rotate(${page.rotation}deg)`,
    }),
    [page.rotation]
  );

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

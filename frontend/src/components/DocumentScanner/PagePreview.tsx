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
import { RotateCcw, RotateCw, RefreshCw, Check, Crop, Loader2 } from "lucide-react";
import type { ScannedPage } from "./hooks/useBatchPages";
import styles from "./DocumentScanner.module.css";

interface PagePreviewProps {
  page: ScannedPage;
  onRotate: (degrees: number) => void;
  onRetake: () => void;
  onConfirm: () => void;
  onAdjustCorners?: () => void;
  isCorrecting?: boolean;
}

const PagePreview: React.FC<PagePreviewProps> = ({
  page,
  onRotate,
  onRetake,
  onConfirm,
  onAdjustCorners,
  isCorrecting = false,
}) => {
  // Bildquelle: correctedBlob → thumbnailUrl (neuer Blob-URL), sonst previewDataUrl (stabile DataURL)
  const imageSrc = page.correctedBlob ? page.thumbnailUrl : page.previewDataUrl;

  const previewStyle = useMemo((): React.CSSProperties => {
    const style: React.CSSProperties = {
      transform: `rotate(${page.rotation}deg)`,
    };

    // CSS clip-path nur wenn KEIN korrigiertes Bild vorliegt (sonst ist es bereits entzerrt)
    if (!page.correctedBlob && page.corners && page.corners.length === 4) {
      const [tl, tr, br, bl] = page.corners;
      style.clipPath = `polygon(${(tl.x * 100).toFixed(1)}% ${(tl.y * 100).toFixed(1)}%, ${(tr.x * 100).toFixed(1)}% ${(tr.y * 100).toFixed(1)}%, ${(br.x * 100).toFixed(1)}% ${(br.y * 100).toFixed(1)}%, ${(bl.x * 100).toFixed(1)}% ${(bl.y * 100).toFixed(1)}%)`;
    }

    return style;
  }, [page.rotation, page.corners, page.correctedBlob]);

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewImageWrapper}>
        <img
          src={imageSrc}
          alt="Scan Seite"
          className={styles.previewImage}
          style={previewStyle}
          onError={(e) => {
            // Fallback auf previewDataUrl wenn Blob-URL fehlschlägt
            const img = e.target as HTMLImageElement;
            if (img.src !== page.previewDataUrl) {
              img.src = page.previewDataUrl;
            }
          }}
        />
        {isCorrecting && (
          <div className={styles.correctingOverlay}>
            <Loader2 size={32} className={styles.spinner} />
            <span>Bild wird korrigiert...</span>
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

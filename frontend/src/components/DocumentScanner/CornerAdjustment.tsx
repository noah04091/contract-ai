/**
 * CornerAdjustment
 *
 * Zeigt das aufgenommene Bild mit 4 draggbaren Eckpunkten.
 * Nutzer kann die Ecken per Touch/Mouse anpassen.
 * Quadrilateral wird als Overlay mit Maske gezeichnet.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { useCornerAdjustment } from "./hooks/useCornerAdjustment";
import type { Point } from "./utils/imageProcessing";
import styles from "./DocumentScanner.module.css";

interface CornerAdjustmentProps {
  imageUrl: string;
  initialCorners: Point[] | null;
  onConfirm: (corners: Point[]) => void;
  onRetake: () => void;
}

const CornerAdjustment: React.FC<CornerAdjustmentProps> = ({
  imageUrl,
  initialCorners,
  onConfirm,
  onRetake,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const { corners, activeCorner, onPointerDown, setCorners } =
    useCornerAdjustment(initialCorners, containerRef);

  // Container-Größe tracken (nach Image-Load und bei Resize)
  const updateContainerSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({ w: rect.width, h: rect.height });
    }
  }, []);

  // Image Load Handler
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    // Kurz warten bis Layout aktualisiert ist
    requestAnimationFrame(() => {
      updateContainerSize();
    });
  }, [updateContainerSize]);

  // Resize Observer für Container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateContainerSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateContainerSize]);

  // Overlay Canvas zeichnen wenn Corners oder Container-Größe sich ändern
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerSize.w === 0 || containerSize.h === 0) return;

    canvas.width = containerSize.w;
    canvas.height = containerSize.h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Nur Overlay zeichnen wenn Bild geladen
    if (!imageLoaded) return;

    const pts = corners.map((c) => ({
      x: c.x * canvas.width,
      y: c.y * canvas.height,
    }));

    // Semi-transparente Maske
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dokument-Bereich ausschneiden
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.fill();

    // Kanten-Linien
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.stroke();
  }, [corners, containerSize, imageLoaded]);

  // Corners initialisieren wenn sich initialCorners ändert
  useEffect(() => {
    if (initialCorners && initialCorners.length === 4) {
      setCorners(initialCorners);
    }
  }, [initialCorners, setCorners]);

  const handleConfirm = useCallback(() => {
    onConfirm(corners);
  }, [corners, onConfirm]);

  return (
    <div className={styles.adjustContainer}>
      {/* Header */}
      <div className={styles.adjustHeader}>
        <span className={styles.adjustTitle}>Ecken anpassen</span>
        <span className={styles.adjustSubtitle}>
          Ziehe die Eckpunkte auf die Dokumentränder
        </span>
      </div>

      {/* Bild mit Overlay */}
      <div className={styles.adjustImageWrapper} ref={containerRef}>
        <img
          src={imageUrl}
          alt="Aufgenommenes Dokument"
          className={styles.adjustImage}
          draggable={false}
          onLoad={handleImageLoad}
          onError={() => console.error("[Scanner] CornerAdjustment: Image failed to load", imageUrl)}
        />

        {/* Canvas Overlay für Quadrilateral — nur wenn Bild geladen */}
        {imageLoaded && (
          <canvas
            ref={canvasRef}
            className={styles.adjustCanvas}
          />
        )}

        {/* Draggbare Eckpunkte — nur wenn Bild geladen */}
        {imageLoaded && corners.map((corner, index) => (
          <div
            key={index}
            className={`${styles.cornerHandle} ${activeCorner === index ? styles.cornerHandleActive : ""}`}
            style={{
              left: `${corner.x * 100}%`,
              top: `${corner.y * 100}%`,
            }}
            onPointerDown={(e) => onPointerDown(index, e)}
          />
        ))}

        {/* Loading-Fallback wenn Bild nicht geladen */}
        {!imageLoaded && (
          <div className={styles.adjustLoadingFallback}>
            Bild wird geladen...
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className={styles.adjustToolbar}>
        <button className={styles.adjustBtnSecondary} onClick={onRetake}>
          <RefreshCw size={18} />
          <span>Erneut</span>
        </button>

        <button className={styles.adjustBtnPrimary} onClick={handleConfirm}>
          <Check size={18} />
          <span>Bestätigen</span>
        </button>
      </div>
    </div>
  );
};

export default CornerAdjustment;

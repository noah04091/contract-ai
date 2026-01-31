/**
 * CornerAdjustment
 *
 * Zeigt das aufgenommene Bild mit 4 draggbaren Eckpunkten.
 * Nutzer kann die Ecken per Touch/Mouse anpassen.
 * Quadrilateral wird als Overlay mit Maske gezeichnet.
 *
 * WICHTIG: Alle Ecken-Koordinaten sind BILD-relativ (0-1),
 * nicht Container-relativ. Das innere Frame-Div hat exakt die
 * Dimensionen des angezeigten Bildes, sodass %‑Positionierung
 * korrekt auf das Bild gemappt wird.
 */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { useCornerAdjustment } from "./hooks/useCornerAdjustment";
import type { Point } from "./types";
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [frameDims, setFrameDims] = useState({ w: 0, h: 0 });

  // frameRef is the coordinate reference — matches image display area exactly
  const { corners, activeCorner, onPointerDown, setCorners } =
    useCornerAdjustment(initialCorners, frameRef);

  // Calculate image display dimensions within the wrapper
  const updateFrameDims = useCallback(() => {
    const wrapper = wrapperRef.current;
    const img = imgRef.current;
    if (!wrapper || !img || !img.naturalWidth || !img.naturalHeight) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    if (wrapperRect.width === 0 || wrapperRect.height === 0) return;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const wrapperRatio = wrapperRect.width / wrapperRect.height;

    let w: number, h: number;
    if (imgRatio > wrapperRatio) {
      // Image wider than wrapper — limited by width
      w = wrapperRect.width;
      h = wrapperRect.width / imgRatio;
    } else {
      // Image taller than wrapper — limited by height
      h = wrapperRect.height;
      w = wrapperRect.height * imgRatio;
    }

    setFrameDims({ w: Math.round(w), h: Math.round(h) });
  }, []);

  // Image loaded → measure layout
  const handleImageLoad = useCallback(() => {
    requestAnimationFrame(updateFrameDims);
  }, [updateFrameDims]);

  // Resize Observer on the outer wrapper
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    updateFrameDims();

    const observer = new ResizeObserver(() => {
      updateFrameDims();
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [updateFrameDims]);

  // Draw overlay canvas (mask + edges)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frameDims.w === 0 || frameDims.h === 0) return;

    canvas.width = frameDims.w;
    canvas.height = frameDims.h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = corners.map((c) => ({
      x: c.x * canvas.width,
      y: c.y * canvas.height,
    }));

    // Semi-transparent mask
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out document area
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.fill();

    // Edge lines
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
  }, [corners, frameDims]);

  // Initialize corners from props
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

      {/* Outer wrapper for centering */}
      <div className={styles.adjustImageWrapper} ref={wrapperRef}>
        {/* Inner frame — exact image display dimensions */}
        <div
          ref={frameRef}
          className={styles.adjustImageFrame}
          style={
            frameDims.w > 0
              ? { width: frameDims.w, height: frameDims.h }
              : undefined
          }
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Aufgenommenes Dokument"
            className={styles.adjustImage}
            draggable={false}
            onLoad={handleImageLoad}
          />

          {/* Canvas Overlay for quadrilateral */}
          <canvas ref={canvasRef} className={styles.adjustCanvas} />

          {/* Draggable corner handles */}
          {corners.map((corner, index) => (
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
        </div>
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

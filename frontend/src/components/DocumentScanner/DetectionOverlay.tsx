/**
 * DetectionOverlay
 *
 * Canvas overlay that draws the detected document border
 * with smooth interpolation, color feedback, and glow effects.
 */

import React, { useRef, useEffect, useCallback } from "react";
import type { Point } from "./types";
import styles from "./DocumentScanner.module.css";

interface DetectionOverlayProps {
  corners: Point[] | null;
  confidence: number;
  isStable: boolean;
  stabilityProgress: number;
  hint: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const LERP_FACTOR = 0.45; // Overlay-level interpolation (responsive but smooth)

/** Rounded rect with fallback for browsers without roundRect (Safari < 16) */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    // Manual fallback with arcs
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}

/** Draw a hint text centered near the bottom of the canvas */
function drawHint(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasW: number,
  canvasH: number
): void {
  const fontSize = Math.max(13, Math.min(16, canvasW * 0.035));
  ctx.save();
  ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Background pill
  const metrics = ctx.measureText(text);
  const paddingX = 14;
  const paddingY = 8;
  const pillW = metrics.width + paddingX * 2;
  const pillH = fontSize + paddingY * 2;
  const pillX = canvasW / 2 - pillW / 2;
  const pillY = canvasH - 150 - pillH / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  const r = pillH / 2;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, r);
  ctx.fill();

  // Text
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(text, canvasW / 2, pillY + pillH / 2);
  ctx.restore();
}

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  corners,
  confidence,
  isStable,
  stabilityProgress,
  hint,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const previousPtsRef = useRef<{ x: number; y: number }[] | null>(null);
  const flashStartRef = useRef<number | null>(null);
  const wasStableRef = useRef(false);
  const fadeInStartRef = useRef<number | null>(null); // Smooth fade-in on first detection

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Sync canvas size with container
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Handle flash effect (triggered once on stable → captured)
    if (isStable && !wasStableRef.current) {
      flashStartRef.current = performance.now();
    }
    wasStableRef.current = isStable;

    if (flashStartRef.current) {
      const flashElapsed = performance.now() - flashStartRef.current;
      if (flashElapsed < 250) {
        const flashAlpha = 0.25 * Math.max(0, 1 - flashElapsed / 250);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        flashStartRef.current = null;
      }
    }

    if (!corners || corners.length !== 4) {
      // Reset fade-in for next detection
      previousPtsRef.current = null;
      fadeInStartRef.current = null;
      // Still draw hint when no document detected
      if (hint) {
        drawHint(ctx, hint, canvas.width, canvas.height);
      }
      return;
    }

    // Track fade-in: smooth appearance when corners first detected
    if (!fadeInStartRef.current) {
      fadeInStartRef.current = performance.now();
    }
    const fadeInElapsed = performance.now() - fadeInStartRef.current;
    const fadeInAlpha = Math.min(1, fadeInElapsed / 200); // 200ms fade-in

    // Convert normalized (0-1) corners to pixel coordinates
    const targetPts = corners.map((c) => ({
      x: c.x * canvas.width,
      y: c.y * canvas.height,
    }));

    // Smooth interpolation at the overlay level
    let pts: { x: number; y: number }[];
    if (previousPtsRef.current && previousPtsRef.current.length === 4) {
      pts = targetPts.map((t, i) => ({
        x: previousPtsRef.current![i].x + LERP_FACTOR * (t.x - previousPtsRef.current![i].x),
        y: previousPtsRef.current![i].y + LERP_FACTOR * (t.y - previousPtsRef.current![i].y),
      }));
    } else {
      pts = targetPts;
    }
    previousPtsRef.current = pts;

    // Color based on state (multiplied by fadeInAlpha for smooth entrance)
    const baseAlpha = (0.4 + confidence * 0.5) * fadeInAlpha;
    let color: string;
    let fillColor: string;

    if (isStable) {
      // Bright green — ready for capture
      color = `rgba(74, 222, 128, ${Math.min(1, baseAlpha + 0.1)})`;
      fillColor = `rgba(74, 222, 128, ${0.12 * fadeInAlpha})`;
    } else if (confidence >= 0.5) {
      // Green — good detection
      color = `rgba(34, 197, 94, ${baseAlpha})`;
      fillColor = `rgba(34, 197, 94, ${0.07 * fadeInAlpha})`;
    } else {
      // Orange/Yellow — weak detection
      color = `rgba(234, 179, 8, ${baseAlpha * 0.9})`;
      fillColor = `rgba(234, 179, 8, ${0.05 * fadeInAlpha})`;
    }

    // Line width grows with stability progress
    const baseLineWidth = 2.5;
    const lineWidth = baseLineWidth + stabilityProgress * 2.0;

    // Glow effect during stabilization
    if (stabilityProgress > 0) {
      ctx.shadowColor = isStable ? "rgba(74, 222, 128, 0.6)" : "rgba(34, 197, 94, 0.4)";
      ctx.shadowBlur = stabilityProgress * 12;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Draw quadrilateral
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.stroke();

    // Reset shadow for fill
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Semi-transparent fill
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Corner dots
    const dotRadius = isStable ? 7 : confidence >= 0.5 ? 5.5 : 4.5;
    ctx.fillStyle = color;
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hint text
    if (hint) {
      drawHint(ctx, hint, canvas.width, canvas.height);
    }
  }, [corners, confidence, isStable, stabilityProgress, hint, containerRef]);

  // Redraw with frame-rate limiting (~30fps to save battery)
  const lastDrawTimeRef = useRef(0);
  useEffect(() => {
    let active = true;
    const FRAME_INTERVAL = 1000 / 30; // ~33ms

    const loop = (timestamp: number) => {
      if (!active) return;
      if (timestamp - lastDrawTimeRef.current >= FRAME_INTERVAL) {
        draw();
        lastDrawTimeRef.current = timestamp;
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    if ((corners && corners.length === 4) || hint) {
      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      // One more draw to handle fade-out / flash
      draw();
      // Then clear after a short delay
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        previousPtsRef.current = null;
      }, 100);
      return () => {
        clearTimeout(timer);
      };
    }

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [corners, hint, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.detectionOverlay}
      style={{ pointerEvents: "none" }}
    />
  );
};

export default DetectionOverlay;

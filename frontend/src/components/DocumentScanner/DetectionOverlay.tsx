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
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const LERP_FACTOR = 0.35; // Overlay-level interpolation (additional smoothing)

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  corners,
  confidence,
  isStable,
  stabilityProgress,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const previousPtsRef = useRef<{ x: number; y: number }[] | null>(null);
  const flashStartRef = useRef<number | null>(null);
  const wasStableRef = useRef(false);

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
      // Fade out previous points
      previousPtsRef.current = null;
      return;
    }

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

    // Color based on state
    const alpha = 0.4 + confidence * 0.5; // 0.4 - 0.9
    let color: string;
    let fillColor: string;

    if (isStable) {
      // Bright green — ready for capture
      color = `rgba(74, 222, 128, ${Math.min(1, alpha + 0.1)})`;
      fillColor = "rgba(74, 222, 128, 0.10)";
    } else if (confidence >= 0.5) {
      // Green — good detection
      color = `rgba(34, 197, 94, ${alpha})`;
      fillColor = "rgba(34, 197, 94, 0.06)";
    } else {
      // Orange/Yellow — weak detection
      color = `rgba(234, 179, 8, ${alpha * 0.9})`;
      fillColor = "rgba(234, 179, 8, 0.04)";
    }

    // Line width grows with stability progress (pulsing effect)
    const baseLineWidth = 2.5;
    const lineWidth = baseLineWidth + stabilityProgress * 2.0;

    // Glow effect during stabilization
    if (stabilityProgress > 0) {
      ctx.shadowColor = isStable ? "rgba(74, 222, 128, 0.6)" : "rgba(34, 197, 94, 0.4)";
      ctx.shadowBlur = stabilityProgress * 10;
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
  }, [corners, confidence, isStable, stabilityProgress, containerRef]);

  // Redraw on every animation frame for smooth rendering
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    if (corners && corners.length === 4) {
      loop();
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
  }, [corners, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.detectionOverlay}
      style={{ pointerEvents: "none" }}
    />
  );
};

export default DetectionOverlay;

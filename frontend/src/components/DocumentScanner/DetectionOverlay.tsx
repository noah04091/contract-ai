/**
 * DetectionOverlay
 *
 * Canvas overlay that draws the detected document border
 * and stability progress indicator on top of the camera feed.
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

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  corners,
  confidence,
  isStable,
  stabilityProgress,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

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

    if (!corners || corners.length !== 4) return;

    // Convert normalized (0-1) corners to pixel coordinates
    const pts = corners.map((c) => ({
      x: c.x * canvas.width,
      y: c.y * canvas.height,
    }));

    // Draw document border
    const alpha = 0.4 + confidence * 0.5; // 0.4 - 0.9
    const lineWidth = isStable ? 3.5 : 2.5;
    const color = isStable
      ? `rgba(34, 197, 94, ${alpha})`   // Bright green when stable
      : `rgba(34, 197, 94, ${alpha * 0.8})`; // Slightly dimmer when unstable

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

    // Semi-transparent fill
    ctx.fillStyle = isStable
      ? "rgba(34, 197, 94, 0.08)"
      : "rgba(34, 197, 94, 0.04)";
    ctx.fill();

    // Corner dots
    const dotRadius = isStable ? 6 : 5;
    ctx.fillStyle = color;
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stability progress ring (bottom center)
    if (stabilityProgress > 0 && stabilityProgress < 1) {
      const cx = canvas.width / 2;
      const cy = canvas.height - 100;
      const radius = 24;

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Progress arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + stabilityProgress * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Auto-capture flash
    if (isStable) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      // Clear canvas when no corners
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
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

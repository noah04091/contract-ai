/**
 * EdgeOverlay
 *
 * Canvas-Overlay das erkannte Dokumentkanten als Polygon zeichnet
 * über dem Kamera-Feed. Corners kommen bereits gefiltert
 * (One Euro Filter) an — kein zusätzliches Smoothing nötig.
 *
 * 3-stufiges Confidence-Farbsystem:
 * Grün (>0.6) = bereit, Gelb (0.3-0.6) = unsicher, Rot (<0.3) = schlecht
 */

import React, { useRef, useEffect } from "react";
import type { DetectedEdges } from "./utils/imageProcessing";

interface EdgeOverlayProps {
  edges: DetectedEdges | null;
  width: number;
  height: number;
}

const EdgeOverlay: React.FC<EdgeOverlayProps> = ({ edges, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!edges || edges.corners.length !== 4) return;

    const { corners, confidence } = edges;

    // Pixel-Koordinaten berechnen
    const pts = corners.map((c) => ({
      x: c.x * width,
      y: c.y * height,
    }));

    // Semi-transparenter Overlay außerhalb des Dokuments
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, width, height);

    // Dokument-Bereich ausschneiden (transparent)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.fill();

    // 3-stufiges Confidence-Farbsystem
    ctx.globalCompositeOperation = "source-over";
    let color: string;
    if (confidence > 0.6) {
      color = "rgba(34, 197, 94, 0.9)";   // Grün = bereit
    } else if (confidence > 0.3) {
      color = "rgba(234, 179, 8, 0.9)";   // Gelb = unsicher
    } else {
      color = "rgba(239, 68, 68, 0.7)";   // Rot = schlecht
    }

    // Kanten-Linien zeichnen
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.lineTo(pts[3].x, pts[3].y);
    ctx.closePath();
    ctx.stroke();

    // Eckpunkte
    ctx.fillStyle = color;
    for (const pt of pts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [edges, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

export default EdgeOverlay;

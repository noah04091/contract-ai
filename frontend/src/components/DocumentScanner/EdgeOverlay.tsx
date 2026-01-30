/**
 * EdgeOverlay
 *
 * Canvas-Overlay das erkannte Dokumentkanten als Polygon zeichnet
 * über dem Kamera-Feed. Mit visueller Glättung (lerp) und
 * 3-stufigem Confidence-Farbsystem.
 */

import React, { useRef, useEffect } from "react";
import type { DetectedEdges, Point } from "./utils/imageProcessing";

interface EdgeOverlayProps {
  edges: DetectedEdges | null;
  width: number;
  height: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const EdgeOverlay: React.FC<EdgeOverlayProps> = ({ edges, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevCornersRef = useRef<Point[] | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!edges || edges.corners.length !== 4) {
      prevCornersRef.current = null;
      return;
    }

    const { corners, confidence } = edges;

    // Visuelle Glättung: Lerp zwischen vorherigen und aktuellen Eckpunkten
    const smoothFactor = 0.35;
    const displayCorners: Point[] = corners.map((c, i) => {
      if (prevCornersRef.current && prevCornersRef.current[i]) {
        return {
          x: lerp(prevCornersRef.current[i].x, c.x, smoothFactor),
          y: lerp(prevCornersRef.current[i].y, c.y, smoothFactor),
        };
      }
      return { x: c.x, y: c.y };
    });
    prevCornersRef.current = displayCorners;

    // Semi-transparenter Overlay außerhalb des Dokuments
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, width, height);

    // Dokument-Bereich ausschneiden (transparent)
    // Corners sind clockwise geordnet: TL=0, TR=1, BR=2, BL=3
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(displayCorners[0].x * width, displayCorners[0].y * height);
    ctx.lineTo(displayCorners[1].x * width, displayCorners[1].y * height);
    ctx.lineTo(displayCorners[2].x * width, displayCorners[2].y * height);
    ctx.lineTo(displayCorners[3].x * width, displayCorners[3].y * height);
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
    ctx.moveTo(displayCorners[0].x * width, displayCorners[0].y * height);
    ctx.lineTo(displayCorners[1].x * width, displayCorners[1].y * height);
    ctx.lineTo(displayCorners[2].x * width, displayCorners[2].y * height);
    ctx.lineTo(displayCorners[3].x * width, displayCorners[3].y * height);
    ctx.closePath();
    ctx.stroke();

    // Eckpunkte
    ctx.fillStyle = color;
    for (const corner of displayCorners) {
      ctx.beginPath();
      ctx.arc(corner.x * width, corner.y * height, 8, 0, Math.PI * 2);
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

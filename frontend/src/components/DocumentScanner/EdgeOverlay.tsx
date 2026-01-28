/**
 * EdgeOverlay
 *
 * Canvas-Overlay das erkannte Dokumentkanten als Polygon zeichnet
 * über dem Kamera-Feed.
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

    // Semi-transparenter Overlay außerhalb des Dokuments
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, width, height);

    // Dokument-Bereich ausschneiden (transparent)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(corners[0].x * width, corners[0].y * height);
    ctx.lineTo(corners[1].x * width, corners[1].y * height);
    ctx.lineTo(corners[3].x * width, corners[3].y * height);
    ctx.lineTo(corners[2].x * width, corners[2].y * height);
    ctx.closePath();
    ctx.fill();

    // Kanten-Linien zeichnen
    ctx.globalCompositeOperation = "source-over";
    const color = confidence > 0.5
      ? "rgba(34, 197, 94, 0.9)"   // Grün = gute Erkennung
      : "rgba(234, 179, 8, 0.9)";  // Gelb = unsicher

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(corners[0].x * width, corners[0].y * height);
    ctx.lineTo(corners[1].x * width, corners[1].y * height);
    ctx.lineTo(corners[3].x * width, corners[3].y * height);
    ctx.lineTo(corners[2].x * width, corners[2].y * height);
    ctx.closePath();
    ctx.stroke();

    // Eckpunkte
    ctx.fillStyle = color;
    for (const corner of corners) {
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

/**
 * useEdgeDetection Hook
 *
 * Führt Edge Detection auf dem Video-Feed durch.
 * - ~24fps via requestAnimationFrame (42ms throttle)
 * - 480px Verarbeitungsauflösung
 * - Temporal Smoothing über letzte 4 Frames
 * - Decay: History wird langsam abgebaut wenn keine Erkennung
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { detectEdgesFromVideo, type DetectedEdges, type Point } from "../utils/imageProcessing";

const TARGET_FPS_INTERVAL = 42; // ~24fps
const SMOOTHING_FRAMES = 4;
const DETECTION_RESOLUTION = 480;

function smoothCorners(history: DetectedEdges[]): DetectedEdges {
  if (history.length === 1) return history[0];

  const avgCorners: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];

  // Weight recent frames more heavily (linear: 1, 2, 3, 4...)
  let totalWeight = 0;
  for (let f = 0; f < history.length; f++) {
    const weight = f + 1;
    totalWeight += weight;
    for (let c = 0; c < 4; c++) {
      avgCorners[c].x += history[f].corners[c].x * weight;
      avgCorners[c].y += history[f].corners[c].y * weight;
    }
  }
  for (let c = 0; c < 4; c++) {
    avgCorners[c].x /= totalWeight;
    avgCorners[c].y /= totalWeight;
  }

  const avgConfidence =
    history.reduce((s, h) => s + h.confidence, 0) / history.length;

  return { corners: avgCorners, confidence: avgConfidence };
}

interface UseEdgeDetectionReturn {
  edges: DetectedEdges | null;
  isDetecting: boolean;
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
}

export function useEdgeDetection(): UseEdgeDetectionReturn {
  const [edges, setEdges] = useState<DetectedEdges | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRefInternal = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);
  const historyRef = useRef<DetectedEdges[]>([]);

  const detect = useCallback(() => {
    const video = videoRefInternal.current;
    if (!video || video.paused || video.ended || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    if (now - lastDetectionRef.current > TARGET_FPS_INTERVAL) {
      lastDetectionRef.current = now;

      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      const result = detectEdgesFromVideo(
        video,
        canvasRef.current,
        DETECTION_RESOLUTION
      );

      if (result) {
        historyRef.current.push(result);
        if (historyRef.current.length > SMOOTHING_FRAMES) {
          historyRef.current.shift();
        }
        // Smoothed output
        const smoothed = smoothCorners(historyRef.current);
        setEdges(smoothed);
      } else {
        // Decay: langsam History abbauen statt sofort null
        if (historyRef.current.length > 0) {
          historyRef.current.shift();
          if (historyRef.current.length > 0) {
            const smoothed = smoothCorners(historyRef.current);
            setEdges(smoothed);
          } else {
            setEdges(null);
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  const startDetection = useCallback(
    (video: HTMLVideoElement) => {
      videoRefInternal.current = video;
      historyRef.current = [];
      setIsDetecting(true);
      rafRef.current = requestAnimationFrame(detect);
    },
    [detect]
  );

  const stopDetection = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsDetecting(false);
    setEdges(null);
    videoRefInternal.current = null;
    historyRef.current = [];
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { edges, isDetecting, startDetection, stopDetection };
}

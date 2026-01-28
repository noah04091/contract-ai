/**
 * useEdgeDetection Hook
 *
 * Führt Edge Detection auf dem Video-Feed durch
 * bei ~10fps via requestAnimationFrame
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { detectEdgesFromVideo, type DetectedEdges } from "../utils/imageProcessing";

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

  const detect = useCallback(() => {
    const video = videoRefInternal.current;
    if (!video || video.paused || video.ended || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    // ~10fps throttle (100ms)
    if (now - lastDetectionRef.current > 100) {
      lastDetectionRef.current = now;

      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      const result = detectEdgesFromVideo(video, canvasRef.current, 640);
      setEdges(result);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  const startDetection = useCallback(
    (video: HTMLVideoElement) => {
      videoRefInternal.current = video;
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

/**
 * useEdgeDetection Hook
 *
 * Führt Edge Detection auf dem Video-Feed durch mit OpenCV.js.
 * - ~24fps via requestAnimationFrame (42ms throttle)
 * - 480px Verarbeitungsauflösung
 * - One Euro Filter für stabile Eckpunkte (kein Wobbling)
 * - Decay: Letzte bekannte Corners werden 500ms gehalten
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { detectEdgesFromVideo, type DetectedEdges } from "../utils/imageProcessing";
import { useOpenCV } from "./useOpenCV";
import { CornersFilter } from "../utils/oneEuroFilter";

const TARGET_FPS_INTERVAL = 42; // ~24fps
const DETECTION_RESOLUTION = 480;
const DECAY_TIMEOUT = 500; // ms bis null nach letzter Erkennung

interface UseEdgeDetectionReturn {
  edges: DetectedEdges | null;
  isDetecting: boolean;
  isOpenCVReady: boolean;
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
}

export function useEdgeDetection(): UseEdgeDetectionReturn {
  const [edges, setEdges] = useState<DetectedEdges | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const { cv, isReady: isOpenCVReady } = useOpenCV();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRefInternal = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);
  const cornersFilterRef = useRef<CornersFilter>(new CornersFilter());
  const lastFoundRef = useRef<number>(0);
  const cvRef = useRef(cv);

  // cv Ref aktuell halten
  useEffect(() => {
    cvRef.current = cv;
  }, [cv]);

  const detect = useCallback(() => {
    const video = videoRefInternal.current;
    const currentCv = cvRef.current;

    if (!video || video.paused || video.ended || !video.videoWidth || !currentCv) {
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
        currentCv,
        canvasRef.current,
        DETECTION_RESOLUTION
      );

      if (result) {
        lastFoundRef.current = now;
        // One Euro Filter für stabile Eckpunkte
        const filteredCorners = cornersFilterRef.current.filter(result.corners, now);
        setEdges({ corners: filteredCorners, confidence: result.confidence });
      } else {
        // Decay: Letzte Corners für DECAY_TIMEOUT halten, dann null
        if (now - lastFoundRef.current > DECAY_TIMEOUT) {
          setEdges(null);
        }
        // Sonst: Letzte bekannte Edges behalten
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  const startDetection = useCallback(
    (video: HTMLVideoElement) => {
      videoRefInternal.current = video;
      cornersFilterRef.current.reset();
      lastFoundRef.current = 0;
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
    cornersFilterRef.current.reset();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { edges, isDetecting, isOpenCVReady, startDetection, stopDetection };
}

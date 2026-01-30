/**
 * useDocumentDetection Hook
 *
 * Drives the document detection loop via requestAnimationFrame.
 * Lazy-loads the DocumentDetector class (non-blocking).
 * Tracks stability for auto-capture.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Point } from "../types";

interface DetectionState {
  detectedCorners: Point[] | null;
  confidence: number;
  isStable: boolean;
  stabilityProgress: number; // 0.0 to 1.0
}

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  stabilityThresholdMs?: number; // default 1500
  targetFps?: number; // default 12
  onStableDetection?: (corners: Point[]) => void;
}

const STABILITY_TOLERANCE = 0.025; // 2.5% of frame

function cornersAreSimilar(a: Point[], b: Point[]): boolean {
  if (a.length !== 4 || b.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const dx = Math.abs(a[i].x - b[i].x);
    const dy = Math.abs(a[i].y - b[i].y);
    if (dx > STABILITY_TOLERANCE || dy > STABILITY_TOLERANCE) return false;
  }
  return true;
}

export function useDocumentDetection({
  videoRef,
  enabled,
  stabilityThresholdMs = 1500,
  targetFps = 12,
  onStableDetection,
}: UseDocumentDetectionOptions): DetectionState {
  const [state, setState] = useState<DetectionState>({
    detectedCorners: null,
    confidence: 0,
    isStable: false,
    stabilityProgress: 0,
  });

  // Refs for the detection loop (avoid stale closures)
  const detectorRef = useRef<import("../utils/documentDetector").DocumentDetector | null>(null);
  const rafRef = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);
  const previousCornersRef = useRef<Point[] | null>(null);
  const stableStartTimeRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const disabledRef = useRef(false);
  const autoCapturedRef = useRef(false);
  const onStableDetectionRef = useRef(onStableDetection);

  // Keep callback ref in sync
  useEffect(() => {
    onStableDetectionRef.current = onStableDetection;
  }, [onStableDetection]);

  const frameInterval = 1000 / targetFps;

  const detectionLoop = useCallback(
    (timestamp: number) => {
      if (disabledRef.current) return;

      rafRef.current = requestAnimationFrame(detectionLoop);

      // Frame rate limiting
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < frameInterval) return;
      lastFrameTimeRef.current = timestamp;

      const video = videoRef.current;
      const detector = detectorRef.current;
      if (!video || !detector || video.readyState < 2) return;
      if (document.hidden) return; // Skip when tab is hidden

      try {
        const result = detector.detect(video);
        consecutiveErrorsRef.current = 0;

        if (result && result.confidence > 0.3) {
          const newCorners = result.corners;

          // Check stability
          if (
            previousCornersRef.current &&
            cornersAreSimilar(newCorners, previousCornersRef.current)
          ) {
            // Corners are stable
            if (!stableStartTimeRef.current) {
              stableStartTimeRef.current = timestamp;
            }

            const stableDuration = timestamp - stableStartTimeRef.current;
            const progress = Math.min(1, stableDuration / stabilityThresholdMs);
            const isStable = progress >= 1;

            setState({
              detectedCorners: newCorners,
              confidence: result.confidence,
              isStable,
              stabilityProgress: progress,
            });

            // Auto-capture trigger
            if (isStable && !autoCapturedRef.current) {
              autoCapturedRef.current = true;
              onStableDetectionRef.current?.(newCorners);
            }
          } else {
            // Corners moved — reset stability
            stableStartTimeRef.current = null;
            autoCapturedRef.current = false;

            setState({
              detectedCorners: newCorners,
              confidence: result.confidence,
              isStable: false,
              stabilityProgress: 0,
            });
          }

          previousCornersRef.current = newCorners;
        } else {
          // No document detected
          previousCornersRef.current = null;
          stableStartTimeRef.current = null;
          autoCapturedRef.current = false;

          setState({
            detectedCorners: null,
            confidence: 0,
            isStable: false,
            stabilityProgress: 0,
          });
        }
      } catch (err) {
        consecutiveErrorsRef.current++;
        console.warn("[Detection] Frame error:", err);

        if (consecutiveErrorsRef.current >= 10) {
          console.warn("[Detection] Too many errors, disabling detection");
          disabledRef.current = true;
          setState({
            detectedCorners: null,
            confidence: 0,
            isStable: false,
            stabilityProgress: 0,
          });
        }
      }
    },
    [videoRef, frameInterval, stabilityThresholdMs]
  );

  // Start/stop detection loop
  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let disposed = false;

    // Lazy-load the DocumentDetector class
    import("../utils/documentDetector")
      .then(({ DocumentDetector }) => {
        if (disposed) return;
        detectorRef.current = new DocumentDetector();
        disabledRef.current = false;
        consecutiveErrorsRef.current = 0;
        rafRef.current = requestAnimationFrame(detectionLoop);
      })
      .catch((err) => {
        console.warn("[Detection] Failed to load detector:", err);
      });

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
      previousCornersRef.current = null;
      stableStartTimeRef.current = null;
      autoCapturedRef.current = false;
    };
  }, [enabled, detectionLoop]);

  return state;
}

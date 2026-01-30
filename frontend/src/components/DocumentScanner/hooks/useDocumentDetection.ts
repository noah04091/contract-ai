/**
 * useDocumentDetection Hook
 *
 * Drives the document detection loop via requestAnimationFrame.
 * Lazy-loads the DocumentDetector class (non-blocking).
 * Tracks stability for auto-capture with EMA smoothing + hysteresis.
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
const EMA_ALPHA = 0.4; // 40% new frame, 60% history
const GRACE_FRAMES = 3; // Tolerate up to 3 unstable frames before reset
const FADEOUT_MS = 500; // Fade-out duration when detection is lost

/** Euclidean distance check for corner similarity */
function cornersAreSimilar(a: Point[], b: Point[]): boolean {
  if (a.length !== 4 || b.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > STABILITY_TOLERANCE) return false;
  }
  return true;
}

/** Exponential moving average for corner smoothing */
function smoothCorners(prev: Point[], curr: Point[], alpha: number): Point[] {
  return curr.map((c, i) => ({
    x: prev[i].x + alpha * (c.x - prev[i].x),
    y: prev[i].y + alpha * (c.y - prev[i].y),
  }));
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
  const smoothedCornersRef = useRef<Point[] | null>(null);
  const stableStartTimeRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const disabledRef = useRef(false);
  const autoCapturedRef = useRef(false);
  const onStableDetectionRef = useRef(onStableDetection);
  const unstableCountRef = useRef(0);
  const lostTimeRef = useRef<number | null>(null);
  const lastKnownCornersRef = useRef<Point[] | null>(null);
  const lastKnownConfidenceRef = useRef(0);

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

        if (result && result.confidence > 0.35) {
          // Clear fade-out state
          lostTimeRef.current = null;

          const rawCorners = result.corners;

          // Apply EMA smoothing
          const smoothed = smoothedCornersRef.current
            ? smoothCorners(smoothedCornersRef.current, rawCorners, EMA_ALPHA)
            : rawCorners;
          smoothedCornersRef.current = smoothed;

          // Check stability against raw corners (not smoothed, to avoid self-stabilizing)
          if (
            previousCornersRef.current &&
            cornersAreSimilar(rawCorners, previousCornersRef.current)
          ) {
            // Corners are stable — reset grace counter
            unstableCountRef.current = 0;

            if (!stableStartTimeRef.current) {
              stableStartTimeRef.current = timestamp;
            }

            const stableDuration = timestamp - stableStartTimeRef.current;
            const progress = Math.min(1, stableDuration / stabilityThresholdMs);
            const isStable = progress >= 1;

            setState({
              detectedCorners: smoothed,
              confidence: result.confidence,
              isStable,
              stabilityProgress: progress,
            });

            // Auto-capture trigger
            if (isStable && !autoCapturedRef.current) {
              autoCapturedRef.current = true;
              onStableDetectionRef.current?.(smoothed);
            }
          } else {
            // Corners moved — hysteresis: tolerate a few unstable frames
            unstableCountRef.current++;

            if (unstableCountRef.current > GRACE_FRAMES) {
              // Too many unstable frames → full reset
              stableStartTimeRef.current = null;
              autoCapturedRef.current = false;
              unstableCountRef.current = 0;

              setState({
                detectedCorners: smoothed,
                confidence: result.confidence,
                isStable: false,
                stabilityProgress: 0,
              });
            } else {
              // Within grace period — keep current progress, update corners
              const currentProgress = stableStartTimeRef.current
                ? Math.min(1, (timestamp - stableStartTimeRef.current) / stabilityThresholdMs)
                : 0;

              setState({
                detectedCorners: smoothed,
                confidence: result.confidence,
                isStable: false,
                stabilityProgress: currentProgress,
              });
            }
          }

          previousCornersRef.current = rawCorners;
          lastKnownCornersRef.current = smoothed;
          lastKnownConfidenceRef.current = result.confidence;
        } else {
          // No document detected — fade out gracefully
          if (lastKnownCornersRef.current && !lostTimeRef.current) {
            lostTimeRef.current = timestamp;
          }

          if (lostTimeRef.current && lastKnownCornersRef.current) {
            const fadeElapsed = timestamp - lostTimeRef.current;
            const fadeProgress = Math.min(1, fadeElapsed / FADEOUT_MS);

            if (fadeProgress < 1) {
              // Still fading — show last known corners with decreasing confidence
              const fadedConfidence = lastKnownConfidenceRef.current * (1 - fadeProgress);
              setState({
                detectedCorners: lastKnownCornersRef.current,
                confidence: fadedConfidence,
                isStable: false,
                stabilityProgress: 0,
              });
            } else {
              // Fade complete — clear everything
              previousCornersRef.current = null;
              smoothedCornersRef.current = null;
              stableStartTimeRef.current = null;
              autoCapturedRef.current = false;
              lostTimeRef.current = null;
              lastKnownCornersRef.current = null;
              unstableCountRef.current = 0;

              setState({
                detectedCorners: null,
                confidence: 0,
                isStable: false,
                stabilityProgress: 0,
              });
            }
          } else {
            // No previous detection to fade
            previousCornersRef.current = null;
            smoothedCornersRef.current = null;
            stableStartTimeRef.current = null;
            autoCapturedRef.current = false;
            unstableCountRef.current = 0;

            setState({
              detectedCorners: null,
              confidence: 0,
              isStable: false,
              stabilityProgress: 0,
            });
          }
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
      smoothedCornersRef.current = null;
      stableStartTimeRef.current = null;
      autoCapturedRef.current = false;
      lostTimeRef.current = null;
      lastKnownCornersRef.current = null;
      unstableCountRef.current = 0;
    };
  }, [enabled, detectionLoop]);

  return state;
}

/**
 * useDocumentDetection Hook
 *
 * Drives the document detection loop via requestAnimationFrame.
 * Lazy-loads the DocumentDetector class (non-blocking).
 * Tracks stability for auto-capture with EMA smoothing + hysteresis.
 *
 * Key design decisions:
 * - Null frames (Hough misses) are tolerated — overlay stays visible
 * - Stability is checked against SMOOTHED corners (not raw jittery Hough output)
 * - Grace period for both "corners moved" AND "no detection" frames
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Point } from "../types";

interface DetectionState {
  detectedCorners: Point[] | null;
  confidence: number;
  isStable: boolean;
  stabilityProgress: number; // 0.0 to 1.0
  hint: string | null;
}

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  stabilityThresholdMs?: number; // default 1000
  targetFps?: number; // default 12
  onStableDetection?: (corners: Point[]) => void;
}

// ─── Tuning Constants ────────────────────────────────────────
const STABILITY_TOLERANCE = 0.035; // 3.5% of frame — forgiving for mobile hand shake
const EMA_ALPHA = 0.3; // 30% new, 70% history — smooth, absorbs Hough jitter
const GRACE_FRAMES_UNSTABLE = 6; // Tolerate 6 frames where corners moved before resetting
const NULL_FRAME_TOLERANCE = 10; // Tolerate 10 frames (~800ms) of no detection before giving up
const FADEOUT_MS = 400; // Fade-out duration after null tolerance exceeded
const NO_DETECTION_HINT_MS = 3000; // Show "Dokument ins Bild halten" after 3s without ANY detection

/** Check if smoothed corners are similar enough to count as "stable" */
function cornersAreSimilar(a: Point[], b: Point[]): boolean {
  if (a.length !== 4 || b.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    if (dx * dx + dy * dy > STABILITY_TOLERANCE * STABILITY_TOLERANCE) return false;
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
  stabilityThresholdMs = 1000,
  targetFps = 12,
  onStableDetection,
}: UseDocumentDetectionOptions): DetectionState {
  const [state, setState] = useState<DetectionState>({
    detectedCorners: null,
    confidence: 0,
    isStable: false,
    stabilityProgress: 0,
    hint: null,
  });

  // Refs for the detection loop
  const detectorRef = useRef<import("../utils/documentDetector").DocumentDetectorInterface | null>(null);
  const rafRef = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);
  const smoothedCornersRef = useRef<Point[] | null>(null);
  const prevSmoothedRef = useRef<Point[] | null>(null); // Previous frame's smoothed (for stability check)
  const stableStartTimeRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const disabledRef = useRef(false);
  const autoCapturedRef = useRef(false);
  const onStableDetectionRef = useRef(onStableDetection);
  const unstableCountRef = useRef(0);
  const nullFrameCountRef = useRef(0); // Consecutive frames with no detection
  const lastKnownConfidenceRef = useRef(0);
  const loopStartTimeRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(0); // Last time Hough returned something
  const stabilityBreakCountRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const resolutionReducedRef = useRef(false);
  const lostTimeRef = useRef<number | null>(null); // When we exceeded null tolerance and started fading

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
      if (document.hidden) return;

      try {
        const t0 = performance.now();
        const result = detector.detect ? detector.detect(video) : null;
        const frameMs = performance.now() - t0;

        // Adaptive performance: auto-reduce resolution if consistently slow
        if (!resolutionReducedRef.current) {
          const frameTimes = frameTimesRef.current;
          frameTimes.push(frameMs);
          if (frameTimes.length > 20) frameTimes.shift();
          if (frameTimes.length === 20) {
            const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            if (avg > 40) {
              detector.reduceResolution();
              resolutionReducedRef.current = true;
            }
          }
        }

        consecutiveErrorsRef.current = 0;

        const hasDetection = result && result.confidence > 0.35;

        if (hasDetection) {
          // ─── DETECTION SUCCESS ───────────────────────────
          nullFrameCountRef.current = 0;
          lostTimeRef.current = null;
          lastDetectionTimeRef.current = timestamp;

          const rawCorners = result.corners;

          // Apply EMA smoothing — this absorbs Hough jitter
          const smoothed = smoothedCornersRef.current
            ? smoothCorners(smoothedCornersRef.current, rawCorners, EMA_ALPHA)
            : rawCorners;
          smoothedCornersRef.current = smoothed;
          lastKnownConfidenceRef.current = result.confidence;

          // ─── STABILITY CHECK (against smoothed corners, not raw) ───
          handleStabilityCheck(smoothed, result.confidence, timestamp);

          prevSmoothedRef.current = smoothed;
        } else {
          // ─── NO DETECTION ────────────────────────────────
          nullFrameCountRef.current++;

          if (smoothedCornersRef.current && nullFrameCountRef.current <= NULL_FRAME_TOLERANCE) {
            // Within tolerance — keep showing last known overlay, keep stability timer running
            // This is THE key fix: Hough missing a frame doesn't kill the overlay
            handleStabilityCheck(
              smoothedCornersRef.current,
              lastKnownConfidenceRef.current * 0.95, // Slightly reduce confidence
              timestamp
            );
          } else if (smoothedCornersRef.current && nullFrameCountRef.current > NULL_FRAME_TOLERANCE) {
            // Exceeded tolerance — start fading out
            if (!lostTimeRef.current) {
              lostTimeRef.current = timestamp;
            }

            const fadeElapsed = timestamp - lostTimeRef.current;
            const fadeProgress = Math.min(1, fadeElapsed / FADEOUT_MS);

            if (fadeProgress < 1) {
              const fadedConfidence = lastKnownConfidenceRef.current * (1 - fadeProgress);
              setState({
                detectedCorners: smoothedCornersRef.current,
                confidence: fadedConfidence,
                isStable: false,
                stabilityProgress: 0,
                hint: null,
              });
            } else {
              // Fade complete — full reset
              resetDetectionState();
              const noDetectHint = shouldShowNoDetectionHint(timestamp)
                ? "Dokument ins Bild halten"
                : null;
              setState({
                detectedCorners: null,
                confidence: 0,
                isStable: false,
                stabilityProgress: 0,
                hint: noDetectHint,
              });
            }
          } else {
            // Never had a detection yet
            const noDetectHint = shouldShowNoDetectionHint(timestamp)
              ? "Dokument ins Bild halten"
              : null;
            setState({
              detectedCorners: null,
              confidence: 0,
              isStable: false,
              stabilityProgress: 0,
              hint: noDetectHint,
            });
          }
        }
      } catch {
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 10) {
          disabledRef.current = true;
          setState({
            detectedCorners: null,
            confidence: 0,
            isStable: false,
            stabilityProgress: 0,
            hint: "Erkennung nicht verfügbar — bitte manuell aufnehmen",
          });
        }
      }
    },
    [videoRef, frameInterval, stabilityThresholdMs]
  );

  /** Shared stability logic — called for both real detections AND null-tolerance frames */
  function handleStabilityCheck(smoothed: Point[], confidence: number, timestamp: number) {
    if (
      prevSmoothedRef.current &&
      cornersAreSimilar(smoothed, prevSmoothedRef.current)
    ) {
      // Corners stable — advance timer
      unstableCountRef.current = 0;

      if (!stableStartTimeRef.current) {
        stableStartTimeRef.current = timestamp;
      }

      const stableDuration = timestamp - stableStartTimeRef.current;
      const progress = Math.min(1, stableDuration / stabilityThresholdMs);
      const isStable = progress >= 1;
      stabilityBreakCountRef.current = 0;

      setState({
        detectedCorners: smoothed,
        confidence,
        isStable,
        stabilityProgress: progress,
        hint: isStable
          ? "Dokument erkannt"
          : progress > 0.1
            ? "Nicht bewegen…"
            : null,
      });

      // Auto-capture trigger
      if (isStable && !autoCapturedRef.current) {
        autoCapturedRef.current = true;
        onStableDetectionRef.current?.(smoothed);
      }
    } else {
      // Corners moved — hysteresis
      unstableCountRef.current++;

      if (unstableCountRef.current > GRACE_FRAMES_UNSTABLE) {
        // Too many unstable frames → reset stability timer (but keep showing overlay!)
        stableStartTimeRef.current = null;
        autoCapturedRef.current = false;
        unstableCountRef.current = 0;
        stabilityBreakCountRef.current++;

        setState({
          detectedCorners: smoothed,
          confidence,
          isStable: false,
          stabilityProgress: 0,
          hint: stabilityBreakCountRef.current >= 3 ? "Ruhig halten" : null,
        });
      } else {
        // Within grace period — keep current progress
        const currentProgress = stableStartTimeRef.current
          ? Math.min(1, (timestamp - stableStartTimeRef.current) / stabilityThresholdMs)
          : 0;

        setState({
          detectedCorners: smoothed,
          confidence,
          isStable: false,
          stabilityProgress: currentProgress,
          hint: currentProgress > 0.1 ? "Nicht bewegen…" : null,
        });
      }
    }
  }

  function shouldShowNoDetectionHint(timestamp: number): boolean {
    return loopStartTimeRef.current > 0 &&
      timestamp - Math.max(loopStartTimeRef.current, lastDetectionTimeRef.current) > NO_DETECTION_HINT_MS;
  }

  function resetDetectionState() {
    smoothedCornersRef.current = null;
    prevSmoothedRef.current = null;
    stableStartTimeRef.current = null;
    autoCapturedRef.current = false;
    lostTimeRef.current = null;
    unstableCountRef.current = 0;
    nullFrameCountRef.current = 0;
  }

  // Start/stop detection loop
  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let disposed = false;

    // Lazy-load the document detector module, then create detector (Hough starts immediately)
    import("../utils/documentDetector")
      .then(({ createDocumentDetector }) => {
        if (disposed) return;
        const detector = createDocumentDetector();
        if (disposed) {
          detector.dispose();
          return;
        }
        detectorRef.current = detector;
        disabledRef.current = false;
        consecutiveErrorsRef.current = 0;
        loopStartTimeRef.current = performance.now();
        lastDetectionTimeRef.current = performance.now();
        stabilityBreakCountRef.current = 0;
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
      resetDetectionState();
      loopStartTimeRef.current = 0;
      lastDetectionTimeRef.current = 0;
      stabilityBreakCountRef.current = 0;
    };
  }, [enabled, detectionLoop]);

  return state;
}

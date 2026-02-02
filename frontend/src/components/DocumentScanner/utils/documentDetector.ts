/**
 * DocumentDetector
 *
 * Orchestrates the edge detection pipeline using Hough Line Transform.
 * Pipeline: Video → Downscale → Grayscale → Blur → Sobel → Threshold
 *           → Hough Lines → Suppress → Find Quad
 */

import type { DetectedEdges } from "../types";

/**
 * Shared interface for both Hough-based and ML-based detectors.
 */
export interface DocumentDetectorInterface {
  detect?(video: HTMLVideoElement): DetectedEdges | null;
  detectAsync?(video: HTMLVideoElement): Promise<DetectedEdges | null>;
  reduceResolution(): void;
  dispose(): void;
}

/**
 * Hybrid detector: Hough runs synchronously every frame (guaranteed overlay),
 * ML runs in parallel and overrides when it produces better results.
 */
class HybridDetector implements DocumentDetectorInterface {
  private hough: DocumentDetector;
  private ml: { detectAsync(v: HTMLVideoElement): Promise<DetectedEdges | null>; dispose(): void } | null = null;
  private mlResult: DetectedEdges | null = null;
  private mlRunning = false;
  private mlNullCount = 0;
  private mlDisabled = false;
  private disposed = false;

  constructor(hough: DocumentDetector) {
    this.hough = hough;
  }

  /** Attach ML detector after it loads in background */
  attachML(ml: { detectAsync(v: HTMLVideoElement): Promise<DetectedEdges | null>; dispose(): void }): void {
    if (this.disposed) {
      ml.dispose();
      return;
    }
    this.ml = ml;
  }

  /**
   * Sync detection: always runs Hough for immediate overlay.
   * Also kicks off ML in background. If ML has a result, prefer it.
   */
  detect(video: HTMLVideoElement): DetectedEdges | null {
    // Always run Hough for guaranteed overlay
    const houghResult = this.hough.detect(video);

    // Kick off ML in background (if available and not disabled)
    if (this.ml && !this.mlRunning && !this.mlDisabled) {
      this.mlRunning = true;
      this.ml.detectAsync(video).then((r) => {
        this.mlRunning = false;
        if (r) {
          this.mlResult = r;
          this.mlNullCount = 0;
        } else {
          this.mlNullCount++;
          // After 15 consecutive nulls, disable ML (not working for this camera)
          if (this.mlNullCount >= 15) {
            this.mlDisabled = true;
            this.mlResult = null;
          }
        }
      }).catch(() => {
        this.mlRunning = false;
      });
    }

    // Prefer ML result if available and recent, otherwise use Hough
    if (this.mlResult && this.mlResult.confidence > 0.4) {
      return this.mlResult;
    }

    return houghResult;
  }

  reduceResolution(): void {
    this.hough.reduceResolution();
  }

  dispose(): void {
    this.disposed = true;
    this.hough.dispose();
    if (this.ml) {
      this.ml.dispose();
      this.ml = null;
    }
  }
}

/**
 * Factory: returns Hough detector immediately (no waiting).
 * ML loads in background and attaches when ready.
 */
export function createDocumentDetector(): DocumentDetectorInterface {
  // Use smaller detection canvas on mobile for better performance
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const detectionWidth = isMobile ? 240 : 320;
  const hough = new DocumentDetector({ detectionWidth });
  const hybrid = new HybridDetector(hough);

  // Load ML in background — don't block detection start
  import("./mlDocumentDetector")
    .then(({ MLDocumentDetector }) => {
      const ml = new MLDocumentDetector();
      return ml.load().then(() => ml);
    })
    .then((ml) => {
      hybrid.attachML(ml);
    })
    .catch((err) => {
      console.warn("[Detection] ML failed, using Hough only:", err);
    });

  return hybrid;
}

import {
  rgbaToGrayscale,
  gaussianBlur3x3,
  sobelEdges,
  adaptiveThreshold,
  houghLines,
  suppressLines,
  findQuadFromLines,
} from "./edgeDetection";

interface DetectionConfig {
  /** Width of the downscaled detection canvas (default: 320) */
  detectionWidth: number;
  /** Minimum document area as fraction of frame (default: 0.08) */
  minAreaRatio: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
  detectionWidth: 320,
  minAreaRatio: 0.08,
};

export class DocumentDetector {
  private config: DetectionConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private detectionW = 0;
  private detectionH = 0;

  constructor(config?: Partial<DetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Cannot create 2D context for detection");
    this.ctx = ctx;
  }

  /**
   * Detect document edges in the current video frame.
   * Returns normalized corners (0-1) or null if no document found.
   */
  detect(video: HTMLVideoElement): DetectedEdges | null {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return null;

    // Compute detection dimensions (maintain aspect ratio)
    const scale = this.config.detectionWidth / vw;
    const dw = Math.round(vw * scale);
    const dh = Math.round(vh * scale);

    // Resize canvas if needed
    if (this.detectionW !== dw || this.detectionH !== dh) {
      this.canvas.width = dw;
      this.canvas.height = dh;
      this.detectionW = dw;
      this.detectionH = dh;
    }

    // Step 1: Downscale video frame
    this.ctx.drawImage(video, 0, 0, dw, dh);
    const imageData = this.ctx.getImageData(0, 0, dw, dh);

    // Step 2: Grayscale
    const gray = rgbaToGrayscale(imageData.data, dw, dh);

    // Step 3: Gaussian blur
    const blurred = gaussianBlur3x3(gray, dw, dh);

    // Step 4: Sobel edge detection
    const edges = sobelEdges(blurred, dw, dh);

    // Step 5: Adaptive threshold
    const binary = adaptiveThreshold(edges, dw, dh);

    // Step 6: Hough Line Transform (120 theta steps = 1.5° resolution)
    const lines = houghLines(binary, dw, dh, 1, 120, 0);

    // Step 7: Non-maximum suppression (merge similar lines)
    const diagonal = Math.sqrt(dw * dw + dh * dh);
    const suppressed = suppressLines(
      lines,
      diagonal * 0.06,  // rho threshold: 6% of diagonal (merge nearby parallels)
      Math.PI / 15,      // theta threshold: 12 degrees (merge similar angles)
      15                 // Keep top 15 lines (was 20)
    );

    // Step 8: Find quadrilateral from lines
    const result = findQuadFromLines(
      suppressed,
      dw,
      dh,
      this.config.minAreaRatio
    );

    if (!result) return null;

    return {
      corners: result.corners,
      confidence: result.confidence,
    };
  }

  /**
   * Reduce detection resolution for slow devices.
   */
  reduceResolution(): void {
    if (this.config.detectionWidth > 160) {
      this.config.detectionWidth = Math.round(this.config.detectionWidth * 0.75);
      this.detectionW = 0;
    }
  }

  dispose(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

/**
 * DocumentDetector
 *
 * Orchestrates the edge detection pipeline.
 * Owns a reusable detection canvas and pre-allocated buffers.
 * Stateless per-frame — call detect() with a video element.
 */

import type { DetectedEdges } from "../types";
import {
  rgbaToGrayscale,
  gaussianBlur3x3,
  sobelEdges,
  adaptiveThreshold,
  findContours,
  findLargestQuad,
} from "./edgeDetection";

interface DetectionConfig {
  /** Width of the downscaled detection canvas (default: 320) */
  detectionWidth: number;
  /** Minimum document area as fraction of frame (default: 0.10) */
  minAreaRatio: number;
  /** Maximum document area as fraction of frame (default: 0.95) */
  maxAreaRatio: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
  detectionWidth: 320,
  minAreaRatio: 0.10,
  maxAreaRatio: 0.95,
};

export class DocumentDetector {
  private config: DetectionConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private detectionW = 0;
  private detectionH = 0;

  constructor(config?: Partial<DetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Offscreen canvas for detection (not added to DOM)
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

    // Step 6: Find contours
    const contours = findContours(binary, dw, dh);

    // Step 7: Find largest quadrilateral
    const result = findLargestQuad(
      contours,
      dw,
      dh,
      this.config.minAreaRatio,
      this.config.maxAreaRatio
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
      this.detectionW = 0; // Force canvas resize on next detect()
    }
  }

  dispose(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

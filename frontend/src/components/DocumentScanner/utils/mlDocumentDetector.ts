/**
 * mlDocumentDetector.ts
 *
 * ML-based document detector using U2-NetP via ONNX Runtime Web.
 * Produces a saliency mask, then extracts 4 document corners.
 *
 * Implements the same interface as DocumentDetector for seamless fallback.
 */

import * as ort from "onnxruntime-web";
import type { DetectedEdges } from "../types";
import {
  thresholdMask,
  morphClose,
  findBoundaryPixels,
  extractCorners,
} from "./contourDetection";

// ImageNet normalization constants
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const MODEL_SIZE = 320;

export class MLDocumentDetector {
  private session: ort.InferenceSession | null = null;
  private canvas: OffscreenCanvas | HTMLCanvasElement;
  private ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  // Reusable buffers to avoid GC pressure on mobile
  private floatData: Float32Array;
  private saliency: Float32Array;

  constructor() {
    const pixelCount = MODEL_SIZE * MODEL_SIZE;
    this.floatData = new Float32Array(3 * pixelCount);
    this.saliency = new Float32Array(pixelCount);

    // Use OffscreenCanvas if available, otherwise fallback to regular canvas
    if (typeof OffscreenCanvas !== "undefined") {
      this.canvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
      const ctx = this.canvas.getContext("2d");
      if (!ctx) throw new Error("Cannot create 2D context for ML detector");
      this.ctx = ctx;
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = MODEL_SIZE;
      canvas.height = MODEL_SIZE;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Cannot create 2D context for ML detector");
      this.canvas = canvas;
      this.ctx = ctx;
    }
  }

  /**
   * Load the ONNX model. Must be called before detectAsync().
   * Throws if WebAssembly is not supported or model can't be loaded.
   */
  async load(): Promise<void> {
    // Configure WASM backend to load from CDN
    ort.env.wasm.wasmPaths =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";

    // Prefer WASM backend (most compatible)
    const modelUrl = `${window.location.origin}/models/u2netp.onnx`;

    this.session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });

    console.log("[ML Detector] Model loaded successfully");
  }

  /**
   * Detect document edges in the current video frame (async).
   * Returns normalized corners (0-1) or null if no document found.
   */
  async detectAsync(video: HTMLVideoElement): Promise<DetectedEdges | null> {
    if (!this.session) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return null;

    // Step 1: Draw video frame to 320x320 canvas
    this.ctx.drawImage(video, 0, 0, MODEL_SIZE, MODEL_SIZE);
    const imageData = this.ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
    const rgba = imageData.data;

    // Step 2: Preprocess — RGBA to float32 NCHW tensor, ImageNet normalization
    const pixelCount = MODEL_SIZE * MODEL_SIZE;
    const floatData = this.floatData;

    for (let i = 0; i < pixelCount; i++) {
      const rgbaIdx = i * 4;
      floatData[i] = (rgba[rgbaIdx] / 255 - MEAN[0]) / STD[0];
      floatData[pixelCount + i] = (rgba[rgbaIdx + 1] / 255 - MEAN[1]) / STD[1];
      floatData[2 * pixelCount + i] = (rgba[rgbaIdx + 2] / 255 - MEAN[2]) / STD[2];
    }

    const inputTensor = new ort.Tensor("float32", floatData, [
      1,
      3,
      MODEL_SIZE,
      MODEL_SIZE,
    ]);

    // Step 3: Run inference
    const feeds: Record<string, ort.Tensor> = {};
    const inputName = this.session.inputNames[0];
    feeds[inputName] = inputTensor;

    const results = await this.session.run(feeds);

    // Get first output (primary saliency map)
    const outputName = this.session.outputNames[0];
    const output = results[outputName];
    const rawOutput = output.data as Float32Array;

    // Step 4: Sigmoid activation on raw output
    const saliency = this.saliency;
    for (let i = 0; i < pixelCount; i++) {
      saliency[i] = 1 / (1 + Math.exp(-rawOutput[i]));
    }

    // Step 5: Threshold to binary mask (lower threshold for better mobile detection)
    let binary = thresholdMask(saliency, MODEL_SIZE, MODEL_SIZE, 0.35);

    // Step 6: Morphological close to fill small holes from noisy mobile cameras
    binary = morphClose(binary, MODEL_SIZE, MODEL_SIZE);

    // Step 7: Find boundary pixels and extract corners via convex hull
    const boundary = findBoundaryPixels(binary, MODEL_SIZE, MODEL_SIZE);
    const corners = extractCorners(boundary);
    if (!corners) return null;

    // Step 8: Normalize corners to 0-1
    const normalizedCorners = corners.map((p) => ({
      x: p.x / MODEL_SIZE,
      y: p.y / MODEL_SIZE,
    }));

    // Step 9: Validate quad - reject if too small or degenerate
    const area = quadArea(normalizedCorners);
    if (area < 0.03) return null; // Less than 3% of frame

    // Step 10: Compute confidence from mask coverage and quad regularity
    let maskPixels = 0;
    for (let i = 0; i < pixelCount; i++) {
      if (binary[i] === 255) maskPixels++;
    }
    const coverage = maskPixels / pixelCount;
    // Confidence: based on reasonable coverage range
    const confidence =
      coverage > 0.03 && coverage < 0.95
        ? Math.min(1, 0.55 + coverage * 0.4)
        : 0.35;

    return {
      corners: normalizedCorners,
      confidence,
    };
  }

  /**
   * No-op for ML detector (resolution is fixed at 320x320).
   */
  reduceResolution(): void {
    // No-op: ML model uses fixed input size
  }

  /**
   * Release the ONNX session and free memory.
   */
  dispose(): void {
    if (this.session) {
      this.session.release();
      this.session = null;
    }
  }
}

/** Shoelace formula for quadrilateral area (normalized 0-1 coordinates). */
function quadArea(pts: { x: number; y: number }[]): number {
  if (pts.length !== 4) return 0;
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

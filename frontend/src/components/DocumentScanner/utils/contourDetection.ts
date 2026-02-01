/**
 * contourDetection.ts
 *
 * Pure TypeScript postprocessing for ML saliency masks.
 * Converts a float32 saliency map into 4 ordered document corners.
 *
 * Pipeline: saliency → threshold → binary mask → largest contour
 *           → convex hull → 4 corners from hull
 */

import type { Point } from "../types";

/**
 * Threshold a float32 saliency map into a binary Uint8Array mask.
 * Values >= threshold become 255, others become 0.
 */
export function thresholdMask(
  saliency: Float32Array,
  w: number,
  h: number,
  threshold = 0.5
): Uint8Array {
  const binary = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    binary[i] = saliency[i] >= threshold ? 255 : 0;
  }
  return binary;
}

/**
 * Simple morphological close (dilate then erode) to fill small holes.
 * Uses a 3x3 structuring element.
 */
export function morphClose(binary: Uint8Array, w: number, h: number): Uint8Array {
  // Dilate
  const dilated = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (
        binary[y * w + x] === 255 ||
        binary[(y - 1) * w + x] === 255 ||
        binary[(y + 1) * w + x] === 255 ||
        binary[y * w + x - 1] === 255 ||
        binary[y * w + x + 1] === 255
      ) {
        dilated[y * w + x] = 255;
      }
    }
  }
  // Erode
  const result = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (
        dilated[y * w + x] === 255 &&
        dilated[(y - 1) * w + x] === 255 &&
        dilated[(y + 1) * w + x] === 255 &&
        dilated[y * w + x - 1] === 255 &&
        dilated[y * w + x + 1] === 255
      ) {
        result[y * w + x] = 255;
      }
    }
  }
  return result;
}

/**
 * Find all foreground boundary pixels (simpler and more robust than Moore tracing).
 * A pixel is a boundary pixel if it's foreground and has at least one background neighbor.
 */
export function findBoundaryPixels(
  binary: Uint8Array,
  w: number,
  h: number
): Point[] {
  const boundary: Point[] = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (binary[y * w + x] !== 255) continue;

      // Check 4-connectivity neighbors
      if (
        binary[(y - 1) * w + x] === 0 ||
        binary[(y + 1) * w + x] === 0 ||
        binary[y * w + x - 1] === 0 ||
        binary[y * w + x + 1] === 0
      ) {
        boundary.push({ x, y });
      }
    }
  }

  return boundary;
}

/**
 * Compute convex hull of a set of points using Andrew's monotone chain algorithm.
 * Returns points in counter-clockwise order.
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  // Lower hull
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  // Upper hull
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

/**
 * Find the 4 corners of a quadrilateral from a convex hull.
 * Uses the 4 points that maximize the enclosed area (farthest apart).
 * Falls back to extreme points if hull is too small.
 */
export function findQuadFromHull(hull: Point[]): Point[] | null {
  if (hull.length < 4) return null;

  if (hull.length === 4) return hull;

  // Strategy: find 4 hull points that form the largest area quadrilateral.
  // For efficiency, use the "rotating calipers" approximation:
  // pick the extreme points in 4 diagonal directions.
  let tlIdx = 0, trIdx = 0, brIdx = 0, blIdx = 0;
  let minSum = Infinity, maxSum = -Infinity;
  let minDiff = Infinity, maxDiff = -Infinity;

  for (let i = 0; i < hull.length; i++) {
    const p = hull[i];
    const sum = p.x + p.y;
    const diff = p.x - p.y;

    if (sum < minSum) { minSum = sum; tlIdx = i; }
    if (sum > maxSum) { maxSum = sum; brIdx = i; }
    if (diff > maxDiff) { maxDiff = diff; trIdx = i; }
    if (diff < minDiff) { minDiff = diff; blIdx = i; }
  }

  // Ensure all 4 are distinct
  const indices = new Set([tlIdx, trIdx, brIdx, blIdx]);
  if (indices.size < 4) return null;

  return [hull[tlIdx], hull[trIdx], hull[brIdx], hull[blIdx]];
}

/**
 * Main entry: extract 4 document corners from boundary pixels.
 * Returns ordered TL, TR, BR, BL corners or null.
 */
export function extractCorners(boundary: Point[]): Point[] | null {
  if (boundary.length < 10) return null;

  const hull = convexHull(boundary);
  if (hull.length < 4) return null;

  const quad = findQuadFromHull(hull);
  if (!quad) return null;

  return orderCornersCW(quad);
}

/**
 * Order 4 corner points in clockwise order: TL, TR, BR, BL.
 * Uses sum (x+y) and difference (x-y) to classify corners.
 */
export function orderCornersCW(points: Point[]): Point[] {
  if (points.length !== 4) return points;

  const sorted = [...points];

  // TL has smallest (x+y), BR has largest (x+y)
  // TR has largest (x-y), BL has smallest (x-y)
  const sums = sorted.map((p) => p.x + p.y);
  const diffs = sorted.map((p) => p.x - p.y);

  const tlIdx = sums.indexOf(Math.min(...sums));
  const brIdx = sums.indexOf(Math.max(...sums));
  const trIdx = diffs.indexOf(Math.max(...diffs));
  const blIdx = diffs.indexOf(Math.min(...diffs));

  return [sorted[tlIdx], sorted[trIdx], sorted[brIdx], sorted[blIdx]];
}

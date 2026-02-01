/**
 * contourDetection.ts
 *
 * Pure TypeScript postprocessing for ML saliency masks.
 * Converts a float32 saliency map into 4 ordered document corners.
 *
 * Pipeline: saliency → threshold → binary mask → largest contour
 *           → Douglas-Peucker approximation → 4 ordered corners
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
 * Find the largest contour in a binary image using Moore neighborhood tracing.
 * Returns an array of pixel coordinates forming the contour boundary.
 */
export function findLargestContour(
  binary: Uint8Array,
  w: number,
  h: number
): Point[] {
  // Moore neighborhood: 8 directions (clockwise from right)
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  let bestContour: Point[] = [];

  // Track which pixels have been used as starting points
  const visited = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      // Look for foreground pixel with background to the left (entry from west)
      if (binary[idx] !== 255 || visited[idx]) continue;
      if (binary[idx - 1] !== 0) continue; // Not a boundary from west

      const contour: Point[] = [];
      let cx = x;
      let cy = y;
      let dir = 0; // Start looking right

      const startX = x;
      const startY = y;
      let steps = 0;
      const maxSteps = w * h * 2; // Safety limit

      do {
        contour.push({ x: cx, y: cy });
        visited[cy * w + cx] = 1;

        // Search for next boundary pixel
        let found = false;
        const backDir = (dir + 4) % 8; // opposite direction
        let searchDir = (backDir + 1) % 8; // start search from one past backtrack

        for (let i = 0; i < 8; i++) {
          const d = (searchDir + i) % 8;
          const nx = cx + dx[d];
          const ny = cy + dy[d];

          if (nx >= 0 && nx < w && ny >= 0 && ny < h && binary[ny * w + nx] === 255) {
            cx = nx;
            cy = ny;
            dir = d;
            found = true;
            break;
          }
        }

        if (!found) break;
        steps++;
      } while ((cx !== startX || cy !== startY) && steps < maxSteps);

      if (contour.length > bestContour.length) {
        bestContour = contour;
      }
    }
  }

  return bestContour;
}

/**
 * Perpendicular distance from a point to a line segment.
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len = Math.sqrt(abx * abx + aby * aby);
  if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  return Math.abs(abx * (a.y - p.y) - (a.x - p.x) * aby) / len;
}

/**
 * Douglas-Peucker polyline simplification.
 */
function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[end]];
}

/**
 * Approximate a contour as a quadrilateral (4 vertices).
 * Uses iterative Douglas-Peucker with adaptive epsilon.
 * Returns null if the contour can't be reasonably approximated as a quad.
 */
export function approxQuad(contour: Point[]): Point[] | null {
  if (contour.length < 20) return null;

  // Close the contour for simplification
  const closed = [...contour, contour[0]];

  // Compute perimeter for adaptive epsilon
  let perimeter = 0;
  for (let i = 1; i < closed.length; i++) {
    const dx = closed[i].x - closed[i - 1].x;
    const dy = closed[i].y - closed[i - 1].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  // Try increasing epsilon until we get exactly 4 vertices (or give up)
  for (let pct = 0.01; pct <= 0.08; pct += 0.005) {
    const epsilon = perimeter * pct;
    const simplified = douglasPeucker(closed, epsilon);
    // simplified includes duplicated start/end point, so 5 entries = 4 unique vertices
    const uniqueCount = simplified.length - 1;

    if (uniqueCount === 4) {
      return simplified.slice(0, 4);
    }
  }

  // If we can't get exactly 4, try to pick the 4 most extreme points
  return pickFourExtremePoints(contour);
}

/**
 * Fallback: pick the 4 most extreme points from the contour
 * (topmost, rightmost, bottommost, leftmost).
 */
function pickFourExtremePoints(contour: Point[]): Point[] | null {
  if (contour.length < 4) return null;

  let top = contour[0];
  let right = contour[0];
  let bottom = contour[0];
  let left = contour[0];

  for (const p of contour) {
    if (p.y < top.y) top = p;
    if (p.x > right.x) right = p;
    if (p.y > bottom.y) bottom = p;
    if (p.x < left.x) left = p;
  }

  // Ensure 4 distinct points
  const pts = [top, right, bottom, left];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (pts[i].x === pts[j].x && pts[i].y === pts[j].y) return null;
    }
  }

  return pts;
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

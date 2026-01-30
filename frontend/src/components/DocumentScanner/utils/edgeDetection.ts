/**
 * edgeDetection.ts
 *
 * Pure image processing functions for document edge detection.
 * No external dependencies — works on Uint8Array buffers.
 * All coordinates are in pixel space of the detection canvas.
 */

import type { Point } from "../types";

// ─── Grayscale ──────────────────────────────────────────────

export function rgbaToGrayscale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const ri = i * 4;
    gray[i] = (rgba[ri] * 77 + rgba[ri + 1] * 150 + rgba[ri + 2] * 29) >> 8;
  }
  return gray;
}

// ─── Gaussian Blur 3×3 (separable) ─────────────────────────

export function gaussianBlur3x3(
  src: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const temp = new Uint8Array(width * height);
  const dst = new Uint8Array(width * height);

  // Horizontal pass: kernel [1, 2, 1] / 4
  for (let y = 0; y < height; y++) {
    const row = y * width;
    temp[row] = (src[row] * 3 + src[row + 1]) >> 2;
    for (let x = 1; x < width - 1; x++) {
      temp[row + x] = (src[row + x - 1] + src[row + x] * 2 + src[row + x + 1]) >> 2;
    }
    temp[row + width - 1] = (src[row + width - 2] + src[row + width - 1] * 3) >> 2;
  }

  // Vertical pass: kernel [1, 2, 1] / 4
  for (let x = 0; x < width; x++) {
    dst[x] = (temp[x] * 3 + temp[x + width]) >> 2;
    for (let y = 1; y < height - 1; y++) {
      const idx = y * width + x;
      dst[idx] = (temp[idx - width] + temp[idx] * 2 + temp[idx + width]) >> 2;
    }
    const last = (height - 1) * width + x;
    dst[last] = (temp[last - width] + temp[last] * 3) >> 2;
  }

  return dst;
}

// ─── Sobel Edge Detection ───────────────────────────────────

export function sobelEdges(
  src: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const dst = new Uint8Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;

      // 3×3 Sobel kernels
      const tl = src[i - width - 1];
      const tc = src[i - width];
      const tr = src[i - width + 1];
      const ml = src[i - 1];
      const mr = src[i + 1];
      const bl = src[i + width - 1];
      const bc = src[i + width];
      const br = src[i + width + 1];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      // Approximation: |gx| + |gy| (faster than sqrt)
      const mag = (gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy);
      dst[i] = mag > 255 ? 255 : mag;
    }
  }

  return dst;
}

// ─── Adaptive Threshold ─────────────────────────────────────

export function adaptiveThreshold(
  src: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const dst = new Uint8Array(width * height);

  // Compute mean edge magnitude (skip border pixels)
  let sum = 0;
  let count = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] > 0) {
      sum += src[i];
      count++;
    }
  }
  const mean = count > 0 ? sum / count : 128;
  const threshold = Math.max(30, mean * 1.2);

  for (let i = 0; i < src.length; i++) {
    dst[i] = src[i] >= threshold ? 255 : 0;
  }

  return dst;
}

// ─── Contour Finding (simplified border following) ──────────

export function findContours(
  binary: Uint8Array,
  width: number,
  height: number
): Point[][] {
  const visited = new Uint8Array(width * height);
  const contours: Point[][] = [];

  // Moore neighborhood: 8 directions (clockwise from right)
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (binary[idx] !== 255 || visited[idx]) continue;

      // Check if this is a border pixel (has at least one black neighbor)
      let isBorder = false;
      for (let d = 0; d < 8; d++) {
        const ni = (y + dy[d]) * width + (x + dx[d]);
        if (binary[ni] === 0) {
          isBorder = true;
          break;
        }
      }
      if (!isBorder) continue;

      // Trace contour using Moore neighborhood tracing
      const contour: Point[] = [];
      let cx = x, cy = y;
      let dir = 0; // Start direction
      const startX = x, startY = y;
      let steps = 0;
      const maxSteps = width * height; // Safety limit

      do {
        visited[cy * width + cx] = 1;
        contour.push({ x: cx, y: cy });

        // Search for next border pixel in Moore neighborhood
        let found = false;
        const searchStart = (dir + 5) % 8; // Start from dir-3 (backtrack)

        for (let i = 0; i < 8; i++) {
          const d = (searchStart + i) % 8;
          const nx = cx + dx[d];
          const ny = cy + dy[d];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height && binary[ny * width + nx] === 255) {
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

      if (contour.length >= 4) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

// ─── Ramer-Douglas-Peucker Polygon Simplification ───────────

export function simplifyPolygon(contour: Point[], epsilon: number): Point[] {
  if (contour.length < 3) return contour;

  // Find point with max distance from line (start → end)
  let maxDist = 0;
  let maxIdx = 0;

  const start = contour[0];
  const end = contour[contour.length - 1];

  for (let i = 1; i < contour.length - 1; i++) {
    const d = pointToLineDistance(contour[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPolygon(contour.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPolygon(contour.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  const cross = Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x));
  return cross / Math.sqrt(lenSq);
}

// ─── Find Largest Quadrilateral ─────────────────────────────

export function findLargestQuad(
  contours: Point[][],
  frameWidth: number,
  frameHeight: number,
  minAreaRatio: number = 0.10,
  maxAreaRatio: number = 0.95
): { corners: Point[]; confidence: number } | null {
  const frameArea = frameWidth * frameHeight;
  const minArea = frameArea * minAreaRatio;
  const maxArea = frameArea * maxAreaRatio;

  // Sort contours by area (largest first)
  const withArea = contours
    .map((c) => ({ contour: c, area: Math.abs(polygonArea(c)) }))
    .filter((c) => c.area >= minArea && c.area <= maxArea)
    .sort((a, b) => b.area - a.area);

  // Adaptive epsilon based on contour perimeter
  for (const { contour, area } of withArea.slice(0, 5)) {
    const perimeter = contourPerimeter(contour);
    const epsilon = perimeter * 0.02;
    const simplified = simplifyPolygon(contour, epsilon);

    if (simplified.length === 4 && isValidQuadrilateral(simplified)) {
      const ordered = orderCorners(simplified);
      const confidence = calculateConfidence(area, frameArea, ordered);

      return {
        corners: ordered.map((p) => ({
          x: p.x / frameWidth,
          y: p.y / frameHeight,
        })),
        confidence,
      };
    }

    // Try with more aggressive simplification
    if (simplified.length > 4) {
      const epsilon2 = perimeter * 0.04;
      const simplified2 = simplifyPolygon(contour, epsilon2);
      if (simplified2.length === 4 && isValidQuadrilateral(simplified2)) {
        const ordered = orderCorners(simplified2);
        const confidence = calculateConfidence(area, frameArea, ordered) * 0.9;

        return {
          corners: ordered.map((p) => ({
            x: p.x / frameWidth,
            y: p.y / frameHeight,
          })),
          confidence,
        };
      }
    }
  }

  return null;
}

// ─── Helpers ────────────────────────────────────────────────

export function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

function contourPerimeter(points: Point[]): number {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

export function isValidQuadrilateral(points: Point[]): boolean {
  if (points.length !== 4) return false;

  // Check all angles are between 45° and 135°
  for (let i = 0; i < 4; i++) {
    const prev = points[(i + 3) % 4];
    const curr = points[i];
    const next = points[(i + 1) % 4];

    const angle = angleBetween(prev, curr, next);
    if (angle < 45 || angle > 135) return false;
  }

  // Check area is positive (not self-intersecting)
  const area = Math.abs(polygonArea(points));
  if (area < 100) return false; // Too small

  return true;
}

function angleBetween(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;

  return Math.abs(Math.atan2(cross, dot) * (180 / Math.PI));
}

/**
 * Order corners: TL, TR, BR, BL
 */
function orderCorners(points: Point[]): Point[] {
  // Find centroid
  const cx = points.reduce((s, p) => s + p.x, 0) / 4;
  const cy = points.reduce((s, p) => s + p.y, 0) / 4;

  // Sort by angle from centroid
  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  // Rotate so that top-left is first
  // TL = smallest x + y sum
  let tlIdx = 0;
  let minSum = Infinity;
  for (let i = 0; i < 4; i++) {
    const sum = sorted[i].x + sorted[i].y;
    if (sum < minSum) {
      minSum = sum;
      tlIdx = i;
    }
  }

  const ordered: Point[] = [];
  for (let i = 0; i < 4; i++) {
    ordered.push(sorted[(tlIdx + i) % 4]);
  }

  return ordered;
}

function calculateConfidence(
  area: number,
  frameArea: number,
  corners: Point[]
): number {
  // Area ratio component (larger document = higher confidence)
  const areaRatio = area / frameArea;
  const areaScore = Math.min(1, areaRatio * 2);

  // Aspect ratio component (closer to standard document ratio = higher)
  const w1 = Math.sqrt(
    (corners[1].x - corners[0].x) ** 2 + (corners[1].y - corners[0].y) ** 2
  );
  const h1 = Math.sqrt(
    (corners[3].x - corners[0].x) ** 2 + (corners[3].y - corners[0].y) ** 2
  );
  const aspect = Math.max(w1, h1) / (Math.min(w1, h1) || 1);
  // A4 ≈ 1.41, Letter ≈ 1.29
  const idealAspect = 1.41;
  const aspectScore = 1 - Math.min(1, Math.abs(aspect - idealAspect) / idealAspect);

  return areaScore * 0.6 + aspectScore * 0.4;
}

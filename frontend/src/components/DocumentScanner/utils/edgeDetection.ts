/**
 * edgeDetection.ts
 *
 * Document edge detection via Sobel + Hough Line Transform.
 * No external dependencies — works on Uint8Array buffers.
 *
 * Pipeline: Grayscale → Blur → Sobel → Threshold → Hough Lines
 *           → Find 4 dominant lines → Compute intersections → Quadrilateral
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

  let sum = 0;
  let count = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] > 0) {
      sum += src[i];
      count++;
    }
  }
  const mean = count > 0 ? sum / count : 128;
  const threshold = Math.max(25, mean * 1.0);

  for (let i = 0; i < src.length; i++) {
    dst[i] = src[i] >= threshold ? 255 : 0;
  }

  return dst;
}

// ─── Hough Line Transform ───────────────────────────────────

interface HoughLine {
  rho: number;   // Distance from origin
  theta: number; // Angle in radians
  votes: number; // Accumulator votes
}

/**
 * Simplified Hough Line Transform.
 * Returns lines sorted by vote count (strongest first).
 */
export function houghLines(
  binary: Uint8Array,
  width: number,
  height: number,
  rhoStep: number = 1,
  thetaSteps: number = 180,
  voteThreshold: number = 0
): HoughLine[] {
  const diagonal = Math.sqrt(width * width + height * height);
  const maxRho = Math.ceil(diagonal);
  const rhoSize = 2 * maxRho + 1;

  // Precompute sin/cos tables
  const sinTable = new Float32Array(thetaSteps);
  const cosTable = new Float32Array(thetaSteps);
  for (let t = 0; t < thetaSteps; t++) {
    const theta = (t * Math.PI) / thetaSteps;
    sinTable[t] = Math.sin(theta);
    cosTable[t] = Math.cos(theta);
  }

  // Accumulator
  const accumulator = new Int32Array(rhoSize * thetaSteps);

  // Vote for each edge pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] !== 255) continue;

      for (let t = 0; t < thetaSteps; t++) {
        const rho = Math.round(x * cosTable[t] + y * sinTable[t]);
        const rhoIdx = rho + maxRho;
        accumulator[rhoIdx * thetaSteps + t]++;
      }
    }
  }

  // Auto-threshold if not provided: top 20% of max votes
  let maxVotes = 0;
  for (let i = 0; i < accumulator.length; i++) {
    if (accumulator[i] > maxVotes) maxVotes = accumulator[i];
  }
  const effectiveThreshold = voteThreshold > 0
    ? voteThreshold
    : Math.max(20, maxVotes * 0.25);

  // Extract lines above threshold
  const lines: HoughLine[] = [];
  for (let r = 0; r < rhoSize; r++) {
    for (let t = 0; t < thetaSteps; t++) {
      const votes = accumulator[r * thetaSteps + t];
      if (votes >= effectiveThreshold) {
        lines.push({
          rho: (r - maxRho) * rhoStep,
          theta: (t * Math.PI) / thetaSteps,
          votes,
        });
      }
    }
  }

  // Sort by votes descending
  lines.sort((a, b) => b.votes - a.votes);

  return lines;
}

// ─── Non-Maximum Suppression for Lines ──────────────────────

/**
 * Merge similar lines (close rho + theta).
 * Returns up to maxLines distinct lines.
 */
export function suppressLines(
  lines: HoughLine[],
  rhoThreshold: number,
  thetaThreshold: number,
  maxLines: number = 20
): HoughLine[] {
  const result: HoughLine[] = [];

  for (const line of lines) {
    let isDuplicate = false;
    for (const existing of result) {
      const rhoDiff = Math.abs(line.rho - existing.rho);
      let thetaDiff = Math.abs(line.theta - existing.theta);
      // Handle wrap-around near 0 and PI
      if (thetaDiff > Math.PI / 2) thetaDiff = Math.PI - thetaDiff;

      if (rhoDiff < rhoThreshold && thetaDiff < thetaThreshold) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      result.push(line);
      if (result.length >= maxLines) break;
    }
  }

  return result;
}

// ─── Find Document Quadrilateral from Lines ─────────────────

/**
 * From a set of lines, find 4 lines forming a rectangle-like shape.
 * Groups lines into ~horizontal and ~vertical, then picks the best pair from each.
 */
export function findQuadFromLines(
  lines: HoughLine[],
  frameWidth: number,
  frameHeight: number,
  minAreaRatio: number = 0.08
): { corners: Point[]; confidence: number } | null {
  if (lines.length < 4) return null;

  // Classify lines as roughly horizontal or vertical
  // theta near 0 or PI = vertical, theta near PI/2 = horizontal
  const horizontal: HoughLine[] = [];
  const vertical: HoughLine[] = [];

  for (const line of lines) {
    const angle = line.theta;
    // Horizontal: theta between 60° and 120° (PI/3 to 2PI/3)
    if (angle > Math.PI * 0.3 && angle < Math.PI * 0.7) {
      horizontal.push(line);
    }
    // Vertical: theta < 30° or > 150° (near 0 or PI)
    else if (angle < Math.PI * 0.2 || angle > Math.PI * 0.8) {
      vertical.push(line);
    }
  }

  if (horizontal.length < 2 || vertical.length < 2) return null;

  // Pick best pair from each group (most separated, strongest votes)
  const hPair = findBestPair(horizontal, frameHeight * 0.15);
  const vPair = findBestPair(vertical, frameWidth * 0.15);

  if (!hPair || !vPair) return null;

  // Compute 4 intersection points
  const corners: Point[] = [];
  for (const h of hPair) {
    for (const v of vPair) {
      const pt = lineIntersection(h, v);
      if (pt) corners.push(pt);
    }
  }

  if (corners.length !== 4) return null;

  // Check corners are within frame (with some margin)
  const margin = -0.1; // Allow slightly outside
  for (const c of corners) {
    if (
      c.x < frameWidth * margin ||
      c.x > frameWidth * (1 - margin) ||
      c.y < frameHeight * margin ||
      c.y > frameHeight * (1 - margin)
    ) {
      return null;
    }
  }

  // Order corners: TL, TR, BR, BL
  const ordered = orderCorners(corners);

  // Check area
  const area = Math.abs(polygonArea(ordered));
  const frameArea = frameWidth * frameHeight;
  if (area < frameArea * minAreaRatio || area > frameArea * 0.98) return null;

  // Check shape validity
  if (!isValidQuadrilateral(ordered)) return null;

  // Calculate confidence
  const totalVotes = [...hPair, ...vPair].reduce((s, l) => s + l.votes, 0);
  const maxPossibleVotes = Math.max(frameWidth, frameHeight) * 4;
  const voteConfidence = Math.min(1, totalVotes / maxPossibleVotes);
  const areaConfidence = Math.min(1, (area / frameArea) * 2);
  const confidence = voteConfidence * 0.5 + areaConfidence * 0.5;

  // Normalize to 0-1
  return {
    corners: ordered.map((p) => ({
      x: Math.max(0, Math.min(1, p.x / frameWidth)),
      y: Math.max(0, Math.min(1, p.y / frameHeight)),
    })),
    confidence,
  };
}

// ─── Line Pair Selection ────────────────────────────────────

function findBestPair(
  lines: HoughLine[],
  minSeparation: number
): [HoughLine, HoughLine] | null {
  // Find the pair with highest combined votes that are sufficiently separated
  let bestPair: [HoughLine, HoughLine] | null = null;
  let bestScore = 0;
  const limit = Math.min(lines.length, 8); // Check top 8 lines

  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const separation = Math.abs(lines[i].rho - lines[j].rho);
      if (separation >= minSeparation) {
        const score = lines[i].votes + lines[j].votes;
        if (score > bestScore) {
          bestScore = score;
          bestPair = [lines[i], lines[j]];
        }
      }
    }
  }
  return bestPair;
}

// ─── Line Intersection ──────────────────────────────────────

function lineIntersection(a: HoughLine, b: HoughLine): Point | null {
  const sinA = Math.sin(a.theta);
  const cosA = Math.cos(a.theta);
  const sinB = Math.sin(b.theta);
  const cosB = Math.cos(b.theta);

  const det = cosA * sinB - sinA * cosB;
  if (Math.abs(det) < 1e-6) return null; // Parallel lines

  const x = (a.rho * sinB - b.rho * sinA) / det;
  const y = (b.rho * cosA - a.rho * cosB) / det;

  return { x, y };
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

export function isValidQuadrilateral(points: Point[]): boolean {
  if (points.length !== 4) return false;

  // Check all angles are between 40° and 140°
  for (let i = 0; i < 4; i++) {
    const prev = points[(i + 3) % 4];
    const curr = points[i];
    const next = points[(i + 1) % 4];

    const angle = angleBetween(prev, curr, next);
    if (angle < 40 || angle > 140) return false;
  }

  // Check area is positive (not self-intersecting)
  const area = Math.abs(polygonArea(points));
  if (area < 50) return false;

  // Check aspect ratio (reject extreme shapes)
  const topWidth = Math.sqrt(
    (points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2
  );
  const leftHeight = Math.sqrt(
    (points[3].x - points[0].x) ** 2 + (points[3].y - points[0].y) ** 2
  );
  if (topWidth > 0 && leftHeight > 0) {
    const aspect = topWidth / leftHeight;
    if (aspect < 0.3 || aspect > 3.5) return false;
  }

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

  // Rotate so that top-left is first (smallest x + y sum)
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

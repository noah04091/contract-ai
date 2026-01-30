/**
 * Client-side Image Processing — Pro Document Scanner
 *
 * Full Canny Edge Detection Pipeline:
 * Grayscale → Gaussian Blur 5x5 → Sobel + Direction → Non-Max Suppression
 * → Otsu Threshold → Hysteresis → Morphological Close → Contour Tracing
 * → Douglas-Peucker → Quadrilateral Selection → Corner Ordering → Validation
 *
 * 0 externe Libraries — reines Canvas/TypeScript.
 */

export interface Point {
  x: number;
  y: number;
}

export interface DetectedEdges {
  corners: Point[];
  confidence: number;
}

// ============================================
// GRAYSCALE
// ============================================

export function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);
  const data = imageData.data;
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }
  return gray;
}

// ============================================
// GAUSSIAN BLUR 5x5 (Separable)
// ============================================

export function gaussianBlur5x5(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const k = [1, 4, 6, 4, 1];
  const kSum = 16;
  const temp = new Uint8ClampedArray(width * height);
  const output = new Uint8ClampedArray(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 2; x < width - 2; x++) {
      let sum = 0;
      for (let i = -2; i <= 2; i++) {
        sum += gray[y * width + (x + i)] * k[i + 2];
      }
      temp[y * width + x] = sum / kSum;
    }
  }

  // Vertical pass
  for (let y = 2; y < height - 2; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let i = -2; i <= 2; i++) {
        sum += temp[(y + i) * width + x] * k[i + 2];
      }
      output[y * width + x] = sum / kSum;
    }
  }
  return output;
}

// ============================================
// SOBEL WITH GRADIENT DIRECTION
// ============================================

interface SobelResult {
  magnitude: Float32Array;
  direction: Uint8ClampedArray; // Quantized: 0, 45, 90, 135
}

export function sobelWithDirection(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): SobelResult {
  const magnitude = new Float32Array(width * height);
  const direction = new Uint8ClampedArray(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y - 1) * width + (x - 1)];
      const t = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const l = gray[y * width + (x - 1)];
      const r = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const b = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;

      magnitude[y * width + x] = Math.sqrt(gx * gx + gy * gy);

      // Quantize angle to 4 directions
      let angle = Math.atan2(gy, gx) * (180 / Math.PI);
      if (angle < 0) angle += 180;

      if (angle < 22.5 || angle >= 157.5) direction[y * width + x] = 0;
      else if (angle < 67.5) direction[y * width + x] = 45;
      else if (angle < 112.5) direction[y * width + x] = 90;
      else direction[y * width + x] = 135;
    }
  }
  return { magnitude, direction };
}

// ============================================
// NON-MAXIMUM SUPPRESSION
// ============================================

export function nonMaxSuppression(
  magnitude: Float32Array,
  direction: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const output = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx];
      const dir = direction[idx];

      let n1 = 0,
        n2 = 0;
      if (dir === 0) {
        n1 = magnitude[idx - 1];
        n2 = magnitude[idx + 1];
      } else if (dir === 45) {
        n1 = magnitude[(y - 1) * width + (x + 1)];
        n2 = magnitude[(y + 1) * width + (x - 1)];
      } else if (dir === 90) {
        n1 = magnitude[(y - 1) * width + x];
        n2 = magnitude[(y + 1) * width + x];
      } else {
        n1 = magnitude[(y - 1) * width + (x - 1)];
        n2 = magnitude[(y + 1) * width + (x + 1)];
      }

      output[idx] = mag >= n1 && mag >= n2 ? mag : 0;
    }
  }
  return output;
}

// ============================================
// OTSU ADAPTIVE THRESHOLD
// ============================================

export function otsuThreshold(magnitude: Float32Array): number {
  const histogram = new Array(256).fill(0);
  let total = 0;
  for (let i = 0; i < magnitude.length; i++) {
    const v = Math.min(255, Math.round(magnitude[i]));
    if (v > 0) {
      histogram[v]++;
      total++;
    }
  }
  if (total === 0) return 50;

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0,
    wB = 0;
  let maxVariance = 0,
    threshold = 50;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

// ============================================
// HYSTERESIS THRESHOLD (Queue-based)
// ============================================

export function hysteresisThreshold(
  nms: Float32Array,
  width: number,
  height: number
): Uint8ClampedArray {
  const highThreshold = otsuThreshold(nms);
  const lowThreshold = highThreshold * 0.4;

  const STRONG = 255;
  const WEAK = 128;
  const output = new Uint8ClampedArray(width * height);

  const queue: number[] = [];

  // Classify pixels
  for (let i = 0; i < nms.length; i++) {
    if (nms[i] >= highThreshold) {
      output[i] = STRONG;
      queue.push(i);
    } else if (nms[i] >= lowThreshold) {
      output[i] = WEAK;
    }
  }

  // Queue-based flood fill: promote WEAK connected to STRONG
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const y = Math.floor(idx / width);
    const x = idx % width;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
          const ni = ny * width + nx;
          if (output[ni] === WEAK) {
            output[ni] = STRONG;
            queue.push(ni);
          }
        }
      }
    }
  }

  // Suppress remaining weak pixels
  for (let i = 0; i < output.length; i++) {
    if (output[i] !== STRONG) output[i] = 0;
  }
  return output;
}

// ============================================
// MORPHOLOGICAL CLOSE (Dilate + Erode)
// ============================================

export function morphClose(
  binary: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // Dilate (3x3)
  const dilated = new Uint8ClampedArray(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let max = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          max = Math.max(max, binary[(y + dy) * width + (x + dx)]);
        }
      }
      dilated[y * width + x] = max;
    }
  }

  // Erode (3x3)
  const eroded = new Uint8ClampedArray(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let min = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          min = Math.min(min, dilated[(y + dy) * width + (x + dx)]);
        }
      }
      eroded[y * width + x] = min;
    }
  }
  return eroded;
}

// ============================================
// CONTOUR TRACING (Moore Boundary Following)
// ============================================

interface Contour {
  points: Point[];
  length: number;
}

export function traceContours(
  binary: Uint8ClampedArray,
  width: number,
  height: number
): Contour[] {
  const visited = new Uint8ClampedArray(width * height);
  const contours: Contour[] = [];

  // 8-connected neighbor offsets (clockwise from right)
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];
  const maxSteps = width * height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (binary[idx] === 0 || visited[idx]) continue;

      // Prüfen ob dies ein Randpixel ist (hat mindestens einen 0-Nachbarn)
      let isEdge = false;
      for (let d = 0; d < 8; d++) {
        if (binary[(y + dy[d]) * width + (x + dx[d])] === 0) {
          isEdge = true;
          break;
        }
      }
      if (!isEdge) {
        visited[idx] = 1;
        continue;
      }

      // Start new contour — Moore Boundary Tracing
      const points: Point[] = [];
      let cx = x,
        cy = y;
      let dir = 0;
      let steps = 0;

      do {
        if (!visited[cy * width + cx]) {
          points.push({ x: cx, y: cy });
          visited[cy * width + cx] = 1;
        }

        // Search for next boundary pixel
        const startDir = (dir + 5) % 8; // Backtrack direction
        let found = false;

        for (let i = 0; i < 8; i++) {
          const d = (startDir + i) % 8;
          const nx = cx + dx[d];
          const ny = cy + dy[d];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height && binary[ny * width + nx] > 0) {
            cx = nx;
            cy = ny;
            dir = d;
            found = true;
            break;
          }
        }

        if (!found) break;
        steps++;
      } while ((cx !== x || cy !== y) && steps < maxSteps);

      if (points.length >= 30) {
        contours.push({ points, length: points.length });
      }
    }
  }

  // Sort by contour length (largest first)
  contours.sort((a, b) => b.length - a.length);
  return contours;
}

// ============================================
// DOUGLAS-PEUCKER POLYGON SIMPLIFICATION
// ============================================

function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const dxAB = b.x - a.x;
  const dyAB = b.y - a.y;
  const len2 = dxAB * dxAB + dyAB * dyAB;
  if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dxAB + (p.y - a.y) * dyAB) / len2));
  const projX = a.x + t * dxAB;
  const projY = a.y + t * dyAB;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

export function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToLineDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

// ============================================
// CORNER ORDERING (Clockwise from Top-Left)
// ============================================

export function orderCorners(corners: Point[]): Point[] {
  // Find centroid
  const cx = corners.reduce((s, p) => s + p.x, 0) / corners.length;
  const cy = corners.reduce((s, p) => s + p.y, 0) / corners.length;

  // Sort by angle from centroid
  const sorted = [...corners].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });

  // Rotate so top-left is first (smallest x+y sum)
  let minSum = Infinity;
  let minIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    const sum = sorted[i].x + sorted[i].y;
    if (sum < minSum) {
      minSum = sum;
      minIdx = i;
    }
  }

  return [...sorted.slice(minIdx), ...sorted.slice(0, minIdx)];
}

// ============================================
// GEOMETRIC VALIDATION
// ============================================

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function quadArea(corners: Point[]): number {
  // Shoelace formula
  let area = 0;
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    area += corners[i].x * corners[j].y;
    area -= corners[j].x * corners[i].y;
  }
  return Math.abs(area) / 2;
}

function isConvex(points: Point[]): boolean {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const c = points[(i + 2) % points.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      if (sign === 0) sign = Math.sign(cross);
      else if (Math.sign(cross) !== sign) return false;
    }
  }
  return true;
}

function angleBetween(prev: Point, curr: Point, next: Point): number {
  const v1x = prev.x - curr.x;
  const v1y = prev.y - curr.y;
  const v2x = next.x - curr.x;
  const v2y = next.y - curr.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function contourPerimeter(points: Point[]): number {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += distance(points[i], points[j]);
  }
  return perimeter;
}

export function validateQuadrilateral(
  corners: Point[],
  _width: number,
  _height: number,
  minArea: number,
  maxArea: number
): boolean {
  // 1. Check area
  const area = quadArea(corners);
  if (area < minArea || area > maxArea) return false;

  // 2. Check convexity
  if (!isConvex(corners)) return false;

  // 3. Check corner angles (45-135 degrees)
  for (let i = 0; i < 4; i++) {
    const angle = angleBetween(
      corners[(i + 3) % 4],
      corners[i],
      corners[(i + 1) % 4]
    );
    if (angle < 40 || angle > 140) return false;
  }

  // 4. Check aspect ratio (0.4 to 2.5 for document-like shapes)
  const widthTop = distance(corners[0], corners[1]);
  const widthBot = distance(corners[3], corners[2]);
  const heightLeft = distance(corners[0], corners[3]);
  const heightRight = distance(corners[1], corners[2]);
  const avgWidth = (widthTop + widthBot) / 2;
  const avgHeight = (heightLeft + heightRight) / 2;
  if (avgWidth === 0 || avgHeight === 0) return false;
  const aspect = avgWidth / avgHeight;
  if (aspect < 0.4 || aspect > 2.5) return false;

  return true;
}

// ============================================
// CONFIDENCE SCORE (Geometry-based)
// ============================================

function computeConfidence(
  corners: Point[],
  area: number,
  imageArea: number
): number {
  let conf = 0;

  // Area ratio (larger = higher confidence, max 0.3)
  const areaRatio = area / imageArea;
  conf += Math.min(0.3, areaRatio * 0.6);

  // Convexity bonus
  if (isConvex(corners)) conf += 0.2;

  // Aspect ratio closeness to A4 (1:1.414)
  const widthTop = distance(corners[0], corners[1]);
  const heightLeft = distance(corners[0], corners[3]);
  const longSide = Math.max(widthTop, heightLeft);
  const shortSide = Math.min(widthTop, heightLeft);
  if (longSide > 0) {
    const aspect = shortSide / longSide;
    const a4Aspect = 1 / 1.414;
    const aspectDiff = Math.abs(aspect - a4Aspect);
    conf += Math.max(0, 0.25 - aspectDiff * 0.5);
  }

  // Angle regularity (closer to 90 degrees = better)
  let angleScore = 0;
  for (let i = 0; i < 4; i++) {
    const angle = angleBetween(
      corners[(i + 3) % 4],
      corners[i],
      corners[(i + 1) % 4]
    );
    angleScore += 1 - Math.abs(angle - 90) / 90;
  }
  conf += (angleScore / 4) * 0.25;

  return Math.min(1, Math.max(0, conf));
}

// ============================================
// QUADRILATERAL SELECTION
// ============================================

function findBest4FromPolygon(
  simplified: Point[],
  width: number,
  height: number,
  minArea: number,
  maxArea: number
): Point[] | null {
  // Try all combinations of 4 points from the simplified polygon
  const n = simplified.length;
  if (n < 4) return null;

  let bestArea = 0;
  let bestQuad: Point[] | null = null;

  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const quad = [simplified[i], simplified[j], simplified[k], simplified[l]];
          const ordered = orderCorners(quad);
          if (validateQuadrilateral(ordered, width, height, minArea, maxArea)) {
            const area = quadArea(ordered);
            if (area > bestArea) {
              bestArea = area;
              bestQuad = ordered;
            }
          }
        }
      }
    }
  }

  return bestQuad;
}

export function findBestQuadrilateral(
  contours: Contour[],
  width: number,
  height: number
): DetectedEdges | null {
  const imageArea = width * height;
  const minArea = imageArea * 0.05;
  const maxArea = imageArea * 0.98;

  // Check top 5 largest contours
  for (const contour of contours.slice(0, 5)) {
    const perimeter = contourPerimeter(contour.points);

    // Try multiple epsilon values for Douglas-Peucker
    for (const epsilonFactor of [0.015, 0.02, 0.03, 0.05, 0.08]) {
      const epsilon = perimeter * epsilonFactor;
      const simplified = douglasPeucker(contour.points, epsilon);

      if (simplified.length === 4) {
        const ordered = orderCorners(simplified);
        if (validateQuadrilateral(ordered, width, height, minArea, maxArea)) {
          const area = quadArea(ordered);
          const confidence = computeConfidence(ordered, area, imageArea);
          return {
            corners: ordered.map((p) => ({ x: p.x / width, y: p.y / height })),
            confidence,
          };
        }
      }

      // If we got 5-8 points, try finding best 4 from them
      if (simplified.length > 4 && simplified.length <= 8) {
        const quad = findBest4FromPolygon(simplified, width, height, minArea, maxArea);
        if (quad) {
          const area = quadArea(quad);
          const confidence = computeConfidence(quad, area, imageArea);
          return {
            corners: quad.map((p) => ({ x: p.x / width, y: p.y / height })),
            confidence,
          };
        }
      }
    }
  }

  return null;
}

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Verarbeitet ein Video-Frame für Edge Detection.
 * Full Canny Pipeline + Contour-basierte Dokumenterkennung.
 */
export function detectEdgesFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  targetWidth: number = 480
): DetectedEdges | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const aspect = video.videoHeight / video.videoWidth;
  const w = targetWidth;
  const h = Math.round(targetWidth * aspect);

  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);

  // Pipeline
  const gray = toGrayscale(imageData);
  const blurred = gaussianBlur5x5(gray, w, h);
  const sobel = sobelWithDirection(blurred, w, h);
  const nms = nonMaxSuppression(sobel.magnitude, sobel.direction, w, h);
  const edges = hysteresisThreshold(nms, w, h);
  const closed = morphClose(edges, w, h);
  const contours = traceContours(closed, w, h);

  return findBestQuadrilateral(contours, w, h);
}

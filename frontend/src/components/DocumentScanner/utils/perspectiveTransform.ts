/**
 * perspectiveTransform.ts
 *
 * Client-side 4-point perspective warp using Canvas.
 * Maps a quadrilateral (detected/adjusted corners) to a rectangle.
 * Used for preview only — backend does full-quality processing.
 */

import type { Point } from "../types";

const MAX_OUTPUT_DIM = 1500; // Cap output for speed

/**
 * Load an image from a data URL or blob URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * Compute 3×3 homography matrix that maps src quad → dst rectangle.
 * Uses DLT (Direct Linear Transform) with 4 point correspondences.
 *
 * Returns flat 9-element array [h0..h8] where:
 *   x' = (h0*x + h1*y + h2) / (h6*x + h7*y + h8)
 *   y' = (h3*x + h4*y + h5) / (h6*x + h7*y + h8)
 */
function computeHomography(
  src: [number, number][],
  dst: [number, number][]
): number[] {
  // Build 8×9 matrix for DLT
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];
    A.push([-sx, -sy, -1, 0, 0, 0, dx * sx, dx * sy, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, dy * sx, dy * sy, dy]);
  }

  // Solve via Gaussian elimination (8 equations, 9 unknowns → set h8=1)
  // Rearrange: Ah = 0, with h8 = 1
  // Move last column to RHS: A'h' = -a9
  const n = 8;
  const M: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    M.push(A[i].slice(0, 8));
    b.push(-A[i][8]);
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(M[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    // Swap rows
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) {
      // Degenerate — return identity-ish
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let j = col; j < n; j++) {
        M[row][j] -= factor * M[col][j];
      }
      b[row] -= factor * b[col];
    }
  }

  // Back substitution
  const h = new Array(8).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * h[j];
    }
    h[i] = sum / M[i][i];
  }

  return [...h, 1]; // h8 = 1
}

/**
 * Euclidean distance between two 2D points.
 */
function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Apply perspective crop: warp the quadrilateral defined by `corners`
 * (normalized 0-1, order: TL, TR, BR, BL) into a rectangle.
 *
 * Returns a Blob (JPEG) of the cropped/warped image.
 */
export async function applyPerspectiveCrop(
  imageUrl: string,
  corners: Point[]
): Promise<Blob> {
  if (corners.length !== 4) throw new Error("Need exactly 4 corners");

  const img = await loadImage(imageUrl);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // Convert normalized corners to pixel coordinates
  const px: [number, number][] = corners.map((c) => [c.x * iw, c.y * ih]);

  // Output dimensions from edge lengths
  const topEdge = dist(px[0][0], px[0][1], px[1][0], px[1][1]);
  const bottomEdge = dist(px[3][0], px[3][1], px[2][0], px[2][1]);
  const leftEdge = dist(px[0][0], px[0][1], px[3][0], px[3][1]);
  const rightEdge = dist(px[1][0], px[1][1], px[2][0], px[2][1]);

  let outW = Math.round(Math.max(topEdge, bottomEdge));
  let outH = Math.round(Math.max(leftEdge, rightEdge));

  // Cap output size for performance
  const maxDim = Math.max(outW, outH);
  if (maxDim > MAX_OUTPUT_DIM) {
    const scale = MAX_OUTPUT_DIM / maxDim;
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  // Ensure minimum size
  outW = Math.max(outW, 10);
  outH = Math.max(outH, 10);

  // Destination rectangle corners: TL, TR, BR, BL
  const dst: [number, number][] = [
    [0, 0],
    [outW, 0],
    [outW, outH],
    [0, outH],
  ];

  // Compute forward homography (dst → src) so we can sample source pixels
  const H = computeHomography(dst, px);
  // No need to invert — we compute dst→src directly

  // Draw source image onto a canvas to read pixel data
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = iw;
  srcCanvas.height = ih;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Cannot create source canvas context");
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, iw, ih);
  const srcPixels = srcData.data;

  // Create output canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Cannot create output canvas context");
  const outData = outCtx.createImageData(outW, outH);
  const outPixels = outData.data;

  // For each output pixel, find the corresponding source pixel via homography
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      // Apply homography: src = H * dst
      const w = H[6] * x + H[7] * y + H[8];
      const sx = (H[0] * x + H[1] * y + H[2]) / w;
      const sy = (H[3] * x + H[4] * y + H[5]) / w;

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;

      if (x0 < 0 || y0 < 0 || x1 >= iw || y1 >= ih) {
        // Out of bounds — white
        const oi = (y * outW + x) * 4;
        outPixels[oi] = 255;
        outPixels[oi + 1] = 255;
        outPixels[oi + 2] = 255;
        outPixels[oi + 3] = 255;
        continue;
      }

      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = (y0 * iw + x0) * 4;
      const i10 = (y0 * iw + x1) * 4;
      const i01 = (y1 * iw + x0) * 4;
      const i11 = (y1 * iw + x1) * 4;

      const oi = (y * outW + x) * 4;
      outPixels[oi] = w00 * srcPixels[i00] + w10 * srcPixels[i10] + w01 * srcPixels[i01] + w11 * srcPixels[i11];
      outPixels[oi + 1] = w00 * srcPixels[i00 + 1] + w10 * srcPixels[i10 + 1] + w01 * srcPixels[i01 + 1] + w11 * srcPixels[i11 + 1];
      outPixels[oi + 2] = w00 * srcPixels[i00 + 2] + w10 * srcPixels[i10 + 2] + w01 * srcPixels[i01 + 2] + w11 * srcPixels[i11 + 2];
      outPixels[oi + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);

  // Clean up source canvas
  srcCanvas.width = 0;
  srcCanvas.height = 0;

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => {
        outCanvas.width = 0;
        outCanvas.height = 0;
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      },
      "image/jpeg",
      0.85
    );
  });
}

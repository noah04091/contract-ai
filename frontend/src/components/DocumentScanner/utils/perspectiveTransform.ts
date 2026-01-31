/**
 * perspectiveTransform.ts
 *
 * Client-side 4-point perspective warp using Canvas.
 * Maps a quadrilateral (detected/adjusted corners) to a rectangle.
 * Used for preview only — backend does full-quality processing.
 *
 * Approach: Uses canvas drawImage with triangulation to avoid
 * mobile canvas pixel limits (iOS ~16MP). Source image is
 * downscaled to a safe size before processing.
 */

import type { Point } from "../types";

/** Max source dimension to avoid exceeding mobile canvas limits */
const MAX_SRC_DIM = 2048;
/** Max output dimension for preview */
const MAX_OUTPUT_DIM = 1200;

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
 * Compute 3×3 homography matrix that maps src quad → dst quad.
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
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];
    A.push([-sx, -sy, -1, 0, 0, 0, dx * sx, dx * sy, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, dy * sx, dy * sy, dy]);
  }

  const n = 8;
  const M: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    M.push(A[i].slice(0, 8));
    b.push(-A[i][8]);
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(M[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) {
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let j = col; j < n; j++) {
        M[row][j] -= factor * M[col][j];
      }
      b[row] -= factor * b[col];
    }
  }

  const h = new Array(8).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * h[j];
    }
    h[i] = sum / M[i][i];
  }

  return [...h, 1];
}

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
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  if (origW === 0 || origH === 0) throw new Error("Image has zero dimensions");

  // Step 1: Downscale source image to stay within mobile canvas limits
  let srcW = origW;
  let srcH = origH;
  const srcMaxDim = Math.max(srcW, srcH);
  let srcScale = 1;
  if (srcMaxDim > MAX_SRC_DIM) {
    srcScale = MAX_SRC_DIM / srcMaxDim;
    srcW = Math.round(origW * srcScale);
    srcH = Math.round(origH * srcScale);
  }

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Cannot create source canvas context");
  srcCtx.drawImage(img, 0, 0, srcW, srcH);

  let srcPixels: Uint8ClampedArray;
  try {
    srcPixels = srcCtx.getImageData(0, 0, srcW, srcH).data;
  } catch {
    // Canvas tainted or OOM — clean up and throw
    srcCanvas.width = 0;
    srcCanvas.height = 0;
    throw new Error("Cannot read source image data");
  }

  // Step 2: Convert normalized corners to downscaled pixel coords
  const px: [number, number][] = corners.map((c) => [
    c.x * srcW,
    c.y * srcH,
  ]);

  // Step 3: Compute output dimensions from edge lengths
  const topEdge = dist(px[0][0], px[0][1], px[1][0], px[1][1]);
  const bottomEdge = dist(px[3][0], px[3][1], px[2][0], px[2][1]);
  const leftEdge = dist(px[0][0], px[0][1], px[3][0], px[3][1]);
  const rightEdge = dist(px[1][0], px[1][1], px[2][0], px[2][1]);

  let outW = Math.round(Math.max(topEdge, bottomEdge));
  let outH = Math.round(Math.max(leftEdge, rightEdge));

  // Cap output size
  const outMaxDim = Math.max(outW, outH);
  if (outMaxDim > MAX_OUTPUT_DIM) {
    const scale = MAX_OUTPUT_DIM / outMaxDim;
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }
  outW = Math.max(outW, 10);
  outH = Math.max(outH, 10);

  // Step 4: Compute homography (output rect → source pixels)
  const dstRect: [number, number][] = [
    [0, 0],
    [outW - 1, 0],
    [outW - 1, outH - 1],
    [0, outH - 1],
  ];
  const H = computeHomography(dstRect, px);

  // Step 5: Warp — for each output pixel, sample source via homography
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Cannot create output canvas context");
  const outData = outCtx.createImageData(outW, outH);
  const outPixels = outData.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w = H[6] * x + H[7] * y + H[8];
      if (Math.abs(w) < 1e-10) continue; // degenerate
      const sx = (H[0] * x + H[1] * y + H[2]) / w;
      const sy = (H[3] * x + H[4] * y + H[5]) / w;

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);

      if (x0 < 0 || y0 < 0 || x0 + 1 >= srcW || y0 + 1 >= srcH) {
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

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x0 + 1) * 4;
      const i01 = ((y0 + 1) * srcW + x0) * 4;
      const i11 = ((y0 + 1) * srcW + x0 + 1) * 4;

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

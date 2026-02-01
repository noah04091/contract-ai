/**
 * perspectiveTransform.ts
 *
 * Client-side 4-point perspective correction via Canvas.
 * Uses DLT (Direct Linear Transform) to compute a 3x3 homography matrix,
 * then warps the source image onto a rectangular output via inverse mapping
 * with bilinear interpolation.
 *
 * No external dependencies.
 */

import type { Point } from "../types";

/** Max output dimension for preview (keeps warp fast, ~100-300ms) */
const MAX_OUTPUT_DIM = 1500;

/**
 * Load an image from a URL (data: or blob:) into an HTMLImageElement.
 * Note: crossOrigin must NOT be set for data: URLs — Safari taints the canvas otherwise.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    // Only set crossOrigin for http(s) URLs, NEVER for data: or blob: URLs
    if (url.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.src = url;
  });
}

/**
 * Euclidean distance between two points.
 */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute 3x3 homography matrix H such that H * srcPt = dstPt (in homogeneous coords).
 * Uses DLT with 4 point correspondences.
 *
 * srcPts and dstPts are arrays of 4 {x, y} points (pixel coordinates).
 * Returns H as a flat Float64Array[9] in row-major order.
 */
function computeHomography(
  srcPts: { x: number; y: number }[],
  dstPts: { x: number; y: number }[]
): Float64Array {
  // Build 8x9 matrix A for DLT
  // For each correspondence (x,y) -> (x',y'):
  //   [-x, -y, -1,  0,  0,  0, x*x', y*x', x']
  //   [ 0,  0,  0, -x, -y, -1, x*y', y*y', y']
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const sx = srcPts[i].x;
    const sy = srcPts[i].y;
    const dx = dstPts[i].x;
    const dy = dstPts[i].y;
    A.push([-sx, -sy, -1, 0, 0, 0, sx * dx, sy * dx, dx]);
    A.push([0, 0, 0, -sx, -sy, -1, sx * dy, sy * dy, dy]);
  }

  // Solve Ah = 0 via Gaussian elimination on the 8x9 augmented system
  // We set h9 = 1 and solve the 8x8 system
  const n = 8;
  const m = 9;

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(A[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(A[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    if (maxVal < 1e-10) {
      // Degenerate — return identity
      return new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }
    // Swap rows
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
    }
    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = A[row][col] / A[col][col];
      for (let j = col; j < m; j++) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  // Back substitution: solve for h[0..7] with h[8] = 1
  // Rearrange: sum(A[row][j] * h[j], j=0..7) + A[row][8] * 1 = 0
  // => sum(A[row][j] * h[j], j=0..7) = -A[row][8]
  const h = new Float64Array(9);
  h[8] = 1;

  for (let row = n - 1; row >= 0; row--) {
    let sum = -A[row][8]; // RHS = -A[row][8] * h[8] = -A[row][8]
    for (let j = row + 1; j < n; j++) {
      sum -= A[row][j] * h[j];
    }
    h[row] = sum / A[row][row];
  }

  return h;
}

/**
 * Apply perspective correction to an image.
 *
 * @param imageUrl  Data URL or Blob URL of the original photo
 * @param corners   [TL, TR, BR, BL] normalized 0-1
 * @returns         Blob of the warped/cropped JPEG
 */
export async function applyPerspectiveCrop(
  imageUrl: string,
  corners: Point[]
): Promise<Blob> {
  if (corners.length !== 4) throw new Error("Need exactly 4 corners");

  const img = await loadImage(imageUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Convert normalized corners to pixel coordinates
  const srcPts = corners.map((c) => ({
    x: c.x * srcW,
    y: c.y * srcH,
  }));

  // [TL, TR, BR, BL]
  const topEdge = dist(srcPts[0], srcPts[1]);
  const bottomEdge = dist(srcPts[3], srcPts[2]);
  const leftEdge = dist(srcPts[0], srcPts[3]);
  const rightEdge = dist(srcPts[1], srcPts[2]);

  let outW = Math.round(Math.max(topEdge, bottomEdge));
  let outH = Math.round(Math.max(leftEdge, rightEdge));

  // Cap output dimensions for performance
  if (outW > MAX_OUTPUT_DIM || outH > MAX_OUTPUT_DIM) {
    const scale = MAX_OUTPUT_DIM / Math.max(outW, outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  // Ensure minimum dimensions
  outW = Math.max(outW, 10);
  outH = Math.max(outH, 10);

  // Destination rectangle corners
  const dstPts = [
    { x: 0, y: 0 },           // TL
    { x: outW - 1, y: 0 },    // TR
    { x: outW - 1, y: outH - 1 }, // BR
    { x: 0, y: outH - 1 },    // BL
  ];

  // Compute homography: dst -> src (inverse mapping)
  const H = computeHomography(dstPts, srcPts);
  // No need to invert — we computed dst->src directly

  // Draw source image onto a canvas to get pixel data
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Failed to get source canvas context");
  srcCtx.drawImage(img, 0, 0);

  let srcData: ImageData;
  try {
    srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  } catch (e) {
    throw new Error("getImageData failed (canvas tainted or security error): " + (e instanceof Error ? e.message : e));
  }
  const srcPixels = srcData.data;

  // Create output canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("Failed to get output canvas context");
  const outImgData = outCtx.createImageData(outW, outH);
  const outPixels = outImgData.data;

  // For each output pixel, find source pixel via homography + bilinear interpolation
  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      // Apply homography: [sx, sy, sw] = H * [dx, dy, 1]
      const sw = H[6] * dx + H[7] * dy + H[8];
      if (Math.abs(sw) < 1e-10) continue;

      const sx = (H[0] * dx + H[1] * dy + H[2]) / sw;
      const sy = (H[3] * dx + H[4] * dy + H[5]) / sw;

      // Bounds check
      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) continue;

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = idx00 + 4;
      const idx01 = idx00 + srcW * 4;
      const idx11 = idx01 + 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const outIdx = (dy * outW + dx) * 4;
      outPixels[outIdx] = srcPixels[idx00] * w00 + srcPixels[idx10] * w10 + srcPixels[idx01] * w01 + srcPixels[idx11] * w11;
      outPixels[outIdx + 1] = srcPixels[idx00 + 1] * w00 + srcPixels[idx10 + 1] * w10 + srcPixels[idx01 + 1] * w01 + srcPixels[idx11 + 1] * w11;
      outPixels[outIdx + 2] = srcPixels[idx00 + 2] * w00 + srcPixels[idx10 + 2] * w10 + srcPixels[idx01 + 2] * w01 + srcPixels[idx11 + 2] * w11;
      outPixels[outIdx + 3] = 255;
    }
  }

  outCtx.putImageData(outImgData, 0, 0);

  // Convert to Blob
  return new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          // Fallback via toDataURL
          try {
            const dataUrl = outCanvas.toDataURL("image/jpeg", 0.9);
            const binary = atob(dataUrl.split(",")[1]);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const fallback = new Blob([bytes], { type: "image/jpeg" });
            if (fallback.size > 0) {
              resolve(fallback);
            } else {
              reject(new Error("Failed to create output blob"));
            }
          } catch {
            reject(new Error("Failed to create output blob"));
          }
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

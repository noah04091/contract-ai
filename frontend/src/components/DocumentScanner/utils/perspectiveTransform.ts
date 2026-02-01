/**
 * perspectiveTransform.ts
 *
 * Client-side 4-point perspective correction via Canvas.
 *
 * Uses a mesh warp approach: subdivide the source quadrilateral into a grid,
 * and for each cell use an affine transform via ctx.setTransform() + ctx.drawImage().
 *
 * This approach is:
 * - Hardware-accelerated (uses browser's built-in image rendering)
 * - Compatible with ALL browsers including iOS Safari
 * - Does NOT use getImageData (no canvas tainting / security issues)
 * - Fast (~50-150ms)
 *
 * No external dependencies.
 */

import type { Point } from "../types";

/** Max output dimension for preview */
const MAX_OUTPUT_DIM = 1500;

/** Grid subdivision for mesh warp (higher = more accurate perspective approximation) */
const GRID_SIZE = 24;

/**
 * Load an image from a URL (data: or blob:) into an HTMLImageElement.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed for URL type: " + url.substring(0, 30)));
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
 * Bilinear interpolation on a quadrilateral.
 * Given 4 corners [TL, TR, BR, BL] and parameters (u, v) in [0,1],
 * returns the interpolated point.
 */
function bilinearInterp(
  corners: { x: number; y: number }[],
  u: number,
  v: number
): { x: number; y: number } {
  const [tl, tr, br, bl] = corners;
  return {
    x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x,
    y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y,
  };
}

/**
 * Mesh warp: render a perspective-corrected image using grid subdivision
 * and affine transforms per cell.
 *
 * For each grid cell:
 * 1. Compute source corners via bilinear interpolation on the source quadrilateral
 * 2. Compute affine transform that maps source image coords → output canvas coords
 * 3. Clip to the cell, apply transform, drawImage
 *
 * This uses only ctx.setTransform + ctx.drawImage (no getImageData).
 */
function meshWarp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  srcCorners: { x: number; y: number }[],
  outW: number,
  outH: number,
  gridSize: number = GRID_SIZE
): void {
  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const u0 = i / gridSize;
      const u1 = (i + 1) / gridSize;
      const v0 = j / gridSize;
      const v1 = (j + 1) / gridSize;

      // Destination cell corners (output canvas coordinates)
      const dx0 = u0 * outW;
      const dx1 = u1 * outW;
      const dy0 = v0 * outH;
      const dy1 = v1 * outH;
      const ddx = dx1 - dx0;
      const ddy = dy1 - dy0;

      if (ddx < 0.75 || ddy < 0.75) continue;

      // Source cell corners (image pixel coordinates) via bilinear interpolation
      const s00 = bilinearInterp(srcCorners, u0, v0); // TL of cell
      const s10 = bilinearInterp(srcCorners, u1, v0); // TR of cell
      const s01 = bilinearInterp(srcCorners, u0, v1); // BL of cell

      // Source edge vectors
      const ex = s10.x - s00.x;
      const ey = s10.y - s00.y;
      const fx = s01.x - s00.x;
      const fy = s01.y - s00.y;

      // Determinant of source edge matrix
      const det = ex * fy - ey * fx;
      if (Math.abs(det) < 0.01) continue;

      // Affine transform: maps source image pixel coords → output canvas coords
      // We need: for image pixel (px, py), canvas position is:
      //   canvasX = a*px + c*py + e
      //   canvasY = b*px + d*py + f
      //
      // Constraints (3 point correspondences):
      //   s00 → (dx0, dy0)
      //   s10 → (dx1, dy0)
      //   s01 → (dx0, dy1)
      const a = ddx * fy / det;
      const c = -ddx * fx / det;
      const b = -ddy * ey / det;
      const d = ddy * ex / det;
      const e = dx0 - a * s00.x - c * s00.y;
      const f = dy0 - b * s00.x - d * s00.y;

      ctx.save();
      // Clip to this cell (with tiny overlap to avoid seam artifacts)
      ctx.beginPath();
      ctx.rect(dx0 - 0.75, dy0 - 0.75, ddx + 1.5, ddy + 1.5);
      ctx.clip();
      // Apply the affine transform and draw the entire source image
      ctx.setTransform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * Simple bounding-box crop fallback.
 * If mesh warp fails, at least crop to the document area.
 */
function simpleCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  srcCorners: { x: number; y: number }[],
  outW: number,
  outH: number
): void {
  const xs = srcCorners.map((c) => c.x);
  const ys = srcCorners.map((c) => c.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = Math.min(img.naturalWidth, Math.ceil(Math.max(...xs)));
  const maxY = Math.min(img.naturalHeight, Math.ceil(Math.max(...ys)));
  const cropW = maxX - minX;
  const cropH = maxY - minY;

  if (cropW > 0 && cropH > 0) {
    ctx.drawImage(img, minX, minY, cropW, cropH, 0, 0, outW, outH);
  }
}

/**
 * Convert canvas to Blob with fallback for iOS Safari.
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.9): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    // Try toBlob first (standard)
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
            return;
          }
          // Fallback: toDataURL → manual Blob
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            const binary = atob(dataUrl.split(",")[1]);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const fallback = new Blob([bytes], { type: "image/jpeg" });
            if (fallback.size > 0) {
              resolve(fallback);
            } else {
              reject(new Error("toBlob and toDataURL both produced empty output"));
            }
          } catch (e) {
            reject(new Error("toDataURL fallback failed: " + (e instanceof Error ? e.message : e)));
          }
        },
        "image/jpeg",
        quality
      );
    } catch (e) {
      // toBlob threw (shouldn't happen but be safe)
      reject(new Error("toBlob threw: " + (e instanceof Error ? e.message : e)));
    }
  });
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

  if (srcW === 0 || srcH === 0) {
    throw new Error(`Image has zero dimensions: ${srcW}x${srcH}`);
  }

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

  // Create output canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) {
    throw new Error("Failed to get output canvas 2d context");
  }

  // White background (prevents transparent areas from appearing black)
  outCtx.fillStyle = "#ffffff";
  outCtx.fillRect(0, 0, outW, outH);

  // Try mesh warp first (perspective correction), fall back to simple crop
  try {
    meshWarp(outCtx, img, srcPts, outW, outH);
  } catch (warpErr) {
    console.warn("[Scanner] Mesh warp failed, falling back to simple crop:", warpErr);
    outCtx.fillRect(0, 0, outW, outH); // Clear
    simpleCrop(outCtx, img, srcPts, outW, outH);
  }

  return canvasToBlob(outCanvas, 0.85);
}

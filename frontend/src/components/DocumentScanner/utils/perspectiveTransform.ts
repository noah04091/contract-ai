/**
 * perspectiveTransform.ts
 *
 * Client-side document crop for preview.
 * Crops the image to the bounding box of the 4 corner points.
 * Uses canvas drawImage (GPU-accelerated, no pixel manipulation).
 *
 * This matches the backend behavior (Sharp .extract() bounding box crop).
 * Used for preview only — backend does full-quality processing.
 */

import type { Point } from "../types";

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
 * Crop the image to the bounding box of the 4 corners.
 * Corners are normalized 0-1, order: TL, TR, BR, BL.
 *
 * Returns a Blob (JPEG) of the cropped image.
 */
export async function applyPerspectiveCrop(
  imageUrl: string,
  corners: Point[]
): Promise<Blob> {
  if (corners.length !== 4) throw new Error("Need exactly 4 corners");

  const img = await loadImage(imageUrl);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  if (iw === 0 || ih === 0) throw new Error("Image has zero dimensions");

  // Bounding box of the 4 corners (same logic as backend scannerService.js)
  const xs = corners.map((c) => c.x * iw);
  const ys = corners.map((c) => c.y * ih);

  const left = Math.max(0, Math.floor(Math.min(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys)));
  const right = Math.min(iw, Math.ceil(Math.max(...xs)));
  const bottom = Math.min(ih, Math.ceil(Math.max(...ys)));

  const cropW = right - left;
  const cropH = bottom - top;

  if (cropW < 10 || cropH < 10) throw new Error("Crop area too small");

  // Scale output to reasonable preview size
  let outW = cropW;
  let outH = cropH;
  const maxDim = Math.max(outW, outH);
  if (maxDim > MAX_OUTPUT_DIM) {
    const scale = MAX_OUTPUT_DIM / maxDim;
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  // Simple canvas crop via drawImage (GPU-accelerated, works on all browsers)
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create canvas context");

  // drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
  ctx.drawImage(img, left, top, cropW, cropH, 0, 0, outW, outH);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Clean up
        canvas.width = 0;
        canvas.height = 0;
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob produced empty result"));
        }
      },
      "image/jpeg",
      0.85
    );
  });
}

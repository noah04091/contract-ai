// 📐 fieldCoords.ts - Normalized Field Coordinate Utilities
// Converts between pixel coordinates (render-specific) and normalized coordinates (document-specific)

/**
 * Normalized field coordinates (0-1 range, relative to page dimensions)
 * These are independent of rendering scale/zoom and remain stable across different viewports
 */
export interface FieldDocCoords {
  page: number;

  // Normalized coordinates (0..1 range)
  nx: number;      // x / pageWidth
  ny: number;      // y / pageHeight
  nwidth: number;  // width / pageWidth
  nheight: number; // height / pageHeight

  // Optional: page rotation at time of placement
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * Pixel-based field coordinates (render-specific, depends on zoom/viewport)
 */
export interface FieldPixelCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert pixel coordinates to normalized coordinates (0-1 range)
 * Use this when saving field positions to the database
 *
 * @param xPx - X position in pixels (in rendered space)
 * @param yPx - Y position in pixels (in rendered space)
 * @param wPx - Width in pixels (in rendered space)
 * @param hPx - Height in pixels (in rendered space)
 * @param renderedWidth - Actual rendered page width in pixels
 * @param renderedHeight - Actual rendered page height in pixels
 * @returns Normalized coordinates (0-1 range)
 */
export function toNormalized(
  xPx: number,
  yPx: number,
  wPx: number,
  hPx: number,
  renderedWidth: number,
  renderedHeight: number
): Pick<FieldDocCoords, "nx" | "ny" | "nwidth" | "nheight"> {
  // Safety check: prevent division by zero
  if (renderedWidth <= 0 || renderedHeight <= 0) {
    console.error('❌ Invalid PDF dimensions for normalization:', { renderedWidth, renderedHeight });
    return { nx: 0, ny: 0, nwidth: 0, nheight: 0 };
  }

  // Calculate normalized values
  let nx = xPx / renderedWidth;
  let ny = yPx / renderedHeight;
  let nwidth = wPx / renderedWidth;
  let nheight = hPx / renderedHeight;

  // Clamp values to valid range [0, 1]
  nx = Math.max(0, Math.min(1, nx));
  ny = Math.max(0, Math.min(1, ny));
  nwidth = Math.max(0, Math.min(1, nwidth));
  nheight = Math.max(0, Math.min(1, nheight));

  // Warning if field was outside bounds
  if (xPx < 0 || yPx < 0 || xPx + wPx > renderedWidth || yPx + hPx > renderedHeight) {
    console.warn('⚠️ Field placed outside PDF bounds, clamped to valid range:', {
      original: { x: xPx, y: yPx, w: wPx, h: hPx },
      pageDims: { width: renderedWidth, height: renderedHeight },
      normalized: { nx, ny, nwidth, nheight }
    });
  }

  return { nx, ny, nwidth, nheight };
}

/**
 * Convert normalized coordinates back to pixel coordinates
 * Use this when rendering field overlays on the page
 *
 * @param coords - Normalized field coordinates
 * @param renderedWidth - Actual rendered page width in pixels
 * @param renderedHeight - Actual rendered page height in pixels
 * @returns Pixel coordinates for rendering
 */
export function fromNormalized(
  coords: FieldDocCoords,
  renderedWidth: number,
  renderedHeight: number
): FieldPixelCoords {
  return {
    x: coords.nx * renderedWidth,
    y: coords.ny * renderedHeight,
    width: coords.nwidth * renderedWidth,
    height: coords.nheight * renderedHeight,
  };
}

/**
 * Validate normalized coordinates are in valid range (0-1)
 *
 * @param coords - Normalized coordinates to validate
 * @returns true if all coordinates are in valid range
 */
export function isValidNormalized(coords: Pick<FieldDocCoords, "nx" | "ny" | "nwidth" | "nheight">): boolean {
  const { nx, ny, nwidth, nheight } = coords;

  // Check all values are numbers
  if (typeof nx !== 'number' || typeof ny !== 'number' ||
      typeof nwidth !== 'number' || typeof nheight !== 'number') {
    return false;
  }

  // Check all values are in valid range (0-1)
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
    return false;
  }

  if (nwidth < 0 || nwidth > 1 || nheight < 0 || nheight > 1) {
    return false;
  }

  // Check field doesn't exceed page bounds
  if (nx + nwidth > 1 || ny + nheight > 1) {
    return false;
  }

  return true;
}

/**
 * Legacy support: Convert old pixel-based fields to normalized coordinates
 * Use this for migration if fields were previously stored in pixels
 *
 * @param field - Legacy field with pixel coordinates
 * @param pageWidth - Original page width (from PDF metadata)
 * @param pageHeight - Original page height (from PDF metadata)
 * @returns Field with normalized coordinates
 */
export function migratePixelFieldToNormalized(
  field: { x: number; y: number; width: number; height: number; page: number },
  pageWidth: number,
  pageHeight: number
): FieldDocCoords {
  const normalized = toNormalized(
    field.x,
    field.y,
    field.width,
    field.height,
    pageWidth,
    pageHeight
  );

  return {
    page: field.page,
    ...normalized,
    rotation: 0, // Assume no rotation for legacy fields
  };
}

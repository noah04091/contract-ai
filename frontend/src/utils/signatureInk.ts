// 🖊️ signatureInk.ts - Detect if signature canvas has actual ink
// Prevents submitting blank/empty signatures

/**
 * Check if a signature data URL contains actual drawn content
 * @param dataUrl - Base64 PNG data URL from canvas
 * @param threshold - Minimum ratio for considering it "drawn" (default: 0.002)
 * @returns true if signature has visible ink
 */
export function signatureHasInk(dataUrl: string, threshold = 0.002): boolean {
  // Simple heuristic: Base64 data length as proxy for drawn content
  // Blank/minimal PNGs are < 200 bytes, drawn signatures are typically 10KB+
  const base64Data = dataUrl.split(",")[1] || "";

  // Calculate ratio: longer base64 = more pixel data = actual drawing
  const ratio = base64Data.length / 100000;

  return ratio > threshold;
}

/**
 * More sophisticated check using pixel sampling (optional enhancement)
 * Requires canvas API to decode and analyze pixels
 */
export function signatureHasInkAdvanced(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Count non-transparent pixels
      let drawnPixels = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 10) { // Alpha > 10
          drawnPixels++;
        }
      }

      // At least 0.5% of pixels should be drawn
      const totalPixels = canvas.width * canvas.height;
      const threshold = 0.005;

      resolve(drawnPixels / totalPixels > threshold);
    };

    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

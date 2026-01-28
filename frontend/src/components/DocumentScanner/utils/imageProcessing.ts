/**
 * Client-side Image Processing Utilities
 * Canvas-basierte Edge Detection für Live-Vorschau
 */

export interface Point {
  x: number;
  y: number;
}

export interface DetectedEdges {
  corners: Point[];
  confidence: number;
}

/**
 * Konvertiert ein Video-Frame zu Grayscale ImageData
 */
export function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(imageData.width * imageData.height);
  const data = imageData.data;
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }
  return gray;
}

/**
 * Gaussian Blur (3x3 Kernel)
 */
export function gaussianBlur(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;
  const output = new Uint8ClampedArray(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += gray[(y + ky) * width + (x + kx)] * kernel[ki++];
        }
      }
      output[y * width + x] = sum / kernelSum;
    }
  }
  return output;
}

/**
 * Sobel Edge Detection → Gradient Magnitude
 */
export function sobelEdges(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(width * height);

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

      edges[y * width + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return edges;
}

/**
 * Findet das größte Quadrilateral (Dokumentkanten) in einem Edge-Bild
 * Vereinfachter Algorithmus: Findet Konturen → größtes 4-Eck
 */
export function findDocumentCorners(
  edges: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 50
): DetectedEdges | null {
  // Thresholded Edges
  const binary = new Uint8ClampedArray(width * height);
  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i] > threshold ? 255 : 0;
  }

  // Hough-Line Detection vereinfacht:
  // Suche die äußersten Edge-Pixel in jeder Ecken-Region
  const marginX = width * 0.05;
  const marginY = height * 0.05;

  const regions = {
    topLeft: { x: 0, y: 0, w: width * 0.4, h: height * 0.4 },
    topRight: { x: width * 0.6, y: 0, w: width * 0.4, h: height * 0.4 },
    bottomLeft: { x: 0, y: height * 0.6, w: width * 0.4, h: height * 0.4 },
    bottomRight: { x: width * 0.6, y: height * 0.6, w: width * 0.4, h: height * 0.4 },
  };

  const corners: Point[] = [];
  let totalEdgePixels = 0;

  for (const [name, region] of Object.entries(regions)) {
    let bestX = -1;
    let bestY = -1;
    let bestScore = -1;

    const startX = Math.floor(region.x);
    const startY = Math.floor(region.y);
    const endX = Math.min(width, Math.floor(region.x + region.w));
    const endY = Math.min(height, Math.floor(region.y + region.h));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (binary[y * width + x] > 0) {
          totalEdgePixels++;
          // Score: Ecken-Pixel die nahe am erwarteten Eckpunkt liegen
          let score = 0;
          if (name === "topLeft") {
            score = (endX - x) + (endY - y);
          } else if (name === "topRight") {
            score = (x - startX) + (endY - y);
          } else if (name === "bottomLeft") {
            score = (endX - x) + (y - startY);
          } else {
            score = (x - startX) + (y - startY);
          }

          if (score > bestScore) {
            bestScore = score;
            bestX = x;
            bestY = y;
          }
        }
      }
    }

    if (bestX >= 0) {
      corners.push({
        x: Math.max(marginX, Math.min(width - marginX, bestX)) / width,
        y: Math.max(marginY, Math.min(height - marginY, bestY)) / height,
      });
    }
  }

  if (corners.length !== 4) return null;

  // Confidence basierend auf Edge-Pixel-Dichte
  const totalPixels = width * height;
  const edgeDensity = totalEdgePixels / totalPixels;
  const confidence = Math.min(1, edgeDensity * 20); // Normalisiert

  // Mindest-Confidence
  if (confidence < 0.1) return null;

  return { corners, confidence };
}

/**
 * Verarbeitet ein Video-Frame für Edge Detection
 * Runs auf einem Offscreen Canvas bei reduzierter Auflösung
 */
export function detectEdgesFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  targetWidth: number = 640
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

  const gray = toGrayscale(imageData);
  const blurred = gaussianBlur(gray, w, h);
  const edges = sobelEdges(blurred, w, h);

  return findDocumentCorners(edges, w, h);
}

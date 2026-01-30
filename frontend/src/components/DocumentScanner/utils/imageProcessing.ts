/**
 * Document Edge Detection — OpenCV.js
 *
 * Nutzt OpenCV.js für stabile Kantenerkennung:
 * Grayscale → GaussianBlur → Canny → Dilate → findContours → approxPolyDP
 *
 * Ersetzt die vorherige Custom-Canny-Pipeline.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CV = any;

export interface Point {
  x: number;
  y: number;
}

export interface DetectedEdges {
  corners: Point[];
  confidence: number;
}

/**
 * Ordnet 4 Eckpunkte clockwise: TL, TR, BR, BL
 */
function orderCorners(pts: Point[]): Point[] {
  // Sum: smallest = TL, largest = BR
  // Diff (y-x): smallest = TR, largest = BL
  const sorted = [...pts];
  const sums = sorted.map((p) => p.x + p.y);
  const diffs = sorted.map((p) => p.y - p.x);

  const tl = sorted[sums.indexOf(Math.min(...sums))];
  const br = sorted[sums.indexOf(Math.max(...sums))];
  const tr = sorted[diffs.indexOf(Math.min(...diffs))];
  const bl = sorted[diffs.indexOf(Math.max(...diffs))];

  return [tl, tr, br, bl];
}

/**
 * Prüft ob ein Viereck geometrisch gültig ist.
 */
function isValidQuad(corners: Point[], imgArea: number): boolean {
  if (corners.length !== 4) return false;

  // Fläche berechnen (Shoelace)
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += corners[i].x * corners[j].y;
    area -= corners[j].x * corners[i].y;
  }
  area = Math.abs(area) / 2;

  // Fläche muss 5-95% des Bildes sein
  const areaRatio = area / imgArea;
  if (areaRatio < 0.05 || areaRatio > 0.95) return false;

  // Konvexitätsprüfung
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const c = corners[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross >= 0) return false; // Muss strikt negativ sein (clockwise)
  }

  // Winkelprüfung: Alle Winkel zwischen 40° und 140°
  for (let i = 0; i < 4; i++) {
    const a = corners[(i + 3) % 4];
    const b = corners[i];
    const c = corners[(i + 1) % 4];
    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = ba.x * bc.x + ba.y * bc.y;
    const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    if (magBA === 0 || magBC === 0) return false;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))) * (180 / Math.PI);
    if (angle < 40 || angle > 140) return false;
  }

  return true;
}

/**
 * Berechnet Confidence basierend auf Geometrie.
 */
function computeConfidence(corners: Point[], imgArea: number): number {
  // Fläche
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += corners[i].x * corners[j].y;
    area -= corners[j].x * corners[i].y;
  }
  area = Math.abs(area) / 2;
  const areaScore = Math.min(area / imgArea / 0.5, 1.0);

  // Kantenlängen-Regularität
  const edgeLengths: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const dx = corners[j].x - corners[i].x;
    const dy = corners[j].y - corners[i].y;
    edgeLengths.push(Math.sqrt(dx * dx + dy * dy));
  }
  // Gegenüberliegende Kanten vergleichen
  const ratio1 = Math.min(edgeLengths[0], edgeLengths[2]) / Math.max(edgeLengths[0], edgeLengths[2]);
  const ratio2 = Math.min(edgeLengths[1], edgeLengths[3]) / Math.max(edgeLengths[1], edgeLengths[3]);
  const regularityScore = (ratio1 + ratio2) / 2;

  return areaScore * 0.4 + regularityScore * 0.6;
}

/**
 * Erkennt Dokumentkanten in einem Video-Frame mit OpenCV.js.
 *
 * @param video - HTMLVideoElement mit aktivem Kamera-Stream
 * @param cv - OpenCV.js Modul
 * @param processingCanvas - Offscreen Canvas für Video-Frame-Extraktion
 * @param targetWidth - Verarbeitungsauflösung (Default: 480px)
 * @returns DetectedEdges oder null wenn kein Dokument erkannt
 */
export function detectEdgesFromVideo(
  video: HTMLVideoElement,
  cv: CV,
  processingCanvas: HTMLCanvasElement,
  targetWidth: number = 480
): DetectedEdges | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  // Video Frame auf Canvas zeichnen (resize für Performance)
  const scale = targetWidth / video.videoWidth;
  const targetHeight = Math.round(video.videoHeight * scale);
  processingCanvas.width = targetWidth;
  processingCanvas.height = targetHeight;

  const ctx = processingCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  // OpenCV Mats — ALLE müssen am Ende deleted werden!
  const mats: CV[] = [];

  try {
    const src = cv.matFromImageData(imageData);
    mats.push(src);

    // Grayscale
    const gray = new cv.Mat();
    mats.push(gray);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Gaussian Blur (11x11 für bessere Rauschunterdrückung)
    const blurred = new cv.Mat();
    mats.push(blurred);
    cv.GaussianBlur(gray, blurred, new cv.Size(11, 11), 0);

    // Canny Edge Detection
    const edges = new cv.Mat();
    mats.push(edges);
    cv.Canny(blurred, edges, 50, 150);

    // Dilate um Kantenlücken zu schließen
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    mats.push(kernel);
    const dilated = new cv.Mat();
    mats.push(dilated);
    cv.dilate(edges, dilated, kernel);

    // Konturen finden
    const contours = new cv.MatVector();
    mats.push(contours);
    const hierarchy = new cv.Mat();
    mats.push(hierarchy);
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Konturen nach Fläche sortieren (größte zuerst)
    const contourData: { index: number; area: number }[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i));
      contourData.push({ index: i, area });
    }
    contourData.sort((a, b) => b.area - a.area);

    const imgArea = targetWidth * targetHeight;
    const minArea = imgArea * 0.05;

    // Top-10 Konturen durchgehen
    for (const { index, area } of contourData.slice(0, 10)) {
      if (area < minArea) break;

      const contour = contours.get(index);
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      mats.push(approx);
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        // 4 Eckpunkte gefunden!
        const pts: Point[] = [];
        for (let j = 0; j < 4; j++) {
          pts.push({
            x: approx.data32S[j * 2],
            y: approx.data32S[j * 2 + 1],
          });
        }

        const ordered = orderCorners(pts);

        if (isValidQuad(ordered, imgArea)) {
          // Normalisierte Koordinaten (0..1)
          const normalizedCorners = ordered.map((p) => ({
            x: p.x / targetWidth,
            y: p.y / targetHeight,
          }));

          const confidence = computeConfidence(ordered, imgArea);

          return { corners: normalizedCorners, confidence };
        }
      }
    }

    return null;
  } catch (err) {
    console.warn("[Scanner] Edge detection error:", err);
    return null;
  } finally {
    // KRITISCH: Alle OpenCV Mats freigeben
    for (const mat of mats) {
      try {
        mat.delete();
      } catch {
        // Bereits gelöscht oder ungültig
      }
    }
  }
}

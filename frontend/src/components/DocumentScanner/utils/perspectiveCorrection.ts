/**
 * Perspective Correction — OpenCV.js
 *
 * Wendet Perspektiv-Korrektur auf ein Bild an basierend auf 4 Eckpunkten.
 * Ergebnis: Ein gerade ausgerichtetes Dokument-Bild.
 */

import type { Point } from "./imageProcessing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CV = any;

/**
 * Lädt einen Blob als HTMLImageElement.
 */
function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden"));
    };
    img.src = url;
  });
}

/**
 * Berechnet die Distanz zwischen zwei Punkten.
 */
function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Wendet Perspektiv-Korrektur auf ein Bild an.
 *
 * @param imageBlob - Das Quellbild als Blob
 * @param corners - 4 normalisierte Eckpunkte (0..1), geordnet: TL, TR, BR, BL
 * @param cv - OpenCV.js Modul
 * @returns Korrigiertes Bild als Blob
 */
export async function applyPerspectiveCorrection(
  imageBlob: Blob,
  corners: Point[],
  cv: CV
): Promise<Blob> {
  if (corners.length !== 4) {
    throw new Error("Genau 4 Eckpunkte erforderlich");
  }

  const img = await blobToImage(imageBlob);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = img.naturalWidth;
  srcCanvas.height = img.naturalHeight;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Canvas Context nicht verfügbar");
  srcCtx.drawImage(img, 0, 0);

  const imageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

  // Denormalisierte Pixel-Koordinaten
  const pixelCorners = corners.map((c) => ({
    x: c.x * srcCanvas.width,
    y: c.y * srcCanvas.height,
  }));

  // TL=0, TR=1, BR=2, BL=3
  const [tl, tr, br, bl] = pixelCorners;

  // Output-Dimensionen: Längere Kante verwenden
  const widthTop = dist(tl, tr);
  const widthBottom = dist(bl, br);
  const maxWidth = Math.round(Math.max(widthTop, widthBottom));

  const heightLeft = dist(tl, bl);
  const heightRight = dist(tr, br);
  const maxHeight = Math.round(Math.max(heightLeft, heightRight));

  // OpenCV Mats
  const mats: CV[] = [];

  try {
    const src = cv.matFromImageData(imageData);
    mats.push(src);

    // Source Points (Float32)
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y,
      tr.x, tr.y,
      br.x, br.y,
      bl.x, bl.y,
    ]);
    mats.push(srcPts);

    // Destination Points (korrigiertes Rechteck)
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      maxWidth - 1, 0,
      maxWidth - 1, maxHeight - 1,
      0, maxHeight - 1,
    ]);
    mats.push(dstPts);

    // Perspektiv-Matrix berechnen
    const M = cv.getPerspectiveTransform(srcPts, dstPts);
    mats.push(M);

    // Transformation anwenden
    const dst = new cv.Mat();
    mats.push(dst);
    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(maxWidth, maxHeight),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );

    // Ergebnis auf Canvas zeichnen
    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = maxWidth;
    resultCanvas.height = maxHeight;
    cv.imshow(resultCanvas, dst);

    // Canvas → Blob
    return new Promise<Blob>((resolve, reject) => {
      resultCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas-zu-Blob-Konvertierung fehlgeschlagen"));
          }
        },
        "image/jpeg",
        0.95
      );
    });
  } finally {
    for (const mat of mats) {
      try {
        mat.delete();
      } catch {
        // Bereits gelöscht
      }
    }
  }
}

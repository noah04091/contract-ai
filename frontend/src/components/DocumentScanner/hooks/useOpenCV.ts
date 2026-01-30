/**
 * useOpenCV Hook
 *
 * Lädt OpenCV.js async via jsDelivr CDN (Singleton).
 * Kamera kann sofort starten, Edge Detection erst wenn OpenCV bereit.
 *
 * Verwendet @techstark/opencv-js via jsDelivr (zuverlässige CDN).
 */

import { useState, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenCVModule = any;

interface UseOpenCVReturn {
  cv: OpenCVModule | null;
  isReady: boolean;
  error: string | null;
}

// Module-level Singleton — nur einmal laden
let cvPromise: Promise<OpenCVModule> | null = null;
let cvInstance: OpenCVModule | null = null;

// jsDelivr CDN — zuverlässig, schnell, global cached
const OPENCV_CDN =
  "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/opencv.js";

function loadOpenCV(): Promise<OpenCVModule> {
  if (cvInstance) return Promise.resolve(cvInstance);
  if (cvPromise) return cvPromise;

  cvPromise = new Promise<OpenCVModule>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;

    // Falls cv bereits global vorhanden (z.B. vom Browser-Cache)
    if (win.cv && win.cv.Mat) {
      cvInstance = win.cv;
      resolve(win.cv);
      return;
    }

    // Altes Script-Element entfernen falls vorhanden
    const existingScript = document.getElementById("opencv-js");
    if (existingScript) {
      existingScript.remove();
    }

    const timeout = setTimeout(() => {
      reject(new Error("OpenCV.js Ladezeit überschritten (30s)"));
    }, 30000);

    const script = document.createElement("script");
    script.src = OPENCV_CDN;
    script.async = true;
    script.id = "opencv-js";

    script.onload = () => {
      console.log("[Scanner] OpenCV.js script loaded, waiting for init...");

      // cv-Objekt wird von @techstark/opencv-js als globale Variable gesetzt
      // Polling bis cv.Mat verfügbar ist (WASM-Init kann dauern)
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cv = (window as any).cv;

        if (cv && typeof cv.Mat === "function") {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          cvInstance = cv;
          console.log("[Scanner] OpenCV.js ready");
          resolve(cv);
          return;
        }

        // cv existiert als Promise? (manche Builds returnen ein Promise)
        if (cv && typeof cv.then === "function") {
          clearInterval(pollInterval);
          cv.then((readyCv: OpenCVModule) => {
            clearTimeout(timeout);
            cvInstance = readyCv;
            console.log("[Scanner] OpenCV.js ready (via promise)");
            resolve(readyCv);
          }).catch((err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
          return;
        }

        // Nach 300 Polls (30s) aufgeben
        if (pollCount > 300) {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          reject(new Error("OpenCV.js Init-Timeout"));
        }
      }, 100);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      cvPromise = null;
      reject(new Error("OpenCV.js konnte nicht geladen werden"));
    };

    document.head.appendChild(script);
  });

  cvPromise.catch(() => {
    cvPromise = null;
  });

  return cvPromise;
}

export function useOpenCV(): UseOpenCVReturn {
  const [cv, setCv] = useState<OpenCVModule | null>(cvInstance);
  const [isReady, setIsReady] = useState(!!cvInstance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cvInstance) {
      setCv(cvInstance);
      setIsReady(true);
      return;
    }

    let cancelled = false;

    loadOpenCV()
      .then((module) => {
        if (!cancelled) {
          setCv(module);
          setIsReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "OpenCV.js Ladefehler");
          console.warn("[Scanner] OpenCV.js load error:", err);
          // Kein harter Fehler — Scanner funktioniert auch ohne OpenCV
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { cv, isReady, error };
}

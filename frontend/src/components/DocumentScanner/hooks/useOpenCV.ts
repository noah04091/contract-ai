/**
 * useOpenCV Hook
 *
 * Lädt OpenCV.js async via CDN (Singleton).
 * Kamera kann sofort starten, Edge Detection erst wenn OpenCV bereit.
 *
 * Verwendet OpenCV.js 4.5.0 (bewährt stabil).
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

const OPENCV_CDN = "https://docs.opencv.org/4.5.0/opencv.js";

function loadOpenCV(): Promise<OpenCVModule> {
  if (cvInstance) return Promise.resolve(cvInstance);
  if (cvPromise) return cvPromise;

  cvPromise = new Promise<OpenCVModule>((resolve, reject) => {
    // Prüfen ob cv bereits global vorhanden (z.B. vom Browser-Cache)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.cv && win.cv.Mat) {
      cvInstance = win.cv;
      resolve(win.cv);
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("OpenCV.js Ladezeit überschritten (60s)"));
    }, 60000);

    // Module.onRuntimeInitialized MUSS vor dem Script-Load gesetzt werden
    // damit OpenCV.js den Callback aufruft sobald WASM initialisiert ist
    if (!win.Module) {
      win.Module = {};
    }
    win.Module.onRuntimeInitialized = () => {
      clearTimeout(timeout);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cv = (window as any).cv;
      if (cv) {
        cvInstance = cv;
        console.log("[Scanner] OpenCV.js WASM initialized");
        resolve(cv);
      } else {
        reject(new Error("OpenCV.js cv Objekt nicht gefunden nach Init"));
      }
    };

    const script = document.createElement("script");
    script.src = OPENCV_CDN;
    script.async = true;
    script.id = "opencv-js";

    script.onload = () => {
      console.log("[Scanner] OpenCV.js script loaded, waiting for WASM init...");

      // Fallback: Polling falls onRuntimeInitialized nicht aufgerufen wird
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cv = (window as any).cv;
        if (cv && cv.Mat) {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          if (!cvInstance) {
            cvInstance = cv;
            console.log("[Scanner] OpenCV.js ready (via polling)");
            resolve(cv);
          }
        }
        // Nach 200 Polls (20s) aufgeben
        if (pollCount > 200) {
          clearInterval(pollInterval);
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
          console.log("[Scanner] OpenCV.js ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "OpenCV.js Ladefehler");
          console.error("[Scanner] OpenCV.js load error:", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { cv, isReady, error };
}

/**
 * useOpenCV Hook
 *
 * Lädt OpenCV.js async via CDN (Singleton).
 * Kamera kann sofort starten, Edge Detection erst wenn OpenCV bereit.
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

const OPENCV_CDN = "https://docs.opencv.org/4.9.0/opencv.js";

function loadOpenCV(): Promise<OpenCVModule> {
  if (cvInstance) return Promise.resolve(cvInstance);
  if (cvPromise) return cvPromise;

  cvPromise = new Promise<OpenCVModule>((resolve, reject) => {
    // Prüfen ob cv bereits global vorhanden (z.B. vom Cache)
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).cv) {
      const existing = (window as unknown as Record<string, unknown>).cv as OpenCVModule;
      if (existing.Mat) {
        cvInstance = existing;
        resolve(existing);
        return;
      }
    }

    const script = document.createElement("script");
    script.src = OPENCV_CDN;
    script.async = true;
    script.id = "opencv-js";

    const timeout = setTimeout(() => {
      reject(new Error("OpenCV.js Ladezeit überschritten (30s)"));
    }, 30000);

    script.onload = () => {
      // OpenCV.js setzt cv global, aber WASM muss noch initialisiert werden
      const checkReady = () => {
        const cv = (window as unknown as Record<string, unknown>).cv as OpenCVModule;
        if (cv && cv.Mat) {
          clearTimeout(timeout);
          cvInstance = cv;
          resolve(cv);
        } else if (cv && typeof cv.onRuntimeInitialized === "undefined") {
          // cv existiert aber noch nicht initialisiert — Callback setzen
          cv.onRuntimeInitialized = () => {
            clearTimeout(timeout);
            cvInstance = cv;
            resolve(cv);
          };
        } else {
          // Nochmal prüfen in 100ms
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };

    script.onerror = () => {
      clearTimeout(timeout);
      cvPromise = null;
      reject(new Error("OpenCV.js konnte nicht geladen werden"));
    };

    document.head.appendChild(script);
  });

  // Bei Fehler den Singleton zurücksetzen damit retry möglich ist
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

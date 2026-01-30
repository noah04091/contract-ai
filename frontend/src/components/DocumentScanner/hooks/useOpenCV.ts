/**
 * useOpenCV Hook
 *
 * Lädt OpenCV.js async via dynamic import (Code-Splitting).
 * Module-level Singleton — nur einmal laden.
 *
 * Kamera startet sofort, Edge Detection erst wenn OpenCV bereit.
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

async function loadOpenCV(): Promise<OpenCVModule> {
  if (cvInstance) return cvInstance;
  if (cvPromise) return cvPromise;

  cvPromise = (async () => {
    try {
      console.log("[Scanner] Loading OpenCV.js via dynamic import...");

      // Dynamic import — Vite erzeugt separaten Chunk (Code-Splitting)
      const cvModule = await import("@techstark/opencv-js");

      // Default-Export oder Modul selbst
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cv: any = cvModule.default || cvModule;

      // Manche Builds geben ein Promise zurück
      if (cv && typeof cv.then === "function") {
        console.log("[Scanner] OpenCV module is a Promise, awaiting...");
        cv = await cv;
      }

      // Warten auf WASM Runtime-Initialisierung wenn nötig
      if (cv && typeof cv.Mat !== "function") {
        console.log("[Scanner] Waiting for OpenCV WASM runtime init...");
        cv = await new Promise<OpenCVModule>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("OpenCV WASM init timeout (30s)"));
          }, 30000);

          // onRuntimeInitialized Callback
          if (typeof cv.onRuntimeInitialized === "undefined" || cv.onRuntimeInitialized === null) {
            cv.onRuntimeInitialized = () => {
              clearTimeout(timeout);
              console.log("[Scanner] OpenCV WASM runtime initialized");
              resolve(cv);
            };
          } else {
            // Bereits initialisiert? Nochmal prüfen
            const checkInterval = setInterval(() => {
              if (typeof cv.Mat === "function") {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve(cv);
              }
            }, 100);
          }
        });
      }

      // Finale Validierung
      if (!cv || typeof cv.Mat !== "function") {
        throw new Error("OpenCV.js loaded but cv.Mat not available");
      }

      cvInstance = cv;
      console.log("[Scanner] OpenCV.js ready ✓");
      return cv;
    } catch (err) {
      cvPromise = null; // Bei Fehler nächsten Versuch erlauben
      throw err;
    }
  })();

  return cvPromise;
}

export function useOpenCV(enabled: boolean = true): UseOpenCVReturn {
  const [cv, setCv] = useState<OpenCVModule | null>(cvInstance);
  const [isReady, setIsReady] = useState(!!cvInstance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nur laden wenn enabled=true (z.B. Scanner ist geöffnet)
    if (!enabled) return;

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
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { cv, isReady, error };
}

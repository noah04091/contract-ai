/**
 * useCamera Hook
 *
 * Verwaltet getUserMedia für die Dokument-Scan-Kamera:
 * - Back Camera bevorzugt (environment)
 * - Torch-Control (Blitzlicht)
 * - Kamera wechseln (Front/Back)
 * - Frame Capture via Offscreen Canvas
 * - Gibt blob UND dataUrl zurück (dataUrl für zuverlässige Preview)
 */

import { useState, useRef, useCallback, useEffect } from "react";

import type { Point } from "../types";

export interface CaptureResult {
  blob: Blob;
  previewBlob: Blob;
  dataUrl: string;
  detectedCorners?: Point[];
}

interface CameraState {
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  facingMode: "environment" | "user";
  hasTorch: boolean;
  torchOn: boolean;
  isSupported: boolean;
}

interface UseCameraReturn {
  state: CameraState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => Promise<CaptureResult | null>;
  toggleTorch: () => Promise<void>;
  switchCamera: () => Promise<void>;
}

// Preview-Breite für Data-URL (kleiner = schneller, spart Memory)
const PREVIEW_MAX_WIDTH = 1200;

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CameraState>({
    isActive: false,
    hasPermission: null,
    error: null,
    facingMode: "environment",
    hasTorch: false,
    torchOn: false,
    isSupported: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({
      ...prev,
      isActive: false,
      hasTorch: false,
      torchOn: false,
    }));
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({
        ...prev,
        error: "Kamera wird von diesem Browser nicht unterstützt",
        isSupported: false,
      }));
      return;
    }

    // Vorherigen Stream stoppen
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: state.facingMode,
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Timeout: Wenn Video nicht innerhalb von 8s startet, abbrechen
        await Promise.race([
          videoRef.current.play(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Video-Start Timeout")), 8000)
          ),
        ]);
      }

      // Torch-Capability prüfen
      const videoTrack = stream.getVideoTracks()[0];
      let hasTorch = false;
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
          hasTorch = capabilities?.torch === true;
        } catch {
          // getCapabilities nicht unterstützt
        }
      }

      setState((prev) => ({
        ...prev,
        isActive: true,
        hasPermission: true,
        error: null,
        hasTorch,
      }));
    } catch (err: unknown) {
      const domErr = err as DOMException;
      let errorMsg = "Kamera konnte nicht gestartet werden";
      if (domErr.name === "NotAllowedError") {
        errorMsg = "Kamera-Zugriff wurde verweigert";
      } else if (domErr.name === "NotFoundError") {
        errorMsg = "Keine Kamera gefunden";
      } else if (domErr.name === "NotReadableError") {
        errorMsg = "Kamera wird bereits verwendet";
      }

      setState((prev) => ({
        ...prev,
        hasPermission: domErr.name === "NotAllowedError" ? false : prev.hasPermission,
        error: errorMsg,
        isActive: false,
      }));
    }
  }, [state.facingMode, stopCamera]);

  const captureFrame = useCallback(async (): Promise<CaptureResult | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      console.warn("[Scanner] captureFrame: Video not ready", {
        exists: !!video,
        width: video?.videoWidth,
        height: video?.videoHeight,
        readyState: video?.readyState,
      });
      return null;
    }

    // Sicherstellen dass Video wirklich Frames hat
    if (video.readyState < 2) {
      console.warn("[Scanner] captureFrame: Video readyState too low:", video.readyState);
      return null;
    }

    // Full-Resolution Canvas für Blob (Backend-Upload)
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = video.videoWidth;
    fullCanvas.height = video.videoHeight;

    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) return null;

    fullCtx.drawImage(video, 0, 0);

    // Preview-Canvas für Data-URL (reduzierte Auflösung)
    const scale = Math.min(1, PREVIEW_MAX_WIDTH / video.videoWidth);
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = Math.round(video.videoWidth * scale);
    previewCanvas.height = Math.round(video.videoHeight * scale);

    const previewCtx = previewCanvas.getContext("2d");
    if (!previewCtx) return null;

    previewCtx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);

    // Preview-Blob für memory-effiziente Speicherung (statt Data-URL im State)
    const previewBlob = await new Promise<Blob>((resolve) => {
      previewCanvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            // Fallback via toDataURL
            const fallback = previewCanvas.toDataURL("image/jpeg", 0.85);
            const binary = atob(fallback.split(",")[1]);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            resolve(new Blob([bytes], { type: "image/jpeg" }));
          }
        },
        "image/jpeg",
        0.85
      );
    });

    // Data-URL nur als initialer Fallback (wird nicht dauerhaft gespeichert)
    const dataUrl = previewCanvas.toDataURL("image/jpeg", 0.85);

    // Blob aus Full-Canvas (für Backend-Upload)
    const result = await new Promise<CaptureResult | null>((resolve) => {
      fullCanvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            // Fallback: toDataURL → manueller Blob (iOS Safari Workaround)
            try {
              const fallbackDataUrl = fullCanvas.toDataURL("image/jpeg", 0.95);
              const binary = atob(fallbackDataUrl.split(",")[1]);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              const fallbackBlob = new Blob([bytes], { type: "image/jpeg" });
              if (fallbackBlob.size > 0) {
                resolve({ blob: fallbackBlob, previewBlob, dataUrl });
                return;
              }
            } catch {
              // Fallback auch fehlgeschlagen
            }
            console.warn("[Scanner] canvas.toBlob returned null/empty, fallback failed");
            resolve(null);
            return;
          }
          resolve({ blob, previewBlob, dataUrl });
        },
        "image/jpeg",
        0.95
      );
    });

    // Release canvas memory after blob is created
    fullCanvas.width = 0;
    fullCanvas.height = 0;
    previewCanvas.width = 0;
    previewCanvas.height = 0;

    return result;
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !state.hasTorch) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const newTorchState = !state.torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet],
      });
      setState((prev) => ({ ...prev, torchOn: newTorchState }));
    } catch {
      // Torch nicht verfügbar
    }
  }, [state.hasTorch, state.torchOn]);

  const switchCamera = useCallback(async () => {
    const newMode = state.facingMode === "environment" ? "user" : "environment";
    setState((prev) => ({ ...prev, facingMode: newMode as "environment" | "user" }));
    // Kamera direkt mit neuem facingMode neu starten
    // startCamera liest facingMode aus state, der nächste Aufruf nutzt den neuen Wert
  }, [state.facingMode]);

  // Kamera neu starten wenn facingMode sich ändert
  useEffect(() => {
    if (state.isActive) {
      startCamera();
    }
    // startCamera ist absichtlich nicht in deps — wird über facingMode getriggert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.facingMode]);

  // Pause camera tracks when app goes to background (saves battery)
  useEffect(() => {
    const handleVisibility = () => {
      if (!streamRef.current) return;
      const tracks = streamRef.current.getVideoTracks();
      if (document.hidden) {
        tracks.forEach((t) => (t.enabled = false));
      } else {
        tracks.forEach((t) => (t.enabled = true));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    state,
    videoRef,
    startCamera,
    stopCamera,
    captureFrame,
    toggleTorch,
    switchCamera,
  };
}

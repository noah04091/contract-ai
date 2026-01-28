/**
 * useCamera Hook
 *
 * Verwaltet getUserMedia für die Dokument-Scan-Kamera:
 * - Back Camera bevorzugt (environment)
 * - Torch-Control (Blitzlicht)
 * - Kamera wechseln (Front/Back)
 * - Frame Capture via Offscreen Canvas
 */

import { useState, useRef, useCallback, useEffect } from "react";

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
  captureFrame: () => Promise<Blob | null>;
  toggleTorch: () => Promise<void>;
  switchCamera: () => Promise<void>;
}

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
        await videoRef.current.play();
      }

      // Torch-Capability prüfen
      const videoTrack = stream.getVideoTracks()[0];
      let hasTorch = false;
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities?.() as any;
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
    } catch (err: any) {
      let errorMsg = "Kamera konnte nicht gestartet werden";
      if (err.name === "NotAllowedError") {
        errorMsg = "Kamera-Zugriff wurde verweigert";
      } else if (err.name === "NotFoundError") {
        errorMsg = "Keine Kamera gefunden";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Kamera wird bereits verwendet";
      }

      setState((prev) => ({
        ...prev,
        hasPermission: err.name === "NotAllowedError" ? false : prev.hasPermission,
        error: errorMsg,
        isActive: false,
      }));
    }
  }, [state.facingMode, stopCamera]);

  const captureFrame = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.95
      );
    });
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !state.hasTorch) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const newTorchState = !state.torchOn;
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorchState } as any],
      });
      setState((prev) => ({ ...prev, torchOn: newTorchState }));
    } catch {
      // Torch nicht verfügbar
    }
  }, [state.hasTorch, state.torchOn]);

  const switchCamera = useCallback(async () => {
    const newMode = state.facingMode === "environment" ? "user" : "environment";
    setState((prev) => ({ ...prev, facingMode: newMode as "environment" | "user" }));
  }, [state.facingMode]);

  // Kamera neu starten wenn facingMode sich ändert
  useEffect(() => {
    if (state.isActive) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.facingMode]);

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

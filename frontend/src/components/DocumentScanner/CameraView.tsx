/**
 * CameraView
 *
 * Live Kamera-Feed mit automatischer Dokumenten-Erkennung.
 * Edge Detection läuft auf 320px Offscreen-Canvas (~4-8ms/Frame).
 * Auto-Capture bei stabiler Erkennung (1.5s).
 */

import React, { useEffect, useRef, useCallback } from "react";
import { Camera } from "lucide-react";
import ScannerToolbar from "./ScannerToolbar";
import DetectionOverlay from "./DetectionOverlay";
import { useCamera } from "./hooks/useCamera";
import type { CaptureResult } from "./hooks/useCamera";
import { useDocumentDetection } from "./hooks/useDocumentDetection";
import styles from "./DocumentScanner.module.css";

interface CameraViewProps {
  onCapture: (capture: CaptureResult) => void;
  onClose: () => void;
  pageCount: number;
  maxPages: number;
  onFinish: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({
  onCapture,
  onClose,
  pageCount,
  maxPages,
  onFinish,
}) => {
  const { state, videoRef, startCamera, stopCamera, captureFrame, toggleTorch, switchCamera } =
    useCamera();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-Capture Handler (bei stabiler Dokumenten-Erkennung)
  const handleAutoCapture = useCallback(
    async (corners: import("./types").Point[]) => {
      if (pageCount >= maxPages) return;

      const result = await captureFrame();
      if (result) {
        // Doppel-Haptic für Auto-Capture
        navigator.vibrate?.([50, 30, 50]);
        onCapture({ ...result, detectedCorners: corners });
      }
    },
    [captureFrame, onCapture, pageCount, maxPages]
  );

  // Edge Detection Hook (lazy geladen, non-blocking)
  const detection = useDocumentDetection({
    videoRef,
    enabled: state.isActive,
    stabilityThresholdMs: 1500,
    targetFps: 12,
    onStableDetection: handleAutoCapture,
  });

  // Kamera starten
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = async () => {
    if (pageCount >= maxPages) return;

    const result = await captureFrame();
    if (result) {
      // Haptic Feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      // Aktuelle Detection-Corners mitgeben falls vorhanden
      onCapture({
        ...result,
        detectedCorners: detection.detectedCorners || undefined,
      });
    }
  };

  // Kein getUserMedia Support → Fallback
  if (!state.isSupported) {
    return (
      <div className={styles.fallbackContainer}>
        <p>Kamera wird nicht unterstützt.</p>
        <label className={styles.fallbackInput}>
          <Camera size={24} />
          <span>Foto aufnehmen</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                onCapture({ blob: file, previewBlob: file, dataUrl: URL.createObjectURL(file) });
              }
            }}
            style={{ display: "none" }}
          />
        </label>
      </div>
    );
  }

  // Fehler
  if (state.error && !state.isActive) {
    return (
      <div className={styles.fallbackContainer}>
        <p className={styles.errorText}>{state.error}</p>
        <label className={styles.fallbackInput}>
          <Camera size={24} />
          <span>Foto aus Galerie wählen</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                onCapture({ blob: file, previewBlob: file, dataUrl: URL.createObjectURL(file) });
              }
            }}
            style={{ display: "none" }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className={styles.cameraContainer} ref={containerRef}>
      <video
        ref={videoRef}
        className={styles.cameraVideo}
        autoPlay
        playsInline
        muted
      />

      {/* Dokumenten-Erkennung Overlay */}
      <DetectionOverlay
        corners={detection.detectedCorners}
        confidence={detection.confidence}
        isStable={detection.isStable}
        stabilityProgress={detection.stabilityProgress}
        hint={detection.hint}
        containerRef={containerRef}
      />

      <ScannerToolbar
        hasTorch={state.hasTorch}
        torchOn={state.torchOn}
        onToggleTorch={toggleTorch}
        onSwitchCamera={switchCamera}
        onClose={onClose}
        pageCount={pageCount}
        maxPages={maxPages}
      />

      {/* Capture + Finish Buttons unten */}
      <div className={styles.captureArea}>
        {pageCount > 0 && (
          <button className={styles.finishBtn} onClick={onFinish}>
            Fertig ({pageCount})
          </button>
        )}

        <button
          className={styles.captureBtn}
          onClick={handleCapture}
          disabled={pageCount >= maxPages}
        >
          <div className={styles.captureBtnInner} />
        </button>

        {/* Spacer für symmetrisches Layout */}
        <div style={{ width: pageCount > 0 ? 80 : 0 }} />
      </div>
    </div>
  );
};

export default CameraView;

/**
 * CameraView
 *
 * Live Kamera-Feed mit Edge Detection Overlay und Capture-Button.
 * OpenCV ist optional — Kamera + Capture funktionieren auch ohne.
 */

import React, { useEffect, useRef } from "react";
import { Camera } from "lucide-react";
import ScannerToolbar from "./ScannerToolbar";
import { useCamera } from "./hooks/useCamera";
import type { CaptureResult } from "./hooks/useCamera";
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
      onCapture(result);
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
                // File → data URL für Preview
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  onCapture({ blob: file, dataUrl });
                };
                reader.readAsDataURL(file);
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
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  onCapture({ blob: file, dataUrl });
                };
                reader.readAsDataURL(file);
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

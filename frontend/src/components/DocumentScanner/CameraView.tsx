/**
 * CameraView
 *
 * Live Kamera-Feed mit Edge Detection Overlay und Capture-Button.
 * OpenCV ist optional — Kamera + Capture funktionieren auch ohne.
 */

import React, { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import EdgeOverlay from "./EdgeOverlay";
import ScannerToolbar from "./ScannerToolbar";
import { useCamera } from "./hooks/useCamera";
import type { CaptureResult } from "./hooks/useCamera";
import { useEdgeDetection } from "./hooks/useEdgeDetection";
import type { DetectedEdges } from "./utils/imageProcessing";
import styles from "./DocumentScanner.module.css";

interface CameraViewProps {
  onCapture: (capture: CaptureResult, edges: DetectedEdges | null) => void;
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
  const { edges, isOpenCVReady, startDetection, stopDetection } = useEdgeDetection();
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Kamera starten
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      stopDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edge Detection starten sobald Video aktiv
  useEffect(() => {
    if (state.isActive && videoRef.current) {
      startDetection(videoRef.current);

      const updateDimensions = () => {
        if (videoRef.current) {
          setVideoDimensions({
            width: videoRef.current.clientWidth,
            height: videoRef.current.clientHeight,
          });
        }
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [state.isActive, videoRef, startDetection]);

  const handleCapture = async () => {
    if (pageCount >= maxPages) return;

    const result = await captureFrame();
    if (result) {
      // Haptic Feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onCapture(result, edges);
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
                  onCapture({ blob: file, dataUrl }, null);
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
                  onCapture({ blob: file, dataUrl }, null);
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

      {/* Edge Overlay — nur wenn OpenCV bereit (kein Blocking, kein Loading-Indicator) */}
      {videoDimensions.width > 0 && isOpenCVReady && (
        <EdgeOverlay
          edges={edges}
          width={videoDimensions.width}
          height={videoDimensions.height}
        />
      )}

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

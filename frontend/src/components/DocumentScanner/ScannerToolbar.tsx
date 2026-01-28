/**
 * ScannerToolbar
 *
 * Kamera-Controls: Blitz, Kamera wechseln, Abbrechen
 */

import React from "react";
import { Zap, ZapOff, SwitchCamera, X } from "lucide-react";
import styles from "./DocumentScanner.module.css";

interface ScannerToolbarProps {
  hasTorch: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
  onSwitchCamera: () => void;
  onClose: () => void;
  pageCount: number;
  maxPages: number;
}

const ScannerToolbar: React.FC<ScannerToolbarProps> = ({
  hasTorch,
  torchOn,
  onToggleTorch,
  onSwitchCamera,
  onClose,
  pageCount,
  maxPages,
}) => {
  return (
    <div className={styles.toolbar}>
      <button className={styles.toolbarBtn} onClick={onClose} title="Schließen">
        <X size={22} />
      </button>

      <div className={styles.pageCounter}>
        {pageCount} / {maxPages} Seiten
      </div>

      <div className={styles.toolbarRight}>
        {hasTorch && (
          <button
            className={`${styles.toolbarBtn} ${torchOn ? styles.toolbarBtnActive : ""}`}
            onClick={onToggleTorch}
            title={torchOn ? "Blitz aus" : "Blitz an"}
          >
            {torchOn ? <Zap size={22} /> : <ZapOff size={22} />}
          </button>
        )}

        <button
          className={styles.toolbarBtn}
          onClick={onSwitchCamera}
          title="Kamera wechseln"
        >
          <SwitchCamera size={22} />
        </button>
      </div>
    </div>
  );
};

export default ScannerToolbar;

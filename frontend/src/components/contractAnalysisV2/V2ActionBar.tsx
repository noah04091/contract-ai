// V2-Action-Bar — sticky unten, V6-Mockup-Stil.
// Optimieren = Primary (gold), PDF/Chat/Pulse/Vertrag = Secondary.
// Loading-States für PDF + Chat + Optimieren.
// Tier-Gating: Chat ist Business+ (Crown bei Free).

import { Zap, FileText, MessageSquare, Activity, ExternalLink, Loader, ArrowRight } from "lucide-react";
import styles from "./V2ActionBar.module.css";

interface Props {
  hasContractId: boolean;
  isBusinessOrHigher: boolean;
  optimizing: boolean;
  generatingPdf: boolean;
  openingChat: boolean;
  showPulseLink: boolean;
  showOpenContract: boolean;
  onOptimize: () => void;
  onDownloadPdf: () => void;
  onOpenChat: () => void;
  onOpenPulse: () => void;
  onOpenContract: () => void;
}

export default function V2ActionBar(props: Props) {
  const {
    hasContractId,
    isBusinessOrHigher,
    optimizing,
    generatingPdf,
    openingChat,
    showPulseLink,
    showOpenContract,
    onOptimize,
    onDownloadPdf,
    onOpenChat,
    onOpenPulse,
    onOpenContract,
  } = props;

  return (
    <div className={styles.actionBar} role="toolbar" aria-label="Vertrags-Aktionen">
      <button
        type="button"
        className={`${styles.primary} ${optimizing ? styles.primaryLoading : ""}`}
        onClick={onOptimize}
        disabled={optimizing || !hasContractId}
        aria-label="Vertrag optimieren"
      >
        {optimizing ? <Loader size={14} aria-hidden="true" /> : <Zap size={14} aria-hidden="true" />}
        <span>{optimizing ? "Optimiere..." : "Vertrag jetzt optimieren"}</span>
        {!optimizing && <ArrowRight size={12} aria-hidden="true" />}
      </button>

      <div className={styles.divider} />

      <button
        type="button"
        className={`${styles.secondary} ${generatingPdf ? styles.secondaryLoading : ""}`}
        onClick={onDownloadPdf}
        disabled={generatingPdf}
        aria-label="Anwalts-PDF herunterladen"
      >
        {generatingPdf ? <Loader size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}
        <span>{generatingPdf ? "Erstelle..." : "PDF"}</span>
      </button>

      <button
        type="button"
        className={`${styles.secondary} ${!isBusinessOrHigher ? styles.locked : ""} ${openingChat ? styles.secondaryLoading : ""}`}
        onClick={onOpenChat}
        disabled={!isBusinessOrHigher || openingChat || !hasContractId}
        title={!isBusinessOrHigher ? "Nur für Business & Enterprise verfügbar" : undefined}
        aria-label="Mit KI besprechen"
      >
        {openingChat ? <Loader size={13} aria-hidden="true" /> : <MessageSquare size={13} aria-hidden="true" />}
        <span>Chat</span>
        {!isBusinessOrHigher && <span className={styles.crown}>👑</span>}
      </button>

      {showPulseLink && (
        <button type="button" className={styles.secondary} onClick={onOpenPulse} aria-label="Legal Pulse öffnen">
          <Activity size={13} aria-hidden="true" />
          <span>Pulse</span>
        </button>
      )}

      {showOpenContract && (
        <button type="button" className={styles.secondary} onClick={onOpenContract} aria-label="Zum Vertrag öffnen">
          <ExternalLink size={13} aria-hidden="true" />
          <span>Vertrag</span>
        </button>
      )}
    </div>
  );
}

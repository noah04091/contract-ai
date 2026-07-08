// V2-Action-Bar — sticky unten, V6-Mockup-Stil.
// Optimieren = Primary (gold), PDF/Chat/Pulse/Vertrag = Secondary.
// Loading-States für PDF + Chat + Optimieren.
// Tier-Gating: Chat ist Business+ (Crown bei Free).
// 📨 Welle 1 (07.07.2026): docClass="LETTER" → Primary wird "Fristen & Optionen
// ansehen" (Scroll) statt "Vertrag optimieren" — ein empfangenes Schreiben
// optimiert man nicht. Labels docClass-neutral ("Dokument" statt "Vertrag").

import { Zap, FileText, MessageSquare, Activity, ExternalLink, Loader, ArrowRight, CalendarClock } from "lucide-react";
import styles from "./V2ActionBar.module.css";
import type { DocClass } from "./v2TabLabels";

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
  /** 📨 Welle 1: Dokumentklasse — steuert Primary-CTA + Wording. Default CONTRACT. */
  docClass?: DocClass;
  /** 📨 Welle 1: Scroll-Handler für die LETTER-Primary-CTA ("Fristen & Optionen ansehen"). */
  onShowDeadlines?: () => void;
}

export default function V2ActionBar(props: Props) {
  const {
    hasContractId,
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
    docClass = "CONTRACT",
    onShowDeadlines,
  } = props;

  const isLetter = docClass === "LETTER";
  const docWord = isLetter ? "Dokument" : "Vertrag";

  return (
    <div className={styles.actionBar} role="toolbar" aria-label={isLetter ? "Schreiben-Aktionen" : "Vertrags-Aktionen"}>
      {isLetter ? (
        <button
          type="button"
          className={styles.primary}
          onClick={onShowDeadlines}
          disabled={!onShowDeadlines}
          aria-label="Fristen und Handlungsoptionen ansehen"
        >
          <CalendarClock size={14} aria-hidden="true" />
          <span>Fristen &amp; Optionen ansehen</span>
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      ) : (
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
      )}

      <div className={styles.divider} />

      <button
        type="button"
        className={`${styles.secondary} ${generatingPdf ? styles.secondaryLoading : ""}`}
        onClick={onDownloadPdf}
        disabled={generatingPdf}
        aria-label="Vorprüfungs-PDF herunterladen"
      >
        {generatingPdf ? <Loader size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}
        <span>{generatingPdf ? "Erstelle..." : "PDF"}</span>
      </button>

      {/* 📨 Welle 2 (08.07.2026): Chat für ALLE Pläne klickbar — Free hat 5
          Nachrichten/Monat, das Backend erzwingt das Kontingent (403 → Upsell
          im Drawer). Keine Krone mehr; isBusinessOrHigher bleibt als Prop für
          andere Konsumenten erhalten. */}
      <button
        type="button"
        className={`${styles.secondary} ${openingChat ? styles.secondaryLoading : ""}`}
        onClick={onOpenChat}
        disabled={openingChat || !hasContractId}
        aria-label="Mit KI besprechen"
      >
        {openingChat ? <Loader size={13} aria-hidden="true" /> : <MessageSquare size={13} aria-hidden="true" />}
        <span>Chat</span>
      </button>

      {showPulseLink && (
        <button type="button" className={styles.secondary} onClick={onOpenPulse} aria-label="Legal Pulse öffnen">
          <Activity size={13} aria-hidden="true" />
          <span>Pulse</span>
        </button>
      )}

      {showOpenContract && (
        <button type="button" className={styles.secondary} onClick={onOpenContract} aria-label={`Zum ${docWord} öffnen`}>
          <ExternalLink size={13} aria-hidden="true" />
          <span>{docWord}</span>
        </button>
      )}
    </div>
  );
}

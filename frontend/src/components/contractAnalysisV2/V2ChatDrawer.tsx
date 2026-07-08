// V2-Chat-Drawer — rechts einfahrendes Panel für „Fragen zu deinem {docNoun}"
// direkt in der Analyse-Ansicht. Pattern übernommen von V2ScoreDetailDrawer
// (Backdrop + Escape + Scroll-Lock + Click-outside + Inline-Keyframes),
// aber: zIndex 120 (ActionBar/ScoreDrawer liegen bei 100), Panel rechts,
// volle Höhe, Focus-Trap. Kein globales CSS — nur Inline-Styles + eigener
// <style>-Block mit eindeutigem Prefix (v2ChatDrawer…).

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChatThread } from "../chatThread/ChatThread";
import type { ChatUsageStats } from "../chatThread/useChatThread";

interface Props {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
  contractName: string;
  docNoun: string;
  usageLabel?: string;
  /** 📨 403 schon beim Chat-ERSTELLEN (Kontingent erschöpft) → Upsell statt Spinner. */
  limitReached?: { limit: number; current: number } | null;
}

export default function V2ChatDrawer({
  open,
  onClose,
  chatId,
  contractName,
  docNoun,
  usageLabel,
  limitReached,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Usage kommt live aus dem ChatThread (der lädt sie bei Mount + nach jeder
  // Nachricht) — so braucht der Drawer keinen eigenen Fetch.
  const [usage, setUsage] = useState<ChatUsageStats | null>(null);

  // Escape schließt + Body-Scroll-Lock (mit Cleanup) — wie V2ScoreDetailDrawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // TÜV: vorherigen overflow-Wert MERKEN — die Analyse läuft oft in Modals,
    // die selbst overflow=hidden setzen; ein unconditionales "" beim Schließen
    // würde deren Scroll-Lock zerstören (Hintergrund scrollt hinterm Modal).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Initialer Fokus auf die Textarea (nach der Slide-in-Animation),
  // Fallback: Schließen-Button.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const textarea = panelRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      if (textarea && !textarea.disabled) {
        textarea.focus();
      } else {
        closeBtnRef.current?.focus();
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [open, chatId]);

  if (!open) return null;

  // Einfacher Focus-Trap: Tab/Shift+Tab zyklisch im Panel halten.
  const handleTrapKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const usagePill =
    usageLabel ??
    (usage
      ? usage.unlimited || usage.limit == null
        ? "unbegrenzt"
        : `${usage.current}/${usage.limit} Nachrichten`
      : null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="v2-chat-drawer-title"
      onClick={onClose}
      onKeyDown={handleTrapKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 120, // ActionBar + ScoreDrawer liegen bei 100 — wir müssen drüber.
        display: "flex",
        justifyContent: "flex-end",
        animation: "v2ChatDrawerFadeIn 200ms ease-out",
      }}
    >
      <style>{`
        @keyframes v2ChatDrawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes v2ChatDrawerSlideIn {
          from { transform: translateX(48px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes v2ChatDrawerSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .v2ChatDrawerPanel {
          width: min(560px, 100vw);
          height: 100dvh;
        }
        @media (max-width: 640px) {
          .v2ChatDrawerPanel {
            width: 100vw;
          }
        }
      `}</style>
      <div
        ref={panelRef}
        className="v2ChatDrawerPanel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          boxShadow: "-24px 0 48px -12px rgba(15, 23, 42, 0.25)",
          animation: "v2ChatDrawerSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Kopfleiste */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3
              id="v2-chat-drawer-title"
              style={{
                margin: 0,
                fontSize: 15.5,
                fontWeight: 700,
                color: "#0f172a",
                letterSpacing: "-0.015em",
              }}
            >
              <span aria-hidden="true">💬 </span>
              Fragen zu deinem {docNoun}
            </h3>
            <div
              style={{
                fontSize: 12.5,
                color: "#64748b",
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 340,
              }}
              title={contractName}
            >
              {contractName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {usagePill && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    background: "#eff6ff",
                    color: "#1e40af",
                    border: "1px solid #bfdbfe",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {usagePill}
                </span>
              )}
              {chatId && (
                <a
                  href={`/chat?id=${chatId}`}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#2563eb",
                    textDecoration: "none",
                  }}
                >
                  Im Vollbild öffnen →
                </a>
              )}
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: "#64748b",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body — ChatThread wird beim Schließen unmountet → useChatThread
            bricht laufende Streams im useEffect-Cleanup ab. */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {limitReached ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: "0 32px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 34 }} aria-hidden="true">💬</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Dein Chat-Kontingent ist aufgebraucht
              </div>
              <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.55, maxWidth: 380 }}>
                {limitReached.limit < 50
                  ? `Du hast dein monatliches Chat-Kontingent (${limitReached.limit} Nachrichten) genutzt. Mit dem Business-Tarif bekommst du 50 Nachrichten/Monat — mit Volltext-Kontext zu deinen Dokumenten.`
                  : `Du hast dein monatliches Chat-Kontingent (${limitReached.limit} Nachrichten) genutzt. Es wird zum Monatsanfang zurückgesetzt — mit Enterprise chattest du unbegrenzt.`}
              </div>
              <a
                href="/pricing"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13.5,
                  padding: "10px 20px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                {limitReached.limit < 50 ? "Business ansehen →" : "Tarife ansehen →"}
              </a>
            </div>
          ) : chatId ? (
            <ChatThread chatId={chatId} docNoun={docNoun} onUsageChange={setUsage} />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  border: "3px solid #e2e8f0",
                  borderTopColor: "#2563eb",
                  borderRadius: "50%",
                  animation: "v2ChatDrawerSpin 800ms linear infinite",
                }}
              />
              Chat wird vorbereitet …
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

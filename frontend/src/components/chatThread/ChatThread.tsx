// 📁 frontend/src/components/chatThread/ChatThread.tsx
// Self-contained Chat-Thread (Messages + Chips + Eingabe) für die Einbettung
// z. B. im V2ChatDrawer. Kopfleiste macht der Container (Drawer), nicht wir.
// Bewusst NUR Inline-Styles + eigener <style>-Block mit eindeutigem Prefix
// (ctThread…) — kein globales CSS, keine bestehende CSS-Datei angefasst.

import { useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "./ChatMarkdown";
import { useChatThread } from "./useChatThread";
import type { ChatLimitReached, ChatUsageStats } from "./useChatThread";

export interface ChatThreadProps {
  chatId: string;
  /** z. B. "Vertrag", "Schreiben" — für Empty-State-Copy */
  docNoun: string;
  onLimitReached?: (info: ChatLimitReached) => void;
  /** Optional: meldet frische Usage-Stats nach Mount + jeder Nachricht nach oben (z. B. für die Usage-Pille im Drawer). */
  onUsageChange?: (usage: ChatUsageStats) => void;
}

const ACCENT = "#2563eb";

export function ChatThread({ chatId, docNoun, onLimitReached, onUsageChange }: ChatThreadProps) {
  const {
    messages,
    loading,
    smartQuestions,
    usage,
    error,
    limitReached,
    openChat,
    sendMessage,
    loadUsage,
  } = useChatThread();

  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Chat laden + Usage holen, sobald (bzw. wenn ein anderer) chatId da ist.
  useEffect(() => {
    openChat(chatId);
    loadUsage();
  }, [chatId, openChat, loadUsage]);

  // Limit-Info nach oben melden (z. B. Drawer will darauf reagieren).
  useEffect(() => {
    if (limitReached && onLimitReached) onLimitReached(limitReached);
  }, [limitReached, onLimitReached]);

  // Usage nach oben melden (Drawer-Pille).
  useEffect(() => {
    if (usage && onUsageChange) onUsageChange(usage);
  }, [usage, onUsageChange]);

  const visibleMessages = messages.filter((m) => m.role !== "system");
  const lastMessage = visibleMessages[visibleMessages.length - 1];

  // Auto-Scroll ans Ende bei neuen Messages UND während des Streamings.
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visibleMessages.length, lastMessage?.content]);

  const canSend = !loading && !limitReached && input.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const text = input;
    setInput("");
    void sendMessage(text);
  };

  const handleChipClick = (question: string) => {
    if (loading || limitReached) return;
    void sendMessage(question);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "#fff",
      }}
    >
      <style>{`
        @keyframes ctThreadDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .ctThreadMd p { margin: 0 0 8px; }
        .ctThreadMd p:last-child { margin-bottom: 0; }
        .ctThreadMd ul, .ctThreadMd ol { margin: 4px 0 8px; padding-left: 20px; }
        .ctThreadMd li { margin-bottom: 3px; }
        .ctThreadMd h1, .ctThreadMd h2, .ctThreadMd h3, .ctThreadMd h4 {
          margin: 10px 0 6px; font-size: 14px; font-weight: 700; color: #0f172a;
        }
        .ctThreadMd blockquote {
          margin: 6px 0; padding: 4px 12px; border-left: 3px solid #cbd5e1; color: #475569;
        }
        .ctThreadMd code {
          background: #f1f5f9; border-radius: 4px; padding: 1px 5px; font-size: 12px;
        }
        .ctThreadMd pre { background: #f1f5f9; border-radius: 8px; padding: 10px; overflow-x: auto; }
        .ctThreadMd a { color: ${ACCENT}; text-decoration: underline; }
      `}</style>

      {/* Message-Liste */}
      <div
        ref={scrollerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {visibleMessages.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }} aria-hidden="true">💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
              Stell deine erste Frage
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              Frag alles zu deinem {docNoun} — du bekommst eine strukturierte, verständliche Einschätzung.
            </div>
          </div>
        )}

        {visibleMessages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const isLast = idx === visibleMessages.length - 1;
          const showTyping = !isUser && msg.content === "" && loading && isLast;

          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "88%",
                padding: "10px 14px",
                borderRadius: 14,
                borderBottomRightRadius: isUser ? 4 : 14,
                borderBottomLeftRadius: isUser ? 14 : 4,
                background: isUser ? ACCENT : "#f8fafc",
                border: isUser ? "none" : "1px solid #e2e8f0",
                color: isUser ? "#fff" : "#0f172a",
                fontSize: 13.5,
                lineHeight: 1.6,
                whiteSpace: isUser ? "pre-wrap" : "normal",
                wordBreak: "break-word",
              }}
            >
              {showTyping ? (
                <span style={{ display: "inline-flex", gap: 4, padding: "4px 2px" }} aria-label="Antwort wird geschrieben">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#94a3b8",
                        display: "inline-block",
                        animation: `ctThreadDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </span>
              ) : isUser ? (
                msg.content
              ) : (
                <div className="ctThreadMd">
                  <ChatMarkdown content={msg.content} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fehler-Banner */}
      {error && (
        <div
          role="alert"
          style={{
            margin: "0 20px 10px",
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            color: "#b91c1c",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* Upsell-Banner bei erreichtem Limit */}
      {limitReached && (
        <div
          style={{
            margin: "0 20px 10px",
            padding: "12px 14px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            color: "#92400e",
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          <strong style={{ display: "block", marginBottom: 2 }}>Chat-Kontingent aufgebraucht</strong>
          Mit Business bekommst du 50 Nachrichten/Monat.{" "}
          <a href="/pricing" style={{ color: ACCENT, fontWeight: 600, textDecoration: "underline" }}>
            Jetzt upgraden →
          </a>
        </div>
      )}

      {/* Follow-up-Chips */}
      {smartQuestions.length > 0 && !limitReached && (
        <div
          style={{
            padding: "0 20px 10px",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {smartQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleChipClick(q)}
              disabled={loading}
              style={{
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.4,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
                textAlign: "left",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Eingabe */}
      <div
        style={{
          borderTop: "1px solid #f1f5f9",
          padding: "12px 20px 14px",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={limitReached ? "Chat-Kontingent aufgebraucht" : "Deine Frage …"}
          disabled={!!limitReached}
          rows={2}
          aria-label="Deine Frage"
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 13.5,
            lineHeight: 1.5,
            fontFamily: "inherit",
            color: "#0f172a",
            background: limitReached ? "#f8fafc" : "#fff",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            border: "none",
            background: canSend ? ACCENT : "#cbd5e1",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: canSend ? "pointer" : "default",
            flexShrink: 0,
            transition: "background 150ms ease",
          }}
        >
          Senden
        </button>
      </div>
    </div>
  );
}

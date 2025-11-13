// 📁 frontend/src/pages/Chat.tsx - Legal Chat 2.0 with Sidebar, SSE Streaming & Markdown
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import styles from "../styles/Chat.module.css";
import { useAuth } from "../context/AuthContext";

type ChatLite = {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
};

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  meta?: Record<string, unknown>;
};

type ChatFull = ChatLite & {
  messages: Message[];
  attachments?: { name: string; url: string; s3Key?: string }[];
};

type UsageStats = {
  current: number;
  limit: number;
  remaining: number;
  resetDate?: string;
};

const API = "/api/chat";

export default function Chat() {
  const { user, isLoading } = useAuth();
  const isPremium = user?.subscriptionActive === true;

  // State
  const [chats, setChats] = useState<ChatLite[]>([]);
  const [active, setActive] = useState<ChatFull | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ✅ Load chat list on mount
  useEffect(() => {
    if (isPremium) {
      loadChats();
      loadUsage();
    }
  }, [isPremium]);

  // ✅ Autoscroll on new messages
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages?.length]);

  // ✅ Focus input when active chat changes
  useEffect(() => {
    if (active && !loading) {
      inputRef.current?.focus();
    }
  }, [active, loading]);

  // ==========================================
  // 🔧 API FUNCTIONS
  // ==========================================

  async function loadChats() {
    try {
      const res = await fetch(API, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      setChats(data);
    } catch (error) {
      console.error("❌ Error loading chats:", error);
    }
  }

  async function loadUsage() {
    try {
      const res = await fetch(`${API}/usage/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load usage");
      const data = await res.json();
      setUsage(data);
    } catch (error) {
      console.error("❌ Error loading usage:", error);
    }
  }

  async function newChat(initialQuestion?: string) {
    try {
      const res = await fetch(`${API}/new`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialQuestion }),
      });

      if (!res.ok) throw new Error("Failed to create chat");

      const chat: ChatFull = await res.json();

      setChats((prev) => [
        {
          _id: chat._id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        },
        ...prev,
      ]);

      setActive(chat);

      // If initial question was provided, send it
      if (initialQuestion && initialQuestion.trim()) {
        await sendMessage(chat._id, initialQuestion);
      }
    } catch (error) {
      console.error("❌ Error creating chat:", error);
    }
  }

  async function openChat(id: string) {
    try {
      const res = await fetch(`${API}/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chat");
      const chat: ChatFull = await res.json();
      setActive(chat);
      setInput(""); // Clear input when switching chats
    } catch (error) {
      console.error("❌ Error opening chat:", error);
    }
  }

  async function sendMessage(chatId: string = active?._id || "", text: string = input) {
    if (!chatId || !text.trim()) return;

    const userMessage: Message = { role: "user", content: text };

    // Optimistically add user message
    setActive((curr) =>
      curr
        ? {
            ...curr,
            messages: [...curr.messages, userMessage, { role: "assistant", content: "" }],
          }
        : curr
    );

    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/${chatId}/message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send message");
      }

      // ✅ SSE STREAMING
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Parse SSE data
        for (const line of chunk.split("\n\n")) {
          if (!line.startsWith("data:")) continue;

          try {
            const payload = JSON.parse(line.slice(5).trim());

            if (payload.delta) {
              assistantContent += payload.delta;

              // Update assistant message in real-time
              setActive((curr) => {
                if (!curr) return curr;
                const msgs = [...curr.messages];
                msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
                return { ...curr, messages: msgs };
              });
            }

            if (payload.error) {
              throw new Error(payload.error);
            }
          } catch (parseError) {
            console.warn("Failed to parse SSE chunk:", parseError);
          }
        }
      }

      // Refresh usage stats
      await loadUsage();

      // Refresh chat list (for updated timestamp/title)
      await loadChats();
    } catch (error: unknown) {
      console.error("❌ Error sending message:", error);

      // Extract error message safely
      const errorMessage = error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden.";

      // Show error in chat
      setActive((curr) => {
        if (!curr) return curr;
        const msgs = [...curr.messages];
        msgs[msgs.length - 1] = {
          role: "assistant",
          content: `**Fehler:** ${errorMessage}`,
        };
        return { ...curr, messages: msgs };
      });
    } finally {
      setLoading(false);
    }
  }

  async function renameChat(chatId: string, newTitle: string) {
    try {
      const res = await fetch(`${API}/${chatId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) throw new Error("Failed to rename chat");

      // Update local state
      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, title: newTitle } : c))
      );

      if (active?._id === chatId) {
        setActive((curr) => (curr ? { ...curr, title: newTitle } : curr));
      }

      setEditingChatId(null);
    } catch (error) {
      console.error("❌ Error renaming chat:", error);
    }
  }

  async function deleteChat(chatId: string) {
    if (!confirm("Chat wirklich löschen?")) return;

    try {
      const res = await fetch(`${API}/${chatId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete chat");

      setChats((prev) => prev.filter((c) => c._id !== chatId));

      if (active?._id === chatId) {
        setActive(null);
      }
    } catch (error) {
      console.error("❌ Error deleting chat:", error);
    }
  }

  // ==========================================
  // 🎨 UI HELPERS
  // ==========================================

  const suggestions = useMemo(
    () => [
      "Was bedeutet Kündigungsfrist 3 Monate zum Quartalsende?",
      "Welche Klauseln sind bei Freelancer-Verträgen kritisch?",
      "Ist diese Vertragsstrafe wirksam?",
      "Muss der Mietvertrag schriftlich sein?",
    ],
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift: Send
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }

      // Escape: Clear input
      if (e.key === "Escape") {
        setInput("");
      }
    },
    [input, active]
  );

  // ==========================================
  // 🎨 RENDER
  // ==========================================

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>Lade Nutzerdaten...</p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <>
        <Helmet>
          <title>Vertrags-Chat – Premium Feature | Contract AI</title>
        </Helmet>
        <div className={styles.premiumRequired}>
          <div className={styles.premiumIcon}>⚖️</div>
          <h2>Legal Chat 2.0 – Premium Feature</h2>
          <p>
            Der professionelle Vertrags-Chat ist nur für Premium- und Business-Nutzer verfügbar.
          </p>
          <a href="/subscribe" className={styles.upgradeButton}>
            Jetzt upgraden
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Legal Chat 2.0 – KI-Rechtsanwalt für Vertragsrecht | Contract AI</title>
        <meta
          name="description"
          content="Chatte mit einem spezialisierten KI-Anwalt für Vertragsrecht. Erhalte strukturierte Einschätzungen, Risiko-Analysen und konkrete Handlungsempfehlungen."
        />
      </Helmet>

      <div className={styles.layout}>
        {/* ==========================================
            SIDEBAR - Chat History
            ========================================== */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <button className={styles.newChatButton} onClick={() => newChat()}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Neuer Chat
            </button>

            {/* Usage Stats */}
            {usage && (
              <div className={styles.usageStats}>
                <div className={styles.usageBar}>
                  <div
                    className={styles.usageProgress}
                    style={{ width: `${(usage.current / usage.limit) * 100}%` }}
                  />
                </div>
                <span className={styles.usageText}>
                  {usage.remaining} von {usage.limit === Infinity ? "∞" : usage.limit} übrig
                </span>
              </div>
            )}
          </div>

          <div className={styles.history}>
            {chats.map((chat) => (
              <div key={chat._id} className={styles.historyItemWrapper}>
                {editingChatId === chat._id ? (
                  <input
                    type="text"
                    className={styles.editInput}
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => renameChat(chat._id, editingTitle)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameChat(chat._id, editingTitle);
                      if (e.key === "Escape") setEditingChatId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    className={`${styles.historyItem} ${active?._id === chat._id ? styles.active : ""}`}
                    onClick={() => openChat(chat._id)}
                    title={new Date(chat.updatedAt).toLocaleString()}
                  >
                    <span className={styles.chatTitle}>{chat.title || "Ohne Titel"}</span>
                    <span className={styles.chatDate}>
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                )}

                <div className={styles.historyActions}>
                  <button
                    className={styles.iconButton}
                    onClick={() => {
                      setEditingChatId(chat._id);
                      setEditingTitle(chat.title);
                    }}
                    title="Umbenennen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                  <button
                    className={styles.iconButton}
                    onClick={() => deleteChat(chat._id)}
                    title="Löschen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18M8 6V4h8v2M19 6v14H5V6h14z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {chats.length === 0 && (
              <div className={styles.emptyHistory}>
                <p>Noch keine Chats vorhanden</p>
              </div>
            )}
          </div>

          <div className={styles.sidebarBottom}>
            <a href="/dashboard">← Zurück zum Dashboard</a>
            <a href="/legal">Rechtsinfo</a>
          </div>
        </aside>

        {/* ==========================================
            MAIN - Chat Window
            ========================================== */}
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <span className={styles.headerIcon}>⚖️</span>
              <span className={styles.headerTitle}>Legal Chat 2.0</span>
              <span className={styles.badge}>Rechtsanwalt für Vertragsrecht</span>
            </div>
            <div className={styles.actions}>
              {active && (
                <button
                  className={styles.ghostButton}
                  onClick={() => openChat(active._id)}
                  title="Chat neu laden"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M1 4v6h6M23 20v-6h-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </header>

          <div className={styles.scroller} ref={scrollerRef}>
            {!active || active.messages.filter((m) => m.role !== "system").length === 0 ? (
              <EmptyState suggestions={suggestions} onPick={(q) => newChat(q)} />
            ) : (
              <div className={styles.thread}>
                {active.messages
                  .filter((m) => m.role !== "system")
                  .map((msg, i) => (
                    <Bubble key={i} role={msg.role as "user" | "assistant"} content={msg.content} />
                  ))}
              </div>
            )}
          </div>

          <div className={styles.inputBar}>
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Frage zum Vertragsrecht stellen… (Shift+Enter = Zeilenumbruch)"
                disabled={loading || !active}
                rows={1}
              />
              <button className={styles.sendButton} disabled={loading || !active || !input.trim()}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
            <div className={styles.note}>
              Hinweis: Die KI ersetzt keine Rechtsberatung. Bei komplexen Fällen kontaktiere einen
              Anwalt.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ==========================================
// 🧩 SUB-COMPONENTS
// ==========================================

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  return (
    <div className={`${styles.bubble} ${role === "user" ? styles.userBubble : styles.aiBubble}`}>
      <div className={`${styles.avatar} ${role === "user" ? styles.userAvatar : styles.aiAvatar}`}>
        {role === "assistant" ? "⚖️" : "👤"}
      </div>
      <div className={styles.bubbleBody}>
        <div className={styles.bubbleHeader}>
          <span className={styles.sender}>
            {role === "user" ? "Du" : "KI-Rechtsanwalt"}
          </span>
        </div>
        <div className={styles.bubbleContent}>
          <MarkdownContent content={content} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ suggestions, onPick }: { suggestions: string[]; onPick: (s: string) => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.heroIcon}>📄</div>
      <h2>Willkommen beim Legal Chat 2.0</h2>
      <p>
        Stelle Fragen zu Vertragsrecht und erhalte strukturierte Einschätzungen wie von einem
        Fachanwalt.
      </p>
      <div className={styles.chipRow}>
        {suggestions.map((s) => (
          <button key={s} className={styles.chip} onClick={() => onPick(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ✅ MARKDOWN RENDERING with DOMPurify + marked
function MarkdownContent({ content }: { content: string }) {
  const [sanitizedHtml, setSanitizedHtml] = useState("");

  useEffect(() => {
    async function renderMarkdown() {
      try {
        // Dynamic imports for better bundle splitting
        const { marked } = await import("marked");
        const DOMPurify = (await import("dompurify")).default;

        // Configure marked for better formatting
        marked.setOptions({
          breaks: true, // Convert \n to <br>
          gfm: true, // GitHub Flavored Markdown
        });

        const rawHtml = await marked.parse(content);
        const clean = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "code",
            "pre",
            "a",
          ],
          ALLOWED_ATTR: ["href", "target", "rel"],
        });

        setSanitizedHtml(clean);
      } catch (error) {
        console.error("Markdown rendering error:", error);
        setSanitizedHtml(content); // Fallback to plain text
      }
    }

    renderMarkdown();
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

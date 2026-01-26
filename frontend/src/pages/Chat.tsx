// 📁 frontend/src/pages/Chat.tsx - Legal Chat 2.0 with Sidebar, SSE Streaming & Markdown
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import styles from "../styles/Chat.module.css";
import { useAuth } from "../context/AuthContext";
import { WelcomePopup } from "../components/Tour";
import { MessageCircle } from "lucide-react";

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

type Attachment = {
  name: string;
  s3Key?: string;
  contractType?: string;
  smartQuestions?: string[];
  uploadedAt?: string;
};

type ChatFull = ChatLite & {
  messages: Message[];
  attachments?: Attachment[];
};

type UsageStats = {
  current: number;
  limit: number;
  remaining: number;
  resetDate?: string;
};

const API = "/api/chat";

// ✅ Helper für Auth-Header
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  };
}

export default function Chat() {
  const { user, isLoading } = useAuth();
  const isPremium = user?.subscriptionActive === true;
  const location = useLocation();

  // State
  const [chats, setChats] = useState<ChatLite[]>([]);
  const [active, setActive] = useState<ChatFull | null>(null);
  const [initialChatIdLoaded, setInitialChatIdLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [smartQuestions, setSmartQuestions] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Load chat list on mount and auto-create or open latest chat
  useEffect(() => {
    if (isPremium) {
      loadChats();
      loadUsage();
    }
  }, [isPremium]);

  // ✅ Handle URL parameter ?id= to open specific chat
  useEffect(() => {
    if (!isPremium || isLoading || initialChatIdLoaded) return;

    const urlParams = new URLSearchParams(location.search);
    const chatIdFromUrl = urlParams.get('id');

    if (chatIdFromUrl) {
      setInitialChatIdLoaded(true);
      openChat(chatIdFromUrl);
    }
  }, [isPremium, isLoading, location.search, initialChatIdLoaded]);

  // ✅ Auto-open latest chat or create new one if none exist
  useEffect(() => {
    // Skip auto-open if we're loading a specific chat from URL
    const urlParams = new URLSearchParams(location.search);
    const chatIdFromUrl = urlParams.get('id');
    if (chatIdFromUrl) return;

    if (chats.length > 0 && !active) {
      // Open the most recent chat
      openChat(chats[0]._id);
    } else if (chats.length === 0 && !active && isPremium && !isLoading) {
      // No chats exist, create a new one automatically
      newChat();
    }
  }, [chats, active, isPremium, isLoading, location.search]);

  // ✅ Autoscroll on new messages AND during streaming
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages?.length, active?.messages?.[active?.messages.length - 1]?.content]);

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
      const res = await fetch(API, {
        headers: getAuthHeaders(),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      setChats(data);
    } catch (error) {
      console.error("❌ Error loading chats:", error);
    }
  }

  async function loadUsage() {
    try {
      const res = await fetch(`${API}/usage/stats`, {
        headers: getAuthHeaders(),
        credentials: "include"
      });
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
        headers: getAuthHeaders(),
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
      const res = await fetch(`${API}/${id}`, {
        headers: getAuthHeaders(),
        credentials: "include"
      });
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const errorData = await res.json();

        // Special handling for limit exceeded
        if (res.status === 403 && errorData.error === "Chat limit reached") {
          const limitError = new Error(errorData.message) as Error & { isLimitError: boolean };
          limitError.isLimitError = true;
          throw limitError;
        }

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
      const isLimitError = error instanceof Error && 'isLimitError' in error && (error as Error & { isLimitError: boolean }).isLimitError;

      // Show error in chat
      setActive((curr) => {
        if (!curr) return curr;
        const msgs = [...curr.messages];

        if (isLimitError) {
          // Special limit error message with upgrade link
          msgs[msgs.length - 1] = {
            role: "assistant",
            content: `⚠️ **Chat-Limit erreicht**\n\n${errorMessage}\n\n[Jetzt upgraden →](/subscribe)`,
          };
        } else {
          // Generic error
          msgs[msgs.length - 1] = {
            role: "assistant",
            content: `**Fehler:** ${errorMessage}`,
          };
        }

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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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

  function exportChat() {
    if (!active) return;

    const messages = active.messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        const role = m.role === "user" ? "Du" : "KI-Rechtsanwalt";
        return `### ${role}\n\n${m.content}\n`;
      })
      .join("\n---\n\n");

    const markdown = `# ${active.title}\n\nExportiert am: ${new Date().toLocaleString()}\n\n---\n\n${messages}\n\n---\n\n*Hinweis: Dieser Chat-Export ersetzt keine individuelle Rechtsberatung.*`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function uploadContract(file: File) {
    if (!active) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/${active._id}/upload`, {
        method: "POST",
        credentials: "include",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      // Refresh chat to get updated attachments
      await openChat(active._id);

      // Set smart questions
      if (data.attachment?.smartQuestions) {
        setSmartQuestions(data.attachment.smartQuestions);
      }

      console.log(`✅ Vertrag hochgeladen: ${data.attachment.contractType}`);
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert("Fehler beim Upload. Bitte versuche es erneut.");
    } finally {
      setUploading(false);
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];

        if (file.type === "application/pdf") {
          uploadContract(file);
        } else {
          alert("Bitte nur PDF-Dateien hochladen.");
        }
      }
    },
    [active]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        uploadContract(e.target.files[0]);
      }
    },
    [active]
  );

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
          <title>Vertrags-Chat – Business Feature | Contract AI</title>
        </Helmet>
        <div className={styles.premiumRequired}>
          <div className={styles.premiumIcon}>⚖️</div>
          <h2>Legal Chat 2.0 – Business Feature</h2>
          <p>
            Der professionelle Vertrags-Chat ist nur für Business- und Enterprise-Nutzer verfügbar.
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
      <WelcomePopup
        featureId="chat"
        icon={<MessageCircle size={32} />}
        title="Ihr KI-Rechtsassistent"
        description="Stellen Sie Fragen zu Verträgen, Klauseln oder rechtlichen Themen. Der KI-Assistent gibt Ihnen strukturierte Einschätzungen und konkrete Handlungsempfehlungen."
        tip="Laden Sie einen Vertrag hoch, um kontextbezogene Fragen zu stellen."
      />
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

            {/* Usage Stats - Only show for Free and Business plans */}
            {usage && typeof usage.limit === 'number' && isFinite(usage.limit) && (
              <div className={styles.usageStats}>
                <div className={styles.usageLabel}>
                  <span>💬 Chat-Nutzung</span>
                  {usage.remaining < usage.limit * 0.2 && (
                    <span className={styles.warningBadge}>Niedrig</span>
                  )}
                </div>
                <div className={styles.usageBar}>
                  <div
                    className={styles.usageProgress}
                    style={{
                      width: `${Math.min(100, (usage.current / usage.limit) * 100)}%`,
                      backgroundColor: usage.remaining < usage.limit * 0.2 ? '#ef4444' : '#3b82f6',
                    }}
                  />
                </div>
                <div className={styles.usageText}>
                  <span className={styles.usageCount}>
                    {usage.current} / {usage.limit} Nachrichten
                  </span>
                  {usage.resetDate && (
                    <span className={styles.resetDate}>
                      Reset: {new Date(usage.resetDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
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
                <>
                  <button
                    className={styles.ghostButton}
                    onClick={exportChat}
                    title="Chat exportieren"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
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
                </>
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

          <div className={styles.inputBarContainer}>
            {/* ==========================================
                UPLOADED CONTRACTS & SMART QUESTIONS
                ========================================== */}
            {active && ((active.attachments && active.attachments.length > 0) || smartQuestions.length > 0) && (
              <div className={styles.uploadSection}>
                {/* Show uploaded contracts */}
                {active.attachments && active.attachments.length > 0 && (
                  <div className={styles.uploadedContracts}>
                    {active.attachments.map((att, idx) => (
                      <div key={idx} className={styles.contractChip}>
                        <span className={styles.contractIcon}>📄</span>
                        <div className={styles.contractInfo}>
                          <span className={styles.contractName}>{att.name}</span>
                          {att.contractType && (
                            <span className={styles.contractType}>{att.contractType}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Smart Questions */}
                {smartQuestions.length > 0 && (
                  <div className={styles.smartQuestions}>
                    <div className={styles.smartQuestionsHeader}>
                      <span className={styles.lightbulbIcon}>💡</span>
                      <span className={styles.smartQuestionsTitle}>Vertragsspezifische Fragen:</span>
                    </div>
                    <div className={styles.chipRow}>
                      {smartQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          className={styles.chip}
                          onClick={() => {
                            setInput(q);
                            inputRef.current?.focus();
                          }}
                          disabled={loading}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className={`${styles.inputBar} ${dragActive ? styles.dragActive : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
            <form
              className={`${styles.form} ${active ? styles.formWithUpload : ""}`}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {/* Upload Button - only show when active chat exists */}
              {active && (
                <button
                  type="button"
                  className={styles.attachButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || loading}
                  title="PDF-Vertrag hochladen"
                >
                  {uploading ? (
                    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              )}

              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Frage zum Vertragsrecht stellen… (Shift+Enter = Zeilenumbruch)"
                disabled={loading || !active}
                rows={1}
              />

              {/* Send Button */}
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

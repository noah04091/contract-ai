// 📁 frontend/src/components/chatThread/useChatThread.ts
// Wiederverwendbarer Chat-Hook — kapselt die Logik aus pages/Chat.tsx
// (openChat/sendMessage/loadUsage + SSE-Streaming), OHNE Chat.tsx anzufassen.
//
// Drei bewusste Härtungen gegenüber dem Original:
//  (a) AbortController: erneutes Senden / Unmount / Schließen bricht den
//      laufenden fetch + Reader sauber ab (kein Geister-Stream im Drawer).
//  (b) Gepufferter SSE-Parser: Chunks landen in einem String-Buffer, Frames
//      werden erst bei vollständigem "\n\n" verarbeitet — SSE-Frames können
//      über TCP-Chunk-Grenzen splitten (das naive chunk.split("\n\n") des
//      Originals verliert dann Deltas).
//  (c) payload.error wird NICHT geschluckt: das error-Event des Servers setzt
//      den error-State (im Original degradierte der parse-catch es zu einem
//      console.warn, weil throw im try des JSON.parse landete).

import { useCallback, useEffect, useRef, useState } from "react";

const API = "/api/chat";

// ✅ Helper für Auth-Header (identisch zu pages/Chat.tsx)
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }),
  };
}

export type ChatThreadMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  meta?: Record<string, unknown>;
};

export type ChatThreadAttachment = {
  name: string;
  s3Key?: string;
  contractType?: string;
  smartQuestions?: string[];
  uploadedAt?: string;
};

// Format von GET /api/chat/usage/stats:
// { current, limit, remaining, resetDate, unlimited? } — limit kann null sein
// (= unbegrenzt, Backend serialisiert Infinity als null).
export type ChatUsageStats = {
  current: number;
  limit: number | null;
  remaining: number | null;
  resetDate?: string;
  unlimited?: boolean;
};

export type ChatLimitReached = {
  limit: number | null;
  current: number | null;
};

type SsePayload = {
  delta?: string;
  done?: boolean;
  followUpQuestions?: string[];
  error?: string;
};

export function useChatThread() {
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [attachments, setAttachments] = useState<ChatThreadAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [smartQuestions, setSmartQuestions] = useState<string[]>([]);
  const [usage, setUsage] = useState<ChatUsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<ChatLimitReached | null>(null);

  const chatIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // ✅ Härtung (a): laufenden Stream jederzeit abbrechbar machen.
  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Unmount-Cleanup: offener fetch + Reader werden abgebrochen (wichtig für
  // den Drawer — Schließen unmountet ChatThread und damit diesen Hook).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch(`${API}/usage/stats`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load usage");
      const data: ChatUsageStats = await res.json();
      if (mountedRef.current) setUsage(data);
    } catch (err) {
      // Usage ist rein informativ — kein error-State, nur Log (wie Original).
      console.error("❌ Error loading chat usage:", err);
    }
  }, []);

  const openChat = useCallback(async (chatId: string) => {
    chatIdRef.current = chatId;
    setError(null);
    setLimitReached(null);
    try {
      const res = await fetch(`${API}/${chatId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Chat konnte nicht geladen werden.");
      const chat: { messages?: ChatThreadMessage[]; attachments?: ChatThreadAttachment[] } =
        await res.json();
      // Antwort verwerfen, wenn inzwischen ein anderer Chat geöffnet wurde.
      if (!mountedRef.current || chatIdRef.current !== chatId) return;
      setMessages(Array.isArray(chat.messages) ? chat.messages : []);
      const atts = Array.isArray(chat.attachments) ? chat.attachments : [];
      setAttachments(atts);
      // Vertragsspezifische Fragen aus dem jüngsten Attachment vorbelegen
      // (auf der Chat-Seite kommen sie aus Upload/SSE — hier öffnen wir einen
      // bestehenden Chat, also aus den gespeicherten Attachment-Daten).
      const withQuestions = [...atts]
        .reverse()
        .find((a) => Array.isArray(a.smartQuestions) && a.smartQuestions.length > 0);
      setSmartQuestions(withQuestions?.smartQuestions ?? []);
    } catch (err) {
      console.error("❌ Error opening chat:", err);
      if (mountedRef.current && chatIdRef.current === chatId) {
        setError(err instanceof Error ? err.message : "Chat konnte nicht geladen werden.");
      }
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const chatId = chatIdRef.current;
      if (!chatId || !text.trim()) return;

      // ✅ Härtung (a): evtl. noch laufenden Stream abbrechen, bevor der neue startet.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);

      // Optimistisch: User-Message + leere Assistant-Message anhängen (wie Original).
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "" },
      ]);
      setLoading(true);

      // Leere optimistische Assistant-Bubble wieder entfernen (Fehlerfälle).
      const dropEmptyAssistant = () => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            return prev.slice(0, -1);
          }
          return prev;
        });
      };

      try {
        const res = await fetch(`${API}/${chatId}/message`, {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: text }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorData: { error?: string; message?: string; limit?: number; current?: number } = {};
          try {
            errorData = await res.json();
          } catch {
            // Body war kein JSON — generischer Fehler unten.
          }

          // 403 „Chat limit reached" → eigener State, KEIN throw.
          if (res.status === 403 && errorData.error === "Chat limit reached") {
            dropEmptyAssistant();
            setLimitReached({
              limit: typeof errorData.limit === "number" ? errorData.limit : null,
              current: typeof errorData.current === "number" ? errorData.current : null,
            });
            return;
          }

          throw new Error(errorData.message || "Nachricht konnte nicht gesendet werden.");
        }

        // ✅ SSE-STREAMING mit gepuffertem Parser (Härtung b).
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let buffer = "";
        let streamError: string | null = null;

        const processFrame = (frame: string) => {
          // Ein SSE-Frame kann mehrere Zeilen enthalten; data-Zeilen sammeln.
          const dataLines = frame
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim());
          if (dataLines.length === 0) return;

          let payload: SsePayload;
          try {
            payload = JSON.parse(dataLines.join("\n"));
          } catch (parseError) {
            console.warn("Failed to parse SSE frame:", parseError);
            return;
          }

          // ✅ Härtung (c): error-Event setzt den error-State — außerhalb des
          // parse-try, damit es nicht als „Parse-Fehler" verschluckt wird.
          if (payload.error) {
            streamError = String(payload.error);
            return;
          }

          if (payload.delta) {
            assistantContent += payload.delta;
            // Letzte (Assistant-)Message in Echtzeit ersetzen.
            setMessages((prev) => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
              return msgs;
            });
          }

          // ✅ Follow-up-Fragen aus dem done-Signal.
          if (payload.done && payload.followUpQuestions && payload.followUpQuestions.length > 0) {
            setSmartQuestions(payload.followUpQuestions);
          }
        };

        while (reader) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Nur VOLLSTÄNDIGE Frames ("\n\n") verarbeiten, Rest im Buffer behalten.
          let idx = buffer.indexOf("\n\n");
          while (idx !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            processFrame(frame);
            if (streamError) break;
            idx = buffer.indexOf("\n\n");
          }

          if (streamError) {
            try {
              await reader.cancel();
            } catch {
              // Reader war ggf. schon zu — egal.
            }
            break;
          }
        }

        // Restbuffer (letztes Frame ohne abschließendes "\n\n") noch verarbeiten.
        if (!streamError && buffer.trim().length > 0) {
          processFrame(buffer);
        }

        if (streamError) {
          dropEmptyAssistant();
          setError(streamError);
        }

        // Usage-Stats aktualisieren (wie Original).
        await loadUsage();
      } catch (err: unknown) {
        // Absichtlicher Abbruch (neues send / Unmount / Drawer zu) → kein Fehler.
        if (err instanceof Error && err.name === "AbortError") return;

        console.error("❌ Error sending message:", err);
        // Wenn inzwischen ein neuer send läuft, dessen State nicht anfassen.
        if (abortRef.current !== controller) return;
        dropEmptyAssistant();
        setError(err instanceof Error ? err.message : "Nachricht konnte nicht gesendet werden.");
      } finally {
        // Nur zurücksetzen, wenn dieser Aufruf noch der aktuelle ist —
        // sonst würde der abgebrochene Alt-Aufruf das loading des neuen killen.
        if (abortRef.current === controller) {
          abortRef.current = null;
          if (mountedRef.current) setLoading(false);
        }
      }
    },
    [loadUsage]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    attachments,
    loading,
    smartQuestions,
    usage,
    error,
    limitReached,
    openChat,
    sendMessage,
    loadUsage,
    abort,
    clearError,
  };
}

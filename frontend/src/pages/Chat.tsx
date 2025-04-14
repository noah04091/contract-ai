import { useEffect, useState } from "react";
import styles from "../styles/Chat.module.css";
import PremiumNotice from "../components/PremiumNotice";

interface Message {
  from: "user" | "ai" | "system";
  text: string;
}

export default function Chat() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // ✅ Abostatus prüfen
  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");
        const data = await res.json();

        if (!cancelled) {
          setIsPremium(data.subscriptionActive === true || data.isPremium === true);
        }
      } catch (err) {
        console.error("❌ Fehler beim Abostatus:", err);
        if (!cancelled) setIsPremium(false);
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Vertrag hochladen
  const handleUpload = async () => {
    if (!file) return alert("Bitte eine PDF-Datei auswählen.");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessages([{ from: "system", text: "📄 Vertrag erfolgreich geladen. Stelle nun deine Fragen!" }]);
      setContractLoaded(true);
    } catch (err: any) {
      alert("❌ Fehler beim Upload: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Frage stellen
  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);

    const userMessage: Message = { from: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    try {
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const aiMessage: Message = { from: "ai", text: data.answer };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      alert("❌ Fehler bei der Anfrage: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ⏳ Ladeanzeige beim Status-Check
  if (isPremium === null) return <p style={{ padding: "2rem" }}>⏳ Lade...</p>;

  return (
    <div className={styles.container}>
      <h2>💬 Vertrag-Chat</h2>
      {!isPremium && <PremiumNotice />}
      <p>Lade einen Vertrag hoch und stelle Fragen – die KI antwortet dir!</p>

      {!contractLoaded && (
        <>
          <input
            type="file"
            accept="application/pdf"
            disabled={!isPremium}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button onClick={handleUpload} disabled={!file || loading || !isPremium}>
            {loading ? "⏳ Lade hoch..." : "📤 Vertrag hochladen"}
          </button>
        </>
      )}

      {contractLoaded && (
        <>
          <div className={styles.chatBox}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  msg.from === "user"
                    ? styles.user
                    : msg.from === "ai"
                    ? styles.ai
                    : styles.system
                }`}
              >
                <strong>
                  {msg.from === "user"
                    ? "👤 Du"
                    : msg.from === "ai"
                    ? "🤖 KI"
                    : "ℹ️ System"}
                  :
                </strong>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          <div className={styles.inputRow}>
            <input
              type="text"
              value={question}
              placeholder="Frage stellen..."
              disabled={!isPremium}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim() || !isPremium}
            >
              Senden
            </button>
          </div>
        </>
      )}
    </div>
  );
}

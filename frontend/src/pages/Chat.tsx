import { useEffect, useState } from "react";
import styles from "../styles/Chat.module.css";
import PremiumNotice from "../components/PremiumNotice";
import API_BASE_URL from "../utils/api";

export default function Chat() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // ✅ Abostatus vom Server laden
  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return setIsPremium(false);

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: token,
          },
        });

        const data = await res.json();
        setIsPremium(data.subscriptionActive === true);
      } catch (err) {
        console.error("❌ Fehler beim Laden des Abostatus:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
  }, []);

  const handleUpload = async () => {
    if (!file) return alert("Bitte eine PDF-Datei auswählen.");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://contract-ai-backend.onrender.com/chat/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessages([
        { from: "system", text: "📄 Vertrag erfolgreich geladen. Stelle nun deine Fragen!" },
      ]);
      setContractLoaded(true);
    } catch (err: any) {
      alert("❌ Fehler beim Upload: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);
    const userMessage = { from: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    try {
      const res = await fetch("https://contract-ai-backend.onrender.com/chat/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const aiMessage = { from: "ai", text: data.answer };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      alert("❌ Fehler bei der Anfrage: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
              disabled={loading || !question || !isPremium}
            >
              Senden
            </button>
          </div>
        </>
      )}
    </div>
  );
}

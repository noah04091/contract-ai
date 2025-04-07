// 📁 src/pages/ForgotPassword.tsx
import { useState } from "react";
import styles from "../styles/Auth.module.css";
import { Mail } from "lucide-react";
import Notification from "../components/Notification";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
        const res = await fetch("http://localhost:5000/auth/forgot-password", {
            method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({ message: "✅ E-Mail zum Zurücksetzen wurde generiert!", type: "success" });
        setEmail("");
      } else {
        setNotification({ message: "❌ " + data.message, type: "error" });
      }
    } catch (err) {
      setNotification({ message: "❌ Fehler beim Senden der Reset-E-Mail", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <h2>🔑 Passwort vergessen</h2>
      <form onSubmit={handleRequestReset} className={styles.authForm}>
        <div className={styles.inputGroup}>
          <Mail className={styles.inputIcon} />
          <input
            type="email"
            className={styles.input}
            placeholder="Deine E-Mail-Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={styles.authButton} disabled={loading}>
          {loading ? "⏳ Senden..." : "📩 Zurücksetzen anfordern"}
        </button>
      </form>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

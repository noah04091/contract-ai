// 📁 src/pages/Register.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import Notification from "../components/Notification";
import { FaEnvelope, FaLock } from "react-icons/fa";
import API_BASE_URL from "../utils/api"; // ✅ zentrale API-URL

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type?: "success" | "error";
  } | null>(null);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("➡️ Registrierung absenden:", { email, password });

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("⬅️ Server-Antwort:", data);

      if (res.ok) {
        setNotification({ message: "✅ Registrierung erfolgreich!", type: "success" });
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setNotification({ message: "❌ " + data.message, type: "error" });
      }
    } catch (err) {
      console.error("❌ Fehler bei Registrierung:", err);
      setNotification({ message: "❌ Verbindung fehlgeschlagen", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <h2>📝 Registrieren</h2>

      <form onSubmit={handleRegister} className={styles.authForm}>
        <div className={styles.inputGroup}>
          <FaEnvelope className={styles.inputIcon} />
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <FaLock className={styles.inputIcon} />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.authButton} disabled={loading}>
          {loading ? "⏳ Wird erstellt..." : "🚀 Konto erstellen"}
        </button>
      </form>

      <p>
        Bereits ein Konto?{" "}
        <span className={styles.linkText} onClick={() => navigate("/login")}>
          Login
        </span>
      </p>

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

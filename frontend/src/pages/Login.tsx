// 📁 src/pages/Login.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import { Mail, Lock } from "lucide-react";
import Notification from "../components/Notification";
import API_BASE_URL from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const navigate = useNavigate();
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("⬅️ Server-Antwort:", data);

      if (res.ok) {
        setNotification({ message: "✅ Login erfolgreich!", type: "success" });
        redirectTimeout.current = setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      } else {
        setNotification({ message: "❌ " + (data.message || "Unbekannter Fehler"), type: "error" });
      }
    } catch (err) {
      console.error("❌ Fehler beim Login:", err);
      setNotification({ message: "❌ Server nicht erreichbar", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
    };
  }, []);

  return (
    <div className={styles.authContainer}>
      <h2>🔐 Login</h2>

      <form onSubmit={handleLogin} className={styles.authForm}>
        <div className={styles.inputGroup}>
          <Mail className={styles.inputIcon} />
          <input
            type="email"
            className={styles.input}
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.inputGroup}>
          <Lock className={styles.inputIcon} />
          <input
            type="password"
            className={styles.input}
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className={styles.authButton} disabled={loading}>
          {loading ? "⏳ Login läuft..." : "➡️ Einloggen"}
        </button>
      </form>

      <p>
        Noch kein Konto?{" "}
        <span className={styles.linkText} onClick={() => navigate("/register")}>
          Registrieren
        </span>
      </p>

      <p>
        Passwort vergessen?{" "}
        <span className={styles.linkText} onClick={() => navigate("/forgot-password")}>
          Zurücksetzen
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

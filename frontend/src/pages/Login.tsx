import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import { Mail, Lock } from "lucide-react";
import Notification from "../components/Notification";
import API_BASE_URL from "../utils/api"; // ✅ API URL zentral importiert

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        setNotification({ message: "✅ Login erfolgreich!", type: "success" });

        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        setNotification({ message: "❌ " + data.message, type: "error" });
      }
    } catch (err) {
      setNotification({ message: "❌ Fehler beim Login", type: "error" });
    }
  };

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
          />
        </div>

        <button type="submit" className={styles.authButton}>
          ➡️ Einloggen
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
        <span onClick={() => navigate("/forgot-password")} className={styles.linkText}>
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

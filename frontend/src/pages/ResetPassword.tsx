// 📁 src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import Notification from "../components/Notification";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [token, setToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromURL = urlParams.get("token");
    if (tokenFromURL) {
      setToken(tokenFromURL);
    } else {
      setNotification({ message: "❌ Ungültiger Link", type: "error" });
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://https://contract-ai-backend.onrender.com/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "✅ Passwort erfolgreich geändert!", type: "success" });
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setNotification({ message: "❌ " + data.message, type: "error" });
      }
    } catch (err) {
      setNotification({ message: "❌ Fehler beim Zurücksetzen", type: "error" });
    }
  };

  return (
    <div className={styles.authContainer}>
      <h2>🔁 Neues Passwort setzen</h2>
      <form onSubmit={handleReset} className={styles.authForm}>
        <input
          type="password"
          placeholder="Neues Passwort"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={styles.input}
          required
        />
        <button type="submit" className={styles.authButton}>
          💾 Passwort speichern
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

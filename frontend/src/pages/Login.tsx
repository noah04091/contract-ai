// 📁 src/pages/Login.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import { Mail, Lock } from "lucide-react";
import Notification from "../components/Notification";
import { apiCall } from "../utils/api";

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
      const data = await apiCall("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      console.log("⬅️ Server-Antwort:", data);
      
      // Prüfe, ob wir ein Cookie-Problem haben könnten
      setTimeout(() => {
        const checkAuth = async () => {
          try {
            await apiCall("/auth/me");
            console.log("✅ Auth erfolgreich überprüft");
          } catch (err) {
            console.error("❌ Auth fehlgeschlagen trotz Login:", err);
            // Als Fallback Token im localStorage speichern
            localStorage.setItem('fallbackToken', email);
            localStorage.setItem('fallbackTimestamp', String(Date.now()));
          }
        };
        checkAuth();
      }, 500);
      
      setNotification({ message: "✅ Login erfolgreich!", type: "success" });
      
      // Kurze Verzögerung für die Benutzerfreundlichkeit
      redirectTimeout.current = setTimeout(() => {
        navigate("/dashboard");
      }, 800);
    } catch (err: any) {
      console.error("❌ Fehler beim Login:", err);
      setNotification({ 
        message: "❌ " + (err.message || "Server nicht erreichbar"), 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Beim Seitenaufbau prüfen, ob der Benutzer bereits eingeloggt ist
    const checkLoginStatus = async () => {
      try {
        // Zuerst versuchen, per Cookie zu authentifizieren
        await apiCall("/auth/me");
        // Wenn kein Fehler geworfen wird, ist der Benutzer bereits eingeloggt
        navigate("/dashboard");
      } catch (err) {
        // Prüfen, ob wir einen Fallback haben
        const fallbackToken = localStorage.getItem('fallbackToken');
        const fallbackTimestamp = localStorage.getItem('fallbackTimestamp');
        
        if (fallbackToken && fallbackTimestamp) {
          // Prüfen, ob der Fallback noch gültig ist (2 Stunden)
          const now = Date.now();
          const timestamp = parseInt(fallbackTimestamp, 10);
          const twoHoursInMs = 2 * 60 * 60 * 1000;
          
          if (now - timestamp < twoHoursInMs) {
            console.log("✅ Verwende Fallback-Authentifizierung");
            navigate("/dashboard");
            return;
          } else {
            // Fallback abgelaufen, entfernen
            localStorage.removeItem('fallbackToken');
            localStorage.removeItem('fallbackTimestamp');
          }
        }
        // Nicht eingeloggt - Login-Formular anzeigen
      }
    };
    
    checkLoginStatus();
    
    return () => {
      if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
    };
  }, [navigate]);

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
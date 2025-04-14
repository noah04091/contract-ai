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
      // Direkter fetch statt apiCall für maximale Kontrolle über die Anfrage
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Cookies mitsenden/empfangen
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("⬅️ Server-Antwort:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login fehlgeschlagen");
      }

      // Token sichern, falls Cookie nicht funktioniert
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authEmail', email);
        localStorage.setItem('authTimestamp', String(Date.now()));
        console.log("🔑 Token im localStorage gespeichert");
      }

      setNotification({ message: "✅ Login erfolgreich!", type: "success" });
      
      // Nach dem Login prüfen, ob das Auth-Cookie funktioniert
      setTimeout(async () => {
        try {
          const authCheck = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            credentials: "include", // Cookies mitsenden
          });
          
          if (authCheck.ok) {
            console.log("✅ Cookie-Authentifizierung funktioniert");
          } else {
            console.warn("⚠️ Cookie-Authentifizierung fehlgeschlagen, Fallback wird verwendet");
          }
        } catch (err) {
          console.error("❌ Authentifizierungsprüfung fehlgeschlagen:", err);
        }
      }, 500);

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
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        
        if (response.ok) {
          console.log("✅ Bereits eingeloggt via Cookie");
          navigate("/dashboard");
          return;
        }
        
        // Falls Cookie-Auth fehlschlägt, Fallback prüfen
        const authToken = localStorage.getItem('authToken');
        const authTimestamp = localStorage.getItem('authTimestamp');
        
        if (authToken && authTimestamp) {
          const now = Date.now();
          const timestamp = parseInt(authTimestamp, 10);
          const twoHoursInMs = 2 * 60 * 60 * 1000;
          
          if (now - timestamp < twoHoursInMs) {
            console.log("✅ Verwende Fallback-Token");
            
            // Mit Token als Authorization-Header prüfen
            const authResponse = await fetch(`${API_BASE_URL}/auth/me`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${authToken}`
              }
            });
            
            if (authResponse.ok) {
              console.log("✅ Fallback-Authentifizierung erfolgreich");
              navigate("/dashboard");
              return;
            } else {
              console.warn("❌ Fallback-Token ungültig");
              // Token löschen, da er nicht mehr gültig ist
              localStorage.removeItem('authToken');
              localStorage.removeItem('authEmail');
              localStorage.removeItem('authTimestamp');
            }
          } else {
            // Token abgelaufen
            console.warn("❌ Fallback-Token abgelaufen");
            localStorage.removeItem('authToken');
            localStorage.removeItem('authEmail');
            localStorage.removeItem('authTimestamp');
          }
        }
        
        // Nicht eingeloggt - Login-Formular anzeigen
        console.log("ℹ️ Nicht eingeloggt, Login-Formular wird angezeigt");
      } catch (err) {
        console.error("❌ Fehler bei Authentifizierungsprüfung:", err);
        // Bei Fehlern sicherheitshalber auf Login-Seite bleiben
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
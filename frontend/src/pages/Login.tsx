// 📁 src/pages/Login.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import { Mail, Lock } from "lucide-react";
import Notification from "../components/Notification";

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("⬅️ Server-Antwort:", data);

      console.log("🍪 Response-Headers:",
        [...(response.headers as any).entries()].reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {})
      );

      if (!response.ok) {
        throw new Error(data.message || "Login fehlgeschlagen");
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authEmail", email);
        localStorage.setItem("authTimestamp", String(Date.now()));
        console.log("🔑 Token im localStorage gespeichert");
      }

      setNotification({ message: "✅ Login erfolgreich!", type: "success" });

      setTimeout(async () => {
        try {
          console.log("🔍 Cookie-Diagnose nach Login:");
          console.log("document.cookie:", document.cookie);

          const authCheckWithCookies = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
          });

          console.log("Status (mit Cookies):", authCheckWithCookies.status);

          if (authCheckWithCookies.ok) {
            console.log("✅ Cookie-Authentifizierung funktioniert");
          } else {
            console.warn("⚠️ Cookie-Authentifizierung fehlgeschlagen, Fallback wird verwendet");

            if (data.token) {
              console.log("🔍 Test: /auth/me mit Authorization Header");
              const authCheckWithHeader = await fetch("/api/auth/me", {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${data.token}`,
                },
              });

              console.log("Status (mit Auth-Header):", authCheckWithHeader.status);

              if (authCheckWithHeader.ok) {
                console.log("✅ Header-Authentifizierung funktioniert");
              } else {
                console.error("❌ Beide Authentifizierungsmethoden fehlgeschlagen");
              }
            }
          }

          try {
            console.log("🔍 Test: /debug Endpunkt");
            const debugResponse = await fetch("/api/debug", {
              method: "GET",
              credentials: "include",
            });

            const debugData = await debugResponse.json();
            console.log("Debug-Endpunkt Response:", debugData);
          } catch (debugErr) {
            console.error("Debug-Endpunkt-Fehler:", debugErr);
          }
        } catch (err) {
          console.error("❌ Diagnose-Fehler:", err);
        }
      }, 500);

      redirectTimeout.current = setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error("❌ Fehler beim Login:", err);
      setNotification({ message: "❌ " + (err.message || "Server nicht erreichbar"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          console.log("✅ Bereits eingeloggt via Cookie");
          navigate("/dashboard");
          return;
        }

        const authToken = localStorage.getItem("authToken");
        const authTimestamp = localStorage.getItem("authTimestamp");

        if (authToken && authTimestamp) {
          const now = Date.now();
          const timestamp = parseInt(authTimestamp, 10);
          const twoHoursInMs = 2 * 60 * 60 * 1000;

          if (now - timestamp < twoHoursInMs) {
            console.log("✅ Verwende Fallback-Token");

            const authResponse = await fetch("/api/auth/me", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });

            if (authResponse.ok) {
              console.log("✅ Fallback-Authentifizierung erfolgreich");
              navigate("/dashboard");
              return;
            } else {
              console.warn("❌ Fallback-Token ungültig");
              localStorage.removeItem("authToken");
              localStorage.removeItem("authEmail");
              localStorage.removeItem("authTimestamp");
            }
          } else {
            console.warn("❌ Fallback-Token abgelaufen");
            localStorage.removeItem("authToken");
            localStorage.removeItem("authEmail");
            localStorage.removeItem("authTimestamp");
          }
        }

        console.log("🔍 Cookie-Diagnose beim Laden:");
        console.log("document.cookie:", document.cookie);
        console.log("ℹ️ Nicht eingeloggt, Login-Formular wird angezeigt");
      } catch (err) {
        console.error("❌ Fehler bei Authentifizierungsprüfung:", err);
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
        <span className={styles.linkText} onClick={() => navigate("/register")}>Registrieren</span>
      </p>

      <p>
        Passwort vergessen?{" "}
        <span className={styles.linkText} onClick={() => navigate("/forgot-password")}>Zurücksetzen</span>
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

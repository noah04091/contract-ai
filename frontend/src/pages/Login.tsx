import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/AppleAuth.css";

interface AuthResponse {
  token?: string;
  message?: string;
  email?: string;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const navigate = useNavigate();
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setUser } = useAuth();

  // Funktion, um Benutzerdaten vom Server zu holen
  const fetchUserData = async () => {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error("Fehler beim Abrufen der Benutzerdaten");
    }
    
    return await response.json();
  };

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

      const data: AuthResponse = await response.json();
      console.log("⬅️ Server-Antwort:", data);

      console.log("🍪 Response-Headers:",
        Object.fromEntries(response.headers.entries())
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

      setNotification({ message: "Login erfolgreich", type: "success" });
      
      // ✅ Vollständige Benutzerdaten vom Server holen
      const userData = await fetchUserData();
      setUser(userData);

      setTimeout(async () => {
        try {
          console.log("🔍 Cookie-Diagnose nach Login:");
          console.log("document.cookie:", document.cookie);

          const authCheckWithCookies = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
          });

          console.log("Status (mit Cookies):", authCheckWithCookies.status);

          if (!authCheckWithCookies.ok && data.token) {
            console.warn("⚠️ Cookie-Auth fehlgeschlagen – teste Auth-Header");

            const authCheckWithHeader = await fetch("/api/auth/me", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            });

            console.log("Status (mit Auth-Header):", authCheckWithHeader.status);
          }

          try {
            const debugResponse = await fetch("/api/debug", {
              method: "GET",
              credentials: "include",
            });
            const debugData = await debugResponse.json();
            console.log("Debug-Endpunkt Response:", debugData);
          } catch (debugError) {
            console.error("Debug-Endpunkt-Fehler:", debugError);
          }
        } catch (diagnoseError) {
          console.error("❌ Diagnose-Fehler:", diagnoseError);
        }
      }, 500);

      redirectTimeout.current = setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      const err = error as Error;
      console.error("❌ Fehler beim Login:", err);
      setNotification({ message: err.message || "Server nicht erreichbar", type: "error" });
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
          // Hole die Benutzerdaten und aktualisiere den Auth-Kontext
          const userData = await response.json();
          setUser(userData);
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
              console.log("✅ Fallback-Auth erfolgreich");
              // Hole die Benutzerdaten und aktualisiere den Auth-Kontext
              const userData = await authResponse.json();
              setUser(userData);
              navigate("/dashboard");
              return;
            } else {
              localStorage.removeItem("authToken");
              localStorage.removeItem("authEmail");
              localStorage.removeItem("authTimestamp");
            }
          } else {
            localStorage.removeItem("authToken");
            localStorage.removeItem("authEmail");
            localStorage.removeItem("authTimestamp");
          }
        }

        console.log("🔍 Cookie-Diagnose beim Laden:");
        console.log("document.cookie:", document.cookie);
      } catch (error) {
        const err = error as Error;
        console.error("❌ Fehler bei Auth-Prüfung:", err.message);
      }
    };

    checkLoginStatus();

    // Add parallax effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      const moveX = (mouseX - centerX) / 20;
      const moveY = (mouseY - centerY) / 20;
      
      const card = container.querySelector('.apple-auth-card') as HTMLElement;
      if (card) {
        card.style.transform = `perspective(1000px) rotateY(${moveX * 0.2}deg) rotateX(${-moveY * 0.2}deg) translateZ(10px)`;
      }

      const shapes = container.querySelectorAll('.shape');
      shapes.forEach((shape, index) => {
        const element = shape as HTMLElement;
        const speed = index % 2 === 0 ? 0.05 : 0.03;
        const offsetX = moveX * speed * (index + 1);
        const offsetY = moveY * speed * (index + 1);
        element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (redirectTimeout.current) clearTimeout(redirectTimeout.current);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [navigate, setUser]);

  return (
    <div className="apple-auth-container" ref={containerRef}>
      <div className="apple-bg">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="apple-auth-card">
        <div className="apple-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
            <circle cx="12" cy="13" r="3"></circle>
          </svg>
        </div>
        
        <h1 className="apple-auth-title">Bei Contract AI anmelden</h1>
        <p className="apple-auth-subtitle">Geben Sie Ihre Anmeldedaten ein, um fortzufahren</p>
        
        <form onSubmit={handleLogin} className="apple-auth-form">
          <div className={`apple-input-group ${emailFocused || email ? 'focused' : ''}`}>
            <label htmlFor="email">E-Mail</label>
            <div className="apple-input-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 17.5l-4 2.5v-5l4-2.5v5z"></path>
                <path d="M14 17.5l-4 2.5v-5l4-2.5v5z"></path>
                <path d="M6 17.5l-4 2.5v-5l4-2.5v5z"></path>
                <path d="M14 8V6c0-1.1-.9-2-2-2s-2 .9-2 2v2"></path>
                <path d="M6 8V6c0-1.1.9-2 2-2s2 .9 2 2v2"></path>
                <path d="M10 20h4"></path>
                <path d="M16 14c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z"></path>
              </svg>
              <input 
                type="email" 
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          
          <div className={`apple-input-group ${passwordFocused || password ? 'focused' : ''}`}>
            <label htmlFor="password">Passwort</label>
            <div className="apple-input-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <line x1="12" y1="15" x2="12" y2="19"></line>
              </svg>
              <input 
                type="password" 
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          
          <button type="submit" className={`apple-auth-button ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <span className="button-text">Anmelden</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </>
            )}
          </button>
        </form>
        
        <div className="apple-auth-links">
          <p>
            Noch kein Konto? 
            <span className="apple-link" onClick={() => navigate("/register")}>
              Registrieren
            </span>
          </p>
          <p>
            Passwort vergessen?
            <span className="apple-link" onClick={() => navigate("/forgot-password")}>
              Zurücksetzen
            </span>
          </p>
        </div>
      </div>
      
      {notification && (
        <div className={`apple-notification ${notification.type}`}>
          <div className="apple-notification-content">
            <span className="notification-icon">
              {notification.type === "success" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
            </span>
            <p>{notification.message}</p>
          </div>
          <button 
            className="apple-notification-close"
            onClick={() => setNotification(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
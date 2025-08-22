import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";;
import "../styles/AppleAuth.css";

interface AuthResponse {
  token?: string;
  message?: string;
  email?: string;
  requiresVerification?: boolean; // ✅ Double-Opt-In Flag
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);
  const navigate = useNavigate();
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { refetchUser } = useAuth();

  // ✅ E-Mail-Verification States
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ✅ E-Mail-Verification senden
  const sendVerificationEmail = async (emailToVerify: string) => {
    try {
      const response = await fetch("/api/email-verification/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: emailToVerify }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("✅ Verification-E-Mail gesendet:", data);
        return { success: true, message: data.message };
      } else {
        console.error("❌ Fehler beim E-Mail-Versand:", data);
        return { success: false, message: data.message || "Fehler beim Senden der E-Mail" };
      }
    } catch (error) {
      console.error("❌ Network error beim E-Mail-Versand:", error);
      return { success: false, message: "Verbindung fehlgeschlagen" };
    }
  };

  // ✅ Resend E-Mail mit Cooldown
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    
    setResendLoading(true);
    
    const result = await sendVerificationEmail(verificationEmail);
    
    if (result.success) {
      setNotification({ 
        message: "Bestätigungs-E-Mail wurde erneut gesendet", 
        type: "success" 
      });
      
      // 60 Sekunden Cooldown
      setResendCooldown(60);
      const countdown = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setNotification({ 
        message: result.message, 
        type: "error" 
      });
    }
    
    setResendLoading(false);
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
        // ✅ VERBESSERT: Double-Opt-In Check mit besserer UX
        if (data.requiresVerification) {
          setShowVerificationPrompt(true);
          setVerificationEmail(data.email || email);
          setNotification({ 
            message: "E-Mail-Adresse noch nicht bestätigt. Bitte prüfen Sie Ihr Postfach.", 
            type: "info" // ✅ "info" statt "warning" - weniger alarmierend
          });
          setLoading(false);
          return;
        }
        
        throw new Error(data.message || "Login fehlgeschlagen");
      }

      // ✅ CRITICAL FIX: Token NICHT mehr in localStorage speichern
      // Cookie-Auth wird vom Backend gesetzt und automatisch mitgesendet
      if (data.token) {
        console.log("✅ Auth-Cookie wurde vom Backend gesetzt");
        // Nur Email für UI-Zwecke speichern
        localStorage.setItem("authEmail", email);
        localStorage.setItem("authTimestamp", String(Date.now()));
      }

      setNotification({ message: "Login erfolgreich", type: "success" });
      
      // ✅ Verwende refetchUser anstatt setUser direkt
      await refetchUser();

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
          // Verwende refetchUser anstatt setUser direkt
          await refetchUser();
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
              // Verwende refetchUser anstatt setUser direkt
              await refetchUser();
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
  }, [navigate, refetchUser]);

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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
        </div>
        
        {/* ✅ Conditional Title basierend auf Verification-Status */}
        <h1 className="apple-auth-title">
          {showVerificationPrompt ? "E-Mail bestätigen" : "Bei Contract AI anmelden"}
        </h1>
        <p className="apple-auth-subtitle">
          {showVerificationPrompt 
            ? `Bitte bestätigen Sie Ihre E-Mail-Adresse, um sich anmelden zu können.`
            : "Geben Sie Ihre Anmeldedaten ein, um fortzufahren"
          }
        </p>
        
        {/* ✅ Bestehende Form - nur anzeigen wenn keine Verification nötig */}
        {!showVerificationPrompt && (
          <form onSubmit={handleLogin} className="apple-auth-form">
            <div className={`apple-input-group ${emailFocused || email ? 'focused' : ''}`}>
              <label htmlFor="email">E-Mail</label>
              <div className="apple-input-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
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
        )}

        {/* ✅ VERBESSERTE E-Mail-Verification Prompt */}
        {showVerificationPrompt && (
          <div className="apple-email-verification" style={{ textAlign: 'center' }}>
            {/* ✅ FREUNDLICHERES Icon */}
            <div className="verification-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
                borderRadius: '50%', 
                width: '80px', 
                height: '80px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
            </div>
            
            {/* ✅ E-Mail Badge */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
              border: '1px solid #10b981',
              padding: '12px 20px',
              borderRadius: '50px',
              margin: '20px 0',
              color: '#065f46',
              fontWeight: '600'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>{verificationEmail}</span>
            </div>
            
            <div className="verification-message" style={{ margin: '20px 0', color: '#1f2937' }}>
              <p style={{ fontSize: '16px', lineHeight: '1.5' }}>
                Haben Sie die Bestätigungs-E-Mail nicht erhalten?
                <br />
                <strong>Schauen Sie auch in Ihren Spam-Ordner!</strong>
              </p>
            </div>
            
            <div className="verification-actions" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              alignItems: 'center',
              margin: '30px 0'
            }}>
              <button 
                className={`apple-auth-button primary ${resendLoading ? 'loading' : ''}`}
                onClick={handleResendEmail}
                disabled={resendLoading || resendCooldown > 0}
                style={{ width: '100%', maxWidth: '300px' }}
              >
                {resendLoading ? (
                  <span className="loading-spinner"></span>
                ) : resendCooldown > 0 ? (
                  <span>E-Mail erneut senden ({resendCooldown}s)</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                    <span>Bestätigungs-E-Mail erneut senden</span>
                  </>
                )}
              </button>
              
              <button 
                className="apple-auth-button secondary"
                onClick={() => {
                  setShowVerificationPrompt(false);
                  setNotification(null);
                }}
                style={{ width: '100%', maxWidth: '300px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"></path>
                  <path d="m12 19-7-7 7-7"></path>
                </svg>
                <span>Zurück zur Anmeldung</span>
              </button>
            </div>

            {/* ✅ HELPFUL TIP */}
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '15px',
              margin: '20px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <div>💡</div>
              <p style={{ 
                color: '#1f2937', 
                margin: '0', 
                fontSize: '14px',
                textAlign: 'center'
              }}>
                <strong>Tipp:</strong> Nach der Bestätigung können Sie sich sofort anmelden!
              </p>
            </div>
          </div>
        )}
        
        {/* ✅ Auth-Links - nur anzeigen wenn nicht in Verification-Mode */}
        {!showVerificationPrompt && (
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
        )}
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
              ) : notification.type === "warning" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              ) : notification.type === "info" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
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
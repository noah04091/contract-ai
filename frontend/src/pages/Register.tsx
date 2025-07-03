import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AppleAuth.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // ✅ E-Mail-Verification States
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    
    const result = await sendVerificationEmail(email);
    
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ Nach erfolgreichem Register → E-Mail-Verification senden
        console.log("✅ Registrierung erfolgreich, sende Verification-E-Mail...");
        
        const emailResult = await sendVerificationEmail(email);
        
        if (emailResult.success) {
          setShowEmailVerification(true);
          setNotification({ 
            message: "Bitte überprüfen Sie Ihre E-Mail und bestätigen Sie Ihre Registrierung.", 
            type: "info" 
          });
        } else {
          // Fallback: Registrierung war erfolgreich, aber E-Mail konnte nicht gesendet werden
          setNotification({ 
            message: "Registrierung erfolgreich, aber E-Mail konnte nicht gesendet werden. Versuchen Sie es erneut.", 
            type: "error" 
          });
          setShowEmailVerification(true); // Zeige Resend-Option
        }
      } else {
        setNotification({ message: data.message, type: "error" });
      }
    } catch (err) {
      console.error("❌ Fehler bei Registrierung:", err);
      setNotification({ message: "Verbindung fehlgeschlagen", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
            <path d="M9 12h6"></path>
            <path d="M12 9v6"></path>
          </svg>
        </div>
        
        {/* ✅ CONDITIONAL TITLE - ZENTRIERT */}
        <h1 className="apple-auth-title">
          {showEmailVerification ? "E-Mail bestätigen" : "Konto erstellen"}
        </h1>
        <p className="apple-auth-subtitle">
          {showEmailVerification 
            ? `Wir haben eine Bestätigungs-E-Mail an ${email} gesendet. Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.`
            : "Erstellen Sie ein Konto, um Contract AI nutzen zu können"
          }
        </p>
        
        {/* ✅ STANDARD REGISTER FORM - nur anzeigen wenn noch nicht verifiziert */}
        {!showEmailVerification && (
          <form onSubmit={handleRegister} className="apple-auth-form">
            <div className={`apple-input-group ${emailFocused || email ? 'focused' : ''}`}>
              <label htmlFor="email">E-Mail</label>
              <div className="apple-input-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
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
                </svg>
                <input 
                  type="password" 
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="password-hint">
                Mindestens 8 Zeichen empfohlen
              </div>
            </div>
            
            <div className="apple-terms">
              <p>
                Mit der Registrierung stimmen Sie unseren <a href="/terms" className="apple-link">Nutzungsbedingungen</a> und <a href="/privacy" className="apple-link">Datenschutzrichtlinien</a> zu.
              </p>
            </div>
            
            <button type="submit" className={`apple-auth-button ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <span className="button-text">Konto erstellen</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* ✅ E-MAIL VERIFICATION SEKTION - APPLE STYLE & ZENTRIERT */}
        {showEmailVerification && (
          <div className="email-verification-section">
            {/* ✅ ANIMATED MAIL ICON - ZENTRIERT */}
            <div className="verification-mail-icon">
              <div className="mail-animation">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <div className="mail-pulse"></div>
              </div>
            </div>

            {/* ✅ SUCCESS CHECK ICON - ZENTRIERT */}
            <div className="verification-check-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#10b981"/>
                <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {/* ✅ EMAIL BADGE - ZENTRIERT */}
            <div className="verified-email-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>{email}</span>
            </div>
            
            {/* ✅ NEXT STEPS - APPLE STYLE & ZENTRIERT */}
            <div className="verification-steps">
              <div className="step-indicator">
                <div className="step-item active">
                  <div className="step-number">1</div>
                  <span>E-Mail öffnen</span>
                </div>
                <div className="step-line"></div>
                <div className="step-item">
                  <div className="step-number">2</div>
                  <span>Link klicken</span>
                </div>
                <div className="step-line"></div>
                <div className="step-item">
                  <div className="step-number">3</div>
                  <span>Anmelden</span>
                </div>
              </div>
            </div>
            
            {/* ✅ ACTION BUTTONS - APPLE STYLE & ZENTRIERT */}
            <div className="verification-actions">
              <button 
                className={`apple-auth-button primary ${resendLoading ? 'loading' : ''} ${resendCooldown > 0 ? 'disabled' : ''}`}
                onClick={handleResendEmail}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading ? (
                  <span className="loading-spinner"></span>
                ) : resendCooldown > 0 ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>Erneut senden ({resendCooldown}s)</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                    <span>E-Mail erneut senden</span>
                  </>
                )}
              </button>
              
              <button 
                className="apple-auth-button secondary"
                onClick={() => navigate("/login")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <path d="M21 12H9"/>
                </svg>
                <span>Zur Anmeldung</span>
              </button>
            </div>

            {/* ✅ HELPFUL TIP - APPLE STYLE */}
            <div className="verification-tip">
              <div className="tip-icon">💡</div>
              <p>
                <strong>Tipp:</strong> Schauen Sie auch in Ihren Spam-Ordner, falls die E-Mail nicht in wenigen Minuten ankommt.
              </p>
            </div>
          </div>
        )}
        
        {/* ✅ AUTH LINKS - nur anzeigen wenn nicht in Verification-Mode */}
        {!showEmailVerification && (
          <div className="apple-auth-links">
            <p>
              Bereits ein Konto? 
              <span className="apple-link" onClick={() => navigate("/login")}>
                Anmelden
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
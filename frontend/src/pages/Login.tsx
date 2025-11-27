import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import "../styles/SplitAuth.css";

// Back Arrow Icon SVG
const BackArrowIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

interface AuthResponse {
  token?: string;
  message?: string;
  email?: string;
  requiresVerification?: boolean;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null);
  const { refetchUser } = useAuth();

  // E-Mail-Verification States
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // E-Mail-Verification senden
  const sendVerificationEmail = async (emailToVerify: string) => {
    try {
      const response = await fetch("/api/email-verification/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailToVerify }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Fehler beim Senden der E-Mail" };
      }
    } catch {
      return { success: false, message: "Verbindung fehlgeschlagen" };
    }
  };

  // Resend E-Mail mit Cooldown
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    const result = await sendVerificationEmail(verificationEmail);
    if (result.success) {
      setNotification({ message: "Bestätigungs-E-Mail wurde erneut gesendet", type: "success" });
      setResendCooldown(60);
      const countdown = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(countdown); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      setNotification({ message: result.message, type: "error" });
    }
    setResendLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          setShowVerificationPrompt(true);
          setVerificationEmail(data.email || email);
          setNotification({ message: "E-Mail-Adresse noch nicht bestätigt.", type: "info" });
          setLoading(false);
          return;
        }
        throw new Error(data.message || "Login fehlgeschlagen");
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authEmail", email);
        localStorage.setItem("authTimestamp", String(Date.now()));
      }

      setNotification({ message: "Login erfolgreich", type: "success" });
      await refetchUser();

      redirectTimeout.current = setTimeout(() => {
        navigate(redirectUrl);
      }, 1000);
    } catch (error) {
      const err = error as Error;
      setNotification({ message: err.message || "Server nicht erreichbar", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (response.ok) {
          await refetchUser();
          navigate(redirectUrl);
        }
      } catch { /* ignore */ }
    };
    checkLoginStatus();
    return () => { if (redirectTimeout.current) clearTimeout(redirectTimeout.current); };
  }, [navigate, refetchUser, redirectUrl]);

  // Mail Icon SVG
  const MailIcon = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  // Checkmark Icon SVG
  const CheckIcon = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  // Arrow Icon SVG
  const ArrowIcon = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );

  return (
    <>
      <Helmet>
        <title>Anmelden | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Melde dich bei Contract AI an und verwalte deine Verträge intelligent mit KI." />
      </Helmet>

      <div className="split-auth-container">
        {/* Left Side - Branding */}
        <div className="split-auth-branding blue">
          {/* Background Effects */}
          <div className="split-auth-bg-effects">
            <div className="split-auth-bg-circle-1"></div>
            <div className="split-auth-bg-circle-2"></div>
          </div>

          <div className="split-auth-branding-content">
            {/* Logo - Klickbar zur Homepage */}
            <Link to="/" className="split-auth-logo-link">
              <div className="split-auth-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo-contractai.png" alt="Contract AI" className="split-auth-logo-img" />
            </Link>

            {/* Headline */}
            <h1 className="split-auth-headline">
              Verträge intelligent<br />verwalten
            </h1>
            <p className="split-auth-subheadline">
              Die All-in-One Plattform für KI-gestützte Vertragsanalyse, Optimierung und Fristenverwaltung.
            </p>

            {/* Features */}
            <div className="split-auth-features">
              {[
                "KI-Vertragsanalyse in Sekunden",
                "Automatische Fristenverwaltung",
                "Optimierungsvorschläge",
                "Risiko-Erkennung",
              ].map((feature, i) => (
                <div key={i} className="split-auth-feature">
                  <span className="split-auth-feature-icon check"><CheckIcon /></span>
                  <span className="split-auth-feature-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="split-auth-branding-footer">
            <p className="split-auth-footer-text">
              Bereits über 1.000+ Verträge analysiert
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="split-auth-form-side">
          <div className="split-auth-form-container">

            {/* Notification */}
            {notification && (
              <div className={`split-auth-notification ${notification.type || 'info'}`}>
                <span className="split-auth-notification-icon">
                  {notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}
                </span>
                <span className="split-auth-notification-text">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="split-auth-notification-close">✕</button>
              </div>
            )}

            {!showVerificationPrompt ? (
              <>
                {/* Header */}
                <div className="split-auth-header">
                  <h2 className="split-auth-title">Willkommen zurück</h2>
                  <p className="split-auth-subtitle">Melden Sie sich an, um fortzufahren</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="split-auth-form">
                  <div className="split-auth-input-group">
                    <label htmlFor="email" className="split-auth-label">
                      E-Mail Adresse
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="split-auth-input"
                      placeholder="name@beispiel.de"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="split-auth-input-group">
                    <div className="split-auth-label-row">
                      <label htmlFor="password" className="split-auth-label">
                        Passwort
                      </label>
                      <Link to="/forgot-password" className="split-auth-forgot-link">
                        Passwort vergessen?
                      </Link>
                    </div>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="split-auth-input"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="split-auth-submit"
                  >
                    {loading ? (
                      <div className="split-auth-spinner"></div>
                    ) : (
                      <>
                        <span>Anmelden</span>
                        <ArrowIcon />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="split-auth-divider">
                  <div className="split-auth-divider-line"></div>
                  <span className="split-auth-divider-text">oder</span>
                  <div className="split-auth-divider-line"></div>
                </div>

                {/* Register Link */}
                <p className="split-auth-switch">
                  Noch kein Konto?{" "}
                  <Link to="/register">Jetzt kostenlos registrieren</Link>
                </p>
              </>
            ) : (
              /* Email Verification Prompt */
              <div className="split-auth-verification">
                <div className="split-auth-verification-icon">
                  <MailIcon />
                </div>

                <h2 className="split-auth-verification-title">E-Mail bestätigen</h2>
                <p className="split-auth-verification-text">
                  Bitte bestätigen Sie Ihre E-Mail-Adresse, um sich anmelden zu können.
                </p>

                <div className="split-auth-email-badge">
                  <MailIcon />
                  <span>{verificationEmail}</span>
                </div>

                <div className="split-auth-verification-actions">
                  <button
                    onClick={handleResendEmail}
                    disabled={resendLoading || resendCooldown > 0}
                    className="split-auth-submit"
                  >
                    {resendLoading ? (
                      <div className="split-auth-spinner"></div>
                    ) : resendCooldown > 0 ? (
                      `E-Mail erneut senden (${resendCooldown}s)`
                    ) : (
                      "E-Mail erneut senden"
                    )}
                  </button>

                  <button
                    onClick={() => { setShowVerificationPrompt(false); setNotification(null); }}
                    className="split-auth-secondary-btn"
                  >
                    Zurück zur Anmeldung
                  </button>
                </div>

                <div className="split-auth-tip">
                  <p className="split-auth-tip-text">
                    <strong>Tipp:</strong> Schauen Sie auch in Ihren Spam-Ordner!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

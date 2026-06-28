import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Eye, EyeOff, Check, Mail, ShieldCheck, Users, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import "../styles/LoginAuth.css";
import logoDark from "../assets/logo-register-dark.png";
import logoLight from "../assets/logo-register-light.webp";

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthResponse {
  token?: string;
  message?: string;
  email?: string;
  requiresVerification?: boolean;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
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

  // ---- Live-Validierung (rein clientseitig, ändert Backend nicht) ----
  const emailValid = EMAIL_RE.test(email);
  const emailError = emailTouched && email.length > 0 && !emailValid;
  const formValid = emailValid && password.length > 0;

  // E-Mail-Verification senden
  const sendVerificationEmail = async (emailToVerify: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/email-verification/send-verification`, {
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
      const response = await fetch(`${API_BASE}/api/auth/login`, {
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
        // ✅ Beide Keys setzen für Backwards-Compatibility
        localStorage.setItem("token", data.token);
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
        // ✅ Beide Keys prüfen für Backwards-Compatibility
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/api/auth/me`, { method: "GET", headers, credentials: "include" });
        if (response.ok) {
          await refetchUser();
          navigate(redirectUrl);
        }
      } catch { /* ignore */ }
    };
    checkLoginStatus();
    return () => { if (redirectTimeout.current) clearTimeout(redirectTimeout.current); };
  }, [navigate, refetchUser, redirectUrl]);

  const features = [
    "KI-Vertragsanalyse in Sekunden",
    "Automatische Fristenverwaltung",
    "Optimierungsvorschläge",
    "Risiko-Erkennung",
  ];

  return (
    <>
      <Helmet>
        <html lang="de" />
        <title>Anmelden | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Melde dich bei Contract AI an und verwalte deine Verträge intelligent mit KI." />
        <link rel="canonical" href="https://www.contract-ai.de/login" />
      </Helmet>

      <div className="ca-login-page">
        {/* ===================== LINKE MARKEN-SPALTE ===================== */}
        <div className="ca-login-left">
          <div className="ca-login-glow-1"></div>
          <div className="ca-login-glow-2"></div>
          <div className="ca-login-grid"></div>

          <div className="ca-login-left-inner">
            <Link to="/" className="ca-login-logolink" aria-label="Zur Startseite">
              <span className="ca-login-back"><ArrowLeft size={18} /></span>
              <img src={logoDark} alt="Contract AI" className="ca-login-logo-dark" />
            </Link>

            <div>
              <span className="ca-login-eyebrow">
                <span className="ca-login-eyebrow-dot"></span>
                Über 500 Unternehmen vertrauen uns
              </span>
              <h1 className="ca-login-h1">Verträge intelligent<br />verwalten</h1>
              <p className="ca-login-sub">
                Die All-in-One Plattform für KI-gestützte Vertragsanalyse, -erstellung, -optimierung, -signatur und Fristenverwaltung.
              </p>
            </div>

            <div className="ca-login-features">
              {features.map((f) => (
                <div key={f} className="ca-login-feature">
                  <span className="ca-login-feature-ico"><Check size={15} /></span>
                  <span>{f}</span>
                </div>
              ))}
              <div className="ca-login-feature ca-login-feature-more">
                <span className="ca-login-feature-ico"><Plus size={15} /></span>
                <span>Und vieles mehr …</span>
              </div>
            </div>

            <div className="ca-login-trust">
              <div className="ca-login-trust-row">
                <span className="ca-login-trust-ico"><Users size={16} /></span>
                <span className="ca-login-trust-text">Bereits über <strong>1.500</strong> Verträge analysiert</span>
              </div>
              <div className="ca-login-trust-row ca-login-trust-row-2">
                <ShieldCheck size={16} />
                <span>DSGVO-konform · Server in Deutschland · SSL-verschlüsselt</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RECHTE FORM-SPALTE ===================== */}
        <div className="ca-login-right">
          <div className="ca-login-form-wrap">
            {/* Mobile-Header */}
            <div className="ca-login-mobilehead">
              <Link to="/" className="ca-login-mobile-logolink" aria-label="Zur Startseite">
                <span className="ca-login-mobile-back"><ArrowLeft size={16} /></span>
                <img src={logoLight} alt="Contract AI" className="ca-login-logo-light" />
              </Link>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`ca-login-noti ${notification.type || 'info'}`} aria-live="polite">
                <span className="ca-login-noti-ico">
                  {notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}
                </span>
                <span className="ca-login-noti-text">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ca-login-noti-close" aria-label="Schließen">✕</button>
              </div>
            )}

            {!showVerificationPrompt ? (
              <>
                <div className="ca-login-header">
                  <h2 className="ca-login-title">Willkommen zurück</h2>
                  <p className="ca-login-subtitle">Melde dich an, um fortzufahren</p>
                </div>

                <form onSubmit={handleLogin} className="ca-login-form" noValidate>
                  {/* E-Mail */}
                  <div className="ca-login-field">
                    <label htmlFor="email" className="ca-login-label">E-Mail Adresse</label>
                    <div className="ca-login-email-wrap">
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        className={`ca-login-input${emailError ? " error" : ""}`}
                        placeholder="name@beispiel.de"
                        required
                        autoComplete="email"
                        aria-invalid={emailError}
                        aria-describedby={emailError ? "login-email-error" : undefined}
                      />
                      {emailValid && (
                        <span className="ca-login-email-check"><Check size={18} /></span>
                      )}
                    </div>
                    {emailError && (
                      <p className="ca-login-field-error" id="login-email-error">Bitte gib eine gültige E-Mail-Adresse ein</p>
                    )}
                  </div>

                  {/* Passwort */}
                  <div className="ca-login-field">
                    <div className="ca-login-label-row">
                      <label htmlFor="password" className="ca-login-label">Passwort</label>
                      <Link to="/forgot-password" className="ca-login-forgot">Passwort vergessen?</Link>
                    </div>
                    <div className="ca-login-pw-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ca-login-input"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="ca-login-pw-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !formValid}
                    className="ca-login-submit"
                  >
                    {loading ? (
                      <span className="ca-login-spinner"></span>
                    ) : (
                      <>
                        <span>Anmelden</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <p className="ca-login-switch">
                  Noch kein Konto?{" "}
                  <Link to="/register">Jetzt kostenlos registrieren</Link>
                </p>
              </>
            ) : (
              /* ===================== VIEW B — E-Mail bestätigen ===================== */
              <div className="ca-login-verify">
                <div className="ca-login-verify-ico"><Mail size={34} /></div>
                <h2 className="ca-login-verify-title">E-Mail bestätigen</h2>
                <p className="ca-login-verify-text">
                  Bitte bestätige deine E-Mail-Adresse, um dich anmelden zu können.
                </p>

                <div className="ca-login-email-badge">
                  <Mail size={16} />
                  <span>{verificationEmail}</span>
                </div>

                <div className="ca-login-verify-actions">
                  <button
                    onClick={handleResendEmail}
                    disabled={resendLoading || resendCooldown > 0}
                    className="ca-login-submit"
                  >
                    {resendLoading ? (
                      <span className="ca-login-spinner"></span>
                    ) : resendCooldown > 0 ? (
                      `E-Mail erneut senden (${resendCooldown}s)`
                    ) : (
                      "E-Mail erneut senden"
                    )}
                  </button>

                  <button
                    onClick={() => { setShowVerificationPrompt(false); setNotification(null); }}
                    className="ca-login-secondary"
                  >
                    Zurück zur Anmeldung
                  </button>
                </div>

                <div className="ca-login-tip">
                  <p><strong>Tipp:</strong> Schau auch in deinen Spam-Ordner, falls die E-Mail nicht ankommt.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "../styles/SplitAuth.css";

// Gleiche Direkt-API-Anbindung wie Login/Register (Vercel-Proxy verschluckt die Kunden-IP)
const API_BASE = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Back Arrow Icon SVG
const BackArrowIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const MailIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const AlertIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.5 16.5H2.5L12 3z" />
  </svg>
);

export default function VerifyFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailFromLink = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailFromLink);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const emailValid = EMAIL_RE.test(email);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (loading || cooldown > 0 || !emailValid) return;
    setLoading(true);
    setNotification(null);

    try {
      const response = await fetch(`${API_BASE}/api/email-verification/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok && data.status === "already_verified") {
        setNotification({ message: "Deine E-Mail ist bereits bestätigt. Du wirst zur Anmeldung weitergeleitet …", type: "success" });
        setTimeout(() => navigate("/login"), 2500);
      } else if (response.ok && data.status === "already_sent_recently") {
        setNotification({ message: "Wir haben dir gerade erst eine E-Mail gesendet. Schau auch in deinen Spam-Ordner.", type: "info" });
        startCooldown(data.retryAfter || 60);
      } else if (response.ok) {
        setNotification({ message: "Neuer Bestätigungslink gesendet. Bitte prüfe dein Postfach.", type: "success" });
        startCooldown(60);
      } else if (response.status === 404) {
        setNotification({ message: "Zu dieser Adresse gibt es keine Registrierung. Bitte registriere dich neu.", type: "error" });
      } else {
        setNotification({ message: data.message || "Fehler beim Senden der E-Mail", type: "error" });
      }
    } catch {
      setNotification({ message: "Verbindung fehlgeschlagen. Bitte versuche es erneut.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Bestätigungslink abgelaufen | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Der Bestätigungslink ist abgelaufen oder ungültig. Fordere einen neuen Link an." />
      </Helmet>

      <div className="split-auth-container">
        {/* Left Side - Branding */}
        <div className="split-auth-branding blue">
          <div className="split-auth-bg-effects">
            <div className="split-auth-bg-circle-1"></div>
            <div className="split-auth-bg-circle-2"></div>
          </div>

          <div className="split-auth-branding-content">
            <Link to="/" className="split-auth-logo-link">
              <div className="split-auth-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo-contractai.png" alt="Contract AI" className="split-auth-logo-img" />
            </Link>

            <h1 className="split-auth-headline">
              Fast geschafft –<br />nur der Link war zu alt
            </h1>
            <p className="split-auth-subheadline">
              Kein Problem: Mit einem Klick senden wir dir einen frischen Bestätigungslink.
            </p>
          </div>

          <div className="split-auth-branding-footer">
            <p className="split-auth-footer-text">
              DSGVO-konform · Server in Deutschland · SSL-verschlüsselt
            </p>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="split-auth-form-side">
          <div className="split-auth-form-container">
            <Link to="/" className="split-auth-mobile-logo-link">
              <div className="split-auth-mobile-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo.png" alt="Contract AI" className="split-auth-mobile-logo-img" />
            </Link>

            <div className="split-auth-success">
              <div
                className="split-auth-success-icon"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
              >
                <AlertIcon />
              </div>

              <h2 className="split-auth-success-title">Link abgelaufen oder ungültig</h2>
              <p className="split-auth-success-text">
                Der Bestätigungslink ist abgelaufen, wurde bereits verwendet oder ist unvollständig.
                Fordere einfach einen neuen an.
              </p>

              {emailFromLink ? (
                <div className="split-auth-email-badge">
                  <MailIcon />
                  <span>{emailFromLink}</span>
                </div>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  autoComplete="email"
                  aria-label="E-Mail-Adresse"
                  style={{
                    width: "100%",
                    maxWidth: "320px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    fontSize: "15px",
                    marginBottom: "16px",
                  }}
                />
              )}

              {notification && (
                <p
                  role="status"
                  aria-live="polite"
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "14px",
                    fontWeight: 500,
                    color:
                      notification.type === "success" ? "#059669" :
                      notification.type === "error" ? "#dc2626" : "#2563eb",
                  }}
                >
                  {notification.message}
                </p>
              )}

              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0 || !emailValid}
                className="split-auth-submit"
              >
                <span>
                  {loading
                    ? "Wird gesendet …"
                    : cooldown > 0
                    ? `Neuen Link senden (${cooldown}s)`
                    : "Neuen Bestätigungslink senden"}
                </span>
              </button>

              <div className="split-auth-alt-links">
                <button onClick={() => navigate("/login")} className="split-auth-alt-link">
                  Zur Anmeldung
                </button>
                <span className="split-auth-alt-separator">|</span>
                <button onClick={() => navigate("/register")} className="split-auth-alt-link">
                  Neu registrieren
                </button>
              </div>

              <p style={{ marginTop: "20px", fontSize: "13px", color: "#6b7280" }}>
                <strong>Tipp:</strong> Schau auch in deinen Spam-Ordner, falls die E-Mail nicht ankommt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

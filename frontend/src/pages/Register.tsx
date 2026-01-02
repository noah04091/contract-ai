import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "../styles/SplitAuth.css";

// Back Arrow Icon SVG
const BackArrowIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);

  // E-Mail-Verification States
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBetaTester = searchParams.get('beta') === 'true';

  // E-Mail-Verification senden
  const sendVerificationEmail = async (emailToVerify: string) => {
    await new Promise(resolve => setTimeout(resolve, 400));
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
      }
      return { success: false, message: data.message || "Fehler beim Senden der E-Mail" };
    } catch {
      return { success: false, message: "Verbindung fehlgeschlagen" };
    }
  };

  // Resend E-Mail mit Cooldown
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    const result = await sendVerificationEmail(email);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isBetaTester }),
      });

      const data = await res.json();

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const emailResult = await sendVerificationEmail(email);

        if (emailResult.success) {
          setShowEmailVerification(true);
          setNotification({ message: "Bitte bestätigen Sie Ihre E-Mail-Adresse.", type: "info" });
        } else {
          setNotification({ message: "Registrierung erfolgreich, E-Mail konnte nicht gesendet werden.", type: "error" });
          setShowEmailVerification(true);
        }
      } else {
        // Zeige spezifische Passwort-Fehler falls vorhanden
        const errorMessage = data.errors && data.errors.length > 0
          ? data.errors.join('. ')
          : data.message;
        setNotification({ message: errorMessage, type: "error" });
      }
    } catch {
      setNotification({ message: "Verbindung fehlgeschlagen", type: "error" });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <>
      <Helmet>
        <title>Kostenlos registrieren | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Erstelle dein kostenloses Contract AI Konto und starte mit KI-gestützter Vertragsanalyse." />
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
              Starte kostenlos<br />in wenigen Minuten
            </h1>
            <p className="split-auth-subheadline">
              Erstelle professionelle Vertragsanalysen, verwalte Fristen und optimiere deine Verträge mit KI.
            </p>

            {/* Features */}
            <div className="split-auth-features">
              {[
                "Kostenloser Start – keine Kreditkarte nötig",
                "3 kostenlose Analysen zum Testen",
                "KI-gestützte Vertragsoptimierung",
                "Jederzeit kündbar",
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

        {/* Right Side - Register Form */}
        <div className="split-auth-form-side">
          <div className="split-auth-form-container">
            {/* Mobile Logo */}
            <Link to="/" className="split-auth-mobile-logo-link">
              <div className="split-auth-mobile-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo.png" alt="Contract AI" className="split-auth-mobile-logo-img" />
            </Link>

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

            {!showEmailVerification ? (
              <>
                {/* Beta Badge */}
                {isBetaTester && (
                  <div className="split-auth-beta-badge">
                    <span>🎁</span>
                    <span>Beta-Tester Registrierung</span>
                  </div>
                )}

                {/* Header */}
                <div className="split-auth-header">
                  <h2 className="split-auth-title">
                    {isBetaTester ? "Willkommen, Beta-Tester!" : "Konto erstellen"}
                  </h2>
                  <p className="split-auth-subtitle">
                    {isBetaTester
                      ? "3 Monate Premium kostenlos – alle Features inklusive!"
                      : "Füllen Sie das Formular aus, um loszulegen"
                    }
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="split-auth-form">
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
                    <label htmlFor="password" className="split-auth-label">
                      Passwort
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="split-auth-input"
                      placeholder="Sicheres Passwort erstellen"
                      required
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <p className="split-auth-password-hint">
                      Mind. 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl
                    </p>
                  </div>

                  <p className="split-auth-terms">
                    Mit der Registrierung akzeptieren Sie unsere{" "}
                    <Link to="/agb">AGB</Link> und{" "}
                    <Link to="/datenschutz">Datenschutzerklärung</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="split-auth-submit"
                  >
                    {loading ? (
                      <div className="split-auth-spinner"></div>
                    ) : (
                      <span>Kostenlos registrieren</span>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="split-auth-divider">
                  <div className="split-auth-divider-line"></div>
                  <span className="split-auth-divider-text">oder</span>
                  <div className="split-auth-divider-line"></div>
                </div>

                {/* Login Link */}
                <p className="split-auth-switch">
                  Bereits ein Konto?{" "}
                  <Link to="/login">Jetzt anmelden</Link>
                </p>
              </>
            ) : (
              /* Email Verification */
              <div className="split-auth-verification">
                <div className="split-auth-verification-icon">
                  <MailIcon />
                </div>

                <h2 className="split-auth-verification-title">E-Mail bestätigen</h2>
                <p className="split-auth-verification-text">
                  Wir haben eine Bestätigungs-E-Mail gesendet an:
                </p>

                <div className="split-auth-email-badge">
                  <MailIcon />
                  <span>{email}</span>
                </div>

                {/* Steps */}
                <div className="split-auth-steps">
                  {[
                    { num: "1", label: "E-Mail öffnen", active: true },
                    { num: "2", label: "Link klicken", active: false },
                    { num: "3", label: "Anmelden", active: false },
                  ].map((step, i) => (
                    <div key={i} className="split-auth-step">
                      <div className={`split-auth-step-number ${step.active ? 'active' : 'inactive'}`}>
                        {step.num}
                      </div>
                      <span className="split-auth-step-label">{step.label}</span>
                    </div>
                  ))}
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
                    onClick={() => navigate("/login")}
                    className="split-auth-secondary-btn"
                  >
                    Zur Anmeldung
                  </button>
                </div>

                <div className="split-auth-tip">
                  <p className="split-auth-tip-text">
                    <strong>Tipp:</strong> Schauen Sie auch in Ihren Spam-Ordner, falls die E-Mail nicht ankommt.
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

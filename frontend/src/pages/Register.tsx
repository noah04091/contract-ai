import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Check, Mail, ShieldCheck, Users } from "lucide-react";
import "../styles/RegisterAuth.css";
import { getAcquisition } from "../utils/acquisition";
import logoDark from "../assets/logo-register-dark.png";   // weißes Logo für die blaue Spalte
import logoLight from "../assets/logo-register-light.webp"; // dunkles Logo für hellen Mobile-Header

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  // Registrierungsfelder
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState(""); // Optional
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [touched, setTouched] = useState<{ firstName?: boolean; lastName?: boolean; email?: boolean }>({});

  // E-Mail-Verification States
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBetaTester = searchParams.get('beta') === 'true';

  // ===== Live-Validierung (neu im Redesign) =====
  const emailValid = EMAIL_RE.test(email);
  const ruleLen = password.length >= 8;
  const ruleCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const ruleNum = /[0-9]/.test(password);
  const pwValid = ruleLen && ruleCase && ruleNum;
  const pwEmpty = password.length === 0;
  let score = (ruleLen ? 1 : 0) + (ruleCase ? 1 : 0) + (ruleNum ? 1 : 0);
  if (pwValid && password.length >= 12) score = 4;
  if (!pwEmpty && score === 0) score = 1;
  const strengthColor = score >= 4 ? "#34C759" : score === 3 ? "#0d56c9" : score === 2 ? "#FF9500" : "#FF3B30";
  const strengthLabel = ["", "Schwach", "Mittel", "Stark", "Sehr stark"][score];
  const barColor = (i: number) => (pwEmpty || i >= score ? "#E5E5EA" : strengthColor);
  const firstNameError = touched.firstName && !firstName.trim() ? "Pflichtfeld" : "";
  const lastNameError = touched.lastName && !lastName.trim() ? "Pflichtfeld" : "";
  const emailError = touched.email && email && !emailValid ? "Bitte gib eine gültige E-Mail-Adresse ein" : "";
  const formValid = !!(firstName.trim() && lastName.trim() && emailValid && pwValid);

  // ===== Backend (1:1 aus der produktiven Komponente) =====
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
    if (loading || !formValid) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          companyName: companyName.trim() || undefined, // Nur senden wenn ausgefüllt
          email,
          password,
          isBetaTester,
          acquisition: getAcquisition() // 📊 Herkunft (first-touch), unsichtbar fürs Frontend
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const emailResult = await sendVerificationEmail(email);

        if (emailResult.success) {
          setShowEmailVerification(true);
          setNotification({ message: "Bitte bestätige deine E-Mail-Adresse.", type: "info" });
        } else {
          setNotification({ message: "Registrierung erfolgreich, E-Mail konnte nicht gesendet werden.", type: "error" });
          setShowEmailVerification(true);
        }
      } else {
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

  return (
    <>
      <Helmet>
        <html lang="de" />
        <title>Kostenlos registrieren | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Erstelle dein kostenloses Contract AI Konto und starte mit KI-gestützter Vertragsanalyse." />
      </Helmet>

      <div className="ca-reg-page">
        {/* ============ LINKE MARKEN-SPALTE ============ */}
        <div className="ca-reg-left">
          <div className="ca-reg-glow-1" />
          <div className="ca-reg-glow-2" />
          <div className="ca-reg-grid" />

          <div className="ca-reg-left-inner">
            <Link to="/" className="ca-reg-logolink">
              <span className="ca-reg-back"><ArrowLeft size={17} /></span>
              <img src={logoDark} alt="Contract AI" className="ca-reg-logo-dark" />
            </Link>

            <div>
              <div className="ca-reg-eyebrow">
                <span className="ca-reg-eyebrow-dot" />
                Über 500 Unternehmen vertrauen uns
              </div>
              <h1 className="ca-reg-h1">Starte kostenlos<br />in wenigen Minuten</h1>
              <p className="ca-reg-sub">
                Erstelle professionelle Vertragsanalysen, verwalte Fristen und optimiere deine Verträge mit KI.
              </p>
            </div>

            <div className="ca-reg-features">
              {[
                "Kostenloser Start – keine Kreditkarte nötig",
                "3 kostenlose Analysen zum Testen",
                "KI-gestützte Vertragsoptimierung",
                "Erste Analyse in unter 60 Sekunden",
              ].map((feature, i) => (
                <div key={i} className="ca-reg-feature">
                  <span className="ca-reg-feature-ico"><Check size={13} strokeWidth={2.8} /></span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="ca-reg-trust">
              <div className="ca-reg-trust-row">
                <span className="ca-reg-trust-ico"><Users size={16} /></span>
                <span className="ca-reg-trust-text">Bereits über <strong>1.000+</strong> Verträge analysiert</span>
              </div>
              <div className="ca-reg-trust-row ca-reg-trust-row-2">
                <ShieldCheck size={15} />
                <span>DSGVO-konform · Server in Deutschland · SSL-verschlüsselt</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ RECHTE FORM-SPALTE ============ */}
        <div className="ca-reg-right">
          <div className="ca-reg-form-wrap">
            {/* Mobile-Header (< 900px) */}
            <div className="ca-reg-mobilehead">
              <Link to="/"><img src={logoLight} alt="Contract AI" className="ca-reg-logo-light" /></Link>
              <div className="ca-reg-mobilehead-trust">
                <ShieldCheck size={14} />
                <span>Über 500 Unternehmen vertrauen uns · DSGVO-konform</span>
              </div>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`ca-reg-noti ${notification.type || 'info'}`} aria-live="polite">
                <span className="ca-reg-noti-ico">
                  {notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}
                </span>
                <span className="ca-reg-noti-text">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ca-reg-noti-close" aria-label="Schließen">✕</button>
              </div>
            )}

            {!showEmailVerification ? (
              <div>
                {isBetaTester && (
                  <div className="ca-reg-beta"><span>🎁</span><span>Beta-Tester Registrierung</span></div>
                )}

                <h2 className="ca-reg-title">{isBetaTester ? "Willkommen, Beta-Tester!" : "Konto erstellen"}</h2>
                <p className="ca-reg-subtitle">
                  {isBetaTester
                    ? "3 Monate Premium kostenlos – alle Features inklusive!"
                    : "Fülle das Formular aus, um loszulegen"}
                </p>

                <form onSubmit={handleRegister} className="ca-reg-form">
                  <div className="ca-reg-row">
                    <div className="ca-reg-field">
                      <label htmlFor="firstName" className="ca-reg-label">Vorname</label>
                      <input
                        type="text" id="firstName" value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, firstName: true }))}
                        className={`ca-reg-input${firstNameError ? " error" : ""}`}
                        placeholder="Max" required autoComplete="given-name"
                      />
                      {firstNameError && <p className="ca-reg-field-error">{firstNameError}</p>}
                    </div>
                    <div className="ca-reg-field">
                      <label htmlFor="lastName" className="ca-reg-label">Nachname</label>
                      <input
                        type="text" id="lastName" value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, lastName: true }))}
                        className={`ca-reg-input${lastNameError ? " error" : ""}`}
                        placeholder="Müller" required autoComplete="family-name"
                      />
                      {lastNameError && <p className="ca-reg-field-error">{lastNameError}</p>}
                    </div>
                  </div>

                  <div className="ca-reg-field">
                    <label htmlFor="email" className="ca-reg-label">E-Mail Adresse</label>
                    <div className="ca-reg-email-wrap">
                      <input
                        type="email" id="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, email: true }))}
                        className={`ca-reg-input${emailError ? " error" : ""}`}
                        placeholder="name@beispiel.de" required autoComplete="email"
                      />
                      {emailValid && <span className="ca-reg-email-check"><Check size={20} strokeWidth={2.4} /></span>}
                    </div>
                    {emailError && <p className="ca-reg-field-error">{emailError}</p>}
                  </div>

                  <div className="ca-reg-field">
                    <label htmlFor="password" className="ca-reg-label">Passwort</label>
                    <div className="ca-reg-pw-wrap">
                      <input
                        type={showPassword ? "text" : "password"} id="password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ca-reg-input"
                        placeholder="Sicheres Passwort erstellen" required autoComplete="new-password" minLength={8}
                      />
                      <button
                        type="button" className="ca-reg-pw-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1} aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="ca-reg-pw-meter">
                      <div className="ca-reg-pw-meter-row">
                        <div className="ca-reg-pw-bars">
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} className="ca-reg-pw-bar" style={{ background: barColor(i) }} />
                          ))}
                        </div>
                        <span className="ca-reg-pw-strength" style={{ color: pwEmpty ? "#8E8E93" : strengthColor }}>{strengthLabel}</span>
                      </div>
                      <div className="ca-reg-pw-rules">
                        <span className={`ca-reg-pw-rule${ruleLen ? " ok" : ""}`}><Check size={13} strokeWidth={2.6} />Mind. 8 Zeichen</span>
                        <span className={`ca-reg-pw-rule${ruleCase ? " ok" : ""}`}><Check size={13} strokeWidth={2.6} />Groß- &amp; Kleinbuchstabe</span>
                        <span className={`ca-reg-pw-rule${ruleNum ? " ok" : ""}`}><Check size={13} strokeWidth={2.6} />Mind. 1 Zahl</span>
                      </div>
                    </div>
                  </div>

                  <div className="ca-reg-field">
                    <label htmlFor="companyName" className="ca-reg-label">
                      Firmenname <span className="ca-reg-optional">(optional)</span>
                    </label>
                    <input
                      type="text" id="companyName" value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="ca-reg-input"
                      placeholder="Meine Firma GmbH" autoComplete="organization"
                    />
                  </div>

                  <p className="ca-reg-terms">
                    Mit der Registrierung akzeptierst du unsere{" "}
                    <Link to="/agb">AGB</Link> und{" "}
                    <Link to="/datenschutz">Datenschutzerklärung</Link>.
                  </p>

                  <button type="submit" disabled={loading || !formValid} className="ca-reg-submit">
                    {loading ? (
                      <span className="ca-reg-spinner" />
                    ) : (
                      <>Kostenlos registrieren <ArrowRight size={17} /></>
                    )}
                  </button>
                </form>

                <p className="ca-reg-switch">
                  Bereits ein Konto? <Link to="/login">Jetzt anmelden</Link>
                </p>
              </div>
            ) : (
              /* ============ VERIFIKATIONS-VIEW ============ */
              <div className="ca-reg-verify">
                <div className="ca-reg-verify-ico"><Mail size={34} strokeWidth={1.8} /></div>
                <h2 className="ca-reg-verify-title">Fast geschafft – E-Mail bestätigen</h2>
                <p className="ca-reg-verify-text">Wir haben dir eine Bestätigungs-E-Mail gesendet an:</p>

                <div className="ca-reg-email-badge"><Mail size={16} /><span>{email}</span></div>

                <div className="ca-reg-steps">
                  {[
                    { num: "1", label: "E-Mail öffnen", active: true },
                    { num: "2", label: "Link klicken", active: false },
                    { num: "3", label: "Anmelden", active: false },
                  ].map((step, i) => (
                    <div key={i} className="ca-reg-step">
                      <div className={`ca-reg-step-num${step.active ? " active" : ""}`}>{step.num}</div>
                      <span className={`ca-reg-step-label${step.active ? " active" : ""}`}>{step.label}</span>
                    </div>
                  ))}
                </div>

                <div className="ca-reg-verify-actions">
                  <button onClick={handleResendEmail} disabled={resendLoading || resendCooldown > 0} className="ca-reg-submit">
                    {resendLoading ? (
                      <span className="ca-reg-spinner" />
                    ) : resendCooldown > 0 ? (
                      `E-Mail erneut senden (${resendCooldown}s)`
                    ) : (
                      "E-Mail erneut senden"
                    )}
                  </button>
                  <button onClick={() => navigate("/login")} className="ca-reg-secondary">Zur Anmeldung</button>
                </div>

                <div className="ca-reg-tip">
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

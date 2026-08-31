import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Check, Mail, ShieldCheck, Users, Plus } from "lucide-react";
import "../styles/RegisterAuth.css";
import { getAcquisition } from "../utils/acquisition";
import logoDark from "../assets/logo-register-dark.png";   // weißes Logo für die blaue Spalte
import logoLight from "../assets/logo-register-light.webp"; // dunkles Logo für hellen Mobile-Header

// 18.08.2026: Registrierung ruft die API direkt auf, nicht mehr relativ über die
// Vercel-Weiterleitung. Grund: auf dem Umweg kommt die Kundenadresse nicht am Server
// an, dadurch teilten sich ALLE Registrierungen einen gemeinsamen Zähler von 20 pro
// 15 Minuten. Bei einer Kampagne hätte der 21. Interessent "Bitte warten Sie 15
// Minuten" gesehen. Identisches Muster wie in Login.tsx, dort seit langem bewährt.
const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

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
  // action/secondary: optionale Wege aus einer Meldung heraus. Eine Fehlermeldung ohne
  // Ausweg ist der häufigste Abbruchgrund an dieser Stelle (siehe 409-Fall unten).
  const [notification, setNotification] = useState<{
    message: string;
    type?: "success" | "error" | "info";
    action?: { label: string; to: string };
    secondary?: { label: string; to: string };
  } | null>(null);
  const [touched, setTouched] = useState<{ firstName?: boolean; lastName?: boolean; email?: boolean }>({});

  // E-Mail-Verification States
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBetaTester = searchParams.get('beta') === 'true';

  // 💳 Kaufabsicht von der Preisseite (24.08.2026).
  // Vorher hängte die Preisseite zwar "?plan=..." an, gelesen hat es hier aber
  // niemand — und nach der E-Mail-Bestätigung landete jeder im Dashboard. Wer
  // kaufen wollte, musste den kompletten Weg ein zweites Mal gehen. Jetzt wird die
  // Auswahl sichtbar gemacht, an das Konto geheftet und nach der Bestätigung
  // direkt zur Zahlung geführt.
  const planParam = (searchParams.get('plan') || '').toLowerCase();
  const intendedPlan = ['business', 'enterprise', 'premium'].includes(planParam) ? planParam : null;
  const intendedBilling = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const intendedCode = searchParams.get('code')?.trim() || null;
  const planLabel = intendedPlan === 'business' ? 'Business' : 'Enterprise';

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
  const strengthColor = score >= 4 ? "#10B981" : score === 3 ? "#0d56c9" : score === 2 ? "#F59E0B" : "#EF4444";
  const strengthLabel = ["", "Schwach", "Mittel", "Stark", "Sehr stark"][score];
  const barColor = (i: number) => (pwEmpty || i >= score ? "#E5E5EA" : strengthColor);
  const firstNameError = touched.firstName && !firstName.trim() ? "Pflichtfeld" : "";
  const lastNameError = touched.lastName && !lastName.trim() ? "Pflichtfeld" : "";
  const emailError = touched.email && email && !emailValid ? "Bitte gib eine gültige E-Mail-Adresse ein" : "";
  const formValid = !!(firstName.trim() && lastName.trim() && emailValid && pwValid);

  // ===== Backend (1:1 aus der produktiven Komponente) =====
  const sendVerificationEmail = async (emailToVerify: string) => {
    // ⚠️ 24.08.2026: Hier stand eine künstliche Pause von 400 ms, zusammen mit einer
    // weiteren Sekunde in handleRegister. Anderthalb Sekunden Wartezeit ohne Zweck,
    // ausgerechnet im ungeduldigsten Moment der ganzen Strecke. Beide entfernt.
    // Unkritisch, weil POST /auth/register die Bestätigungs-Mail seit dem 18.08.
    // selbst anstößt; dieser Aufruf ist nur noch der Fallback.
    try {
      // 19.08.2026: direkt zur API statt über die Vercel-Weiterleitung — gleicher
      // Grund wie beim Registrieren oben: über den Umweg kommt die Kundenadresse
      // nicht am Server an und alle Kunden teilten sich EINEN Drossel-Zähler
      // (die Route ist seit heute nach Hausmuster gedrosselt).
      const response = await fetch(`${API_BASE}/api/email-verification/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailToVerify }),
      });
      const data = await response.json();
      if (response.ok) {
        // status und retryAfter durchreichen: Der Server unterscheidet zwischen
        // "verschickt" und "vor Kurzem schon verschickt". Ohne diese Werte konnte
        // die Seite Erfolg melden, obwohl gar nichts rausging (siehe handleResendEmail).
        return { success: true, message: data.message, status: data.status, retryAfter: data.retryAfter };
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
      // ⚠️ 24.08.2026: Vorher meldete die Seite hier IMMER "wurde erneut gesendet",
      // auch wenn der Server wegen seiner 60-Sekunden-Sperre gar nichts verschickt
      // hatte. Genau der häufigste Fall: Man registriert sich, die erste Mail ist
      // noch unterwegs, man klickt ungeduldig, bekommt eine Erfolgsmeldung und
      // wartet auf eine zweite Mail, die nie kommt.
      const bereitsUnterwegs = result.status === 'already_sent_recently';
      setNotification({
        message: bereitsUnterwegs
          ? "Die E-Mail ist schon unterwegs. Schau in dein Postfach, auch im Spam-Ordner."
          : "Bestätigungs-E-Mail wurde erneut gesendet",
        type: bereitsUnterwegs ? "info" : "success"
      });
      setResendCooldown(typeof result.retryAfter === 'number' && result.retryAfter > 0
        ? Math.ceil(result.retryAfter)
        : 60);
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
      const res = await fetch(`${API_BASE}/api/auth/register`, {
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
          acquisition: getAcquisition(), // 📊 Herkunft (first-touch), unsichtbar fürs Frontend
          // Kaufabsicht ans Konto heften, nicht an den Browser: Der Bestätigungslink
          // wird oft auf einem anderen Gerät geöffnet (Mail auf dem Handy), ein
          // localStorage-Merker wäre dort weg.
          ...(intendedPlan && {
            intendedPurchase: { plan: intendedPlan, billing: intendedBilling, code: intendedCode }
          })
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const emailResult = await sendVerificationEmail(email);

        if (emailResult.success) {
          setShowEmailVerification(true);
          setNotification({ message: "Bitte bestätige deine E-Mail-Adresse.", type: "info" });
        } else {
          setNotification({ message: "Registrierung erfolgreich, E-Mail konnte nicht gesendet werden.", type: "error" });
          setShowEmailVerification(true);
        }
      } else if (res.status === 409) {
        // ⚠️ 26.08.2026: Bisher stand hier nur "❌ E-Mail bereits registriert" und der
        // Besucher saß fest. Der häufigste Fall dahinter ist banal: Er hat schon ein
        // Konto und weiß es nicht mehr. Ohne Weg zur Anmeldung oder zum Passwort
        // bricht genau hier jemand ab, der eigentlich schon Kunde ist.
        setNotification({
          message: "Für diese Adresse gibt es schon ein Konto.",
          type: "info",
          action: { label: "Jetzt anmelden", to: `/login?email=${encodeURIComponent(email)}` },
          secondary: { label: "Passwort vergessen?", to: "/forgot-password" },
        });
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
        <link rel="canonical" href="https://www.contract-ai.de/register" />
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
                Die All-in-One Plattform für KI-gestützte Vertragsanalyse, -erstellung, -optimierung, -signatur und Fristenverwaltung.
              </p>
            </div>

            <div className="ca-reg-features">
              {[
                "Kostenloser Start – keine Kreditkarte nötig",
                "3 kostenlose Analysen zum Testen",
                "Risiken & Sparpotenziale auf einen Blick",
                "Erste Analyse in unter 60 Sekunden",
              ].map((feature, i) => (
                <div key={i} className="ca-reg-feature">
                  <span className="ca-reg-feature-ico"><Check size={13} strokeWidth={2.8} /></span>
                  <span>{feature}</span>
                </div>
              ))}
              <div className="ca-reg-feature ca-reg-feature-more">
                <span className="ca-reg-feature-ico"><Plus size={13} strokeWidth={2.8} /></span>
                <span>Und vieles mehr …</span>
              </div>
            </div>

            <div className="ca-reg-trust">
              <div className="ca-reg-trust-row">
                <span className="ca-reg-trust-ico"><Users size={16} /></span>
                <span className="ca-reg-trust-text">Bereits über <strong>1.500</strong> Verträge analysiert</span>
              </div>
              <div className="ca-reg-trust-row ca-reg-trust-row-2">
                <ShieldCheck size={15} />
                {/* ⚠️ Hier stand "Server in Deutschland". Gemessen falsch: Die
                    Vertragsdateien liegen in Stockholm, die KI-Verarbeitung läuft in
                    den USA über Standardvertragsklauseln. Datenschutzrechtlich sauber,
                    aber die Aussage stimmt nicht — und sie stand ausgerechnet neben
                    "DSGVO-konform", wo sie am meisten Gewicht hat. Siehe
                    project_serverstandort-aussage-falsch. Die Ersatzformulierung ist
                    vollständig belegbar (öffentlicher AVV nach Art. 28 DSGVO). */}
                <span>DSGVO-konform · Auftragsverarbeitung offengelegt · SSL-verschlüsselt</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ RECHTE FORM-SPALTE ============ */}
        <div className="ca-reg-right">
          <div className="ca-reg-form-wrap">
            {/* Mobile-Header (< 900px) */}
            <div className="ca-reg-mobilehead">
              <Link to="/" className="ca-reg-mobile-logolink" aria-label="Zur Startseite">
                <span className="ca-reg-mobile-back"><ArrowLeft size={16} /></span>
                <img src={logoLight} alt="Contract AI" className="ca-reg-logo-light" />
              </Link>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`ca-reg-noti ${notification.type || 'info'}`} aria-live="polite">
                <span className="ca-reg-noti-ico">
                  {notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}
                </span>
                <span className="ca-reg-noti-text">
                  {notification.message}
                  {notification.action && (
                    <>
                      {' '}
                      <Link to={notification.action.to} className="ca-reg-noti-link">
                        {notification.action.label}
                      </Link>
                    </>
                  )}
                  {notification.secondary && (
                    <>
                      {' · '}
                      <Link to={notification.secondary.to} className="ca-reg-noti-link">
                        {notification.secondary.label}
                      </Link>
                    </>
                  )}
                </span>
                <button onClick={() => setNotification(null)} className="ca-reg-noti-close" aria-label="Schließen">✕</button>
              </div>
            )}

            {!showEmailVerification ? (
              <div>
                {isBetaTester && (
                  <div className="ca-reg-beta"><span>🎁</span><span>Beta-Tester Registrierung</span></div>
                )}

                {/* Wer von der Preisseite kommt, soll sehen, dass sein Kauf nicht
                    verloren geht, sondern nur noch einen Schritt entfernt ist. */}
                {intendedPlan && !isBetaTester && (
                  <div className="ca-reg-planbar">
                    <span className="ca-reg-planbar-dot" />
                    <span>
                      <strong>{planLabel}</strong> gewählt
                      {intendedBilling === 'yearly' ? ' · jährliche Abrechnung' : ' · monatlich'}
                    </span>
                  </div>
                )}

                <h2 className="ca-reg-title">
                  {isBetaTester ? "Willkommen, Beta-Tester!" : intendedPlan ? "Noch ein Schritt" : "Konto erstellen"}
                </h2>
                <p className="ca-reg-subtitle">
                  {isBetaTester
                    ? "3 Monate Premium kostenlos – alle Features inklusive!"
                    : intendedPlan
                      ? "Erstelle dein Konto. Danach bestätigst du kurz deine E-Mail und kommst direkt zur Zahlung."
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
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "reg-email-error" : undefined}
                      />
                      {emailValid && <span className="ca-reg-email-check"><Check size={20} strokeWidth={2.4} /></span>}
                    </div>
                    {emailError && <p className="ca-reg-field-error" id="reg-email-error">{emailError}</p>}
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
                <p className="ca-reg-verify-text">
                  {intendedPlan
                    ? `Bestätige kurz deine Adresse, danach geht es direkt zur Zahlung für ${planLabel}. Wir haben dir eine E-Mail gesendet an:`
                    : 'Wir haben dir eine Bestätigungs-E-Mail gesendet an:'}
                </p>

                <div className="ca-reg-email-badge"><Mail size={16} /><span>{email}</span></div>

                <div className="ca-reg-steps">
                  {[
                    { num: "1", label: "E-Mail öffnen", active: true },
                    { num: "2", label: "Link klicken", active: false },
                    // Der Auto-Login übernimmt seit dem 19.08. das Anmelden; wer kauft,
                    // landet direkt bei der Zahlung.
                    { num: "3", label: intendedPlan ? "Zur Zahlung" : "Loslegen", active: false },
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

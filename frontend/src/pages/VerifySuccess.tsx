import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import "../styles/SplitAuth.css";

// Direkt zur API (gleiches Muster wie Login/Register, Vercel-Proxy verschluckt die Kunden-IP)
const API_BASE = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

// Back Arrow Icon SVG
const BackArrowIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default function VerifySuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const { refetchUser } = useAuth();

  const email = searchParams.get('email') || 'deine E-Mail-Adresse';

  // 🔑 Auto-Login (Paket B, 19.08.2026): Der Verify-Redirect trägt einen
  // Einmal-Token (?welcome=...). Wir lösen ihn gegen eine normale Session ein
  // und leiten direkt ins Dashboard — der manuelle Login entfällt. Schlägt das
  // fehl (Token abgelaufen/verbraucht), bleibt der bisherige Weg: Countdown → Login.
  const welcomeTokenRef = useRef<string | null>(searchParams.get('welcome'));
  const [autoLoginState, setAutoLoginState] = useState<'none' | 'running' | 'failed'>(
    welcomeTokenRef.current ? 'running' : 'none'
  );
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    const token = welcomeTokenRef.current;
    if (!token || autoLoginAttempted.current) return;
    autoLoginAttempted.current = true;

    // 💳 Kaufwunsch von der Preisseite, vom Backend durchgereicht (24.08.2026).
    // Vor dem Bereinigen der URL auslesen, danach ist er weg.
    const wishPlan = (searchParams.get('plan') || '').toLowerCase();
    const wish = ['business', 'enterprise', 'premium'].includes(wishPlan)
      ? {
          plan: wishPlan,
          billing: searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly',
          code: searchParams.get('code')?.trim() || null,
        }
      : null;

    // Einmal-Token sofort aus URL/History entfernen
    const emailParam = searchParams.get('email');
    navigate(`/verify-success${emailParam ? `?email=${encodeURIComponent(emailParam)}` : ''}`, { replace: true });

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/email-verification/complete-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (response.ok && data.token) {
          // Gleiche Ablage wie Login.tsx (beide Keys für Backwards-Compatibility)
          localStorage.setItem('token', data.token);
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('authEmail', data.email || emailParam || '');
          localStorage.setItem('authTimestamp', String(Date.now()));
          await refetchUser();

          // Wer kaufen wollte, kommt jetzt direkt zur Zahlung statt ins Dashboard.
          // Schlägt das fehl (Netzwerk, Stripe nicht erreichbar), landet er im
          // Dashboard und verliert nichts: Der Wunsch bleibt am Konto gespeichert
          // und die Preisseite ist einen Klick entfernt.
          if (wish) {
            try {
              const checkout = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${data.token}`,
                },
                body: JSON.stringify({
                  plan: wish.plan,
                  billing: wish.billing,
                  ...(wish.code && { code: wish.code }),
                }),
              });
              const checkoutData = await checkout.json();
              if (checkout.ok && checkoutData.url) {
                window.location.href = checkoutData.url;
                return;
              }
            } catch {
              // bewusst still: der Rückfall unten greift
            }
          }

          navigate('/dashboard');
        } else {
          setAutoLoginState('failed');
        }
      } catch {
        setAutoLoginState('failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Countdown Timer — pausiert, solange der Auto-Login läuft
    if (autoLoginState === 'running') return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [navigate, autoLoginState]);

  // Mail Icon SVG
  const MailIcon = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  // Checkmark Icon SVG
  const CheckIcon = () => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
        <title>E-Mail bestätigt | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Deine E-Mail-Adresse wurde erfolgreich bestätigt." />
      </Helmet>

      <div className="split-auth-container">
        {/* Left Side - Branding */}
        <div className="split-auth-branding green">
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
              Willkommen bei<br />Contract AI!
            </h1>
            <p className="split-auth-subheadline">
              Dein Konto ist jetzt vollständig aktiviert. Starte mit der intelligenten Vertragsanalyse.
            </p>

            {/* Features */}
            <div className="split-auth-features">
              {[
                "KI-gestützte Vertragsanalyse",
                "Automatische Fristenverwaltung",
                "Optimierungsvorschläge",
                "Risiko-Erkennung",
                "Vertragsgenerator",
                "Digitale Signaturen",
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

        {/* Right Side - Success Content */}
        <div className="split-auth-form-side">
          <div className="split-auth-form-container">
            {/* Mobile Logo */}
            <Link to="/" className="split-auth-mobile-logo-link">
              <div className="split-auth-mobile-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo.png" alt="Contract AI" className="split-auth-mobile-logo-img" />
            </Link>

            {/* Success Content */}
            <div className="split-auth-success">
              {/* Success Icon */}
              <div className="split-auth-success-icon">
                <CheckIcon />
              </div>

              <h2 className="split-auth-success-title">E-Mail bestätigt!</h2>
              <p className="split-auth-success-text">
                Deine E-Mail-Adresse wurde erfolgreich bestätigt.
              </p>

              {/* Email Badge */}
              <div className="split-auth-email-badge">
                <MailIcon />
                <span>{email}</span>
              </div>

              {/* 🔑 Läuft der Auto-Login, zeigen wir nur den Hinweis — kein Knopf,
                  kein Countdown. Erst bei Fehlschlag erscheint der bisherige Weg. */}
              {autoLoginState === 'running' && (
                <p
                  role="status"
                  aria-live="polite"
                  style={{ margin: '8px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#059669' }}
                >
                  Du wirst automatisch angemeldet …
                </p>
              )}

              {autoLoginState !== 'running' && (
              <>
              {/* CTA Button */}
              <button
                onClick={() => navigate("/login")}
                className="split-auth-submit green"
              >
                <span>Jetzt anmelden</span>
                <ArrowIcon />
              </button>

              {/* Countdown */}
              <div className="split-auth-countdown">
                <div className="split-auth-countdown-circle">
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray={113.04}
                      strokeDashoffset={113.04 - (113.04 * (5 - countdown)) / 5}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="split-auth-countdown-number">{countdown}</span>
                </div>
                <div className="split-auth-countdown-text">
                  Automatische Weiterleitung in <span>{countdown}s</span>
                </div>
              </div>
              </>
              )}

              {/* Alternative Links */}
              <div className="split-auth-alt-links">
                <button
                  onClick={() => navigate("/")}
                  className="split-auth-alt-link"
                >
                  Zur Startseite
                </button>
                <span className="split-auth-alt-separator">|</span>
                <button
                  onClick={() => navigate("/pricing")}
                  className="split-auth-alt-link"
                >
                  Preise ansehen
                </button>
              </div>
            </div>

            {/* Mobile Features */}
            <div className="split-auth-mobile-features">
              <h3 className="split-auth-mobile-features-title">Deine Vorteile:</h3>
              <div className="split-auth-mobile-features-list">
                {[
                  "KI-gestützte Vertragsanalyse",
                  "Automatische Fristenverwaltung",
                  "Optimierungsvorschläge",
                  "Risiko-Erkennung",
                ].map((feature, i) => (
                  <div key={i} className="split-auth-mobile-feature">
                    <CheckIcon />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

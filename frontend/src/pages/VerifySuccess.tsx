import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "../styles/SplitAuth.css";

export default function VerifySuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const email = searchParams.get('email') || 'Ihre E-Mail-Adresse';

  useEffect(() => {
    // Countdown Timer
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
  }, [navigate]);

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
        <meta name="description" content="Ihre E-Mail-Adresse wurde erfolgreich bestätigt." />
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
            {/* Logo */}
            <div className="split-auth-logo">
              <img src="/logo-contractai.png" alt="Contract AI" className="split-auth-logo-img" />
            </div>

            {/* Headline */}
            <h1 className="split-auth-headline">
              Willkommen bei<br />Contract AI!
            </h1>
            <p className="split-auth-subheadline">
              Ihr Konto ist jetzt vollständig aktiviert. Starten Sie mit der intelligenten Vertragsanalyse.
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

            {/* Success Content */}
            <div className="split-auth-success">
              {/* Success Icon */}
              <div className="split-auth-success-icon">
                <CheckIcon />
              </div>

              <h2 className="split-auth-success-title">E-Mail bestätigt!</h2>
              <p className="split-auth-success-text">
                Ihre E-Mail-Adresse wurde erfolgreich verifiziert.
              </p>

              {/* Email Badge */}
              <div className="split-auth-email-badge">
                <MailIcon />
                <span>{email}</span>
              </div>

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
              <h3 className="split-auth-mobile-features-title">Ihre Vorteile:</h3>
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

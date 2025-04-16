import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "../styles/landing.css";
import logo from "../assets/logo-contractai.png";

interface UserResponse {
  email: string;
  subscriptionActive: boolean;
}

export default function HomeRedesign() {
  const [userEmail, setUserEmail] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();
  const featureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Nicht eingeloggt");
        const data: UserResponse = await res.json();
        setUserEmail(data.email);
        setIsPremium(data.subscriptionActive === true);
      } catch {
        console.log("🔓 Kein Login – Startseite zeigt CTA");
      }
    };

    fetchUser();
    const timer = setTimeout(() => setShowScrollButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToFeatures = () => {
    featureRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>Contract AI – Verträge smarter managen</title>
        <meta
          name="description"
          content="Verwalte, analysiere und optimiere Verträge mit Contract AI – deinem smarten Vertragsassistenten."
        />
      </Helmet>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <ul className="nav-links">
            <li className="logo"><Link to="/">Contract AI</Link></li>
            <li><a href="#features">Funktionen</a></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/pricing">Preise</Link></li>
            <li><a href="#contact">Kontakt</a></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <img src={logo} alt="Contract AI Logo" style={{ width: "120px", marginBottom: "20px" }} />
        <h1>Dein smarter Vertragsassistent</h1>
        <p className="subtitle">
          Lade Verträge hoch, analysiere sie mit KI, optimiere Inhalte und bleibe durch smarte Erinnerungen stets informiert.
        </p>

        {userEmail ? (
          <>
            <button className="button primary-button" onClick={() => navigate("/dashboard")}>
              🚀 Zum Dashboard
            </button>
            <div style={{ marginTop: "20px" }}>
              {isPremium ? (
                <span style={{ color: "#00f2fe", fontWeight: "bold" }}>💎 Premium aktiviert</span>
              ) : (
                <span style={{ color: "#ccc" }}>
                  🔓 Standard – <Link to="/pricing" style={{ color: "#fff", textDecoration: "underline" }}>Jetzt upgraden</Link>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="cta-buttons" style={{ marginTop: "20px" }}>
            <Link to="/login" className="button secondary-button">🔐 Login</Link>
            <Link to="/register" className="button secondary-button">📝 Registrieren</Link>
          </div>
        )}

        {showScrollButton && (
          <button className="button" onClick={scrollToFeatures} style={{ marginTop: "40px", background: "transparent", border: "1px solid #fff", color: "#fff" }}>
            ⬇️ Mehr entdecken
          </button>
        )}
      </section>

      {/* Features */}
      <section className="section" id="features" ref={featureRef}>
        <div className="section-container">
          <div className="section-title">
            <h2>Was Contract AI für dich tun kann</h2>
            <p>Erlebe den Unterschied mit smarter KI – von Analyse bis Optimierung.</p>
          </div>

          <div className="features">
            <Link to="/contracts" className="feature">
              <div className="feature-icon">🔍</div>
              <h3>Analyse</h3>
              <p>Verträge KI-gestützt auswerten & bewerten lassen.</p>
            </Link>

            <Link to="/optimizer" className="feature">
              <div className="feature-icon">🧠</div>
              <h3>Optimierung</h3>
              <p>Unvorteilhafte Inhalte erkennen & direkt verbessern.</p>
            </Link>

            <Link to="/calendar" className="feature">
              <div className="feature-icon">⏰</div>
              <h3>Erinnerungen</h3>
              <p>Nie wieder Fristen verpassen dank automatischer Mails.</p>
            </Link>

            <Link to="/compare" className="feature">
              <div className="feature-icon">📊</div>
              <h3>Vergleich</h3>
              <p>Zwei Verträge vergleichen & Unterschiede aufdecken.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
<section className="section dark-section" id="showcase">
  <div className="section-container">
    <div className="section-title">
      <h2>Contract AI in Aktion</h2>
      <p>So funktioniert dein smarter Vertragsassistent im Alltag – schnell, sicher und effizient.</p>
    </div>

    <div className="showcase">
      <div className="showcase-item">
        <div className="content">
          <h3>Vertragsanalyse mit Score</h3>
          <p>Unsere KI bewertet automatisch Risiken, Chancen und Verständlichkeit deines Vertrags – inklusive Contract Score zur Übersicht.</p>
          <Link to="/contracts" className="learn-more">
            Jetzt testen
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="image">
          <img src="/assets/showcase-analysis.png" alt="Vertragsanalyse Screenshot" />
        </div>
      </div>

      <div className="showcase-item">
        <div className="content">
          <h3>Fristen automatisch erkennen</h3>
          <p>Alle Kündigungsfristen & Laufzeiten im Blick – du wirst automatisch erinnert, bevor es zu spät ist.</p>
          <Link to="/calendar" className="learn-more">
            Erinnerungen aktivieren
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="image">
          <img src="/assets/showcase-deadline.png" alt="Fristenübersicht Screenshot" />
        </div>
      </div>
    </div>
  </div>
</section>

{/* Footer */}
<footer id="contact">
  <div className="footer-container">
    <div className="footer-links">
      <div className="footer-col">
        <h4>Funktionen</h4>
        <ul>
          <li><Link to="/contracts">Vertragsanalyse</Link></li>
          <li><Link to="/optimizer">Optimierung</Link></li>
          <li><Link to="/calendar">Fristen</Link></li>
          <li><Link to="/compare">Vergleich</Link></li>
        </ul>
      </div>

      <div className="footer-col">
        <h4>Unternehmen</h4>
        <ul>
          <li><a href="mailto:info@contract-ai.de">Kontakt</a></li>
          <li><a href="#">Über uns</a></li>
          <li><a href="#">Presse</a></li>
        </ul>
      </div>

      <div className="footer-col">
        <h4>Rechtliches</h4>
        <ul>
          <li><Link to="/privacy">Datenschutz</Link></li>
          <li><Link to="/terms">AGB</Link></li>
          <li><Link to="/imprint">Impressum</Link></li>
        </ul>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="copyright">
        <p>© {new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.</p>
      </div>
      <div className="legal-links">
        <Link to="/privacy">Datenschutz</Link>
        <Link to="/terms">Nutzungsbedingungen</Link>
        <Link to="/imprint">Impressum</Link>
      </div>
    </div>
  </div>
</footer>

    </>
  );
}

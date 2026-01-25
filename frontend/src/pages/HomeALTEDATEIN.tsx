import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/Home.module.css";
import logo from "../assets/logo-contractai.webp";
import { Helmet } from "react-helmet-async";

interface UserResponse {
  email: string;
  subscriptionActive: boolean;
}

export default function Home() {
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
    <div className={styles.container}>
      <Helmet>
        <title>Contract AI – Verträge smarter managen</title>
        <meta
          name="description"
          content="Verwalte, analysiere und optimiere Verträge mit Contract AI – deinem smarten Vertragsassistenten."
        />
        <meta
          name="keywords"
          content="Verträge, KI, Contract AI, Vertragsanalyse, Vertragsoptimierung, SaaS"
        />
        <meta property="og:title" content="Contract AI – Verträge smarter managen" />
        <meta
          property="og:description"
          content="Mit Contract AI kannst du Verträge KI-gestützt analysieren, vergleichen und optimieren."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://contract-ai.de" />
        <meta property="og:image" content="https://contract-ai.de/og-image.png" />
      </Helmet>

      <section className={styles.hero}>
        <img src={logo} alt="Contract AI Logo" className={styles.logo} />

        <p>
          Dein smarter Vertragsassistent. Lade Verträge hoch, analysiere sie mit KI,
          optimiere Inhalte und bleibe durch smarte Erinnerungen stets informiert.
        </p>

        {userEmail ? (
          <>
            <button className={styles.ctaButton} onClick={() => navigate("/dashboard")}>
              🚀 Zum Dashboard
            </button>
            <div className={styles.statusBox}>
              {isPremium ? (
                <span className={styles.premiumBadge}>💎 Premium aktiviert</span>
              ) : (
                <span className={styles.premiumBadge}>
                  🔓 Standard –{" "}
                  <Link to="/pricing" className={styles.upgradeLink}>
                    Jetzt upgraden
                  </Link>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className={styles.buttonRow}>
            <Link to="/login" className={styles.ctaButton}>
              🔐 Login
            </Link>
            <Link to="/register" className={styles.ctaButton}>
              📝 Registrieren
            </Link>
          </div>
        )}

        {showScrollButton && (
          <button className={styles.scrollButton} onClick={scrollToFeatures}>
            ⬇️ Mehr entdecken
          </button>
        )}
      </section>

      <section id="features" className={styles.features} ref={featureRef}>
        <Link to="/contracts" className={styles.featureCard}>
          <h3>🔍 Analyse</h3>
          <p>Verträge KI-gestützt auswerten & bewerten lassen.</p>
        </Link>
        <Link to="/optimizer" className={styles.featureCard}>
          <h3>🧠 Optimierung</h3>
          <p>Unvorteilhafte Inhalte erkennen & direkt verbessern.</p>
        </Link>
        <Link to="/calendar" className={styles.featureCard}>
          <h3>⏰ Erinnerungen</h3>
          <p>Nie wieder Fristen verpassen dank automatischer Mails.</p>
        </Link>
        <Link to="/compare" className={styles.featureCard}>
          <h3>📊 Vergleich</h3>
          <p>Zwei Verträge vergleichen & Unterschiede aufdecken.</p>
        </Link>
      </section>
    </div>
  );
}

// 📁 src/pages/Home.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import styles from "../styles/Home.module.css";
import logo from "../assets/logo-contractai.png"; // ← dein Logo

interface DecodedToken {
  email: string;
  exp: number;
  iat: number;
}

export default function Home() {
  const [userEmail, setUserEmail] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();
  const featureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setUserEmail(decoded.email);

        // ✅ Premium-Status abrufen
        fetch("http://localhost:5000/auth/me", {
          method: "GET",
          headers: {
            Authorization: token,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.isPremium) setIsPremium(true);
          })
          .catch((err) => console.error("❌ Fehler beim Laden des Profils:", err));
      } catch (err) {
        console.error("❌ Ungültiger Token", err);
      }
    }

    const timer = setTimeout(() => setShowScrollButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToFeatures = () => {
    featureRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.container}>
      {/* HERO-Bereich */}
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

      {/* FEATURES */}
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

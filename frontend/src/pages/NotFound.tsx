// NotFound - Stripe-Level 404 Page Design
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import styles from "../styles/NotFound.module.css";
import {
  Home, HelpCircle, FileSearch, Search, ArrowRight,
  TrendingUp, CreditCard, BookOpen
} from "lucide-react";

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parallax effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      const xPercent = (clientX / innerWidth - 0.5) * 20;
      const yPercent = (clientY / innerHeight - 0.5) * 20;

      const number = containerRef.current.querySelector(`.${styles.number}`) as HTMLElement;
      if (number) {
        number.style.transform = `translate(${xPercent}px, ${yPercent}px)`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const popularLinks = [
    { to: "/features/vertragsanalyse", label: "Vertragsanalyse", icon: <FileSearch size={16} /> },
    { to: "/features/optimierung", label: "Optimierung", icon: <TrendingUp size={16} /> },
    { to: "/pricing", label: "Preise", icon: <CreditCard size={16} /> },
    { to: "/blog", label: "Blog", icon: <BookOpen size={16} /> },
  ];

  return (
    <>
      <Helmet>
        <title>404 - Seite nicht gefunden | Contract AI</title>
        <meta name="description" content="Die gesuchte Seite wurde nicht gefunden. Zurück zur Startseite von Contract AI." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className={styles.pageBackground} ref={containerRef}>
        {/* Floating Elements */}
        <div className={styles.floatingElement1}></div>
        <div className={styles.floatingElement2}></div>
        <div className={styles.floatingElement3}></div>

        <div className={styles.container}>
          {/* 404 Number */}
          <div className={styles.numberWrapper}>
            <span className={styles.number}>404</span>
            <div className={styles.searchIcon}>
              <Search size={48} />
            </div>
          </div>

          {/* Content */}
          <h1 className={styles.title}>Seite nicht gefunden</h1>
          <p className={styles.description}>
            Die von dir gesuchte Seite existiert leider nicht.
            Vielleicht wurde sie verschoben oder gelöscht.
          </p>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Link to="/" className={styles.primaryButton}>
              <Home size={18} />
              Zur Startseite
              <ArrowRight size={18} className={styles.arrowIcon} />
            </Link>

            <Link to="/hilfe" className={styles.secondaryButton}>
              <HelpCircle size={18} />
              Hilfe-Center
            </Link>
          </div>

          {/* Popular Links */}
          <div className={styles.popularSection}>
            <p className={styles.popularTitle}>Beliebte Seiten</p>
            <div className={styles.popularLinks}>
              {popularLinks.map((link) => (
                <Link key={link.to} to={link.to} className={styles.popularLink}>
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

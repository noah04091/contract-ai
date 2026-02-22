// Datenschutz - Stripe-Level Legal Page Design
import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import styles from "../styles/LegalPage.module.css";
import Footer from "../components/Footer";
import {
  Shield, Lock, Server, CreditCard, User, Mail,
  FileText, Eye, Trash2, Database, Clock, AlertCircle,
  CheckCircle, Globe, ArrowRight, Calendar, ExternalLink,
  Key, Cookie, HardDrive, RefreshCw, Scale
} from "lucide-react";

export default function Datenschutz() {
  // Scroll animation
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    animatedRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !animatedRefs.current.includes(el)) {
      animatedRefs.current.push(el);
    }
  };

  // Scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Table of contents
  const tocItems = [
    { id: 'verantwortlicher', label: 'Verantwortlicher', num: '1' },
    { id: 'allgemeines', label: 'Datenverarbeitung', num: '2' },
    { id: 'website', label: 'Website-Daten', num: '3' },
    { id: 'hosting', label: 'Hosting', num: '4' },
    { id: 'dokumente', label: 'Dokumente & KI', num: '5' },
    { id: 'stripe', label: 'Zahlungen', num: '6' },
    { id: 'account', label: 'Benutzerkonto', num: '7' },
    { id: 'cookies', label: 'Cookies', num: '8' },
    { id: 'rechte', label: 'Ihre Rechte', num: '9' },
    { id: 'sicherheit', label: 'Sicherheit', num: '10' },
  ];

  return (
    <>
      <Helmet>
        <title>Datenschutzerklärung | Contract AI - DSGVO-konform</title>
        <meta name="description" content="DSGVO-konforme Datenschutzerklärung von Contract AI. Erfahren Sie, wie wir Ihre Daten schützen und verarbeiten." />
        <meta name="keywords" content="Datenschutz, DSGVO, Datenschutzerklärung, Contract AI, Privatsphäre" />
        <link rel="canonical" href="https://www.contract-ai.de/datenschutz" />
        <meta property="og:title" content="Datenschutzerklärung | Contract AI" />
        <meta property="og:description" content="DSGVO-konforme Datenschutzerklärung. Erfahren Sie, wie Contract AI Ihre Daten schützt." />
        <meta property="og:url" content="https://www.contract-ai.de/datenschutz" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <div className={styles.pageBackground}>
        <div className={styles.container}>
          {/* Hero Section */}
          <header className={styles.hero}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot}></span>
              DSGVO-konform
            </div>

            <div className={styles.heroIconWrapper}>
              <Shield className={styles.heroIcon} />
            </div>

            <h1 className={styles.heroTitle}>Datenschutzerklärung</h1>
            <p className={styles.heroSubtitle}>
              Informationen zur Verarbeitung Ihrer personenbezogenen Daten
              gemäß DSGVO und BDSG.
            </p>

            <div className={styles.lastUpdated}>
              <Calendar size={14} />
              Stand: Februar 2025
            </div>
          </header>

          {/* Main Content Card */}
          <div className={`${styles.contentCard} ${styles.animateOnScroll}`} ref={addToRefs}>

            {/* Table of Contents */}
            <div className={styles.tocSection}>
              <h3 className={styles.tocTitle}>Inhaltsverzeichnis</h3>
              <ul className={styles.tocList}>
                {tocItems.map((item) => (
                  <li
                    key={item.id}
                    className={styles.tocItem}
                    onClick={() => scrollToSection(item.id)}
                  >
                    <span className={styles.tocNumber}>{item.num}</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* 1. Verantwortlicher */}
            <section id="verantwortlicher" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <User size={22} />
                </div>
                <h2 className={styles.sectionTitle}>1. Verantwortlicher</h2>
              </div>

              <div className={styles.sectionContent}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <User size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Verantwortlich</div>
                      <div className={styles.infoValue}>
                        Noah Liebold<br />
                        Contract AI (SaaS-Plattform)
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Globe size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Adresse</div>
                      <div className={styles.infoValue}>
                        Richard-Oberle-Weg 27<br />
                        76648 Durmersheim
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Mail size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Kontakt</div>
                      <div className={styles.infoValue}>
                        <a href="mailto:info@contract-ai.de" className={styles.link}>info@contract-ai.de</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Allgemeines */}
            <section id="allgemeines" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <FileText size={22} />
                </div>
                <h2 className={styles.sectionTitle}>2. Allgemeines zur Datenverarbeitung</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der geltenden
                  Datenschutzgesetze (DSGVO, BDSG). Personenbezogene Daten werden nur verarbeitet, sofern:
                </p>

                <ul className={styles.bulletList}>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Dies zur <strong>Bereitstellung unserer Dienste</strong> erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO)</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Gesetzliche Verpflichtungen</strong> bestehen (Art. 6 Abs. 1 lit. c DSGVO)</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Eine <strong>Einwilligung</strong> vorliegt (Art. 6 Abs. 1 lit. a DSGVO)</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Ein <strong>berechtigtes Interesse</strong> besteht (Art. 6 Abs. 1 lit. f DSGVO)</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 3. Website-Daten */}
            <section id="website" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Globe size={22} />
                </div>
                <h2 className={styles.sectionTitle}>3. Erfassung von Daten beim Website-Besuch</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Beim Zugriff auf unsere Website werden automatisch folgende Daten verarbeitet:
                </p>

                <ul className={styles.bulletList}>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>IP-Adresse (gekürzt/anonymisiert)</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Datum und Uhrzeit des Zugriffs</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Browsertyp und -version</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Betriebssystem</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Referrer-URL</span>
                  </li>
                </ul>

                <div className={`${styles.highlightBox} ${styles.success}`}>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: technischer Betrieb, Sicherheit)
                </div>
              </div>
            </section>

            {/* 4. Hosting */}
            <section id="hosting" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Server size={22} />
                </div>
                <h2 className={styles.sectionTitle}>4. Hosting</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.textStrong} style={{ marginBottom: '12px', fontSize: '1rem' }}>
                  Frontend – Vercel
                </h3>
                <p>
                  Unsere Website wird bei <strong>Vercel Inc., USA</strong> gehostet.
                  Daten können in die USA übermittelt werden (Standard Contractual Clauses).
                </p>

                <h3 className={styles.textStrong} style={{ marginBottom: '12px', marginTop: '24px', fontSize: '1rem' }}>
                  Backend – Render
                </h3>
                <p>
                  Backend-API und Authentifizierung werden auf <strong>Render.com</strong> betrieben.
                  Daten können in Rechenzentren innerhalb der EU oder USA verarbeitet werden.
                </p>

                <div className={styles.highlightBox}>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b/f DSGVO (Vertragserfüllung / berechtigtes Interesse)
                </div>
              </div>
            </section>

            {/* 5. Dokumente & KI */}
            <section id="dokumente" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <HardDrive size={22} />
                </div>
                <h2 className={styles.sectionTitle}>5. Speicherung & Verarbeitung von Dokumenten</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.textStrong} style={{ marginBottom: '12px', fontSize: '1rem' }}>
                  Speicherung hochgeladener Verträge
                </h3>
                <p>
                  Für Uploads verwenden wir <strong>AWS S3</strong> (Region: Frankfurt – eu-central-1).
                  Es werden gespeichert: Hochgeladene PDFs, Metadaten (Name, Datum, Dateigröße, Hash, Nutzer-ID).
                </p>

                <h3 className={styles.textStrong} style={{ marginBottom: '12px', marginTop: '24px', fontSize: '1rem' }}>
                  KI-Verarbeitung (OpenAI API)
                </h3>
                <p>
                  Für die Analyse von Verträgen übermitteln wir Inhalte kurzfristig an die <strong>OpenAI API</strong>.
                </p>

                <div className={`${styles.highlightBox} ${styles.success}`}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Daten werden <strong>nicht</strong> zum Training der Modelle verwendet</li>
                    <li>Verschlüsselte Übertragung (HTTPS)</li>
                    <li>Daten werden bei OpenAI nach max. 30 Tagen gelöscht</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 6. Stripe */}
            <section id="stripe" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <CreditCard size={22} />
                </div>
                <h2 className={styles.sectionTitle}>6. Stripe – Zahlungsabwicklung</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Wir nutzen <strong>Stripe Payments Europe</strong>, Dublin, Irland.
                </p>
                <p>Verarbeitet werden: Name, E-Mail, Zahlungsinformationen, Abonnementdaten, Rechnungen.</p>

                <div className={styles.highlightBox}>
                  <strong>Rechtsgrundlage:</strong><br />
                  Art. 6 Abs. 1 lit. b DSGVO — Bereitstellung von Abo & Zahlung<br />
                  Art. 6 Abs. 1 lit. f DSGVO — Betrugserkennung, Sicherheit
                </div>
              </div>
            </section>

            {/* 7. Benutzerkonto */}
            <section id="account" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Key size={22} />
                </div>
                <h2 className={styles.sectionTitle}>7. Benutzerkonto / Registrierung</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Zur Nutzung von Contract AI ist ein Benutzerkonto erforderlich. Verarbeitete Daten:
                </p>

                <ul className={styles.bulletList}>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Name und E-Mail</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Passwort (gehasht mit bcrypt)</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Nutzungsdaten und Vertragsdaten</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Historie der Analysen</span>
                  </li>
                </ul>

                <div className={styles.highlightBox}>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                </div>
              </div>
            </section>

            {/* 8. Cookies */}
            <section id="cookies" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Cookie size={22} />
                </div>
                <h2 className={styles.sectionTitle}>8. Cookies & Tracking</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>Wir verwenden <strong>notwendige Cookies</strong> für:</p>

                <ul className={styles.bulletList}>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Login / Auth-Session</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Zahlungsabwicklung</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span>Sicherheit</span>
                  </li>
                </ul>

                <p style={{ marginTop: '16px' }}>
                  Daten werden anonymisiert oder pseudonymisiert gespeichert.
                </p>

                <div className={styles.highlightBox}>
                  <strong>Rechtsgrundlage:</strong><br />
                  Notwendige Cookies: Art. 6 Abs. 1 lit. f DSGVO<br />
                  Optionale Cookies: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
                </div>
              </div>
            </section>

            {/* 9. Ihre Rechte */}
            <section id="rechte" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Scale size={22} />
                </div>
                <h2 className={styles.sectionTitle}>9. Ihre Rechte</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>Sie haben folgende Rechte gemäß DSGVO:</p>

                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Eye size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Art. 15 DSGVO</div>
                      <div className={styles.infoValue}>Auskunftsrecht</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <RefreshCw size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Art. 16 DSGVO</div>
                      <div className={styles.infoValue}>Berichtigung</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Trash2 size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Art. 17 DSGVO</div>
                      <div className={styles.infoValue}>Löschung</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Lock size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Art. 18 DSGVO</div>
                      <div className={styles.infoValue}>Einschränkung</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Database size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Art. 20 DSGVO</div>
                      <div className={styles.infoValue}>Datenübertragbarkeit</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <AlertCircle size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Art. 21 DSGVO</div>
                      <div className={styles.infoValue}>Widerspruch</div>
                    </div>
                  </div>
                </div>

                <div className={`${styles.highlightBox} ${styles.warning}`} style={{ marginTop: '24px' }}>
                  <strong>Beschwerderecht:</strong> Sie können sich bei der zuständigen Aufsichtsbehörde beschweren:<br />
                  <a
                    href="https://www.baden-wuerttemberg.datenschutz.de/"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                  >
                    Landesbeauftragte für Datenschutz Baden-Württemberg
                    <ExternalLink size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  </a>
                </div>
              </div>
            </section>

            {/* 10. Sicherheit */}
            <section id="sicherheit" className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Lock size={22} />
                </div>
                <h2 className={styles.sectionTitle}>10. Sicherheit der Daten</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>Wir setzen folgende technische und organisatorische Maßnahmen ein:</p>

                <ul className={styles.bulletList}>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>TLS/SSL-Verschlüsselung</strong> für alle Datenübertragungen</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Server-Hardening</strong> und Zugriffsbeschränkungen</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Passwort-Hashing</strong> mit bcrypt</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Logging & Monitoring</strong> für Sicherheitsvorfälle</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Regelmäßige Backups</strong> aller Daten</span>
                  </li>
                </ul>

                <div className={`${styles.highlightBox} ${styles.success}`}>
                  <CheckCircle size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  <strong>Server-Standort:</strong> Alle Vertragsdaten werden auf EU-Servern (Frankfurt) gespeichert.
                </div>
              </div>
            </section>

            {/* Speicherdauer */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Clock size={22} />
                </div>
                <h2 className={styles.sectionTitle}>11. Speicherdauer</h2>
              </div>

              <div className={styles.sectionContent}>
                <ul className={styles.bulletList}>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Vertragsdaten:</strong> Gesetzliche Aufbewahrungspflichten (10 Jahre)</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Accountdaten:</strong> Bis zur Löschung des Kontos</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Uploads:</strong> Bis zur manuellen Löschung oder Kündigung</span>
                  </li>
                  <li className={styles.bulletItem}>
                    <span className={styles.bulletDot}></span>
                    <span><strong>Server-Logs:</strong> 14–30 Tage</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Änderungen */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <RefreshCw size={22} />
                </div>
                <h2 className={styles.sectionTitle}>12. Änderungen dieser Datenschutzerklärung</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen,
                  um sie an geänderte Rechtslagen oder bei Änderungen unserer Dienste anzupassen.
                </p>
                <p className={styles.textMuted}>
                  <strong>Stand:</strong> Februar 2025
                </p>
              </div>
            </section>
          </div>

          {/* Footer CTA */}
          <div className={`${styles.footerCta} ${styles.animateOnScroll}`} ref={addToRefs}>
            <h3 className={styles.footerCtaTitle}>Fragen zum Datenschutz?</h3>
            <p className={styles.footerCtaText}>
              Kontaktieren Sie uns unter{' '}
              <a href="mailto:info@contract-ai.de" className={styles.link}>info@contract-ai.de</a>
            </p>
            <Link to="/contact" className={styles.footerCtaButton}>
              Kontakt aufnehmen
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

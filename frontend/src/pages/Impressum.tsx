// Impressum - Stripe-Level Legal Page Design
import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import styles from "../styles/LegalPage.module.css";
import Footer from "../components/Footer";
import {
  FileText, Mail, Phone, User, Globe, Building2,
  CreditCard, Scale, Shield, ExternalLink, ArrowRight,
  Calendar, MapPin, Briefcase
} from "lucide-react";

export default function Impressum() {
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

  // Structured Data
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Contract AI",
    "url": "https://www.contract-ai.de",
    "logo": "https://www.contract-ai.de/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+49-176-55549923",
      "contactType": "customer service",
      "availableLanguage": ["German", "English"]
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Richard-Oberle-Weg 27",
      "addressLocality": "Durmersheim",
      "postalCode": "76648",
      "addressCountry": "DE"
    }
  };

  return (
    <>
      <Helmet>
        <title>Impressum | Contract AI - Rechtliche Angaben</title>
        <meta name="description" content="Impressum von Contract AI. Alle rechtlichen Angaben, Kontaktdaten und Informationen gemäß § 5 TMG zum KI-gestützten Vertragsmanagement." />
        <meta name="keywords" content="Impressum, Contract AI, Anbieterkennzeichnung, Kontakt, rechtliche Angaben" />
        <link rel="canonical" href="https://www.contract-ai.de/impressum" />
        <meta property="og:title" content="Impressum | Contract AI" />
        <meta property="og:description" content="Rechtliche Informationen und Kontaktdaten zu Contract AI." />
        <meta property="og:url" content="https://www.contract-ai.de/impressum" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Impressum | Contract AI" />
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        <div className={styles.container}>
          {/* Hero Section */}
          <header className={styles.hero}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot}></span>
              Rechtliche Informationen
            </div>

            <div className={styles.heroIconWrapper}>
              <FileText className={styles.heroIcon} />
            </div>

            <h1 className={styles.heroTitle}>Impressum</h1>
            <p className={styles.heroSubtitle}>
              Angaben gemäß § 5 TMG und § 18 Abs. 2 MStV
            </p>

            <div className={styles.lastUpdated}>
              <Calendar size={14} />
              Stand: Februar 2025
            </div>
          </header>

          {/* Main Content Card */}
          <div className={styles.contentCard}>

            {/* Betreiber */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Building2 size={22} />
                </div>
                <h2 className={styles.sectionTitle}>Betreiber der Plattform</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  <strong className={styles.textStrong}>Contract AI</strong> wird betrieben von:
                </p>

                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <User size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Inhaber</div>
                      <div className={styles.infoValue}>Noah Liebold</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <Briefcase size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Unternehmensform</div>
                      <div className={styles.infoValue}>Einzelunternehmen</div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <MapPin size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Adresse</div>
                      <div className={styles.infoValue}>
                        Richard-Oberle-Weg 27<br />
                        76648 Durmersheim<br />
                        Deutschland
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>
                      <CreditCard size={20} />
                    </div>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>USt-IdNr.</div>
                      <div className={styles.infoValue}>DE361461136</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Kontakt */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Mail size={22} />
                </div>
                <h2 className={styles.sectionTitle}>Kontakt</h2>
              </div>

              <div className={styles.contactGrid}>
                <a href="tel:+4917655549923" className={styles.contactCard}>
                  <div className={styles.contactIcon}>
                    <Phone size={22} />
                  </div>
                  <div>
                    <div className={styles.contactLabel}>Telefon</div>
                    <div className={styles.contactValue}>0176 5554 9923</div>
                  </div>
                </a>

                <a href="mailto:info@contract-ai.de" className={styles.contactCard}>
                  <div className={styles.contactIcon}>
                    <Mail size={22} />
                  </div>
                  <div>
                    <div className={styles.contactLabel}>E-Mail</div>
                    <div className={styles.contactValue}>info@contract-ai.de</div>
                  </div>
                </a>

                <a href="https://contract-ai.de" target="_blank" rel="noreferrer" className={styles.contactCard}>
                  <div className={styles.contactIcon}>
                    <Globe size={22} />
                  </div>
                  <div>
                    <div className={styles.contactLabel}>Website</div>
                    <div className={styles.contactValue}>contract-ai.de</div>
                  </div>
                </a>
              </div>
            </section>

            {/* Tätigkeitsbereich */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Briefcase size={22} />
                </div>
                <h2 className={styles.sectionTitle}>Tätigkeitsbereich</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Softwareentwicklung, KI-gestützte Webanwendungen und digitale SaaS-Plattformen
                  im Bereich Vertragsmanagement und Rechtstechnologie.
                </p>

                <div className={styles.highlightBox}>
                  Contract AI bietet KI-basierte Vertragsanalyse, -optimierung und -generierung
                  für Unternehmen und Privatpersonen. Alle Daten werden DSGVO-konform auf
                  deutschen Servern verarbeitet.
                </div>
              </div>
            </section>

            {/* Verantwortlich für Inhalte */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <User size={22} />
                </div>
                <h2 className={styles.sectionTitle}>Verantwortlich für den Inhalt</h2>
              </div>

              <div className={styles.sectionContent}>
                <p className={styles.textMuted}>Gemäß § 18 Abs. 2 MStV:</p>
                <p>
                  <strong className={styles.textStrong}>Noah Liebold</strong><br />
                  Richard-Oberle-Weg 27<br />
                  76648 Durmersheim
                </p>
              </div>
            </section>

            {/* Haftungsausschluss */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Scale size={22} />
                </div>
                <h2 className={styles.sectionTitle}>Haftungsausschluss</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.textStrong} style={{ marginBottom: '12px', fontSize: '1rem' }}>
                  Haftung für Inhalte
                </h3>
                <p>
                  Ich bin gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
                  allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht
                  verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
                </p>

                <h3 className={styles.textStrong} style={{ marginBottom: '12px', marginTop: '24px', fontSize: '1rem' }}>
                  Haftung für Links
                </h3>
                <p>
                  Für Inhalte externer Webseiten, auf die ich verlinke, übernehme ich keine
                  Verantwortung. Für diese sind ausschließlich deren Betreiber verantwortlich.
                </p>

                <h3 className={styles.textStrong} style={{ marginBottom: '12px', marginTop: '24px', fontSize: '1rem' }}>
                  Urheberrecht
                </h3>
                <p>
                  Alle Inhalte dieser Website unterliegen dem deutschen Urheberrecht.
                  Vervielfältigung, Bearbeitung oder Verbreitung bedürfen der schriftlichen
                  Zustimmung des Autors.
                </p>
              </div>
            </section>

            {/* Streitbeilegung */}
            <section className={`${styles.section} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Shield size={22} />
                </div>
                <h2 className={styles.sectionTitle}>Verbraucherstreitbeilegung</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Ich bin nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren
                  vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>

                <div className={`${styles.highlightBox} ${styles.warning}`}>
                  <p style={{ margin: 0 }}>
                    <strong>EU-Streitbeilegung:</strong> Die Europäische Kommission stellt eine
                    Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                    <a
                      href="https://ec.europa.eu/consumers/odr"
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      https://ec.europa.eu/consumers/odr
                      <ExternalLink size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                    </a>
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer CTA */}
          <div className={`${styles.footerCta} ${styles.animateOnScroll}`} ref={addToRefs}>
            <h3 className={styles.footerCtaTitle}>Haben Sie Fragen?</h3>
            <p className={styles.footerCtaText}>
              Kontaktieren Sie uns - wir helfen Ihnen gerne weiter.
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

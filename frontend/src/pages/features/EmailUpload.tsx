import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
// import AutoPlayVideo from "../../components/AutoPlayVideo"; // Auskommentiert bis Video erstellt wird
import {
  Mail, CheckCircle, Shield, Zap, Play,
  ArrowRight, ChevronDown, Star, FolderOpen, Calendar, Search
} from "lucide-react";

const EmailUpload: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/contracts";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

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

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
      { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://www.contract-ai.de/features" },
      { "@type": "ListItem", "position": 3, "name": "E-Mail Upload", "item": "https://www.contract-ai.de/features/email-upload" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Ist der E-Mail-Upload sicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, der E-Mail-Upload ist vollständig DSGVO-konform. E-Mails werden nicht gespeichert, nur die PDF-Anhänge werden verschlüsselt übertragen."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert der E-Mail-Upload?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nach der Registrierung erhalten Sie eine persönliche E-Mail-Adresse. Leiten Sie einfach E-Mails mit PDF-Anhängen dorthin weiter."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Dateiformate werden unterstützt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Aktuell werden PDF- und DOCX-Dateien unterstützt (max. 15 MB)."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertrag per E-Mail hochladen – automatisch | Contract AI</title>
        <meta name="description" content="Verträge per E-Mail hochladen – vollautomatisch! Einfach Vertrag weiterleiten, KI erkennt & importiert sofort. Von überall, jederzeit, DSGVO-konform. ✓ Jetzt E-Mail-Adresse einrichten" />
        <meta name="keywords" content="Vertrag per E-Mail hochladen, Vertrag weiterleiten, automatischer Upload, E-Mail Vertrag speichern, Vertrag aus E-Mail, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/email-upload" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertrag per E-Mail hochladen – automatisch | Contract AI" />
        <meta property="og:description" content="Verträge per E-Mail hochladen – vollautomatisch! Einfach weiterleiten, KI erkennt & importiert. ✓ Jetzt einrichten" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/email-upload" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-email-upload.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrag per E-Mail hochladen – automatisch | Contract AI" />
        <meta name="twitter:description" content="Verträge per E-Mail hochladen – vollautomatisch! Einfach weiterleiten, KI erkennt & importiert. ✓ Jetzt einrichten" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-email-upload.png" />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        {/* Ambient Background */}
        <div className={styles.ambientBg}>
          <div className={`${styles.ambientOrb} ${styles.orb1}`} />
          <div className={`${styles.ambientOrb} ${styles.orb2}`} />
          <div className={`${styles.ambientOrb} ${styles.orb3}`} />
        </div>

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                Verträge per E-Mail hochladen –{' '}
                <span className={styles.heroTitleHighlight}>ein Klick</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Sie erhalten einen Vertrag per E-Mail? Einfach weiterleiten – fertig.
                Das System erkennt PDFs automatisch und legt sie in Ihrem Dashboard ab.
              </p>
              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  E-Mail-Adresse erhalten
                  <ArrowRight size={18} />
                </Link>
                <a href="#so-funktionierts" className={styles.btnSecondary}>
                  <Play size={18} />
                  So funktioniert's
                </a>
              </div>
            </div>
            <div className={styles.heroVisual}>
              {/* Floating Element 1 */}
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Zap size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Automatisch</div>
                  <div className={styles.floatingSubtext}>Kein manueller Upload</div>
                </div>
              </div>

              {/* Floating Element 2 */}
              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>E-Mails nicht gespeichert</div>
                  <div className={styles.floatingSubtext}>Nur PDFs</div>
                </div>
              </div>

              {/* Demo Window - Zeigt den einfachen Flow */}
              <div className={styles.demoWindow}>
                <div className={styles.demoHeader}>
                  <span className={`${styles.demoDot} ${styles.demoDotRed}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotYellow}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotGreen}`}></span>
                </div>
                <div className={styles.demoContent}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', marginBottom: '10px' }}>
                    <Mail size={20} style={{ color: '#3b82f6' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>E-Mail weiterleiten an:</div>
                      <div style={{ fontSize: '12px', color: '#3b82f6', fontFamily: 'monospace' }}>ihr-name@inbox.contract-ai.de</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                    <div style={{ width: '2px', height: '24px', background: 'linear-gradient(to bottom, #3b82f6, #22c55e)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '8px' }}>
                    <CheckCircle size={20} style={{ color: '#22c55e' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Mietvertrag_2024.pdf</div>
                      <div style={{ fontSize: '12px', color: '#22c55e' }}>Im Dashboard verfügbar</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <div className={styles.container}>
          <div className={styles.trustBadgesRow}>
            <div className={styles.trustBadge}>
              <Shield size={20} />
              <span>DSGVO-konform</span>
            </div>
            <div className={styles.trustBadge}>
              <Mail size={20} />
              <span>E-Mails nicht gespeichert</span>
            </div>
            <div className={styles.trustBadge}>
              <Zap size={20} />
              <span>Sofort verfügbar</span>
            </div>
            <div className={styles.trustBadge}>
              <Star size={20} />
              <span>Gmail, Outlook & mehr</span>
            </div>
          </div>
        </div>

        {/* Video Section - Auskommentiert bis Video erstellt wird
        <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.videoFrame}>
            <AutoPlayVideo
              src="/videos/email-upload-demo.mp4"
              poster="/videos/email-upload-poster.jpg"
              alt="E-Mail-Upload Demo"
            />
          </div>
        </div>
        */}

        {/* Process Section - Das ist die Hauptinfo für dieses simple Feature */}
        <section id="so-funktionierts" className={`${styles.processSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>So einfach geht's</span>
              <h2 className={styles.sectionTitle}>3 Schritte – mehr nicht</h2>
            </div>
            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>
              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Ihre persönliche E-Mail-Adresse</h3>
                    <p className={styles.processDesc}>
                      Nach der Registrierung finden Sie Ihre E-Mail-Adresse im Dashboard
                      (z.B. <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>max123@inbox.contract-ai.de</code>).
                    </p>
                  </div>
                </div>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>E-Mail weiterleiten</h3>
                    <p className={styles.processDesc}>
                      Vertrag per E-Mail erhalten? Klicken Sie auf "Weiterleiten" und
                      senden Sie die E-Mail an Ihre Contract AI Adresse.
                    </p>
                  </div>
                </div>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Fertig!</h3>
                    <p className={styles.processDesc}>
                      Der Vertrag erscheint automatisch in Ihrem Dashboard.
                      Optional: KI-Analyse wird direkt gestartet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Kompakt, 3 Hauptvorteile */}
        <section className={`${styles.functionsSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>Vorteile</span>
              <h2 className={styles.sectionTitle}>Warum E-Mail-Upload?</h2>
            </div>
            <div className={styles.whyGrid}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Zap size={24} />
                </div>
                <h3 className={styles.whyTitle}>Kein manueller Upload</h3>
                <p className={styles.whyDesc}>
                  Vertrag kommt per E-Mail? Einfach weiterleiten statt herunterladen,
                  einloggen, hochladen.
                </p>
              </div>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.whyTitle}>Maximale Privatsphäre</h3>
                <p className={styles.whyDesc}>
                  E-Mails werden NICHT gespeichert. Nur PDF-Anhänge werden
                  verschlüsselt auf deutschen Servern abgelegt.
                </p>
              </div>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <CheckCircle size={24} />
                </div>
                <h3 className={styles.whyTitle}>Von überall</h3>
                <p className={styles.whyDesc}>
                  Funktioniert mit Gmail, Outlook, Apple Mail, Yahoo – auf
                  PC, Tablet oder Smartphone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats - Kompakt, 3 wichtigste Zahlen */}
        <section className={`${styles.statsSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>0</div>
                <div className={styles.statLabel}>E-Mails gespeichert</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>Frankfurt</div>
                <div className={styles.statLabel}>Server-Standort (DE)</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>15 MB</div>
                <div className={styles.statLabel}>Max. Dateigröße</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Nur die 4 wichtigsten Fragen */}
        <section className={`${styles.faqSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            </div>
            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ist der E-Mail-Upload sicher?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, vollständig. E-Mails werden NICHT gespeichert – nur PDF-Anhänge.
                  Diese werden verschlüsselt auf deutschen Servern (Frankfurt) gespeichert.
                </p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche E-Mail-Anbieter funktionieren?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Alle: Gmail, Outlook, Apple Mail, Yahoo, GMX, Web.de und jeder andere
                  E-Mail-Client. Einfach E-Mail weiterleiten – fertig.
                </p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Dateien werden unterstützt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  PDF- und DOCX-Dateien bis max. 15 MB. Andere Anhänge werden ignoriert.
                </p>
              </details>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden meine E-Mails gespeichert?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein, niemals. Wir speichern nur die PDF-Anhänge. E-Mail-Text und
                  -Inhalt werden sofort gelöscht.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <section className={`${styles.relatedSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Das passiert mit Ihren Verträgen</h2>
            </div>
            <div className={styles.relatedGrid}>
              <Link to="/features/vertragsverwaltung" className={styles.relatedCard}>
                <span className={styles.relatedIcon}><FolderOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Zentrale Verwaltung</div>
                  <div className={styles.relatedDescription}>
                    Alle Verträge an einem Ort organisiert
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
              <Link to="/features/fristen" className={styles.relatedCard}>
                <span className={styles.relatedIcon}><Calendar size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Automatische Erinnerungen</div>
                  <div className={styles.relatedDescription}>
                    Keine Kündigungsfrist mehr verpassen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
              <Link to="/features/vertragsanalyse" className={styles.relatedCard}>
                <span className={styles.relatedIcon}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>KI-Analyse</div>
                  <div className={styles.relatedDescription}>
                    Risiken und wichtige Klauseln erkennen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`${styles.ctaSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.ctaCard}>
              <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>Verträge einfach per E-Mail hochladen</h2>
                <p className={styles.ctaSubtitle}>
                  Registrieren Sie sich und erhalten Sie Ihre persönliche Upload-Adresse.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt kostenlos starten
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default EmailUpload;

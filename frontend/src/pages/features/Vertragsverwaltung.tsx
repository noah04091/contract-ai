import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
// import AutoPlayVideo from "../../components/AutoPlayVideo"; // Auskommentiert bis Video erstellt wird
import {
  Search, Shield, Cloud, Tags, Clock,
  ArrowRight, ChevronDown, FileText, Calendar, Mail
} from "lucide-react";

// Video - Auskommentiert bis Video erstellt wird
// const vertragsverwaltungVideo = "/Videos/vertragsverwaltung.mp4";

const Vertragsverwaltung: React.FC = () => {
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
      { "@type": "ListItem", "position": 3, "name": "Vertragsverwaltung", "item": "https://www.contract-ai.de/features/vertragsverwaltung" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie viele Verträge kann ich speichern?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mit dem Free-Plan können Sie bis zu 5 Verträge speichern. Business bietet 50 Verträge, Enterprise ist unbegrenzt."
        }
      },
      {
        "@type": "Question",
        "name": "Ist meine Vertragsdatenbank sicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, alle Daten werden auf deutschen Servern (Frankfurt) verschlüsselt gespeichert. Vollständig DSGVO-konform."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich Verträge kategorisieren?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Sie können eigene Tags erstellen und Verträge nach beliebigen Kriterien organisieren."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Verträge verwalten – Vertragsmanagement Software | Contract AI</title>
        <meta name="description" content="Alle Verträge digital verwalten an einem Ort: Smart-Search findet alles in Sekunden, Cloud-Speicher, Tagging, Fristen-Alerts. Vertragsmanagement Software Made in Germany. ✓ Kostenlos starten" />
        <meta name="keywords" content="Verträge verwalten, Vertragsverwaltung, Vertragsmanagement Software, Verträge organisieren, Verträge digital verwalten, alle Verträge an einem Ort, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/vertragsverwaltung" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Verträge verwalten – Vertragsmanagement Software | Contract AI" />
        <meta property="og:description" content="Alle Verträge digital verwalten: Smart-Search, Cloud-Speicher, Fristen-Alerts. Made in Germany. ✓ Kostenlos starten" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/vertragsverwaltung" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsverwaltung.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge verwalten – Vertragsmanagement Software | Contract AI" />
        <meta name="twitter:description" content="Alle Verträge digital verwalten: Smart-Search, Cloud-Speicher, Fristen-Alerts. Made in Germany. ✓ Kostenlos starten" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsverwaltung.png" />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        {/* Ambient Orbs */}
        <div className={styles.ambientBg}>
          <div className={`${styles.ambientOrb} ${styles.orb1}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb2}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb3}`}></div>
        </div>

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                Digitale Vertragsverwaltung
              </div>

              <h1 className={styles.heroTitle}>
                Alle Verträge<br/>
                <span className={styles.heroTitleHighlight}>an einem Ort</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Schluss mit Ordner-Chaos. Contract AI organisiert Ihre Verträge zentral,
                durchsuchbar und sicher – mit Smart-Search, Tagging und automatischen
                Erinnerungen.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Verträge organisieren
                  <ArrowRight size={20} />
                </Link>
                <a href="#funktionen" className={styles.btnSecondary}>
                  <Search size={18} />
                  Funktionen entdecken
                </a>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Search size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Smart-Search</div>
                  <div className={styles.floatingSubtext}>{'< 2s Ergebnis'}</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>DSGVO</div>
                  <div className={styles.floatingSubtext}>Deutsche Server</div>
                </div>
              </div>

              <div className={styles.demoWindow}>
                <div className={styles.demoHeader}>
                  <span className={`${styles.demoDot} ${styles.demoDotRed}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotYellow}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotGreen}`}></span>
                </div>
                <div className={styles.demoContent}>
                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px' }}>
                    <Search size={16} style={{ color: '#64748b' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Verträge durchsuchen...</span>
                  </div>

                  {/* Contract List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                      <FileText size={16} style={{ color: '#3b82f6' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>Mietvertrag_2024.pdf</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Wohnung • Gültig bis 31.12.2025</div>
                      </div>
                      <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px' }}>Wohnung</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                      <FileText size={16} style={{ color: '#64748b' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>Arbeitsvertrag_GmbH.pdf</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Arbeit • Unbefristet</div>
                      </div>
                      <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px' }}>Arbeit</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                      <FileText size={16} style={{ color: '#64748b' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>KFZ_Versicherung.pdf</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Auto • Kündigbar 30.11</div>
                      </div>
                      <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>Auto</span>
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
              <Cloud size={18} />
              Sichere Cloud
            </div>
            <div className={styles.trustBadge}>
              <Search size={18} />
              Smart-Search
            </div>
            <div className={styles.trustBadge}>
              <Tags size={18} />
              Tagging-System
            </div>
            <div className={styles.trustBadge}>
              <Shield size={18} />
              DSGVO-konform
            </div>
          </div>
        </div>

        {/* Video Section - Auskommentiert bis Video erstellt wird
        <section className={styles.videoSection} id="video">
          <div className={styles.container}>
            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={vertragsverwaltungVideo}
                  poster="/videos/vertragsverwaltung-poster.jpg"
                  alt="Vertragsverwaltung Demo"
                />
              </div>
            </div>
          </div>
        </section>
        */}

        {/* Funktionen - 6 Feature Cards */}
        <section className={`${styles.functionsSection} ${styles.animateOnScroll}`} ref={addToRefs} id="funktionen">
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>Funktionen</span>
              <h2 className={styles.sectionTitle}>Was die Vertragsverwaltung kann</h2>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Search size={24} />
                </div>
                <h3 className={styles.functionTitle}>Smart-Search</h3>
                <p className={styles.functionDesc}>
                  Volltextsuche durch alle Verträge. Finden Sie jeden Vertrag in Sekunden.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Tags size={24} />
                </div>
                <h3 className={styles.functionTitle}>Eigene Tags</h3>
                <p className={styles.functionDesc}>
                  Erstellen Sie Tags und kategorisieren Sie Verträge nach Ihren Bedürfnissen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Erinnerungen</h3>
                <p className={styles.functionDesc}>
                  Automatische Benachrichtigungen vor Kündigungsfristen per E-Mail.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <Cloud size={24} />
                </div>
                <h3 className={styles.functionTitle}>Cloud-Speicher</h3>
                <p className={styles.functionDesc}>
                  Verschlüsselte Speicherung auf deutschen Servern. Überall Zugriff.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)', color: '#f59e0b' }}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Notizen & Anhänge</h3>
                <p className={styles.functionDesc}>
                  Fügen Sie Notizen hinzu und verknüpfen Sie zusammengehörige Dokumente.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>DSGVO-konform</h3>
                <p className={styles.functionDesc}>
                  256-bit Verschlüsselung, EU-Hosting, vollständige Datenschutzkonformität.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section - 3 Schritte */}
        <section className={`${styles.processSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>So funktioniert's</span>
              <h2 className={styles.sectionTitle}>In 3 Schritten zur Ordnung</h2>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Verträge hochladen</h3>
                    <p className={styles.processDesc}>
                      Per Drag & Drop, E-Mail-Weiterleitung oder Scanner.
                      PDF, DOCX und Bilder werden unterstützt.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische Erkennung</h3>
                    <p className={styles.processDesc}>
                      Die KI erkennt Vertragstyp, Fristen und wichtige Daten –
                      ohne manuelle Eingabe.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Organisieren & Verwalten</h3>
                    <p className={styles.processDesc}>
                      Tags hinzufügen, Erinnerungen setzen und alle Verträge
                      jederzeit im Blick haben.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Kompakt */}
        <section className={`${styles.statsSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>{'< 2s'}</div>
                <div className={styles.statLabel}>Suchzeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>256-bit</div>
                <div className={styles.statLabel}>Verschlüsselung</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>Frankfurt</div>
                <div className={styles.statLabel}>Server-Standort</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className={`${styles.faqSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie viele Verträge kann ich speichern?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Free: 5 Verträge. Business: 50 Verträge. Enterprise: Unbegrenzt.
                  Max. 15 MB pro Vertrag.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Sind meine Verträge sicher?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, 256-bit AES Verschlüsselung, deutsche Server (Frankfurt),
                  vollständig DSGVO-konform.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktionieren die Erinnerungen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die KI erkennt Fristen automatisch. Sie erhalten E-Mail-Erinnerungen
                  30, 14 und 3 Tage vorher.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich Verträge exportieren?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, jederzeit als ZIP-Archiv. Ihre Daten gehören Ihnen.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <section className={`${styles.relatedSection} ${styles.animateOnScroll}`} ref={addToRefs}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Verwandte Funktionen</h2>
            </div>

            <div className={styles.relatedGrid}>
              <Link to="/features/vertragsanalyse" className={styles.relatedCard}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Verträge automatisch auf Risiken prüfen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/fristen" className={styles.relatedCard}>
                <span className={styles.relatedIcon} style={{ color: '#f59e0b' }}><Calendar size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Fristenkalender</div>
                  <div className={styles.relatedDescription}>
                    Alle Termine im Kalender-Überblick
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/email-upload" className={styles.relatedCard}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><Mail size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>E-Mail-Upload</div>
                  <div className={styles.relatedDescription}>
                    Verträge per E-Mail hochladen
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
                <h2 className={styles.ctaTitle}>Bringen Sie Ordnung in Ihre Verträge</h2>
                <p className={styles.ctaSubtitle}>
                  Schluss mit Chaos. Alle Verträge zentral, durchsuchbar, mit automatischen Erinnerungen.
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

export default Vertragsverwaltung;

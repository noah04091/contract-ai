import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
// import AutoPlayVideo from "../../components/AutoPlayVideo"; // Auskommentiert bis Video erstellt wird
import {
  Eye, MousePointer, Scale, AlertTriangle,
  ArrowRight, ChevronDown, Lightbulb, FileText, Clock, Zap, Search, Sparkles
} from "lucide-react";

const LegalLens: React.FC = () => {
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
      { "@type": "ListItem", "position": 3, "name": "Legal Lens", "item": "https://www.contract-ai.de/features/legal-lens" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Was ist Legal Lens?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Lens ist eine interaktive Vertragsansicht, bei der Sie auf jede Klausel klicken können, um sofort eine verständliche Erklärung, Risikobewertung und Verhandlungstipps zu erhalten."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert die Klausel-Erklärung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Klicken Sie einfach auf eine Klausel im Vertrag. Die KI analysiert den Text sofort und zeigt: Was bedeutet das? Ist es fair? Welche Risiken gibt es?"
        }
      },
      {
        "@type": "Question",
        "name": "Für wen ist Legal Lens geeignet?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Lens ist für jeden geeignet, der Verträge verstehen möchte - Privatpersonen, Freiberufler, Unternehmer. Keine juristischen Vorkenntnisse nötig."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertragsklauseln verstehen – Kleingedrucktes erklärt | Contract AI</title>
        <meta name="description" content="Vertragsklauseln verstehen mit einem Klick: Kompliziertes Kleingedrucktes einfach erklärt. Risikobewertung, Bedeutung, Verhandlungstipps. Nie wieder im Dunkeln tappen! ✓ Jetzt testen" />
        <meta name="keywords" content="Vertragsklauseln verstehen, Kleingedrucktes verstehen, Klausel Bedeutung, was bedeutet diese Klausel, Vertrag verstehen, Legal Lens, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/legal-lens" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertragsklauseln verstehen – Kleingedrucktes erklärt | Contract AI" />
        <meta property="og:description" content="Vertragsklauseln verstehen mit einem Klick: Kleingedrucktes einfach erklärt, Risikobewertung inklusive. ✓ Jetzt testen" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/legal-lens" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-legal-lens.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsklauseln verstehen – Kleingedrucktes erklärt | Contract AI" />
        <meta name="twitter:description" content="Vertragsklauseln verstehen mit einem Klick: Kleingedrucktes einfach erklärt, Risikobewertung inklusive. ✓ Jetzt testen" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-legal-lens.png" />

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

        {/* ==========================================
            HERO SECTION - V5 Side-by-Side Layout
            ========================================== */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                Interaktive Vertragsansicht
              </div>

              <h1 className={styles.heroTitle}>
                Klicken. Verstehen.<br/>
                <span className={styles.heroTitleHighlight}>Verhandeln.</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Legal Lens macht Verträge interaktiv. Klicken Sie auf eine Klausel und
                erhalten Sie sofort: Erklärung, Risikobewertung, Verhandlungstipp.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Legal Lens testen
                  <ArrowRight size={20} />
                </Link>
                <a href="#funktionen" className={styles.btnSecondary}>
                  <Eye size={18} />
                  Funktionen entdecken
                </a>
              </div>
            </div>

            {/* Interactive Demo Visual */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconOrange}`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Kritisch</div>
                  <div className={styles.floatingSubtext}>Haftungsklausel</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Lightbulb size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Tipp</div>
                  <div className={styles.floatingSubtext}>Deckelung fordern</div>
                </div>
              </div>

              <div className={styles.demoWindow}>
                <div className={styles.demoHeader}>
                  <span className={`${styles.demoDot} ${styles.demoDotRed}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotYellow}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotGreen}`}></span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Legal Lens</span>
                </div>
                <div className={styles.demoContent} style={{ display: 'flex', gap: '10px', padding: '10px' }}>
                  {/* Dokument (links) */}
                  <div style={{ flex: 1, background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', padding: '10px', fontSize: '9px', lineHeight: 1.6, color: '#64748b' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px', fontSize: '10px' }}>Mietvertrag.pdf</div>
                    <div style={{ marginBottom: '4px' }}>§ 6 Der Mieter verpflichtet sich zur ordnungsgemäßen Pflege...</div>
                    {/* Highlighted Clause */}
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      borderLeft: '3px solid #ef4444',
                      padding: '6px 8px',
                      borderRadius: '0 4px 4px 0',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <span style={{ color: '#1e293b' }}>§ 7 Der Vermieter haftet nicht für Schäden, die durch höhere Gewalt entstehen...</span>
                      <div style={{
                        position: 'absolute', right: '-4px', top: '50%', transform: 'translateY(-50%)',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <MousePointer size={8} color="#fff" />
                      </div>
                    </div>
                    <div>§ 8 Die Kaution beträgt drei Monatsmieten...</div>
                  </div>
                  {/* Erklärung (rechts) */}
                  <div style={{ width: '45%', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <AlertTriangle size={14} color="#ef4444" />
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626' }}>Kritische Klausel</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#334155', marginBottom: '8px', lineHeight: 1.5 }}>
                      Diese Klausel schließt die Haftung <strong>sehr weit</strong> aus. "Höhere Gewalt" ist nicht definiert.
                    </div>
                    <div style={{
                      background: '#fff', borderRadius: '4px', padding: '6px 8px',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      <Lightbulb size={12} color="#3b82f6" />
                      <span style={{ fontSize: '9px', color: '#3b82f6' }}>Tipp: Definition fordern</span>
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
              <MousePointer size={18} />
              Klick = Erklärung
            </div>
            <div className={styles.trustBadge}>
              <Scale size={18} />
              Fairness-Check
            </div>
            <div className={styles.trustBadge}>
              <Lightbulb size={18} />
              Verhandlungstipps
            </div>
          </div>
        </div>

        {/* ==========================================
            VIDEO SECTION - Auskommentiert bis Video erstellt wird
            ==========================================
        <section className={styles.videoSection} id="video">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So sieht's aus</span>
              <h2 className={styles.sectionTitle}>Legal Lens in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie einfach Sie jede Klausel verstehen können.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src="/videos/legal-lens-demo.mp4"
                  poster="/videos/legal-lens-poster.jpg"
                  alt="Legal Lens Demo"
                />
              </div>
            </div>
          </div>
        </section>
        */}

        {/* ==========================================
            FUNKTIONEN SECTION (4 Feature Cards)
            ========================================== */}
        <section className={styles.functionsSection} id="funktionen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Bei jedem Klick</span>
              <h2 className={styles.sectionTitle}>Das erfahren Sie sofort</h2>
              <p className={styles.sectionSubtitle}>
                Klicken Sie auf eine Klausel und erhalten Sie alle wichtigen Informationen.
              </p>
            </div>

            <div className={styles.functionsGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Verständliche Erklärung</h3>
                <p className={styles.functionDesc}>
                  Was bedeutet diese Klausel konkret für Sie? In einfacher Sprache erklärt.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Risiko-Einschätzung</h3>
                <p className={styles.functionDesc}>
                  Grün, Gelb oder Rot – wie kritisch ist diese Klausel für Sie?
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Fairness-Bewertung</h3>
                <p className={styles.functionDesc}>
                  Ist die Klausel ausgewogen oder bevorzugt sie die Gegenseite?
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)', color: '#f59e0b' }}>
                  <Lightbulb size={24} />
                </div>
                <h3 className={styles.functionTitle}>Verhandlungstipp</h3>
                <p className={styles.functionDesc}>
                  Konkrete Formulierung, wie Sie bessere Konditionen aushandeln können.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PROBLEM SECTION
            ========================================== */}
        <section className={styles.problemSection} id="problem">
          <div className={styles.container}>
            <div className={styles.problemGrid}>
              <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Das Problem</span>
                <h2 className={styles.sectionTitleLeft}>Verträge sind absichtlich kompliziert</h2>
                <p className={styles.problemText}>
                  "Salvatorische Klausel", "Gewährleistungsausschluss", "Gerichtsstandsvereinbarung" –
                  Juristen-Sprache, die kaum jemand versteht. Und genau das ist gewollt.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>73%</div>
                    <div className={styles.problemStatLabel}>verstehen ihre Verträge nicht vollständig</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>42%</div>
                    <div className={styles.problemStatLabel}>übersehen kritische Klauseln</div>
                  </div>
                </div>
              </div>

              <div className={`${styles.problemVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.problemDoc}>
                  <div className={styles.problemDocHeader}>
                    <div className={styles.problemDocIcon}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className={styles.problemDocTitle}>Vertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>12 Seiten Juristen-Sprache</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...salvatorische Klausel..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Was bedeutet das?
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Stunden googeln
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SOLUTION SECTION
            ========================================== */}
        <section className={styles.solutionSection} id="solution">
          <div className={styles.container}>
            <div className={styles.solutionGrid}>
              <div className={`${styles.solutionVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionComparison}>
                  <div className={`${styles.comparisonCard} ${styles.before}`}>
                    <span className={styles.comparisonLabel}>Klassisch</span>
                    <div className={styles.comparisonIcon}>
                      <Clock size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Begriff googeln</div>
                    <div className={styles.comparisonDesc}>
                      Juristen-Artikel lesen, immer noch verwirrt.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      Stunden
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Mit Legal Lens</span>
                    <div className={styles.comparisonIcon}>
                      <MousePointer size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Klausel anklicken</div>
                    <div className={styles.comparisonDesc}>
                      Sofort verstehen, Tipp bekommen.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      2 Sekunden
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Klicken statt googeln</h2>
                <p className={styles.solutionText}>
                  Legal Lens zeigt Ihren Vertrag mit farbigen Markierungen. Klicken Sie auf eine
                  Stelle und verstehen Sie sofort, was sie bedeutet.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <MousePointer size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Ein Klick genügt</h4>
                      <p>Klausel anklicken – Erklärung erscheint sofort</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Scale size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Fairness auf einen Blick</h4>
                      <p>Farbcodes zeigen: Grün = fair, Rot = kritisch</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Lightbulb size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Konkrete Tipps</h4>
                      <p>Wie Sie bessere Konditionen verhandeln können</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PROCESS SECTION - V5 Timeline with Line
            ========================================== */}
        <section className={styles.processSection} id="process">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So funktioniert's</span>
              <h2 className={styles.sectionTitle}>In 3 Schritten zum Verständnis</h2>
              <p className={styles.sectionSubtitle}>
                Nie wieder Verträge unterschreiben, die Sie nicht verstehen.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertrag öffnen</h3>
                    <p className={styles.processDesc}>
                      Laden Sie einen Vertrag hoch oder wählen Sie einen aus Ihrer Bibliothek.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Legal Lens aktivieren</h3>
                    <p className={styles.processDesc}>
                      Ein Klick auf "Legal Lens" – der Vertrag wird mit Farbmarkierungen angezeigt.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Klauseln erkunden</h3>
                    <p className={styles.processDesc}>
                      Klicken Sie auf jede farbige Markierung für Erklärung und Tipps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            STATS SECTION
            ========================================== */}
        <section className={styles.statsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Unsere Zahlen</span>
              <h2 className={styles.sectionTitle}>Legal Lens in Zahlen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>{'< 2s'}</div>
                <div className={styles.statLabel}>Antwortzeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>50+</div>
                <div className={styles.statLabel}>Klauseltypen erkannt</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>15.000+</div>
                <div className={styles.statLabel}>Klauseln analysiert</div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            FAQ SECTION
            ========================================== */}
        <section className={styles.faqSection} id="faq">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Fragen & Antworten</span>
              <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt Legal Lens einen Anwalt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Legal Lens hilft beim Verstehen, ersetzt aber keine Rechtsberatung. Bei
                  kritischen Verträgen empfehlen wir zusätzlich einen Anwalt.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Verträge funktionieren?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Alle deutschen Vertragstypen: Arbeitsverträge, Mietverträge, NDAs,
                  Dienstleistungsverträge, AGB, Kaufverträge und mehr.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau sind die Erklärungen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die KI wurde auf tausenden Verträgen trainiert und kennt aktuelle
                  Rechtsprechung. Erklärungen sind praxisnah und verständlich.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet Legal Lens?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Legal Lens ist in allen Premium-Plänen enthalten. Im Free-Tier können
                  Sie es mit eingeschränkten Funktionen testen.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ==========================================
            RELATED FEATURES
            ========================================== */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.sectionTitle}>Weitere Analyse-Tools</h2>
            </div>

            <div className={styles.relatedGrid}>
              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Komplette Analyse mit Risiko-Score
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/optimierung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Optimierung</div>
                  <div className={styles.relatedDescription}>
                    KI-Vorschläge für bessere Klauseln
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/vergleich" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#06b6d4' }}><Scale size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsvergleich</div>
                  <div className={styles.relatedDescription}>
                    Zwei Versionen vergleichen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================
            CTA SECTION
            ========================================== */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={`${styles.ctaCard} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>
                  Verstehen Sie jeden Vertrag – Klick für Klick
                </h2>
                <p className={styles.ctaSubtitle}>
                  Nie wieder Verträge unterschreiben, die Sie nicht verstehen.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Legal Lens jetzt testen
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

export default LegalLens;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  FileText, Shield, Zap, PenTool, CheckCircle,
  ArrowRight, Clock, Target, ChevronDown, Layers, Wrench, Sparkles
} from "lucide-react";

// Video
const generatorVideo = "/Videos/generator.mp4";
import generatorImg from "../../assets/Generator.webp";

const Generator: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/generate";
  const target = isAuthenticated ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

  // Scroll animation refs
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Intersection Observer for scroll animations
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
      { "@type": "ListItem", "position": 3, "name": "Vertragsgenerator", "item": "https://www.contract-ai.de/features/generator" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Welche Vertragstypen kann der Generator erstellen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Freelancer-Verträge, NDAs, Mietverträge, Kooperationsverträge, Lizenzverträge, Service-Agreements und individuelle Zusammenstellungen aus unserer Klausel-Bibliothek."
        }
      },
      {
        "@type": "Question",
        "name": "Sind die generierten Verträge rechtssicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, alle Klauseln sind von Juristen geprüft und entsprechen aktuellem deutschen/EU-Recht. Für hochspezifische Fälle empfehlen wir zusätzliche Anwaltsberatung."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich die Verträge nachträglich ändern?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Sie erhalten sowohl PDF als auch DOCX-Format. Im Dashboard können Sie Verträge erneut öffnen und anpassen."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertrag erstellen online – Vertragsgenerator mit KI | Contract AI</title>
        <meta name="description" content="Verträge online erstellen mit KI-Vertragsgenerator: Arbeitsvertrag, Mietvertrag, Dienstvertrag & mehr. Rechtssichere Vorlagen, individuell anpassbar. ✓ Jetzt kostenlos Vertrag erstellen" />
        <meta name="keywords" content="Vertrag erstellen, Vertrag erstellen online, Vertragsgenerator, Vertragsvorlage, Arbeitsvertrag erstellen, Mietvertrag erstellen, Vertrag Generator, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/generator" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertrag erstellen online – Vertragsgenerator mit KI | Contract AI" />
        <meta property="og:description" content="Verträge online erstellen mit KI-Vertragsgenerator. Rechtssichere Vorlagen, individuell anpassbar. ✓ Jetzt kostenlos erstellen" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/generator" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-generator.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrag erstellen online – Vertragsgenerator mit KI | Contract AI" />
        <meta name="twitter:description" content="Verträge online erstellen mit KI-Vertragsgenerator. Rechtssichere Vorlagen, individuell anpassbar. ✓ Jetzt kostenlos erstellen" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-generator.png" />

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

        {/* ==========================================
            HERO SECTION - V5 Side-by-Side Layout
            ========================================== */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                KI-Vertragsgenerator
              </div>

              <h1 className={styles.heroTitle}>
                Neue Verträge<br/>
                <span className={styles.heroTitleHighlight}>in Minuten erstellen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Von der leeren Vorlage zum unterschriftsfertigen Vertrag: Der Generator
                baut aus erprobten Klauseln genau den Vertrag, den Sie brauchen.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Vertrag erstellen
                  <ArrowRight size={20} />
                </Link>
                <a href="#video" className={styles.btnSecondary}>
                  Live-Demo ansehen
                </a>
              </div>
            </div>

            {/* Interactive Demo Visual */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Layers size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>500+ Klauseln</div>
                  <div className={styles.floatingSubtext}>Geprüfte Bausteine</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Zap size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>&lt; 5 Minuten</div>
                  <div className={styles.floatingSubtext}>Zum fertigen Vertrag</div>
                </div>
              </div>

              <div className={styles.demoWindow}>
                <div className={styles.demoHeader}>
                  <span className={`${styles.demoDot} ${styles.demoDotRed}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotYellow}`}></span>
                  <span className={`${styles.demoDot} ${styles.demoDotGreen}`}></span>
                </div>
                <div className={styles.demoContent}>
                  <div className={styles.demoScore}>
                    <div className={styles.demoScoreCircle}>
                      <span className={styles.demoScoreValue}>
                        <FileText size={28} />
                      </span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertrag wird erstellt</div>
                      <div className={styles.demoScoreTitle}>Freelancer-Vertrag</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.success}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Leistungsumfang definiert</span>
                      <span className={`${styles.demoFindingBadge} ${styles.improved}`}>Fertig</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.success}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Vergütung & Zahlungsziel</span>
                      <span className={`${styles.demoFindingBadge} ${styles.improved}`}>Fertig</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <PenTool size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Nutzungsrechte festlegen</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Auswahl</span>
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
              <FileText size={18} />
              Vorgefertigte Templates
            </div>
            <div className={styles.trustBadge}>
              <Target size={18} />
              Individuell konfigurierbar
            </div>
            <div className={styles.trustBadge}>
              <Shield size={18} />
              DSGVO-konform
            </div>
          </div>
        </div>

        {/* ==========================================
            VIDEO SECTION
            ========================================== */}
        <section className={styles.videoSection} id="video">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So sieht's aus</span>
              <h2 className={styles.sectionTitle}>Der Vertragsgenerator in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie Sie in wenigen Minuten einen vollständigen, rechtssicheren
                Vertrag erstellen können.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={generatorVideo}
                  poster={generatorImg}
                  alt="Vertragsgenerator Demo"
                />
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
                <h2 className={styles.sectionTitleLeft}>Neue Verträge brauchen Sie öfter als gedacht</h2>
                <p className={styles.problemText}>
                  Freelancer-Auftrag, NDA, Mietvertrag, Kooperationen: Oft stehen Sie vor einem
                  leeren Blatt – oder kopieren alte Verträge, die nicht ganz passen. Dann doch
                  zum Anwalt? Das dauert Wochen und kostet Hunderte von Euro für Standard-Klauseln.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>400+ EUR</div>
                    <div className={styles.problemStatLabel}>typische Anwaltskosten für einen Standardvertrag</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>2-4 Wochen</div>
                    <div className={styles.problemStatLabel}>durchschnittliche Wartezeit beim Anwalt</div>
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
                      <div className={styles.problemDocTitle}>Neuer-Vertrag.docx</div>
                      <div className={styles.problemDocSubtitle}>0 Seiten • Leeres Dokument</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine} style={{ opacity: 0.3 }}></div>
                    <div className={styles.problemDocLine} style={{ opacity: 0.2 }}></div>
                    <div className={styles.problemDocLine} style={{ opacity: 0.1 }}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      Wo anfangen? Welche Klauseln brauche ich?
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <Clock size={16} />
                  </div>
                  Wochen Wartezeit!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Target size={16} />
                  </div>
                  400€+ Kosten
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
                    <span className={styles.comparisonLabel}>Traditionell</span>
                    <div className={styles.comparisonIcon}>
                      <Clock size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Zum Anwalt</div>
                    <div className={styles.comparisonDesc}>
                      Termin vereinbaren, Briefing, Wartezeit, Korrekturschleifen, hohe Kosten.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      2-4 Wochen, 400€+
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Mit Generator</span>
                    <div className={styles.comparisonIcon}>
                      <Zap size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>KI-Generator</div>
                    <div className={styles.comparisonDesc}>
                      Fragen beantworten, Klauseln auswählen, fertigen Vertrag erhalten.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Unter 5 Minuten
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Modularer Vertragsaufbau nach Ihren Anforderungen</h2>
                <p className={styles.solutionText}>
                  Der Generator führt Sie Schritt für Schritt durch die Vertragsgestaltung.
                  Basierend auf bewährten Klausel-Bibliotheken wählen Sie die Module, die Sie brauchen.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Layers size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>500+ Klausel-Bausteine</h4>
                      <p>Bewährte Bausteine für alle Vertragstypen – juristisch geprüft</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Target size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Geführte Auswahl</h4>
                      <p>Intelligente Fragen führen zu den passenden Klauseln</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Shield size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Rechtssicherheit</h4>
                      <p>Alle Klauseln sind geprüft und entsprechen aktuellem Recht</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            WHY US SECTION
            ========================================== */}
        <section className={styles.whySection} id="why">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ihre Vorteile</span>
              <h2 className={styles.sectionTitle}>Warum Contract AI?</h2>
              <p className={styles.sectionSubtitle}>
                Schneller, günstiger und flexibler als traditionelle Wege.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>Rechtssicher & aktuell</h3>
                <p className={styles.whyDesc}>
                  Alle Klauseln sind von Juristen geprüft und entsprechen
                  aktuellem deutschen/EU-Recht.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Target size={28} />
                </div>
                <h3 className={styles.whyTitle}>Modularer Aufbau</h3>
                <p className={styles.whyDesc}>
                  Nur die Klauseln, die Sie wirklich brauchen – kein unnötiger
                  Ballast, perfekt angepasst.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Zeit & Kostenersparnis</h3>
                <p className={styles.whyDesc}>
                  In Minuten statt Wochen zum fertigen Vertrag. Keine
                  Anwaltskosten für Standard-Verträge.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)', color: '#f43f5e' }}>
                  <PenTool size={28} />
                </div>
                <h3 className={styles.whyTitle}>Digitale Signatur</h3>
                <p className={styles.whyDesc}>
                  Rechtsgültige elektronische Unterschrift mit Zeitstempel
                  und direktem Versand an Vertragspartner.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PROCESS SECTION
            ========================================== */}
        <section className={styles.processSection} id="process">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So funktioniert's</span>
              <h2 className={styles.sectionTitle}>In 4 einfachen Schritten</h2>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertragstyp wählen</h3>
                    <p className={styles.processDesc}>
                      Freelancer, NDA, Mietvertrag, Koop – oder „individuell" für maßgeschneiderte Zusammenstellung.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Module konfigurieren</h3>
                    <p className={styles.processDesc}>
                      Geführte Fragen zu Ihren Anforderungen – Laufzeit, Haftung, IP-Rechte, Besonderheiten.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Preview & Anpassung</h3>
                    <p className={styles.processDesc}>
                      Vollständigen Vertragstext prüfen, optional einzelne Klauseln austauschen oder ergänzen.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>4</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Export & Signatur</h3>
                    <p className={styles.processDesc}>
                      PDF für sofortige Signatur oder DOCX zum Weiterbearbeiten – inklusive digitaler Signatur-Option.
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
              <h2 className={styles.sectionTitle}>Geprüft und bewährt</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>500+</div>
                <div className={styles.statLabel}>Klausel-Bausteine</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>&lt; 5 Min</div>
                <div className={styles.statLabel}>Durchschnittliche Erstellung</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>100%</div>
                <div className={styles.statLabel}>Juristisch geprüft</div>
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
                  Welche Vertragstypen kann der Generator erstellen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Freelancer-Verträge, NDAs, Mietverträge, Kooperationsverträge, Lizenzverträge,
                  Service-Agreements und individuelle Zusammenstellungen aus unserer Klausel-Bibliothek.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Sind die generierten Verträge rechtssicher?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, alle Klauseln sind von Juristen geprüft und entsprechen aktuellem deutschen/EU-Recht.
                  Für hochspezifische Fälle empfehlen wir zusätzliche Anwaltsberatung.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich die Verträge nachträglich ändern?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Sie erhalten sowohl PDF als auch DOCX-Format. Im Dashboard können Sie
                  Verträge erneut öffnen und anpassen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Funktioniert die digitale Signatur rechtsgültig?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, unsere eIDAS-konforme elektronische Signatur ist in der EU voll rechtsgültig.
                  Mit Zeitstempel und Versand per E-Mail.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie viele Verträge kann ich generieren?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Je nach Plan: Business 10/Monat, Enterprise unbegrenzt. Alle mit Export-Funktion
                  und digitaler Signatur.
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
              <h2 className={styles.sectionTitle}>Verwandte Funktionen</h2>
            </div>

            <div className={styles.relatedGrid}>
              <Link to="/features/contract-builder" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#06b6d4' }}><Wrench size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Contract Builder</div>
                  <div className={styles.relatedDescription}>
                    Visueller Editor mit Drag & Drop für individuelle Vertragsgestaltung
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/digitalesignatur" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f43f5e' }}><PenTool size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Digitale Signatur</div>
                  <div className={styles.relatedDescription}>
                    Unterschreiben Sie generierte Verträge rechtsgültig digital
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/optimierung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Optimierung</div>
                  <div className={styles.relatedDescription}>
                    KI-Vorschläge zur Verbesserung Ihrer Vertragsklauseln
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
                  Vom Bedarf zum fertigen Vertrag – in Minuten
                </h2>
                <p className={styles.ctaSubtitle}>
                  Keine Wartezeiten, keine Anwaltskosten für Standard-Verträge. Der Generator
                  baut aus bewährten Bausteinen genau das, was Sie brauchen.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt Vertrag erstellen
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

export default Generator;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, Target, ChevronDown
} from "lucide-react";

// Video
const analyseVideo = "/Videos/analyse.mp4";
import analyseImg from "../../assets/Analyse.webp";

const Vertragsanalyse: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/contracts";
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie funktioniert die KI-Vertragsanalyse?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI liest und interpretiert Ihren Vertrag vollständig, erkennt Risiken, bewertet Fairness und erstellt eine verständliche Zusammenfassung. In unter 60 Sekunden erhalten Sie Chancen-Risiken-Score, kritische Klauseln und Handlungsempfehlungen."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Vertragsarten werden unterstützt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Arbeitsverträge, Mietverträge, Kaufverträge, Freelancer-Agreements, NDAs, SaaS-Verträge, Dienstleistungsverträge, Kooperationsverträge und mehr. Die KI erkennt automatisch den Vertragstyp und passt die Analyse entsprechend an."
        }
      },
      {
        "@type": "Question",
        "name": "Ist die Analyse rechtssicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI-Analyse basiert auf aktueller Rechtsprechung und identifiziert potenzielle Problemstellen zuverlässig. Für bindende Rechtsberatung empfehlen wir bei kritischen Punkten zusätzlich einen Anwalt zu konsultieren."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken | Contract AI</title>
        <meta name="description" content="KI analysiert Ihren Vertrag in 60 Sekunden. Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen. DSGVO-konform, EU-Server. Jetzt kostenlos testen!" />
        <meta name="keywords" content="Vertragsanalyse, KI, AI, Vertrag prüfen, Risiken erkennen, Contract AI, Künstliche Intelligenz, Rechtstech, LegalTech" />

        <link rel="canonical" href="https://www.contract-ai.de/features/vertragsanalyse" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken" />
        <meta property="og:description" content="KI analysiert Ihren Vertrag in 60 Sekunden. Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen. Jetzt kostenlos testen!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/vertragsanalyse" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsanalyse mit KI - Versteckte Risiken in 60 Sekunden aufdecken" />
        <meta name="twitter:description" content="KI analysiert Ihren Vertrag in 60 Sekunden. Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
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
                KI-gestützte Vertragsanalyse
              </div>

              <h1 className={styles.heroTitle}>
                Versteckte Risiken<br/>
                <span className={styles.heroTitleHighlight}>in Sekunden erkennen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Unsere KI analysiert Ihre Verträge und deckt kritische Klauseln auf,
                bevor sie zum Problem werden. Klar, schnell, zuverlässig.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Vertrag analysieren
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
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>DSGVO-konform</div>
                  <div className={styles.floatingSubtext}>EU-Server</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Zap size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>&lt; 60 Sekunden</div>
                  <div className={styles.floatingSubtext}>Analysezeit</div>
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
                      <span className={styles.demoScoreValue}>75</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertrags-Score</div>
                      <div className={styles.demoScoreTitle}>Arbeitsvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Kündigungsfrist ungewöhnlich lang</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Wettbewerbsklausel sehr restriktiv</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Hoch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Überstundenregelung unklar</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Niedrig</span>
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
              <Shield size={18} />
              256-bit Verschlüsselung
            </div>
            <div className={styles.trustBadge}>
              <CheckCircle size={18} />
              DSGVO-konform
            </div>
            <div className={styles.trustBadge}>
              <Shield size={18} />
              Server in Deutschland
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
              <h2 className={styles.sectionTitle}>Die Vertragsanalyse in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie in 2 Minuten, wie Contract AI Ihren Vertrag analysiert und
                versteckte Risiken aufdeckt.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={analyseVideo}
                  poster={analyseImg}
                  alt="Vertragsanalyse Demo"
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
                <h2 className={styles.sectionTitleLeft}>Warum Vertragsanalyse so wichtig ist</h2>
                <p className={styles.problemText}>
                  Verträge sind oft absichtlich kompliziert geschrieben. Versteckte Klauseln,
                  ungünstige Bedingungen und einseitige Regelungen bleiben unbemerkt - bis
                  es zu spät ist. Die Folgen: finanzielle Verluste, rechtliche Probleme und
                  unnötige Einschränkungen.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>73%</div>
                    <div className={styles.problemStatLabel}>der Verträge enthalten problematische Klauseln</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>4.200 EUR</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Schaden durch übersehene Risiken</div>
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
                      <div className={styles.problemDocTitle}>Mietvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>24 Seiten • Hochgeladen heute</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...der Mieter haftet uneingeschränkt für alle Schäden..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Kritische Klausel!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  12 Monate Bindung
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
                    <span className={styles.comparisonLabel}>Vorher</span>
                    <div className={styles.comparisonIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Manuelle Prüfung</div>
                    <div className={styles.comparisonDesc}>
                      Stundenlange Lektüre komplizierter Dokumente. Oft werden wichtige Details übersehen.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      2-4 Stunden pro Vertrag
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Nachher</span>
                    <div className={styles.comparisonIcon}>
                      <Zap size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>KI-Analyse</div>
                    <div className={styles.comparisonDesc}>
                      Automatische Erkennung aller Risiken mit klaren Erklärungen und Handlungsempfehlungen.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Unter 60 Sekunden
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>KI-gestützte Vertragsanalyse in 60 Sekunden</h2>
                <p className={styles.solutionText}>
                  Contract AI nutzt modernste künstliche Intelligenz, um jeden Vertrag blitzschnell
                  zu analysieren. Versteckte Risiken werden sofort erkannt und verständlich erklärt.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Search size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Automatische Risikobewertung</h4>
                      <p>Jede Klausel wird auf Fairness und mögliche Nachteile geprüft</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <BookOpen size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Verständliche Sprache</h4>
                      <p>Kompliziertes Juristendeutsch wird klar und einfach erklärt</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Zap size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Handlungsempfehlungen</h4>
                      <p>Konkrete Tipps, wie Sie Ihre Position verbessern können</p>
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
                Mehr als nur ein Analyse-Tool - Ihr zuverlässiger Partner für sichere Vertragsentscheidungen.
              </p>
            </div>

            <div className={styles.whyGrid}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Target size={28} />
                </div>
                <h3 className={styles.whyTitle}>Objektive Bewertung</h3>
                <p className={styles.whyDesc}>
                  Keine kommerziellen Interessen - unsere KI bewertet Ihren Vertrag neutral
                  und zeigt sowohl Risiken als auch Chancen auf.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO-konform</h3>
                <p className={styles.whyDesc}>
                  Ihre Daten bleiben in Deutschland. Verschlüsselte Übertragung,
                  sichere Verarbeitung auf EU-Servern.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <FileText size={28} />
                </div>
                <h3 className={styles.whyTitle}>Klare Ergebnisse</h3>
                <p className={styles.whyDesc}>
                  Ampelsystem statt Juristendeutsch. Verständliche Bewertungen und
                  konkrete Handlungsempfehlungen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Sofort verfügbar</h3>
                <p className={styles.whyDesc}>
                  Keine Termine, keine Wartezeiten. Laden Sie Ihren Vertrag hoch und
                  erhalten Sie sofort Ergebnisse.
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
              <h2 className={styles.sectionTitle}>In 3 einfachen Schritten</h2>
            </div>

            <div className={styles.processTimeline}>
              <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.processNumber}>1</div>
                <div className={styles.processContent}>
                  <h3 className={styles.processTitle}>Vertrag hochladen</h3>
                  <p className={styles.processDesc}>
                    PDF oder DOCX Ihres Vertrags hochladen – verschlüsselt und sicher auf EU-Servern verarbeitet.
                  </p>
                </div>
              </div>

              <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.processNumber}>2</div>
                <div className={styles.processContent}>
                  <h3 className={styles.processTitle}>KI-Analyse</h3>
                  <p className={styles.processDesc}>
                    Intelligente Erkennung von Vertragstyp, Klauseln und Risiken. Bewertung nach objektiven Kriterien.
                  </p>
                </div>
              </div>

              <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.processNumber}>3</div>
                <div className={styles.processContent}>
                  <h3 className={styles.processTitle}>Ergebnis erhalten</h3>
                  <p className={styles.processDesc}>
                    Übersichtliche Zusammenfassung mit Chancen-Risiken-Score und konkreten Handlungsempfehlungen.
                  </p>
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
              <h2 className={styles.sectionTitle}>Vertrauen Sie den Ergebnissen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>98%</div>
                <div className={styles.statLabel}>Erkennungsgenauigkeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>&lt; 60s</div>
                <div className={styles.statLabel}>Analysezeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>10.000+</div>
                <div className={styles.statLabel}>Analysierte Verträge</div>
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
                  Ersetzt die Analyse eine Rechtsberatung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein, Contract AI liefert strukturierte Risikoanalysen und Bewertungen.
                  Für komplexe rechtliche Fragen sollten Sie weiterhin einen Anwalt konsultieren.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Vertragsarten können analysiert werden?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die meisten Standardverträge: Arbeitsverträge, Mietverträge, Kaufverträge, NDAs,
                  Freelancer-Agreements, SaaS-Verträge, Dienstleistungsverträge und mehr.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Analyse?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die KI erreicht eine Erkennungsgenauigkeit von 98% bei der Identifikation
                  problematischer Klauseln. Sie basiert auf tausenden analysierten Verträgen
                  und aktueller Rechtsprechung.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden meine Vertragsdaten gespeichert?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Optional zur Verlaufsanzeige. Sie können Dokumente jederzeit löschen lassen.
                  Verarbeitung erfolgt ausschließlich zur Analyse, keine Weitergabe an Dritte.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die Vertragsanalyse?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Free-Tier: 3 Analysen kostenlos. Business (19€/Monat): 25 Analysen.
                  Enterprise (29€/Monat): Unbegrenzte Analysen und alle Features.
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
              <Link to="/features/optimierung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>✨</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsoptimierung</div>
                  <div className={styles.relatedDescription}>
                    Nach der Analyse: KI-Vorschläge zur Verbesserung problematischer Klauseln
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/legal-lens" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>🔍</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Legal Lens</div>
                  <div className={styles.relatedDescription}>
                    Klauseln anklicken und sofort verstehen – interaktive Vertragsansicht
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/legalpulse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>⚖️</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Legal Pulse</div>
                  <div className={styles.relatedDescription}>
                    Automatische Überwachung auf Gesetzesänderungen die Ihre Verträge betreffen
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
                  Versteckte Risiken aufdecken, bevor sie teuer werden
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 87% unserer Nutzer finden kritische Klauseln, die sie übersehen hätten.
                  Analysieren Sie Ihren Vertrag – in 60 Sekunden.
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

export default Vertragsanalyse;

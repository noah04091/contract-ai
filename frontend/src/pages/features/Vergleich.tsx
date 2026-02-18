import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  GitCompare, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, Target, ChevronDown, BarChart3
} from "lucide-react";

// Video
const vergleichVideo = "/Videos/vergleich.mp4";
import vergleichImg from "../../assets/Vergleich.webp";

const Vergleich: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/compare";
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
      { "@type": "ListItem", "position": 3, "name": "Vertragsvergleich", "item": "https://www.contract-ai.de/features/vergleich" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Welche Vertragsarten kann ich vergleichen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle Standardverträge: Mietverträge, Arbeitsverträge, Dienstleistungsverträge, Kaufverträge, Versicherungen, SaaS-Abos. Beide Verträge sollten ähnlichen Zweck haben für optimale Ergebnisse."
        }
      },
      {
        "@type": "Question",
        "name": "Wie objektiv ist die KI-Bewertung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI nutzt bewährte Rechtsmuster und Marktstandards als Basis. Sie ist objektiver als das Bauchgefühl, aber Sie definieren die Gewichtung der Kriterien (Preis vs. Flexibilität)."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich die Bewertungskriterien anpassen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Sie können Prioritäten setzen: Ist Ihnen Kostenklarheit wichtiger als Flexibilität? Kurze Fristen wichtiger als niedrige Preise? Die Empfehlung passt sich entsprechend an."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Verträge vergleichen – Welcher ist besser? | Contract AI</title>
        <meta name="description" content="Zwei Verträge vergleichen mit KI: Unterschiede auf einen Blick, Fairness-Score und klare Empfehlung. Diff-Ansicht zeigt jede Abweichung. ✓ Jetzt Verträge vergleichen" />
        <meta name="keywords" content="Verträge vergleichen, Vertragsvergleich, welcher Vertrag ist besser, Angebote vergleichen, Vertrag Unterschiede, Diff-Ansicht, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/vergleich" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Verträge vergleichen – Welcher ist besser? | Contract AI" />
        <meta property="og:description" content="Zwei Verträge vergleichen mit KI: Unterschiede auf einen Blick, Fairness-Score und klare Empfehlung. ✓ Jetzt vergleichen" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/vergleich" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vergleich.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge vergleichen – Welcher ist besser? | Contract AI" />
        <meta name="twitter:description" content="Zwei Verträge vergleichen mit KI: Unterschiede auf einen Blick, Fairness-Score und klare Empfehlung. ✓ Jetzt vergleichen" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vergleich.png" />

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
                KI-Vertragsvergleich
              </div>

              <h1 className={styles.heroTitle}>
                Welcher Vertrag<br/>
                <span className={styles.heroTitleHighlight}>ist besser?</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Lassen Sie zwei Verträge gegeneinander antreten. Die KI visualisiert Unterschiede,
                bewertet Fairness & Risiko und gibt eine klare Empfehlung.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Verträge vergleichen
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
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Diff-Ansicht</div>
                  <div className={styles.floatingSubtext}>Visueller Vergleich</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Target size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Klare Empfehlung</div>
                  <div className={styles.floatingSubtext}>Mit Begründung</div>
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
                        <GitCompare size={28} />
                      </span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertragsvergleich</div>
                      <div className={styles.demoScoreTitle}>Vertrag A vs. B</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.success}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Vertrag B: Kürzere Kündigungsfrist</span>
                      <span className={`${styles.demoFindingBadge} ${styles.improved}`}>+Vorteil</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Vertrag A: Niedrigere Kosten</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>+Vorteil</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <Target size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Empfehlung: Vertrag B</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Flexibler</span>
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
              <BarChart3 size={18} />
              Diff-Ansicht
            </div>
            <div className={styles.trustBadge}>
              <Target size={18} />
              Fairness-Score
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
              <h2 className={styles.sectionTitle}>Der Vertragsvergleich in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie Contract AI zwei Verträge analysiert und die
                Unterschiede verständlich aufbereitet.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={vergleichVideo}
                  poster={vergleichImg}
                  alt="Vertragsvergleich Demo"
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
                <h2 className={styles.sectionTitleLeft}>Kleine Unterschiede, große Wirkung</h2>
                <p className={styles.problemText}>
                  Zwei Dokumente wirken ähnlich – aber Abweichungen bei Kündigungsfristen, Haftung,
                  Kosten oder Leistungsumfang haben spürbare Folgen. Als Mieter zahlen Sie womöglich
                  200€ mehr pro Jahr, als Freelancer warten Sie 30 Tage länger auf Ihr Geld.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>85%</div>
                    <div className={styles.problemStatLabel}>der Menschen übersehen relevante Unterschiede</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>3+ Stunden</div>
                    <div className={styles.problemStatLabel}>durchschnittliche manuelle Vergleichszeit</div>
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
                      <div className={styles.problemDocTitle}>Zwei Verträge vergleichen</div>
                      <div className={styles.problemDocSubtitle}>Welcher ist besser?</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "Kündigungsfrist: A 3 Monate vs. B 1 Monat..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <Clock size={16} />
                  </div>
                  Stundenlanger Vergleich!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Details übersehen?
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
                    <span className={styles.comparisonLabel}>Manuell</span>
                    <div className={styles.comparisonIcon}>
                      <Clock size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Zeile für Zeile</div>
                    <div className={styles.comparisonDesc}>
                      Stundenlange Tabellen-Kämpfe, Übersehen wichtiger Details, keine objektive Bewertung.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      3+ Stunden pro Vergleich
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Mit KI</span>
                    <div className={styles.comparisonIcon}>
                      <Zap size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>KI-Vergleich</div>
                    <div className={styles.comparisonDesc}>
                      Automatische Diff-Ansicht, Fairness-Scores, klare Empfehlung mit Begründung.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Unter 3 Minuten
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Intelligenter Vergleich mit Diff-Ansicht</h2>
                <p className={styles.solutionText}>
                  Contract AI stellt beide Verträge nebeneinander und markiert alle relevanten Unterschiede.
                  Die KI bewertet Auswirkungen auf Fairness, Risiko und Kosten.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <BarChart3 size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Visualisierte Unterschiede</h4>
                      <p>Side-by-Side Diff-View mit farblicher Markierung aller Abweichungen</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Target size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Fairness-Score</h4>
                      <p>Multi-dimensionale Bewertung: Kündigung, Zahlung, Haftung, Klarheit</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <CheckCircle size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klare Empfehlung</h4>
                      <p>Basierend auf Ihren Prioritäten mit nachvollziehbarer Begründung</p>
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
                Objektive Analyse statt Bauchgefühl – mit klarer Entscheidungsgrundlage.
              </p>
            </div>

            <div className={styles.whyGrid}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <BarChart3 size={28} />
                </div>
                <h3 className={styles.whyTitle}>Detailgenaue Diff-Ansicht</h3>
                <p className={styles.whyDesc}>
                  Jede relevante Abweichung wird erfasst und visuell dargestellt –
                  nichts wird übersehen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Target size={28} />
                </div>
                <h3 className={styles.whyTitle}>Präferenz-basierte Bewertung</h3>
                <p className={styles.whyDesc}>
                  Empfehlungen passend zu Ihren individuellen Prioritäten –
                  nicht eine Lösung für alle.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO-konform</h3>
                <p className={styles.whyDesc}>
                  Server in Deutschland (Frankfurt), volle DSGVO-Konformität
                  und EU-Datenschutz.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Sofort verfügbar</h3>
                <p className={styles.whyDesc}>
                  Ergebnis in unter 3 Minuten. Export als PDF für
                  Team-Entscheidungen.
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

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Beide Verträge hochladen</h3>
                    <p className={styles.processDesc}>
                      PDF oder DOCX der beiden Alternativen hochladen – sicher verschlüsselt auf EU-Servern.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>KI-Vergleich & Bewertung</h3>
                    <p className={styles.processDesc}>
                      Intelligente Analyse aller Unterschiede, Fairness-Bewertung und Risiko-Assessment.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Empfehlung erhalten</h3>
                    <p className={styles.processDesc}>
                      Klare Visualisierung der Unterschiede plus konkrete Empfehlung basierend auf Ihren Präferenzen.
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
              <h2 className={styles.sectionTitle}>Objektive Entscheidungsgrundlage</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>2-3 Min</div>
                <div className={styles.statLabel}>Vergleichsdauer</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>95%</div>
                <div className={styles.statLabel}>Bewertungsgenauigkeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>50+</div>
                <div className={styles.statLabel}>Vergleichskriterien</div>
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
                  Welche Vertragsarten kann ich vergleichen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Alle Standardverträge: Mietverträge, Arbeitsverträge, Dienstleistungsverträge,
                  Kaufverträge, Versicherungen, SaaS-Abos. Beide Verträge sollten ähnlichen Zweck haben.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie objektiv ist die KI-Bewertung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die KI nutzt bewährte Rechtsmuster und Marktstandards als Basis. Sie ist objektiver
                  als das Bauchgefühl, aber Sie definieren die Gewichtung der Kriterien.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich die Bewertungskriterien anpassen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Sie können Prioritäten setzen: Ist Ihnen Kostenklarheit wichtiger als Flexibilität?
                  Kurze Fristen wichtiger als niedrige Preise? Die Empfehlung passt sich an.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden beide Verträge gleich behandelt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, die Analyse ist symmetrisch. Beide Verträge werden nach denselben Kriterien bewertet.
                  Keine Bevorzugung für "Vertrag A" oder "Vertrag B".
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich das Ergebnis exportieren?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, der komplette Vergleichsreport kann als PDF exportiert werden – inklusive
                  Diff-View, Scores, Empfehlung und Begründung. Ideal für Team-Entscheidungen.
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
              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>🔍</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Komplette Analyse mit Risiko-Score und Handlungsempfehlungen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/optimierung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>✨</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Optimierung</div>
                  <div className={styles.relatedDescription}>
                    KI-Vorschläge zur Verbesserung Ihrer Vertragsklauseln
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/legal-lens" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>👁️</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Legal Lens</div>
                  <div className={styles.relatedDescription}>
                    Klauseln anklicken und sofort verstehen
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
                  Entscheiden Sie mit Klarheit statt Bauchgefühl
                </h2>
                <p className={styles.ctaSubtitle}>
                  Objektive Analyse, visualisierte Unterschiede und eine klare Empfehlung –
                  damit Sie die richtige Wahl treffen.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt Verträge vergleichen
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

export default Vergleich;

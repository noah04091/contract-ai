import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  Wrench, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, Target, ChevronDown, Sparkles, Search, BarChart3
} from "lucide-react";

// Video
const optimierungVideo = "/Videos/optimierung.mp4";
import optimierungImg from "../../assets/Optimierung.webp";

const Optimierung: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/optimizer";
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
      { "@type": "ListItem", "position": 3, "name": "Vertragsoptimierung", "item": "https://www.contract-ai.de/features/optimierung" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie funktioniert die Vertragsoptimierung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die KI analysiert Ihren Vertrag, erkennt einseitige oder problematische Klauseln und schlägt ausgewogenere, fairere Formulierungen vor. Sie erhalten konkrete Textvorschläge und Begründungen für jede Änderung."
        }
      },
      {
        "@type": "Question",
        "name": "Werden meine ursprünglichen Interessen berücksichtigt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, die KI optimiert in beide Richtungen - sowohl zugunsten Ihrer Position als auch für ausgewogenere, verhandlungsfähige Kompromisse. Sie wählen aus verschiedenen Varianten die passende aus."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich die Vorschläge direkt verwenden?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Alle Vorschläge sind sofort verhandlungsfertig formuliert. Sie können sie 1:1 übernehmen, als Basis für weitere Anpassungen nutzen oder verschiedene Varianten kombinieren."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Unfaire Klauseln erkennen & Vertrag verbessern | Contract AI</title>
        <meta name="description" content="Unfaire Vertragsklauseln automatisch erkennen und verbessern. KI liefert sofort verhandlungsfertige Alternativen für faire Verträge. DSGVO-konform. ✓ Jetzt Vertrag optimieren" />
        <meta name="keywords" content="unfaire Klauseln, Vertrag verbessern, Vertragsoptimierung, Klauseln ändern, unfaire Vertragsklauseln erkennen, Vertrag zu meinen Gunsten, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/optimierung" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Unfaire Klauseln erkennen & Vertrag verbessern | Contract AI" />
        <meta property="og:description" content="Unfaire Vertragsklauseln automatisch erkennen und verbessern. KI liefert verhandlungsfertige Alternativen. ✓ Jetzt optimieren" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/optimierung" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-optimierung.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Unfaire Klauseln erkennen & Vertrag verbessern | Contract AI" />
        <meta name="twitter:description" content="Unfaire Vertragsklauseln automatisch erkennen und verbessern. KI liefert verhandlungsfertige Alternativen. ✓ Jetzt optimieren" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-optimierung.png" />

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
                KI-gestützte Optimierung
              </div>

              <h1 className={styles.heroTitle}>
                Schwache Klauseln<br/>
                <span className={styles.heroTitleHighlight}>stark machen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Unsere KI erkennt einseitige Klauseln und schlägt sofort bessere,
                faire Formulierungen vor – verhandlungsfertig.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Vertrag optimieren
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
                  <Target size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Verhandlungsfertig</div>
                  <div className={styles.floatingSubtext}>Sofort einsetzbar</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>KI-Vorschläge</div>
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
                      <span className={styles.demoScoreValue}>+35</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Fairness-Verbesserung</div>
                      <div className={styles.demoScoreTitle}>Dienstleistungsvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.success}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Haftungsklausel ausbalanciert</span>
                      <span className={`${styles.demoFindingBadge} ${styles.improved}`}>Optimiert</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.success}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Zahlungsziel von 60 auf 14 Tage</span>
                      <span className={`${styles.demoFindingBadge} ${styles.improved}`}>Optimiert</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Kündigungsfrist prüfen</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Vorschlag</span>
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
              <Zap size={18} />
              Sofortige Verbesserungen
            </div>
            <div className={styles.trustBadge}>
              <Target size={18} />
              Verhandlungsfertig
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
              <h2 className={styles.sectionTitle}>Der Optimierer in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie Contract AI problematische Klauseln erkennt und
                bessere Formulierungen vorschlägt.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={optimierungVideo}
                  poster={optimierungImg}
                  alt="Vertragsoptimierung Demo"
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
                <h2 className={styles.sectionTitleLeft}>Einseitige Verträge kosten Sie bares Geld</h2>
                <p className={styles.problemText}>
                  Viele Verträge sind zugunsten einer Seite formuliert: Haftung wird verschoben,
                  Pflichten sind ungleich verteilt, Fristen überlang. Das fällt meist erst auf,
                  wenn es teuer wird. Als Freelancer zahlen Sie monatelang drauf, als Mieter
                  bleiben Sie in unflexiblen Bindungen gefangen.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>68%</div>
                    <div className={styles.problemStatLabel}>der Verträge bevorzugen eine Seite unfair</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>2.800 EUR</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Nachteil durch schlechte Klauseln</div>
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
                      <div className={styles.problemDocTitle}>Freelancer-Vertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>18 Seiten • Einseitige Klauseln</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...Zahlungsziel 60 Tage nach Rechnungseingang..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Unfaire Zahlungsfrist!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Haftung einseitig
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
                      <AlertTriangle size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Einseitige Klauseln</div>
                    <div className={styles.comparisonDesc}>
                      Haftung bei Ihnen, lange Zahlungsfristen, unklare Leistungen – Sie tragen das Risiko.
                    </div>
                    <div className={styles.comparisonTime}>
                      <AlertTriangle size={16} />
                      Nachteil: bis zu 2.800 EUR
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Nachher</span>
                    <div className={styles.comparisonIcon}>
                      <CheckCircle size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Faire Formulierungen</div>
                    <div className={styles.comparisonDesc}>
                      Ausgewogene Haftung, faire Fristen, klare Leistungen – verhandlungsfertig.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Sofort einsetzbar
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>KI-gestützte Optimierung mit konkreten Vorschlägen</h2>
                <p className={styles.solutionText}>
                  Contract AI analysiert Ihren Vertrag systematisch auf Schwachstellen und generiert
                  sofort bessere Formulierungen – mit Begründung und verhandlungsfertig.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Wrench size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Automatische Klausel-Optimierung</h4>
                      <p>Jede riskante Klausel erhält eine konkret formulierte Verbesserung</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Target size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Fairness-Check</h4>
                      <p>Bewertet Ausgewogenheit und schlägt faire Kompromisse vor</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Sparkles size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Verständliche Begründungen</h4>
                      <p>Jede Änderung wird erklärt – für Ihre Verhandlungen</p>
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
                Mehr als nur Analyse – konkrete Verbesserungen für Ihre Verträge.
              </p>
            </div>

            <div className={styles.whyGrid}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Target size={28} />
                </div>
                <h3 className={styles.whyTitle}>Echte Individualoptimierung</h3>
                <p className={styles.whyDesc}>
                  Keine starren Textbausteine – jeder Vertrag wird kontextspezifisch
                  verbessert und an Ihre Situation angepasst.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO-konform</h3>
                <p className={styles.whyDesc}>
                  Server in Deutschland (Frankfurt), volle DSGVO-Konformität
                  und EU-Datenschutz. Ihre Daten bleiben sicher.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <FileText size={28} />
                </div>
                <h3 className={styles.whyTitle}>Transparente Änderungen</h3>
                <p className={styles.whyDesc}>
                  Jede Optimierung wird begründet und ist nachvollziehbar
                  dokumentiert – für Ihre Verhandlungen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Sofort einsatzbereit</h3>
                <p className={styles.whyDesc}>
                  Alle Vorschläge sind so formuliert, dass Sie sie direkt
                  in Verhandlungen oder Verträge übernehmen können.
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
                    <h3 className={styles.processTitle}>Vertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      PDF oder DOCX Ihres bestehenden Vertrags hochladen – verschlüsselt und sicher auf EU-Servern.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>KI-Analyse & Optimierung</h3>
                    <p className={styles.processDesc}>
                      Intelligente Erkennung problematischer Klauseln, Fairness-Bewertung und Generierung verbesserter Formulierungen.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vorschläge erhalten</h3>
                    <p className={styles.processDesc}>
                      Klare Empfehlungen mit Änderungsmarkierungen, Begründungen und verhandlungsfertigen Texten.
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
              <span className={styles.sectionEyebrow}>Unsere Ergebnisse</span>
              <h2 className={styles.sectionTitle}>Messbare Verbesserungen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>87%</div>
                <div className={styles.statLabel}>Fairere Vertragsklauseln</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>3.5x</div>
                <div className={styles.statLabel}>Schneller als manuell</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>90%</div>
                <div className={styles.statLabel}>Direkt umsetzbar</div>
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
                  Ersetzt die Optimierung eine Rechtsberatung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein, Contract AI liefert strukturierte Optimierungsvorschläge und Formulierungsalternativen.
                  Für komplexe rechtliche Fragen sollten Sie weiterhin einen Anwalt konsultieren.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Vertragsarten können optimiert werden?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die meisten Standardverträge: Arbeitsverträge, Dienstleistungsverträge, Mietverträge,
                  NDAs, Lizenzverträge, Kaufverträge und mehr.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau sind die Optimierungsvorschläge?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die KI arbeitet mit bewährten Rechtsmustern und Branchenstandards. Rund 90% der
                  Vorschläge sind direkt umsetzbar, bei speziellen Fällen empfehlen wir zusätzliche Prüfung.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Werden meine Vertragsdaten gespeichert?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Optional zur Verlaufsanzeige. Sie können Dokumente jederzeit löschen lassen.
                  Verarbeitung erfolgt ausschließlich zur Optimierung, keine Weitergabe an Dritte.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die Vertragsoptimierung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Der KI-Optimizer ist ab Business (19€/Monat) mit 15 Optimierungen verfügbar.
                  Enterprise (29€/Monat): Unbegrenzte Optimierungen.
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
                <span className={styles.relatedIcon}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Erst analysieren, dann optimieren: Risiken und Schwachstellen erkennen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/vergleich" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><BarChart3 size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsvergleich</div>
                  <div className={styles.relatedDescription}>
                    Zwei Versionen vergleichen und die bessere Variante finden
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/generator" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsgenerator</div>
                  <div className={styles.relatedDescription}>
                    Komplett neue Verträge mit optimierten Klauseln erstellen
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
                  Stärkere Position, weniger Risiko
                </h2>
                <p className={styles.ctaSubtitle}>
                  Verwandeln Sie schwache Klauseln in starke Formulierungen – mit konkreten
                  Vorschlägen und Begründungen für Ihre Verhandlungen.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt kostenlos optimieren
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

export default Optimierung;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
// import AutoPlayVideo from "../../components/AutoPlayVideo"; // Auskommentiert bis Video erstellt wird
import {
  Wrench, Layers, MousePointer, Sparkles, FileDown, CheckCircle,
  Shield, FileText, ArrowRight, ChevronDown, Clock, Zap, AlertTriangle
} from "lucide-react";

const ContractBuilder: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/contract-builder";
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie funktioniert der Contract Builder?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Contract Builder ist ein visueller Editor, mit dem Sie Verträge per Drag & Drop erstellen können."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich eigene Vorlagen erstellen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, Sie können Ihre Verträge als Vorlagen speichern und wiederverwenden."
        }
      },
      {
        "@type": "Question",
        "name": "Brauche ich juristische Vorkenntnisse?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein, der Contract Builder ist für jeden bedienbar. Die Bausteine enthalten bereits rechtlich geprüfte Formulierungen."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertrag selbst erstellen – Drag & Drop Editor | Contract AI</title>
        <meta name="description" content="Vertrag selbst erstellen per Drag & Drop – ohne juristische Vorkenntnisse! Visueller Editor, Klausel-Bibliothek, KI-Unterstützung, PDF-Export. Professionell & einfach. ✓ Jetzt starten" />
        <meta name="keywords" content="Vertrag selbst erstellen, Vertrag selber machen, Vertragseditor, Drag Drop Vertrag, Vertrag schreiben, Klausel Bibliothek, Contract Builder, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/contract-builder" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertrag selbst erstellen – Drag & Drop Editor | Contract AI" />
        <meta property="og:description" content="Vertrag selbst erstellen per Drag & Drop – ohne Vorkenntnisse! Visueller Editor, KI-Unterstützung. ✓ Jetzt starten" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/contract-builder" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-contract-builder.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrag selbst erstellen – Drag & Drop Editor | Contract AI" />
        <meta name="twitter:description" content="Vertrag selbst erstellen per Drag & Drop – ohne Vorkenntnisse! Visueller Editor, KI-Unterstützung. ✓ Jetzt starten" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-contract-builder.png" />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
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
                Visueller Vertragseditor
              </div>

              <h1 className={styles.heroTitle}>
                Verträge erstellen<br/>
                <span className={styles.heroTitleHighlight}>wie ein Profi</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Visueller Baukasten für rechtssichere Verträge. Drag & Drop, Smart Variables
                und KI-Unterstützung – keine Vorkenntnisse nötig. Professionelle Dokumente
                in Minuten statt Stunden.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Jetzt Vertrag erstellen
                  <ArrowRight size={20} />
                </Link>
                <a href="#funktionen" className={styles.btnSecondary}>
                  Funktionen entdecken
                </a>
              </div>
            </div>

            {/* Interactive Demo Visual */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <MousePointer size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Drag & Drop</div>
                  <div className={styles.floatingSubtext}>Einfache Bedienung</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>KI-Klauseln</div>
                  <div className={styles.floatingSubtext}>Intelligent</div>
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
                      <Layers size={24} />
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Contract Builder</div>
                      <div className={styles.demoScoreTitle}>3 Bausteine aktiv</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>§ 1 Vertragsparteien</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Fertig</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>§ 2 Leistungsbeschreibung</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Fertig</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <Clock size={14} />
                      </div>
                      <span className={styles.demoFindingText}>§ 3 Vergütung</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Offen</span>
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
              <Layers size={18} />
              Drag & Drop Editor
            </div>
            <div className={styles.trustBadge}>
              <Sparkles size={18} />
              Smart Variables
            </div>
            <div className={styles.trustBadge}>
              <Shield size={18} />
              Rechtssichere Klauseln
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
              <h2 className={styles.sectionTitle}>Contract Builder in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie einfach Sie Verträge per Drag & Drop erstellen können.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src="/videos/contract-builder-demo.mp4"
                  poster="/videos/contract-builder-poster.jpg"
                  alt="Contract Builder Demo"
                />
              </div>
            </div>
          </div>
        </section>
        */}

        {/* ==========================================
            FUNKTIONEN SECTION (6 Feature Cards)
            ========================================== */}
        <section className={styles.functionsSection} id="funktionen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Funktionen</span>
              <h2 className={styles.sectionTitle}>Alles für professionelle Verträge</h2>
              <p className={styles.sectionSubtitle}>
                Der Contract Builder bietet alle Werkzeuge für die Erstellung rechtssicherer Verträge.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Layers size={24} />
                </div>
                <h3 className={styles.functionTitle}>Baustein-Editor</h3>
                <p className={styles.functionDesc}>
                  Über 15 verschiedene Bausteine: Kopfzeilen, Parteien, Klauseln, Tabellen, Unterschriften.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Sparkles size={24} />
                </div>
                <h3 className={styles.functionTitle}>Smart Variables</h3>
                <p className={styles.functionDesc}>
                  Variablen einmal definieren und überall im Dokument automatisch einsetzen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Wrench size={24} />
                </div>
                <h3 className={styles.functionTitle}>KI-Klauselgenerator</h3>
                <p className={styles.functionDesc}>
                  Beschreiben Sie, was Sie brauchen – die KI generiert rechtssichere Klauseln.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <FileDown size={24} />
                </div>
                <h3 className={styles.functionTitle}>PDF-Export</h3>
                <p className={styles.functionDesc}>
                  Exportieren Sie Verträge als professionelles PDF inkl. hochgeladener Anlagen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>Rechtssicher</h3>
                <p className={styles.functionDesc}>
                  Alle Bausteine enthalten rechtlich geprüfte Formulierungen und Klauseln.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Vorlagen speichern</h3>
                <p className={styles.functionDesc}>
                  Speichern Sie Ihre Verträge als wiederverwendbare Vorlagen für die Zukunft.
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
                <h2 className={styles.sectionTitleLeft}>Verträge schreiben ist zeitaufwändig</h2>
                <p className={styles.problemText}>
                  Verträge von Grund auf zu schreiben kostet Stunden. Word-Vorlagen sind starr
                  und schwer anpassbar. Juristisches Wissen fehlt oft, und jeder Fehler kann
                  teuer werden – im schlimmsten Fall tausende Euro.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>3-5h</div>
                    <div className={styles.problemStatLabel}>durchschnittliche Erstellzeit pro Vertrag</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>67%</div>
                    <div className={styles.problemStatLabel}>nutzen veraltete oder fehlerhafte Vorlagen</div>
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
                      <div className={styles.problemDocTitle}>Word-Vorlage</div>
                      <div className={styles.problemDocSubtitle}>Manuell bearbeiten</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...stundenlange Recherche..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Veraltete Klauseln!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  3-5h pro Vertrag
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
                    <span className={styles.comparisonLabel}>Klassische Methode</span>
                    <div className={styles.comparisonIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Word manuell bearbeiten</div>
                    <div className={styles.comparisonDesc}>
                      Vorlagen kopieren, anpassen, Recherche. Stundenlang.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      3-5 Stunden
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Mit Contract Builder</span>
                    <div className={styles.comparisonIcon}>
                      <Layers size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Bausteine per Drag & Drop</div>
                    <div className={styles.comparisonDesc}>
                      Smart Variables, KI-Unterstützung. In Minuten fertig.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      10 Minuten
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Verträge bauen statt schreiben</h2>
                <p className={styles.solutionText}>
                  Der Contract Builder verwandelt Vertragsgestaltung in einen intuitiven Prozess.
                  Wählen Sie aus einer Bibliothek von Bausteinen und exportieren Sie professionelle Dokumente.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Layers size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>15+ Bausteintypen</h4>
                      <p>Parteien, Klauseln, Tabellen, Unterschriften und mehr</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Sparkles size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Smart Variables</h4>
                      <p>Einmal definieren, überall automatisch einsetzen</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Wrench size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>KI-Klauselgenerator</h4>
                      <p>Beschreiben Sie, was Sie brauchen – KI liefert die Klausel</p>
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
              <h2 className={styles.sectionTitle}>In 4 Schritten zum fertigen Vertrag</h2>
              <p className={styles.sectionSubtitle}>
                Von der leeren Seite zum professionellen Dokument.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vorlage wählen</h3>
                    <p className={styles.processDesc}>
                      Starten Sie mit einer leeren Vorlage oder wählen Sie aus professionellen
                      Templates für verschiedene Vertragstypen.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Bausteine hinzufügen</h3>
                    <p className={styles.processDesc}>
                      Ziehen Sie Parteien, Klauseln, Tabellen und Unterschriftsfelder
                      per Drag & Drop auf Ihre Vorlage.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Variablen ausfüllen</h3>
                    <p className={styles.processDesc}>
                      Definieren Sie Smart Variables für Namen, Adressen, Beträge – sie werden
                      überall automatisch eingesetzt.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>4</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>PDF exportieren</h3>
                    <p className={styles.processDesc}>
                      Laden Sie Ihren fertigen Vertrag als professionelles PDF herunter
                      oder drucken Sie ihn direkt aus.
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
              <h2 className={styles.sectionTitle}>Contract Builder in Zahlen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>15+</div>
                <div className={styles.statLabel}>Bausteintypen</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>{'< 10min'}</div>
                <div className={styles.statLabel}>Durchschn. Erstellzeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>2.000+</div>
                <div className={styles.statLabel}>Erstellte Verträge</div>
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
                  Brauche ich juristische Vorkenntnisse?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein, der Contract Builder ist für jeden bedienbar. Die Bausteine enthalten
                  bereits rechtlich geprüfte Formulierungen. Die KI hilft bei Anpassungen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich eigene Klauseln hinzufügen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Sie können jederzeit eigene Texte eingeben oder von der KI generieren
                  lassen. Alle Bausteine sind vollständig anpassbar.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Exportformate gibt es?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Export als PDF (inkl. Anlagen), Druck-Funktion und Speicherung als
                  wiederverwendbare Vorlage. Word-Export ist in Planung.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktionieren Smart Variables?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Definieren Sie Variablen wie {'{{name}}'} oder {'{{adresse}}'} einmal und
                  sie werden automatisch überall im Dokument eingesetzt.
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
              <Link to="/features/generator" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>📝</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsgenerator</div>
                  <div className={styles.relatedDescription}>
                    Lassen Sie komplette Verträge von der KI erstellen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/digitalesignatur" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>✍️</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Digitale Signatur</div>
                  <div className={styles.relatedDescription}>
                    Unterschreiben Sie Ihre Verträge rechtsgültig digital
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/legal-lens" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>🔍</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Legal Lens</div>
                  <div className={styles.relatedDescription}>
                    Verstehen Sie jede Klausel – Erklärungen per Klick
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
                  Erstellen Sie Ihren ersten Vertrag in Minuten
                </h2>
                <p className={styles.ctaSubtitle}>
                  Kein Jurastudium nötig. Keine komplizierten Tools. Einfach Bausteine
                  zusammensetzen und professionelle Verträge erstellen.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Contract Builder starten
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

export default ContractBuilder;

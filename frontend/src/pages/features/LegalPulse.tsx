import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  Activity, TrendingUp, AlertTriangle, Bell, Shield, CheckCircle,
  ArrowRight, ChevronDown, FileText, Clock, Zap, Search, Calendar, FolderOpen
} from "lucide-react";

// Video
const legalPulseVideo = "/Videos/legalpulse.mp4";

const LegalPulse: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const targetInApp = "/legal-pulse";
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
      { "@type": "ListItem", "position": 3, "name": "Legal Pulse", "item": "https://www.contract-ai.de/features/legalpulse" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Welche Rechtsquellen überwacht Legal Pulse?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Offizielle EU- und deutsche Rechtsquellen: Bundesanzeiger, EU-Amtsblätter, BGH/BVerfG-Entscheidungen, Ministerialblätter, Branchenverbände."
        }
      },
      {
        "@type": "Question",
        "name": "Wie aktuell sind die Informationen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Pulse prüft kontinuierlich und reagiert binnen 48 Stunden auf relevante Änderungen."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet Legal Pulse?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Legal Pulse ist ab dem Business-Plan (19€/Monat) enthalten."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertragsrisiken erkennen – Frühwarnsystem | Contract AI</title>
        <meta name="description" content="Vertragsrisiken früh erkennen mit Legal Pulse: Automatisches Monitoring, Risiko-Alerts bei Problemen, konkrete Handlungsempfehlungen. Proaktiv statt reaktiv. ✓ Jetzt aktivieren" />
        <meta name="keywords" content="Vertragsrisiken erkennen, Vertragsüberwachung, Risiko-Monitoring, Frühwarnsystem Verträge, Vertragsrisiken, Legal Pulse, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/legalpulse" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertragsrisiken erkennen – Frühwarnsystem | Contract AI" />
        <meta property="og:description" content="Vertragsrisiken früh erkennen: Automatisches Monitoring, Risiko-Alerts, Handlungsempfehlungen. ✓ Jetzt aktivieren" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/legalpulse" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-legalpulse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsrisiken erkennen – Frühwarnsystem | Contract AI" />
        <meta name="twitter:description" content="Vertragsrisiken früh erkennen: Automatisches Monitoring, Risiko-Alerts, Handlungsempfehlungen. ✓ Jetzt aktivieren" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-legalpulse.png" />

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
                Intelligentes Rechts-Monitoring
              </div>

              <h1 className={styles.heroTitle}>
                Ihr Frühwarnsystem<br/>
                <span className={styles.heroTitleHighlight}>für Vertragsrisiken</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Gesetze ändern sich. Märkte bewegen sich. Legal Pulse prüft Ihre Verträge
                regelmäßig, erkennt neue Risiken und empfiehlt konkrete Updates.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Legal Pulse aktivieren
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
                  <Activity size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>24/7 aktiv</div>
                  <div className={styles.floatingSubtext}>Monitoring</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>100+ Quellen</div>
                  <div className={styles.floatingSubtext}>Überwacht</div>
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
                      <Activity size={24} />
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Risiko-Monitor</div>
                      <div className={styles.demoScoreTitle}>3 Alerts aktiv</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>DSGVO-Update erforderlich</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Hoch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <Bell size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Neue Informationspflicht</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>5 Verträge aktuell</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>OK</span>
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
              <Activity size={18} />
              Regelmäßige Checks
            </div>
            <div className={styles.trustBadge}>
              <AlertTriangle size={18} />
              Risiko-Alerts
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
              <h2 className={styles.sectionTitle}>Legal Pulse in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie Legal Pulse Ihre Verträge überwacht und Sie bei relevanten
                Änderungen proaktiv informiert.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={legalPulseVideo}
                  poster="/videos/legalpulse-poster.jpg"
                  alt="Legal Pulse Demo"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            FUNKTIONEN SECTION (6 Feature Cards)
            ========================================== */}
        <section className={styles.functionsSection} id="funktionen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Funktionen</span>
              <h2 className={styles.sectionTitle}>Was Legal Pulse für Sie leistet</h2>
              <p className={styles.sectionSubtitle}>
                Proaktives Vertragsmanagement statt reaktiver Feuerwehr – mit intelligenter Überwachung.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Activity size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kontinuierliches Monitoring</h3>
                <p className={styles.functionDesc}>
                  24/7-Überwachung relevanter Rechtsquellen, Rechtsprechung und Compliance-Entwicklungen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <TrendingUp size={24} />
                </div>
                <h3 className={styles.functionTitle}>Intelligente Klassifikation</h3>
                <p className={styles.functionDesc}>
                  Automatische Zuordnung zu Themenbereichen: Datenschutz, Arbeitsrecht, Verbraucherschutz.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Risiko-Priorisierung</h3>
                <p className={styles.functionDesc}>
                  Bewertung der Auswirkungen: niedrig/mittel/hoch mit klarer Priorisierung.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Bell size={24} />
                </div>
                <h3 className={styles.functionTitle}>Proaktive Alerts</h3>
                <p className={styles.functionDesc}>
                  Sofortige Benachrichtigung bei relevanten Änderungen mit konkreten Textvorschlägen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Handlungsempfehlungen</h3>
                <p className={styles.functionDesc}>
                  Konkrete Anweisungen, welche Verträge aktualisiert werden sollten und warum.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>Compliance-Sicherheit</h3>
                <p className={styles.functionDesc}>
                  Bleiben Sie compliant – Legal Pulse informiert Sie über regulatorische Änderungen.
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
                <h2 className={styles.sectionTitleLeft}>Stillstand ist Risiko – Verträge veralten</h2>
                <p className={styles.problemText}>
                  Ein Vertrag, der heute passt, kann morgen Lücken haben – durch neue
                  Rechtsprechung, Marktstandards oder Compliance-Anforderungen. DSGVO-Updates,
                  veränderte Kündigungsregeln, neue Arbeitsrechtsbestimmungen: Was gestern
                  rechtssicher war, ist heute womöglich angreifbar.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>47%</div>
                    <div className={styles.problemStatLabel}>der Verträge sind nach 2 Jahren veraltet</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>200+</div>
                    <div className={styles.problemStatLabel}>Rechtsänderungen pro Jahr in Deutschland</div>
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
                      <div className={styles.problemDocTitle}>AV-Vertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>Erstellt vor 18 Monaten</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...gemäß DSGVO Art. 28..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  DSGVO-Update nötig!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Neue Pflichten seit 2024
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
                    <span className={styles.comparisonLabel}>Ohne Legal Pulse</span>
                    <div className={styles.comparisonIcon}>
                      <Clock size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Manuelle Recherche</div>
                    <div className={styles.comparisonDesc}>
                      Newsletter lesen, Gesetzblätter prüfen, hoffen dass nichts übersehen wird.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      Stunden pro Woche
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Mit Legal Pulse</span>
                    <div className={styles.comparisonIcon}>
                      <Activity size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Automatische Alerts</div>
                    <div className={styles.comparisonDesc}>
                      Proaktive Benachrichtigungen bei relevanten Änderungen mit Handlungsempfehlungen.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Sofort informiert
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Intelligentes Monitoring mit Legal Pulse</h2>
                <p className={styles.solutionText}>
                  Legal Pulse überwacht relevante Rechtsquellen und gleicht sie mit Ihren Verträgen ab.
                  Sie erhalten nicht nur Warnungen, sondern konkrete Handlungsempfehlungen.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Activity size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>100+ Rechtsquellen</h4>
                      <p>EU-Recht, Bundesrecht, Branchenstandards – alles im Blick</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Bell size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Intelligente Alerts</h4>
                      <p>Nur relevante Änderungen – keine Newsletter-Flut</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <FileText size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Konkrete Textvorschläge</h4>
                      <p>Direkt umsetzbare Empfehlungen für Ihre Verträge</p>
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
              <h2 className={styles.sectionTitle}>In 3 Schritten zum proaktiven Monitoring</h2>
              <p className={styles.sectionSubtitle}>
                Vom Vertragsbestand zum intelligenten Risikomanagement – einfach und automatisch.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertragsbestand einrichten</h3>
                    <p className={styles.processDesc}>
                      Verknüpfen Sie Ihre wichtigsten Verträge mit Legal Pulse – automatische
                      Kategorisierung nach Branche und Vertragstyp.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Kontinuierliches Monitoring</h3>
                    <p className={styles.processDesc}>
                      24/7-Überwachung von Rechtsquellen, Klassifikation relevanter Änderungen
                      und Abgleich mit Ihren Verträgen.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Proaktive Alerts & Updates</h3>
                    <p className={styles.processDesc}>
                      Sofortige Benachrichtigung bei relevanten Änderungen mit konkreten
                      Handlungsempfehlungen und Textvorschlägen.
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
              <h2 className={styles.sectionTitle}>Legal Pulse in Zahlen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Monitoring aktiv</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>48h</div>
                <div className={styles.statLabel}>Alert-Reaktionszeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>100+</div>
                <div className={styles.statLabel}>Überwachte Quellen</div>
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
                  Welche Rechtsquellen überwacht Legal Pulse?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Offizielle EU- und deutsche Rechtsquellen: Bundesanzeiger, EU-Amtsblätter,
                  BGH/BVerfG-Entscheidungen, Ministerialblätter, Branchenverbände. Keine Blogs
                  oder ungeprüfte Quellen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie aktuell sind die Informationen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Legal Pulse prüft kontinuierlich und reagiert binnen 48 Stunden auf relevante
                  Änderungen. Bei kritischen Updates erfolgen Eilmeldungen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich die Alerts anpassen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Sie können Themenbereiche und Risikostufen filtern. Vollständig
                  konfigurierbar nach Ihren Bedürfnissen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Gibt es branchenspezifische Überwachung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Legal Pulse erkennt Ihren Geschäftsbereich und fokussiert auf relevante
                  Regelungen: FinTech, SaaS, E-Commerce, Immobilien, Gesundheitswesen etc.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet Legal Pulse?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Legal Pulse ist ab dem Business-Plan (19€/Monat) enthalten. Free-Nutzer können
                  auf Business oder Enterprise upgraden.
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
                    Komplette Analyse Ihrer Verträge mit Risiko-Score und Empfehlungen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/fristen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Calendar size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Fristenkalender</div>
                  <div className={styles.relatedDescription}>
                    Automatische Erkennung und Erinnerungen für alle Vertragsfristen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/vertragsverwaltung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><FolderOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsverwaltung</div>
                  <div className={styles.relatedDescription}>
                    Alle Verträge zentral organisieren und durchsuchen
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
                  Proaktiv statt reaktiv – Verträge aktuell halten
                </h2>
                <p className={styles.ctaSubtitle}>
                  Erkennen Sie Risiken bevor sie zum Problem werden. Legal Pulse überwacht,
                  warnt und empfiehlt – Sie setzen um.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Legal Pulse aktivieren
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

export default LegalPulse;

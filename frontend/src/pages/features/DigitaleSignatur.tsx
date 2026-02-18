import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import AutoPlayVideo from "../../components/AutoPlayVideo";
import {
  PenTool, CheckCircle, Mail, FileText, Shield, Zap,
  ArrowRight, ChevronDown, Clock, AlertTriangle, Users
} from "lucide-react";

// Video
const signaturVideo = "/Videos/signatur.mp4";

const DigitaleSignatur: React.FC = () => {
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
      { "@type": "ListItem", "position": 3, "name": "Digitale Signatur", "item": "https://www.contract-ai.de/features/digitalesignatur" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Ist die digitale Signatur rechtssicher?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, die digitale Signatur entspricht der eIDAS-Verordnung und ist in Deutschland und der EU rechtlich bindend."
        }
      },
      {
        "@type": "Question",
        "name": "Wie funktioniert der Signaturprozess?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sie laden Ihren Vertrag hoch, definieren Signaturfelder, und senden eine E-Mail an die Unterzeichner. Diese signieren per Mausklick."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist ein Audit Trail?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Audit Trail protokolliert jeden Schritt: Wer hat wann, wo und wie signiert (IP-Adresse, Zeitstempel, Gerät)."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertrag digital unterschreiben – eIDAS-konform | Contract AI</title>
        <meta name="description" content="Verträge digital unterschreiben lassen – rechtsgültig & eIDAS-konform. Die sichere DocuSign Alternative aus Deutschland: Audit Trail, Echtzeit-Tracking, DSGVO-konform. ✓ Jetzt testen" />
        <meta name="keywords" content="Vertrag digital unterschreiben, digitale Signatur, E-Signatur, eIDAS Signatur, DocuSign Alternative Deutschland, elektronische Unterschrift, Contract AI" />

        <link rel="canonical" href="https://www.contract-ai.de/features/digitalesignatur" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertrag digital unterschreiben – eIDAS-konform | Contract AI" />
        <meta property="og:description" content="Verträge digital unterschreiben – rechtsgültig & eIDAS-konform. DocuSign Alternative aus Deutschland. ✓ Jetzt testen" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/features/digitalesignatur" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-digitalesignatur.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrag digital unterschreiben – eIDAS-konform | Contract AI" />
        <meta name="twitter:description" content="Verträge digital unterschreiben – rechtsgültig & eIDAS-konform. DocuSign Alternative aus Deutschland. ✓ Jetzt testen" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-digitalesignatur.png" />

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
                Rechtssichere E-Signatur
              </div>

              <h1 className={styles.heroTitle}>
                Verträge digital signieren<br/>
                <span className={styles.heroTitleHighlight}>in Minuten statt Tagen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Schluss mit Ausdrucken, Scannen und Versenden. Lassen Sie Verträge einfach
                digital signieren – mit E-Mail-Benachrichtigung, Echtzeit-Tracking und
                vollständigem Audit Trail.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Vertrag signieren lassen
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
                  <div className={styles.floatingText}>eIDAS</div>
                  <div className={styles.floatingSubtext}>Konform</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>2/3</div>
                  <div className={styles.floatingSubtext}>Signiert</div>
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
                      <PenTool size={24} />
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Signatur-Status</div>
                      <div className={styles.demoScoreTitle}>2 von 3 signiert</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Max Müller</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Signiert</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>HR Department</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Signiert</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <Clock size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Geschäftsführung</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Ausstehend</span>
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
              eIDAS-konform
            </div>
            <div className={styles.trustBadge}>
              <FileText size={18} />
              Vollständiger Audit Trail
            </div>
            <div className={styles.trustBadge}>
              <Zap size={18} />
              In Minuten fertig
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
              <h2 className={styles.sectionTitle}>Digitale Signatur in Aktion</h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie einfach Sie Verträge digital signieren lassen können.
              </p>
            </div>

            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo
                  src={signaturVideo}
                  poster="/videos/signatur-poster.jpg"
                  alt="Digitale Signatur Demo"
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
              <h2 className={styles.sectionTitle}>Was die digitale Signatur bietet</h2>
              <p className={styles.sectionSubtitle}>
                Professionelle E-Signatur mit allen wichtigen Funktionen.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Mail size={24} />
                </div>
                <h3 className={styles.functionTitle}>E-Mail-Versand</h3>
                <p className={styles.functionDesc}>
                  Senden Sie Signier-Links automatisch per E-Mail. Unterzeichner brauchen weder Login noch Software.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Echtzeit-Status</h3>
                <p className={styles.functionDesc}>
                  Verfolgen Sie in Echtzeit, wer bereits signiert hat und wer noch aussteht.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Audit Trail</h3>
                <p className={styles.functionDesc}>
                  Jeder Schritt wird protokolliert: Zeitstempel, IP-Adresse, Gerät. Rechtlich beweiskräftig.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Users size={24} />
                </div>
                <h3 className={styles.functionTitle}>Mehrere Unterzeichner</h3>
                <p className={styles.functionDesc}>
                  Definieren Sie Signierreihenfolge oder lassen Sie alle gleichzeitig signieren.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>Versiegeltes PDF</h3>
                <p className={styles.functionDesc}>
                  Nach der Signatur erhalten Sie ein manipulationssicheres PDF mit digitalem Siegel.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}>
                  <Zap size={24} />
                </div>
                <h3 className={styles.functionTitle}>EU-weit gültig</h3>
                <p className={styles.functionDesc}>
                  eIDAS-konforme Signaturen sind in allen EU-Mitgliedsstaaten rechtlich bindend.
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
                <h2 className={styles.sectionTitleLeft}>Papier-Signaturen sind zeitaufwändig</h2>
                <p className={styles.problemText}>
                  Verträge ausdrucken, unterschreiben, scannen und per E-Mail verschicken –
                  der traditionelle Weg dauert Tage oder Wochen. Dokumente gehen verloren,
                  Signaturen werden vergessen, und der gesamte Prozess ist schwer nachvollziehbar.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>5-7 Tage</div>
                    <div className={styles.problemStatLabel}>durchschnittliche Signaturzeit bei Papier</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>34%</div>
                    <div className={styles.problemStatLabel}>der Dokumente gehen im Prozess verloren</div>
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
                      <div className={styles.problemDocTitle}>Papier-Signatur</div>
                      <div className={styles.problemDocSubtitle}>Komplizierter Prozess</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...Unterschrift fehlt..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Dokument verloren!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  5+ Tage Wartezeit
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
                    <span className={styles.comparisonLabel}>Papier-Signatur</span>
                    <div className={styles.comparisonIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>5-7 Tage Wartezeit</div>
                    <div className={styles.comparisonDesc}>
                      Ausdrucken, signieren, scannen, versenden. Dokumente gehen verloren.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      Tage bis Wochen
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Digitale Signatur</span>
                    <div className={styles.comparisonIcon}>
                      <PenTool size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>In Minuten fertig</div>
                    <div className={styles.comparisonDesc}>
                      Ein Klick zum Signieren. Versiegeltes PDF mit Audit Trail.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      Minuten
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Digitale Signatur – rechtssicher in Minuten</h2>
                <p className={styles.solutionText}>
                  Laden Sie Ihren Vertrag hoch, definieren Sie Signaturfelder, und versenden Sie
                  eine E-Mail an die Unterzeichner. Sie erhalten ein versiegeltes PDF mit vollständigem Audit Trail.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Mail size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Automatischer E-Mail-Versand</h4>
                      <p>Unterzeichner erhalten einen Link – ohne Login oder Software</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <FileText size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Vollständiger Audit Trail</h4>
                      <p>Wer, wann, wo und wie – alles dokumentiert und beweiskräftig</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Shield size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>eIDAS-konform</h4>
                      <p>Rechtlich bindend in Deutschland und der gesamten EU</p>
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
              <h2 className={styles.sectionTitle}>In 3 Schritten zum signierten Vertrag</h2>
              <p className={styles.sectionSubtitle}>
                Von der Vertragsvorbereitung zum versiegelten PDF.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertrag vorbereiten</h3>
                    <p className={styles.processDesc}>
                      Laden Sie Ihren Vertrag hoch und definieren Sie Signaturfelder
                      für jeden Unterzeichner.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>E-Mail versenden</h3>
                    <p className={styles.processDesc}>
                      Geben Sie E-Mail-Adressen der Unterzeichner ein – sie erhalten
                      automatisch einen Link zum Signieren.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Versiegeltes PDF erhalten</h3>
                    <p className={styles.processDesc}>
                      Nach der letzten Signatur erhalten Sie ein rechtssicheres PDF
                      mit vollständigem Audit Trail.
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
              <h2 className={styles.sectionTitle}>Digitale Signatur in Zahlen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>{'< 15min'}</div>
                <div className={styles.statLabel}>Durchschn. Signaturzeit</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>EU-weit</div>
                <div className={styles.statLabel}>Rechtlich gültig</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>5.000+</div>
                <div className={styles.statLabel}>Signierte Verträge</div>
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
                  Ist die digitale Signatur rechtssicher?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, digitale Signaturen mit Contract AI entsprechen der eIDAS-Verordnung
                  und sind in Deutschland und der gesamten EU rechtlich bindend. Jeder
                  Signiervorgang wird mit vollständigem Audit Trail dokumentiert.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie funktioniert der Signaturprozess?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Sie laden Ihren Vertrag hoch, definieren Signaturfelder, und senden eine
                  E-Mail an die Unterzeichner. Diese erhalten einen Link, öffnen das Dokument
                  im Browser und signieren per Mausklick – ohne Login oder Software.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was ist ein Audit Trail?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Der Audit Trail protokolliert jeden Schritt des Signierprozesses: Wer hat
                  wann, wo und wie signiert (IP-Adresse, Zeitstempel, Gerät). Das versiegelte
                  PDF mit Audit Trail ist rechtlich beweiskräftig.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Brauchen Unterzeichner einen Account?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein, Unterzeichner erhalten einen Link per E-Mail und können direkt im
                  Browser signieren – ohne Registrierung oder Software-Installation.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Können mehrere Personen gleichzeitig signieren?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja, Sie können entweder eine Signierreihenfolge definieren oder alle
                  Unterzeichner gleichzeitig einladen. Sie sehen in Echtzeit, wer bereits
                  signiert hat.
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
                    Erstellen Sie Verträge mit KI – unterschriftsreif in Minuten
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/contract-builder" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>🔧</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Contract Builder</div>
                  <div className={styles.relatedDescription}>
                    Visueller Editor für individuelle Vertragsgestaltung
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/vertragsverwaltung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}>📁</span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsverwaltung</div>
                  <div className={styles.relatedDescription}>
                    Alle signierten Verträge zentral organisieren
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
                  Verträge in Minuten rechtssicher signieren lassen
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 95% unserer Nutzer schließen den Signaturprozess in unter 15 Minuten ab.
                  Starten Sie jetzt kostenlos!
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt kostenlos testen
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

export default DigitaleSignatur;

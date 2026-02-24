import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/FeaturePage.module.css";
import Footer from "../components/Footer";
import AutoPlayVideo from "../components/AutoPlayVideo";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, Brain,
  BarChart3, Sparkles, Scale, Users, Building2, GraduationCap,
  TrendingUp, Lock, Globe, Cpu, Eye, ListChecks
} from "lucide-react";

const analyseVideo = "/Videos/analyse.mp4";
import analyseImg from "../assets/Analyse.webp";

const KiVertragsanalyse: React.FC = () => {
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
      { "@type": "ListItem", "position": 2, "name": "KI-Vertragsanalyse", "item": "https://www.contract-ai.de/ki-vertragsanalyse" }
    ]
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "KI-Vertragsanalyse: Der komplette Guide 2026",
    "description": "Alles was Sie über KI-gestützte Vertragsanalyse wissen müssen: Wie sie funktioniert, was sie kostet, KI vs. Anwalt im Vergleich und für wen sie sich lohnt.",
    "author": {
      "@type": "Organization",
      "name": "Contract AI",
      "url": "https://www.contract-ai.de"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Contract AI",
      "url": "https://www.contract-ai.de",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.contract-ai.de/logo.png"
      }
    },
    "datePublished": "2025-01-15T00:00:00+01:00",
    "dateModified": "2026-02-24T00:00:00+01:00",
    "mainEntityOfPage": "https://www.contract-ai.de/ki-vertragsanalyse",
    "image": "https://www.contract-ai.de/og/og-ki-vertragsanalyse.png"
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Vertrag mit KI analysieren lassen",
    "description": "So analysieren Sie Ihren Vertrag in 60 Sekunden mit KI-Vertragsanalyse",
    "totalTime": "PT1M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Vertrag hochladen",
        "text": "Laden Sie Ihren Vertrag als PDF oder Word-Dokument bei Contract AI hoch. Die Daten werden verschlüsselt auf deutschen Servern verarbeitet."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "KI-Analyse starten",
        "text": "Die KI erkennt automatisch den Vertragstyp und analysiert jede Klausel auf Risiken, Fairness und rechtliche Probleme."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Ergebnis lesen und handeln",
        "text": "Erhalten Sie einen detaillierten Report mit Chancen-Risiken-Score, markierten Problemstellen und konkreten Handlungsempfehlungen."
      }
    ]
  };

  const faqData = [
    {
      question: "Was ist KI-Vertragsanalyse?",
      answer: "KI-Vertragsanalyse bezeichnet den Einsatz von Künstlicher Intelligenz (KI) zur automatischen Prüfung und Bewertung von Verträgen. Die KI liest den gesamten Vertrag, erkennt problematische Klauseln, bewertet die Fairness und liefert verständliche Handlungsempfehlungen. Im Gegensatz zur manuellen Prüfung dauert dies Sekunden statt Stunden."
    },
    {
      question: "Wie genau ist KI bei der Vertragsprüfung?",
      answer: "Moderne KI-Vertragsanalyse erkennt die gängigsten problematischen Klauseln zuverlässig. Contract AI nutzt GPT-4-basierte Technologie, die speziell auf deutsche Rechtstexte optimiert wurde. Die KI erkennt typische Muster wie überlange Kündigungsfristen, einseitige Haftungsklauseln, versteckte Gebühren und ungewöhnliche Vertragsbedingungen. Wie bei jeder Technologie empfehlen wir bei besonders sensiblen Verträgen eine zusätzliche fachliche Prüfung."
    },
    {
      question: "Ersetzt KI-Vertragsanalyse den Anwalt?",
      answer: "Nein, KI-Vertragsanalyse ersetzt keine anwaltliche Beratung, sondern ergänzt sie sinnvoll. Die KI ist ideal für eine schnelle Erstprüfung: Sie identifiziert Problemstellen in Sekunden und hilft Ihnen, informierte Entscheidungen zu treffen. Bei komplexen rechtlichen Fragen, Streitigkeiten oder hohen Vertragswerten empfehlen wir weiterhin einen Fachanwalt. Viele Nutzer kombinieren beides: KI-Erstcheck + Anwalt für kritische Punkte."
    },
    {
      question: "Welche Vertragsarten kann KI analysieren?",
      answer: "KI-Vertragsanalyse funktioniert mit nahezu allen gängigen Vertragstypen: Arbeitsverträge, Mietverträge, Kaufverträge, NDAs, Freelancer-Verträge, SaaS-Verträge, Dienstleistungsverträge, Werkverträge, Kooperationsverträge, Gesellschaftsverträge und mehr. Die KI erkennt den Vertragstyp automatisch und passt die Analyse entsprechend an."
    },
    {
      question: "Was kostet KI-Vertragsanalyse?",
      answer: "Bei Contract AI können Sie mit dem kostenlosen Starter-Tarif bis zu 3 Verträge analysieren. Der Business-Tarif (19 EUR/Monat) enthält 25 Analysen monatlich, der Enterprise-Tarif (29 EUR/Monat) bietet unbegrenzte Analysen. Zum Vergleich: Eine anwaltliche Vertragsprüfung kostet je nach Kanzlei und Vertragsumfang oft einen dreistelligen Betrag pro Vertrag."
    },
    {
      question: "Sind meine Vertragsdaten bei der KI-Analyse sicher?",
      answer: "Ja. Bei Contract AI werden alle Daten auf deutschen Servern verarbeitet, Ende-zu-Ende verschlüsselt (256-bit) und DSGVO-konform behandelt. Ihre Vertragsdaten werden nicht für KI-Training verwendet und können jederzeit vollständig gelöscht werden. Wir geben keine Daten an Dritte weiter."
    },
    {
      question: "Wie schnell ist KI-Vertragsanalyse?",
      answer: "Die KI-Vertragsanalyse von Contract AI dauert in der Regel unter 60 Sekunden. Zum Vergleich: Eine manuelle Vertragsprüfung dauert 2-4 Stunden, eine anwaltliche Prüfung oft mehrere Tage. Die Geschwindigkeit ermöglicht es, Verträge direkt vor der Unterschrift zu prüfen."
    },
    {
      question: "Kann ich KI-Vertragsanalyse auch auf Englisch nutzen?",
      answer: "Ja, Contract AI unterstützt Verträge in deutscher und englischer Sprache. Die Ergebnisse werden in der Sprache Ihrer Wahl ausgegeben. Bei internationalen Verträgen erkennt die KI sprachübergreifende Risiken und kulturelle Unterschiede in der Vertragsgestaltung."
    },
    {
      question: "Was passiert, wenn die KI etwas übersieht?",
      answer: "Keine Analyse ist zu 100% perfekt. Deshalb betont Contract AI transparent, dass die KI-Analyse eine professionelle Erstprüfung ist, aber keine Rechtsberatung ersetzt. Bei Verträgen mit hohem Wert oder besonderer Komplexität empfehlen wir, die KI-Ergebnisse als Grundlage für ein gezieltes Anwaltsgespräch zu nutzen."
    },
    {
      question: "Für wen eignet sich KI-Vertragsanalyse?",
      answer: "KI-Vertragsanalyse eignet sich für Privatpersonen (Mietverträge, Arbeitsverträge, Kaufverträge), Freelancer und Selbstständige (Kundenverträge, NDAs), kleine und mittlere Unternehmen (Lieferantenverträge, Dienstleistungsverträge), Startups (Investorenverträge, Kooperationsverträge) und Rechtsabteilungen (Massenprüfung, Qualitätssicherung)."
    },
    {
      question: "Was unterscheidet Contract AI von anderen KI-Vertragsanalyse-Tools?",
      answer: "Contract AI ist speziell auf den deutschen Rechtsraum optimiert. Die Analyse berücksichtigt deutsches Vertragsrecht, aktuelle Rechtsprechung und typische Fallstricke im DACH-Raum. Zusätzlich bietet Contract AI eine Komplettlösung mit Vertragsanalyse, Optimierung, Vertragserstellung, Fristenkalender und digitaler Signatur in einer Plattform."
    },
    {
      question: "Wie starte ich mit KI-Vertragsanalyse?",
      answer: "Registrieren Sie sich kostenlos bei Contract AI, laden Sie Ihren ersten Vertrag als PDF oder Word hoch, und erhalten Sie innerhalb von 60 Sekunden eine vollständige Analyse mit Risikobewertung und Handlungsempfehlungen. Keine Kreditkarte erforderlich."
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>KI-Vertragsanalyse: Vertrag in 60 Sek. prüfen | Contract AI</title>
        <meta name="description" content="KI-Vertragsanalyse: Vertrag hochladen und in 60 Sekunden Risiken erkennen. DSGVO-konform, deutsche Server. Der komplette Guide: Funktionsweise, Kosten, KI vs. Anwalt." />
        <meta name="keywords" content="KI Vertragsanalyse, KI Vertragsprüfung, Vertragsanalyse KI, automatische Vertragsanalyse, KI Vertragscheck, Vertragsanalyse Software, Vertrag KI prüfen, Contract AI, Vertragsanalyse online, KI Vertragsmanagement" />

        <link rel="canonical" href="https://www.contract-ai.de/ki-vertragsanalyse" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="KI-Vertragsanalyse: Der komplette Guide 2026 | Contract AI" />
        <meta property="og:description" content="Alles über KI-Vertragsanalyse: Wie sie funktioniert, was sie kostet, KI vs. Anwalt im Vergleich. Kostenlos testen." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://www.contract-ai.de/ki-vertragsanalyse" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-ki-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />
        <meta property="article:published_time" content="2025-01-15T00:00:00+01:00" />
        <meta property="article:modified_time" content="2026-02-24T00:00:00+01:00" />
        <meta property="article:author" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="KI-Vertragsanalyse: Der komplette Guide 2026 | Contract AI" />
        <meta name="twitter:description" content="Alles über KI-Vertragsanalyse: Wie sie funktioniert, was sie kostet, KI vs. Anwalt im Vergleich. Kostenlos testen." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-ki-vertragsanalyse.png" />

        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className={styles.pageBackground}>
        <div className={styles.ambientBg}>
          <div className={`${styles.ambientOrb} ${styles.orb1}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb2}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb3}`}></div>
        </div>

        {/* ==========================================
            HERO SECTION
            ========================================== */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                Der komplette Guide 2026
              </div>

              <h1 className={styles.heroTitle}>
                KI-Vertragsanalyse:<br/>
                <span className={styles.heroTitleHighlight}>Verträge prüfen in Sekunden statt Tagen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Wie Künstliche Intelligenz Verträge schneller, günstiger und objektiver prüft
                als herkömmliche Methoden. Der komplette Guide: Funktionsweise, Kosten,
                KI vs. Anwalt und für wen sich KI-Vertragsanalyse lohnt.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Vertrag kostenlos prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#was-ist-ki-vertragsanalyse" className={styles.btnSecondary}>
                  Guide lesen
                </a>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Brain size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>GPT-4 powered</div>
                  <div className={styles.floatingSubtext}>Modernste KI</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>DSGVO-konform</div>
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
                  <div className={styles.demoScore}>
                    <div className={styles.demoScoreCircle}>
                      <span className={styles.demoScoreValue}>82</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>KI-Vertragsanalyse</div>
                      <div className={styles.demoScoreTitle}>Mietvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Haftungsklausel einseitig</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Hoch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Schönheitsreparaturen unklar</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Kaution gesetzeskonform</span>
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
            <div className={styles.trustBadge}><Shield size={18} /> 256-bit Verschlüsselung</div>
            <div className={styles.trustBadge}><CheckCircle size={18} /> DSGVO-konform</div>
            <div className={styles.trustBadge}><Clock size={18} /> Analyse in 60 Sekunden</div>
            <div className={styles.trustBadge}><Users size={18} /> 5.000+ Nutzer</div>
          </div>
        </div>

        {/* ==========================================
            QUICK ANSWER (above the fold for UX)
            ========================================== */}
        <section className={styles.pillarQuickAnswer}>
          <div className={styles.container}>
            <div className={`${styles.pillarQuickAnswerBox} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.pillarQuickAnswerTitle}>Das Wichtigste in Kürze</h2>
              <ul className={styles.pillarQuickAnswerList}>
                <li><strong>Was:</strong> KI liest Ihren Vertrag und erkennt automatisch Risiken, unfaire Klauseln und fehlende Regelungen.</li>
                <li><strong>Wie schnell:</strong> Vollständige Analyse in unter 60 Sekunden statt Stunden oder Tagen.</li>
                <li><strong>Für wen:</strong> Privatpersonen, Freelancer, KMU, Startups und Rechtsabteilungen.</li>
                <li><strong>Kosten:</strong> Kostenloser Einstieg möglich. Deutlich günstiger als eine anwaltliche Einzelprüfung.</li>
                <li><strong>Wichtig:</strong> KI-Vertragsanalyse ergänzt anwaltliche Beratung, ersetzt sie aber nicht bei komplexen Rechtsfragen.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ==========================================
            TABLE OF CONTENTS
            ========================================== */}
        <section className={styles.pillarTocSection}>
          <div className={styles.container}>
            <div className={`${styles.pillarToc} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.pillarTocTitle}>
                <ListChecks size={20} />
                Inhaltsverzeichnis
              </h2>
              <nav className={styles.pillarTocNav}>
                <a href="#was-ist-ki-vertragsanalyse" className={styles.pillarTocLink}>1. Was ist KI-Vertragsanalyse?</a>
                <a href="#wie-funktioniert" className={styles.pillarTocLink}>2. Wie funktioniert KI-Vertragsanalyse?</a>
                <a href="#ki-vs-anwalt" className={styles.pillarTocLink}>3. KI vs. Anwalt: Der ehrliche Vergleich</a>
                <a href="#vertragsarten" className={styles.pillarTocLink}>4. Welche Verträge kann KI analysieren?</a>
                <a href="#vorteile" className={styles.pillarTocLink}>5. Vorteile der KI-Vertragsanalyse</a>
                <a href="#sicherheit" className={styles.pillarTocLink}>6. Datenschutz und Sicherheit</a>
                <a href="#contract-ai" className={styles.pillarTocLink}>7. Contract AI: Die Plattform</a>
                <a href="#zukunft" className={styles.pillarTocLink}>8. Warum KI-Vertragsanalyse 2026 Standard wird</a>
                <a href="#faq" className={styles.pillarTocLink}>9. Häufige Fragen</a>
              </nav>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 1: WAS IST KI-VERTRAGSANALYSE?
            ========================================== */}
        <section className={styles.functionsSection} id="was-ist-ki-vertragsanalyse">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Definition</span>
              <h2 className={styles.sectionTitle}>Was ist <span style={{ color: '#3b82f6' }}>KI-Vertragsanalyse</span>?</h2>
            </div>

            <div className={`${styles.pillarProse} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.pillarDefinition}>
                <p>
                  <strong>KI-Vertragsanalyse</strong> (auch: AI Contract Review, automatische Vertragsprüfung)
                  ist die automatisierte, algorithmenbasierte Prüfung juristischer Dokumente durch
                  Machine-Learning-Modelle, die Vertragsklauseln erkennen, bewerten und Risikopotenziale
                  identifizieren. Sie ermöglicht eine strukturierte Ersteinschätzung von Verträgen in
                  Sekunden statt Stunden und macht professionelle Vertragsprüfung für jedermann zugänglich.
                </p>
              </div>

              <p>
                Die Technologie basiert auf <strong>Large Language Models (LLMs)</strong> wie GPT-4, die auf
                Millionen von Rechtstexten, Urteilen und Vertragsmustern trainiert wurden. Diese Modelle
                verstehen nicht nur die Bedeutung einzelner Klauseln, sondern auch deren rechtliche
                Implikationen und typische Fallstricke im jeweiligen Rechtsraum.
              </p>

              <p>
                Im Gegensatz zur manuellen Prüfung, bei der ein Jurist jede Klausel einzeln liest und
                bewertet, analysiert die KI den gesamten Vertrag simultan. Das Ergebnis ist eine
                strukturierte Risikobewertung mit konkreten Handlungsempfehlungen, die auch für
                juristische Laien verständlich aufbereitet ist.
              </p>

              <div className={styles.pillarHighlight}>
                <div className={styles.pillarHighlightIcon}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4>Marktentwicklung</h4>
                  <p>
                    Der globale Legal-Tech-Markt wächst rasant. Branchenanalysen zeigen
                    jährliche Wachstumsraten von über 25% im Bereich KI-gestützter
                    Vertragsanalyse. In Deutschland setzen immer mehr Unternehmen und
                    Kanzleien auf automatisierte Vertragsprüfung als Ergänzung zur
                    manuellen Prüfung.
                  </p>
                </div>
              </div>

              <h3>Was analysiert die KI konkret?</h3>

              <p>Eine professionelle KI-Vertragsanalyse umfasst typischerweise:</p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><AlertTriangle size={24} /></div>
                <h3 className={styles.functionTitle}>Risiko-Erkennung</h3>
                <p className={styles.functionDesc}>
                  Identifikation problematischer Klauseln wie einseitige Haftung,
                  überlange Kündigungsfristen oder versteckte Kostenfallen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><BarChart3 size={24} /></div>
                <h3 className={styles.functionTitle}>Fairness-Bewertung</h3>
                <p className={styles.functionDesc}>
                  Objektiver Score, der die Ausgewogenheit des Vertrags bewertet
                  und einseitige Regelungen kennzeichnet.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><BookOpen size={24} /></div>
                <h3 className={styles.functionTitle}>Klartext-Übersetzung</h3>
                <p className={styles.functionDesc}>
                  Juristisches Deutsch wird in verständliche Sprache übersetzt,
                  sodass jeder den Vertrag vollständig versteht.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Sparkles size={24} /></div>
                <h3 className={styles.functionTitle}>Handlungsempfehlungen</h3>
                <p className={styles.functionDesc}>
                  Konkrete Vorschläge, welche Klauseln nachverhandelt werden sollten
                  und wie Sie Ihre Position verbessern.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Scale size={24} /></div>
                <h3 className={styles.functionTitle}>Rechtskonformität</h3>
                <p className={styles.functionDesc}>
                  Prüfung auf Einhaltung aktueller Gesetze und Rechtsprechung,
                  z.B. unwirksame AGB-Klauseln nach BGB.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Eye size={24} /></div>
                <h3 className={styles.functionTitle}>Vollständigkeitscheck</h3>
                <p className={styles.functionDesc}>
                  Erkennung fehlender Standardklauseln wie Datenschutz,
                  Gerichtsstand oder Haftungsbegrenzungen.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            VIDEO SECTION
            ========================================== */}
        <section className={styles.videoSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So sieht's aus</span>
              <h2 className={styles.sectionTitle}>KI-Vertragsanalyse <span style={{ color: '#3b82f6' }}>in Aktion</span></h2>
              <p className={styles.sectionSubtitle}>
                Sehen Sie, wie Contract AI einen Vertrag in unter 60 Sekunden analysiert
                und versteckte Risiken aufdeckt.
              </p>
            </div>
            <div className={`${styles.videoContainer} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.videoFrame}>
                <AutoPlayVideo src={analyseVideo} poster={analyseImg} alt="KI-Vertragsanalyse Demo" />
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 2: WIE FUNKTIONIERT ES?
            ========================================== */}
        <section className={styles.processSection} id="wie-funktioniert">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Schritt für Schritt</span>
              <h2 className={styles.sectionTitle}>Wie funktioniert <span style={{ color: '#3b82f6' }}>KI-Vertragsanalyse</span>?</h2>
              <p className={styles.sectionSubtitle}>
                Von der PDF-Datei zum vollständigen Analyse-Report in drei einfachen Schritten.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      Laden Sie Ihren Vertrag als PDF oder Word-Dokument hoch. Die KI akzeptiert
                      alle gängigen Formate. Ihre Daten werden mit 256-bit Verschlüsselung
                      übertragen und auf DSGVO-konformen deutschen Servern verarbeitet.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>KI analysiert den Vertrag</h3>
                    <p className={styles.processDesc}>
                      Die KI erkennt automatisch den Vertragstyp (Mietvertrag, Arbeitsvertrag, etc.)
                      und analysiert jede Klausel einzeln. Dabei prüft sie auf Risiken, Fairness,
                      Rechtmäßigkeit und Vollständigkeit. Dieser Prozess dauert unter 60 Sekunden.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Ergebnis verstehen und handeln</h3>
                    <p className={styles.processDesc}>
                      Sie erhalten einen übersichtlichen Report mit Chancen-Risiken-Score,
                      farbmarkierten Problemstellen, verständlichen Erklärungen und konkreten
                      Handlungsempfehlungen. Optional als PDF-Export für Verhandlungen.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.pillarProse} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h3>Die Technologie dahinter</h3>
              <p>
                Moderne KI-Vertragsanalyse nutzt eine Kombination aus <strong>Natural Language Processing (NLP)</strong>,
                <strong> Machine Learning</strong> und <strong>Legal Knowledge Graphs</strong>. Die KI wird nicht nur
                auf allgemeine Sprachmodelle trainiert, sondern speziell auf juristische Texte, Gerichtsurteile und
                Vertragsmuster aus dem deutschen Rechtsraum. Dadurch erkennt sie nicht nur sprachliche Muster, sondern
                versteht auch den rechtlichen Kontext.
              </p>
              <p>
                Contract AI nutzt dabei GPT-4 als Basis und erweitert es mit spezialisierten Prompts und
                Analysepipelines, die auf tausenden deutschen Verträgen optimiert wurden. Das Ergebnis:
                Eine Analyse, die sowohl technisch präzise als auch für Laien verständlich ist.
              </p>
            </div>

            <div style={{ marginTop: '48px' }}>
              <div className={`${styles.solutionComparison} ${styles.animateOnScroll}`} ref={addToRefs} style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                <div className={`${styles.comparisonCard} ${styles.before}`} style={{ flex: 1 }}>
                  <span className={styles.comparisonLabel}>Vorher</span>
                  <div className={styles.comparisonIcon}><FileText size={32} /></div>
                  <div className={styles.comparisonTitle}>Manuelle Prüfung</div>
                  <div className={styles.comparisonDesc}>
                    Juristisches Fachwissen nötig. Stunden bis Tage Zeitaufwand. Subjektive Bewertung je nach Erfahrung.
                  </div>
                  <div className={styles.comparisonTime}><Clock size={16} /> 2-4 Stunden pro Vertrag</div>
                </div>
                <div className={styles.comparisonArrow} style={{ transform: 'rotate(0deg)', alignSelf: 'center' }}><ArrowRight size={24} /></div>
                <div className={`${styles.comparisonCard} ${styles.after}`} style={{ flex: 1 }}>
                  <span className={styles.comparisonLabel}>Nachher</span>
                  <div className={styles.comparisonIcon}><Zap size={32} /></div>
                  <div className={styles.comparisonTitle}>KI-Analyse</div>
                  <div className={styles.comparisonDesc}>
                    Keine Vorkenntnisse nötig. Ergebnis in unter 60 Sekunden. Algorithmisch konsistent und objektiv.
                  </div>
                  <div className={styles.comparisonTime}><Zap size={16} /> Unter 60 Sekunden</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            PROBLEM SECTION
            ========================================== */}
        <section className={styles.problemSection}>
          <div className={styles.container}>
            <div className={styles.problemGrid}>
              <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Das Problem</span>
                <h2 className={styles.sectionTitleLeft}>Warum so viele Menschen Vertragsrisiken übersehen</h2>
                <p className={styles.problemText}>
                  Verträge sind oft absichtlich kompliziert geschrieben. Juristische Fachsprache,
                  verschachtelte Klauseln und versteckte Bedingungen machen es selbst aufmerksamen
                  Lesern schwer, alle Risiken zu erkennen. Die Folge: Man unterschreibt Verträge,
                  die einen benachteiligen — ohne es zu wissen.
                </p>
                <div className={styles.problemStats}>
                  <div className={styles.problemStat}>
                    <div className={styles.problemStatNumber}>73%</div>
                    <div className={styles.problemStatLabel}>unterschreiben Verträge ohne vollständiges Verständnis</div>
                  </div>
                  <div className={styles.problemStat}>
                    <div className={styles.problemStatNumber}>4+</div>
                    <div className={styles.problemStatLabel}>Stunden dauert eine gründliche manuelle Prüfung</div>
                  </div>
                </div>
              </div>
              <div className={`${styles.problemVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.problemDoc}>
                  <div className={styles.problemDocHeader}>
                    <div className={styles.problemDocIcon}><FileText size={24} /></div>
                    <div>
                      <div className={styles.problemDocTitle}>Arbeitsvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>18 Seiten • Komplexes Juristendeutsch</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...der Arbeitnehmer verzichtet unwiderruflich auf alle Ansprüche..."
                    </div>
                  </div>
                </div>
                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <AlertTriangle size={14} /> Versteckte Klausel
                </div>
                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <AlertTriangle size={14} /> Risiko übersehen
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 3: KI vs. ANWALT
            ========================================== */}
        <section className={styles.pillarContentSection} id="ki-vs-anwalt">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ehrlicher Vergleich</span>
              <h2 className={styles.sectionTitle}><span style={{ color: '#3b82f6' }}>KI vs. Anwalt</span>: Wann lohnt sich was?</h2>
              <p className={styles.sectionSubtitle}>
                Die Wahrheit ist: Beides hat seine Berechtigung. Hier sehen Sie, wann welche Option die bessere Wahl ist.
              </p>
            </div>

            <div className={`${styles.pillarComparisonTable} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.pillarComparisonHeader} style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
                <div className={styles.pillarComparisonHeaderCell}></div>
                <div className={`${styles.pillarComparisonHeaderCell} ${styles.pillarComparisonAi}`}>
                  <Cpu size={20} />
                  KI-Vertragsanalyse
                </div>
                <div className={`${styles.pillarComparisonHeaderCell} ${styles.pillarComparisonLawyer}`}>
                  <GraduationCap size={20} />
                  Anwalt
                </div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Geschwindigkeit</div>
                <div className={styles.pillarComparisonValue}>Sekunden bis Minuten</div>
                <div className={styles.pillarComparisonValue}>Tage bis Wochen</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Kosten</div>
                <div className={styles.pillarComparisonValue}>Monatliche Pauschale</div>
                <div className={styles.pillarComparisonValue}>Pro Vertrag (je nach Kanzlei)</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Verfügbarkeit</div>
                <div className={styles.pillarComparisonValue}>24/7, sofort nutzbar</div>
                <div className={styles.pillarComparisonValue}>Nach Terminvereinbarung</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Objektivität</div>
                <div className={styles.pillarComparisonValue}>Algorithmisch konsistent</div>
                <div className={styles.pillarComparisonValue}>Erfahrungsbasiert, individuell</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Individuelle Beratung</div>
                <div className={styles.pillarComparisonValue}>Standardisierte Analyse</div>
                <div className={styles.pillarComparisonValue}><CheckCircle size={16} className={styles.textGreen} /> Maßgeschneidert</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Rechtliche Bindung</div>
                <div className={styles.pillarComparisonValue}>Orientierungshilfe</div>
                <div className={styles.pillarComparisonValue}><CheckCircle size={16} className={styles.textGreen} /> Rechtsverbindlich</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Skalierbarkeit</div>
                <div className={styles.pillarComparisonValue}>Hunderte Verträge parallel</div>
                <div className={styles.pillarComparisonValue}>Begrenzt durch Kapazität</div>
              </div>

              <div className={styles.pillarComparisonRow}>
                <div className={styles.pillarComparisonLabel}>Komplexe Sonderfälle</div>
                <div className={styles.pillarComparisonValue}>Grenzen bei Einzelfällen</div>
                <div className={styles.pillarComparisonValue}><CheckCircle size={16} className={styles.textGreen} /> Tiefgehende Expertise</div>
              </div>
            </div>

            <div className={`${styles.pillarProse} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h3>Die smarte Kombination</h3>
              <p>
                Die effektivste Strategie ist die Kombination beider Ansätze: Nutzen Sie
                <strong> KI-Vertragsanalyse als Erstcheck</strong> für jeden Vertrag. Die KI identifiziert
                in Sekunden die kritischen Stellen. Bei Standardverträgen (Mietvertrag, einfacher
                Arbeitsvertrag, NDA) reicht dies oft aus. Bei komplexen oder hochwertigen Verträgen
                nehmen Sie die KI-Ergebnisse als Grundlage für ein gezieltes Anwaltsgespräch. So
                sparen Sie 60-80% der Anwaltskosten, weil der Anwalt sich auf die wirklich
                kritischen Punkte konzentrieren kann.
              </p>

              <div className={styles.pillarHighlight}>
                <div className={styles.pillarHighlightIcon}>
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4>Praxis-Tipp</h4>
                  <p>
                    Viele Contract AI Nutzer berichten, dass sie durch die KI-Voranalyse ihre
                    Anwaltskosten um durchschnittlich 70% senken konnten. Statt stundenlanges
                    Lesen bekommt der Anwalt einen fokussierten Report mit den 3-5 kritischen
                    Punkten und kann gezielt beraten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            RISK CARDS SECTION
            ========================================== */}
        <section className={styles.risksSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Beispiel-Ergebnisse</span>
              <h2 className={styles.sectionTitle}>Das findet KI-Vertragsanalyse in <span style={{ color: '#3b82f6' }}>Ihrem Vertrag</span></h2>
              <p className={styles.sectionSubtitle}>
                Typische Risiken, die unsere KI in Verträgen erkennt — oft übersehen bei manueller Prüfung.
              </p>
            </div>
            <div className={styles.risksGrid}>
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Einseitige Haftungsklausel</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Mieter haftet uneingeschränkt für alle Schäden an der Mietsache."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Extrem einseitig — fordern Sie eine Begrenzung auf Vorsatz und grobe Fahrlässigkeit.</span>
                </div>
              </div>
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Überlange Kündigungsfrist</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Warnung</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die Kündigungsfrist beträgt 6 Monate zum Quartalsende."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Deutlich über dem gesetzlichen Standard von 3 Monaten — schränkt Ihre Flexibilität ein.</span>
                </div>
              </div>
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Versteckte Kostenklausel</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Zusätzliche Gebühren können nach Ermessen des Vermieters erhoben werden."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Gefahr unbegrenzter Zusatzkosten — fordern Sie eine klare Auflistung aller Nebenkosten.</span>
                </div>
              </div>
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Fehlende Datenschutzklausel</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Warnung</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Keine Regelung zur Verarbeitung personenbezogener Daten gefunden.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>DSGVO-Verstoß möglich — bestehen Sie auf eine Datenschutzvereinbarung als Anlage.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 4: VERTRAGSARTEN
            ========================================== */}
        <section className={styles.whySection} id="vertragsarten">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Anwendungsbereiche</span>
              <h2 className={styles.sectionTitle}>Welche Verträge kann <span style={{ color: '#3b82f6' }}>KI analysieren</span>?</h2>
              <p className={styles.sectionSubtitle}>
                KI-Vertragsanalyse funktioniert mit nahezu allen gängigen Vertragstypen im deutschen Rechtsraum.
              </p>
            </div>

            <div className={styles.whyGrid}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}><Building2 size={28} /></div>
                <h3 className={styles.whyTitle}>Mietverträge</h3>
                <p className={styles.whyDesc}>
                  Prüfung auf unwirksame Schönheitsreparatur-Klauseln, überhöhte Kaution,
                  unzulässige Kündigungsausschlüsse und versteckte Nebenkosten. Besonders relevant
                  in angespannten Wohnungsmärkten.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}><Users size={28} /></div>
                <h3 className={styles.whyTitle}>Arbeitsverträge</h3>
                <p className={styles.whyDesc}>
                  Analyse von Wettbewerbsverboten, Überstundenregelungen,
                  Kündigungsfristen und Bonusvereinbarungen. Die KI erkennt Klauseln,
                  die gesetzliche Mindeststandards unterschreiten.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}><FileText size={28} /></div>
                <h3 className={styles.whyTitle}>Kaufverträge</h3>
                <p className={styles.whyDesc}>
                  Prüfung von Gewährleistungsausschlüssen, Rücktrittsrechten,
                  Eigentumsvorbehalten und Zahlungsbedingungen. Ideal für Immobilien-,
                  Fahrzeug- und Unternehmenskäufe.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}><Lock size={28} /></div>
                <h3 className={styles.whyTitle}>NDAs & Geheimhaltung</h3>
                <p className={styles.whyDesc}>
                  Bewertung des Schutzumfangs, der Laufzeit, Vertragsstrafen und
                  Ausnahmen. Besonders wichtig für Startups, Freelancer und bei
                  Geschäftsanbahnung.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}><Globe size={28} /></div>
                <h3 className={styles.whyTitle}>Freelancer-Verträge</h3>
                <p className={styles.whyDesc}>
                  Prüfung auf Scheinselbständigkeit-Risiken, IP-Rechte-Übertragung,
                  Haftungsklauseln und Zahlungsbedingungen. Die KI warnt vor
                  branchenunüblichen Konditionen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon}><CheckCircle size={28} /></div>
                <h3 className={styles.whyTitle}>Alle weiteren Verträge</h3>
                <p className={styles.whyDesc}>
                  SaaS-Verträge, Dienstleistungsverträge, Werkverträge, Kooperationsverträge,
                  Gesellschaftsverträge und mehr — die KI erkennt den Vertragstyp automatisch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 5: VORTEILE
            ========================================== */}
        <section className={styles.statsSection} id="vorteile">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ihre Vorteile</span>
              <h2 className={styles.sectionTitle}>Warum immer mehr Menschen<br/><span style={{ color: '#3b82f6' }}>KI-Vertragsanalyse</span> nutzen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>&lt; 60s</div>
                <div className={styles.statLabel}>Analyse statt Stunden oder Tage bei manueller Prüfung</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>verfügbar, ohne Terminvereinbarung</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>Ab 0 EUR</div>
                <div className={styles.statLabel}>kostenlos starten, je nach Bedarf skalieren</div>
              </div>
            </div>

            <div className={`${styles.pillarProse} ${styles.animateOnScroll}`} ref={addToRefs} style={{ marginTop: '48px' }}>
              <p>
                Die wachsende Beliebtheit von KI-Vertragsanalyse hat klare Gründe: In einer Welt,
                in der Verträge immer komplexer werden, bietet KI eine <strong>demokratisierende Kraft</strong>.
                Jeder kann jetzt verstehen, was er unterschreibt, unabhängig von juristischem
                Vorwissen oder Budget. Privatpersonen schützen sich vor unfairen Mietverträgen,
                Freelancer vor nachteiligen Klauseln und Unternehmen optimieren ihre Vertragsprozesse.
              </p>
            </div>

            <div className={styles.beispielSection}>
              <div className={`${styles.beispielBox} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.beispielIcon}><Sparkles size={28} /></div>
                <p className={styles.beispielText}>
                  Ich habe meinen neuen Arbeitsvertrag hochgeladen und in 30 Sekunden drei
                  problematische Klauseln gefunden, die ich komplett übersehen hätte. Die
                  Wettbewerbsklausel allein hätte mich zwei Jahre an die Firma gebunden.
                </p>
                <p className={styles.beispielHinweis}>
                  — Typisches Nutzererlebnis bei Contract AI
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 6: SICHERHEIT & DATENSCHUTZ
            ========================================== */}
        <section className={styles.functionsSection} id="sicherheit">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Datenschutz</span>
              <h2 className={styles.sectionTitle}><span style={{ color: '#3b82f6' }}>Sicherheit</span> und DSGVO bei KI-Vertragsanalyse</h2>
              <p className={styles.sectionSubtitle}>
                Verträge enthalten sensible Daten. Deshalb hat Datenschutz bei Contract AI höchste Priorität.
              </p>
            </div>

            <div className={`${styles.pillarProse} ${styles.animateOnScroll}`} ref={addToRefs}>
              <p>
                Eine berechtigte Frage bei KI-Vertragsanalyse ist: <strong>Was passiert mit meinen
                Vertragsdaten?</strong> Gerade bei vertraulichen Dokumenten wie Arbeitsverträgen,
                Geschäftsvereinbarungen oder NDAs ist Datenschutz nicht verhandelbar.
              </p>

              <p>
                Contract AI setzt auf ein mehrstufiges Sicherheitskonzept:
              </p>
            </div>

            <div className={styles.securityGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Shield size={24} /></div>
                <h3 className={styles.functionTitle}>Deutsche Server</h3>
                <p className={styles.functionDesc}>
                  Alle Daten werden ausschließlich auf Servern in Deutschland verarbeitet
                  und gespeichert. Kein Transfer in Drittländer.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Lock size={24} /></div>
                <h3 className={styles.functionTitle}>256-bit Verschlüsselung</h3>
                <p className={styles.functionDesc}>
                  Ende-zu-Ende-Verschlüsselung bei Übertragung und Speicherung.
                  Bankingstandard-Sicherheit für Ihre Verträge.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Scale size={24} /></div>
                <h3 className={styles.functionTitle}>DSGVO-konform</h3>
                <p className={styles.functionDesc}>
                  Vollständige Einhaltung der EU-Datenschutzgrundverordnung.
                  Transparente Datenverarbeitung, keine Weitergabe an Dritte.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><FileText size={24} /></div>
                <h3 className={styles.functionTitle}>Kein KI-Training</h3>
                <p className={styles.functionDesc}>
                  Ihre Vertragsdaten werden nicht zum Training von KI-Modellen verwendet.
                  Jederzeit vollständige Löschung möglich.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 7: CONTRACT AI PLATTFORM
            ========================================== */}
        <section className={styles.pillarContentSection} id="contract-ai" style={{ paddingBottom: '80px' }}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Die Plattform</span>
              <h2 className={styles.sectionTitle}><span style={{ color: '#3b82f6' }}>Contract AI</span>: Mehr als nur Vertragsanalyse</h2>
              <p className={styles.sectionSubtitle}>
                Contract AI ist die einzige Plattform im DACH-Raum, die Vertragsanalyse,
                Optimierung, Erstellung und Verwaltung in einer Lösung vereint.
              </p>
            </div>

            <div className={styles.relatedGrid}>
              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>KI-Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Vertrag hochladen, in 60 Sekunden Risiken erkennen, Handlungsempfehlungen erhalten
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/optimierung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsoptimierung</div>
                  <div className={styles.relatedDescription}>
                    KI-Vorschläge zur Verbesserung problematischer Klauseln und fairer Formulierungen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/generator" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragserstellung</div>
                  <div className={styles.relatedDescription}>
                    Mietverträge, Arbeitsverträge, NDAs und mehr per KI generieren lassen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/legal-lens" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Eye size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Legal Lens</div>
                  <div className={styles.relatedDescription}>
                    Klauseln anklicken und sofort in einfacher Sprache verstehen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/fristen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Clock size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Fristenkalender</div>
                  <div className={styles.relatedDescription}>
                    Keine Kündigungsfrist mehr verpassen mit automatischen Erinnerungen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/digitalesignatur" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><CheckCircle size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Digitale Signatur</div>
                  <div className={styles.relatedDescription}>
                    Verträge rechtsgültig digital unterschreiben und versenden
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>

            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs} style={{ marginTop: '64px' }}>
              <span className={styles.sectionEyebrow}>Zielgruppen</span>
              <h2 className={styles.sectionTitle}>Für wen ist <span style={{ color: '#3b82f6' }}>Contract AI</span> geeignet?</h2>
            </div>

            <div className={styles.solutionFeatures} style={{ maxWidth: '700px', margin: '0 auto' }}>
              <div className={`${styles.solutionFeature} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionFeatureIcon}><Users size={20} /></div>
                <div className={styles.solutionFeatureText}>
                  <h4>Privatpersonen</h4>
                  <p>Mietvertrag vor der Unterschrift prüfen, Arbeitsvertrag verstehen, Kaufvertrag absichern</p>
                </div>
              </div>
              <div className={`${styles.solutionFeature} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionFeatureIcon}><Globe size={20} /></div>
                <div className={styles.solutionFeatureText}>
                  <h4>Freelancer & Selbstständige</h4>
                  <p>Kundenverträge schnell bewerten, NDAs prüfen, eigene Verträge erstellen</p>
                </div>
              </div>
              <div className={`${styles.solutionFeature} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionFeatureIcon}><Building2 size={20} /></div>
                <div className={styles.solutionFeatureText}>
                  <h4>Kleine & mittlere Unternehmen</h4>
                  <p>Lieferantenverträge prüfen, Vertragsverwaltung digitalisieren, Compliance sicherstellen</p>
                </div>
              </div>
              <div className={`${styles.solutionFeature} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionFeatureIcon}><Zap size={20} /></div>
                <div className={styles.solutionFeatureText}>
                  <h4>Startups</h4>
                  <p>Investorenverträge verstehen, Kooperationsverträge bewerten, ohne teure Kanzlei</p>
                </div>
              </div>
              <div className={`${styles.solutionFeature} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionFeatureIcon}><Scale size={20} /></div>
                <div className={styles.solutionFeatureText}>
                  <h4>Rechtsabteilungen</h4>
                  <p>Massenprüfung von Verträgen, Qualitätssicherung, Effizienzsteigerung</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION: ZUKUNFT & MARKT
            ========================================== */}
        <section className={styles.functionsSection} id="zukunft">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ausblick</span>
              <h2 className={styles.sectionTitle}>Warum KI-Vertragsanalyse 2026<br/><span style={{ color: '#3b82f6' }}>zum Standard</span> wird</h2>
              <p className={styles.sectionSubtitle}>
                Die Digitalisierung juristischer Prozesse beschleunigt sich. Drei Entwicklungen treiben den Wandel.
              </p>
            </div>

            <div className={styles.functionsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Cpu size={24} /></div>
                <h3 className={styles.functionTitle}>KI wird spezialisierter</h3>
                <p className={styles.functionDesc}>
                  Während frühe KI-Modelle nur einfache Textmuster erkannten, verstehen heutige Modelle
                  wie GPT-4 den rechtlichen Kontext von Vertragsklauseln. Die nächste Generation wird
                  noch spezialisierter: trainiert auf spezifische Rechtsgebiete, Jurisdiktionen und
                  Vertragstypen. Für Nutzer bedeutet das: immer präzisere und zuverlässigere Analysen.
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><TrendingUp size={24} /></div>
                <h3 className={styles.functionTitle}>Manuelle Prüfung wird unwirtschaftlich</h3>
                <p className={styles.functionDesc}>
                  Das Volumen an Verträgen wächst in Unternehmen jährlich. Gleichzeitig steigen
                  regulatorische Anforderungen (DSGVO, Lieferkettengesetz, ESG-Compliance).
                  Manuelle Prüfung jedes einzelnen Vertrags wird zunehmend unwirtschaftlich.
                  KI-Vertragsanalyse als Erstprüfung wird zur Notwendigkeit, nicht zum Nice-to-have.
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon}><Users size={24} /></div>
                <h3 className={styles.functionTitle}>Legal Tech wird demokratisch</h3>
                <p className={styles.functionDesc}>
                  Was bisher nur Großkanzleien und Konzernen mit eigenem Legal-Tech-Budget vorbehalten war,
                  wird durch SaaS-Plattformen wie Contract AI für jeden zugänglich. Privatpersonen prüfen
                  ihren Mietvertrag vor der Unterschrift, Freelancer bewerten Kundenverträge selbst,
                  KMU digitalisieren ihr Vertragsmanagement. Die Einstiegshürde sinkt, der Nutzen steigt.
                </p>
              </div>
            </div>

            <div className={`${styles.pillarProse} ${styles.animateOnScroll}`} ref={addToRefs} style={{ marginTop: '48px' }}>
              <div className={styles.pillarHighlight}>
                <div className={styles.pillarHighlightIcon}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4>Contract AI's Vision</h4>
                  <p>
                    Wir glauben, dass in naher Zukunft kein Vertrag mehr ohne KI-Vorprüfung
                    unterschrieben wird. Nicht als Ersatz für juristische Expertise, sondern als
                    selbstverständliche Qualitätssicherung. So wie heute niemand mehr eine E-Mail
                    ohne Rechtschreibprüfung verschickt, wird KI-Vertragsanalyse zum Standard
                    vor jeder Unterschrift.
                  </p>
                </div>
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
              <span className={styles.sectionEyebrow}>Fragen &amp; Antworten</span>
              <h2 className={styles.sectionTitle}>Häufige Fragen zur <span style={{ color: '#3b82f6' }}>KI-Vertragsanalyse</span></h2>
              <p className={styles.sectionSubtitle}>
                Die wichtigsten Fragen und Antworten rund um KI-gestützte Vertragsprüfung.
              </p>
            </div>

            <div className={styles.faqContainer}>
              {faqData.map((faq, index) => (
                <details key={index} className={styles.faqItem}>
                  <summary className={styles.faqQuestion}>
                    {faq.question}
                    <ChevronDown size={20} className={styles.faqIcon} />
                  </summary>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================
            CLUSTER ARTICLES / WEITERFÜHRENDE INHALTE
            ========================================== */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Weiterlesen</span>
              <h2 className={styles.sectionTitle}>Vertiefende Artikel zur <span style={{ color: '#3b82f6' }}>KI-Vertragsanalyse</span></h2>
            </div>

            <div className={styles.relatedGrid}>
              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><Search size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertrag prüfen lassen</div>
                  <div className={styles.relatedDescription}>
                    Alles zur KI-Vertragsprüfung: Risiken erkennen in 60 Sekunden
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/blog/legal-lens-vertragsklauseln-verstehen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><BookOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Legal Lens: Klauseln verstehen</div>
                  <div className={styles.relatedDescription}>
                    So verstehst du jede Vertragsklausel ohne Jurastudium
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/pricing" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon}><BarChart3 size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Preise &amp; Tarife</div>
                  <div className={styles.relatedDescription}>
                    Alle Tarife im Überblick: Starter, Business, Enterprise
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================
            METHODIK & TRANSPARENZ (E-E-A-T)
            ========================================== */}
        <section className={styles.pillarContentSection}>
          <div className={styles.container}>
            <div className={`${styles.pillarMethodBox} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h3 className={styles.pillarMethodTitle}>Methodik &amp; Transparenz</h3>
              <p className={styles.pillarMethodText}>
                Die KI-Vertragsanalyse von Contract AI basiert auf GPT-4 und wurde mit spezialisierten
                Analysepipelines für den deutschen Rechtsraum optimiert. Die Ergebnisse stellen eine
                automatisierte Ersteinschätzung dar und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG).
              </p>
              <p className={styles.pillarMethodText}>
                <strong>Limitationen:</strong> Die KI-Analyse eignet sich hervorragend zur schnellen
                Identifikation gängiger Vertragsrisiken und problematischer Klauseln. Bei besonders
                komplexen Vertragskonstruktionen, individuellen Sonderfällen oder Verträgen mit hohem
                Streitwert empfehlen wir ergänzend die Konsultation eines Fachanwalts. Die KI-Ergebnisse
                können dabei als strukturierte Grundlage für das Anwaltsgespräch dienen.
              </p>
              <p className={styles.pillarMethodText}>
                Dieser Guide wird regelmäßig aktualisiert und spiegelt den Stand der Technologie
                sowie aktuelle Entwicklungen im Legal-Tech-Markt wider. Letzte Aktualisierung: Februar 2026.
              </p>
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
                  Testen Sie KI-Vertragsanalyse kostenlos
                </h2>
                <p className={styles.ctaSubtitle}>
                  Laden Sie Ihren ersten Vertrag hoch und sehen Sie in 60 Sekunden,
                  welche Risiken Ihre KI findet. Kostenlos, ohne Kreditkarte, DSGVO-konform.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Jetzt kostenlos Vertrag prüfen
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

export default KiVertragsanalyse;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, ThumbsUp,
  Languages, BarChart3, Sparkles, Scale, Home, Gavel,
  Award, Info, DollarSign
} from "lucide-react";

const MietvertragPruefen: React.FC = () => {
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
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.contract-ai.de"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Mietvertrag prüfen",
        "item": "https://www.contract-ai.de/mietvertrag-pruefen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie genau ist die KI-Prüfung eines Mietvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen Risiko-Klauseln in Mietverträgen. Sie kennt die §§ 535 ff. BGB, das Mietrechtsanpassungsgesetz und aktuelle BGH-Rechtsprechung — insbesondere die zentralen Urteile zu Schönheitsreparaturen (BGH, 18.03.2015 – VIII ZR 185/14), Quotenabgeltungsklauseln (VIII ZR 242/13), Kaution (§ 551 BGB) und Kündigungsausschluss (VIII ZR 27/04). Bei komplexen Sondersituationen wie Gewerbemiete, Mischmietverhältnissen oder laufenden Räumungsverfahren empfehlen wir ergänzend einen Fachanwalt für Mietrecht."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Klauseln im Mietvertrag sind häufig unwirksam?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Zu den am häufigsten unwirksamen Klauseln zählen: starre Renovierungsfristen für Schönheitsreparaturen (BGH, 23.06.2004 – VIII ZR 361/03), Renovierungspflichten bei unrenoviert übergebener Wohnung (BGH, 18.03.2015 – VIII ZR 185/14), Quotenabgeltungsklauseln, Kautionsforderungen über drei Monatsmieten (§ 551 Abs. 1 BGB), generelle Tierhaltungsverbote (BGH, 20.03.2013 – VIII ZR 168/12) und überzogene Kleinreparatur-Kostendeckel."
        }
      },
      {
        "@type": "Question",
        "name": "Wie viel Kaution darf der Vermieter maximal verlangen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nach § 551 Abs. 1 BGB darf die Mietkaution höchstens das Dreifache der monatlichen Nettokaltmiete (also ohne Betriebskosten) betragen. Der Mieter kann die Kaution in drei gleichen Monatsraten zahlen (§ 551 Abs. 2 BGB), wobei die erste Rate zu Beginn des Mietverhältnisses fällig ist. Vereinbarungen über eine höhere Kaution sind insoweit unwirksam — der Mieter kann den Mehrbetrag zurückfordern."
        }
      },
      {
        "@type": "Question",
        "name": "Sind Schönheitsreparaturen wirklich unwirksam vereinbart?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Häufig ja. Nach der BGH-Rechtsprechung (insbesondere VIII ZR 185/14 vom 18.03.2015) ist eine Klausel zur Vornahme von Schönheitsreparaturen unwirksam, wenn die Wohnung dem Mieter unrenoviert oder renovierungsbedürftig übergeben wurde — und kein angemessener finanzieller Ausgleich erfolgt. Auch starre Fristenpläne ohne Bezug zum tatsächlichen Zustand sind unwirksam. Folge: Die Pflicht zur Renovierung trägt nach § 535 Abs. 1 S. 2 BGB der Vermieter."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist eine Indexmiete und wann ist sie zulässig?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine Indexmiete (§ 557b BGB) koppelt die Miethöhe an den vom Statistischen Bundesamt ermittelten Verbraucherpreisindex. Sie ist nur zulässig, wenn sie ausdrücklich und schriftlich vereinbart wurde, der Bezugsindex klar benannt ist und die Miete jeweils mindestens ein Jahr unverändert bleibt. Bei wirksamer Indexmiete sind Mieterhöhungen wegen ortsüblicher Vergleichsmiete oder Modernisierung weitgehend ausgeschlossen. Eine intransparente Klausel ohne klaren Bezugsindex ist unwirksam."
        }
      },
      {
        "@type": "Question",
        "name": "Darf der Vermieter die Tierhaltung generell verbieten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein. Nach BGH, 20.03.2013 – VIII ZR 168/12 ist ein generelles Tierhaltungsverbot in einem Formularmietvertrag unwirksam, weil es eine unangemessene Benachteiligung des Mieters darstellt. Erlaubt ist die Haltung von Kleintieren wie Hamstern, Wellensittichen oder Zierfischen sogar ohne Erlaubnis. Bei Hunden und Katzen ist eine Einzelfallabwägung nötig: berechtigte Interessen des Vermieters, Mitmieter, Größe der Wohnung. Ein pauschales Verbot ist unzulässig."
        }
      },
      {
        "@type": "Question",
        "name": "Wie lange darf ein Kündigungsausschluss im Mietvertrag dauern?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ein beidseitiger Kündigungsausschluss in einem Formularmietvertrag darf nach BGH-Rechtsprechung (06.04.2005 – VIII ZR 27/04) maximal vier Jahre ab Vertragsschluss gelten. Längere Bindungen sind insgesamt unwirksam — der Mieter kann dann mit der gesetzlichen Frist von drei Monaten kündigen. Bei individuell ausgehandelten Verträgen sind längere Bindungen möglich, müssen aber nachweisbar verhandelt sein."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet die KI-Prüfung eines Mietvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt für Mietrecht kostet typischerweise 100–250 € — die KI-Analyse spart dir gerade bei mehreren Verträgen oder Wohnungssuche erhebliche Kosten."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Anwalt für Mietrecht?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für individuelle Beratung, laufende Streitigkeiten (etwa drohende Räumungsklage, Mieterhöhungsstreit, Kautionsrückforderung) oder komplexe Fälle (Gewerbemiete, Untermiete, Eigenbedarfskündigung) bleibt ein Fachanwalt für Mietrecht oder ein Mieterverein unverzichtbar. Die KI-Analyse liefert dafür eine fundierte Faktengrundlage."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Mietvertrag mit KI prüfen lassen",
    "description": "In drei Schritten von der hochgeladenen PDF-Datei zur fertigen Risikoanalyse deines Mietvertrags.",
    "totalTime": "PT1M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Mietvertrag hochladen",
        "text": "Lade deinen Mietvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt 256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Automatische KI-Analyse",
        "text": "Die KI prüft jede Klausel gegen §§ 535 ff. BGB, das Mietrechtsanpassungsgesetz und aktuelle BGH-Rechtsprechung — insbesondere zu Schönheitsreparaturen, Kaution, Indexmiete, Tierhaltung und Kündigungsausschluss."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Detaillierten Report erhalten",
        "text": "Du erhältst einen Report mit Chancen-Risiken-Score, einer Liste markierter Problemstellen mit Paragraphen-Verweis und konkreten Handlungsempfehlungen — als interaktive Ansicht und als PDF-Export."
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Mietvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI</title>
        <meta name="description" content="Mietvertrag prüfen lassen mit KI: unwirksame Schönheitsreparaturklauseln, überhöhte Kaution & versteckte Fallen in 60 Sekunden erkennen. Auf Basis aktueller BGH-Rechtsprechung. DSGVO-konform, Server in Deutschland. ✓ Kostenlos starten" />
        <meta name="keywords" content="Mietvertrag prüfen, Mietvertrag prüfen lassen, Mietvertrag KI prüfen, Mietvertrag online prüfen, Mietvertrag rechtssicher prüfen, Mietvertrag Klauseln prüfen, Mietvertrag Check, Mietvertrag analysieren, Schönheitsreparaturen prüfen, Mietkaution prüfen" />

        <link rel="canonical" href="https://www.contract-ai.de/mietvertrag-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Mietvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta property="og:description" content="Mietvertrag prüfen lassen mit KI: unwirksame Klauseln & versteckte Fallen in 60 Sekunden erkennen. Basierend auf aktueller BGH-Rechtsprechung. DSGVO-konform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/mietvertrag-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mietvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta name="twitter:description" content="Mietvertrag prüfen lassen mit KI: unwirksame Klauseln & versteckte Fallen in 60 Sekunden erkennen. Basierend auf aktueller BGH-Rechtsprechung." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />

        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
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
            SECTION 1 — HERO
            ========================================== */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                Für Mieter & Vermieter
              </div>

              <h1 className={styles.heroTitle}>
                Mietvertrag prüfen lassen<br/>
                <span className={styles.heroTitleHighlight}>unwirksame Klauseln in 60 Sekunden erkennen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Lass deinen Mietvertrag von einer KI prüfen, die unwirksame Schönheitsreparaturklauseln,
                überhöhte Kautionsforderungen und versteckte Fallen auf Basis aktueller
                BGH-Rechtsprechung sofort erkennt. DSGVO-konform, Server in Deutschland.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Mietvertrag jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fallen" className={styles.btnSecondary}>
                  Die 8 typischsten Fallen
                </a>
              </div>
            </div>

            {/* Demo Window — Mietvertrag-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>BGH-Rechtsprechung</div>
                  <div className={styles.floatingSubtext}>aktuell geprüft</div>
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
                      <span className={styles.demoScoreValue}>62</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertrags-Score</div>
                      <div className={styles.demoScoreTitle}>Mietvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Schönheitsreparaturen mit starrem Fristenplan</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Kaution beträgt 4 Monatsmieten</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Indexmiete-Klausel transparent</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>OK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 2 — TRUST-BAR
            ========================================== */}
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
            <div className={styles.trustBadge}>
              <Gavel size={18} />
              Geprüft nach BGH-Rechtsprechung
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION 3 — WAS WIR PRÜFEN (Quick-Glance)
            ========================================== */}
        <section className={styles.functionsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Prüfumfang</span>
              <h2 className={styles.sectionTitle}>Was die KI in deinem Mietvertrag prüft</h2>
              <p className={styles.sectionSubtitle}>
                Acht zentrale Klauseltypen werden gegen geltendes Mietrecht und aktuelle BGH-Urteile abgeglichen.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Home size={24} />
                </div>
                <h3 className={styles.functionTitle}>Schönheitsreparaturen</h3>
                <p className={styles.functionDesc}>
                  Starre Fristenpläne, Renovierung bei unrenoviert übergebener Wohnung — beides oft unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <DollarSign size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kautionshöhe</h3>
                <p className={styles.functionDesc}>
                  Maximal drei Nettokaltmieten nach § 551 BGB — Mehrforderungen sind nichtig.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Quotenabgeltung</h3>
                <p className={styles.functionDesc}>
                  Anteilige Renovierungskosten je nach Wohndauer — nach BGH 2015 generell unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Award size={24} />
                </div>
                <h3 className={styles.functionTitle}>Tierhaltungsklauseln</h3>
                <p className={styles.functionDesc}>
                  Generelle Verbote sind unwirksam — Einzelfallabwägung nach BGH-Rechtsprechung.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kündigungsausschluss</h3>
                <p className={styles.functionDesc}>
                  Maximal vier Jahre in Formularverträgen — längere Bindungen unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <BarChart3 size={24} />
                </div>
                <h3 className={styles.functionTitle}>Indexmiete & Mieterhöhung</h3>
                <p className={styles.functionDesc}>
                  Transparenz nach § 557b BGB, Bezugsindex klar definiert, Jahresfrist eingehalten.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <BookOpen size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kleinreparaturen</h3>
                <p className={styles.functionDesc}>
                  Höchstgrenze pro Reparatur und pro Jahr — überzogene Klauseln sind unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <Languages size={24} />
                </div>
                <h3 className={styles.functionTitle}>Betriebskostenabrechnung</h3>
                <p className={styles.functionDesc}>
                  Nur umlagefähige Kosten nach BetrKV, klare Verteilerschlüssel, Abrechnungsfristen.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 4 — PROBLEM
            ========================================== */}
        <section className={styles.problemSection}>
          <div className={styles.container}>
            <div className={styles.problemGrid}>
              <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Das Problem</span>
                <h2 className={styles.sectionTitleLeft}>Über 70 % der Mietverträge enthalten unwirksame Klauseln</h2>
                <p className={styles.problemText}>
                  Die meisten Mietverträge in Deutschland sind Formularverträge — und genau die unterliegen
                  einer strengen AGB-Kontrolle nach §§ 305 ff. BGB. Der Bundesgerichtshof hat in den
                  letzten Jahren in einer Serie von Grundsatzurteilen ganze Klauselgruppen für unwirksam
                  erklärt. Das Tückische: Mieter zahlen oft jahrelang für Renovierungen, akzeptieren
                  überhöhte Kautionen oder verzichten auf Ansprüche — ohne zu wissen, dass die zugrunde
                  liegende Klausel unwirksam ist. Bei Auszug summieren sich die ungerechtfertigten Kosten
                  schnell auf vier- oder fünfstellige Beträge.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>70%</div>
                    <div className={styles.problemStatLabel}>der Mietverträge enthalten mindestens eine unwirksame Klausel</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>2.400 €</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Schaden durch unberechtigte Renovierungs- und Kautionsansprüche</div>
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
                      <div className={styles.problemDocSubtitle}>22 Seiten • Hochgeladen heute</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...der Mieter verpflichtet sich, die Wohnung bei Auszug vollständig zu renovieren..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Unwirksame Klausel
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  4 Monatsmieten Kaution
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 5 — SOLUTION
            ========================================== */}
        <section className={styles.solutionSection}>
          <div className={styles.container}>
            <div className={styles.solutionGrid}>
              <div className={`${styles.solutionVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.solutionComparison}>
                  <div className={`${styles.comparisonCard} ${styles.before}`}>
                    <span className={styles.comparisonLabel}>Vorher</span>
                    <div className={styles.comparisonIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Anwaltsberatung</div>
                    <div className={styles.comparisonDesc}>
                      100–250 € pro Vertrag, Terminvereinbarung, mehrere Werktage Wartezeit
                      bis zum Erstgespräch.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      3–5 Werktage
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
                      Sofortige Risiko-Erkennung mit Paragraphen-Verweis, BGH-Urteilen
                      und konkreten Handlungsempfehlungen.
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
                <h2 className={styles.sectionTitleLeft}>Mietvertragsprüfung im Sekundentakt — auf juristischer Basis</h2>
                <p className={styles.solutionText}>
                  Die KI von Contract AI kennt die §§ 535 ff. BGB, das Mietrechtsanpassungsgesetz
                  (MietAnpG), die Betriebskostenverordnung (BetrKV) und die zentralen
                  BGH-Grundsatzurteile zum Mietrecht — und wendet sie sofort auf jede Klausel
                  deines Vertrags an.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Search size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Klausel-für-Klausel-Bewertung</h3>
                      <p>Jede Klausel wird gegen geltendes Mietrecht geprüft, mit Paragraphen-Verweis</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Gavel size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Aktuelle BGH-Rechtsprechung</h3>
                      <p>Schönheitsreparaturen, Quotenabgeltung, Tierhaltung, Kündigungsausschluss</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <ThumbsUp size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Verständliche Empfehlung</h3>
                      <p>Klartext statt Juristendeutsch, mit konkretem Handlungsvorschlag</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 6 — DIE 8 TYPISCHSTEN FALLEN
            ========================================== */}
        <section className={styles.risksSection} id="fallen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Die häufigsten Fallen</span>
              <h2 className={styles.sectionTitle}>Die 8 typischsten Fallen im deutschen Mietvertrag</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Klauseltypen sind in der Praxis am häufigsten unwirksam — und genau hier
                schaut unsere KI besonders genau hin. Jede Falle mit Original-Wortlaut, juristischer
                Einordnung und Verweis auf das einschlägige BGH-Urteil.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* FALLE 1: Schönheitsreparaturen mit starrem Fristenplan */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>1. Starrer Fristenplan für Schönheitsreparaturen</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Mieter ist verpflichtet, Schönheitsreparaturen in folgenden Zeitabständen auszuführen: Küchen, Bäder und Duschen alle drei Jahre, Wohn- und Schlafräume alle fünf Jahre."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>BGH, 23.06.2004 – VIII ZR 361/03</strong> sind starre Fristen für Schönheitsreparaturen ohne Berücksichtigung des tatsächlichen Zustands der Wohnung unwirksam. Folge: Die gesamte Schönheitsreparaturklausel fällt weg — die Renovierungspflicht trägt der Vermieter (§ 535 Abs. 1 S. 2 BGB).</span>
                </div>
              </div>

              {/* FALLE 2: Renovierung bei unrenoviert übergebener Wohnung */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>2. Renovierungspflicht bei unrenoviert übergebener Wohnung</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Mieter übernimmt die Schönheitsreparaturen während der Mietzeit auf eigene Kosten."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Das Grundsatzurteil <strong>BGH, 18.03.2015 – VIII ZR 185/14</strong>: Eine Klausel zur Vornahme von Schönheitsreparaturen ist unwirksam, wenn die Wohnung dem Mieter unrenoviert oder renovierungsbedürftig übergeben wurde — und kein angemessener finanzieller Ausgleich erfolgte. Der Mieter muss dann nicht renovieren — auch nicht beim Auszug.</span>
                </div>
              </div>

              {/* FALLE 3: Quotenabgeltungsklausel */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>3. Quotenabgeltungsklausel</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Endet das Mietverhältnis vor Fälligkeit der Schönheitsreparaturen, zahlt der Mieter einen anteiligen Geldbetrag entsprechend der Wohndauer."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Mit <strong>BGH, 18.03.2015 – VIII ZR 242/13</strong> hat der BGH Quotenabgeltungsklauseln <strong>generell für unwirksam</strong> erklärt — sie verlangen vom Mieter eine prognostische Bewertung des künftigen Renovierungsbedarfs, was unzumutbar intransparent ist. Geforderte Quotenzahlungen können vollständig zurückgefordert werden.</span>
                </div>
              </div>

              {/* FALLE 4: Kaution über 3 Monatsmieten */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>4. Kaution über drei Monatsmieten</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Mieter leistet zur Sicherheit eine Kaution in Höhe von vier Monatsmieten."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 551 Abs. 1 BGB</strong> darf die Kaution höchstens das <strong>Dreifache der monatlichen Nettokaltmiete</strong> (ohne Betriebskosten) betragen. Mehrforderungen sind insoweit nichtig — der Mieter kann den überschüssigen Betrag jederzeit zurückfordern, auch noch Jahre nach Vertragsschluss. Außerdem darf die Kaution in drei Monatsraten gezahlt werden (§ 551 Abs. 2 BGB).</span>
                </div>
              </div>

              {/* FALLE 5: Kündigungsausschluss länger als 4 Jahre */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>5. Überlanger Kündigungsausschluss</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Beide Parteien verzichten für einen Zeitraum von fünf Jahren ab Vertragsbeginn auf das Recht zur ordentlichen Kündigung."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>BGH, 06.04.2005 – VIII ZR 27/04</strong> darf ein beidseitiger Kündigungsausschluss in Formularmietverträgen maximal <strong>vier Jahre</strong> ab Vertragsschluss dauern. Längere Bindungen sind insgesamt unwirksam — der Mieter kann jederzeit mit der gesetzlichen Frist von drei Monaten kündigen.</span>
                </div>
              </div>

              {/* FALLE 6: Indexmiete intransparent */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>6. Intransparente Indexmiete</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die Miete erhöht sich entsprechend der jährlichen Inflationsrate."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Eine Indexmiete nach <strong>§ 557b BGB</strong> ist nur wirksam, wenn der konkrete Bezugsindex (Verbraucherpreisindex des Statistischen Bundesamtes) ausdrücklich genannt wird, die Miete mindestens ein Jahr unverändert bleibt und die Erhöhung in Textform angekündigt wird. Vage Formulierungen wie "Inflationsrate" sind unwirksam — Mieterhöhungen können angefochten werden.</span>
                </div>
              </div>

              {/* FALLE 7: Generelles Tierhaltungsverbot */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>7. Generelles Tierhaltungsverbot</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die Haltung von Haustieren jeglicher Art ist im Mietobjekt untersagt."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>BGH, 20.03.2013 – VIII ZR 168/12</strong> ist ein generelles Tierhaltungsverbot in einem Formularmietvertrag unwirksam, weil es eine unangemessene Benachteiligung des Mieters darstellt (§ 307 Abs. 1 BGB). Kleintiere wie Hamster oder Ziervögel sind ohnehin erlaubt; bei Hund und Katze ist eine Einzelfallabwägung nötig — kein pauschales Verbot.</span>
                </div>
              </div>

              {/* FALLE 8: Kleinreparaturen überhöht */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>8. Überzogene Kleinreparaturklausel</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Der Mieter trägt die Kosten kleinerer Reparaturen bis 200 € pro Fall, maximal 1.500 € pro Jahr."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>BGH, 06.05.1992 – VIII ZR 129/91</strong> und nachfolgender Rechtsprechung gilt: Pro Einzelreparatur sind höchstens etwa <strong>100 €</strong> zumutbar, das Jahresvolumen darf <strong>8 % der Jahresnettokaltmiete</strong> nicht überschreiten. Höhere Klauseln sind insgesamt unwirksam — der Vermieter trägt dann alle Reparaturkosten nach § 535 Abs. 1 S. 2 BGB.</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 7 — PROCESS
            ========================================== */}
        <section className={styles.processSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>So funktioniert's</span>
              <h2 className={styles.sectionTitle}>In drei Schritten zur fertigen Vertragsanalyse</h2>
              <p className={styles.sectionSubtitle}>
                Vom hochgeladenen PDF zum strukturierten Risiko-Report — ohne Termin, ohne Wartezeit.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Mietvertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      Lade deinen Mietvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt
                      256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische KI-Analyse</h3>
                    <p className={styles.processDesc}>
                      Die KI prüft jede Klausel gegen §§ 535 ff. BGB, das Mietrechtsanpassungsgesetz
                      und aktuelle BGH-Rechtsprechung — insbesondere zu Schönheitsreparaturen,
                      Kaution, Indexmiete, Tierhaltung und Kündigungsausschluss.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Detaillierten Report erhalten</h3>
                    <p className={styles.processDesc}>
                      Du erhältst einen Report mit Chancen-Risiken-Score, einer Liste markierter
                      Problemstellen mit Paragraphen-Verweis und konkreten Handlungsempfehlungen
                      — als interaktive Ansicht und als PDF-Export.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 8 — WHY US
            ========================================== */}
        <section className={styles.whySection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Deine Vorteile</span>
              <h2 className={styles.sectionTitle}>Warum Contract AI für deinen Mietvertrag?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum die KI-Prüfung mehr ist als ein Online-Tool.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Gavel size={28} />
                </div>
                <h3 className={styles.whyTitle}>Aktuelle BGH-Rechtsprechung</h3>
                <p className={styles.whyDesc}>
                  Die zentralen Urteile zu Schönheitsreparaturen, Quotenabgeltung, Kaution und
                  Tierhaltung sind in der Analyse berücksichtigt — nicht erst seit gestern.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO & Server in Deutschland</h3>
                <p className={styles.whyDesc}>
                  Dein Mietvertrag enthält sensible Daten. Verarbeitung ausschließlich auf
                  EU-Servern, keine Weitergabe an Dritte, kein Modell-Training mit deinen Daten.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <BookOpen size={28} />
                </div>
                <h3 className={styles.whyTitle}>Klartext statt Juristendeutsch</h3>
                <p className={styles.whyDesc}>
                  Jede Erkenntnis kommt mit verständlicher Erklärung und konkreter
                  Handlungsempfehlung — auch ohne Jura-Studium sofort umsetzbar.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Sofort verfügbar, 24/7</h3>
                <p className={styles.whyDesc}>
                  Keine Termine, keine Wartezeiten. Den Mietvertrag prüfen, wenn er bei dir
                  auf dem Tisch liegt — auch sonntagabends vor der Wohnungsbesichtigung.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 9 — RATGEBER (Long-Form E-E-A-T)
            ========================================== */}
        <section className={styles.problemSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ratgeber</span>
              <h2 className={styles.sectionTitle}>Worauf du bei der Prüfung deines Mietvertrags wirklich achten solltest</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Ein Mietvertrag begleitet dich oft jahrelang — und entscheidet darüber, ob du am
                Ende der Mietzeit drei Monatsmieten zurückbekommst oder vierstellige
                Renovierungskosten draufzahlst. Der Bundesgerichtshof hat in den letzten
                zwei Jahrzehnten in einer Serie von Grundsatzurteilen ganze Klauselgruppen für
                unwirksam erklärt. Wer seinen Mietvertrag prüfen lässt, schützt sich vor genau
                diesen Stolperfallen — und kennt seine echten Rechte.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Schönheitsreparaturen — der Klassiker unter den unwirksamen Klauseln
              </h3>
              <p className={styles.problemText}>
                Nach <strong>§ 535 Abs. 1 S. 2 BGB</strong> trägt eigentlich der Vermieter die
                Erhaltungspflicht — er kann sie aber wirksam auf den Mieter übertragen, wenn
                bestimmte Voraussetzungen erfüllt sind. Die Schwelle hat der BGH in mehreren
                Urteilen extrem hoch gelegt. Unwirksam sind unter anderem starre Fristenpläne
                ohne Berücksichtigung des Zustands (BGH, 23.06.2004 – VIII ZR 361/03),
                Renovierungspflichten bei unrenoviert übergebener Wohnung ohne angemessenen
                Ausgleich (das Grundsatzurteil <strong>BGH, 18.03.2015 – VIII ZR 185/14</strong>)
                und Quotenabgeltungsklauseln (BGH, 18.03.2015 – VIII ZR 242/13). Wenn auch nur
                eine dieser Klauseln in deinem Vertrag steht, fällt häufig die gesamte
                Schönheitsreparatur-Regelung weg. Mehr dazu im{' '}
                <Link to="/blog/mietvertrag-unwirksame-klauseln">Ratgeber zu unwirksamen Mietvertragsklauseln</Link>.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Kaution — drei Monatsmieten sind die Obergrenze
              </h3>
              <p className={styles.problemText}>
                Nach <strong>§ 551 Abs. 1 BGB</strong> darf die Mietkaution höchstens das
                Dreifache der monatlichen <em>Nettokaltmiete</em> (also ohne Betriebskosten) betragen.
                Vereinbarungen über mehr sind insoweit nichtig — du kannst den Mehrbetrag jederzeit
                zurückfordern. Außerdem: Die Kaution darf in drei gleichen Monatsraten gezahlt werden
                (§ 551 Abs. 2 BGB), die erste fällig zu Mietbeginn. Der Vermieter muss die Kaution
                getrennt von seinem Vermögen anlegen (Treuhandprinzip) und zum üblichen Zinssatz für
                Spareinlagen mit dreimonatiger Kündigungsfrist verzinsen — die Zinsen stehen dem
                Mieter zu.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Indexmiete und Mieterhöhung — strenge Formvorschriften
              </h3>
              <p className={styles.problemText}>
                Eine Indexmiete (<strong>§ 557b BGB</strong>) koppelt die Miethöhe an den vom
                Statistischen Bundesamt veröffentlichten Verbraucherpreisindex. Sie ist nur
                wirksam, wenn der konkrete Bezugsindex ausdrücklich genannt ist, zwischen zwei
                Erhöhungen mindestens ein Jahr liegt und die Erhöhung in Textform angekündigt
                wird. Bei wirksam vereinbarter Indexmiete sind Mieterhöhungen wegen ortsüblicher
                Vergleichsmiete (§ 558 BGB) oder Modernisierung (§ 559 BGB) weitgehend
                ausgeschlossen. Vage Formulierungen wie „nach Inflationsrate" sind dagegen
                intransparent und damit unwirksam.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Tierhaltung, Kündigungsausschluss und Kleinreparaturen
              </h3>
              <p className={styles.problemText}>
                Drei weitere Klausel-Typen sind besonders fehleranfällig: Erstens
                <strong> generelle Tierhaltungsverbote</strong> — sie sind nach BGH, 20.03.2013 –
                VIII ZR 168/12 unwirksam; Kleintiere sind ohnehin erlaubt, bei Hund und Katze ist
                eine Einzelfallabwägung nötig. Zweitens <strong>überlange Kündigungsausschlüsse</strong> —
                in Formularverträgen darf der beidseitige Kündigungsverzicht maximal vier Jahre
                dauern (BGH, 06.04.2005 – VIII ZR 27/04). Drittens <strong>Kleinreparaturklauseln</strong> —
                pro Reparatur sind etwa 100 € zumutbar, das Jahresvolumen darf 8 % der
                Jahresnettokaltmiete nicht übersteigen; höhere Klauseln fallen komplett weg.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Was tun, wenn du eine unwirksame Klausel entdeckst?
              </h3>
              <p className={styles.problemText}>
                Eine unwirksame Klausel macht <strong>nicht den ganzen Mietvertrag unwirksam</strong>.
                Nach § 306 Abs. 1 BGB bleibt der Vertrag im Übrigen bestehen — die problematische
                Klausel wird einfach durch die gesetzliche Regelung ersetzt. Für dich als Mieter
                ist das fast immer ein Vorteil: Die unwirksame Schönheitsreparaturklausel bedeutet
                keine Renovierungspflicht. Der unwirksame Kündigungsausschluss bedeutet jederzeitige
                Kündigungsmöglichkeit. Die überhöhte Kautionsforderung kann zurückgeholt werden.
                Wann du den Vermieter direkt mit der Erkenntnis konfrontierst und wann du das
                Wissen für später aufhebst (etwa beim Auszug), ist eine strategische Entscheidung —
                die KI-Analyse gibt dir die Faktengrundlage.
              </p>

              <p className={styles.problemText} style={{ marginTop: '1.5rem' }}>
                Bei laufenden Streitigkeiten — drohende Räumungsklage, Eigenbedarfskündigung,
                Mieterhöhungsstreit, Kautionsrückforderung — empfehlen wir zusätzlich einen
                Fachanwalt für Mietrecht oder die Mitgliedschaft in einem Mieterverein. Die
                KI-Analyse ist eine fundierte Erst-Risikoanalyse, ersetzt aber keine
                individuelle Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG).
                Lies dazu auch unseren{' '}
                <Link to="/blog/ki-vs-anwalt-vertrag-pruefen">Vergleich KI vs. Anwalt</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 10 — STATS
            ========================================== */}
        <section className={styles.statsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Unsere Zahlen</span>
              <h2 className={styles.sectionTitle}>Vertrauen Sie den Ergebnissen</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>98 %</div>
                <div className={styles.statLabel}>Erkennungsgenauigkeit bei Risiko-Klauseln</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>&lt; 60 s</div>
                <div className={styles.statLabel}>Analysezeit pro Vertrag</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>10.000+</div>
                <div className={styles.statLabel}>Verträge in der Trainingsbasis</div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 11 — FAQ
            ========================================== */}
        <section className={styles.faqSection} id="faq">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Fragen & Antworten</span>
              <h2 className={styles.sectionTitle}>Häufige Fragen zum Mietvertrag-Check</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Prüfung eines Mietvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen
                  Risiko-Klauseln in Mietverträgen. Sie kennt die §§ 535 ff. BGB, das
                  Mietrechtsanpassungsgesetz und aktuelle BGH-Rechtsprechung — insbesondere
                  die zentralen Urteile zu Schönheitsreparaturen (BGH, 18.03.2015 – VIII ZR 185/14),
                  Quotenabgeltungsklauseln (VIII ZR 242/13), Kaution (§ 551 BGB) und
                  Kündigungsausschluss (VIII ZR 27/04). Bei komplexen Sondersituationen wie
                  Gewerbemiete, Mischmietverhältnissen oder laufenden Räumungsverfahren
                  empfehlen wir ergänzend einen Fachanwalt für Mietrecht.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Klauseln im Mietvertrag sind häufig unwirksam?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Zu den am häufigsten unwirksamen Klauseln zählen: starre Renovierungsfristen
                  für Schönheitsreparaturen (BGH, 23.06.2004 – VIII ZR 361/03),
                  Renovierungspflichten bei unrenoviert übergebener Wohnung
                  (BGH, 18.03.2015 – VIII ZR 185/14), Quotenabgeltungsklauseln,
                  Kautionsforderungen über drei Monatsmieten (§ 551 Abs. 1 BGB), generelle
                  Tierhaltungsverbote (BGH, 20.03.2013 – VIII ZR 168/12) und überzogene
                  Kleinreparatur-Kostendeckel.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie viel Kaution darf der Vermieter maximal verlangen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nach § 551 Abs. 1 BGB darf die Mietkaution höchstens das Dreifache der
                  monatlichen Nettokaltmiete (also ohne Betriebskosten) betragen. Der Mieter
                  kann die Kaution in drei gleichen Monatsraten zahlen (§ 551 Abs. 2 BGB),
                  wobei die erste Rate zu Beginn des Mietverhältnisses fällig ist.
                  Vereinbarungen über eine höhere Kaution sind insoweit unwirksam — der Mieter
                  kann den Mehrbetrag zurückfordern.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Sind Schönheitsreparaturen wirklich unwirksam vereinbart?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Häufig ja. Nach der BGH-Rechtsprechung (insbesondere VIII ZR 185/14 vom
                  18.03.2015) ist eine Klausel zur Vornahme von Schönheitsreparaturen
                  unwirksam, wenn die Wohnung dem Mieter unrenoviert oder renovierungsbedürftig
                  übergeben wurde — und kein angemessener finanzieller Ausgleich erfolgt. Auch
                  starre Fristenpläne ohne Bezug zum tatsächlichen Zustand sind unwirksam. Folge:
                  Die Pflicht zur Renovierung trägt nach § 535 Abs. 1 S. 2 BGB der Vermieter.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was ist eine Indexmiete und wann ist sie zulässig?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine Indexmiete (§ 557b BGB) koppelt die Miethöhe an den vom Statistischen
                  Bundesamt ermittelten Verbraucherpreisindex. Sie ist nur zulässig, wenn sie
                  ausdrücklich und schriftlich vereinbart wurde, der Bezugsindex klar benannt
                  ist und die Miete jeweils mindestens ein Jahr unverändert bleibt. Bei
                  wirksamer Indexmiete sind Mieterhöhungen wegen ortsüblicher Vergleichsmiete
                  oder Modernisierung weitgehend ausgeschlossen. Eine intransparente Klausel
                  ohne klaren Bezugsindex ist unwirksam.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Darf der Vermieter die Tierhaltung generell verbieten?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein. Nach BGH, 20.03.2013 – VIII ZR 168/12 ist ein generelles
                  Tierhaltungsverbot in einem Formularmietvertrag unwirksam, weil es eine
                  unangemessene Benachteiligung des Mieters darstellt. Erlaubt ist die Haltung
                  von Kleintieren wie Hamstern, Wellensittichen oder Zierfischen sogar ohne
                  Erlaubnis. Bei Hunden und Katzen ist eine Einzelfallabwägung nötig:
                  berechtigte Interessen des Vermieters, Mitmieter, Größe der Wohnung. Ein
                  pauschales Verbot ist unzulässig.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie lange darf ein Kündigungsausschluss im Mietvertrag dauern?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ein beidseitiger Kündigungsausschluss in einem Formularmietvertrag darf nach
                  BGH-Rechtsprechung (06.04.2005 – VIII ZR 27/04) maximal vier Jahre ab
                  Vertragsschluss gelten. Längere Bindungen sind insgesamt unwirksam — der
                  Mieter kann dann mit der gesetzlichen Frist von drei Monaten kündigen. Bei
                  individuell ausgehandelten Verträgen sind längere Bindungen möglich, müssen
                  aber nachweisbar verhandelt sein.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die KI-Prüfung eines Mietvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat)
                  erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die
                  Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt für Mietrecht
                  kostet typischerweise 100–250 € — die KI-Analyse spart dir gerade bei mehreren
                  Verträgen oder Wohnungssuche erhebliche Kosten.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt die KI-Prüfung einen Anwalt für Mietrecht?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine
                  Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für
                  individuelle Beratung, laufende Streitigkeiten (etwa drohende Räumungsklage,
                  Mieterhöhungsstreit, Kautionsrückforderung) oder komplexe Fälle (Gewerbemiete,
                  Untermiete, Eigenbedarfskündigung) bleibt ein Fachanwalt für Mietrecht oder
                  ein Mieterverein unverzichtbar. Die KI-Analyse liefert dafür eine fundierte
                  Faktengrundlage.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 12 — RELATED (Cross-Linking)
            ========================================== */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.sectionTitle}>Auch interessant</h2>
            </div>

            <div className={styles.relatedGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <Link to="/arbeitsvertrag-pruefen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Arbeitsvertrag prüfen</div>
                  <div className={styles.relatedDescription}>
                    Wettbewerbsverbot, Probezeit, Kündigungsfrist — KI-Check auf Basis BAG-Rechtsprechung
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/nda-pruefen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#ef4444' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>NDA prüfen</div>
                  <div className={styles.relatedDescription}>
                    Vertragsstrafe, Geheimhaltungsdauer, Carve-Outs — KI-Check auf Basis GeschGehG
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/kaufvertrag-pruefen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f97316' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Kaufvertrag prüfen</div>
                  <div className={styles.relatedDescription}>
                    Gewährleistung, Beschaffenheit, „wie gesehen" — KI-Check auf Basis BGB-Kaufrecht
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/blog/mietvertrag-unwirksame-klauseln" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#ef4444' }}><BookOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Mietvertrag-Klauseln im Detail</div>
                  <div className={styles.relatedDescription}>
                    Schönheitsreparaturen, Haustierhaltung, Kautionshöhe — was rechtlich problematisch ist
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/optimierung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Vertragsoptimierung</div>
                  <div className={styles.relatedDescription}>
                    Nach der Analyse: KI-Vorschläge zur Verbesserung problematischer Klauseln
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/ki-vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f59e0b' }}><Info size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>KI-Vertragsanalyse Guide</div>
                  <div className={styles.relatedDescription}>
                    Der komplette Guide: Wie KI-Vertragsanalyse funktioniert, KI vs. Anwalt, Kosten
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 13 — FINAL CTA
            ========================================== */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={`${styles.ctaCard} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>
                  Schluss mit unwirksamen Klauseln. Prüfe deinen Mietvertrag jetzt.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 87 % der Nutzer finden mindestens eine kritische Klausel, die sie sonst
                  übersehen hätten. Lade deinen Mietvertrag hoch und erhalte den Risiko-Report
                  in unter 60 Sekunden.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Mietvertrag jetzt prüfen
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

export default MietvertragPruefen;

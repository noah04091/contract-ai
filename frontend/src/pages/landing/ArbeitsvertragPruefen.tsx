import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, ThumbsUp,
  Languages, BarChart3, Sparkles, Scale, Briefcase, Gavel,
  Award, Info
} from "lucide-react";

const ArbeitsvertragPruefen: React.FC = () => {
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
        "name": "Arbeitsvertrag prüfen",
        "item": "https://www.contract-ai.de/arbeitsvertrag-pruefen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie genau ist die KI-Prüfung eines Arbeitsvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen Risiko-Klauseln in Arbeitsverträgen. Sie ist auf über 10.000 deutschen Arbeitsverträgen trainiert und nutzt aktuelle BAG-Rechtsprechung sowie die §§ 611a ff., 622 BGB, § 74 HGB und das Allgemeine Gleichbehandlungsgesetz (AGG) als Referenz. Bei juristisch komplexen Sachverhalten wie tariflichen Sonderregelungen empfehlen wir ergänzend einen Fachanwalt für Arbeitsrecht."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Klauseln im Arbeitsvertrag sind häufig unwirksam?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Zu den am häufigsten unwirksamen Klauseln zählen: pauschale Überstundenabgeltungen ohne klare Stundenbegrenzung (BAG, 22.02.2012 – 5 AZR 765/10), Wettbewerbsverbote ohne Karenzentschädigung (§ 74 Abs. 2 HGB), zu kurze Verfallklauseln unter 3 Monaten (BAG, 18.09.2018 – 9 AZR 162/18), überhöhte Vertragsstrafen über einem Bruttomonatsgehalt sowie Rückzahlungsklauseln für Fortbildungskosten ohne angemessene Bindungsdauer."
        }
      },
      {
        "@type": "Question",
        "name": "Ist mein Arbeitsvertrag noch gültig, wenn die KI unwirksame Klauseln findet?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Nach § 306 Abs. 1 BGB bleibt der Vertrag in der Regel auch bei unwirksamen Einzelklauseln wirksam — die problematische Klausel wird einfach durch die gesetzliche Regelung ersetzt. Du musst also keinen kompletten Vertrag neu verhandeln. Im Gegenteil: Eine unwirksame Wettbewerbsklausel ist für dich oft ein Vorteil, weil du dann frei entscheiden kannst."
        }
      },
      {
        "@type": "Question",
        "name": "Wie lange darf eine Probezeit im Arbeitsvertrag dauern?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die Probezeit darf nach § 622 Abs. 3 BGB maximal sechs Monate betragen. Während dieser Zeit gilt eine verkürzte Kündigungsfrist von zwei Wochen — ohne Angabe von Gründen. Manche Arbeitsverträge enthalten Klauseln mit Probezeit über 6 Monate; diese sind hinsichtlich der verkürzten Kündigungsfrist über die 6 Monate hinaus unwirksam."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist eine angemessene Kündigungsfrist im Arbeitsvertrag?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die gesetzliche Kündigungsfrist beträgt nach § 622 Abs. 1 BGB vier Wochen zum 15. oder zum Monatsende. Sie verlängert sich mit der Betriebszugehörigkeit gestaffelt bis auf sieben Monate (ab 20 Jahren). Vertragliche Verkürzungen für Arbeitnehmer sind nur sehr eingeschränkt zulässig; arbeitnehmerseitige Verlängerungen über die gesetzlichen Fristen hinaus dürfen die Frist für den Arbeitgeber nicht überschreiten (§ 622 Abs. 6 BGB)."
        }
      },
      {
        "@type": "Question",
        "name": "Brauche ich ein Wettbewerbsverbot in meinem Arbeitsvertrag?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Während des Arbeitsverhältnisses ergibt sich ein Wettbewerbsverbot bereits aus § 60 HGB analog — es muss nicht extra vereinbart werden. Ein nachvertragliches Wettbewerbsverbot ist nur wirksam, wenn der Arbeitgeber eine Karenzentschädigung von mindestens 50 % der zuletzt bezogenen vertragsmäßigen Leistungen zusagt (§ 74 Abs. 2 HGB) und die Bindung räumlich, zeitlich und gegenständlich angemessen ist. Maximaldauer: zwei Jahre."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Überstundenregelungen sind im Arbeitsvertrag erlaubt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine pauschale Klausel wie 'Überstunden sind mit dem Gehalt abgegolten' ist nach BAG-Rechtsprechung (22.02.2012 – 5 AZR 765/10) intransparent und damit unwirksam. Zulässig sind Klauseln, die eine konkrete Höchstgrenze nennen (etwa 'bis zu 10 Überstunden monatlich abgegolten') oder die das Verhältnis zur regulären Arbeitszeit klar regeln. Generell dürfen 8 Stunden täglich nur in Ausnahmen auf bis zu 10 Stunden ausgedehnt werden (§ 3 ArbZG)."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet die KI-Prüfung eines Arbeitsvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt kostet typischerweise 150–400 € pro Vertrag — die KI-Analyse spart dir also gerade bei mehreren Verträgen erhebliche Kosten."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Anwalt für Arbeitsrecht?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für individuelle Beratung, laufende Streitigkeiten oder komplexe Sonderfälle (z.B. Aufhebungsverträge bei Kündigungsschutzklage) bleibt ein Fachanwalt für Arbeitsrecht unverzichtbar. Die KI-Ergebnisse können als fundierte Grundlage für ein gezieltes Anwaltsgespräch dienen — und senken dort oft die Beratungskosten erheblich."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Arbeitsvertrag mit KI prüfen lassen",
    "description": "In drei Schritten von der hochgeladenen PDF-Datei zur fertigen Risikoanalyse deines Arbeitsvertrags.",
    "totalTime": "PT1M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Arbeitsvertrag hochladen",
        "text": "Lade deinen Arbeitsvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt 256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Automatische KI-Analyse",
        "text": "Die KI erkennt den Vertragstyp, prüft jede Klausel auf Konformität mit § 622 BGB, § 74 HGB, AGG und aktueller BAG-Rechtsprechung und bewertet Probezeit, Kündigungsfristen, Wettbewerbsverbote, Überstunden- und Vertragsstrafen-Regelungen."
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
        <title>Arbeitsvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI</title>
        <meta name="description" content="Arbeitsvertrag prüfen lassen mit KI: unwirksame Klauseln, überzogene Wettbewerbsverbote & versteckte Nachteile in 60 Sekunden erkennen. Auf Basis aktueller BAG-Rechtsprechung. DSGVO-konform, Server in Deutschland. ✓ Kostenlos starten" />
        <meta name="keywords" content="Arbeitsvertrag prüfen, Arbeitsvertrag prüfen lassen, Arbeitsvertrag KI prüfen, Arbeitsvertrag online prüfen, Arbeitsvertrag rechtssicher prüfen, Arbeitsvertrag Klauseln prüfen, Arbeitsvertrag Check, Arbeitsvertrag analysieren" />

        <link rel="canonical" href="https://www.contract-ai.de/arbeitsvertrag-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Arbeitsvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta property="og:description" content="Arbeitsvertrag prüfen lassen mit KI: unwirksame Klauseln & Nachteile in 60 Sekunden erkennen. Basierend auf aktueller BAG-Rechtsprechung. DSGVO-konform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/arbeitsvertrag-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Arbeitsvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta name="twitter:description" content="Arbeitsvertrag prüfen lassen mit KI: unwirksame Klauseln & Nachteile in 60 Sekunden erkennen. Basierend auf aktueller BAG-Rechtsprechung." />
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
                Für Arbeitnehmer & Arbeitgeber
              </div>

              <h1 className={styles.heroTitle}>
                Arbeitsvertrag prüfen lassen<br/>
                <span className={styles.heroTitleHighlight}>in 60 Sekunden, rechtssicher</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Lass deinen Arbeitsvertrag von einer KI prüfen, die unwirksame Klauseln,
                überzogene Wettbewerbsverbote und versteckte Nachteile auf Basis aktueller
                BAG-Rechtsprechung sofort erkennt. DSGVO-konform, Server in Deutschland.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Arbeitsvertrag jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fallen" className={styles.btnSecondary}>
                  Die 8 typischsten Fallen
                </a>
              </div>
            </div>

            {/* Demo Window — Arbeitsvertrag-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>BAG-Rechtsprechung</div>
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
                      <span className={styles.demoScoreValue}>68</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertrags-Score</div>
                      <div className={styles.demoScoreTitle}>Arbeitsvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Wettbewerbsverbot ohne Karenzentschädigung</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Überstundenklausel intransparent</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Probezeit nach § 622 Abs. 3 BGB OK</span>
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
              Geprüft nach BAG-Rechtsprechung
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
              <h2 className={styles.sectionTitle}>Was die KI in deinem Arbeitsvertrag prüft</h2>
              <p className={styles.sectionSubtitle}>
                Acht zentrale Klauseltypen werden gegen geltendes Recht und aktuelle Urteile abgeglichen.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Probezeit & Kündigungsfristen</h3>
                <p className={styles.functionDesc}>
                  Prüfung gegen § 622 BGB — maximale Probezeit, gestaffelte Fristen nach Betriebszugehörigkeit.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Wettbewerbsverbote</h3>
                <p className={styles.functionDesc}>
                  Karenzentschädigung nach § 74 Abs. 2 HGB, Reichweite, Dauer (max. 2 Jahre).
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <BarChart3 size={24} />
                </div>
                <h3 className={styles.functionTitle}>Überstundenregelungen</h3>
                <p className={styles.functionDesc}>
                  Transparenz-Check nach BAG-Rechtsprechung — pauschale Abgeltungen sind oft unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Award size={24} />
                </div>
                <h3 className={styles.functionTitle}>Urlaubsanspruch</h3>
                <p className={styles.functionDesc}>
                  Mindesturlaub nach BUrlG, Verfallregelungen, Sonderurlaub.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <BookOpen size={24} />
                </div>
                <h3 className={styles.functionTitle}>Rückzahlungsklauseln</h3>
                <p className={styles.functionDesc}>
                  Fortbildungskosten — angemessene Bindungsdauer nach BAG-Staffelung.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Vertragsstrafen</h3>
                <p className={styles.functionDesc}>
                  AGB-Kontrolle nach §§ 305 ff. BGB — Höhe darf ein Bruttomonatsgehalt nicht überschreiten.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <Briefcase size={24} />
                </div>
                <h3 className={styles.functionTitle}>Versetzungsklauseln</h3>
                <p className={styles.functionDesc}>
                  Reichweite des Direktionsrechts nach § 106 GewO, Zumutbarkeit für den Arbeitnehmer.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <Languages size={24} />
                </div>
                <h3 className={styles.functionTitle}>Verfall- & Ausschlussfristen</h3>
                <p className={styles.functionDesc}>
                  Mindestlaufzeit von 3 Monaten nach BAG (18.09.2018 – 9 AZR 162/18).
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
                <h2 className={styles.sectionTitleLeft}>73 % der Arbeitsverträge enthalten unwirksame Klauseln</h2>
                <p className={styles.problemText}>
                  Über drei Viertel aller in Deutschland verwendeten Arbeitsverträge enthalten
                  mindestens eine Klausel, die einer rechtlichen Überprüfung nicht standhält.
                  Das Tückische: Diese Schwachstellen bleiben oft jahrelang unbemerkt — bis es
                  zur Kündigung, zum Streit über Überstunden oder zum Wechsel zur Konkurrenz kommt.
                  Dann wird aus einem unscheinbaren Satz im Vertrag schnell ein vier- oder fünfstelliger
                  finanzieller Schaden.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>73%</div>
                    <div className={styles.problemStatLabel}>der Arbeitsverträge enthalten unwirksame Klauseln</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>8.500 €</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Schaden bei arbeitsrechtlichem Streit</div>
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
                      <div className={styles.problemDocTitle}>Arbeitsvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>14 Seiten • Hochgeladen heute</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...nach Beendigung des Arbeitsverhältnisses für 24 Monate nicht für ein Konkurrenzunternehmen tätig zu werden..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Ohne Karenzentschädigung!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  24 Monate Bindung
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 5 — SOLUTION (Vorher/Nachher)
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
                      150–400 € pro Vertrag, Terminvereinbarung, mehrere Werktage Wartezeit
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
                      Sofortige Risiko-Erkennung mit Paragraphen-Verweis, klaren
                      Handlungsempfehlungen und PDF-Report.
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
                <h2 className={styles.sectionTitleLeft}>Vertragsprüfung im Sekundentakt — auf juristischer Basis</h2>
                <p className={styles.solutionText}>
                  Die KI von Contract AI ist auf über 10.000 deutschen Arbeitsverträgen trainiert.
                  Sie kennt die §§ 611a ff. BGB, § 622 BGB, § 74 HGB, das AGG und aktuelle
                  BAG-Rechtsprechung — und wendet diese sofort auf jede Klausel deines Vertrags an.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Search size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klausel-für-Klausel-Bewertung</h4>
                      <p>Jede Klausel wird gegen geltendes Recht geprüft, mit Paragraphen-Verweis</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Gavel size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Aktuelle BAG-Rechtsprechung</h4>
                      <p>Urteile zu Wettbewerbsverbot, Überstunden, Vertragsstrafe automatisch berücksichtigt</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <ThumbsUp size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Verständliche Empfehlung</h4>
                      <p>Klartext statt Juristendeutsch, mit konkretem Handlungsvorschlag</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 6 — DIE 8 TYPISCHSTEN FALLEN (Kern-SEO-Section)
            ========================================== */}
        <section className={styles.risksSection} id="fallen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Die häufigsten Fallen</span>
              <h2 className={styles.sectionTitle}>Die 8 typischsten Fallen im deutschen Arbeitsvertrag</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Klauseltypen sind in der Praxis am häufigsten unwirksam — und genau hier
                schaut unsere KI besonders genau hin. Jede Falle mit Original-Wortlaut, juristischer
                Einordnung und Verweis auf das einschlägige Urteil.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* FALLE 1: Probezeit über 6 Monate */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>1. Probezeit über sechs Monate</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die Probezeit beträgt zwölf Monate. Während dieser Zeit gilt eine Kündigungsfrist von zwei Wochen."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 622 Abs. 3 BGB</strong> darf die Probezeit höchstens sechs Monate betragen. Eine längere Vereinbarung der verkürzten Kündigungsfrist ist hinsichtlich der überschreitenden Monate <strong>unwirksam</strong> — danach gilt die reguläre Kündigungsfrist von vier Wochen zum 15. oder Monatsende.</span>
                </div>
              </div>

              {/* FALLE 2: Pauschale Überstundenabgeltung */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>2. Pauschale Überstundenabgeltung</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Mit dem vereinbarten Bruttogehalt sind sämtliche Überstunden des Arbeitnehmers abgegolten."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Diese Klausel ist nach <strong>BAG, 22.02.2012 – 5 AZR 765/10</strong> intransparent und damit nach <strong>§ 307 Abs. 1 S. 2 BGB</strong> unwirksam — der Arbeitnehmer kann nicht erkennen, welche Leistung er erbringen muss. Folge: Geleistete Überstunden sind <strong>zusätzlich</strong> zu vergüten.</span>
                </div>
              </div>

              {/* FALLE 3: Wettbewerbsverbot ohne Karenzentschädigung */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>3. Wettbewerbsverbot ohne Karenzentschädigung</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Arbeitnehmer verpflichtet sich, für 24 Monate nach Beendigung des Arbeitsverhältnisses nicht für ein Konkurrenzunternehmen tätig zu werden."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ein nachvertragliches Wettbewerbsverbot ist nach <strong>§ 74 Abs. 2 HGB</strong> nur wirksam, wenn der Arbeitgeber eine <strong>Karenzentschädigung von mindestens 50 %</strong> der zuletzt bezogenen vertragsmäßigen Leistungen zusagt. Fehlt diese Zusage, ist die Klausel <strong>unverbindlich</strong> (BAG, 22.03.2017 – 10 AZR 448/15) — der Arbeitnehmer ist frei.</span>
                </div>
              </div>

              {/* FALLE 4: Rückzahlungsklausel Fortbildungskosten */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>4. Rückzahlungsklausel für Fortbildungskosten</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Bei Beendigung des Arbeitsverhältnisses innerhalb von fünf Jahren nach Abschluss der Fortbildung sind die Fortbildungskosten vollständig zurückzuzahlen."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach der BAG-Staffelung (u.a. <strong>BAG, 14.01.2009 – 3 AZR 900/07</strong>) gilt: Bis 1 Monat Fortbildung = max. 6 Monate Bindung; bis 2 Monate = max. 1 Jahr; bis 6 Monate = max. 3 Jahre. Fünf Jahre Bindung ohne Berücksichtigung der Fortbildungsdauer sind <strong>unwirksam</strong>.</span>
                </div>
              </div>

              {/* FALLE 5: Vertragsstrafe überhöht */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>5. Überzogene Vertragsstrafe</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Bei vertragswidriger Beendigung des Arbeitsverhältnisses zahlt der Arbeitnehmer eine Vertragsstrafe in Höhe von drei Bruttomonatsgehältern."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>BAG, 04.03.2004 – 8 AZR 196/03</strong> darf eine Vertragsstrafe nicht höher sein als die für den Zeitraum der vorzeitigen Beendigung zu zahlende Arbeitsvergütung — typischerweise <strong>maximal ein Bruttomonatsgehalt</strong>. Höhere Strafen halten der AGB-Kontrolle nach §§ 305 ff. BGB nicht stand.</span>
                </div>
              </div>

              {/* FALLE 6: Versetzungsklausel zu weit */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>6. Unbegrenzte Versetzungsklausel</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Der Arbeitgeber ist berechtigt, dem Arbeitnehmer jederzeit andere Aufgaben zuzuweisen und ihn an einen anderen Standort zu versetzen."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Das Direktionsrecht aus <strong>§ 106 GewO</strong> ist durch das billige Ermessen begrenzt. Eine Klausel ohne räumliche Begrenzung und ohne Berücksichtigung der Zumutbarkeit (Familie, Pendelzeit, Wohnort) ist nach <strong>BAG-Rechtsprechung</strong> unwirksam — der Arbeitgeber kann den Arbeitnehmer nicht beliebig durchs Land schieben.</span>
                </div>
              </div>

              {/* FALLE 7: Verfallklausel zu kurz */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>7. Verfallklausel unter drei Monaten</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Alle Ansprüche aus dem Arbeitsverhältnis verfallen, wenn sie nicht innerhalb von zwei Monaten nach Fälligkeit schriftlich geltend gemacht werden."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>BAG, 18.09.2018 – 9 AZR 162/18</strong> beträgt die Mindestlaufzeit für arbeitsvertragliche Ausschlussfristen <strong>drei Monate</strong>. Klauseln mit kürzeren Fristen sind insgesamt unwirksam — die Ansprüche verfallen dann erst nach den regulären Verjährungsfristen (drei Jahre).</span>
                </div>
              </div>

              {/* FALLE 8: Doppelte Schriftformklausel */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>8. Doppelte Schriftformklausel</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Änderungen dieses Vertrages bedürfen der Schriftform. Dies gilt auch für die Aufhebung der Schriftformklausel."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Eine sogenannte doppelte Schriftformklausel ist nach <strong>§ 305b BGB</strong> bei vorformulierten Verträgen unwirksam, weil sie den Vorrang der Individualabrede aushebelt (vgl. <strong>BAG, 20.05.2008 – 9 AZR 382/07</strong>). Mündliche Zusagen des Vorgesetzten — etwa zu Bonuszahlungen — bleiben verbindlich.</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 7 — PROCESS (3 Schritte) — HowTo Schema
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
                    <h3 className={styles.processTitle}>Arbeitsvertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      Lade deinen Arbeitsvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt
                      256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische KI-Analyse</h3>
                    <p className={styles.processDesc}>
                      Die KI erkennt den Vertragstyp, prüft jede Klausel auf Konformität mit § 622 BGB,
                      § 74 HGB, AGG und aktueller BAG-Rechtsprechung und bewertet alle acht Risiko-Bereiche.
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
              <h2 className={styles.sectionTitle}>Warum Contract AI für deinen Arbeitsvertrag?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum die KI-Prüfung mehr ist als ein Online-Tool.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Gavel size={28} />
                </div>
                <h3 className={styles.whyTitle}>Aktuelle BAG-Rechtsprechung</h3>
                <p className={styles.whyDesc}>
                  Urteile zu Wettbewerbsverbot, Überstunden, Vertragsstrafe und Verfallklauseln
                  sind in der Analyse berücksichtigt — nicht erst seit gestern.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO & Server in Deutschland</h3>
                <p className={styles.whyDesc}>
                  Dein Arbeitsvertrag enthält sensible Daten. Verarbeitung ausschließlich auf
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
                  Keine Termine, keine Wartezeiten. Den Arbeitsvertrag prüfen, wenn er bei dir
                  auf dem Tisch liegt — auch sonntagabends vor der Unterschrift am Montag.
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
              <h2 className={styles.sectionTitle}>Worauf du bei der Prüfung deines Arbeitsvertrags wirklich achten solltest</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Ein Arbeitsvertrag ist mehr als die Summe seiner Klauseln — er ist die rechtliche
                Basis deines beruflichen Alltags und entscheidet im Streitfall darüber, wer
                am Ende was bekommt. Das Bundesarbeitsgericht (BAG) hat in den letzten Jahren in
                zahlreichen Urteilen klargestellt, dass viele in der Praxis gängige Vertragsklauseln
                einer rechtlichen Überprüfung nicht standhalten. Wer seinen Arbeitsvertrag prüfen
                lässt, schützt sich vor genau diesen Stolperfallen.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Probezeit und Kündigungsfristen — die ersten Sechs Monate entscheiden
              </h3>
              <p className={styles.problemText}>
                Die Probezeit darf nach <strong>§ 622 Abs. 3 BGB</strong> maximal sechs Monate
                betragen. Während dieser Zeit gilt eine verkürzte Kündigungsfrist von zwei Wochen
                zu jedem beliebigen Tag — ohne Angabe von Gründen. Verträge, die eine Probezeit
                von zwölf Monaten vorsehen, sind hinsichtlich der verkürzten Kündigungsfrist über
                die ersten sechs Monate hinaus unwirksam. Nach Ablauf der Probezeit greifen die
                gestaffelten Kündigungsfristen des § 622 Abs. 1 und 2 BGB, die mit zunehmender
                Betriebszugehörigkeit auf bis zu sieben Monate ansteigen können (ab 20 Jahren).
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Überstunden — pauschale Abgeltung ist meist eine Falle
              </h3>
              <p className={styles.problemText}>
                Eine in vielen Verträgen zu findende Klausel lautet sinngemäß: „Mit dem Gehalt sind
                alle Überstunden abgegolten." Diese Formulierung ist nach ständiger BAG-Rechtsprechung
                (grundlegend <strong>BAG, 22.02.2012 – 5 AZR 765/10</strong>) intransparent und damit
                nach § 307 Abs. 1 S. 2 BGB unwirksam. Der Arbeitnehmer kann nicht erkennen, welche
                Leistung er erbringen muss. Die Folge: Geleistete Überstunden sind <strong>zusätzlich</strong>
                zu vergüten oder durch Freizeit auszugleichen. Wirksam wäre nur eine Klausel mit
                klarer Höchstgrenze, etwa „bis zu 10 Überstunden monatlich abgegolten". Mehr zur
                Überstundenregelung findest du im{' '}
                <Link to="/blog/arbeitsvertrag-rechte-verstehen">Ratgeber Arbeitsvertrag verstehen</Link>.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Wettbewerbsverbote — ohne Karenzentschädigung kein Verbot
              </h3>
              <p className={styles.problemText}>
                Während des laufenden Arbeitsverhältnisses gilt ein Wettbewerbsverbot bereits aus
                der arbeitsrechtlichen Treuepflicht (analog <strong>§ 60 HGB</strong>) und muss
                nicht extra vereinbart werden. Spannend wird es bei der Zeit <em>nach</em> dem
                Arbeitsverhältnis: Ein nachvertragliches Wettbewerbsverbot ist nur dann wirksam,
                wenn der Arbeitgeber eine Karenzentschädigung von <strong>mindestens 50 % der
                zuletzt bezogenen vertragsmäßigen Leistungen</strong> zusagt (§ 74 Abs. 2 HGB).
                Fehlt diese Zusage, ist die Klausel unverbindlich (BAG, 22.03.2017 – 10 AZR 448/15)
                — du wärst frei, sofort zur Konkurrenz zu wechseln. Auch eine fehlerhaft
                berechnete Entschädigung kann das Verbot kippen.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Rückzahlungsklauseln, Vertragsstrafen und Verfallklauseln
              </h3>
              <p className={styles.problemText}>
                Drei weitere Klausel-Typen sind besonders fehleranfällig: Erstens
                <strong> Rückzahlungsklauseln für Fortbildungskosten</strong> — hier gilt die
                BAG-Staffelung: Die Bindungsdauer muss in einem angemessenen Verhältnis zur Dauer
                der Fortbildung stehen (z.B. bis 1 Monat Fortbildung = max. 6 Monate Bindung).
                Zweitens <strong>Vertragsstrafen</strong> — sie dürfen die Vergütung für den
                Zeitraum der vorzeitigen Beendigung nicht überschreiten, in der Praxis also
                typischerweise nicht mehr als ein Bruttomonatsgehalt (BAG, 04.03.2004 – 8 AZR 196/03).
                Drittens <strong>Verfallklauseln</strong> — sie müssen mindestens drei Monate
                Geltendmachungsfrist einräumen (BAG, 18.09.2018 – 9 AZR 162/18); kürzere Fristen
                sind insgesamt unwirksam.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Was tun, wenn du eine unwirksame Klausel entdeckst?
              </h3>
              <p className={styles.problemText}>
                Eine unwirksame Klausel macht <strong>nicht den ganzen Vertrag unwirksam</strong>.
                Nach § 306 Abs. 1 BGB bleibt der Vertrag im Übrigen bestehen — die problematische
                Klausel wird einfach durch die gesetzliche Regelung ersetzt. Für dich als
                Arbeitnehmer ist das oft ein Vorteil: Eine unwirksame Wettbewerbsklausel etwa
                bedeutet vollständige Wechselfreiheit. Eine unwirksame Überstundenpauschale
                bedeutet Anspruch auf zusätzliche Vergütung. Ob du den Arbeitgeber direkt mit
                der Erkenntnis konfrontierst oder dir das Wissen für später aufhebst, ist eine
                strategische Entscheidung — die KI-Analyse gibt dir die Faktengrundlage.
              </p>

              <p className={styles.problemText} style={{ marginTop: '1.5rem' }}>
                Wenn du im konkreten Fall unsicher bist — etwa bei laufenden Streitigkeiten,
                geplanter Kündigung oder Aufhebungsvertrag — empfehlen wir zusätzlich einen
                Fachanwalt für Arbeitsrecht. Die KI-Analyse ist eine fundierte
                Erst-Risikoanalyse, ersetzt aber keine individuelle Rechtsberatung im Sinne des
                Rechtsdienstleistungsgesetzes (RDG). Lies dazu auch unseren{' '}
                <Link to="/blog/ki-vs-anwalt-vertrag-pruefen">Vergleich KI vs. Anwalt</Link>{' '}
                und die <Link to="/blog/kuendigung-arbeitsvertrag-fristen">Kündigungsfristen-Übersicht</Link>.
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
              <h2 className={styles.sectionTitle}>Häufige Fragen zum Arbeitsvertrag-Check</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Prüfung eines Arbeitsvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen
                  Risiko-Klauseln in Arbeitsverträgen. Sie ist auf über 10.000 deutschen
                  Arbeitsverträgen trainiert und nutzt aktuelle BAG-Rechtsprechung sowie die
                  §§ 611a ff., 622 BGB, § 74 HGB und das AGG als Referenz. Bei juristisch
                  komplexen Sachverhalten wie tariflichen Sonderregelungen empfehlen wir
                  ergänzend einen Fachanwalt für Arbeitsrecht.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Klauseln im Arbeitsvertrag sind häufig unwirksam?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Zu den häufigsten unwirksamen Klauseln zählen pauschale Überstundenabgeltungen
                  ohne Stundenbegrenzung (BAG, 22.02.2012 – 5 AZR 765/10), Wettbewerbsverbote
                  ohne Karenzentschädigung (§ 74 Abs. 2 HGB), zu kurze Verfallklauseln unter drei
                  Monaten (BAG, 18.09.2018 – 9 AZR 162/18), überhöhte Vertragsstrafen über einem
                  Bruttomonatsgehalt sowie Rückzahlungsklauseln für Fortbildungskosten ohne
                  angemessene Bindungsdauer.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ist mein Arbeitsvertrag noch gültig, wenn die KI unwirksame Klauseln findet?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Nach § 306 Abs. 1 BGB bleibt der Vertrag in der Regel auch bei unwirksamen
                  Einzelklauseln wirksam — die problematische Klausel wird einfach durch die
                  gesetzliche Regelung ersetzt. Du musst also keinen kompletten Vertrag neu
                  verhandeln. Im Gegenteil: Eine unwirksame Wettbewerbsklausel ist für dich oft
                  ein Vorteil, weil du dann frei entscheiden kannst.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie lange darf eine Probezeit im Arbeitsvertrag dauern?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die Probezeit darf nach § 622 Abs. 3 BGB maximal sechs Monate betragen.
                  Während dieser Zeit gilt eine verkürzte Kündigungsfrist von zwei Wochen — ohne
                  Angabe von Gründen. Manche Arbeitsverträge enthalten Klauseln mit Probezeit
                  über sechs Monate; diese sind hinsichtlich der verkürzten Kündigungsfrist über
                  die sechs Monate hinaus unwirksam.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was ist eine angemessene Kündigungsfrist im Arbeitsvertrag?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die gesetzliche Kündigungsfrist beträgt nach § 622 Abs. 1 BGB vier Wochen zum
                  15. oder zum Monatsende. Sie verlängert sich mit der Betriebszugehörigkeit
                  gestaffelt bis auf sieben Monate (ab 20 Jahren). Vertragliche Verkürzungen
                  für Arbeitnehmer sind nur sehr eingeschränkt zulässig; arbeitnehmerseitige
                  Verlängerungen über die gesetzlichen Fristen hinaus dürfen die Frist für den
                  Arbeitgeber nicht überschreiten (§ 622 Abs. 6 BGB).
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Brauche ich ein Wettbewerbsverbot in meinem Arbeitsvertrag?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Während des Arbeitsverhältnisses ergibt sich ein Wettbewerbsverbot bereits aus
                  § 60 HGB analog — es muss nicht extra vereinbart werden. Ein nachvertragliches
                  Wettbewerbsverbot ist nur wirksam, wenn der Arbeitgeber eine Karenzentschädigung
                  von mindestens 50 % der zuletzt bezogenen vertragsmäßigen Leistungen zusagt
                  (§ 74 Abs. 2 HGB) und die Bindung räumlich, zeitlich und gegenständlich
                  angemessen ist. Maximaldauer: zwei Jahre.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Überstundenregelungen sind im Arbeitsvertrag erlaubt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine pauschale Klausel wie "Überstunden sind mit dem Gehalt abgegolten" ist
                  nach BAG-Rechtsprechung (22.02.2012 – 5 AZR 765/10) intransparent und damit
                  unwirksam. Zulässig sind Klauseln, die eine konkrete Höchstgrenze nennen (etwa
                  "bis zu 10 Überstunden monatlich abgegolten") oder die das Verhältnis zur
                  regulären Arbeitszeit klar regeln. Generell dürfen 8 Stunden täglich nur in
                  Ausnahmen auf bis zu 10 Stunden ausgedehnt werden (§ 3 ArbZG).
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die KI-Prüfung eines Arbeitsvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat)
                  erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die
                  Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt kostet
                  typischerweise 150–400 € pro Vertrag — die KI-Analyse spart dir also gerade
                  bei mehreren Verträgen erhebliche Kosten.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt die KI-Prüfung einen Anwalt für Arbeitsrecht?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine
                  Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für
                  individuelle Beratung, laufende Streitigkeiten oder komplexe Sonderfälle
                  (z.B. Aufhebungsverträge bei Kündigungsschutzklage) bleibt ein Fachanwalt für
                  Arbeitsrecht unverzichtbar. Die KI-Ergebnisse können als fundierte Grundlage
                  für ein gezieltes Anwaltsgespräch dienen — und senken dort oft die
                  Beratungskosten erheblich.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 12 — RELATED
            ========================================== */}
        <section className={styles.relatedSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <h2 className={styles.sectionTitle}>Auch interessant</h2>
            </div>

            <div className={styles.relatedGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <Link to="/mietvertrag-pruefen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#10b981' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Mietvertrag prüfen</div>
                  <div className={styles.relatedDescription}>
                    Schönheitsreparaturen, Kaution, Indexmiete — KI-Check auf Basis BGH-Rechtsprechung
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

              <Link to="/blog/arbeitsvertrag-rechte-verstehen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><BookOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Arbeitsvertrag verstehen</div>
                  <div className={styles.relatedDescription}>
                    Überstunden, Urlaub & Kündigung — die wichtigsten Klauseln im Detail erklärt
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/blog/kuendigung-arbeitsvertrag-fristen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#ef4444' }}><Clock size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Kündigungsfristen Arbeitsvertrag</div>
                  <div className={styles.relatedDescription}>
                    Fristen, Formvorschriften und Kündigungsschutz im Überblick
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
                  Schluss mit unsicheren Klauseln. Prüfe deinen Arbeitsvertrag jetzt.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 87 % der Nutzer finden mindestens eine kritische Klausel, die sie sonst
                  übersehen hätten. Lade deinen Arbeitsvertrag hoch und erhalte den Risiko-Report
                  in unter 60 Sekunden.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Arbeitsvertrag jetzt prüfen
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

export default ArbeitsvertragPruefen;

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, ThumbsUp,
  Languages, Sparkles, Scale, ShoppingCart, Gavel,
  Info, DollarSign, Package
} from "lucide-react";

const KaufvertragPruefen: React.FC = () => {
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
        "name": "Kaufvertrag prüfen",
        "item": "https://www.contract-ai.de/kaufvertrag-pruefen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie genau ist die KI-Prüfung eines Kaufvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen Risiko-Klauseln in Kaufverträgen. Sie kennt die §§ 433–453 BGB zum Kaufrecht, die §§ 474–479 BGB zum Verbrauchsgüterkauf, § 434 BGB zur Sachmangeldefinition, § 437 BGB zu Mängelrechten, § 438 BGB zur Verjährung und die einschlägige BGH-Rechtsprechung zu Gewährleistungsausschlüssen, 'gekauft wie gesehen'-Klauseln und arglistig verschwiegenen Mängeln. Bei besonders hochwertigen oder komplexen Käufen (Immobilien, Unternehmensbeteiligungen) empfehlen wir ergänzend einen Fachanwalt."
        }
      },
      {
        "@type": "Question",
        "name": "Worauf muss ich beim Kaufvertrag besonders achten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die wichtigsten Prüfpunkte sind: klare Beschaffenheitsvereinbarung (kein vager 'wie besichtigt'), keine pauschalen Gewährleistungsausschlüsse beim Verbrauchsgüterkauf (§ 476 BGB), korrekte Verjährungsfrist (2 Jahre Standard, 1 Jahr bei Gebrauchtsachen im Verbrauchsgüterkauf), klare Regelung zu Eigentumsvorbehalt und Gefahrübergang, angemessene Storno-/Rücktrittsregelungen und transparente Zahlungsmodalitäten ohne überzogene Anzahlungspflicht."
        }
      },
      {
        "@type": "Question",
        "name": "Was bedeutet 'Gekauft wie gesehen' wirklich?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Diese Klausel ist häufig missverstanden. Sie schließt nur die Gewährleistung für Mängel aus, die der Käufer bei einer üblichen Besichtigung hätte erkennen können. Versteckte Mängel und arglistig verschwiegene Mängel sind davon nicht erfasst (§ 444 BGB). Bei Verkauf an einen Verbraucher ist ein vollständiger Gewährleistungsausschluss bei neuen Sachen ohnehin unwirksam (§ 476 BGB). 'Gekauft wie gesehen' ist also kein Freibrief für den Verkäufer."
        }
      },
      {
        "@type": "Question",
        "name": "Kann der Verkäufer die Gewährleistung komplett ausschließen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Das hängt von der Konstellation ab. Beim Verkauf zwischen Privatpersonen kann die Gewährleistung weitgehend ausgeschlossen werden — außer bei arglistig verschwiegenen Mängeln (§ 444 BGB) oder bei einer ausdrücklich vereinbarten Beschaffenheit. Beim Verkauf eines Unternehmers an einen Verbraucher (Verbrauchsgüterkauf) ist ein Gewährleistungsausschluss bei neuen Sachen unzulässig; bei gebrauchten Sachen darf die Frist auf maximal 1 Jahr verkürzt werden (§ 476 BGB)."
        }
      },
      {
        "@type": "Question",
        "name": "Wie lange habe ich Anspruch auf Gewährleistung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die gesetzliche Gewährleistung beträgt nach § 438 Abs. 1 Nr. 3 BGB zwei Jahre ab Übergabe der Sache. Bei Bauwerken sind es fünf Jahre. Beim Verbrauchsgüterkauf darf diese Frist nur unter engen Voraussetzungen verkürzt werden (auf 1 Jahr bei gebrauchten Sachen). Bei arglistig verschwiegenen Mängeln gilt die regelmäßige Verjährung von drei Jahren ab Kenntnis (§ 438 Abs. 3 i.V.m. §§ 195, 199 BGB) — hier ist sogar nach Jahren noch ein Vorgehen möglich."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist eine wirksame Beschaffenheitsvereinbarung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nach § 434 BGB ist die Sache mangelfrei, wenn sie die vereinbarte Beschaffenheit hat. Eine wirksame Beschaffenheitsvereinbarung muss konkret sein — pauschale Klauseln wie 'in vereinbartem Zustand' sind wertlos. Beim Autokauf etwa: Kilometerstand, Vorbesitzer, Unfallfreiheit, Service-Historie sollten ausdrücklich genannt werden. Was im Vertrag schwarz auf weiß steht, ist im Streitfall verbindlich. Mündliche Zusagen sind beweispflichtig."
        }
      },
      {
        "@type": "Question",
        "name": "Was bringt ein Eigentumsvorbehalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ein Eigentumsvorbehalt nach § 449 BGB bedeutet: Der Verkäufer bleibt Eigentümer der Sache, bis der Kaufpreis vollständig bezahlt ist. Für den Käufer ist das relevant, wenn er die Sache nicht sofort vollständig bezahlt — denn bei Zahlungsverzug kann der Verkäufer die Sache zurückverlangen. Für den Verkäufer ist es eine wichtige Sicherung. Eine klare und ausdrückliche Vereinbarung im Vertrag ist nötig — stillschweigender Eigentumsvorbehalt ist nicht möglich."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet die KI-Prüfung eines Kaufvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt kostet typischerweise 100–300 € pro Vertrag — die KI-Analyse spart dir gerade beim Autokauf, Möbelkauf oder anderen größeren Anschaffungen erhebliche Kosten."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Anwalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für komplexe Geschäfte (Immobilienkauf, Unternehmensbeteiligungen, gewerblicher Großhandel), bei laufenden Streitigkeiten über Sachmängel oder bei sehr hohen Kaufpreisen bleibt ein Fachanwalt unverzichtbar. Die KI-Analyse ist eine fundierte Vorprüfung und senkt im Anwaltsgespräch oft die Beratungskosten erheblich."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Kaufvertrag mit KI prüfen lassen",
    "description": "In drei Schritten von der hochgeladenen PDF-Datei zur fertigen Risikoanalyse deines Kaufvertrags.",
    "totalTime": "PT1M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Kaufvertrag hochladen",
        "text": "Lade deinen Kaufvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt 256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Automatische KI-Analyse",
        "text": "Die KI prüft jede Klausel gegen die §§ 433-453 BGB zum Kaufrecht, die §§ 474-479 BGB zum Verbrauchsgüterkauf und aktuelle BGH-Rechtsprechung. Beschaffenheit, Gewährleistung, Verjährung, Eigentumsvorbehalt und Stornoregelungen werden bewertet."
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
        <title>Kaufvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI</title>
        <meta name="description" content="Kaufvertrag prüfen lassen mit KI: unwirksame Gewährleistungsausschlüsse, vage Beschaffenheit & versteckte Fallen in 60 Sekunden erkennen. Auf Basis BGB-Kaufrecht & BGH-Rechtsprechung. DSGVO-konform, Server in Deutschland. ✓ Kostenlos starten" />
        <meta name="keywords" content="Kaufvertrag prüfen, Kaufvertrag prüfen lassen, Kaufvertrag KI prüfen, Kaufvertrag online prüfen, Autokaufvertrag prüfen, Kaufvertrag Check, Kaufvertrag analysieren, Gewährleistung prüfen, gekauft wie gesehen, Sachmangel prüfen" />

        <link rel="canonical" href="https://www.contract-ai.de/kaufvertrag-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Kaufvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta property="og:description" content="Kaufvertrag prüfen lassen mit KI: Gewährleistung, Beschaffenheit und versteckte Fallen in 60 Sekunden erkennen. DSGVO-konform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/kaufvertrag-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Kaufvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta name="twitter:description" content="Kaufvertrag prüfen lassen mit KI: Gewährleistung, Beschaffenheit und versteckte Fallen in 60 Sekunden erkennen." />
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
                Für Käufer & Verkäufer
              </div>

              <h1 className={styles.heroTitle}>
                Kaufvertrag prüfen lassen<br/>
                <span className={styles.heroTitleHighlight}>versteckte Fallen in 60 Sekunden erkennen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Lass deinen Kaufvertrag von einer KI prüfen, die unwirksame
                Gewährleistungsausschlüsse, vage Beschaffenheitsangaben und versteckte
                Stornofallen auf Basis des BGB-Kaufrechts und aktueller BGH-Rechtsprechung
                sofort erkennt. DSGVO-konform, Server in Deutschland.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Kaufvertrag jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fallen" className={styles.btnSecondary}>
                  Die 8 typischsten Fallen
                </a>
              </div>
            </div>

            {/* Demo Window — Kaufvertrag-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>BGB-Kaufrecht</div>
                  <div className={styles.floatingSubtext}>geprüft</div>
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
                      <span className={styles.demoScoreValue}>59</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertrags-Score</div>
                      <div className={styles.demoScoreTitle}>Autokaufvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>"Wie gesehen" mit pauschalem Gewährleistungsausschluss</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Beschaffenheitsangaben sehr vage</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Eigentumsvorbehalt klar geregelt</span>
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
              Geprüft nach BGB-Kaufrecht
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION 3 — WAS WIR PRÜFEN
            ========================================== */}
        <section className={styles.functionsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Prüfumfang</span>
              <h2 className={styles.sectionTitle}>Was die KI in deinem Kaufvertrag prüft</h2>
              <p className={styles.sectionSubtitle}>
                Acht zentrale Klauseltypen werden gegen das BGB-Kaufrecht und aktuelle
                BGH-Rechtsprechung abgeglichen.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Gewährleistungsausschluss</h3>
                <p className={styles.functionDesc}>
                  Beim Verbrauchsgüterkauf nach § 476 BGB stark eingeschränkt — pauschale Ausschlüsse oft unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Search size={24} />
                </div>
                <h3 className={styles.functionTitle}>Beschaffenheitsvereinbarung</h3>
                <p className={styles.functionDesc}>
                  Klare Definition der Beschaffenheit nach § 434 BGB — vage Angaben sind im Streit wertlos.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Verjährungsfristen</h3>
                <p className={styles.functionDesc}>
                  Standard 2 Jahre nach § 438 BGB — Verkürzungen meist nur bei gebrauchten Sachen zulässig.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Package size={24} />
                </div>
                <h3 className={styles.functionTitle}>Eigentumsvorbehalt</h3>
                <p className={styles.functionDesc}>
                  Klare Regelung nach § 449 BGB — wann geht das Eigentum tatsächlich über.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <ShoppingCart size={24} />
                </div>
                <h3 className={styles.functionTitle}>Gefahrübergang</h3>
                <p className={styles.functionDesc}>
                  Wer trägt das Risiko bei Versand oder Transport — § 446, § 447 BGB.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <DollarSign size={24} />
                </div>
                <h3 className={styles.functionTitle}>Stornogebühren</h3>
                <p className={styles.functionDesc}>
                  AGB-Kontrolle nach §§ 305 ff. BGB — pauschale Stornogebühren sind oft unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Anzahlungsklauseln</h3>
                <p className={styles.functionDesc}>
                  Höhe, Sicherung gegen Insolvenz, Rückzahlung bei Vertragsstörungen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <Languages size={24} />
                </div>
                <h3 className={styles.functionTitle}>Mängelrechte</h3>
                <p className={styles.functionDesc}>
                  Nacherfüllung, Rücktritt, Minderung, Schadensersatz nach § 437 BGB.
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
                <h2 className={styles.sectionTitleLeft}>Ein versteckter Mangel kann tausende Euro kosten</h2>
                <p className={styles.problemText}>
                  Vom Gebrauchtwagen über Möbel bis zum Hausrat: Beim Kauf hängt im Streitfall
                  alles vom Vertragstext ab. Pauschale Klauseln wie „gekauft wie gesehen" werden
                  in der Praxis als kompletter Haftungsausschluss missverstanden — sind es aber
                  juristisch gar nicht. Verkäufer drücken Käufern oft Verträge in die Hand, die
                  einseitig formuliert sind: pauschaler Gewährleistungsausschluss, vage
                  Beschaffenheitsangaben, überzogene Stornogebühren. Wer das nicht erkennt, zahlt
                  später für versteckte Mängel oder verliert Anspruch auf Rückgabe — bei
                  hochpreisigen Käufen schnell vier- oder fünfstellige Beträge.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>65%</div>
                    <div className={styles.problemStatLabel}>der Privat-Kaufverträge enthalten unwirksame Klauseln</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>3.800 €</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Schaden bei verschwiegenen Sachmängeln</div>
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
                      <div className={styles.problemDocTitle}>Kaufvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>6 Seiten • Hochgeladen heute</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...das Fahrzeug wird gekauft wie gesehen, unter Ausschluss jeglicher Sachmängelhaftung..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Pauschalausschluss
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Beschaffenheit unklar
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
                      100–300 € pro Vertrag, Termin, Wartezeit — und der Verkäufer
                      drängt auf sofortige Unterschrift.
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
                      und konkreten Verhandlungsempfehlungen.
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
                <h2 className={styles.sectionTitleLeft}>Kaufvertragsprüfung im Sekundentakt — bevor du unterschreibst</h2>
                <p className={styles.solutionText}>
                  Die KI von Contract AI kennt die §§ 433–453 BGB zum Kaufrecht, die §§ 474–479 BGB
                  zum Verbrauchsgüterkauf, § 434 BGB zur Sachmangeldefinition, § 437 BGB zu
                  Mängelrechten, § 438 BGB zur Verjährung und die einschlägige BGH-Rechtsprechung
                  — und wendet sie sofort auf jede Klausel deines Vertrags an.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Search size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klausel-für-Klausel-Bewertung</h4>
                      <p>Jede Klausel wird gegen geltendes BGB-Kaufrecht geprüft, mit Paragraphen-Verweis</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Gavel size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Aktuelle BGH-Rechtsprechung</h4>
                      <p>Urteile zu „gekauft wie gesehen", arglistig verschwiegenen Mängeln, Sachmangel</p>
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
            SECTION 6 — DIE 8 TYPISCHSTEN FALLEN
            ========================================== */}
        <section className={styles.risksSection} id="fallen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Die häufigsten Fallen</span>
              <h2 className={styles.sectionTitle}>Die 8 typischsten Fallen im Kaufvertrag</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Klauseltypen sind in der Praxis am häufigsten unwirksam oder rechtlich
                angreifbar — und genau hier schaut unsere KI besonders genau hin.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* FALLE 1: Pauschaler Gewährleistungsausschluss beim Verbrauchsgüterkauf */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>1. Pauschaler Gewährleistungsausschluss beim Verbrauchsgüterkauf</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Verkauf erfolgt unter Ausschluss jeglicher Sachmängelhaftung."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Beim Verkauf eines Unternehmers an einen Verbraucher (Verbrauchsgüterkauf) ist ein vollständiger Gewährleistungsausschluss bei <strong>neuen Sachen unzulässig</strong> (<strong>§ 476 BGB</strong>). Bei gebrauchten Sachen darf die Frist nur auf 1 Jahr verkürzt, nicht ausgeschlossen werden. Unwirksame Klauseln führen zur vollen gesetzlichen Gewährleistung von 2 Jahren ab Übergabe.</span>
                </div>
              </div>

              {/* FALLE 2: "Gekauft wie gesehen" als Freibrief */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>2. „Gekauft wie gesehen" als Freibrief verstanden</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Das Fahrzeug wird gekauft wie gesehen, unter Ausschluss jeglicher Gewährleistung für Sachmängel."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Diese Klausel ist häufig missverstanden. Sie schließt nur Mängel aus, die bei einer üblichen Besichtigung erkennbar waren. <strong>Versteckte Mängel und arglistig verschwiegene Mängel</strong> sind davon nach <strong>§ 444 BGB nicht erfasst</strong> — der Verkäufer haftet trotzdem. Auch eine ausdrücklich vereinbarte Beschaffenheit (z.B. „unfallfrei") wird vom Ausschluss nicht erfasst.</span>
                </div>
              </div>

              {/* FALLE 3: Vage Beschaffenheitsangaben */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>3. Vage oder fehlende Beschaffenheitsangaben</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Das Fahrzeug wird im besichtigten Zustand verkauft." (Keine Angaben zu Kilometerstand, Vorbesitzern, Unfallfreiheit, Service)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 434 BGB</strong> ist die Sache nur dann mangelfrei, wenn sie die <strong>vereinbarte Beschaffenheit</strong> hat. Pauschale Angaben wie „im besichtigten Zustand" sind im Streitfall wertlos. Bestehe auf konkreten schriftlichen Angaben: Kilometerstand, Vorbesitzer, Unfallfreiheit, Service-Historie, technische Defekte. Was im Vertrag steht, ist verbindlich — was nicht drinsteht, ist Beweisproblem.</span>
                </div>
              </div>

              {/* FALLE 4: Verkürzte Verjährung */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>4. Unzulässig verkürzte Verjährungsfrist</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Mängelansprüche verjähren in sechs Monaten ab Übergabe."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Die gesetzliche Verjährung beträgt nach <strong>§ 438 Abs. 1 Nr. 3 BGB zwei Jahre</strong> ab Übergabe. Beim Verbrauchsgüterkauf darf die Frist nach <strong>§ 476 Abs. 2 BGB</strong> nur unter engen Voraussetzungen verkürzt werden — bei gebrauchten Sachen auf maximal 1 Jahr, bei neuen Sachen gar nicht. Sechs Monate sind unwirksam — es gilt die volle gesetzliche Frist.</span>
                </div>
              </div>

              {/* FALLE 5: Fehlender Eigentumsvorbehalt */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>5. Fehlender oder unklarer Eigentumsvorbehalt</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Der Kaufpreis ist in zwei Raten zahlbar." (Keine Klärung, ob das Eigentum bei Übergabe oder bei vollständiger Zahlung übergeht)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ein Eigentumsvorbehalt nach <strong>§ 449 BGB</strong> muss <strong>ausdrücklich</strong> vereinbart werden — stillschweigend gibt es ihn nicht. Ohne Vereinbarung geht das Eigentum bereits bei Übergabe über (§ 929 BGB), auch wenn noch nicht vollständig bezahlt ist. Für den Verkäufer ist das ein Sicherungsverlust, für den Käufer kann es bei Zahlungsverzug zu Rückforderungsansprüchen führen.</span>
                </div>
              </div>

              {/* FALLE 6: Überzogene Stornogebühren */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>6. Überzogene Stornogebühren</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Bei Rücktritt vom Kauf wird eine Stornogebühr von 25 % des Kaufpreises fällig."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Pauschale Stornogebühren in AGB unterliegen der Kontrolle nach <strong>§§ 307, 309 Nr. 5 BGB</strong>. Sie sind nur wirksam, wenn sie den nach gewöhnlichem Lauf der Dinge zu erwartenden Schaden nicht überschreiten und dem Käufer der Nachweis eines geringeren Schadens ausdrücklich offen bleibt. 25 % pauschal sind regelmäßig zu hoch und damit insgesamt unwirksam — der Verkäufer muss konkreten Schaden beweisen.</span>
                </div>
              </div>

              {/* FALLE 7: Ungesicherte Anzahlung */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>7. Ungesicherte Anzahlung</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Bei Vertragsschluss ist eine Anzahlung in Höhe von 50 % des Kaufpreises zu leisten." (Keine Sicherung gegen Insolvenz oder Nichterfüllung)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Hohe Anzahlungen ohne Sicherung sind ein erhebliches Käuferrisiko: Bei Insolvenz des Verkäufers verlierst du das Geld vollständig. Marktüblich sind Anzahlungen <strong>von 10–20 %</strong>, bei höheren Beträgen sollten Sicherheiten vereinbart werden (Bankbürgschaft, Treuhandkonto, Zug-um-Zug). Insbesondere bei Kauf von noch zu liefernden Sachen (Möbel, Maßanfertigungen) ist Vorsicht geboten.</span>
                </div>
              </div>

              {/* FALLE 8: Gefahrübergang ungünstig */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>8. Ungünstige Gefahrübergangsregelung</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die Gefahr geht mit Übergabe an den Spediteur auf den Käufer über." (Bei Verbrauchsgüterkauf!)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Beim <strong>Verbrauchsgüterkauf</strong> geht die Gefahr nach <strong>§ 475 Abs. 2 BGB</strong> erst mit Übergabe an den Käufer (oder vom ihm benannte Person) über — nicht bereits bei Übergabe an den Spediteur. Wird die Sache auf dem Transportweg beschädigt oder zerstört, trägt der Verkäufer das Risiko. Klauseln, die diese Regel zulasten des Verbrauchers verschieben, sind unwirksam.</span>
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
                Vom hochgeladenen PDF zum strukturierten Risiko-Report — bevor du unterschreibst.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Kaufvertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      Lade deinen Kaufvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt
                      256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische KI-Analyse</h3>
                    <p className={styles.processDesc}>
                      Die KI prüft jede Klausel gegen die §§ 433–453 BGB zum Kaufrecht, die
                      §§ 474–479 BGB zum Verbrauchsgüterkauf und aktuelle BGH-Rechtsprechung.
                      Beschaffenheit, Gewährleistung, Verjährung und Stornoregelungen werden bewertet.
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
              <h2 className={styles.sectionTitle}>Warum Contract AI für deinen Kaufvertrag?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum die KI-Prüfung mehr ist als ein Online-Tool.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Gavel size={28} />
                </div>
                <h3 className={styles.whyTitle}>BGB-Kaufrecht & BGH-Urteile</h3>
                <p className={styles.whyDesc}>
                  Die §§ 433–453 BGB, das Verbrauchsgüterkaufrecht und einschlägige BGH-Urteile
                  werden auf jede Klausel angewendet — automatisch.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO & Server in Deutschland</h3>
                <p className={styles.whyDesc}>
                  Dein Kaufvertrag enthält oft persönliche Daten und Preise. Verarbeitung
                  ausschließlich auf EU-Servern, keine Weitergabe an Dritte.
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
                <h3 className={styles.whyTitle}>Schnell genug für die Verhandlung</h3>
                <p className={styles.whyDesc}>
                  Wenn der Verkäufer auf sofortige Unterschrift drängt, hast du in 60 Sekunden
                  die fundierte Antwort — direkt am Verhandlungstisch.
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
              <h2 className={styles.sectionTitle}>Worauf du bei der Prüfung deines Kaufvertrags wirklich achten solltest</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Ein Kaufvertrag entscheidet im Streitfall über tausende Euro. Vom Gebrauchtwagen
                über Möbel bis hin zur Wohnungseinrichtung: Wenn nach dem Kauf ein Mangel auftaucht,
                hängt alles davon ab, was im Vertrag steht — und vor allem, was <em>nicht</em>
                drin steht. Das BGB-Kaufrecht (§§ 433–453 BGB) gibt dir starke Käuferrechte,
                doch viele Verträge versuchen, diese Rechte einzuschränken oder ganz auszuschließen.
                Wer einen Kaufvertrag prüft, kann unwirksame Klauseln sofort erkennen und
                vermeidet teure Überraschungen.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Verbrauchsgüterkauf vs Privatkauf — ein entscheidender Unterschied
              </h3>
              <p className={styles.problemText}>
                Das deutsche Kaufrecht unterscheidet streng zwischen zwei Konstellationen.
                Beim <strong>Verbrauchsgüterkauf</strong> (Unternehmer verkauft an Verbraucher,
                §§ 474 ff. BGB) gelten erheblich strengere Regeln zugunsten des Käufers: Ein
                Gewährleistungsausschluss bei neuen Sachen ist unwirksam (<strong>§ 476 BGB</strong>),
                bei gebrauchten Sachen darf die Frist nur auf 1 Jahr verkürzt werden, der
                Gefahrübergang ist erst bei Übergabe an den Käufer. Beim <strong>Privatkauf</strong>
                (Privatperson verkauft an Privatperson) ist ein Gewährleistungsausschluss dagegen
                weitgehend möglich — außer bei arglistig verschwiegenen Mängeln (§ 444 BGB).
                Diese Unterscheidung ist die wichtigste beim Lesen jedes Kaufvertrags.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                „Gekauft wie gesehen" — was die Klausel wirklich bedeutet
              </h3>
              <p className={styles.problemText}>
                Diese Klausel ist die meistmissverstandene des deutschen Kaufrechts. Verkäufer
                stellen sie oft als pauschalen Haftungsausschluss dar — sie ist es aber nicht.
                Sie schließt nur die Gewährleistung für Mängel aus, die <em>bei einer üblichen
                Besichtigung erkennbar</em> waren. Versteckte Mängel (z.B. ein Motorschaden, der
                erst nach 200 km auftritt) und arglistig verschwiegene Mängel (etwa ein
                bekannter Unfallschaden, der nicht erwähnt wurde) sind nach <strong>§ 444 BGB</strong>
                <em>nicht</em> vom Ausschluss erfasst — der Verkäufer haftet trotzdem. Auch
                ausdrücklich vereinbarte Beschaffenheiten (Kilometerstand, Unfallfreiheit,
                Service-Historie) bleiben verbindlich.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Beschaffenheitsangaben — was reinschreiben, was nicht
              </h3>
              <p className={styles.problemText}>
                Nach <strong>§ 434 BGB</strong> ist die Sache nur dann mangelfrei, wenn sie die
                <em>vereinbarte</em> Beschaffenheit hat. Das ist deine wichtigste Verhandlungs-
                Karte: Was im Vertrag schwarz auf weiß steht, ist verbindlich. Was nicht drinsteht,
                ist Beweisproblem. Beim Autokauf gehören in den Vertrag: <strong>Kilometerstand,
                Anzahl Vorbesitzer, Unfallfreiheit (zumindest „Verkäufer kennt keine Unfallschäden"),
                Service-Historie, technische Defekte</strong>. Bei Möbeln: Material, Maße, Zustand
                (neu/gebraucht/restauriert). Bei Elektronik: Funktionsfähigkeit, Garantie,
                Zubehör. Mündliche Zusagen sind im Streit nichts wert — alles in den Vertrag.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Verjährung, Eigentumsvorbehalt und Stornogebühren
              </h3>
              <p className={styles.problemText}>
                Drei weitere zentrale Punkte: Erstens die <strong>Verjährung</strong> — gesetzlich
                2 Jahre ab Übergabe (§ 438 BGB), beim Verbrauchsgüterkauf nur sehr eingeschränkt
                verkürzbar. Zweitens der <strong>Eigentumsvorbehalt</strong> (§ 449 BGB) — er muss
                ausdrücklich vereinbart werden, sonst geht das Eigentum bereits bei Übergabe über.
                Wer in Raten zahlt und keinen klaren Eigentumsvorbehalt hat, riskiert bei
                Verkäufer-Insolvenz, dass die Sache der Insolvenzmasse zufällt. Drittens
                <strong>Stornogebühren</strong> — pauschale Klauseln über 10–15 % sind in AGB
                regelmäßig unwirksam (§§ 307, 309 Nr. 5 BGB). Mehr zum Thema Autokauf im{' '}
                <Link to="/blog/autokauf-vertrag-gewaehrleistung">Ratgeber Autokauf-Vertrag</Link>.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Was tun, wenn du einen Mangel entdeckst?
              </h3>
              <p className={styles.problemText}>
                Nach <strong>§ 437 BGB</strong> hast du als Käufer mehrere Rechte:
                <strong> Nacherfüllung</strong> (Reparatur oder Ersatzlieferung — dein Wahlrecht),
                <strong> Rücktritt</strong> vom Vertrag (volle Rückzahlung), <strong>Minderung</strong>
                des Kaufpreises (anteilige Rückzahlung) oder <strong>Schadensersatz</strong>.
                Wichtig: Beim Verbrauchsgüterkauf wird in den ersten 12 Monaten nach Übergabe
                vermutet, dass der Mangel bereits bei Übergabe vorhanden war (§ 477 BGB) — die
                Beweislast liegt beim Verkäufer. Bei arglistig verschwiegenen Mängeln gilt sogar
                die regelmäßige Verjährung von 3 Jahren ab Kenntnis (§§ 195, 199 BGB) — auch
                Jahre nach dem Kauf ist ein Vorgehen möglich.
              </p>

              <p className={styles.problemText} style={{ marginTop: '1.5rem' }}>
                Bei besonders hochwertigen oder komplexen Käufen (Immobilien, Unternehmens-
                beteiligungen, gewerblicher Großhandel) empfehlen wir zusätzlich einen Fachanwalt.
                Die KI-Analyse ist eine fundierte Erst-Risikoanalyse, ersetzt aber keine
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
              <h2 className={styles.sectionTitle}>Häufige Fragen zum Kaufvertrag-Check</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Prüfung eines Kaufvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen
                  Risiko-Klauseln in Kaufverträgen. Sie kennt die §§ 433–453 BGB zum Kaufrecht,
                  die §§ 474–479 BGB zum Verbrauchsgüterkauf, § 434 BGB zur Sachmangeldefinition,
                  § 437 BGB zu Mängelrechten, § 438 BGB zur Verjährung und die einschlägige
                  BGH-Rechtsprechung zu Gewährleistungsausschlüssen, „gekauft wie gesehen"-Klauseln
                  und arglistig verschwiegenen Mängeln. Bei besonders hochwertigen oder komplexen
                  Käufen (Immobilien, Unternehmensbeteiligungen) empfehlen wir ergänzend einen
                  Fachanwalt.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Worauf muss ich beim Kaufvertrag besonders achten?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die wichtigsten Prüfpunkte sind: klare Beschaffenheitsvereinbarung (kein vager
                  „wie besichtigt"), keine pauschalen Gewährleistungsausschlüsse beim
                  Verbrauchsgüterkauf (§ 476 BGB), korrekte Verjährungsfrist (2 Jahre Standard,
                  1 Jahr bei Gebrauchtsachen im Verbrauchsgüterkauf), klare Regelung zu
                  Eigentumsvorbehalt und Gefahrübergang, angemessene Storno-/Rücktrittsregelungen
                  und transparente Zahlungsmodalitäten ohne überzogene Anzahlungspflicht.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was bedeutet „Gekauft wie gesehen" wirklich?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Diese Klausel ist häufig missverstanden. Sie schließt nur die Gewährleistung
                  für Mängel aus, die der Käufer bei einer üblichen Besichtigung hätte erkennen
                  können. Versteckte Mängel und arglistig verschwiegene Mängel sind davon nicht
                  erfasst (§ 444 BGB). Bei Verkauf an einen Verbraucher ist ein vollständiger
                  Gewährleistungsausschluss bei neuen Sachen ohnehin unwirksam (§ 476 BGB).
                  „Gekauft wie gesehen" ist also kein Freibrief für den Verkäufer.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann der Verkäufer die Gewährleistung komplett ausschließen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Das hängt von der Konstellation ab. Beim Verkauf zwischen Privatpersonen kann
                  die Gewährleistung weitgehend ausgeschlossen werden — außer bei arglistig
                  verschwiegenen Mängeln (§ 444 BGB) oder bei einer ausdrücklich vereinbarten
                  Beschaffenheit. Beim Verkauf eines Unternehmers an einen Verbraucher
                  (Verbrauchsgüterkauf) ist ein Gewährleistungsausschluss bei neuen Sachen
                  unzulässig; bei gebrauchten Sachen darf die Frist auf maximal 1 Jahr verkürzt
                  werden (§ 476 BGB).
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie lange habe ich Anspruch auf Gewährleistung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die gesetzliche Gewährleistung beträgt nach § 438 Abs. 1 Nr. 3 BGB zwei Jahre
                  ab Übergabe der Sache. Bei Bauwerken sind es fünf Jahre. Beim Verbrauchsgüterkauf
                  darf diese Frist nur unter engen Voraussetzungen verkürzt werden (auf 1 Jahr
                  bei gebrauchten Sachen). Bei arglistig verschwiegenen Mängeln gilt die
                  regelmäßige Verjährung von drei Jahren ab Kenntnis (§ 438 Abs. 3 i.V.m. §§ 195,
                  199 BGB) — hier ist sogar nach Jahren noch ein Vorgehen möglich.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was ist eine wirksame Beschaffenheitsvereinbarung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nach § 434 BGB ist die Sache mangelfrei, wenn sie die vereinbarte Beschaffenheit
                  hat. Eine wirksame Beschaffenheitsvereinbarung muss konkret sein — pauschale
                  Klauseln wie „in vereinbartem Zustand" sind wertlos. Beim Autokauf etwa:
                  Kilometerstand, Vorbesitzer, Unfallfreiheit, Service-Historie sollten
                  ausdrücklich genannt werden. Was im Vertrag schwarz auf weiß steht, ist im
                  Streitfall verbindlich. Mündliche Zusagen sind beweispflichtig.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was bringt ein Eigentumsvorbehalt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ein Eigentumsvorbehalt nach § 449 BGB bedeutet: Der Verkäufer bleibt Eigentümer
                  der Sache, bis der Kaufpreis vollständig bezahlt ist. Für den Käufer ist das
                  relevant, wenn er die Sache nicht sofort vollständig bezahlt — denn bei
                  Zahlungsverzug kann der Verkäufer die Sache zurückverlangen. Für den Verkäufer
                  ist es eine wichtige Sicherung. Eine klare und ausdrückliche Vereinbarung im
                  Vertrag ist nötig — stillschweigender Eigentumsvorbehalt ist nicht möglich.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die KI-Prüfung eines Kaufvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif
                  (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif
                  (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim
                  Anwalt kostet typischerweise 100–300 € pro Vertrag — die KI-Analyse spart dir
                  gerade beim Autokauf, Möbelkauf oder anderen größeren Anschaffungen erhebliche
                  Kosten.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt die KI-Prüfung einen Anwalt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine
                  Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für komplexe
                  Geschäfte (Immobilienkauf, Unternehmensbeteiligungen, gewerblicher Großhandel),
                  bei laufenden Streitigkeiten über Sachmängel oder bei sehr hohen Kaufpreisen
                  bleibt ein Fachanwalt unverzichtbar. Die KI-Analyse ist eine fundierte
                  Vorprüfung und senkt im Anwaltsgespräch oft die Beratungskosten erheblich.
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

              <Link to="/blog/autokauf-vertrag-gewaehrleistung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f97316' }}><BookOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Autokauf-Vertrag im Detail</div>
                  <div className={styles.relatedDescription}>
                    Gewährleistung, Sachmängel & Rücktritt beim Autokauf — der ausführliche Ratgeber
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
                  Bevor du unterschreibst — lass deinen Kaufvertrag in 60 Sekunden prüfen.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 87 % der Nutzer finden mindestens eine kritische Klausel, die sie sonst
                  übersehen hätten. Lade deinen Kaufvertrag hoch und erhalte den Risiko-Report
                  in unter 60 Sekunden.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Kaufvertrag jetzt prüfen
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

export default KaufvertragPruefen;

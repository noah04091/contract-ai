import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import LandingFooter from "../../components/LandingFooter";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, ThumbsUp,
  Sparkles, Scale, Briefcase, Gavel, Lock, Award,
  Info, DollarSign
} from "lucide-react";

const AgenturvertragPruefen: React.FC = () => {
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
        "name": "Agenturvertrag prüfen",
        "item": "https://www.contract-ai.de/agenturvertrag-pruefen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie genau ist die KI-Prüfung eines Agenturvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen Risiko-Klauseln in Agenturverträgen. Sie kennt das Werkvertrags- und Dienstvertragsrecht der §§ 611, 631 ff. BGB, die AGB-Kontrolle der §§ 305 ff. BGB, das Urheberrechtsgesetz (UrhG) zur Übertragung von Nutzungsrechten sowie die einschlägige Rechtsprechung zu Mindestlaufzeiten, automatischen Verlängerungen und Haftungsbeschränkungen. Bei komplexen Konstellationen wie Joint Ventures oder strategischen Markenkooperationen empfehlen wir ergänzend einen Fachanwalt für Wirtschaftsrecht."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Klauseln in Agenturverträgen sind häufig problematisch?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Zu den häufigsten Risiko-Klauseln zählen: überlange Mindestlaufzeiten (12-24 Monate) ohne Sonderkündigungsrecht, automatische Verlängerung um ein weiteres Jahr (oft unwirksam nach § 309 Nr. 9 BGB), vage Leistungsbeschreibungen ohne konkrete Deliverables, Pauschalvergütungen ohne Stunden-Cap, fehlende oder einseitige Übertragung von Nutzungsrechten (UrhG), einseitige Geheimhaltungspflichten zugunsten der Agentur, überzogene Haftungsbeschränkungen sowie ungünstige Gerichtsstands-Klauseln am Sitz der Agentur."
        }
      },
      {
        "@type": "Question",
        "name": "Wie lange darf eine Mindestlaufzeit in einem Agenturvertrag dauern?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine konkrete gesetzliche Höchstdauer gibt es nicht - die Bindungsdauer muss aber nach Treu und Glauben (§ 242 BGB) und AGB-Kontrolle (§ 307 BGB) verhältnismäßig sein. Marktüblich sind 6-12 Monate für laufende Services, 24 Monate werden oft als Obergrenze toleriert. Längere Bindungen ohne triftigen Grund (z.B. Investitionen der Agentur in Aufbau) werden von Gerichten regelmäßig kritisch beurteilt. Wichtig: Ein außerordentliches Kündigungsrecht aus wichtigem Grund (§ 314 BGB) bleibt immer bestehen - auch wenn der Vertrag das ausschließen will."
        }
      },
      {
        "@type": "Question",
        "name": "Wem gehören die Arbeitsergebnisse (Logo, Website, Texte)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Standardmäßig bleibt das Urheberrecht beim Schöpfer (der Agentur). Damit du als Auftraggeber das Arbeitsergebnis frei nutzen kannst, muss der Vertrag eine Übertragung von Nutzungsrechten enthalten (§§ 31, 32 UrhG). Wichtig: Es gibt einfache und ausschließliche Nutzungsrechte. Für Logo, Corporate Design und Webseite solltest du auf ein ausschließliches, zeitlich und räumlich unbeschränktes Nutzungsrecht für alle bekannten und unbekannten Nutzungsarten bestehen (sog. Total-Buy-out). Andernfalls kann die Agentur das gleiche Design für andere Kunden nutzen oder die Nutzung später einschränken."
        }
      },
      {
        "@type": "Question",
        "name": "Was passiert bei automatischer Vertragsverlängerung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine automatische stillschweigende Verlängerung um ein weiteres Jahr ist nach § 309 Nr. 9 BGB nur dann zulässig, wenn die Verlängerung höchstens ein Jahr beträgt UND die Kündigungsfrist nicht länger als drei Monate vor Ende der Laufzeit ist. Häufige Falle: Kündigungsfristen von sechs Monaten oder länger sind in AGB unwirksam. Wenn du eine solche Klausel im Vertrag hast und die Kündigungsfrist versäumst, kannst du dich trotzdem mit der gesetzlichen Frist von drei Monaten lösen."
        }
      },
      {
        "@type": "Question",
        "name": "Was muss in der Leistungsbeschreibung stehen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine wirksame Leistungsbeschreibung muss konkret und messbar sein. Pauschale Formulierungen wie 'Marketing-Beratung' oder 'Performance-Optimierung' sind im Streitfall wertlos. Verlange immer: konkrete Deliverables (z.B. 1 Blog-Artikel pro Woche, 4 Social-Posts, monatlicher Performance-Report), Stunden-Volumen oder Mengen-Caps, Reporting-Intervalle, klare Definition was bei Nicht-Erreichen passiert (Minderung, Nachbesserung, Rücktritt). Werkverträge (§ 631 BGB) verlangen einen erfolgsorientierten Leistungsschuldner, Dienstverträge (§ 611 BGB) nur Tätigkeit — der Unterschied ist im Streitfall entscheidend."
        }
      },
      {
        "@type": "Question",
        "name": "Welche Haftungsbeschränkungen der Agentur sind zulässig?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nach § 309 Nr. 7 BGB ist ein vollständiger Haftungsausschluss in AGB unzulässig — die Agentur muss immer für Schäden aus Verletzung des Lebens, des Körpers oder der Gesundheit sowie für grobes Verschulden voll haften. Bei einfacher Fahrlässigkeit darf die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt werden — aber nur, wenn keine wesentliche Vertragspflicht (sog. Kardinalpflicht) betroffen ist. Klauseln wie 'Wir haften nur bei Vorsatz' sind in AGB regelmäßig unwirksam. Bei Schäden durch DSGVO-Verstöße oder fehlerhafte Kampagnen ist die volle Haftung oft erhalten."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet die KI-Prüfung eines Agenturvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt für Wirtschaftsrecht kostet typischerweise 200-500 € pro Vertrag — die KI-Analyse spart dir gerade beim Vergleich mehrerer Agentur-Angebote erhebliche Kosten."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Fachanwalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für komplexe Konstellationen (Joint Ventures, strategische Markenkooperationen, internationale Agentur-Verträge), bei laufenden Streitigkeiten oder bei hochwertigen Aufträgen mit fünf- bis sechsstelligem Volumen bleibt ein Fachanwalt für Wirtschaftsrecht unverzichtbar. Die KI-Analyse ist eine fundierte Vorprüfung und senkt im Anwaltsgespräch oft die Beratungskosten erheblich."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Agenturvertrag mit KI prüfen lassen",
    "description": "In drei Schritten von der hochgeladenen PDF-Datei zur fertigen Risikoanalyse deines Agenturvertrags.",
    "totalTime": "PT1M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Agenturvertrag hochladen",
        "text": "Lade deinen Agenturvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt 256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Automatische KI-Analyse",
        "text": "Die KI prüft jede Klausel gegen das Werkvertrags- und Dienstvertragsrecht der §§ 611, 631 ff. BGB, die AGB-Kontrolle nach §§ 305 ff. BGB und das Urheberrechtsgesetz (UrhG). Mindestlaufzeit, Verlängerungsklauseln, Leistungsbeschreibung, Nutzungsrechte und Haftungsbeschränkungen werden bewertet."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Detaillierten Report erhalten",
        "text": "Du erhältst einen Report mit Chancen-Risiken-Score, einer Liste markierter Problemstellen mit Paragraphen-Verweis und konkreten Verhandlungsempfehlungen — als interaktive Ansicht und als PDF-Export."
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Agenturvertrag prüfen kostenlos – KI-Check für Marketing & Digital | Contract AI</title>
        <meta name="description" content="Agenturvertrag mit KI prüfen: Mindestlaufzeit, Nutzungsrechte, automatische Verlängerung & Pauschalvergütung in 60 Sek. checken. Für Marketing-, Digital- und PR-Agenturen. Kostenlos." />
        <meta name="keywords" content="Agenturvertrag prüfen, Agenturvertrag prüfen lassen, Marketingagentur Vertrag prüfen, Digitalagentur Vertrag prüfen, PR-Agentur Vertrag, Werbeagentur Vertrag prüfen, Agentur-Vertrag KI, Nutzungsrechte prüfen" />

        <link rel="canonical" href="https://www.contract-ai.de/agenturvertrag-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Agenturvertrag prüfen kostenlos – KI-Check für Marketing & Digital | Contract AI" />
        <meta property="og:description" content="Agenturvertrag mit KI prüfen: Mindestlaufzeit, Nutzungsrechte & versteckte Fallen in 60 Sek. checken. Für Marketing-, Digital- und PR-Agenturen. Kostenlos." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/agenturvertrag-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Agenturvertrag prüfen kostenlos – KI-Check für Marketing & Digital | Contract AI" />
        <meta name="twitter:description" content="Agenturvertrag mit KI prüfen: Mindestlaufzeit, Nutzungsrechte & versteckte Fallen in 60 Sek. checken. Für Marketing-, Digital- und PR-Agenturen." />
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
                Für Auftraggeber von Marketing-, Digital- &amp; PR-Agenturen
              </div>

              <h1 className={styles.heroTitle}>
                Agenturvertrag prüfen lassen<br/>
                <span className={styles.heroTitleHighlight}>versteckte Fallen in 60 Sekunden erkennen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Lass deinen Agenturvertrag von einer KI prüfen, die überlange Mindestlaufzeiten,
                vage Leistungsbeschreibungen und versteckte Nutzungsrechts-Klauseln auf Basis
                des BGB und Urheberrechtsgesetz (UrhG) sofort erkennt. DSGVO-konform,
                Server in Deutschland.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Agenturvertrag jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fallen" className={styles.btnSecondary}>
                  Die 8 typischsten Fallen
                </a>
              </div>
            </div>

            {/* Demo Window — Agenturvertrag-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>BGB + UrhG geprüft</div>
                  <div className={styles.floatingSubtext}>rechtssicher</div>
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
                      <span className={styles.demoScoreValue}>57</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Vertrags-Score</div>
                      <div className={styles.demoScoreTitle}>Agenturvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Mindestlaufzeit 24 Monate ohne Sonderkündigung</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Nutzungsrechte unklar geregelt</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Reporting-Pflicht klar definiert</span>
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
              Geprüft nach BGB &amp; UrhG
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
              <h2 className={styles.sectionTitle}>Was die KI in deinem Agenturvertrag prüft</h2>
              <p className={styles.sectionSubtitle}>
                Acht zentrale Klauseltypen werden gegen Werkvertrags-, Dienstvertrags- und
                Urheberrecht sowie die AGB-Kontrolle abgeglichen.
              </p>
            </div>

            <div className={styles.functionsGrid4col}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Mindestlaufzeit &amp; Kündigung</h3>
                <p className={styles.functionDesc}>
                  Bindung und Sonderkündigungsrecht nach § 314 BGB.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Automatische Verlängerung</h3>
                <p className={styles.functionDesc}>
                  Stillschweigende Verlängerung nach § 309 Nr. 9 BGB.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Leistungsbeschreibung</h3>
                <p className={styles.functionDesc}>
                  Konkrete Deliverables, KPIs &amp; Reporting-Pflichten.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <DollarSign size={24} />
                </div>
                <h3 className={styles.functionTitle}>Vergütung &amp; Stunden-Cap</h3>
                <p className={styles.functionDesc}>
                  Transparenz-Check bei Pauschalen und Aufwandsvergütung.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Award size={24} />
                </div>
                <h3 className={styles.functionTitle}>Nutzungsrechte (UrhG)</h3>
                <p className={styles.functionDesc}>
                  Wem gehört Logo, Website, Texte – einfache oder ausschließliche Nutzung?
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <Lock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Geheimhaltung</h3>
                <p className={styles.functionDesc}>
                  Einseitige vs. wechselseitige Vertraulichkeit, Wettbewerbsklauseln.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Haftungsbeschränkungen</h3>
                <p className={styles.functionDesc}>
                  Grenzen der AGB-Kontrolle nach § 309 Nr. 7 BGB.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <Briefcase size={24} />
                </div>
                <h3 className={styles.functionTitle}>Gerichtsstand &amp; Recht</h3>
                <p className={styles.functionDesc}>
                  Verbraucherschutz nach § 38 ZPO, faire Streitbeilegung.
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
                <h2 className={styles.sectionTitleLeft}>68 % der Agenturverträge benachteiligen den Auftraggeber unangemessen</h2>
                <p className={styles.problemText}>
                  Marketing-, Digital- und PR-Agenturen arbeiten mit eigenen Vertragsvorlagen,
                  die in der Regel zu ihren Gunsten formuliert sind. Auftraggeber unterschreiben
                  diese Verträge oft im Vertrauen auf die Kompetenz der Agentur — und merken
                  erst Monate später, dass sie an überlange Laufzeiten gebunden sind, Nutzungsrechte
                  am eigenen Logo nicht uneingeschränkt erhalten haben oder bei schlechter
                  Performance keine Möglichkeit zur Trennung haben. Das Tückische: Einmal
                  unterschrieben, ist die Verhandlungsmacht weg.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>68%</div>
                    <div className={styles.problemStatLabel}>der Agenturverträge enthalten einseitige Klauseln</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>12.000 €</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Schaden bei vorzeitiger Vertragsauflösung</div>
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
                      <div className={styles.problemDocTitle}>Agenturvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>16 Seiten • Hochgeladen heute</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...Mindestlaufzeit von 24 Monaten, automatische Verlängerung um jeweils 12 Monate..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Lange Bindung
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Auto-Verlängerung
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
                      200–500 € pro Vertrag, Terminvereinbarung, Tage Wartezeit —
                      während die Agentur auf Unterschrift drängt.
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
                      Sofortige Risiko-Erkennung mit Paragraphen-Verweis, BGB-/UrhG-Check
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
                <h2 className={styles.sectionTitleLeft}>Agenturvertrag prüfen, bevor du unterschreibst — auf juristischer Basis</h2>
                <p className={styles.solutionText}>
                  Die KI von Contract AI kennt das Werkvertragsrecht (§§ 631 ff. BGB), das
                  Dienstvertragsrecht (§§ 611 ff. BGB), das Urheberrechtsgesetz (UrhG) zur
                  Übertragung von Nutzungsrechten und die AGB-Kontrolle (§§ 305 ff. BGB).
                  Sie wendet diese Regeln sofort auf jede Klausel deines Vertrags an.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Search size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klausel-für-Klausel-Bewertung</h4>
                      <p>Jede Klausel gegen BGB + UrhG + AGB-Kontrolle geprüft</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Gavel size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Verhandlungs-Hebel erkennen</h4>
                      <p>Wo du nachverhandeln solltest — mit klarer Begründung</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <ThumbsUp size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klartext für Auftraggeber</h4>
                      <p>Direkt umsetzbare Empfehlungen, kein Juristendeutsch</p>
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
              <h2 className={styles.sectionTitle}>Die 8 typischsten Fallen in Agenturverträgen</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Klauseltypen sind in der Praxis am häufigsten unwirksam oder
                einseitig zugunsten der Agentur formuliert — genau hier schaut unsere KI besonders genau hin.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* FALLE 1: Überlange Mindestlaufzeit */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>1. Überlange Mindestlaufzeit ohne Sonderkündigung</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Vertrag wird für eine feste Laufzeit von 24 Monaten geschlossen. Eine ordentliche Kündigung vor Ablauf der Mindestlaufzeit ist ausgeschlossen."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Eine zweijährige Bindung ohne Sonderkündigungsrecht ist in AGB häufig unwirksam (<strong>§ 307 BGB</strong>). Das außerordentliche Kündigungsrecht aus wichtigem Grund nach <strong>§ 314 BGB</strong> bleibt immer bestehen — auch wenn der Vertrag das ausschließen will. Marktüblich sind 6-12 Monate Bindung mit klar definierten Sonderkündigungsrechten (z.B. bei verfehlten KPIs).</span>
                </div>
              </div>

              {/* FALLE 2: Automatische Verlängerung */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>2. Automatische stillschweigende Verlängerung</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Vertrag verlängert sich automatisch um jeweils 12 Monate, wenn er nicht 6 Monate vor Ablauf schriftlich gekündigt wird."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 309 Nr. 9 BGB</strong> ist eine automatische Verlängerung um ein weiteres Jahr nur dann zulässig, wenn die Kündigungsfrist <strong>maximal drei Monate</strong> vor Ende der Laufzeit beträgt. Eine sechs-Monats-Kündigungsfrist ist regelmäßig unwirksam — du kannst dich also mit der gesetzlichen Frist von drei Monaten lösen.</span>
                </div>
              </div>

              {/* FALLE 3: Vage Leistungsbeschreibung */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>3. Vage Leistungsbeschreibung ohne KPIs</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Die Agentur erbringt fortlaufende Marketing-Beratung und Performance-Optimierung für den Auftraggeber."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Pauschale Formulierungen ohne konkrete Deliverables sind im Streitfall wertlos. Bei <strong>Werkverträgen (§ 631 BGB)</strong> schuldet die Agentur einen Erfolg, bei <strong>Dienstverträgen (§ 611 BGB)</strong> nur Tätigkeit. Verlange konkrete Mengen (z.B. 4 Blog-Artikel/Monat), Stunden-Caps, Reporting-Intervalle und klare Rechtsfolgen bei Nicht-Erreichen (Minderung, Nachbesserung, Rücktritt).</span>
                </div>
              </div>

              {/* FALLE 4: Pauschalvergütung ohne Cap */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>4. Pauschalvergütung ohne Stunden-Cap</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die monatliche Vergütung beträgt 4.500 € netto pauschal für alle Marketing-Leistungen der Agentur."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Pauschalvergütungen ohne klar definierten Leistungsumfang sind ein Einfallstor für minimalen Aufwand bei maximaler Marge. Bestehe auf <strong>transparenter Aufwandserfassung</strong>: definierte Mindeststunden pro Monat, Reporting-Pflicht zum Aufwand, klare Regelung was bei Nicht-Ausschöpfung des Volumens passiert (Übertrag, Rückerstattung, Mehrleistung).</span>
                </div>
              </div>

              {/* FALLE 5: Fehlende oder einseitige Nutzungsrechte */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>5. Fehlende oder einseitige Nutzungsrechte (UrhG)</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Die Agentur räumt dem Auftraggeber ein einfaches, zeitlich auf die Vertragslaufzeit beschränktes Nutzungsrecht an den erstellten Werken ein."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§§ 31, 32 UrhG</strong> bleibt das Urheberrecht grundsätzlich bei der Agentur. Ein „einfaches, zeitlich beschränktes" Nutzungsrecht bedeutet: Sobald der Vertrag endet, darfst du dein eigenes Logo nicht mehr verwenden. Bestehe auf einem <strong>ausschließlichen, zeitlich und räumlich unbeschränkten Nutzungsrecht für alle bekannten und unbekannten Nutzungsarten</strong> („Total-Buy-out") — sonst gehört dein Corporate Design faktisch der Agentur.</span>
                </div>
              </div>

              {/* FALLE 6: Einseitige Geheimhaltung */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>6. Einseitige Geheimhaltungspflicht</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Der Auftraggeber verpflichtet sich, alle Informationen über Methoden, Tools und Strategien der Agentur vertraulich zu behandeln."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Häufig wird nur der Auftraggeber zur Geheimhaltung verpflichtet — die Agentur darf weiterhin mit Branchen-Insights anderer Kunden arbeiten. Verlange eine <strong>wechselseitige Geheimhaltungspflicht (Mutual NDA)</strong>, die auch deine Kundendaten, Geschäftsstrategien und KPIs schützt. Achte zusätzlich darauf, dass die Agentur nicht parallel für direkte Wettbewerber arbeitet, ohne dich zu informieren.</span>
                </div>
              </div>

              {/* FALLE 7: Überzogene Haftungsbegrenzung */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>7. Überzogene Haftungsbegrenzung der Agentur</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Die Haftung der Agentur ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Die Haftungssumme ist auf den Auftragswert beschränkt."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 309 Nr. 7 BGB</strong> sind vollständige Haftungsausschlüsse in AGB unzulässig. Die Agentur muss immer für Schäden aus Verletzung des Lebens, des Körpers oder der Gesundheit sowie für <strong>Verletzung wesentlicher Vertragspflichten (Kardinalpflichten)</strong> auch bei einfacher Fahrlässigkeit haften. Bei Schäden durch DSGVO-Verstöße, fehlerhafte Kampagnen oder Markenrechtsverletzungen ist die volle Haftung oft erhalten.</span>
                </div>
              </div>

              {/* FALLE 8: Ungünstiger Gerichtsstand */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>8. Gerichtsstand am Sitz der Agentur</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Ausschließlicher Gerichtsstand für alle Streitigkeiten ist der Sitz der Agentur."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Bei Verträgen mit Verbrauchern ist eine ausschließliche Gerichtsstandvereinbarung nach <strong>§ 38 ZPO</strong> häufig unzulässig. Bei Geschäftsführer-Verträgen ist sie zwar wirksam, aber praktisch ungünstig: Ein Verfahren in einer fremden Stadt kostet zusätzlichen Aufwand. Verlange einen <strong>neutralen Gerichtsstand</strong> oder das Wahlrecht des Auftraggebers. Bei reinen Online-Streitigkeiten ist außerdem eine Mediations- oder Schiedsklausel oft sinnvoll.</span>
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
              <h2 className={styles.sectionTitle}>In drei Schritten zur fertigen Analyse</h2>
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
                    <h3 className={styles.processTitle}>Agenturvertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      Lade deinen Agenturvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt
                      256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische KI-Analyse</h3>
                    <p className={styles.processDesc}>
                      Die KI prüft jede Klausel gegen das BGB-Werkvertragsrecht, das UrhG zur
                      Übertragung von Nutzungsrechten und die AGB-Kontrolle. Mindestlaufzeit,
                      Verlängerung, Leistungsbeschreibung und Haftung werden bewertet.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Detaillierten Report erhalten</h3>
                    <p className={styles.processDesc}>
                      Du erhältst einen Report mit Chancen-Risiken-Score, markierten Problemstellen
                      mit Paragraphen-Verweis und konkreten Verhandlungsempfehlungen — als
                      interaktive Ansicht und als PDF-Export.
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
              <h2 className={styles.sectionTitle}>Warum Contract AI für deinen Agenturvertrag?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum die KI-Prüfung mehr ist als ein Online-Tool.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Gavel size={28} />
                </div>
                <h3 className={styles.whyTitle}>BGB + UrhG + AGB-Kontrolle</h3>
                <p className={styles.whyDesc}>
                  Werkvertragsrecht, Urheberrecht und AGB-Kontrolle werden auf jede Klausel
                  angewendet — automatisch.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO &amp; Server in Deutschland</h3>
                <p className={styles.whyDesc}>
                  Dein Agenturvertrag enthält oft sensible Geschäftsdaten. Verarbeitung
                  ausschließlich auf EU-Servern, keine Weitergabe.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <BookOpen size={28} />
                </div>
                <h3 className={styles.whyTitle}>Verhandlungs-Hebel statt Juristendeutsch</h3>
                <p className={styles.whyDesc}>
                  Du bekommst nicht nur „Klausel X ist problematisch", sondern „Verhandle Punkt
                  Y zu Punkt Z" — direkt umsetzbar.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Schnell genug für die Verhandlung</h3>
                <p className={styles.whyDesc}>
                  Wenn die Agentur auf sofortige Unterschrift drängt, hast du in 60 Sekunden
                  die fundierte Antwort — direkt am Verhandlungstisch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 9 — RATGEBER
            ========================================== */}
        <section className={styles.problemSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Ratgeber</span>
              <h2 className={styles.sectionTitle}>Worauf du bei der Prüfung deines Agenturvertrags wirklich achten solltest</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Ein Agenturvertrag ist kein Standardvertrag — er ist ein hochgradig
                individualisiertes Konstrukt zwischen Auftraggeber und Dienstleister. Marketing-,
                Digital-, PR- und Werbeagenturen haben in der Regel jahrelang an ihren
                Vertragsvorlagen gefeilt, oft mit Hilfe spezialisierter Anwaltskanzleien.
                Auftraggeber unterschreiben diese Verträge dagegen meist ohne juristische
                Vorbereitung — und stehen im Nachhinein vor Problemen, die mit etwas
                Vorab-Prüfung leicht hätten vermieden werden können.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Werkvertrag oder Dienstvertrag — der entscheidende Unterschied
              </h3>
              <p className={styles.problemText}>
                Eine der wichtigsten Fragen beim Agenturvertrag ist die Einordnung als
                <strong> Werkvertrag (§ 631 BGB)</strong> oder <strong>Dienstvertrag (§ 611 BGB)</strong>.
                Beim Werkvertrag schuldet die Agentur einen konkreten Erfolg (z.B. „fertiges Logo",
                „funktionierende Website") — bei Nicht-Erreichen hast du Anspruch auf Nachbesserung,
                Minderung oder Rücktritt. Beim Dienstvertrag schuldet die Agentur nur die Tätigkeit
                (z.B. „laufende SEO-Beratung") — ohne Erfolgsgarantie. Im Streitfall ist diese
                Einordnung entscheidend. Achte deshalb auf klare Sprache: „Erstellung" (Werk) vs.
                „Beratung" (Dienst).
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Nutzungsrechte — wem gehört dein Logo wirklich?
              </h3>
              <p className={styles.problemText}>
                Das deutsche Urheberrecht (UrhG) folgt einem klaren Prinzip: Das Urheberrecht
                bleibt immer beim Schöpfer (also der Agentur), übertragen werden können nur
                <strong> Nutzungsrechte (§ 31 UrhG)</strong>. Diese gibt es in zwei Varianten:
                Das <em>einfache Nutzungsrecht</em> erlaubt dir die Nutzung, aber die Agentur
                darf das Werk auch anderen Kunden anbieten. Das <em>ausschließliche Nutzungsrecht</em>
                schließt diese Möglichkeit aus — nur du darfst das Werk nutzen. Für Logo, Corporate
                Design, Webseite und Marketingmaterial solltest du auf ein <strong>ausschließliches,
                zeitlich und räumlich unbeschränktes Nutzungsrecht für alle bekannten und unbekannten
                Nutzungsarten</strong> bestehen — auch „Total-Buy-out" genannt. Andernfalls kannst
                du dein Corporate Design nach Vertragsende möglicherweise nicht mehr verwenden.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                AGB-Kontrolle — die unsichtbare Schutzmauer
              </h3>
              <p className={styles.problemText}>
                Die meisten Agenturverträge sind <strong>Allgemeine Geschäftsbedingungen (AGB)</strong> im
                Sinne der §§ 305 ff. BGB. Das ist für Auftraggeber gut, denn AGB unterliegen einer
                strengen Inhaltskontrolle. Klauseln, die den Auftraggeber unangemessen benachteiligen
                (§ 307 BGB), sind unwirksam — auch wenn sie unterschrieben wurden. Typische unwirksame
                Klauseln: Haftungsausschlüsse über die zulässigen Grenzen hinaus, automatische
                Verlängerungen ohne klare Kündigungsfrist, Verzichtsklauseln auf gesetzliche Rechte.
                Wichtig zu wissen: Ist eine AGB-Klausel unwirksam, bleibt der Vertrag im Übrigen
                bestehen (§ 306 BGB) — die unwirksame Klausel wird durch das Gesetz ersetzt.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Performance-Verträge — wenn KPIs zur Falle werden
              </h3>
              <p className={styles.problemText}>
                Bei Performance-orientierten Agenturen (SEO, Performance-Marketing,
                Influencer-Marketing) ist die Definition der Erfolgsmessung entscheidend. Häufige
                Fallen: Die Agentur definiert KPIs, die schwer messbar sind („Brand Awareness"),
                liefert Reports nur auf Anfrage oder nutzt Eigene-Tools für die Messung. Verlange
                <strong> objektiv messbare KPIs</strong> (z.B. „Top-10-Ranking für 5 definierte Keywords",
                „min. 100 qualifizierte Leads pro Quartal"), monatliches Reporting in einem
                neutralen Tool und klare Rechtsfolgen bei Nicht-Erreichen (Minderung, Bonus-Malus-System,
                Sonderkündigungsrecht).
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Was tun, wenn du eine unwirksame Klausel entdeckst?
              </h3>
              <p className={styles.problemText}>
                Eine unwirksame Klausel macht <strong>nicht den ganzen Vertrag unwirksam</strong>.
                Nach § 306 Abs. 1 BGB bleibt der Vertrag im Übrigen bestehen — die problematische
                Klausel wird durch die gesetzliche Regelung ersetzt. Für dich als Auftraggeber
                ist das fast immer ein Vorteil: Eine unwirksame Haftungsbegrenzung bedeutet volle
                Haftung der Agentur. Eine unwirksame automatische Verlängerung bedeutet kurzfristige
                Kündigungsmöglichkeit. Eine fehlende Übertragung von Nutzungsrechten bedeutet
                Verhandlungsmacht für die Zukunft.
              </p>

              <p className={styles.problemText} style={{ marginTop: '1.5rem' }}>
                Bei besonders hochwertigen Geschäften (5- bis 6-stellige Aufträge, internationale
                Joint Ventures, strategische Markenkooperationen) empfehlen wir zusätzlich einen
                Fachanwalt für Wirtschaftsrecht. Die KI-Analyse ist eine fundierte Erst-Risikoanalyse,
                ersetzt aber keine individuelle Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes
                (RDG). Lies dazu auch unseren{' '}
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
              <span className={styles.sectionEyebrow}>Fragen &amp; Antworten</span>
              <h2 className={styles.sectionTitle}>Häufige Fragen zum Agenturvertrag-Check</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Prüfung eines Agenturvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen
                  Risiko-Klauseln in Agenturverträgen. Sie kennt das Werkvertrags- und
                  Dienstvertragsrecht der §§ 611, 631 ff. BGB, die AGB-Kontrolle der §§ 305 ff.
                  BGB, das Urheberrechtsgesetz (UrhG) zur Übertragung von Nutzungsrechten sowie
                  die einschlägige Rechtsprechung zu Mindestlaufzeiten, automatischen
                  Verlängerungen und Haftungsbeschränkungen. Bei komplexen Konstellationen wie
                  Joint Ventures oder strategischen Markenkooperationen empfehlen wir ergänzend
                  einen Fachanwalt für Wirtschaftsrecht.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Klauseln in Agenturverträgen sind häufig problematisch?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Zu den häufigsten Risiko-Klauseln zählen: überlange Mindestlaufzeiten (12-24
                  Monate) ohne Sonderkündigungsrecht, automatische Verlängerung um ein weiteres
                  Jahr (oft unwirksam nach § 309 Nr. 9 BGB), vage Leistungsbeschreibungen ohne
                  konkrete Deliverables, Pauschalvergütungen ohne Stunden-Cap, fehlende oder
                  einseitige Übertragung von Nutzungsrechten (UrhG), einseitige
                  Geheimhaltungspflichten zugunsten der Agentur, überzogene Haftungsbeschränkungen
                  sowie ungünstige Gerichtsstands-Klauseln am Sitz der Agentur.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie lange darf eine Mindestlaufzeit in einem Agenturvertrag dauern?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine konkrete gesetzliche Höchstdauer gibt es nicht — die Bindungsdauer muss
                  aber nach Treu und Glauben (§ 242 BGB) und AGB-Kontrolle (§ 307 BGB)
                  verhältnismäßig sein. Marktüblich sind 6-12 Monate für laufende Services, 24
                  Monate werden oft als Obergrenze toleriert. Längere Bindungen ohne triftigen
                  Grund werden von Gerichten regelmäßig kritisch beurteilt. Wichtig: Ein
                  außerordentliches Kündigungsrecht aus wichtigem Grund (§ 314 BGB) bleibt immer
                  bestehen — auch wenn der Vertrag das ausschließen will.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wem gehören die Arbeitsergebnisse (Logo, Website, Texte)?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Standardmäßig bleibt das Urheberrecht beim Schöpfer (der Agentur). Damit du
                  als Auftraggeber das Arbeitsergebnis frei nutzen kannst, muss der Vertrag
                  eine Übertragung von Nutzungsrechten enthalten (§§ 31, 32 UrhG). Wichtig: Es
                  gibt einfache und ausschließliche Nutzungsrechte. Für Logo, Corporate Design
                  und Webseite solltest du auf ein ausschließliches, zeitlich und räumlich
                  unbeschränktes Nutzungsrecht für alle bekannten und unbekannten Nutzungsarten
                  bestehen. Andernfalls kann die Agentur das gleiche Design für andere Kunden
                  nutzen oder die Nutzung später einschränken.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was passiert bei automatischer Vertragsverlängerung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine automatische stillschweigende Verlängerung um ein weiteres Jahr ist nach
                  § 309 Nr. 9 BGB nur dann zulässig, wenn die Verlängerung höchstens ein Jahr
                  beträgt UND die Kündigungsfrist nicht länger als drei Monate vor Ende der
                  Laufzeit ist. Häufige Falle: Kündigungsfristen von sechs Monaten oder länger
                  sind in AGB unwirksam. Wenn du eine solche Klausel im Vertrag hast und die
                  Kündigungsfrist versäumst, kannst du dich trotzdem mit der gesetzlichen Frist
                  von drei Monaten lösen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was muss in der Leistungsbeschreibung stehen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine wirksame Leistungsbeschreibung muss konkret und messbar sein. Pauschale
                  Formulierungen wie „Marketing-Beratung" oder „Performance-Optimierung" sind
                  im Streitfall wertlos. Verlange immer: konkrete Deliverables (z.B. „1
                  Blog-Artikel pro Woche, 4 Social-Posts, monatlicher Performance-Report"),
                  Stunden-Volumen oder Mengen-Caps, Reporting-Intervalle, klare Definition was
                  bei Nicht-Erreichen passiert. Werkverträge (§ 631 BGB) verlangen einen
                  erfolgsorientierten Leistungsschuldner, Dienstverträge (§ 611 BGB) nur Tätigkeit
                  — der Unterschied ist im Streitfall entscheidend.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Haftungsbeschränkungen der Agentur sind zulässig?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nach § 309 Nr. 7 BGB ist ein vollständiger Haftungsausschluss in AGB
                  unzulässig — die Agentur muss immer für Schäden aus Verletzung des Lebens,
                  des Körpers oder der Gesundheit sowie für grobes Verschulden voll haften. Bei
                  einfacher Fahrlässigkeit darf die Haftung auf den vertragstypischen,
                  vorhersehbaren Schaden begrenzt werden — aber nur, wenn keine wesentliche
                  Vertragspflicht („Kardinalpflicht") betroffen ist. Klauseln wie „Wir haften
                  nur bei Vorsatz" sind in AGB regelmäßig unwirksam. Bei Schäden durch
                  DSGVO-Verstöße ist die volle Haftung oft erhalten.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die KI-Prüfung eines Agenturvertrags?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19
                  €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat)
                  sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt für
                  Wirtschaftsrecht kostet typischerweise 200-500 € pro Vertrag — die KI-Analyse
                  spart dir gerade beim Vergleich mehrerer Agentur-Angebote erhebliche Kosten.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt die KI-Prüfung einen Fachanwalt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine
                  Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für komplexe
                  Konstellationen (Joint Ventures, strategische Markenkooperationen,
                  internationale Agentur-Verträge), bei laufenden Streitigkeiten oder bei
                  hochwertigen Aufträgen mit fünf- bis sechsstelligem Volumen bleibt ein
                  Fachanwalt für Wirtschaftsrecht unverzichtbar. Die KI-Analyse ist eine
                  fundierte Vorprüfung und senkt im Anwaltsgespräch oft die Beratungskosten
                  erheblich.
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
                  Bevor du den Agenturvertrag unterschreibst — lass ihn in 60 Sekunden prüfen.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 87 % der Nutzer finden mindestens eine kritische Klausel, die sie sonst
                  übersehen hätten. Lade deinen Agenturvertrag hoch und erhalte den Risiko-Report
                  in unter 60 Sekunden.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Agenturvertrag jetzt prüfen
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <LandingFooter />
    </>
  );
};

export default AgenturvertragPruefen;

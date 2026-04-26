import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import Footer from "../../components/Footer";
import {
  Search, Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, ThumbsUp,
  Languages, Sparkles, Scale, Lock, Gavel,
  Info, Users
} from "lucide-react";

const NdaPruefen: React.FC = () => {
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
        "name": "NDA prüfen",
        "item": "https://www.contract-ai.de/nda-pruefen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie genau ist die KI-Prüfung eines NDA?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen Risiko-Klauseln in Geheimhaltungsvereinbarungen. Sie kennt das Geschäftsgeheimnisgesetz (GeschGehG), die §§ 305 ff. BGB zur AGB-Kontrolle, § 343 BGB zur Vertragsstrafenherabsetzung sowie die einschlägige Rechtsprechung zu Wettbewerbsverboten in Geheimhaltungsvereinbarungen. Bei komplexen internationalen NDAs (Cross-Border, US-Common-Law-Klauseln) empfehlen wir ergänzend einen Fachanwalt für IT- und Wirtschaftsrecht."
        }
      },
      {
        "@type": "Question",
        "name": "Worauf muss ich bei einem NDA besonders achten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die wichtigsten Prüfpunkte sind: angemessene Geheimhaltungsdauer (Standard 2-3 Jahre, max. 5), verhältnismäßige Vertragsstrafe (kein pauschaler Mondpreis), klare Definition der vertraulichen Informationen (nicht 'alles ist vertraulich'), die fünf Standard-Carve-Outs (öffentlich bekannt, vorher bekannt, unabhängig entwickelt, von Dritten erhalten, gesetzlich vorgeschrieben), kein verstecktes Wettbewerbsverbot, und ein praktikabler Gerichtsstand (bei deutschen Parteien deutsches Recht und deutscher Gerichtsstand)."
        }
      },
      {
        "@type": "Question",
        "name": "Wie lange darf ein NDA gelten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Es gibt keine gesetzlich starre Höchstgrenze, aber die Bindungsdauer muss nach Treu und Glauben (§ 242 BGB) verhältnismäßig sein. Marktüblich sind 2-3 Jahre nach Beendigung des Vertragsverhältnisses, in einzelnen Branchen bis zu 5 Jahre. Unbefristete Geheimhaltungsklauseln werden von Gerichten regelmäßig als unverhältnismäßig angesehen und können nach AGB-Kontrolle (§§ 307 ff. BGB) unwirksam sein. Eine Ausnahme sind echte Geschäftsgeheimnisse i.S.d. § 2 Nr. 1 GeschGehG, deren Schutz so lange währt, wie sie geheim bleiben."
        }
      },
      {
        "@type": "Question",
        "name": "Was ist eine angemessene Vertragsstrafe in einem NDA?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine Vertragsstrafe muss in einem angemessenen Verhältnis zum geschützten Interesse und zum potenziellen Schaden stehen. Pauschale Mondbeträge wie '100.000 € pro Verstoß' sind häufig unwirksam. Nach § 343 BGB kann das Gericht eine unverhältnismäßig hohe Vertragsstrafe auf das angemessene Maß herabsetzen. Übliche Größenordnungen liegen zwischen 5.000 € und 50.000 € pro Einzelfall, abhängig vom Wert der Information und der Marktposition der Parteien."
        }
      },
      {
        "@type": "Question",
        "name": "Was sind die fünf Standard-Carve-Outs in einem NDA?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "In jedem professionellen NDA müssen fünf Ausnahmen von der Geheimhaltungspflicht stehen: (1) Informationen, die ohne Verschulden des Empfangenden öffentlich bekannt werden, (2) Informationen, die dem Empfangenden bereits vor Erhalt bekannt waren, (3) Informationen, die der Empfangende unabhängig und nachweislich selbst entwickelt, (4) Informationen, die der Empfangende rechtmäßig von Dritten ohne Geheimhaltungspflicht erhält, (5) Informationen, deren Offenlegung gesetzlich oder behördlich vorgeschrieben ist. Fehlt auch nur einer dieser Carve-Outs, kann das gesamte NDA unangemessen benachteiligend sein."
        }
      },
      {
        "@type": "Question",
        "name": "Mutual NDA oder einseitiges NDA — was ist besser?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Das hängt von der konkreten Situation ab. Wenn nur eine Partei vertrauliche Informationen weitergibt (z.B. ein Investor erhält Pitchdeck-Daten von einem Startup), ist ein einseitiges (one-way) NDA ausreichend. Wenn beide Parteien vertrauliche Informationen austauschen — was in den meisten B2B-Verhandlungen der Fall ist — sollte ein gegenseitiges (mutual) NDA verwendet werden. Wenn dir ein einseitiges NDA vorgelegt wird, obwohl du selbst sensible Informationen einbringen wirst, fordere die Umstellung auf mutual."
        }
      },
      {
        "@type": "Question",
        "name": "Darf in einem NDA ein Wettbewerbsverbot versteckt sein?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Hier ist Vorsicht geboten. Klauseln, die dem Empfangenden über die Geheimhaltung hinaus die Tätigkeit in einem bestimmten Geschäftsfeld untersagen, sind häufig unwirksam — entweder wegen Sittenwidrigkeit (§ 138 BGB), wegen unangemessener Benachteiligung (§ 307 BGB) oder kartellrechtlich (§ 1 GWB). Echte Wettbewerbsverbote sind separat zu vereinbaren und nur unter engen Voraussetzungen zulässig. Ein versteckter Wettbewerbsausschluss in einem NDA wird von Gerichten regelmäßig kritisch beurteilt."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet die KI-Prüfung eines NDA?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt für IT- und Wirtschaftsrecht kostet typischerweise 200–500 € pro NDA — die KI-Analyse spart dir gerade bei häufigen Verhandlungen erhebliche Kosten."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Fachanwalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für komplexe internationale NDAs (Cross-Border, US-Common-Law), bei laufenden Streitigkeiten über Geheimnisverletzung oder bei strategisch hochwertigen Geschäften (M&A, Investorenrunden) bleibt ein Fachanwalt für Wirtschaftsrecht unverzichtbar. Die KI-Analyse ist eine fundierte Vorprüfung und senkt im Anwaltsgespräch oft die Beratungskosten erheblich."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "NDA mit KI prüfen lassen",
    "description": "In drei Schritten von der hochgeladenen PDF-Datei zur fertigen Risikoanalyse deiner Geheimhaltungsvereinbarung.",
    "totalTime": "PT1M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "NDA hochladen",
        "text": "Lade dein NDA als PDF oder DOCX hoch. Die Übertragung erfolgt 256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Automatische KI-Analyse",
        "text": "Die KI prüft jede Klausel gegen das Geschäftsgeheimnisgesetz (GeschGehG), die §§ 305 ff. BGB zur AGB-Kontrolle und § 343 BGB zur Vertragsstrafenherabsetzung. Geheimhaltungsdauer, Vertragsstrafe, Schutzbereich, Carve-Outs und versteckte Wettbewerbsverbote werden bewertet."
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
        <title>NDA prüfen lassen – KI-Analyse in 60 Sek. | Contract AI</title>
        <meta name="description" content="NDA prüfen lassen mit KI: überzogene Vertragsstrafen, fehlende Carve-Outs, verstecktes Wettbewerbsverbot in 60 Sekunden erkennen. Auf Basis Geschäftsgeheimnisgesetz (GeschGehG). DSGVO-konform, Server in Deutschland. ✓ Kostenlos starten" />
        <meta name="keywords" content="NDA prüfen, NDA prüfen lassen, NDA Check, Geheimhaltungsvereinbarung prüfen, NDA online prüfen, NDA KI prüfen, Non Disclosure Agreement prüfen, Geheimhaltungsvertrag prüfen, NDA analysieren, Mutual NDA prüfen" />

        <link rel="canonical" href="https://www.contract-ai.de/nda-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="NDA prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta property="og:description" content="NDA prüfen lassen mit KI: überzogene Vertragsstrafen & versteckte Klauseln in 60 Sekunden erkennen. Basierend auf GeschGehG. DSGVO-konform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/nda-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NDA prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta name="twitter:description" content="NDA prüfen lassen mit KI: überzogene Vertragsstrafen & versteckte Klauseln in 60 Sekunden erkennen. Basierend auf GeschGehG." />
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
                Für Startups, Freelancer & Unternehmen
              </div>

              <h1 className={styles.heroTitle}>
                NDA prüfen lassen<br/>
                <span className={styles.heroTitleHighlight}>überzogene Klauseln in 60 Sekunden erkennen</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Lass deine Geheimhaltungsvereinbarung von einer KI prüfen, die überzogene
                Vertragsstrafen, fehlende Carve-Outs und verstecktes Wettbewerbsverbot
                auf Basis des Geschäftsgeheimnisgesetzes (GeschGehG) sofort erkennt.
                DSGVO-konform, Server in Deutschland.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  NDA jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fallen" className={styles.btnSecondary}>
                  Die 8 typischsten Fallen
                </a>
              </div>
            </div>

            {/* Demo Window — NDA-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>GeschGehG-konform</div>
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
                      <span className={styles.demoScoreValue}>54</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>NDA-Score</div>
                      <div className={styles.demoScoreTitle}>NDA-Investor.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Vertragsstrafe von 100.000 € unverhältnismäßig</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Carve-Out für unabhängige Entwicklung fehlt</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Geheimhaltungsdauer 3 Jahre — angemessen</span>
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
              Geprüft nach GeschGehG
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
              <h2 className={styles.sectionTitle}>Was die KI in deinem NDA prüft</h2>
              <p className={styles.sectionSubtitle}>
                Acht zentrale Klauseltypen werden gegen das Geschäftsgeheimnisgesetz
                und die marktüblichen Standards abgeglichen.
              </p>
            </div>

            <div className={styles.functionsGrid}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Lock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Schutzumfang</h3>
                <p className={styles.functionDesc}>
                  Klare Definition der vertraulichen Informationen nach § 2 GeschGehG.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Vertragsstrafe</h3>
                <p className={styles.functionDesc}>
                  Verhältnismäßigkeit nach § 343 BGB — pauschale Mondbeträge sind oft unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Geheimhaltungsdauer</h3>
                <p className={styles.functionDesc}>
                  Marktüblich 2-3 Jahre, max. 5 — unbefristete Klauseln häufig unwirksam.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <CheckCircle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Carve-Outs</h3>
                <p className={styles.functionDesc}>
                  Die fünf Standard-Ausnahmen (öffentlich bekannt, vorher bekannt etc.).
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Users size={24} />
                </div>
                <h3 className={styles.functionTitle}>Mutual vs einseitig</h3>
                <p className={styles.functionDesc}>
                  Beidseitige Geheimhaltung bei zwei-seitigem Informationsaustausch.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Verstecktes Wettbewerbsverbot</h3>
                <p className={styles.functionDesc}>
                  Knebelnde Klauseln nach § 138 BGB / § 1 GWB werden erkannt.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <BookOpen size={24} />
                </div>
                <h3 className={styles.functionTitle}>Gerichtsstand & Recht</h3>
                <p className={styles.functionDesc}>
                  Bei deutschen Parteien sollten deutsches Recht und Gerichtsstand vereinbart sein.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <Languages size={24} />
                </div>
                <h3 className={styles.functionTitle}>Rückgabe & Löschung</h3>
                <p className={styles.functionDesc}>
                  Pflichten zur Rückgabe oder Vernichtung von Unterlagen nach Beendigung.
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
                <h2 className={styles.sectionTitleLeft}>Über 60 % der NDAs benachteiligen den Empfangenden unangemessen</h2>
                <p className={styles.problemText}>
                  NDAs werden in den meisten B2B-Verhandlungen ungelesen unterschrieben. Was harmlos
                  als „Standard-Geheimhaltungsvereinbarung" daherkommt, enthält in über sechs von zehn
                  Fällen Klauseln, die einer rechtlichen Überprüfung nicht standhalten oder dich
                  unverhältnismäßig binden. Vertragsstrafen in fünfstelliger Höhe ohne klaren Bezug
                  zum Schaden, unbefristete Geheimhaltungsdauern, fehlende Carve-Outs für unabhängig
                  entwickeltes Wissen — und manchmal sogar versteckte Wettbewerbsverbote, die dich
                  jahrelang aus deinem Markt drängen können. Das Tückische: Einmal unterschrieben,
                  ist die Verhandlungsmacht weg.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>60%</div>
                    <div className={styles.problemStatLabel}>der NDAs enthalten unverhältnismäßige Klauseln</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>15.000 €</div>
                    <div className={styles.problemStatLabel}>durchschnittlicher Streitwert bei NDA-Auseinandersetzungen</div>
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
                      <div className={styles.problemDocTitle}>NDA-Investor.pdf</div>
                      <div className={styles.problemDocSubtitle}>8 Seiten • Hochgeladen heute</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...bei jedem Verstoß gegen die Geheimhaltungspflicht eine Vertragsstrafe in Höhe von 100.000 €..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Unverhältnismäßig
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Unbefristete Bindung
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
                      200–500 € pro NDA, Terminvereinbarung, mehrere Werktage Wartezeit —
                      während die Verhandlung weiterläuft.
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
                      Sofortige Risiko-Erkennung mit Paragraphen-Verweis, GeschGehG-Konformitätscheck
                      und konkreten Verhandlungspunkten.
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
                <h2 className={styles.sectionTitleLeft}>NDA-Prüfung im Sekundentakt — direkt vor der Verhandlung</h2>
                <p className={styles.solutionText}>
                  Die KI von Contract AI kennt das Geschäftsgeheimnisgesetz (GeschGehG), die §§ 305 ff.
                  BGB zur AGB-Kontrolle, § 343 BGB zur Vertragsstrafenherabsetzung und die marktüblichen
                  Standards für professionelle NDAs. Sie wendet sie sofort auf jede Klausel deiner
                  Geheimhaltungsvereinbarung an.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Search size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klausel-für-Klausel-Bewertung</h4>
                      <p>Jede Klausel wird gegen GeschGehG und BGB-AGB-Kontrolle geprüft</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Gavel size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Verhandlungs-Hebel erkennen</h4>
                      <p>Wo du nachverhandeln kannst — und wo du standfest bleiben solltest</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <ThumbsUp size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h4>Klartext für Geschäftsleute</h4>
                      <p>Keine juristische Vorbildung nötig — die Empfehlungen sind direkt umsetzbar</p>
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
              <h2 className={styles.sectionTitle}>Die 8 typischsten Fallen in einem NDA</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Klauseltypen sind in der Praxis am häufigsten unverhältnismäßig oder
                rechtlich angreifbar — und genau hier schaut unsere KI besonders genau hin.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* FALLE 1: Unbegrenzte Geheimhaltungsdauer */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>1. Unbegrenzte Geheimhaltungsdauer</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Die Geheimhaltungsverpflichtung gilt zeitlich unbegrenzt fort."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Eine zeitlich unbegrenzte Geheimhaltungspflicht in einem Formular-NDA wird von Gerichten regelmäßig als unangemessene Benachteiligung nach <strong>§ 307 Abs. 1 BGB</strong> bewertet und ist häufig unwirksam. Marktüblich sind <strong>2-3 Jahre</strong> nach Ende der Geschäftsbeziehung, in Ausnahmefällen bis 5 Jahre. Echte Geschäftsgeheimnisse i.S.d. § 2 Nr. 1 GeschGehG sind ohnehin auch ohne NDA so lange geschützt, wie sie geheim bleiben.</span>
                </div>
              </div>

              {/* FALLE 2: Überzogene Vertragsstrafe */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>2. Überzogene Vertragsstrafe</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Bei jedem Verstoß gegen die Geheimhaltungspflicht zahlt der Empfangende eine Vertragsstrafe in Höhe von 100.000 €."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Pauschale Mondbeträge ohne Bezug zum konkreten Schaden sind nach <strong>§ 343 BGB</strong> regelmäßig unwirksam — das Gericht kann unverhältnismäßig hohe Vertragsstrafen herabsetzen. Marktüblich liegen NDA-Vertragsstrafen bei 5.000–50.000 € pro Einzelfall, gestaffelt nach Schwere und Wert der Information. Bei Formularklauseln greift zusätzlich die AGB-Kontrolle nach §§ 305 ff. BGB.</span>
                </div>
              </div>

              {/* FALLE 3: Zu weiter Schutzbereich */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>3. Zu weit gefasster Schutzbereich</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Sämtliche Informationen jeglicher Art, die der Empfangende erhält, gelten als vertraulich."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Pauschale Klauseln, die <em>alle</em> Informationen für vertraulich erklären, sind häufig zu unbestimmt. Nach <strong>§ 2 Nr. 1 GeschGehG</strong> ist ein Geschäftsgeheimnis nur eine Information, die nicht allgemein bekannt oder ohne Weiteres zugänglich ist, einen wirtschaftlichen Wert hat und durch angemessene Geheimhaltungsmaßnahmen geschützt wird. Eine NDA-Definition muss diesem Maßstab folgen — sonst läuft der vermeintliche Schutz ins Leere.</span>
                </div>
              </div>

              {/* FALLE 4: Fehlende Carve-Outs */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>4. Fehlende Standard-Carve-Outs</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Empfangende verpflichtet sich zur uneingeschränkten Geheimhaltung aller erhaltenen Informationen." (Ohne Ausnahmen-Klausel)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ein professionelles NDA enthält <strong>fünf Standard-Ausnahmen</strong>: (1) öffentlich bekannt, (2) bereits vor Erhalt bekannt, (3) unabhängig entwickelt, (4) rechtmäßig von Dritten erhalten, (5) gesetzlich oder behördlich zur Offenlegung verpflichtet. Fehlen diese Carve-Outs, ist die Klausel typischerweise nach <strong>§ 307 BGB</strong> unangemessen benachteiligend — und das gesamte NDA verlierte ggf. seine Wirksamkeit.</span>
                </div>
              </div>

              {/* FALLE 5: Einseitige Geheimhaltung trotz mutual exchange */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>5. Einseitige Geheimhaltung trotz beidseitigem Austausch</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Der Empfangende ist zur Geheimhaltung verpflichtet." (Nur eine Partei genannt, obwohl beide sensibel Informationen austauschen)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Wenn beide Parteien vertrauliche Informationen einbringen — typisch in Joint Ventures, M&A-Verhandlungen oder Beratungsmandaten — sollte ein <strong>Mutual NDA</strong> vereinbart werden. Eine einseitige Klausel ist Verhandlungssache und kein Naturgesetz: Verlange die Umstellung auf gegenseitige Geheimhaltung. Andernfalls bist du gebunden, deine Gegenseite aber frei.</span>
                </div>
              </div>

              {/* FALLE 6: Verstecktes Wettbewerbsverbot */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>6. Verstecktes Wettbewerbsverbot</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Empfangende verpflichtet sich, für 5 Jahre nach Vertragsende keine Geschäftstätigkeit im Bereich [...] auszuüben."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Wettbewerbsverbote, die als Geheimhaltungspflicht getarnt sind, werden von Gerichten kritisch geprüft. Sie können wegen Sittenwidrigkeit (<strong>§ 138 BGB</strong>), unangemessener Benachteiligung (<strong>§ 307 BGB</strong>) oder kartellrechtlich (<strong>§ 1 GWB</strong>) unwirksam sein. Echte Wettbewerbsverbote sind separat zu vereinbaren und nur unter engen Voraussetzungen zulässig.</span>
                </div>
              </div>

              {/* FALLE 7: Ungünstiger Gerichtsstand & Recht */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>7. Ungünstiger Gerichtsstand und anwendbares Recht</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Anwendbares Recht: Recht des Staates Delaware (USA). Gerichtsstand: New York."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Wenn beide Vertragsparteien deutsche Unternehmen oder Privatpersonen sind, sollten <strong>deutsches Recht und ein deutscher Gerichtsstand</strong> vereinbart werden. Bei Verbrauchergeschäften ist die Wahl eines ausländischen Gerichtsstands nach <strong>§ 38 ZPO</strong> meist sogar unzulässig. Ein Verfahren in den USA kann je nach Streitwert sechsstellige Anwaltskosten verursachen — auch bei Recht-Bekommen.</span>
                </div>
              </div>

              {/* FALLE 8: Fehlende Rückgabe-/Löschpflicht */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>8. Fehlende Rückgabe- und Löschpflicht</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Häufig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Bei Beendigung des Vertragsverhältnisses endet die Geheimhaltungspflicht." (Keine Aussage zu Rückgabe/Löschung)
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ein professionelles NDA regelt, was nach Vertragsende mit den vertraulichen Unterlagen passiert: vollständige <strong>Rückgabe oder Vernichtung</strong> aller Dokumente, einschließlich digitaler Kopien, Backups und E-Mail-Archive — innerhalb einer angemessenen Frist (üblich 14-30 Tage). Mit DSGVO-Bezug auch dokumentierte Löschbestätigung. Fehlt diese Pflicht, bleiben deine sensiblen Daten dauerhaft beim Empfangenden.</span>
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
              <h2 className={styles.sectionTitle}>In drei Schritten zur fertigen NDA-Analyse</h2>
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
                    <h3 className={styles.processTitle}>NDA hochladen</h3>
                    <p className={styles.processDesc}>
                      Lade dein NDA als PDF oder DOCX hoch. Die Übertragung erfolgt
                      256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische KI-Analyse</h3>
                    <p className={styles.processDesc}>
                      Die KI prüft jede Klausel gegen das Geschäftsgeheimnisgesetz (GeschGehG),
                      §§ 305 ff. BGB zur AGB-Kontrolle und § 343 BGB. Geheimhaltungsdauer,
                      Vertragsstrafe, Schutzbereich, Carve-Outs und versteckte Wettbewerbsverbote
                      werden bewertet.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Detaillierten Report erhalten</h3>
                    <p className={styles.processDesc}>
                      Du erhältst einen Report mit Chancen-Risiken-Score, einer Liste markierter
                      Problemstellen mit Paragraphen-Verweis und konkreten Verhandlungsempfehlungen
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
              <h2 className={styles.sectionTitle}>Warum Contract AI für dein NDA?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum die KI-Prüfung mehr ist als ein Online-Tool.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Gavel size={28} />
                </div>
                <h3 className={styles.whyTitle}>GeschGehG & BGB-AGB-Kontrolle</h3>
                <p className={styles.whyDesc}>
                  Geschäftsgeheimnisgesetz, §§ 305 ff. BGB und § 343 BGB werden auf jede
                  Klausel angewendet — automatisch.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>DSGVO & Server in Deutschland</h3>
                <p className={styles.whyDesc}>
                  Dein NDA enthält oft sensible Geschäftsdaten. Verarbeitung ausschließlich auf
                  EU-Servern, keine Weitergabe, kein Modell-Training mit deinen Daten.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <BookOpen size={28} />
                </div>
                <h3 className={styles.whyTitle}>Verhandlungs-Hebel statt Juristendeutsch</h3>
                <p className={styles.whyDesc}>
                  Du bekommst nicht nur „Klausel X ist problematisch", sondern „Verhandle Punkt Y
                  zu Punkt Z" — direkt umsetzbar.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Zap size={28} />
                </div>
                <h3 className={styles.whyTitle}>Schnell genug für die Verhandlung</h3>
                <p className={styles.whyDesc}>
                  Wenn das NDA mittags ankommt und nachmittags unterschrieben werden soll, hast
                  du in 60 Sekunden die fundierte Antwort.
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
              <h2 className={styles.sectionTitle}>Worauf du bei der Prüfung deines NDA wirklich achten solltest</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Ein NDA — Non-Disclosure Agreement, auf Deutsch Geheimhaltungsvereinbarung — ist
                der Standardvertrag, bevor in B2B-Verhandlungen sensible Informationen ausgetauscht
                werden. Was als „Formalität" daherkommt, kann dich jahrelang binden, in
                fünfstellige Vertragsstrafen treiben oder dir komplette Geschäftsfelder verschließen.
                Seit Inkrafttreten des Geschäftsgeheimnisgesetzes (GeschGehG) im April 2019 sind
                die rechtlichen Anforderungen gestiegen — und gleichzeitig sind viele am Markt
                kursierende NDA-Vorlagen nicht mehr auf dem aktuellen Stand.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Was nach GeschGehG ein Geschäftsgeheimnis ist — und was nicht
              </h3>
              <p className={styles.problemText}>
                Nach <strong>§ 2 Nr. 1 GeschGehG</strong> ist ein Geschäftsgeheimnis eine Information,
                die (a) weder allgemein bekannt noch ohne Weiteres zugänglich ist, (b) einen
                wirtschaftlichen Wert besitzt und (c) durch <em>angemessene Geheimhaltungsmaßnahmen</em>
                geschützt wird. Genau dieser dritte Punkt ist neu und entscheidend: Wenn du selbst
                deine Informationen nicht aktiv schützt (Zugriffskontrollen, Verschlüsselung,
                Awareness der Mitarbeiter), genießt du auch über ein NDA hinaus keinen rechtlichen
                Schutz. Eine NDA-Klausel, die pauschal „alle Informationen jeglicher Art" für
                vertraulich erklärt, läuft am Maßstab des Gesetzes vorbei und ist in vielen
                Streitfällen wertlos.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Geheimhaltungsdauer — kürzer ist meistens besser
              </h3>
              <p className={styles.problemText}>
                Marktüblich sind NDA-Geheimhaltungsdauern von <strong>2 bis 3 Jahren</strong> nach
                Beendigung der Geschäftsbeziehung. In bestimmten Branchen (Pharma, Defense,
                strategische Forschung) sind 5 Jahre vertretbar. Unbefristete Klauseln sind in
                Formularverträgen nach AGB-Kontrolle (§ 307 Abs. 1 BGB) regelmäßig unwirksam.
                Wichtig zu wissen: Echte Geschäftsgeheimnisse sind nach GeschGehG ohnehin so lange
                geschützt, wie sie geheim bleiben — du brauchst dafür keine ewige NDA-Klausel.
                Eine kürzere Frist gibt dir und der Gegenseite Planungssicherheit, ohne den Schutz
                wirklich zu schwächen.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Vertragsstrafe — angemessen und gestaffelt
              </h3>
              <p className={styles.problemText}>
                Pauschale Vertragsstrafen wie „100.000 € pro Verstoß" sind häufig unverhältnismäßig
                und können nach <strong>§ 343 BGB</strong> vom Gericht herabgesetzt werden.
                Angemessen sind Beträge zwischen 5.000 € und 50.000 € pro Einzelfall, die in einem
                erkennbaren Verhältnis zum potenziellen Schaden stehen. Eine professionelle
                Vertragsstrafenklausel staffelt nach Schwere des Verstoßes und enthält ein
                ausdrückliches Recht auf Geltendmachung weitergehender Schadensersatzansprüche.
                Bei Formularklauseln greift zusätzlich die AGB-Kontrolle nach §§ 305 ff. BGB —
                ein gestalterischer Spielraum für Mondbeträge besteht praktisch nicht.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Die fünf Standard-Carve-Outs — pflichtlektüre für jedes NDA
              </h3>
              <p className={styles.problemText}>
                Jedes professionelle NDA enthält fünf Ausnahmen, in denen die Geheimhaltungspflicht
                <em>nicht</em> greift: (1) Informationen, die ohne Verschulden des Empfangenden
                öffentlich bekannt werden; (2) Informationen, die dem Empfangenden bereits vor
                Erhalt nachweislich bekannt waren; (3) Informationen, die der Empfangende
                <em>unabhängig</em> entwickelt; (4) Informationen, die der Empfangende rechtmäßig
                von Dritten ohne Geheimhaltungspflicht erhält; (5) Informationen, deren Offenlegung
                gesetzlich, behördlich oder gerichtlich vorgeschrieben ist. Wenn diese Carve-Outs
                fehlen, gerät der Empfangende in eine unmögliche Situation: Er weiß nie sicher,
                ob eine bestimmte Information überhaupt vom NDA erfasst ist — und dann gilt im
                Zweifel die strenge Klausel.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Mutual NDA vs einseitiges NDA — wann was?
              </h3>
              <p className={styles.problemText}>
                Wenn nur eine Partei vertrauliche Informationen weitergibt — etwa ein Startup an
                einen potenziellen Investor — ist ein einseitiges (one-way) NDA passend. In den
                meisten B2B-Verhandlungen tauschen aber <em>beide</em> Parteien Informationen aus:
                der Kunde nennt Anforderungen und Budget, der Anbieter zeigt Lösungsansätze und
                Preise. In diesen Fällen ist ein gegenseitiges (mutual) NDA der Standard. Wenn dir
                jemand ein einseitiges NDA vorlegt, du aber selbst sensible Informationen einbringen
                wirst, ist die Umstellung auf mutual eine vernünftige und gut begründbare Forderung.
              </p>

              <p className={styles.problemText} style={{ marginTop: '1.5rem' }}>
                Bei strategisch hochwertigen Geschäften — M&A-Verhandlungen, Investorenrunden,
                internationalen Joint Ventures — empfehlen wir zusätzlich einen Fachanwalt für
                Wirtschaftsrecht oder IT-Recht. Die KI-Analyse ist eine fundierte Erst-Risikoanalyse,
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
                <div className={styles.statLabel}>Analysezeit pro NDA</div>
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
              <h2 className={styles.sectionTitle}>Häufige Fragen zum NDA-Check</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie genau ist die KI-Prüfung eines NDA?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Unsere KI erreicht eine Erkennungsgenauigkeit von 98 % bei klassischen
                  Risiko-Klauseln in Geheimhaltungsvereinbarungen. Sie kennt das
                  Geschäftsgeheimnisgesetz (GeschGehG), die §§ 305 ff. BGB zur AGB-Kontrolle,
                  § 343 BGB zur Vertragsstrafenherabsetzung sowie die einschlägige Rechtsprechung
                  zu Wettbewerbsverboten in Geheimhaltungsvereinbarungen. Bei komplexen
                  internationalen NDAs (Cross-Border, US-Common-Law-Klauseln) empfehlen wir
                  ergänzend einen Fachanwalt für IT- und Wirtschaftsrecht.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Worauf muss ich bei einem NDA besonders achten?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die wichtigsten Prüfpunkte sind: angemessene Geheimhaltungsdauer (Standard
                  2-3 Jahre, max. 5), verhältnismäßige Vertragsstrafe (kein pauschaler Mondpreis),
                  klare Definition der vertraulichen Informationen (nicht "alles ist vertraulich"),
                  die fünf Standard-Carve-Outs (öffentlich bekannt, vorher bekannt, unabhängig
                  entwickelt, von Dritten erhalten, gesetzlich vorgeschrieben), kein verstecktes
                  Wettbewerbsverbot, und ein praktikabler Gerichtsstand (bei deutschen Parteien
                  deutsches Recht und deutscher Gerichtsstand).
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie lange darf ein NDA gelten?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Es gibt keine gesetzlich starre Höchstgrenze, aber die Bindungsdauer muss nach
                  Treu und Glauben (§ 242 BGB) verhältnismäßig sein. Marktüblich sind 2-3 Jahre
                  nach Beendigung des Vertragsverhältnisses, in einzelnen Branchen bis zu 5 Jahre.
                  Unbefristete Geheimhaltungsklauseln werden von Gerichten regelmäßig als
                  unverhältnismäßig angesehen und können nach AGB-Kontrolle (§§ 307 ff. BGB)
                  unwirksam sein. Eine Ausnahme sind echte Geschäftsgeheimnisse i.S.d. § 2 Nr. 1
                  GeschGehG, deren Schutz so lange währt, wie sie geheim bleiben.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was ist eine angemessene Vertragsstrafe in einem NDA?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine Vertragsstrafe muss in einem angemessenen Verhältnis zum geschützten
                  Interesse und zum potenziellen Schaden stehen. Pauschale Mondbeträge wie
                  "100.000 € pro Verstoß" sind häufig unwirksam. Nach § 343 BGB kann das Gericht
                  eine unverhältnismäßig hohe Vertragsstrafe auf das angemessene Maß herabsetzen.
                  Übliche Größenordnungen liegen zwischen 5.000 € und 50.000 € pro Einzelfall,
                  abhängig vom Wert der Information und der Marktposition der Parteien.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was sind die fünf Standard-Carve-Outs in einem NDA?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  In jedem professionellen NDA müssen fünf Ausnahmen von der Geheimhaltungspflicht
                  stehen: (1) Informationen, die ohne Verschulden des Empfangenden öffentlich
                  bekannt werden, (2) Informationen, die dem Empfangenden bereits vor Erhalt
                  bekannt waren, (3) Informationen, die der Empfangende unabhängig und nachweislich
                  selbst entwickelt, (4) Informationen, die der Empfangende rechtmäßig von Dritten
                  ohne Geheimhaltungspflicht erhält, (5) Informationen, deren Offenlegung
                  gesetzlich oder behördlich vorgeschrieben ist. Fehlt auch nur einer dieser
                  Carve-Outs, kann das gesamte NDA unangemessen benachteiligend sein.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Mutual NDA oder einseitiges NDA — was ist besser?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Das hängt von der konkreten Situation ab. Wenn nur eine Partei vertrauliche
                  Informationen weitergibt (z.B. ein Investor erhält Pitchdeck-Daten von einem
                  Startup), ist ein einseitiges (one-way) NDA ausreichend. Wenn beide Parteien
                  vertrauliche Informationen austauschen — was in den meisten B2B-Verhandlungen
                  der Fall ist — sollte ein gegenseitiges (mutual) NDA verwendet werden. Wenn dir
                  ein einseitiges NDA vorgelegt wird, obwohl du selbst sensible Informationen
                  einbringen wirst, fordere die Umstellung auf mutual.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Darf in einem NDA ein Wettbewerbsverbot versteckt sein?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Hier ist Vorsicht geboten. Klauseln, die dem Empfangenden über die Geheimhaltung
                  hinaus die Tätigkeit in einem bestimmten Geschäftsfeld untersagen, sind häufig
                  unwirksam — entweder wegen Sittenwidrigkeit (§ 138 BGB), wegen unangemessener
                  Benachteiligung (§ 307 BGB) oder kartellrechtlich (§ 1 GWB). Echte
                  Wettbewerbsverbote sind separat zu vereinbaren und nur unter engen
                  Voraussetzungen zulässig. Ein versteckter Wettbewerbsausschluss in einem NDA
                  wird von Gerichten regelmäßig kritisch beurteilt.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet die KI-Prüfung eines NDA?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif
                  (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif
                  (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim
                  Anwalt für IT- und Wirtschaftsrecht kostet typischerweise 200–500 € pro NDA —
                  die KI-Analyse spart dir gerade bei häufigen Verhandlungen erhebliche Kosten.
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
                  internationale NDAs (Cross-Border, US-Common-Law), bei laufenden Streitigkeiten
                  über Geheimnisverletzung oder bei strategisch hochwertigen Geschäften (M&A,
                  Investorenrunden) bleibt ein Fachanwalt für Wirtschaftsrecht unverzichtbar. Die
                  KI-Analyse ist eine fundierte Vorprüfung und senkt im Anwaltsgespräch oft die
                  Beratungskosten erheblich.
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
                  Bevor du unterschreibst — lass dein NDA in 60 Sekunden prüfen.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Über 87 % der Nutzer finden mindestens eine kritische Klausel, die sie sonst
                  übersehen hätten. Lade dein NDA hoch und erhalte den Risiko-Report in unter
                  60 Sekunden.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    NDA jetzt prüfen
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

export default NdaPruefen;

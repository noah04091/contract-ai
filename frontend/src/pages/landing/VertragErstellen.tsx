import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import LandingFooter from "../../components/LandingFooter";
import {
  Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown,
  Sparkles, Scale, MessageSquare, PenTool, Users, Briefcase
} from "lucide-react";

const VertragErstellen: React.FC = () => {
  const { user } = useAuth();
  const targetInApp = "/generate";
  const target = user ? targetInApp : `/login?next=${encodeURIComponent(targetInApp)}`;

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
        "name": "Vertrag erstellen",
        "item": "https://www.contract-ai.de/vertrag-erstellen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Welche Verträge kann ich mit Contract AI erstellen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der KI-Generator kennt 16 Vertragstypen: Arbeitsvertrag, Mietvertrag, Kaufvertrag, Freelancer-Vertrag, NDA (Geheimhaltungsvereinbarung), Werkvertrag, Beratervertrag, Darlehensvertrag, Gesellschaftsvertrag, Aufhebungsvertrag, Lizenzvertrag, Pachtvertrag, Kooperationsvertrag, Software-Lizenz für Endkunden, Software-Vertriebsvertrag und einen frei beschreibbaren individuellen Vertrag für alles, was nicht in dieses Raster passt."
        }
      },
      {
        "@type": "Question",
        "name": "Ist ein selbst erstellter Vertrag rechtsgültig?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Grundsätzlich ja: In Deutschland gilt Vertragsfreiheit (§ 311 Abs. 1 BGB). Ein Vertrag kommt durch zwei übereinstimmende Willenserklärungen zustande und ist in den meisten Fällen formfrei wirksam. Wichtig sind die Ausnahmen: Manche Verträge verlangen die Schriftform oder sogar notarielle Beurkundung, etwa die Bürgschaft (§ 766 BGB), die Befristung im Arbeitsvertrag (§ 14 Abs. 4 TzBfG) oder der Grundstückskauf (§ 311b BGB). Ein Formverstoß macht das Geschäft nach § 125 BGB nichtig."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet es, einen Vertrag zu erstellen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Start ist kostenlos: Du registrierst dich gratis und kannst Verträge erstellen und in der Vorschau ansehen. Den vollständigen Vertragstext schaltest du entweder einmalig für 9,90 € pro Vertrag frei, ganz ohne Abo, oder du nutzt ein Abo, in dem die Vertragserstellung enthalten ist. So zahlst du nur, wenn dir das Ergebnis wirklich gefällt."
        }
      },
      {
        "@type": "Question",
        "name": "Was unterscheidet den KI-Generator von einer kostenlosen Vorlage?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine Vorlage aus dem Netz wurde für einen fremden Fall geschrieben: andere Parteien, andere Leistung, oft veralteter Rechtsstand. Der KI-Generator arbeitet umgekehrt: Er fragt deinen konkreten Fall ab (Parteien, Leistung, Vergütung, Laufzeit) und stellt bei Unklarheiten Rückfragen im Chat, statt Lücken mit erfundenen Angaben zu füllen. Das Ergebnis ist ein individueller Vertragsentwurf als fertig formatiertes PDF statt eines Musters von der Stange."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich den Vertrag online unterschreiben lassen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Freigeschaltete Verträge kannst du direkt aus Contract AI heraus zur digitalen Signatur versenden: Dein Vertragspartner erhält einen Link, unterschreibt online, und beide Seiten bekommen das signierte Dokument. Drucken, Einscannen und Hin- und Herschicken entfallen."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt der Vertragsgenerator einen Anwalt?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein. Der Generator erstellt strukturierte, individuelle Vertragsentwürfe, er leistet aber keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Für Standardsituationen ist das in der Regel eine solide Grundlage. Bei hohen Summen, komplexen Beteiligungen oder Sonderkonstellationen (z. B. Unternehmensverkauf, Immobilien) solltest du den Entwurf anwaltlich prüfen oder gleich anwaltlich erstellen lassen."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich einen Vertrag ohne Anwalt aufsetzen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Für viele Alltagsfälle ja: Freelancer-Auftrag, NDA, privater Kaufvertrag oder Darlehen im Bekanntenkreis lassen sich ohne Anwalt aufsetzen, solange die Eckpunkte klar geregelt sind (wer, was, wieviel, wie lange, wie kündbar). Entscheidend ist, typische Fehler zu vermeiden: schwammige Leistungsbeschreibung, übersehene Formvorschriften und unwirksame Klauseln aus alten Mustern. Genau diese Punkte fragt der Generator systematisch ab."
        }
      },
      {
        "@type": "Question",
        "name": "Erfindet die KI Vertragsinhalte, die ich nicht angegeben habe?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein, das ist eine bewusste Grundregel des Generators: Fehlen wichtige Angaben, stellt die KI eine Rückfrage im Chat, statt Namen, Beträge oder Fristen zu erfinden. Der fertige Vertrag enthält deine Angaben, keine ausgedachten Details."
        }
      },
      {
        "@type": "Question",
        "name": "Was mache ich mit einem Vertrag, den ich bekommen habe?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Dafür gibt es die KI-Vertragsanalyse: Vertrag hochladen oder abfotografieren, und in wenigen Minuten bekommst du Risiken, Fristen und eine verständliche Einschätzung, mit wörtlichen Belegen aus deinem Dokument. Erstellen und Prüfen greifen ineinander: Beides liegt danach in deiner Vertragsverwaltung mit Fristen-Kalender."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Vertrag online mit KI erstellen",
    "description": "In drei Schritten vom Vertragstyp zum fertigen, individuellen Vertragsentwurf als PDF, auf Wunsch mit digitaler Signatur.",
    "totalTime": "PT5M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Vertragstyp wählen",
        "text": "Wähle aus 16 Vertragstypen, vom Arbeitsvertrag über Freelancer-Vertrag und NDA bis zum frei beschreibbaren individuellen Vertrag."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Fragen beantworten",
        "text": "Gib die Eckdaten deines Falls an: Parteien, Leistung, Vergütung, Laufzeit. Fehlen wichtige Angaben, stellt die KI Rückfragen im Chat, statt Inhalte zu erfinden."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Vertrag erhalten und unterschreiben",
        "text": "Du bekommst den individuellen Vertragsentwurf als fertig formatiertes PDF und kannst ihn direkt zur digitalen Signatur an deinen Vertragspartner senden."
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Vertrag erstellen mit KI – individuell statt Vorlage | Contract AI</title>
        <meta name="description" content="Vertrag erstellen in Minuten: 16 Vertragstypen von Arbeitsvertrag bis NDA, individuell per KI statt Muster von der Stange. Mit PDF-Export & digitaler Signatur. ✓ Kostenlos starten" />
        <meta name="keywords" content="Vertrag erstellen, Vertrag erstellen online, Vertrag aufsetzen, Vertrag schreiben, Vertrag selbst erstellen, Vertrag erstellen lassen, Vertrag machen, Vertragsgenerator, Vertrag online erstellen kostenlos" />

        <link rel="canonical" href="https://www.contract-ai.de/vertrag-erstellen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Vertrag erstellen mit KI – individuell statt Vorlage | Contract AI" />
        <meta property="og:description" content="Vertrag erstellen in Minuten: 16 Vertragstypen, individuell per KI statt Muster von der Stange. Mit PDF-Export & digitaler Signatur." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/vertrag-erstellen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrag erstellen mit KI – individuell statt Vorlage | Contract AI" />
        <meta name="twitter:description" content="Vertrag erstellen in Minuten: 16 Vertragstypen, individuell per KI statt Muster von der Stange." />
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
                Für alle, die einen Vertrag brauchen, der wirklich passt
              </div>

              <h1 className={styles.heroTitle}>
                Vertrag erstellen:<br/>
                <span className={styles.heroTitleHighlight}>individuell mit KI statt Muster von der Stange</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Ob Arbeitsvertrag, Freelancer-Auftrag, NDA oder Darlehen: Der KI-Generator
                fragt deinen konkreten Fall ab und erstellt daraus in Minuten einen
                individuellen Vertragsentwurf als fertig formatiertes PDF. 16 Vertragstypen,
                Rückfragen im Chat statt erfundener Inhalte, digitale Signatur inklusive.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Vertrag jetzt erstellen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fehler" className={styles.btnSecondary}>
                  Die 8 häufigsten Fehler
                </a>
              </div>
            </div>

            {/* Demo Window — Generator-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>KI stellt Rückfragen</div>
                  <div className={styles.floatingSubtext}>statt Inhalte zu erfinden</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <PenTool size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Digital unterschreiben</div>
                  <div className={styles.floatingSubtext}>Signatur direkt versenden</div>
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
                      <span className={styles.demoScoreValue}>✓</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Entwurf fertig</div>
                      <div className={styles.demoScoreTitle}>Freelancer-Vertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Leistung & Vergütung klar definiert</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Fertig</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <Scale size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Nutzungsrechte geregelt (§§ 31, 32 UrhG)</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Fertig</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <PenTool size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Bereit für die digitale Signatur</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Senden</span>
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
              <FileText size={18} />
              16 Vertragstypen
            </div>
            <div className={styles.trustBadge}>
              <CheckCircle size={18} />
              DSGVO-konform
            </div>
            <div className={styles.trustBadge}>
              <MessageSquare size={18} />
              Rückfragen statt erfundener Inhalte
            </div>
            <div className={styles.trustBadge}>
              <PenTool size={18} />
              PDF-Export + digitale Signatur
            </div>
          </div>
        </div>

        {/* ==========================================
            SECTION 3 — WELCHE VERTRÄGE (Quick-Glance)
            ========================================== */}
        <section className={styles.functionsSection} id="typen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>16 Vertragstypen</span>
              <h2 className={styles.sectionTitle}>Diese Verträge kannst du erstellen</h2>
              <p className={styles.sectionSubtitle}>
                Die acht gefragtesten Typen im Überblick. Dazu kommen Beratervertrag,
                Lizenzvertrag, Pachtvertrag, Kooperationsvertrag, Software-Verträge,
                Aufhebungsvertrag und ein frei beschreibbarer individueller Vertrag.
              </p>
            </div>

            <div className={styles.functionsGrid4col}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <Briefcase size={24} />
                </div>
                <h3 className={styles.functionTitle}>Arbeitsvertrag</h3>
                <p className={styles.functionDesc}>
                  Tätigkeit, Vergütung, Urlaub, Kündigungsfristen: die Basis jedes
                  Arbeitsverhältnisses, sauber strukturiert.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Users size={24} />
                </div>
                <h3 className={styles.functionTitle}>Freelancer-Vertrag</h3>
                <p className={styles.functionDesc}>
                  Leistung, Honorar, Nutzungsrechte (§§ 31, 32 UrhG) und klare Abgrenzung
                  zur Scheinselbstständigkeit.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>NDA / Geheimhaltung</h3>
                <p className={styles.functionDesc}>
                  Schutzbereich, Laufzeit, Vertragsstrafe: Geheimhaltung nach dem Standard
                  des GeschGehG, einseitig oder gegenseitig.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Mietvertrag</h3>
                <p className={styles.functionDesc}>
                  Miete, Kaution, Schönheitsreparaturen: mit Blick auf die Schriftform
                  des § 550 BGB bei längerer Laufzeit.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kaufvertrag</h3>
                <p className={styles.functionDesc}>
                  Auto, Möbel, Technik: Kaufgegenstand, Zustand, Gewährleistung und
                  Übergabe eindeutig festgehalten.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <Zap size={24} />
                </div>
                <h3 className={styles.functionTitle}>Werkvertrag</h3>
                <p className={styles.functionDesc}>
                  Konkretes Werk, Abnahme, Vergütung: für Handwerk, Bau und Projekte
                  mit definiertem Ergebnis.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <BookOpen size={24} />
                </div>
                <h3 className={styles.functionTitle}>Darlehensvertrag</h3>
                <p className={styles.functionDesc}>
                  Geld verleihen, auch privat: Betrag, Zinsen, Rückzahlung und Sicherheiten
                  schriftlich festgehalten statt per Handschlag.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <Sparkles size={24} />
                </div>
                <h3 className={styles.functionTitle}>Gesellschaftsvertrag</h3>
                <p className={styles.functionDesc}>
                  Gemeinsam gründen: Gesellschafter, Einlagen, Geschäftsführung und
                  Gewinnverteilung von Anfang an geregelt.
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
                <h2 className={styles.sectionTitleLeft}>Die Gratis-Vorlage wurde für jemand anderen geschrieben</h2>
                <p className={styles.problemText}>
                  Wer einen Vertrag aufsetzen will, landet meist bei einem kostenlosen Muster
                  aus dem Netz. Das Problem: Diese Vorlage wurde für einen <strong>fremden
                  Fall</strong> geschrieben, mit anderen Parteien, anderer Leistung und oft
                  veraltetem Rechtsstand. Vorformulierte Klauseln unterliegen der
                  AGB-Kontrolle der <strong>§§ 305 ff. BGB</strong>, und was dort nicht
                  standhält, ist unwirksam, egal wie oft es im Internet kopiert wurde.
                  Dazu kommen Formvorschriften, die kaum jemand auf dem Schirm hat: Ein
                  Formverstoß macht den Vertrag nach § 125 BGB im Zweifel komplett nichtig.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>§ 125 BGB</div>
                    <div className={styles.problemStatLabel}>Formverstoß = Vertrag nichtig, etwa bei Bürgschaft (§ 766 BGB) oder Grundstückskauf (§ 311b BGB)</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>§ 14 IV TzBfG</div>
                    <div className={styles.problemStatLabel}>Befristung ohne Schriftform: Der Arbeitsvertrag gilt als unbefristet geschlossen</div>
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
                      <div className={styles.problemDocTitle}>Muster_Vertrag_2019.doc</div>
                      <div className={styles.problemDocSubtitle}>Kostenlose Vorlage • Herkunft unbekannt</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...haftet der Auftragnehmer für sämtliche Schäden, gleich aus welchem Rechtsgrund, ist jede Haftung des Auftraggebers ausgeschlossen..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Klausel hält § 309 BGB nicht stand
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <Clock size={16} />
                  </div>
                  Rechtsstand von 2019
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
                    <span className={styles.comparisonLabel}>Vorlage von der Stange</span>
                    <div className={styles.comparisonIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Suchen, kopieren, hoffen</div>
                    <div className={styles.comparisonDesc}>
                      Muster herunterladen, Namen austauschen, Klauseln raten, die für einen
                      ganz anderen Fall geschrieben wurden. Ob es passt, zeigt sich erst im Streit.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      Stundenlang unsicher
                    </div>
                  </div>

                  <div className={styles.comparisonArrow}>
                    <ArrowRight size={24} />
                  </div>

                  <div className={`${styles.comparisonCard} ${styles.after}`}>
                    <span className={styles.comparisonLabel}>Mit Contract AI</span>
                    <div className={styles.comparisonIcon}>
                      <Zap size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Fragen beantworten, fertig</div>
                    <div className={styles.comparisonDesc}>
                      Vertragstyp wählen, deinen Fall beschreiben, Rückfragen im Chat klären.
                      Ergebnis: ein individueller Entwurf als formatiertes PDF, bereit zur Signatur.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      In wenigen Minuten
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Dein Fall zuerst, dann der Vertrag</h2>
                <p className={styles.solutionText}>
                  Der KI-Generator dreht die Reihenfolge um: Statt ein fremdes Muster an
                  deinen Fall anzupassen, fragt er <strong>deinen Fall</strong> ab und baut
                  den Vertrag darum herum: Parteien, Leistung, Vergütung, Laufzeit,
                  Besonderheiten. Was unklar bleibt, klärt die KI per Rückfrage im Chat.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <MessageSquare size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Rückfragen statt Erfindungen</h3>
                      <p>Fehlen wichtige Angaben, fragt die KI nach. Sie erfindet keine Namen, Beträge oder Fristen</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <FileText size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Fertig formatiertes PDF</h3>
                      <p>Professionelles Layout mit Deckblatt und sauberer Gliederung, kein Wordfile-Gebastel</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <PenTool size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Digitale Signatur inklusive</h3>
                      <p>Vertrag direkt zur Unterschrift versenden, beide Seiten erhalten das signierte Dokument</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 6 — DIE 8 HÄUFIGSTEN FEHLER (Kern-SEO-Section)
            ========================================== */}
        <section className={styles.risksSection} id="fehler">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Vertrag selbst schreiben?</span>
              <h2 className={styles.sectionTitle}>Die 8 häufigsten Fehler beim Vertrag aufsetzen</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Punkte entscheiden darüber, ob dein selbst erstellter Vertrag im
                Ernstfall hält, jeder mit rechtlicher Einordnung und Paragraphen-Verweis.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* FEHLER 1: Formvorschriften */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>1. Formvorschriften übersehen</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Nichtigkeits-Risiko</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  Bürgschaft per E-Mail zugesagt, Befristung mündlich vereinbart, Mietvertrag über 2 Jahre formlos geschlossen.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Die meisten Verträge sind formfrei wirksam, aber die Ausnahmen haben es in sich: Die <strong>Bürgschaft</strong> verlangt Schriftform (§ 766 BGB), die <strong>Befristung im Arbeitsvertrag</strong> ebenso (§ 14 Abs. 4 TzBfG, sonst gilt der Vertrag als unbefristet), der <strong>Grundstückskauf</strong> sogar notarielle Beurkundung (§ 311b BGB). Ein Formverstoß führt nach <strong>§ 125 BGB</strong> zur Nichtigkeit.</span>
                </div>
              </div>

              {/* FEHLER 2: Schwammige Leistungsbeschreibung */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>2. Leistung und Vergütung schwammig beschreiben</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Streit-Garant</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Der Auftragnehmer erstellt die Website nach den Wünschen des Auftraggebers. Die Vergütung wird fair geregelt."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Was nicht eindeutig geregelt ist, wird im Streitfall <strong>ausgelegt</strong> (§§ 133, 157 BGB), und das Ergebnis muss dir nicht gefallen. Haben sich die Parteien über einen Punkt, der geregelt werden sollte, gar nicht geeinigt, ist der Vertrag im Zweifel nicht geschlossen (<strong>§ 154 BGB</strong>). Konkrete Leistung, konkrete Zahl, konkreter Termin: Das ist der halbe Vertrag.</span>
                </div>
              </div>

              {/* FEHLER 3: Unwirksame Klauseln aus Mustern */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>3. Unwirksame Klauseln aus alten Mustern kopieren</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>AGB-Falle</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Jegliche Haftung ist ausgeschlossen." Millionenfach kopiert und trotzdem unwirksam.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Vorformulierte Klauseln, die für eine Vielzahl von Verträgen gedacht sind, unterliegen der AGB-Kontrolle (<strong>§§ 305 ff. BGB</strong>). Ein pauschaler Haftungsausschluss scheitert an <strong>§ 309 Nr. 7 BGB</strong>: Die Haftung für Leben, Körper und Gesundheit sowie für grobes Verschulden kann in AGB nicht ausgeschlossen werden, die Haftung für Vorsatz nie im Voraus (<strong>§ 276 Abs. 3 BGB</strong>). Eine unwirksame Klausel fällt ersatzlos weg, dann gilt das Gesetz.</span>
                </div>
              </div>

              {/* FEHLER 4: Parteien falsch bezeichnet */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>4. Vertragsparteien ungenau bezeichnen</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Oft übersehen</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "zwischen der Firma Müller und Herrn Schmidt": Welche Gesellschaft? Wer vertritt sie? Privat oder geschäftlich?
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Vollständiger Name bzw. Firma laut Handelsregister, Anschrift, Vertretungsverhältnis: Bei einer GmbH schließt der <strong>Geschäftsführer</strong> als Vertreter den Vertrag (§ 35 GmbHG). Wer den falschen Vertragspartner erwischt, hat im Ernstfall Ansprüche gegen den Falschen oder gegen niemanden. Der Generator fragt die Parteien strukturiert ab, statt sie in einem Fließtext zu verstecken.</span>
                </div>
              </div>

              {/* FEHLER 5: Laufzeit & Kündigung */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>5. Laufzeit und Kündigung vergessen</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Dauerbindung</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Kein Wort zu Laufzeit oder Kündigungsfrist, oder eine Bindung, aus der man jahrelang nicht herauskommt.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ohne Regelung gelten die gesetzlichen Fristen (z. B. <strong>§ 621 BGB</strong> für Dienstverträge, <strong>§ 573c BGB</strong> für Wohnraummiete), die nicht immer zu deinem Fall passen. In AGB sind überlange Bindungen zulasten von Verbrauchern begrenzt: Mehr als zwei Jahre Erstlaufzeit sind nach <strong>§ 309 Nr. 9 BGB</strong> regelmäßig unwirksam. Laufzeit, Verlängerung und Kündigungsfrist gehören ausdrücklich in jeden Dauervertrag.</span>
                </div>
              </div>

              {/* FEHLER 6: Nutzungsrechte */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>6. Nutzungsrechte nicht regeln</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Teuer für Auftraggeber</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Logo, Website oder Texte bezahlt, aber nie die Rechte daran erworben. Der Designer kann die Weiternutzung untersagen.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Bei kreativen und Software-Leistungen entsteht das Urheberrecht beim Ersteller und bleibt dort, wenn nichts vereinbart ist. Nach der Zweckübertragungsregel (<strong>§ 31 Abs. 5 UrhG</strong>) erwirbt der Auftraggeber im Zweifel nur die Rechte, die der Vertragszweck zwingend erfordert. Umfang, Dauer und Exklusivität der <strong>Nutzungsrechte</strong> (§§ 31, 32 UrhG) gehören deshalb ausdrücklich in den Vertrag.</span>
                </div>
              </div>

              {/* FEHLER 7: Haftung unausgewogen */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>7. Haftung gar nicht oder falsch regeln</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Existenz-Risiko</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Unbegrenzte Haftung für jeden kleinen Fehler, oder ein Ausschluss, der rechtlich nicht hält.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ohne Regelung haftet jede Partei nach den gesetzlichen Regeln unbegrenzt, für Freelancer und kleine Unternehmen ein echtes Risiko. Wirksam begrenzen lässt sich die Haftung für <strong>leichte Fahrlässigkeit</strong>, etwa auf vertragstypische, vorhersehbare Schäden. Nicht begrenzbar sind Vorsatz (§ 276 Abs. 3 BGB) sowie in AGB grobes Verschulden und Personenschäden (<strong>§ 309 Nr. 7 BGB</strong>). Eine gute Haftungsklausel kennt diese Grenzen.</span>
                </div>
              </div>

              {/* FEHLER 8: Veraltete Muster / Nebenabreden */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>8. Veraltete Muster und mündliche Nebenabreden</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Beweisproblem</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Das haben wir doch am Telefon anders besprochen." Steht aber nirgends, und das Muster stammt von 2019.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Gesetze ändern sich; ein Muster von vor ein paar Jahren kennt weder aktuelle Rechtsprechung noch neue Pflichtangaben. Und was nur mündlich besprochen wurde, ist im Streitfall kaum beweisbar. Deshalb: Alle Absprachen in den Vertragstext aufnehmen, Änderungen schriftlich festhalten, und den Vertrag auf aktueller Grundlage erstellen statt aus der Muster-Mottenkiste.</span>
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
              <h2 className={styles.sectionTitle}>In drei Schritten zum fertigen Vertrag</h2>
              <p className={styles.sectionSubtitle}>
                Vom Vertragstyp zum unterschriftsreifen PDF, ohne Vorkenntnisse und ohne
                Vorlagen-Suche.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertragstyp wählen</h3>
                    <p className={styles.processDesc}>
                      Wähle aus 16 Vertragstypen, vom Arbeitsvertrag über Freelancer-Vertrag
                      und NDA bis zum frei beschreibbaren individuellen Vertrag für alles,
                      was nicht ins Raster passt.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Fragen beantworten</h3>
                    <p className={styles.processDesc}>
                      Gib die Eckdaten deines Falls an: Parteien, Leistung, Vergütung,
                      Laufzeit. Fehlen wichtige Angaben, stellt die KI gezielte Rückfragen
                      im Chat, statt Inhalte zu erfinden.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Vertrag erhalten und unterschreiben</h3>
                    <p className={styles.processDesc}>
                      Du bekommst deinen individuellen Vertragsentwurf als fertig
                      formatiertes PDF und kannst ihn direkt aus Contract AI zur digitalen
                      Signatur an deinen Vertragspartner senden.
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
              <h2 className={styles.sectionTitle}>Warum Verträge mit Contract AI erstellen?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum das mehr ist als ein Vorlagen-Download.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <MessageSquare size={28} />
                </div>
                <h3 className={styles.whyTitle}>Individuell statt Muster</h3>
                <p className={styles.whyDesc}>
                  Der Vertrag entsteht aus deinen Angaben und den Rückfragen der KI, nicht
                  aus einem fremden Dokument mit ausgetauschten Namen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <FileText size={28} />
                </div>
                <h3 className={styles.whyTitle}>16 Vertragstypen</h3>
                <p className={styles.whyDesc}>
                  Vom Arbeitsvertrag bis zum Software-Vertriebsvertrag, plus ein frei
                  beschreibbarer individueller Vertrag für Sonderfälle.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <PenTool size={28} />
                </div>
                <h3 className={styles.whyTitle}>Bis zur Unterschrift</h3>
                <p className={styles.whyDesc}>
                  Fertig formatiertes PDF plus digitale Signatur: Der Vertrag geht direkt
                  an deinen Vertragspartner, ohne Drucker und Scanner.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Shield size={28} />
                </div>
                <h3 className={styles.whyTitle}>Erstellen + Prüfen aus einer Hand</h3>
                <p className={styles.whyDesc}>
                  Erstellte und erhaltene Verträge liegen in einer Verwaltung, mit
                  KI-Analyse, Fristen-Kalender und Erinnerungen.
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
              <h2 className={styles.sectionTitle}>Vertrag erstellen: Vorlage, Anwalt oder KI?</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Einen Vertrag zu schreiben ist keine Zauberei, aber auch kein Lückentext.
                Dieser Überblick erklärt, was rechtlich gilt, wann eine Vorlage reicht, wann
                du zum Anwalt solltest und wo die KI-Erstellung ihren Platz hat. Er ersetzt
                keine Rechtsberatung im Einzelfall.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Vertrag selbst aufsetzen: Das sagt das Gesetz
              </h3>
              <p className={styles.problemText}>
                In Deutschland gilt <strong>Vertragsfreiheit</strong>: Zur Begründung eines
                Schuldverhältnisses genügt ein Vertrag zwischen den Beteiligten
                (§ 311 Abs. 1 BGB), und der kommt schlicht durch Angebot und Annahme
                zustande (§§ 145 ff. BGB). Du darfst also fast jeden Vertrag selbst
                erstellen, mündlich, per Handschlag oder schriftlich. Dass die Schriftform
                trotzdem fast immer die richtige Wahl ist, hat zwei Gründe: Erstens
                verlangen einzelne Vertragstypen sie zwingend (Bürgschaft, Befristung,
                Grundstücksgeschäfte), zweitens ist der beste Vertrag nichts wert, wenn du
                seinen Inhalt im Streitfall nicht beweisen kannst.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Wann eine kostenlose Vorlage reicht und wann nicht
              </h3>
              <p className={styles.problemText}>
                Für einen simplen Standardfall kann ein seriöses Muster genügen. Die Grenze
                ist erreicht, sobald dein Fall vom Standard abweicht: besondere
                Vergütungsmodelle, Nutzungsrechte, längere Laufzeiten, mehrere Beteiligte.
                Dann beginnt das eigentliche Risiko der Vorlage: Sie <em>sieht</em> fertig
                aus, obwohl die entscheidenden Klauseln für einen anderen Fall geschrieben
                wurden. Wer Klauseln aus mehreren Mustern kombiniert, baut sich zudem leicht
                Widersprüche in den Text, und im Zweifel gehen Unklarheiten zulasten
                dessen, der die Klausel gestellt hat (§ 305c Abs. 2 BGB).
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Vertrag schreiben lassen: Wann der Anwalt die richtige Wahl ist
              </h3>
              <p className={styles.problemText}>
                Je höher der Wert und je individueller die Konstellation, desto eher lohnt
                die anwaltliche Erstellung: Unternehmenskauf, Immobilien, Beteiligungen,
                internationale Verträge oder alles, worüber schon gestritten wird. Ein
                Anwalt gestaltet nicht nur den Text, sondern berät zur Strategie, und
                genau diese Rechtsberatung darf ein Software-Tool nach dem
                Rechtsdienstleistungsgesetz nicht leisten. Die ehrliche Faustregel: Für den
                Freelancer-Auftrag über ein paar tausend Euro ist der individuelle
                KI-Entwurf meist die passende Größenordnung, für den Unternehmensverkauf
                nicht.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Wie die KI-Erstellung bei Contract AI funktioniert
              </h3>
              <p className={styles.problemText}>
                Der Generator führt dich durch die Eckdaten deines Falls und erstellt daraus
                einen strukturierten Vertragsentwurf. Die wichtigste Regel dabei:
                <strong> Was du nicht angibst, wird nicht erfunden.</strong> Fehlt eine
                wesentliche Angabe, stellt die KI eine Rückfrage im Chat. Das Ergebnis
                bekommst du als fertig formatiertes PDF, kannst es direkt zur digitalen
                Signatur versenden und behältst den Vertrag anschließend in deiner
                Vertragsverwaltung, inklusive Fristen-Kalender. Der Start ist kostenlos:
                Du siehst eine Vorschau deines Vertrags und entscheidest erst dann, ob du
                ihn freischaltest, einmalig pro Vertrag oder im Abo.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Checkliste: Das gehört in jeden Vertrag
              </h3>
              <p className={styles.problemText}>
                Egal ob du den Vertrag selbst schreibst oder erstellen lässt, diese Punkte
                sollte jeder Vertrag beantworten: <strong>Wer</strong> schließt ihn
                (vollständige Bezeichnung beider Parteien samt Vertretung)?
                <strong> Was</strong> wird geleistet (konkret, messbar, mit Terminen)?
                <strong> Wieviel</strong> wird bezahlt (Betrag, Fälligkeit, Verzug)?
                <strong> Wie lange</strong> läuft er (Laufzeit, Verlängerung, Kündigung)?
                <strong> Was gilt bei Störungen</strong> (Haftung, Gewährleistung,
                Rücktritt)? Und bei kreativen Leistungen: <strong>Wem gehört das
                Ergebnis</strong> (Nutzungsrechte)? Wenn du diese sechs Fragen beantworten
                kannst, bist du weiter als die meisten Gratis-Vorlagen.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 10 — STATS (ehrliche Kennzahlen)
            ========================================== */}
        <section className={styles.statsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Die Zahlen, die zählen</span>
              <h2 className={styles.sectionTitle}>Fair kalkuliert statt Abo-Falle</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>16</div>
                <div className={styles.statLabel}>Vertragstypen, plus frei beschreibbarer individueller Vertrag</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>0 €</div>
                <div className={styles.statLabel}>zum Starten: erstellen, Vorschau ansehen, dann entscheiden</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>9,90 €</div>
                <div className={styles.statLabel}>einmalige Freischaltung pro Vertrag, ganz ohne Abo</div>
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
              <h2 className={styles.sectionTitle}>Häufige Fragen zum Vertrag erstellen</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Welche Verträge kann ich mit Contract AI erstellen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Der KI-Generator kennt 16 Vertragstypen: Arbeitsvertrag, Mietvertrag,
                  Kaufvertrag, Freelancer-Vertrag, NDA (Geheimhaltungsvereinbarung),
                  Werkvertrag, Beratervertrag, Darlehensvertrag, Gesellschaftsvertrag,
                  Aufhebungsvertrag, Lizenzvertrag, Pachtvertrag, Kooperationsvertrag,
                  Software-Lizenz für Endkunden, Software-Vertriebsvertrag und einen frei
                  beschreibbaren individuellen Vertrag für alles, was nicht in dieses
                  Raster passt.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ist ein selbst erstellter Vertrag rechtsgültig?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Grundsätzlich ja: In Deutschland gilt Vertragsfreiheit (§ 311 Abs. 1 BGB).
                  Ein Vertrag kommt durch zwei übereinstimmende Willenserklärungen zustande
                  und ist in den meisten Fällen formfrei wirksam. Wichtig sind die
                  Ausnahmen: Manche Verträge verlangen die Schriftform oder sogar
                  notarielle Beurkundung, etwa die Bürgschaft (§ 766 BGB), die Befristung
                  im Arbeitsvertrag (§ 14 Abs. 4 TzBfG) oder der Grundstückskauf
                  (§ 311b BGB). Ein Formverstoß macht das Geschäft nach § 125 BGB nichtig.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was kostet es, einen Vertrag zu erstellen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Der Start ist kostenlos: Du registrierst dich gratis und kannst Verträge
                  erstellen und in der Vorschau ansehen. Den vollständigen Vertragstext
                  schaltest du entweder einmalig für 9,90 € pro Vertrag frei, ganz ohne
                  Abo, oder du nutzt ein Abo, in dem die Vertragserstellung enthalten ist.
                  So zahlst du nur, wenn dir das Ergebnis wirklich gefällt.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was unterscheidet den KI-Generator von einer kostenlosen Vorlage?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Eine Vorlage aus dem Netz wurde für einen fremden Fall geschrieben:
                  andere Parteien, andere Leistung, oft veralteter Rechtsstand. Der
                  KI-Generator arbeitet umgekehrt: Er fragt deinen konkreten Fall ab
                  (Parteien, Leistung, Vergütung, Laufzeit) und stellt bei Unklarheiten
                  Rückfragen im Chat, statt Lücken mit erfundenen Angaben zu füllen. Das
                  Ergebnis ist ein individueller Vertragsentwurf als fertig formatiertes
                  PDF statt eines Musters von der Stange.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich den Vertrag online unterschreiben lassen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Freigeschaltete Verträge kannst du direkt aus Contract AI heraus zur
                  digitalen Signatur versenden: Dein Vertragspartner erhält einen Link,
                  unterschreibt online, und beide Seiten bekommen das signierte Dokument.
                  Drucken, Einscannen und Hin- und Herschicken entfallen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt der Vertragsgenerator einen Anwalt?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein. Der Generator erstellt strukturierte, individuelle Vertragsentwürfe,
                  er leistet aber keine Rechtsberatung im Sinne des
                  Rechtsdienstleistungsgesetzes (RDG). Für Standardsituationen ist das in
                  der Regel eine solide Grundlage. Bei hohen Summen, komplexen
                  Beteiligungen oder Sonderkonstellationen solltest du den Entwurf
                  anwaltlich prüfen oder gleich anwaltlich erstellen lassen.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich einen Vertrag ohne Anwalt aufsetzen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Für viele Alltagsfälle ja: Freelancer-Auftrag, NDA, privater Kaufvertrag
                  oder Darlehen im Bekanntenkreis lassen sich ohne Anwalt aufsetzen,
                  solange die Eckpunkte klar geregelt sind (wer, was, wieviel, wie lange,
                  wie kündbar). Entscheidend ist, typische Fehler zu vermeiden: schwammige
                  Leistungsbeschreibung, übersehene Formvorschriften und unwirksame
                  Klauseln aus alten Mustern. Genau diese Punkte fragt der Generator
                  systematisch ab.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Erfindet die KI Vertragsinhalte, die ich nicht angegeben habe?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein, das ist eine bewusste Grundregel des Generators: Fehlen wichtige
                  Angaben, stellt die KI eine Rückfrage im Chat, statt Namen, Beträge oder
                  Fristen zu erfinden. Der fertige Vertrag enthält deine Angaben, keine
                  ausgedachten Details.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was mache ich mit einem Vertrag, den ich bekommen habe?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Dafür gibt es die KI-Vertragsanalyse: Vertrag hochladen oder
                  abfotografieren, und in wenigen Minuten bekommst du Risiken, Fristen und
                  eine verständliche Einschätzung, mit wörtlichen Belegen aus deinem
                  Dokument. Erstellen und Prüfen greifen ineinander: Beides liegt danach
                  in deiner Vertragsverwaltung mit Fristen-Kalender.
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
              <Link to="/features/generator" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Der KI-Generator im Detail</div>
                  <div className={styles.relatedDescription}>
                    Alle Funktionen der Vertragserstellung auf einen Blick
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/contract-builder" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Contract Builder</div>
                  <div className={styles.relatedDescription}>
                    Der visuelle Vertragsbaukasten für Klausel-Feinschliff
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/ki-vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#10b981' }}><Shield size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Erhaltenen Vertrag prüfen</div>
                  <div className={styles.relatedDescription}>
                    KI-Vertragsanalyse: Risiken und Fristen in Minuten erkennen
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/blog/rechtssicherer-vertrag-5-minuten-generator" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f97316' }}><BookOpen size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Ratgeber im Blog</div>
                  <div className={styles.relatedDescription}>
                    Rechtssicherer Vertrag in 5 Minuten: so geht's Schritt für Schritt
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
                  Erstell deinen Vertrag jetzt. Individuell, in Minuten.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Vertragstyp wählen, Fragen beantworten, fertigen Entwurf als PDF erhalten
                  und direkt digital unterschreiben lassen. Kostenlos starten, erst bei
                  Gefallen freischalten.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Vertrag jetzt erstellen
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

export default VertragErstellen;

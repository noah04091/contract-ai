import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import LandingFooter from "../../components/LandingFooter";
import {
  Shield, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown, Scale, Gavel,
  Award, Info, Euro, Calendar, Briefcase
} from "lucide-react";

const AufhebungsvertragPruefen: React.FC = () => {
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
          if (entry.isIntersecting) entry.target.classList.add(styles.visible);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    animatedRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !animatedRefs.current.includes(el)) animatedRefs.current.push(el);
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
      { "@type": "ListItem", "position": 2, "name": "Aufhebungsvertrag prüfen", "item": "https://www.contract-ai.de/aufhebungsvertrag-pruefen" }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Droht beim Aufhebungsvertrag eine Sperrzeit beim Arbeitslosengeld?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, das ist das größte Risiko. Wer einen Aufhebungsvertrag unterschreibt, löst das Arbeitsverhältnis aktiv mit auf und riskiert eine Sperrzeit von bis zu 12 Wochen beim Arbeitslosengeld (§ 159 SGB III). Eine Sperrzeit droht nicht, wenn ein wichtiger Grund vorliegt (z.B. drohende rechtmäßige betriebsbedingte Kündigung) und die Abfindung im üblichen Rahmen (0,25–0,5 Bruttomonatsgehälter pro Beschäftigungsjahr) liegt. Genau das prüft die KI in deinem Aufhebungsvertrag."
        }
      },
      {
        "@type": "Question",
        "name": "Wie hoch sollte die Abfindung im Aufhebungsvertrag sein?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine gesetzliche Pflicht zur Abfindung gibt es bei Aufhebungsverträgen nicht — sie ist Verhandlungssache. Als Faustformel gilt (analog § 1a KSchG): 0,5 Bruttomonatsgehälter pro Beschäftigungsjahr. Je nach Verhandlungsposition, Kündigungsschutz und Interesse des Arbeitgebers an einer schnellen Trennung sind auch 0,75 bis 1,5 Monatsgehälter pro Jahr üblich. Die KI vergleicht deine angebotene Abfindung mit diesen Richtwerten."
        }
      },
      {
        "@type": "Question",
        "name": "Sollte ich einen Aufhebungsvertrag sofort unterschreiben?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein. Niemand muss einen Aufhebungsvertrag sofort oder unter Druck unterschreiben — es gibt keine gesetzliche Frist. Lass dir Bedenkzeit geben und prüfe den Vertrag vorher genau: Sperrzeit-Risiko, Abfindungshöhe, Klageverzicht, Resturlaub, Freistellung und Zeugnis. Eine übereilte Unterschrift kann dich mehrere Monatsgehälter kosten — sowohl durch eine Sperrzeit als auch durch eine zu niedrige Abfindung."
        }
      },
      {
        "@type": "Question",
        "name": "Was bedeutet die Ausgleichs- oder Klageverzichtsklausel im Aufhebungsvertrag?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Eine Ausgleichs- oder Erledigungsklausel bedeutet, dass mit Abschluss des Aufhebungsvertrags alle gegenseitigen Ansprüche aus dem Arbeitsverhältnis abgegolten sind — also auch noch offene Boni, Provisionen, Überstunden oder Urlaubsabgeltung. Ein Klageverzicht schließt zusätzlich eine spätere Kündigungsschutzklage aus. Beides solltest du nur akzeptieren, wenn du sicher bist, dass keine offenen Ansprüche bestehen und die Gegenleistung (Abfindung) angemessen ist."
        }
      },
      {
        "@type": "Question",
        "name": "Wird die Abfindung aus dem Aufhebungsvertrag versteuert?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja, die Abfindung ist als Entschädigung voll steuerpflichtig, aber sozialversicherungsfrei. Steuerlich kann die sogenannte Fünftelregelung (§ 34 EStG) die Progression abmildern, wenn die Abfindung zusammengeballt in einem Kalenderjahr ausgezahlt wird. Die genaue steuerliche Optimierung (z.B. Auszahlungszeitpunkt) solltest du mit einem Steuerberater klären — die KI weist dich auf den relevanten Punkt im Vertrag hin."
        }
      },
      {
        "@type": "Question",
        "name": "Worauf muss ich beim Beendigungstermin im Aufhebungsvertrag achten?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Der Beendigungstermin sollte die ordentliche Kündigungsfrist einhalten. Wird das Arbeitsverhältnis durch den Aufhebungsvertrag vor Ablauf der regulären Kündigungsfrist beendet, ruht der Anspruch auf Arbeitslosengeld unter Umständen zusätzlich nach § 158 SGB III — und zwar zusätzlich zu einer möglichen Sperrzeit. Die KI prüft, ob der vereinbarte Beendigungstermin zu deiner Kündigungsfrist passt."
        }
      },
      {
        "@type": "Question",
        "name": "Was kostet die KI-Prüfung eines Aufhebungsvertrags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Im Free-Tier sind drei Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhältst du 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine arbeitsrechtliche Erstberatung zum Aufhebungsvertrag kostet beim Anwalt typischerweise 150–300 € — die KI-Analyse liefert dir die kritischen Punkte vorab und macht ein anschließendes Anwaltsgespräch deutlich gezielter und günstiger."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Anwalt für Arbeitsrecht?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Erst-Risikoanalyse und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Gerade beim Aufhebungsvertrag mit Sperrzeit-Risiko, hoher Abfindung oder laufendem Kündigungsschutz empfehlen wir ergänzend einen Fachanwalt für Arbeitsrecht. Die KI-Ergebnisse dienen als fundierte Grundlage für ein gezieltes, günstigeres Anwaltsgespräch."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Aufhebungsvertrag mit KI prüfen lassen",
    "description": "In drei Schritten von der hochgeladenen PDF zur Risikoanalyse deines Aufhebungsvertrags.",
    "totalTime": "PT1M",
    "step": [
      { "@type": "HowToStep", "position": 1, "name": "Aufhebungsvertrag hochladen", "text": "Lade deinen Aufhebungsvertrag als PDF oder DOCX hoch. Die Übertragung erfolgt 256-bit-verschlüsselt, die Verarbeitung ausschließlich auf Servern in Deutschland." },
      { "@type": "HowToStep", "position": 2, "name": "Automatische KI-Analyse", "text": "Die KI prüft Sperrzeit-Risiko (§ 159 SGB III), Abfindungshöhe, Klageverzicht, Freistellung, Resturlaub, Zeugnis und Beendigungstermin auf Basis aktueller Rechtslage." },
      { "@type": "HowToStep", "position": 3, "name": "Detaillierten Report erhalten", "text": "Du erhältst einen Report mit Chancen-Risiken-Score, markierten Problemstellen mit Paragraphen-Verweis und konkreten Handlungsempfehlungen — als interaktive Ansicht und PDF-Export." }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Aufhebungsvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI</title>
        <meta name="description" content="Aufhebungsvertrag prüfen lassen mit KI: Sperrzeit-Risiko beim Arbeitslosengeld, zu niedrige Abfindung & Klageverzicht in 60 Sekunden erkennen. DSGVO-konform, Server in Deutschland. ✓ Kostenlos starten" />
        <meta name="keywords" content="Aufhebungsvertrag prüfen, Aufhebungsvertrag prüfen lassen, Aufhebungsvertrag KI prüfen, Aufhebungsvertrag Sperrzeit, Aufhebungsvertrag Abfindung prüfen, Aufhebungsvertrag Check, Aufhebungsvertrag unterschreiben" />

        <link rel="canonical" href="https://www.contract-ai.de/aufhebungsvertrag-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Aufhebungsvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta property="og:description" content="Aufhebungsvertrag prüfen lassen mit KI: Sperrzeit-Risiko, zu niedrige Abfindung & Klageverzicht in 60 Sekunden erkennen. DSGVO-konform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/aufhebungsvertrag-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Aufhebungsvertrag prüfen lassen – KI-Analyse in 60 Sek. | Contract AI" />
        <meta name="twitter:description" content="Aufhebungsvertrag prüfen lassen mit KI: Sperrzeit-Risiko, Abfindung & Klageverzicht in 60 Sekunden erkennen." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />

        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
      </Helmet>

      <div className={styles.pageBackground}>
        <div className={styles.ambientBg}>
          <div className={`${styles.ambientOrb} ${styles.orb1}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb2}`}></div>
          <div className={`${styles.ambientOrb} ${styles.orb3}`}></div>
        </div>

        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.containerLg}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot}></span>
                Bevor du unterschreibst
              </div>

              <h1 className={styles.heroTitle}>
                Aufhebungsvertrag prüfen lassen<br/>
                <span className={styles.heroTitleHighlight}>in 60 Sekunden, vor der Unterschrift</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Ein Aufhebungsvertrag kann dich eine 12-wöchige Sperrzeit beim Arbeitslosengeld
                und tausende Euro Abfindung kosten. Lass ihn von einer KI prüfen, die Sperrzeit-Risiko,
                Abfindungshöhe und unfaire Klauseln sofort erkennt — DSGVO-konform, Server in Deutschland.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Aufhebungsvertrag jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#fallen" className={styles.btnSecondary}>
                  Die größten Fallen
                </a>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <Shield size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Sperrzeit-Check</div>
                  <div className={styles.floatingSubtext}>§ 159 SGB III</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Euro size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Abfindungs-Check</div>
                  <div className={styles.floatingSubtext}>vs. Faustformel</div>
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
                      <div className={styles.demoScoreLabel}>Vertrags-Score</div>
                      <div className={styles.demoScoreTitle}>Aufhebungsvertrag.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Sperrzeit-Risiko: kein wichtiger Grund genannt</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Kritisch</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Abfindung unter Faustformel</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Mittel</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <FileText size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Qualifiziertes Zeugnis vereinbart</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>OK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST-BAR */}
        <div className={styles.container}>
          <div className={styles.trustBadgesRow}>
            <div className={styles.trustBadge}><Shield size={18} /> 256-bit Verschlüsselung</div>
            <div className={styles.trustBadge}><CheckCircle size={18} /> DSGVO-konform</div>
            <div className={styles.trustBadge}><Shield size={18} /> Server in Deutschland</div>
            <div className={styles.trustBadge}><Gavel size={18} /> Geprüft nach SGB III & BGB</div>
          </div>
        </div>

        {/* WAS DIE KI PRÜFT */}
        <section className={styles.functionsSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Prüfumfang</span>
              <h2 className={styles.sectionTitle}>Was die KI in deinem Aufhebungsvertrag prüft</h2>
              <p className={styles.sectionSubtitle}>
                Die sieben Punkte, an denen Aufhebungsverträge am häufigsten zu deinen Lasten gehen.
              </p>
            </div>

            <div className={styles.functionsGrid4col}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}><AlertTriangle size={24} /></div>
                <h3 className={styles.functionTitle}>Sperrzeit-Risiko</h3>
                <p className={styles.functionDesc}>
                  Prüfung nach § 159 SGB III — droht eine 12-wöchige Sperre beim Arbeitslosengeld? Ist ein wichtiger Grund formuliert?
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}><Euro size={24} /></div>
                <h3 className={styles.functionTitle}>Abfindungshöhe</h3>
                <p className={styles.functionDesc}>
                  Vergleich mit der Faustformel (0,5 Bruttomonatsgehälter pro Jahr) — ist die angebotene Abfindung marktüblich?
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}><Scale size={24} /></div>
                <h3 className={styles.functionTitle}>Klageverzicht & Ausgleichsklausel</h3>
                <p className={styles.functionDesc}>
                  Welche Ansprüche verfallen? Werden offene Boni, Provisionen oder Überstunden mit abgegolten?
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}><Calendar size={24} /></div>
                <h3 className={styles.functionTitle}>Beendigungstermin</h3>
                <p className={styles.functionDesc}>
                  Hält der Termin die Kündigungsfrist ein? Sonst droht zusätzliches Ruhen des ALG (§ 158 SGB III).
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}><Briefcase size={24} /></div>
                <h3 className={styles.functionTitle}>Freistellung & Resturlaub</h3>
                <p className={styles.functionDesc}>
                  Bezahlte oder unbezahlte Freistellung? Wird Resturlaub angerechnet oder ausgezahlt?
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}><Award size={24} /></div>
                <h3 className={styles.functionTitle}>Zeugnis-Anspruch</h3>
                <p className={styles.functionDesc}>
                  Ist ein qualifiziertes, wohlwollendes Zeugnis mit konkreter Note vereinbart (§ 109 GewO)?
                </p>
              </div>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}><BookOpen size={24} /></div>
                <h3 className={styles.functionTitle}>Nachvertragliche Pflichten</h3>
                <p className={styles.functionDesc}>
                  Wettbewerbsverbote, Verschwiegenheit und Rückzahlungsklauseln (Fortbildung, Boni) auf Angemessenheit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className={styles.problemSection}>
          <div className={styles.container}>
            <div className={styles.problemGrid}>
              <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Das Problem</span>
                <h2 className={styles.sectionTitleLeft}>Eine Unterschrift unter Druck — und das ALG ist 12 Wochen weg</h2>
                <p className={styles.problemText}>
                  Aufhebungsverträge werden oft im Personalgespräch vorgelegt, mit der Bitte,
                  „gleich zu unterschreiben". Genau das ist die Falle: Wer ohne wichtigen Grund
                  unterschreibt, riskiert eine Sperrzeit von bis zu 12 Wochen beim Arbeitslosengeld
                  — und akzeptiert oft eine Abfindung, die deutlich unter dem Verhandelbaren liegt.
                  Beides zusammen kostet schnell mehrere Monatsgehälter.
                </p>
                <div className={styles.problemStats}>
                  <div className={styles.problemStat}>
                    <div className={styles.problemStatNumber}>12 Wochen</div>
                    <div className={styles.problemStatLabel}>mögliche Sperrzeit beim Arbeitslosengeld (§ 159 SGB III)</div>
                  </div>
                  <div className={styles.problemStat}>
                    <div className={styles.problemStatNumber}>0 €</div>
                    <div className={styles.problemStatLabel}>gesetzlicher Abfindungsanspruch — alles ist Verhandlungssache</div>
                  </div>
                </div>
              </div>
              <div className={`${styles.problemVisual} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.problemDoc}>
                  <div className={styles.problemDocHeader}>
                    <div className={styles.problemDocIcon}><FileText size={24} /></div>
                    <div>
                      <div className={styles.problemDocTitle}>Aufhebungsvertrag.pdf</div>
                      <div className={styles.problemDocSubtitle}>„Bitte bis morgen unterschreiben"</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...mit Abschluss dieser Vereinbarung sind alle Ansprüche abgegolten..."
                    </div>
                  </div>
                </div>
                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <AlertTriangle size={14} /> Sperrzeit-Risiko
                </div>
                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <AlertTriangle size={14} /> Ansprüche verfallen
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '48px 0 0' }}>
              <Link to={target} className={styles.btnPrimary} style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
                Aufhebungsvertrag jetzt kostenlos prüfen
                <ArrowRight size={20} />
              </Link>
              <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                3 kostenlose Analysen • Kein Abo nötig • Ergebnis in 60 Sekunden
              </p>
            </div>
          </div>
        </section>

        {/* RISKS / FALLEN */}
        <section className={styles.risksSection} id="fallen">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Die größten Fallen</span>
              <h2 className={styles.sectionTitle}>Das findet die KI in <span style={{ color: '#3b82f6' }}>deinem Aufhebungsvertrag</span></h2>
              <p className={styles.sectionSubtitle}>
                Typische Klauseln, die Arbeitnehmer Geld kosten — oft übersehen unter Zeitdruck.
              </p>
            </div>
            <div className={styles.risksGrid}>
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Kein „wichtiger Grund" genannt</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Das Arbeitsverhältnis endet einvernehmlich zum 30.06."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ohne dokumentierten wichtigen Grund (z.B. drohende betriebsbedingte Kündigung) droht eine Sperrzeit. Grund schriftlich festhalten lassen.</span>
                </div>
              </div>
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Abfindung unter Faustformel</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Warnung</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Der Arbeitnehmer erhält eine Abfindung von 2.000 €."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Liegt deutlich unter 0,5 Monatsgehältern pro Beschäftigungsjahr — hier ist fast immer Verhandlungsspielraum.</span>
                </div>
              </div>
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Pauschale Ausgleichsklausel</h4>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "Mit dieser Vereinbarung sind sämtliche Ansprüche abgegolten."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Offene Boni, Provisionen, Überstunden und Urlaubsabgeltung verfallen. Vor Unterschrift alle offenen Ansprüche sichern.</span>
                </div>
              </div>
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h4 className={styles.riskTitle}>Beendigung vor Kündigungsfrist</h4>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Warnung</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Beendigungstermin liegt vor Ablauf der ordentlichen Kündigungsfrist.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Das ALG kann zusätzlich ruhen (§ 158 SGB III). Termin an die reguläre Kündigungsfrist anpassen.</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '48px 0 0' }}>
              <p style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '16px', fontWeight: 500 }}>
                Steckt eine dieser Fallen auch in deinem Aufhebungsvertrag?
              </p>
              <Link to={target} className={styles.btnPrimary} style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
                Jetzt kostenlos prüfen
                <ArrowRight size={20} />
              </Link>
              <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                Keine Kreditkarte • Kein Abo • DSGVO-konform auf deutschen Servern
              </p>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className={styles.processSection}>
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Schritt für Schritt</span>
              <h2 className={styles.sectionTitle}>In 60 Sekunden zum <span style={{ color: '#3b82f6' }}>geprüften Aufhebungsvertrag</span></h2>
            </div>
            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>
              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Aufhebungsvertrag hochladen</h3>
                    <p className={styles.processDesc}>
                      Lade den Vertrag als PDF oder DOCX hoch. 256-bit-verschlüsselt, Verarbeitung ausschließlich auf Servern in Deutschland.
                    </p>
                  </div>
                </div>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Automatische KI-Analyse</h3>
                    <p className={styles.processDesc}>
                      Die KI prüft Sperrzeit-Risiko, Abfindungshöhe, Klageverzicht, Freistellung, Resturlaub, Zeugnis und Beendigungstermin.
                    </p>
                  </div>
                </div>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Report erhalten & verhandeln</h3>
                    <p className={styles.processDesc}>
                      Du bekommst einen Risiko-Report mit Paragraphen-Verweisen und konkreten Empfehlungen — die perfekte Grundlage, um nachzuverhandeln.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection} id="faq">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Fragen & Antworten</span>
              <h2 className={styles.sectionTitle}>Häufige Fragen zum Aufhebungsvertrag-Check</h2>
            </div>
            <div className={styles.faqContainer}>
              {faqSchema.mainEntity.map((faq, i) => (
                <details className={styles.faqItem} key={i}>
                  <summary className={styles.faqQuestion}>
                    {faq.name}
                    <ChevronDown size={20} className={styles.faqIcon} />
                  </summary>
                  <p className={styles.faqAnswer}>{faq.acceptedAnswer.text}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* RELATED */}
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
                  <div className={styles.relatedDescription}>Probezeit, Wettbewerbsverbot, Überstunden — KI-Check auf Basis BAG-Rechtsprechung</div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
              <Link to="/ki-vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f59e0b' }}><Info size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>KI-Vertragsanalyse Guide</div>
                  <div className={styles.relatedDescription}>Der komplette Guide: Wie KI-Vertragsanalyse funktioniert, KI vs. Anwalt, Kosten</div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
              <Link to="/rechtslexikon/abfindung" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#10b981' }}><Euro size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Abfindung — einfach erklärt</div>
                  <div className={styles.relatedDescription}>Höhe, Faustformel, Besteuerung und Fünftelregelung im Überblick</div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
              <Link to="/rechtslexikon/sperrzeit" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#ef4444' }}><Clock size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Sperrzeit beim Arbeitslosengeld</div>
                  <div className={styles.relatedDescription}>Wann sie droht, wie lange sie dauert und wie du sie vermeidest</div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={`${styles.ctaCard} ${styles.animateOnScroll}`} ref={addToRefs}>
              <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>
                  Unterschreibe keinen Aufhebungsvertrag ungeprüft.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Sperrzeit, zu niedrige Abfindung, verfallene Ansprüche — die teuersten Fehler
                  passieren vor der Unterschrift. Lade deinen Aufhebungsvertrag hoch und erhalte
                  den Risiko-Report in unter 60 Sekunden.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Aufhebungsvertrag jetzt prüfen
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

export default AufhebungsvertragPruefen;

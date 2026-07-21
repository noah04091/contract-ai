import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../../hooks/useAuth";
import styles from "../../styles/FeaturePage.module.css";
import LandingFooter from "../../components/LandingFooter";
import {
  Shield, Zap, FileText, AlertTriangle, CheckCircle,
  ArrowRight, Clock, BookOpen, ChevronDown,
  Sparkles, Scale, Camera, CalendarClock, Quote, UserCheck
} from "lucide-react";

const KuendigungPruefen: React.FC = () => {
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
        "name": "Kündigung prüfen",
        "item": "https://www.contract-ai.de/kuendigung-pruefen"
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Wie schnell muss ich gegen eine Kündigung vorgehen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sehr schnell: Für die Kündigungsschutzklage gilt grundsätzlich eine Frist von drei Wochen ab Zugang der schriftlichen Kündigung (§ 4 KSchG). Wird sie versäumt, gilt die Kündigung nach § 7 KSchG als von Anfang an wirksam — selbst wenn sie eigentlich angreifbar gewesen wäre. Genau deshalb erkennt Contract AI die Klagefrist automatisch und trägt sie mit Erinnerung in deinen Kalender ein."
        }
      },
      {
        "@type": "Question",
        "name": "Ist eine Kündigung per E-Mail oder WhatsApp wirksam?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein. Die Kündigung eines Arbeitsverhältnisses bedarf nach § 623 BGB der Schriftform — also ein Original-Dokument mit eigenhändiger Unterschrift. Die elektronische Form ist ausdrücklich ausgeschlossen. Kündigungen per E-Mail, WhatsApp, SMS oder Fax sind formunwirksam. Die KI-Analyse weist auf solche Formfragen hin, die endgültige Bewertung des Einzelfalls gehört zu einem Fachanwalt."
        }
      },
      {
        "@type": "Question",
        "name": "Was prüft die KI an meinem Kündigungsschreiben?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Die Analyse betrachtet das Schreiben aus deiner Sicht als Empfänger: Welche Fristen laufen jetzt (Klagefrist, Kündigungsfrist nach § 622 BGB, Meldepflicht bei der Agentur für Arbeit nach § 38 SGB III)? Gibt es Hinweise auf Formprobleme (§ 623 BGB, fehlende Vollmacht nach § 174 BGB)? Welche nächsten Schritte sind sinnvoll? Wichtige Aussagen werden mit wörtlichen Zitaten aus deinem Schreiben belegt, und erkannte Fristen landen automatisch in deinem Kalender."
        }
      },
      {
        "@type": "Question",
        "name": "Habe ich bei einer Kündigung Anspruch auf eine Abfindung?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Einen allgemeinen gesetzlichen Abfindungsanspruch gibt es nicht. Ausnahme: Bei einer betriebsbedingten Kündigung kann der Arbeitgeber nach § 1a KSchG eine Abfindung von 0,5 Monatsverdiensten pro Beschäftigungsjahr anbieten, wenn du im Gegenzug auf die Klage verzichtest. In der Praxis entstehen Abfindungen meist als Vergleich im Kündigungsschutzprozess — auch deshalb ist die 3-Wochen-Frist so wichtig: Ohne fristgerechte Klage entfällt dieses Verhandlungsdruckmittel."
        }
      },
      {
        "@type": "Question",
        "name": "Was muss ich nach der Kündigung bei der Agentur für Arbeit tun?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Du musst dich nach § 38 SGB III spätestens drei Monate vor dem Ende des Arbeitsverhältnisses arbeitsuchend melden. Liegen zwischen Kenntnis der Kündigung und Vertragsende weniger als drei Monate, muss die Meldung innerhalb von drei Tagen erfolgen. Eine verspätete Meldung kann zu einer einwöchigen Sperrzeit beim Arbeitslosengeld führen (§ 159 Abs. 1 Nr. 7 SGB III). Die KI-Analyse erinnert dich an diese Meldepflicht."
        }
      },
      {
        "@type": "Question",
        "name": "Gilt das Kündigungsschutzgesetz für mich?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Das Kündigungsschutzgesetz greift, wenn der Betrieb regelmäßig mehr als zehn Arbeitnehmer beschäftigt (§ 23 KSchG) und dein Arbeitsverhältnis länger als sechs Monate besteht (§ 1 KSchG). Unabhängig davon gibt es Sonderkündigungsschutz, etwa in der Schwangerschaft (§ 17 MuSchG), bei Schwerbehinderung (§ 168 SGB IX, Zustimmung des Integrationsamts nötig) und in der Elternzeit (§ 18 BEEG). Auch außerhalb des KSchG kann eine Kündigung an Form- oder Fristfehlern scheitern."
        }
      },
      {
        "@type": "Question",
        "name": "Kann ich einfach ein Foto meiner Kündigung hochladen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ja. Du kannst das Kündigungsschreiben einfach mit dem Handy abfotografieren und das Foto hochladen — die Texterkennung liest das Dokument automatisch aus, und die Analyse startet wie bei einer PDF. Die Analyse weist transparent darauf hin, wenn sie auf Texterkennung basiert, damit du wichtige Zahlen kurz am Original gegenprüfen kannst."
        }
      },
      {
        "@type": "Question",
        "name": "Ersetzt die KI-Prüfung einen Anwalt für Arbeitsrecht?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nein — die KI liefert eine strukturierte Ersteinschätzung und keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Gerade wenn du eine Kündigungsschutzklage erwägst, solltest du wegen der 3-Wochen-Frist zügig einen Fachanwalt für Arbeitsrecht einschalten. Die KI-Analyse verschafft dir vorher in Minuten den Überblick über Fristen und Angriffspunkte — eine fundierte Grundlage für das Anwaltsgespräch."
        }
      }
    ]
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "Kündigung mit KI prüfen lassen",
    "description": "In drei Schritten vom Kündigungsschreiben (Foto oder PDF) zur Ersteinschätzung mit allen Fristen im Kalender.",
    "totalTime": "PT2M",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Kündigung hochladen oder abfotografieren",
        "text": "Lade das Kündigungsschreiben als PDF hoch — oder fotografiere es einfach mit dem Handy ab. Die Übertragung erfolgt verschlüsselt, die Verarbeitung DSGVO-konform."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Analyse aus deiner Sicht als Empfänger",
        "text": "Die KI erkennt das Dokument als Kündigung und prüft es aus Empfänger-Perspektive: Klagefrist nach § 4 KSchG, Kündigungsfrist nach § 622 BGB, Formfragen nach § 623 und § 174 BGB, Meldepflichten nach § 38 SGB III — wichtige Aussagen mit wörtlichem Zitat aus deinem Schreiben belegt."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Fristen im Kalender, klare nächste Schritte",
        "text": "Die erkannten Fristen — allen voran die 3-Wochen-Klagefrist — landen automatisch mit Erinnerung in deinem Kalender. Dazu bekommst du eine verständliche Einschätzung und konkrete nächste Schritte."
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Kündigung erhalten? Jetzt prüfen lassen – KI-Check in 2 Min. | Contract AI</title>
        <meta name="description" content="Kündigung erhalten? KI-Prüfung aus deiner Sicht: 3-Wochen-Klagefrist automatisch im Kalender, Formfehler nach § 623 BGB erkennen, nächste Schritte verstehen. Foto genügt. ✓ Kostenlos starten" />
        <meta name="keywords" content="Kündigung prüfen, Kündigung erhalten was tun, Kündigungsschreiben prüfen lassen, Kündigung wirksam, Klagefrist Kündigung, Kündigungsschutzklage Frist, Kündigung Formfehler, Kündigung checken" />

        <link rel="canonical" href="https://www.contract-ai.de/kuendigung-pruefen" />
        <meta name="robots" content="index,follow" />

        <meta property="og:title" content="Kündigung erhalten? Jetzt prüfen lassen – KI-Check in 2 Min. | Contract AI" />
        <meta property="og:description" content="Kündigung erhalten? KI-Prüfung aus deiner Sicht: Klagefrist im Kalender, Formfehler erkennen, nächste Schritte verstehen. Foto genügt." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.contract-ai.de/kuendigung-pruefen" />
        <meta property="og:image" content="https://www.contract-ai.de/og/og-vertragsanalyse.png" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:site_name" content="Contract AI" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Kündigung erhalten? Jetzt prüfen lassen – KI-Check in 2 Min. | Contract AI" />
        <meta name="twitter:description" content="Kündigung erhalten? KI-Prüfung aus deiner Sicht: Klagefrist im Kalender, Formfehler erkennen, nächste Schritte verstehen." />
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
                Für Arbeitnehmer, die eine Kündigung erhalten haben
              </div>

              <h1 className={styles.heroTitle}>
                Kündigung erhalten?<br/>
                <span className={styles.heroTitleHighlight}>Jetzt prüfen — die Klagefrist läuft</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Für die Kündigungsschutzklage bleiben dir grundsätzlich nur drei Wochen ab Zugang
                (§ 4 KSchG). Die KI prüft dein Kündigungsschreiben aus deiner Sicht als Empfänger:
                Fristen, Formfragen, nächste Schritte — und trägt die Klagefrist automatisch mit
                Erinnerung in deinen Kalender ein. Ein Handy-Foto genügt.
              </p>

              <div className={styles.heroCta}>
                <Link to={target} className={styles.btnPrimary}>
                  Kündigung jetzt prüfen
                  <ArrowRight size={20} />
                </Link>
                <a href="#wichtig" className={styles.btnSecondary}>
                  Die 8 wichtigsten Punkte
                </a>
              </div>
            </div>

            {/* Demo Window — Kündigungs-spezifisch */}
            <div className={styles.heroVisual}>
              <div className={`${styles.floatingElement} ${styles.floatingElement1}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconBlue}`}>
                  <CalendarClock size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Klagefrist im Kalender</div>
                  <div className={styles.floatingSubtext}>automatisch + Erinnerung</div>
                </div>
              </div>

              <div className={`${styles.floatingElement} ${styles.floatingElement2}`}>
                <div className={`${styles.floatingIcon} ${styles.floatingIconGreen}`}>
                  <Camera size={20} />
                </div>
                <div>
                  <div className={styles.floatingText}>Foto genügt</div>
                  <div className={styles.floatingSubtext}>einfach abfotografieren</div>
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
                      <span className={styles.demoScoreValue}>!</span>
                    </div>
                    <div className={styles.demoScoreText}>
                      <div className={styles.demoScoreLabel}>Ersteinschätzung</div>
                      <div className={styles.demoScoreTitle}>Kündigungsschreiben.pdf</div>
                    </div>
                  </div>
                  <div className={styles.demoFindings}>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.risk}`}>
                        <Clock size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Klagefrist: 3 Wochen ab Zugang (§ 4 KSchG)</span>
                      <span className={`${styles.demoFindingBadge} ${styles.high}`}>Frist läuft</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.warning}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Kündigungsfrist gegen § 622 BGB prüfen</span>
                      <span className={`${styles.demoFindingBadge} ${styles.medium}`}>Prüfen</span>
                    </div>
                    <div className={styles.demoFinding}>
                      <div className={`${styles.demoFindingIcon} ${styles.info}`}>
                        <CheckCircle size={14} />
                      </div>
                      <span className={styles.demoFindingText}>Arbeitsuchend melden (§ 38 SGB III)</span>
                      <span className={`${styles.demoFindingBadge} ${styles.low}`}>Erinnerung</span>
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
              <Quote size={18} />
              Aussagen wörtlich am Schreiben belegt
            </div>
            <div className={styles.trustBadge}>
              <CheckCircle size={18} />
              DSGVO-konform
            </div>
            <div className={styles.trustBadge}>
              <Camera size={18} />
              Foto-Upload — Handy genügt
            </div>
            <div className={styles.trustBadge}>
              <CalendarClock size={18} />
              Fristen automatisch im Kalender
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
              <h2 className={styles.sectionTitle}>Was die KI an deiner Kündigung prüft</h2>
              <p className={styles.sectionSubtitle}>
                Acht Punkte, auf die es nach Erhalt einer Kündigung wirklich ankommt — aus deiner
                Perspektive als Empfänger, nicht aus der des Absenders.
              </p>
            </div>

            <div className={styles.functionsGrid4col}>
              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <Clock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Klagefrist (3 Wochen)</h3>
                <p className={styles.functionDesc}>
                  § 4 KSchG — die wichtigste Frist überhaupt. Wird automatisch berechnet und mit
                  Erinnerung in den Kalender eingetragen.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <FileText size={24} />
                </div>
                <h3 className={styles.functionTitle}>Schriftform</h3>
                <p className={styles.functionDesc}>
                  § 623 BGB — Kündigungen per E-Mail, WhatsApp oder Fax sind formunwirksam.
                  Nur das unterschriebene Original zählt.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)', color: '#8b5cf6' }}>
                  <UserCheck size={24} />
                </div>
                <h3 className={styles.functionTitle}>Vollmacht des Unterzeichners</h3>
                <p className={styles.functionDesc}>
                  § 174 BGB — kündigt nicht der Chef selbst und liegt keine Original-Vollmacht bei,
                  kann die Kündigung unverzüglich zurückgewiesen werden.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Scale size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kündigungsfrist</h3>
                <p className={styles.functionDesc}>
                  § 622 BGB — stimmt der Beendigungstermin? Gestaffelte Fristen je nach
                  Betriebszugehörigkeit, bis zu sieben Monate.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Shield size={24} />
                </div>
                <h3 className={styles.functionTitle}>Kündigungsschutz</h3>
                <p className={styles.functionDesc}>
                  Greift das KSchG (mehr als 10 Mitarbeiter, über 6 Monate beschäftigt)?
                  Hinweise auf deine Schutzposition.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#f97316' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 className={styles.functionTitle}>Sonderkündigungsschutz</h3>
                <p className={styles.functionDesc}>
                  Schwangerschaft (§ 17 MuSchG), Schwerbehinderung (§ 168 SGB IX),
                  Elternzeit (§ 18 BEEG) — besondere Hürden für den Arbeitgeber.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)', color: '#06b6d4' }}>
                  <CalendarClock size={24} />
                </div>
                <h3 className={styles.functionTitle}>Meldepflicht Agentur für Arbeit</h3>
                <p className={styles.functionDesc}>
                  § 38 SGB III — bei kurzer Frist musst du dich binnen drei Tagen arbeitsuchend
                  melden, sonst droht eine Sperrzeit.
                </p>
              </div>

              <div className={`${styles.functionCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.functionIcon} style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', color: '#ec4899' }}>
                  <BookOpen size={24} />
                </div>
                <h3 className={styles.functionTitle}>Offene Ansprüche</h3>
                <p className={styles.functionDesc}>
                  Resturlaub, Überstunden, Arbeitszeugnis (§ 109 GewO) — was dir beim Ausscheiden
                  noch zusteht und welche Ausschlussfristen laufen.
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
                <h2 className={styles.sectionTitleLeft}>Nach drei Wochen ist fast alles entschieden</h2>
                <p className={styles.problemText}>
                  Eine Kündigung trifft die meisten Menschen unvorbereitet — und genau dann beginnt
                  die kürzeste und wichtigste Frist des Arbeitsrechts: Wer nicht innerhalb von
                  <strong> drei Wochen</strong> Kündigungsschutzklage erhebt, gegen den gilt die
                  Kündigung nach § 7 KSchG als von Anfang an wirksam — selbst wenn sie fehlerhaft
                  war. Formfehler, falsche Fristen oder fehlende Vollmachten nützen dir dann nichts
                  mehr. Dazu kommen Meldepflichten bei der Agentur für Arbeit, deren Versäumnis
                  bares Geld kostet. Das Tückische: All das steht nicht im Kündigungsschreiben.
                </p>

                <div className={styles.problemStats}>
                  <div className={`${styles.problemStat} ${styles.danger}`}>
                    <div className={styles.problemStatValue}>3 Wochen</div>
                    <div className={styles.problemStatLabel}>Klagefrist ab Zugang der Kündigung (§ 4 KSchG)</div>
                  </div>
                  <div className={`${styles.problemStat} ${styles.warningBg}`}>
                    <div className={styles.problemStatValue}>3 Tage</div>
                    <div className={styles.problemStatLabel}>Frist für die Arbeitsuchend-Meldung bei kurzfristiger Kündigung (§ 38 SGB III)</div>
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
                      <div className={styles.problemDocTitle}>Kündigungsschreiben.pdf</div>
                      <div className={styles.problemDocSubtitle}>1 Seite • Heute zugegangen</div>
                    </div>
                  </div>
                  <div className={styles.problemDocLines}>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                    <div className={styles.problemDocLine}></div>
                  </div>
                  <div className={styles.problemDocHighlight}>
                    <div className={styles.problemDocHighlightText}>
                      "...kündigen wir das mit Ihnen bestehende Arbeitsverhältnis ordentlich und fristgerecht zum nächstmöglichen Zeitpunkt..."
                    </div>
                  </div>
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning1}`}>
                  <div className={`${styles.warningIcon} ${styles.red}`}>
                    <Clock size={16} />
                  </div>
                  Klagefrist läuft ab Zugang!
                </div>

                <div className={`${styles.problemWarning} ${styles.problemWarning2}`}>
                  <div className={`${styles.warningIcon} ${styles.orange}`}>
                    <AlertTriangle size={16} />
                  </div>
                  Beendigungstermin unklar
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
                    <span className={styles.comparisonLabel}>Ohne Prüfung</span>
                    <div className={styles.comparisonIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.comparisonTitle}>Unsicherheit & Googeln</div>
                    <div className={styles.comparisonDesc}>
                      Fristen unklar, Formfragen unbeantwortet, wichtige Meldepflichten unbekannt —
                      während die Klagefrist bereits läuft.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Clock size={16} />
                      Zeit läuft gegen dich
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
                    <div className={styles.comparisonTitle}>Klarheit in Minuten</div>
                    <div className={styles.comparisonDesc}>
                      Alle Fristen erkannt und im Kalender, Formfragen benannt, nächste Schritte
                      verständlich erklärt — mit wörtlichen Belegen aus deinem Schreiben.
                    </div>
                    <div className={styles.comparisonTime}>
                      <Zap size={16} />
                      In ca. 2 Minuten
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.solutionContent} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.sectionEyebrow}>Die Lösung</span>
                <h2 className={styles.sectionTitleLeft}>Eine Analyse, die auf deiner Seite steht</h2>
                <p className={styles.solutionText}>
                  Die meisten Vertrags-Tools prüfen Verträge vor der Unterschrift. Contract AI
                  erkennt automatisch, dass du ein <strong>einseitiges Schreiben erhalten</strong> hast
                  — und wechselt die Perspektive: Was bedeutet das für dich, welche Fristen laufen,
                  wo sind Angriffspunkte, was solltest du jetzt tun.
                </p>

                <div className={styles.solutionFeatures}>
                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Quote size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Wörtlich belegt statt behauptet</h3>
                      <p>Wichtige Aussagen werden mit Zitaten aus deinem Schreiben belegt und automatisch gegengeprüft</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <CalendarClock size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Fristen direkt im Kalender</h3>
                      <p>Klagefrist & Co. werden automatisch eingetragen — mit rechtzeitiger E-Mail-Erinnerung</p>
                    </div>
                  </div>

                  <div className={styles.solutionFeature}>
                    <div className={styles.solutionFeatureIcon}>
                      <Camera size={20} />
                    </div>
                    <div className={styles.solutionFeatureText}>
                      <h3>Foto genügt</h3>
                      <p>Kündigung mit dem Handy abfotografieren — die Texterkennung übernimmt den Rest</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            SECTION 6 — DIE 8 WICHTIGSTEN PUNKTE (Kern-SEO-Section)
            ========================================== */}
        <section className={styles.risksSection} id="wichtig">
          <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.animateOnScroll}`} ref={addToRefs}>
              <span className={styles.sectionEyebrow}>Kündigung erhalten — was jetzt?</span>
              <h2 className={styles.sectionTitle}>Die 8 wichtigsten Punkte nach einer Kündigung</h2>
              <p className={styles.sectionSubtitle}>
                Diese acht Dinge entscheiden in den ersten Tagen nach Zugang der Kündigung über
                deine Position — jede mit rechtlicher Einordnung und Paragraphen-Verweis.
              </p>
            </div>

            <div className={styles.risksGrid}>

              {/* PUNKT 1: Klagefrist */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>1. Die 3-Wochen-Klagefrist nicht verpassen</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Kritisch</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  Die Frist läuft ab Zugang der schriftlichen Kündigung — nicht ab dem Beendigungstermin.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 4 KSchG</strong> muss die Kündigungsschutzklage binnen <strong>drei Wochen ab Zugang</strong> beim Arbeitsgericht eingehen. Versäumst du die Frist, gilt die Kündigung nach <strong>§ 7 KSchG als von Anfang an wirksam</strong> — auch eine eigentlich angreifbare Kündigung wird dann unangreifbar. Contract AI trägt diese Frist automatisch in deinen Kalender ein.</span>
                </div>
              </div>

              {/* PUNKT 2: Schriftform */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>2. Kündigung per E-Mail oder WhatsApp?</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Formfehler</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  "...kündigen wir Ihnen hiermit per E-Mail zum 31.08. Eine schriftliche Bestätigung folgt."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Die Kündigung eines Arbeitsverhältnisses bedarf nach <strong>§ 623 BGB</strong> der Schriftform mit <strong>eigenhändiger Original-Unterschrift</strong>; die elektronische Form ist ausdrücklich ausgeschlossen. E-Mail, WhatsApp, SMS oder Fax wahren die Form <strong>nicht</strong>. Lass die Formfrage anwaltlich bewerten, bevor du daraus Schlüsse ziehst.</span>
                </div>
              </div>

              {/* PUNKT 3: Vollmacht */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>3. Wer hat unterschrieben — und darf der das?</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Oft übersehen</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Unterschrift „i.A. Müller, Teamleitung" — ohne beigefügte Vollmachtsurkunde.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Kündigt ein Bevollmächtigter (z.B. Personalabteilung, externe Kanzlei) ohne beigefügte <strong>Original-Vollmacht</strong>, kannst du die Kündigung nach <strong>§ 174 BGB unverzüglich zurückweisen</strong> — die Rechtsprechung gewährt dafür nur etwa eine Woche. Die Zurückweisung macht die Kündigung unwirksam; sie müsste neu ausgesprochen werden. Schnelligkeit ist hier alles.</span>
                </div>
              </div>

              {/* PUNKT 4: Kündigungsfrist */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>4. Stimmt der Beendigungstermin?</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Geld wert</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "...zum nächstmöglichen Zeitpunkt" — oder ein konkretes Datum, das zu früh liegt.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Die gesetzlichen Kündigungsfristen (<strong>§ 622 BGB</strong>) verlängern sich mit der Betriebszugehörigkeit — von vier Wochen bis zu <strong>sieben Monaten</strong> (ab 20 Jahren). Eine zu kurz berechnete Frist beendet das Arbeitsverhältnis in der Regel erst zum <strong>richtigen</strong> Termin — das können mehrere Monate Gehalt Unterschied sein.</span>
                </div>
              </div>

              {/* PUNKT 5: Arbeitsuchend melden */}
              <div className={`${styles.riskCard} ${styles.critical} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>5. Sofort arbeitsuchend melden</h3>
                  <span className={`${styles.riskBadge} ${styles.critical}`}>Sperrzeit-Risiko</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.critical}`}>
                  Viele melden sich erst zum Vertragsende — und riskieren damit eine Sperrzeit beim Arbeitslosengeld.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nach <strong>§ 38 SGB III</strong> musst du dich spätestens drei Monate vor dem Ende arbeitsuchend melden — bleiben weniger als drei Monate, <strong>innerhalb von drei Tagen</strong> nach Kenntnis der Kündigung. Eine verspätete Meldung kann eine <strong>einwöchige Sperrzeit</strong> auslösen (§ 159 Abs. 1 Nr. 7 SGB III). Die Meldung ist auch online möglich und gilt zunächst formlos.</span>
                </div>
              </div>

              {/* PUNKT 6: Aufhebungsvertrag */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>6. Nichts vorschnell unterschreiben</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Vorsicht</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  "Wir bieten Ihnen alternativ einen Aufhebungsvertrag mit sofortiger Freistellung an — bitte bis morgen unterschreiben."
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Ein <strong>Aufhebungsvertrag</strong> beendet das Arbeitsverhältnis einvernehmlich — und kann beim Arbeitslosengeld eine <strong>Sperrzeit von bis zu zwölf Wochen</strong> auslösen (§ 159 Abs. 1 Nr. 1 SGB III), weil du an der Beendigung mitgewirkt hast. Unterschreibe nichts unter Zeitdruck; lass das Angebot erst prüfen — auch mit unserem <Link to="/aufhebungsvertrag-pruefen">Aufhebungsvertrag-Check</Link>.</span>
                </div>
              </div>

              {/* PUNKT 7: Sonderkündigungsschutz */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>7. Besonderer Schutz? Sofort geltend machen</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Wichtig</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Schwangerschaft, Schwerbehinderung oder Elternzeit — dem Arbeitgeber unbekannt oder ignoriert.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>In der Schwangerschaft ist die Kündigung grundsätzlich unzulässig (<strong>§ 17 MuSchG</strong> — Mitteilung an den Arbeitgeber binnen zwei Wochen nach Zugang möglich). Bei Schwerbehinderung braucht der Arbeitgeber die <strong>vorherige Zustimmung des Integrationsamts</strong> (§ 168 SGB IX), in der Elternzeit gilt § 18 BEEG. Solche Schutzrechte müssen schnell geltend gemacht werden.</span>
                </div>
              </div>

              {/* PUNKT 8: Ansprüche sichern */}
              <div className={`${styles.riskCard} ${styles.warning} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.riskHeader}>
                  <h3 className={styles.riskTitle}>8. Resturlaub, Überstunden, Zeugnis sichern</h3>
                  <span className={`${styles.riskBadge} ${styles.warning}`}>Ausschlussfristen</span>
                </div>
                <div className={`${styles.riskIssue} ${styles.warning}`}>
                  Viele Arbeitsverträge enthalten Ausschlussfristen von drei Monaten — danach sind Ansprüche weg.
                </div>
                <div className={styles.riskSolution}>
                  <CheckCircle size={18} />
                  <span>Nicht genommener Urlaub ist beim Ausscheiden <strong>abzugelten</strong> (§ 7 Abs. 4 BUrlG), dokumentierte Überstunden sind zu vergüten, und ein <strong>Arbeitszeugnis</strong> steht dir nach § 109 GewO zu. Achtung: Vertragliche <strong>Ausschlussfristen</strong> (häufig drei Monate) können diese Ansprüche verfallen lassen — mach sie schriftlich geltend.</span>
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
              <h2 className={styles.sectionTitle}>In drei Schritten zur Ersteinschätzung</h2>
              <p className={styles.sectionSubtitle}>
                Vom Kündigungsschreiben zur klaren Übersicht — ohne Termin, ohne Wartezeit.
              </p>
            </div>

            <div className={styles.processContainer}>
              <div className={styles.processLine}></div>

              <div className={styles.processTimeline}>
                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>1</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Hochladen oder abfotografieren</h3>
                    <p className={styles.processDesc}>
                      Lade das Kündigungsschreiben als PDF hoch — oder fotografiere es einfach
                      mit dem Handy. Die Übertragung erfolgt verschlüsselt, die Verarbeitung
                      DSGVO-konform.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>2</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Analyse aus deiner Sicht</h3>
                    <p className={styles.processDesc}>
                      Die KI erkennt das Dokument automatisch als Kündigung und prüft es aus
                      Empfänger-Perspektive: Klagefrist (§ 4 KSchG), Kündigungsfrist (§ 622 BGB),
                      Formfragen (§ 623, § 174 BGB), Meldepflichten (§ 38 SGB III) — wichtige
                      Aussagen mit wörtlichem Zitat aus deinem Schreiben belegt.
                    </p>
                  </div>
                </div>

                <div className={`${styles.processStep} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.processNumber}>3</div>
                  <div className={styles.processContent}>
                    <h3 className={styles.processTitle}>Fristen im Kalender, klare Schritte</h3>
                    <p className={styles.processDesc}>
                      Die erkannten Fristen — allen voran die 3-Wochen-Klagefrist — landen
                      automatisch mit Erinnerung in deinem Kalender. Dazu bekommst du eine
                      verständliche Einschätzung und konkrete nächste Schritte, auch als PDF.
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
              <h2 className={styles.sectionTitle}>Warum Contract AI bei einer Kündigung?</h2>
              <p className={styles.sectionSubtitle}>
                Vier Gründe, warum das mehr ist als ein Ratgeber-Artikel.
              </p>
            </div>

            <div className={styles.whyGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)', color: '#3b82f6' }}>
                  <UserCheck size={28} />
                </div>
                <h3 className={styles.whyTitle}>Deine Perspektive</h3>
                <p className={styles.whyDesc}>
                  Die Analyse erkennt einseitige Schreiben automatisch und prüft sie aus deiner
                  Sicht als Empfänger — Fristen, Schutzrechte, Angriffspunkte.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', color: '#10b981' }}>
                  <Quote size={28} />
                </div>
                <h3 className={styles.whyTitle}>Wörtlich belegt</h3>
                <p className={styles.whyDesc}>
                  Wichtige Aussagen werden mit Zitaten aus deinem Schreiben belegt und automatisch
                  gegen den Originaltext geprüft — keine bloßen Behauptungen.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', color: '#ef4444' }}>
                  <CalendarClock size={28} />
                </div>
                <h3 className={styles.whyTitle}>Keine Frist mehr verpassen</h3>
                <p className={styles.whyDesc}>
                  Klagefrist, Meldepflicht, Beendigungstermin — alles landet automatisch in
                  deinem Kalender, mit E-Mail-Erinnerung zur richtigen Zeit.
                </p>
              </div>

              <div className={`${styles.whyCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.whyIcon} style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', color: '#eab308' }}>
                  <Camera size={28} />
                </div>
                <h3 className={styles.whyTitle}>Sofort startklar</h3>
                <p className={styles.whyDesc}>
                  Kein Scanner nötig: Kündigung mit dem Handy abfotografieren, hochladen, fertig —
                  auch abends auf der Couch, wenn der Brief im Kasten lag.
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
              <h2 className={styles.sectionTitle}>Kündigung erhalten — was du jetzt wissen musst</h2>
            </div>

            <div className={`${styles.problemContent} ${styles.animateOnScroll}`} ref={addToRefs} style={{ maxWidth: '860px', margin: '0 auto' }}>
              <p className={styles.problemText}>
                Der Moment, in dem eine Kündigung auf dem Tisch liegt, ist für die meisten
                Menschen ein Ausnahmezustand. Genau deshalb ist es wichtig zu wissen: Das
                Arbeitsrecht gibt dir Rechte und Fristen an die Hand — aber es verlangt, dass du
                schnell handelst. Die folgenden Punkte geben dir den Überblick; sie ersetzen keine
                Rechtsberatung im Einzelfall.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Der Zugang entscheidet — nicht das Datum im Briefkopf
              </h3>
              <p className={styles.problemText}>
                Alle Fristen laufen ab dem <strong>Zugang</strong> der Kündigung — also ab dem
                Moment, in dem das Schreiben so in deinen Machtbereich gelangt, dass du unter
                gewöhnlichen Umständen davon Kenntnis nehmen kannst (etwa der Einwurf in deinen
                Briefkasten). Das Datum im Briefkopf ist dafür unerheblich. Notiere dir deshalb,
                <strong> wann</strong> und <strong>wie</strong> dir die Kündigung zugegangen ist —
                im Streitfall muss der Arbeitgeber den Zugang beweisen.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Die 3-Wochen-Frist — dein wichtigster Hebel
              </h3>
              <p className={styles.problemText}>
                Ob eine Kündigung sozial gerechtfertigt, formwirksam oder fristgerecht ist, wird
                praktisch nur relevant, wenn du sie <strong>innerhalb von drei Wochen</strong> mit
                der Kündigungsschutzklage angreifst (§ 4 KSchG). Nach Fristablauf heilt § 7 KSchG
                fast alle Mängel. Das bedeutet umgekehrt: Auch eine offensichtlich fehlerhafte
                Kündigung wird bestandskräftig, wenn du nichts tust. Die Klage kann beim
                Arbeitsgericht auch ohne Anwalt erhoben werden (in der ersten Instanz besteht kein
                Anwaltszwang) — empfehlenswert ist anwaltliche Unterstützung trotzdem, vor allem
                wenn es um eine Abfindung geht.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Abfindung: kein Automatismus, aber ein realistisches Ziel
              </h3>
              <p className={styles.problemText}>
                Entgegen der verbreiteten Annahme gibt es <strong>keinen allgemeinen gesetzlichen
                Abfindungsanspruch</strong>. Der Weg zur Abfindung führt in der Praxis meist über
                die Kündigungsschutzklage: Weil ein verlorener Prozess für den Arbeitgeber teuer
                ist (Annahmeverzugslohn!), enden viele Verfahren mit einem Vergleich. Daneben gibt
                es § 1a KSchG: Bietet der Arbeitgeber bei einer betriebsbedingten Kündigung eine
                Abfindung von 0,5 Monatsverdiensten pro Beschäftigungsjahr für den Klageverzicht
                an, entsteht mit Fristablauf ein echter Anspruch. Auch hier gilt: Ohne gewahrte
                Klagefrist hast du kein Druckmittel.
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Arbeitslosengeld sichern — die unterschätzten Pflichten
              </h3>
              <p className={styles.problemText}>
                Parallel zum Arbeitsrecht läuft das Sozialrecht: Melde dich <strong>unverzüglich
                arbeitsuchend</strong> (§ 38 SGB III — bei weniger als drei Monaten Restlaufzeit
                binnen drei Tagen nach Kenntnis) und rechtzeitig vor Vertragsende arbeitslos.
                Eine verspätete Arbeitsuchend-Meldung kann eine einwöchige Sperrzeit auslösen.
                Besondere Vorsicht gilt bei <strong>Aufhebungsverträgen</strong>: Wer an der
                Beendigung seines Arbeitsverhältnisses mitwirkt, riskiert ohne wichtigen Grund
                eine Sperrzeit von bis zu zwölf Wochen (§ 159 SGB III).
              </p>

              <h3 style={{ marginTop: '2rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 600 }}>
                Was die KI-Analyse leistet — und was nicht
              </h3>
              <p className={styles.problemText}>
                Contract AI verschafft dir in wenigen Minuten den strukturierten Überblick:
                Welche Fristen laufen ab wann, welche Formfragen stellen sich, welche Schritte
                stehen an — mit wörtlichen Belegen aus deinem Schreiben und automatischen
                Kalender-Erinnerungen. Das ist eine <strong>Ersteinschätzung</strong>, keine
                Rechtsberatung im Sinne des RDG. Ob du tatsächlich Klage erhebst, ob ein
                Formfehler im Einzelfall trägt und wie du verhandelst, gehört in die Hände eines
                Fachanwalts für Arbeitsrecht — je früher, desto besser, denn die drei Wochen
                laufen ab Tag eins.
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
              <h2 className={styles.sectionTitle}>Bei einer Kündigung zählt jeder Tag</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>3 Wochen</div>
                <div className={styles.statLabel}>Klagefrist ab Zugang (§ 4 KSchG)</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>3 Tage</div>
                <div className={styles.statLabel}>Arbeitsuchend-Meldung bei kurzer Frist (§ 38 SGB III)</div>
              </div>
              <div className={`${styles.statItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                <div className={styles.statNumber}>~ 2 Min.</div>
                <div className={styles.statLabel}>bis zur Ersteinschätzung mit allen Fristen</div>
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
              <h2 className={styles.sectionTitle}>Häufige Fragen zur Kündigungs-Prüfung</h2>
            </div>

            <div className={styles.faqContainer}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Wie schnell muss ich gegen eine Kündigung vorgehen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Sehr schnell: Für die Kündigungsschutzklage gilt grundsätzlich eine Frist von
                  drei Wochen ab Zugang der schriftlichen Kündigung (§ 4 KSchG). Wird sie
                  versäumt, gilt die Kündigung nach § 7 KSchG als von Anfang an wirksam — selbst
                  wenn sie eigentlich angreifbar gewesen wäre. Genau deshalb erkennt Contract AI
                  die Klagefrist automatisch und trägt sie mit Erinnerung in deinen Kalender ein.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ist eine Kündigung per E-Mail oder WhatsApp wirksam?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein. Die Kündigung eines Arbeitsverhältnisses bedarf nach § 623 BGB der
                  Schriftform — also ein Original-Dokument mit eigenhändiger Unterschrift. Die
                  elektronische Form ist ausdrücklich ausgeschlossen. Kündigungen per E-Mail,
                  WhatsApp, SMS oder Fax sind formunwirksam. Die KI-Analyse weist auf solche
                  Formfragen hin; die endgültige Bewertung des Einzelfalls gehört zu einem
                  Fachanwalt.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was prüft die KI an meinem Kündigungsschreiben?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Die Analyse betrachtet das Schreiben aus deiner Sicht als Empfänger: Welche
                  Fristen laufen jetzt (Klagefrist, Kündigungsfrist nach § 622 BGB, Meldepflicht
                  nach § 38 SGB III)? Gibt es Hinweise auf Formprobleme (§ 623 BGB, fehlende
                  Vollmacht nach § 174 BGB)? Welche nächsten Schritte sind sinnvoll? Wichtige
                  Aussagen werden mit wörtlichen Zitaten aus deinem Schreiben belegt, und erkannte
                  Fristen landen automatisch in deinem Kalender.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Habe ich bei einer Kündigung Anspruch auf eine Abfindung?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Einen allgemeinen gesetzlichen Abfindungsanspruch gibt es nicht. Ausnahme: Bei
                  einer betriebsbedingten Kündigung kann der Arbeitgeber nach § 1a KSchG eine
                  Abfindung von 0,5 Monatsverdiensten pro Beschäftigungsjahr anbieten, wenn du im
                  Gegenzug auf die Klage verzichtest. In der Praxis entstehen Abfindungen meist
                  als Vergleich im Kündigungsschutzprozess — auch deshalb ist die 3-Wochen-Frist
                  so wichtig.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Was muss ich nach der Kündigung bei der Agentur für Arbeit tun?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Du musst dich nach § 38 SGB III spätestens drei Monate vor dem Ende des
                  Arbeitsverhältnisses arbeitsuchend melden. Liegen zwischen Kenntnis der
                  Kündigung und Vertragsende weniger als drei Monate, muss die Meldung innerhalb
                  von drei Tagen erfolgen. Eine verspätete Meldung kann zu einer einwöchigen
                  Sperrzeit beim Arbeitslosengeld führen (§ 159 Abs. 1 Nr. 7 SGB III).
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Gilt das Kündigungsschutzgesetz für mich?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Das Kündigungsschutzgesetz greift, wenn der Betrieb regelmäßig mehr als zehn
                  Arbeitnehmer beschäftigt (§ 23 KSchG) und dein Arbeitsverhältnis länger als
                  sechs Monate besteht (§ 1 KSchG). Unabhängig davon gibt es
                  Sonderkündigungsschutz, etwa in der Schwangerschaft (§ 17 MuSchG), bei
                  Schwerbehinderung (§ 168 SGB IX) und in der Elternzeit (§ 18 BEEG). Auch
                  außerhalb des KSchG kann eine Kündigung an Form- oder Fristfehlern scheitern.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Kann ich einfach ein Foto meiner Kündigung hochladen?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Ja. Du kannst das Kündigungsschreiben einfach mit dem Handy abfotografieren und
                  das Foto hochladen — die Texterkennung liest das Dokument automatisch aus, und
                  die Analyse startet wie bei einer PDF. Die Analyse weist transparent darauf
                  hin, wenn sie auf Texterkennung basiert, damit du wichtige Zahlen kurz am
                  Original gegenprüfen kannst.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  Ersetzt die KI-Prüfung einen Anwalt für Arbeitsrecht?
                  <ChevronDown size={20} className={styles.faqIcon} />
                </summary>
                <p className={styles.faqAnswer}>
                  Nein — die KI liefert eine strukturierte Ersteinschätzung und keine
                  Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG). Gerade wenn du
                  eine Kündigungsschutzklage erwägst, solltest du wegen der 3-Wochen-Frist zügig
                  einen Fachanwalt für Arbeitsrecht einschalten. Die KI-Analyse verschafft dir
                  vorher in Minuten den Überblick über Fristen und Angriffspunkte — eine fundierte
                  Grundlage für das Anwaltsgespräch.
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
              <Link to="/aufhebungsvertrag-pruefen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#ef4444' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Aufhebungsvertrag prüfen</div>
                  <div className={styles.relatedDescription}>
                    Abfindung, Sperrzeit, Klageverzicht — bevor du unterschreibst
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/arbeitsvertrag-pruefen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#3b82f6' }}><FileText size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Arbeitsvertrag prüfen</div>
                  <div className={styles.relatedDescription}>
                    Ausschlussfristen, Überstunden, Wettbewerbsverbot — was jetzt relevant wird
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/blog/kuendigung-arbeitsvertrag-fristen" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#f97316' }}><Clock size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>Kündigungsfristen im Überblick</div>
                  <div className={styles.relatedDescription}>
                    Fristen, Formvorschriften und Kündigungsschutz ausführlich erklärt
                  </div>
                </div>
                <ArrowRight size={20} className={styles.relatedArrow} />
              </Link>

              <Link to="/features/vertragsanalyse" className={`${styles.relatedCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                <span className={styles.relatedIcon} style={{ color: '#8b5cf6' }}><Sparkles size={20} /></span>
                <div className={styles.relatedContent}>
                  <div className={styles.relatedTitle}>So funktioniert die Vertragsanalyse</div>
                  <div className={styles.relatedDescription}>
                    Score, Risiken, wörtliche Belege — die Analyse-Funktion im Detail
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
                  Die Klagefrist läuft ab Zugang. Verschaff dir jetzt Klarheit.
                </h2>
                <p className={styles.ctaSubtitle}>
                  Lade dein Kündigungsschreiben hoch oder fotografiere es einfach ab — in
                  wenigen Minuten kennst du deine Fristen, deine Rechte und deine nächsten
                  Schritte. Alle Fristen automatisch im Kalender.
                </p>
                <div className={styles.ctaButtons}>
                  <Link to={target} className={styles.btnWhite}>
                    Kündigung jetzt prüfen
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

export default KuendigungPruefen;

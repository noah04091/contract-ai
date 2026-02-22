// AGB - Stripe-Level Legal Page Design
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import styles from "../styles/LegalPage.module.css";
import Footer from "../components/Footer";
import {
  Scale, FileText, UserCheck, Layers, CreditCard, Clock,
  Users, Shield, AlertTriangle, RefreshCw, Gavel, CheckCircle,
  Calendar, ArrowRight, ExternalLink, ChevronRight
} from "lucide-react";

interface TocItem {
  id: string;
  title: string;
  icon: React.ReactNode;
}

export default function AGB() {
  const [activeSection, setActiveSection] = useState<string>("");
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Table of Contents items
  const tocItems: TocItem[] = [
    { id: "geltungsbereich", title: "Geltungsbereich", icon: <FileText size={16} /> },
    { id: "vertragsschluss", title: "Vertragsschluss", icon: <UserCheck size={16} /> },
    { id: "leistungsumfang", title: "Leistungsumfang", icon: <Layers size={16} /> },
    { id: "tarife", title: "Tarife & Preise", icon: <CreditCard size={16} /> },
    { id: "laufzeit", title: "Laufzeit & Kündigung", icon: <Clock size={16} /> },
    { id: "rechte", title: "Rechte & Pflichten", icon: <Users size={16} /> },
    { id: "datenschutz", title: "Datenschutz", icon: <Shield size={16} /> },
    { id: "haftung", title: "Haftung", icon: <AlertTriangle size={16} /> },
    { id: "aenderungen", title: "Änderungen der AGB", icon: <RefreshCw size={16} /> },
    { id: "streitbeilegung", title: "Streitbeilegung", icon: <Gavel size={16} /> },
    { id: "schlussbestimmungen", title: "Schlussbestimmungen", icon: <CheckCircle size={16} /> },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            // Update active section for TOC
            const id = entry.target.getAttribute("data-section-id");
            if (id) setActiveSection(id);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
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

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth"
      });
    }
  };

  // Structured Data
  const agbSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Allgemeine Geschäftsbedingungen - Contract AI",
    "description": "AGB von Contract AI - transparente Vertragsbedingungen für KI-gestützte Vertragsanalyse und -verwaltung.",
    "url": "https://www.contract-ai.de/agb",
    "inLanguage": "de-DE",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Contract AI",
      "url": "https://www.contract-ai.de"
    }
  };

  return (
    <>
      <Helmet>
        <title>Allgemeine Geschäftsbedingungen | Contract AI</title>
        <meta name="description" content="Hier findest du die Allgemeinen Geschäftsbedingungen (AGB) von Contract AI – transparent, fair und verständlich erklärt." />
        <meta name="keywords" content="AGB, Vertragsbedingungen, Contract AI AGB, Nutzungsbedingungen, Geschäftsbedingungen" />
        <link rel="canonical" href="https://www.contract-ai.de/agb" />
        <meta property="og:title" content="Allgemeine Geschäftsbedingungen | Contract AI" />
        <meta property="og:description" content="Unsere AGB geben dir volle Transparenz zu den Vertragsbedingungen und der Nutzung von Contract AI." />
        <meta property="og:url" content="https://www.contract-ai.de/agb" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Allgemeine Geschäftsbedingungen | Contract AI" />
        <script type="application/ld+json">
          {JSON.stringify(agbSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        <div className={styles.container}>
          {/* Hero Section */}
          <header className={styles.hero}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot}></span>
              Rechtliche Informationen
            </div>

            <div className={styles.heroIconWrapper}>
              <Scale className={styles.heroIcon} />
            </div>

            <h1 className={styles.heroTitle}>Allgemeine Geschäftsbedingungen</h1>
            <p className={styles.heroSubtitle}>
              Transparente und faire Vertragsbedingungen für die Nutzung von Contract AI
            </p>

            <div className={styles.lastUpdated}>
              <Calendar size={14} />
              Stand: Februar 2025
            </div>
          </header>

          {/* Table of Contents */}
          <nav className={`${styles.tocSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <h2 className={styles.tocTitle}>Inhaltsverzeichnis</h2>
            <div className={styles.tocGrid}>
              {tocItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`${styles.tocItem} ${activeSection === item.id ? styles.tocItemActive : ""}`}
                >
                  <span className={styles.tocNumber}>{index + 1}</span>
                  <span className={styles.tocIcon}>{item.icon}</span>
                  <span className={styles.tocLabel}>{item.title}</span>
                  <ChevronRight size={14} className={styles.tocArrow} />
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content Card */}
          <div className={styles.contentCard}>

            {/* 1. Geltungsbereich */}
            <section
              id="geltungsbereich"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["geltungsbereich"] = el; }}
              data-section-id="geltungsbereich"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <FileText size={22} />
                </div>
                <h2 className={styles.sectionTitle}>1. Geltungsbereich und Vertragspartner</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Webanwendung
                  Contract AI unter der Domain www.contract-ai.de sowie aller damit verbundenen
                  Dienstleistungen.
                </p>

                <div className={styles.highlightBox}>
                  <strong>Anbieter und Vertragspartner:</strong><br />
                  Noah Liebold<br />
                  E-Mail: info@contract-ai.de
                </div>

                <p>
                  Diese AGB gelten für alle Verträge zwischen dem Anbieter und den Nutzern der
                  Plattform, unabhängig davon, ob es sich um Verbraucher oder Unternehmer handelt.
                </p>

                <p>
                  Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen
                  des Nutzers werden nur dann und insoweit Vertragsbestandteil, als der Anbieter
                  ihrer Geltung ausdrücklich zugestimmt hat.
                </p>
              </div>
            </section>

            {/* 2. Vertragsschluss */}
            <section
              id="vertragsschluss"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["vertragsschluss"] = el; }}
              data-section-id="vertragsschluss"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <UserCheck size={22} />
                </div>
                <h2 className={styles.sectionTitle}>2. Vertragsschluss und Registrierung</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>2.1 Registrierung</h3>
                <p>
                  Die Nutzung der Plattform Contract AI erfordert die Erstellung eines Nutzerkontos.
                  Mit der Registrierung gibt der Nutzer ein verbindliches Angebot zum Abschluss eines
                  Nutzungsvertrages ab. Der Vertrag kommt durch die Bestätigung der E-Mail-Adresse
                  durch den Nutzer zustande.
                </p>

                <h3 className={styles.subTitle}>2.2 Voraussetzungen</h3>
                <p>
                  Zur Registrierung berechtigt sind ausschließlich volljährige, geschäftsfähige
                  natürliche Personen sowie juristische Personen. Mit der Registrierung versichert
                  der Nutzer, dass er volljährig und geschäftsfähig ist.
                </p>

                <h3 className={styles.subTitle}>2.3 Wahrheitsgemäße Angaben</h3>
                <p>
                  Der Nutzer verpflichtet sich, bei der Registrierung wahrheitsgemäße und vollständige
                  Angaben zu machen. Änderungen der angegebenen Daten sind dem Anbieter unverzüglich
                  mitzuteilen.
                </p>

                <h3 className={styles.subTitle}>2.4 Zugangsdaten</h3>
                <p>
                  Der Nutzer ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln und vor
                  dem Zugriff Dritter zu schützen. Bei Verdacht auf Missbrauch ist der Anbieter
                  unverzüglich zu informieren.
                </p>
              </div>
            </section>

            {/* 3. Leistungsumfang */}
            <section
              id="leistungsumfang"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["leistungsumfang"] = el; }}
              data-section-id="leistungsumfang"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Layers size={22} />
                </div>
                <h2 className={styles.sectionTitle}>3. Leistungsumfang und Funktionen</h2>
              </div>

              <div className={styles.sectionContent}>
                <p>
                  Contract AI ist eine webbasierte SaaS-Plattform zur Verwaltung, Analyse und
                  Optimierung von Verträgen mittels künstlicher Intelligenz. Die Plattform bietet
                  folgende Hauptfunktionen:
                </p>

                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>3.1 KI-gestützte Vertragsanalyse</div>
                      <div className={styles.infoValue}>
                        Upload von Vertragsdokumenten (PDF), automatische Textextraktion und
                        Analyse durch KI, Erkennung von Risiken und Optimierungspotenzialen.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>3.2 Vertragsverwaltung</div>
                      <div className={styles.infoValue}>
                        Zentrale Ablage und Organisation aller Verträge, Kategorisierung,
                        Suchfunktion und sichere Cloud-Speicherung.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>3.3 Fristen und Erinnerungen</div>
                      <div className={styles.infoValue}>
                        Automatische Erkennung von Kündigungsfristen, Kalenderintegration
                        und E-Mail-Benachrichtigungen.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>3.4 Vertragsvergleich</div>
                      <div className={styles.infoValue}>
                        Vergleich von Verträgen, Aufzeigen von Unterschieden und
                        Empfehlungen zur Optimierung.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>3.5 Vertragsoptimierung</div>
                      <div className={styles.infoValue}>
                        Verbesserungsvorschläge, rechtliche Hinweise und
                        Formulierungsvorschläge für faire Verträge.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>3.6 Vertragsgenerierung</div>
                      <div className={styles.infoValue}>
                        KI-gestützte Erstellung neuer Vertragsdokumente mit Templates
                        und digitaler Signatur-Funktion.
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className={styles.subTitle}>3.7 KI-Chat und Legal Pulse</h3>
                <p>
                  Chat-basierte Beratung zu Vertragsfragen, Erklärung von Fachbegriffen und Klauseln,
                  aktuelle Rechtsänderungen und Updates (Legal Pulse Feature).
                </p>

                <h3 className={styles.subTitle}>3.8 Rechnungsverwaltung</h3>
                <p>
                  Automatische Erstellung von Rechnungen für bezahlte Tarife, PDF-Export und
                  E-Mail-Versand, Übersicht aller Zahlungen im Nutzerkonto.
                </p>

                <div className={`${styles.highlightBox} ${styles.warning}`}>
                  <strong>3.9 Verfügbarkeit:</strong> Der Anbieter bemüht sich um eine ständige
                  Verfügbarkeit der Plattform. Eine 100%ige Verfügbarkeit kann jedoch nicht
                  garantiert werden. Wartungsarbeiten werden nach Möglichkeit im Voraus angekündigt.
                </div>
              </div>
            </section>

            {/* 4. Tarife */}
            <section
              id="tarife"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["tarife"] = el; }}
              data-section-id="tarife"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <CreditCard size={22} />
                </div>
                <h2 className={styles.sectionTitle}>4. Tarife, Preise und Zahlungsbedingungen</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>4.1 Tarifmodelle</h3>
                <p>Contract AI bietet verschiedene Tarife mit unterschiedlichen Leistungsumfängen an:</p>

                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Free-Tarif</div>
                      <div className={styles.infoValue}>
                        Kostenlos, 3 Vertragsanalysen einmalig, Grundfunktionen verfügbar.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Business-Tarif</div>
                      <div className={styles.infoValue}>
                        19€ pro Monat, 25 Vertragsanalysen pro Monat, alle Standard-Features.
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoContent}>
                      <div className={styles.infoLabel}>Enterprise-Tarif</div>
                      <div className={styles.infoValue}>
                        29€ pro Monat, unbegrenzte Analysen, alle Premium-Features und Prioritätssupport.
                      </div>
                    </div>
                  </div>
                </div>

                <p>
                  Die jeweils aktuellen Preise sind auf der{" "}
                  <Link to="/pricing" className={styles.link}>Pricing-Seite</Link> einsehbar.
                  Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
                </p>

                <h3 className={styles.subTitle}>4.2 Zahlungsweise</h3>
                <p>
                  Die Zahlung für kostenpflichtige Tarife erfolgt wahlweise monatlich oder jährlich
                  im Voraus per Kreditkarte oder anderen von Stripe unterstützten Zahlungsmethoden.
                  Die Zahlungsabwicklung erfolgt über den externen Zahlungsdienstleister Stripe.
                  Der Anbieter speichert keine Kreditkartendaten.
                </p>

                <h3 className={styles.subTitle}>4.3 Upgrade und Downgrade</h3>
                <p>
                  Ein Wechsel zwischen Tarifen ist jederzeit über das Nutzerkonto möglich. Bei einem
                  Upgrade wird die Differenz anteilig für die verbleibende Laufzeit berechnet. Bei
                  einem Downgrade gilt der neue Tarif ab der nächsten Abrechnungsperiode.
                </p>

                <h3 className={styles.subTitle}>4.4 Nutzungslimits</h3>
                <p>
                  Bei Überschreitung der monatlichen Analyse-Limits wird der Nutzer aufgefordert,
                  ein Upgrade durchzuführen. Überschreitungen werden nicht automatisch berechnet.
                </p>

                <h3 className={styles.subTitle}>4.5 Zahlungsverzug</h3>
                <p>
                  Bei Zahlungsverzug kann der Zugriff auf kostenpflichtige Funktionen bis zur
                  vollständigen Begleichung der ausstehenden Beträge gesperrt werden.
                </p>

                <div className={`${styles.highlightBox} ${styles.success}`}>
                  <strong>4.6 14-Tage-Geld-zurück-Garantie:</strong> Für Erstkunden gilt eine
                  14-Tage-Geld-zurück-Garantie. Sollten Sie mit Contract AI nicht zufrieden sein,
                  erstatten wir Ihnen innerhalb von 14 Tagen nach Zahlungseingang den vollen
                  Betrag zurück.
                </div>
              </div>
            </section>

            {/* 5. Laufzeit */}
            <section
              id="laufzeit"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["laufzeit"] = el; }}
              data-section-id="laufzeit"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Clock size={22} />
                </div>
                <h2 className={styles.sectionTitle}>5. Laufzeit, Kündigung und Widerrufsrecht</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>5.1 Vertragslaufzeit</h3>
                <p>
                  Der Nutzungsvertrag für den Free-Tarif wird auf unbestimmte Zeit geschlossen.
                  Kostenpflichtige Tarife haben je nach Wahl eine Mindestlaufzeit von einem Monat
                  (bei monatlicher Zahlung) oder einem Jahr (bei jährlicher Zahlung).
                </p>

                <h3 className={styles.subTitle}>5.2 Kündigung durch den Nutzer</h3>
                <p>
                  Der Vertrag kann jederzeit ohne Einhaltung einer Kündigungsfrist über das
                  Nutzerkonto gekündigt werden. Die Kündigung wird zum Ende der aktuellen
                  Abrechnungsperiode wirksam.
                </p>

                <h3 className={styles.subTitle}>5.3 Keine automatische Verlängerung mit Preiserhöhung</h3>
                <p>
                  Kostenpflichtige Abonnements verlängern sich automatisch um die gewählte Laufzeit,
                  sofern nicht vor Ablauf gekündigt wird. Preiserhöhungen werden dem Nutzer mindestens
                  30 Tage im Voraus per E-Mail mitgeteilt. Der Nutzer hat dann ein Sonderkündigungsrecht.
                </p>

                <h3 className={styles.subTitle}>5.4 Kündigung durch den Anbieter</h3>
                <p>Der Anbieter kann den Vertrag aus wichtigem Grund fristlos kündigen, insbesondere bei:</p>
                <ul className={styles.list}>
                  <li>Verstoß gegen diese AGB oder geltendes Recht</li>
                  <li>Missbrauch der Plattform oder der KI-Funktionen</li>
                  <li>Upload von illegalen, urheberrechtsverletzenden oder schädlichen Inhalten</li>
                  <li>Zahlungsverzug trotz Mahnung</li>
                  <li>Weitergabe von Zugangsdaten an Dritte</li>
                </ul>

                <div className={styles.highlightBox}>
                  <strong>5.5 Widerrufsrecht für Verbraucher:</strong><br />
                  Verbraucher (§ 13 BGB) haben ein gesetzliches Widerrufsrecht von 14 Tagen ab
                  Vertragsschluss. Das Widerrufsrecht erlischt vorzeitig, wenn der Nutzer die
                  Dienstleistung vor Ablauf der Widerrufsfrist vollständig in Anspruch genommen hat.
                </div>

                <h3 className={styles.subTitle}>Widerrufsbelehrung</h3>
                <p>
                  Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag
                  zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.
                  Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Noah Liebold, E-Mail: info@contract-ai.de)
                  mittels einer eindeutigen Erklärung (z. B. per E-Mail) über Ihren Entschluss, diesen
                  Vertrag zu widerrufen, informieren.
                </p>

                <p>
                  <strong>Folgen des Widerrufs:</strong> Wenn Sie diesen Vertrag widerrufen, haben wir
                  Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens
                  binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren
                  Widerruf bei uns eingegangen ist.
                </p>
              </div>
            </section>

            {/* 6. Rechte */}
            <section
              id="rechte"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["rechte"] = el; }}
              data-section-id="rechte"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Users size={22} />
                </div>
                <h2 className={styles.sectionTitle}>6. Rechte und Pflichten des Nutzers</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>6.1 Nutzungsrechte</h3>
                <p>
                  Der Nutzer erhält für die Dauer des Vertragsverhältnisses ein nicht-exklusives,
                  nicht übertragbares und nicht unterlizenzierbares Recht zur Nutzung der Plattform
                  Contract AI im vertraglich vereinbarten Umfang.
                </p>

                <h3 className={styles.subTitle}>6.2 Pflichten des Nutzers</h3>
                <p>Der Nutzer verpflichtet sich:</p>
                <ul className={styles.list}>
                  <li>Die Plattform ausschließlich zu rechtmäßigen Zwecken zu nutzen</li>
                  <li>Keine rechtswidrigen, beleidigenden oder schädlichen Inhalte hochzuladen</li>
                  <li>Keine Verträge hochzuladen, die Geschäftsgeheimnisse Dritter oder personenbezogene Daten Dritter ohne deren Einwilligung enthalten</li>
                  <li>Die Plattform nicht zu missbrauchen, insbesondere keine Versuche zu unternehmen, die Sicherheit zu kompromittieren</li>
                  <li>Keine automatisierten Zugriffe (Bots, Scraper) ohne Genehmigung durchzuführen</li>
                  <li>Die generierten Inhalte eigenverantwortlich zu prüfen</li>
                </ul>

                <h3 className={styles.subTitle}>6.3 Verantwortung für hochgeladene Inhalte</h3>
                <p>
                  Der Nutzer ist allein verantwortlich für alle Inhalte, die er auf die Plattform
                  hochlädt. Er versichert, dass er über alle erforderlichen Rechte an den hochgeladenen
                  Dokumenten verfügt.
                </p>

                <h3 className={styles.subTitle}>6.4 Urheberrecht</h3>
                <p>
                  Alle Inhalte der Plattform (Texte, Grafiken, Logos, Software, Design) sind
                  urheberrechtlich geschützt. Eine Vervielfältigung, Bearbeitung oder Verbreitung
                  außerhalb der gestatteten Nutzung ist ohne schriftliche Zustimmung des Anbieters
                  untersagt.
                </p>
              </div>
            </section>

            {/* 7. Datenschutz */}
            <section
              id="datenschutz"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["datenschutz"] = el; }}
              data-section-id="datenschutz"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Shield size={22} />
                </div>
                <h2 className={styles.sectionTitle}>7. Datenschutz und Datensicherheit</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>7.1 Datenschutzerklärung</h3>
                <p>
                  Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Die Verarbeitung Ihrer
                  Daten erfolgt nach den Bestimmungen der DSGVO und des BDSG. Details entnehmen Sie
                  bitte unserer{" "}
                  <Link to="/datenschutz" className={styles.link}>Datenschutzerklärung</Link>.
                </p>

                <h3 className={styles.subTitle}>7.2 Datenverarbeitung</h3>
                <p>
                  Zur Erbringung unserer Dienstleistungen verarbeiten wir personenbezogene Daten
                  (Name, E-Mail-Adresse, Zahlungsinformationen) sowie die von Ihnen hochgeladenen
                  Vertragsdokumente. Diese Daten werden ausschließlich zur Vertragserfüllung verwendet.
                </p>

                <h3 className={styles.subTitle}>7.3 Externe Dienstleister</h3>
                <p>Wir nutzen folgende externe Dienstleister als Auftragsverarbeiter:</p>
                <ul className={styles.list}>
                  <li><strong>AWS S3:</strong> Speicherung hochgeladener Vertragsdokumente</li>
                  <li><strong>OpenAI:</strong> KI-Analyse der Vertragsinhalte mittels GPT-Modellen</li>
                  <li><strong>Stripe:</strong> Zahlungsabwicklung für kostenpflichtige Tarife</li>
                  <li><strong>MongoDB Atlas:</strong> Datenbank für Nutzerdaten und Vertragsmetadaten</li>
                </ul>
                <p>
                  Mit allen Dienstleistern wurden Auftragsverarbeitungsverträge nach Art. 28 DSGVO
                  geschlossen.
                </p>

                <h3 className={styles.subTitle}>7.4 Datensicherheit</h3>
                <p>
                  Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten vor
                  Verlust, Zerstörung, Manipulation und unberechtigtem Zugriff zu schützen. Die
                  Datenübertragung erfolgt verschlüsselt per HTTPS/TLS.
                </p>

                <div className={`${styles.highlightBox} ${styles.success}`}>
                  <strong>7.5 Löschung von Daten:</strong> Nach Beendigung des Vertragsverhältnisses
                  werden alle personenbezogenen Daten und hochgeladenen Dokumente innerhalb von
                  30 Tagen vollständig gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten
                  entgegenstehen.
                </div>
              </div>
            </section>

            {/* 8. Haftung */}
            <section
              id="haftung"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["haftung"] = el; }}
              data-section-id="haftung"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <AlertTriangle size={22} />
                </div>
                <h2 className={styles.sectionTitle}>8. Haftung und Gewährleistung</h2>
              </div>

              <div className={styles.sectionContent}>
                <div className={`${styles.highlightBox} ${styles.warning}`}>
                  <strong>8.1 Keine Rechtsberatung:</strong> Die von Contract AI bereitgestellten
                  Analysen, Bewertungen und Empfehlungen dienen ausschließlich der Information und
                  stellen keine Rechtsberatung dar. Im Zweifelsfall sollte stets ein Rechtsanwalt
                  oder Notar konsultiert werden.
                </div>

                <h3 className={styles.subTitle}>8.2 KI-Technologie und Fehlerpotential</h3>
                <p>
                  Die Plattform nutzt künstliche Intelligenz (OpenAI GPT) zur Analyse von Verträgen.
                  Trotz modernster Technologie können KI-Systeme Fehler machen, Inhalte falsch
                  interpretieren oder wichtige Klauseln übersehen. Der Nutzer ist verpflichtet,
                  alle KI-generierten Inhalte eigenverantwortlich zu prüfen und zu bewerten.
                </p>

                <h3 className={styles.subTitle}>8.3 Haftungsbeschränkung</h3>
                <p>
                  Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens,
                  des Körpers oder der Gesundheit, die auf einer vorsätzlichen oder fahrlässigen
                  Pflichtverletzung beruhen, sowie für Schäden, die auf Vorsatz oder grober
                  Fahrlässigkeit beruhen.
                </p>
                <p>
                  Für leicht fahrlässige Pflichtverletzungen haftet der Anbieter nur, soweit eine
                  wesentliche Vertragspflicht (Kardinalpflicht) betroffen ist. In diesem Fall ist
                  die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
                </p>

                <h3 className={styles.subTitle}>8.4 Keine Gewährleistung für bestimmte Ergebnisse</h3>
                <p>
                  Der Anbieter garantiert nicht, dass die Nutzung der Plattform zu bestimmten
                  rechtlichen oder wirtschaftlichen Ergebnissen führt.
                </p>

                <h3 className={styles.subTitle}>8.5 Verfügbarkeit</h3>
                <p>
                  Der Anbieter bemüht sich um eine hohe Verfügbarkeit der Plattform, übernimmt
                  jedoch keine Garantie für eine ununterbrochene Erreichbarkeit.
                </p>

                <h3 className={styles.subTitle}>8.6 Externe Links</h3>
                <p>
                  Die Plattform kann Links zu externen Webseiten Dritter enthalten. Für die
                  Inhalte externer Seiten übernimmt der Anbieter keine Verantwortung.
                </p>
              </div>
            </section>

            {/* 9. Änderungen */}
            <section
              id="aenderungen"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["aenderungen"] = el; }}
              data-section-id="aenderungen"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <RefreshCw size={22} />
                </div>
                <h2 className={styles.sectionTitle}>9. Änderungen der AGB</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>9.1 Änderungsrecht</h3>
                <p>
                  Der Anbieter behält sich das Recht vor, diese AGB bei Vorliegen eines sachlichen
                  Grundes (z. B. Änderungen der Rechtslage, neue Funktionen, Anpassungen an technische
                  Entwicklungen) mit Wirkung für die Zukunft zu ändern.
                </p>

                <h3 className={styles.subTitle}>9.2 Mitteilung und Widerspruchsrecht</h3>
                <p>
                  Änderungen der AGB werden dem Nutzer mindestens 30 Tage vor Inkrafttreten per
                  E-Mail mitgeteilt. Widerspricht der Nutzer der Geltung der neuen AGB nicht
                  innerhalb von 30 Tagen nach Zugang der Mitteilung, gelten die geänderten AGB
                  als akzeptiert.
                </p>

                <h3 className={styles.subTitle}>9.3 Widerspruch</h3>
                <p>
                  Widerspricht der Nutzer der Geltung der neuen AGB, ist der Anbieter berechtigt,
                  den Vertrag ordentlich zu kündigen.
                </p>
              </div>
            </section>

            {/* 10. Streitbeilegung */}
            <section
              id="streitbeilegung"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["streitbeilegung"] = el; }}
              data-section-id="streitbeilegung"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <Gavel size={22} />
                </div>
                <h2 className={styles.sectionTitle}>10. Streitbeilegung und Gerichtsstand</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>10.1 Online-Streitbeilegung</h3>
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                  >
                    https://ec.europa.eu/consumers/odr
                    <ExternalLink size={12} style={{ marginLeft: "4px", verticalAlign: "middle" }} />
                  </a>
                </p>
                <p>
                  Der Anbieter ist nicht verpflichtet und nicht bereit, an einem
                  Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>

                <h3 className={styles.subTitle}>10.2 Anwendbares Recht</h3>
                <p>
                  Für sämtliche Rechtsbeziehungen zwischen dem Anbieter und dem Nutzer gilt
                  ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des
                  UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur insoweit, als nicht
                  der gewährte Schutz durch zwingende Bestimmungen des Rechts des Staates, in
                  dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, entzogen wird.
                </p>

                <h3 className={styles.subTitle}>10.3 Gerichtsstand</h3>
                <p>
                  Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder
                  öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für
                  alle Streitigkeiten aus diesem Vertrag der Geschäftssitz des Anbieters.
                </p>
              </div>
            </section>

            {/* 11. Schlussbestimmungen */}
            <section
              id="schlussbestimmungen"
              className={styles.section}
              ref={(el) => { addToRefs(el); sectionRefs.current["schlussbestimmungen"] = el; }}
              data-section-id="schlussbestimmungen"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <CheckCircle size={22} />
                </div>
                <h2 className={styles.sectionTitle}>11. Schlussbestimmungen</h2>
              </div>

              <div className={styles.sectionContent}>
                <h3 className={styles.subTitle}>11.1 Salvatorische Klausel</h3>
                <p>
                  Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein
                  oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt.
                </p>

                <h3 className={styles.subTitle}>11.2 Vertragssprache</h3>
                <p>Die Vertragssprache ist Deutsch.</p>

                <h3 className={styles.subTitle}>11.3 Abtretung</h3>
                <p>
                  Der Nutzer darf Rechte und Pflichten aus dem Vertragsverhältnis nur mit vorheriger
                  schriftlicher Zustimmung des Anbieters an Dritte abtreten.
                </p>

                <h3 className={styles.subTitle}>11.4 Schriftformerfordernis</h3>
                <p>
                  Änderungen oder Ergänzungen dieser AGB sowie Nebenabreden bedürfen zu ihrer
                  Wirksamkeit der Textform (z. B. E-Mail). Dies gilt auch für die Änderung
                  dieser Schriftformklausel.
                </p>
              </div>
            </section>

            {/* Contact Info */}
            <div className={styles.contactFooter}>
              <p>
                Bei Fragen zu unseren AGB kontaktieren Sie uns bitte unter{" "}
                <a href="mailto:info@contract-ai.de" className={styles.link}>
                  info@contract-ai.de
                </a>
              </p>
            </div>
          </div>

          {/* Footer CTA */}
          <div className={`${styles.footerCta} ${styles.animateOnScroll}`} ref={addToRefs}>
            <h3 className={styles.footerCtaTitle}>Haben Sie Fragen?</h3>
            <p className={styles.footerCtaText}>
              Unser Team steht Ihnen bei Fragen zu unseren Geschäftsbedingungen gerne zur Verfügung.
            </p>
            <Link to="/contact" className={styles.footerCtaButton}>
              Kontakt aufnehmen
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

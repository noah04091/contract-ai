// Datenschutz - Redesign (gemeinsames Legal-Design-System, Claude-Handoff 29.06.2026)
// Rechtstext 1:1 aus der bisherigen Fassung übernommen (Satz-für-Satz-gleich).
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import styles from "../styles/LegalRedesign.module.css";
import LandingFooter from "../components/LandingFooter";
import {
  User, FileText, Globe, Server, HardDrive, CreditCard,
  Key, Cookie, Scale, Lock, Clock, RefreshCw,
  Eye, Trash2, Database, AlertCircle, CheckCircle,
  Calendar, Clock as ClockMeta, ArrowRight, ExternalLink, Shield
} from "lucide-react";

interface TocItem { id: string; title: string; }

const tocItems: TocItem[] = [
  { id: "verantwortlicher", title: "Verantwortlicher" },
  { id: "allgemeines", title: "Datenverarbeitung" },
  { id: "website", title: "Website-Daten" },
  { id: "hosting", title: "Hosting" },
  { id: "dokumente", title: "Dokumente & KI" },
  { id: "stripe", title: "Zahlungen" },
  { id: "account", title: "Benutzerkonto" },
  { id: "cookies", title: "Cookies" },
  { id: "rechte", title: "Ihre Rechte" },
  { id: "sicherheit", title: "Sicherheit" },
  { id: "speicherdauer", title: "Speicherdauer" },
  { id: "aenderungen", title: "Änderungen" },
];

const sectionIcons: Record<string, React.ReactNode> = {
  verantwortlicher: <User size={22} />, allgemeines: <FileText size={22} />,
  website: <Globe size={22} />, hosting: <Server size={22} />,
  dokumente: <HardDrive size={22} />, stripe: <CreditCard size={22} />,
  account: <Key size={22} />, cookies: <Cookie size={22} />,
  rechte: <Scale size={22} />, sicherheit: <Lock size={22} />,
  speicherdauer: <Clock size={22} />, aenderungen: <RefreshCw size={22} />,
};

export default function Datenschutz() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            const id = entry.target.getAttribute("data-section-id");
            if (id) setActiveSection(id);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -55% 0px" }
    );
    animatedRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });

    // Safety-Fallback: nach 900ms ALLES sichtbar (Inhalt darf nie unsichtbar bleiben)
    const fallback = window.setTimeout(() => {
      animatedRefs.current.forEach((ref) => ref?.classList.add(styles.visible));
    }, 900);

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => { observer.disconnect(); window.clearTimeout(fallback); window.removeEventListener("scroll", onScroll); };
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !animatedRefs.current.includes(el)) animatedRefs.current.push(el);
  };

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 92;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const setSec = (id: string) => (el: HTMLElement | null) => { addToRefs(el); sectionRefs.current[id] = el; };

  return (
    <>
      <Helmet>
        <title>Datenschutzerklärung | Contract AI - DSGVO-konform</title>
        <meta name="description" content="DSGVO-konforme Datenschutzerklärung von Contract AI. Erfahren Sie, wie wir Ihre Daten schützen und verarbeiten." />
        <meta name="keywords" content="Datenschutz, DSGVO, Datenschutzerklärung, Contract AI, Privatsphäre" />
        <link rel="canonical" href="https://www.contract-ai.de/datenschutz" />
        <meta property="og:title" content="Datenschutzerklärung | Contract AI" />
        <meta property="og:description" content="DSGVO-konforme Datenschutzerklärung. Erfahren Sie, wie Contract AI Ihre Daten schützt." />
        <meta property="og:url" content="https://www.contract-ai.de/datenschutz" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <div className={styles.page}>
        <div className={styles.progress} style={{ width: `${progress}%` }} />

        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.heroGlows} />
          <div className={styles.heroBlob} />
          <div className={styles.heroGrid} />
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>
              <span className={`${styles.heroBadgeDot} ${styles.green}`} />
              DSGVO-konform
            </span>
            <h1 className={styles.heroTitle}>Datenschutzerklärung</h1>
            <p className={styles.heroLead}>
              Informationen zur Verarbeitung Ihrer personenbezogenen Daten
              gemäß DSGVO und BDSG.
            </p>
            <div className={styles.heroMeta}>
              <span className={styles.heroMetaItem}><Calendar size={15} /> Stand: Februar 2025</span>
              <span className={styles.heroMetaDot} />
              <span className={styles.heroMetaItem}><ClockMeta size={15} /> ca. 8 Min. Lesezeit</span>
              <span className={styles.heroMetaDot} />
              <span className={styles.heroMetaItem}>12 Abschnitte</span>
            </div>
          </div>
        </header>

        {/* Doc-Shell */}
        <div className={styles.shell}>
          {/* TOC */}
          <aside className={styles.toc}>
            <div className={styles.tocLabel}>Auf dieser Seite</div>
            <nav className={styles.tocNav}>
              {tocItems.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`${styles.tocItem} ${activeSection === item.id ? styles.active : ""}`}
                >
                  <span className={styles.tocNum}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.tocText}>{item.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className={styles.content}>

            {/* 1 */}
            <section id="verantwortlicher" className={`${styles.section} ${styles.reveal}`} ref={setSec("verantwortlicher")} data-section-id="verantwortlicher">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.verantwortlicher}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 01</div>
                  <h2 className={styles.sectionTitle}>1. Verantwortlicher</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><User size={20} /></div>
                    <div className={styles.infoLabel}>Verantwortlich</div>
                    <div className={styles.infoValue}>
                      Noah Liebold<br />
                      Contract AI (SaaS-Plattform)
                    </div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Globe size={20} /></div>
                    <div className={styles.infoLabel}>Adresse</div>
                    <div className={styles.infoValue}>
                      Richard-Oberle-Weg 27<br />
                      76648 Durmersheim
                    </div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><FileText size={20} /></div>
                    <div className={styles.infoLabel}>Kontakt</div>
                    <div className={styles.infoValue}>
                      <a href="mailto:info@contract-ai.de" className={styles.link}>info@contract-ai.de</a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2 */}
            <section id="allgemeines" className={`${styles.section} ${styles.reveal}`} ref={setSec("allgemeines")} data-section-id="allgemeines">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.allgemeines}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 02</div>
                  <h2 className={styles.sectionTitle}>2. Allgemeines zur Datenverarbeitung</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>
                  Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der geltenden
                  Datenschutzgesetze (DSGVO, BDSG). Personenbezogene Daten werden nur verarbeitet, sofern:
                </p>
                <ul className={styles.list}>
                  <li>Dies zur <strong>Bereitstellung unserer Dienste</strong> erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO)</li>
                  <li><strong>Gesetzliche Verpflichtungen</strong> bestehen (Art. 6 Abs. 1 lit. c DSGVO)</li>
                  <li>Eine <strong>Einwilligung</strong> vorliegt (Art. 6 Abs. 1 lit. a DSGVO)</li>
                  <li>Ein <strong>berechtigtes Interesse</strong> besteht (Art. 6 Abs. 1 lit. f DSGVO)</li>
                </ul>
              </div>
            </section>

            {/* 3 */}
            <section id="website" className={`${styles.section} ${styles.reveal}`} ref={setSec("website")} data-section-id="website">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.website}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 03</div>
                  <h2 className={styles.sectionTitle}>3. Erfassung von Daten beim Website-Besuch</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>Beim Zugriff auf unsere Website werden automatisch folgende Daten verarbeitet:</p>
                <ul className={styles.list}>
                  <li>IP-Adresse (gekürzt/anonymisiert)</li>
                  <li>Datum und Uhrzeit des Zugriffs</li>
                  <li>Browsertyp und -version</li>
                  <li>Betriebssystem</li>
                  <li>Referrer-URL</li>
                </ul>
                <div className={styles.calloutOk}>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: technischer Betrieb, Sicherheit)
                </div>
              </div>
            </section>

            {/* 4 */}
            <section id="hosting" className={`${styles.section} ${styles.reveal}`} ref={setSec("hosting")} data-section-id="hosting">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.hosting}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 04</div>
                  <h2 className={styles.sectionTitle}>4. Hosting</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <h3 className={styles.subTitle}>Frontend – Vercel</h3>
                <p>
                  Unsere Website wird bei <strong>Vercel Inc., USA</strong> gehostet.
                  Daten können in die USA übermittelt werden (Standard Contractual Clauses).
                </p>
                <h3 className={styles.subTitle}>Backend – Render</h3>
                <p>
                  Backend-API und Authentifizierung werden auf <strong>Render.com</strong> betrieben.
                  Daten können in Rechenzentren innerhalb der EU oder USA verarbeitet werden.
                </p>
                <div className={styles.calloutInfo}>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b/f DSGVO (Vertragserfüllung / berechtigtes Interesse)
                </div>
              </div>
            </section>

            {/* 5 */}
            <section id="dokumente" className={`${styles.section} ${styles.reveal}`} ref={setSec("dokumente")} data-section-id="dokumente">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.dokumente}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 05</div>
                  <h2 className={styles.sectionTitle}>5. Speicherung & Verarbeitung von Dokumenten</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <h3 className={styles.subTitle}>Speicherung hochgeladener Verträge</h3>
                <p>
                  Für Uploads verwenden wir <strong>AWS S3</strong> (Speicherort innerhalb der EU/des EWR).
                  Es werden gespeichert: Hochgeladene PDFs, Metadaten (Name, Datum, Dateigröße, Hash, Nutzer-ID).
                </p>
                <h3 className={styles.subTitle}>KI-Verarbeitung (OpenAI API)</h3>
                <p>
                  Für die Analyse von Verträgen übermitteln wir Inhalte kurzfristig an die <strong>OpenAI API</strong>.
                </p>
                <div className={styles.calloutOk}>
                  <ul className={styles.list} style={{ margin: 0 }}>
                    <li>Daten werden <strong>nicht</strong> zum Training der Modelle verwendet</li>
                    <li>Verschlüsselte Übertragung (HTTPS)</li>
                    <li>Daten werden bei OpenAI nach max. 30 Tagen gelöscht</li>
                  </ul>
                </div>
                <h3 className={styles.subTitle}>KI-Verarbeitung (Anthropic Claude)</h3>
                <p>
                  Für die KI-gestützte Erstellung und Vorbereitung von Verträgen übermitteln wir Eingaben
                  kurzfristig an die <strong>Anthropic API (Claude)</strong>, Anthropic PBC, USA.
                </p>
                <div className={styles.calloutOk}>
                  <ul className={styles.list} style={{ margin: 0 }}>
                    <li>Daten werden <strong>nicht</strong> zum Training der Modelle verwendet</li>
                    <li>Verschlüsselte Übertragung (HTTPS)</li>
                    <li>Übermittlung in die USA auf Basis der <strong>EU-Standardvertragsklauseln (SCC)</strong></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 6 */}
            <section id="stripe" className={`${styles.section} ${styles.reveal}`} ref={setSec("stripe")} data-section-id="stripe">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.stripe}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 06</div>
                  <h2 className={styles.sectionTitle}>6. Stripe – Zahlungsabwicklung</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>Wir nutzen <strong>Stripe Payments Europe</strong>, Dublin, Irland.</p>
                <p>Verarbeitet werden: Name, E-Mail, Zahlungsinformationen, Abonnementdaten, Rechnungen.</p>
                <div className={styles.calloutInfo}>
                  <strong>Rechtsgrundlage:</strong><br />
                  Art. 6 Abs. 1 lit. b DSGVO — Bereitstellung von Abo & Zahlung<br />
                  Art. 6 Abs. 1 lit. f DSGVO — Betrugserkennung, Sicherheit
                </div>
              </div>
            </section>

            {/* 7 */}
            <section id="account" className={`${styles.section} ${styles.reveal}`} ref={setSec("account")} data-section-id="account">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.account}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 07</div>
                  <h2 className={styles.sectionTitle}>7. Benutzerkonto / Registrierung</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>Zur Nutzung von Contract AI ist ein Benutzerkonto erforderlich. Verarbeitete Daten:</p>
                <ul className={styles.list}>
                  <li>Name und E-Mail</li>
                  <li>Passwort (gehasht mit bcrypt)</li>
                  <li>Nutzungsdaten und Vertragsdaten</li>
                  <li>Historie der Analysen</li>
                  <li>Herkunftsquelle bei der Registrierung (Referrer und ggf. Kampagnen-Parameter) – ausschließlich zur internen Reichweiten- und Marketing-Analyse, keine Weitergabe an Dritte</li>
                </ul>
                <div className={styles.calloutInfo}>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                </div>
              </div>
            </section>

            {/* 8 */}
            <section id="cookies" className={`${styles.section} ${styles.reveal}`} ref={setSec("cookies")} data-section-id="cookies">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.cookies}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 08</div>
                  <h2 className={styles.sectionTitle}>8. Cookies, Newsletter & Tracking</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <h3 className={styles.subTitle}>8.1 Cookies</h3>
                <p>Wir verwenden <strong>notwendige Cookies</strong> für:</p>
                <ul className={styles.list}>
                  <li>Login / Auth-Session</li>
                  <li>Zahlungsabwicklung</li>
                  <li>Sicherheit</li>
                </ul>
                <p>Daten werden anonymisiert oder pseudonymisiert gespeichert.</p>

                <h3 className={styles.subTitle}>8.2 Newsletter & Marketing-E-Mails</h3>
                <p>
                  Mit Ihrer Einwilligung (Marketing-Consent bei Registrierung oder über die
                  E-Mail-Einstellungen in Ihrem Account) versenden wir gelegentlich Newsletter
                  und Produkt-Informationen. Zur Analyse der Zustellung und Relevanz unserer
                  Newsletter verwenden wir <strong>Öffnungs- und Klick-Messung</strong>:
                </p>
                <ul className={styles.list}>
                  <li><strong>Öffnungs-Tracking</strong>: Ein unsichtbares 1×1-Pixel erfasst, ob eine E-Mail geöffnet wurde (Zeitstempel, Anzahl Öffnungen).</li>
                  <li><strong>Klick-Tracking</strong>: Links in Newsletter-E-Mails werden über einen Redirect (api.contract-ai.de/api/track/click) geleitet, um zu messen, welche Inhalte relevant sind (URL, Zeitstempel).</li>
                  <li>Es werden <strong>keine IP-Adressen oder User-Agents</strong> beim Tracking gespeichert — lediglich Zeitstempel und die aggregierte Statistik der Kampagne.</li>
                </ul>
                <p>Sie können dem Newsletter-Versand und Tracking jederzeit widersprechen:</p>
                <ul className={styles.list}>
                  <li>Über den <strong>Abbestellen-Link</strong> am Ende jeder Marketing-E-Mail</li>
                  <li>Über die <strong>E-Mail-Einstellungen</strong> in Ihrem Account</li>
                  <li>Per E-Mail an info@contract-ai.de</li>
                </ul>
                <div className={styles.calloutInfo}>
                  <strong>Rechtsgrundlage:</strong><br />
                  Notwendige Cookies: Art. 6 Abs. 1 lit. f DSGVO<br />
                  Optionale Cookies: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)<br />
                  Newsletter &amp; Tracking: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) in Verbindung mit § 7 Abs. 2 UWG
                </div>
              </div>
            </section>

            {/* 9 */}
            <section id="rechte" className={`${styles.section} ${styles.reveal}`} ref={setSec("rechte")} data-section-id="rechte">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.rechte}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 09</div>
                  <h2 className={styles.sectionTitle}>9. Ihre Rechte</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>Sie haben folgende Rechte gemäß DSGVO:</p>
                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Eye size={20} /></div>
                    <div className={styles.infoLabel}>Art. 15 DSGVO</div>
                    <div className={styles.infoValue}>Auskunftsrecht</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><RefreshCw size={20} /></div>
                    <div className={styles.infoLabel}>Art. 16 DSGVO</div>
                    <div className={styles.infoValue}>Berichtigung</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Trash2 size={20} /></div>
                    <div className={styles.infoLabel}>Art. 17 DSGVO</div>
                    <div className={styles.infoValue}>Löschung</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Lock size={20} /></div>
                    <div className={styles.infoLabel}>Art. 18 DSGVO</div>
                    <div className={styles.infoValue}>Einschränkung</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><Database size={20} /></div>
                    <div className={styles.infoLabel}>Art. 20 DSGVO</div>
                    <div className={styles.infoValue}>Datenübertragbarkeit</div>
                  </div>
                  <div className={styles.infoCard}>
                    <div className={styles.infoCardIcon}><AlertCircle size={20} /></div>
                    <div className={styles.infoLabel}>Art. 21 DSGVO</div>
                    <div className={styles.infoValue}>Widerspruch</div>
                  </div>
                </div>
                <div className={styles.calloutWarn}>
                  <strong>Beschwerderecht:</strong> Sie können sich bei der zuständigen Aufsichtsbehörde beschweren:<br />
                  <a href="https://www.baden-wuerttemberg.datenschutz.de/" target="_blank" rel="noreferrer" className={styles.link}>
                    Landesbeauftragte für Datenschutz Baden-Württemberg
                    <ExternalLink size={12} style={{ marginLeft: "4px", verticalAlign: "middle" }} />
                  </a>
                </div>
              </div>
            </section>

            {/* 10 */}
            <section id="sicherheit" className={`${styles.section} ${styles.reveal}`} ref={setSec("sicherheit")} data-section-id="sicherheit">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.sicherheit}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 10</div>
                  <h2 className={styles.sectionTitle}>10. Sicherheit der Daten</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>Wir setzen folgende technische und organisatorische Maßnahmen ein:</p>
                <ul className={styles.list}>
                  <li><strong>TLS/SSL-Verschlüsselung</strong> für alle Datenübertragungen</li>
                  <li><strong>Server-Hardening</strong> und Zugriffsbeschränkungen</li>
                  <li><strong>Passwort-Hashing</strong> mit bcrypt</li>
                  <li><strong>Logging & Monitoring</strong> für Sicherheitsvorfälle</li>
                  <li><strong>Regelmäßige Backups</strong> aller Daten</li>
                </ul>
                <div className={styles.calloutOk}>
                  <div className={styles.calloutIcon}>
                    <CheckCircle size={18} />
                    <span><strong>Server-Standort:</strong> Alle Vertragsdaten werden auf Servern innerhalb der EU/des EWR gespeichert.</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 11 */}
            <section id="speicherdauer" className={`${styles.section} ${styles.reveal}`} ref={setSec("speicherdauer")} data-section-id="speicherdauer">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.speicherdauer}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 11</div>
                  <h2 className={styles.sectionTitle}>11. Speicherdauer</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <ul className={styles.list}>
                  <li><strong>Vertragsdaten:</strong> Gesetzliche Aufbewahrungspflichten (10 Jahre)</li>
                  <li><strong>Accountdaten:</strong> Bis zur Löschung des Kontos</li>
                  <li><strong>Uploads:</strong> Bis zur manuellen Löschung oder Kündigung</li>
                  <li><strong>Server-Logs:</strong> 14–30 Tage</li>
                </ul>
              </div>
            </section>

            {/* 12 */}
            <section id="aenderungen" className={`${styles.section} ${styles.reveal}`} ref={setSec("aenderungen")} data-section-id="aenderungen">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sectionIcons.aenderungen}</div>
                <div className={styles.sectionHeaderText}>
                  <div className={styles.sectionKicker}>§ 12</div>
                  <h2 className={styles.sectionTitle}>12. Änderungen dieser Datenschutzerklärung</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen,
                  um sie an geänderte Rechtslagen oder bei Änderungen unserer Dienste anzupassen.
                </p>
                <p style={{ color: "var(--muted)" }}>
                  <strong>Stand:</strong> Februar 2025
                </p>
              </div>
            </section>

            {/* CTA */}
            <div className={`${styles.cta} ${styles.reveal}`} ref={addToRefs}>
              <div className={styles.ctaGlow} />
              <div className={styles.ctaInner}>
                <div className={styles.ctaIcon}><Shield size={26} /></div>
                <h3 className={styles.ctaTitle}>Fragen zum Datenschutz?</h3>
                <p className={styles.ctaText}>
                  Kontaktieren Sie uns unter{" "}
                  <a href="mailto:info@contract-ai.de" className={styles.link} style={{ color: "#fff", borderBottomColor: "rgba(255,255,255,.6)" }}>info@contract-ai.de</a>
                </p>
                <a href="mailto:info@contract-ai.de" className={styles.ctaButton}>
                  Kontakt aufnehmen
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </main>

          {/* Spacer (Symmetrie) */}
          <div className={styles.spacer} aria-hidden="true" />
        </div>
      </div>

      <LandingFooter />
    </>
  );
}

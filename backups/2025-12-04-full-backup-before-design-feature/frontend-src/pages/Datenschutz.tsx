import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import './Datenschutz.css';
import Footer from "../components/Footer";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <motion.div
      className="privacy-section"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h2>{title}</h2>
      {children}
    </motion.div>
  );
};

export default function Datenschutz() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Datenschutzerklärung | Contract AI</title>
        <meta name="description" content="DSGVO-konforme Datenschutzerklärung von Contract AI. Informationen zur Verarbeitung personenbezogener Daten, Ihren Rechten und unseren Sicherheitsmaßnahmen." />
        <meta name="keywords" content="Datenschutz, Datenschutzerklärung, Contract AI Datenschutz, DSGVO, Privatsphäre" />
        <link rel="canonical" href="https://www.contract-ai.de/datenschutz" />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Datenschutzerklärung | Contract AI" />
        <meta property="og:description" content="DSGVO-konforme Datenschutzerklärung. Erfahren Sie, wie Contract AI Ihre Daten schützt." />
        <meta property="og:url" content="https://www.contract-ai.de/datenschutz" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Datenschutzerklärung | Contract AI" />
        <meta name="twitter:description" content="DSGVO-konforme Datenschutzerklärung. Erfahren Sie, wie Contract AI Ihre Daten schützt." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className="privacy-container">
        <motion.div
          className={`privacy-header ${scrolled ? 'scrolled' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="icon">🔐</span> Datenschutzerklärung
          </motion.h1>
          <motion.div
            className="header-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>

        <motion.div
          className="privacy-intro"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p>
            Diese Datenschutzerklärung informiert Sie über Art, Umfang und Zweck der Verarbeitung
            personenbezogener Daten auf unserer Website und unseren Diensten gemäß DSGVO und BDSG.
          </p>
        </motion.div>

        <div className="privacy-content">
          {/* 1. Verantwortlicher */}
          <Section title="1. Verantwortlicher">
            <div className="contact-card">
              <p>
                <strong>Noah Liebold</strong><br />
                Contract AI (SaaS-Plattform)<br />
                Richard-Oberle-Weg 27<br />
                76648 Durmersheim<br />
                Deutschland
              </p>
              <p>
                E-Mail: <a href="mailto:info@contract-ai.de">info@contract-ai.de</a><br />
                Telefon: <a href="tel:+4917655549923">0176 5554 9923</a>
              </p>
            </div>
          </Section>

          {/* 2. Allgemeines zur Datenverarbeitung */}
          <Section title="2. Allgemeines zur Datenverarbeitung">
            <p>
              Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der geltenden
              Datenschutzgesetze (DSGVO, BDSG). Personenbezogene Daten werden nur verarbeitet, sofern:
            </p>
            <ul className="data-list">
              <li>dies zur Bereitstellung unserer Dienste erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO),</li>
              <li>gesetzliche Verpflichtungen bestehen (Art. 6 Abs. 1 lit. c DSGVO),</li>
              <li>eine Einwilligung vorliegt (Art. 6 Abs. 1 lit. a DSGVO),</li>
              <li>oder ein berechtigtes Interesse besteht (Art. 6 Abs. 1 lit. f DSGVO).</li>
            </ul>
          </Section>

          {/* 3. Erfassung von Daten beim Besuch der Website */}
          <Section title="3. Erfassung von Daten beim Besuch der Website">
            <p>
              Beim Zugriff auf unsere Website werden automatisch serverseitig folgende Daten verarbeitet:
            </p>
            <ul className="data-list">
              <li>IP-Adresse (gekürzt oder anonymisiert gespeichert)</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Browsertyp und Version</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer-URL</li>
              <li>Besuchte Seiten</li>
              <li>Server-Logs (Fehler, Requests)</li>
            </ul>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse: technischer Betrieb, Sicherheit)
            </p>
          </Section>

          {/* 4. Hosting */}
          <Section title="4. Hosting">
            <h3>4.1 Frontend – Vercel</h3>
            <p>
              Unsere Website wird bei <strong>Vercel Inc., USA</strong> gehostet. Daten, die im Rahmen
              des Seitenaufrufs übertragen werden, können in die USA übermittelt werden
              (Standard Contractual Clauses / EU-SCCs).
            </p>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
            </p>

            <h3>4.2 Backend – Render</h3>
            <p>
              Backend-API und Authentifizierung werden auf <strong>Render.com</strong> betrieben.
              Daten können in Rechenzentren innerhalb der EU oder USA verarbeitet werden
              (je nach Regionseinstellung).
            </p>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Erfüllung vertraglicher Leistungen (Art. 6 Abs. 1 lit. b DSGVO)
            </p>
          </Section>

          {/* 5. Speicherung & Verarbeitung von Dokumenten */}
          <Section title="5. Speicherung & Verarbeitung von Dokumenten">
            <h3>5.1 Speicherung hochgeladener Verträge</h3>
            <p>
              Für Uploads (PDFs, Dokumente) verwenden wir <strong>AWS S3</strong> (Region: Frankfurt – eu-central-1).
            </p>
            <p>Es werden gespeichert:</p>
            <ul className="data-list">
              <li>Hochgeladene PDFs</li>
              <li>Metadaten (Name, Datum, Dateigröße, Hash, Nutzer-ID)</li>
            </ul>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
            </p>

            <h3>5.2 KI-Verarbeitung (OpenAI API)</h3>
            <p>
              Für die Analyse von Verträgen übermitteln wir Inhalte kurzfristig an die <strong>OpenAI API</strong>.
            </p>
            <ul className="data-list">
              <li>Die Daten werden <strong>nicht</strong> zum Training der Modelle verwendet.</li>
              <li>Die Übertragung erfolgt verschlüsselt (HTTPS).</li>
              <li>Daten werden bei OpenAI spätestens nach 30 Tagen gelöscht.</li>
            </ul>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Nutzer hat Analyse beauftragt)
            </p>
          </Section>

          {/* 6. Stripe – Zahlungsabwicklung */}
          <Section title="6. Stripe – Zahlungsabwicklung">
            <p>
              Wir nutzen <strong>Stripe Payments Europe</strong>, 1 Grand Canal Street Lower, Dublin, Irland.
            </p>
            <p>Verarbeitet werden:</p>
            <ul className="data-list">
              <li>Name</li>
              <li>E-Mail</li>
              <li>Zahlungsinformationen</li>
              <li>Abonnementdaten</li>
              <li>Rechnungen</li>
              <li>Erfolgs-/Abbruchstatus</li>
              <li>Webhook-Events</li>
            </ul>
            <p>Daten können in die USA übermittelt werden (SCCs).</p>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong><br />
              Art. 6 Abs. 1 lit. b DSGVO — Bereitstellung von Abo & Zahlung<br />
              Art. 6 Abs. 1 lit. f DSGVO — Betrugserkennung, Sicherheit
            </p>
          </Section>

          {/* 7. Benutzerkonto / Registrierung */}
          <Section title="7. Benutzerkonto / Registrierung">
            <p>
              Zur Nutzung von Contract AI ist ein Benutzerkonto erforderlich.
            </p>
            <p>Verarbeitete Daten:</p>
            <ul className="data-list">
              <li>Name</li>
              <li>E-Mail</li>
              <li>Passwort (gehasht)</li>
              <li>Nutzungsdaten</li>
              <li>Vertragsdaten</li>
              <li>Historie der Analysen</li>
            </ul>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
            </p>
          </Section>

          {/* 8. Newsletter */}
          <Section title="8. Newsletter">
            <p>
              Falls Sie sich für unseren Newsletter anmelden, verarbeiten wir folgende Daten:
            </p>
            <ul className="data-list">
              <li>E-Mail</li>
              <li>Name (optional)</li>
              <li>IP-Adresse bei Anmeldung</li>
              <li>Zeitpunkt der Einwilligung (Double-Opt-In)</li>
            </ul>
            <p>
              Wird ein externer Anbieter genutzt (z. B. Mailchimp, Brevo), erfolgt eine
              entsprechende Aktualisierung dieser Datenschutzerklärung.
            </p>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
            </p>
          </Section>

          {/* 9. Cookies & Tracking */}
          <Section title="9. Cookies & Tracking">
            <p>Wir verwenden <strong>notwendige Cookies</strong> für:</p>
            <ul className="data-list">
              <li>Login / Auth-Session</li>
              <li>Zahlungsabwicklung</li>
              <li>Sicherheit</li>
            </ul>

            <p>Zusätzlich kann folgende <strong>eigene Tracking-Verarbeitung</strong> erfolgen:</p>
            <ul className="data-list">
              <li>Besuchsverhalten</li>
              <li>Seitenaufrufe</li>
              <li>Ereignisse (Events)</li>
              <li>Nutzungsdauer</li>
            </ul>
            <p>Daten werden anonymisiert oder pseudonymisiert gespeichert.</p>

            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong><br />
              Notwendige Cookies: Art. 6 Abs. 1 lit. f DSGVO<br />
              Optionale Cookies / Tracking: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
            </p>
          </Section>

          {/* 10. Kontaktaufnahme */}
          <Section title="10. Kontaktaufnahme">
            <p>Bei Kontakt über E-Mail werden verarbeitet:</p>
            <ul className="data-list">
              <li>Name</li>
              <li>E-Mail</li>
              <li>Inhalt der Nachricht</li>
            </ul>
            <p className="legal-basis">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Anfragen)
            </p>
          </Section>

          {/* 11. Speicherdauer */}
          <Section title="11. Speicherdauer">
            <p>Wir speichern personenbezogene Daten nur so lange, wie es erforderlich ist:</p>
            <ul className="data-list">
              <li><strong>Vertragsdaten:</strong> gesetzliche Aufbewahrungspflichten (10 Jahre)</li>
              <li><strong>Accountdaten:</strong> bis zur Löschung des Kontos</li>
              <li><strong>Uploads:</strong> bis zur manuellen Löschung oder Kündigung</li>
              <li><strong>Logs:</strong> 14–30 Tage (je nach System)</li>
            </ul>
          </Section>

          {/* 12. Rechte der betroffenen Personen */}
          <Section title="12. Rechte der betroffenen Personen">
            <p>Sie haben folgende Rechte:</p>
            <div className="rights-container">
              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">ℹ️</span>
                <span className="right-text">Auskunft (Art. 15 DSGVO)</span>
              </motion.div>

              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">✏️</span>
                <span className="right-text">Berichtigung (Art. 16 DSGVO)</span>
              </motion.div>

              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">🗑️</span>
                <span className="right-text">Löschung (Art. 17 DSGVO)</span>
              </motion.div>

              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">🔒</span>
                <span className="right-text">Einschränkung (Art. 18 DSGVO)</span>
              </motion.div>

              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">📤</span>
                <span className="right-text">Datenübertragbarkeit (Art. 20 DSGVO)</span>
              </motion.div>

              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">🚫</span>
                <span className="right-text">Widerspruch (Art. 21 DSGVO)</span>
              </motion.div>

              <motion.div
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">↩️</span>
                <span className="right-text">Widerruf (Art. 7 Abs. 3 DSGVO)</span>
              </motion.div>
            </div>
          </Section>

          {/* 13. Beschwerderecht */}
          <Section title="13. Beschwerderecht">
            <p>Sie können sich bei einer Aufsichtsbehörde beschweren. Zuständig ist:</p>
            <div className="contact-card">
              <p>
                <strong>Landesbeauftragte für Datenschutz Baden-Württemberg</strong><br />
                <a href="https://www.baden-wuerttemberg.datenschutz.de/" target="_blank" rel="noreferrer">
                  https://www.baden-wuerttemberg.datenschutz.de/
                </a>
              </p>
            </div>
          </Section>

          {/* 14. Sicherheit der Daten */}
          <Section title="14. Sicherheit der Daten">
            <p>Wir setzen folgende technische und organisatorische Maßnahmen ein:</p>
            <ul className="data-list">
              <li>TLS/SSL-Verschlüsselung</li>
              <li>Server-Hardening</li>
              <li>Zugriffsbeschränkungen</li>
              <li>Hashing von Passwörtern</li>
              <li>Logging & Monitoring</li>
              <li>Regelmäßige Backups</li>
            </ul>
          </Section>

          {/* 15. Änderungen dieser Datenschutzerklärung */}
          <Section title="15. Änderungen dieser Datenschutzerklärung">
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen,
              um sie an geänderte Rechtslagen oder bei Änderungen unserer Dienste anzupassen.
            </p>
            <p>
              <strong>Stand:</strong> November 2025
            </p>
          </Section>

          <motion.div
            className="privacy-footer"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p>Bei Fragen zum Datenschutz wenden Sie sich bitte an <a href="mailto:info@contract-ai.de">info@contract-ai.de</a>.</p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}

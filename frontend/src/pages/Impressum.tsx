import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import styles from "../styles/Impressum.module.css";
import { FileText, Mail, Phone, User, Globe, Building, CreditCard, AlertCircle, Link as LinkIcon, Scale, Shield, Copyright } from "lucide-react";
import Footer from "../components/Footer";

export default function Impressum() {
  return (
    <>
      <Helmet>
        <title>Impressum | Contract AI</title>
        <meta name="description" content="Alle rechtlichen Angaben und Kontaktdaten zu Contract AI findest du im Impressum." />
        <meta name="keywords" content="Impressum, Anbieterkennzeichnung, Kontakt Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/impressum" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Impressum | Contract AI" />
        <meta property="og:description" content="Rechtliche Informationen und Kontaktdaten zu Contract AI findest du hier im Impressum." />
        <meta property="og:url" content="https://www.contract-ai.de/impressum" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Impressum | Contract AI" />
        <meta name="twitter:description" content="Hier findest du alle rechtlichen Angaben zu Contract AI." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.container}>
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.headerContent}>
            <motion.div 
              className={styles.iconContainer}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <FileText size={28} className={styles.icon} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Impressum
            </motion.h1>
          </div>
          <motion.div 
            className={styles.headerBlur}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>

        <motion.div 
          className={styles.content}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className={styles.card}>
            {/* Betreiber-Info */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <h2>Contract AI – betrieben von</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <User size={18} className={styles.infoIcon} />
                  <div><strong>Noah Liebold</strong></div>
                </div>
                <div className={styles.infoGroup}>
                  <Building size={18} className={styles.infoIcon} />
                  <div>Einzelunternehmen<br />Tätigkeitsbereich: Softwareentwicklung & KI-basierte SaaS-Lösungen</div>
                </div>
                <div className={styles.infoGroup}>
                  <Globe size={18} className={styles.infoIcon} />
                  <div>Richard-Oberle-Weg 27<br />76648 Durmersheim<br />Deutschland</div>
                </div>
              </div>
            </motion.div>

            {/* Kontakt */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              <h2>Kontakt</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <Phone size={18} className={styles.infoIcon} />
                  <div><a href="tel:+4917655549923" className={styles.link}>0176 5554 9923</a></div>
                </div>
                <div className={styles.infoGroup}>
                  <Mail size={18} className={styles.infoIcon} />
                  <div><a href="mailto:info@contract-ai.de" className={styles.link}>info@contract-ai.de</a></div>
                </div>
                <div className={styles.infoGroup}>
                  <LinkIcon size={18} className={styles.infoIcon} />
                  <div><a href="https://contract-ai.de" target="_blank" rel="noreferrer" className={styles.link}>https://contract-ai.de</a></div>
                </div>
              </div>
            </motion.div>

            {/* Angaben gemäß § 5 TMG */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <h2>Angaben gemäß § 5 TMG</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <User size={18} className={styles.infoIcon} />
                  <div>
                    <strong>Noah Liebold</strong><br />
                    Einzelunternehmer<br />
                    Haupttätigkeit: Softwareentwicklung, KI-gestützte Webanwendungen, digitale SaaS-Plattformen.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* USt-IdNr */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              <h2>Umsatzsteuer-Identifikationsnummer</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <CreditCard size={18} className={styles.infoIcon} />
                  <div>USt-IdNr.: DE361461136</div>
                </div>
              </div>
            </motion.div>

            {/* Verantwortlich für Inhalt */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <User size={18} className={styles.infoIcon} />
                  <div>Noah Liebold<br />Richard-Oberle-Weg 27<br />76648 Durmersheim</div>
                </div>
              </div>
            </motion.div>

            {/* Haftungsausschluss */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.3 }}
            >
              <h2>Haftungsausschluss</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <Scale size={18} className={styles.infoIcon} />
                  <div>
                    <strong>Haftung für Inhalte:</strong><br />
                    Ich bin gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für fremde Inhalte übernehme ich gemäß §§ 8–10 TMG keine Haftung.
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <LinkIcon size={18} className={styles.infoIcon} />
                  <div>
                    <strong>Haftung für Links:</strong><br />
                    Für Inhalte externer Webseiten, auf die ich verlinke, übernehme ich keine Verantwortung. Für diese sind ausschließlich deren Betreiber verantwortlich.
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <Copyright size={18} className={styles.infoIcon} />
                  <div>
                    <strong>Urheberrecht:</strong><br />
                    Alle Inhalte dieser Website unterliegen dem deutschen Urheberrecht.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Verbraucherstreitbeilegung */}
            <motion.div
              className={styles.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.3 }}
            >
              <h2>Verbraucherstreitbeilegung (VSBG)</h2>
              <div className={styles.sectionContent}>
                <div className={styles.infoGroup}>
                  <Shield size={18} className={styles.infoIcon} />
                  <div>
                    Ich bin nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <AlertCircle size={18} className={styles.infoIcon} />
                  <div>
                    Plattform der EU-Kommission zur Online-Streitbeilegung:{" "}
                    <a
                      href="https://ec.europa.eu/consumers/odr"
                      target="_blank"
                      rel="noreferrer"
                      className={styles.link}
                    >
                      https://ec.europa.eu/consumers/odr
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import styles from "./Impressum.module.css";
import { FileText, Mail, Phone, User, Globe } from "lucide-react";

export default function Impressum() {
  return (
    <div className={styles.container}>
      <Helmet>
        <title>Impressum | Contract AI</title>
        <meta
          name="description"
          content="Impressum der Website contract-ai.de. Verantwortliche Angaben gemäß § 5 TMG."
        />
      </Helmet>

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
          <motion.div 
            className={styles.section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <h2>Angaben gemäß § 5 TMG</h2>
            <div className={styles.sectionContent}>
              <div className={styles.infoGroup}>
                <User size={18} className={styles.infoIcon} />
                <div>Noah Liebold</div>
              </div>
              <div className={styles.infoGroup}>
                <Globe size={18} className={styles.infoIcon} />
                <div>Richard Oberle Weg: 27<br />Deutschland</div>
              </div>
            </div>
          </motion.div>

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
                <div>–</div>
              </div>
              <div className={styles.infoGroup}>
                <Mail size={18} className={styles.infoIcon} />
                <div><a href="mailto:info@contract-ai.de" className={styles.link}>info@contract-ai.de</a></div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className={styles.section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <div className={styles.sectionContent}>
              <div className={styles.infoGroup}>
                <User size={18} className={styles.infoIcon} />
                <div>Noah Liebold</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className={styles.section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <h2>Streitbeilegung</h2>
            <div className={styles.sectionContent}>
              <p>
                Plattform der EU-Kommission zur Online-Streitbeilegung:{" "}
                <a 
                  href="https://ec.europa.eu/consumers/odr" 
                  target="_blank" 
                  rel="noreferrer"
                  className={styles.link}
                >
                  https://ec.europa.eu/consumers/odr
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
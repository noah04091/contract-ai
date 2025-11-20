import React, { useState, useEffect } from 'react';
import { Helmet } from "react-helmet";
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
        <meta name="description" content="Alles zur Verarbeitung deiner Daten, Datenschutzrichtlinien und Sicherheitsmaßnahmen bei Contract AI." />
        <meta name="keywords" content="Datenschutz, Datenschutzerklärung, Contract AI Datenschutz, DSGVO" />
        <link rel="canonical" href="https://www.contract-ai.de/datenschutz" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Datenschutzerklärung | Contract AI" />
        <meta property="og:description" content="Lies alles über unseren Umgang mit deinen Daten und wie Contract AI deine Privatsphäre schützt." />
        <meta property="og:url" content="https://contract-ai.de/datenschutz" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Datenschutzerklärung | Contract AI" />
        <meta name="twitter:description" content="Vertraue auf höchste Sicherheit und Datenschutz bei Contract AI. Hier findest du alle Infos." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
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
            Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck 
            der Verarbeitung von personenbezogenen Daten auf unserer Website auf.
          </p>
        </motion.div>
        
        <div className="privacy-content">
          <Section title="1. Verantwortlicher">
            <div className="contact-card">
              <p>Noah Liebold<br />Richard Oberle Weg 27<br />E-Mail: <a href="mailto:info@contract-ai.de">info@contract-ai.de</a></p>
            </div>
          </Section>
          
          <Section title="2. Erhebung und Speicherung personenbezogener Daten">
            <p>
              Beim Besuch unserer Website werden folgende Daten automatisch erfasst:
            </p>
            <ul className="data-list">
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                viewport={{ once: true }}
              >
                IP-Adresse
              </motion.li>
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Browsertyp
              </motion.li>
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                viewport={{ once: true }}
              >
                Betriebssystem
              </motion.li>
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                viewport={{ once: true }}
              >
                Referrer URL
              </motion.li>
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                viewport={{ once: true }}
              >
                Uhrzeit des Zugriffs
              </motion.li>
            </ul>
          </Section>
          
          <Section title="3. Verwendung von Cookies">
            <p>
              Wir verwenden Cookies zur Verbesserung der Nutzererfahrung. 
              Details entnehmen Sie bitte unserer Cookie-Richtlinie.
            </p>
          </Section>
          
          <Section title="4. Rechte der betroffenen Person">
            <div className="rights-container">
              <motion.div 
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">ℹ️</span>
                <span className="right-text">Auskunft</span>
              </motion.div>
              
              <motion.div 
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">🗑️</span>
                <span className="right-text">Löschung</span>
              </motion.div>
              
              <motion.div 
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">🔒</span>
                <span className="right-text">Einschränkung der Verarbeitung</span>
              </motion.div>
              
              <motion.div 
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">📤</span>
                <span className="right-text">Datenübertragbarkeit</span>
              </motion.div>
              
              <motion.div 
                className="rights-card"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="right-icon">↩️</span>
                <span className="right-text">Widerruf Ihrer Einwilligung</span>
              </motion.div>
            </div>
          </Section>
          
          <motion.div
            className="privacy-footer"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p>Bei Fragen wenden Sie sich bitte an <a href="mailto:info@contract-ai.de">info@contract-ai.de</a>.</p>
          </motion.div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}

import React from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Sparkles, Zap, Users, ArrowRight } from "lucide-react";
import styles from "../styles/About.module.css";
import Footer from "../components/Footer";

// Team Bilder
import noahImg from "../assets/team/noah-liebold.jpg.png";
import michaelImg from "../assets/team/michael-weber.jpg.png";
import lauraImg from "../assets/team/laura-mueller.jpg.png";

// Werte-Daten
const values = [
  {
    icon: <Shield size={28} />,
    title: "Sicherheit",
    description: "DSGVO-konform mit deutschen Servern. Deine Daten bleiben geschützt.",
    colorClass: "security"
  },
  {
    icon: <Sparkles size={28} />,
    title: "Einfachheit",
    description: "Komplexe Verträge verständlich machen – für jeden.",
    colorClass: "simplicity"
  },
  {
    icon: <Zap size={28} />,
    title: "Innovation",
    description: "Modernste KI-Technologie für präzise Analysen.",
    colorClass: "innovation"
  },
  {
    icon: <Users size={28} />,
    title: "Transparenz",
    description: "Keine versteckten Kosten, klare Kommunikation.",
    colorClass: "transparency"
  }
];

// Timeline-Daten
const milestones = [
  {
    year: "Q2 2024",
    title: "Gründung in Deutschland",
    description: "Contract AI wird als Legal-Tech Startup in Frankfurt gegründet."
  },
  {
    year: "Q3 2024",
    title: "Erste 1.000 Nutzer",
    description: "Innerhalb von 3 Monaten erreichen wir unseren ersten großen Meilenstein."
  },
  {
    year: "Q4 2024",
    title: "Seed-Finanzierung",
    description: "Erfolgreiche Seed-Runde mit deutschen Business Angels."
  },
  {
    year: "Q4 2024",
    title: "Legal Lens Launch",
    description: "Release unserer revolutionären Klausel-Analyse mit KI-Erklärungen."
  },
  {
    year: "Q1 2025",
    title: "100.000 Verträge analysiert",
    description: "Ein wichtiger Meilenstein: Über 100.000 Verträge wurden auf unserer Plattform analysiert."
  },
  {
    year: "Q1 2025",
    title: "Digitale Signatur Launch",
    description: "Rechtsgültige digitale Unterschriften direkt in der Plattform."
  },
  {
    year: "Q1 2025",
    title: "5.000+ aktive Nutzer",
    description: "Die Contract AI Community wächst rasant weiter."
  },
  {
    year: "2025",
    title: "Enterprise-Partnerschaften",
    description: "Erste Kooperationen mit mittelständischen Unternehmen und Kanzleien."
  }
];

const About: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Über uns – Contract AI | Deine Experten für smarte Vertragsanalyse</title>
        <meta name="description" content="Lerne das Team hinter Contract AI kennen. Wir entwickeln smarte KI-Lösungen für transparente, sichere und einfache Vertragsanalysen." />
        <meta name="keywords" content="Über uns, Contract AI, Team, Mission, smarte Vertragsanalyse, KI Vertragsmanagement" />
        <link rel="canonical" href="https://www.contract-ai.de/about" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Über uns – Contract AI" />
        <meta property="og:description" content="Lerne das Team kennen, das Contract AI entwickelt hat, um deine Verträge smarter, sicherer und transparenter zu machen." />
        <meta property="og:url" content="https://www.contract-ai.de/about" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Über uns – Contract AI" />
        <meta name="twitter:description" content="Wir sind das Team hinter Contract AI – der führenden Plattform für smarte, KI-gestützte Vertragsanalysen." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.aboutPage}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <h1 className={`${styles.heroTitle} fadeInUp`}>
            Unsere Mission:<br />
            <span className={styles.heroTitleHighlight}>Klarheit in jedem Vertrag.</span>
          </h1>
        </section>

        {/* Philosophy Section */}
        <section className={styles.philosophySection}>
          <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.2s' }}>
            <p className={styles.leadParagraph}>
              Contract AI wurde mit einem klaren Ziel gegründet: die Komplexität aus dem Vertragsmanagement zu entfernen und durch Einfachheit zu ersetzen.
            </p>

            <p className={styles.bodyParagraph}>
              In einer Welt, in der Verträge immer umfangreicher und komplizierter werden, nutzen wir die neuesten Entwicklungen der künstlichen Intelligenz, um den Kern jedes Dokuments freizulegen. Unsere Technologie analysiert, interpretiert und präsentiert die wichtigsten Vertragselemente in einer intuitiven, zugänglichen Form.
            </p>

            <p className={styles.bodyParagraph}>
              Wir glauben, dass Einfachheit nicht nur ein ästhetisches Ideal ist, sondern eine funktionale Notwendigkeit. Mit Contract AI transformieren wir die Art und Weise, wie Unternehmen ihre vertraglichen Verpflichtungen verstehen und verwalten – mit Präzision, Eleganz und unübertroffener Klarheit.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className={styles.valuesSection}>
          <h2 className={`${styles.sectionTitle} scaleIn`} style={{ animationDelay: '0.3s' }}>
            Unsere Werte
          </h2>
          <div className={styles.valuesGrid}>
            {values.map((value, index) => (
              <div
                key={value.title}
                className={`${styles.valueCard} fadeInUp`}
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <div className={`${styles.valueIcon} ${styles[value.colorClass]}`}>
                  {value.icon}
                </div>
                <h3 className={styles.valueTitle}>{value.title}</h3>
                <p className={styles.valueDescription}>{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section className={styles.timelineSection}>
          <h2 className={`${styles.sectionTitle} scaleIn`} style={{ animationDelay: '0.4s' }}>
            Unsere Geschichte
          </h2>
          <div className={styles.timeline}>
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`${styles.timelineItem} fadeInUp`}
                style={{ animationDelay: `${0.5 + index * 0.15}s` }}
              >
                <div className={styles.timelineDot} />
                <div className={styles.timelineContent}>
                  <span className={styles.timelineYear}>{milestone.year}</span>
                  <h3 className={styles.timelineTitle}>{milestone.title}</h3>
                  <p className={styles.timelineDescription}>{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className={styles.teamSection}>
          <h2 className={`${styles.sectionTitle} scaleIn`} style={{ animationDelay: '0.4s' }}>
            Unser Team
          </h2>

          <div className={styles.teamGrid}>
            {/* Team Member 1 */}
            <div className={`${styles.teamMember} fadeInUp`} style={{ animationDelay: '0.6s' }}>
              <div className={styles.memberImageWrapper}>
                <img
                  src={noahImg}
                  alt="Noah Liebold - Gründer & CEO"
                  className={styles.memberImage}
                />
              </div>
              <h3 className={styles.memberName}>Noah Liebold</h3>
              <p className={styles.memberRole}>Gründer & CEO</p>
            </div>

            {/* Team Member 2 */}
            <div className={`${styles.teamMember} fadeInUp`} style={{ animationDelay: '0.7s' }}>
              <div className={styles.memberImageWrapper}>
                <img
                  src={michaelImg}
                  alt="Michael Weber - CTO"
                  className={styles.memberImage}
                />
              </div>
              <h3 className={styles.memberName}>Michael Weber</h3>
              <p className={styles.memberRole}>CTO</p>
            </div>

            {/* Team Member 3 */}
            <div className={`${styles.teamMember} fadeInUp`} style={{ animationDelay: '0.8s' }}>
              <div className={styles.memberImageWrapper}>
                <img
                  src={lauraImg}
                  alt="Laura Hoffmann - Head of Design"
                  className={styles.memberImage}
                />
              </div>
              <h3 className={styles.memberName}>Laura Hoffmann</h3>
              <p className={styles.memberRole}>Head of Design</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContent}>
            <h2 className={`${styles.ctaTitle} fadeInUp`}>
              Bereit, deine Verträge zu verstehen?
            </h2>
            <p className={`${styles.ctaSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
              Starte jetzt kostenlos und erlebe, wie einfach Vertragsanalyse sein kann.
            </p>
            <Link
              to="/register"
              className={`${styles.ctaButton} fadeInUp`}
              style={{ animationDelay: '0.2s' }}
            >
              Jetzt kostenlos starten
              <span className={styles.ctaButtonIcon}>
                <ArrowRight size={20} />
              </span>
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default About;
import React, { useEffect } from 'react';
import { Helmet } from "react-helmet";
import styles from "../styles/About.module.css";

const About: React.FC = () => {
  useEffect(() => {
    // Setze den document title manuell
    document.title = "Über uns | Contract AI";
    
    // Füge meta description hinzu
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Contract AI bringt Klarheit in jeden Vertrag durch innovative KI-Technologie.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Contract AI bringt Klarheit in jeden Vertrag durch innovative KI-Technologie.';
      document.head.appendChild(meta);
    }

    // Cleanup function
    return () => {
      document.title = 'Contract AI'; // Setze einen Standardtitel zurück
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Über uns – Contract AI | Deine Experten für smarte Vertragsanalyse</title>
        <meta name="description" content="Lerne das Team hinter Contract AI kennen. Wir entwickeln smarte KI-Lösungen für transparente, sichere und einfache Vertragsanalysen." />
        <meta name="keywords" content="Über uns, Contract AI, Team, Mission, smarte Vertragsanalyse, KI Vertragsmanagement" />
        <link rel="canonical" href="https://contract-ai.de/about" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Über uns – Contract AI" />
        <meta property="og:description" content="Lerne das Team kennen, das Contract AI entwickelt hat, um deine Verträge smarter, sicherer und transparenter zu machen." />
        <meta property="og:url" content="https://contract-ai.de/about" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Über uns – Contract AI" />
        <meta name="twitter:description" content="Wir sind das Team hinter Contract AI – der führenden Plattform für smarte, KI-gestützte Vertragsanalysen." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.aboutContainer}>
        
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
        
        {/* Team Section */}
        <section className={styles.teamSection}>
          <h2 className={`${styles.sectionTitle} scaleIn`} style={{ animationDelay: '0.4s' }}>
            Unser Team
          </h2>
          
          <div className={styles.teamGrid}>
            {/* Team Member 1 */}
            <div className={`${styles.teamMember} fadeInUp`} style={{ animationDelay: '0.6s' }}>
              <div className={styles.memberImagePlaceholder}></div>
              <h3 className={styles.memberName}>Noah Liebold</h3>
              <p className={styles.memberRole}>Gründer & CEO</p>
            </div>
            
            {/* Team Member 2 */}
            <div className={`${styles.teamMember} fadeInUp`} style={{ animationDelay: '0.7s' }}>
              <div className={styles.memberImagePlaceholder}></div>
              <h3 className={styles.memberName}>Michael Weber</h3>
              <p className={styles.memberRole}>CTO</p>
            </div>
            
            {/* Team Member 3 */}
            <div className={`${styles.teamMember} fadeInUp`} style={{ animationDelay: '0.8s' }}>
              <div className={styles.memberImagePlaceholder}></div>
              <h3 className={styles.memberName}>Laura Müller</h3>
              <p className={styles.memberRole}>Head of Design</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;
import React, { useEffect } from 'react';
import styles from "../styles/Press.module.css";
import logoHeader from "../assets/logo-header.png";
import logo from "../assets/logo.png";
import Footer from "../components/Footer";

const Press: React.FC = () => {
  useEffect(() => {
    // Setze den document title
    document.title = "Presse & Medien | Contract AI";
    
    // Füge meta description hinzu
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Pressemitteilungen, Medienressourcen und Kontaktinformationen für Journalisten. Erfahren Sie mehr über Contract AI.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Pressemitteilungen, Medienressourcen und Kontaktinformationen für Journalisten. Erfahren Sie mehr über Contract AI.';
      document.head.appendChild(meta);
    }

    // Cleanup function
    return () => {
      document.title = 'Contract AI';
    };
  }, []);

  const pressReleases = [
    {
      date: "01.08.2025",
      title: "Contract AI startet offiziellen Live-Betrieb unter contract-ai.de",
      link: "#"
    },
    {
      date: "15.07.2025",
      title: "Launch der Beta-Version und erste Nutzerfeedbacks",
      link: "#"
    },
    {
      date: "01.06.2025",
      title: "Vertragsanalyse meets KI – Contract AI bringt LegalTech in den Alltag",
      link: "#"
    }
  ];

  const downloadAssets = [
    {
      name: "Contract AI Logo (Header)",
      type: "PNG",
      size: "2048x512px",
      image: logoHeader,
      downloadName: "contract-ai-logo-header.png"
    },
    {
      name: "Contract AI Logo (Quadrat)",
      type: "PNG",
      size: "1024x1024px",
      image: logo,
      downloadName: "contract-ai-logo.png"
    },
    {
      name: "Contract AI Icon",
      type: "PNG",
      size: "512x512px",
      image: "/favicon.png",
      downloadName: "contract-ai-icon.png"
    }
  ];

  const faqs = [
    {
      question: "Was unterscheidet Contract AI von anderen Vertragsapps?",
      answer: "KI-gestützte Optimierung, Risikoscoring, Fairness-Analyse und PDF-Vergleich machen Contract AI einzigartig. Unsere Plattform nutzt modernste GPT-4 Technologie mit deutschen Serverstandorten."
    },
    {
      question: "Ist Contract AI rechtlich abgesichert?",
      answer: "Contract AI bietet keine Rechtsberatung, basiert aber auf juristisch geprüften Grundlagen und nutzt GPT-4-Modelle mit passenden Sicherheitsmaßnahmen. Alle Daten werden DSGVO-konform verarbeitet."
    },
    {
      question: "Wer nutzt Contract AI?",
      answer: "Privatpersonen, Selbstständige, Startups, Anwälte und KMUs profitieren von unserer intuitiven Vertragsanalyse."
    }
  ];

  const handleCopyText = () => {
    const text = "Contract AI ist ein deutsches LegalTech-Startup, das KI-gestützte Vertragsanalyse, -optimierung und -verwaltung für Privatpersonen, Unternehmen und Kanzleien anbietet. Die Plattform analysiert Verträge innerhalb von Sekunden, erkennt rechtliche Risiken, bietet Einsparpotenziale und erinnert automatisch an wichtige Fristen. Contract AI ist DSGVO-konform, nutzt Serverstandorte in Deutschland und wurde 2025 von Noah Liebold gegründet.";
    navigator.clipboard.writeText(text).then(() => {
      alert('Text wurde in die Zwischenablage kopiert!');
    }).catch(() => {
      alert('Kopieren fehlgeschlagen. Bitte versuchen Sie es erneut.');
    });
  };

  return (
    <>
      <div className={styles.pressContainer}>
      
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <h1 className={`${styles.heroTitle} fadeInUp`}>
          Contract AI – <br />
          <span className={styles.heroTitleHighlight}>Die Zukunft der Vertragsanalyse</span>
        </h1>
        <p className={`${styles.heroSubtitle} fadeInUp`} style={{ animationDelay: '0.1s' }}>
          Willkommen im Pressebereich von Contract AI. Hier finden Sie aktuelle Pressemitteilungen, 
          Hintergrundinformationen, Bildmaterial sowie unsere Kontaktdaten für Medienanfragen.
        </p>
      </section>
      
      {/* About/Boilerplate Section */}
      <section className={styles.boilerplateSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.2s' }}>
          <h2 className={styles.sectionTitle}>Über Contract AI</h2>
          <div className={styles.boilerplateBox}>
            <p className={styles.boilerplateText}>
              Contract AI ist ein deutsches LegalTech-Startup, das KI-gestützte Vertragsanalyse, -optimierung und -verwaltung 
              für Privatpersonen, Unternehmen und Kanzleien anbietet. Die Plattform analysiert Verträge innerhalb von Sekunden, 
              erkennt rechtliche Risiken, bietet Einsparpotenziale und erinnert automatisch an wichtige Fristen. 
              Contract AI ist DSGVO-konform, nutzt Serverstandorte in Deutschland und wurde 2025 von Noah Liebold gegründet.
            </p>
            <button 
              className={styles.copyButton} 
              onClick={handleCopyText}
            >
              📋 Text kopieren
            </button>
          </div>
        </div>
      </section>

      {/* Press Releases Section */}
      <section className={styles.pressReleasesSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.3s' }}>
          <h2 className={styles.sectionTitle}>Pressemitteilungen</h2>
          <div className={styles.releasesList}>
            {pressReleases.map((release, index) => (
              <div key={index} className={`${styles.releaseItem} fadeInUp`} style={{ animationDelay: `${0.4 + index * 0.1}s` }}>
                <span className={styles.releaseDate}>{release.date}</span>
                <h3 className={styles.releaseTitle}>
                  <a href={release.link} className={styles.releaseLink}>
                    {release.title}
                  </a>
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className={styles.founderSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.5s' }}>
          <h2 className={styles.sectionTitle}>Gründer & Geschäftsführung</h2>
          <div className={styles.founderCard}>
            <div className={styles.founderImagePlaceholder}></div>
            <div className={styles.founderInfo}>
              <h3 className={styles.founderName}>Noah Liebold</h3>
              <p className={styles.founderRole}>Gründer & Geschäftsführer</p>
              <p className={styles.founderBio}>
                Noah hat Contract AI 2025 gegründet, mit dem Ziel, Vertragsverwaltung für alle einfach, 
                effizient und verständlich zu machen. Er bringt Erfahrung aus dem Versicherungs- und 
                Vertriebsumfeld mit und kombiniert juristische Strukturen mit KI-Technologie.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section className={styles.downloadsSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.6s' }}>
          <h2 className={styles.sectionTitle}>Bildmaterial & Logos</h2>
          <div className={styles.downloadsGrid}>
            {downloadAssets.map((asset, index) => (
              <div key={index} className={`${styles.downloadCard} fadeInUp`} style={{ animationDelay: `${0.7 + index * 0.1}s` }}>
                <div className={styles.assetPreview}>
                  {asset.image.startsWith('/') ? (
                    <img src={asset.image} alt={asset.name} className={styles.assetImage} />
                  ) : (
                    <img src={asset.image} alt={asset.name} className={styles.assetImage} />
                  )}
                </div>
                <h4 className={styles.assetName}>{asset.name}</h4>
                <p className={styles.assetSpecs}>{asset.type} • {asset.size}</p>
                <a 
                  href={asset.image} 
                  download={asset.downloadName} 
                  className={styles.downloadButton}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
          <p className={styles.usageNote}>
            Alle Logos und Grafiken dürfen für redaktionelle Zwecke im Zusammenhang mit Contract AI verwendet werden.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.8s' }}>
          <h2 className={styles.sectionTitle}>Pressekontakt</h2>
          <div className={styles.contactCard}>
            <div className={styles.contactInfo}>
              <h3 className={styles.contactName}>Noah Liebold</h3>
              <p className={styles.contactRole}>Pressesprecher</p>
              <div className={styles.contactDetails}>
                <a href="mailto:info@contract-ai.de" className={styles.contactLink}>
                  📧 info@contract-ai.de
                </a>
              </div>
              <p className={styles.responseTime}>
                Wir antworten in der Regel innerhalb von 24 Stunden auf Presseanfragen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '0.9s' }}>
          <h2 className={styles.sectionTitle}>Häufige Fragen für Journalisten</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <div key={index} className={`${styles.faqItem} fadeInUp`} style={{ animationDelay: `${1.0 + index * 0.1}s` }}>
                <h3 className={styles.faqQuestion}>{faq.question}</h3>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section (für später) */}
      <section className={styles.socialProofSection}>
        <div className={`${styles.contentContainer} fadeInUp`} style={{ animationDelay: '1.2s' }}>
          <h2 className={styles.sectionTitle}>Contract AI in den Medien</h2>
          <p className={styles.comingSoon}>
            Medienerwähnungen und Pressestimmen werden hier bald erscheinen.
          </p>
        </div>
      </section>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
};

export default Press;
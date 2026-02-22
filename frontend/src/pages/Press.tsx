// Press - Stripe-Level Design
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import styles from "../styles/Press.module.css";
import logoHeader from "../assets/logo-header.webp";
import logo from "../assets/logo.webp";
import Footer from "../components/Footer";
import {
  Newspaper, Download, User, Mail, MessageSquare,
  Calendar, Copy, Check, Image, FileText, ChevronRight,
  ArrowRight, ExternalLink, Quote, Building2, Zap
} from "lucide-react";

interface PressRelease {
  date: string;
  title: string;
  description: string;
  link: string;
}

interface DownloadAsset {
  name: string;
  type: string;
  size: string;
  image: string;
  downloadName: string;
}

interface FAQ {
  question: string;
  answer: string;
}

export default function Press() {
  const [copied, setCopied] = useState(false);
  const animatedRefs = useRef<(HTMLElement | null)[]>([]);

  const pressReleases: PressRelease[] = [
    {
      date: "01.08.2025",
      title: "Contract AI startet offiziellen Live-Betrieb",
      description: "Nach erfolgreicher Beta-Phase geht die KI-gestützte Vertragsplattform unter contract-ai.de in den produktiven Einsatz.",
      link: "#"
    },
    {
      date: "15.07.2025",
      title: "Launch der Beta-Version mit ersten Nutzerfeedbacks",
      description: "Die Beta-Phase liefert wertvolle Einblicke und positive Rückmeldungen von über 500 Early Adopters.",
      link: "#"
    },
    {
      date: "01.06.2025",
      title: "Vertragsanalyse meets KI – Contract AI revolutioniert LegalTech",
      description: "Das deutsche Startup bringt moderne KI-Technologie in die alltägliche Vertragsverwaltung.",
      link: "#"
    }
  ];

  const downloadAssets: DownloadAsset[] = [
    {
      name: "Logo Header",
      type: "WEBP",
      size: "2048×512px",
      image: logoHeader,
      downloadName: "contract-ai-logo-header.webp"
    },
    {
      name: "Logo Quadrat",
      type: "WEBP",
      size: "1024×1024px",
      image: logo,
      downloadName: "contract-ai-logo.webp"
    },
    {
      name: "Favicon Icon",
      type: "PNG",
      size: "512×512px",
      image: "/favicon.png",
      downloadName: "contract-ai-icon.png"
    }
  ];

  const faqs: FAQ[] = [
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

  const boilerplateText = "Contract AI ist ein deutsches LegalTech-Startup, das KI-gestützte Vertragsanalyse, -optimierung und -verwaltung für Privatpersonen, Unternehmen und Kanzleien anbietet. Die Plattform analysiert Verträge innerhalb von Sekunden, erkennt rechtliche Risiken, bietet Einsparpotenziale und erinnert automatisch an wichtige Fristen. Contract AI ist DSGVO-konform, nutzt Serverstandorte in Deutschland und wurde 2025 von Noah Liebold gegründet.";

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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(boilerplateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Copy failed");
    }
  };

  // Structured Data
  const pressSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Presse & Medien - Contract AI",
    "description": "Pressemitteilungen, Medienressourcen und Kontaktinformationen für Journalisten.",
    "url": "https://www.contract-ai.de/press",
    "inLanguage": "de-DE"
  };

  return (
    <>
      <Helmet>
        <title>Presse & Medien | Contract AI</title>
        <meta name="description" content="Pressemitteilungen, Medienressourcen und Kontaktinformationen für Journalisten. Erfahren Sie mehr über Contract AI." />
        <meta name="keywords" content="Contract AI Presse, LegalTech Startup, Pressemitteilungen, Medien, Journalisten" />
        <link rel="canonical" href="https://www.contract-ai.de/press" />
        <meta property="og:title" content="Presse & Medien | Contract AI" />
        <meta property="og:description" content="Pressemitteilungen und Medienressourcen für Journalisten." />
        <meta property="og:url" content="https://www.contract-ai.de/press" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">
          {JSON.stringify(pressSchema)}
        </script>
      </Helmet>

      <div className={styles.pageBackground}>
        <div className={styles.container}>
          {/* Hero Section */}
          <header className={styles.hero}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot}></span>
              Presse & Medien
            </div>

            <div className={styles.heroIconWrapper}>
              <Newspaper className={styles.heroIcon} />
            </div>

            <h1 className={styles.heroTitle}>
              Contract AI
              <span className={styles.heroTitleAccent}>Pressebereich</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Aktuelle Pressemitteilungen, Hintergrundinformationen, Bildmaterial
              und Kontaktdaten für Medienanfragen.
            </p>
          </header>

          {/* Boilerplate Section */}
          <section className={`${styles.boilerplateSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <Building2 size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Über Contract AI</h2>
            </div>

            <div className={styles.boilerplateCard}>
              <Quote size={32} className={styles.quoteIcon} />
              <p className={styles.boilerplateText}>{boilerplateText}</p>
              <button
                className={`${styles.copyButton} ${copied ? styles.copied : ""}`}
                onClick={handleCopyText}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Text kopieren
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Press Releases */}
          <section className={`${styles.pressSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <FileText size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Pressemitteilungen</h2>
            </div>

            <div className={styles.pressGrid}>
              {pressReleases.map((release, index) => (
                <a
                  key={index}
                  href={release.link}
                  className={`${styles.pressCard} ${styles.animateOnScroll}`}
                  ref={addToRefs}
                >
                  <div className={styles.pressDate}>
                    <Calendar size={14} />
                    {release.date}
                  </div>
                  <h3 className={styles.pressTitle}>{release.title}</h3>
                  <p className={styles.pressDescription}>{release.description}</p>
                  <span className={styles.pressLink}>
                    Mehr lesen
                    <ChevronRight size={16} />
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Founder Section */}
          <section className={`${styles.founderSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <User size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Gründer & Geschäftsführung</h2>
            </div>

            <div className={styles.founderCard}>
              <div className={styles.founderAvatar}>
                <span>NL</span>
              </div>
              <div className={styles.founderInfo}>
                <h3 className={styles.founderName}>Noah Liebold</h3>
                <p className={styles.founderRole}>Gründer & Geschäftsführer</p>
                <p className={styles.founderBio}>
                  Noah hat Contract AI 2025 gegründet, mit dem Ziel, Vertragsverwaltung für alle
                  einfach, effizient und verständlich zu machen. Er bringt Erfahrung aus dem
                  Versicherungs- und Vertriebsumfeld mit und kombiniert juristische Strukturen
                  mit KI-Technologie.
                </p>
              </div>
            </div>
          </section>

          {/* Downloads Section */}
          <section className={`${styles.downloadsSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <Image size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Bildmaterial & Logos</h2>
            </div>

            <div className={styles.downloadsGrid}>
              {downloadAssets.map((asset, index) => (
                <div key={index} className={`${styles.downloadCard} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <div className={styles.assetPreview}>
                    <img src={asset.image} alt={asset.name} className={styles.assetImage} />
                  </div>
                  <div className={styles.assetInfo}>
                    <h4 className={styles.assetName}>{asset.name}</h4>
                    <p className={styles.assetSpecs}>{asset.type} • {asset.size}</p>
                  </div>
                  <a
                    href={asset.image}
                    download={asset.downloadName}
                    className={styles.downloadButton}
                  >
                    <Download size={16} />
                    Download
                  </a>
                </div>
              ))}
            </div>

            <p className={styles.usageNote}>
              Alle Logos und Grafiken dürfen für redaktionelle Zwecke im Zusammenhang mit Contract AI verwendet werden.
            </p>
          </section>

          {/* Contact Section */}
          <section className={`${styles.contactSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <Mail size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Pressekontakt</h2>
            </div>

            <div className={styles.contactCard}>
              <div className={styles.contactAvatar}>
                <Mail size={24} />
              </div>
              <div className={styles.contactInfo}>
                <h3 className={styles.contactName}>Noah Liebold</h3>
                <p className={styles.contactRole}>Pressesprecher</p>
                <a href="mailto:info@contract-ai.de" className={styles.contactEmail}>
                  info@contract-ai.de
                  <ExternalLink size={14} />
                </a>
                <p className={styles.responseTime}>
                  Wir antworten in der Regel innerhalb von 24 Stunden auf Presseanfragen.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className={`${styles.faqSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <MessageSquare size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Häufige Fragen für Journalisten</h2>
            </div>

            <div className={styles.faqList}>
              {faqs.map((faq, index) => (
                <div key={index} className={`${styles.faqItem} ${styles.animateOnScroll}`} ref={addToRefs}>
                  <h3 className={styles.faqQuestion}>{faq.question}</h3>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Media Mentions */}
          <section className={`${styles.mediaSection} ${styles.animateOnScroll}`} ref={addToRefs}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <Zap size={22} />
              </div>
              <h2 className={styles.sectionTitle}>Contract AI in den Medien</h2>
            </div>

            <div className={styles.mediaPlaceholder}>
              <Newspaper size={48} />
              <p>Medienerwähnungen und Pressestimmen werden hier bald erscheinen.</p>
            </div>
          </section>

          {/* CTA */}
          <div className={`${styles.footerCta} ${styles.animateOnScroll}`} ref={addToRefs}>
            <h3 className={styles.footerCtaTitle}>Presseanfrage?</h3>
            <p className={styles.footerCtaText}>
              Kontaktieren Sie uns für Interviews, Produktinformationen oder Bildmaterial.
            </p>
            <a href="mailto:info@contract-ai.de" className={styles.footerCtaButton}>
              Kontakt aufnehmen
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

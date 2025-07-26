import React, { useState } from 'react';
import { Search, FileText, Eye, BarChart3, Download, RefreshCw, Settings, ChevronDown } from 'lucide-react';
import { Helmet } from "react-helmet";
import styles from '../styles/HelpCenter.module.css';

interface GuideCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface PracticeCard {
  title: string;
  description: string;
  readMoreLink: string;
}

const HelpCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'handbuch' | 'faq' | 'leitfaeden'>('handbuch');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const guideCards: GuideCard[] = [
    {
      icon: <FileText size={24} />,
      title: 'Vertrag hochladen',
      description: 'Laden Sie PDF-Verträge per Drag & Drop hoch oder wählen Sie Dateien aus Ihrem Computer. Unterstützte Formate: PDF, DOC, DOCX bis 10 MB.'
    },
    {
      icon: <Eye size={24} />,
      title: 'Analyse verstehen',
      description: 'Ihre Verträge werden automatisch analysiert. Erhalten Sie Bewertungen zu Fairness, Risiken und Verbesserungsvorschläge in verständlicher Sprache.'
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Contract Score erklärt',
      description: 'Der Contract Score (0-100) bewertet Ihre Verträge. Grün = gut, Gelb = Vorsicht, Rot = Risiko. Plus detaillierte Erklärungen zu jedem Punkt.'
    },
    {
      icon: <Download size={24} />,
      title: 'Ergebnisse exportieren',
      description: 'Speichern Sie Analysen als PDF-Report oder teilen Sie sie per Link mit Kollegen, Anwälten oder Geschäftspartnern.'
    },
    {
      icon: <RefreshCw size={24} />,
      title: 'Verträge vergleichen',
      description: 'Laden Sie mehrere Verträge hoch und vergleichen Sie diese direkt. Ideal für Angebote, Mietverträge oder Arbeitsverträge.'
    },
    {
      icon: <Settings size={24} />,
      title: 'Einstellungen anpassen',
      description: 'Passen Sie Ihre Präferenzen an: Sprache, Benachrichtigungen, Datenexport und Löschung nach DSGVO-Richtlinien.'
    }
  ];

  const faqItems: FAQItem[] = [
    {
      question: 'Wie sicher sind meine Vertragsdaten?',
      answer: 'Ihre Daten werden verschlüsselt übertragen und gespeichert (AES-256). Wir halten uns an deutsche Datenschutzgesetze (DSGVO). Verträge werden nach 30 Tagen automatisch gelöscht, außer Sie verlängern die Speicherung.'
    },
    {
      question: 'Welche Vertragsarten werden unterstützt?',
      answer: 'Contract AI analysiert alle deutschen Vertragsarten: Mietverträge, Arbeitsverträge, Kaufverträge, AGB, Dienstleistungsverträge, Lizenzverträge und mehr. Bei speziellen Branchen-Verträgen arbeiten wir kontinuierlich an Verbesserungen.'
    },
    {
      question: 'Ersetzt Contract AI einen Anwalt?',
      answer: 'Nein, Contract AI ist ein Analyse-Tool, das Sie bei der ersten Einschätzung unterstützt. Bei komplexen rechtlichen Fragen oder wichtigen Verträgen empfehlen wir weiterhin die Beratung durch einen Fachanwalt.'
    },
    {
      question: 'Wie funktioniert die KI-Analyse?',
      answer: 'Unsere KI wurde mit tausenden deutschen Verträgen trainiert. Sie erkennt problematische Klauseln, unausgewogene Bedingungen und rechtliche Risiken. Die Analyse erfolgt anhand bewährter juristischer Standards und aktueller Rechtsprechung.'
    },
    {
      question: 'Was kostet Contract AI?',
      answer: 'Sie können 3 Verträge kostenlos analysieren. Danach bieten wir flexible Pakete ab 9€/Monat für Einzelpersonen und Teampakete für Unternehmen. Alle Preise finden Sie auf unserer Preisseite.'
    },
    {
      question: 'Kann ich Contract AI auch mobil nutzen?',
      answer: 'Ja! Contract AI funktioniert perfekt auf Smartphone und Tablet. Die Web-App ist für alle Geräte optimiert. Eine native App für iOS und Android ist in Entwicklung.'
    }
  ];

  const practiceCards: PracticeCard[] = [
    {
      title: 'Woran erkenne ich einen schlechten Vertrag?',
      description: 'Lernen Sie die häufigsten Warnsignale kennen: einseitige Kündigungsklauseln, versteckte Kosten, unklare Haftungsregelungen und unfaire Zahlungsbedingungen.',
      readMoreLink: '/blog/schlechte-vertraege-erkennen'
    },
    {
      title: 'Verträge richtig vergleichen',
      description: 'Systematischer Vergleich von Angeboten: Worauf Sie bei Kosten, Laufzeiten, Leistungen und Kündigungsbedingungen achten sollten.',
      readMoreLink: '/blog/vertraege-vergleichen'
    },
    {
      title: 'Mietvertrag-Fallen vermeiden',
      description: 'Besonders bei Mietverträgen lauern Fallen: Schönheitsreparaturen, Kaution, Nebenkosten und Kündigungsfristen. So schützen Sie sich.',
      readMoreLink: '/blog/mietvertrag-tipps'
    },
    {
      title: 'Arbeitsverträge verstehen',
      description: 'Arbeitszeit, Überstunden, Urlaub, Krankheit, Kündigung: Die wichtigsten Punkte in Arbeitsverträgen verständlich erklärt.',
      readMoreLink: '/blog/arbeitsvertrag-guide'
    },
    {
      title: 'AGB richtig prüfen',
      description: 'Allgemeine Geschäftsbedingungen sind oft lang und kompliziert. Wir zeigen Ihnen, auf welche Klauseln Sie besonders achten müssen.',
      readMoreLink: '/blog/agb-pruefung'
    },
    {
      title: 'Verhandlungstipps für bessere Verträge',
      description: 'Auch als Privatperson können Sie Verträge nachverhandeln. Mit diesen Strategien erreichen Sie fairere Bedingungen.',
      readMoreLink: '/blog/vertragsverhandlung'
    }
  ];

  const handleFAQToggle = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <>
      <Helmet>
        <title>Hilfe & Support | Contract AI</title>
        <meta name="description" content="Finde Antworten auf deine Fragen, Tutorials und Support rund um Vertragsanalyse, Optimierung und dein Contract AI Konto." />
        <meta name="keywords" content="Hilfe, Support, FAQ, Contract AI Hilfe, Vertragsanalyse Support" />
        <link rel="canonical" href="https://www.contract-ai.de/hilfe" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Hilfe & Support | Contract AI" />
        <meta property="og:description" content="Alle Antworten auf deine Fragen zu Contract AI, Vertragsmanagement und KI-gestützter Analyse – in unserem Help Center." />
        <meta property="og:url" content="https://www.contract-ai.de/hilfe" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hilfe & Support | Contract AI" />
        <meta name="twitter:description" content="Finde schnell Hilfe zu allen Funktionen und deinem Account im Contract AI Help Center." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.helpCenter}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <h1 className={styles.heroTitle}>Hilfe-Center</h1>
            <p className={styles.heroSubtitle}>
              Alles, was Sie über Contract AI wissen müssen – von ersten Schritten bis zu Profi-Tipps
            </p>
          </div>
        </section>

        {/* Search Section */}
        <section className={styles.searchSection}>
          <div className={styles.container}>
            <div className={styles.searchBar}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Wonach suchen Sie? z.B. 'Vertrag hochladen'"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className={styles.tabNav}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'handbuch' ? styles.active : ''}`}
              onClick={() => setActiveTab('handbuch')}
            >
              📖 Handbuch
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'faq' ? styles.active : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              ❓ FAQ
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'leitfaeden' ? styles.active : ''}`}
              onClick={() => setActiveTab('leitfaeden')}
            >
              💡 Leitfäden
            </button>
          </div>
        </nav>

        {/* Content Sections */}
        <main className={styles.contentSection}>
          <div className={styles.container}>
            {/* Handbuch Tab */}
            {activeTab === 'handbuch' && (
              <div className={styles.tabContent}>
                <h2 className={styles.sectionTitle}>Schritt-für-Schritt Anleitungen</h2>
                <p className={styles.sectionSubtitle}>
                  Lernen Sie Contract AI in wenigen Minuten kennen
                </p>
                
                <div className={styles.guideGrid}>
                  {guideCards.map((guide, index) => (
                    <div key={index} className={styles.guideCard}>
                      <div className={styles.guideIcon}>
                        {guide.icon}
                      </div>
                      <h3 className={styles.guideTitle}>{guide.title}</h3>
                      <p className={styles.guideDescription}>{guide.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className={styles.tabContent}>
                <h2 className={styles.sectionTitle}>Häufige Fragen</h2>
                <p className={styles.sectionSubtitle}>
                  Schnelle Antworten auf die wichtigsten Fragen
                </p>
                
                <div className={styles.faqList}>
                  {faqItems.map((faq, index) => (
                    <div key={index} className={`${styles.faqItem} ${openFAQ === index ? styles.open : ''}`}>
                      <button
                        className={styles.faqQuestion}
                        onClick={() => handleFAQToggle(index)}
                      >
                        {faq.question}
                        <ChevronDown
                          className={`${styles.faqToggle} ${openFAQ === index ? styles.rotated : ''}`}
                          size={20}
                        />
                      </button>
                      {openFAQ === index && (
                        <div className={styles.faqAnswer}>
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leitfäden Tab */}
            {activeTab === 'leitfaeden' && (
              <div className={styles.tabContent}>
                <h2 className={styles.sectionTitle}>Best Practice Leitfäden</h2>
                <p className={styles.sectionSubtitle}>
                  Profi-Tipps für bessere Vertragsentscheidungen
                </p>
                
                <div className={styles.practicesGrid}>
                  {practiceCards.map((practice, index) => (
                    <div key={index} className={styles.practiceCard}>
                      <h3 className={styles.practiceTitle}>{practice.title}</h3>
                      <p className={styles.practiceDescription}>{practice.description}</p>
                      <a href={practice.readMoreLink} className={styles.readMore}>
                        Vollständigen Artikel lesen →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default HelpCenter;
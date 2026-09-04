import React, { useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Sparkles, Zap, Users, ArrowRight, ShieldCheck } from "lucide-react";
import styles from "../styles/About.module.css";
import LandingFooter from "../components/LandingFooter";

// Team Bilder
import noahImg from "../assets/team/noah-liebold.webp";
import michaelImg from "../assets/team/michael-weber.webp";
import lauraImg from "../assets/team/laura-mueller.webp";

// Kennzahlen — belegt durch die Meilensteine weiter unten, nichts Erfundenes
const keyFacts = [
  { wert: "500+", text: "aktive Nutzer" },
  { wert: "1.500+", text: "Verträge auf der Plattform analysiert" },
  { wert: "2024", text: "in Frankfurt gegründet" }
];

// Werte-Daten
const values = [
  {
    icon: <Shield size={20} />,
    title: "Sicherheit",
    description: "DSGVO-konform mit deutschen Servern. Deine Daten bleiben geschützt."
  },
  {
    icon: <Sparkles size={20} />,
    title: "Einfachheit",
    description: "Komplexe Verträge verständlich machen – für jeden."
  },
  {
    icon: <Zap size={20} />,
    title: "Innovation",
    description: "Modernste KI-Technologie für präzise Analysen."
  },
  {
    icon: <Users size={20} />,
    title: "Transparenz",
    description: "Keine versteckten Kosten, klare Kommunikation."
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
    title: "Erste aktive Nutzer",
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
    title: "1.500 Verträge analysiert",
    description: "Ein wichtiger Meilenstein: Über 1.500 Verträge wurden auf unserer Plattform analysiert."
  },
  {
    year: "Q1 2025",
    title: "Digitale Signatur Launch",
    description: "Rechtsgültige digitale Unterschriften direkt in der Plattform."
  },
  {
    year: "Q1 2025",
    title: "500+ aktive Nutzer",
    description: "Die Contract AI Community wächst stetig weiter."
  },
  {
    year: "2025",
    title: "Enterprise-Partnerschaften",
    description: "Erste Kooperationen mit mittelständischen Unternehmen und Kanzleien."
  }
];

// Meilensteine nach Jahr buendeln — die Jahreszahl wird zum Anker der Spalte,
// die Quartale laufen daneben durch.
type Schritt = { quartal: string; title: string; description: string };
type Jahresgruppe = { jahr: string; eintraege: Schritt[] };

const jahresgruppen: Jahresgruppe[] = milestones.reduce((acc: Jahresgruppe[], m) => {
  const treffer = m.year.match(/(\d{4})\s*$/);
  const jahr = treffer ? treffer[1] : m.year;
  const quartal = m.year.replace(/\s*\d{4}\s*$/, "").trim() || "—";
  const gruppe = acc.find((g) => g.jahr === jahr);
  const eintrag: Schritt = { quartal, title: m.title, description: m.description };
  if (gruppe) gruppe.eintraege.push(eintrag);
  else acc.push({ jahr, eintraege: [eintrag] });
  return acc;
}, []);

// Testimonial-Daten (Wortlaut unveraendert, nur typografisch geteilt)
const testimonial = {
  lead: "Contract AI hat unsere Vertragsabwicklung revolutioniert.",
  quote: "Was früher Tage dauerte, erledigen wir jetzt in Minuten.",
  author: "Dr. Markus Brennwald",
  role: "Geschäftsführer",
  company: "Brennwald Legal Consulting"
};

const team = [
  { img: noahImg, name: "Noah Liebold", role: "Gründer & CEO" },
  { img: michaelImg, name: "Michael Weber", role: "CTO" },
  { img: lauraImg, name: "Laura Hoffmann", role: "Head of Design" }
];

const About: React.FC = () => {
  // Meilensteine blenden beim Scrollen ein
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    const schritte = document.querySelectorAll(`.${styles.schritt}`);
    schritte.forEach((item) => observer.observe(item));

    // Sichtbarkeits-Fallback: nach 2s ALLE Items sichtbar (Inhalt darf nie unsichtbar bleiben)
    const fallback = window.setTimeout(() => {
      schritte.forEach((item) => item.classList.add(styles.visible));
    }, 2000);

    return () => { observer.disconnect(); window.clearTimeout(fallback); };
  }, []);

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

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
              { "@type": "ListItem", "position": 2, "name": "Über uns", "item": "https://www.contract-ai.de/about" }
            ]
          })}
        </script>

        {/* Organization Schema — E-E-A-T-Signal für Google Knowledge Graph */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Contract AI",
            "url": "https://www.contract-ai.de",
            "logo": "https://www.contract-ai.de/logo-contractai.png",
            "description": "Contract AI ist eine KI-gestützte Plattform für Vertragsanalyse, -optimierung und -verwaltung. DSGVO-konform mit Servern in Deutschland.",
            "foundingDate": "2024",
            "foundingLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "DE",
                "addressLocality": "Frankfurt"
              }
            },
            "email": "info@contract-ai.de",
            "sameAs": [
              "https://linkedin.com",
              "https://www.instagram.com/contract_ai",
              "https://www.facebook.com/profile.php?id=61578781115190"
            ],
            "founder": {
              "@type": "Person",
              "name": "Noah Liebold",
              "jobTitle": "Gründer & CEO"
            }
          })}
        </script>

        {/* Person Schemas — Team-Mitglieder als E-E-A-T-Authoritäten */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Noah Liebold",
            "jobTitle": "Gründer & CEO",
            "worksFor": {
              "@type": "Organization",
              "name": "Contract AI",
              "url": "https://www.contract-ai.de"
            }
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Michael Weber",
            "jobTitle": "CTO",
            "worksFor": {
              "@type": "Organization",
              "name": "Contract AI",
              "url": "https://www.contract-ai.de"
            }
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Laura Hoffmann",
            "jobTitle": "Head of Design",
            "worksFor": {
              "@type": "Organization",
              "name": "Contract AI",
              "url": "https://www.contract-ai.de"
            }
          })}
        </script>
      </Helmet>

      <div className={styles.aboutPage}>
        {/* Auftakt: These links, Beleg rechts */}
        <header className={`${styles.auftakt} ${styles.band}`}>
          <span className={`${styles.marke} fadeInUp`}>
            <span className={styles.markePunkt} />
            LEGAL-TECH AUS DEUTSCHLAND
          </span>
          <div className={styles.auftaktRaster}>
            <div>
              <h1 className={`${styles.heroTitel} fadeInUp`} style={{ animationDelay: '0.06s' }}>
                <span className={styles.leise}>Unsere Mission</span>
                Klarheit in jedem Vertrag.
              </h1>
              <p className={`${styles.anriss} fadeInUp`} style={{ animationDelay: '0.16s' }}>
                Wir entwickeln smarte KI-Lösungen für transparente, sichere und einfache Vertragsanalysen — damit jeder Mensch versteht, was er unterschreibt.
              </p>
              <div className={`${styles.knoepfe} fadeInUp`} style={{ animationDelay: '0.24s' }}>
                <Link to="/register" className={styles.knopfVoll}>
                  Jetzt kostenlos starten
                  <ArrowRight size={18} />
                </Link>
                <a href="#weg" className={styles.knopfLinie}>Unsere Geschichte</a>
              </div>
            </div>
            <div className={`${styles.zahlen} fadeInUp`} style={{ animationDelay: '0.32s' }}>
              {keyFacts.map((f) => (
                <div key={f.wert}>
                  <div className={styles.zahlWert}>{f.wert}</div>
                  <div className={styles.zahlText}>{f.text}</div>
                </div>
              ))}
              <p className={styles.vertrauen}>
                <span className={styles.vertrauenIcon}><ShieldCheck size={15} /></span>
                Vertraut von <strong>über 500 Nutzern</strong> in Deutschland
              </p>
            </div>
          </div>
        </header>

        {/* Warum es uns gibt */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <div className={styles.manifest}>
            <div><span className={styles.augenbraue}>Warum es uns gibt</span></div>
            <div className={styles.fliess}>
              <p className={styles.lead}>
                Contract AI wurde mit einem klaren Ziel gegründet: die Komplexität aus dem Vertragsmanagement zu entfernen und durch Einfachheit zu ersetzen.
              </p>
              <p>
                In einer Welt, in der Verträge immer umfangreicher und komplizierter werden, nutzen wir die neuesten Entwicklungen der künstlichen Intelligenz, um den Kern jedes Dokuments freizulegen. Unsere Technologie analysiert, interpretiert und präsentiert die wichtigsten Vertragselemente in einer intuitiven, zugänglichen Form.
              </p>
              <blockquote className={styles.satz}>
                Einfachheit ist nicht nur ein ästhetisches Ideal – sie ist eine funktionale Notwendigkeit.
              </blockquote>
              <p>
                Mit Contract AI transformieren wir die Art und Weise, wie Unternehmen ihre vertraglichen Verpflichtungen verstehen und verwalten – mit Präzision, Eleganz und unübertroffener Klarheit.
              </p>
            </div>
          </div>
        </section>

        {/* Werte */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>WERTE</span>
          <h2 className={styles.titel}>
            Was uns <span className={styles.titelAkzent}>antreibt</span>
          </h2>
          <p className={styles.unterzeile}>Die Prinzipien, nach denen wir Contract AI bauen.</p>
          <div className={styles.prinzipien}>
            {values.map((value) => (
              <div key={value.title} className={styles.prinzip}>
                <div className={styles.prinzipKopf}>
                  <span className={styles.prinzipIcon}>{value.icon}</span>
                  <h3 className={styles.prinzipTitel}>{value.title}</h3>
                </div>
                <p className={styles.prinzipText}>{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Geschichte */}
        <section id="weg" className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>GESCHICHTE</span>
          <h2 className={styles.titel}>
            Unser <span className={styles.titelAkzent}>Weg</span>
          </h2>
          <p className={styles.unterzeile}>Wie aus einer Idee Contract AI wurde.</p>

          {jahresgruppen.map((gruppe) => (
            <div key={gruppe.jahr} className={styles.jahr}>
              <div className={styles.jahrMarke}>{gruppe.jahr}</div>
              <div className={styles.schritte}>
                {gruppe.eintraege.map((e, i) => (
                  <div key={`${gruppe.jahr}-${i}`} className={styles.schritt}>
                    <div className={styles.schrittZeit}>{e.quartal}</div>
                    <div>
                      <h3 className={styles.schrittTitel}>{e.title}</h3>
                      <p className={styles.schrittText}>{e.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Kundenstimme */}
        <section className={`${styles.abschnitt} ${styles.stimmeBand}`}>
          <div className={`${styles.band} ${styles.stimme}`}>
            <p className={styles.stimmeVorspann}>„{testimonial.lead}</p>
            <blockquote className={styles.stimmeZitat}>{testimonial.quote}“</blockquote>
            <p className={styles.stimmeWer}>
              <span className={styles.werName}>{testimonial.author}</span>
              {testimonial.role}, {testimonial.company}
            </p>
          </div>
        </section>

        {/* Team */}
        <section className={`${styles.abschnitt} ${styles.band}`}>
          <span className={styles.augenbraue}>TEAM</span>
          <h2 className={styles.titel}>
            Die Menschen <span className={styles.titelAkzent}>dahinter</span>
          </h2>
          <p className={styles.unterzeile}>Lerne uns kennen.</p>
          <div className={styles.koepfe}>
            {team.map((m) => (
              <div key={m.name} className={styles.kopf}>
                <div className={styles.kopfBild}>
                  <img src={m.img} alt={`${m.name} - ${m.role}`} />
                </div>
                <h3 className={styles.kopfName}>{m.name}</h3>
                <p className={styles.kopfRolle}>{m.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Abschluss */}
        <section className={styles.schluss}>
          <div className={styles.band}>
            <h2 className={styles.titel}>
              Bereit, deine Verträge zu <span className={styles.titelAkzent}>verstehen</span>?
            </h2>
            <p className={styles.schlussText}>
              Starte jetzt kostenlos und erlebe, wie einfach Vertragsanalyse sein kann.
            </p>
            <Link to="/register" className={styles.knopfVoll}>
              Jetzt kostenlos starten
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <LandingFooter />
    </>
  );
};

export default About;

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../hooks/useAuth";
import Footer from "../components/Footer";
import {
  Search,
  Zap,
  Calendar,
  GitCompare,
  FileText,
  Shield,
  Activity,
  LayoutGrid,
  Eye,
  FolderOpen,
  Mail,
  ArrowRight,
  Sparkles,
  Play,
  ChevronRight,
  PenTool
} from "lucide-react";
import "../styles/Features.css";

const Features: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  // Intersection Observer for scroll animations
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-section-id');
        if (id) {
          setVisibleSections(prev => new Set([...prev, id]));
        }
      }
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Mouse move handler for hero glow
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100
        });
      }
    };

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Observe all animatable sections
    document.querySelectorAll('[data-section-id]').forEach(el => {
      observer.observe(el);
    });

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, [observerCallback]);

  const heroFeatures = [
    { icon: <Search size={20} />, text: 'KI-Analyse in 60 Sekunden' },
    { icon: <Shield size={20} />, text: 'DSGVO-konform' },
    { icon: <Zap size={20} />, text: 'GPT-4 Powered' },
  ];

  const mainFeatures = [
    {
      id: 'analyze',
      label: 'Analysieren',
      title: 'Verstehen Sie jeden Vertrag in Sekunden',
      description: 'Unsere KI liest, analysiert und bewertet Ihre Verträge. Erkennen Sie Risiken, bevor Sie unterschreiben.',
      features: [
        {
          icon: <Search size={22} />,
          name: 'KI-Vertragsanalyse',
          desc: 'Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen',
          link: '/features/vertragsanalyse',
          badge: 'Beliebt'
        },
        {
          icon: <Zap size={22} />,
          name: 'Vertragsoptimierung',
          desc: 'Konkrete Verbesserungsvorschläge für jeden Paragraphen',
          link: '/features/optimierung'
        },
        {
          icon: <GitCompare size={22} />,
          name: 'Vertragsvergleich',
          desc: 'Zwei Versionen Zeile für Zeile vergleichen',
          link: '/features/vergleich'
        },
        {
          icon: <Eye size={22} />,
          name: 'Legal Lens',
          desc: 'Interaktive Klausel-Erklärungen in Alltagssprache',
          link: '/features/legal-lens',
          badge: 'Neu'
        },
      ],
      gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent'
    },
    {
      id: 'create',
      label: 'Erstellen',
      title: 'Professionelle Verträge in Minuten',
      description: 'Erstellen Sie rechtssichere Verträge mit intelligenten Vorlagen oder bauen Sie sie visuell zusammen.',
      features: [
        {
          icon: <FileText size={22} />,
          name: 'Vertragsgenerator',
          desc: '50+ Vorlagen für jeden Anwendungsfall',
          link: '/features/generator'
        },
        {
          icon: <LayoutGrid size={22} />,
          name: 'Contract Builder',
          desc: 'Drag & Drop Editor für individuelle Verträge',
          link: '/features/contract-builder',
          badge: 'Neu'
        },
        {
          icon: <PenTool size={22} />,
          name: 'Digitale Signatur',
          desc: 'eIDAS-konform, revisionssicher, weltweit gültig',
          link: '/features/digitalesignatur'
        },
      ],
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent'
    },
    {
      id: 'manage',
      label: 'Verwalten',
      title: 'Behalten Sie den Überblick',
      description: 'Zentrale Verwaltung, automatische Fristen-Erinnerungen und Echtzeit-Updates bei Gesetzesänderungen.',
      features: [
        {
          icon: <Calendar size={22} />,
          name: 'Fristenverwaltung',
          desc: 'Nie wieder Kündigungsfristen verpassen',
          link: '/features/fristen'
        },
        {
          icon: <Activity size={22} />,
          name: 'Legal Pulse',
          desc: 'Frühwarnsystem für rechtliche Änderungen',
          link: '/features/legalpulse',
          badge: 'Premium'
        },
        {
          icon: <FolderOpen size={22} />,
          name: 'Vertragsverwaltung',
          desc: 'Intelligente Suche und automatische Tags',
          link: '/features/vertragsverwaltung'
        },
        {
          icon: <Mail size={22} />,
          name: 'E-Mail Upload',
          desc: 'Verträge per E-Mail automatisch erfassen',
          link: '/features/email-upload'
        },
      ],
      gradient: 'from-violet-500/20 via-purple-500/10 to-transparent'
    }
  ];

  const stats = [
    { value: '30', unit: 'Sek', label: 'Durchschnittliche Analysezeit' },
    { value: '94', unit: '%', label: 'Erkennungsrate bei Risiken' },
    { value: '500', unit: '+', label: 'Unternehmen vertrauen uns' },
    { value: '50k', unit: '+', label: 'Analysierte Verträge' },
  ];

  return (
    <>
      <Helmet>
        <title>Funktionen - KI-Vertragsmanagement der nächsten Generation | Contract AI</title>
        <meta name="description" content="Entdecken Sie 11 KI-gestützte Funktionen für Ihr Vertragsmanagement. Von der Analyse bis zur Unterschrift - alles in einer Plattform." />
        <link rel="canonical" href="https://www.contract-ai.de/features" />
      </Helmet>

      <div className="features-page-v2">

        {/* Hero Section */}
        <section
          className="fp-hero"
          ref={heroRef}
          style={{
            '--mouse-x': `${mousePosition.x}%`,
            '--mouse-y': `${mousePosition.y}%`
          } as React.CSSProperties}
        >
          <div className="fp-hero-glow" />
          <div className="fp-hero-grid" />

          <div className="fp-hero-content">
            <div className="fp-hero-badge">
              <Sparkles size={14} />
              <span>Neu: Contract Builder & Legal Lens</span>
              <ChevronRight size={14} />
            </div>

            <h1 className="fp-hero-title">
              Alle <span className="fp-gradient-text">Funktionen</span><br />
              im Überblick
            </h1>

            <p className="fp-hero-subtitle">
              11 KI-gestützte Tools für Analyse, Erstellung und Verwaltung Ihrer Verträge.
            </p>

            <div className="fp-hero-features">
              {heroFeatures.map((f, i) => (
                <div key={i} className="fp-hero-feature">
                  {f.icon}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            <div className="fp-hero-cta">
              <Link to={isAuthenticated ? "/contracts" : "/register"} className="fp-btn-primary">
                <span>Kostenlos starten</span>
                <ArrowRight size={16} />
              </Link>
              <button className="fp-btn-secondary">
                <Play size={14} />
                <span>Demo ansehen</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="fp-stats" data-section-id="stats">
            {stats.map((stat, i) => (
              <div key={i} className="fp-stat" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="fp-stat-value">
                  {stat.value}<span className="fp-stat-unit">{stat.unit}</span>
                </div>
                <div className="fp-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Decorative floating elements */}
          <div className="fp-hero-decorations">
            <div className="fp-decoration fp-decoration-1" />
            <div className="fp-decoration fp-decoration-2" />
            <div className="fp-decoration fp-decoration-3" />
          </div>
        </section>

        {/* Feature Sections */}
        {mainFeatures.map((section, sectionIndex) => (
          <section
            key={section.id}
            className={`fp-section ${sectionIndex % 2 === 1 ? 'fp-section-alt' : ''}`}
            data-section-id={section.id}
          >
            {/* Subtle background gradient orb */}
            <div className={`fp-section-orb fp-section-orb-${sectionIndex + 1}`} />

            <div className="fp-section-container">

              <div className={`fp-section-header ${visibleSections.has(section.id) ? 'fp-visible' : ''}`}>
                <span className="fp-section-label">{section.label}</span>
                <h2 className="fp-section-title">{section.title}</h2>
                <p className="fp-section-desc">{section.description}</p>
              </div>

              <div className={`fp-features-grid ${visibleSections.has(section.id) ? 'fp-visible' : ''}`}>
                {section.features.map((feature, i) => (
                  <Link
                    key={i}
                    to={feature.link}
                    className="fp-feature-card"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="fp-feature-card-inner">
                      {feature.badge && (
                        <span className="fp-feature-badge">{feature.badge}</span>
                      )}
                      <div className="fp-feature-icon">
                        {feature.icon}
                      </div>
                      <h3 className="fp-feature-name">{feature.name}</h3>
                      <p className="fp-feature-desc">{feature.desc}</p>
                      <div className="fp-feature-link">
                        <span>Mehr erfahren</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                    <div className={`fp-feature-gradient bg-gradient-to-br ${section.gradient}`} />
                  </Link>
                ))}
              </div>

            </div>
          </section>
        ))}

        {/* Bottom CTA - Feature Page Style */}
        <section className="fp-cta" data-section-id="cta">
          <div className={`fp-cta-container ${visibleSections.has('cta') ? 'fp-visible' : ''}`}>
            <div className="fp-cta-card">
              <h2 className="fp-cta-title">Bereit, Ihre Verträge smarter zu verwalten?</h2>
              <p className="fp-cta-subtitle">
                Starten Sie kostenlos mit 3 Analysen pro Monat – keine Kreditkarte erforderlich.
              </p>
              <div className="fp-cta-buttons">
                <Link to="/pricing" className="fp-cta-secondary-btn">
                  Preise ansehen
                </Link>
                <Link to={isAuthenticated ? "/contracts" : "/register"} className="fp-cta-primary-btn">
                  🚀 Jetzt kostenlos starten
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Features;

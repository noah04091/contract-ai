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
  ChevronRight,
  PenTool,
  CheckCircle,
  FileCheck,
  Clock,
  TrendingUp
} from "lucide-react";
import "../styles/Features.css";

const Features: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

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

    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100
        });
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('[data-section-id]').forEach(el => {
      observer.observe(el);
    });

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, [observerCallback]);

  const workflowSteps = [
    {
      number: '01',
      icon: <Search size={24} />,
      title: 'Analysieren',
      description: 'KI erkennt Risiken & Chancen in Sekunden',
      color: '#3b82f6'
    },
    {
      number: '02',
      icon: <FileText size={24} />,
      title: 'Erstellen',
      description: 'Professionelle Verträge per Drag & Drop',
      color: '#10b981'
    },
    {
      number: '03',
      icon: <FolderOpen size={24} />,
      title: 'Verwalten',
      description: 'Fristen, Updates & Signaturen zentral',
      color: '#8b5cf6'
    }
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
      gradient: 'blue'
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
      gradient: 'green'
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
          badge: 'Enterprise'
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
      gradient: 'purple'
    }
  ];

  const stats = [
    { value: '30', unit: 'Sek', label: 'Analysezeit' },
    { value: '94', unit: '%', label: 'Erkennungsrate' },
    { value: '500', unit: '+', label: 'Unternehmen' },
    { value: '50k', unit: '+', label: 'Verträge' },
  ];

  const companyLogos = [
    { name: 'nexora', icon: '●' },
    { name: 'FINBRIDGE', icon: '■' },
    { name: 'industrion', icon: '▲' },
    { name: 'MOVENTO', icon: '◆' },
    { name: 'quantis', icon: '○' },
    { name: 'HELIX Group', icon: '◇' },
    { name: 'vantage', icon: '□' },
    { name: 'PRIMECORE', icon: '●' },
    { name: 'elevate', icon: '▲' },
    { name: 'STRATOS', icon: '■' },
  ];

  return (
    <>
      <Helmet>
        <title>Funktionen - KI-Vertragsmanagement der nächsten Generation | Contract AI</title>
        <meta name="description" content="Entdecken Sie 11 KI-gestützte Funktionen für Ihr Vertragsmanagement. Von der Analyse bis zur Unterschrift - alles in einer Plattform." />
        <link rel="canonical" href="https://www.contract-ai.de/features" />
      </Helmet>

      <div className="features-page-v3">

        {/* Hero Section - Stripe Style */}
        <section
          className="fp3-hero"
          ref={heroRef}
          style={{
            '--mouse-x': `${mousePosition.x}%`,
            '--mouse-y': `${mousePosition.y}%`
          } as React.CSSProperties}
        >
          <div className="fp3-hero-glow" />

          <div className="fp3-hero-content">
            <div className="fp3-hero-left">
              <div className="fp3-hero-badge">
                <Sparkles size={14} />
                <span>Neu: Contract Builder & Legal Lens</span>
                <ChevronRight size={14} />
              </div>

              <h1 className="fp3-hero-title">
                Alle <span className="fp3-gradient-text">Funktionen</span><br />
                im Überblick
              </h1>

              <p className="fp3-hero-subtitle">
                11 KI-gestützte Tools für die komplette Vertragsverwaltung.
                Analysieren, erstellen und verwalten Sie Verträge in einer Plattform.
              </p>

              <div className="fp3-hero-cta">
                <Link to={isAuthenticated ? "/contracts" : "/register"} className="fp3-btn-primary">
                  <span>Kostenlos starten</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/pricing" className="fp3-btn-secondary">
                  <span>Preise ansehen</span>
                </Link>
              </div>

              <div className="fp3-hero-trust">
                <div className="fp3-trust-avatars">
                  {[
                    'https://randomuser.me/api/portraits/men/32.jpg',
                    'https://randomuser.me/api/portraits/women/44.jpg',
                    'https://randomuser.me/api/portraits/men/67.jpg',
                    'https://randomuser.me/api/portraits/women/17.jpg',
                    'https://randomuser.me/api/portraits/men/52.jpg'
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="fp3-trust-avatar" />
                  ))}
                </div>
                <div className="fp3-trust-text">
                  <span className="fp3-trust-rating">
                    {[1,2,3,4,5].map(i => <span key={i}>★</span>)}
                  </span>
                  <span>500+ Unternehmen vertrauen uns</span>
                </div>
              </div>
            </div>

            <div className="fp3-hero-right">
              <div className="fp3-hero-visual">
                {/* Dashboard Preview */}
                <div className="fp3-dashboard-preview">
                  <div className="fp3-dashboard-header">
                    <div className="fp3-dashboard-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="fp3-dashboard-title">Contract AI Dashboard</span>
                  </div>
                  <div className="fp3-dashboard-content">
                    <div className="fp3-dashboard-sidebar">
                      <div className="fp3-sidebar-item active"><Search size={14} /> Analyse</div>
                      <div className="fp3-sidebar-item"><FileText size={14} /> Generator</div>
                      <div className="fp3-sidebar-item"><Calendar size={14} /> Fristen</div>
                      <div className="fp3-sidebar-item"><FolderOpen size={14} /> Verträge</div>
                    </div>
                    <div className="fp3-dashboard-main">
                      <div className="fp3-stat-card">
                        <div className="fp3-stat-icon blue"><FileCheck size={16} /></div>
                        <div className="fp3-stat-info">
                          <span className="fp3-stat-number">24</span>
                          <span className="fp3-stat-label">Analysiert</span>
                        </div>
                      </div>
                      <div className="fp3-stat-card">
                        <div className="fp3-stat-icon green"><CheckCircle size={16} /></div>
                        <div className="fp3-stat-info">
                          <span className="fp3-stat-number">18</span>
                          <span className="fp3-stat-label">Optimiert</span>
                        </div>
                      </div>
                      <div className="fp3-stat-card">
                        <div className="fp3-stat-icon orange"><Clock size={16} /></div>
                        <div className="fp3-stat-info">
                          <span className="fp3-stat-number">3</span>
                          <span className="fp3-stat-label">Fristen</span>
                        </div>
                      </div>
                      <div className="fp3-chart-placeholder">
                        <TrendingUp size={20} />
                        <span>Vertragsaktivität</span>
                        <div className="fp3-chart-bars">
                          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                            <div key={i} className="fp3-chart-bar" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="fp3-float-element fp3-float-1">
                  <CheckCircle size={16} />
                  <span>Risiko erkannt</span>
                </div>
                <div className="fp3-float-element fp3-float-2">
                  <Shield size={16} />
                  <span>DSGVO-konform</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="fp3-stats-bar" data-section-id="stats">
          <div className="fp3-stats-container">
            {stats.map((stat, i) => (
              <div key={i} className="fp3-stat">
                <span className="fp3-stat-value">{stat.value}<span className="fp3-stat-unit">{stat.unit}</span></span>
                <span className="fp3-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="fp3-workflow" data-section-id="workflow">
          <div className="fp3-workflow-container">
            <div className={`fp3-section-header ${visibleSections.has('workflow') ? 'fp3-visible' : ''}`}>
              <span className="fp3-section-label">So funktioniert's</span>
              <h2 className="fp3-section-title">Drei Schritte zu besseren Verträgen</h2>
              <p className="fp3-section-desc">
                Von der Analyse bis zur Verwaltung – alles in einem nahtlosen Workflow.
              </p>
            </div>

            <div className={`fp3-workflow-steps ${visibleSections.has('workflow') ? 'fp3-visible' : ''}`}>
              {workflowSteps.map((step, i) => (
                <div key={i} className="fp3-workflow-step" style={{ '--step-color': step.color } as React.CSSProperties}>
                  <div className="fp3-step-number">{step.number}</div>
                  <div className="fp3-step-icon">{step.icon}</div>
                  <h3 className="fp3-step-title">{step.title}</h3>
                  <p className="fp3-step-desc">{step.description}</p>
                </div>
              ))}
              <div className="fp3-workflow-line" />
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        {mainFeatures.map((section) => (
          <section
            key={section.id}
            className={`fp3-section fp3-section-${section.gradient}`}
            data-section-id={section.id}
          >
            <div className="fp3-section-container">
              <div className={`fp3-section-header ${visibleSections.has(section.id) ? 'fp3-visible' : ''}`}>
                <span className="fp3-section-label">{section.label}</span>
                <h2 className="fp3-section-title">{section.title}</h2>
                <p className="fp3-section-desc">{section.description}</p>
              </div>

              <div className={`fp3-features-grid ${visibleSections.has(section.id) ? 'fp3-visible' : ''}`}>
                {section.features.map((feature, i) => (
                  <Link
                    key={i}
                    to={feature.link}
                    className="fp3-feature-card"
                    style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}
                  >
                    {feature.badge && (
                      <span className="fp3-feature-badge">{feature.badge}</span>
                    )}
                    <div className="fp3-feature-icon">{feature.icon}</div>
                    <h3 className="fp3-feature-name">{feature.name}</h3>
                    <p className="fp3-feature-desc">{feature.desc}</p>
                    <div className="fp3-feature-link">
                      <span>Mehr erfahren</span>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Social Proof - Scrolling Marquee */}
        <section className="fp3-social-proof" data-section-id="social">
          <div className={`fp3-social-container ${visibleSections.has('social') ? 'fp3-visible' : ''}`}>
            <p className="fp3-social-label">Vertraut von über 500 Unternehmen</p>
            <div className="fp3-marquee-wrapper">
              <div className="fp3-marquee">
                <div className="fp3-marquee-content">
                  {[...companyLogos, ...companyLogos].map((logo, i) => (
                    <div key={i} className="fp3-company-logo">
                      <span className="fp3-logo-wordmark">
                        <span className="fp3-logo-symbol">{logo.icon}</span>
                        {logo.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="fp3-cta" data-section-id="cta">
          <div className={`fp3-cta-container ${visibleSections.has('cta') ? 'fp3-visible' : ''}`}>
            <div className="fp3-cta-content">
              <h2 className="fp3-cta-title">
                Bereit, Ihre Verträge<br />smarter zu verwalten?
              </h2>
              <p className="fp3-cta-subtitle">
                Starten Sie kostenlos mit 3 Analysen pro Monat.<br />
                Keine Kreditkarte erforderlich.
              </p>
              <div className="fp3-cta-buttons">
                <Link to={isAuthenticated ? "/contracts" : "/register"} className="fp3-cta-primary">
                  Jetzt kostenlos starten
                  <ArrowRight size={18} />
                </Link>
                <Link to="/pricing" className="fp3-cta-secondary">
                  Alle Preise ansehen
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

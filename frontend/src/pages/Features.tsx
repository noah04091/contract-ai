import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from "../hooks/useAuth";
import LandingFooter from "../components/LandingFooter";
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
  TrendingUp,
  Briefcase,
  Home,
  Lock,
  ShoppingCart
} from "lucide-react";
import "../styles/Features.css";

const Features: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = user && user.subscriptionActive;
  const heroRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [activeSec, setActiveSec] = useState<string>('');

  // Dezente Scroll-Reveals (Stripe/DocuSign-Stil) + Scroll-Spy für die Sticky-Nav.
  // Bulletproof: [data-reveal] wird NUR versteckt, wenn JS die Klasse .fp-reveal-on
  // setzt → läuft JS nicht, bleibt alles sichtbar. Respektiert reduced-motion.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !('IntersectionObserver' in window)) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let revealObs: IntersectionObserver | undefined;
    if (!reduce) {
      page.classList.add('fp-reveal-on');
      revealObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const d = el.getAttribute('data-reveal-delay');
            if (d) el.style.transitionDelay = `${d}ms`;
            el.classList.add('is-revealed');
            revealObs?.unobserve(el);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
      page.querySelectorAll('[data-reveal]').forEach((el) => revealObs!.observe(el));
    }

    // Scroll-Spy: aktive Sektion in der Sticky-Nav markieren
    const spyObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).getAttribute('data-sec');
          if (id) setActiveSec(id);
        }
      });
    }, { rootMargin: '-24% 0px -68% 0px', threshold: 0 });
    page.querySelectorAll('[data-sec]').forEach((el) => spyObs.observe(el));

    return () => { revealObs?.disconnect(); spyObs.disconnect(); };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Dezenter, Maus-folgender Glow im Hero (rein kosmetisch, kann nichts verstecken)
    const hero = heroRef.current;
    const glow = glowRef.current;
    if (!hero || !glow) return;
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      glow.style.background = `radial-gradient(600px circle at ${x}% ${y}%, rgba(37,99,235,0.14), transparent 60%)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const workflowSteps = [
    { number: '01', icon: <Search size={24} />, title: 'Analysieren', description: 'KI erkennt Risiken & Chancen in Sekunden' },
    { number: '02', icon: <FileText size={24} />, title: 'Erstellen', description: 'Professionelle Verträge per Drag & Drop' },
    { number: '03', icon: <FolderOpen size={24} />, title: 'Verwalten', description: 'Fristen, Updates & Signaturen zentral' }
  ];

  const mainFeatures = [
    {
      id: 'analyze',
      accent: 'analyze',
      marker: '01 · Analysieren',
      label: 'Analysieren',
      title: 'Verstehen Sie jeden Vertrag in Sekunden',
      description: 'Unsere KI liest, analysiert und bewertet Ihre Verträge. Erkennen Sie Risiken, bevor Sie unterschreiben.',
      features: [
        { icon: <Search size={22} />, name: 'KI-Vertragsanalyse', desc: 'Chancen-Risiken-Score, kritische Klauseln, Handlungsempfehlungen', link: '/features/vertragsanalyse', badge: 'Beliebt' },
        { icon: <Zap size={22} />, name: 'Vertragsoptimierung', desc: 'Konkrete Verbesserungsvorschläge für jeden Paragraphen', link: '/features/optimierung' },
        { icon: <GitCompare size={22} />, name: 'Vertragsvergleich', desc: 'Zwei Versionen Zeile für Zeile vergleichen', link: '/features/vergleich' },
        { icon: <Eye size={22} />, name: 'Legal Lens', desc: 'Interaktive Klausel-Erklärungen in Alltagssprache', link: '/features/legal-lens', badge: 'Neu' },
      ]
    },
    {
      id: 'create',
      accent: 'create',
      marker: '02 · Erstellen',
      label: 'Erstellen',
      title: 'Professionelle Verträge in Minuten',
      description: 'Erstellen Sie rechtssichere Verträge – einfach im Chat beschreiben, aus intelligenten Vorlagen oder visuell zusammengebaut.',
      features: [
        { icon: <FileText size={22} />, name: 'Vertragsgenerator', desc: 'Im Chat beschreiben oder aus 50+ Vorlagen – KI schreibt & prüft', link: '/features/generator' },
        { icon: <LayoutGrid size={22} />, name: 'Contract Builder', desc: 'Drag & Drop Editor für individuelle Verträge', link: '/features/contract-builder', badge: 'Neu' },
        { icon: <PenTool size={22} />, name: 'Digitale Signatur', desc: 'eIDAS-konform, revisionssicher, weltweit gültig', link: '/features/digitalesignatur' },
      ]
    },
    {
      id: 'manage',
      accent: 'manage',
      marker: '03 · Verwalten',
      label: 'Verwalten',
      title: 'Behalten Sie den Überblick',
      description: 'Zentrale Verwaltung, automatische Fristen-Erinnerungen und Echtzeit-Updates bei Gesetzesänderungen.',
      features: [
        { icon: <Calendar size={22} />, name: 'Fristenverwaltung', desc: 'Nie wieder Kündigungsfristen verpassen', link: '/features/fristen' },
        { icon: <Activity size={22} />, name: 'Legal Pulse', desc: 'Frühwarnsystem für rechtliche Änderungen', link: '/features/legalpulse', badge: 'Enterprise' },
        { icon: <FolderOpen size={22} />, name: 'Vertragsverwaltung', desc: 'Intelligente Suche und automatische Tags', link: '/features/vertragsverwaltung' },
        { icon: <Mail size={22} />, name: 'E-Mail Upload', desc: 'Verträge per E-Mail automatisch erfassen', link: '/features/email-upload' },
      ]
    }
  ];

  const stats = [
    { value: '30', unit: 'Sek', label: 'Analysezeit' },
    { value: '94', unit: '%', label: 'Erkennungsrate' },
    { value: '500', unit: '+', label: 'Unternehmen' },
    { value: '50k', unit: '+', label: 'Verträge' },
  ];

  const quickLinks = [
    { icon: <Briefcase size={20} />, name: 'Arbeitsvertrag prüfen', desc: 'BAG-Rechtsprechung, Wettbewerbsverbot, Probezeit', link: '/arbeitsvertrag-pruefen' },
    { icon: <Home size={20} />, name: 'Mietvertrag prüfen', desc: 'Schönheitsreparaturen, Kaution, Indexmiete', link: '/mietvertrag-pruefen' },
    { icon: <Lock size={20} />, name: 'NDA prüfen', desc: 'Vertragsstrafe, Carve-Outs, GeschGehG', link: '/nda-pruefen' },
    { icon: <ShoppingCart size={20} />, name: 'Kaufvertrag prüfen', desc: 'Gewährleistung, Beschaffenheit, BGB', link: '/kaufvertrag-pruefen' },
  ];

  const faqs = [
    { q: 'Welche Vertragstypen kann Contract AI analysieren?', a: 'Contract AI analysiert alle gängigen deutschen Vertragstypen: Arbeitsverträge, Mietverträge, NDAs, Kaufverträge, Freelancer-Verträge, SaaS-Verträge, Werkverträge, Kooperationsverträge, Gesellschaftsverträge und mehr. Die KI erkennt den Vertragstyp automatisch und passt die Analyse entsprechend an.' },
    { q: 'Wie funktioniert die KI-Vertragsanalyse?', a: 'Sie laden Ihren Vertrag als PDF oder DOCX hoch. Die KI extrahiert den Text, erkennt den Vertragstyp, prüft jede Klausel gegen geltendes Recht und aktuelle BGH/BAG-Rechtsprechung und liefert in unter 60 Sekunden einen detaillierten Report mit Risiko-Score, markierten Problemstellen und Handlungsempfehlungen.' },
    { q: 'Ist Contract AI DSGVO-konform?', a: 'Ja. Alle Daten werden ausschließlich auf Servern in Deutschland verarbeitet, mit 256-bit-Verschlüsselung übertragen und nicht für KI-Training verwendet. Sie können Ihre Daten jederzeit löschen lassen.' },
    { q: 'Was kostet Contract AI?', a: 'Im Free-Tier sind 3 Vertragsanalysen kostenlos. Im Business-Tarif (19 €/Monat) erhalten Sie 25 Analysen monatlich, im Enterprise-Tarif (29 €/Monat) sind die Analysen unbegrenzt. Eine vergleichbare Erstprüfung beim Anwalt kostet typischerweise 100-400 € pro Vertrag.' },
    { q: 'Brauche ich technische Vorkenntnisse?', a: 'Nein. Contract AI ist für Nicht-Juristen und Nicht-Techniker entwickelt. Sie laden den Vertrag hoch, die KI macht den Rest. Die Ergebnisse werden in Klartext erklärt, mit konkreten Handlungsempfehlungen — kein Juristendeutsch.' },
  ];

  return (
    <>
      <Helmet>
        <title>Alle Funktionen | Contract AI — KI-Vertragsmanagement</title>
        <meta name="description" content="Entdecken Sie 11 KI-gestützte Funktionen für Ihr Vertragsmanagement. Von der Analyse über Optimierung und Vergleich bis zur digitalen Signatur — alles in einer Plattform." />
        <link rel="canonical" href="https://www.contract-ai.de/features" />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Alle Funktionen | Contract AI — KI-Vertragsmanagement" />
        <meta property="og:description" content="Entdecken Sie 11 KI-gestützte Funktionen für Ihr Vertragsmanagement. Von der Analyse über Optimierung und Vergleich bis zur digitalen Signatur — alles in einer Plattform." />
        <meta property="og:url" content="https://www.contract-ai.de/features" />
        <meta property="og:site_name" content="Contract AI" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Alle Funktionen | Contract AI — KI-Vertragsmanagement" />
        <meta name="twitter:description" content="Entdecken Sie 11 KI-gestützte Funktionen für Ihr Vertragsmanagement. Von der Analyse über Optimierung und Vergleich bis zur digitalen Signatur — alles in einer Plattform." />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
              { "@type": "ListItem", "position": 2, "name": "Funktionen", "item": "https://www.contract-ai.de/features" }
            ]
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(f => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": { "@type": "Answer", "text": f.a }
            }))
          })}
        </script>
      </Helmet>

      <div className="fp-page" ref={pageRef}>

        {/* ===================== HERO ===================== */}
        <section className="fp-hero" ref={heroRef}>
          <div className="fp-hero-glow" ref={glowRef} />
          <div className="fp-hero-grid-bg" />

          <div className="fp-hero-inner">
            <div className="fp-hero-left" data-reveal>
              <div className="fp-hero-badge">
                <Sparkles size={14} />
                <span>Neu: Contract Builder &amp; Legal Lens</span>
                <span className="fp-hero-badge-arrow"><ChevronRight size={13} /></span>
              </div>

              <h1 className="fp-hero-title">
                Alle <span className="fp-grad">Funktionen</span><br />im Überblick
              </h1>

              <p className="fp-hero-sub">
                11 KI-gestützte Tools für die komplette Vertragsverwaltung.
                Analysieren, erstellen und verwalten Sie Verträge in einer Plattform.
              </p>

              <div className="fp-hero-cta">
                <Link to={isAuthenticated ? "/contracts" : "/register"} className="fp-btn-primary">
                  <span>Kostenlos starten</span>
                  <ArrowRight size={17} />
                </Link>
                <Link to="/pricing" className="fp-btn-secondary">Preise ansehen</Link>
              </div>

              <div className="fp-hero-trust">
                <div className="fp-trust-avatars">
                  {[
                    'https://randomuser.me/api/portraits/men/32.jpg',
                    'https://randomuser.me/api/portraits/women/44.jpg',
                    'https://randomuser.me/api/portraits/men/67.jpg',
                    'https://randomuser.me/api/portraits/women/17.jpg',
                    'https://randomuser.me/api/portraits/men/52.jpg'
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="fp-trust-avatar" loading="lazy" />
                  ))}
                </div>
                <div className="fp-trust-text">
                  <span className="fp-trust-stars">★★★★★</span>
                  <span className="fp-trust-label">500+ Unternehmen vertrauen uns</span>
                </div>
              </div>
            </div>

            <div className="fp-hero-right" data-reveal data-reveal-delay="120">
              <div className="fp-dash">
                <div className="fp-dash-head">
                  <div className="fp-dash-dots"><span /><span /><span /></div>
                  <span className="fp-dash-title">Contract AI · Dashboard</span>
                </div>
                <div className="fp-dash-body">
                  <div className="fp-dash-side">
                    <div className="fp-dash-nav active"><Search size={15} />Analyse</div>
                    <div className="fp-dash-nav"><FileText size={15} />Generator</div>
                    <div className="fp-dash-nav"><Calendar size={15} />Fristen</div>
                    <div className="fp-dash-nav"><FolderOpen size={15} />Verträge</div>
                  </div>
                  <div className="fp-dash-main">
                    <div className="fp-dash-cards">
                      <div className="fp-dash-stat">
                        <span className="fp-dash-stat-ico"><FileCheck size={15} /></span>
                        <div><span className="fp-dash-stat-num">24</span><span className="fp-dash-stat-lbl">Analysiert</span></div>
                      </div>
                      <div className="fp-dash-stat">
                        <span className="fp-dash-stat-ico"><CheckCircle size={15} /></span>
                        <div><span className="fp-dash-stat-num">18</span><span className="fp-dash-stat-lbl">Optimiert</span></div>
                      </div>
                    </div>
                    <div className="fp-dash-chart">
                      <div className="fp-dash-chart-head"><TrendingUp size={15} />Vertragsaktivität</div>
                      <div className="fp-dash-bars">
                        {[40, 65, 45, 80, 55, 100, 70].map((h, i) => (
                          <span key={i} className={i === 5 ? 'fp-dash-bar hi' : 'fp-dash-bar'} style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="fp-float fp-float-1"><CheckCircle size={16} />Risiko erkannt</div>
              <div className="fp-float fp-float-2"><Shield size={16} />DSGVO-konform</div>
            </div>
          </div>
        </section>

        {/* ===================== STATS ===================== */}
        <section className="fp-stats">
          <div className="fp-stats-inner">
            {stats.map((s, i) => (
              <div key={i} className="fp-stat">
                <div className="fp-stat-num">{s.value}<span className="fp-stat-unit">{s.unit}</span></div>
                <div className="fp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== STICKY KATEGORIE-NAV ===================== */}
        <div className="fp-catnav">
          <div className="fp-catnav-inner">
            <span className="fp-catnav-label">Alle 11 Funktionen —</span>
            <a href="#sec-analyze" className={`fp-pill fp-pill-analyze${activeSec === 'analyze' ? ' active' : ''}`}><span className="fp-pill-num">01</span>Analysieren</a>
            <a href="#sec-create" className={`fp-pill fp-pill-create${activeSec === 'create' ? ' active' : ''}`}><span className="fp-pill-num">02</span>Erstellen</a>
            <a href="#sec-manage" className={`fp-pill fp-pill-manage${activeSec === 'manage' ? ' active' : ''}`}><span className="fp-pill-num">03</span>Verwalten</a>
          </div>
        </div>

        {/* ===================== TESTIMONIAL ===================== */}
        <section className="fp-testimonial">
          <div className="fp-testimonial-inner" data-reveal>
            <div className="fp-testimonial-stars">★★★★★</div>
            <p className="fp-testimonial-quote">
              „Alles was mit Verträgen zu tun hat, geb ich einfach an Contract AI ab. <span className="fp-grad-solid">Top Preis Leistung!</span>“
            </p>
            <div className="fp-testimonial-author">
              <span className="fp-testimonial-avatar">S</span>
              <div className="fp-testimonial-meta">
                <div className="fp-testimonial-name">Sarah K.</div>
                <div className="fp-testimonial-role">Freelancerin · München</div>
              </div>
            </div>
          </div>
        </section>

        <div className="fp-divider"><span /></div>

        {/* ===================== WORKFLOW ===================== */}
        <section className="fp-workflow">
          <div className="fp-workflow-inner">
            <div className="fp-section-head" data-reveal>
              <span className="fp-eyebrow">So funktioniert's</span>
              <h2 className="fp-h2">Drei Schritte zu besseren Verträgen</h2>
              <p className="fp-lede">Von der Analyse bis zur Verwaltung – alles in einem nahtlosen Workflow.</p>
            </div>
            <div className="fp-workflow-grid">
              {workflowSteps.map((step, i) => (
                <div key={i} className="fp-workflow-card" data-reveal data-reveal-delay={i * 120}>
                  <span className="fp-workflow-num">{step.number}</span>
                  <span className="fp-workflow-ico">{step.icon}</span>
                  <h3 className="fp-workflow-title">{step.title}</h3>
                  <p className="fp-workflow-desc">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== FEATURE-GRUPPEN ===================== */}
        {mainFeatures.map((section) => (
          <section key={section.id} data-sec={section.accent} className={`fp-fsection fp-acc-${section.accent}`}>
            <div className="fp-fsection-inner">
              <div id={`sec-${section.id}`} className="fp-marker">
                <span className="fp-marker-label">{section.marker}</span>
                <span className="fp-marker-chip">{section.features.length} Tools</span>
                <span className="fp-marker-line" />
              </div>
              <div className="fp-section-head fp-section-head-left" data-reveal>
                <h2 className="fp-h2">{section.title}</h2>
                <p className="fp-lede">{section.description}</p>
              </div>
              <div className="fp-cards">
                {section.features.map((feature, i) => (
                  <Link key={i} to={feature.link} className="fp-card" data-reveal data-reveal-delay={i * 80}>
                    {feature.badge && <span className="fp-card-badge">{feature.badge}</span>}
                    <span className="fp-card-ico">{feature.icon}</span>
                    <h3 className="fp-card-title">{feature.name}</h3>
                    <p className="fp-card-desc">{feature.desc}</p>
                    <span className="fp-card-link">Mehr erfahren <ArrowRight size={14} /></span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}

        <div className="fp-divider"><span /></div>

        {/* ===================== SCHNELLZUGANG (SEO Cross-Links) ===================== */}
        <section className="fp-quick">
          <div className="fp-quick-inner">
            <div className="fp-section-head" data-reveal>
              <span className="fp-eyebrow">Schnellzugang</span>
              <h2 className="fp-h3">Sie haben einen bestimmten Vertrag?</h2>
              <p className="fp-lede">Springen Sie direkt zur spezialisierten Prüfung, abgestimmt auf aktuelle BGH- &amp; BAG-Rechtsprechung.</p>
            </div>
            <div className="fp-quick-grid">
              {quickLinks.map((q, i) => (
                <Link key={i} to={q.link} className="fp-quick-tile" data-reveal data-reveal-delay={i * 70}>
                  <span className="fp-quick-ico">{q.icon}</span>
                  <span className="fp-quick-text">
                    <span className="fp-quick-name">{q.name}</span>
                    <span className="fp-quick-kw">{q.desc}</span>
                  </span>
                  <ChevronRight size={16} className="fp-quick-chev" />
                </Link>
              ))}
            </div>
            <div className="fp-quick-more">
              <Link to="/ki-vertragsanalyse" className="fp-quick-more-link">Mehr über KI-Vertragsanalyse erfahren <ArrowRight size={14} /></Link>
            </div>
          </div>
        </section>

        <div className="fp-divider"><span /></div>

        {/* ===================== FAQ ===================== */}
        <section className="fp-faq">
          <div className="fp-faq-inner">
            <div className="fp-section-head" data-reveal>
              <h2 className="fp-h2">Häufige Fragen</h2>
              <p className="fp-lede">Alles, was Sie über Contract AI wissen müssen.</p>
            </div>
            <div className="fp-faq-list" data-reveal>
              {faqs.map((f, i) => (
                <details key={i} className="fp-faq-item">
                  <summary>{f.q}<span className="fp-faq-plus">+</span></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== CTA ===================== */}
        <section className="fp-cta">
          <div className="fp-cta-card" data-reveal>
            <div className="fp-cta-grid-bg" />
            <div className="fp-cta-content">
              <h2 className="fp-cta-title">Bereit, Ihre Verträge<br />smarter zu verwalten?</h2>
              <p className="fp-cta-sub">Starten Sie kostenlos mit 3 Analysen pro Monat.<br />Keine Kreditkarte erforderlich.</p>
              <div className="fp-cta-buttons">
                <Link to={isAuthenticated ? "/contracts" : "/register"} className="fp-btn-primary">
                  Jetzt kostenlos starten <ArrowRight size={18} />
                </Link>
                <Link to="/pricing" className="fp-btn-secondary">Alle Preise ansehen</Link>
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </>
  );
};

export default Features;

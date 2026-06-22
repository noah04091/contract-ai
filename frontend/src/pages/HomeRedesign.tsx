import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import HomePricingCards from "../components/HomePricingCards";
import AutoPlayVideo from "../components/AutoPlayVideo";
import "../styles/landing.css"; // liefert u.a. die hp-* Styles für HomePricingCards
import "../styles/landing-redesign.css";

// Echte Assets
import logo from "../assets/logo-contractai.webp";
import analyseImg from "../assets/Analyse.webp";
import fristenImg from "../assets/Fristen.webp";
import optimierungImg from "../assets/Optimierung.webp";
import vergleichImg from "../assets/Vergleich.webp";
import dsgvoBadge from "../assets/dsgvo-badge.webp";
import trustpilotBadge from "../assets/trustpilot-badge.webp";

// Demo-Videos (public/Videos)
const analyseVideo = "/Videos/analyse.mp4";
const optimierungVideo = "/Videos/optimierung.mp4";
const fristenVideo = "/Videos/fristen.mp4";
const vergleichVideo = "/Videos/vergleich.mp4";

declare global {
  interface Window {
    openCookieSettings?: () => void;
  }
}

/* ---------- kleine Helfer ---------- */
const Arrow = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

const Check = ({ size = 17, color = "#2563eb" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flex: "none" }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const Cross = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

/* ---------- animierter Zähler ---------- */
const AnimatedCounter = ({ end, suffix = '', duration = 2200 }: { end: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) { setCount(end); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !done) {
          setDone(true);
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            setCount(Math.floor(eased * end));
            if (p < 1) requestAnimationFrame(tick); else setCount(end);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [end, duration, done]);

  return <span ref={ref}>{count.toLocaleString('de-DE')}{suffix}</span>;
};

/* ---------- Testimonials ---------- */
const testimonials = [
  { id: 1, name: "Lisa Kramer", location: "Frankfurt", role: "Freelancerin", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", rating: 5, text: "Habe bei meinem Werkvertrag einen Passus übersehen, der mich 280€ extra gekostet hätte. Contract AI hat das sofort erkannt!" },
  { id: 2, name: "Marcus T.", location: "München", role: "IT-Berater", image: null, rating: 5, text: "Endlich verstehe ich meine Mietverträge ohne Anwalt. Die KI erklärt alles verständlich — spart Zeit und Geld." },
  { id: 3, name: "Sarah Müller", location: "Berlin", role: "Projektmanagerin", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face", rating: 5, text: "Dachte, mein Handyvertrag läuft noch 6 Monate. War tatsächlich schon kündbar — 180€ gespart!" },
  { id: 4, name: "Daniel Richter", location: "Hamburg", role: "Startup-Gründer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face", rating: 5, text: "Für NDA-Verträge mit Investoren nutze ich nur noch Contract AI. Kein Rechtsanwalt nötig für Standardverträge." },
  { id: 5, name: "Thomas W.", location: "Würzburg", role: "Handwerksmeister", image: null, rating: 5, text: "Hab meinen Lieferantenvertrag gecheckt und eine versteckte Preisklausel gefunden. Hätte mich 2.400€ mehr pro Jahr gekostet!" },
  { id: 6, name: "Julia Schmidt", location: "Köln", role: "Marketing Managerin", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face", rating: 5, text: "Bei uns im Team nutzen jetzt alle Contract AI für Freelancer-Verträge. Spart uns echt Zeit!" },
  { id: 7, name: "Kevin B.", location: "Stuttgart", role: "BWL-Student", image: null, rating: 4, text: "Mein Fitnessstudio-Abo lief automatisch weiter. Contract AI hat mein Sonderkündigungsrecht erkannt — 360€ zurück!" },
  { id: 8, name: "Dr. Anna Peters", location: "München", role: "Steuerberaterin", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face", rating: 5, text: "Als Steuerberaterin muss ich oft Verträge prüfen. Contract AI ist fester Teil meines Workflows. Die Risiko-Analyse ist top." },
];

const getInitials = (name: string) => {
  const parts = name.replace('Dr. ', '').split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
};

const Stars = ({ rating }: { rating: number }) => (
  <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} width="15" height="15" viewBox="0 0 24 24" fill={s <= rating ? "#fbbf24" : "none"} stroke={s <= rating ? "#fbbf24" : "#d1d5db"} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon>
      </svg>
    ))}
  </div>
);

const TestimonialCard = ({ t }: { t: typeof testimonials[number] }) => (
  <div className="ca-lp-tcard">
    <div className="ca-lp-tcard-head">
      {t.image
        ? <img src={t.image} alt={t.name} className="ca-lp-tcard-avatar" loading="lazy" />
        : <div className="ca-lp-tcard-initials">{getInitials(t.name)}</div>}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#0c0c10' }}>{t.name}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#2563eb"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><circle cx="12" cy="12" r="10" fill="none" /></svg>
        </div>
        <span style={{ fontSize: 12.5, color: '#9a9aa3' }}>{t.location} · {t.role}</span>
      </div>
    </div>
    <Stars rating={t.rating} />
    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#52525b', margin: 0 }}>„{t.text}"</p>
  </div>
);

/* ---------- Feature-Grid-Daten ---------- */
const featureCards = [
  { color: '#2563eb', to: '/features/vertragsanalyse', title: 'Analyse', desc: 'Verträge KI-basiert auswerten, Risiken erkennen & Transparenz gewinnen.', link: 'Vertragsanalyse entdecken',
    icon: <><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></> },
  { color: '#7c3aed', to: '/features/optimierung', title: 'Optimierung', desc: 'Unvorteilhafte Klauseln erkennen und durch bessere Formulierungen ersetzen.', link: 'Optimierung entdecken',
    icon: <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"></path> },
  { color: '#d97706', to: '/features/fristen', title: 'Fristen', desc: 'Kündigungsfristen automatisch erkennen & rechtzeitig per Mail erinnert werden.', link: 'Fristenkalender entdecken',
    icon: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></> },
  { color: '#9333ea', to: '/features/vergleich', title: 'Vergleich', desc: 'Zwei Verträge gegenüberstellen, Unterschiede visuell hervorheben.', link: 'Vertragsvergleich entdecken',
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></> },
  { color: '#0891b2', to: '/features/legal-lens', title: 'Legal Lens', desc: 'Interaktive Vertragsanalyse mit Risiko-Score, Smart Summary & Verhandlungs-Empfehlungen.', link: 'Legal Lens entdecken',
    icon: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></> },
  { color: '#059669', to: '/features/generator', title: 'Generator', desc: 'Vertragsdokumente aus KI-Vorlagen erzeugen – z. B. Freelancer-, NDA- oder Mietverträge.', link: 'Vertragsgenerator entdecken',
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></> },
  { color: '#0d9488', to: '/features/digitalesignatur', title: 'Digitale Signatur', desc: 'Verträge rechtssicher digital signieren – mit Audit Trail, Benachrichtigung & versiegeltem PDF.', link: 'Digitale Signatur entdecken',
    icon: <><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></> },
  { color: '#dc2626', to: '/features/legalpulse', title: 'Legal Pulse', desc: 'Frühwarnsystem für neue Risiken durch Gesetzesänderungen oder unfaire Formulierungen.', link: 'Legal Pulse entdecken',
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path> },
];

/* ---------- Showcase-Reihen (mit Videos) ---------- */
const showcaseRows = [
  { label: 'KI-Powered', to: '/features/vertragsanalyse', title: <>Vertragsanalyse mit <span className="ca-lp-grad">Score</span></>, linkText: 'Zur Vertragsanalyse',
    desc: 'Risiken, Chancen und Verständlichkeit auf einen Blick. Unsere KI bewertet Ihre Verträge und deckt versteckte Fallstricke auf.',
    bullets: ['Automatische Risikoanalyse', 'Verständlichkeitsindex für Laien und Profis', 'Detaillierte Klausel-Insights'],
    video: analyseVideo, poster: analyseImg, alt: 'Vertragsanalyse mit Score', reverse: false },
  { label: 'Intelligent', to: '/features/optimierung', title: <>Verträge optimieren & <span className="ca-lp-grad">verbessern</span></>, linkText: 'Zum Optimierer',
    desc: 'Schwache oder unfaire Klauseln? Unsere KI findet sie und schlägt sofort bessere Formulierungen vor — für fairere, stärkere Verträge.',
    bullets: ['Automatische Klausel-Optimierung', 'Verständlichere Sprache', 'Sofort einsatzbereite Änderungen'],
    video: optimierungVideo, poster: optimierungImg, alt: 'Verträge optimieren', reverse: true },
  { label: 'Automatisch', to: '/features/fristen', title: <>Fristen <span className="ca-lp-grad">automatisch erkennen</span></>, linkText: 'Zum Fristenkalender',
    desc: 'Verpassen Sie nie wieder eine Kündigungsfrist. Contract AI erkennt wichtige Fristen und erinnert Sie rechtzeitig.',
    bullets: ['Automatische Fristenerkennung', 'Erinnerungsfunktion per E-Mail', 'Integration in Ihren Kalender'],
    video: fristenVideo, poster: fristenImg, alt: 'Fristen automatisch erkennen', reverse: false },
  { label: 'Präzise', to: '/features/vergleich', title: <>Verträge intelligent <span className="ca-lp-grad">vergleichen</span></>, linkText: 'Zum Vergleich',
    desc: 'Lassen Sie zwei Verträge gegeneinander antreten. Contract AI zeigt Unterschiede, Fairness und empfiehlt den besseren Weg.',
    bullets: ['Visualisierte Unterschiede', 'Fairness-Score & Verbesserungstipps', 'Entscheidungshilfe in Sekunden'],
    video: vergleichVideo, poster: vergleichImg, alt: 'Verträge vergleichen', reverse: true },
];

/* ---------- weitere Tools ---------- */
const moreTools = [
  { to: '/features/generator', title: 'Vertragsgenerator', desc: 'Rechtssichere Verträge aus Vorlagen erstellen', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></> },
  { to: '/features/digitalesignatur', title: 'Digitale Signatur', desc: 'Verträge rechtssicher unterschreiben lassen', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></> },
  { to: '/features/legalpulse', title: 'Legal Pulse', desc: 'Frühwarnsystem für rechtliche Änderungen', icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path> },
  { to: '/features/contract-builder', title: 'Contract Builder', desc: 'Verträge per Drag & Drop erstellen', icon: <><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></> },
  { to: '/features/legal-lens', title: 'Legal Lens', desc: 'Interaktive Tiefenanalyse jeder Klausel', icon: <><circle cx="11" cy="11" r="8"></circle><circle cx="11" cy="11" r="3"></circle><path d="m21 21-4.35-4.35"></path></> },
  { to: '/features/vertragsverwaltung', title: 'Vertragsverwaltung', desc: 'Alle Verträge zentral organisieren', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></> },
];

/* ---------- Vertragstypen ---------- */
const contractTypes = [
  { to: '/arbeitsvertrag-pruefen', color: '#2563eb', title: 'Arbeitsvertrag prüfen', desc: 'Wettbewerbsverbot, Probezeit, Überstunden und Kündigungsfristen — KI-Check auf Basis aktueller BAG-Rechtsprechung.', icon: <><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></> },
  { to: '/mietvertrag-pruefen', color: '#059669', title: 'Mietvertrag prüfen', desc: 'Schönheitsreparaturen, Kaution, Indexmiete und Kündigungsausschluss — KI-Check auf Basis aktueller BGH-Rechtsprechung.', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></> },
  { to: '/nda-pruefen', color: '#dc2626', title: 'NDA prüfen', desc: 'Vertragsstrafe, Geheimhaltungsdauer, Carve-Outs und verstecktes Wettbewerbsverbot — KI-Check auf Basis GeschGehG.', icon: <><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></> },
  { to: '/kaufvertrag-pruefen', color: '#ea580c', title: 'Kaufvertrag prüfen', desc: 'Gewährleistung, Beschaffenheit, „gekauft wie gesehen" und Stornogebühren — KI-Check auf Basis BGB-Kaufrecht.', icon: <><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></> },
];

const integrations = [
  { src: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png", name: "Google Calendar" },
  { src: "https://img.icons8.com/color/96/microsoft-outlook-2019.png", name: "Microsoft Outlook" },
  { src: "https://img.icons8.com/ios-filled/100/000000/mac-os.png", name: "Apple Calendar" },
  { src: "https://img.icons8.com/color/96/salesforce.png", name: "Salesforce" },
  { src: "https://img.icons8.com/color/96/sap.png", name: "SAP" },
  { src: "https://img.icons8.com/ios-filled/100/000000/chatgpt.png", name: "OpenAI" },
];

const comparisonRows = [
  { f: 'Ergebnis in 60 Sekunden', ai: 'check', anwalt: 'Tage', gpt: 'cross' },
  { f: 'Kosten pro Vertrag', ai: 'ab 0€', anwalt: '150–300€', gpt: 'gratis, riskant' },
  { f: 'Fristen automatisch im Blick', ai: 'check', anwalt: 'cross', gpt: 'cross' },
  { f: 'Warnt bei Gesetzesänderungen', ai: 'check', anwalt: 'cross', gpt: 'cross' },
  { f: 'Verständliche Klartext-Erklärung', ai: 'check', anwalt: 'teils', gpt: 'teils' },
  { f: 'Alle Verträge zentral verwaltet', ai: 'check', anwalt: 'cross', gpt: 'cross' },
];

const faqs = [
  { q: 'Ist Contract AI DSGVO-konform?', a: 'Ja. Alle Daten werden DSGVO-konform auf deutschen Servern in Frankfurt gespeichert und verschlüsselt übertragen. Ihre Verträge bleiben jederzeit Ihr Eigentum.' },
  { q: 'Brauche ich juristische Vorkenntnisse?', a: 'Nein. Contract AI erklärt jede Klausel in verständlicher Sprache – mit Risiko-Score und konkreten Empfehlungen. Sie brauchen weder Jura-Studium noch Anwalt für den ersten Überblick.' },
  { q: 'Wie genau ist die KI-Analyse?', a: 'Die Analyse basiert auf aktueller BGH- und BAG-Rechtsprechung und wird laufend aktualisiert. Sie liefert eine fundierte Einschätzung, ersetzt im Einzelfall aber keine individuelle Rechtsberatung.' },
  { q: 'Kann ich jederzeit kündigen?', a: 'Ja. Alle Pläne sind monatlich kündbar, ohne Mindestlaufzeit. Zusätzlich gilt eine 14-tägige Geld-zurück-Garantie – ohne Wenn und Aber.' },
  { q: 'Welche Verträge & Formate kann ich hochladen?', a: 'Von Miet- über Arbeits- bis zu Kauf- und NDA-Verträgen – als PDF direkt im Dashboard oder bequem per E-Mail-Weiterleitung an Ihre persönliche Upload-Adresse.' },
  { q: 'Ersetzt Contract AI einen Anwalt?', a: 'Für Standardverträge gibt Contract AI Ihnen in Minuten Klarheit und spart oft den ersten Anwaltstermin. Bei komplexen oder strittigen Fällen ist sie die ideale Vorbereitung für das Gespräch mit Ihrem Anwalt.' },
];

const HomeRedesign = () => {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll-Reveal
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.ca-lp-reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('ca-in'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('ca-in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleOpenCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.openCookieSettings) window.openCookieSettings();
  };

  const heroCtaPrimary = !user
    ? { to: '/register', label: 'Jetzt starten' }
    : { to: '/dashboard', label: 'Zum Dashboard' };
  const showSecondary = !user || !user.subscriptionActive;

  return (
    <>
      <Helmet>
        <title>Contract AI – Verträge mit KI analysieren & optimieren | Jetzt kostenlos testen</title>
        <meta
          name="description"
          content="Analysiere, optimiere & vergleiche Verträge in Minuten mit KI. Versteckte Risiken erkennen, Fristen im Blick behalten, Verträge generieren. Jetzt kostenlos starten!"
        />
        <meta
          name="keywords"
          content="Vertragsanalyse KI, Vertragsoptimierung, KI Vertragsmanagement, Verträge analysieren, Vertragsrisiken erkennen, Verträge vergleichen, Contract AI, Legal Tech, Fristenverwaltung, Vertragsgenerator"
        />
        <link rel="canonical" href="https://www.contract-ai.de/" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* Open Graph / Facebook */}
        <meta property="og:locale" content="de_DE" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Contract AI – Verträge mit KI analysieren & optimieren | Jetzt testen" />
        <meta property="og:description" content="Analysiere, optimiere & vergleiche Verträge in Minuten mit KI. Contract AI ist deine smarte Lösung für sichere & effiziente Vertragsverwaltung." />
        <meta property="og:url" content="https://www.contract-ai.de/" />
        <meta property="og:site_name" content="Contract AI" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Contract AI - KI-gestützte Vertragsanalyse" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@contract_ai" />
        <meta name="twitter:creator" content="@contract_ai" />
        <meta name="twitter:title" content="Contract AI – Verträge mit KI analysieren & optimieren" />
        <meta name="twitter:description" content="Sichere dir jetzt volle Kontrolle über deine Verträge. Analysiere & optimiere mit Contract AI – schnell, einfach & effizient." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Schema.org JSON-LD: Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://www.contract-ai.de/#organization",
            "name": "Contract AI",
            "url": "https://www.contract-ai.de",
            "logo": {
              "@type": "ImageObject",
              "url": "https://www.contract-ai.de/logo.png",
              "width": 512,
              "height": 512
            },
            "image": "https://www.contract-ai.de/og-image.jpg",
            "description": "KI-gestützte Vertragsanalyse und -optimierung für Unternehmen und Privatpersonen",
            "email": "support@contract-ai.de",
            "sameAs": [
              "https://www.linkedin.com/company/contract-ai",
              "https://twitter.com/contract_ai"
            ]
          })}
        </script>

        {/* Schema.org JSON-LD: WebSite */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://www.contract-ai.de/#website",
            "url": "https://www.contract-ai.de",
            "name": "Contract AI",
            "description": "Verträge analysieren, optimieren und verwalten mit KI",
            "publisher": {
              "@id": "https://www.contract-ai.de/#organization"
            },
            "inLanguage": "de-DE",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://www.contract-ai.de/blog?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          })}
        </script>

        {/* Schema.org JSON-LD: SoftwareApplication */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": "https://www.contract-ai.de/#software",
            "name": "Contract AI",
            "operatingSystem": "Web",
            "applicationCategory": "BusinessApplication",
            "applicationSubCategory": "Legal Tech Software",
            "url": "https://www.contract-ai.de",
            "screenshot": "https://www.contract-ai.de/og-image.jpg",
            "description": "Contract AI ist eine smarte SaaS-Lösung für KI-gestützte Vertragsanalyse, Optimierung und Vertragsverwaltung. Analysiere Verträge in 60 Sekunden, erkenne versteckte Risiken und spare bis zu 80% Zeit.",
            "featureList": [
              "KI-gestützte Vertragsanalyse in 60 Sekunden",
              "Automatische Risikoerkennung",
              "Vertragsoptimierung mit Verbesserungsvorschlägen",
              "Fristenverwaltung mit Erinnerungen",
              "Vertragsvergleich",
              "Vertragsgenerator",
              "Legal Pulse News",
              "Digitale Signatur"
            ],
            "offers": [
              {
                "@type": "Offer",
                "name": "Starter",
                "description": "3 KI-Vertragsanalysen kostenlos",
                "price": "0",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                "name": "Business",
                "description": "25 KI-Analysen/Monat, Optimierung, Vergleich, KI-Chat, digitale Signaturen",
                "price": "19",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                "name": "Enterprise",
                "description": "Unbegrenzte Analysen, alle Features, Team-Management, API-Zugang",
                "price": "29",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              }
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "bestRating": "5",
              "worstRating": "1",
              "ratingCount": "127",
              "reviewCount": "89"
            },
            "review": [
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Lisa Kramer" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Habe bei meinem Werkvertrag einen Passus übersehen, der mich 280€ extra gekostet hätte. Contract AI hat das sofort erkannt!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Marcus T." },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Endlich verstehe ich meine Mietverträge ohne Anwalt. Die KI erklärt alles verständlich — spart Zeit und Geld."
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Sarah Müller" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Dachte, mein Handyvertrag läuft noch 6 Monate. War tatsächlich schon kündbar — 180€ gespart!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Daniel Richter" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Für NDA-Verträge mit Investoren nutze ich nur noch Contract AI. Kein Rechtsanwalt nötig für Standardverträge."
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Thomas W." },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Hab meinen Lieferantenvertrag gecheckt und eine versteckte Preisklausel gefunden. Hätte mich 2.400€ mehr pro Jahr gekostet!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Julia Schmidt" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Bei uns im Team nutzen jetzt alle Contract AI für Freelancer-Verträge. Spart uns echt Zeit!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Kevin B." },
                "reviewRating": { "@type": "Rating", "ratingValue": "4", "bestRating": "5" },
                "reviewBody": "Mein Fitnessstudio-Abo lief automatisch weiter. Contract AI hat mein Sonderkündigungsrecht erkannt — 360€ zurück!"
              },
              {
                "@type": "Review",
                "author": { "@type": "Person", "name": "Dr. Anna Peters" },
                "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
                "reviewBody": "Als Steuerberaterin muss ich oft Verträge prüfen. Contract AI ist fester Teil meines Workflows. Die Risiko-Analyse ist top."
              }
            ],
            "provider": {
              "@id": "https://www.contract-ai.de/#organization"
            }
          })}
        </script>

        {/* Schema.org JSON-LD: FAQPage (additiv, basiert auf der FAQ-Sektion) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map((f) => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": { "@type": "Answer", "text": f.a }
            }))
          })}
        </script>
      </Helmet>

      <div className="ca-lp">

        {/* ===== HERO ===== */}
        <section className="ca-lp-hero" id="top">
          <div className="ca-lp-hero-glow"></div>
          <div className="ca-lp-hero-grid">
            <div>
              <div className="ca-lp-pill">
                <span className="ca-lp-pill-tag">Neu</span>
                <span style={{ fontSize: 13, color: '#3f3f46', fontWeight: 500 }}>KI-Vertragsanalyse in 60 Sekunden</span>
              </div>
              <h1 className="ca-lp-h1">
                Verträge im Griff.<br />Kosten gespart.<br /><span className="ca-lp-grad">Zeit gewonnen.</span>
              </h1>

              {/* handschriftliche Signatur */}
              <div style={{ margin: '18px 0 0', height: 52 }}>
                <svg className="ca-lp-sig" viewBox="0 0 200 50" width="220" height="55" fill="none" style={{ overflow: 'visible' }} aria-label="Contract AI">
                  <path className="s-path s-c" pathLength={1} d="M18,18 C8,20 4,28 6,36 C8,44 16,48 26,46 C30,45 33,43 35,40" stroke="#2563eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path className="s-path s-ontract" pathLength={1} d="M28,38 C32,36 35,32 38,34 C41,36 40,40 43,38 C46,36 48,32 52,34 C54,35 54,38 56,36 C58,34 60,30 64,32 C66,33 66,38 69,36 C72,34 74,30 78,32 C80,34 80,38 83,35 C86,32 88,28 92,32" stroke="#2563eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path className="s-path s-a" pathLength={1} d="M105,42 L112,22 L119,42 M108,34 L116,34" stroke="#3b82f6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path className="s-path s-i" pathLength={1} d="M128,26 L128,42" stroke="#3b82f6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"></path>
                  <circle className="s-dot" cx="128" cy="20" r="2.2" fill="#3b82f6"></circle>
                  <path className="s-path s-flourish" pathLength={1} d="M6,50 Q60,57 120,48 Q150,44 182,51" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>

              <p className="ca-lp-hero-sub">Contract AI erkennt versteckte Risiken, erinnert an Fristen und behält alle Verträge im Blick – damit Sie es nicht müssen.</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, marginTop: 34 }}>
                <Link to={heroCtaPrimary.to} className="ca-lp-btn-primary">{heroCtaPrimary.label}<Arrow size={17} /></Link>
                {showSecondary && <Link to="/pricing" className="ca-lp-btn-secondary">Kostenlos testen</Link>}
              </div>

              <div className="ca-lp-hero-trust">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style={{ fontSize: 13.5, color: '#3f3f46', fontWeight: 500 }}>Deutsche Server. Maximaler Schutz. Ihre Daten bleiben Ihre Daten.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 26, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex' }}>
                  {[
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
                  ].map((src, i) => (
                    <img key={i} src={src} width={36} height={36} alt="" loading="lazy" style={{ borderRadius: '50%', border: '2.5px solid #fff', objectFit: 'cover', marginLeft: i === 0 ? 0 : -11, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }} />
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon></svg>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: '#52525b' }}><strong style={{ color: '#0c0c10', fontWeight: 600 }}>500+ zufriedene Nutzer</strong> vertrauen Contract AI</span>
                </div>
              </div>
            </div>

            {/* Hero-Mockup: Analyse-Card */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative', background: '#fff', border: '1px solid rgba(17,17,20,0.09)', borderRadius: 18, boxShadow: '0 40px 80px -28px rgba(17,17,20,0.28),0 10px 26px rgba(17,17,20,0.06)', overflow: 'hidden' }}>
                <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: '1px solid rgba(17,17,20,0.07)', background: '#fbfbfd' }}>
                  <span style={{ fontSize: 12.5, color: '#8a8a93', fontFamily: "'Geist Mono', monospace" }}>Vertragsanalyse · mietvertrag.pdf</span>
                </div>
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, background: '#fafafb' }}>
                  <div style={{ background: '#fff', border: '1px solid rgba(17,17,20,0.07)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                    <span className="ca-lp-scan" style={{ position: 'absolute', left: 0, right: 0, top: '-12%', height: 26, background: 'linear-gradient(180deg,transparent,rgba(37,99,235,0.16),transparent)', pointerEvents: 'none' }}></span>
                    <div style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", color: '#9a9aa3', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Klauseln</div>
                    {[{ w: '92%' }, { w: '78%' }, { w: '85%', risk: true }, { w: '64%' }, { w: '88%' }, { w: '72%', warn: true }, { w: '80%' }, { w: '55%' }].map((b, i) => (
                      <div key={i} style={{ height: 7, borderRadius: 4, width: b.w, marginBottom: 9, background: b.risk ? 'rgba(239,68,68,0.22)' : b.warn ? 'rgba(245,158,11,0.28)' : '#edecf3', position: 'relative' }}>
                        {b.risk && <span style={{ position: 'absolute', right: -6, top: -7, fontSize: 9, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, padding: '1px 5px' }}>Risiko</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#fff', border: '1px solid rgba(17,17,20,0.07)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'conic-gradient(#2563eb 0 87%,#ece9f8 87% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 78, height: 78, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#0c0c10', lineHeight: 1 }}><AnimatedCounter end={87} duration={1800} /></span>
                          <span style={{ fontSize: 10, color: '#9a9aa3', fontFamily: "'Geist Mono', monospace" }}>Score</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12.5, color: '#52525b', fontWeight: 500 }}>Fairness · gut</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fde0e0', borderRadius: 9, padding: '8px 10px' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }}></span><span style={{ fontSize: 12, color: '#991b1b', fontWeight: 500 }}>2 kritische Risiken</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffaeb', border: '1px solid #fceec0', borderRadius: 9, padding: '8px 10px' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }}></span><span style={{ fontSize: 12, color: '#92600a', fontWeight: 500 }}>5 Hinweise</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf3', border: '1px solid #c8f0d8', borderRadius: 9, padding: '8px 10px' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></span><span style={{ fontSize: 12, color: '#066c45', fontWeight: 500 }}>12 faire Klauseln</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ca-lp-floaty" style={{ position: 'absolute', left: -18, bottom: 30, display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid rgba(17,17,20,0.08)', borderRadius: 12, padding: '11px 14px', boxShadow: '0 16px 34px -12px rgba(17,17,20,0.22)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: '#ecfdf3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check color="#10b981" size={16} /></span>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: '#0c0c10', lineHeight: 1.1 }}>Analyse fertig</div><div style={{ fontSize: 11, color: '#8a8a93', fontFamily: "'Geist Mono', monospace" }}>in 58 Sek.</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST STRIP ===== */}
        <section style={{ padding: '8px 24px 56px' }}>
          <div className="ca-lp-container-sm ca-lp-reveal" style={{ maxWidth: 1100 }}>
            <div className="ca-lp-trust-grid">
              {[
                { c: '#10b981', t: 'DSGVO-konform', icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></> },
                { c: '#2563eb', t: 'Serverstandort Frankfurt', icon: <><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M2 9h20"></path></> },
                { c: '#7c3aed', t: 'KI-gestützt & juristisch geprüft', icon: <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3 3 3 0 0 0 0 6 3 3 0 0 0 3 3v1a3 3 0 0 0 6 0v-1a3 3 0 0 0 3-3 3 3 0 0 0 0-6 3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z"></path> },
                { c: '#0ea5e9', t: 'Verschlüsselte Übertragung', icon: <><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></> },
              ].map((it, i) => (
                <div key={i} className="ca-lp-trust-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={it.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                  <span>{it.t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section style={{ padding: '56px 24px', background: 'linear-gradient(180deg,#ffffff,#eef3ff 28%,#eef3ff 72%,#ffffff)' }}>
          <div className="ca-lp-stats-grid ca-lp-reveal">
            {[
              { n: 200, s: '+', l: 'Zufriedene Kunden' },
              { n: 1500, s: '+', l: 'Verträge analysiert' },
              { n: 75000, s: '€+', l: 'Eingespart durch Optimierung' },
              { n: 99, s: '%', l: 'Kundenzufriedenheit' },
            ].map((st, i) => (
              <div key={i} className="ca-lp-stat">
                <div className="ca-lp-stat-num"><AnimatedCounter end={st.n} suffix={st.s} /></div>
                <div className="ca-lp-stat-label">{st.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURE GRID ===== */}
        <section id="features" style={{ padding: '64px 24px 40px', background: 'radial-gradient(900px 520px at 82% -8%,rgba(37,99,235,0.05),transparent 60%)', overflow: 'hidden', isolation: 'isolate' }}>
          <span className="ca-lp-bgsym" style={{ top: 40, left: '4%', fontSize: 150, color: 'rgba(37,99,235,0.055)', animation: 'caDriftA 16s ease-in-out infinite' }}>§</span>
          <span className="ca-lp-bgsym" style={{ bottom: 30, right: '6%', fontSize: 110, color: 'rgba(37,99,235,0.055)', animation: 'caDriftB 19s ease-in-out infinite' }}>§</span>
          <div className="ca-lp-container">
            <div className="ca-lp-reveal" style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
              <span className="ca-lp-eyebrow">So funktioniert's</span>
              <h2 className="ca-lp-h2" style={{ fontSize: 'clamp(32px,4vw,50px)', letterSpacing: '-0.03em' }}>Unsere KI-Tools für<br /><span className="ca-lp-grad">Ihre Verträge</span></h2>
              <p className="ca-lp-sub" style={{ fontSize: 18 }}>Erleben Sie die Zukunft des Vertragsmanagements.</p>
            </div>
            <div className="ca-lp-feature-grid ca-lp-reveal">
              {featureCards.map((c, i) => (
                <Link key={i} to={c.to} className="ca-lp-feature-card">
                  <div className="ca-lp-icon-chip" style={{ background: `${c.color}17`, color: c.color }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <span className="ca-lp-feature-link">{c.link}<Arrow /></span>
                </Link>
              ))}
            </div>
            <div className="ca-lp-reveal" style={{ textAlign: 'center', marginTop: 40 }}>
              <p style={{ fontSize: 15, color: '#71717a', marginBottom: 16 }}>Das war noch längst nicht alles.</p>
              <Link to="/features" className="ca-lp-btn-primary">Alle Funktionen entdecken<Arrow size={18} /></Link>
            </div>
          </div>
        </section>

        {/* ===== INTEGRATIONS ===== */}
        <section style={{ padding: '60px 0', background: 'linear-gradient(180deg,#fff,#fafafb)' }}>
          <div className="ca-lp-container ca-lp-reveal" style={{ textAlign: 'center', padding: '0 24px', marginBottom: 36 }}>
            <span className="ca-lp-eyebrow">Integrationen</span>
            <h2 className="ca-lp-h2">Passt in <span className="ca-lp-grad">Ihren Workflow</span></h2>
            <p className="ca-lp-sub">Verbinden Sie Contract AI mit Ihren bestehenden Tools.</p>
          </div>
          <div className="ca-lp-marquee">
            <div className="ca-lp-marquee-track ca-lp-marquee-a">
              {[...integrations, ...integrations].map((it, i) => (
                <span key={i} className="ca-lp-int-pill" aria-hidden={i >= integrations.length}>
                  <img src={it.src} alt={i < integrations.length ? it.name : ''} loading="lazy" />{it.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== VERTRAGSVERWALTUNG ===== */}
        <section style={{ padding: '80px 24px 28px', background: 'linear-gradient(180deg,#ffffff,#eef3ff 15%)' }}>
          <div className="ca-lp-container-sm ca-lp-reveal">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 'clamp(36px,5vw,72px)', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563eb', background: '#eef3ff', border: '1px solid rgba(37,99,235,0.2)', padding: '6px 13px', borderRadius: 999 }}>
                  <span style={{ fontWeight: 700 }}>01</span><span style={{ width: 1, height: 11, background: 'rgba(37,99,235,0.3)' }}></span>Vertragsverwaltung
                </span>
                <h2 className="ca-lp-h2" style={{ fontSize: 'clamp(26px,3vw,38px)', lineHeight: 1.08, margin: '16px 0 0' }}>Ihre Verträge.<br /><span className="ca-lp-grad">Perfekt organisiert.</span></h2>
                <p className="ca-lp-sub">Speichern, organisieren und verwalten Sie all Ihre Verträge sicher in der Contract AI Cloud – mit automatischen Erinnerungen, schneller Suche und DSGVO-konformer Speicherung.</p>
                <ul className="ca-lp-check-list" style={{ gap: 13, marginTop: 22 }}>
                  {[['Zentrale Ablage:', ' Alle Verträge sicher an einem Ort'], ['Sofortiger Zugriff:', ' Finden Sie Dokumente in Sekunden'], ['Automatische Erinnerungen:', ' Fristen nie wieder verpassen'], ['100% DSGVO-konform:', ' Deutsche Server, Standort Frankfurt']].map((b, i) => (
                    <li key={i}><Check /><span><strong style={{ color: '#0c0c10' }}>{b[0]}</strong>{b[1]}</span></li>
                  ))}
                </ul>
                <Link to="/dashboard" className="ca-lp-btn-primary" style={{ marginTop: 26 }}>Jetzt Verträge hochladen<Arrow size={16} /></Link>
              </div>
              <div>
                <div style={{ background: '#fff', border: '1px solid rgba(17,17,20,0.08)', borderRadius: 16, boxShadow: '0 34px 70px -34px rgba(37,99,235,0.32)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '15px 17px', borderBottom: '1px solid rgba(17,17,20,0.06)', background: '#fbfbfd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0c0c10' }}>Meine Verträge</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#71717a', fontFamily: "'Geist Mono', monospace" }}>24 Dokumente</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '15px 17px' }}>
                    {[
                      { n: 'Mietvertrag_2026.pdf', m: 'Score 87 · vor 2 Tagen', c: '#dc2626', bg: '#fef2f2', ok: true },
                      { n: 'Freelancer_NDA.pdf', m: 'Score 92 · vor 5 Tagen', c: '#2563eb', bg: '#eef2ff', ok: true },
                      { n: 'Mobilfunk_2025.pdf', m: 'Frist in 25 Tagen', c: '#b45309', bg: '#fffaeb', ok: false },
                      { n: 'Mietvertrag_Büro.pdf', m: 'Score 95 · vor 1 Woche', c: '#059669', bg: '#ecfdf3', ok: true },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid rgba(17,17,20,0.07)', borderRadius: 11, padding: '12px 13px' }}>
                        <span style={{ width: 32, height: 32, borderRadius: 7, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={f.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: '#0c0c10' }}>{f.n}</div><div style={{ fontSize: 11.5, color: f.ok ? '#9a9aa3' : '#b45309' }}>{f.m}</div></div>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: f.ok ? '#ecfdf3' : '#fffaeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          {f.ok ? <Check color="#10b981" size={13} /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== E-MAIL UPLOAD ===== */}
        <section style={{ padding: '28px 24px 88px', background: 'linear-gradient(180deg,#eef3ff 80%,#ffffff)' }}>
          <div className="ca-lp-container-sm ca-lp-reveal">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 'clamp(36px,5vw,72px)', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                <div style={{ width: '100%', maxWidth: 330, background: '#fff', border: '1px solid rgba(17,17,20,0.07)', borderRadius: 13, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg></span>
                    <div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#0c0c10' }}>Neue E-Mail</div><div style={{ fontSize: 11, color: '#9a9aa3', fontFamily: "'Geist Mono', monospace" }}>an: upload@contract-ai.de</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f6f6fa', border: '1px dashed rgba(37,99,235,0.3)', borderRadius: 9, padding: '10px 12px' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span>
                    <span style={{ fontSize: 12.5, color: '#27272a', fontWeight: 500 }}>arbeitsvertrag.pdf</span>
                  </div>
                </div>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(37,99,235,0.4)' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg></span>
                <div style={{ width: '100%', maxWidth: 330, display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 11, padding: 13 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#ecfdf3', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Check color="#10b981" size={18} /></span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600, color: '#0c0c10' }}>Automatisch erfasst & analysiert</div><div style={{ fontSize: 11.5, color: '#059669', fontWeight: 500 }}>Jetzt im Dashboard verfügbar</div></div>
                </div>
              </div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563eb', background: '#eef3ff', border: '1px solid rgba(37,99,235,0.2)', padding: '6px 13px', borderRadius: 999 }}>
                  <span style={{ fontWeight: 700 }}>02</span><span style={{ width: 1, height: 11, background: 'rgba(37,99,235,0.3)' }}></span>E-Mail Upload
                </span>
                <h2 className="ca-lp-h2" style={{ fontSize: 'clamp(26px,3vw,38px)', lineHeight: 1.08, margin: '16px 0 0' }}>Verträge per E-Mail.<br /><span className="ca-lp-grad">Automatisch erfasst.</span></h2>
                <p className="ca-lp-sub">Leiten Sie E-Mails mit Vertragsanhängen einfach an Ihre persönliche Contract AI Adresse weiter. PDFs werden automatisch erkannt, hochgeladen und analysiert.</p>
                <ul className="ca-lp-check-list" style={{ gap: 13, marginTop: 22 }}>
                  {[['Zero Aufwand:', ' Einfach E-Mail weiterleiten'], ['Auto-Erkennung:', ' PDFs sofort verarbeitet'], ['Jedes Postfach:', ' Gmail, Outlook, Apple Mail'], ['Instant Sync:', ' Direkt im Dashboard']].map((b, i) => (
                    <li key={i}><Check /><span><strong style={{ color: '#0c0c10' }}>{b[0]}</strong>{b[1]}</span></li>
                  ))}
                </ul>
                <Link to="/features/email-upload" className="ca-lp-text-link">E-Mail Upload entdecken<Arrow size={16} /></Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SHOWCASE (mit Videos) ===== */}
        <section style={{ padding: '56px 24px', background: 'linear-gradient(180deg,#fafafb,#fff)' }}>
          <div className="ca-lp-container">
            <div className="ca-lp-reveal" style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
              <span className="ca-lp-eyebrow">Funktionen</span>
              <h2 className="ca-lp-h2" style={{ fontSize: 'clamp(32px,4vw,50px)', letterSpacing: '-0.03em' }}>Alles, was Sie für Ihre<br /><span className="ca-lp-grad">Verträge brauchen</span></h2>
              <p className="ca-lp-sub" style={{ fontSize: 18 }}>Von der Analyse bis zur Unterschrift – unsere KI-Tools automatisieren Ihren kompletten Vertragsworkflow.</p>
            </div>
            {showcaseRows.map((row, i) => (
              <div key={i} className="ca-lp-showcase-row ca-lp-reveal">
                <div style={{ order: row.reverse ? 2 : 1 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563eb', background: '#eef3ff', border: '1px solid rgba(37,99,235,0.2)', padding: '6px 12px', borderRadius: 999 }}>{row.label}</span>
                  <h3 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: '#0c0c10', margin: '16px 0 0' }}>{row.title}</h3>
                  <p className="ca-lp-sub">{row.desc}</p>
                  <ul className="ca-lp-check-list">
                    {row.bullets.map((b, j) => <li key={j}><Check size={16} />{b}</li>)}
                  </ul>
                  <Link to={row.to} className="ca-lp-text-link">{row.linkText}<Arrow size={16} /></Link>
                </div>
                <div style={{ order: row.reverse ? 1 : 2 }}>
                  <div className="ca-lp-showcase-media">
                    <AutoPlayVideo src={row.video} poster={row.poster} alt={row.alt} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== WEITERE TOOLS ===== */}
        <section style={{ padding: '64px 24px' }}>
          <div className="ca-lp-container">
            <div className="ca-lp-reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
              <h2 className="ca-lp-h2">Weitere <span className="ca-lp-grad">leistungsstarke Tools</span></h2>
            </div>
            <div className="ca-lp-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 40 }}>
              {moreTools.map((t, i) => (
                <Link key={i} to={t.to} className="ca-lp-feature-card" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: '#0c0c10' }}>{t.title}</span>
                    <span style={{ display: 'block', fontSize: 13, color: '#71717a', marginTop: 2 }}>{t.desc}</span>
                  </span>
                  <span style={{ color: '#9a9aa3', flex: 'none' }}><Arrow size={16} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== VERTRAGSTYPEN ===== */}
        <section id="types" style={{ padding: '72px 24px', background: 'linear-gradient(180deg,#ffffff,#eef3ff 14%,#eef3ff 86%,#ffffff)', overflow: 'hidden', isolation: 'isolate' }}>
          <div className="ca-lp-container">
            <div className="ca-lp-reveal" style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
              <span className="ca-lp-eyebrow">Vertragstypen</span>
              <h2 className="ca-lp-h2">Beliebte <span className="ca-lp-grad">Vertrags-Prüfungen</span></h2>
              <p className="ca-lp-sub">Spezialisierte Analysen für die wichtigsten deutschen Vertragstypen — auf Basis aktueller BGH- und BAG-Rechtsprechung.</p>
            </div>
            <div className="ca-lp-types-grid ca-lp-reveal">
              {contractTypes.map((t, i) => (
                <Link key={i} to={t.to} className="ca-lp-type-card">
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${t.color}17`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0c0c10', margin: '0 0 8px' }}>{t.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: '#71717a', margin: '0 0 16px' }}>{t.desc}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: t.color, fontWeight: 600, fontSize: 14 }}>Jetzt prüfen<Arrow /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section style={{ padding: '64px 0 72px', background: 'radial-gradient(820px 480px at 14% 2%,rgba(6,182,212,0.06),transparent 58%)', overflow: 'hidden', isolation: 'isolate' }}>
          <div className="ca-lp-container ca-lp-reveal" style={{ textAlign: 'center', padding: '0 24px', marginBottom: 40 }}>
            <span className="ca-lp-eyebrow">Kundenstimmen</span>
            <h2 className="ca-lp-h2">Von Profis <span className="ca-lp-grad">empfohlen</span></h2>
            <p className="ca-lp-sub">Warum über 500+ Unternehmen auf Contract AI vertrauen.</p>
          </div>
          <div className="ca-lp-marquee" style={{ marginBottom: 16 }}>
            <div className="ca-lp-marquee-track ca-lp-marquee-a">
              {[...testimonials.slice(0, 4), ...testimonials.slice(0, 4)].map((t, i) => <TestimonialCard key={i} t={t} />)}
            </div>
          </div>
          <div className="ca-lp-marquee">
            <div className="ca-lp-marquee-track ca-lp-marquee-b">
              {[...testimonials.slice(4, 8), ...testimonials.slice(4, 8)].map((t, i) => <TestimonialCard key={i} t={t} />)}
            </div>
          </div>
        </section>

        {/* ===== CHATGPT-EINWAND ===== */}
        <section style={{ padding: '64px 24px' }}>
          <div className="ca-lp-reveal" style={{ maxWidth: 880, margin: '0 auto', background: '#f4f4f7', border: '1px solid rgba(17,17,20,0.07)', borderRadius: 26, padding: 'clamp(36px,5vw,64px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(420px 280px at 85% 0%,rgba(37,99,235,0.10),transparent 60%),radial-gradient(420px 300px at 8% 100%,rgba(6,182,212,0.10),transparent 60%)' }}></div>
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#0c0c10', margin: 0 }}>„Kann ich nicht einfach <span className="ca-lp-grad">ChatGPT</span> benutzen?"</h2>
              <p style={{ fontSize: 17, color: '#71717a', margin: '20px 0 0' }}>Klar – für eine einmalige Frage.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460, margin: '24px auto 0' }}>
                {['Aber wer erinnert dich an Fristen?', 'Wer prüft, ob sich Gesetze geändert haben?', 'Wer behält 50 Verträge gleichzeitig im Blick?'].map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'center', background: '#fff', border: '1px solid rgba(17,17,20,0.08)', borderRadius: 11, padding: '13px 16px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span style={{ fontSize: 15, color: '#27272a' }}>{q}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 26, background: '#ecfdf3', border: '1px solid #c8f0d8', borderRadius: 999, padding: '10px 20px' }}>
                <Check color="#059669" size={18} /><span style={{ fontSize: 15, fontWeight: 600, color: '#065f46' }}>Contract AI. Automatisch. 24/7.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== VERGLEICHSTABELLE ===== */}
        <section style={{ padding: '64px 24px', background: '#fff', overflow: 'hidden', isolation: 'isolate' }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <div className="ca-lp-reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
              <span className="ca-lp-eyebrow">Im Vergleich</span>
              <h2 className="ca-lp-h2">Warum <span className="ca-lp-grad">Contract AI</span>?</h2>
              <p className="ca-lp-sub">Dieselbe Sicherheit wie beim Anwalt – in Sekunden statt Tagen, zum Bruchteil der Kosten.</p>
            </div>
            <div className="ca-lp-cmp-wrap ca-lp-reveal">
              <div className="ca-lp-cmp">
                <div className="ca-lp-cmp-row ca-lp-cmp-head">
                  <div className="ca-lp-cmp-feature">&nbsp;</div>
                  <div className="ca-lp-cmp-cell ca-lp-cmp-col-hl">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#2563eb' }}>
                      <svg width="15" height="15" viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#2563eb"></rect><path d="M8 14.4l3.8 3.8L20 9.2" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"></path></svg>Contract AI
                    </span>
                  </div>
                  <div className="ca-lp-cmp-cell" style={{ fontSize: 14, fontWeight: 600, color: '#52525b' }}>Anwalt</div>
                  <div className="ca-lp-cmp-cell" style={{ fontSize: 14, fontWeight: 600, color: '#52525b' }}>ChatGPT</div>
                </div>
                {comparisonRows.map((r, i) => {
                  const render = (v: string, hl = false) => {
                    if (v === 'check') return <Check color="#10b981" size={20} />;
                    if (v === 'cross') return <Cross />;
                    return <span style={{ fontSize: 12.5, fontWeight: hl ? 700 : (v === 'teils' ? 600 : 400), color: hl ? '#2563eb' : (v === 'teils' ? '#f59e0b' : '#9a9aa3') }}>{v}</span>;
                  };
                  return (
                    <div key={i} className="ca-lp-cmp-row">
                      <div className="ca-lp-cmp-feature">{r.f}</div>
                      <div className="ca-lp-cmp-cell ca-lp-cmp-col-hl">{render(r.ai, true)}</div>
                      <div className="ca-lp-cmp-cell">{render(r.anwalt)}</div>
                      <div className="ca-lp-cmp-cell">{render(r.gpt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRICING (echte HomePricingCards) ===== */}
        <section id="pricing" style={{ padding: '64px 24px 80px', background: 'linear-gradient(180deg,#ffffff,#eef3ff 13%,#eef3ff 87%,#ffffff)', overflow: 'hidden', isolation: 'isolate' }}>
          <span className="ca-lp-bgsym" style={{ top: 70, left: '5%', fontSize: 140, color: 'rgba(37,99,235,0.055)', animation: 'caDriftB 18s ease-in-out infinite' }}>€</span>
          <span className="ca-lp-bgsym" style={{ bottom: 60, right: '5%', fontSize: 130, color: 'rgba(37,99,235,0.055)', animation: 'caDriftA 15s ease-in-out infinite' }}>%</span>
          <div className="ca-lp-container">
            <div className="ca-lp-reveal" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 8px' }}>
              <span className="ca-lp-eyebrow">Preise</span>
              <h2 className="ca-lp-h2">Einfach & <span className="ca-lp-grad">transparent</span></h2>
              <p className="ca-lp-sub">Wählen Sie den Plan, der zu Ihnen passt. Jederzeit kündbar.</p>
            </div>
            <HomePricingCards />
            <div className="ca-lp-reveal" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', justifyContent: 'center', alignItems: 'center', marginTop: 32 }}>
              {[
                { t: '14 Tage Geld-zurück-Garantie', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></> },
                { t: 'Keine Mindestlaufzeit', icon: <polyline points="20 6 9 17 4 12"></polyline> },
                { t: 'In 60 Sekunden startklar', icon: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></> },
              ].map((b, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#3f3f46', fontWeight: 500 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{b.icon}</svg>{b.t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section style={{ padding: '72px 24px', background: 'linear-gradient(180deg,#ffffff,#eef3ff 14%,#eef3ff 86%,#ffffff)', overflow: 'hidden', isolation: 'isolate' }}>
          <span className="ca-lp-bgsym" style={{ top: 50, left: '6%', fontSize: 120, color: 'rgba(37,99,235,0.05)', animation: 'caDriftA 18s ease-in-out infinite' }}>?</span>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="ca-lp-reveal" style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
              <span className="ca-lp-eyebrow">FAQ</span>
              <h2 className="ca-lp-h2">Häufige <span className="ca-lp-grad">Fragen</span></h2>
              <p className="ca-lp-sub">Alles, was Sie vor dem Start wissen müssen.</p>
            </div>
            <div className="ca-lp-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40 }}>
              {faqs.map((f, i) => (
                <details key={i} className="ca-lp-faq">
                  <summary>
                    <span className="ca-lp-faq-q">{f.q}</span>
                    <svg className="ca-lp-faq-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={{ padding: '24px 24px 88px' }}>
          <div className="ca-lp-finalcta ca-lp-reveal">
            <div className="ca-lp-floaty" style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.16),transparent 70%)', top: -140, right: -80, pointerEvents: 'none' }}></div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999, padding: '6px 15px 6px 7px', marginBottom: 24 }}>
                <div style={{ display: 'flex' }}>
                  {["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"].map((src, i) => (
                    <img key={i} src={src} width={26} height={26} alt="" loading="lazy" style={{ borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover', marginLeft: i === 0 ? 0 : -9 }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}><span style={{ letterSpacing: 1 }}>★★★★★</span> &nbsp;500+ zufriedene Nutzer</span>
              </div>
              <h2 style={{ fontSize: 'clamp(32px,4.6vw,56px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.04, color: '#fff', margin: 0 }}>Ihr nächster Vertrag<br />verdient einen Profi-Check.</h2>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'rgba(255,255,255,0.92)', margin: '20px auto 0', maxWidth: 540 }}>Lade deinen ersten Vertrag hoch und erhalte in 60 Sekunden eine vollständige Risiko-Analyse – <strong style={{ color: '#fff', fontWeight: 600 }}>kostenlos und unverbindlich.</strong></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 36 }}>
                {user ? (
                  <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', color: '#1e40af', fontSize: 18, fontWeight: 600, padding: '18px 36px', borderRadius: 13, textDecoration: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}>Zum Dashboard<Arrow size={19} /></Link>
                ) : (
                  <>
                    <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', color: '#1e40af', fontSize: 18, fontWeight: 600, padding: '18px 36px', borderRadius: 13, textDecoration: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}>Jetzt kostenlos starten<Arrow size={19} /></Link>
                    <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 16, fontWeight: 500, padding: '18px 28px', borderRadius: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)' }}>Preise ansehen</Link>
                  </>
                )}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '18px 0 0', fontWeight: 500 }}>Keine Kreditkarte nötig · 3 Analysen gratis · In 60 Sekunden startklar</p>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="ca-lp-footer">
          <div className="ca-lp-footer-grid">
            <div style={{ flex: '1 1 280px', maxWidth: 360 }}>
              <img src={logo} alt="Contract AI Logo" style={{ height: 32, width: 'auto', marginBottom: 16 }} />
              <p style={{ fontSize: 14, lineHeight: 1.65, color: '#52525b', margin: '0 0 18px' }}>Contract AI revolutioniert Ihr Vertragsmanagement mit neuester KI-Technologie. Wir helfen Ihnen, Verträge zu analysieren, optimieren und verwalten.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <img src={dsgvoBadge} alt="DSGVO-konform" style={{ height: 34, width: 'auto' }} />
                <img src={trustpilotBadge} alt="Trustpilot Bewertungen" style={{ height: 34, width: 'auto' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px 48px', flex: '2 1 520px' }}>
              <div className="ca-lp-footer-col">
                <h4>Funktionen</h4>
                <ul>
                  <li><Link to="/ki-vertragsanalyse">KI-Vertragsanalyse</Link></li>
                  <li><Link to="/features/vertragsanalyse">Vertragsanalyse</Link></li>
                  <li><Link to="/features/optimierung">Optimierung</Link></li>
                  <li><Link to="/features/fristen">Fristen</Link></li>
                  <li><Link to="/features/vergleich">Vergleich</Link></li>
                  <li><Link to="/features/generator">Generator</Link></li>
                  <li><Link to="/features/legalpulse">Legal Pulse</Link></li>
                  <li><Link to="/features/vertragsverwaltung">Vertragsverwaltung</Link></li>
                  <li><Link to="/features/digitalesignatur">Digitale Signatur</Link></li>
                  <li><Link to="/features/email-upload">E-Mail Upload</Link></li>
                  <li><Link to="/features/contract-builder">Contract Builder</Link></li>
                  <li><Link to="/features/legal-lens">Legal Lens</Link></li>
                </ul>
              </div>
              <div className="ca-lp-footer-col">
                <h4>Verträge prüfen</h4>
                <ul>
                  <li><Link to="/arbeitsvertrag-pruefen">Arbeitsvertrag prüfen</Link></li>
                  <li><Link to="/mietvertrag-pruefen">Mietvertrag prüfen</Link></li>
                  <li><Link to="/nda-pruefen">NDA prüfen</Link></li>
                  <li><Link to="/kaufvertrag-pruefen">Kaufvertrag prüfen</Link></li>
                  <li><Link to="/agenturvertrag-pruefen">Agenturvertrag prüfen</Link></li>
                  <li><Link to="/rechtslexikon">Rechtslexikon</Link></li>
                </ul>
              </div>
              <div className="ca-lp-footer-col">
                <h4>Unternehmen</h4>
                <ul>
                  <li><a href="mailto:info@contract-ai.de">Kontakt</a></li>
                  <li><Link to="/about">Über uns</Link></li>
                  <li><Link to="/fuer-agenturen">Für Agenturen &amp; Teams</Link></li>
                  <li><Link to="/hilfe">Hilfe</Link></li>
                  <li><Link to="/blog">Blog</Link></li>
                  <li><Link to="/press">Presse</Link></li>
                </ul>
              </div>
              <div className="ca-lp-footer-col">
                <h4>Rechtliches</h4>
                <ul>
                  <li><Link to="/datenschutz">Datenschutz</Link></li>
                  <li><Link to="/agb">AGB</Link></li>
                  <li><Link to="/impressum">Impressum</Link></li>
                  <li><a onClick={handleOpenCookieSettings}>Cookie-Einstellungen ändern</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div style={{ maxWidth: 1200, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid rgba(17,17,20,0.08)', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#71717a', margin: 0 }}>© 2026 Contract AI. Alle Rechte vorbehalten.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: '#71717a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a href="https://www.instagram.com/contract_ai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: '#71717a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-.5a1 1 0 100 2 1 1 0 000-2z"></path></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61578781115190" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: '#71717a' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
            </div>
          </div>
        </footer>

        {/* Mobile Sticky CTA */}
        {isMobile && !user && (
          <div className="ca-lp-sticky">
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0c0c10' }}>Jetzt kostenlos testen</span>
            <Link to="/register" className="ca-lp-btn-primary" style={{ padding: '12px 20px', fontSize: 15 }}>Starten<Arrow size={16} /></Link>
          </div>
        )}
      </div>
    </>
  );
};

export default HomeRedesign;

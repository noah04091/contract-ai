import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import AutoPlayVideo from "../components/AutoPlayVideo";
import "../styles/landing.css"; // App-Baseline (Status quo; neue Optik ist unter .ca-lp-page gescopet)
import "../styles/landing-redesign.css";

// Assets
import logoHeader from "../assets/logo-header.webp";
import analyseImg from "../assets/Analyse.webp";
import fristenImg from "../assets/Fristen.webp";
import optimierungImg from "../assets/Optimierung.webp";
import vergleichImg from "../assets/Vergleich.webp";

// Demo-Videos (public/Videos)
const analyseVideo = "/Videos/analyse.mp4";
const optimierungVideo = "/Videos/optimierung.mp4";
const fristenVideo = "/Videos/fristen.mp4";
const vergleichVideo = "/Videos/vergleich.mp4";

declare global {
  interface Window { openCookieSettings?: () => void; }
}

/**
 * s() — wandelt einen CSS-Inline-String (1:1 aus der Design-Referenz)
 * in ein React-Style-Objekt. So bleibt die Optik exakt wie im Entwurf.
 */
const s = (css: string): React.CSSProperties => {
  const out: Record<string, string> = {};
  css.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i === -1) return;
    const rawKey = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!rawKey || !val) return;
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  });
  return out as React.CSSProperties;
};

// Pfeil-SVG (wandert bei Hover via .ca-lp-arrow)
const Arrow = ({ w = 16 }: { w?: number }) => (
  <svg className="ca-lp-arrow" width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
);
const Check = ({ stroke = "#2563eb", w = 18, sw = "2.4" }: { stroke?: string; w?: number; sw?: string }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const Star = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon></svg>
);
const VerifiedBadge = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#2563eb"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"></path></svg>
);

// Integrations-Pille
const IntPill = ({ src, alt, w = 28 }: { src: string; alt: string; w?: number }) => (
  <div style={s("display:flex;align-items:center;gap:10px;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:13px;padding:14px 22px;flex:none")}>
    <img src={src} alt={alt} width={w} height={w} style={{ display: 'block' }} loading="lazy" />
    <span style={s("font-size:14.5px;font-weight:500;color:#3f3f46")}>{alt}</span>
  </div>
);
const integrations = [
  { src: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png", alt: "Google Calendar", w: 28 },
  { src: "https://img.icons8.com/color/96/microsoft-outlook-2019.png", alt: "Microsoft Outlook", w: 28 },
  { src: "https://img.icons8.com/ios-filled/100/000000/mac-os.png", alt: "Apple Calendar", w: 26 },
  { src: "https://img.icons8.com/color/96/salesforce.png", alt: "Salesforce", w: 28 },
  { src: "https://img.icons8.com/color/96/sap.png", alt: "SAP", w: 28 },
  { src: "https://img.icons8.com/ios-filled/100/000000/chatgpt.png", alt: "OpenAI", w: 26 },
];

// Kundenstimmen (Daten = bereits live; Namen passen zur Vorlage)
type Voice = { name: string; meta: string; text: string; img?: string; initials?: string; initialBg?: string; verified?: boolean; fourStar?: boolean };
const voicesRow1: Voice[] = [
  { name: "Lisa Kramer", meta: "Frankfurt · Freelancerin", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", verified: true, text: "„Habe bei meinem Werkvertrag einen Passus übersehen, der mich 280€ extra gekostet hätte. Contract AI hat das sofort erkannt!“" },
  { name: "Marcus T.", meta: "München · IT-Berater", initials: "MT", initialBg: "linear-gradient(135deg,#3b82f6,#2563eb)", verified: true, text: "„Endlich verstehe ich meine Mietverträge ohne Anwalt. Die KI erklärt alles verständlich — spart Zeit und Geld.“" },
  { name: "Sarah Müller", meta: "Berlin · Projektmanagerin", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face", verified: true, text: "„Dachte, mein Handyvertrag läuft noch 6 Monate. War tatsächlich schon kündbar — 180€ gespart!“" },
  { name: "Daniel Richter", meta: "Hamburg · Startup-Gründer", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face", verified: true, text: "„Für NDA-Verträge mit Investoren nutze ich nur noch Contract AI. Kein Rechtsanwalt nötig für Standardverträge.“" },
];
const voicesRow2: Voice[] = [
  { name: "Thomas W.", meta: "Würzburg · Handwerksmeister", initials: "TW", initialBg: "linear-gradient(135deg,#0ea5e9,#0369a1)", text: "„Hab meinen Lieferantenvertrag gecheckt und eine versteckte Preisklausel gefunden. Hätte mich 2.400€ mehr pro Jahr gekostet!“" },
  { name: "Julia Schmidt", meta: "Köln · Marketing Managerin", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face", verified: true, text: "„Bei uns im Team nutzen jetzt alle Contract AI für Freelancer-Verträge. Spart uns echt Zeit!“" },
  { name: "Kevin B.", meta: "Stuttgart · BWL-Student", initials: "KB", initialBg: "linear-gradient(135deg,#f59e0b,#d97706)", fourStar: true, text: "„Mein Fitnessstudio-Abo lief automatisch weiter. Contract AI hat mein Sonderkündigungsrecht erkannt — 360€ zurück!“" },
  { name: "Dr. Anna Peters", meta: "München · Steuerberaterin", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face", verified: true, text: "„Als Steuerberaterin muss ich oft Verträge prüfen. Contract AI ist fester Teil meines Workflows. Die Risiko-Analyse ist top.“" },
];
const VoiceCard = ({ v }: { v: Voice }) => (
  <div style={s("width:340px;flex:none;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:16px;padding:22px")}>
    <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:14px")}>
      {v.img ? (
        <img src={v.img} alt={v.name} width="44" height="44" style={s("border-radius:50%;object-fit:cover")} loading="lazy" />
      ) : (
        <div style={s(`width:44px;height:44px;border-radius:50%;background:${v.initialBg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600`)}>{v.initials}</div>
      )}
      <div>
        <div style={s("display:flex;align-items:center;gap:5px")}><span style={s("font-size:14.5px;font-weight:600;color:#0c0c10")}>{v.name}</span>{v.verified && <VerifiedBadge />}</div>
        <span style={s("font-size:12.5px;color:#9a9aa3")}>{v.meta}</span>
      </div>
    </div>
    <div style={s("display:flex;gap:2px;margin-bottom:11px")}>
      {[0, 1, 2, 3].map((i) => <Star key={i} />)}
      {v.fourStar ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="1.6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon></svg> : <Star />}
    </div>
    <p style={s("font-size:14.5px;line-height:1.6;color:#3f3f46;margin:0")}>{v.text}</p>
  </div>
);

const GRAD = "background:linear-gradient(100deg,#2563eb,#3b82f6 50%,#06b6d4);-webkit-background-clip:text;background-clip:text;color:transparent";

const HomeRedesign = () => {
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [showFloat, setShowFloat] = useState(false);

  const handleOpenCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.openCookieSettings) window.openCookieSettings();
  };

  // Reveal + Count-up + Sticky-CTA
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    page.classList.add('ca-lp-anim');

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('ca-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    page.querySelectorAll('.ca-lp-reveal, .ca-lp-stagger').forEach((el) => io.observe(el));

    // Count-up
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target as HTMLElement;
        countIO.unobserve(el);
        const to = parseInt(el.dataset.countTo || '0', 10);
        const suffix = el.dataset.suffix || '';
        const dur = 1600; const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 4);
          const val = Math.round(to * eased);
          el.textContent = val.toLocaleString('de-DE') + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = to.toLocaleString('de-DE') + suffix;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    page.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => countIO.observe(el));

    const onScroll = () => setShowFloat(window.scrollY > 760);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => { io.disconnect(); countIO.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Hero-CTA je nach Login-Status
  const heroPrimaryTo = !user ? "/register" : "/dashboard";
  const heroPrimaryLabel = !user ? "Jetzt starten" : "Zum Dashboard";

  // Preise (echte Werte aus HomePricingCards)
  const biz = billing === 'monthly'
    ? { price: "19", old: "29", note: "monatlich kündbar", save: "" }
    : { price: "15", old: "29", note: "190€/Jahr · jährlich abgerechnet", save: "Sie sparen 158€" };
  const ent = billing === 'monthly'
    ? { price: "29", old: "39", note: "monatlich kündbar", save: "" }
    : { price: "24", old: "39", note: "290€/Jahr · jährlich abgerechnet", save: "Sie sparen 178€" };

  // FAQ-Daten (für Anzeige + JSON-LD)
  const faqs = [
    { q: "Ist Contract AI DSGVO-konform?", a: "Ja. Alle Daten werden DSGVO-konform auf deutschen Servern in Frankfurt gespeichert und verschlüsselt übertragen. Ihre Verträge bleiben jederzeit Ihr Eigentum." },
    { q: "Brauche ich juristische Vorkenntnisse?", a: "Nein. Contract AI erklärt jede Klausel in verständlicher Sprache – mit Risiko-Score und konkreten Empfehlungen. Sie brauchen weder Jura-Studium noch Anwalt für den ersten Überblick." },
    { q: "Wie genau ist die KI-Analyse?", a: "Die Analyse basiert auf aktueller BGH- und BAG-Rechtsprechung und wird laufend aktualisiert. Sie liefert eine fundierte Einschätzung, ersetzt im Einzelfall aber keine individuelle Rechtsberatung." },
    { q: "Kann ich jederzeit kündigen?", a: "Ja. Alle Pläne sind monatlich kündbar, ohne Mindestlaufzeit. Zusätzlich gilt eine 14-tägige Geld-zurück-Garantie – ohne Wenn und Aber." },
    { q: "Welche Verträge & Formate kann ich hochladen?", a: "Von Miet- über Arbeits- bis zu Kauf- und NDA-Verträgen – als PDF direkt im Dashboard oder bequem per E-Mail-Weiterleitung an Ihre persönliche Upload-Adresse." },
    { q: "Ersetzt Contract AI einen Anwalt?", a: "Für Standardverträge gibt Contract AI Ihnen in Minuten Klarheit und spart oft den ersten Anwaltstermin. Bei komplexen oder strittigen Fällen ist sie die ideale Vorbereitung für das Gespräch mit Ihrem Anwalt." },
  ];

  // Showcase-Zeilen (mit unseren Videos)
  const showcase = [
    {
      reverse: false, eyebrowColor: "#2563eb", eyebrowBg: "rgba(37,99,235,0.07)", eyebrowBorder: "rgba(37,99,235,0.16)",
      eyebrow: "KI-Powered", eyIcon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
      titlePre: "Vertragsanalyse mit ", titleAccent: "Score",
      text: "Risiken, Chancen und Verständlichkeit auf einen Blick. Unsere KI bewertet Ihre Verträge und deckt versteckte Fallstricke auf.",
      bullets: ["Automatische Risikoanalyse", "Verständlichkeitsindex für Laien und Profis", "Detaillierte Klausel-Insights"],
      linkColor: "#2563eb", linkLabel: "Zur Vertragsanalyse", to: "/features/vertragsanalyse",
      video: analyseVideo, poster: analyseImg, label: "Vertragsanalyse · score",
    },
    {
      reverse: true, eyebrowColor: "#7c3aed", eyebrowBg: "rgba(124,58,237,0.07)", eyebrowBorder: "rgba(124,58,237,0.16)",
      eyebrow: "Intelligent", eyIcon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>,
      titlePre: "Verträge optimieren & ", titleAccent: "verbessern",
      text: "Schwache oder unfaire Klauseln? Unsere KI findet sie und schlägt sofort bessere Formulierungen vor — für fairere, stärkere Verträge.",
      bullets: ["Automatische Klausel-Optimierung", "Verständlichere Sprache", "Sofort einsatzbereite Änderungen"],
      linkColor: "#7c3aed", linkLabel: "Zum Optimierer", to: "/features/optimierung",
      video: optimierungVideo, poster: optimierungImg, label: "Klausel §4 · Haftung",
    },
    {
      reverse: false, eyebrowColor: "#059669", eyebrowBg: "rgba(5,150,105,0.07)", eyebrowBorder: "rgba(5,150,105,0.16)",
      eyebrow: "Automatisch", eyIcon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
      titlePre: "Fristen ", titleAccent: "automatisch erkennen",
      text: "Verpassen Sie nie wieder eine Kündigungsfrist. Contract AI erkennt wichtige Fristen und erinnert Sie rechtzeitig.",
      bullets: ["Automatische Fristenerkennung", "Erinnerungsfunktion per E-Mail", "Integration in Ihren Kalender"],
      linkColor: "#059669", linkLabel: "Zum Fristenkalender", to: "/features/fristen",
      video: fristenVideo, poster: fristenImg, label: "Anstehende Fristen",
    },
    {
      reverse: true, eyebrowColor: "#db2777", eyebrowBg: "rgba(219,39,119,0.07)", eyebrowBorder: "rgba(219,39,119,0.16)",
      eyebrow: "Präzise", eyIcon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3H3v18h18V3z"></path><path d="M9 3v18"></path><path d="M3 9h18"></path></svg>,
      titlePre: "Verträge intelligent ", titleAccent: "vergleichen",
      text: "Lassen Sie zwei Verträge gegeneinander antreten. Contract AI zeigt Unterschiede, Fairness und empfiehlt den besseren Weg.",
      bullets: ["Visualisierte Unterschiede", "Fairness-Score & Verbesserungstipps", "Entscheidungshilfe in Sekunden"],
      linkColor: "#db2777", linkLabel: "Zum Vergleich", to: "/features/vergleich",
      video: vergleichVideo, poster: vergleichImg, label: "Vergleich",
    },
  ];

  // 8 Feature-Karten
  const featureCards = [
    { to: "/features/vertragsanalyse", color: "#2563eb", bg: "rgba(37,99,235,0.09)", title: "Analyse", desc: "Verträge KI-basiert auswerten, Risiken erkennen & Transparenz gewinnen.", link: "Vertragsanalyse entdecken", icon: <><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></> },
    { to: "/features/optimierung", color: "#7c3aed", bg: "rgba(124,58,237,0.09)", title: "Optimierung", desc: "Unvorteilhafte Klauseln erkennen und durch bessere Formulierungen ersetzen.", link: "Optimierung entdecken", icon: <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"></path> },
    { to: "/features/fristen", color: "#d97706", bg: "rgba(217,119,6,0.10)", title: "Fristen", desc: "Kündigungsfristen automatisch erkennen & rechtzeitig per Mail erinnert werden.", link: "Fristenkalender entdecken", icon: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></> },
    { to: "/features/vergleich", color: "#9333ea", bg: "rgba(147,51,234,0.09)", title: "Vergleich", desc: "Zwei Verträge gegenüberstellen, Unterschiede visuell hervorheben.", link: "Vertragsvergleich entdecken", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></> },
    { to: "/features/legal-lens", color: "#0891b2", bg: "rgba(8,145,178,0.10)", title: "Legal Lens", desc: "Interaktive Vertragsanalyse mit Risiko-Score, Smart Summary & Verhandlungs-Empfehlungen.", link: "Legal Lens entdecken", icon: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></> },
    { to: "/features/generator", color: "#059669", bg: "rgba(5,150,105,0.10)", title: "Generator", desc: "Vertragsdokumente aus KI-Vorlagen erzeugen – z. B. Freelancer-, NDA- oder Mietverträge.", link: "Vertragsgenerator entdecken", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></> },
    { to: "/features/digitalesignatur", color: "#0d9488", bg: "rgba(13,148,136,0.10)", title: "Digitale Signatur", desc: "Verträge rechtssicher digital signieren – mit Audit Trail, Benachrichtigung & versiegeltem PDF.", link: "Digitale Signatur entdecken", icon: <><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></> },
    { to: "/features/legalpulse", color: "#dc2626", bg: "rgba(220,38,38,0.09)", title: "Legal Pulse", desc: "Frühwarnsystem für neue Risiken durch Gesetzesänderungen oder unfaire Formulierungen.", link: "Legal Pulse entdecken", icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path> },
  ];

  // Weitere Tools
  const tools = [
    { to: "/features/generator", title: "Vertragsgenerator", desc: "Rechtssichere Verträge aus Vorlagen erstellen", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></> },
    { to: "/features/digitalesignatur", title: "Digitale Signatur", desc: "Verträge rechtssicher unterschreiben lassen", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></> },
    { to: "/features/legalpulse", title: "Legal Pulse", desc: "Frühwarnsystem für rechtliche Änderungen", icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path> },
    { to: "/features/contract-builder", title: "Contract Builder", desc: "Verträge per Drag & Drop erstellen", icon: <><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></> },
    { to: "/features/legal-lens", title: "Legal Lens", desc: "Interaktive Tiefenanalyse jeder Klausel", icon: <><circle cx="11" cy="11" r="8"></circle><circle cx="11" cy="11" r="3"></circle><path d="m21 21-4.35-4.35"></path></> },
    { to: "/features/vertragsverwaltung", title: "Vertragsverwaltung", desc: "Alle Verträge zentral organisieren", icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></> },
  ];

  // Vertragstypen
  const types = [
    { to: "/arbeitsvertrag-pruefen", color: "#2563eb", bg: "rgba(37,99,235,0.08)", title: "Arbeitsvertrag prüfen", desc: "Wettbewerbsverbot, Probezeit, Überstunden und Kündigungsfristen — KI-Check auf Basis aktueller BAG-Rechtsprechung.", icon: <><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></> },
    { to: "/mietvertrag-pruefen", color: "#059669", bg: "rgba(16,185,129,0.09)", title: "Mietvertrag prüfen", desc: "Schönheitsreparaturen, Kaution, Indexmiete und Kündigungsausschluss — KI-Check auf Basis aktueller BGH-Rechtsprechung.", icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></> },
    { to: "/nda-pruefen", color: "#dc2626", bg: "rgba(239,68,68,0.09)", title: "NDA prüfen", desc: "Vertragsstrafe, Geheimhaltungsdauer, Carve-Outs und verstecktes Wettbewerbsverbot — KI-Check auf Basis GeschGehG.", icon: <><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></> },
    { to: "/kaufvertrag-pruefen", color: "#ea580c", bg: "rgba(249,115,22,0.09)", title: "Kaufvertrag prüfen", desc: "Gewährleistung, Beschaffenheit, „gekauft wie gesehen“ und Stornogebühren — KI-Check auf Basis BGB-Kaufrecht.", icon: <><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></> },
  ];

  const compRows = [
    { label: "Ergebnis in 60 Sekunden", ca: "check", anwalt: "Tage", gpt: "x" },
    { label: "Kosten pro Vertrag", ca: "ab 0€", anwalt: "150–300€", gpt: "gratis, riskant" },
    { label: "Fristen automatisch im Blick", ca: "check", anwalt: "x", gpt: "x" },
    { label: "Warnt bei Gesetzesänderungen", ca: "check", anwalt: "x", gpt: "x" },
    { label: "Verständliche Klartext-Erklärung", ca: "check", anwalt: "teils", gpt: "teils" },
    { label: "Alle Verträge zentral verwaltet", ca: "check", anwalt: "x", gpt: "x" },
  ];
  const CompCell = ({ v, highlight }: { v: string; highlight?: boolean }) => {
    const base = "padding:16px 14px;display:flex;justify-content:center;align-items:center" + (highlight ? ";background:rgba(37,99,235,0.04);border-left:1px solid rgba(37,99,235,0.18);border-right:1px solid rgba(37,99,235,0.18)" : "");
    if (v === "check") return <div style={s(base)}><Check stroke="#10b981" w={20} sw="2.6" /></div>;
    if (v === "x") return <div style={s(base)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>;
    const color = v === "teils" ? "#f59e0b" : (highlight ? "#2563eb" : "#9a9aa3");
    const weight = (v === "teils" || highlight) ? "font-weight:600;" : "";
    const fs = highlight ? "13px" : (v === "teils" ? "13px" : "12.5px");
    return <div style={s(`${base};${weight}font-size:${fs};color:${color};text-align:center`)}>{v}</div>;
  };

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

        {/* Schema.org JSON-LD: FAQPage (additiv, exakt die FAQ-Texte dieser Seite) */}
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

      <div className="ca-lp-page" ref={pageRef}>

        {/* ===== HERO ===== */}
        <section id="top" style={s("position:relative;padding:84px 24px 72px")}>
          <div style={s("position:absolute;inset:0;pointer-events:none;background:radial-gradient(620px 420px at 18% 2%,rgba(99,102,241,0.16),transparent 60%),radial-gradient(560px 420px at 88% 8%,rgba(139,92,246,0.14),transparent 60%),radial-gradient(560px 460px at 64% 96%,rgba(6,182,212,0.10),transparent 62%)")}></div>
          <div className="ca-lp-2col" style={s("position:relative;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr));gap:52px;align-items:center")}>
            <div className="ca-lp-hero-col">
              <div style={s("display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 8px;border:1px solid rgba(37,99,235,0.2);background:rgba(37,99,235,0.06);border-radius:999px;margin-bottom:24px")}>
                <span style={s("display:inline-flex;align-items:center;gap:5px;background:#2563eb;color:#fff;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px")}>Neu</span>
                <span style={s("font-size:13px;color:#3f3f46;font-weight:500")}>KI-Vertragsanalyse in 60&nbsp;Sekunden</span>
              </div>
              <h1 style={s("font-size:clamp(40px,5.4vw,68px);font-weight:600;letter-spacing:-0.035em;line-height:1.02;margin:0;color:#0c0c10")}>Verträge im Griff.<br />Kosten gespart.<br /><span style={s(GRAD)}>Zeit gewonnen.</span></h1>
              <div style={s("margin:18px 0 0;height:52px")}>
                <svg viewBox="0 0 200 50" width="220" height="55" fill="none" style={{ overflow: 'visible' }} aria-label="Contract AI">
                  <path pathLength={1} d="M18,18 C8,20 4,28 6,36 C8,44 16,48 26,46 C30,45 33,43 35,40" stroke="#2563eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={s("stroke-dasharray:1;stroke-dashoffset:1;animation:caSigDraw .55s ease forwards .25s")}></path>
                  <path pathLength={1} d="M28,38 C32,36 35,32 38,34 C41,36 40,40 43,38 C46,36 48,32 52,34 C54,35 54,38 56,36 C58,34 60,30 64,32 C66,33 66,38 69,36 C72,34 74,30 78,32 C80,34 80,38 83,35 C86,32 88,28 92,32" stroke="#2563eb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={s("stroke-dasharray:1;stroke-dashoffset:1;animation:caSigDraw .9s ease forwards .7s")}></path>
                  <path pathLength={1} d="M105,42 L112,22 L119,42 M108,34 L116,34" stroke="#3b82f6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={s("stroke-dasharray:1;stroke-dashoffset:1;animation:caSigDraw .45s ease forwards 1.45s")}></path>
                  <path pathLength={1} d="M128,26 L128,42" stroke="#3b82f6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={s("stroke-dasharray:1;stroke-dashoffset:1;animation:caSigDraw .3s ease forwards 1.8s")}></path>
                  <circle cx="128" cy="20" r="2.2" fill="#3b82f6" style={s("opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(0);animation:caSigDot .25s ease forwards 2.05s")}></circle>
                  <path pathLength={1} d="M6,50 Q60,57 120,48 Q150,44 182,51" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={s("stroke-dasharray:1;stroke-dashoffset:1;animation:caSigDraw .7s ease forwards 2.15s")}></path>
                </svg>
              </div>
              <p style={s("font-size:19px;line-height:1.6;color:#52525b;margin:20px 0 0;max-width:524px")}>Contract&nbsp;AI erkennt versteckte Risiken, erinnert an Fristen und behält alle Verträge im Blick – damit Sie es nicht müssen.</p>
              <div className="ca-lp-hero-cta" style={s("display:flex;flex-wrap:wrap;gap:13px;margin-top:34px")}>
                <Link to={heroPrimaryTo} className="ca-lp-btn-primary" style={s("display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#fff;font-size:16px;font-weight:500;padding:15px 26px;border-radius:11px;text-decoration:none;box-shadow:0 1px 2px rgba(17,17,20,0.12)")}>{heroPrimaryLabel}<Arrow w={17} /></Link>
                <Link to="/pricing" className="ca-lp-btn-secondary" style={s("display:inline-flex;align-items:center;gap:8px;background:#fff;color:#111114;font-size:16px;font-weight:500;padding:15px 24px;border-radius:11px;text-decoration:none;border:1px solid #e3e4e9")}>Kostenlos testen</Link>
              </div>
              <div style={s("display:inline-flex;align-items:center;gap:9px;margin-top:30px;padding:9px 15px;background:rgba(17,17,20,0.035);border:1px solid rgba(17,17,20,0.06);border-radius:10px")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span style={s("font-size:13.5px;color:#3f3f46;font-weight:500")}>Deutsche Server. Maximaler Schutz. Ihre Daten bleiben Ihre Daten.</span>
              </div>
              <div className="ca-lp-hero-social" style={s("display:flex;align-items:center;gap:14px;margin-top:26px;flex-wrap:wrap")}>
                <div style={{ display: 'flex' }}>
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" width="36" height="36" style={s("border-radius:50%;border:2.5px solid #fff;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,0.12)")} alt="" loading="lazy" />
                  <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face" width="36" height="36" style={s("border-radius:50%;border:2.5px solid #fff;object-fit:cover;margin-left:-11px;box-shadow:0 2px 6px rgba(0,0,0,0.12)")} alt="" loading="lazy" />
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face" width="36" height="36" style={s("border-radius:50%;border:2.5px solid #fff;object-fit:cover;margin-left:-11px;box-shadow:0 2px 6px rgba(0,0,0,0.12)")} alt="" loading="lazy" />
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face" width="36" height="36" style={s("border-radius:50%;border:2.5px solid #fff;object-fit:cover;margin-left:-11px;box-shadow:0 2px 6px rgba(0,0,0,0.12)")} alt="" loading="lazy" />
                </div>
                <div>
                  <div style={s("display:flex;align-items:center;gap:3px;margin-bottom:2px")}>{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</div>
                  <span style={s("font-size:13px;color:#52525b")}><strong style={s("color:#0c0c10;font-weight:600")}>500+ zufriedene Nutzer</strong> vertrauen Contract&nbsp;AI</span>
                </div>
              </div>
            </div>

            {/* Hero-Mockup */}
            <div style={s("position:relative")} className="ca-lp-reveal">
              <div style={s("position:relative;background:#ffffff;border:1px solid rgba(17,17,20,0.09);border-radius:18px;box-shadow:0 40px 80px -28px rgba(17,17,20,0.28),0 10px 26px rgba(17,17,20,0.06);overflow:hidden")}>
                <div style={s("height:44px;display:flex;align-items:center;gap:8px;padding:0 16px;border-bottom:1px solid rgba(17,17,20,0.07);background:#fbfbfd")}>
                  <span style={s("font-size:12.5px;color:#8a8a93;font-family:'Geist Mono',monospace")}>Vertragsanalyse · mietvertrag.pdf</span>
                </div>
                <div style={s("padding:20px;display:grid;grid-template-columns:1.15fr 1fr;gap:16px;background:#fafafb")}>
                  <div style={s("background:#fff;border:1px solid rgba(17,17,20,0.07);border-radius:12px;padding:16px;position:relative;overflow:hidden")}>
                    <span style={s("position:absolute;left:0;right:0;top:-12%;height:26px;background:linear-gradient(180deg,transparent,rgba(37,99,235,0.16),transparent);animation:caScan 2.8s ease-in-out infinite;pointer-events:none")}></span>
                    <div style={s("font-size:11px;font-family:'Geist Mono',monospace;color:#9a9aa3;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px")}>Klauseln</div>
                    <div style={s("height:7px;border-radius:4px;background:#edecf3;width:92%;margin-bottom:9px")}></div>
                    <div style={s("height:7px;border-radius:4px;background:#edecf3;width:78%;margin-bottom:9px")}></div>
                    <div style={s("height:7px;border-radius:4px;background:rgba(239,68,68,0.22);width:85%;margin-bottom:6px;position:relative")}>
                      <span style={s("position:absolute;right:-6px;top:-7px;font-size:9px;font-weight:600;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:1px 5px")}>Risiko</span>
                    </div>
                    <div style={s("height:7px;border-radius:4px;background:#edecf3;width:64%;margin-bottom:9px")}></div>
                    <div style={s("height:7px;border-radius:4px;background:#edecf3;width:88%;margin-bottom:9px")}></div>
                    <div style={s("height:7px;border-radius:4px;background:rgba(245,158,11,0.28);width:72%;margin-bottom:9px")}></div>
                    <div style={s("height:7px;border-radius:4px;background:#edecf3;width:80%;margin-bottom:9px")}></div>
                    <div style={s("height:7px;border-radius:4px;background:#edecf3;width:55%")}></div>
                  </div>
                  <div style={s("display:flex;flex-direction:column;gap:12px")}>
                    <div style={s("background:#fff;border:1px solid rgba(17,17,20,0.07);border-radius:12px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px")}>
                      <div style={s("width:104px;height:104px;border-radius:50%;background:conic-gradient(#2563eb 0 87%,#ece9f8 87% 100%);display:flex;align-items:center;justify-content:center")}>
                        <div style={s("width:78px;height:78px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center")}>
                          <span style={s("font-size:26px;font-weight:700;letter-spacing:-0.03em;color:#0c0c10;line-height:1")} data-count-to="87" data-suffix="">87</span>
                          <span style={s("font-size:10px;color:#9a9aa3;font-family:'Geist Mono',monospace")}>Score</span>
                        </div>
                      </div>
                      <span style={s("font-size:12.5px;color:#52525b;font-weight:500")}>Fairness · gut</span>
                    </div>
                    <div style={s("display:flex;flex-direction:column;gap:8px")}>
                      <div style={s("display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fde0e0;border-radius:9px;padding:8px 10px")}><span style={s("width:7px;height:7px;border-radius:50%;background:#ef4444")}></span><span style={s("font-size:12px;color:#991b1b;font-weight:500")}>2 kritische Risiken</span></div>
                      <div style={s("display:flex;align-items:center;gap:8px;background:#fffaeb;border:1px solid #fceec0;border-radius:9px;padding:8px 10px")}><span style={s("width:7px;height:7px;border-radius:50%;background:#f59e0b")}></span><span style={s("font-size:12px;color:#92600a;font-weight:500")}>5 Hinweise</span></div>
                      <div style={s("display:flex;align-items:center;gap:8px;background:#ecfdf3;border:1px solid #c8f0d8;border-radius:9px;padding:8px 10px")}><span style={s("width:7px;height:7px;border-radius:50%;background:#10b981")}></span><span style={s("font-size:12px;color:#066c45;font-weight:500")}>12 faire Klauseln</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={s("position:absolute;left:-18px;bottom:30px;display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:12px;padding:11px 14px;box-shadow:0 16px 34px -12px rgba(17,17,20,0.22);animation:caFloatY 5s ease-in-out infinite")}>
                <span style={s("width:30px;height:30px;border-radius:8px;background:#ecfdf3;display:flex;align-items:center;justify-content:center")}><Check stroke="#10b981" w={16} /></span>
                <div><div style={s("font-size:13px;font-weight:600;color:#0c0c10;line-height:1.1")}>Analyse fertig</div><div style={s("font-size:11px;color:#8a8a93;font-family:'Geist Mono',monospace")}>in 58 Sek.</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUSTBAR ===== */}
        <section style={s("padding:8px 24px 56px")}>
          <div style={s("max-width:1100px;margin:0 auto")} className="ca-lp-reveal">
            <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:14px")}>
              {[
                { c: "#10b981", t: "DSGVO-konform", icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></> },
                { c: "#2563eb", t: "Serverstandort Frankfurt", icon: <><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M2 9h20"></path></> },
                { c: "#7c3aed", t: "KI-gestützt & juristisch geprüft", icon: <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3 3 3 0 0 0 0 6 3 3 0 0 0 3 3v1a3 3 0 0 0 6 0v-1a3 3 0 0 0 3-3 3 3 0 0 0 0-6 3 3 0 0 0-3-3V5a3 3 0 0 0-3-3z"></path> },
                { c: "#0ea5e9", t: "Verschlüsselte Übertragung", icon: <><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></> },
              ].map((it, i) => (
                <div key={i} style={s("display:flex;align-items:center;gap:11px;padding:16px 18px;border:1px solid rgba(17,17,20,0.08);border-radius:13px;background:#fff")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={it.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                  <span style={s("font-size:14px;font-weight:500;color:#27272a")}>{it.t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section style={s("padding:56px 24px;background:linear-gradient(180deg,#ffffff,#eef3ff 28%,#eef3ff 72%,#ffffff)")}>
          <div style={s("max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:18px")} className="ca-lp-stagger">
            {[
              { to: 500, suffix: "+", txt: "500+", label: "Zufriedene Kunden" },
              { to: 1500, suffix: "+", txt: "1.500+", label: "Verträge analysiert" },
              { to: 75000, suffix: "€+", txt: "75.000€+", label: "Eingespart durch Optimierung" },
              { to: 99, suffix: "%", txt: "99%", label: "Kundenzufriedenheit" },
            ].map((st, i) => (
              <div key={i} style={s("text-align:center;padding:30px 18px;border:1px solid rgba(17,17,20,0.08);border-radius:16px;background:linear-gradient(180deg,#fff,#fbfbfd)")}>
                <div style={s("font-size:clamp(34px,4vw,46px);font-weight:700;letter-spacing:-0.03em;color:#0c0c10;line-height:1")}><span data-count-to={st.to} data-suffix={st.suffix}>{st.txt}</span></div>
                <div style={s("font-size:14px;color:#71717a;margin-top:8px;font-weight:500")}>{st.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section id="features" style={s("padding:64px 24px 40px;background:radial-gradient(900px 520px at 82% -8%,rgba(37,99,235,0.05),transparent 60%);position:relative;overflow:hidden;isolation:isolate")}>
          <span style={s("position:absolute;z-index:-1;top:120px;right:18%;font-weight:700;font-size:64px;line-height:1;color:rgba(37,99,235,0.035);pointer-events:none;user-select:none;animation:caDriftB 13s ease-in-out infinite")}>§</span>
          <span style={s("position:absolute;z-index:-1;top:40px;left:4%;font-weight:700;font-size:150px;line-height:1;color:rgba(37,99,235,0.055);pointer-events:none;user-select:none;animation:caDriftA 16s ease-in-out infinite")}>§</span>
          <span style={s("position:absolute;z-index:-1;bottom:30px;right:6%;font-weight:700;font-size:110px;line-height:1;color:rgba(37,99,235,0.055);pointer-events:none;user-select:none;animation:caDriftB 19s ease-in-out infinite")}>§</span>
          <div style={s("max-width:1200px;margin:0 auto")}>
            <div style={s("max-width:680px;margin:0 auto;text-align:center")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>So funktioniert's</span>
              <h2 style={s("font-size:clamp(32px,4vw,50px);font-weight:600;letter-spacing:-0.03em;line-height:1.04;margin:14px 0 0;color:#0c0c10")}>Unsere KI-Tools für<br /><span style={s(GRAD)}>Ihre Verträge</span></h2>
              <p style={s("font-size:18px;line-height:1.6;color:#52525b;margin:16px 0 0")}>Erleben Sie die Zukunft des Vertragsmanagements.</p>
            </div>
            <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(258px,100%),1fr));gap:18px;margin-top:48px")} className="ca-lp-stagger">
              {featureCards.map((f, i) => (
                <Link key={i} to={f.to} className="ca-lp-card" style={s("text-decoration:none;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:16px;padding:26px;display:block")}>
                  <div style={s(`width:44px;height:44px;border-radius:11px;background:${f.bg};color:${f.color};display:flex;align-items:center;justify-content:center;margin-bottom:18px`)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg></div>
                  <h3 style={s("font-size:18px;font-weight:600;letter-spacing:-0.01em;color:#0c0c10;margin:0 0 8px")}>{f.title}</h3>
                  <p style={s("font-size:14.5px;line-height:1.6;color:#71717a;margin:0 0 16px")}>{f.desc}</p>
                  <span style={s("display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:500;color:#2563eb")}>{f.link}<Arrow w={15} /></span>
                </Link>
              ))}
            </div>
            <div style={s("text-align:center;margin-top:36px")} className="ca-lp-reveal">
              <p style={s("font-size:15px;color:#71717a;margin:0 0 16px")}>Das war noch längst nicht alles.</p>
              <Link to="/features" className="ca-lp-btn-primary" style={s("display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#fff;font-size:15px;font-weight:500;padding:13px 24px;border-radius:11px;text-decoration:none")}>Alle Funktionen entdecken<Arrow /></Link>
            </div>
          </div>
        </section>

        {/* ===== INTEGRATIONEN ===== */}
        <section style={s("padding:60px 0 60px;background:linear-gradient(180deg,#fff,#fafafb)")}>
          <div style={s("max-width:1200px;margin:0 auto;padding:0 24px")}>
            <div style={s("max-width:640px;margin:0 auto;text-align:center")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Integrationen</span>
              <h2 style={s("font-size:clamp(28px,3.4vw,44px);font-weight:600;letter-spacing:-0.025em;line-height:1.06;margin:14px 0 0;color:#0c0c10")}>Passt in <span style={s(GRAD)}>Ihren Workflow</span></h2>
              <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Verbinden Sie Contract&nbsp;AI mit Ihren bestehenden Tools.</p>
            </div>
          </div>
          <div style={s("position:relative;margin-top:44px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)")}>
            <div className="ca-lp-mq" style={{ "--ca-mq-gap": "16px", "--ca-mq-dur": "100s" } as React.CSSProperties}>
              <div className="ca-lp-mq-group">
                {[0, 1, 2].flatMap((r) => integrations.map((it, i) => <IntPill key={`ig-a-${r}-${i}`} {...it} />))}
              </div>
              <div className="ca-lp-mq-group" aria-hidden="true">
                {[0, 1, 2].flatMap((r) => integrations.map((it, i) => <IntPill key={`ig-b-${r}-${i}`} {...it} />))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== VERTRAGSVERWALTUNG (01) ===== */}
        <section style={s("padding:80px 24px 28px;background:linear-gradient(180deg,#ffffff,#eef3ff 15%)")}>
          <div style={s("max-width:1140px;margin:0 auto")} className="ca-lp-reveal">
            <div className="ca-lp-2col" style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:clamp(36px,5vw,72px);align-items:center")}>
              <div className="ca-lp-rowtext">
                <span style={s("display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#2563eb;background:#eef3ff;border:1px solid rgba(37,99,235,0.2);padding:6px 13px;border-radius:999px")}><span style={s("font-weight:700;color:#2563eb")}>01</span><span style={s("width:1px;height:11px;background:rgba(37,99,235,0.3)")}></span>Vertragsverwaltung</span>
                <h2 style={s("font-size:clamp(26px,3vw,38px);font-weight:600;letter-spacing:-0.025em;line-height:1.08;margin:16px 0 0;color:#0c0c10")}>Ihre Verträge.<br /><span style={s(GRAD)}>Perfekt organisiert.</span></h2>
                <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Speichern, organisieren und verwalten Sie all Ihre Verträge sicher in der Contract&nbsp;AI Cloud – mit automatischen Erinnerungen, schneller Suche und DSGVO-konformer Speicherung.</p>
                <ul style={s("list-style:none;padding:0;margin:22px 0 0;display:flex;flex-direction:column;gap:13px")}>
                  {[
                    { b: "Zentrale Ablage:", t: " Alle Verträge sicher an einem Ort", icon: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path> },
                    { b: "Sofortiger Zugriff:", t: " Finden Sie Dokumente in Sekunden", icon: <><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></> },
                    { b: "Automatische Erinnerungen:", t: " Fristen nie wieder verpassen", icon: <><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></> },
                    { b: "100% DSGVO-konform:", t: " Deutsche Server, Standort Frankfurt", icon: <><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></> },
                  ].map((li, i) => (
                    <li key={i} style={s("display:flex;align-items:flex-start;gap:11px")}><span style={s("width:30px;height:30px;border-radius:8px;background:rgba(37,99,235,0.08);color:#2563eb;display:flex;align-items:center;justify-content:center;flex:none")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{li.icon}</svg></span><span style={s("font-size:15px;color:#27272a;line-height:1.5")}><strong style={s("color:#0c0c10")}>{li.b}</strong>{li.t}</span></li>
                  ))}
                </ul>
                <Link to={!user ? "/register" : "/dashboard"} className="ca-lp-btn-primary" style={s("display:inline-flex;align-items:center;gap:8px;margin-top:26px;background:#2563eb;color:#fff;font-size:15px;font-weight:500;padding:13px 22px;border-radius:11px;text-decoration:none")}>Jetzt Verträge hochladen<Arrow /></Link>
              </div>
              <div className="ca-lp-rowgfx">
                <div style={s("background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:16px;box-shadow:0 34px 70px -34px rgba(37,99,235,0.32);overflow:hidden")}>
                  <div style={s("display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 17px;border-bottom:1px solid rgba(17,17,20,0.06);background:#fbfbfd")}>
                    <div style={s("display:flex;align-items:center;gap:9px")}><span style={s("width:30px;height:30px;border-radius:8px;background:#2563eb;display:flex;align-items:center;justify-content:center")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span><span style={s("font-size:14px;font-weight:600;color:#0c0c10")}>Meine Verträge</span></div>
                    <div style={s("display:flex;align-items:center;gap:10px")}><span style={s("font-size:11.5px;color:#71717a;font-family:'Geist Mono',monospace")}>24 Dokumente</span><span style={s("display:inline-flex;align-items:center;gap:5px;background:#2563eb;color:#fff;font-size:11.5px;font-weight:600;border-radius:8px;padding:6px 10px")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Upload</span></div>
                  </div>
                  <div style={s("display:flex;flex-direction:column;gap:9px;padding:15px 17px")}>
                    {[
                      { name: "Mietvertrag_2026.pdf", meta: "Score 87 · vor 2 Tagen", ic: "#dc2626", icbg: "#fef2f2", ok: true },
                      { name: "Freelancer_NDA.pdf", meta: "Score 92 · vor 5 Tagen", ic: "#2563eb", icbg: "#eef2ff", ok: true },
                      { name: "Mobilfunk_2025.pdf", meta: "Frist in 25 Tagen", ic: "#b45309", icbg: "#fffaeb", ok: false },
                      { name: "Mietvertrag_Büro.pdf", meta: "Score 95 · vor 1 Woche", ic: "#059669", icbg: "#ecfdf3", ok: true },
                      { name: "Kaufvertrag_Kfz.pdf", meta: "Score 81 · vor 2 Wochen", ic: "#2563eb", icbg: "#eef2ff", ok: true },
                    ].map((row, i) => (
                      <div key={i} style={s("display:flex;align-items:center;gap:11px;background:#fff;border:1px solid rgba(17,17,20,0.07);border-radius:11px;padding:12px 13px")}>
                        <span style={s(`width:32px;height:32px;border-radius:7px;background:${row.icbg};display:flex;align-items:center;justify-content:center;color:${row.ic};flex:none`)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span>
                        <div style={s("flex:1;min-width:0")}><div style={s("font-size:13.5px;font-weight:600;color:#0c0c10")}>{row.name}</div><div style={s(`font-size:11.5px;color:${row.ok ? "#9a9aa3" : "#b45309"}`)}>{row.meta}</div></div>
                        <span style={s(`width:24px;height:24px;border-radius:50%;background:${row.ok ? "#ecfdf3" : "#fffaeb"};display:flex;align-items:center;justify-content:center;flex:none`)}>{row.ok ? <Check stroke="#10b981" w={13} sw="2.6" /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== E-MAIL UPLOAD (02) ===== */}
        <section style={s("padding:28px 24px 88px;background:linear-gradient(180deg,#eef3ff 80%,#ffffff)")}>
          <div style={s("max-width:1140px;margin:0 auto")} className="ca-lp-reveal">
            <div className="ca-lp-2col" style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:clamp(36px,5vw,72px);align-items:center")}>
              <div className="ca-lp-rowgfx" style={s("order:1;display:flex;flex-direction:column;align-items:center;gap:18px")}>
                <div style={s("width:100%;max-width:330px;background:#fff;border:1px solid rgba(17,17,20,0.07);border-radius:13px;padding:16px")}>
                  <div style={s("display:flex;align-items:center;gap:9px;margin-bottom:13px")}><span style={s("width:30px;height:30px;border-radius:8px;background:#2563eb;display:flex;align-items:center;justify-content:center")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg></span><div><div style={s("font-size:12.5px;font-weight:600;color:#0c0c10")}>Neue E-Mail</div><div style={s("font-size:11px;color:#9a9aa3;font-family:'Geist Mono',monospace")}>an: upload@contract-ai.de</div></div></div>
                  <div style={s("display:flex;align-items:center;gap:9px;background:#f6f6fa;border:1px dashed rgba(37,99,235,0.3);border-radius:9px;padding:10px 12px")}><span style={s("width:26px;height:26px;border-radius:6px;background:#fef2f2;display:flex;align-items:center;justify-content:center;color:#dc2626;flex:none")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></span><span style={s("font-size:12.5px;color:#27272a;font-weight:500")}>arbeitsvertrag.pdf</span></div>
                </div>
                <span style={s("width:34px;height:34px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(37,99,235,0.4)")}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg></span>
                <div style={s("width:100%;max-width:330px;display:flex;align-items:center;gap:11px;background:#fff;border:1px solid rgba(16,185,129,0.3);border-radius:11px;padding:13px")}><span style={s("width:34px;height:34px;border-radius:50%;background:#ecfdf3;display:flex;align-items:center;justify-content:center;flex:none")}><Check stroke="#10b981" w={18} /></span><div><div style={s("font-size:13.5px;font-weight:600;color:#0c0c10")}>Automatisch erfasst &amp; analysiert</div><div style={s("font-size:11.5px;color:#059669;font-weight:500")}>Jetzt im Dashboard verfügbar</div></div></div>
              </div>
              <div className="ca-lp-rowtext" style={s("order:2")}>
                <span style={s("display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#2563eb;background:#eef3ff;border:1px solid rgba(37,99,235,0.2);padding:6px 13px;border-radius:999px")}><span style={s("font-weight:700;color:#2563eb")}>02</span><span style={s("width:1px;height:11px;background:rgba(37,99,235,0.3)")}></span>E-Mail Upload</span>
                <h2 style={s("font-size:clamp(26px,3vw,38px);font-weight:600;letter-spacing:-0.025em;line-height:1.08;margin:16px 0 0;color:#0c0c10")}>Verträge per E-Mail.<br /><span style={s(GRAD)}>Automatisch erfasst.</span></h2>
                <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Leiten Sie E-Mails mit Vertragsanhängen einfach an Ihre persönliche Contract&nbsp;AI Adresse weiter. PDFs werden automatisch erkannt, hochgeladen und analysiert.</p>
                <ul style={s("list-style:none;padding:0;margin:22px 0 0;display:flex;flex-direction:column;gap:13px")}>
                  {[
                    { b: "Zero Aufwand:", t: " Einfach E-Mail weiterleiten", icon: <><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4 20-7z"></path></> },
                    { b: "Auto-Erkennung:", t: " PDFs sofort verarbeitet", icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></> },
                    { b: "Jedes Postfach:", t: " Gmail, Outlook, Apple Mail", icon: <><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></> },
                    { b: "Instant Sync:", t: " Direkt im Dashboard", icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></> },
                  ].map((li, i) => (
                    <li key={i} style={s("display:flex;align-items:flex-start;gap:11px")}><span style={s("width:30px;height:30px;border-radius:8px;background:rgba(37,99,235,0.08);color:#2563eb;display:flex;align-items:center;justify-content:center;flex:none")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{li.icon}</svg></span><span style={s("font-size:15px;color:#27272a;line-height:1.5")}><strong style={s("color:#0c0c10")}>{li.b}</strong>{li.t}</span></li>
                  ))}
                </ul>
                <Link to="/features/email-upload" className="ca-lp-textlink" style={s("display:inline-flex;align-items:center;gap:7px;margin-top:24px;font-size:15px;font-weight:500;color:#2563eb;text-decoration:none")}>E-Mail Upload entdecken<Arrow /></Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FUNKTIONEN SHOWCASE (Videos) ===== */}
        <section style={s("padding:56px 24px;background:linear-gradient(180deg,#fafafb,#fff)")}>
          <div style={s("max-width:1200px;margin:0 auto")}>
            <div style={s("max-width:720px;margin:0 auto;text-align:center")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Funktionen</span>
              <h2 style={s("font-size:clamp(32px,4vw,50px);font-weight:600;letter-spacing:-0.03em;line-height:1.04;margin:14px 0 0;color:#0c0c10")}>Alles, was Sie für Ihre<br /><span style={s(GRAD)}>Verträge brauchen</span></h2>
              <p style={s("font-size:18px;line-height:1.6;color:#52525b;margin:16px 0 0")}>Von der Analyse bis zur Unterschrift – unsere KI-Tools automatisieren Ihren kompletten Vertragsworkflow.</p>
            </div>

            {showcase.map((row, i) => (
              <div key={i} style={s(`display:grid;grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr));gap:48px;align-items:center;margin-top:${i === 0 ? "64px" : "72px"}`)} className="ca-lp-reveal ca-lp-2col">
                <div className="ca-lp-rowtext" style={s(row.reverse ? "order:2" : "")}>
                  <div style={s(`display:inline-flex;align-items:center;gap:7px;font-family:'Geist Mono',monospace;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:${row.eyebrowColor};background:${row.eyebrowBg};border:1px solid ${row.eyebrowBorder};padding:5px 10px;border-radius:999px`)}>{row.eyIcon}{row.eyebrow}</div>
                  <h3 style={s("font-size:28px;font-weight:600;letter-spacing:-0.02em;color:#0c0c10;margin:18px 0 0")}>{row.titlePre}<span style={s(GRAD)}>{row.titleAccent}</span></h3>
                  <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>{row.text}</p>
                  <ul style={s("list-style:none;padding:0;margin:22px 0 0;display:flex;flex-direction:column;gap:11px")}>
                    {row.bullets.map((b, j) => <li key={j} style={s("display:flex;align-items:center;gap:10px;font-size:15px;color:#27272a")}><Check stroke={row.linkColor} w={18} />{b}</li>)}
                  </ul>
                  <Link to={row.to} className="ca-lp-textlink" style={s(`display:inline-flex;align-items:center;gap:7px;margin-top:24px;font-size:15px;font-weight:500;color:${row.linkColor};text-decoration:none`)}>{row.linkLabel}<Arrow /></Link>
                </div>
                <div className="ca-lp-rowgfx" style={s(`${row.reverse ? "order:1;" : ""}background:#fff;border:1px solid rgba(17,17,20,0.09);border-radius:16px;box-shadow:0 30px 60px -26px rgba(17,17,20,0.24);overflow:hidden`)}>
                  <div style={s("height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;border-bottom:1px solid rgba(17,17,20,0.06);background:#fbfbfd")}><span style={s("font-size:12px;color:#8a8a93;font-family:'Geist Mono',monospace")}>{row.label}</span></div>
                  <div className="ca-lp-video-frame" style={{ background: '#0f172a', display: 'block', lineHeight: 0, aspectRatio: '16 / 9' }}>
                    <AutoPlayVideo src={row.video} poster={row.poster} alt={row.linkLabel} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== WEITERE TOOLS ===== */}
        <section style={s("padding:64px 24px")}>
          <div style={s("max-width:1200px;margin:0 auto")}>
            <div style={s("text-align:center;max-width:600px;margin:0 auto")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Und vieles mehr</span>
              <h2 style={s("font-size:clamp(26px,3vw,38px);font-weight:600;letter-spacing:-0.02em;line-height:1.08;margin:14px 0 0;color:#0c0c10")}>Weitere <span style={s(GRAD)}>leistungsstarke Tools</span></h2>
            </div>
            <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:14px;margin-top:40px")} className="ca-lp-stagger">
              {tools.map((t, i) => (
                <Link key={i} to={t.to} className="ca-lp-toolcard" style={s("display:flex;align-items:center;gap:14px;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:14px;padding:18px;text-decoration:none")}>
                  <span style={s("width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,0.08);color:#2563eb;display:flex;align-items:center;justify-content:center;flex:none")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg></span>
                  <div style={s("flex:1")}><div style={s("font-size:15px;font-weight:600;color:#0c0c10")}>{t.title}</div><div style={s("font-size:13px;color:#71717a")}>{t.desc}</div></div>
                  <svg className="ca-lp-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4c4cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </Link>
              ))}
            </div>
            <div style={s("text-align:center;margin-top:30px")} className="ca-lp-reveal">
              <Link to="/features" className="ca-lp-textlink" style={s("display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:500;color:#2563eb;text-decoration:none")}>Alle Funktionen ansehen<Arrow w={15} /></Link>
            </div>
          </div>
        </section>

        {/* ===== VERTRAGSTYPEN ===== */}
        <section id="types" style={s("padding:72px 24px;background:linear-gradient(180deg,#ffffff,#eef3ff 14%,#eef3ff 86%,#ffffff);position:relative;overflow:hidden;isolation:isolate")}>
          <span style={s("position:absolute;z-index:-1;top:60px;right:5%;font-weight:700;font-size:130px;line-height:1;color:rgba(37,99,235,0.055);pointer-events:none;user-select:none;animation:caDriftB 18s ease-in-out infinite")}>§</span>
          <span style={s("position:absolute;z-index:-1;bottom:50px;left:4%;font-weight:700;font-size:100px;line-height:1;color:rgba(37,99,235,0.055);pointer-events:none;user-select:none;animation:caDriftA 21s ease-in-out infinite")}>¶</span>
          <div style={s("max-width:1200px;margin:0 auto")}>
            <div style={s("text-align:center;max-width:680px;margin:0 auto")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Vertragstypen</span>
              <h2 style={s("font-size:clamp(28px,3.4vw,44px);font-weight:600;letter-spacing:-0.025em;line-height:1.06;margin:14px 0 0;color:#0c0c10")}>Beliebte <span style={s(GRAD)}>Vertrags-Prüfungen</span></h2>
              <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Spezialisierte Analysen für die wichtigsten deutschen Vertragstypen — auf Basis aktueller BGH- und BAG-Rechtsprechung.</p>
            </div>
            <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:18px;margin-top:44px")} className="ca-lp-stagger">
              {types.map((t, i) => (
                <Link key={i} to={t.to} className="ca-lp-card ca-lp-card-type" style={s("display:block;padding:28px;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:18px;text-decoration:none")}>
                  <div style={s(`width:46px;height:46px;border-radius:12px;background:${t.bg};color:${t.color};display:flex;align-items:center;justify-content:center;margin-bottom:16px`)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg></div>
                  <h3 style={s("font-size:18px;font-weight:600;color:#0c0c10;margin:0 0 8px")}>{t.title}</h3>
                  <p style={s("font-size:14px;line-height:1.6;color:#71717a;margin:0 0 16px")}>{t.desc}</p>
                  <span style={s(`display:inline-flex;align-items:center;gap:5px;color:${t.color};font-weight:600;font-size:14px`)}>Jetzt prüfen<Arrow w={15} /></span>
                </Link>
              ))}
            </div>
            <p style={s("text-align:center;font-size:15px;line-height:1.6;color:#52525b;margin:34px auto 0;max-width:660px")} className="ca-lp-reveal">Ihr Vertrags- oder Dokumententyp ist nicht dabei? <strong style={s("color:#0c0c10;font-weight:600")}>Kein Problem</strong> – Contract&nbsp;AI analysiert jeden Vertrag tiefgründig, ganz gleich welcher Typ.</p>
          </div>
        </section>

        {/* ===== KUNDENSTIMMEN ===== */}
        <section id="voices" style={s("padding:64px 0 72px;background:radial-gradient(820px 480px at 14% 2%,rgba(6,182,212,0.06),transparent 58%);position:relative;overflow:hidden;isolation:isolate")}>
          <div style={s("max-width:1200px;margin:0 auto;padding:0 24px")}>
            <div style={s("text-align:center;max-width:640px;margin:0 auto")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Kundenstimmen</span>
              <h2 style={s("font-size:clamp(28px,3.4vw,44px);font-weight:600;letter-spacing:-0.025em;line-height:1.06;margin:14px 0 0;color:#0c0c10")}>Von Profis <span style={s(GRAD)}>empfohlen</span></h2>
              <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Warum über 500+ Unternehmen auf Contract&nbsp;AI vertrauen.</p>
              <div style={s("display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px 22px;margin-top:24px;padding:14px 22px;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:16px;box-shadow:0 10px 30px -18px rgba(17,17,20,0.18)")}>
                <div style={s("display:flex;align-items:center;gap:11px")}><span style={s("font-size:34px;font-weight:700;color:#0c0c10;letter-spacing:-0.02em;line-height:1")}>4,9</span><div style={s("text-align:left")}><div style={s("display:flex;gap:2px")}>{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</div><div style={s("font-size:12px;color:#71717a;margin-top:3px")}>aus 500+ Bewertungen</div></div></div>
                <div style={s("width:1px;height:34px;background:rgba(17,17,20,0.1)")}></div>
                <div style={s("display:flex;align-items:center;gap:8px;font-size:13.5px;color:#3f3f46;font-weight:500")}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>98% würden uns weiterempfehlen</div>
              </div>
            </div>
          </div>
          <div style={s("max-width:1180px;margin:40px auto 0;display:flex;flex-direction:column;gap:18px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 13%,#000 87%,transparent);mask-image:linear-gradient(90deg,transparent,#000 13%,#000 87%,transparent)")}>
            <div className="ca-lp-mq" style={{ "--ca-mq-gap": "18px", "--ca-mq-dur": "95s" } as React.CSSProperties}>
              <div className="ca-lp-mq-group">
                {[0, 1].flatMap((r) => voicesRow1.map((v, i) => <VoiceCard key={`v1a-${r}-${i}`} v={v} />))}
              </div>
              <div className="ca-lp-mq-group" aria-hidden="true">
                {[0, 1].flatMap((r) => voicesRow1.map((v, i) => <VoiceCard key={`v1b-${r}-${i}`} v={{ ...v, verified: false }} />))}
              </div>
            </div>
            <div className="ca-lp-mq ca-lp-mq-rev" style={{ "--ca-mq-gap": "18px", "--ca-mq-dur": "95s" } as React.CSSProperties}>
              <div className="ca-lp-mq-group">
                {[0, 1].flatMap((r) => voicesRow2.map((v, i) => <VoiceCard key={`v2a-${r}-${i}`} v={v} />))}
              </div>
              <div className="ca-lp-mq-group" aria-hidden="true">
                {[0, 1].flatMap((r) => voicesRow2.map((v, i) => <VoiceCard key={`v2b-${r}-${i}`} v={{ ...v, verified: false }} />))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== CHATGPT-EINWAND ===== */}
        <section style={s("padding:64px 24px")}>
          <div style={s("max-width:880px;margin:0 auto;background:#f4f4f7;border:1px solid rgba(17,17,20,0.07);border-radius:26px;padding:clamp(36px,5vw,64px);position:relative;overflow:hidden")} className="ca-lp-reveal">
            <div style={s("position:absolute;inset:0;pointer-events:none;background:radial-gradient(420px 280px at 85% 0%,rgba(37,99,235,0.10),transparent 60%),radial-gradient(420px 300px at 8% 100%,rgba(6,182,212,0.10),transparent 60%)")}></div>
            <div style={s("position:relative;text-align:center")}>
              <h2 style={s("font-size:clamp(24px,3vw,36px);font-weight:600;letter-spacing:-0.02em;line-height:1.2;color:#0c0c10;margin:0")}>„Kann ich nicht einfach <span style={s(GRAD)}>ChatGPT</span> benutzen?“</h2>
              <p style={s("font-size:17px;color:#71717a;margin:20px 0 0")}>Klar – für eine einmalige Frage.</p>
              <div style={s("display:flex;flex-direction:column;gap:10px;max-width:460px;margin:24px auto 0")}>
                {["Aber wer erinnert dich an Fristen?", "Wer prüft, ob sich Gesetze geändert haben?", "Wer behält 50 Verträge gleichzeitig im Blick?"].map((q, i) => (
                  <div key={i} style={s("display:flex;align-items:center;gap:11px;justify-content:center;background:#fff;border:1px solid rgba(17,17,20,0.08);border-radius:11px;padding:13px 16px")}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><span style={s("font-size:15px;color:#27272a")}>{q}</span></div>
                ))}
              </div>
              <div style={s("display:inline-flex;align-items:center;gap:9px;margin-top:26px;background:#ecfdf3;border:1px solid #c8f0d8;border-radius:999px;padding:10px 20px")}><Check stroke="#059669" w={18} /><span style={s("font-size:15px;font-weight:600;color:#065f46")}>Contract&nbsp;AI. Automatisch. 24/7.</span></div>
            </div>
          </div>
        </section>

        {/* ===== VERGLEICHSTABELLE ===== */}
        <section style={s("padding:64px 24px;background:#ffffff;position:relative;overflow:hidden;isolation:isolate")}>
          <div style={s("max-width:980px;margin:0 auto")}>
            <div style={s("text-align:center;max-width:640px;margin:0 auto")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Im Vergleich</span>
              <h2 style={s("font-size:clamp(28px,3.4vw,44px);font-weight:600;letter-spacing:-0.025em;line-height:1.06;margin:14px 0 0;color:#0c0c10")}>Warum <span style={s(GRAD)}>Contract&nbsp;AI</span>?</h2>
              <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Dieselbe Sicherheit wie beim Anwalt – in Sekunden statt Tagen, zum Bruchteil der Kosten.</p>
            </div>
            <div style={s("margin-top:44px;overflow-x:auto")} className="ca-lp-reveal">
              <div className="ca-lp-cmp" style={s("min-width:640px;border:1px solid rgba(17,17,20,0.08);border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 30px 60px -40px rgba(17,17,20,0.2)")}>
                <div style={s("display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;background:#fafafb;border-bottom:1px solid rgba(17,17,20,0.08)")}>
                  <div style={s("padding:18px 20px")}>&nbsp;</div>
                  <div style={s("padding:18px 14px;text-align:center;background:linear-gradient(180deg,rgba(37,99,235,0.1),rgba(37,99,235,0.04));border-left:1px solid rgba(37,99,235,0.18);border-right:1px solid rgba(37,99,235,0.18)")}><span style={s("display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:#2563eb")}><svg width="15" height="15" viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#2563eb"></rect><path d="M8 14.4l3.8 3.8L20 9.2" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"></path></svg>Contract&nbsp;AI</span></div>
                  <div style={s("padding:18px 14px;text-align:center;font-size:14px;font-weight:600;color:#52525b")}>Anwalt</div>
                  <div style={s("padding:18px 14px;text-align:center;font-size:14px;font-weight:600;color:#52525b")}>ChatGPT</div>
                </div>
                {compRows.map((r, i) => (
                  <div key={i} style={s(`display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr${i < compRows.length - 1 ? ";border-bottom:1px solid rgba(17,17,20,0.06)" : ""}`)}>
                    <div style={s("padding:16px 20px;font-size:14.5px;color:#27272a;font-weight:500")}>{r.label}</div>
                    <CompCell v={r.ca} highlight />
                    <CompCell v={r.anwalt} />
                    <CompCell v={r.gpt} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== PREISE (Design-Karten, echte Preise) ===== */}
        <section id="pricing" style={s("padding:64px 24px 80px;background:linear-gradient(180deg,#ffffff,#eef3ff 13%,#eef3ff 87%,#ffffff);position:relative;overflow:hidden;isolation:isolate")}>
          <span style={s("position:absolute;z-index:-1;top:70px;left:5%;font-weight:700;font-size:140px;line-height:1;color:rgba(37,99,235,0.055);pointer-events:none;user-select:none;animation:caDriftB 18s ease-in-out infinite")}>€</span>
          <span style={s("position:absolute;z-index:-1;bottom:60px;right:5%;font-weight:700;font-size:130px;line-height:1;color:rgba(37,99,235,0.055);pointer-events:none;user-select:none;animation:caDriftA 15s ease-in-out infinite")}>%</span>
          <div style={s("max-width:1200px;margin:0 auto")}>
            <div style={s("text-align:center;max-width:640px;margin:0 auto")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>Preise</span>
              <h2 style={s("font-size:clamp(28px,3.4vw,44px);font-weight:600;letter-spacing:-0.025em;line-height:1.06;margin:14px 0 0;color:#0c0c10")}>Einfach &amp; <span style={s(GRAD)}>transparent</span></h2>
              <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Wählen Sie den Plan, der zu Ihnen passt. Jederzeit kündbar.</p>
              <div style={s("display:inline-flex;align-items:center;gap:4px;margin-top:28px;padding:5px;background:#f1f1f5;border-radius:13px;position:relative")}>
                <button type="button" className={"ca-lp-toggle-btn" + (billing === 'monthly' ? " ca-active" : "")} onClick={() => setBilling('monthly')}>Monatlich</button>
                <button type="button" className={"ca-lp-toggle-btn" + (billing === 'yearly' ? " ca-active" : "")} onClick={() => setBilling('yearly')}>Jährlich</button>
                <span style={s("margin-left:8px;margin-right:6px;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:#059669;background:#ecfdf3;border:1px solid #c8f0d8;border-radius:999px;padding:4px 10px")}>2 Monate gratis</span>
              </div>
            </div>
            <div style={s("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:20px;margin-top:48px;align-items:stretch")} className="ca-lp-stagger ca-lp-pricegrid">
              {/* Starter */}
              <div className="ca-lp-pricecard" style={s("background:#fff;border:1px solid rgba(17,17,20,0.1);border-radius:20px;padding:32px;display:flex;flex-direction:column")}>
                <h3 style={s("font-size:17px;font-weight:600;color:#0c0c10;margin:0")}>Starter</h3>
                <p style={s("font-size:13.5px;color:#71717a;margin:6px 0 0")}>Zum Ausprobieren</p>
                <div style={s("display:flex;align-items:baseline;gap:4px;margin:22px 0 0")}><span style={s("font-size:44px;font-weight:700;letter-spacing:-0.03em;color:#0c0c10")}>0€</span><span style={s("font-size:14px;color:#9a9aa3")}>/ Monat</span></div>
                <Link to="/register" className="ca-lp-btn-secondary" style={s("display:flex;align-items:center;justify-content:center;gap:7px;margin:24px 0 0;background:#fff;color:#111114;border:1px solid #e3e4e9;font-size:15px;font-weight:500;padding:13px;border-radius:11px;text-decoration:none")}>Kostenlos starten</Link>
                <div style={s("height:1px;background:rgba(17,17,20,0.07);margin:24px 0")}></div>
                <ul style={s("list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px")}>
                  {["3 KI-Vertragsanalysen kostenlos", "Risiko-Score & Smart Summary", "Fristen-Erinnerungen", "DSGVO-konforme Speicherung"].map((f, i) => (
                    <li key={i} style={s("display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#3f3f46")}><span style={s("margin-top:1px;flex:none")}><Check w={17} /></span>{f}</li>
                  ))}
                </ul>
              </div>
              {/* Business */}
              <div className="ca-lp-pricecard" style={s("background:#fff;border:1px solid rgba(17,17,20,0.1);border-radius:20px;padding:32px;display:flex;flex-direction:column")}>
                <h3 style={s("font-size:17px;font-weight:600;color:#0c0c10;margin:0")}>Business</h3>
                <p style={s("font-size:13.5px;color:#71717a;margin:6px 0 0")}>Für aktive Vertragsprofis</p>
                <div style={s("display:flex;align-items:flex-end;gap:8px;margin:22px 0 0")}>
                  <span style={s("display:flex;align-items:baseline;gap:3px")}><span style={s("font-size:44px;font-weight:700;letter-spacing:-0.03em;color:#0c0c10;line-height:1")}>{biz.price}</span><span style={s("font-size:24px;font-weight:600;color:#0c0c10")}>€</span></span>
                  <span style={s("font-size:14px;color:#9a9aa3;padding-bottom:5px")}>/ Monat</span>
                  <span style={s("font-size:17px;color:#c4c4cc;text-decoration:line-through;padding-bottom:6px")}>{biz.old}€</span>
                </div>
                <div style={s("display:flex;align-items:center;gap:8px;margin-top:10px;min-height:24px")}>
                  <span style={s("font-size:12.5px;color:#9a9aa3")}>{biz.note}</span>
                  {biz.save && <span style={s("display:inline-flex;align-items:center;font-size:11.5px;font-weight:600;color:#059669;background:#ecfdf3;border:1px solid #c8f0d8;border-radius:999px;padding:3px 9px")}>{biz.save}</span>}
                </div>
                <Link to="/pricing" className="ca-lp-btn-secondary" style={s("display:flex;align-items:center;justify-content:center;gap:7px;margin:24px 0 0;background:#fff;color:#111114;border:1px solid #e3e4e9;font-size:15px;font-weight:500;padding:13px;border-radius:11px;text-decoration:none")}>Business wählen<Arrow /></Link>
                <p style={s("font-size:11.5px;color:#9a9aa3;text-align:center;margin:9px 0 0")}>Keine Kreditkarte nötig</p>
                <div style={s("height:1px;background:rgba(17,17,20,0.07);margin:24px 0")}></div>
                <ul style={s("list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px")}>
                  {["25 KI-Analysen / Monat", "Optimierung & Vergleich", "KI-Chat & Legal Lens", "Digitale Signaturen"].map((f, i) => (
                    <li key={i} style={s("display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#3f3f46")}><span style={s("margin-top:1px;flex:none")}><Check w={17} /></span>{f}</li>
                  ))}
                </ul>
              </div>
              {/* Enterprise (Meist gewählt) */}
              <div className="ca-lp-pricecard-pop" style={s("background:linear-gradient(180deg,#f5f8ff,#ffffff);border:2px solid #2563eb;border-radius:20px;padding:32px;display:flex;flex-direction:column;position:relative;box-shadow:0 30px 60px -24px rgba(37,99,235,0.35)")}>
                <span style={s("position:absolute;top:20px;right:20px;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#fff;background:#2563eb;border-radius:999px;padding:5px 11px;display:inline-flex;align-items:center;gap:5px")}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"></polygon></svg>Meist gewählt</span>
                <h3 style={s("font-size:17px;font-weight:600;color:#0c0c10;margin:0")}>Enterprise</h3>
                <p style={s("font-size:13.5px;color:#71717a;margin:6px 0 0")}>Für Teams &amp; Agenturen</p>
                <div style={s("display:flex;align-items:flex-end;gap:8px;margin:22px 0 0")}>
                  <span style={s("display:flex;align-items:baseline;gap:3px")}><span style={s("font-size:44px;font-weight:700;letter-spacing:-0.03em;color:#0c0c10;line-height:1")}>{ent.price}</span><span style={s("font-size:24px;font-weight:600;color:#0c0c10")}>€</span></span>
                  <span style={s("font-size:14px;color:#9a9aa3;padding-bottom:5px")}>/ Monat</span>
                  <span style={s("font-size:17px;color:#c4c4cc;text-decoration:line-through;padding-bottom:6px")}>{ent.old}€</span>
                </div>
                <div style={s("display:flex;align-items:center;gap:8px;margin-top:10px;min-height:24px")}>
                  <span style={s("font-size:12.5px;color:#9a9aa3")}>{ent.note}</span>
                  {ent.save && <span style={s("display:inline-flex;align-items:center;font-size:11.5px;font-weight:600;color:#059669;background:#ecfdf3;border:1px solid #c8f0d8;border-radius:999px;padding:3px 9px")}>{ent.save}</span>}
                </div>
                <Link to="/pricing" className="ca-lp-btn-primary" style={s("display:flex;align-items:center;justify-content:center;gap:7px;margin:24px 0 0;background:#2563eb;color:#fff;font-size:15px;font-weight:500;padding:13px;border-radius:11px;text-decoration:none")}>Enterprise wählen<Arrow /></Link>
                <p style={s("font-size:11.5px;color:#2563eb;text-align:center;margin:9px 0 0;font-weight:500")}>14 Tage Geld-zurück-Garantie</p>
                <div style={s("height:1px;background:rgba(17,17,20,0.07);margin:24px 0")}></div>
                <div style={s("font-size:12px;font-weight:600;color:#2563eb;margin:0 0 12px")}>Alles aus Business, plus:</div>
                <ul style={s("list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px")}>
                  {["Unbegrenzte Analysen", "Alle Features inklusive", "Team-Management", "API-Zugang"].map((f, i) => (
                    <li key={i} style={s("display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#3f3f46")}><span style={s("margin-top:1px;flex:none")}><Check w={17} /></span>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div style={s("display:flex;flex-wrap:wrap;gap:14px 28px;justify-content:center;align-items:center;margin-top:32px")} className="ca-lp-reveal">
              <span style={s("display:inline-flex;align-items:center;gap:8px;font-size:14px;color:#3f3f46;font-weight:500")}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>14 Tage Geld-zurück-Garantie</span>
              <span style={s("display:inline-flex;align-items:center;gap:8px;font-size:14px;color:#3f3f46;font-weight:500")}><Check stroke="#059669" w={18} sw="2.2" />Keine Mindestlaufzeit</span>
              <span style={s("display:inline-flex;align-items:center;gap:8px;font-size:14px;color:#3f3f46;font-weight:500")}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>In 60 Sekunden startklar</span>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section style={s("padding:72px 24px;background:linear-gradient(180deg,#ffffff,#eef3ff 14%,#eef3ff 86%,#ffffff);position:relative;overflow:hidden;isolation:isolate")}>
          <span style={s("position:absolute;z-index:-1;top:50px;left:6%;font-weight:700;font-size:120px;line-height:1;color:rgba(37,99,235,0.05);pointer-events:none;user-select:none;animation:caDriftA 18s ease-in-out infinite")}>?</span>
          <span style={s("position:absolute;z-index:-1;bottom:40px;right:7%;font-weight:700;font-size:90px;line-height:1;color:rgba(37,99,235,0.045);pointer-events:none;user-select:none;animation:caDriftB 16s ease-in-out infinite")}>?</span>
          <div style={s("max-width:780px;margin:0 auto")}>
            <div style={s("text-align:center;max-width:600px;margin:0 auto")} className="ca-lp-reveal">
              <span style={s("font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb")}>FAQ</span>
              <h2 style={s("font-size:clamp(28px,3.4vw,44px);font-weight:600;letter-spacing:-0.025em;line-height:1.06;margin:14px 0 0;color:#0c0c10")}>Häufige <span style={s(GRAD)}>Fragen</span></h2>
              <p style={s("font-size:17px;line-height:1.6;color:#52525b;margin:14px 0 0")}>Alles, was Sie vor dem Start wissen müssen.</p>
            </div>
            <div style={s("display:flex;flex-direction:column;gap:12px;margin-top:40px")} className="ca-lp-reveal">
              {faqs.map((f, i) => (
                <details key={i} className="ca-lp-faq" style={s("background:#fff;border:1px solid rgba(17,17,20,0.09);border-radius:14px;padding:4px 20px")}>
                  <summary style={s("display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;padding:16px 0")}><span className="ca-lp-faq-q" style={s("font-size:16px;font-weight:600;color:#0c0c10;transition:color .2s")}>{f.q}</span><svg className="ca-lp-faq-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={s("flex:none")}><polyline points="6 9 12 15 18 9"></polyline></svg></summary>
                  <p style={s("font-size:15px;line-height:1.65;color:#52525b;margin:0 0 16px")}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={s("padding:24px 24px 88px")}>
          <div style={s("max-width:1080px;margin:0 auto;background:linear-gradient(135deg,#1e40af,#2563eb 42%,#06b6d4);border-radius:32px;padding:clamp(40px,5vw,76px) clamp(28px,4vw,64px);text-align:center;position:relative;overflow:hidden")} className="ca-lp-reveal ca-lp-finalcta">
            <div style={s("position:absolute;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.16),transparent 70%);top:-140px;right:-80px;pointer-events:none;animation:caFloatSlow 9s ease-in-out infinite")}></div>
            <div style={s("position:relative")}>
              <div style={s("display:inline-flex;align-items:center;gap:11px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);border-radius:999px;padding:6px 15px 6px 7px;margin-bottom:24px")}>
                <div style={{ display: 'flex' }}>
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" width="26" height="26" style={s("border-radius:50%;border:2px solid #fff;object-fit:cover")} alt="" loading="lazy" />
                  <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" width="26" height="26" style={s("border-radius:50%;border:2px solid #fff;object-fit:cover;margin-left:-9px")} alt="" loading="lazy" />
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" width="26" height="26" style={s("border-radius:50%;border:2px solid #fff;object-fit:cover;margin-left:-9px")} alt="" loading="lazy" />
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face" width="26" height="26" style={s("border-radius:50%;border:2px solid #fff;object-fit:cover;margin-left:-9px")} alt="" loading="lazy" />
                </div>
                <span style={s("font-size:13px;color:#fff;font-weight:500")}><span style={s("letter-spacing:1px")}>★★★★★</span> &nbsp;500+ zufriedene Nutzer</span>
              </div>
              <h2 style={s("font-size:clamp(32px,4.6vw,56px);font-weight:600;letter-spacing:-0.035em;line-height:1.04;color:#fff;margin:0")}>Ihr nächster Vertrag<br />verdient einen Profi-Check.</h2>
              <p style={s("font-size:19px;line-height:1.55;color:rgba(255,255,255,0.92);margin:20px auto 0;max-width:540px")}>Lade deinen ersten Vertrag hoch und erhalte in 60&nbsp;Sekunden eine vollständige Risiko-Analyse – <strong style={s("color:#fff;font-weight:600")}>kostenlos und unverbindlich.</strong></p>
              <div style={s("display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:36px")}>
                <Link to={!user ? "/register" : "/dashboard"} style={s("display:inline-flex;align-items:center;gap:9px;background:#fff;color:#1e40af;font-size:18px;font-weight:600;padding:18px 36px;border-radius:13px;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,0.22)")}>Jetzt kostenlos starten<Arrow w={19} /></Link>
                <Link to="/pricing" style={s("display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.14);color:#fff;font-size:16px;font-weight:500;padding:18px 28px;border-radius:13px;text-decoration:none;border:1px solid rgba(255,255,255,0.35)")}>Preise ansehen</Link>
              </div>
              <p style={s("font-size:14px;color:rgba(255,255,255,0.85);margin:18px 0 0;font-weight:500")}>Keine Kreditkarte nötig · 3 Analysen gratis · In 60 Sekunden startklar</p>
              <div style={s("height:1px;background:rgba(255,255,255,0.18);margin:36px auto 0;max-width:560px")}></div>
              <div style={s("display:flex;flex-wrap:wrap;gap:14px 28px;justify-content:center;margin-top:26px")}>
                {[
                  { t: "DSGVO-konform", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></> },
                  { t: "14-Tage-Geld-zurück-Garantie", icon: <polyline points="20 6 9 17 4 12"></polyline> },
                  { t: "Jederzeit kündbar", icon: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></> },
                  { t: "Deutsche Server", icon: <><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></> },
                ].map((b, i) => (
                  <span key={i} style={s("display:inline-flex;align-items:center;gap:7px;font-size:13.5px;color:rgba(255,255,255,0.92);font-weight:500")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{b.icon}</svg>{b.t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer style={s("background:#f4f4f7;border-top:1px solid rgba(17,17,20,0.08);padding:64px 24px 36px")}>
          <div style={s("max-width:1200px;margin:0 auto")}>
            <div style={s("display:flex;flex-wrap:wrap;gap:48px 40px;align-items:flex-start")}>
              <div style={s("flex:1 1 280px;max-width:360px")}>
                <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:16px")}><img src={logoHeader} alt="Contract AI" style={{ height: 28, width: 'auto' }} /></div>
                <p style={s("font-size:14px;line-height:1.65;color:#52525b;margin:0 0 18px")}>Contract&nbsp;AI revolutioniert Ihr Vertragsmanagement mit neuester KI-Technologie. Wir helfen Ihnen, Verträge zu analysieren, optimieren und verwalten.</p>
                <div style={s("display:flex;gap:10px")}><span style={s("font-size:11px;font-weight:600;color:#3f3f46;background:#fff;border:1px solid rgba(17,17,20,0.1);border-radius:8px;padding:6px 12px")}>DSGVO-konform</span><span style={s("font-size:11px;font-weight:600;color:#3f3f46;background:#fff;border:1px solid rgba(17,17,20,0.1);border-radius:8px;padding:6px 12px")}>★ Trustpilot</span></div>
              </div>
              {[
                { h: "Funktionen", links: [["KI-Vertragsanalyse", "/ki-vertragsanalyse"], ["Vertragsanalyse", "/features/vertragsanalyse"], ["Optimierung", "/features/optimierung"], ["Fristen", "/features/fristen"], ["Vergleich", "/features/vergleich"], ["Generator", "/features/generator"], ["Legal Pulse", "/features/legalpulse"], ["Vertragsverwaltung", "/features/vertragsverwaltung"], ["Digitale Signatur", "/features/digitalesignatur"], ["E-Mail Upload", "/features/email-upload"], ["Contract Builder", "/features/contract-builder"], ["Legal Lens", "/features/legal-lens"]] },
                { h: "Verträge prüfen", links: [["Arbeitsvertrag prüfen", "/arbeitsvertrag-pruefen"], ["Mietvertrag prüfen", "/mietvertrag-pruefen"], ["NDA prüfen", "/nda-pruefen"], ["Kaufvertrag prüfen", "/kaufvertrag-pruefen"], ["Agenturvertrag prüfen", "/agenturvertrag-pruefen"], ["Rechtslexikon", "/rechtslexikon"]] },
              ].map((col, ci) => (
                <div key={ci} style={s("flex:1 1 150px")}>
                  <h4 style={s("font-size:12px;font-family:'Geist Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;margin:0 0 16px")}>{col.h}</h4>
                  <ul style={s("list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px")}>
                    {col.links.map(([t, to], i) => <li key={i}><Link to={to} className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>{t}</Link></li>)}
                  </ul>
                </div>
              ))}
              <div style={s("flex:1 1 150px")}>
                <h4 style={s("font-size:12px;font-family:'Geist Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;margin:0 0 16px")}>Unternehmen</h4>
                <ul style={s("list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px")}>
                  <li><a href="mailto:info@contract-ai.de" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Kontakt</a></li>
                  <li><Link to="/about" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Über uns</Link></li>
                  <li><Link to="/fuer-agenturen" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Für Agenturen &amp; Teams</Link></li>
                  <li><Link to="/hilfe" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Hilfe</Link></li>
                  <li><Link to="/blog" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Blog</Link></li>
                  <li><Link to="/press" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Presse</Link></li>
                </ul>
              </div>
              <div style={s("flex:1 1 150px")}>
                <h4 style={s("font-size:12px;font-family:'Geist Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;margin:0 0 16px")}>Rechtliches</h4>
                <ul style={s("list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px")}>
                  <li><Link to="/datenschutz" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Datenschutz</Link></li>
                  <li><Link to="/agb" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>AGB</Link></li>
                  <li><Link to="/impressum" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>Impressum</Link></li>
                  <li><a role="button" tabIndex={0} onClick={handleOpenCookieSettings} className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none;cursor:pointer")}>Cookie-Einstellungen</a></li>
                </ul>
              </div>
            </div>
            <div style={s("display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;margin-top:48px;padding-top:24px;border-top:1px solid rgba(17,17,20,0.08)")}>
              <p style={s("font-size:13px;color:#71717a;margin:0")}>© 2026 Contract&nbsp;AI. Alle Rechte vorbehalten.</p>
              <div style={s("display:flex;gap:10px")}>
                <a href="https://www.linkedin.com/company/contract-ai" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="ca-lp-social" style={s("width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid rgba(17,17,20,0.1);display:flex;align-items:center;justify-content:center;color:#71717a")}><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>
                <a href="https://www.instagram.com/contract_ai" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="ca-lp-social" style={s("width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid rgba(17,17,20,0.1);display:flex;align-items:center;justify-content:center;color:#71717a")}><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-.5a1 1 0 100 2 1 1 0 000-2z"></path></svg></a>
                <a href="https://www.facebook.com/contractai" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="ca-lp-social" style={s("width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid rgba(17,17,20,0.1);display:flex;align-items:center;justify-content:center;color:#71717a")}><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
              </div>
            </div>
          </div>
        </footer>

        {/* ===== Sticky Floating CTA ===== */}
        <Link to={!user ? "/register" : "/dashboard"} className={"ca-lp-floatcta" + (showFloat ? " ca-in" : "")} style={s("position:fixed;right:22px;bottom:22px;z-index:90;display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;padding:14px 22px;border-radius:999px;text-decoration:none;box-shadow:0 14px 34px rgba(37,99,235,0.45);opacity:0;transform:translateY(20px);pointer-events:none")}>Kostenlos starten<Arrow /></Link>

      </div>
    </>
  );
};

export default HomeRedesign;

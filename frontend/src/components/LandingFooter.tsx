import React from "react";
import { Link } from "react-router-dom";
import logoHeader from "../assets/logo-header.webp";
import dsgvoBadge from "../assets/dsgvo-badge.webp";
import trustpilotBadge from "../assets/trustpilot-badge.webp";
import "./LandingFooter.css";

declare global {
  interface Window { openCookieSettings?: () => void; }
}

// Inline-CSS-Helfer (identisch zur Landing) — wandelt "a:b;c:d" in ein Style-Objekt
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

/**
 * LandingFooter — der Footer aus dem Landing-Redesign, als wiederverwendbare,
 * voll gescopete Komponente (Klasse .lp-footer → kein globales CSS-Leck).
 * Wird auf der Landing (HomeRedesign) und der Pricing-Seite genutzt = eine Quelle.
 */
export default function LandingFooter() {
  const handleOpenCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.openCookieSettings) window.openCookieSettings();
  };

  return (
    <footer className="lp-footer" style={s("background:#f4f4f7;border-top:1px solid rgba(17,17,20,0.08);padding:64px 24px 36px")}>
      <div style={s("max-width:1200px;margin:0 auto")}>
        <div style={s("display:flex;flex-wrap:wrap;gap:48px 40px;align-items:flex-start")}>
          <div style={s("flex:1 1 280px;max-width:360px")}>
            <div style={s("display:flex;align-items:center;gap:10px;margin-bottom:16px")}><img src={logoHeader} alt="Contract AI" style={{ height: 28, width: 'auto' }} /></div>
            <p style={s("font-size:14px;line-height:1.65;color:#52525b;margin:0 0 18px")}>Contract&nbsp;AI revolutioniert Ihr Vertragsmanagement mit neuester KI-Technologie. Wir helfen Ihnen, Verträge zu analysieren, optimieren und verwalten.</p>
            <div className="lp-trust-badges">
              <img src={dsgvoBadge} alt="DSGVO-konform" className="lp-trust-badge" loading="lazy" />
              <img src={trustpilotBadge} alt="Trustpilot Bewertungen" className="lp-trust-badge" loading="lazy" />
            </div>
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
              <li><a href="/AVV_Contract-AI_v2.1.pdf" target="_blank" rel="noreferrer" className="ca-lp-footer-link" style={s("font-size:14px;color:#52525b;text-decoration:none")}>AVV (PDF)</a></li>
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
  );
}

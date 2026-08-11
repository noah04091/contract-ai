// 📁 PulseKlartextV3.tsx — „Klartext-Redesign" (05.08.2026), Phase 1
//
// Übersichts-Bausteine der Klartext-Ansicht:
//   - usePulseLayoutV3(): ?ansicht=neu / ?ansicht=alt → localStorage.
//     ⚡ STANDARD SEIT 11.08.2026: AN (scharfgeschaltet nach Noahs Alltagstest).
//   - PulseStatusHeroV3:  Ein-Satz-Verdikt (Ampel) + Score mit Deutung + Anker-Chips.
//   - RechtsCheckStage:   „Bühne" um das bestehende LegalAlertsPanel — Eyebrow +
//                         sichtbare Prozess-Kette (X Gesetze → Y Verträge → Z Treffer).
//
// WICHTIG: Die alte Ansicht (PulseCommandCenter etc.) bleibt vollständig im Code und
// ist über `?ansicht=alt` jederzeit erreichbar — der Rückbau erfolgt bewusst erst nach
// einer Bewährungszeit. Rückweg = Schalter, NIE Git-Revert; damit bleiben parallele
// Arbeiten anderer Terminals in jedem Fall unberührt.
// Mockup-Referenz: Artifact „pulse-klartext-mockup" v6 (echte Daten, von Noah iteriert).

import React, { useState, useEffect } from 'react';
import type { PulseV2LegalAlert, PulseV2Action } from '../../types/pulseV2';
import styles from '../../styles/PulseV2.module.css';

// ─── Schalter ────────────────────────────────────────────────────────────────
// Hinweis zur Stabilität (TÜV 06.08.): Der Hook liest nur beim MOUNT. Das ist heute
// sicher, weil PulseV2.tsx beim Wechsel Dashboard↔Vertragsseite immer voll re-mountet
// (verschiedene Komponententypen an derselben Position). Wer künftig Query-only-
// Navigation auf derselben Route einführt, muss diesen Hook auf Location-Changes hören lassen.
const LS_KEY = 'pulse.layoutV3';

export function usePulseLayoutV3(): boolean {
  // Lesen beim Mount (kein Seiteneffekt im Render) …
  const [enabled] = useState(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('ansicht');
      if (param === 'neu') return true;
      if (param === 'alt') return false;
      // SCHARFGESCHALTET 11.08.2026 (Noahs Abnahme nach Alltagstest seit 06.08.):
      // Standard ist jetzt die Klartext-Ansicht. Nur wer sie ausdrücklich per
      // `?ansicht=alt` abgewählt hat (localStorage '0'), bekommt weiterhin die alte.
      // Rückweg bleibt der Schalter — NIE per Git-Revert (Parallel-Terminal-sicher).
      return localStorage.getItem(LS_KEY) !== '0';
    } catch (err) {
      console.warn('[PulseV2] Ansicht-Schalter nicht lesbar (z. B. Private Mode) — nutze Standard-Ansicht.', err);
      return true; // Private Mode o. ä.: Standard = Klartext, wie für alle anderen auch
    }
  });
  // … Persistieren als echter Effekt (TÜV-Fix: setItem gehört nicht in den Render-Pfad)
  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('ansicht');
      if (param === 'neu') localStorage.setItem(LS_KEY, '1');
      else if (param === 'alt') localStorage.setItem(LS_KEY, '0');
    } catch { /* Private Mode o. ä. — Schalter gilt dann nur für diesen Aufruf */ }
  }, []);
  return enabled;
}

// ─── Helfer ──────────────────────────────────────────────────────────────────
const isToday = (iso: string | null | undefined): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); } catch { return ''; }
};

const isOpen = (a: PulseV2LegalAlert) => a.status === 'unread' || a.status === 'read';

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ─── Status-Hero ─────────────────────────────────────────────────────────────
interface StatusHeroProps {
  alerts: PulseV2LegalAlert[];
  actions: PulseV2Action[];
  monitoredCount: number;
  avgScore: number | null;
  insightsCount: number;
  analyzedCount: number;
  lastRadarRun: string | null;
}

const AMPEL = {
  g: { color: '#059669', halo: '#d1fae5' },
  y: { color: '#d97706', halo: '#fef3c7' },
  r: { color: '#dc2626', halo: '#fee2e2' },
};

export const PulseStatusHeroV3: React.FC<StatusHeroProps> = ({
  alerts, actions, monitoredCount, avgScore, insightsCount, analyzedCount, lastRadarRun,
}) => {
  const openAlerts = alerts.filter(isOpen);
  const newToday = openAlerts.filter(a => isToday(a.createdAt)).length;
  const urgentActions = actions.filter(a => a.status === 'open' && a.priority === 'now').length;
  const openActions = actions.filter(a => a.status === 'open').length;
  const points = openAlerts.length + urgentActions;

  const ampel = points === 0 ? AMPEL.g : (newToday > 0 ? AMPEL.r : AMPEL.y);

  let title: string;
  let sub: React.ReactNode;
  if (points === 0) {
    title = 'Alles in Ordnung — nichts zu tun';
    sub = <>Der tägliche Rechts-Check hat keine offenen Punkte für dich. <b style={{ color: '#0f172a' }}>{monitoredCount} {monitoredCount === 1 ? 'Vertrag steht' : 'Verträge stehen'}</b> unter Beobachtung — wir melden uns, wenn sich etwas ändert.</>;
  } else if (newToday > 0) {
    title = newToday === 1 ? '1 neuer Punkt seit heute Morgen' : `${newToday} neue Punkte seit heute Morgen`;
    {/* TÜV-Fix 06.08.: kein „Du hast eine E-Mail bekommen"-Versprechen — Alerts aus der
        Nachprüfung neuer Analysen laufen bewusst OHNE Mail (skipEmail), der Satz wäre gelogen. */}
    sub = <>Der Rechts-Check hat Neues gefunden — Details unten, das Dringendste zuerst.</>;
  } else {
    title = points === 1 ? '1 Punkt braucht deine Aufmerksamkeit' : `${points} Punkte brauchen deine Aufmerksamkeit`;
    // Eigenfund 06.08.: Die Zusammensetzung erklären — sonst kann niemand die Kopf-Zahl
    // mit den Zahlen der Sektionen darunter zusammenrechnen (7 vs. 4 vs. 9).
    const composition = openAlerts.length > 0 && urgentActions > 0
      ? <> ({openAlerts.length} Gesetzes-Treffer + {urgentActions} dringende Aufgabe{urgentActions === 1 ? '' : 'n'})</>
      : null;
    sub = <>Details unten — beginn mit dem obersten{composition}. Alles andere ist in Ordnung, <b style={{ color: '#0f172a' }}>{monitoredCount} {monitoredCount === 1 ? 'Vertrag steht' : 'Verträge stehen'}</b> unter Beobachtung{lastRadarRun ? <> — zuletzt geprüft {isToday(lastRadarRun) ? `heute ${fmtTime(lastRadarRun)}` : `am ${fmtDate(lastRadarRun)}`}</> : null}.</>;
  }

  const scoreDeutung = avgScore === null ? '' : avgScore >= 67 ? 'gut' : avgScore >= 40 ? 'mittel' : 'schwach';
  const scoreColor = avgScore === null ? '#94a3b8' : avgScore >= 67 ? '#059669' : avgScore >= 40 ? '#d97706' : '#dc2626';

  // UI-Audit 06.08.: Chips ohne Inhalt (0 Aufgaben / 0 Auffälligkeiten) nicht anbieten —
  // ein Klick würde ins Leere scrollen, weil die Ziel-Sektion dann gar nicht rendert.
  // Icon-Entscheidung 06.08. (Noah): Profi-Standard = SVG oder gar kein Icon — Emojis
  // rendern auf jedem Gerät anders. Die Chips tragen ihren Text allein.
  const chips: Array<{ label: string; id: string }> = [
    { label: 'Rechts-Check', id: 'legal-alerts' },
    ...(openActions > 0 ? [{ label: `Aufgaben (${openActions})`, id: 'pulse-tasks' }] : []),
    { label: `Verträge (${analyzedCount})`, id: 'pulse-contracts' },
    ...(insightsCount > 0 ? [{ label: `Auffälligkeiten (${insightsCount})`, id: 'pulse-portfolio' }] : []),
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, marginBottom: 20, boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 10px 28px rgba(15,23,42,.06)' }}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', gap: 13, alignItems: 'center', margin: 0, color: '#0f172a' }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0, background: ampel.color, boxShadow: `0 0 0 5px ${ampel.halo}` }} />
            <span>{title}</span>
          </h1>
          <p style={{ color: '#475569', marginTop: 8, maxWidth: 640, fontSize: 14, lineHeight: 1.55 }}>{sub}</p>
        </div>
        {avgScore !== null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: `conic-gradient(${scoreColor} 0 ${avgScore}%, #e2e8f0 ${avgScore}% 100%)` }}>
              <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: '#0f172a' }}>{avgScore}</span>
                <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>von 100</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 7, fontWeight: 600 }}>Vertrags-Gesundheit: {scoreDeutung}</div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
              {points === 0 ? 'Bleibt stabil, solange nichts Neues auftaucht.' : 'Erledigst du die offenen Punkte, steigt der Wert.'}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px dashed #e2e8f0', alignItems: 'center' }}>
        {chips.map(c => (
          <button key={c.id} className={styles.klartextChip} onClick={() => scrollToId(c.id)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', fontWeight: 600, color: '#475569', fontSize: 11.5, cursor: 'pointer' }}>
            {c.label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: '#94a3b8' }}>— klick springt zum Abschnitt</span>
      </div>
    </div>
  );
};

// ─── Rechts-Check-Bühne (Rahmen um das bestehende LegalAlertsPanel) ──────────
interface StageProps {
  alerts: PulseV2LegalAlert[];
  monitoredCount: number;
  lastRadarRun: string | null;
  lawChangesLastRun: number | null;
  lawsNewThisWeek: number | null;
  alertsThisWeek: number | null;
  children: React.ReactNode;
}

export const RechtsCheckStage: React.FC<StageProps> = ({
  alerts, monitoredCount, lastRadarRun, lawChangesLastRun, lawsNewThisWeek, alertsThisWeek, children,
}) => {
  const newToday = alerts.filter(a => isOpen(a) && isToday(a.createdAt)).length;
  const ranToday = isToday(lastRadarRun);

  const steps: Array<{ k: React.ReactNode; label: string; d: string; color?: string }> = [
    {
      k: lawChangesLastRun ?? '–', label: 'neue Gesetze & Urteile',
      d: 'aus 27 amtlichen Quellen geholt — Gerichte, Gesetzblätter, Ministerien. Keine Zeitungen.',
    },
    {
      k: monitoredCount, label: `${monitoredCount === 1 ? 'Vertrag' : 'Verträge'} dagegen geprüft`,
      d: 'jeder Verdacht wird am echten Klauseltext gegengelesen — gemeldet wird nur mit wörtlichem Beleg.',
    },
    // TÜV-Fix 06.08.: Zählung basiert auf createdAt=heute — „heute" ist damit immer korrekt,
    // egal ob der Treffer aus dem Tages-Check oder der Nachprüfung einer frischen Analyse stammt.
    newToday > 0
      ? { k: newToday, label: 'neue Treffer heute', d: 'unten mit NEU markiert — das Dringendste zuerst.', color: '#dc2626' }
      : { k: 0, label: 'neue Treffer heute', d: 'deine Verträge sind von den jüngsten Änderungen nicht betroffen. Morgen früh geht\'s weiter.', color: '#059669' },
  ];

  return (
    <div style={{ background: 'linear-gradient(180deg,#f5f9ff,#ffffff)', border: '1px solid #bfdbfe', borderRadius: 16, padding: '20px 20px 8px', marginBottom: 20, boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 10px 28px rgba(15,23,42,.06)' }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Icon-Entscheidung 06.08.: gezeichnete Waage (SVG, identisch zu den Radar-Karten)
            statt Emoji. ACHTUNG bekannte Repo-Falle: globales [aria-hidden]{display:none}
            (siehe Login-Redesign-Memory) — deshalb hier KEIN aria-hidden-Attribut! */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.1px', color: '#94a3b8', textTransform: 'uppercase' }}>Das Herzstück — läuft jeden Morgen automatisch</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16.5, fontWeight: 700, margin: 0, color: '#0f172a' }}>Der tägliche Rechts-Check</h2>
            {lastRadarRun && (
              <span style={{ fontSize: 12, fontWeight: 600, background: '#ecfdf5', color: '#059669', borderRadius: 10, padding: '2px 9px' }}>
                {ranToday ? `heute ${fmtTime(lastRadarRun)} gelaufen ✓` : `zuletzt ${fmtDate(lastRadarRun)} ${fmtTime(lastRadarRun)} ✓`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', margin: '14px 0 2px' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 200, padding: '10px 18px', position: 'relative' }}>
            {/* Eigenfund 06.08. (Mobile): Pfeil nur nebeneinander sinnvoll — beim
                vertikalen Stapeln per CSS-Klasse pipeArrowV3 ausgeblendet. */}
            {i < steps.length - 1 && (
              <span className={styles.pipeArrowV3} style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', color: '#93c5fd', fontSize: 17, fontWeight: 700 }}>→</span>
            )}
            <div style={{ fontSize: 21, fontWeight: 800, color: s.color || '#0f172a' }}>
              {s.k} <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.5 }}>{s.d}</div>
          </div>
        ))}
      </div>

      {children}

      {(lawsNewThisWeek !== null || alertsThisWeek !== null) && (
        <div style={{ fontSize: 12, color: '#475569', margin: '2px 0 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, letterSpacing: '.6px', borderRadius: 8, padding: '4px 11px', textTransform: 'uppercase' }}>Diese Woche</span>
          <span>
            {lawsNewThisWeek !== null ? `${lawsNewThisWeek} neue Rechtsänderungen erfasst` : ''}
            {lawsNewThisWeek !== null && alertsThisWeek !== null ? ' · ' : ''}
            {alertsThisWeek !== null ? `${alertsThisWeek} Treffer — nur mit Beleg am Vertragstext` : ''}
          </span>
          <span style={{ color: '#94a3b8' }}>Treffer bekommst du zusätzlich per E-Mail.</span>
        </div>
      )}
    </div>
  );
};

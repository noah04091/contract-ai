import React, { useEffect, useState } from 'react';

const API_BASE = '/api';

/**
 * E-Mail-Schalter für Legal Pulse (19.08.2026).
 *
 * Hintergrund: Die Pulse-Mails behaupteten jahrelang, sie seien "in den Einstellungen"
 * abstellbar — eine erreichbare Einstellungs-Seite gab es aber nie (die Settings-UI
 * lebte nur auf der verwaisten V1-Seite /legalpulse). Diese kompakte Karte löst das
 * Versprechen ein: EIN Schalter für alle vier Pulse-Mail-Typen (Treffer, Wochenbericht,
 * Monitor, Prüf-Erinnerung), gespeichert in users.legalPulseSettings.emailNotifications
 * über die bestehende Route PUT /api/legal-pulse/settings.
 *
 * Bewusst NUR dieser eine Schalter: categories/similarityThreshold aus dem V1-Schema
 * bleiben unangetastet (dokumentierte Übersuppressions-Falle). Meldungen auf der
 * Seite und die Glocke sind vom Schalter nicht betroffen — nur E-Mails.
 *
 * Anzeige-Logik spiegelt utils/pulseAccess.pulseEmailsDisabled: aus, wenn
 * enabled === false ODER emailNotifications === false. Beim Einschalten wird
 * enabled mit auf true gesetzt, damit das Alt-Feld den Schalter nie überstimmt.
 */
export const PulseEmailSettings: React.FC = () => {
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'hidden'>('loading');
  const [mailsOn, setMailsOn] = useState(true);
  // true = global von ALLEN Mails abgemeldet (Footer-Link in einer Mail). Der Versand
  // ignoriert den Pulse-Schalter dann — die Karte darf nicht "An" behaupten.
  const [globalOptOut, setGlobalOptOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/legal-pulse/settings`, { credentials: 'include' });
        if (!res.ok) { setState('hidden'); return; }
        const data = await res.json();
        const s = (data && data.settings) || {};
        setMailsOn(!(s.enabled === false || s.emailNotifications === false));
        setGlobalOptOut(data && data.emailOptOut === true);
        setState('ready');
      } catch {
        // Ohne Einstellungs-Daten lieber keine Karte als eine falsche Anzeige
        setState('hidden');
      }
    })();
  }, []);

  const toggle = async () => {
    if (state === 'saving') return;
    const next = !mailsOn;
    setState('saving');
    setError(null);
    try {
      const body = next ? { emailNotifications: true, enabled: true } : { emailNotifications: false };
      const res = await fetch(`${API_BASE}/legal-pulse/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      setMailsOn(next);
    } catch {
      setError('Speichern hat nicht geklappt. Bitte versuche es gleich noch einmal.');
    } finally {
      setState('ready');
    }
  };

  if (state === 'loading' || state === 'hidden') return null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.03)',
      padding: '18px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' }}>
            E-Mail-Benachrichtigungen
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.55, marginTop: 3 }}>
            Treffer-Meldungen, Wochenbericht und Pr&uuml;f-Erinnerungen per E-Mail.
            Deine Meldungen auf dieser Seite und die Glocke bleiben davon unber&uuml;hrt.
          </div>
        </div>
        <button
          role="switch"
          aria-checked={mailsOn}
          aria-label="E-Mail-Benachrichtigungen von Legal Pulse"
          onClick={toggle}
          disabled={state === 'saving'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '6px 8px 6px 12px',
            background: 'transparent', border: 'none',
            cursor: state === 'saving' ? 'wait' : 'pointer',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: mailsOn ? '#166534' : '#6b7280', minWidth: 24, textAlign: 'right' }}>
            {mailsOn ? 'An' : 'Aus'}
          </span>
          <span style={{
            width: 40, height: 22, borderRadius: 11, position: 'relative',
            background: mailsOn ? '#22c55e' : '#cbd5e1',
            transition: 'background .15s ease',
            opacity: state === 'saving' ? 0.6 : 1,
            display: 'inline-block',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: mailsOn ? 20 : 2,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              transition: 'left .15s ease',
            }} />
          </span>
        </button>
      </div>
      {globalOptOut && !error && (
        <div style={{ fontSize: 12, color: '#b45309', background: '#fdf6e7', border: '1px solid #f0dfb6', borderRadius: 8, padding: '7px 11px', marginTop: 10 }}>
          Du bist aktuell von allen Benachrichtigungs-Mails von Contract&nbsp;AI abgemeldet.
          Solange das gilt, kommen auch bei eingeschaltetem Schalter keine Legal-Pulse-Mails an.
          Wieder anmelden kannst du dich &uuml;ber den Abmelde-Link in einer fr&uuml;heren E-Mail.
        </div>
      )}
      {!globalOptOut && !mailsOn && !error && (
        <div style={{ fontSize: 12, color: '#b45309', background: '#fdf6e7', border: '1px solid #f0dfb6', borderRadius: 8, padding: '7px 11px', marginTop: 10 }}>
          E-Mails sind aus. Neue Treffer erscheinen weiterhin hier auf der Seite und in der Glocke, du bekommst aber keine Legal-Pulse-Mails mehr.
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 11px', marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
};

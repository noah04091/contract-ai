// ReminderHelpModal — erklärt den Erinnerungs-Prozess in einfachen Worten.
// Reine Anzeige (kein Backend, keine Daten). Geöffnet über den "?"-Button im Kalender-Kopf.
// Inhalte sind aus dem echten Code abgeleitet (Vorwarn-Staffel 30/7/1 + "am Tag selbst").

import { useEffect, type CSSProperties } from 'react';
import { X } from 'lucide-react';

interface ReminderHelpModalProps {
  onClose: () => void;
}

const TIERS: { ic: string; label: string; sub: string; pills: string[] }[] = [
  { ic: '🔴', label: 'Sehr wichtig', sub: '(z. B. Vertragsende, Kündigungsfrist)', pills: ['30 Tage vorher', '7 Tage vorher', '1 Tag vorher'] },
  { ic: '🟡', label: 'Wichtig', sub: '', pills: ['30 Tage vorher', '7 Tage vorher'] },
  { ic: '🔵', label: 'Normal', sub: '(z. B. eine fällige Zahlung)', pills: ['7 Tage vorher'] },
];

const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' };
const modal: CSSProperties = { background: '#fff', borderRadius: '20px', maxWidth: '540px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' };
const head: CSSProperties = { padding: '20px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: '12px' };
const dot: CSSProperties = { width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px' };
const closeBtn: CSSProperties = { marginLeft: 'auto', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 };
const body: CSSProperties = { padding: '8px 24px 22px', overflowY: 'auto' };
const qTitle: CSSProperties = { fontSize: '14.5px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 7px' };
const qText: CSSProperties = { fontSize: '13.5px', color: '#374151', lineHeight: 1.6 };
const tierRow: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '11px', background: '#f9fafb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '11px 13px', marginTop: '9px' };
const pill: CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '999px', padding: '2px 8px' };
const pillDay: CSSProperties = { ...pill, color: '#15803d', background: '#f0fdf4', borderColor: '#bbf7d0' };
const callout: CSSProperties = { marginTop: '16px', display: 'flex', gap: '10px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '12px 14px' };
const foot: CSSProperties = { padding: '14px 24px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end' };
const footBtn: CSSProperties = { background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: '11px', padding: '11px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' };
const hl: CSSProperties = { fontWeight: 700, color: '#1e40af' };

export default function ReminderHelpModal({ onClose }: ReminderHelpModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={head}>
          <div style={dot}>🔔</div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>Wie funktionieren die Erinnerungen?</h2>
            <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>Alles Wichtige in Kürze — damit du nie eine Frist verpasst.</p>
          </div>
          <button style={closeBtn} onClick={onClose} aria-label="Schließen"><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={body}>
          <div>
            <h3 style={qTitle}>📅 Was macht der Kalender?</h3>
            <p style={qText}>Contract AI erkennt wichtige Fristen in deinen Verträgen — Vertragsende, Kündigungsfristen, Zahlungen, Probezeit usw. — und trägt sie automatisch als Termine ein. So musst du selbst nichts im Blick behalten.</p>
          </div>

          <div>
            <h3 style={qTitle}>⏰ Wann wirst du erinnert?</h3>
            <p style={qText}>Vor jeder Frist mailen wir dich automatisch <span style={hl}>rechtzeitig vorher</span> — und <span style={hl}>am Tag der Frist selbst</span>. Wie viele Vorwarnungen es gibt, hängt davon ab, wie wichtig die Frist ist:</p>
            {TIERS.map((t) => (
              <div key={t.label} style={tierRow}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{t.ic}</span>
                <div style={{ fontSize: '13px' }}>
                  <b style={{ color: '#111827' }}>{t.label}</b>{t.sub ? ` ${t.sub}` : ''}
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                    {t.pills.map((p) => <span key={p} style={pill}>{p}</span>)}
                    <span style={pillDay}>am Tag selbst</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 style={qTitle}>❓ Warum hat ein Termin mehr Erinnerungen als ein anderer?</h3>
            <p style={qText}>Genau deshalb: Kritische Fristen bekommen mehr Vorwarnungen als normale. Im Popup jeder Frist siehst du unter „So wirst du an diese Frist erinnert" ganz genau, wann du erinnert wirst. Liegt eine Vorwarnung schon in der Vergangenheit, fällt nur diese weg — die übrigen kommen trotzdem.</p>
          </div>

          <div>
            <h3 style={qTitle}>🎯 Kommt die Mail wirklich pünktlich?</h3>
            <p style={qText}>Ja. Die Erinnerungen kommen <span style={hl}>genau am richtigen Tag</span> — kein Tag zu früh, kein Tag zu spät.</p>
          </div>

          <div>
            <h3 style={qTitle}>➕ Kann ich eigene Erinnerungen hinzufügen?</h3>
            <p style={qText}>Ja. Klick auf eine Frist → <b>„Alle Erinnerungen dieses Vertrags verwalten"</b>. Dort kannst du für Vertragsende, Kündigungsfrist oder ein eigenes Datum zusätzliche Erinnerungen anlegen — und deine eigenen wieder entfernen. Die automatischen bleiben immer aktiv.</p>
          </div>

          <div>
            <h3 style={qTitle}>✍️ Und Signatur-Anfragen?</h3>
            <p style={qText}>Wartende Signaturen sind keine Vertragsfristen — sie erinnern wir separat automatisch per E-Mail, bevor sie ablaufen.</p>
          </div>

          <div style={callout}>
            <span style={{ fontSize: '16px' }}>🛡️</span>
            <p style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.55 }}>Kurz gesagt: Lade deine Verträge hoch — um den Rest kümmert sich Contract AI. Du wirst rechtzeitig erinnert, ganz automatisch.</p>
          </div>
        </div>

        {/* Footer */}
        <div style={foot}>
          <button style={footBtn} onClick={onClose}>Alles klar 👍</button>
        </div>
      </div>
    </div>
  );
}

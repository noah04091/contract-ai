// frontend/src/utils/reminderGrouping.ts
//
// Geteilte, REINE Helfer zur Zuordnung von Vorwarn-Erinnerungen zu ihrer Frist.
// Reine Anzeige-Logik (kein State, keine Seiteneffekte). Genutzt von:
//   - ReminderSettingsModal (gruppierte „Automatische Erinnerungen"-Liste)
//   - QuickActionsModal / Kalender-Termin-Popup („Deine Erinnerungen"-Karte)
//
// Backend-Titel-Format (siehe calendarEvents.js):
//   Haupt-Event:  `${emoji} ${importantDate.label}: ${contract.name}`  z.B. "💰 Erste Rate fällig: datei.pdf"
//   Vorwarnung:   `${emoji} ${reminder.label}: ${importantDate.label}` z.B. "📅 7 Tage vorher: Erste Rate fällig"
// → Der Frist-Name (importantDate.label) ist der gemeinsame Schlüssel.

export interface ReminderLike {
  title: string;
  type: string;
}

// ALT-Titel-Format (Vorwarner, erzeugt VOR der Stufe-3a-Umbenennung im Juni 2026):
//   "📅 In 30 Tagen: Kündigungseingang bis" / "⚠️ In 2 Wochen: …" / "🔴 In 3 Tagen - DRINGEND: …"
// Diese Events leben noch in der DB (Typen matchen _REMINDER_\d+D, nur der Titel ist alt).
// WICHTIG: Der Doppelpunkt muss DIREKT auf die Zeitangabe (+ optional "- DRINGEND") folgen —
// Haupt-Events wie "📅 In 2 Wochen kündbar: {name}" dürfen NICHT gestrippt werden.
const OLD_LEAD_PREFIX = /^In\s+(\d+)\s*(Tagen?|Wochen?|Monaten?)(?:\s*-\s*DRINGEND)?\s*:\s*/i;

// Normalisiert einen Event-Titel auf den reinen Frist-Namen (Zuordnungs-Schlüssel).
export const cleanDeadlineName = (title: string): string => {
  let t = title.replace(/^[^0-9A-Za-zÀ-ÿ]+/, '');                            // führende Emojis/Symbole weg
  t = t.replace(/^\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher\s*:\s*/i, '');     // "N ... vorher:" weg (Vorwarnung)
  t = t.replace(OLD_LEAD_PREFIX, '');                                         // Alt-Format "In N Tagen:" weg
  t = t.replace(/\s*:\s*[^:]*\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g)\s*$/i, ''); // ": datei.pdf" weg (Haupt-Event)
  return t.trim();
};

// "📅 2 Wochen vorher: ..." → "2 Wochen vorher"; Haupt-Event (ohne "vorher") → null.
// Alt-Format "In 2 Wochen: ..." → ebenfalls "2 Wochen vorher" (Dativ → Grundform).
export const reminderLeadLabel = (title: string): string | null => {
  const m = title.match(/(\d+\s*(?:Tage?|Wochen?|Monate?))\s*vorher/i);
  if (m) return `${m[1].replace(/\s+/g, ' ')} vorher`;
  const old = title.replace(/^[^0-9A-Za-zÀ-ÿ]+/, '').match(OLD_LEAD_PREFIX);
  if (old) {
    const n = old[1];
    const unit = old[2].toLowerCase().startsWith('tag')
      ? (n === '1' ? 'Tag' : 'Tage')
      : old[2].toLowerCase().startsWith('woche')
        ? (n === '1' ? 'Woche' : 'Wochen')
        : (n === '1' ? 'Monat' : 'Monate');
    return `${n} ${unit} vorher`;
  }
  return null;
};

// Ist das Event eine Vorwarnung (vs. das Haupt-Frist-Event)?
export const isReminderEntry = (e: ReminderLike): boolean =>
  reminderLeadLabel(e.title) !== null || /_REMINDER_\d+D$/i.test(e.type);

// Entfernt einen eingebetteten Dateinamen ("…Santander.pdf") aus einem Anzeige-Titel.
// Backend baut manche Titel als "LETZTER TAG: {dateiname}.pdf kündigen!" — der rohe
// Dateiname mitten im Satz sieht hässlich aus. REINE Darstellung: ändert NICHT den
// Zuordnungs-Schlüssel (cleanDeadlineName) und keine Daten. Greift nur bei echten
// Datei-Endungen; lässt normale Titel ("Erste Rate fällig") unangetastet.
export const stripFileName = (title: string): string => {
  const cleaned = title
    .replace(/\s*:?\s*\S*\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g)\b\S*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([:!?.,])/g, '$1')
    .trim();
  return cleaned || title; // nie leer zurückgeben
};

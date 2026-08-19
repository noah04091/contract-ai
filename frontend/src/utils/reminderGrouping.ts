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
// Optionaler zweiter Parameter (11.08.2026): der Vertragsname. Haupt-Event-Titel
// enden auf ": {Vertragsname}" — ist der Name bekannt (event.contractName /
// contract.name), wird EXAKT dieses Suffix entfernt. Das deckt auch Vertrags-
// namen OHNE Datei-Endung ab ("Bürogebäude Mietvertrag"), bei denen die
// Endungs-Regex unten nicht greift (gemessen: 12 von 437 Verträgen mit Events).
// Bewusst NUR exakter Suffix-Match: ein generisches ":-Strippen" würde echte
// Frist-Titel wie "Aufbewahrungsdauer der Backups: 30 Tage" verstümmeln
// (14 solcher Titel in der DB gemessen). Vorwarner-Titel enden nie auf den
// Vertragsnamen — der Parameter ist für sie ein No-op, beide Seiten eines
// Vergleichs können ihn also immer gefahrlos übergeben.
export const cleanDeadlineName = (title: string, contractName?: string): string => {
  let t = title.replace(/^[^0-9A-Za-zÀ-ÿ]+/, '');                            // führende Emojis/Symbole weg
  // "N ... vorher:" weg (Vorwarnung). "– DRINGEND" (kritische 1-Tag-Stufe, calendarEvents.js
  // reminderConfig) wird mittoleriert — Gedanken- UND Bindestrich, wie OLD_LEAD_PREFIX es fürs
  // Alt-Format längst tut. Ohne das blieb der Zusatz im Schlüssel hängen: Vorwarner fiel aus
  // der Frist-Karte und bildete eine Phantom-Gruppe (Realitätscheck-Befund 17.08.2026).
  t = t.replace(/^\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher(?:\s*[–-]\s*DRINGEND)?\s*:\s*/i, '');
  t = t.replace(OLD_LEAD_PREFIX, '');                                         // Alt-Format "In N Tagen:" weg
  const name = contractName?.trim();
  if (name) {
    const suffix = `: ${name}`.toLowerCase();
    if (t.toLowerCase().endsWith(suffix) && t.length > suffix.length) {
      t = t.slice(0, t.length - suffix.length);
    }
  }
  t = t.replace(/\s*:\s*[^:]*\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g)\s*$/i, ''); // ": datei.pdf" weg (Haupt-Event)
  return t.trim();
};

// Anzeige-Spiegel des Backend-Helfers completeDanglingLabel (calendarEvents.js):
// Endet ein KI-Label auf hängender Präposition ("Kündigungseingang bis"), wird
// das zugehörige Datum angehängt — rein für die Darstellung in der Vertrags-
// detail-Ansicht (die gespeicherten Analyse-Daten bleiben unverändert).
// Ohne gültiges Datum bleibt das Label unverändert (nie kappen).
// Regex-Spiegel des Backends: bewusst OHNE Satzzeichen-Toleranz (Label muss
// wörtlich im Titel erhalten bleiben — includes()-Duplikat-Heuristik) und
// OHNE vor/für/von ("liegt vor" wäre eine Bedeutungs-Umkehrung).
const DANGLING_PREPOSITION = /\s(bis|zum|am|ab|spätestens)\s*$/i;
export const completeDanglingLabel = (label: string, date?: string | Date | null): string => {
  if (!label || !DANGLING_PREPOSITION.test(label)) return label;
  let d: Date | null = null;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string' && date) {
    // Datums-Strings ("2026-08-23") auf 12:00 LOKAL ankern (createLocalDate-
    // Konvention des Backends) — new Date("YYYY-MM-DD") wäre UTC-Mitternacht
    // und kippt in West-Zeitzonen auf den Vortag.
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0, 0) : new Date(date);
  }
  if (!d || isNaN(d.getTime())) return label;
  return `${label.trim()} ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
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

// ── Stufe 4 (19.08.2026): Zuordnung Vorwarnung→Frist per FESTER REFERENZ ──────────
// Seit Stufe 2 trägt jede Vorwarnung metadata.deadlineEventId (die _id ihrer Frist,
// vom Generator ab Geburt vergeben, Bestand per Backfill 1175/1175 nachgezogen).
// Die Referenz ist die WAHRHEIT; der Titel-Schlüssel (cleanDeadlineName) bleibt nur
// noch als Rückfall für unverknüpfte Altfälle. Trägt eine Vorwarnung eine Referenz,
// entscheidet AUSSCHLIESSLICH sie — auch gegen einen zufällig passenden Titel
// (verhindert Doppel-Zuordnung bei Zwillings-Fristen).

export interface DeadlineRefLike extends ReminderLike {
  id?: string;
  metadata?: { deadlineEventId?: string };
}

// Gehört diese Vorwarnung zu dieser Frist? (Popup-Karte „So wirst du erinnert")
export const belongsToDeadline = (
  reminder: DeadlineRefLike,
  deadline: { id?: string; title: string },
  contractName?: string
): boolean => {
  const ref = reminder.metadata?.deadlineEventId;
  if (ref && deadline.id) return String(ref) === String(deadline.id);
  return cleanDeadlineName(reminder.title, contractName) === cleanDeadlineName(deadline.title, contractName);
};

// Gruppen-Schlüssel eines Events für die Frist-Familien der Modals: Vorwarnungen mit
// Referenz erben den Schlüssel ihrer FRIST (heilt auch abweichende KI-Labels wie
// „Ende der Probezeit" vs. „Probezeit endet" — die 4 Rest-Phantome der Messung vom
// 17.08.); ohne Referenz bzw. für Haupt-Termine der bisherige Titel-Schlüssel.
export const deadlineKeyOf = (
  ev: DeadlineRefLike,
  allEvents: ReadonlyArray<DeadlineRefLike>,
  contractName?: string
): string => {
  if (isReminderEntry(ev)) {
    const ref = ev.metadata?.deadlineEventId;
    if (ref) {
      const main = allEvents.find(m => m.id !== undefined && String(m.id) === String(ref));
      if (main) return cleanDeadlineName(main.title, contractName);
    }
  }
  return cleanDeadlineName(ev.title, contractName);
};

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

// CalendarOverview — "Überblick"-Ansicht des Kalenders.
//
// REINE ANZEIGE (kein Versand berührt). Stufe 4 (19.08.2026): Die Erinnerungs-
// Abdeckung pro Frist kommt jetzt als SERVER-Wahrheit mit (event.coverage aus
// routes/calendar.js, gebaut aus der festen Referenz metadata.deadlineEventId) —
// vorher versuchte diese Ansicht, Vorwarner per Titel im Store zu finden, die dort
// 3b-ausgeblendet sind → Abdeckung war nicht zuverlässig darstellbar und der Tab
// deshalb deaktiviert. Jetzt:
// - Schutz-Status (wie viele Fristen, wie viele mit/ohne Erinnerung)
// - Agenda nach Zeit-Horizont (Aufmerksamkeit / diese Woche / diesen Monat / später)
// - Mini-Zeitleiste pro Frist: macht sichtbar, WANN per E-Mail erinnert wird
//
// Alle Aktionen (Frist öffnen, Erinnerungen verwalten) laufen über die bestehenden
// Handler aus Calendar.tsx → keine neue/fragile Speicher-Logik.

import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../stores/calendarStore';
import { cleanDeadlineName, isReminderEntry, stripFileName } from '../utils/reminderGrouping';
import styles from './CalendarOverview.module.css';

interface CalendarOverviewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onManageReminders: (event: CalendarEvent) => void;
  formatContractName?: (name: string) => string;
}

const MS_DAY = 86_400_000;

const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfDay = (dateStr: string): number => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Signatur-Events zeigen ihr Ablaufdatum; alles andere das normale Datum.
const displayDate = (e: CalendarEvent): string => {
  const exp = (e.metadata as { expiresAt?: string } | undefined)?.expiresAt;
  if (e.type?.startsWith('SIGNATURE_') && exp) return exp;
  return e.date;
};

const fmtFull = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtShort = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
};

// Führendes Emoji/Symbol aus dem Backend-Titel ("💰 Erste Rate fällig: …") wiederverwenden.
const leadEmoji = (title: string): string => {
  const stripped = title.replace(/^[^0-9A-Za-zÀ-ÿ]+/, '');
  const lead = title.slice(0, title.length - stripped.length).trim();
  return lead || '📌';
};

const CANCELABLE = new Set(['CANCEL_WINDOW_OPEN', 'LAST_CANCEL_DAY']);

type CoverageStage = NonNullable<CalendarEvent['coverage']>['stages'][number];

interface EnrichedItem {
  event: CalendarEvent;
  stages: CoverageStage[]; // künftige Erinnerungs-Stufen (Server-Wahrheit, event.coverage)
  days: number;
}

export default function CalendarOverview({
  events,
  onEventClick,
  onManageReminders,
  formatContractName,
}: CalendarOverviewProps) {
  // 🔍 Chip-Filter (Noahs Wunsch 19.08.): Status-Chips wirken als Filter.
  // 'alle' | 'vorwarnung' (mit Vorwarn-Stufen) | 'stichtag' (nur Stichtags-Mail).
  // Klick auf den aktiven Chip setzt zurück auf 'alle'.
  const [chipFilter, setChipFilter] = useState<'alle' | 'vorwarnung' | 'stichtag'>('alle');

  const model = useMemo(() => {
    const today = startOfToday();

    const active = events.filter(e => e.status !== 'completed' && e.status !== 'dismissed');

    // Haupt-Fristen = echte Termine (keine Vorwarn-Einträge), heute oder in der Zukunft.
    const deadlines = active.filter(
      e => !isReminderEntry(e) && startOfDay(displayDate(e)) >= today
    );

    // Kommende Erinnerungs-Stufen aus der Server-Abdeckung (event.coverage, Stufe 4):
    // nur künftige Stufen zählen für den Schutz-Status — eine Frist, deren Vorwarner
    // alle schon vorbei sind, gilt weiterhin als "ohne Erinnerung" (Lücken-Warnung).
    const enriched: EnrichedItem[] = deadlines
      .map(d => {
        const stages = (d.coverage?.stages || [])
          .filter(st => { const t = startOfDay(st.date); return !isNaN(t) && t >= today; })
          .slice()
          .sort((a, b) => startOfDay(a.date) - startOfDay(b.date));
        const days = Math.round((startOfDay(displayDate(d)) - today) / MS_DAY);
        return { event: d, stages, days };
      })
      .sort((a, b) => a.days - b.days);

    const total = enriched.length;
    const withRem = enriched.filter(x => x.stages.length > 0).length;
    const without = total - withRem;

    // Aufmerksamkeit: bald fällig OHNE Erinnerung (Lücke) ODER bald kündbar.
    const attention: EnrichedItem[] = [];
    const rest: EnrichedItem[] = [];
    for (const x of enriched) {
      const gapSoon = x.stages.length === 0 && x.days <= 30;
      const cancelSoon = CANCELABLE.has(x.event.type) && x.days <= 30;
      if (gapSoon || cancelSoon) attention.push(x);
      else rest.push(x);
    }

    const week = rest.filter(x => x.days <= 7);
    const month = rest.filter(x => x.days > 7 && x.days <= 31);
    const quarter = rest.filter(x => x.days > 31 && x.days <= 92);
    const later = rest.filter(x => x.days > 92);

    return { total, withRem, without, attention, week, month, quarter, later };
  }, [events]);

  // Chip-Filter-Prädikat: 'vorwarnung' = hat künftige Vorwarn-Stufen, 'stichtag' = keine.
  const matchesChip = (x: EnrichedItem): boolean =>
    chipFilter === 'alle' || (chipFilter === 'vorwarnung' ? x.stages.length > 0 : x.stages.length === 0);

  const renderBadge = (days: number) => {
    let text: string;
    let cls = '';
    if (days < 0) { text = 'Überfällig'; cls = styles.crit; }
    else if (days === 0) { text = 'Heute'; cls = styles.crit; }
    else if (days === 1) { text = 'Morgen'; cls = styles.crit; }
    else if (days <= 14) { text = `in ${days} Tagen`; cls = styles.warn; }
    else text = `in ${days} Tagen`;
    return <span className={`${styles.evBadge} ${cls}`}>{text}</span>;
  };

  const renderTimeline = (item: EnrichedItem) => {
    const today = startOfToday();
    const end = startOfDay(displayDate(item.event));
    const span = end - today;
    const posOf = (dateStr: string): number => {
      if (span <= 0) return 50;
      const p = 3 + 94 * ((startOfDay(dateStr) - today) / span);
      return Math.max(6, Math.min(94, p));
    };
    return (
      <div className={styles.tl}>
        <div className={styles.tlAxis} />
        <div className={`${styles.tlPt} ${styles.tlNow}`} style={{ left: '3%' }} />
        <span className={styles.tlLbl} style={{ left: '3%' }}>heute</span>
        {item.stages.map((st, i) => (
          <span key={`${st.date}-${i}`} className={styles.tlPt} style={{ left: `${posOf(st.date)}%` }}>🔔</span>
        ))}
        <span className={`${styles.tlPt} ${styles.tlDeadline}`} style={{ left: '97%' }}>◆</span>
        <span className={styles.tlLbl} style={{ left: '95%' }}>Frist</span>
      </div>
    );
  };

  const reminderLabelText = (stages: CoverageStage[]): string => {
    // "am Stichtag" ehrlich mitnennen: das Haupt-Event mailt IMMER an seinem Tag
    // (daysSame-Schalter, Klasse-B/Own-Day-Logik) — das ist keine Vorwarn-Stufe,
    // gehört aber zur Wahrheit "so wirst du erinnert" (Noahs Befund 19.08.).
    const labels = [...stages.map(st => st.label || fmtShort(st.date)), 'am Stichtag'];
    const uniq = Array.from(new Set(labels));
    const head = uniq.slice(0, 3).join(' & ');
    return uniq.length > 3 ? `${head} +${uniq.length - 3}` : head;
  };

  const renderCard = (item: EnrichedItem) => {
    const { event, stages } = item;
    const stripeCls =
      event.severity === 'critical' ? styles.crit
      : event.severity === 'warning' ? styles.warn
      : styles.info;
    const contractName = formatContractName
      ? formatContractName(event.contractName)
      : stripFileName(event.contractName || 'Vertrag');
    const title = cleanDeadlineName(event.title, event.contractName) || stripFileName(event.title);

    return (
      <div key={event.id} className={`${styles.card} ${stripeCls}`}>
        <div className={styles.cardTop} onClick={() => onEventClick(event)}>
          <div className={styles.evIc}>{leadEmoji(event.title)}</div>
          <div className={styles.evMain}>
            <div className={styles.evContract}>{contractName}</div>
            <div className={styles.evTitle}>{title}</div>
          </div>
          <div className={styles.evRight}>
            <div className={styles.evDate}>{fmtFull(displayDate(event))}</div>
            {renderBadge(item.days)}
          </div>
        </div>

        {stages.length > 0 ? (
          <div className={styles.strip}>
            {renderTimeline(item)}
            <div className={styles.legend}>
              <span className={styles.legendTxt}>
                <span className={styles.mail}>✉️</span>
                <span className="ellip">Erinnerung: {reminderLabelText(stages)}</span>
              </span>
              <button className={styles.manageBtn} onClick={() => onManageReminders(event)}>
                Bearbeiten
              </button>
            </div>
          </div>
        ) : (
          /* EHRLICH statt Angst (Noahs Befund 19.08.): Auch ohne Vorwarn-Stufen kommt
             die Mail AM STICHTAG selbst (Haupt-Event, daysSame/Own-Day-Logik) — das
             alte "Keine Erinnerung — du könntest die Frist verpassen" war schlicht
             falsch und widersprach dem Termin-Popup. Angeboten wird jetzt, FRÜHER
             erinnert zu werden. */
          <div className={styles.nudge}>
            <span className={styles.nudgeTxt}>
              <span className={styles.mail}>✉️</span>
              <span className="ellip">Erinnerung: am Stichtag selbst</span>
            </span>
            <button className={styles.addBtn} onClick={() => onManageReminders(event)}>
              ＋ Früher erinnern
            </button>
          </div>
        )}
      </div>
    );
  };

  const section = (label: string, items: EnrichedItem[], attn = false) => {
    if (items.length === 0) return null;
    return (
      <div className={styles.sec}>
        <div className={`${styles.secHead} ${attn ? styles.attn : ''}`}>{label}</div>
        {items.map(renderCard)}
      </div>
    );
  };

  if (model.total === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.empty}>
          <div className={styles.eIc}>🗓️</div>
          <div className={styles.eT}>Keine anstehenden Fristen</div>
          <div className={styles.eS}>Sobald deine Verträge Termine haben, siehst du sie hier im Überblick.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Schutz-Status */}
      <div className={styles.status}>
        <div className={styles.statusTop}>
          <span className={styles.shield}>🛡️</span>
          <h2>Du behältst alles im Blick</h2>
        </div>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.schip} ${styles.neutral} ${styles.schipBtn} ${chipFilter === 'alle' ? styles.schipOn : ''}`}
            onClick={() => setChipFilter('alle')}
            aria-pressed={chipFilter === 'alle'}
          >
            <span className={styles.n}>{model.total}</span> kommende {model.total === 1 ? 'Frist' : 'Fristen'}
          </button>
          {model.withRem > 0 && (
            <button
              type="button"
              className={`${styles.schip} ${styles.ok} ${styles.schipBtn} ${chipFilter === 'vorwarnung' ? styles.schipOn : ''}`}
              onClick={() => setChipFilter(f => f === 'vorwarnung' ? 'alle' : 'vorwarnung')}
              aria-pressed={chipFilter === 'vorwarnung'}
            >
              <span className={styles.n}>{model.withRem}</span> mit Vorwarnung
            </button>
          )}
          {model.without > 0 && (
            <button
              type="button"
              className={`${styles.schip} ${styles.warn} ${styles.schipBtn} ${chipFilter === 'stichtag' ? styles.schipOn : ''}`}
              onClick={() => setChipFilter(f => f === 'stichtag' ? 'alle' : 'stichtag')}
              aria-pressed={chipFilter === 'stichtag'}
            >
              <span className={styles.n}>{model.without}</span> nur am Stichtag
            </button>
          )}
        </div>
      </div>

      {/* Agenda — der Chip-Filter wirkt auf alle Abschnitte (Zähler oben bleiben Gesamtwerte) */}
      {section('⚠️ Braucht deine Aufmerksamkeit', model.attention.filter(matchesChip), true)}
      {section('Diese Woche', model.week.filter(matchesChip))}
      {section('Diesen Monat', model.month.filter(matchesChip))}
      {section('Die nächsten Monate', model.quarter.filter(matchesChip))}
      {section('Später', model.later.filter(matchesChip))}
    </div>
  );
}

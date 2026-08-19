// Unit-Tests für reminderGrouping.ts — den Zuordnungs-Kern von 5 UI-Ansichten
// (QuickActionsModal-Karte, ReminderSettingsModal, NewContractDetailsModal,
// CalendarOverview, ContractDetailsV2).
//
// Hintergrund (10.08.2026): Event-Titel können seit completeDanglingLabel
// (backend/services/calendarEvents.js) ein angehängtes Datum tragen
// ("Kündigungseingang bis 23.08.2026"). Diese Tests konservieren die im
// Nach-TÜV manuell durchgerechnete Beweisführung, dass Haupt-Event und
// Vorwarner dabei denselben Gruppierungs-Schlüssel behalten — im ALT- wie im
// NEU-Titelformat.

import {
  cleanDeadlineName,
  reminderLeadLabel,
  isReminderEntry,
  stripFileName,
  completeDanglingLabel,
  belongsToDeadline,
  deadlineKeyOf,
} from '../utils/reminderGrouping';

// Die 8 real in der Prod-DB stehenden Titel (Stand 10.08.2026)
const FAMILIE_A_KEY = 'Kündigungseingang bis 23.08.2026';
const FAMILIE_A = [
  { title: '📅 In 30 Tagen: Kündigungseingang bis 23.08.2026', type: 'CANCEL_DEADLINE_REMINDER_30D' },
  { title: '⚠️ In 2 Wochen: Kündigungseingang bis 23.08.2026', type: 'CANCEL_DEADLINE_REMINDER_14D' },
  { title: '🚨 In 7 Tagen: Kündigungseingang bis 23.08.2026', type: 'CANCEL_DEADLINE_REMINDER_7D' },
  { title: '🔴 In 3 Tagen - DRINGEND: Kündigungseingang bis 23.08.2026', type: 'CANCEL_DEADLINE_REMINDER_3D' },
];
const FAMILIE_A_MAIN = {
  title: '⚠️ Kündigungseingang bis 23.08.2026: rechnung-FM.F26008865870.pdf',
  type: 'CANCEL_DEADLINE',
};

const FAMILIE_B_KEY = 'Netzanschluss spätestens 30.09.2027';
const FAMILIE_B = [
  { title: '📅 2 Wochen vorher: Netzanschluss spätestens 30.09.2027', type: 'CONTRACT_END_REMINDER_14D' },
  { title: '⚠️ 7 Tage vorher: Netzanschluss spätestens 30.09.2027', type: 'CONTRACT_END_REMINDER_7D' },
];
const FAMILIE_B_MAIN = {
  title: '📅 Netzanschluss spätestens 30.09.2027: Mit_Docusign_abschließen_Kaufvertrag_für_Max.pdf',
  type: 'CONTRACT_END',
};

describe('cleanDeadlineName — Gruppierungs-Schlüssel mit Datum im Label', () => {
  test.each(FAMILIE_A)('Alt-Format-Vorwarner "$title" → Familie A', ({ title }) => {
    expect(cleanDeadlineName(title)).toBe(FAMILIE_A_KEY);
  });

  test('Haupt-Event Familie A: ": datei.pdf" wird gestrippt, Datum bleibt', () => {
    expect(cleanDeadlineName(FAMILIE_A_MAIN.title)).toBe(FAMILIE_A_KEY);
  });

  test.each(FAMILIE_B)('Neu-Format-Vorwarner "$title" → Familie B', ({ title }) => {
    expect(cleanDeadlineName(title)).toBe(FAMILIE_B_KEY);
  });

  test('Haupt-Event Familie B: Dateiname mit Unterstrichen/Umlauten wird gestrippt', () => {
    expect(cleanDeadlineName(FAMILIE_B_MAIN.title)).toBe(FAMILIE_B_KEY);
  });

  test('Neu-Format "N Tage vorher:" mit Datums-Label', () => {
    expect(cleanDeadlineName('🚨 7 Tage vorher: Kündigungseingang bis 23.08.2026'))
      .toBe(FAMILIE_A_KEY);
  });

  test('Datumspunkte werden NICHT als Dateiendung fehlinterpretiert', () => {
    // ".2026" ist keine bekannte Endung — nichts darf gestrippt werden
    expect(cleanDeadlineName('📅 Netzanschluss spätestens 30.09.2027'))
      .toBe(FAMILIE_B_KEY);
  });
});

describe('cleanDeadlineName — Vertragsname als Kontext (11.08.2026)', () => {
  test('Vertragsname OHNE Datei-Endung wird per Kontext gestrippt', () => {
    // Gemessen: 12 von 437 Verträgen mit Events haben Namen ohne bekannte Endung
    expect(cleanDeadlineName('⚠️ Kündigungseingang bis 23.08.2026: Bürogebäude Mietvertrag', 'Bürogebäude Mietvertrag'))
      .toBe('Kündigungseingang bis 23.08.2026');
  });

  test('Ohne Kontext bleibt der endungslose Name hängen (dokumentierter Alt-Zustand)', () => {
    expect(cleanDeadlineName('⚠️ Kündigungseingang bis: Bürogebäude Mietvertrag'))
      .toBe('Kündigungseingang bis: Bürogebäude Mietvertrag');
  });

  test('Kontext-Strip auch bei Namen mit Datums-Endung ("Kaufvertrag - 26.2.2026")', () => {
    expect(cleanDeadlineName('📅 Vertrag endet: Kaufvertrag - 26.2.2026', 'Kaufvertrag - 26.2.2026'))
      .toBe('Vertrag endet');
  });

  test('Vorwarner-Titel: Kontext-Parameter ist ein No-op', () => {
    expect(cleanDeadlineName('🚨 7 Tage vorher: Kündigungseingang bis 23.08.2026', 'rechnung-FM.F26008865870.pdf'))
      .toBe(FAMILIE_A_KEY);
  });

  test('Frist-Titel mit Doppelpunkt im Satz wird NICHT verstümmelt', () => {
    // Gemessen: 14 solcher Titel in der DB — genereller ":-Strip" wäre falsch
    expect(cleanDeadlineName('🔧 Aufbewahrungsdauer der Backups: 30 Tage', 'SaaS-Vertrag'))
      .toBe('Aufbewahrungsdauer der Backups: 30 Tage');
  });

  test('Beide Seiten eines Vergleichs mit Kontext → identischer Schlüssel', () => {
    const name = 'Bürogebäude Mietvertrag';
    const main = cleanDeadlineName('⚠️ Kündigungseingang bis 23.08.2026: Bürogebäude Mietvertrag', name);
    const reminder = cleanDeadlineName('🚨 7 Tage vorher: Kündigungseingang bis 23.08.2026', name);
    expect(main).toBe(reminder);
  });
});

describe('cleanDeadlineName — NEU-Format mit "– DRINGEND" (17.08.2026)', () => {
  // Wurzel des Realitätscheck-Befunds: Der Generator (calendarEvents.js:1075) baut
  // die kritische Stufe als "1 Tag vorher – DRINGEND: {Frist}" (GEDANKENSTRICH).
  // Der Neu-Format-Strip kannte den Zusatz nicht — nur OLD_LEAD_PREFIX tolerierte
  // ihn (Bindestrich). Folge in Prod: 54 fehlende Zeilen, 55 Phantom-Karten.
  test('Gedankenstrich-Variante (Generator-Original) → Frist-Schlüssel', () => {
    // 1:1 der belmoto/TerraTech-Titel aus der Prod-DB
    expect(cleanDeadlineName('🔴 1 Tag vorher – DRINGEND: Kündigungseingang bis 20.08.2026'))
      .toBe('Kündigungseingang bis 20.08.2026');
  });

  test('Bindestrich-Variante → derselbe Schlüssel', () => {
    expect(cleanDeadlineName('🔴 3 Tage vorher - DRINGEND: Ende der Mindestmietdauer'))
      .toBe('Ende der Mindestmietdauer');
  });

  test('Haupt-Event und DRINGEND-Vorwarner landen in derselben Familie', () => {
    const name = 'belmoto_GmbH.pdf';
    const main = cleanDeadlineName('⚠️ Kündigungseingang bis 14.08.2026: belmoto_GmbH.pdf', name);
    const reminder = cleanDeadlineName('🔴 1 Tag vorher – DRINGEND: Kündigungseingang bis 14.08.2026', name);
    expect(reminder).toBe(main);
  });

  test('"DRINGEND" mitten im Frist-Namen wird NICHT angetastet', () => {
    // Der Zusatz darf nur direkt nach "N Tage vorher" entfernt werden
    expect(cleanDeadlineName('🚨 7 Tage vorher: DRINGEND zu klärende Nachzahlung'))
      .toBe('DRINGEND zu klärende Nachzahlung');
  });
});

describe('completeDanglingLabel — Anzeige-Vervollständigung (Frontend-Spiegel)', () => {
  test('hängende Präposition + Datums-String', () => {
    expect(completeDanglingLabel('Kündigungseingang bis', '2026-08-23'))
      .toBe('Kündigungseingang bis 23.08.2026');
  });

  test('Doppelpunkt-Form bleibt UNVERÄNDERT (includes()-Duplikat-Heuristik)', () => {
    expect(completeDanglingLabel('Kündigungseingang bis:', '2026-08-23'))
      .toBe('Kündigungseingang bis:');
  });

  test('Semantik-Schutz: "liegt vor" bleibt unverändert', () => {
    expect(completeDanglingLabel('Kündigung liegt vor', '2026-08-23'))
      .toBe('Kündigung liegt vor');
  });

  test('Datums-String wird lokal geankert (kein UTC-Vortag-Kipp)', () => {
    // "2026-01-01" darf in keiner Zeitzone als 31.12.2025 erscheinen
    expect(completeDanglingLabel('Zahlbar bis', '2026-01-01'))
      .toBe('Zahlbar bis 01.01.2026');
  });

  test('vollständiges Label bleibt unverändert', () => {
    expect(completeDanglingLabel('Mindestlaufzeit endet', '2026-08-23'))
      .toBe('Mindestlaufzeit endet');
  });

  test('ohne/mit ungültigem Datum bleibt das Label unverändert (nie kappen)', () => {
    expect(completeDanglingLabel('Kündigungseingang bis', undefined)).toBe('Kündigungseingang bis');
    expect(completeDanglingLabel('Kündigungseingang bis', 'quatsch')).toBe('Kündigungseingang bis');
    expect(completeDanglingLabel('Kündigungseingang bis', null)).toBe('Kündigungseingang bis');
  });

  test('Idempotenz: Datum am Ende → kein Doppel-Anhängen', () => {
    expect(completeDanglingLabel('Kündigungseingang bis 23.08.2026', '2026-08-23'))
      .toBe('Kündigungseingang bis 23.08.2026');
  });
});

describe('reminderLeadLabel — Stufen-Beschriftung', () => {
  test('Alt-Format normalisiert auf Grundform', () => {
    expect(reminderLeadLabel(FAMILIE_A[0].title)).toBe('30 Tage vorher');
    expect(reminderLeadLabel(FAMILIE_A[1].title)).toBe('2 Wochen vorher');
    expect(reminderLeadLabel(FAMILIE_A[3].title)).toBe('3 Tage vorher'); // "- DRINGEND" toleriert
  });

  test('Neu-Format unverändert erkannt', () => {
    expect(reminderLeadLabel(FAMILIE_B[0].title)).toBe('2 Wochen vorher');
    expect(reminderLeadLabel(FAMILIE_B[1].title)).toBe('7 Tage vorher');
  });

  test('Haupt-Events liefern null', () => {
    expect(reminderLeadLabel(FAMILIE_A_MAIN.title)).toBeNull();
    expect(reminderLeadLabel(FAMILIE_B_MAIN.title)).toBeNull();
  });

  test('Angehängtes Datum erzeugt keinen Falsch-Treffer', () => {
    // "23.08.2026" enthält kein "Tage/Wochen/Monate vorher"-Muster
    expect(reminderLeadLabel('⚠️ Kündigungseingang bis 23.08.2026: datei.pdf')).toBeNull();
  });
});

describe('isReminderEntry — Vorwarner vs. Haupt-Event', () => {
  test.each([...FAMILIE_A, ...FAMILIE_B])('Vorwarner erkannt: $type', (e) => {
    expect(isReminderEntry(e)).toBe(true);
  });

  test('Haupt-Events sind keine Vorwarner', () => {
    expect(isReminderEntry(FAMILIE_A_MAIN)).toBe(false);
    expect(isReminderEntry(FAMILIE_B_MAIN)).toBe(false);
  });
});

describe('belongsToDeadline / deadlineKeyOf — Referenz-Vorrang (Stufe 4, 19.08.2026)', () => {
  const FRIST = { id: 'F1', title: '⚠️ Kündigungseingang bis 20.08.2026: belmoto_GmbH.pdf', type: 'CANCEL_DEADLINE' };
  const ZWILLING = { id: 'F2', title: '⚠️ Kündigungseingang bis 20.08.2026: belmoto_GmbH.pdf', type: 'CANCEL_DEADLINE' };

  test('Referenz matcht → gehört dazu, auch ohne Titel-Ähnlichkeit', () => {
    const r = { title: '🔴 1 Tag vorher – DRINGEND: Völlig anderes Label', type: 'CANCEL_DEADLINE_REMINDER_1D', metadata: { deadlineEventId: 'F1' } };
    expect(belongsToDeadline(r, FRIST, 'belmoto_GmbH.pdf')).toBe(true);
  });

  test('Referenz auf ANDERE Frist schlägt zufällig passenden Titel (keine Doppel-Zuordnung bei Zwillingen)', () => {
    const r = { title: '🔴 1 Tag vorher – DRINGEND: Kündigungseingang bis 20.08.2026', type: 'CANCEL_DEADLINE_REMINDER_1D', metadata: { deadlineEventId: 'F2' } };
    expect(belongsToDeadline(r, FRIST, 'belmoto_GmbH.pdf')).toBe(false);
    expect(belongsToDeadline(r, ZWILLING, 'belmoto_GmbH.pdf')).toBe(true);
  });

  test('ohne Referenz greift der Titel-Rückfall (Altfall-Verhalten unverändert)', () => {
    const r = { title: '🔴 1 Tag vorher – DRINGEND: Kündigungseingang bis 20.08.2026', type: 'CANCEL_DEADLINE_REMINDER_1D' };
    expect(belongsToDeadline(r, FRIST, 'belmoto_GmbH.pdf')).toBe(true);
    const fremd = { title: '🔴 1 Tag vorher – DRINGEND: Ganz andere Frist', type: 'CANCEL_DEADLINE_REMINDER_1D' };
    expect(belongsToDeadline(fremd, FRIST, 'belmoto_GmbH.pdf')).toBe(false);
  });

  test('deadlineKeyOf: Vorwarner mit Referenz erbt den Schlüssel seiner FRIST (heilt Label-Abweichung)', () => {
    // Der reale Rest-Phantom-Fall der Messung vom 17.08.: KI-Label der Vorwarnung
    // ("Ende der Probezeit") weicht vom Frist-Label ("Probezeit endet") ab.
    const main = { id: 'M1', title: '👔 Probezeit endet: Arbeitsvertrag.pdf', type: 'PROBATION_END' };
    const rem = { id: 'R1', title: '⚠️ 7 Tage vorher: Ende der Probezeit', type: 'PROBATION_END_REMINDER_7D', metadata: { deadlineEventId: 'M1' } };
    const all = [main, rem];
    expect(deadlineKeyOf(rem, all, 'Arbeitsvertrag.pdf')).toBe('Probezeit endet');
    expect(deadlineKeyOf(rem, all, 'Arbeitsvertrag.pdf')).toBe(deadlineKeyOf(main, all, 'Arbeitsvertrag.pdf'));
  });

  test('deadlineKeyOf: ohne Referenz bzw. Referenz-Ziel nicht in der Liste → Titel-Schlüssel wie bisher', () => {
    const remOhne = { id: 'R2', title: '🚨 7 Tage vorher: Kündigungseingang bis 23.08.2026', type: 'CANCEL_DEADLINE_REMINDER_7D' };
    expect(deadlineKeyOf(remOhne, [remOhne], 'x.pdf')).toBe('Kündigungseingang bis 23.08.2026');
    const remFremdRef = { id: 'R3', title: '🚨 7 Tage vorher: Kündigungseingang bis 23.08.2026', type: 'CANCEL_DEADLINE_REMINDER_7D', metadata: { deadlineEventId: 'GIBTS-NICHT' } };
    expect(deadlineKeyOf(remFremdRef, [remFremdRef], 'x.pdf')).toBe('Kündigungseingang bis 23.08.2026');
  });

  test('deadlineKeyOf: Haupt-Termine nutzen IMMER ihren eigenen Titel-Schlüssel', () => {
    const main = { id: 'M1', title: '⚠️ Kündigungseingang bis 23.08.2026: datei.pdf', type: 'CANCEL_DEADLINE', metadata: { deadlineEventId: 'IRRELEVANT' } };
    expect(deadlineKeyOf(main, [main], 'datei.pdf')).toBe('Kündigungseingang bis 23.08.2026');
  });
});

describe('stripFileName — Anzeige-Titel', () => {
  test('Dateiname weg, Datum bleibt (Familie A Haupt-Event)', () => {
    expect(stripFileName(FAMILIE_A_MAIN.title)).toBe('⚠️ Kündigungseingang bis 23.08.2026');
  });

  test('Datum allein wird nie angetastet', () => {
    expect(stripFileName('Netzanschluss spätestens 30.09.2027'))
      .toBe('Netzanschluss spätestens 30.09.2027');
  });

  test('nie leerer Rückgabewert', () => {
    expect(stripFileName('nur-datei.pdf')).toBe('nur-datei.pdf');
  });
});

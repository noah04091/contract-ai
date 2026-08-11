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

// Unit-Tests für die Abdeckungs-Auskunft (Stufe 4, 19.08.2026).
const { buildCoverageMap, stageLabel, stageKind } = require('../../utils/reminderCoverage');

const NOW = new Date('2026-08-19T10:00:00Z');
const rem = (ref, daysUntil, date, status = 'scheduled') => ({
  date: new Date(date), status,
  metadata: { deadlineEventId: ref, daysUntil }
});

describe('stageLabel', () => {
  test('Singular/Plural/Fallback', () => {
    expect(stageLabel(1)).toBe('1 Tag vorher');
    expect(stageLabel(7)).toBe('7 Tage vorher');
    expect(stageLabel(30)).toBe('30 Tage vorher');
    expect(stageLabel(undefined)).toBe('Erinnerung');
    expect(stageLabel('quatsch')).toBe('Erinnerung');
  });
});

describe('stageKind', () => {
  test('notified schlägt alles, sonst Zukunft/Vergangenheit', () => {
    expect(stageKind({ status: 'notified', date: new Date('2026-08-01') }, NOW)).toBe('sent');
    expect(stageKind({ status: 'scheduled', date: new Date('2026-08-25') }, NOW)).toBe('upcoming');
    expect(stageKind({ status: 'scheduled', date: new Date('2026-08-01') }, NOW)).toBe('skipped');
    expect(stageKind({ status: 'expired', date: new Date('2026-08-01') }, NOW)).toBe('skipped');
  });
});

describe('buildCoverageMap', () => {
  test('gruppiert per Referenz, sortiert Stufen nach Datum', () => {
    const map = buildCoverageMap([
      rem('F1', 7, '2026-08-13T10:00:00Z', 'notified'),
      rem('F1', 1, '2026-08-19T10:00:00Z', 'notified'),
      rem('F1', 30, '2026-07-21T10:00:00Z', 'notified'),
      rem('F2', 7, '2026-09-01T10:00:00Z')
    ], NOW);
    expect(map.size).toBe(2);
    const f1 = map.get('F1');
    expect(f1.total).toBe(3);
    expect(f1.stages.map(s => s.label)).toEqual(['30 Tage vorher', '7 Tage vorher', '1 Tag vorher']);
    expect(f1.stages.every(s => s.kind === 'sent')).toBe(true);
    expect(map.get('F2').stages[0].kind).toBe('upcoming');
  });

  test('Vorwarner ohne Referenz werden übersprungen (kein Raten)', () => {
    const map = buildCoverageMap([
      { date: new Date('2026-08-25'), status: 'scheduled', metadata: { daysUntil: 7 } },
      rem('F1', 7, '2026-08-25T10:00:00Z')
    ], NOW);
    expect(map.size).toBe(1);
    expect(map.get('F1').total).toBe(1);
  });

  test('ObjectId-artige Referenzen werden als String-Schlüssel normalisiert', () => {
    const oidLike = { toString: () => 'abc123' };
    const map = buildCoverageMap([rem(oidLike, 7, '2026-08-25T10:00:00Z')], NOW);
    expect(map.has('abc123')).toBe(true);
  });

  test('leere/fehlende Eingabe → leere Map', () => {
    expect(buildCoverageMap([], NOW).size).toBe(0);
    expect(buildCoverageMap(undefined, NOW).size).toBe(0);
  });
});

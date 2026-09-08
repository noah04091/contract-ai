// 📁 backend/tests/unit/calendarUpcomingDaysUntil.test.js
// QA-Punkt 2 (08.09.2026, BUG-007): /api/calendar/upcoming lieferte daysUntil durchgängig
// +1 zu hoch (ceil auf einer Zeitstempel-Differenz; Events liegen auf 12:00 UTC).
// Der Wurzel-Fix vom 28.06.2026 (utils/calendarDaysUntil) hatte diese Anzeige-Route übersehen.

const fs = require('fs');
const path = require('path');
const { calendarDaysUntil } = require('../../utils/calendarDaysUntil');

describe('calendarDaysUntil — Kalendertage statt angebrochener Zeitdifferenz', () => {
  test('Event morgen 12:00 UTC, heute 08:00 → 1 (der QA-Fall: vorher 2)', () => {
    const now = new Date('2026-09-08T08:00:00Z');
    const event = new Date('2026-09-09T12:00:00Z');
    // Alte Rechnung zum Vergleich: ceil((event-now)/Tag) = ceil(1,17) = 2 — falsch.
    expect(Math.ceil((event - now) / 86400000)).toBe(2);
    expect(calendarDaysUntil(event, now)).toBe(1);
  });

  test('Event später am selben Tag → 0 (vorher 1)', () => {
    const now = new Date('2026-09-08T08:00:00Z');
    expect(calendarDaysUntil(new Date('2026-09-08T18:00:00Z'), now)).toBe(0);
  });

  test('QA-Beleg 23.09. bei heute 08.09. → 15 (vorher 16)', () => {
    const now = new Date('2026-09-08T09:00:00Z');
    expect(calendarDaysUntil(new Date('2026-09-23T12:00:00Z'), now)).toBe(15);
  });
});

describe('Source-Scan: die Anzeige-Route nutzt das gemeinsame Util', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../routes/calendar.js'), 'utf8');

  test('routes/calendar.js verwendet calendarDaysUntil', () => {
    expect(src).toMatch(/require\("\.\.\/utils\/calendarDaysUntil"\)/);
    expect(src).toContain('daysUntil: calendarDaysUntil(');
  });

  test('keine ceil-Zeitstempel-Rechnung für daysUntil mehr in der Route', () => {
    expect(src).not.toMatch(/daysUntil:\s*Math\.ceil/);
  });
});

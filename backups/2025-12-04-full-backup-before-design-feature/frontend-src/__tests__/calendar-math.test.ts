/**
 * 🧪 Jest/Vitest Unit-Tests für Kalender-Mathematik
 *
 * Testet: Monatslängen, Schaltjahre, ISO-Wochenschema
 * Zweck: Absicherung gegen Updates von react-calendar und Browser-Änderungen
 */

// Helper-Funktionen für Kalender-Mathematik
function daysInMonth(year: number, monthIndex0: number): number {
  // monthIndex0: 0=Jan, 1=Feb, ..., 11=Dez
  const lastDay = new Date(year, monthIndex0 + 1, 0);
  return lastDay.getDate();
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getISOWeekday(date: Date): number {
  // ISO: 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa, 7=So
  const day = date.getDay();
  return day === 0 ? 7 : day; // Sonntag von 0 auf 7 umrechnen
}

// ===== Tests =====

describe('Calendar Math - Monatslängen', () => {
  test('Januar hat immer 31 Tage', () => {
    expect(daysInMonth(2025, 0)).toBe(31);
    expect(daysInMonth(2024, 0)).toBe(31);
  });

  test('Februar hat 28 Tage in Nicht-Schaltjahren', () => {
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2023, 1)).toBe(28);
  });

  test('Februar hat 29 Tage in Schaltjahren', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2020, 1)).toBe(29);
  });

  test('April hat immer 30 Tage', () => {
    expect(daysInMonth(2025, 3)).toBe(30);
    expect(daysInMonth(2024, 3)).toBe(30);
  });

  test('Oktober hat immer 31 Tage', () => {
    expect(daysInMonth(2025, 9)).toBe(31);
    expect(daysInMonth(2024, 9)).toBe(31);
  });
});

describe('Calendar Math - Schaltjahre', () => {
  test('2024 ist ein Schaltjahr', () => {
    expect(isLeapYear(2024)).toBe(true);
  });

  test('2025 ist kein Schaltjahr', () => {
    expect(isLeapYear(2025)).toBe(false);
  });

  test('2000 war ein Schaltjahr (durch 400 teilbar)', () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  test('1900 war kein Schaltjahr (durch 100, aber nicht durch 400 teilbar)', () => {
    expect(isLeapYear(1900)).toBe(false);
  });
});

describe('Calendar Math - ISO-Wochenschema', () => {
  test('1. Oktober 2025 ist ein Mittwoch', () => {
    const date = new Date(2025, 9, 1); // Oktober = Index 9
    const isoWeekday = getISOWeekday(date);
    expect(isoWeekday).toBe(3); // Mi = 3
  });

  test('ISO-Wochenschema: Montag = 1', () => {
    const monday = new Date(2025, 9, 6); // 6. Oktober 2025 ist Montag
    expect(getISOWeekday(monday)).toBe(1);
  });

  test('ISO-Wochenschema: Sonntag = 7', () => {
    const sunday = new Date(2025, 9, 5); // 5. Oktober 2025 ist Sonntag
    expect(getISOWeekday(sunday)).toBe(7);
  });
});

describe('Calendar Math - Vollständige Monate', () => {
  test('Alle Tage eines Monats sind zugänglich', () => {
    const year = 2025;
    const month = 9; // Oktober
    const days = daysInMonth(year, month);

    // Teste, dass alle Tage von 1 bis 31 gültig sind
    for (let day = 1; day <= days; day++) {
      const date = new Date(year, month, day);
      expect(date.getMonth()).toBe(month);
      expect(date.getDate()).toBe(day);
    }
  });
});

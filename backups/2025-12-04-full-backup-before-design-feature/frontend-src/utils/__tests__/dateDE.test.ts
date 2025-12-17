// 🧪 dateDE.test.ts - Unit tests for German date validation

import { parseDateDEorISO, formatDateDE, getTodayDE, isValidDateString } from "../dateDE";

describe("parseDateDEorISO", () => {
  test("validates German format (DD.MM.YYYY)", () => {
    const date = parseDateDEorISO("02.11.2025");
    expect(date).not.toBeNull();
    expect(date?.getUTCDate()).toBe(2);
    expect(date?.getUTCMonth()).toBe(10); // November = month 10
    expect(date?.getUTCFullYear()).toBe(2025);
  });

  test("validates ISO format (YYYY-MM-DD)", () => {
    const date = parseDateDEorISO("2025-11-02");
    expect(date).not.toBeNull();
    expect(date?.getUTCDate()).toBe(2);
    expect(date?.getUTCMonth()).toBe(10);
    expect(date?.getUTCFullYear()).toBe(2025);
  });

  test("rejects invalid date 31.04. (April has only 30 days)", () => {
    expect(parseDateDEorISO("31.04.2026")).toBeNull();
  });

  test("rejects invalid date 29.02. on non-leap year", () => {
    expect(parseDateDEorISO("29.02.2023")).toBeNull();
  });

  test("accepts valid date 29.02. on leap year", () => {
    const date = parseDateDEorISO("29.02.2024");
    expect(date).not.toBeNull();
    expect(date?.getUTCDate()).toBe(29);
    expect(date?.getUTCMonth()).toBe(1); // February
  });

  test("rejects invalid month 13", () => {
    expect(parseDateDEorISO("15.13.2025")).toBeNull();
  });

  test("rejects invalid day 00", () => {
    expect(parseDateDEorISO("00.05.2025")).toBeNull();
  });

  test("rejects invalid day 32", () => {
    expect(parseDateDEorISO("32.01.2025")).toBeNull();
  });

  test("rejects malformed strings", () => {
    expect(parseDateDEorISO("1.2.2025")).toBeNull();      // Missing leading zeros
    expect(parseDateDEorISO("01-02-2025")).toBeNull();    // Wrong separator
    expect(parseDateDEorISO("2025.11.02")).toBeNull();    // Wrong order
    expect(parseDateDEorISO("invalid")).toBeNull();
    expect(parseDateDEorISO("")).toBeNull();
  });
});

describe("formatDateDE", () => {
  test("formats date to DD.MM.YYYY", () => {
    const date = new Date(Date.UTC(2025, 10, 2)); // November 2, 2025
    expect(formatDateDE(date)).toBe("02.11.2025");
  });

  test("adds leading zeros", () => {
    const date = new Date(Date.UTC(2025, 0, 5)); // January 5, 2025
    expect(formatDateDE(date)).toBe("05.01.2025");
  });
});

describe("getTodayDE", () => {
  test("returns today's date in German format", () => {
    const today = getTodayDE();
    expect(today).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);

    // Verify it's parseable
    expect(parseDateDEorISO(today)).not.toBeNull();
  });
});

describe("isValidDateString", () => {
  test("returns true for valid dates", () => {
    expect(isValidDateString("02.11.2025")).toBe(true);
    expect(isValidDateString("2025-11-02")).toBe(true);
  });

  test("returns false for invalid dates", () => {
    expect(isValidDateString("31.04.2026")).toBe(false);
    expect(isValidDateString("invalid")).toBe(false);
  });
});

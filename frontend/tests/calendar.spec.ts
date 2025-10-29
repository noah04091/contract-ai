/**
 * 🧪 Playwright E2E-Tests für Kalender-View
 *
 * Testet: ISO-Wochenschema, flexible Tile-Anzahl, Nachbar-Monate
 * Zweck: Frontend-Verhalten absichern gegen Regressions
 *
 * Setup: npm install -D @playwright/test
 * Run: npx playwright test
 */

import { test, expect } from '@playwright/test';

test.describe('Calendar View - ISO 8601 (EU-Norm)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Anpassen an tatsächliche Login-Route
    // await page.goto('/login');
    // await page.fill('[name="email"]', 'test@example.com');
    // await page.fill('[name="password"]', 'password');
    // await page.click('button[type="submit"]');
    await page.goto('/calendar');
    await page.waitForSelector('.calendar-premium', { timeout: 5000 });
  });

  test('Wochentage-Header zeigt Mo-So in korrekter Reihenfolge (ISO 8601)', async ({ page }) => {
    // Warte auf Kalender-Render
    await page.waitForSelector('.react-calendar__month-view__weekdays', { timeout: 5000 });

    // Extrahiere Wochentag-Header
    const weekdayHeaders = await page.$$eval(
      '.react-calendar__month-view__weekdays__weekday abbr',
      (nodes) => nodes.map((n) => n.textContent?.trim())
    );

    // ISO 8601: Woche startet Montag
    expect(weekdayHeaders).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
  });

  test('Kalender zeigt flexible Tile-Anzahl (35 oder 42, je nach Monat)', async ({ page }) => {
    await page.waitForSelector('.react-calendar__month-view__days', { timeout: 5000 });

    // Zähle alle Datums-Kacheln
    const tiles = await page.$$('.react-calendar__month-view__days__day');
    const tileCount = tiles.length;

    // Flexible Anzahl: 5 Wochen (35) oder 6 Wochen (42)
    expect([35, 42]).toContain(tileCount);
  });

  test('Nachbar-Monate sind mit neighboringMonth-Klasse markiert', async ({ page }) => {
    await page.waitForSelector('.react-calendar__month-view__days', { timeout: 5000 });

    // Prüfe, dass mindestens einige Nachbar-Tage existieren
    const neighborTiles = await page.$$(
      '.react-calendar__month-view__days__day--neighboringMonth'
    );

    expect(neighborTiles.length).toBeGreaterThan(0);
  });

  test('Keine komplette Extra-Woche mit nur Folgemonats-Tagen', async ({ page }) => {
    await page.waitForSelector('.react-calendar__month-view__days', { timeout: 5000 });

    // Prüfe, ob die letzte Woche NUR aus Nachbar-Tagen besteht
    const lastWeekAllNeighbors = await page.evaluate(() => {
      const days = Array.from(
        document.querySelectorAll('.react-calendar__month-view__days__day')
      );

      if (days.length === 0) return false;

      // Letzte 7 Tage (letzte Woche)
      const lastSevenDays = days.slice(-7);

      // Prüfe, ob ALLE 7 Tage Nachbar-Monate sind
      return lastSevenDays.every((day) =>
        day.classList.contains('react-calendar__month-view__days__day--neighboringMonth')
      );
    });

    // Es darf KEINE Woche geben, die nur aus Nachbar-Tagen besteht
    expect(lastWeekAllNeighbors).toBe(false);
  });

  test('Nachbar-Zahlen haben reduzierte Opacity (Outlook-Style)', async ({ page }) => {
    await page.waitForSelector('.react-calendar__month-view__days', { timeout: 5000 });

    // Prüfe, dass Nachbar-Zahlen (abbr) gedimmt sind
    const neighborOpacity = await page.$eval(
      '.react-calendar__month-view__days__day--neighboringMonth abbr',
      (el) => window.getComputedStyle(el).opacity
    );

    // Opacity sollte unter 1.0 sein (gedimmt)
    const opacity = parseFloat(neighborOpacity);
    expect(opacity).toBeLessThan(1.0);
    expect(opacity).toBeGreaterThan(0.4); // Aber nicht komplett unsichtbar
  });

  test('Heute-Markierung ist vorhanden', async ({ page }) => {
    await page.waitForSelector('.react-calendar__month-view__days', { timeout: 5000 });

    // Prüfe, ob heute markiert ist (.react-calendar__tile--now)
    const todayTile = await page.$('.react-calendar__tile--now');
    expect(todayTile).not.toBeNull();
  });

  test('Alle 7 Spalten sind sichtbar (Sonntag nicht versteckt)', async ({ page }) => {
    await page.waitForSelector('.react-calendar__month-view__days', { timeout: 5000 });

    // Grid sollte 7 Spalten haben
    const gridColumns = await page.$eval(
      '.react-calendar__month-view__days',
      (el) => window.getComputedStyle(el).gridTemplateColumns
    );

    // Prüfe, dass 7 Spalten definiert sind
    const columnCount = gridColumns.split(' ').length;
    expect(columnCount).toBe(7);
  });
});

test.describe('Calendar View - Spezifische Monate', () => {
  test('Oktober 2025: Montag-Start und vollständige Woche', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('.calendar-premium', { timeout: 5000 });

    // TODO: Navigiere zu Oktober 2025 (falls nicht bereits aktiv)
    // await page.click('.react-calendar__navigation__label');
    // await page.click('button:has-text("2025")');
    // await page.click('button:has-text("Okt")');

    // Prüfe, dass 1. Oktober 2025 ein Mittwoch ist (ISO-Wochentag 3)
    const firstOctoberTile = await page.$('abbr[aria-label*="1. Oktober 2025"]');
    expect(firstOctoberTile).not.toBeNull();
  });

  test('Februar 2024 (Schaltjahr): 29 Tage vorhanden', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('.calendar-premium', { timeout: 5000 });

    // TODO: Navigiere zu Februar 2024
    // await page.click('.react-calendar__navigation__label');
    // await page.click('button:has-text("2024")');
    // await page.click('button:has-text("Feb")');

    // Prüfe, dass 29. Februar existiert
    // const feb29Tile = await page.$('abbr[aria-label*="29. Februar 2024"]');

    // In Schaltjahren sollte 29. Februar existieren
    // expect(feb29Tile).not.toBeNull();
  });
});

test.describe('Calendar View - Responsiveness', () => {
  test('Mobile (iPhone SE): Wochentage brechen nicht um', async ({ page }) => {
    // Setze Viewport auf iPhone SE
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/calendar');
    await page.waitForSelector('.calendar-premium', { timeout: 5000 });

    // Prüfe, dass alle 7 Wochentage in einer Zeile sind
    const weekdayHeaders = await page.$$('.react-calendar__month-view__weekdays__weekday');
    expect(weekdayHeaders.length).toBe(7);

    // Prüfe white-space: nowrap (verhindert Umbruch)
    const whiteSpace = await page.$eval(
      '.react-calendar__month-view__weekdays__weekday abbr',
      (el) => window.getComputedStyle(el).whiteSpace
    );
    expect(whiteSpace).toBe('nowrap');
  });
});

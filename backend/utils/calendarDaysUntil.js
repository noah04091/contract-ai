// 📅 backend/utils/calendarDaysUntil.js
// EINE gemeinsame Quelle für relative Tageszahlen in ALLEN Benachrichtigungen
// ("Läuft in X Tagen ab", "Noch X Tage", "Verbleibend X Tage", "in X Tagen").
//
// Wurzel-Fix 28.06.2026: mehrere Mail-/Notification-Stellen rechneten
// `Math.ceil((ziel - now) / Tag)` → jede angebrochene Stunde zählte als ganzer Tag.
// Da der Versand-Cron um 07:00 UTC läuft, das Zieldatum aber eine spätere Uhrzeit trägt
// (Envelope-expiresAt = Erstellungszeit, Vertrags-expiryDate, Event-date um 12:00),
// wurde die Zahl um 1 zu hoch ("in 2 Tagen" obwohl morgen / "Verbleibend 4" statt 3).
//
// Lösung: Datum-gegen-Datum (beide auf lokalen Tagesbeginn normalisiert), Math.round für
// DST-Sicherheit. Identisch zum Frontend-Kalender (Calendar.tsx getDaysRemaining) und zur
// internen daysUntilEventDay-Logik (calendarNotifier ~Z.241) → alle Anzeigen konsistent.
//
// WICHTIG: NUR für die ANZEIGE gedacht. NICHT für Status-/Schwellen-Entscheidungen verwenden
// (z.B. smartStatusUpdater "abgelaufen ab daysLeft<=0") — dort ist die uhrzeitgenaue
// Berechnung bewusst, ein Wechsel würde Verträge ggf. einen Tag zu früh kippen.

/**
 * Verbleibende ganze Kalendertage von now bis targetDate.
 * @param {Date|string|number} targetDate - Zieldatum (Ablauf/Frist/Vertragsende/Event)
 * @param {Date} [now=new Date()] - Bezugszeitpunkt
 * @returns {number} ganze Kalendertage, nie negativ (Vergangenheit/ungültig → 0)
 */
function calendarDaysUntil(targetDate, now = new Date()) {
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return 0;
  const targetDateOnly = new Date(target);
  targetDateOnly.setHours(0, 0, 0, 0);
  const todayDateOnly = new Date(now);
  todayDateOnly.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((targetDateOnly - todayDateOnly) / 86400000));
}

module.exports = { calendarDaysUntil };

// backend/utils/calendarVisibility.js
//
// 3b — Welche Kalender-Events erscheinen in den NUTZER-SICHTBAREN Ansichten
// (Kalender-Liste, "Bald fällig", ICS-Export, In-App-Glocke)?
//
// Automatisch erzeugte VORWARNUNGEN (die "X Tage vorher"-Staffel + benannte Frist-
// Vorwarner) werden AUSGEBLENDET — der User sieht pro Frist nur noch 1 Eintrag (den
// eigentlichen Frist-Tag). Die Events bleiben in der DB und werden weiter per Mail
// versendet (calendarNotifier.js) — dies ist NUR ein Anzeige-Filter, KEINE
// Datenänderung. Bestehende wie neue Events gleichermaßen.
//
// SICHTBAR bleiben:
//   - Haupt-Frist-Events am Stichtag (CONTRACT_EXPIRY, LAST_CANCEL_DAY, … — keine Vorwarner)
//   - vom User selbst gesetzte Exakt-Datum-Erinnerungen (metadata.reminderType === "custom")
//   - manuell angelegte Termine (isManual / manuallyCreated)
//   - Signatur-Haupt-Events (sourceType === "ENVELOPE"), aber OHNE die 3-/1-Tag-Vorwarner (gebündelt)
//   - der "Kündigungsbestätigung erhalten?"-Follow-up (CANCELLATION_CONFIRMATION_CHECK,
//     bewusst NICHT in der Ausblend-Liste — eigener actionabler Hinweis)
//
// Erkennung NUR über den `type` — metadata.daysUntil ist als Marker untauglich
// (CANCEL_WARNING nutzt daysLeft, PRICE_INCREASE_WARNING daysUntilIncrease,
// PAYMENT_REMINDER daysUntilPayment). CUSTOM_REMINDER steht in der Liste, weil seine
// abgeleiteten Varianten (reminderType "expiry"/"cancellation") Vorwarner sind; die
// echten Exakt-Datum-Erinnerungen (reminderType "custom") rettet die Ausnahme unten.

const HIDE_REMINDER_TYPES = [
  "CANCEL_WARNING",
  "CANCELLATION_REMINDER",
  "MINIMUM_TERM_REMINDER",
  "PROBATION_REMINDER",
  "WARRANTY_REMINDER",
  "PRICE_INCREASE_WARNING",
  "PAYMENT_REMINDER",
  "CUSTOM_REMINDER",
  // Signatur-Vorwarner bündeln: pro Anfrage nur 1 Eintrag (Ablauf-/Abschluss-Event) sichtbar.
  // Diese Typen enden auf "DAY" und matchen das _REMINDER_\d+D$-Muster NICHT → hier explizit listen.
  "SIGNATURE_REMINDER_3DAY",
  "SIGNATURE_REMINDER_1DAY"
];

// MongoDB-$match-Fragment, das NUR sichtbare Events durchlässt.
// Behalte, wenn: manuell ODER Envelope ODER Exakt-Datum-Custom ODER
//   (Typ ist KEINE "_REMINDER_<N>D"-Staffel UND NICHT in HIDE_REMINDER_TYPES).
const VISIBLE_EVENT_MATCH = {
  $or: [
    { isManual: true },
    { manuallyCreated: true },
    // Envelope-Events sichtbar — AUSSER den Signatur-Vorwarnern (3-/1-Tag), die gebündelt werden.
    { $and: [{ sourceType: "ENVELOPE" }, { type: { $nin: HIDE_REMINDER_TYPES } }] },
    { "metadata.reminderType": "custom" },
    {
      $and: [
        { type: { $not: /_REMINDER_\d+D$/i } },
        { type: { $nin: HIDE_REMINDER_TYPES } }
      ]
    }
  ]
};

module.exports = { HIDE_REMINDER_TYPES, VISIBLE_EVENT_MATCH };

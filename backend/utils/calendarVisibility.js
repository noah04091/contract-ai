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
//   - Signatur-Erinnerungen (sourceType === "ENVELOPE")
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
  "CUSTOM_REMINDER"
];

// MongoDB-$match-Fragment, das NUR sichtbare Events durchlässt.
// Behalte, wenn: manuell ODER Envelope ODER Exakt-Datum-Custom ODER
//   (Typ ist KEINE "_REMINDER_<N>D"-Staffel UND NICHT in HIDE_REMINDER_TYPES).
const VISIBLE_EVENT_MATCH = {
  $or: [
    { isManual: true },
    { manuallyCreated: true },
    { sourceType: "ENVELOPE" },
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

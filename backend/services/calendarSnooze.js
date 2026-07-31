// 📅 services/calendarSnooze.js — "Später erinnern" (Snooze), 31.07.2026 (TÜV Paket B1)
//
// WURZELPROBLEM (TÜV-Befund, code-verifiziert): Alle drei Snooze-Pfade (Popup,
// Mail-Link, PATCH) verschoben das DATUM DES EVENTS SELBST. Für Vorwarnungen ist
// das richtig ("erinnere mich später"). Für ECHTE Frist-Termine (LETZTER TAG
// kündigen, Vertrag läuft ab, Klagefrist, Zahlung fällig …) ist es eine Lüge:
// Der Kalender zeigt danach ein falsches Frist-Datum, der User kann die echte
// Frist verpassen — durch unsere eigene Funktion.
//
// LÖSUNG (aus User-Sicht gedacht): "Erinnern in N Tagen" heißt beim User immer
// "ping mich später nochmal" — NIE "meine Frist hat sich verschoben".
//   • Erinnerungs-Events (Vorwarner, eigene Erinnerungen, Follow-ups): Datum
//     verschieben wie bisher — das IST die Erinnerung, sie darf wandern.
//   • Haupt-Frist-Events: Datum bleibt UNANTASTBAR. Stattdessen wird eine
//     ZUSÄTZLICHE eigene Erinnerung (CUSTOM_REMINDER, reminderType 'custom' =
//     feuert exakt am gewählten Tag) angelegt, deren Text das echte Frist-Datum
//     nennt. Wer das Datum wirklich ändern will, nutzt "Bearbeiten".
//
// Der Rückweg ist trivial: Helfer wird an 3 Stellen aufgerufen — Revert des
// Commits stellt das alte Verhalten vollständig wieder her.

const { ObjectId } = require("mongodb");
const { formatProvider } = require("../utils/formatProvider");

// Events mit Erinnerungs-Charakter: ihr Datum IST der Erinnerungszeitpunkt → darf wandern.
// Bewusst WHITELIST (konservativ): Alles Unbekannte gilt als Frist und wird geschützt —
// schlimmstenfalls bekommt ein Erinnerungs-Event die Zusatz-Erinnerung (nie schädlich),
// aber nie umgekehrt eine echte Frist ein verschobenes Datum.
function isDateShiftable(event) {
  const t = event?.type || "";
  return /_REMINDER_\d+D$/i.test(t)          // KI-Staffel-Vorwarner (30/7/1 Tage vorher)
    || /_REMINDER$/i.test(t)                  // Alt-Vorwarner ohne Tages-Suffix (CANCELLATION_REMINDER …)
    || t === "CUSTOM_REMINDER"                // eigene/abgeleitete Erinnerungen
    || t === "CANCELLATION_CONFIRMATION_CHECK" // "Bestätigung erhalten?"-Follow-up (+N Tage = gewollt)
    || event?.isManual === true               // vom User angelegte Termine: sein Datum, seine Wahl
    || event?.manuallyCreated === true;
}

/**
 * Wendet "Später erinnern" auf ein Event an.
 * @returns {Promise<{mode:'shifted'|'extraReminder', newDate:Date, message:string}>}
 */
async function applySnooze(db, event, snoozeDaysRaw) {
  const parsed = parseInt(snoozeDaysRaw);
  const days = Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  const now = new Date();
  const fmt = (d) => new Date(d).toLocaleDateString("de-DE");

  if (isDateShiftable(event)) {
    // Bisheriges Verhalten (bewusste Juni-Entscheidung "Snooze feuert wirklich wieder"):
    // ab JETZT bzw. ab Event-Datum (was später ist) + N Tage, status scheduled.
    const newDate = new Date(Math.max(now.getTime(), new Date(event.date).getTime()));
    newDate.setDate(newDate.getDate() + days);
    await db.collection("contract_events").updateOne(
      { _id: event._id },
      { $set: { date: newDate, status: "scheduled", snoozedUntil: newDate, updatedAt: now } }
    );
    return { mode: "shifted", newDate, message: `Erinnerung um ${days} Tage verschoben (neuer Erinnerungs-Tag: ${fmt(newDate)})` };
  }

  // ── Haupt-Frist: Datum NIE anfassen — zusätzliche Erinnerung anlegen ──
  const d = new Date();
  d.setDate(d.getDate() + days);
  const remindDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0); // 12:00-Konvention

  // Doppelklick-/Doppel-Link-Schutz: gleiche Zusatz-Erinnerung (gleicher Ursprung + Tag) nur einmal
  const existing = await db.collection("contract_events").findOne({
    userId: event.userId,
    type: "CUSTOM_REMINDER",
    "metadata.originEventId": event._id.toString(),
    date: remindDate,
    status: { $ne: "dismissed" }
  });
  const origStr = fmt(event.date);
  const message = `Zusätzliche Erinnerung am ${fmt(remindDate)} angelegt — der Termin selbst bleibt am ${origStr}.`;
  if (existing) return { mode: "extraReminder", newDate: remindDate, message };

  const cleanTitle = (event.title || "Termin").replace(/^[^0-9A-Za-zÀ-ÿ]+/, "");
  await db.collection("contract_events").insertOne({
    userId: event.userId,
    ...(event.contractId ? { contractId: event.contractId } : {}),
    contractName: event.contractName || event.metadata?.contractName || null,
    type: "CUSTOM_REMINDER",
    title: `🔔 Erneute Erinnerung: ${cleanTitle}`,
    description: `Von dir angefordert („in ${days} Tagen erinnern"). Der eigentliche Termin bleibt unverändert am ${origStr}: ${event.title}`,
    date: remindDate,
    severity: ["info", "warning", "critical"].includes(event.severity) ? event.severity : "info",
    status: "scheduled",
    isManual: false,
    metadata: {
      reminderType: "custom", // load-bearing: feuert exakt am gewählten Tag, bleibt sichtbar
      contractName: event.metadata?.contractName || event.contractName || null,
      provider: formatProvider(event.metadata?.provider) || null,
      originEventId: event._id.toString(),
      originalDate: event.date,
      source: "snooze-main-deadline"
    },
    createdAt: now,
    updatedAt: now
  });
  return { mode: "extraReminder", newDate: remindDate, message };
}

module.exports = { applySnooze, isDateShiftable };

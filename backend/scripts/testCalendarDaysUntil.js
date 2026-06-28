// 🧪 backend/scripts/testCalendarDaysUntil.js
// Regressionstest für die gemeinsame Mail-Tageszahl calendarDaysUntil() (28.06.2026).
// Deckt beide Fundstellen ab:
//   (1) Signatur-Ablauf-Mail  ("Läuft in X Tagen ab" / "Noch X Tage")
//   (2) Kündigungsfenster-Mail ("Verbleibend X Tage" bis Vertragsende)
// Beweist: calendarDaysUntil zählt KALENDERTAGE (korrekt), die alte Math.ceil-Formel
// zählte angebrochene Stunden als ganzen Tag (+1 zu hoch).
//
// Lauf:  node backend/scripts/testCalendarDaysUntil.js
// Read-only, keine DB, keine Seiteneffekte.

const { calendarDaysUntil } = require("../utils/calendarDaysUntil");

// Die ALTE (fehlerhafte) Formel — nur zum Vergleich nachgebaut.
function oldCeilFormula(targetDate, now) {
  return Math.max(0, Math.ceil((new Date(targetDate) - now) / (1000 * 60 * 60 * 24)));
}

// Cron-Lauf: 09:00 Berlin = 07:00 UTC (Sommerzeit) — wie im echten Versand.
const CRON_NOW = new Date("2026-06-28T07:00:00Z");

const cases = [
  // [Beschreibung, Zieldatum, erwartete KALENDERTAGE]
  ["Signatur: Ablauf MORGEN 14:30 ('Kaufvertrag'-Mail)", "2026-06-29T14:30:00Z", 1],
  ["Signatur: Ablauf in 3 Tagen 14:30 ('Individueller Vertrag')", "2026-07-01T14:30:00Z", 3],
  ["Signatur: Ablauf in 1 Tag, kurz nach Cron (08:00)", "2026-06-29T08:00:00Z", 1],
  ["Signatur: Ablauf HEUTE abends", "2026-06-28T20:00:00Z", 0],
  ["Kündigungsfenster: Vertragsende in 3 Tagen 12:00", "2026-07-01T12:00:00Z", 3],
  ["Kündigungsfenster: Vertragsende in 30 Tagen", "2026-07-28T09:00:00Z", 30],
  ["Kündigungsfenster: Vertragsende morgen", "2026-06-29T12:00:00Z", 1],
  ["Allgemein: Ziel in 7 Tagen", "2026-07-05T16:00:00Z", 7],
  ["Allgemein: Ziel in der Vergangenheit (nie negativ)", "2026-06-20T10:00:00Z", 0],
  ["Allgemein: ungültiges Datum → 0", "kein-datum", 0],
];

let pass = 0;
let fail = 0;

console.log("\n  Bezugszeit (Cron): " + CRON_NOW.toISOString() + "  (= 09:00 Berlin)\n");
console.log("  Szenario".padEnd(58) + "ALT(ceil)  NEU(fix)  Soll  Status");
console.log("  " + "-".repeat(92));

for (const [desc, targetDate, expected] of cases) {
  const neu = calendarDaysUntil(targetDate, CRON_NOW);
  let alt;
  try { alt = oldCeilFormula(targetDate, CRON_NOW); } catch { alt = "—"; }
  if (Number.isNaN(alt)) alt = "NaN";
  const ok = neu === expected;
  if (ok) pass++; else fail++;
  console.log(
    "  " + desc.padEnd(56) +
    String(alt).padStart(7) +
    String(neu).padStart(10) +
    String(expected).padStart(7) +
    "   " + (ok ? "✅" : "❌ FEHLER")
  );
}

console.log("  " + "-".repeat(92));
console.log(`\n  Ergebnis: ${pass}/${cases.length} bestanden` + (fail ? `, ${fail} FEHLGESCHLAGEN` : "") + "\n");

if (fail > 0) process.exit(1);

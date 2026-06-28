// 🧪 backend/scripts/testSignatureDaysUntilExpiry.js
// Regressionstest für den Off-by-one-Fix der Signatur-Ablauf-Mails (28.06.2026).
// Beweist: signatureDaysUntilExpiry() zählt KALENDERTAGE (korrekt), die alte
// Math.ceil-Formel zählte angebrochene Stunden als ganzen Tag (+1 zu hoch).
//
// Lauf:  node backend/scripts/testSignatureDaysUntilExpiry.js
// Read-only, keine DB, keine Seiteneffekte.

const { signatureDaysUntilExpiry } = require("../services/calendarNotifier");

// Die ALTE (fehlerhafte) Formel — nur zum Vergleich nachgebaut.
function oldCeilFormula(expiresAt, now) {
  return Math.max(0, Math.ceil((new Date(expiresAt) - now) / (1000 * 60 * 60 * 24)));
}

// Cron-Lauf: 09:00 Berlin = 07:00 UTC (Sommerzeit) — wie im echten Versand.
const CRON_NOW = new Date("2026-06-28T07:00:00Z");

const cases = [
  // [Beschreibung, expiresAt, erwartete KALENDERTAGE]
  ["Ablauf MORGEN 14:30 (deine 'Kaufvertrag'-Mail)", "2026-06-29T14:30:00Z", 1],
  ["Ablauf in 3 Tagen 14:30 (deine 'Individueller Vertrag'-Mail)", "2026-07-01T14:30:00Z", 3],
  ["Ablauf in 1 Tag, kurz nach Cron (08:00)", "2026-06-29T08:00:00Z", 1],
  ["Ablauf HEUTE abends", "2026-06-28T20:00:00Z", 0],
  ["Ablauf HEUTE früh, vor Cron (bereits vorbei)", "2026-06-28T05:00:00Z", 0],
  ["Ablauf in 7 Tagen", "2026-07-05T16:00:00Z", 7],
  ["Ablauf in der Vergangenheit (nie negativ)", "2026-06-20T10:00:00Z", 0],
];

let pass = 0;
let fail = 0;

console.log("\n  Bezugszeit (Cron): " + CRON_NOW.toISOString() + "  (= 09:00 Berlin)\n");
console.log("  Szenario".padEnd(58) + "ALT(ceil)  NEU(fix)  Soll  Status");
console.log("  " + "-".repeat(92));

for (const [desc, expiresAt, expected] of cases) {
  const neu = signatureDaysUntilExpiry(expiresAt, CRON_NOW);
  const alt = oldCeilFormula(expiresAt, CRON_NOW);
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

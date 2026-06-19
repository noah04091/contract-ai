/**
 * TÜV: "Alles am exakten Tag" (Bug 19.06.2026 — Mails kamen 1 bis 7 Tage zu früh).
 * node backend/scripts/testReminderOwnDayTiming.js
 *
 * Deckt alle 3 zu-früh-Klassen + die bewusste Ausnahme ab:
 *  (1) Vorwarnungen (14/7-Tage-Reminder)      → eigener Tag
 *  (2) Lifecycle-Notizen (Kündigungsfenster/letzter Tag/Verlängerung/Review/Preiserhöhung) → eigener Tag
 *  (3) Stichtag MIT Reminder-Abdeckung         → eigener Tag
 *  (Ausnahme) nackter Stichtag OHNE Reminder   → Lookahead-Sicherheitsnetz (früh, sonst gar keine Warnung)
 *  (Sicherheit) früh gespeichert (Uhrzeit < 09:00 UTC) → NICHT aufschieben (kein Miss)
 *
 * Testet die exportierten firesOnOwnDay + shouldDeferToOwnDay (= exakt die Inline-Entscheidung).
 */
const { firesOnOwnDay, shouldDeferToOwnDay } = require('../services/calendarNotifier');

let pass = 0, fail = 0;
const ok = (n, c, info = '') => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };

const noon = (type, extra = {}) => ({ type, date: new Date(Date.UTC(2026, 6, 20, 12, 0, 0)), ...extra }); // 12:00 UTC
const early = (type, extra = {}) => ({ type, date: new Date(Date.UTC(2026, 6, 20, 3, 0, 0)), ...extra });  // 03:00 UTC (gefährlich)

(async () => {
  console.log('\n════ Gehört auf den eigenen Tag? (firesOnOwnDay) ════');
  ok('Vorwarnung _REMINDER_14D → ja', firesOnOwnDay({ type: 'PAYMENT_DUE_REMINDER_14D' }, false) === true);
  ok('CANCEL_WARNING → ja', firesOnOwnDay({ type: 'CANCEL_WARNING' }, false) === true);
  ok('Lifecycle LAST_CANCEL_DAY → ja', firesOnOwnDay({ type: 'LAST_CANCEL_DAY' }, false) === true);
  ok('Lifecycle CANCEL_WINDOW_OPEN → ja', firesOnOwnDay({ type: 'CANCEL_WINDOW_OPEN' }, false) === true);
  ok('Lifecycle AUTO_RENEWAL → ja', firesOnOwnDay({ type: 'AUTO_RENEWAL' }, false) === true);
  ok('Lifecycle REVIEW → ja', firesOnOwnDay({ type: 'REVIEW' }, false) === true);
  ok('Lifecycle PRICE_INCREASE → ja', firesOnOwnDay({ type: 'PRICE_INCREASE' }, false) === true);
  ok('Stichtag CONTRACT_END MIT Reminder → ja', firesOnOwnDay({ type: 'CONTRACT_END' }, true) === true);
  ok('Stichtag CONTRACT_END OHNE Reminder → NEIN (Sicherheitsnetz)', firesOnOwnDay({ type: 'CONTRACT_END' }, false) === false);
  ok('Stichtag PAYMENT_DUE OHNE Reminder → NEIN', firesOnOwnDay({ type: 'PAYMENT_DUE' }, false) === false);

  console.log('\n════ (1) Vorwarnungen am exakten Tag ════');
  ok('Reminder morgen (12:00) → AUFSCHIEBEN', shouldDeferToOwnDay(noon('PAYMENT_DUE_REMINDER_14D'), 1, false) === true);
  ok('Reminder heute (Tag 0) → SENDEN', shouldDeferToOwnDay(noon('PAYMENT_DUE_REMINDER_14D'), 0, false) === false);

  console.log('\n════ (2) Lifecycle-Mails am exakten Tag (vorher bis 7 Tage zu früh!) ════');
  ok('LAST_CANCEL_DAY morgen → AUFSCHIEBEN', shouldDeferToOwnDay(noon('LAST_CANCEL_DAY'), 1, false) === true);
  ok('LAST_CANCEL_DAY in 5 Tagen → AUFSCHIEBEN (nicht 5 Tage zu früh)', shouldDeferToOwnDay(noon('LAST_CANCEL_DAY'), 5, false) === true);
  ok('CANCEL_WINDOW_OPEN in 7 Tagen → AUFSCHIEBEN', shouldDeferToOwnDay(noon('CANCEL_WINDOW_OPEN'), 7, false) === true);

  console.log('\n════ (3) Stichtag MIT Reminder am exakten Tag (der "fällig"-Fall) ════');
  ok('PAYMENT_DUE morgen, MIT Reminder → AUFSCHIEBEN', shouldDeferToOwnDay(noon('PAYMENT_DUE'), 1, true) === true);
  ok('CONTRACT_END in 5 Tagen, MIT Reminder → AUFSCHIEBEN', shouldDeferToOwnDay(noon('CONTRACT_END'), 5, true) === true);

  console.log('\n════ Ausnahme: nackter Stichtag OHNE Reminder → Sicherheitsnetz (bleibt früh) ════');
  ok('CONTRACT_END morgen, OHNE Reminder → NICHT aufschieben (Lookahead-Warnung)', shouldDeferToOwnDay(noon('CONTRACT_END'), 1, false) === false);
  ok('CONTRACT_END in 5 Tagen, OHNE Reminder → NICHT aufschieben', shouldDeferToOwnDay(noon('CONTRACT_END'), 5, false) === false);

  console.log('\n════ ⏱️ Zeit-Wächter: früh gespeichert → NICHT aufschieben (kein Miss) ════');
  ok('Reminder morgen aber 03:00 UTC → NICHT aufschieben', shouldDeferToOwnDay(early('PAYMENT_DUE_REMINDER_14D'), 1, false) === false);
  ok('LAST_CANCEL_DAY morgen aber 03:00 UTC → NICHT aufschieben', shouldDeferToOwnDay(early('LAST_CANCEL_DAY'), 1, false) === false);

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });

/**
 * Offline-LOGIK-Beweis für den 'other'-Vor-Beginn-Guard (analyze.js validateImportantDate, Check 3b).
 * node backend/scripts/testOtherDateGuard.js
 *
 * Hintergrund (Komplex-Test Re-Analyse 17.06.2026): GPT erfand für den unbefristeten
 * Aurelis-Arbeitsvertrag (Beginn 01.11.2026) ein "Ende des Wettbewerbsverbots" 31.12.2023
 * und typte es als 'other' (Konfidenz 60 %). 'other' ist BEWUSST aus PRE_START_IMPOSSIBLE_TYPES
 * ausgenommen → der bestehende Vor-Beginn-Guard griff nicht. Der Kalender filtert es als
 * "historisch", die rohe importantDates-Box (Detail-Modal) zeigte es aber als "898 Tage vergangen".
 *
 * Der neue Guard ist ENG gescopt (Kalender-Terminal-Leitplanke): NICHT jedes 'other' vor Beginn,
 * sondern nur die zweifelsfreie Müll-Konstellation: 'other' VOR Vertragsbeginn UND klar in der
 * Vergangenheit. So bleibt ein legitimes Zukunfts-'other' vor Beginn erhalten.
 */

let pass = 0, fail = 0;
const ok = (n, c, i = '') => { if (c) { pass++; console.log(`  ✅ ${n}${i ? ' — ' + i : ''}`); } else { fail++; console.log(`  ❌ ${n}${i ? ' — ' + i : ''}`); } };

// Exakte Replik der Inline-3b-Bedingung aus validateImportantDate (analyze.js):
//   type === 'other' && startFloor gültig && dateFloor < startFloor && dateFloor < today
const floor = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const rejectsOther = ({ type, date, startDate }, todayStr) => {
  if (type !== 'other' || !startDate) return false;
  const startFloor = floor(startDate);
  const dateFloor = floor(date);
  const today = floor(todayStr);
  if (isNaN(startFloor.getTime())) return false;
  return dateFloor < startFloor && dateFloor < today;
};

const TODAY = '2026-06-17'; // Re-Test-Datum

console.log('\n════════ 3b — \'other\' vor Beginn UND Vergangenheit → verwerfen ════════');

// 🎯 DER Aurelis-Fall: other 2023-12-31, Beginn 2026-11-01 → Müll, raus
ok('Aurelis: other 31.12.2023, Beginn 01.11.2026 → VERWORFEN',
   rejectsOther({ type: 'other', date: '2023-12-31', startDate: '2026-11-01' }, TODAY) === true);

console.log('\n──────── Schutz-Fälle: NICHT über-rejecten ────────');

// Legitimes Zukunfts-'other' VOR Beginn (z.B. angekündigtes Ereignis kurz vor Inkrafttreten)
// → vor Beginn, aber NICHT in Vergangenheit → bleibt
ok('Zukunfts-other vor Beginn (15.10.2026 < Beginn 01.11.2026, aber Zukunft) → BLEIBT',
   rejectsOther({ type: 'other', date: '2026-10-15', startDate: '2026-11-01' }, TODAY) === false);

// 'other' NACH Beginn (normaler kommender Stichtag) → bleibt
ok('other nach Beginn (01.06.2027) → BLEIBT',
   rejectsOther({ type: 'other', date: '2027-06-01', startDate: '2026-11-01' }, TODAY) === false);

// 'other' in Vergangenheit, aber NACH (späterem) Beginn — Altvertrag: Guard verlangt BEIDES
// → hier NICHT vom 3b-Guard erfasst (Kalender filtert Historisches separat)
ok('other in Vergangenheit aber nach Beginn (Altvertrag Beginn 2020, Datum 2021) → vom 3b-Guard NICHT erfasst',
   rejectsOther({ type: 'other', date: '2021-01-01', startDate: '2020-01-01' }, TODAY) === false);

// Andere Typen sind unberührt (3b zielt nur auf 'other')
ok('Typ end_date (nicht other) → 3b greift NICHT (anderer Guard zuständig)',
   rejectsOther({ type: 'end_date', date: '2023-12-31', startDate: '2026-11-01' }, TODAY) === false);
ok('Typ contract_signed vor Beginn (legitim) → 3b greift NICHT',
   rejectsOther({ type: 'contract_signed', date: '2026-10-15', startDate: '2026-11-01' }, TODAY) === false);

// Kein startDate bekannt → nicht anfassen (konservativ)
ok('other ohne bekanntes startDate → nicht verworfen (konservativ)',
   rejectsOther({ type: 'other', date: '2023-12-31', startDate: null }, TODAY) === false);

console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────\n`);
process.exit(fail === 0 ? 0 : 1);

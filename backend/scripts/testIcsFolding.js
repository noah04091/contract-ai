/**
 * testIcsFolding.js — Unit-Tests für die RFC-5545-Zeilenfaltung (icsGenerator.js)
 *
 * Regeln (RFC 5545 §3.1): max. 75 OKTETTE pro physischer Zeile; Fortsetzungs-
 * zeilen beginnen mit genau einem Leerzeichen (zählt zu den 75); Entfalten
 * (CRLF+Space entfernen) muss die Original-Zeile byte-identisch ergeben;
 * UTF-8-Zeichen (Umlaute 2 Byte, Emojis 4 Byte) dürfen nie zerschnitten werden.
 *
 * Aufruf: node scripts/testIcsFolding.js
 */
const { foldICSLine, generateICSFeed } = require('../utils/icsGenerator');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

function physicalLines(folded) {
  return folded.split('\r\n');
}
function unfold(folded) {
  return folded.replace(/\r\n /g, '');
}
function maxOctets(folded) {
  return Math.max(...physicalLines(folded).map(l => Buffer.byteLength(l, 'utf8')));
}

// 1) Kurze Zeile bleibt unangetastet
const short = 'SUMMARY:Kurz';
check('Kurze Zeile unverändert', foldICSLine(short) === short);

// 2) Der reale Fall aus dem Nach-TÜV: 78-Oktett-SUMMARY (kippte vorher über das Limit)
const real = 'SUMMARY:⚠️ Kündigungseingang bis 23.08.2026: rechnung-FM.F26008865870.pdf';
const realFolded = foldICSLine(real);
check('Real-Fall: alle physischen Zeilen ≤ 75 Oktette', maxOctets(realFolded) <= 75, `max=${maxOctets(realFolded)}`);
check('Real-Fall: Entfalten ergibt Original', unfold(realFolded) === real);

// 3) Lange Zeile mit Umlauten/ß (2-Byte-Zeichen an der Faltgrenze)
const umlauts = 'DESCRIPTION:' + 'äöüßÄÖÜ'.repeat(30);
const umlautsFolded = foldICSLine(umlauts);
check('Umlaut-Zeile: alle Zeilen ≤ 75 Oktette', maxOctets(umlautsFolded) <= 75, `max=${maxOctets(umlautsFolded)}`);
check('Umlaut-Zeile: Entfalten ergibt Original', unfold(umlautsFolded) === umlauts);
check('Umlaut-Zeile: kein zerschnittenes UTF-8', physicalLines(umlautsFolded).every(l => {
  try { return Buffer.from(l, 'utf8').toString('utf8') === l; } catch { return false; }
}));

// 4) Emoji-Zeile (4-Byte-Zeichen, Surrogate-Paare)
const emoji = 'SUMMARY:' + '🚨📅🔴'.repeat(25);
const emojiFolded = foldICSLine(emoji);
check('Emoji-Zeile: alle Zeilen ≤ 75 Oktette', maxOctets(emojiFolded) <= 75, `max=${maxOctets(emojiFolded)}`);
check('Emoji-Zeile: Entfalten ergibt Original', unfold(emojiFolded) === emoji);
check('Emoji-Zeile: kein halbes Surrogate-Paar', physicalLines(emojiFolded).every(l => !/[\uD800-\uDBFF]$/.test(l) && !/^[\s]?[\uDC00-\uDFFF]/.test(l.replace(/^ /, ''))));

// 5) Fortsetzungszeilen beginnen mit Leerzeichen
check('Fortsetzungszeilen starten mit Space', physicalLines(realFolded).slice(1).every(l => l.startsWith(' ')));

// 6) End-to-End: kompletter Feed hat keine über-lange Zeile
const feed = generateICSFeed([{
  _id: '00000000000000000000dead',
  title: '⚠️ Kündigungseingang bis 23.08.2026: rechnung-FM.F26008865870.pdf',
  description: 'Letzter Termin für Kündigungseingang — ein bewusst sehr langer Beschreibungstext mit Umlauten äöüß, damit auch DESCRIPTION gefaltet werden muss.',
  date: new Date(2026, 7, 23, 12, 0, 0),
  type: 'CANCEL_DEADLINE',
  severity: 'critical',
  metadata: { contractName: 'rechnung-FM.F26008865870.pdf' }
}]);
const feedMax = Math.max(...feed.split('\r\n').map(l => Buffer.byteLength(l, 'utf8')));
check('E2E-Feed: keine Zeile > 75 Oktette', feedMax <= 75, `max=${feedMax}`);
check('E2E-Feed: VCALENDAR-Klammern intakt', feed.includes('BEGIN:VCALENDAR') && feed.includes('END:VCALENDAR'));
check('E2E-Feed: SUMMARY nach Entfalten vollständig', unfold(feed).includes('Kündigungseingang bis 23.08.2026'));

console.log(`\n──────── Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ────────`);
process.exit(failed ? 1 : 0);

/**
 * Offline-Test der OCR-Weiche (14.06.2026). node backend/scripts/testOcrGate.js
 * Beweist: scan-typische Mehrseiter lösen OCR aus, normale digitale PDFs + kurze
 * 1-Seiter NICHT (kein Über-Auslösen).
 */
const { shouldAttemptOcr } = require('../utils/ocrGate');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};
const g = (text, numPages, isPdf = true) => shouldAttemptOcr({ text, numPages, isPdf });
const chars = n => 'x'.repeat(n);

console.log('\n════════ OCR-Weiche ════════');

// KEIN OCR — normale digitale Verträge (sollen unberührt bleiben)
ok('digital 1-Seiter (3000 Z.) → KEIN OCR', g(chars(3000), 1).ocr === false);
ok('digital 6-Seiter (6960 Z., ~1160/S.) → KEIN OCR', g(chars(6960), 6).ocr === false, 'echter Test-Agenturvertrag');
ok('kurzer 1-Seiter (800 Z.) → KEIN OCR', g(chars(800), 1).ocr === false, 'kurz aber digital, nicht über-auslösen');
ok('2-Seiter grenzwertig (250 Z. = 125/S.) → KEIN OCR', g(chars(250), 2).ocr === false, 'Dichte über 100');

// OCR — echte Bedarfsfälle
let r;
r = g(chars(150), 1); ok('sehr wenig Text (150 Z.) → OCR', r.ocr === true && r.reason === 'text_too_short', r.reason);
r = g('', 0); ok('leer → OCR', r.ocr === true && r.reason === 'text_too_short');
r = g(chars(300), 10); ok('gescannter 10-Seiter (300 Z. = 30/S.) → OCR (Dichte)', r.ocr === true && r.reason === 'low_density_scan', `avg=${r.avgPerPage}`);
r = g(chars(180), 2); ok('2-Seiter mit 180 Z. → OCR (Gesamttext-Regel)', r.ocr === true && r.reason === 'text_too_short');
r = g(chars(900), 12); ok('gescannter 12-Seiter (900 Z. = 75/S.) → OCR (Dichte)', r.ocr === true && r.reason === 'low_density_scan', `avg=${r.avgPerPage}`);

// Nicht-PDF unberührt
ok('Nicht-PDF (DOCX) → KEIN OCR', g(chars(50), 1, false).ocr === false);

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);

// 📨 Welle 1 (07.07.2026) — Offline-Test-Suite für die neue Dokumentart LETTER.
// GPT-frei: testet Heuristik, Label-Mapping, Prompt-Gating und Kalender-Kette.
// Aufruf: node scripts/testLetterWelle1.js   (aus backend/)
/* eslint-disable no-console */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ─────────────────────────────────────────────────────────────────────────────
// A) Türsteher 1 (Heuristik): Verträge dürfen NIE T1-LETTER werden;
//    Schreiben dürfen LETTER oder UNKNOWN sein (T2/GPT entscheidet final).
// ─────────────────────────────────────────────────────────────────────────────
const { detectDocumentType } = require('../routes/analyze');

const LETTER_SAMPLES = [
  ['AG-Kündigung', 'Kuendigungsschreiben.pdf', `Sehr geehrter Herr Liebold, hiermit kündigen wir Ihnen das mit Ihnen bestehende Arbeitsverhältnis ordentlich und fristgerecht zum 30.09.2026. Die Kündigungsfrist beträgt gemäß § 622 BGB zwei Monate zum Monatsende. Wir bedanken uns für Ihre Mitarbeit. Mit freundlichen Grüßen, Personalabteilung`],
  ['Abmahnung', 'Abmahnung_Schulz.pdf', `Abmahnung wegen unerlaubter Verwendung urheberrechtlich geschützter Lichtbilder. Namens und in Vollmacht unserer Mandantin fordern wir Sie auf, die beigefügte Unterlassungserklärung bis zum 21.07.2026 unterzeichnet zurückzusenden.`],
  ['Bescheid', 'Bescheid_Jobcenter.pdf', `Bescheid über die Bewilligung von Leistungen. Rechtsbehelfsbelehrung: Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden. Die Widerspruchsfrist beginnt mit der Bekanntgabe.`],
  ['Mahnbescheid', 'Mahnbescheid_AG_Coburg.pdf', `Mahnbescheid des Amtsgerichts Coburg. Gegen den Anspruch können Sie Widerspruch erheben. Die Widerspruchsfrist beträgt zwei Wochen ab Zustellung. Vollstreckungsbescheid ergeht bei Untätigkeit.`],
];

// Gegenproben: Verträge MIT Letter-ähnlichen Wörtern (Audit-Fund #7) — T1 darf sie nie als LETTER einstufen.
const CONTRACT_SAMPLES = [
  ['Aufhebungsvertrag', 'Aufhebungsvertrag_Mueller.pdf', `Aufhebungsvertrag zwischen der TechCorp GmbH und Herrn Müller. Die Parteien sind sich einig, dass das Arbeitsverhältnis einvernehmlich zum 31.12.2026 endet. Es wird eine Abfindung in Höhe von 15.000 EUR vereinbart. Beide Parteien unterzeichnen diesen Vertrag. Unterschrift Arbeitgeber, Unterschrift Arbeitnehmer.`],
  ['Kündigungsbestätigung', 'Kuendigungsbestaetigung_Telekom.pdf', `Sehr geehrter Kunde, hiermit bestätigen wir Ihre Kündigung. Ihre Kündigung ist bei uns eingegangen und wird wirksam zum 31.08.2026. Ihr Vertrag endet damit zu diesem Datum. Vielen Dank.`],
  ['Mietvertrag mit Abmahn-Klausel', 'Mietvertrag_Wohnung.pdf', `Mietvertrag zwischen Vermieter und Mieter über die Wohnung in der Hauptstraße 5. § 12: Bei vertragswidrigem Gebrauch kann der Vermieter nach erfolgloser Abmahnung das Mietverhältnis kündigen. Die Kündigungsfrist beträgt drei Monate. Laufzeit: unbefristet. Vertrag, Vereinbarung, Klausel.`],
  ['Police mit Widerspruchsbelehrung', 'Versicherungspolice.pdf', `Versicherungsvertrag / Police Nr. 12345. Widerspruchsbelehrung: Sie können dem Vertragsschluss innerhalb von 14 Tagen widersprechen (Widerspruchsfrist). Vertragslaufzeit 12 Monate, Verlängerung, Klausel, Vereinbarung, Bedingungen, Beitrag.`],
];

console.log('A) Türsteher-1-Heuristik');
for (const [name, file, text] of LETTER_SAMPLES) {
  const r = detectDocumentType(file, text, 1);
  check(`${name}: T1 ≠ CONTRACT (ist ${r.type}@${r.confidence.toFixed(2)})`, r.type !== 'CONTRACT');
}
for (const [name, file, text] of CONTRACT_SAMPLES) {
  const r = detectDocumentType(file, text, 2);
  check(`${name}: T1 ≠ LETTER (ist ${r.type}@${r.confidence.toFixed(2)})`, r.type !== 'LETTER');
}

// ─────────────────────────────────────────────────────────────────────────────
// B) letterTypeToLabel-Mapping
// ─────────────────────────────────────────────────────────────────────────────
console.log('B) letterTypeToLabel');
const { letterTypeToLabel, pilotTypeToLabel } = require('../utils/contractTypeLabels');
check('kuendigung_erhalten → Kündigungsschreiben (erhalten)', letterTypeToLabel('kuendigung_erhalten') === 'Kündigungsschreiben (erhalten)');
check('mahnbescheid → Gerichtlicher Mahnbescheid', letterTypeToLabel('mahnbescheid') === 'Gerichtlicher Mahnbescheid');
check('null → Schreiben (nie leer)', letterTypeToLabel(null) === 'Schreiben');
check('unbekannt → Schreiben', letterTypeToLabel('xyz') === 'Schreiben');
check('Regression: pilotTypeToLabel(rental) unverändert', pilotTypeToLabel('rental') === 'Mietvertrag');

// ─────────────────────────────────────────────────────────────────────────────
// C) DateHunt LETTER-Modus: Gating byte-genau (Vertrags-Pfad unverändert)
// ─────────────────────────────────────────────────────────────────────────────
console.log('C) DateHunt-Prompt-Gating');
const dh = require('../services/dateHuntService');
const sampleText = 'Der Vertrag beginnt am 01.09.2026 und hat eine Laufzeit von 12 Monaten.';
const contractJunior = dh.buildJuniorPrompt(sampleText);
const contractJuniorNull = dh.buildJuniorPrompt(sampleText, null);
const letterJunior = dh.buildJuniorPrompt(sampleText, { letter: true, letterType: 'kuendigung_erhalten' });
check('Vertrags-Junior-Prompt OHNE mode == mode:null (byte-identisch)', contractJunior === contractJuniorNull);
check('Vertrags-Prompt enthält KEIN klagefrist', !contractJunior.includes('klagefrist'));
check('Vertrags-Prompt enthält KEIN SONDERFALL', !contractJunior.includes('SONDERFALL'));
check('Letter-Prompt enthält klagefrist-Typ', letterJunior.includes('"klagefrist'));
check('Letter-Prompt enthält § 4 KSchG-Pflicht', letterJunior.includes('§ 4 KSchG'));
check('Letter-Prompt verbietet Vertrags-Typen', letterJunior.includes('kein start_date/end_date'));
const letterChunk = dh.buildChunkPrompt('Abschnitt', 0, 2, { letter: true, letterType: 'behoerdenbescheid' });
check('Letter-Chunk-Prompt enthält Widerspruchs-Hinweis', letterChunk.includes('widerspruchsfrist'));
const contractSenior = dh.buildSeniorPrompt(sampleText, { importantDates: [], fristHinweise: [] });
check('Vertrags-Senior-Prompt enthält KEIN klagefrist', !contractSenior.includes('klagefrist'));

// validateDateEntry akzeptiert neue Typen (keine Typ-Whitelist, Evidence-Gate greift)
const klageEntry = {
  type: 'klagefrist',
  date: '2026-07-28',
  label: 'Klagefrist spätestens 28.07.2026 (läuft ab Zugang)',
  description: '3 Wochen ab Zugang, § 4 KSchG',
  calculated: true,
  confidence: 55,
  source: 'Kündigungsschreiben',
  evidence: 'hiermit kündigen wir Ihnen das bestehende Arbeitsverhältnis ordentlich und fristgerecht'
};
const letterText = 'Sehr geehrter Herr X, hiermit kündigen wir Ihnen das bestehende Arbeitsverhältnis ordentlich und fristgerecht zum 30.09.2026.';
const vr = dh.validateDateEntry(klageEntry, letterText);
check('validateDateEntry akzeptiert klagefrist (Evidence im Text)', vr.valid === true, vr.reason);
const vrBad = dh.validateDateEntry({ ...klageEntry, evidence: 'dieser Satz steht nicht im Schreiben, sondern ist frei erfunden worden' }, letterText);
check('validateDateEntry verwirft halluzinierte Evidence weiter', vrBad.valid === false);

// ─────────────────────────────────────────────────────────────────────────────
// D) Kalender-Kette: LETTER-Contract → KLAGEFRIST critical + 30/7/1, KEINE Lifecycle-Events
// ─────────────────────────────────────────────────────────────────────────────
console.log('D) Kalender-Kette (generateEventsForContract)');
const { generateEventsForContract } = require('../services/calendarEvents');
const { ObjectId } = require('mongodb');
const stubDb = { collection: () => ({ find: () => ({ toArray: async () => [] }), findOne: async () => null, insertMany: async (docs) => ({ insertedCount: docs.length }), deleteMany: async () => ({ deletedCount: 0 }) }) };
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const letterContract = {
  _id: new ObjectId(), userId: new ObjectId(),
  name: 'Kündigungsschreiben Arbeitgeber',
  documentType: 'LETTER', letterType: 'kuendigung_erhalten', documentCategory: 'letter',
  status: 'Erhalten', analyzed: true,
  // LETTER-Guard-Zustand: alle Vertrags-Felder null
  expiryDate: null, endDate: null, startDate: null, gekuendigtZum: null,
  cancellationPeriod: null, isAutoRenewal: false, paymentAmount: null, paymentFrequency: null,
  canCancelAfterDate: null, minimumTerm: null,
  importantDates: [
    { type: 'klagefrist', date: inDays(18), label: 'Klagefrist spätestens (läuft ab Zugang — Empfangsdatum prüfen)', description: '3 Wochen § 4 KSchG', calculated: true, confidence: 55, source: 'Schreiben' },
    { type: 'other', date: inDays(80), label: 'Genannter Beendigungstermin', description: 'Im Schreiben genannt', calculated: false, confidence: 90, source: 'Schreiben' }
  ]
};
(async () => {
  const events = await generateEventsForContract(stubDb, letterContract);
  const klage = events.filter(e => e.type === 'KLAGEFRIST');
  check(`KLAGEFRIST-Event existiert (${klage.length} Einträge)`, klage.length >= 1);
  check('KLAGEFRIST severity=critical', klage[0] && klage[0].severity === 'critical');
  // 30/7/1-Staffelung: bei Frist in 18 Tagen sind 7+1-Reminder in der Zukunft möglich (30 nicht)
  const reminders = events.filter(e => typeof e.type === 'string' && e.type.startsWith('KLAGEFRIST_REMINDER'));
  check(`KLAGEFRIST-Reminder vorhanden (7/1 Tage; gefunden: ${reminders.length})`, reminders.length >= 2);
  const forbidden = events.filter(e => ['CONTRACT_END', 'CONTRACT_EXPIRY', 'CANCEL_WINDOW_OPEN', 'LAST_CANCEL_DAY', 'CANCEL_WARNING', 'AUTO_RENEWAL', 'PAYMENT_DUE', 'CANCELLATION_DATE'].includes(e.type));
  check(`KEINE Vertrags-Lifecycle-Events (gefunden: ${forbidden.map(e => e.type).join(',') || 'keine'})`, forbidden.length === 0);

  // Regression: normaler Vertrag erzeugt weiterhin Lifecycle
  const normalContract = {
    _id: new ObjectId(), userId: new ObjectId(), name: 'SaaS-Vertrag', analyzed: true,
    expiryDate: inDays(200), startDate: inDays(-100), isAutoRenewal: true, cancellationPeriod: { value: 3, unit: 'Monate' },
    importantDates: []
  };
  const nEvents = await generateEventsForContract(stubDb, normalContract);
  check(`Regression: Vertrag erzeugt weiter Lifecycle-Events (${nEvents.length} Events)`, nEvents.length > 0);
  check('Regression: Vertrag hat KEIN KLAGEFRIST-Event', !nEvents.some(e => e.type === 'KLAGEFRIST'));

  console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error('💥 Testlauf-Fehler:', err); process.exit(1); });

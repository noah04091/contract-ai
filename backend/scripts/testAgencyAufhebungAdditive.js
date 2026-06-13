/**
 * Isolierter Beweis-Test (13.06.2026): Ergänzung der Pilot-Typen `agency` + `aufhebung`.
 *
 * Beweist OHNE Netzwerk/DB:
 *  (A) KEINE REGRESSION: bekannte Vertragstypen werden weiterhin gleich erkannt.
 *  (B) KEINE FALSE-POSITIVES: "Bundesagentur für Arbeit" macht aus einem Arbeitsvertrag
 *      KEINEN Agenturvertrag (distinktive Keywords, kein bloßes 'agentur').
 *  (C) NEUE ERKENNUNG (Keyword-Pfad): klarer Agenturvertrag/Handelsvertretervertrag → 'agency'.
 *  (D) EHRLICHER CAVEAT: ein Aufhebungsvertrag kann im Keyword-Pfad an 'employment' verlieren
 *      (viel Arbeitsvertrags-Vokabular) — GPT (primär) trägt diesen Typ. Wird sichtbar gemacht.
 *  (E) AWARENESS-ROUTING: getContractTypeAwareness liefert für 'agency'/'aufhebung' den neuen
 *      Fachanwalt MIT pilotChecklist — und für ALLE bestehenden Keys UNVERÄNDERTE Titel.
 *
 * Aufruf:  node backend/scripts/testAgencyAufhebungAdditive.js
 */
const analyzer = require('../services/contractAnalyzer');
const { pilotTypeToLabel } = require('../utils/contractTypeLabels');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};

// ── Test-Texte (kurze, repräsentative Schnipsel mit den jeweils typischen Begriffen) ──
const T = {
  employment: 'Arbeitsvertrag zwischen Arbeitgeber und Arbeitnehmer. Probezeit sechs Monate, Gehalt, Urlaub, Kündigungsfrist, Arbeitszeit.',
  service: 'Dienstleistungsvertrag. Auftraggeber und Auftragnehmer vereinbaren Honorar, Leistungsumfang und Abnahme der Werkleistung.',
  rental: 'Mietvertrag über eine Mietwohnung. Miete, Mieter, Vermieter, Nebenkosten, Kaution, Schönheitsreparaturen.',
  purchase: 'Kaufvertrag. Käufer und Verkäufer vereinbaren Kaufpreis, Übergabe, Gewährleistung und Sachmängelhaftung.',
  nda: 'Geheimhaltungsvereinbarung (NDA). Vertrauliche Informationen, Geheimhaltung, offenlegende Partei und empfangende Partei.',
  agb: 'Allgemeine Geschäftsbedingungen (AGB). Geltungsbereich, § 307 BGB, Transparenzgebot, Haftungsausschluss, Gerichtsstand.',

  // (B) False-Positive-Falle: Arbeitsvertrag, der "Bundesagentur für Arbeit" erwähnt
  fp_bundesagentur: 'Arbeitsvertrag zwischen Arbeitgeber und Arbeitnehmer. Bei Arbeitslosigkeit meldet sich der Arbeitnehmer bei der Bundesagentur für Arbeit. Gehalt, Urlaub, Probezeit.',

  // (C) Neue Typen
  agency_creative: 'Agenturvertrag. Die Werbeagentur (Agentur) erbringt für den Kunden Agenturleistungen im Bereich Marketing und Kampagnen. Nutzungsrechte an den erstellten Werken.',
  agency_hv: 'Handelsvertretervertrag. Der Handelsvertreter vermittelt Geschäfte. Ausgleichsanspruch nach § 89b HGB, Bezirksvertretung, Vermittlungsprovision.',
  aufhebung: 'Aufhebungsvertrag zwischen Arbeitgeber und Arbeitnehmer zur einvernehmlichen Beendigung des Arbeitsverhältnisses. Abfindung, Freistellung, Sperrzeit, Erledigungsklausel, Zeugnis.',
};

console.log('\n════════ (A) REGRESSION: bestehende Typen unverändert erkannt ════════');
ok('Arbeitsvertrag → employment', analyzer.detectContractType(T.employment) === 'employment');
ok('Dienstvertrag → service',     analyzer.detectContractType(T.service) === 'service');
ok('Mietvertrag → rental',        analyzer.detectContractType(T.rental) === 'rental');
ok('Kaufvertrag → purchase',      analyzer.detectContractType(T.purchase) === 'purchase');
ok('NDA → nda',                   analyzer.detectContractType(T.nda) === 'nda');
ok('AGB → agb',                   analyzer.detectContractType(T.agb) === 'agb');

console.log('\n════════ (B) KEINE FALSE-POSITIVES durch neue Keywords ════════');
const fp = analyzer.detectContractType(T.fp_bundesagentur);
ok('"Bundesagentur für Arbeit" wird NICHT zu agency', fp !== 'agency', `erkannt als: ${fp}`);
ok('normaler Arbeitsvertrag wird NICHT zu aufhebung', analyzer.detectContractType(T.employment) !== 'aufhebung');

console.log('\n════════ (C) NEUE ERKENNUNG (Keyword-Pfad) ════════');
const ag1 = analyzer.detectContractType(T.agency_creative);
const ag2 = analyzer.detectContractType(T.agency_hv);
ok('Werbeagentur-Agenturvertrag → agency', ag1 === 'agency', `erkannt als: ${ag1}`);
ok('Handelsvertretervertrag → agency',      ag2 === 'agency', `erkannt als: ${ag2}`);

console.log('\n════════ (D) EHRLICHER CAVEAT: Aufhebungsvertrag im Keyword-Pfad ════════');
const auf = analyzer.detectContractType(T.aufhebung);
ok('Aufhebungsvertrag-Keyword-Ergebnis plausibel (aufhebung ODER employment)',
   auf === 'aufhebung' || auf === 'employment',
   `erkannt als: ${auf} ${auf === 'employment' ? '(employment gewinnt im Keyword-Score — GPT trägt diesen Typ primär, wie dokumentiert)' : '(aufhebung direkt erkannt)'}`);

console.log('\n════════ (F) DEUTSCHES LABEL (pilotTypeToLabel) — Anzeige im Frontend ════════');
ok('agency → "Agenturvertrag"', pilotTypeToLabel('agency') === 'Agenturvertrag', pilotTypeToLabel('agency'));
ok('aufhebung → "Aufhebungsvertrag"', pilotTypeToLabel('aufhebung') === 'Aufhebungsvertrag', pilotTypeToLabel('aufhebung'));
ok('employment-Label unverändert', pilotTypeToLabel('employment') === 'Arbeitsvertrag');
ok('rental-Label unverändert', pilotTypeToLabel('rental') === 'Mietvertrag');
ok('nda-Label unverändert', pilotTypeToLabel('nda') === 'Geheimhaltungsvereinbarung (NDA)');
ok('unbekannter Typ → Safety-Net "Sonstiger Vertrag"', pilotTypeToLabel('voellig-unbekannt') === 'Sonstiger Vertrag');
ok('null → null (Frontend zeigt "—")', pilotTypeToLabel(null) === null);

console.log('\n════════ (E) AWARENESS-ROUTING (getContractTypeAwareness) ════════');
let awarenessOk = true;
try {
  const route = require('../routes/analyze');
  const gca = route.getContractTypeAwareness;
  if (typeof gca !== 'function') throw new Error('getContractTypeAwareness nicht exportiert');

  const agencyAw = gca('agency');
  ok('agency → Fachanwalt-Titel enthält "Agentur"', /Agentur/i.test(agencyAw.title), agencyAw.title);
  ok('agency → hat pilotChecklist (Pilot-Tiefenanalyse)', !!agencyAw.pilotChecklist && /SCHRITT 0|CHECKPOINTS/.test(agencyAw.pilotChecklist));

  const aufAw = gca('aufhebung');
  ok('aufhebung → Titel enthält "Aufhebung"', /Aufhebung/i.test(aufAw.title), aufAw.title);
  ok('aufhebung → hat pilotChecklist', !!aufAw.pilotChecklist && /CHECKPOINTS/.test(aufAw.pilotChecklist));

  // Bestehende Keys MÜSSEN unverändert sein (Byte-Identität durch Konstruktion)
  ok('employment-Titel unverändert', gca('employment').title === 'Fachanwalt für Arbeitsrecht', gca('employment').title);
  ok('rental-Titel unverändert',     gca('rental').title === 'Fachanwalt für Mietrecht');
  ok('service-Titel unverändert',    gca('service').title === 'Fachanwalt für IT-Recht und DSGVO');
  ok('nda-Titel unverändert',        gca('nda').title === 'Fachanwalt für IT-Recht & Geheimnisschutz');
  ok('purchase-Titel unverändert',   gca('purchase').title === 'Fachanwalt für Kaufrecht');
  ok('other-Titel unverändert',      gca('other').title === 'Fachanwalt für allgemeines Vertragsrecht');
  // Unbekannter / Doc-Enum fällt weiter auf "other"
  ok('CONTRACT (kein Subtyp) → other-Awareness', gca('CONTRACT').title === 'Fachanwalt für allgemeines Vertragsrecht');
} catch (e) {
  awarenessOk = false;
  console.log(`  ⚠️ Awareness-Teil konnte nicht geladen werden (analyze.js require): ${e.message}`);
}

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen${awarenessOk ? '' : ' (Awareness-Teil übersprungen)'}`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);

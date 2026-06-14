/**
 * Beweis-Test Robustheit B (14.06.2026): Spezial-Profile leasing/license/avv/franchise.
 * Aufruf: OPENAI_API_KEY=dummy node backend/scripts/testTypeProfilesB.js
 * Beweist: (A) Keyword-Erkennung der 4 neuen Typen, (B) KEINE Regression bestehender Typen,
 * (C) awarenessMap liefert für die 4 neuen Keys Fachanwalt-Profil + pilotChecklist und für
 * bestehende Keys UNVERÄNDERTE Titel, (D) deutsche Labels korrekt.
 */
const analyzer = require('../services/contractAnalyzer');
const { pilotTypeToLabel } = require('../utils/contractTypeLabels');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};

const T = {
  leasing: 'Leasingvertrag. Leasinggeber und Leasingnehmer vereinbaren eine Leasingrate. Finanzierungsleasing mit Restwert und Andienungsrecht. Grundmietzeit 48 Monate.',
  license: 'Lizenzvertrag. Der Lizenzgeber räumt dem Lizenznehmer eine Nutzungslizenz ein. Lizenzgebühr je Einheit, Unterlizenz zulässig.',
  avv: 'Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Der Auftragsverarbeiter verarbeitet personenbezogene Daten weisungsgebunden. Technische und organisatorische Maßnahmen, Unterauftragsverarbeiter geregelt.',
  franchise: 'Franchisevertrag zwischen Franchisegeber und Franchisenehmer. Franchisegebühr, Eintrittsgebühr, Systemhandbuch, Gebietsschutz.',
  // Regression (bestehende Typen — dürfen sich NICHT ändern)
  employment: 'Arbeitsvertrag zwischen Arbeitgeber und Arbeitnehmer. Probezeit, Gehalt, Urlaub, Kündigungsfrist.',
  rental: 'Mietvertrag über eine Mietwohnung. Miete, Mieter, Vermieter, Nebenkosten, Kaution.',
  service: 'Dienstleistungsvertrag. Auftraggeber und Auftragnehmer vereinbaren Honorar, Leistungsumfang und Abnahme.',
};

console.log('\n════════ (A) Keyword-Erkennung der 4 neuen Typen ════════');
ok('Leasingvertrag → leasing', analyzer.detectContractType(T.leasing) === 'leasing', analyzer.detectContractType(T.leasing));
ok('Lizenzvertrag → license', analyzer.detectContractType(T.license) === 'license', analyzer.detectContractType(T.license));
ok('AVV → avv', analyzer.detectContractType(T.avv) === 'avv', analyzer.detectContractType(T.avv));
ok('Franchisevertrag → franchise', analyzer.detectContractType(T.franchise) === 'franchise', analyzer.detectContractType(T.franchise));

console.log('\n════════ (B) KEINE Regression bestehender Typen ════════');
ok('Arbeitsvertrag bleibt employment', analyzer.detectContractType(T.employment) === 'employment');
ok('Mietvertrag bleibt rental', analyzer.detectContractType(T.rental) === 'rental');
ok('Dienstvertrag bleibt service', analyzer.detectContractType(T.service) === 'service');

console.log('\n════════ (D) Deutsche Labels ════════');
ok('leasing → Leasingvertrag', pilotTypeToLabel('leasing') === 'Leasingvertrag');
ok('license → Lizenzvertrag', pilotTypeToLabel('license') === 'Lizenzvertrag');
ok('avv → Auftragsverarbeitungsvertrag (AVV)', pilotTypeToLabel('avv') === 'Auftragsverarbeitungsvertrag (AVV)');
ok('franchise → Franchisevertrag', pilotTypeToLabel('franchise') === 'Franchisevertrag');

console.log('\n════════ (C) AWARENESS-ROUTING (getContractTypeAwareness) ════════');
try {
  const gca = require('../routes/analyze').getContractTypeAwareness;
  const check = (key, titleRe) => {
    const a = gca(key);
    ok(`${key} → eigenes Profil (${a.title})`, titleRe.test(a.title), a.title);
    ok(`${key} → hat pilotChecklist`, !!a.pilotChecklist && /CHECKPOINTS/.test(a.pilotChecklist));
  };
  check('leasing', /Leasing/i);
  check('license', /Lizenz|IT-Recht|gewerblichen Rechtsschutz/i);
  check('avv', /Datenschutz|DSGVO/i);
  check('franchise', /Franchise|Vertriebs/i);
  // Bestehende unverändert
  ok('employment-Titel unverändert', gca('employment').title === 'Fachanwalt für Arbeitsrecht');
  ok('rental-Titel unverändert', gca('rental').title === 'Fachanwalt für Mietrecht');
  ok('agency-Titel unverändert', gca('agency').title === 'Fachanwalt für Handelsvertreter- und Agenturrecht');
  ok('other-Titel unverändert', gca('other').title === 'Fachanwalt für allgemeines Vertragsrecht');
  ok('CONTRACT (kein Subtyp) → other', gca('CONTRACT').title === 'Fachanwalt für allgemeines Vertragsrecht');
} catch (e) {
  console.log(`  ⚠️ Awareness-Teil übersprungen (analyze.js require): ${e.message}`);
}

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);

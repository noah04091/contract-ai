/**
 * V4 Holistic Pipeline: Strukturtest
 *
 * Prüft:
 *  1. Export-Oberfläche (alle neuen Funktionen exportiert)
 *  2. validateCompareIntent() normalisiert korrekt
 *  3. validateHolisticOutput() filtert generische Titel, invalid areas, Duplikate
 *  4. adaptSectionsToLegacySchema() baut differences/risks/recommendations korrekt
 *  5. Feature-Flag Schalter ist vorhanden
 *
 * Kein OPENAI_API_KEY nötig — Test ruft KEINE GPT-Calls auf.
 */
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-noop';

const m = require('../services/compareAnalyzer.js');

let pass = 0, fail = 0;
function assert(label, cond) {
  if (cond) { pass++; console.log('PASS: ' + label); }
  else { fail++; console.log('FAIL: ' + label); }
}

// ============================================
// Test 1: Export-Oberfläche
// ============================================
console.log('\n=== Test 1: Exports ===');
assert('runCompareHolisticPipeline exportiert', typeof m.runCompareHolisticPipeline === 'function');
assert('detectCompareIntent exportiert', typeof m.detectCompareIntent === 'function');
assert('runHolisticComparePass exportiert', typeof m.runHolisticComparePass === 'function');
assert('validateHolisticOutput exportiert', typeof m.validateHolisticOutput === 'function');
assert('adaptSectionsToLegacySchema exportiert', typeof m.adaptSectionsToLegacySchema === 'function');

// ============================================
// Test 2: validateHolisticOutput — Section Quality Control
// ============================================
console.log('\n=== Test 2: Trust-Guard ===');
const text1 = 'Der Jahresbeitrag beträgt 47,88 EUR. Die Versicherungssumme beträgt 5.000.000 EUR. Laufzeit ein Jahr. Paragraph 5 Absatz 2.';
const text2 = 'Der Jahresbeitrag beträgt 156,00 EUR. Die Versicherungssumme beträgt 3.000.000 EUR. Laufzeit ein Jahr. Paragraph 5 Absatz 2.';

const rawGood = {
  sections: [
    {
      title: 'Kosten & Beitrag',
      icon: '💰',
      clauseArea: 'payment',
      priority: 1,
      severity: 'high',
      doc1Value: '47,88 EUR/Jahr',
      doc2Value: '156,00 EUR/Jahr',
      doc1Quote: 'Der Jahresbeitrag beträgt 47,88 EUR',
      doc2Quote: 'Der Jahresbeitrag beträgt 156,00 EUR',
      difference: 'Doc2 ist 108,12 EUR teurer pro Jahr',
      explanation: 'Doc1 kostet 47,88 EUR, Doc2 kostet 156,00 EUR pro Jahr.',
      recommendation: 'Doc1 wählen wenn Preis wichtig',
      recommendationTarget: 1,
    },
    {
      title: 'Versicherungssumme',
      icon: '🛡️',
      clauseArea: 'liability',
      priority: 2,
      severity: 'medium',
      doc1Value: '5.000.000 EUR',
      doc2Value: '3.000.000 EUR',
      doc1Quote: 'Die Versicherungssumme beträgt 5.000.000 EUR',
      doc2Quote: 'Die Versicherungssumme beträgt 3.000.000 EUR',
      difference: 'Doc1 bietet 2 Mio EUR mehr Schutz',
      explanation: 'Doc1 deckt bis 5.000.000 EUR, Doc2 nur bis 3.000.000 EUR.',
      recommendation: 'Doc1 bei hohem Absicherungsbedarf',
      recommendationTarget: 1,
    },
    {
      title: 'Vertragslaufzeit',
      icon: '📅',
      clauseArea: 'duration',
      priority: 3,
      severity: 'low',
      doc1Value: '1 Jahr',
      doc2Value: '1 Jahr',
      explanation: 'Beide Verträge laufen ein Jahr.',
    },
    // Generischer Titel — muss verworfen werden
    {
      title: 'Sonstiges',
      icon: '📋',
      clauseArea: 'other',
      priority: 4,
      severity: 'low',
      doc1Value: 'x',
      doc2Value: 'y',
      explanation: 'irgendwas',
    },
    // Invalid clauseArea — muss verworfen werden
    {
      title: 'Unsinn',
      icon: '❓',
      clauseArea: 'made_up_area',
      priority: 5,
      severity: 'low',
      doc1Value: 'a',
      doc2Value: 'b',
      explanation: 'test',
    },
    // Halluzinierte Zahl (999 nicht in Texten) — muss verworfen werden
    {
      title: 'Selbstbeteiligung',
      icon: '💸',
      clauseArea: 'liability',
      priority: 6,
      severity: 'medium',
      doc1Value: '150 EUR',
      doc2Value: '200 EUR',
      explanation: 'Doc1 hat 999 EUR Selbstbeteiligung, Doc2 hat 200 EUR.',
    },
    // Identische Werte — muss verworfen werden (kein Unterschied)
    {
      title: 'Kündigungsfrist',
      icon: '🚪',
      clauseArea: 'termination',
      priority: 6.5,
      severity: 'low',
      doc1Value: '6 Monate',
      doc2Value: '6 Monate',
      explanation: 'Beide Dokumente haben die gleiche Kündigungsfrist.',
    },
    // Duplikat (gleiche normalisierter Titel wie oben) — muss verworfen werden
    {
      title: 'Kosten & Beitrag',
      icon: '💰',
      clauseArea: 'payment',
      priority: 7,
      severity: 'low',
      doc1Value: '47,88 EUR',
      doc2Value: '156,00 EUR',
      explanation: 'Nochmal die Kosten.',
    },
  ],
  overallRecommendation: {
    recommended: 1,
    reasoning: 'Doc1 ist günstiger und bietet mehr Versicherungssumme.',
    confidence: 85,
    conditions: ['Jahresbeitrag vorher prüfen'],
  },
  summary: {
    tldr: 'Doc1 günstiger, höhere Deckung.',
    detailedSummary: 'Doc1 ist bei Preis und Deckung überlegen.',
    verdict: 'Doc1 empfohlen.',
  },
  contract1Strengths: ['günstiger Preis', 'höhere Deckung'],
  contract1Weaknesses: [],
  contract2Strengths: [],
  contract2Weaknesses: ['teurer', 'niedrigere Deckung'],
};

const intent = {
  level: 'full',
  reason: 'Zwei ähnliche Versicherungen',
  comparableDimensions: ['payment', 'liability', 'duration'],
  nonComparableDimensions: [],
  userWarning: undefined,
  suggestedFocus: undefined,
};

const validated = m.validateHolisticOutput(rawGood, text1, text2, intent);

// Vertragslaufzeit hat "1 Jahr" vs "1 Jahr" → identisch → wird ebenfalls gedroppt
assert('2 Sections nach Validierung (6 dropped)', validated.sections.length === 2);
assert('Sektion 1 = Kosten & Beitrag (priority 1)', validated.sections[0].title === 'Kosten & Beitrag');
assert('Sektion 2 = Versicherungssumme (priority 2)', validated.sections[1].title === 'Versicherungssumme');
assert('Keine Section mit Titel "Sonstiges"', !validated.sections.some(s => s.title === 'Sonstiges'));
assert('Keine Section mit invalid area "made_up_area"', !validated.sections.some(s => s.clauseArea === 'made_up_area'));
assert('Keine Section mit halluzinierter 999 EUR', !validated.sections.some(s => /999/.test(s.explanation)));
assert('Keine Section mit identischen Werten (Kündigungsfrist)', !validated.sections.some(s => s.title === 'Kündigungsfrist'));
assert('Keine Section mit identischen Werten (Vertragslaufzeit)', !validated.sections.some(s => s.title === 'Vertragslaufzeit'));
assert('Compatibility-Info übernommen', validated.compatibility.level === 'full');
assert('overallRecommendation vorhanden', validated.overallRecommendation.recommended === 1);
assert('summary.tldr vorhanden', validated.summary.tldr === 'Doc1 günstiger, höhere Deckung.');

// ============================================
// Test 3: adaptSectionsToLegacySchema
// ============================================
console.log('\n=== Test 3: Legacy-Adapter ===');
const { differences, risks, recommendations } = m.adaptSectionsToLegacySchema(validated.sections);

assert('2 differences aus 2 sections', differences.length === 2);
assert('differences haben clauseArea', differences.every(d => !!d.clauseArea));
assert('differences haben severity', differences.every(d => !!d.severity));
assert('differences haben semanticType', differences.every(d => !!d.semanticType));
assert('_icon im difference', differences[0]._icon === '💰');

// Risks = nur high/critical Sections (1 Stück: Kosten mit severity=high)
assert('1 Risk aus high-severity Section', risks.length === 1);
assert('Risk ist für Doc2 (Doc1 ist recommendationTarget)', risks[0].contract === 2);

// Recommendations = nur Sections mit recommendation + target (2 von 2 haben target)
assert('2 Recommendations', recommendations.length === 2);

// ============================================
// Test 4: Feature-Flag Schalter im Code
// ============================================
console.log('\n=== Test 4: Feature-Flag ===');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'services', 'compareAnalyzer.js'), 'utf-8');
assert('COMPARE_HOLISTIC Feature-Flag im Code', /process\.env\.COMPARE_HOLISTIC\s*===\s*['"]true['"]/.test(src));
assert('runCompareHolisticPipeline wird aus runCompareV2PipelineNew aufgerufen', /if \(process\.env\.COMPARE_HOLISTIC === 'true'\)[\s\S]{0,200}runCompareHolisticPipeline/.test(src));
assert('HOLISTIC_HARD_CAP = 30 (Sicherheitsnetz, kein Formzwang)', /HOLISTIC_HARD_CAP\s*=\s*30/.test(src));
assert('Keine HOLISTIC_MIN_SECTIONS mehr (kein Mindest-Zwang)', !/HOLISTIC_MIN_SECTIONS\s*=/.test(src));
assert('Keine HOLISTIC_MAX_SECTIONS mehr (kein Höchst-Zwang)', !/HOLISTIC_MAX_SECTIONS\s*=/.test(src));
assert('GENERIC_SECTION_TITLE_REGEX vorhanden', /GENERIC_SECTION_TITLE_REGEX/.test(src));

// ============================================
// Test 5: Meta-Level Compatibility
// ============================================
console.log('\n=== Test 5: Meta-Compatibility Adaptation ===');
const metaIntent = {
  level: 'meta',
  reason: 'Haftpflicht vs Rechtsschutz sind fundamentally unterschiedliche Produkte',
  comparableDimensions: ['payment', 'parties'],
  nonComparableDimensions: ['liability', 'warranty'],
  userWarning: 'Achtung: fundamental unterschiedliche Produkte.',
  suggestedFocus: 'Nur Preis + Parteien vergleichen.',
};
const metaValidated = m.validateHolisticOutput({ sections: [] }, 'Haftpflicht Beitrag 50 EUR', 'Rechtsschutz Beitrag 80 EUR', metaIntent);
assert('Meta-Level übernommen', metaValidated.compatibility.level === 'meta');
assert('userWarning übernommen', metaValidated.compatibility.userWarning === 'Achtung: fundamental unterschiedliche Produkte.');
assert('suggestedFocus übernommen', metaValidated.compatibility.suggestedFocus === 'Nur Preis + Parteien vergleichen.');

// ============================================
// Zusammenfassung
// ============================================
console.log('\n' + pass + '/' + (pass + fail) + ' Tests bestanden');
if (fail > 0) {
  console.log('❌ V4 Holistic Pipeline: Tests fehlgeschlagen');
  process.exit(1);
}
console.log('✅ V4 Holistic Pipeline: Alle Struktur-Tests bestanden');
process.exit(0);

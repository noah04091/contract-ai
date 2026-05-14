// Smoke-Test für analysisGutachtenPdf.js — kein Server, kein DB.
// Rendert 4 Fixture-Verträge und prüft Buffer-Size + PDF-Magic.
// Run: node backend/scripts/smokeTestGutachtenPdf.js

const fs = require('fs');
const path = require('path');
const { generateGutachtenPdf } = require('../services/analysisGutachtenPdf');

const fixtures = [
  // Vollständige V2-Analyzer-Ausgabe — Object-Arrays mit reichen Feldern.
  // Spiegelt exakt das wider, was in der DB-Spalte landet (criticalIssues/recommendations/positiveAspects).
  {
    name: 'mietvertrag-v2-realistic',
    contract: {
      name: 'Mietvertrag Hauptstraße 12 – Berlin',
      contractType: 'mietvertrag',
      contractScore: 70,
      scoreReasoning:
        'Der Vertrag ist insgesamt solide, jedoch gibt es einige Klauseln, die den Mieter benachteiligen, wie die Schönheitsreparaturklausel und die Kleinreparaturregelung. Diese Punkte drücken den Score, obwohl die Kündigungsfristen und die Kaution im Rahmen der gesetzlichen Vorgaben liegen.',
      summary: [
        'Es handelt sich um einen unbefristeten Wohnraummietvertrag über eine 3-Zimmer-Wohnung in Berlin-Mitte.',
        'Die Kaltmiete beträgt 1.450 EUR monatlich zuzüglich 280 EUR Nebenkostenvorauszahlung.',
        'Die Kaution ist mit drei Monatsmieten (4.350 EUR) festgelegt und in drei Raten zahlbar.',
      ],
      legalAssessment: [
        'Der Vertrag entspricht in den Hauptklauseln den Anforderungen des BGB-Mietrechts (§§ 535 ff. BGB).',
        'Die Schönheitsreparaturklausel mit starren Fristen ist nach BGH-Rechtsprechung (VIII ZR 185/14) unwirksam.',
        'Die Kleinreparaturklausel ohne Höchstgrenze hält einer AGB-Kontrolle nach § 307 BGB nicht stand.',
        'Die Kündigungsfristen entsprechen § 573c BGB und sind unproblematisch.',
      ],
      comparison: [
        'Die Kaltmiete liegt 4% unter dem Berliner Mietspiegel für vergleichbare Lage und Ausstattung.',
        'Die Schönheitsreparaturklausel ist strenger als marktüblich — in 70% der aktuellen Mietverträge wird auf starre Fristen verzichtet.',
      ],
      typeSpecificFindings: [
        { checkpoint: 'Mietpreisbremse', status: 'ok', finding: 'Die Miete liegt innerhalb der zulässigen 10%-Grenze über der ortsüblichen Vergleichsmiete.', legalBasis: '§ 556d BGB' },
        { checkpoint: 'Kautionshöhe', status: 'ok', finding: 'Drei Monatsmieten Kaution entspricht der gesetzlichen Höchstgrenze und ist zulässig.', legalBasis: '§ 551 BGB' },
        { checkpoint: 'Schönheitsreparaturen', status: 'critical', finding: 'Starre Fristen für Schönheitsreparaturen — unwirksam nach BGH-Rechtsprechung.', legalBasis: '§ 307 BGB', clauseRef: '§ 9 Mietvertrag' },
        { checkpoint: 'Kleinreparaturen', status: 'issue', finding: 'Kleinreparaturklausel ohne Höchstgrenze pro Einzelfall und Jahr.', legalBasis: '§ 307 BGB', clauseRef: '§ 12 Mietvertrag' },
        { checkpoint: 'Indexmiete', status: 'not_applicable', finding: 'Kein Index- oder Staffelmietmodell vereinbart — keine Prüfung erforderlich.' },
      ],
      fristHinweise: [
        { type: 'Kündigung', title: 'Ordentliche Kündigung durch Mieter', description: 'Drei Monate zum Monatsende (§ 573c Abs. 1 BGB). Kündigungserklärung muss schriftlich erfolgen.', legalBasis: '§ 573c BGB' },
        { type: 'Mängelanzeige', title: 'Pflicht zur unverzüglichen Mängelanzeige', description: 'Mieter muss erkannte Mängel unverzüglich melden, um Schadensersatzansprüche zu wahren.', legalBasis: '§ 536c BGB' },
        { type: 'Mieterhöhung', title: 'Widerspruch gegen Mieterhöhung', description: 'Mieter hat zwei Monate Zeit zur Zustimmung oder Ablehnung einer Mieterhöhung.', legalBasis: '§ 558b BGB' },
      ],
      detailedLegalOpinion:
        'Der vorliegende Mietvertrag stellt einen typischen Wohnraummietvertrag dar, der in seinen Hauptbestimmungen den gesetzlichen Anforderungen genügt. Die Vertragslaufzeit ist unbefristet und entspricht damit dem Regelfall des deutschen Mietrechts. Die vereinbarte Kaltmiete von 1.450 EUR liegt unter dem Berliner Mietspiegel für vergleichbare Wohnungen in Mitte und wahrt die Vorgaben der Mietpreisbremse nach § 556d BGB.\n\n' +
        'Problematisch ist hingegen die Klausel zu Schönheitsreparaturen in § 9 des Vertrages. Diese sieht starre Fristen vor (alle 3 Jahre Bad und Küche, alle 5 Jahre Wohnräume) und wälzt damit die Renovierungspflicht entgegen § 535 Abs. 1 Satz 2 BGB unzulässig auf den Mieter ab. Der Bundesgerichtshof hat in ständiger Rechtsprechung (zuletzt BGH VIII ZR 185/14 vom 18.03.2015) entschieden, dass starre Fristenpläne den Mieter unangemessen benachteiligen und nach § 307 Abs. 1 BGB insgesamt unwirksam sind. Die Folge ist, dass der Mieter nicht zu Schönheitsreparaturen verpflichtet ist und der Vermieter die Wohnung nach Beendigung des Mietverhältnisses auf eigene Kosten renovieren muss.\n\n' +
        'Ähnliches gilt für die Kleinreparaturklausel in § 12. Auch diese hält einer AGB-Kontrolle nicht stand, da sie keine Höchstgrenze pro Einzelfall oder pro Jahr enthält. Nach allgemeiner Auffassung ist eine solche Klausel nur dann wirksam, wenn sie eine Obergrenze von etwa 100 EUR pro Einzelfall und 8% der Jahresmiete als Höchstbetrag nicht überschreitet. Im vorliegenden Fall fehlt jegliche Begrenzung, was die Klausel insgesamt nichtig macht.\n\n' +
        'Die übrigen Vertragsbestimmungen — insbesondere zu Kaution, Kündigungsfristen und Mieterhöhung — entsprechen den gesetzlichen Vorgaben und sind nicht zu beanstanden. Auch die Vereinbarung der Ratenzahlung der Kaution stellt einen mieterfreundlichen Bonus dar.\n\n' +
        'Empfehlung: Vor Unterzeichnung sollte der Vermieter auf die unwirksamen Klauseln in §§ 9 und 12 angesprochen und eine rechtskonforme Neufassung verhandelt werden. Ein Übergabeprotokoll mit Lichtbildern ist unbedingt zu erstellen. Die Verzinsung der Kaution auf einem separaten Mietkautionskonto sollte schriftlich nachgewiesen werden.',
      asymmetryAssessment: {
        rating: 'mostly-fair',
        favoredParty: 'Vermieter',
        explanation:
          'Die Klauseln zur Schönheitsreparatur und Kleinreparaturen sind leicht zugunsten des Vermieters ausgelegt, da sie den Mieter stärker belasten.',
      },
      completeness: {
        isComplete: true,
        observation: 'Alle wesentlichen Vertragsbestandteile sind vorhanden und ausgefüllt.',
      },
      criticalIssues: [
        {
          title: 'Starre Renovierungsfristen',
          description: '§ 9 sieht starre Fristen für Schönheitsreparaturen vor (alle 3 Jahre Bad/Küche, alle 5 Jahre Wohnräume).',
          riskLevel: 'high',
          legalBasis: '§ 307 BGB',
          consequence: 'Solche starren Fristen sind nach BGH-Rechtsprechung unwirksam — die Klausel ist insgesamt nichtig.',
        },
        {
          title: 'Kleinreparaturklausel ohne Höchstgrenze',
          description: '§ 12 verpflichtet den Mieter zu Kleinreparaturen ohne Begrenzung der Einzel- oder Jahreshöchstgrenze.',
          riskLevel: 'medium',
          legalBasis: '§ 307 BGB',
          consequence: 'Ohne Höchstgrenze unwirksam — Mieter haftet im Streitfall nicht für Kleinreparaturen.',
        },
      ],
      recommendations: [
        {
          title: 'Schönheitsreparaturklausel verhandeln',
          description: 'Sprechen Sie den Vermieter auf die unwirksame Klausel an und bitten Sie um Streichung oder rechtskonforme Neufassung.',
          priority: 'urgent',
          timeframe: 'Vor Unterzeichnung',
          effort: 'low',
        },
        {
          title: 'Übergabeprotokoll einfordern',
          description: 'Bestehen Sie auf der Übergabe eines schriftlichen Übergabeprotokolls mit Fotos vom Wohnungszustand.',
          priority: 'high',
          timeframe: 'Bei Einzug',
          effort: 'low',
        },
        {
          title: 'Kaution-Verzinsung schriftlich bestätigen lassen',
          description: 'Die Verzinsung der Kaution ist gesetzlich vorgeschrieben (§ 551 Abs. 3 BGB). Lassen Sie sich das Konto schriftlich nachweisen.',
          priority: 'medium',
          timeframe: 'Nach Einzug',
          effort: 'low',
        },
      ],
      positiveAspects: [
        {
          title: 'Marktübliche Kaltmiete',
          description: 'Die vereinbarte Kaltmiete entspricht dem örtlichen Mietspiegel und liegt nicht über der Kappungsgrenze.',
          impact: 'high',
        },
        {
          title: 'Gesetzliche Kündigungsfristen',
          description: 'Die vereinbarten Kündigungsfristen entsprechen exakt § 573c BGB — kein nachteiliger Spielraum.',
          impact: 'medium',
        },
      ],
      analysisCompletedAt: new Date('2026-05-02'),
      createdAt: new Date('2026-05-01'),
    },
    companyProfile: { companyName: 'Schmidt Immobilien Consulting' },
  },
  // Minimal — nur Score + 1 Empfehlung
  {
    name: 'nda-minimal',
    contract: {
      name: 'NDA – TechStartup AG',
      contractScore: 88,
      scoreReasoning:
        'Standard-NDA mit klar definiertem Geheimhaltungsumfang und angemessener Vertragsstrafe. Laufzeit 2 Jahre nach Vertragsende ist marktüblich.',
      recommendations: [
        {
          title: 'Bekannte Informationen ausschließen',
          description: 'Vor Unterzeichnung sicherstellen, dass intern bereits bekannte Informationen vom Geheimhaltungsumfang ausgenommen sind.',
          priority: 'medium',
        },
      ],
      createdAt: new Date('2026-04-15'),
    },
    companyProfile: null,
  },
  // Fallback-Pfad: contract.risiken als Object-Array (Alias-Variante des Analyzers)
  {
    name: 'factoring-risiken-alias',
    contract: {
      name: 'Factoring-Vertrag Q3-2026',
      contractScore: 45,
      risiken: [
        {
          title: 'Rückgriffsrecht bei Forderungsausfall',
          description: 'Der Factor hat ein vollständiges Rückgriffsrecht bei Forderungsausfall (§ 4) — echtes Factoring liegt damit nicht vor.',
          riskLevel: 'critical',
          legalBasis: '§ 305c BGB',
        },
        {
          title: 'Mindestumsatzklausel',
          description: 'Mindestumsatz von 500.000 EUR/Quartal — Unterschreitung führt zu Vertragsstrafe von 8% des Differenzbetrags.',
          riskLevel: 'high',
        },
      ],
      optimierungen: [
        'Mindestumsatz auf Halbjahresbasis statt Quartalsbasis verhandeln',
      ],
      createdAt: new Date('2026-03-20'),
    },
    companyProfile: { companyName: 'Schmidt GmbH', logoUrl: null },
  },
  // String-only Legacy-Fall: nur String-Arrays in risiken/optimierungen
  {
    name: 'legacy-string-arrays',
    contract: {
      name: 'Legacy Beratungsvertrag',
      contractScore: 60,
      risiken: ['Haftungsbegrenzung auf grobe Fahrlässigkeit unwirksam (§ 309 Nr. 7 BGB)'],
      optimierungen: ['Salvatorische Klausel ergänzen', 'Schriftformerfordernis explizit aufnehmen'],
      createdAt: new Date('2026-02-10'),
    },
    companyProfile: null,
  },
];

(async () => {
  const outDir = path.join(__dirname, '..', '..', 'tmp-pdfs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let pass = 0;
  let fail = 0;

  for (const fx of fixtures) {
    const t0 = Date.now();
    try {
      const buf = await generateGutachtenPdf({ contract: fx.contract, companyProfile: fx.companyProfile });
      const ms = Date.now() - t0;

      if (!Buffer.isBuffer(buf)) throw new Error('Result ist kein Buffer');
      if (buf.length < 2000) throw new Error(`Buffer zu klein: ${buf.length} bytes`);
      const magic = buf.slice(0, 4).toString('utf8');
      if (magic !== '%PDF') throw new Error(`Magic-Bytes falsch: "${magic}"`);

      const outFile = path.join(outDir, `gutachten-${fx.name}.pdf`);
      fs.writeFileSync(outFile, buf);

      console.log(`✅ ${fx.name.padEnd(32)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB · ${String(ms).padStart(4)}ms · ${outFile}`);
      pass++;
    } catch (err) {
      console.error(`❌ ${fx.name.padEnd(32)} FEHLER: ${err.message}`);
      console.error(err.stack);
      fail++;
    }
  }

  console.log(`\n${pass} pass · ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
})();

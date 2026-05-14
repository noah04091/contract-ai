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

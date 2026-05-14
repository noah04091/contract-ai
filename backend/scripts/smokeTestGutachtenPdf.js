// Smoke-Test für analysisGutachtenPdf.js — kein Server, kein DB.
// Rendert 3 Fixture-Verträge und prüft Buffer-Size + PDF-Magic.
// Run: node backend/scripts/smokeTestGutachtenPdf.js

const fs = require('fs');
const path = require('path');
const { generateGutachtenPdf } = require('../services/analysisGutachtenPdf');

const fixtures = [
  {
    name: 'mietvertrag-vollstaendig',
    contract: {
      name: 'Mietvertrag Hauptstraße 12 – Berlin',
      contractType: 'mietvertrag',
      contractScore: 67,
      scoreReasoning:
        'Der Vertrag enthält marktübliche Klauseln zu Miete und Nebenkosten. Allerdings ist die Kündigungsfrist mit 3 Monaten zum Quartalsende ungewöhnlich lang und benachteiligt den Mieter. Schönheitsreparaturklausel ist nach BGH-Rechtsprechung problematisch.',
      asymmetryAssessment: {
        rating: 'mostly-fair',
        favoredParty: 'Vermieter',
        explanation:
          'Schönheitsreparaturen sind formularvertraglich auf den Mieter abgewälzt — entspricht nicht der aktuellen BGH-Rechtsprechung zu starren Fristen.',
      },
      completeness: {
        isComplete: false,
        observation:
          'Das Übergabeprotokoll ist als Anlage erwähnt, lag der Analyse aber nicht vor.',
        openItems: ['Wohnungsübergabeprotokoll', 'Hausordnung'],
      },
      analysis: {
        contractType: 'Wohnraummietvertrag',
        parties: { provider: 'Müller Hausverwaltung GmbH', customer: 'Anna Schmidt' },
        analyzedAt: new Date(),
        concerningAspects: [
          {
            title: 'Starre Renovierungsfristen',
            description:
              '§ 9 sieht starre Fristen für Schönheitsreparaturen vor (alle 3 Jahre Bad/Küche, alle 5 Jahre Wohnräume).',
            impact:
              'Solche starren Fristen sind nach BGH-Rechtsprechung unwirksam — die Klausel ist insgesamt nichtig.',
          },
          {
            title: 'Kautionshöhe an Grenze',
            description: 'Kaution beträgt 3 Monatsmieten — gerade noch zulässig nach § 551 BGB.',
            impact:
              'Keine rechtliche Beanstandung, aber Mieter sollte auf Verzinsung achten (gesetzlich vorgeschrieben).',
          },
        ],
        recommendations: [
          'Verhandeln Sie die Schönheitsreparaturklausel — eine unwirksame Klausel zu Lasten des Vermieters ist möglich.',
          'Bestehen Sie auf der Übergabe eines schriftlichen Übergabeprotokolls.',
          'Lassen Sie sich die Verzinsung der Kaution schriftlich bestätigen.',
        ],
      },
      analysisCompletedAt: new Date(),
      createdAt: new Date('2026-05-01'),
    },
    companyProfile: { companyName: 'Schmidt Immobilien Consulting' },
  },
  {
    name: 'nda-minimal',
    contract: {
      name: 'NDA – TechStartup AG',
      contractScore: 88,
      scoreReasoning:
        'Standard-NDA mit klar definiertem Geheimhaltungsumfang und angemessener Vertragsstrafe. Laufzeit 2 Jahre nach Vertragsende ist marktüblich.',
      analysis: {
        recommendations: [
          'Vor Unterzeichnung sicherstellen, dass intern bereits bekannte Informationen vom Geheimhaltungsumfang ausgenommen sind.',
        ],
      },
      createdAt: new Date('2026-04-15'),
    },
    companyProfile: null,
  },
  {
    name: 'factoring-leer',
    contract: {
      name: 'Factoring-Vertrag Q3-2026',
      contractScore: 45,
      // Kein scoreReasoning, kein asym, kein completeness, keine analysis-Daten
      risiken: [
        'Rückgriffsrecht des Factors bei Forderungsausfall (§ 4)',
        'Mindestumsatzklausel von 500.000 EUR/Quartal',
      ],
      optimierungen: [
        'Mindestumsatz auf Halbjahresbasis statt Quartalsbasis verhandeln',
      ],
      createdAt: new Date('2026-03-20'),
    },
    companyProfile: { companyName: 'Schmidt GmbH', logoUrl: null },
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

      // Validierung
      if (!Buffer.isBuffer(buf)) throw new Error('Result ist kein Buffer');
      if (buf.length < 2000) throw new Error(`Buffer zu klein: ${buf.length} bytes`);
      const magic = buf.slice(0, 4).toString('utf8');
      if (magic !== '%PDF') throw new Error(`Magic-Bytes falsch: "${magic}"`);

      const outFile = path.join(outDir, `gutachten-${fx.name}.pdf`);
      fs.writeFileSync(outFile, buf);

      console.log(`✅ ${fx.name.padEnd(30)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB · ${String(ms).padStart(4)}ms · ${outFile}`);
      pass++;
    } catch (err) {
      console.error(`❌ ${fx.name.padEnd(30)} FEHLER: ${err.message}`);
      console.error(err.stack);
      fail++;
    }
  }

  console.log(`\n${pass} pass · ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
})();

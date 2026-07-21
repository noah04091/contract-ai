// 🎯 Score-Kalibrierungs-Messung (21.07.2026) — Noahs Frage nach dem Go:
// Nutzt gpt-5.4 die VOLLE Skala 0-100? Bekommt ein wirklich GUTER Vertrag auch
// beim strengen Prüfer eine Top-Note? Unsere bisherigen Fixtures waren alle
// absichtlich fehlerhaft — hier: 2 bewusst FAIRE Verträge + 1 bekannt schlechter
// (Referenz), jeweils 2 Läufe. Reine Messung, KEINE Prompt-Änderung.
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env node -r dotenv/config scripts/testScoreCalibration.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { generateDeepLawyerLevelPrompt, resolveSystemPrompt } = require('../routes/analyze');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.CAL_MODEL || 'gpt-5.4-2026-03-05'; // exakt das Live-Modell

// ── Fixture 1: FAIRER Mietvertrag (bewusst ausgewogen, gesetzeskonform) ──
const FAIR_MIETVERTRAG = `MIETVERTRAG über Wohnraum

zwischen Herrn Thomas Berger, Gartenstraße 8, 50667 Köln (Vermieter)
und Frau Julia Winter, derzeit Am Bach 3, 50667 Köln (Mieterin)

§ 1 Mietsache
Vermietet wird die Wohnung im 1. OG links, Gartenstraße 8, 50667 Köln, bestehend aus 3 Zimmern, Küche, Bad, Balkon, ca. 78 m². Ein Kellerraum (Nr. 4) wird mitvermietet.

§ 2 Mietbeginn und Laufzeit
Das Mietverhältnis beginnt am 01.10.2026 und läuft auf unbestimmte Zeit. Die Kündigung richtet sich nach den gesetzlichen Vorschriften (§ 573c BGB).

§ 3 Miete und Nebenkosten
Die monatliche Grundmiete beträgt 890,00 EUR. Auf die Betriebskosten gemäß § 2 BetrKV leistet die Mieterin eine monatliche Vorauszahlung von 220,00 EUR. Über die Betriebskosten wird jährlich innerhalb der gesetzlichen Frist des § 556 Abs. 3 BGB abgerechnet. Miete und Vorauszahlung sind bis zum dritten Werktag eines Monats im Voraus zu zahlen.

§ 4 Kaution
Die Mieterin leistet eine Kaution in Höhe von 1.780,00 EUR (zwei Grundmieten). Die Zahlung ist gemäß § 551 Abs. 2 BGB in drei gleichen monatlichen Raten zulässig, beginnend mit Mietbeginn. Der Vermieter legt die Kaution getrennt von seinem Vermögen bei einer Bank zum üblichen Zinssatz an.

§ 5 Schönheitsreparaturen
Die Wohnung wird renoviert übergeben. Schönheitsreparaturen trägt die Mieterin nur, soweit sie während der Mietzeit erforderlich werden; starre Fristenpläne gelten nicht.

§ 6 Untervermietung
Die Untervermietung eines Teils der Wohnung ist mit vorheriger Erlaubnis des Vermieters zulässig; die Erlaubnis wird nur aus wichtigem Grund verweigert (§ 553 BGB bleibt unberührt).

§ 7 Tierhaltung
Kleintiere dürfen frei gehalten werden. Über die Haltung von Hunden und Katzen entscheidet der Vermieter im Einzelfall nach billigem Ermessen; die Zustimmung wird nicht unbillig verweigert.

§ 8 Instandhaltung / Kleinreparaturen
Die Mieterin trägt Kosten für Kleinreparaturen an Gegenständen ihres häufigen Zugriffs bis 100,00 EUR im Einzelfall, höchstens 8 % der Jahresgrundmiete pro Jahr.

§ 9 Betreten der Wohnung
Der Vermieter darf die Wohnung nach rechtzeitiger Ankündigung (mindestens 48 Stunden) zu üblichen Zeiten aus konkretem Anlass besichtigen.

§ 10 Schlussbestimmungen
Änderungen und Ergänzungen bedürfen der Textform. Es gilt deutsches Recht. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.

Köln, den 01.09.2026
Thomas Berger (Vermieter)          Julia Winter (Mieterin)`;

// ── Fixture 2: FAIRER Dienstleistungsvertrag (ausgewogen, beidseitig) ──
const FAIR_DIENSTVERTRAG = `DIENSTLEISTUNGSVERTRAG

zwischen der Nordwind Consulting GmbH, Hafenweg 12, 20457 Hamburg (Auftragnehmerin)
und der Bergmann Maschinenbau GmbH, Industriestraße 44, 44263 Dortmund (Auftraggeberin)

§ 1 Vertragsgegenstand
Die Auftragnehmerin berät die Auftraggeberin bei der Einführung eines ERP-Systems. Der Leistungsumfang ist in Anlage 1 beschrieben. Änderungen des Leistungsumfangs bedürfen der Textform und werden nach Aufwand zu den Sätzen in § 3 vergütet, sofern die Parteien nichts anderes vereinbaren.

§ 2 Laufzeit und Kündigung
Der Vertrag beginnt am 01.11.2026 und läuft bis zum Projektabschluss, längstens 12 Monate. Beide Parteien können mit einer Frist von 6 Wochen zum Monatsende ordentlich kündigen. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt für beide Seiten unberührt. Bereits erbrachte Leistungen werden bei Kündigung anteilig vergütet.

§ 3 Vergütung und Zahlung
Die Vergütung beträgt 1.200,00 EUR pro Beratertag (8 Stunden) zzgl. gesetzlicher Umsatzsteuer. Reisekosten werden nach tatsächlichem Aufwand gegen Beleg erstattet, Fahrten mit dem Pkw mit 0,30 EUR/km. Rechnungen sind monatlich nachträglich zu stellen und binnen 21 Tagen ohne Abzug zahlbar. Bei Zahlungsverzug gelten die gesetzlichen Verzugszinsen (§ 288 BGB).

§ 4 Mitwirkung der Auftraggeberin
Die Auftraggeberin stellt der Auftragnehmerin die erforderlichen Informationen, Zugänge und Ansprechpartner rechtzeitig zur Verfügung. Verzögerungen aufgrund fehlender Mitwirkung gehen nicht zu Lasten der Auftragnehmerin; Mehraufwand wird nach vorheriger Anzeige nach Aufwand vergütet.

§ 5 Haftung
Die Parteien haften einander bei Vorsatz und grober Fahrlässigkeit unbeschränkt. Bei einfacher Fahrlässigkeit haften sie nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vertragstypischen, vorhersehbaren Schaden, höchstens jedoch auf die Gesamtvergütung dieses Vertrages. Die Haftung für Schäden an Leben, Körper und Gesundheit sowie nach dem Produkthaftungsgesetz bleibt unberührt.

§ 6 Vertraulichkeit
Beide Parteien behandeln Geschäfts- und Betriebsgeheimnisse der jeweils anderen Partei vertraulich, auch über das Vertragsende hinaus für die Dauer von 3 Jahren.

§ 7 Datenschutz
Die Parteien beachten die geltenden Datenschutzvorschriften. Soweit die Auftragnehmerin personenbezogene Daten im Auftrag verarbeitet, schließen die Parteien vor Beginn eine Vereinbarung nach Art. 28 DSGVO.

§ 8 Ergebnisse und Nutzungsrechte
Die im Rahmen des Projekts erstellten Berichte und Konzepte darf die Auftraggeberin zeitlich unbeschränkt für interne Zwecke nutzen. Vorbestehende Methoden und Werkzeuge der Auftragnehmerin bleiben deren Eigentum.

§ 9 Schlussbestimmungen
Es gilt deutsches Recht. Gerichtsstand ist Hamburg, sofern beide Parteien Kaufleute sind. Änderungen bedürfen der Textform. Salvatorische Klausel: Die Unwirksamkeit einzelner Bestimmungen lässt den Vertrag im Übrigen unberührt.

Hamburg, den 15.10.2026`;

async function analyzeText(text, ctype, tag) {
  const userPrompt = generateDeepLawyerLevelPrompt(text, ctype, 'AB', `cal-${tag}`, 40000, { includeEvidence: true });
  const systemPrompt = resolveSystemPrompt('CONTRACT', ctype);
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 16000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
  });
  const raw = completion.choices[0].message.content || '{}';
  return JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
}

(async () => {
  console.log(`🎯 Skalen-Messung mit ${MODEL} (2 faire Verträge + 1 bekannt schlechter, je 2 Läufe)\n`);
  const cases = [
    ['FAIRER Mietvertrag', FAIR_MIETVERTRAG, 'rental'],
    ['FAIRER Dienstvertrag', FAIR_DIENSTVERTRAG, 'service'],
  ];
  // Referenz: bekannt schlechter echter Vertrag (soll weiter niedrig scoren!)
  try {
    const buf = fs.readFileSync(path.join(__dirname, '..', '..', 'test-contracts', 'real_factoring_eisqueen.pdf'));
    const text = (await pdfParse(buf)).text;
    cases.push(['SCHLECHTER Factoring (Referenz)', text, 'factoring']);
  } catch (e) { console.warn(`⏭️ Referenz-PDF nicht ladbar: ${e.message}`); }

  const out = [];
  for (const [name, text, ctype] of cases) {
    const scores = [];
    for (let i = 1; i <= 2; i++) {
      const r = await analyzeText(text, ctype, `${ctype}-${i}`);
      scores.push(r.contractScore);
      const issues = (r.criticalIssues || []).map(x => `${x.riskLevel}:${x.title}`);
      console.log(`  ${name} r${i}: Score=${r.contractScore} | ${issues.length} Issues: ${issues.join(' · ').substring(0, 160)}`);
    }
    out.push({ name, scores });
  }
  console.log('\n════ ERGEBNIS ════');
  for (const o of out) console.log(`  ${o.name.padEnd(34)} → ${o.scores.join(' / ')}`);
  console.log('\nInterpretation: Faire Verträge ≥80 = Skala OK, keine Prompt-Änderung nötig.');
  console.log('Faire Verträge ~60-75 = Kompression → Kalibrier-Anker in Prompt (mit A/B) sinnvoll.');
  process.exit(0);
})().catch(e => { console.error('💥', e); process.exit(1); });

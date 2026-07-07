// 📨 Welle 1 (07.07.2026) — LIVE-Test der GPT-Grenzziehung (Türsteher 2).
// Beweist die kritischste Plan-Annahme: Kündigungsschreiben → LETTER,
// aber Aufhebungsvertrag / Kündigungsbestätigung / Verträge → CONTRACT.
// Braucht OPENAI_API_KEY (lädt .env). Kosten: ~10 gpt-4o-mini-Calls (<1 Cent).
// Aufruf: node scripts/testLetterTuersteherLive.js
/* eslint-disable no-console */
require('dotenv').config();
const OpenAI = require('openai');
const { classifyDocumentTypeWithGPT } = require('../routes/analyze');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CASES = [
  // [Name, erwartete category, erwarteter letterType (nur bei LETTER), Text]
  ['AG-Kündigung (ordentlich)', 'LETTER', 'kuendigung_erhalten', `Müller Maschinenbau GmbH — Personalabteilung
Herrn Noah Liebold, Musterstraße 12, 96450 Coburg
Coburg, den 30.06.2026

Kündigung Ihres Arbeitsverhältnisses

Sehr geehrter Herr Liebold,
hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis vom 01.03.2022 ordentlich und fristgerecht zum 30.09.2026, hilfsweise zum nächstmöglichen Zeitpunkt. Die Kündigungsfrist beträgt gemäß § 622 Abs. 2 BGB zwei Monate zum Monatsende.
Wir weisen Sie darauf hin, dass Sie verpflichtet sind, sich unverzüglich bei der Agentur für Arbeit arbeitsuchend zu melden.
Ihren Resturlaub gewähren wir Ihnen innerhalb der Kündigungsfrist. Ihr Arbeitszeugnis erhalten Sie mit der Schlussabrechnung.
Mit freundlichen Grüßen
Thomas Müller, Geschäftsführer`],

  ['Fristlose Kündigung Vermieter', 'LETTER', 'kuendigung_erhalten', `Hausverwaltung Weber & Partner
An Frau Sarah Klein, Gartenweg 8, 90402 Nürnberg
Nürnberg, 28.06.2026

Außerordentliche fristlose Kündigung des Mietverhältnisses

Sehr geehrte Frau Klein,
hiermit kündigen wir Ihnen das Mietverhältnis über die Wohnung Gartenweg 8, EG links, außerordentlich und fristlos gemäß § 543 Abs. 2 Nr. 3 BGB, hilfsweise ordentlich zum nächstmöglichen Termin. Sie befinden sich mit zwei Monatsmieten in Zahlungsverzug.
Wir fordern Sie auf, die Wohnung bis zum 15.07.2026 geräumt zu übergeben.
Mit freundlichen Grüßen`],

  ['Urheber-Abmahnung', 'LETTER', 'abmahnung', `Rechtsanwälte Schmidt & Kollegen
Abmahnung wegen Urheberrechtsverletzung — Az. 445/26
Sehr geehrter Herr Berger,
namens und in Vollmacht unserer Mandantin, der Fotostock AG, mahnen wir Sie wegen der unerlaubten öffentlichen Zugänglichmachung des Lichtbildes "Skyline München" auf Ihrer Webseite ab (§ 97a UrhG).
Wir fordern Sie auf, die beigefügte strafbewehrte Unterlassungserklärung bis spätestens 21.07.2026 unterzeichnet zurückzusenden sowie Schadensersatz in Höhe von 890,00 EUR zu zahlen.
Bei fruchtlosem Fristablauf werden wir unserer Mandantin die Einleitung gerichtlicher Schritte empfehlen.`],

  ['Jobcenter-Bescheid', 'LETTER', 'behoerdenbescheid', `Jobcenter Coburg Stadt
Bescheid über die Aufhebung und Erstattung von Leistungen nach dem SGB II
Sehr geehrter Herr Weber,
die Entscheidung vom 01.03.2026 über die Bewilligung von Bürgergeld wird für die Zeit vom 01.04.2026 bis 30.04.2026 ganz aufgehoben (§ 48 SGB X). Sie haben zu viel erhaltene Leistungen in Höhe von 563,00 EUR zu erstatten (§ 50 SGB X).
Rechtsbehelfsbelehrung: Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe schriftlich oder zur Niederschrift Widerspruch beim Jobcenter Coburg Stadt erhoben werden.`],

  ['Gerichtlicher Mahnbescheid', 'LETTER', 'mahnbescheid', `Amtsgericht Coburg — Zentrales Mahngericht
Mahnbescheid
Geschäfts-Nr.: 26-1234567-0-9
Antragsteller: Inkasso Nord GmbH
Antragsgegner: Herr Felix Braun
Hauptforderung: 1.243,50 EUR aus Kaufvertrag vom 12.01.2025
Sie können gegen den Anspruch insgesamt oder teilweise Widerspruch erheben. Der Widerspruch ist bei dem oben bezeichneten Gericht einzulegen. Wenn Sie keinen Widerspruch erheben, kann nach Ablauf von zwei Wochen ab Zustellung ein Vollstreckungsbescheid erlassen werden.`],

  // ── GEGENPROBEN: MÜSSEN CONTRACT bleiben ─────────────────────────────────
  ['Aufhebungsvertrag (KRITISCH)', 'CONTRACT', null, `Aufhebungsvertrag
zwischen der TechVision GmbH, vertreten durch den Geschäftsführer (nachfolgend "Arbeitgeber") und Herrn Jonas Müller (nachfolgend "Arbeitnehmer")
§ 1 Beendigung: Die Parteien sind sich darüber einig, dass das zwischen ihnen bestehende Arbeitsverhältnis auf Veranlassung des Arbeitgebers einvernehmlich mit Ablauf des 31.12.2026 enden wird.
§ 2 Abfindung: Der Arbeitnehmer erhält für den Verlust des Arbeitsplatzes eine Abfindung in Höhe von 24.000,00 EUR brutto (§§ 9, 10 KSchG analog).
§ 3 Freistellung: Der Arbeitnehmer wird ab dem 01.11.2026 unter Fortzahlung der Vergütung unwiderruflich freigestellt.
§ 4 Zeugnis: Der Arbeitnehmer erhält ein wohlwollendes qualifiziertes Arbeitszeugnis.
§ 5 Hinweis: Der Arbeitnehmer wurde auf die Möglichkeit einer Sperrzeit beim Arbeitslosengeld (§ 159 SGB III) hingewiesen.
Ort, Datum, Unterschrift Arbeitgeber — Ort, Datum, Unterschrift Arbeitnehmer`],

  ['Kündigungsbestätigung (KRITISCH)', 'CONTRACT', null, `TeleFast GmbH — Kundenservice
Sehr geehrter Herr Liebold,
hiermit bestätigen wir den Eingang Ihrer Kündigung. Ihre Kündigung ist am 25.06.2026 bei uns eingegangen und wird wirksam zum 31.08.2026.
Ihr Mobilfunkvertrag (Kundennummer 88123456, Rufnummer 0171-2345678) endet damit zum 31.08.2026. Bis dahin können Sie alle Leistungen wie gewohnt nutzen. Ein eventuelles Restguthaben erstatten wir Ihnen nach Vertragsende.
Vielen Dank für Ihr Vertrauen.
Ihr TeleFast-Team`],

  ['Arbeitsvertrag mit Kündigungs-§', 'CONTRACT', null, `Arbeitsvertrag
zwischen der DataWorks AG (Arbeitgeber) und Frau Anna Schmidt (Arbeitnehmerin)
§ 1 Beginn: Das Arbeitsverhältnis beginnt am 01.10.2026. Die ersten sechs Monate gelten als Probezeit.
§ 2 Tätigkeit: Die Arbeitnehmerin wird als Senior Data Analystin eingestellt.
§ 3 Vergütung: Das Bruttojahresgehalt beträgt 72.000 EUR, zahlbar in zwölf Monatsraten.
§ 4 Kündigung: Während der Probezeit kann das Arbeitsverhältnis mit einer Frist von zwei Wochen gekündigt werden. Danach gelten die gesetzlichen Kündigungsfristen des § 622 BGB. Jede Kündigung bedarf der Schriftform.
§ 5 Urlaub: 30 Arbeitstage pro Kalenderjahr.
Unterschriften beider Parteien`],

  ['Mietvertrag mit Abmahn-Klausel', 'CONTRACT', null, `Wohnraummietvertrag
zwischen Herrn Karl Weber (Vermieter) und Frau Lisa Brandt (Mieterin) über die Wohnung Hauptstraße 5, 2. OG.
§ 1 Mietbeginn: 01.09.2026, unbefristet. § 2 Miete: Die Grundmiete beträgt 850 EUR zzgl. 180 EUR Nebenkostenvorauszahlung.
§ 7 Vertragswidriger Gebrauch: Setzt die Mieterin einen vertragswidrigen Gebrauch trotz Abmahnung fort, kann der Vermieter kündigen (§ 543 BGB). § 8 Kündigungsfristen: Es gelten die gesetzlichen Fristen (§ 573c BGB).
Unterschrift Vermieter, Unterschrift Mieterin`],

  ['Rechnung (Regression)', 'INVOICE', null, `Rechnung Nr. 2026-4471
WebDesign Studio GmbH an Bäckerei Hofmann
Leistung: Redesign Webseite, Pauschale
Nettobetrag: 2.500,00 EUR, USt 19%: 475,00 EUR, Rechnungsbetrag: 2.975,00 EUR
Zahlbar innerhalb von 14 Tagen ohne Abzug auf das unten genannte Konto. IBAN DE89 3704 0044 0532 0130 00.`],
];

(async () => {
  let pass = 0, fail = 0;
  for (const [name, expectedCat, expectedLetterType, text] of CASES) {
    try {
      const r = await classifyDocumentTypeWithGPT(text, openai, `live-test`);
      const cat = r?.type || 'NULL';
      const lt = r?.letterType || null;
      const catOk = cat === expectedCat;
      const ltOk = expectedCat !== 'LETTER' || !expectedLetterType || lt === expectedLetterType;
      if (catOk && ltOk) {
        pass++;
        console.log(`✅ ${name}: ${cat}${lt ? `/${lt}` : ''} (conf ${r.confidence?.toFixed(2)})`);
      } else {
        fail++;
        console.error(`❌ ${name}: erwartet ${expectedCat}${expectedLetterType ? `/${expectedLetterType}` : ''}, bekam ${cat}${lt ? `/${lt}` : ''} (conf ${r?.confidence?.toFixed(2)})`);
      }
    } catch (e) {
      fail++;
      console.error(`❌ ${name}: Fehler ${e.message}`);
    }
  }
  console.log(`\n${fail === 0 ? '🎉' : '💥'} LIVE: ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})();

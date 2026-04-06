#!/usr/bin/env node
/**
 * OptimizerV2 End-to-End Test Script
 *
 * Testet die komplette Pipeline mit verschiedenen Vertragstypen:
 * 1. PDF-Upload + SSE-Stream-Parsing
 * 2. Ergebnis-Validierung (Klauseln, Scores, Optimierungen)
 * 3. DOCX-Export
 * 4. Redline-PDF-Export
 * 5. Ergebnis laden (GET)
 *
 * Usage: node backend/scripts/testOptimizerV2.js <TOKEN>
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ── Config ──
const API_BASE = 'https://api.contract-ai.de';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node testOptimizerV2.js <AUTH_TOKEN>');
  process.exit(1);
}

// ── Test Contracts (realistic German legal texts) ──
const TEST_CONTRACTS = [
  {
    name: 'Mietvertrag',
    fileName: 'Mietvertrag_Wohnung.pdf',
    text: `MIETVERTRAG

Zwischen
Vermieter: Max Mustermann, Musterstraße 1, 80331 München
(nachfolgend "Vermieter" genannt)

und

Mieter: Anna Schmidt, Beispielweg 5, 80333 München
(nachfolgend "Mieter" genannt)

wird folgender Mietvertrag geschlossen:

§ 1 Mietgegenstand
Der Vermieter vermietet dem Mieter die im Haus Musterstraße 1, 80331 München, im 2. Obergeschoss links gelegene Wohnung, bestehend aus 3 Zimmern, Küche, Bad, Flur und einem Kellerabteil. Die Wohnfläche beträgt ca. 75 qm. Die Wohnung wird zu Wohnzwecken vermietet.

§ 2 Mietdauer
Das Mietverhältnis beginnt am 01.04.2026 und wird auf unbestimmte Zeit geschlossen. Die Kündigungsfrist beträgt drei Monate zum Monatsende gemäß § 573c BGB. Der Vermieter kann nur unter den gesetzlich vorgesehenen Gründen kündigen.

§ 3 Miete und Nebenkosten
Die monatliche Grundmiete beträgt 950,00 EUR (in Worten: neunhundertfünfzig Euro). Zusätzlich zur Grundmiete zahlt der Mieter eine monatliche Vorauszahlung auf die Betriebskosten in Höhe von 200,00 EUR. Die Betriebskostenabrechnung erfolgt jährlich. Die Gesamtmiete beträgt somit 1.150,00 EUR monatlich.

§ 4 Zahlung
Die Miete ist monatlich im Voraus, spätestens bis zum 3. Werktag eines jeden Monats, auf das Konto des Vermieters bei der Sparkasse München, IBAN: DE89 3704 0044 0532 0130 00, zu überweisen. Bei Zahlungsverzug von mehr als zwei Monatsmieten ist der Vermieter zur fristlosen Kündigung berechtigt.

§ 5 Kaution
Der Mieter zahlt eine Kaution in Höhe von drei Nettokaltmieten, somit 2.850,00 EUR. Die Kaution ist in drei gleichen monatlichen Raten zu zahlen, wobei die erste Rate bei Beginn des Mietverhältnisses fällig ist. Der Vermieter ist verpflichtet, die Kaution getrennt von seinem Vermögen bei einem Kreditinstitut zu dem für Spareinlagen mit dreimonatiger Kündigungsfrist üblichen Zinssatz anzulegen.

§ 6 Schönheitsreparaturen
Der Mieter übernimmt die Schönheitsreparaturen in den Mieträumen. Diese umfassen das Tapezieren, Anstreichen oder Kalken der Wände und Decken, das Streichen der Fußböden, Heizkörper, Innentüren sowie der Fenster und Außentüren von innen. Die Schönheitsreparaturen sind fachgerecht und in neutralen Farbtönen auszuführen.

§ 7 Tierhaltung
Die Haltung von Kleintieren (z.B. Fische, Hamster) ist ohne Zustimmung des Vermieters gestattet. Für die Haltung von Hunden und Katzen bedarf es der vorherigen schriftlichen Zustimmung des Vermieters, die nur aus wichtigem Grund verweigert werden darf.

§ 8 Untervermietung
Eine Untervermietung oder sonstige Gebrauchsüberlassung an Dritte bedarf der vorherigen schriftlichen Zustimmung des Vermieters. Der Vermieter darf die Zustimmung nur aus wichtigem Grund verweigern.

§ 9 Instandhaltung
Der Vermieter ist zur Instandhaltung der Mietsache verpflichtet. Kleinreparaturen bis zu einem Betrag von 100,00 EUR je Einzelfall und bis zu einem Gesamtbetrag von 500,00 EUR pro Jahr trägt der Mieter. Der Mieter hat Mängel und Schäden, die er nicht selbst zu vertreten hat, unverzüglich dem Vermieter anzuzeigen.

§ 10 Schlussbestimmungen
Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollte eine Bestimmung dieses Vertrages unwirksam sein oder werden, so bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. Mündliche Nebenabreden bestehen nicht. Gerichtsstand ist München.

München, den 15. März 2026

____________________          ____________________
Max Mustermann                Anna Schmidt
(Vermieter)                   (Mieter)`
  },
  {
    name: 'Arbeitsvertrag',
    fileName: 'Arbeitsvertrag_Entwickler.pdf',
    text: `ARBEITSVERTRAG

Zwischen der
TechServe GmbH, Leopoldstraße 100, 80802 München
vertreten durch den Geschäftsführer Dr. Thomas Weber
(nachfolgend "Arbeitgeber" genannt)

und

Herrn/Frau Lisa Berger, Schillerstraße 42, 80336 München
(nachfolgend "Arbeitnehmer" genannt)

wird folgender Arbeitsvertrag geschlossen:

§ 1 Tätigkeit und Aufgabenbereich
Der Arbeitnehmer wird als Senior Software Developer eingestellt. Der Arbeitnehmer verpflichtet sich, die ihm übertragenen Aufgaben gewissenhaft und nach bestem Können zu erledigen. Der Arbeitgeber behält sich vor, dem Arbeitnehmer auch andere zumutbare Aufgaben zu übertragen, die seinen Fähigkeiten und Kenntnissen entsprechen.

§ 2 Beginn und Dauer des Arbeitsverhältnisses
Das Arbeitsverhältnis beginnt am 01.05.2026 und wird auf unbestimmte Zeit geschlossen. Die ersten sechs Monate gelten als Probezeit, während derer das Arbeitsverhältnis von beiden Seiten mit einer Frist von zwei Wochen gekündigt werden kann.

§ 3 Arbeitszeit
Die regelmäßige wöchentliche Arbeitszeit beträgt 40 Stunden. Der Arbeitnehmer hat die betriebsübliche Arbeitszeit einzuhalten. Die Verteilung der Arbeitszeit richtet sich nach den betrieblichen Erfordernissen. Überstunden sind mit dem Gehalt abgegolten, soweit sie 10% der vereinbarten Arbeitszeit nicht überschreiten.

§ 4 Vergütung
Der Arbeitnehmer erhält ein monatliches Bruttogehalt von 6.500,00 EUR. Die Zahlung erfolgt jeweils zum Ende eines Monats auf ein vom Arbeitnehmer zu benennendes Konto. Darüber hinaus erhält der Arbeitnehmer eine jährliche Sonderzahlung in Höhe eines Bruttomonatsgehalts, zahlbar im November.

§ 5 Urlaub
Der Arbeitnehmer hat Anspruch auf 30 Arbeitstage Erholungsurlaub im Kalenderjahr. Bei Eintritt oder Ausscheiden während des Kalenderjahres wird der Urlaub anteilig gewährt. Der Urlaub ist im laufenden Kalenderjahr zu nehmen. Eine Übertragung auf das nächste Kalenderjahr ist nur mit Zustimmung des Arbeitgebers möglich.

§ 6 Krankheit
Im Falle der Arbeitsunfähigkeit durch Krankheit ist der Arbeitnehmer verpflichtet, den Arbeitgeber unverzüglich zu benachrichtigen. Dauert die Arbeitsunfähigkeit länger als drei Kalendertage, hat der Arbeitnehmer eine ärztliche Bescheinigung vorzulegen.

§ 7 Geheimhaltung
Der Arbeitnehmer verpflichtet sich, über alle betrieblichen Angelegenheiten, insbesondere Geschäfts- und Betriebsgeheimnisse, Stillschweigen zu bewahren. Diese Verpflichtung besteht auch nach Beendigung des Arbeitsverhältnisses fort.

§ 8 Wettbewerbsverbot
Während der Dauer des Arbeitsverhältnisses ist dem Arbeitnehmer jede Konkurrenztätigkeit untersagt. Ein nachvertragliches Wettbewerbsverbot gilt für die Dauer von 12 Monaten nach Beendigung des Arbeitsverhältnisses. Während dieser Zeit zahlt der Arbeitgeber eine Karenzentschädigung in Höhe von 50% der zuletzt bezogenen vertragsmäßigen Leistungen.

§ 9 Nebentätigkeit
Jede entgeltliche oder unentgeltliche Nebentätigkeit bedarf der vorherigen schriftlichen Zustimmung des Arbeitgebers. Die Zustimmung ist zu erteilen, wenn die Nebentätigkeit die Arbeitsleistung nicht beeinträchtigt und berechtigte Interessen des Arbeitgebers nicht entgegenstehen.

§ 10 Kündigung
Nach Ablauf der Probezeit kann das Arbeitsverhältnis von beiden Seiten unter Einhaltung der gesetzlichen Kündigungsfristen gekündigt werden. Die Kündigung bedarf der Schriftform.

§ 11 Verfallklausel
Alle Ansprüche aus dem Arbeitsverhältnis verfallen, wenn sie nicht innerhalb von drei Monaten nach Fälligkeit schriftlich gegenüber der anderen Vertragspartei geltend gemacht werden.

§ 12 Schlussbestimmungen
Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

München, den 15. März 2026

____________________          ____________________
TechServe GmbH                Lisa Berger
(Arbeitgeber)                 (Arbeitnehmer)`
  },
  {
    name: 'NDA',
    fileName: 'Geheimhaltungsvereinbarung.pdf',
    text: `GEHEIMHALTUNGSVEREINBARUNG (NDA)

Zwischen der
InnoTech Solutions AG, Maximilianstraße 35, 80539 München
vertreten durch den Vorstand Michael Schulze
(nachfolgend "Offenlegende Partei" genannt)

und der

Digital Partners GmbH, Friedrichstraße 191, 10117 Berlin
vertreten durch die Geschäftsführerin Sabine Koch
(nachfolgend "Empfangende Partei" genannt)

gemeinsam auch "die Parteien" genannt, wird folgende Vereinbarung geschlossen:

§ 1 Gegenstand und Zweck
Die Parteien beabsichtigen, Gespräche über eine mögliche geschäftliche Zusammenarbeit im Bereich künstlicher Intelligenz und Datenanalyse zu führen (nachfolgend "Zweck"). Im Rahmen dieser Gespräche kann es erforderlich sein, dass die Offenlegende Partei der Empfangenden Partei vertrauliche Informationen offenlegt.

§ 2 Definition vertraulicher Informationen
Vertrauliche Informationen im Sinne dieser Vereinbarung sind sämtliche Informationen gleich welcher Art, die von der Offenlegenden Partei der Empfangenden Partei mündlich, schriftlich, elektronisch oder in sonstiger Weise mitgeteilt oder zugänglich gemacht werden. Dies umfasst insbesondere Geschäftsgeheimnisse, technisches Know-how, Algorithmen, Quellcode, Kundendaten, Geschäftspläne, Finanzinformationen und Marketingstrategien.

§ 3 Geheimhaltungspflicht
Die Empfangende Partei verpflichtet sich, die vertraulichen Informationen streng geheim zu halten und nicht ohne vorherige schriftliche Zustimmung der Offenlegenden Partei an Dritte weiterzugeben. Die Empfangende Partei wird die vertraulichen Informationen ausschließlich für den vereinbarten Zweck verwenden.

§ 4 Ausnahmen
Die Geheimhaltungspflicht gilt nicht für Informationen, die zum Zeitpunkt der Offenlegung bereits öffentlich bekannt waren, die nach der Offenlegung ohne Verschulden der Empfangenden Partei öffentlich bekannt werden, die der Empfangenden Partei bereits vor der Offenlegung rechtmäßig bekannt waren, oder die von einem Dritten ohne Verletzung einer Geheimhaltungspflicht erlangt wurden.

§ 5 Rückgabe und Vernichtung
Auf Verlangen der Offenlegenden Partei oder bei Beendigung der Geschäftsbeziehung hat die Empfangende Partei sämtliche vertraulichen Informationen einschließlich aller Kopien zurückzugeben oder zu vernichten. Die Vernichtung ist schriftlich zu bestätigen.

§ 6 Vertragsstrafe
Bei Verletzung der Geheimhaltungspflicht zahlt die Empfangende Partei eine Vertragsstrafe in Höhe von 50.000,00 EUR für jeden Fall der Zuwiderhandlung. Die Geltendmachung eines darüber hinausgehenden Schadensersatzes bleibt vorbehalten.

§ 7 Laufzeit
Diese Vereinbarung tritt mit Unterzeichnung in Kraft und gilt für die Dauer von drei Jahren. Die Geheimhaltungspflicht besteht auch nach Beendigung dieser Vereinbarung für weitere zwei Jahre fort.

§ 8 Anwendbares Recht und Gerichtsstand
Diese Vereinbarung unterliegt dem Recht der Bundesrepublik Deutschland. Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist München.

München, den 15. März 2026

____________________          ____________________
InnoTech Solutions AG          Digital Partners GmbH`
  },
  {
    name: 'Dienstleistungsvertrag',
    fileName: 'Dienstleistungsvertrag_IT.pdf',
    text: `DIENSTLEISTUNGSVERTRAG

Zwischen der
CloudTech Services GmbH, Hansastraße 27, 80686 München
vertreten durch den Geschäftsführer Stefan Maier
(nachfolgend "Auftragnehmer" genannt)

und der

MediaHouse AG, Rosenheimer Straße 145, 81671 München
vertreten durch den Vorstand Dr. Julia Richter
(nachfolgend "Auftraggeber" genannt)

wird folgender Dienstleistungsvertrag geschlossen:

§ 1 Vertragsgegenstand
Der Auftragnehmer erbringt für den Auftraggeber IT-Dienstleistungen im Bereich Cloud-Migration und DevOps. Der genaue Leistungsumfang ergibt sich aus der als Anlage 1 beigefügten Leistungsbeschreibung. Der Auftragnehmer erbringt seine Leistungen nach dem jeweiligen Stand der Technik und unter Beachtung der einschlägigen Normen und Vorschriften.

§ 2 Leistungsumfang
Die Leistungen umfassen: Migration der bestehenden On-Premise-Infrastruktur auf AWS Cloud, Einrichtung einer CI/CD-Pipeline, Implementierung von Monitoring und Alerting, Dokumentation der Infrastruktur, sowie Schulung des internen IT-Teams (max. 10 Teilnehmer).

§ 3 Vergütung
Der Auftraggeber zahlt dem Auftragnehmer für die vereinbarten Leistungen ein Pauschalhonorar von 85.000,00 EUR netto. Die Vergütung ist in drei Raten zahlbar: 30% bei Projektstart, 40% nach Abschluss der Migration, 30% nach Abnahme. Zusätzliche Leistungen werden nach Aufwand zu einem Stundensatz von 150,00 EUR netto berechnet.

§ 4 Termine und Fristen
Der Projektbeginn ist der 01.06.2026. Die Fertigstellung und Abnahme hat bis spätestens 30.09.2026 zu erfolgen. Verzögert sich die Leistungserbringung aus Gründen, die der Auftragnehmer zu vertreten hat, kann der Auftraggeber für jede vollendete Woche des Verzugs eine Vertragsstrafe von 1% der Auftragssumme verlangen, maximal jedoch 10% der Gesamtvergütung.

§ 5 Mitwirkungspflichten
Der Auftraggeber stellt dem Auftragnehmer die für die Leistungserbringung erforderlichen Informationen, Unterlagen und Zugänge rechtzeitig zur Verfügung. Der Auftraggeber benennt einen fachlich qualifizierten Projektleiter als Ansprechpartner. Kommt der Auftraggeber seinen Mitwirkungspflichten nicht nach, verlängern sich vereinbarte Termine entsprechend.

§ 6 Abnahme
Der Auftragnehmer teilt dem Auftraggeber die Fertigstellung der Leistung schriftlich mit. Der Auftraggeber hat die Leistung innerhalb von 14 Werktagen nach Zugang der Fertigstellungsmitteilung abzunehmen. Die Abnahme darf nicht wegen unwesentlicher Mängel verweigert werden.

§ 7 Gewährleistung
Der Auftragnehmer gewährleistet, dass die erbrachten Leistungen den vereinbarten Anforderungen entsprechen. Die Gewährleistungsfrist beträgt 12 Monate ab Abnahme. Mängel sind vom Auftraggeber unverzüglich schriftlich anzuzeigen. Der Auftragnehmer hat das Recht zur Nachbesserung.

§ 8 Haftung
Die Haftung des Auftragnehmers ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haftet der Auftragnehmer nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vertragstypischen, vorhersehbaren Schaden, maximal jedoch auf die Höhe der vereinbarten Vergütung. Eine Haftung für mittelbare Schäden und entgangenen Gewinn ist ausgeschlossen.

§ 9 Vertraulichkeit
Die Parteien verpflichten sich, sämtliche im Rahmen dieses Vertrages erlangten vertraulichen Informationen geheim zu halten und nur für die Zwecke dieses Vertrages zu verwenden. Diese Pflicht besteht auch nach Beendigung des Vertragsverhältnisses fort.

§ 10 Datenschutz
Soweit der Auftragnehmer im Rahmen der Leistungserbringung personenbezogene Daten im Auftrag des Auftraggebers verarbeitet, schließen die Parteien einen gesonderten Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.

§ 11 Kündigung
Dieser Vertrag kann von beiden Parteien mit einer Frist von vier Wochen zum Monatsende ordentlich gekündigt werden. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

§ 12 Schlussbestimmungen
Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist München. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

München, den 15. März 2026

____________________          ____________________
CloudTech Services GmbH        MediaHouse AG`
  },
  {
    name: 'Kaufvertrag',
    fileName: 'Kaufvertrag_Maschine.pdf',
    text: `KAUFVERTRAG

Zwischen der
Precision Machinery GmbH, Industriestraße 88, 70565 Stuttgart
vertreten durch den Geschäftsführer Markus Hoffmann
(nachfolgend "Verkäufer" genannt)

und der

ProduktionsTech AG, Am Hafen 12, 20457 Hamburg
vertreten durch den Vorstand Christian Bauer
(nachfolgend "Käufer" genannt)

wird folgender Kaufvertrag geschlossen:

§ 1 Kaufgegenstand
Der Verkäufer verkauft dem Käufer eine CNC-Fräsmaschine Typ PM-5000X, Seriennummer 2026-PM5K-00142, einschließlich des in Anlage 1 beschriebenen Zubehörs und der dazugehörigen Software-Lizenz. Die Maschine wird im Neuzustand geliefert.

§ 2 Kaufpreis
Der Kaufpreis beträgt 245.000,00 EUR netto zuzüglich der gesetzlichen Mehrwertsteuer. Der Kaufpreis versteht sich einschließlich Verpackung, Transport und Installation am Standort des Käufers.

§ 3 Zahlung
Die Zahlung erfolgt in folgenden Raten: 30% bei Vertragsabschluss, 50% bei Lieferung und Installation, 20% nach erfolgreicher Abnahme. Zahlungen sind innerhalb von 14 Tagen nach Rechnungsstellung fällig. Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.

§ 4 Lieferung und Installation
Die Lieferung erfolgt frei Haus an den Standort des Käufers in Hamburg. Der voraussichtliche Liefertermin ist der 01.08.2026. Bei Verzögerung um mehr als vier Wochen ist der Käufer nach erfolgloser Nachfristsetzung zum Rücktritt berechtigt.

§ 5 Eigentumsvorbehalt
Der Verkäufer behält sich das Eigentum an der Kaufsache bis zur vollständigen Bezahlung des Kaufpreises vor. Der Käufer ist nicht berechtigt, die Maschine vor vollständiger Bezahlung zu veräußern oder zu verpfänden.

§ 6 Gewährleistung
Der Verkäufer gewährleistet, dass die Maschine bei Übergabe frei von Sach- und Rechtsmängeln ist. Die Gewährleistungsfrist beträgt 24 Monate ab Abnahme. Der Verkäufer hat bei Mängeln zunächst das Recht zur Nachbesserung oder Ersatzlieferung. Schlägt die Nachbesserung zweimal fehl, kann der Käufer vom Vertrag zurücktreten oder den Kaufpreis mindern.

§ 7 Haftung
Der Verkäufer haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit. Bei leichter Fahrlässigkeit ist die Haftung auf vorhersehbare, vertragstypische Schäden begrenzt und beträgt maximal den Kaufpreis. Eine Haftung für entgangenen Gewinn bei leichter Fahrlässigkeit ist ausgeschlossen.

§ 8 Force Majeure
Keine der Parteien haftet für die Nichterfüllung ihrer Verpflichtungen, soweit diese auf höhere Gewalt zurückzuführen ist. Höhere Gewalt umfasst insbesondere Naturkatastrophen, Krieg, Streik, Pandemien und behördliche Anordnungen. Die betroffene Partei hat die andere Partei unverzüglich zu informieren.

§ 9 Schlussbestimmungen
Änderungen bedürfen der Schriftform. Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist Stuttgart.

Stuttgart, den 15. März 2026

____________________          ____________________
Precision Machinery GmbH       ProduktionsTech AG`
  }
];

// ── Helpers ──

function createTestPDF(text, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Register and use a standard font that supports German chars
    doc.font('Helvetica');
    doc.fontSize(10).text(text, { lineGap: 2 });
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function analyzeContract(filePath, fileName) {
  const FormData = (await import('formdata-node')).FormData;
  const { fileFromPath } = await import('formdata-node/file-from-path');

  const form = new FormData();
  const file = await fileFromPath(filePath, fileName, { type: 'application/pdf' });
  form.append('file', file);
  form.append('perspective', 'neutral');
  form.append('force', 'true');

  const response = await fetch(`${API_BASE}/api/optimizer-v2/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  // Parse SSE stream
  const text = await response.text();
  const events = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {}
    }
  }

  return events;
}

async function getResult(resultId) {
  const response = await fetch(`${API_BASE}/api/optimizer-v2/results/${resultId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!response.ok) throw new Error(`GET result failed: ${response.status}`);
  return response.json();
}

async function testDocxExport(resultId, selections) {
  const response = await fetch(`${API_BASE}/api/optimizer-v2/results/${resultId}/docx`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ selections, mode: 'neutral' })
  });
  if (!response.ok) throw new Error(`DOCX export failed: ${response.status}`);
  const blob = await response.blob();
  return blob.size;
}

async function testRedlinePdf(resultId) {
  const response = await fetch(`${API_BASE}/api/optimizer-v2/results/${resultId}/redline-pdf?mode=neutral`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!response.ok) throw new Error(`Redline PDF failed: ${response.status}`);
  const blob = await response.blob();
  return blob.size;
}

async function testAnalysisPdf(resultId) {
  const response = await fetch(`${API_BASE}/api/optimizer-v2/results/${resultId}/pdf`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!response.ok) throw new Error(`Analysis PDF failed: ${response.status}`);
  const blob = await response.blob();
  return blob.size;
}

// ── Main Test Runner ──

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  OptimizerV2 End-to-End Test Suite');
  console.log('═══════════════════════════════════════════════════\n');

  const tmpDir = path.join(__dirname, '../../tmp-test-pdfs');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const contract of TEST_CONTRACTS) {
    console.log(`\n─── Test: ${contract.name} ───`);
    const testResult = {
      name: contract.name,
      checks: {}
    };

    try {
      // 1. Create test PDF
      const pdfPath = path.join(tmpDir, contract.fileName);
      await createTestPDF(contract.text, pdfPath);
      console.log(`  ✓ PDF erstellt (${(fs.statSync(pdfPath).size / 1024).toFixed(1)} KB)`);

      // 2. Upload and analyze
      console.log(`  ⏳ Analyse läuft...`);
      const startTime = Date.now();
      const events = await analyzeContract(pdfPath, contract.fileName);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Check for errors in SSE stream
      const errorEvent = events.find(e => e.error);
      if (errorEvent) {
        throw new Error(`SSE Error: ${errorEvent.message}`);
      }

      // Find completion event
      const completeEvent = events.find(e => e.complete && e.resultId);
      if (!completeEvent) {
        throw new Error('Kein Completion-Event im SSE-Stream');
      }

      const resultId = completeEvent.resultId;
      console.log(`  ✓ Analyse abgeschlossen in ${duration}s (ID: ${resultId})`);
      testResult.checks.analysis = '✓';

      // 3. Load and validate result
      const { result } = await getResult(resultId);

      // Validate structure
      const checks = {
        hasStructure: !!result.structure?.contractType,
        hasClauses: result.clauses?.length > 0,
        hasAnalyses: result.clauseAnalyses?.length > 0,
        hasOptimizations: result.optimizations?.length > 0,
        hasScores: result.scores?.overall > 0,
        clauseCount: result.clauses?.length || 0,
        optimizedCount: result.optimizations?.filter(o => o.needsOptimization)?.length || 0,
        overallScore: result.scores?.overall || 0,
        contractType: result.structure?.contractTypeLabel || 'unknown',
        hasPerClauseScores: result.scores?.perClause?.length > 0,
      };

      // Validate Executive Summary (Stage 5b)
      const hasSummary = !!result.summary?.trafficLight;
      if (hasSummary) {
        const s = result.summary;
        const summaryChecks = {
          trafficLight: ['green', 'yellow', 'red'].includes(s.trafficLight),
          hasVerdict: s.verdict?.length > 10,
          hasLabel: s.trafficLightLabel?.length > 0,
          hasFairness: s.fairnessVerdict?.length > 10,
          hasRisks: Array.isArray(s.topRisks),
          hasGaps: Array.isArray(s.criticalGaps),
          hasPriorities: Array.isArray(s.negotiationPriorities),
          prioritiesValid: s.negotiationPriorities?.every(p => p.priority && p.clauseTitle && p.action),
        };
        const summaryOk = Object.values(summaryChecks).every(Boolean);
        if (summaryOk) {
          console.log(`  ✓ Executive Summary: ${s.trafficLight.toUpperCase()} — "${s.trafficLightLabel}"`);
          console.log(`    Risks: ${s.topRisks.length}, Gaps: ${s.criticalGaps.length}, Priorities: ${s.negotiationPriorities.length}`);
        } else {
          const failedChecks = Object.entries(summaryChecks).filter(([,v]) => !v).map(([k]) => k);
          console.log(`  ⚠ Executive Summary teilweise: ${failedChecks.join(', ')}`);
        }
        testResult.checks.summary = summaryOk ? `✓ (${s.trafficLight})` : '⚠';
      } else {
        console.log(`  ✗ Keine Executive Summary`);
        testResult.checks.summary = '✗';
        failed++;
      }

      // Validate each optimization has all 3 mode versions
      let modesOk = true;
      let missingModes = [];
      for (const opt of (result.optimizations || [])) {
        if (!opt.needsOptimization) continue;
        for (const mode of ['neutral', 'proCreator', 'proRecipient']) {
          if (!opt.versions?.[mode]?.text) {
            modesOk = false;
            missingModes.push(`${opt.clauseId}:${mode}`);
          }
        }
      }

      // Validate scores are reasonable (1-100)
      const scoreValid = checks.overallScore >= 1 && checks.overallScore <= 100;

      console.log(`  ✓ Vertragstyp: ${checks.contractType}`);
      console.log(`  ✓ Klauseln: ${checks.clauseCount} (${checks.optimizedCount} optimiert)`);
      console.log(`  ✓ Gesamtscore: ${checks.overallScore}/100`);

      if (!checks.hasStructure) { console.log(`  ✗ Keine Vertragsstruktur erkannt`); failed++; }
      if (!checks.hasClauses) { console.log(`  ✗ Keine Klauseln extrahiert`); failed++; }
      if (!checks.hasAnalyses) { console.log(`  ✗ Keine Klausel-Analysen`); failed++; }
      if (!checks.hasOptimizations) { console.log(`  ✗ Keine Optimierungen`); failed++; }
      if (!checks.hasScores) { console.log(`  ✗ Kein Score berechnet`); failed++; }
      if (!checks.hasPerClauseScores) { console.log(`  ✗ Keine Per-Klausel-Scores`); failed++; }
      if (!scoreValid) { console.log(`  ✗ Score außerhalb 1-100: ${checks.overallScore}`); failed++; }
      if (!modesOk) { console.log(`  ✗ Fehlende Modi-Versionen: ${missingModes.join(', ')}`); failed++; }
      else { console.log(`  ✓ Alle 3 Modi-Versionen vorhanden`); }

      testResult.checks.structure = checks.hasStructure ? '✓' : '✗';
      testResult.checks.clauses = checks.hasClauses ? `✓ (${checks.clauseCount})` : '✗';
      testResult.checks.analyses = checks.hasAnalyses ? '✓' : '✗';
      testResult.checks.optimizations = checks.hasOptimizations ? `✓ (${checks.optimizedCount})` : '✗';
      testResult.checks.scores = scoreValid ? `✓ (${checks.overallScore})` : '✗';
      testResult.checks.modes = modesOk ? '✓' : '✗';

      // 4. Test DOCX Export
      try {
        const optimizedIds = result.optimizations
          .filter(o => o.needsOptimization)
          .map(o => ({ clauseId: o.clauseId, mode: 'neutral' }));
        const docxSize = await testDocxExport(resultId, optimizedIds);
        console.log(`  ✓ DOCX Export: ${(docxSize / 1024).toFixed(1)} KB`);
        testResult.checks.docx = `✓ (${(docxSize / 1024).toFixed(1)} KB)`;
      } catch (e) {
        console.log(`  ✗ DOCX Export fehlgeschlagen: ${e.message}`);
        testResult.checks.docx = '✗';
        failed++;
      }

      // 5. Test Redline PDF
      try {
        const redlineSize = await testRedlinePdf(resultId);
        console.log(`  ✓ Redline PDF: ${(redlineSize / 1024).toFixed(1)} KB`);
        testResult.checks.redlinePdf = `✓ (${(redlineSize / 1024).toFixed(1)} KB)`;
      } catch (e) {
        console.log(`  ✗ Redline PDF fehlgeschlagen: ${e.message}`);
        testResult.checks.redlinePdf = '✗';
        failed++;
      }

      // 6. Test Analysis PDF
      try {
        const pdfSize = await testAnalysisPdf(resultId);
        console.log(`  ✓ Analyse PDF: ${(pdfSize / 1024).toFixed(1)} KB`);
        testResult.checks.analysisPdf = `✓ (${(pdfSize / 1024).toFixed(1)} KB)`;
      } catch (e) {
        console.log(`  ✗ Analyse PDF fehlgeschlagen: ${e.message}`);
        testResult.checks.analysisPdf = '✗';
        failed++;
      }

      passed++;

    } catch (err) {
      console.log(`  ✗ FEHLGESCHLAGEN: ${err.message}`);
      testResult.checks.error = err.message;
      failed++;
    }

    results.push(testResult);
  }

  // ── Cleanup ──
  try {
    fs.rmSync(tmpDir, { recursive: true });
  } catch {}

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ERGEBNIS');
  console.log('═══════════════════════════════════════════════════');
  console.log();

  // Table
  const header = 'Vertrag          | Struktur | Klauseln   | Optimiert  | Score  | Summary      | Modi | DOCX     | Redline  | PDF';
  console.log(header);
  console.log('─'.repeat(header.length));

  for (const r of results) {
    const c = r.checks;
    if (c.error) {
      console.log(`${r.name.padEnd(17)}| ✗ ERROR: ${c.error}`);
    } else {
      console.log(
        `${r.name.padEnd(17)}| ${(c.structure || '-').padEnd(9)}| ${(c.clauses || '-').padEnd(11)}| ${(c.optimizations || '-').padEnd(11)}| ${(c.scores || '-').padEnd(7)}| ${(c.summary || '-').padEnd(13)}| ${(c.modes || '-').padEnd(5)}| ${(c.docx || '-').padEnd(9)}| ${(c.redlinePdf || '-').padEnd(9)}| ${c.analysisPdf || '-'}`
      );
    }
  }

  console.log();
  console.log(`  ✓ ${passed} bestanden  ✗ ${failed} fehlgeschlagen`);
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

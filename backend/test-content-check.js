/**
 * TEST: Prüfe ob Content korrekt durch parseContractText geht
 */
const { generatePDFv2, parseContractText } = require('./services/pdfGeneratorV2.js');
const fs = require('fs');

// Simuliere einen echten Vertragstext
const testContractText = `
DIENSTLEISTUNGSVERTRAG

zwischen

Muster GmbH
Musterstraße 1
12345 Musterstadt

und

Kunde AG
Kundenweg 2
67890 Kundenstadt

PRÄAMBEL
Die Parteien haben sich auf die nachfolgenden Bedingungen geeinigt.

§ 1 Vertragsgegenstand
(1) Der Auftragnehmer verpflichtet sich zur Erbringung von Dienstleistungen.
(2) Die genauen Leistungen sind in Anlage 1 beschrieben.
(3) Der Auftraggeber stellt die notwendigen Ressourcen bereit.

§ 2 Vergütung
(1) Die Vergütung beträgt 5.000 EUR netto pro Monat.
(2) Die Zahlung erfolgt monatlich im Voraus.
(3) Bei Zahlungsverzug werden Verzugszinsen berechnet.

§ 3 Laufzeit
(1) Der Vertrag beginnt am 01.01.2025.
(2) Die Mindestlaufzeit beträgt 12 Monate.
(3) Die Kündigungsfrist beträgt 3 Monate zum Monatsende.

§ 4 Geheimhaltung
(1) Beide Parteien verpflichten sich zur Geheimhaltung.
(2) Diese Pflicht gilt auch nach Vertragsende.

§ 5 Schlussbestimmungen
(1) Änderungen bedürfen der Schriftform.
(2) Es gilt deutsches Recht.
(3) Gerichtsstand ist München.
`;

async function testContent() {
  console.log('=== TEST: Content Parsing ===\n');

  // Test 1: Parse Contract Text
  const sections = parseContractText(testContractText);
  console.log(`✅ Gefundene Abschnitte: ${sections.length}`);
  sections.forEach((s, i) => {
    console.log(`   ${i+1}. ${s.type}: "${s.title}" (${s.content.length} Elemente)`);
  });

  if (sections.length === 0) {
    console.log('\n❌ FEHLER: Keine Abschnitte gefunden!');
    return;
  }

  // Test 2: Generate PDF
  console.log('\n⏳ Generiere PDF...');
  try {
    const pdfBuffer = await generatePDFv2(
      testContractText,
      { companyName: 'Test GmbH', street: 'Teststr. 1', zip: '12345', city: 'Berlin' },
      'Dienstleistungsvertrag',
      { seller: 'Muster GmbH', sellerAddress: 'Musterstr. 1', sellerCity: '12345 Musterstadt', buyer: 'Kunde AG', buyerAddress: 'Kundenweg 2', buyerCity: '67890 Kundenstadt' },
      false,
      'professional',
      'TEST-123'
    );

    fs.writeFileSync('test-content-check.pdf', pdfBuffer);
    console.log(`✅ PDF generiert: test-content-check.pdf (${(pdfBuffer.length/1024).toFixed(1)} KB)`);
    console.log('\n📂 Bitte öffne test-content-check.pdf und prüfe ob der Inhalt da ist!');
  } catch (err) {
    console.error('❌ Fehler:', err.message);
  }
}

testContent();

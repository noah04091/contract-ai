/**
 * TEST: Ruft die ECHTE generatePDFv2 Funktion auf
 * Genau wie der Server es tut
 */
const { generatePDFv2 } = require('./services/pdfGeneratorV2');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('===========================================');
  console.log('TEST: Echte generatePDFv2 Funktion');
  console.log('===========================================\n');

  const contractText = `
Präambel

Dieser Vertrag wird zwischen den nachfolgenden Parteien geschlossen.

§ 1 Vertragsgegenstand

(1) Gegenstand dieses Vertrages ist die Erbringung von Beratungsleistungen im Bereich Software-Entwicklung.

(2) Die Leistungen umfassen Analyse, Konzeption und Umsetzung von Software-Lösungen.

§ 2 Leistungsumfang

(1) Partei A verpflichtet sich zu folgenden Leistungen:
a) Bereitstellung der vereinbarten Dienstleistungen
b) Einhaltung der vereinbarten Qualitätsstandards
c) Regelmäßige Statusberichte

§ 3 Vergütung

(1) Die Vergütung beträgt 5.000,00 EUR.

(2) Die Zahlung erfolgt innerhalb von 14 Tagen nach Rechnungsstellung.

§ 4 Laufzeit

(1) Dieser Vertrag tritt am 01.01.2025 in Kraft.

(2) Die Kündigungsfrist beträgt 3 Monate.

§ 5 Vertraulichkeit

(1) Die Parteien verpflichten sich zur Vertraulichkeit.

§ 6 Schlussbestimmungen

(1) Änderungen bedürfen der Schriftform.

(2) Es gilt deutsches Recht.
`;

  const companyProfile = {
    companyName: 'Test GmbH',
    street: 'Teststraße 123',
    zip: '12345',
    city: 'Berlin'
  };

  const parties = {
    seller: 'Test GmbH',
    buyer: 'Kunde AG',
    buyerAddress: 'Kundenstraße 456',
    buyerCity: '67890 München'
  };

  try {
    console.log('Generiere PDF mit Design: professional...\n');

    const pdfBuffer = await generatePDFv2(
      contractText,
      companyProfile,
      'Individueller Vertrag',
      parties,
      false,  // isDraft
      'professional',  // designVariant
      null,   // contractId
      []      // attachments
    );

    const outputPath = path.join(__dirname, '..', 'test-real-generator.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log(`\n✅ PDF gespeichert: ${outputPath}`);
    console.log(`📄 Größe: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    console.log('\nÖFFNE DAS PDF UND PRÜFE OB SEITENZAHLEN ERSCHEINEN!');

  } catch (error) {
    console.error('❌ FEHLER:', error.message);
    console.error(error.stack);
  }
}

runTest();

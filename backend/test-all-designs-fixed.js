/**
 * FINAL TEST: Alle Design-Varianten nach dem Fix
 * Testet ob leere Seiten verhindert werden
 */
const { generatePDFv2, DESIGN_THEMES } = require('./services/pdfGeneratorV2.js');
const fs = require('fs');
const path = require('path');

async function testAllDesigns() {
  console.log('=== FINAL TEST: Alle Designs nach Fix ===\n');

  // generatePDFv2 Signatur:
  // (contractText, companyProfile, contractType, parties, isDraft, designVariant, contractId, attachments, customDesign)

  const contractText = `
§ 1 Vertragsgegenstand
(1) Der Verkäufer verkauft an den Käufer das in dieser Vereinbarung beschriebene Produkt.
(2) Die genauen Spezifikationen sind dem Anhang zu entnehmen.

§ 2 Kaufpreis und Zahlung
(1) Der Kaufpreis beträgt EUR 10.000,00 (in Worten: zehntausend Euro).
(2) Die Zahlung erfolgt innerhalb von 14 Tagen nach Rechnungsstellung.

§ 3 Lieferung
(1) Die Lieferung erfolgt innerhalb von 4 Wochen nach Vertragsschluss.
(2) Der Lieferort ist die Adresse des Käufers.

§ 4 Gewährleistung
(1) Der Verkäufer gewährleistet, dass das Produkt frei von Mängeln ist.
(2) Die Gewährleistungsfrist beträgt 24 Monate.

§ 5 Schlussbestimmungen
(1) Änderungen bedürfen der Schriftform.
(2) Es gilt deutsches Recht.
`;

  const companyProfile = {
    companyName: 'Mustermann GmbH & Co. KG',
    street: 'Musterstraße 123',
    zip: '12345',
    city: 'Musterstadt'
  };

  const contractType = 'Individueller Kaufvertrag';

  // LANGE NAMEN um Edge-Case zu testen!
  const parties = {
    seller: 'Mustermann GmbH & Co. KG Internationale Handelsgesellschaft',
    sellerAddress: 'Musterstraße 123, Gebäude A, 3. Stock',
    sellerCity: '12345 Musterstadt, Bayern, Deutschland',
    buyer: 'Beispiel AG Internationale Dienstleistungen und Beratung',
    buyerAddress: 'Beispielweg 456, Haus B, Erdgeschoss',
    buyerCity: '67890 Beispielstadt, Baden-Württemberg, Deutschland'
  };

  const isDraft = false;
  const contractId = 'TEST-12345678';

  // Teste nur die problematischen Designs
  const testDesigns = ['modern', 'elegant', 'corporate', 'professional'];

  for (const designKey of testDesigns) {
    try {
      console.log(`\n📋 Teste Design: ${designKey}...`);

      const pdfBuffer = await generatePDFv2(
        contractText,
        companyProfile,
        contractType,
        parties,
        isDraft,
        designKey,
        contractId
      );

      const outputPath = path.join(__dirname, '..', `test-FIXED-${designKey}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);

      console.log(`   ✅ ${designKey}: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.error(`   ❌ ${designKey}: ${error.message}`);
      console.error(error.stack);
    }
  }

  console.log('\n=== BITTE PDFs PRÜFEN! ===');
  console.log('Erwartung: KEINE leeren Seiten, Deckblatt auf EINER Seite!');
}

testAllDesigns();

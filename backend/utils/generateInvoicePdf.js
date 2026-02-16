const PDFDocument = require("pdfkit");
const path = require("path");

/**
 * Generiert Invoice PDF mit optional White-Label Logo (Enterprise)
 * @param {Object} params - Invoice Parameters
 * @param {string} params.customLogoBase64 - Optional: Base64-encoded company logo (Enterprise)
 */
function generateInvoicePdf({
  customerName,
  email,
  plan,
  amount,
  invoiceDate,
  invoiceNumber,
  customerAddress,
  companyName,
  taxId,
  subscriptionId,
  customLogoBase64 = null,  // ✨ NEU: White-Label Logo (Enterprise)
  periodStart = null,       // Stripe current_period_start (Unix timestamp)
  periodEnd = null,         // Stripe current_period_end (Unix timestamp)
  paymentMethod = null      // Stripe payment method type (card, paypal, sepa_debit, etc.)
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 0,
      size: 'A4'
    });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Farben definieren
    const primaryBlue = '#0071e3';
    const lightBlue = '#4a9eff'; // Helleres Blau für besseren Logo-Kontrast
    const darkGray = '#1d1d1f';
    const lightGray = '#86868b';
    const backgroundColor = '#f5f5f7';

    // ✨ WHITE-LABEL LOGO (ENTERPRISE)
    // Cleaner weißer Header mit Custom Logo oder Default Logo
    try {
      if (customLogoBase64) {
        // 🎨 Enterprise: Custom Company Logo
        console.log("✨ [White-Label] Verwende Custom Logo");
        const logoBuffer = Buffer.from(customLogoBase64.split(',')[1], 'base64');
        doc.image(logoBuffer, 50, 25, { width: 180, height: 80, fit: [180, 80] });
      } else {
        // 📄 Standard: Contract AI Logo
        const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
        doc.image(logoPath, 50, 25, { width: 180 });
      }
    } catch (err) {
      console.warn("⚠️ Logo konnte nicht geladen werden:", err.message);
      // Fallback: Text-Logo
      doc.fillColor(darkGray)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(customLogoBase64 ? companyName || 'COMPANY' : 'CONTRACT AI', 50, 50);
    }

    // Rechnung Titel (rechts im header) - schwarze Schrift
    doc.fillColor(darkGray)
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('RECHNUNG', 350, 40, { align: 'right', width: 200 });

    doc.fillColor(darkGray)
       .fontSize(12)
       .font('Helvetica')
       .text(`Rechnungsnummer: ${invoiceNumber}`, 350, 75, { align: 'right', width: 200 })
       .text(`Datum: ${invoiceDate}`, 350, 92, { align: 'right', width: 200 });

    // Hauptinhalt beginnt nach Header
    let currentY = 160;

    // Absender-Info Box (links)
    doc.fillColor(darkGray)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Rechnungssteller', 50, currentY);

    doc.fillColor(darkGray)
       .fontSize(11)
       .font('Helvetica')
       .text('Contract AI', 50, currentY + 25)
       .text('Inhaber: Noah Liebold', 50, currentY + 40)
       .text('Richard-Oberle-Weg 27', 50, currentY + 55)
       .text('76448 Durmersheim', 50, currentY + 70)
       .text('Deutschland', 50, currentY + 85)
       .text('Steuernummer: 3928246507', 50, currentY + 100)
       .text('USt-IdNr.: DE361461136', 50, currentY + 115);

    // Rechnungsempfänger Box (rechts)
    doc.fillColor(darkGray)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Rechnungsempfänger', 320, currentY);

    let recipientY = currentY + 25;

    if (companyName) {
      doc.fillColor(darkGray)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(companyName, 320, recipientY);
      recipientY += 15;
    }

    if (customerName) {
      doc.fillColor(darkGray)
         .fontSize(11)
         .font('Helvetica')
         .text(customerName, 320, recipientY);
      recipientY += 15;
    }

    if (customerAddress) {
      if (customerAddress.line1) {
        doc.text(customerAddress.line1, 320, recipientY);
        recipientY += 15;
      }
      if (customerAddress.line2) {
        doc.text(customerAddress.line2, 320, recipientY);
        recipientY += 15;
      }

      let cityLine = '';
      if (customerAddress.postal_code) cityLine += customerAddress.postal_code + ' ';
      if (customerAddress.city) cityLine += customerAddress.city;
      if (cityLine) {
        doc.text(cityLine, 320, recipientY);
        recipientY += 15;
      }

      if (customerAddress.country) {
        // Ländercode zu vollständigem Namen umwandeln
        let countryName = customerAddress.country;
        if (customerAddress.country === 'DE') {
          countryName = 'Deutschland';
        } else if (customerAddress.country === 'AT') {
          countryName = 'Österreich';
        } else if (customerAddress.country === 'CH') {
          countryName = 'Schweiz';
        }

        doc.text(countryName, 320, recipientY);
        recipientY += 15;
      }
    }

    if (taxId) {
      // USt-ID: Nur DE-Prefix hinzufügen wenn es eine reine Zahl ist (deutsche Steuernummer ohne Prefix)
      let formattedTaxId = taxId;
      if (taxId && /^\d+$/.test(taxId) && taxId.length >= 9) {
        formattedTaxId = `DE${taxId}`;
      }
      doc.fillColor(darkGray)
         .fontSize(10)
         .text(`USt-IdNr.: ${formattedTaxId}`, 320, recipientY);
      recipientY += 15;
    }

    // Nur eine E-Mail am Ende in grau
    doc.fillColor(lightGray)
       .fontSize(10)
       .text(`E-Mail: ${email}`, 320, recipientY);

    // Linie unter den Adressblöcken (angepasst für Kleinunternehmer-Layout)
    currentY = Math.max(currentY + 150, recipientY + 30);
    doc.strokeColor(backgroundColor)
       .lineWidth(2)
       .moveTo(50, currentY)
       .lineTo(545, currentY)
       .stroke();

    currentY += 40;

    // Leistungsübersicht - Professionelle Tabelle
    doc.fillColor(darkGray)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Leistungsübersicht', 50, currentY);

    currentY += 35;

    // Tabellen-Header
    const tableTop = currentY;
    const tableLeft = 50;
    const tableWidth = 495;
    const rowHeight = 40;

    // Header-Hintergrund
    doc.rect(tableLeft, tableTop, tableWidth, rowHeight)
       .fill(backgroundColor);

    // Header-Text
    doc.fillColor(darkGray)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Beschreibung', tableLeft + 15, tableTop + 15)
       .text('Leistungszeitraum', tableLeft + 280, tableTop + 15)
       .text('Betrag', tableLeft + 420, tableTop + 15);

    // Tabellen-Inhalt - normale Zeilenhöhe
    const itemTop = tableTop + rowHeight;
    const itemHeight = 40; // Normale Zeilenhöhe ohne Subscription-ID
    doc.rect(tableLeft, itemTop, tableWidth, itemHeight)
       .fill('white')
       .stroke(backgroundColor);

    // Reverse Charge Erkennung: EU B2B Kunde mit nicht-deutscher USt-IdNr.
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    const customerCountry = customerAddress?.country || 'DE';
    const isReverseCharge = taxId && euCountries.includes(customerCountry);

    let netto, steuer;
    if (isReverseCharge) {
      // Reverse Charge: Betrag ist bereits netto (keine MwSt.)
      netto = amount;
      steuer = 0;
    } else {
      // Standard: 19% MwSt. inkl.
      netto = amount / 1.19;
      steuer = amount - netto;
    }

    const planDisplayName = plan.charAt(0).toUpperCase() + plan.slice(1);
    const dateFormat = { day: '2-digit', month: '2-digit', year: 'numeric' };

    // Leistungszeitraum aus Stripe-Subscription (echte Abrechnungsperiode)
    let periodText;
    if (periodStart && periodEnd) {
      const start = new Date(periodStart * 1000);
      const end = new Date(periodEnd * 1000);
      periodText = `${start.toLocaleDateString('de-DE', dateFormat)} – ${end.toLocaleDateString('de-DE', dateFormat)}`;
    } else {
      // Fallback: Ab heute + 1 Monat
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);
      periodText = `${now.toLocaleDateString('de-DE', dateFormat)} – ${endDate.toLocaleDateString('de-DE', dateFormat)}`;
    }

    doc.fillColor(darkGray)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(`${planDisplayName}-Abo – SaaS Lizenz`, tableLeft + 15, itemTop + 20);

    doc.fillColor(darkGray)
       .fontSize(11)
       .font('Helvetica')
       .text(periodText, tableLeft + 280, itemTop + 20)
       .text(`€${netto.toFixed(2)}`, tableLeft + 420, itemTop + 20);

    // Summen-Bereich
    const summaryTop = itemTop + itemHeight + 20;
    const summaryLeft = tableLeft + 300;

    if (isReverseCharge) {
      // Reverse Charge: Keine MwSt., Hinweis auf Steuerschuldnerschaft
      doc.fillColor(lightGray)
         .fontSize(11)
         .font('Helvetica')
         .text('Nettobetrag:', summaryLeft, summaryTop)
         .text('MwSt.:', summaryLeft, summaryTop + 20)
         .text(`€${netto.toFixed(2)}`, summaryLeft + 100, summaryTop, { align: 'right', width: 95 })
         .text('€0,00', summaryLeft + 100, summaryTop + 20, { align: 'right', width: 95 });
    } else {
      doc.fillColor(lightGray)
         .fontSize(11)
         .font('Helvetica')
         .text('Zwischensumme:', summaryLeft, summaryTop)
         .text('MwSt. (19%):', summaryLeft, summaryTop + 20)
         .text(`€${netto.toFixed(2)}`, summaryLeft + 100, summaryTop, { align: 'right', width: 95 })
         .text(`€${steuer.toFixed(2)}`, summaryLeft + 100, summaryTop + 20, { align: 'right', width: 95 });
    }

    // Linie vor Gesamtsumme
    doc.strokeColor(lightGray)
       .lineWidth(1)
       .moveTo(summaryLeft, summaryTop + 45)
       .lineTo(summaryLeft + 195, summaryTop + 45)
       .stroke();

    // Gesamtsumme hervorgehoben
    const totalAmount = isReverseCharge ? netto : amount;
    doc.fillColor(darkGray)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Gesamtbetrag:', summaryLeft, summaryTop + 55)
       .text(`€${totalAmount.toFixed(2)}`, summaryLeft + 100, summaryTop + 55, { align: 'right', width: 95 });

    // Reverse Charge Hinweis (bei EU B2B)
    let reverseChargeBoxHeight = 0;
    if (isReverseCharge) {
      const rcTop = summaryTop + 85;
      reverseChargeBoxHeight = 45;
      doc.rect(50, rcTop, 495, reverseChargeBoxHeight)
         .fill('#fff8e1')
         .stroke('#f59e0b');

      doc.fillColor('#92400e')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Hinweis gem. § 13b UStG:', 65, rcTop + 10);

      doc.fillColor('#92400e')
         .fontSize(9)
         .font('Helvetica')
         .text('Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge). Die Umsatzsteuer ist vom Leistungsempfänger zu entrichten.', 65, rcTop + 25, { width: 465 });
    }

    // Zahlungshinweis Box
    const paymentTop = summaryTop + 100 + reverseChargeBoxHeight + (isReverseCharge ? 15 : 0);
    doc.rect(50, paymentTop, 495, 60)
       .fill('#f0f9ff')
       .stroke('#0071e3');

    doc.fillColor(primaryBlue)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Zahlungshinweis:', 65, paymentTop + 15);

    // Zahlungsmethode dynamisch anzeigen
    const paymentMethodNames = {
      'card': 'Kartenzahlung',
      'paypal': 'PayPal',
      'sepa_debit': 'SEPA-Lastschrift',
      'link': 'Link',
    };
    const methodName = paymentMethodNames[paymentMethod] || 'Kartenzahlung';

    doc.fillColor(darkGray)
       .fontSize(10)
       .font('Helvetica')
       .text(`Diese Rechnung wurde bereits per ${methodName} beglichen.`, 65, paymentTop + 32)
       .text('Es ist keine weitere Zahlung erforderlich.', 65, paymentTop + 45);

    // Footer
    const footerTop = doc.page.height - 80;
    doc.rect(0, footerTop, doc.page.width, 80)
       .fill(backgroundColor);

    doc.fillColor(lightGray)
       .fontSize(9)
       .font('Helvetica')
       .text('Contract AI • Inhaber: Noah Liebold • Richard-Oberle-Weg 27 • 76448 Durmersheim • Deutschland', 50, footerTop + 15, { align: 'center', width: 495 })
       .text('Steuernummer: 3928246507 • USt-IdNr.: DE361461136', 50, footerTop + 30, { align: 'center', width: 495 })
       .text('E-Mail: info@contract-ai.de • Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.', 50, footerTop + 45, { align: 'center', width: 495 });

    doc.end();
  });
}

module.exports = generateInvoicePdf;
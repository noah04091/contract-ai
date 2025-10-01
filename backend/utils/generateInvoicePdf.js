const PDFDocument = require("pdfkit");
const path = require("path");

function generateInvoicePdf({ customerName, email, plan, amount, invoiceDate, invoiceNumber, customerAddress, companyName, taxId }) {
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
    const darkGray = '#1d1d1f';
    const lightGray = '#86868b';
    const backgroundColor = '#f5f5f7';

    // Header Bereich mit blauem Hintergrund
    doc.rect(0, 0, doc.page.width, 120)
       .fill(primaryBlue);

    // Logo einfügen (weiß auf blauem Hintergrund)
    try {
      const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
      doc.image(logoPath, 50, 25, { width: 180 });
    } catch (err) {
      console.warn("⚠️ Logo konnte nicht geladen werden:", err.message);
      // Fallback: Text-Logo
      doc.fillColor('white')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('CONTRACT AI', 50, 50);
    }

    // Rechnung Titel (rechts im Header)
    doc.fillColor('white')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('RECHNUNG', 400, 40, { align: 'right', width: 150 });

    doc.fillColor('white')
       .fontSize(12)
       .font('Helvetica')
       .text(`Rechnungsnummer: ${invoiceNumber}`, 400, 75, { align: 'right', width: 150 })
       .text(`Datum: ${invoiceDate}`, 400, 92, { align: 'right', width: 150 });

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
       .text('Contract AI UG (haftungsbeschränkt)', 50, currentY + 25)
       .text('Richard-Oberle-Weg 27', 50, currentY + 40)
       .text('76448 Durmersheim', 50, currentY + 55)
       .text('Deutschland', 50, currentY + 70)
       .text('Steuernummer: 36/543/98765', 50, currentY + 85)
       .text('Geschäftsführer: Noah Liebold', 50, currentY + 100);

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
        doc.text(customerAddress.country, 320, recipientY);
        recipientY += 15;
      }
    }

    doc.fillColor(lightGray)
       .fontSize(10)
       .text(email, 320, recipientY);
    recipientY += 15;

    if (taxId) {
      doc.fillColor(darkGray)
         .fontSize(10)
         .text(`USt-IdNr.: ${taxId}`, 320, recipientY);
    }

    // Linie unter den Adressblöcken
    currentY = Math.max(currentY + 140, recipientY + 30);
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
       .text('Zeitraum', tableLeft + 280, tableTop + 15)
       .text('Betrag', tableLeft + 400, tableTop + 15);

    // Tabellen-Inhalt
    const itemTop = tableTop + rowHeight;
    doc.rect(tableLeft, itemTop, tableWidth, rowHeight)
       .fill('white')
       .stroke(backgroundColor);

    const netto = amount / 1.19;
    const steuer = amount - netto;
    const planDisplayName = plan.charAt(0).toUpperCase() + plan.slice(1);

    doc.fillColor(darkGray)
       .fontSize(11)
       .font('Helvetica')
       .text(`${planDisplayName} Abo - SaaS Lizenz`, tableLeft + 15, itemTop + 15)
       .text('1 Monat', tableLeft + 280, itemTop + 15)
       .text(`€${netto.toFixed(2)}`, tableLeft + 400, itemTop + 15);

    // Summen-Bereich
    const summaryTop = itemTop + rowHeight + 20;
    const summaryLeft = tableLeft + 300;

    doc.fillColor(lightGray)
       .fontSize(11)
       .font('Helvetica')
       .text('Zwischensumme:', summaryLeft, summaryTop)
       .text('MwSt. (19%):', summaryLeft, summaryTop + 20)
       .text(`€${netto.toFixed(2)}`, summaryLeft + 100, summaryTop, { align: 'right', width: 95 })
       .text(`€${steuer.toFixed(2)}`, summaryLeft + 100, summaryTop + 20, { align: 'right', width: 95 });

    // Linie vor Gesamtsumme
    doc.strokeColor(lightGray)
       .lineWidth(1)
       .moveTo(summaryLeft, summaryTop + 45)
       .lineTo(summaryLeft + 195, summaryTop + 45)
       .stroke();

    // Gesamtsumme hervorgehoben
    doc.fillColor(darkGray)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Gesamtbetrag:', summaryLeft, summaryTop + 55)
       .text(`€${amount.toFixed(2)}`, summaryLeft + 100, summaryTop + 55, { align: 'right', width: 95 });

    // Zahlungshinweis Box
    const paymentTop = summaryTop + 100;
    doc.rect(50, paymentTop, 495, 60)
       .fill('#f0f9ff')
       .stroke('#0071e3');

    doc.fillColor(primaryBlue)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Zahlungshinweis:', 65, paymentTop + 15);

    doc.fillColor(darkGray)
       .fontSize(10)
       .font('Helvetica')
       .text('Diese Rechnung wurde bereits per Kreditkarte beglichen.', 65, paymentTop + 32)
       .text('Es ist keine weitere Zahlung erforderlich.', 65, paymentTop + 45);

    // Footer
    const footerTop = doc.page.height - 80;
    doc.rect(0, footerTop, doc.page.width, 80)
       .fill(backgroundColor);

    doc.fillColor(lightGray)
       .fontSize(9)
       .font('Helvetica')
       .text('Contract AI UG (haftungsbeschränkt) • Richard-Oberle-Weg 27 • 76448 Durmersheim • Deutschland', 50, footerTop + 20, { align: 'center', width: 495 })
       .text('Steuernummer: 36/543/98765 • Geschäftsführer: Noah Liebold', 50, footerTop + 35, { align: 'center', width: 495 })
       .text('Diese Rechnung wurde elektronisch erstellt und ist ohne Unterschrift gültig.', 50, footerTop + 50, { align: 'center', width: 495 });

    doc.end();
  });
}

module.exports = generateInvoicePdf;
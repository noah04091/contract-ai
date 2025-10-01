const PDFDocument = require("pdfkit");
const path = require("path");

function generateInvoicePdf({ customerName, email, plan, amount, invoiceDate, invoiceNumber, customerAddress, companyName, taxId }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // 🔽 Lokales Logo einfügen
    try {
      const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
      doc.image(logoPath, 50, 45, { width: 120 });
    } catch (err) {
      console.warn("⚠️ Logo konnte nicht geladen werden:", err.message);
    }

    doc.moveDown(2);

    // Absenderinformationen
    doc
      .fontSize(10)
      .text("Contract AI UG (haftungsbeschränkt)", { align: "right" })
      .text("Richard-Oberle-Weg 27", { align: "right" })
      .text("76448 Durmersheim", { align: "right" })
      .text("Deutschland", { align: "right" })
      .moveDown();

    // Rechnungsempfänger
    doc
      .fontSize(12)
      .text(`Rechnung an:`, { underline: true });

    // Firmenname falls vorhanden
    if (companyName) {
      doc.text(companyName);
    }

    // Name falls vorhanden
    if (customerName) {
      doc.text(customerName);
    }

    // E-Mail
    doc.text(email);

    // Adresse falls vorhanden
    if (customerAddress) {
      if (customerAddress.line1) doc.text(customerAddress.line1);
      if (customerAddress.line2) doc.text(customerAddress.line2);

      let cityLine = '';
      if (customerAddress.postal_code) cityLine += customerAddress.postal_code + ' ';
      if (customerAddress.city) cityLine += customerAddress.city;
      if (cityLine) doc.text(cityLine);

      if (customerAddress.country) doc.text(customerAddress.country);
    }

    // Steuer-ID falls vorhanden
    if (taxId) {
      doc.text(`USt-IdNr.: ${taxId}`);
    }

    doc.moveDown();

    // Rechnungsdetails
    doc
      .fontSize(12)
      .text(`Rechnungsnummer: ${invoiceNumber}`)
      .text(`Rechnungsdatum: ${invoiceDate}`)
      .moveDown();

    // Leistungsbeschreibung
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Leistungsbeschreibung", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Tarif: ${plan}-Abo`, { continued: true })
      .text(`   Betrag: ${amount.toFixed(2)} € (inkl. 19% USt.)`)
      .moveDown();

    const netto = amount / 1.19;
    const steuer = amount - netto;

    doc
      .fontSize(12)
      .text(`Nettobetrag: ${netto.toFixed(2)} €`)
      .text(`MwSt (19%): ${steuer.toFixed(2)} €`)
      .text(`Gesamtbetrag: ${amount.toFixed(2)} €`)
      .moveDown();

    // Footer
    doc
      .fontSize(10)
      .fillColor("gray")
      .text("Bitte überweisen Sie den Betrag nur, wenn Sie nicht bereits per Kreditkarte oder SEPA bezahlt haben.", { align: "left" })
      .moveDown()
      .text("Contract AI UG (haftungsbeschränkt) – Steuernummer: 36/543/98765 – Geschäftsführer: Noah Liebold", {
        align: "center",
      });

    doc.end();
  });
}

module.exports = generateInvoicePdf;

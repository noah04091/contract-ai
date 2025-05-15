const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generateInvoicePdf({ customerName, email, plan, amount, invoiceDate, invoiceNumber }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Logo oben (optional):
    doc.image("https://contract-ai.de/logo.png", 50, 45, { width: 120 });
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
      .text(`Rechnung an:`, { underline: true })
      .text(customerName || email)
      .text(email)
      .moveDown();

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

    // Footer mit rechtlichem Hinweis
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
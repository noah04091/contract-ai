// backend/services/cancellationPdfGenerator.js
// PDF-Kündigungsschreiben im DIN 5008 Briefformat
const PDFDocument = require("pdfkit");
const path = require("path");

/**
 * Generiert ein professionelles Kündigungsschreiben als PDF (A4, DIN 5008-nah)
 * @param {Object} params
 * @param {Object} params.customerData - { name, email, phone, address }
 * @param {string} params.providerName - Name des Anbieters
 * @param {string} params.providerAddress - Adresse des Anbieters
 * @param {string} params.contractName - Vertragsname
 * @param {string} params.cancellationLetter - Der vollständige Kündigungstext
 * @param {string} [params.contractNumber] - Vertragsnummer
 * @param {string} [params.customerNumber] - Kundennummer
 * @param {string} [params.cancellationId] - Referenz-ID
 * @returns {Promise<Buffer>} PDF als Buffer
 */
function generateCancellationPdf({
  customerData,
  providerName,
  providerAddress,
  contractName,
  cancellationLetter,
  contractNumber,
  customerNumber,
  cancellationId
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4' // 595.28 x 841.89 pt
      });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on("error", reject);

      // Farben
      const primaryBlue = '#0071e3';
      const darkGray = '#1d1d1f';
      const lightGray = '#86868b';
      const backgroundColor = '#f5f5f7';

      // === LOGO ===
      try {
        const logoPath = path.join(__dirname, "../assets/logo-contractai.png");
        doc.image(logoPath, 50, 30, { width: 160 });
      } catch (err) {
        console.warn("⚠️ Logo konnte nicht geladen werden:", err.message);
        doc.fillColor(darkGray)
           .fontSize(20)
           .font('Helvetica-Bold')
           .text('CONTRACT AI', 50, 40);
      }

      // === DATUM (rechts oben) ===
      const today = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.fillColor(lightGray)
         .fontSize(10)
         .font('Helvetica')
         .text(today, 350, 40, { align: 'right', width: 200 });

      // Referenz-ID unter Datum
      if (cancellationId) {
        doc.fillColor(lightGray)
           .fontSize(8)
           .text(`Ref: ${cancellationId}`, 350, 55, { align: 'right', width: 200 });
      }

      // === ABSENDER-BLOCK (klein, über Empfänger, DIN 5008 Rücksendeangabe) ===
      let currentY = 100;
      const senderLine = [
        customerData.name,
        customerData.address
      ].filter(Boolean).join(' • ');

      doc.fillColor(lightGray)
         .fontSize(7)
         .font('Helvetica')
         .text(senderLine, 50, currentY, { underline: true });

      // === EMPFÄNGER-BLOCK ===
      currentY = 120;
      doc.fillColor(darkGray)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(providerName || '[Anbieter]', 50, currentY);

      currentY += 16;
      doc.font('Helvetica')
         .fontSize(10);

      if (providerAddress) {
        const addressLines = providerAddress.split('\n').filter(Boolean);
        for (const line of addressLines) {
          doc.text(line.trim(), 50, currentY);
          currentY += 14;
        }
      }

      // === ABSENDER-DATEN (rechts) ===
      let rightY = 120;
      doc.fillColor(darkGray)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(customerData.name || '', 350, rightY, { align: 'right', width: 200 });

      rightY += 14;
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(lightGray);

      if (customerData.address) {
        doc.text(customerData.address, 350, rightY, { align: 'right', width: 200 });
        rightY += 12;
      }
      if (customerData.email) {
        doc.text(customerData.email, 350, rightY, { align: 'right', width: 200 });
        rightY += 12;
      }
      if (customerData.phone) {
        doc.text(`Tel: ${customerData.phone}`, 350, rightY, { align: 'right', width: 200 });
      }

      // === BETREFF ===
      currentY = Math.max(currentY, rightY) + 30;

      doc.fillColor(darkGray)
         .fontSize(13)
         .font('Helvetica-Bold')
         .text(`Kündigung: ${contractName || 'Vertrag'}`, 50, currentY, { width: 500 });

      currentY += 20;

      // Vertragsdaten-Zeile
      if (contractNumber || customerNumber) {
        doc.fillColor(lightGray)
           .fontSize(9)
           .font('Helvetica');
        const parts = [];
        if (contractNumber) parts.push(`Vertragsnr.: ${contractNumber}`);
        if (customerNumber) parts.push(`Kundennr.: ${customerNumber}`);
        doc.text(parts.join('  |  '), 50, currentY);
        currentY += 16;
      }

      // === TRENNLINIE ===
      currentY += 5;
      doc.strokeColor(backgroundColor)
         .lineWidth(1.5)
         .moveTo(50, currentY)
         .lineTo(545, currentY)
         .stroke();

      currentY += 20;

      // === BRIEFTEXT ===
      // Parse den cancellationLetter und rendere mit Bold-Support
      const textStartY = currentY;
      const maxTextY = 750; // Platz für Footer lassen

      doc.fillColor(darkGray)
         .fontSize(10)
         .font('Helvetica');

      if (cancellationLetter) {
        const lines = cancellationLetter.split('\n');

        for (const line of lines) {
          if (currentY > maxTextY) {
            // Neue Seite
            doc.addPage({ margin: 0, size: 'A4' });
            currentY = 50;
          }

          const trimmed = line.trim();

          // Leere Zeile
          if (!trimmed) {
            currentY += 10;
            continue;
          }

          // Trennlinie (---) überspringen
          if (/^-{3,}$/.test(trimmed)) {
            currentY += 5;
            continue;
          }

          // "Erstellt mit Contract AI" Footer-Zeile überspringen (kommt in PDF-Footer)
          if (trimmed.startsWith('*Erstellt mit Contract AI')) {
            continue;
          }

          // Zeile mit **bold** Markdown rendern
          renderMarkdownLine(doc, trimmed, 50, currentY, 495);

          // Zeilenhöhe berechnen
          const lineHeight = doc.heightOfString(trimmed.replace(/\*\*/g, ''), {
            width: 495,
            fontSize: 10
          });
          currentY += Math.max(lineHeight, 14);
        }
      }

      // === FOOTER ===
      const footerTop = doc.page.height - 60;
      doc.rect(0, footerTop, doc.page.width, 60)
         .fill(backgroundColor);

      doc.fillColor(lightGray)
         .fontSize(8)
         .font('Helvetica')
         .text(
           'Erstellt mit Contract AI • www.contract-ai.de • Dieses Schreiben wurde elektronisch erstellt.',
           50, footerTop + 15,
           { align: 'center', width: 495 }
         );

      if (cancellationId) {
        doc.text(
          `Referenz-ID: ${cancellationId}`,
          50, footerTop + 30,
          { align: 'center', width: 495 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Rendert eine Textzeile mit **bold** Markdown-Support
 */
function renderMarkdownLine(doc, text, x, y, maxWidth) {
  // Split by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  let currentX = x;
  const fontSize = 10;

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      const boldText = part.slice(2, -2);
      doc.font('Helvetica-Bold').fontSize(fontSize);
      doc.text(boldText, currentX, y, { continued: true, width: maxWidth - (currentX - x) });
      currentX += doc.widthOfString(boldText);
    } else {
      // Normal text
      doc.font('Helvetica').fontSize(fontSize);
      doc.text(part, currentX, y, { continued: true, width: maxWidth - (currentX - x) });
      currentX += doc.widthOfString(part);
    }
  }

  // End the line
  doc.text('', { continued: false });
}

module.exports = { generateCancellationPdf };

// 📄 PDF Sealing Service - Erstellt versiegelte PDFs mit Signaturen und Audit Trail
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

// S3 Client initialisieren
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'contract-ai-uploads';

/**
 * Lädt PDF von S3
 */
async function loadPdfFromS3(s3Key) {
  try {
    console.log(`📥 Loading PDF from S3: ${s3Key}`);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3Client.send(command);

    // Stream in Buffer konvertieren
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log(`✅ PDF loaded from S3: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('❌ Error loading PDF from S3:', error);
    throw new Error('Fehler beim Laden des PDFs von S3');
  }
}

/**
 * Lädt PDF zu S3 hoch
 */
async function uploadPdfToS3(pdfBytes, originalS3Key) {
  try {
    // Neuen S3 Key generieren (füge "-sealed" hinzu)
    const s3Key = originalS3Key.replace(/\.pdf$/i, '-sealed.pdf');

    console.log(`📤 Uploading sealed PDF to S3: ${s3Key}`);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: pdfBytes,
      ContentType: 'application/pdf'
    });

    await s3Client.send(command);

    console.log(`✅ Sealed PDF uploaded to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error('❌ Error uploading sealed PDF to S3:', error);
    throw new Error('Fehler beim Hochladen des versiegelten PDFs');
  }
}

/**
 * Formatiert Datum für Anzeige
 */
function formatDate(date) {
  return new Date(date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  });
}

/**
 * Fügt Signatur-Box auf der letzten Seite hinzu
 */
async function addSignatureBoxes(pdfDoc, signers) {
  try {
    console.log(`📝 Adding signature boxes for ${signers.length} signers`);

    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Startposition für Signatur-Boxen (unten auf der letzten Seite)
    let yPosition = 150; // Von unten
    const boxWidth = 250;
    const boxHeight = 80;
    const padding = 10;

    // Überschrift
    lastPage.drawText('Digitale Signaturen', {
      x: 50,
      y: yPosition + (signers.length * (boxHeight + 15)) + 30,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Für jeden Signer eine Box zeichnen
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const boxY = yPosition + (i * (boxHeight + 15));

      // Box-Rahmen
      lastPage.drawRectangle({
        x: 50,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1.5
      });

      // Signer Name (fett)
      lastPage.drawText(signer.name, {
        x: 60,
        y: boxY + boxHeight - 20,
        size: 11,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      });

      // Email
      lastPage.drawText(signer.email, {
        x: 60,
        y: boxY + boxHeight - 38,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Rolle
      lastPage.drawText(`Rolle: ${signer.role}`, {
        x: 60,
        y: boxY + boxHeight - 53,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Signiert am
      if (signer.signedAt) {
        lastPage.drawText(`Signiert: ${formatDate(signer.signedAt)}`, {
          x: 60,
          y: boxY + 12,
          size: 8,
          font: font,
          color: rgb(0.13, 0.55, 0.13) // Grün
        });

        // Signatur (kursiv simuliert mit normalem Font)
        lastPage.drawText(`${signer.name}`, {
          x: 60,
          y: boxY + 28,
          size: 14,
          font: fontBold,
          color: rgb(0, 0.31, 0.62) // Blau für Signatur
        });
      } else {
        lastPage.drawText('Status: Ausstehend', {
          x: 60,
          y: boxY + 12,
          size: 8,
          font: font,
          color: rgb(0.8, 0.4, 0) // Orange
        });
      }
    }

    console.log('✅ Signature boxes added');
  } catch (error) {
    console.error('❌ Error adding signature boxes:', error);
    throw error;
  }
}

/**
 * Fügt Audit Trail Seite am Ende hinzu
 */
async function addAuditTrailPage(pdfDoc, envelope) {
  try {
    console.log(`📋 Adding audit trail page with ${envelope.audit.length} events`);

    const auditPage = pdfDoc.addPage([595, 842]); // A4 Format
    const { width, height } = auditPage.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Überschrift
    auditPage.drawText('Audit Trail', {
      x: 50,
      y: height - 50,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    });

    auditPage.drawText(`Dokument: ${envelope.title}`, {
      x: 50,
      y: height - 75,
      size: 11,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });

    auditPage.drawText(`Envelope ID: ${envelope._id}`, {
      x: 50,
      y: height - 92,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Linie
    auditPage.drawLine({
      start: { x: 50, y: height - 105 },
      end: { x: width - 50, y: height - 105 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });

    // Audit Events
    let yPosition = height - 130;
    const lineHeight = 40;

    for (let i = 0; i < envelope.audit.length && yPosition > 80; i++) {
      const event = envelope.audit[i];

      // Event Type (fett)
      auditPage.drawText(event.event.toUpperCase(), {
        x: 50,
        y: yPosition,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      });

      // Timestamp
      auditPage.drawText(formatDate(event.timestamp), {
        x: 50,
        y: yPosition - 15,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });

      // Details (wenn vorhanden)
      if (event.email) {
        auditPage.drawText(`Email: ${event.email}`, {
          x: 200,
          y: yPosition - 15,
          size: 8,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      if (event.ip) {
        auditPage.drawText(`IP: ${event.ip}`, {
          x: 380,
          y: yPosition - 15,
          size: 8,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      yPosition -= lineHeight;

      // Trennlinie
      if (i < envelope.audit.length - 1 && yPosition > 80) {
        auditPage.drawLine({
          start: { x: 50, y: yPosition + 5 },
          end: { x: width - 50, y: yPosition + 5 },
          thickness: 0.5,
          color: rgb(0.9, 0.9, 0.9)
        });
      }
    }

    // Footer mit Zeitstempel
    auditPage.drawText(`Erstellt am: ${formatDate(new Date())}`, {
      x: 50,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    auditPage.drawText('Powered by Contract AI', {
      x: width - 150,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    console.log('✅ Audit trail page added');
  } catch (error) {
    console.error('❌ Error adding audit trail page:', error);
    throw error;
  }
}

/**
 * Hauptfunktion: Erstellt versiegeltes PDF
 *
 * @param {Object} envelope - Envelope Dokument aus MongoDB
 * @returns {Promise<string>} S3 Key des versiegelten PDFs
 */
async function sealPdf(envelope) {
  try {
    console.log(`🔒 Starting PDF sealing for envelope: ${envelope._id}`);

    // 1. Original PDF von S3 laden
    const originalPdfBytes = await loadPdfFromS3(envelope.s3Key);

    // 2. PDF mit pdf-lib öffnen
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    // 3. Signatur-Boxen hinzufügen
    await addSignatureBoxes(pdfDoc, envelope.signers);

    // 4. Audit Trail Seite hinzufügen
    await addAuditTrailPage(pdfDoc, envelope);

    // 5. PDF serialisieren
    const sealedPdfBytes = await pdfDoc.save();

    console.log(`✅ PDF sealed successfully: ${sealedPdfBytes.length} bytes`);

    // 6. Zu S3 hochladen
    const sealedS3Key = await uploadPdfToS3(sealedPdfBytes, envelope.s3Key);

    console.log(`🎉 PDF sealing complete: ${sealedS3Key}`);

    return sealedS3Key;
  } catch (error) {
    console.error('❌ Error sealing PDF:', error);
    throw new Error(`PDF-Sealing fehlgeschlagen: ${error.message}`);
  }
}

module.exports = {
  sealPdf
};

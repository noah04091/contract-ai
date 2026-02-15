// 📄 PDF Sealing Service - Erstellt versiegelte PDFs mit Signaturen und Audit Trail
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const { calculatePdfHash } = require('../utils/pdfHash');

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
 * Konvertiert normalisierte Koordinaten (0-1) in PDF-Koordinaten
 * PDF-Koordinatensystem: Ursprung ist UNTEN LINKS (nicht oben links!)
 */
function normalizedToPdfCoords(nx, ny, nwidth, nheight, pageWidth, pageHeight) {
  return {
    x: nx * pageWidth,
    y: pageHeight - (ny * pageHeight) - (nheight * pageHeight), // Flip Y-Achse
    width: nwidth * pageWidth,
    height: nheight * pageHeight
  };
}

/**
 * ✅ Validiert Koordinaten gegen Seitengrenzen
 * Gibt validierte/geclampte Koordinaten zurück oder null wenn ungültig
 */
function validateAndClampCoords(coords, pageWidth, pageHeight, fieldId) {
  // Prüfe auf ungültige Werte (NaN, Infinity, null, undefined)
  if (!coords || !Number.isFinite(coords.x) || !Number.isFinite(coords.y) ||
      !Number.isFinite(coords.width) || !Number.isFinite(coords.height)) {
    console.error(`❌ Invalid coordinates for field ${fieldId}:`, coords);
    return null;
  }

  // Prüfe auf negative Dimensionen
  if (coords.width <= 0 || coords.height <= 0) {
    console.error(`❌ Invalid dimensions for field ${fieldId}: ${coords.width}x${coords.height}`);
    return null;
  }

  // Prüfe ob Feld komplett außerhalb der Seite liegt
  if (coords.x >= pageWidth || coords.y >= pageHeight ||
      coords.x + coords.width <= 0 || coords.y + coords.height <= 0) {
    console.warn(`⚠️ Field ${fieldId} is completely outside page bounds, skipping`);
    return null;
  }

  // Clampe Koordinaten auf Seitengrenzen (mit 1pt Margin für Sicherheit)
  const margin = 1;
  const clampedCoords = {
    x: Math.max(margin, Math.min(coords.x, pageWidth - coords.width - margin)),
    y: Math.max(margin, Math.min(coords.y, pageHeight - coords.height - margin)),
    width: Math.min(coords.width, pageWidth - margin * 2),
    height: Math.min(coords.height, pageHeight - margin * 2)
  };

  // Warnung wenn Koordinaten angepasst wurden
  if (clampedCoords.x !== coords.x || clampedCoords.y !== coords.y) {
    console.warn(`⚠️ Field ${fieldId} coordinates clamped from (${Math.round(coords.x)}, ${Math.round(coords.y)}) to (${Math.round(clampedCoords.x)}, ${Math.round(clampedCoords.y)})`);
  }

  return clampedCoords;
}

/**
 * Rendert ALLE ausgefüllten Felder auf ihren platzierten Positionen
 */
async function renderSignatureFields(pdfDoc, signatureFields) {
  try {
    console.log(`📝 Rendering ${signatureFields.length} signature fields on their placed positions`);

    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let renderedCount = 0;

    for (const field of signatureFields) {
      // Skip Felder ohne Wert (nicht ausgefüllt)
      if (!field.value) {
        console.log(`⏭️ Skipping empty field: ${field.type} on page ${field.page}`);
        continue;
      }

      // Seite holen (page ist 1-basiert, Array ist 0-basiert)
      const pageIndex = field.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        console.warn(`⚠️ Invalid page ${field.page} for field, skipping`);
        continue;
      }

      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Koordinaten bestimmen (verwende normalisierte wenn verfügbar, sonst pixel)
      let rawCoords;
      if (field.nx !== undefined && field.ny !== undefined) {
        // ✅ Verwende normalisierte Koordinaten
        rawCoords = normalizedToPdfCoords(
          field.nx,
          field.ny,
          field.nwidth || 0.15,
          field.nheight || 0.05,
          pageWidth,
          pageHeight
        );
      } else if (field.x !== undefined && field.y !== undefined) {
        // 🔄 Fallback: Legacy pixel Koordinaten
        rawCoords = {
          x: field.x,
          y: pageHeight - field.y - field.height, // Flip Y-Achse
          width: field.width,
          height: field.height
        };
      } else {
        console.warn(`⚠️ Field has no coordinates, skipping`);
        continue;
      }

      // ✅ Validiere und clampe Koordinaten auf Seitengrenzen
      const coords = validateAndClampCoords(rawCoords, pageWidth, pageHeight, field.id);
      if (!coords) {
        console.error(`❌ Field ${field.id} has invalid coordinates, skipping rendering`);
        continue;
      }

      console.log(`📍 Rendering ${field.type} on page ${field.page} at (${Math.round(coords.x)}, ${Math.round(coords.y)})`);

      // Feld basierend auf Typ rendern
      switch (field.type) {
        case 'signature':
        case 'initial':
          // Signatur/Initial als Bild rendern
          try {
            const base64Data = field.value.replace(/^data:image\/png;base64,/, '');
            const imageBytes = Buffer.from(base64Data, 'base64');
            const signatureImage = await pdfDoc.embedPng(imageBytes);

            page.drawImage(signatureImage, {
              x: coords.x,
              y: coords.y,
              width: coords.width,
              height: coords.height
            });

            renderedCount++;
            console.log(`✅ Rendered ${field.type} image`);
          } catch (imageError) {
            console.error(`❌ Failed to render ${field.type} image:`, imageError);
            // Fallback: Text
            page.drawText(field.value || '(Signatur)', {
              x: coords.x + 5,
              y: coords.y + (coords.height / 2),
              size: Math.min(12, coords.height * 0.6),
              font: fontBold,
              color: rgb(0, 0.31, 0.62)
            });
          }
          break;

        case 'date':
          // Datum als Text rendern
          page.drawText(field.value || '', {
            x: coords.x + 5,
            y: coords.y + (coords.height / 2) - 3,
            size: Math.min(12, coords.height * 0.6),
            font: font,
            color: rgb(0, 0, 0)
          });
          renderedCount++;
          console.log(`✅ Rendered date text: "${field.value}"`);
          break;

        case 'text':
        case 'location': // Ortsfeld wie Text rendern
          // Text rendern
          page.drawText(field.value || '', {
            x: coords.x + 5,
            y: coords.y + (coords.height / 2) - 3,
            size: Math.min(12, coords.height * 0.6),
            font: font,
            color: rgb(0, 0, 0)
          });
          renderedCount++;
          console.log(`✅ Rendered ${field.type}: "${field.value}"`);
          break;

        default:
          console.warn(`⚠️ Unknown field type: ${field.type} - attempting text render`);
          // Fallback: Als Text rendern
          if (field.value) {
            page.drawText(field.value, {
              x: coords.x + 5,
              y: coords.y + (coords.height / 2) - 3,
              size: Math.min(12, coords.height * 0.6),
              font: font,
              color: rgb(0, 0, 0)
            });
            renderedCount++;
          }
      }
    }

    console.log(`✅ Rendered ${renderedCount} fields on their placed positions`);
  } catch (error) {
    console.error('❌ Error rendering signature fields:', error);
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

    // PDF-Hashes für Integrität
    if (envelope.pdfHashOriginal) {
      auditPage.drawText(`Original PDF Hash (SHA-256):`, {
        x: 50,
        y: height - 110,
        size: 8,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3)
      });

      auditPage.drawText(envelope.pdfHashOriginal, {
        x: 50,
        y: height - 122,
        size: 7,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }

    if (envelope.pdfHashFinal) {
      auditPage.drawText(`Sealed PDF Hash (SHA-256):`, {
        x: 50,
        y: height - 138,
        size: 8,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3)
      });

      auditPage.drawText(envelope.pdfHashFinal, {
        x: 50,
        y: height - 150,
        size: 7,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }

    // Linie
    auditPage.drawLine({
      start: { x: 50, y: height - 165 },
      end: { x: width - 50, y: height - 165 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });

    // Audit Events
    let yPosition = height - 190; // Mehr Platz für Hashes
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

    // 2. Hash des Original-PDFs berechnen (vor Signatur-Embedding)
    const originalHash = calculatePdfHash(originalPdfBytes);
    console.log(`🔐 Original PDF Hash: ${originalHash.substring(0, 16)}...`);

    // 3. PDF mit pdf-lib öffnen
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    // 4. ALLE Felder auf ihren platzierten Positionen rendern
    await renderSignatureFields(pdfDoc, envelope.signatureFields);

    // 5. Audit Trail Seite am Ende hinzufügen
    await addAuditTrailPage(pdfDoc, envelope);

    // 6. PDF serialisieren
    const sealedPdfBytes = await pdfDoc.save();

    console.log(`✅ PDF sealed successfully: ${sealedPdfBytes.length} bytes`);

    // 7. Hash des versiegelten PDFs berechnen (nach Signatur-Embedding)
    const finalHash = calculatePdfHash(sealedPdfBytes);
    console.log(`🔐 Sealed PDF Hash: ${finalHash.substring(0, 16)}...`);

    // 8. Zu S3 hochladen
    const sealedS3Key = await uploadPdfToS3(sealedPdfBytes, envelope.s3Key);

    console.log(`🎉 PDF sealing complete: ${sealedS3Key}`);

    return {
      sealedS3Key,
      pdfHashOriginal: originalHash,
      pdfHashFinal: finalHash
    };
  } catch (error) {
    console.error('❌ Error sealing PDF:', error);
    throw new Error(`PDF-Sealing fehlgeschlagen: ${error.message}`);
  }
}

module.exports = {
  sealPdf
};

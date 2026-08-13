// 📁 aws-lambda/email-parser/index.js
// 📧 Lambda-Funktion für E-Mail-Parsing und Backend-Import
// Triggered von AWS SES → S3 → Lambda

const AWS = require('aws-sdk');
const { simpleParser } = require('mailparser');
const axios = require('axios');

const s3 = new AWS.S3();

// ✅ Configuration aus Environment Variables
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://api.contract-ai.de';
const S3_BUCKET = process.env.S3_EMAIL_BUCKET;
const EMAIL_IMPORT_API_KEY = process.env.EMAIL_IMPORT_API_KEY;

// Validierung
if (!EMAIL_IMPORT_API_KEY) {
  console.error('❌ CRITICAL: EMAIL_IMPORT_API_KEY nicht gesetzt!');
  throw new Error('EMAIL_IMPORT_API_KEY erforderlich');
}

/**
 * 📧 Haupt-Handler für SES→S3→Lambda Events
 */
exports.handler = async (event) => {
  console.log('📧 Lambda gestartet:', JSON.stringify(event, null, 2));

  try {
    // Event-Struktur validieren
    if (!event.Records || event.Records.length === 0) {
      throw new Error('Kein Records-Array im Event gefunden');
    }

    const record = event.Records[0];

    // Unterscheide zwischen SNS (SES→SNS→Lambda), direktem SES-Event und S3-Event
    let sesNotification;
    let s3Key;

    if (record.EventSource === 'aws:sns') {
      // SES → SNS → Lambda
      const snsMessage = JSON.parse(record.Sns.Message);
      sesNotification = snsMessage;
      const messageId = snsMessage.mail.messageId;
      s3Key = `emails/${messageId}`;
    } else if (record.eventSource === 'aws:ses') {
      // ✅ Direkter SES-Trigger (SES Receipt Rule → Lambda)
      sesNotification = record.ses;
      const messageId = record.ses.mail.messageId;
      s3Key = `emails/${messageId}`;
      console.log('✅ SES-Event erkannt, messageId:', messageId);
    } else if (record.eventSource === 's3') {
      // Direktes S3-Event (alternative Setup-Methode)
      s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      // Message-ID aus S3-Key extrahieren
      const messageId = s3Key.split('/').pop();
      sesNotification = { mail: { messageId } };
    } else {
      throw new Error(`Unbekanntes Event-Source: ${record.EventSource || record.eventSource}`);
    }

    console.log('📩 Verarbeite E-Mail:', { s3Key });

    // 1. E-Mail aus S3 laden
    const s3Object = await s3.getObject({
      Bucket: S3_BUCKET,
      Key: s3Key
    }).promise();

    console.log('✅ E-Mail aus S3 geladen:', {
      size: `${(s3Object.Body.length / 1024).toFixed(2)} KB`,
      contentType: s3Object.ContentType
    });

    // 2. E-Mail parsen
    const email = await simpleParser(s3Object.Body);

    const recipientEmail = email.to?.value?.[0]?.address || 'unknown@unknown.com';
    const senderEmail = email.from?.value?.[0]?.address || 'unknown@unknown.com';
    const subject = email.subject || '(kein Betreff)';
    const bodyText = email.text || '';
    const messageId = sesNotification.mail.messageId;

    console.log('📧 E-Mail geparst:', {
      from: senderEmail,
      to: recipientEmail,
      subject,
      attachmentCount: email.attachments?.length || 0
    });

    // 3. Anhänge extrahieren
    // 13.08.2026: PDF + Word (.docx) — das Backend beherrscht beide (mammoth-Extraktion).
    // Aussortierte Anhänge werden NICHT mehr still verschluckt, sondern als
    // rejectedAttachments ans Backend gemeldet, das dem Nutzer eine Hinweis-Mail schickt
    // (Vorfall 12.08.: 3 Word-Mails verschwanden ohne jedes Feedback).
    const attachments = [];
    const rejectedAttachments = [];

    const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (email.attachments && email.attachments.length > 0) {
      for (const att of email.attachments) {
        const nameLower = (att.filename || '').toLowerCase();
        const isPDF = att.contentType === 'application/pdf' || nameLower.endsWith('.pdf');
        const isDOCX = att.contentType === DOCX_MIME || nameLower.endsWith('.docx');

        if (isPDF || isDOCX) {
          const sizeMB = att.content.length / (1024 * 1024);

          // Filter: max 15 MB (Backend prüft dieselbe Grenze nochmal)
          if (sizeMB <= 15) {
            attachments.push({
              filename: att.filename || (isDOCX ? 'unnamed.docx' : 'unnamed.pdf'),
              contentType: att.contentType,
              data: att.content.toString('base64') // Als Base64 übertragen
            });

            console.log(`✅ Anhang hinzugefügt: ${att.filename} (${sizeMB.toFixed(2)} MB, ${isDOCX ? 'DOCX' : 'PDF'})`);
          } else {
            console.warn(`⚠️ Anhang zu groß: ${att.filename} (${sizeMB.toFixed(2)} MB)`);
            rejectedAttachments.push({ filename: `${att.filename} (${sizeMB.toFixed(1)} MB — größer als 15 MB)`, contentType: att.contentType });
          }
        } else {
          console.log(`ℹ️ Nicht unterstützter Anhang: ${att.filename} (${att.contentType})`);
          rejectedAttachments.push({ filename: att.filename || 'Unbenannt', contentType: att.contentType });
        }
      }
    }

    if (attachments.length === 0) {
      console.warn(`⚠️ Keine gültigen PDF-/DOCX-Anhänge (${rejectedAttachments.length} aussortiert) — Backend informiert den Nutzer`);
    }

    // 4. API-Call zu Backend (mit Retry-Logik) — auch bei 0 gültigen Anhängen,
    // damit das Backend die Hinweis-Mail an den Nutzer schicken kann.
    const payload = {
      recipientEmail,
      senderEmail,
      subject,
      bodyText,
      attachments,
      rejectedAttachments,
      messageId
    };

    console.log('🚀 Sende an Backend:', {
      endpoint: `${API_ENDPOINT}/api/contracts/email-import`,
      attachmentCount: attachments.length
    });

    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await axios.post(`${API_ENDPOINT}/api/contracts/email-import`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-key': EMAIL_IMPORT_API_KEY // 🔒 API-Key
          },
          timeout: 30000 // 30 Sekunden
        });

        console.log('✅ Backend-Response:', response.data);
        break; // Erfolg → Schleife verlassen

      } catch (error) {
        attempts++;

        if (attempts >= maxAttempts) {
          // Alle Versuche fehlgeschlagen → Exception werfen (DLQ)
          console.error('❌ Backend-Call nach 3 Versuchen fehlgeschlagen:', error.message);
          throw error;
        }

        console.warn(`⚠️ Backend-Call Versuch ${attempts}/${maxAttempts} fehlgeschlagen, retry...`);
        await sleep(1000 * attempts); // Exponential Backoff
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'E-Mail erfolgreich verarbeitet',
        imported: response?.data?.imported || 0,
        messageId
      })
    };

  } catch (error) {
    console.error('❌ Lambda-Fehler:', error);

    // Structured Error für CloudWatch Insights
    console.error(JSON.stringify({
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }));

    // Exception werfen → DLQ (Dead Letter Queue)
    throw error;
  }
};

/**
 * Helper: Sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

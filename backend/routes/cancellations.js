// 📁 backend/routes/cancellations.js
const express = require("express");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { logStatusChange } = require("../services/smartStatusUpdater");
const { generateCancellationPdf } = require("../services/cancellationPdfGenerator");

// Multer für Confirmation-Upload (Memory Storage → dann S3)
const confirmationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF, JPG und PNG Dateien sind erlaubt'), false);
    }
  }
});

// S3 für PDF-Upload (lazy-loaded)
let s3Client, PutObjectCommand, GetObjectCommand, getSignedUrl;
try {
  const { S3Client, PutObjectCommand: _Put, GetObjectCommand: _Get } = require("@aws-sdk/client-s3");
  const { getSignedUrl: _getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  PutObjectCommand = _Put;
  GetObjectCommand = _Get;
  getSignedUrl = _getSignedUrl;
} catch (err) {
  console.warn("⚠️ S3 SDK nicht verfügbar für Cancellations:", err.message);
}

const router = express.Router();

/** Provider kann String oder Objekt sein — immer als String normalisieren */
function normalizeProvider(provider) {
  if (!provider) return "";
  if (typeof provider === "string") return provider;
  if (typeof provider === "object") return provider.displayName || provider.name || "";
  return String(provider);
}

/**
 * Upload PDF to S3
 * @returns {string|null} S3 key or null on failure
 */
async function uploadPdfToS3(pdfBuffer, userId, cancellationId) {
  if (!s3Client || !PutObjectCommand || !process.env.S3_BUCKET_NAME) {
    console.warn("⚠️ S3 nicht konfiguriert, PDF-Upload übersprungen");
    return null;
  }

  try {
    const s3Key = `cancellations/${userId}/${cancellationId}.pdf`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    });
    await s3Client.send(command);
    console.log(`✅ Cancellation PDF uploaded: ${s3Key}`);
    return s3Key;
  } catch (err) {
    console.error("❌ S3 PDF-Upload fehlgeschlagen:", err.message);
    return null;
  }
}

/**
 * Get signed URL for PDF download
 */
async function getSignedPdfUrl(s3Key) {
  if (!s3Client || !GetObjectCommand || !getSignedUrl) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (err) {
    console.error("❌ Signed URL Fehler:", err.message);
    return null;
  }
}

// POST /api/cancellations/send - Kündigung senden
router.post("/send", verifyToken, async (req, res) => {
  try {
    const {
      contractId,
      contractName,
      provider,
      cancellationLetter,
      sendMethod,
      recipientEmail,
      customerData,
      metadata
    } = req.body;

    const userId = new ObjectId(req.user.userId);

    // Create cancellation record
    const cancellationRecord = {
      userId,
      contractId: new ObjectId(contractId),
      contractName,
      provider,
      cancellationLetter,
      sendMethod,
      recipientEmail,
      customerData,
      metadata,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    const result = await req.db.collection("cancellations").insertOne(cancellationRecord);
    const cancellationId = result.insertedId;

    // Generate PDF
    let pdfBuffer = null;
    let pdfS3Key = null;
    try {
      pdfBuffer = await generateCancellationPdf({
        customerData,
        providerName: provider,
        providerAddress: metadata?.providerAddress || customerData?.providerAddress || "",
        contractName,
        cancellationLetter,
        contractNumber: metadata?.contractNumber || "",
        customerNumber: metadata?.customerNumber || "",
        cancellationId: cancellationId.toString()
      });

      // Upload to S3
      pdfS3Key = await uploadPdfToS3(pdfBuffer, req.user.userId, cancellationId.toString());

      if (pdfS3Key) {
        await req.db.collection("cancellations").updateOne(
          { _id: cancellationId },
          { $set: { pdfS3Key, updatedAt: new Date() } }
        );
      }
    } catch (pdfErr) {
      console.error("⚠️ PDF-Generierung fehlgeschlagen (Fortfahren ohne PDF):", pdfErr.message);
    }

    // Build email attachments array
    const emailAttachments = pdfBuffer ? [{
      filename: `Kuendigung_${(contractName || 'Vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : [];

    // Send based on method
    if (sendMethod === "email" && recipientEmail) {
      try {
        // Send to provider
        await sendCancellationEmail(
          recipientEmail,
          contractName,
          provider,
          cancellationLetter,
          customerData,
          emailAttachments
        );

        // Send copy to customer
        await sendCancellationCopy(
          customerData.email,
          contractName,
          provider,
          cancellationLetter,
          cancellationId,
          emailAttachments
        );

        // Update status
        await req.db.collection("cancellations").updateOne(
          { _id: cancellationId },
          {
            $set: {
              status: "sent",
              sentAt: new Date()
            }
          }
        );

        // Update contract status mit Smart Status Tracking
        const contract = await req.db.collection("contracts").findOne({ _id: new ObjectId(contractId) });
        const oldStatus = contract?.status || 'aktiv';

        await req.db.collection("contracts").updateOne(
          { _id: new ObjectId(contractId) },
          {
            $set: {
              status: "gekündigt",
              statusUpdatedAt: new Date(),
              cancellationId: cancellationId,
              cancellationDate: new Date(),
              updatedAt: new Date()
            }
          }
        );

        // Status-History speichern
        await logStatusChange(
          req.db.collection("contract_status_history"),
          new ObjectId(contractId),
          userId,
          oldStatus,
          "gekündigt",
          "cancellation",
          `Vertrag über Contract AI Portal gekündigt und E-Mail an ${provider || 'Anbieter'} versendet`
        );

        // Update related calendar events
        await req.db.collection("contract_events").updateMany(
          {
            contractId: new ObjectId(contractId),
            status: { $in: ["scheduled", "notified"] }
          },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
              completionNote: "Vertrag wurde gekündigt"
            }
          }
        );

        // 14-Tage Erinnerung — Kündigungsbestätigung prüfen
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 14);
        await req.db.collection("contract_events").insertOne({
          userId,
          contractId: new ObjectId(contractId),
          contractName,
          title: `Kündigungsbestätigung prüfen: ${contractName}`,
          description: `Bitte prüfen Sie, ob Sie eine Bestätigung für die Kündigung von "${contractName}" erhalten haben. Falls nicht, kontaktieren Sie den Anbieter.`,
          date: reminderDate,
          type: "CANCELLATION_CONFIRMATION_CHECK",
          severity: "warning",
          status: "scheduled",
          metadata: {
            provider: normalizeProvider(provider),
            cancellationId: cancellationId.toString(),
            suggestedAction: "check_confirmation"
          },
          isManual: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        res.json({
          success: true,
          message: "Kündigung erfolgreich versendet",
          cancellationId: cancellationId,
          sentTo: recipientEmail,
          hasPdf: !!pdfS3Key
        });

      } catch (emailError) {
        console.error("❌ E-Mail-Versand fehlgeschlagen:", emailError);

        // Update status to failed
        await req.db.collection("cancellations").updateOne(
          { _id: cancellationId },
          {
            $set: {
              status: "failed",
              error: emailError.message
            }
          }
        );

        throw new Error("E-Mail-Versand fehlgeschlagen: " + emailError.message);
      }

    } else {
      // Just save for download
      await req.db.collection("cancellations").updateOne(
        { _id: cancellationId },
        { $set: { status: "downloaded" } }
      );

      res.json({
        success: true,
        message: "Kündigung erfolgreich erstellt",
        cancellationId: cancellationId,
        downloadReady: true,
        hasPdf: !!pdfS3Key
      });
    }

  } catch (error) {
    console.error("❌ Error sending cancellation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Senden der Kündigung"
    });
  }
});

// GET /api/cancellations - Liste aller Kündigungen
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    const cancellations = await req.db.collection("cancellations")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      cancellations: cancellations.map(c => ({
        id: c._id,
        contractId: c.contractId,
        contractName: c.contractName,
        provider: normalizeProvider(c.provider),
        status: c.status,
        sendMethod: c.sendMethod,
        recipientEmail: c.recipientEmail,
        hasPdf: !!c.pdfS3Key,
        hasConfirmation: !!c.confirmationFile,
        confirmedAt: c.confirmedAt || null,
        createdAt: c.createdAt,
        sentAt: c.sentAt
      }))
    });

  } catch (error) {
    console.error("❌ Error fetching cancellations:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Kündigungen"
    });
  }
});

// GET /api/cancellations/:id/pdf - PDF herunterladen (signierte URL oder on-the-fly)
router.get("/:id/pdf", verifyToken, async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);

    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });

    if (!cancellation) {
      return res.status(404).json({ success: false, error: "Kündigung nicht gefunden" });
    }

    // If PDF exists in S3, return signed URL
    if (cancellation.pdfS3Key) {
      const signedUrl = await getSignedPdfUrl(cancellation.pdfS3Key);
      if (signedUrl) {
        return res.json({ success: true, pdfUrl: signedUrl });
      }
    }

    // On-the-fly generation as fallback
    const pdfBuffer = await generateCancellationPdf({
      customerData: cancellation.customerData || {},
      providerName: cancellation.provider || "",
      providerAddress: cancellation.metadata?.providerAddress || "",
      contractName: cancellation.contractName || "",
      cancellationLetter: cancellation.cancellationLetter || "",
      contractNumber: cancellation.metadata?.contractNumber || "",
      customerNumber: cancellation.metadata?.customerNumber || "",
      cancellationId: cancellationId.toString()
    });

    // Try to upload for next time
    const s3Key = await uploadPdfToS3(pdfBuffer, req.user.userId, cancellationId.toString());
    if (s3Key) {
      await req.db.collection("cancellations").updateOne(
        { _id: cancellationId },
        { $set: { pdfS3Key: s3Key } }
      );
      const signedUrl = await getSignedPdfUrl(s3Key);
      if (signedUrl) {
        return res.json({ success: true, pdfUrl: signedUrl });
      }
    }

    // Direct buffer response as last fallback
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Kuendigung_${cancellationId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ Error generating cancellation PDF:", error);
    res.status(500).json({ success: false, error: "Fehler beim Erstellen des PDFs" });
  }
});

// GET /api/cancellations/:id - Einzelne Kündigung abrufen
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);

    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });

    if (!cancellation) {
      return res.status(404).json({
        success: false,
        error: "Kündigung nicht gefunden"
      });
    }

    // Provider normalisieren bevor es zum Frontend geht
    res.json({
      success: true,
      cancellation: {
        ...cancellation,
        provider: normalizeProvider(cancellation.provider)
      }
    });

  } catch (error) {
    console.error("❌ Error fetching cancellation:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Kündigung"
    });
  }
});

// POST /api/cancellations/:id/resend - Kündigung erneut senden
router.post("/:id/resend", verifyToken, async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);
    const { recipientEmail } = req.body;

    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });

    if (!cancellation) {
      return res.status(404).json({
        success: false,
        error: "Kündigung nicht gefunden"
      });
    }

    // Generate PDF for attachment
    let emailAttachments = [];
    try {
      const pdfBuffer = await generateCancellationPdf({
        customerData: cancellation.customerData || {},
        providerName: cancellation.provider || "",
        providerAddress: cancellation.metadata?.providerAddress || "",
        contractName: cancellation.contractName || "",
        cancellationLetter: cancellation.cancellationLetter || "",
        contractNumber: cancellation.metadata?.contractNumber || "",
        customerNumber: cancellation.metadata?.customerNumber || "",
        cancellationId: cancellationId.toString()
      });
      emailAttachments = [{
        filename: `Kuendigung_${(cancellation.contractName || 'Vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }];
    } catch (pdfErr) {
      console.warn("⚠️ PDF für Resend fehlgeschlagen:", pdfErr.message);
    }

    // Resend email
    await sendCancellationEmail(
      recipientEmail || cancellation.recipientEmail,
      cancellation.contractName,
      cancellation.provider,
      cancellation.cancellationLetter,
      cancellation.customerData,
      emailAttachments
    );

    // Update record
    await req.db.collection("cancellations").updateOne(
      { _id: cancellationId },
      {
        $set: {
          status: "resent",
          resentAt: new Date(),
          resentTo: recipientEmail || cancellation.recipientEmail
        }
      }
    );

    res.json({
      success: true,
      message: "Kündigung erfolgreich erneut versendet"
    });

  } catch (error) {
    console.error("❌ Error resending cancellation:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim erneuten Versenden"
    });
  }
});

// POST /api/cancellations/confirmation-response - Bestätigungsprüfung: Ja/Nein
router.post("/confirmation-response", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const { cancellationId, eventId, confirmed } = req.body;

    if (!cancellationId || !eventId || typeof confirmed !== 'boolean') {
      return res.status(400).json({ success: false, error: "cancellationId, eventId und confirmed sind erforderlich" });
    }

    const cancellation = await req.db.collection("cancellations").findOne({
      _id: new ObjectId(cancellationId),
      userId: userId
    });

    if (!cancellation) {
      return res.status(404).json({ success: false, error: "Kündigung nicht gefunden" });
    }

    // Mark the reminder event as completed
    await req.db.collection("contract_events").updateOne(
      { _id: new ObjectId(eventId) },
      { $set: { status: "completed", completedAt: new Date(), completionNote: confirmed ? "Bestätigung erhalten" : "Keine Bestätigung — Erinnerung versendet" } }
    );

    if (confirmed) {
      // === JA: Bestätigung erhalten ===
      await req.db.collection("cancellations").updateOne(
        { _id: new ObjectId(cancellationId) },
        { $set: { status: "confirmed", confirmedAt: new Date() } }
      );

      // Contract-Status updaten
      if (cancellation.contractId) {
        await req.db.collection("contracts").updateOne(
          { _id: new ObjectId(cancellation.contractId) },
          { $set: { cancellationConfirmed: true, cancellationConfirmedAt: new Date(), updatedAt: new Date() } }
        );
      }

      res.json({ success: true, message: "Kündigung als bestätigt markiert", action: "confirmed" });

    } else {
      // === NEIN: Keine Bestätigung erhalten ===
      const contractName = cancellation.contractName || "Vertrag";
      const provider = normalizeProvider(cancellation.provider);

      // 1. Erinnerungs-Email an den Anbieter senden
      if (cancellation.recipientEmail && cancellation.cancellationLetter) {
        try {
          const reminderLetter = `Sehr geehrte Damen und Herren,\n\nich beziehe mich auf meine Kündigung vom ${new Date(cancellation.createdAt).toLocaleDateString('de-DE')} bezüglich "${contractName}".\n\nBis heute habe ich leider keine Kündigungsbestätigung von Ihnen erhalten. Ich bitte Sie, mir die Bestätigung der Kündigung umgehend zuzusenden.\n\nSollte ich innerhalb von 14 Tagen keine Rückmeldung erhalten, behalte ich mir weitere Schritte vor.\n\nOriginal-Referenz: ${cancellation._id}\n\nMit freundlichen Grüßen\n${cancellation.customerData?.name || ""}`;

          await sendCancellationEmail(
            cancellation.recipientEmail,
            contractName,
            provider,
            reminderLetter,
            cancellation.customerData || {},
            []
          );
        } catch (emailErr) {
          console.warn("⚠️ Erinnerungs-Email fehlgeschlagen:", emailErr.message);
        }
      }

      // 2. Status-Notiz auf dem Contract hinterlegen
      if (cancellation.contractId) {
        const statusNote = `[${new Date().toLocaleDateString('de-DE')}] Keine Kündigungsbestätigung erhalten — Erinnerung an ${provider || 'Anbieter'} versendet.`;
        await req.db.collection("contracts").updateOne(
          { _id: new ObjectId(cancellation.contractId) },
          {
            $set: { updatedAt: new Date() },
            $push: { cancellationNotes: statusNote }
          }
        );
      }

      // 3. Neue 14-Tage Erinnerung erstellen
      const nextReminderDate = new Date();
      nextReminderDate.setDate(nextReminderDate.getDate() + 14);
      await req.db.collection("contract_events").insertOne({
        userId,
        contractId: cancellation.contractId ? new ObjectId(cancellation.contractId) : null,
        contractName: contractName,
        title: `Kündigungsbestätigung prüfen: ${contractName}`,
        description: `Erneute Prüfung: Haben Sie mittlerweile eine Bestätigung für die Kündigung von "${contractName}" erhalten? Eine Erinnerung wurde am ${new Date().toLocaleDateString('de-DE')} an ${provider || 'den Anbieter'} gesendet.`,
        date: nextReminderDate,
        type: "CANCELLATION_CONFIRMATION_CHECK",
        severity: "warning",
        status: "scheduled",
        metadata: {
          provider: provider,
          cancellationId: cancellationId,
          suggestedAction: "check_confirmation",
          isFollowUp: true
        },
        isManual: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // 4. Cancellation-Record updaten
      await req.db.collection("cancellations").updateOne(
        { _id: new ObjectId(cancellationId) },
        {
          $set: { lastReminderSentAt: new Date() },
          $inc: { reminderCount: 1 }
        }
      );

      res.json({
        success: true,
        message: "Erinnerung an Anbieter versendet, neue Prüfung in 14 Tagen",
        action: "reminder_sent"
      });
    }

  } catch (error) {
    console.error("❌ Error handling confirmation response:", error);
    res.status(500).json({
      success: false,
      error: "Fehler bei der Bestätigungsprüfung"
    });
  }
});

// Helper: Send cancellation email to provider
async function sendCancellationEmail(recipientEmail, contractName, provider, letter, customerData, attachments = []) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const subject = `Kündigung: ${contractName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
        .content { padding: 20px; }
        .footer { background: #f5f5f5; padding: 15px; margin-top: 30px; font-size: 12px; }
        pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Kündigung</h2>
      </div>
      <div class="content">
        <pre>${letter}</pre>
      </div>
      <div class="footer">
        <p>Diese E-Mail wurde elektronisch erstellt und ist ohne Unterschrift gültig.</p>
        <p>Absender: ${customerData.name} | ${customerData.email}</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Contract AI" <noreply@contract-ai.de>`,
    replyTo: customerData.email,
    to: recipientEmail,
    subject: subject,
    text: letter,
    html: htmlContent,
    attachments
  });
}

// Helper: Send copy to customer
async function sendCancellationCopy(customerEmail, contractName, provider, letter, cancellationId, attachments = []) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlContent = generateEmailTemplate({
    title: "Ihre Kündigung wurde versendet",
    preheader: `Bestätigung der Kündigung für ${contractName}`,
    body: `
      <h2 style="color: #34c759;">✅ Kündigung erfolgreich versendet!</h2>

      <p>Ihre Kündigung für <strong>${contractName}</strong> wurde soeben an ${provider || "den Anbieter"} gesendet.</p>

      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
        <h3>📋 Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>📅 <strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
          <li>📧 <strong>Gesendet an:</strong> ${provider || "Anbieter"}</li>
          <li>🆔 <strong>Referenz-ID:</strong> ${cancellationId}</li>
        </ul>
      </div>

      <h3>📄 Kopie Ihres Kündigungsschreibens:</h3>
      <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${letter}</pre>
      </div>

      <div style="margin-top: 30px; padding: 20px; background: #f0fdf4; border-radius: 8px;">
        <h3>💡 Was passiert als nächstes?</h3>
        <ol>
          <li>Der Anbieter wird Ihre Kündigung bearbeiten</li>
          <li>Sie erhalten eine Bestätigung vom Anbieter (normalerweise innerhalb von 14 Tagen)</li>
          <li>Wir archivieren Ihre Kündigung sicher in Contract AI</li>
          <li>Sie werden keine weiteren Erinnerungen für diesen Vertrag erhalten</li>
        </ol>
      </div>

      <p style="margin-top: 30px;">
        <strong>Tipp:</strong> Bewahren Sie diese E-Mail als Nachweis auf, bis Sie die Kündigungsbestätigung vom Anbieter erhalten haben.
      </p>
    `,
    cta: {
      text: "Kündigungen verwalten",
      url: `${process.env.FRONTEND_URL || 'https://contract-ai.de'}/cancellations`
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Contract AI" <noreply@contract-ai.de>`,
    to: customerEmail,
    subject: `${contractName} - Kuendigung bestaetigt`,
    html: htmlContent,
    attachments
  });
}

// POST /api/cancellations/:id/confirm - Bestätigungsdokument hochladen
router.post("/:id/confirm", verifyToken, confirmationUpload.single("file"), async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Keine Datei hochgeladen" });
    }

    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });

    if (!cancellation) {
      return res.status(404).json({ success: false, error: "Kündigung nicht gefunden" });
    }

    // Upload to S3
    const ext = req.file.originalname.split('.').pop() || 'pdf';
    const s3Key = `cancellations/${req.user.userId}/${cancellationId}/confirmation_${Date.now()}.${ext}`;

    if (!s3Client || !PutObjectCommand || !process.env.S3_BUCKET_NAME) {
      return res.status(500).json({ success: false, error: "S3 nicht konfiguriert" });
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });
    await s3Client.send(command);

    // Update cancellation record
    await req.db.collection("cancellations").updateOne(
      { _id: cancellationId },
      {
        $set: {
          status: "confirmed",
          confirmedAt: new Date(),
          confirmationFile: {
            s3Key: s3Key,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            uploadedAt: new Date()
          }
        }
      }
    );

    console.log(`✅ Confirmation uploaded for cancellation ${cancellationId}: ${s3Key}`);

    res.json({
      success: true,
      message: "Bestätigung erfolgreich hochgeladen",
      confirmedAt: new Date()
    });

  } catch (error) {
    console.error("❌ Error uploading confirmation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Fehler beim Hochladen der Bestätigung"
    });
  }
});

// GET /api/cancellations/:id/confirmation - Bestätigungsdokument herunterladen (signierte URL)
router.get("/:id/confirmation", verifyToken, async (req, res) => {
  try {
    const cancellationId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.userId);

    const cancellation = await req.db.collection("cancellations").findOne({
      _id: cancellationId,
      userId: userId
    });

    if (!cancellation) {
      return res.status(404).json({ success: false, error: "Kündigung nicht gefunden" });
    }

    if (!cancellation.confirmationFile?.s3Key) {
      return res.status(404).json({ success: false, error: "Keine Bestätigung vorhanden" });
    }

    const signedUrl = await getSignedPdfUrl(cancellation.confirmationFile.s3Key);
    if (!signedUrl) {
      return res.status(500).json({ success: false, error: "Konnte Download-URL nicht erstellen" });
    }

    res.json({
      success: true,
      url: signedUrl,
      fileName: cancellation.confirmationFile.fileName,
      mimeType: cancellation.confirmationFile.mimeType
    });

  } catch (error) {
    console.error("❌ Error getting confirmation:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Bestätigung"
    });
  }
});

module.exports = router;

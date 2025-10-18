// 📁 backend/routes/envelopes.js - Digital Signature Envelope Routes
const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../services/mailer");
const { sealPdf } = require("../services/pdfSealing"); // ✉️ PDF-Sealing Service
const Envelope = require("../models/Envelope");
const Contract = require("../models/Contract");

const router = express.Router();

// ===== UTILITY FUNCTIONS =====

/**
 * Generate secure magic link token
 */
function generateSignerToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
}

/**
 * Send signature invitation email
 */
async function sendSignatureInvitation(signer, envelope, ownerEmail) {
  const signUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${signer.token}`;

  const subject = `📝 Signaturanfrage: ${envelope.title}`;

  const text = `
Hallo ${signer.name},

${ownerEmail} hat Ihnen ein Dokument zur Unterschrift geschickt.

Dokument: ${envelope.title}
${envelope.message ? `\nNachricht:\n${envelope.message}\n` : ''}

Bitte klicken Sie auf den folgenden Link, um das Dokument zu signieren:

${signUrl}

Dieser Link ist gültig bis: ${new Date(signer.tokenExpires).toLocaleString('de-DE')}

Mit freundlichen Grüßen
Ihr Contract AI Team

---
Contract AI - Digitale Signatur-Lösung
${process.env.FRONTEND_URL || 'http://localhost:5173'}
`;

  try {
    await sendEmail(signer.email, subject, text);
    console.log(`✉️ Signature invitation sent to: ${signer.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send invitation to ${signer.email}:`, error);
    return false;
  }
}

/**
 * Send completion notification to owner
 */
async function sendCompletionNotification(envelope, ownerEmail) {
  const subject = `✅ Dokument vollständig signiert: ${envelope.title}`;

  const text = `
Hallo,

gute Nachrichten! Ihr Dokument wurde von allen Parteien signiert.

Dokument: ${envelope.title}
Signiert am: ${new Date().toLocaleString('de-DE')}

Unterzeichner:
${envelope.signers.map(s => `  - ${s.name} (${s.email}) - Signiert am ${new Date(s.signedAt).toLocaleString('de-DE')}`).join('\n')}

Sie können das signierte Dokument in Ihrem Dashboard herunterladen:
${process.env.FRONTEND_URL || 'http://localhost:5173'}/contracts

Mit freundlichen Grüßen
Ihr Contract AI Team
`;

  try {
    await sendEmail(ownerEmail, subject, text);
    console.log(`✉️ Completion notification sent to: ${ownerEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send completion notification:`, error);
    return false;
  }
}

// ===== AUTHENTICATED ROUTES =====

/**
 * POST /api/envelopes - Create new envelope
 */
router.post("/envelopes", verifyToken, async (req, res) => {
  try {
    const {
      contractId,
      title,
      message,
      s3Key,
      signers,
      signatureFields,
      expiresInDays = 14
    } = req.body;

    console.log("✉️ Creating new envelope:", { title, signersCount: signers?.length });

    // Validation
    if (!title || !s3Key) {
      return res.status(400).json({
        success: false,
        message: "Titel und Dokument sind erforderlich"
      });
    }

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Mindestens ein Unterzeichner erforderlich"
      });
    }

    if (!signatureFields || !Array.isArray(signatureFields) || signatureFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Mindestens ein Signaturfeld erforderlich"
      });
    }

    // Verify contract ownership if contractId provided
    if (contractId) {
      const contract = await Contract.findOne({
        _id: contractId,
        userId: req.user.userId
      });

      if (!contract) {
        return res.status(404).json({
          success: false,
          message: "Vertrag nicht gefunden"
        });
      }
    }

    // Generate tokens for each signer
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const enrichedSigners = signers.map((signer, index) => ({
      email: signer.email.toLowerCase().trim(),
      name: signer.name.trim(),
      role: signer.role || "Signer",
      order: signer.order || index + 1,
      status: "PENDING",
      signedAt: null,
      ip: null,
      userAgent: null,
      token: generateSignerToken(),
      tokenExpires: expiresAt
    }));

    // Validate signature fields assignments
    const signerEmails = new Set(enrichedSigners.map(s => s.email));
    const invalidFields = signatureFields.filter(
      field => !signerEmails.has(field.assigneeEmail.toLowerCase())
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Signaturfelder enthalten ungültige Unterzeichner-E-Mails"
      });
    }

    // Create envelope
    const envelope = new Envelope({
      ownerId: req.user.userId,
      contractId: contractId || null,
      title,
      message: message || "",
      s3Key,
      s3KeySealed: null,
      pdfHash: null,
      status: "DRAFT",
      signers: enrichedSigners,
      signatureFields: signatureFields.map(field => ({
        ...field,
        assigneeEmail: field.assigneeEmail.toLowerCase().trim()
      })),
      expiresAt,
      audit: [{
        event: "CREATED",
        timestamp: new Date(),
        userId: req.user.userId,
        email: req.user.email,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          signersCount: enrichedSigners.length,
          fieldsCount: signatureFields.length
        }
      }]
    });

    await envelope.save();

    console.log(`✅ Envelope created: ${envelope._id}`);

    // ✉️ BUG FIX 2: Update Contract with Envelope reference
    if (contractId) {
      try {
        await Contract.findByIdAndUpdate(
          contractId,
          {
            signatureEnvelopeId: envelope._id,
            signatureStatus: 'draft' // Status wird zu 'sent' nach dem Versenden
          }
        );
        console.log(`✅ Contract ${contractId} updated with envelope reference`);
      } catch (contractUpdateError) {
        console.error('⚠️ Could not update contract:', contractUpdateError.message);
        // Don't fail envelope creation if contract update fails
      }
    }

    res.status(201).json({
      success: true,
      message: "Envelope erfolgreich erstellt",
      envelope: {
        _id: envelope._id,
        title: envelope.title,
        status: envelope.status,
        signersCount: envelope.signers.length,
        expiresAt: envelope.expiresAt
      }
    });

  } catch (error) {
    console.error("❌ Error creating envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Erstellen des Envelopes",
      error: error.message
    });
  }
});

/**
 * GET /api/envelopes - Get all envelopes for user
 */
router.get("/envelopes", verifyToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    console.log(`📦 Loading envelopes for user: ${req.user.userId}`);

    const query = { ownerId: req.user.userId };

    if (status) {
      query.status = status;
    }

    const envelopes = await Envelope.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('contractId', 'name')
      .lean();

    const total = await Envelope.countDocuments(query);

    console.log(`✅ Loaded ${envelopes.length} envelopes (total: ${total})`);

    res.json({
      success: true,
      envelopes: envelopes.map(env => ({
        _id: env._id,
        title: env.title,
        status: env.status,
        contract: env.contractId,
        signers: env.signers, // ✉️ BUG FIX 4: Vollständiges signers Array senden
        createdAt: env.createdAt,
        expiresAt: env.expiresAt,
        completedAt: env.completedAt
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + envelopes.length < total
      }
    });

  } catch (error) {
    console.error("❌ Error loading envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Envelopes",
      error: error.message
    });
  }
});

/**
 * GET /api/envelopes/:id - Get single envelope details
 */
router.get("/envelopes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    })
    .populate('contractId', 'name status')
    .lean();

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    console.log(`✅ Loaded envelope: ${envelope.title}`);

    res.json({
      success: true,
      envelope
    });

  } catch (error) {
    console.error("❌ Error loading envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden des Envelopes",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/send - Send invitations to signers
 */
router.post("/envelopes/:id/send", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    // Can only send DRAFT envelopes
    if (envelope.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Envelope kann nicht gesendet werden (Status: ${envelope.status})`
      });
    }

    console.log(`📤 Sending invitations for envelope: ${envelope.title}`);

    // Send invitations to all signers
    const sendResults = await Promise.allSettled(
      envelope.signers.map(signer =>
        sendSignatureInvitation(signer, envelope, req.user.email)
      )
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = envelope.signers.length - successCount;

    // Update envelope status
    envelope.status = 'SENT';
    await envelope.addAuditEvent('SENT', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: {
        successCount,
        failedCount
      }
    });

    console.log(`✅ Invitations sent: ${successCount} successful, ${failedCount} failed`);

    // ✉️ BUG FIX 2: Update Contract status to 'sent'
    if (envelope.contractId) {
      try {
        await Contract.findByIdAndUpdate(
          envelope.contractId,
          { signatureStatus: 'sent' }
        );
        console.log(`✅ Contract ${envelope.contractId} status updated to 'sent'`);
      } catch (contractUpdateError) {
        console.error('⚠️ Could not update contract status:', contractUpdateError.message);
      }
    }

    res.json({
      success: true,
      message: `Einladungen an ${successCount} von ${envelope.signers.length} Unterzeichnern gesendet`,
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        successCount,
        failedCount
      }
    });

  } catch (error) {
    console.error("❌ Error sending invitations:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Einladungen",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/remind - Remind ALL pending signers (no specific email needed)
 */
router.post("/envelopes/:id/remind", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: "Erinnerungen können nur für gesendete Envelopes verschickt werden"
      });
    }

    console.log(`🔔 Reminding ALL pending signers for envelope: ${envelope.title}`);

    // Find all pending signers
    const pendingSigners = envelope.signers.filter(s => s.status === 'PENDING');

    if (pendingSigners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Alle Unterzeichner haben bereits signiert"
      });
    }

    // Send reminders to all pending signers
    const sendResults = await Promise.allSettled(
      pendingSigners.map(signer =>
        sendSignatureInvitation(signer, envelope, req.user.email)
      )
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = pendingSigners.length - successCount;

    // Log audit event
    await envelope.addAuditEvent('REMINDER_SENT', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: {
        remindedCount: pendingSigners.length,
        successCount,
        failedCount
      }
    });

    res.json({
      success: true,
      message: `Erinnerungen an ${successCount} von ${pendingSigners.length} ausstehenden Unterzeichnern gesendet`,
      details: {
        successCount,
        failedCount,
        totalReminded: pendingSigners.length
      }
    });

  } catch (error) {
    console.error("❌ Error sending reminders:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Erinnerungen",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/resend - Resend invitation reminder to SPECIFIC signer
 */
router.post("/envelopes/:id/resend", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { signerEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: "Erinnerungen können nur für gesendete Envelopes verschickt werden"
      });
    }

    // Find signer
    const signer = envelope.getSignerByEmail(signerEmail);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    if (signer.status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: "Unterzeichner hat bereits signiert"
      });
    }

    console.log(`🔔 Resending invitation to: ${signerEmail}`);

    // Send reminder
    const sent = await sendSignatureInvitation(signer, envelope, req.user.email);

    if (sent) {
      await envelope.addAuditEvent('REMINDER_SENT', {
        userId: req.user.userId,
        email: signerEmail,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: `Erinnerung an ${signerEmail} gesendet`
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Fehler beim Senden der Erinnerung"
      });
    }

  } catch (error) {
    console.error("❌ Error resending invitation:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Erinnerung",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/seal - Manually seal PDF (COMPLETED envelopes only)
 */
router.post("/envelopes/:id/seal", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `PDF kann nur für abgeschlossene Envelopes versiegelt werden (Status: ${envelope.status})`
      });
    }

    if (envelope.s3KeySealed) {
      return res.status(400).json({
        success: false,
        message: "PDF wurde bereits versiegelt",
        s3KeySealed: envelope.s3KeySealed
      });
    }

    console.log(`🔒 Manual PDF sealing requested for envelope: ${envelope.title}`);

    try {
      const sealedS3Key = await sealPdf(envelope);
      envelope.s3KeySealed = sealedS3Key;

      await envelope.addAuditEvent('PDF_SEALED', {
        userId: req.user.userId,
        email: req.user.email,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { s3KeySealed: sealedS3Key, manual: true }
      });

      console.log(`✅ PDF sealed manually: ${sealedS3Key}`);

      res.json({
        success: true,
        message: "PDF erfolgreich versiegelt",
        envelope: {
          _id: envelope._id,
          s3KeySealed: envelope.s3KeySealed
        }
      });

    } catch (sealError) {
      console.error('❌ PDF sealing failed:', sealError);

      await envelope.addAuditEvent('PDF_SEALING_FAILED', {
        userId: req.user.userId,
        email: req.user.email,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { error: sealError.message, manual: true }
      });

      res.status(500).json({
        success: false,
        message: "Fehler beim Versiegeln des PDFs",
        error: sealError.message
      });
    }

  } catch (error) {
    console.error("❌ Error in seal endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Versiegeln des PDFs",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/void - Cancel/void envelope
 */
router.post("/envelopes/:id/void", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status === 'COMPLETED' || envelope.status === 'VOIDED') {
      return res.status(400).json({
        success: false,
        message: `Envelope kann nicht storniert werden (Status: ${envelope.status})`
      });
    }

    console.log(`🚫 Voiding envelope: ${envelope.title}`);

    envelope.status = 'VOIDED';
    envelope.voidedAt = new Date();
    envelope.voidReason = reason || 'Vom Eigentümer storniert';

    await envelope.addAuditEvent('VOIDED', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: { reason: envelope.voidReason }
    });

    console.log(`✅ Envelope voided: ${envelope._id}`);

    res.json({
      success: true,
      message: "Envelope erfolgreich storniert",
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        voidedAt: envelope.voidedAt
      }
    });

  } catch (error) {
    console.error("❌ Error voiding envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Stornieren des Envelopes",
      error: error.message
    });
  }
});

// ===== PUBLIC ROUTES (NO AUTH) =====

/**
 * GET /api/sign/:token - Load signature session (public)
 */
router.get("/sign/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log(`🔍 Loading signature session for token: ${token.substring(0, 10)}...`);

    // Find envelope by signer token
    const envelope = await Envelope.findBySignerToken(token).lean();

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Signature-Link nicht gefunden oder ungültig"
      });
    }

    // Find the signer
    const signer = envelope.signers.find(s => s.token === token);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    // Check token expiration
    if (new Date() > new Date(signer.tokenExpires)) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link ist abgelaufen",
        expired: true
      });
    }

    // Check if already signed
    if (signer.status === 'SIGNED') {
      return res.status(200).json({
        success: true,
        message: "Sie haben dieses Dokument bereits signiert",
        alreadySigned: true,
        signedAt: signer.signedAt
      });
    }

    // Check envelope status
    if (envelope.status === 'VOIDED') {
      return res.status(410).json({
        success: false,
        message: "Dieses Dokument wurde storniert"
      });
    }

    if (envelope.status === 'COMPLETED') {
      return res.status(410).json({
        success: false,
        message: "Dieses Dokument wurde bereits vollständig signiert"
      });
    }

    // Log opened event
    await Envelope.updateOne(
      { _id: envelope._id },
      {
        $push: {
          audit: {
            event: 'OPENED',
            timestamp: new Date(),
            userId: null,
            email: signer.email,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            details: {}
          }
        }
      }
    );

    console.log(`✅ Signature session loaded for: ${signer.email}`);

    // Get signature fields for this signer
    const myFields = envelope.signatureFields.filter(
      field => field.assigneeEmail === signer.email
    );

    // 📄 Generate presigned URL for PDF preview
    let pdfUrl = null;
    if (envelope.s3Key) {
      try {
        const { generateSignedUrl } = require("../services/fileStorage");
        pdfUrl = await generateSignedUrl(envelope.s3Key);
        console.log(`✅ Generated presigned PDF URL for: ${envelope.s3Key}`);
      } catch (error) {
        console.error(`❌ Failed to generate presigned URL:`, error);
      }
    }

    res.json({
      success: true,
      envelope: {
        _id: envelope._id,
        title: envelope.title,
        message: envelope.message,
        s3Key: envelope.s3Key,
        pdfUrl, // 📄 NEU: Presigned URL für PDF-Vorschau
        expiresAt: envelope.expiresAt
      },
      signer: {
        name: signer.name,
        email: signer.email,
        role: signer.role
      },
      signatureFields: myFields
    });

  } catch (error) {
    console.error("❌ Error loading signature session:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Signature-Sitzung",
      error: error.message
    });
  }
});

/**
 * POST /api/sign/:token/submit - Submit signature (public)
 */
router.post("/sign/:token/submit", async (req, res) => {
  try {
    const { token } = req.params;
    const { signatures } = req.body; // Array of { fieldId, value (base64) }

    console.log(`✍️ Submitting signature for token: ${token.substring(0, 10)}...`);

    if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Signaturen fehlen"
      });
    }

    // Find envelope
    const envelope = await Envelope.findBySignerToken(token);

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Signature-Link nicht gefunden"
      });
    }

    // Find signer
    const signer = envelope.getSignerByToken(token);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    // Check token expiration
    if (new Date() > new Date(signer.tokenExpires)) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link ist abgelaufen"
      });
    }

    // Check if already signed
    if (signer.status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: "Sie haben bereits signiert"
      });
    }

    // Check envelope status
    if (envelope.status === 'VOIDED' || envelope.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: "Signatur kann nicht mehr hinzugefügt werden"
      });
    }

    console.log(`✅ Processing ${signatures.length} signatures for: ${signer.email}`);

    // Update signature fields
    const now = new Date();
    let updatedCount = 0;

    for (const sig of signatures) {
      const field = envelope.signatureFields.id(sig.fieldId);

      if (field && field.assigneeEmail === signer.email) {
        field.value = sig.value;
        field.signedAt = now;
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine gültigen Signaturfelder gefunden"
      });
    }

    // Update signer status
    signer.status = 'SIGNED';
    signer.signedAt = now;
    signer.ip = getClientIP(req);
    signer.userAgent = req.headers['user-agent'] || 'unknown';

    // Check if envelope status should be updated
    if (envelope.status === 'SENT') {
      envelope.status = 'SIGNED';
    }

    // Add audit event
    await envelope.addAuditEvent('SIGNED', {
      userId: null,
      email: signer.email,
      ip: signer.ip,
      userAgent: signer.userAgent,
      details: {
        signaturesCount: updatedCount
      }
    });

    // Check if all signers have signed
    if (envelope.allSigned()) {
      envelope.status = 'COMPLETED';
      envelope.completedAt = now;

      await envelope.addAuditEvent('COMPLETED', {
        userId: null,
        email: null,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
          totalSigners: envelope.signers.length
        }
      });

      console.log(`🎉 All signers completed! Envelope: ${envelope.title}`);

      // ✉️ BUG FIX 2: Update Contract status to 'completed'
      if (envelope.contractId) {
        try {
          await Contract.findByIdAndUpdate(
            envelope.contractId,
            { signatureStatus: 'completed' }
          );
          console.log(`✅ Contract ${envelope.contractId} status updated to 'completed'`);
        } catch (contractUpdateError) {
          console.error('⚠️ Could not update contract status:', contractUpdateError.message);
        }
      }

      // ✉️ Trigger PDF sealing
      try {
        console.log('🔒 Starting automatic PDF sealing...');
        const sealedS3Key = await sealPdf(envelope);
        envelope.s3KeySealed = sealedS3Key;
        await envelope.addAuditEvent('PDF_SEALED', {
          userId: null,
          email: null,
          ip: getClientIP(req),
          userAgent: req.headers['user-agent'],
          details: { s3KeySealed: sealedS3Key }
        });
        console.log(`✅ PDF sealed successfully: ${sealedS3Key}`);
      } catch (sealError) {
        console.error('⚠️ PDF sealing failed:', sealError.message);
        // Don't fail the whole request if sealing fails
        await envelope.addAuditEvent('PDF_SEALING_FAILED', {
          userId: null,
          email: null,
          ip: getClientIP(req),
          userAgent: req.headers['user-agent'],
          details: { error: sealError.message }
        });
      }

      // Send completion notification to owner
      // Access users collection directly via MongoDB
      try {
        const { MongoClient, ObjectId } = require("mongodb");
        const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db("contract_ai");
        const usersCollection = db.collection("users");

        const owner = await usersCollection.findOne(
          { _id: new ObjectId(envelope.ownerId) },
          { projection: { email: 1 } }
        );

        await client.close();

        if (owner && owner.email) {
          await sendCompletionNotification(envelope, owner.email);
        }
      } catch (userError) {
        console.error("⚠️ Could not send completion notification:", userError.message);
      }
    }

    console.log(`✅ Signature submitted successfully by: ${signer.email}`);

    // 📄 Generate presigned URL for sealed PDF download
    let sealedPdfUrl = null;
    if (envelope.s3KeySealed) {
      try {
        const { generateSignedUrl } = require("../services/fileStorage");
        sealedPdfUrl = await generateSignedUrl(envelope.s3KeySealed);
        console.log(`✅ Generated download URL for sealed PDF`);
      } catch (error) {
        console.error(`❌ Failed to generate sealed PDF URL:`, error);
      }
    }

    res.json({
      success: true,
      message: "Signatur erfolgreich übermittelt",
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        allSigned: envelope.allSigned(),
        completedAt: envelope.completedAt,
        sealedPdfUrl // 📄 NEU: Download-URL für signiertes PDF
      }
    });

  } catch (error) {
    console.error("❌ Error submitting signature:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Übermitteln der Signatur",
      error: error.message
    });
  }
});

module.exports = router;

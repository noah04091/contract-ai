// 📁 backend/routes/envelopes.js - Digital Signature Envelope Routes
const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb"); // 🆕 For user queries
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../services/mailer");
const { sealPdf } = require("../services/pdfSealing"); // ✉️ PDF-Sealing Service
const Envelope = require("../models/Envelope");
const Contract = require("../models/Contract");

const router = express.Router();

// ===== RATE LIMITERS =====

/**
 * Rate limiter for signature submission (prevents spam/abuse)
 * 5 attempts per 15 minutes per IP
 */
const signatureSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: 'Zu viele Signaturversuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP address as key
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
});

/**
 * Rate limiter for signature decline (prevents spam)
 * 3 attempts per 15 minutes per IP
 */
const signatureDeclineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Zu viele Ablehnungsversuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
});

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
 * Validate signature data (Base64, Size, Empty Check)
 */
function validateSignature(signatureValue) {
  // Check if signature exists
  if (!signatureValue || typeof signatureValue !== 'string') {
    return { valid: false, error: 'Signatur fehlt oder ist ungültig' };
  }

  // Check if it's a valid Base64 PNG
  if (!signatureValue.startsWith('data:image/png;base64,')) {
    return { valid: false, error: 'Signatur muss ein PNG-Bild sein' };
  }

  // Extract Base64 data (remove prefix)
  const base64Data = signatureValue.replace(/^data:image\/png;base64,/, '');

  // Check if Base64 is valid
  try {
    const buffer = Buffer.from(base64Data, 'base64');

    // Check size (max 1MB = 1048576 bytes)
    if (buffer.length > 1048576) {
      return { valid: false, error: 'Signatur ist zu groß (max 1MB)' };
    }

    // Check if canvas is not empty (PNG has minimum size)
    if (buffer.length < 1000) {
      return { valid: false, error: 'Bitte zeichnen Sie eine Signatur' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Ungültiges Signatur-Format' };
  }
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
      signingMode = "SINGLE", // 🆕 SINGLE | SEQUENTIAL | PARALLEL
      expiresInDays = 14
    } = req.body;

    console.log("✉️ Creating new envelope:", {
      title,
      signersCount: signers?.length,
      signingMode
    });

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
      status: "DRAFT", // Will be updated to AWAITING_SIGNER_X when sent
      signingMode, // 🆕 SINGLE | SEQUENTIAL | PARALLEL
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
          fieldsCount: signatureFields.length,
          signingMode // 🆕 Log signing mode
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

    console.log(`📤 Sending invitations for envelope: ${envelope.title} (Mode: ${envelope.signingMode})`);

    // 🆕 Determine which signers to notify based on signing mode
    let signersToNotify = [];

    if (envelope.signingMode === 'SEQUENTIAL') {
      // Only notify the first signer (lowest order number)
      const sortedSigners = envelope.signers.sort((a, b) => a.order - b.order);
      signersToNotify = [sortedSigners[0]];
      console.log(`📧 Sequential mode: Notifying only first signer (order ${sortedSigners[0].order}): ${sortedSigners[0].email}`);
    } else {
      // SINGLE or PARALLEL: Notify all signers
      signersToNotify = envelope.signers;
      console.log(`📧 ${envelope.signingMode} mode: Notifying all ${envelope.signers.length} signers`);
    }

    // Send invitations
    const sendResults = await Promise.allSettled(
      signersToNotify.map(signer =>
        sendSignatureInvitation(signer, envelope, req.user.email)
      )
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = signersToNotify.length - successCount;

    // 🆕 Update envelope status based on signing mode
    if (envelope.signingMode === 'SEQUENTIAL') {
      envelope.status = 'AWAITING_SIGNER_1';
    } else {
      envelope.status = 'SENT';
    }

    await envelope.addAuditEvent('SENT', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: {
        signingMode: envelope.signingMode,
        totalSigners: envelope.signers.length,
        notifiedSigners: signersToNotify.length,
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

    // ✅ Check if token was invalidated (security)
    if (signer.tokenInvalidated) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link wurde invalidiert",
        invalidated: true
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
router.post("/sign/:token/submit", signatureSubmitLimiter, async (req, res) => {
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

    // ✅ IDEMPOTENZ: Wenn bereits signiert, gib Success zurück
    if (signer.status === 'SIGNED') {
      console.log(`⚠️ Signature already exists for ${signer.email} (idempotent request)`);

      // Generate presigned URL for sealed PDF if available
      let sealedPdfUrl = null;
      if (envelope.s3KeySealed) {
        try {
          const { generateSignedUrl } = require("../services/fileStorage");
          sealedPdfUrl = await generateSignedUrl(envelope.s3KeySealed);
        } catch (error) {
          console.error(`❌ Failed to generate sealed PDF URL:`, error);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Bereits signiert",
        envelope: {
          _id: envelope._id,
          status: envelope.status,
          allSigned: envelope.allSigned(),
          completedAt: envelope.completedAt,
          sealedPdfUrl
        }
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

    // ✅ VALIDATE SIGNATURES
    for (const sig of signatures) {
      const validation = validateSignature(sig.value);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
    }

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

    // ✅ Invalidate token immediately after signing (security)
    signer.tokenInvalidated = true;
    console.log(`🔐 Token invalidated for: ${signer.email}`);

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

    // 🆕 SEQUENTIAL SIGNING LOGIC: Notify next signer
    if (envelope.signingMode === 'SEQUENTIAL' && !envelope.allSigned()) {
      // Find next unsigned signer by order
      const sortedSigners = envelope.signers.sort((a, b) => a.order - b.order);
      const nextSigner = sortedSigners.find(s => s.status === 'PENDING');

      if (nextSigner) {
        console.log(`📧 Sequential mode: Notifying next signer (order ${nextSigner.order}): ${nextSigner.email}`);

        // Get owner info for email (using MongoDB native driver)
        const owner = await req.db.collection("users").findOne({ _id: new ObjectId(envelope.ownerId) });
        const ownerEmail = owner?.email || "Contract AI";

        // Send invitation to next signer
        try {
          await sendSignatureInvitation(nextSigner, envelope, ownerEmail);

          // Update status to AWAITING_SIGNER_X
          envelope.status = `AWAITING_SIGNER_${nextSigner.order}`;

          await envelope.addAuditEvent('SENT', {
            userId: null,
            email: nextSigner.email,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'],
            details: {
              reason: 'Sequential signing - next signer notified',
              signerOrder: nextSigner.order
            }
          });

          console.log(`✅ Next signer notified: ${nextSigner.email} (order ${nextSigner.order})`);
        } catch (emailError) {
          console.error(`❌ Failed to notify next signer:`, emailError);
          // Don't fail the request, just log the error
        }
      }
    } else if (envelope.status === 'SENT' || envelope.status.startsWith('AWAITING_SIGNER_')) {
      // Non-sequential mode: Just update status to SIGNED
      envelope.status = 'SIGNED';
    }

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
        const result = await sealPdf(envelope);

        // ✅ Store sealed PDF location + integrity hashes
        envelope.s3KeySealed = result.sealedS3Key;
        envelope.pdfHashOriginal = result.pdfHashOriginal;
        envelope.pdfHashFinal = result.pdfHashFinal;

        await envelope.addAuditEvent('PDF_SEALED', {
          userId: null,
          email: null,
          ip: getClientIP(req),
          userAgent: req.headers['user-agent'],
          details: {
            s3KeySealed: result.sealedS3Key,
            pdfHashOriginal: result.pdfHashOriginal,
            pdfHashFinal: result.pdfHashFinal
          }
        });
        console.log(`✅ PDF sealed successfully: ${result.sealedS3Key}`);
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

    // 🆕 Dynamic success message based on context
    let message = "✅ Signatur erfolgreich übermittelt!";
    let details = null;

    if (envelope.allSigned()) {
      // All signatures completed
      message = "✅ Signatur erfolgreich übermittelt! Das Dokument ist vollständig signiert.";

      // Only notify about owner notification if signer is NOT the owner
      if (signer.role !== 'sender') {
        details = "Der Vertragsinhaber wurde benachrichtigt.";
      }
    } else {
      // More signatures pending
      if (envelope.signingMode === 'SEQUENTIAL') {
        message = "✅ Signatur erfolgreich übermittelt!";
        details = "Der nächste Unterzeichner wurde benachrichtigt.";
      } else {
        message = "✅ Signatur erfolgreich übermittelt!";
        details = signer.role === 'sender'
          ? "Alle Empfänger wurden benachrichtigt."
          : "Der Vertragsinhaber wurde benachrichtigt.";
      }
    }

    res.json({
      success: true,
      message,
      details, // 🆕 Additional context-aware info
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        allSigned: envelope.allSigned(),
        completedAt: envelope.completedAt,
        sealedPdfUrl // 📄 Download-URL für signiertes PDF
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

/**
 * POST /api/sign/:token/decline - Decline signature request (public)
 */
router.post("/sign/:token/decline", signatureDeclineLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body; // Optional decline reason

    console.log(`❌ Declining signature for token: ${token.substring(0, 10)}...`);

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

    // Check if token was invalidated
    if (signer.tokenInvalidated) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link wurde invalidiert"
      });
    }

    // ✅ IDEMPOTENZ: Wenn bereits declined, gib Success zurück
    if (signer.status === 'DECLINED') {
      console.log(`⚠️ Already declined by ${signer.email} (idempotent request)`);
      return res.status(200).json({
        success: true,
        message: "Bereits abgelehnt",
        envelope: {
          _id: envelope._id,
          status: envelope.status
        }
      });
    }

    // Check if already signed (can't decline after signing)
    if (signer.status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: "Sie haben bereits signiert - Ablehnung nicht möglich"
      });
    }

    // Update signer status
    const now = new Date();
    signer.status = 'DECLINED';
    signer.declinedAt = now;
    signer.declineReason = reason || null;
    signer.ip = getClientIP(req);
    signer.userAgent = req.headers['user-agent'] || 'unknown';

    // ✅ Invalidate token after decline (security)
    signer.tokenInvalidated = true;

    // Update envelope status
    if (envelope.status === 'SENT' || envelope.status === 'AWAITING_SIGNER_1' || envelope.status === 'AWAITING_SIGNER_2') {
      envelope.status = 'DECLINED';
    }

    // Add audit event
    await envelope.addAuditEvent('DECLINED', {
      userId: null,
      email: signer.email,
      ip: signer.ip,
      userAgent: signer.userAgent,
      details: {
        reason: reason || 'Kein Grund angegeben'
      }
    });

    await envelope.save();

    console.log(`✅ Signature declined by: ${signer.email}`);

    // TODO: Send notification to owner (später in Email-Templates)

    res.json({
      success: true,
      message: "Signaturanfrage abgelehnt",
      envelope: {
        _id: envelope._id,
        status: envelope.status
      }
    });

  } catch (error) {
    console.error("❌ Error declining signature:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Ablehnen der Signatur",
      error: error.message
    });
  }
});

module.exports = router;
